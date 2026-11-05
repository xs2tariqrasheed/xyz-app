/**
 * POST /api/verify-recaptcha — a Vercel serverless function (Node runtime).
 *
 * Checks a Google reCAPTCHA v2 response token against Google's `siteverify`
 * endpoint with the secret key, which only this server holds. The app sends
 * `{ token }` the moment the user ticks "I'm not a robot" and gets back
 * `{ success, errorCodes }`.
 *
 * Server-only environment (Vercel project settings, or `.env` for
 * `vercel dev`) — never prefixed `EXPO_PUBLIC_`, so it never reaches the app:
 *
 *     RECAPTCHA_SECRET_KEY=6L...
 *     RECAPTCHA_ALLOWED_HOSTNAMES=example.com,localhost   (optional)
 *
 * A token is valid for two minutes and can be verified once.
 */

const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const GOOGLE_TIMEOUT_MS = 10_000;

type SiteverifyReply = {
  success?: unknown;
  hostname?: unknown;
  'error-codes'?: unknown;
};

type VerifyResult = { success: boolean; errorCodes: string[] };

/** Web dev (localhost) calls the deployed function cross-origin. */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function reply(status: number, body: VerifyResult): Response {
  return Response.json(body, { status, headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' } });
}

function allowedHostnames(): string[] {
  return (process.env.RECAPTCHA_ALLOWED_HOSTNAMES ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

async function readToken(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) return null;
    const token = (body as { token?: unknown }).token;
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret) return reply(500, { success: false, errorCodes: ['missing-input-secret'] });

  const token = await readToken(request);
  if (!token) return reply(400, { success: false, errorCodes: ['missing-input-response'] });

  const params = new URLSearchParams({ secret, response: token });
  const remoteIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (remoteIp) params.set('remoteip', remoteIp);

  let google: SiteverifyReply;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
    });
    if (!response.ok) return reply(502, { success: false, errorCodes: ['siteverify-unavailable'] });
    google = (await response.json()) as SiteverifyReply;
  } catch {
    return reply(502, { success: false, errorCodes: ['siteverify-unavailable'] });
  }

  const errorCodes = Array.isArray(google['error-codes'])
    ? google['error-codes'].filter((code): code is string => typeof code === 'string')
    : [];

  // Anything short of an explicit `true` from Google is a failure.
  if (google.success !== true) return reply(200, { success: false, errorCodes });

  const hosts = allowedHostnames();
  const hostname = typeof google.hostname === 'string' ? google.hostname.toLowerCase() : '';
  if (hosts.length > 0 && !hosts.includes(hostname)) {
    return reply(200, { success: false, errorCodes: ['hostname-not-allowed'] });
  }

  return reply(200, { success: true, errorCodes: [] });
}
