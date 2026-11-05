import type { Page, Request, Response } from '@playwright/test';

import type { ActionCode } from '../../src/constants/actionCodes';

/** Waits for the app's gateway call for `actionCode` to come back. */
export function waitForGatewayAction(page: Page, actionCode: ActionCode): Promise<Response> {
  return page.waitForResponse((response) => {
    const request = response.request();
    if (request.method() !== 'POST') return false;
    try {
      return (request.postDataJSON() as { ActionCode?: string } | null)?.ActionCode === actionCode;
    } catch {
      return false;
    }
  });
}

type GatewayBody = {
  JHeader: { ActionCode: number | string };
  JMetaData?: { Headings?: (string | string[])[] };
  JData?: unknown[][];
};

/** Doubles stray backslashes, as `parseBody` in src/services/gateway.ts does. */
function repairBackslashes(value: string): string {
  return value.replace(/\\(["\\/bfnrtu])|\\/g, (match, escape: string | undefined) => (escape ? match : '\\\\'));
}

/**
 * Rows of a gateway response keyed by heading. The body may be double-encoded,
 * and order rows carry unescaped backslashes (docs/XYZ_INTEGRATION_GUIDE.md §4).
 */
export async function gatewayRows(response: Response): Promise<Record<string, string>[]> {
  let body: unknown = JSON.parse(await response.text());
  if (typeof body === 'string') {
    const inner = body;
    try {
      body = JSON.parse(inner);
    } catch {
      body = JSON.parse(repairBackslashes(inner));
    }
  }
  const { JMetaData, JData } = body as GatewayBody;
  const keys = (JMetaData?.Headings ?? []).map((h) => String(Array.isArray(h) ? h[0] : h));
  return (JData ?? []).map((row) => Object.fromEntries(keys.map((key, i) => [key, String(row[i] ?? '')])));
}

/**
 * Writes reach the gateway only with `E2E_ALLOW_WRITES=1`: a booking, an
 * update or a cancel changes real records (CLAUDE.md → API gateway).
 */
export const GATEWAY_WRITES_ALLOWED = process.env.E2E_ALLOW_WRITES === '1';

/** `.I.` / `.U.` / `.D.` action codes change data. */
export function isWriteCode(actionCode: string): boolean {
  return /\.(I|U|D)\./.test(actionCode);
}

function actionCodeOf(request: Request): string | undefined {
  if (request.method() !== 'POST') return undefined;
  try {
    return (request.postDataJSON() as { ActionCode?: string } | null)?.ActionCode;
  } catch {
    return undefined;
  }
}

/**
 * Aborts every gateway write before it leaves the browser, unless
 * {@link GATEWAY_WRITES_ALLOWED}. The request is still built, so a spec can
 * check its JData with {@link waitForGatewayRequest}. Register it after any
 * other route: it hands every other request on with `fallback`.
 */
export async function blockGatewayWrites(page: Page): Promise<void> {
  if (GATEWAY_WRITES_ALLOWED) return;
  await page.route('**/*', async (route) => {
    const code = actionCodeOf(route.request());
    if (code && isWriteCode(code)) await route.abort('blockedbyclient');
    else await route.fallback();
  });
}

/** Waits for the app to send `actionCode` — answered or, for a blocked write, not. */
export function waitForGatewayRequest(page: Page, actionCode: ActionCode): Promise<Request> {
  return page.waitForRequest((request) => actionCodeOf(request) === actionCode);
}
