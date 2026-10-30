import { gatewayConfig, jHeaderConfig, missingGatewayEnv } from '@/config/gateway';
import {
  type ActionCode,
  GATEWAY_NOTES,
  GATEWAY_SUCCESS_CODE,
  GATEWAY_VIEW_NAME,
} from '@/constants/actionCodes';
import { COMMON_MESSAGES } from '@/constants/messages';
import { collectRequestContext, type RequestContext } from '@/services/requestContext';

/**
 * The one place that talks to the API gateway (docs/XYZ_INTEGRATION_GUIDE.md).
 *
 * Builds the envelope, POSTs it, normalises the body and decides the outcome
 * from `JHeader.ActionCode`. Callers map `JData` themselves with
 * {@link mapRows}; they never see a failed response, only a
 * {@link GatewayError}.
 */

const TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_STEP_MS = 500;

/**
 * - `network`: no answer, timeout or HTTP error — retried.
 * - `api`: the gateway answered with a non-zero ActionCode — never retried.
 * - `parsing`: the body could not be read as a gateway response.
 */
export type GatewayErrorKind = 'network' | 'api' | 'parsing';

export class GatewayError extends Error {
  readonly kind: GatewayErrorKind;
  /** HTTP status, when the failure came with one. */
  readonly status?: number;

  constructor(kind: GatewayErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'GatewayError';
    this.kind = kind;
    this.status = status;
  }
}

/** Parameter values are strings, except where the contract shows a number. */
export type GatewayJData = Record<string, string | number>;

type Heading = string | readonly string[];

export type GatewayResponse = {
  JHeader: { ActionCode: number | string; Message?: string; SysVersion?: string };
  JMetaData?: { Headings?: Heading[] };
  JData?: unknown[][];
};

export type CallGatewayOptions = {
  /** Defaults to the view every current action code is sent under. */
  viewName?: string;
  signal?: AbortSignal;
  /**
   * Retry network failures (the default). Pass `false` for a write that must
   * not run twice — a lost response would otherwise resend it.
   */
  retry?: boolean;
};

export async function callGateway(
  actionCode: ActionCode,
  jData: GatewayJData,
  { viewName = GATEWAY_VIEW_NAME, signal, retry = true }: CallGatewayOptions = {},
): Promise<GatewayResponse> {
  if (missingGatewayEnv.length > 0) {
    throw new Error(`API gateway is not configured. Missing: ${missingGatewayEnv.join(', ')}`);
  }

  // Built once per call; retries resend the same envelope (docs/XYZ_INTEGRATION_GUIDE.md §4).
  const context = await collectRequestContext(jData);
  const body = JSON.stringify(buildEnvelope(actionCode, viewName, jData, context));

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await send(body, signal);
    } catch (error) {
      const retryable =
        retry && error instanceof GatewayError && error.kind === 'network' && error.status !== 401;
      if (!retryable || signal?.aborted || attempt >= MAX_ATTEMPTS) throw error;
      await delay(BACKOFF_STEP_MS * attempt);
    }
  }
}

/**
 * Pairs each `JData` row with the column keys in `JMetaData.Headings`.
 * Headings arrive either as plain keys or as `[key, displayName, …]` tuples.
 */
export function mapRows(response: GatewayResponse): Record<string, string>[] {
  const headings = response.JMetaData?.Headings;
  const rows = response.JData;
  if (!Array.isArray(headings) || !Array.isArray(rows)) return [];

  const keys = headings.map((heading) => String(Array.isArray(heading) ? heading[0] : heading));

  return rows
    .filter((row): row is unknown[] => Array.isArray(row))
    .map((row) =>
      Object.fromEntries(keys.map((key, index) => [key, row[index] == null ? '' : String(row[index])])),
    );
}

/**
 * Pairs each `JData` row with `columns` by position, ignoring
 * `JMetaData.Headings`. For record sets whose headings do not match their rows
 * (docs/XYZ_INTEGRATION_GUIDE.md §4, §10 has each code's column list).
 * A position the row does not reach becomes ''; callers that rely on a fixed
 * layout check the row length first.
 */
export function mapRowsByPosition<Column extends string>(
  response: GatewayResponse,
  columns: readonly Column[],
): Record<Column, string>[] {
  const rows = response.JData;
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((row): row is unknown[] => Array.isArray(row))
    .map(
      (row) =>
        // Every column is set from its position, so the record is complete.
        Object.fromEntries(
          columns.map((key, index) => [key, row[index] == null ? '' : String(row[index])]),
        ) as Record<Column, string>,
    );
}

/** Ready-made copy for showing a failed gateway call (docs/XYZ_INTEGRATION_GUIDE.md §6). */
export type ErrorDisplay = {
  title: string;
  customDescription: string;
  errorType: GatewayErrorKind;
};

/**
 * Friendly text for any error a gateway call can throw. Business (`api`)
 * errors keep the gateway's own message; everything else gets general copy
 * so raw technical detail never reaches the screen.
 */
