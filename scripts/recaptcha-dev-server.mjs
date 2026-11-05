/**
 * Local stand-in for the Vercel deploy of `api/verify-recaptcha.ts`, so the
 * "I'm not a robot" check works in development. The Expo dev server starts it
 * (metro.config.js); on its own:
 *
 *     npm run recaptcha:dev
 *
 * with this in `.env`:
 *
 *     EXPO_PUBLIC_RECAPTCHA_VERIFY_URL=http://localhost:3009/api/verify-recaptcha
 *
 * It runs the very same handler, with RECAPTCHA_SECRET_KEY read from `.env`.
 * Node strips the handler's TypeScript types itself (Node 22.18+ / 24).
 * Add `localhost` to the reCAPTCHA key's domain list.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { parseEnv } from 'node:util';

import { OPTIONS, POST } from '../api/verify-recaptcha.ts';

const PORT = Number(process.env.RECAPTCHA_DEV_PORT ?? 3009);
const ROUTE = '/api/verify-recaptcha';
/** Only the server's own keys: Expo inherits this process's environment, and
 *  preset EXPO_PUBLIC_ values would stop it reloading them from `.env`. */
const SERVER_KEYS = ['RECAPTCHA_SECRET_KEY', 'RECAPTCHA_ALLOWED_HOSTNAMES'];

function loadServerEnv() {
  if (!existsSync('.env')) return;
  const values = parseEnv(readFileSync('.env', 'utf8'));
  for (const key of SERVER_KEYS) {
    if (process.env[key] === undefined && values[key] !== undefined) process.env[key] = values[key];
  }
}

async function handle(req, res) {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  let response;
  if (url.pathname !== ROUTE) {
    response = new Response('Not found', { status: 404 });
  } else if (req.method === 'OPTIONS') {
    response = OPTIONS();
  } else if (req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(name, value);
    }
    response = await POST(new Request(url, { method: 'POST', headers, body: Buffer.concat(chunks) }));
  } else {
    response = new Response('Method not allowed', { status: 405 });
  }

  console.log(`[reCAPTCHA] ${req.method} ${url.pathname} → ${response.status} (from ${req.socket.remoteAddress})`);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

/** How often a server whose port was taken tries again to claim it. */
const RETRY_MS = 3_000;

/**
 * Starts the server on all interfaces, so phones on the same network reach it
 * too. Resolves with the server once it is listening — or straight away when
 * the port is taken: another copy is serving it, and this one keeps trying to
 * take over, so the endpoint survives that copy stopping.
 */
export function startRecaptchaDevServer() {
  loadServerEnv();

  return new Promise((resolve, reject) => {
    let announced = false;
    const server = createServer((req, res) => {
      handle(req, res).catch((error) => {
        console.error('[reCAPTCHA] verify server error', error);
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
    });
    server.on('error', (error) => {
      if (error.code !== 'EADDRINUSE') {
        reject(error);
        return;
      }
      if (!announced) {
        announced = true;
        console.log(`[reCAPTCHA] port ${PORT} is in use — using that verify server, and taking over if it stops.`);
        resolve(server);
      }
      setTimeout(() => server.listen(PORT), RETRY_MS).unref();
    });
    server.on('listening', () => {
      console.log(`[reCAPTCHA] verify server: http://localhost:${PORT}${ROUTE}`);
      if (!process.env.RECAPTCHA_SECRET_KEY) {
        console.warn('[reCAPTCHA] RECAPTCHA_SECRET_KEY is not set in .env — every check will fail.');
      }
      if (!announced) {
        announced = true;
        resolve(server);
      }
    });
    server.listen(PORT);
  });
}

if (import.meta.main) await startRecaptchaDevServer();
