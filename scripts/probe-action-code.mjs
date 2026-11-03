#!/usr/bin/env node
/**
 * Sends one action code to the API gateway and prints what actually comes
 * back, so a code's real response is understood before any app code is
 * written for it (CLAUDE.md → API gateway, docs/XYZ_INTEGRATION_GUIDE.md §10).
 *
 *     npm run gateway:probe -- <ACTION_CODE> '<JData JSON>' [--write] [--summary] [--show=col,…] [--rows] [--vars=<file>]
 *     npm run gateway:probe -- PROF.S.CHECK_LOGIN_CREDENTIALS '{"P_LOGIN_ID":"…","P_PASSWORD":"…"}'
 *     npm run gateway:probe -- RES.S.ALL_ORDERS '{"P_LOGIN_ID":"${E2E_LOGIN_EMAIL}"}' --vars=e2e/e2e.local.env --summary --show=oputype
 *
 * Prints the raw body, then the shape — heading count against every row
 * length, flagged MISMATCH when they differ — then each row paired with the
 * headings, plus any values past the last heading.
 *
 * Reads the gateway settings from `.env` and builds the same envelope as
 * `buildEnvelope` in src/services/gateway.ts. The API password is sent but
 * never printed. `.I.` / `.U.` / `.D.` codes change real data and are refused
 * unless `--write` is passed — use them only on an agreed test record.
 *
 * `--summary` never prints the raw body: only the shape, `o_code` / `o_message`,
 * the distinct values of each `--show` column and, with `--rows`, every row
 * (only its `--show` columns when given).
 * Card and password columns (`SENSITIVE`) are only ever printed as their
 * format (`9999-AAAA`). `--vars=<file>` fills `${NAME}` in the JData from a
 * KEY=value file, so test logins stay out of the command line.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const allowWrite = args.includes('--write');
const summary = args.includes('--summary');
const showRows = args.includes('--rows');
const showColumns = (args.find((arg) => arg.startsWith('--show=')) ?? '--show=')
  .slice('--show='.length)
  .split(',')
  .filter(Boolean);
const varsFile = args.find((arg) => arg.startsWith('--vars='))?.slice('--vars='.length);
const [actionCode, jDataTemplate = '{}'] = args.filter((arg) => !arg.startsWith('--'));

/** Columns whose values are never printed, only their format. */
const SENSITIVE = new Set([
  'opassword',
  'ocardnumber',
  'overifycode',
  'ocardholdername',
  'oexpirationdate',
  'occmonth',
  'occyear',
]);

if (!actionCode) {
  console.error("Usage: npm run gateway:probe -- <ACTION_CODE> '<JData JSON>' [--write]");
  process.exit(1);
}
if (/\.(I|U|D)\./.test(actionCode) && !allowWrite) {
  console.error(`${actionCode} writes data. Pass --write to send it, on a test record only.`);
  process.exit(1);
}

const vars = varsFile ? readEnv(path.resolve(varsFile)) : {};
const jDataArg = jDataTemplate.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name) => {
  if (!(name in vars)) {
    console.error(`\${${name}} is not set in ${varsFile ?? '(no --vars file)'}.`);
    process.exit(1);
  }
  return JSON.stringify(vars[name]).slice(1, -1);
});

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
if (!summary) {
  console.log('── Raw body ──');
  console.log(text);
}

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
  // Without `--summary` the raw body is already printed above. With it, show
  // the start of the body so the error can be read, long digit runs masked.
  if (summary) console.log(text.slice(0, 600).replace(/\d{12,}/g, (digits) => '9'.repeat(digits.length)));
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
  console.log('MISMATCH: headings ≠ row length — a gateway bug to record in guide §10.');
}

if (summary) {
  const at = (row, name) => row[headings.indexOf(name)];
  if (headings.includes('o_code') && rows.length > 0) {
    console.log(`o_code: ${JSON.stringify(at(rows[0], 'o_code'))}  o_message: ${JSON.stringify(at(rows[0], 'o_message'))}`);
  }
  for (const name of showColumns) {
    if (!headings.includes(name)) {
      console.log(`${name}: (no such heading)`);
      continue;
    }
    const counts = new Map();
    for (const row of rows) {
      const shown = display(name, at(row, name));
      counts.set(shown, (counts.get(shown) ?? 0) + 1);
    }
    console.log(`${name}: ${[...counts].map(([value, count]) => `${value} ×${count}`).join(', ')}`);
  }
}

if (!summary || showRows) {
  rows.forEach((row, index) => {
    console.log(`\n── Row ${index} ──`);
    row.forEach((value, column) => {
      const name = headings[column] ?? '(no heading)';
      if (summary && showColumns.length > 0 && !showColumns.includes(name)) return;
      console.log(`  [${column}] ${name} = ${summary ? display(name, value) : JSON.stringify(value)}`);
    });
  });
}

/** A value as printed in `--summary`: sensitive columns only as their format. */
function display(name, value) {
  if (SENSITIVE.has(name)) return value ? `<${String(value).replace(/[0-9]/g, '9').replace(/[A-Za-z]/g, 'A')}>` : '""';
  return JSON.stringify(value);
}

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