export function getErrorDisplay(error: unknown): ErrorDisplay {
  if (error instanceof GatewayError && error.kind === 'api') {
    return {
      title: COMMON_MESSAGES.REQUEST_NOT_COMPLETED_TITLE,
      customDescription: error.message,
      errorType: 'api',
    };
  }
  if (error instanceof GatewayError && error.kind === 'parsing') {
    return {
      title: COMMON_MESSAGES.SOMETHING_WENT_WRONG_TITLE,
      customDescription: COMMON_MESSAGES.PARSING_ERROR,
      errorType: 'parsing',
    };
  }
  return {
    title: COMMON_MESSAGES.CONNECTION_PROBLEM_TITLE,
    customDescription: COMMON_MESSAGES.NETWORK_ERROR,
    errorType: 'network',
  };
}

/**
 * Headers that authorise the request itself. Empty until the gateway's
 * Cognito service token is wired up — that is the only change it needs here.
 */
function getAuthHeaders(): Record<string, string> {
  return {};
}

async function send(body: string, signal?: AbortSignal): Promise<GatewayResponse> {
  // AbortSignal.timeout / AbortSignal.any are not available on every runtime
  // the app targets, so the timeout and the caller's signal are linked by hand.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort);

  let response: Response;
  let text: string;
  try {
    response = await fetch(gatewayConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        ...getAuthHeaders(),
      },
      body,
      signal: controller.signal,
    });
    text = await response.text();
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new GatewayError(
      'network',
      controller.signal.aborted ? 'The gateway did not answer in time.' : describe(error),
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }

  if (!response.ok) {
    throw new GatewayError('network', `Gateway request failed (${response.status})`, response.status);
  }

  const parsed = parseBody(text);
  if (Number(parsed.JHeader.ActionCode) !== GATEWAY_SUCCESS_CODE) {
    throw new GatewayError('api', parsed.JHeader.Message?.trim() || COMMON_MESSAGES.REQUEST_NOT_ACCEPTED);
  }
  return parsed;
}

/**
 * The body may be a JSON object, or that object encoded once more as a string
 * (the real gateway always does the latter). It is not always valid JSON
 * (docs/XYZ_INTEGRATION_GUIDE.md §4): row values carry unescaped backslashes
 * (`\\host\Receipt_Images\…`), which {@link parseLenient} repairs, and error
 * messages carry unescaped quotes, which cannot be — such a body still yields
 * an `api` error when its non-zero ActionCode can be read.
 */
function parseBody(text: string): GatewayResponse {
  let data: unknown;
  try {
    data = parseLenient(text);
    if (typeof data === 'string') data = parseLenient(data);
  } catch {
    const code = /"ActionCode"\s*:\s*"?(\d+)"?/.exec(text)?.[1];
    if (code !== undefined && Number(code) !== GATEWAY_SUCCESS_CODE) {
      // The gateway's own message is unreadable here, and it is raw DB text anyway.
      throw new GatewayError('api', COMMON_MESSAGES.REQUEST_NOT_ACCEPTED);
    }
    throw new GatewayError('parsing', 'The gateway response is not valid JSON.');
  }

  if (!isRecord(data) || !isRecord(data.JHeader) || data.JHeader.ActionCode == null) {
    throw new GatewayError('parsing', 'The gateway response has no JHeader.');
  }
  return data as GatewayResponse;
}

/** The request body, every JHeader field as a string (docs/XYZ_INTEGRATION_GUIDE.md §3). */
function buildEnvelope(
  actionCode: ActionCode,
  viewName: string,
  jData: GatewayJData,
  context: RequestContext,
) {
  return {
    ActionCode: actionCode,
    ViewName: viewName,
    ClientIP: context.clientIp,
    JsonReq: {
      JHeader: {
        Client: jHeaderConfig.client,
        Source: gatewayConfig.source,
        Target: gatewayConfig.target,
        DeviceType: context.deviceType,
        DeviceInfo: context.deviceInfo,
        DeviceID: context.deviceId,
        ViewName: viewName,
        ActionCode: actionCode,
        ClientVersion: context.clientVersion,
        APIVersion: jHeaderConfig.apiVersion,
        APILogin: gatewayConfig.apiLogin,
        APIPassword: gatewayConfig.apiPassword,
        RequestedURL: jHeaderConfig.requestedUrl,
        Debug: 'false',
        GPSLatitude: context.gpsLatitude,
        GPSLongitude: context.gpsLongitude,
        GPSSpeed: context.gpsSpeed,
        GPSBearing: context.gpsBearing,
      },
      JMetaData: {},
      JData: jData,
    },
    Notes: GATEWAY_NOTES,
  };
}

/** `JSON.parse`, retried once with every backslash that starts no valid escape doubled. */
function parseLenient(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const repaired = text.replace(/\\(["\\/bfnrtu])|\\/g, (match, escape?: string) =>
      escape ? match : '\\\\',
    );
    if (repaired === text) throw error;
    return JSON.parse(repaired);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'Network request failed';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
