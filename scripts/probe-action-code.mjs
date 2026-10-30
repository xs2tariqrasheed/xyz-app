#!/usr/bin/env node
/**
 * Sends one action code to the API gateway and prints what actually comes
 * back, so a code's real response is understood before any app code is
 * written for it (CLAUDE.md → API gateway, docs/XYZ_INTEGRATION_GUIDE.md §10).
 *
 *     npm run gateway:probe -- <ACTION_CODE> '<JData JSON>' [--write]
 *     npm run gateway:probe -- PROF.S.CHECK_LOGIN_CREDENTIALS '{"P_LOGIN_ID":"…","P_PASSWORD":"…"}'
 *
 * Prints the raw body, then the shape — heading count against every row
 * length, flagged MISMATCH when they differ (then the headings cannot be
 * trusted and the code is mapped by position) — then each row paired with
 * the headings, plus any values past the last heading.
 *
 * Reads the gateway settings from `.env` and builds the same envelope as
 * `buildEnvelope` in src/services/gateway.ts. The API password is sent but
 * never printed. `.I.` / `.U.` / `.D.` codes change real data and are refused
 * unless `--write` is passed — use them only on an agreed test record.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const allowWrite = args.includes('--write');
const [actionCode, jDataArg = '{}'] = args.filter((arg) => arg !== '--write');

if (!actionCode) {
  console.error("Usage: npm run gateway:probe -- <ACTION_CODE> '<JData JSON>' [--write]");
  process.exit(1);
}
if (/\.(I|U|D)\./.test(actionCode) && !allowWrite) {
  console.error(`${actionCode} writes data. Pass --write to send it, on a test record only.`);
  process.exit(1);
}

let jData;
try {
  jData = JSON.parse(jDataArg);
} catch {
  console.error('JData must be a JSON object, e.g. \'{"P_LOGIN_ID":"user@example.com"}\'.');
  process.exit(1);
}

const env = readEnv(path.join(process.cwd(), '.env'));
const required = [
  'EXPO_PUBLIC_DBAPI_URL',
  'EXPO_PUBLIC_DBAPI_SOURCE',
  'EXPO_PUBLIC_DBAPI_TARGET',
  'EXPO_PUBLIC_DBAPI_LOGIN',
  'EXPO_PUBLIC_DBAPI_PASSWORD',
];
const missing = required.filter((name) => !env[name]);
if (missing.length > 0) {
  console.error(`Missing in .env: ${missing.join(', ')}`);
  process.exit(1);
}

const viewName = 'LOGIN';
const envelope = {
  ActionCode: actionCode,
  ViewName: viewName,
  ClientIP: '0.0.0.0',
  JsonReq: {
    JHeader: {
      Client: env.EXPO_PUBLIC_DBAPI_CLIENT ?? '',
      Source: env.EXPO_PUBLIC_DBAPI_SOURCE,
      Target: env.EXPO_PUBLIC_DBAPI_TARGET,
      DeviceType: 'Web',
      DeviceInfo: 'gateway-probe',
      DeviceID: 'gateway-probe',
      ViewName: viewName,
      ActionCode: actionCode,
      ClientVersion: env.EXPO_PUBLIC_DBAPI_CLIENT_VERSION ?? '',
      APIVersion: env.EXPO_PUBLIC_DBAPI_API_VERSION ?? '',
      APILogin: env.EXPO_PUBLIC_DBAPI_LOGIN,
      APIPassword: env.EXPO_PUBLIC_DBAPI_PASSWORD,
      RequestedURL: env.EXPO_PUBLIC_DBAPI_REQUESTED_URL ?? '',
      Debug: 'false',
      GPSLatitude: env.EXPO_PUBLIC_JHEADER_FALLBACK_LAT || '0',
      GPSLongitude: env.EXPO_PUBLIC_JHEADER_FALLBACK_LNG || '0',
      GPSSpeed: '',
      GPSBearing: '',
    },
    JMetaData: {},
    JData: jData,
  },
  Notes: 'Test Notes ...',
};

const response = await fetch(env.EXPO_PUBLIC_DBAPI_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/plain, */*' },
  body: JSON.stringify(envelope),
});
const text = await response.text();

console.log(`HTTP ${response.status}`);
console.log('── Raw body ──');
console.log(text);

let body;
let repaired = false;
try {
  body = JSON.parse(text);
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = JSON.parse(repairBackslashes(body));
      repaired = true;
    }
  }
} catch {
  console.log('\n── Not valid JSON, even after repairing backslashes (the app treats this as an error) ──');
  process.exit(0);
}

const header = body?.JHeader ?? {};
const headings = (body?.JMetaData?.Headings ?? []).map((h) => String(Array.isArray(h) ? h[0] : h));
const rows = Array.isArray(body?.JData) ? body.JData : [];
const lengths = [...new Set(rows.map((row) => (Array.isArray(row) ? row.length : 0)))];

console.log('\n── Shape ──');
console.log(`JHeader.ActionCode: ${JSON.stringify(header.ActionCode)}  Message: ${header.Message ?? ''}`);
if (repaired) console.log('Invalid JSON: stray backslashes repaired (as parseBody does)');
console.log(`Headings (${headings.length}): ${JSON.stringify(headings)}`);
console.log(`Rows: ${rows.length}  Row length(s): ${lengths.join(', ') || '-'}`);
if (rows.length > 0 && lengths.some((length) => length !== headings.length)) {
  console.log('MISMATCH: headings do not match the rows — map this code by position.');
}

rows.forEach((row, index) => {
  console.log(`\n── Row ${index} ──`);
  row.forEach((value, column) => {
    console.log(`  [${column}] ${headings[column] ?? '(no heading)'} = ${JSON.stringify(value)}`);
  });
});

/** Same repair as `parseLenient` in src/services/gateway.ts. */
function repairBackslashes(value) {
  return value.replace(/\\(["\\/bfnrtu])|\\/g, (match, escape) => (escape ? match : '\\\\'));
}

/** KEY=value lines; no quoting or expansion, as the app's `.env` uses none. */
function readEnv(file) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    console.error(`Cannot read ${file}. Copy .env.example to .env first.`);
    process.exit(1);
  }
  return Object.fromEntries(
    content
      .split('\n')
      .map((line) => /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.trim()]),
  );
}
