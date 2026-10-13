import type { Page, Response } from '@playwright/test';

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

/** Rows of a gateway response keyed by heading (the body may be double-encoded). */
export async function gatewayRows(response: Response): Promise<Record<string, string>[]> {
  let body: unknown = JSON.parse(await response.text());
  if (typeof body === 'string') body = JSON.parse(body);
  const { JMetaData, JData } = body as GatewayBody;
  const keys = (JMetaData?.Headings ?? []).map((h) => String(Array.isArray(h) ? h[0] : h));
  return (JData ?? []).map((row) => Object.fromEntries(keys.map((key, i) => [key, String(row[i] ?? '')])));
}
