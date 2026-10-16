import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Parameter lists per action code, read from docs/XYZ Action Codes.md — the
 * contract the app codes against. Specs compare each request's JData keys
 * with it, so a renamed, missing or extra parameter fails the run.
 */

let cache: Map<string, string[]> | null = null;

function load(): Map<string, string[]> {
  if (cache) return cache;
  const doc = readFileSync(path.join(__dirname, '..', '..', 'docs', 'XYZ Action Codes.md'), 'utf8');
  const codes = new Map<string, string[]>();
  let current: string | null = null;

  for (const line of doc.split('\n')) {
    const heading = /^### \*\*Action Code: ([^*]+)\*\*/.exec(line);
    if (heading) {
      current = heading[1].replace(/\\_/g, '_').trim();
      if (!codes.has(current)) codes.set(current, []);
      continue;
    }
    const row = /^\|\s*(P\\?_[^|]+?)\s*\|/.exec(line);
    if (current && row) {
      const param = row[1].replace(/\\_/g, '_').trim();
      const params = codes.get(current)!;
      if (!params.includes(param)) params.push(param);
    }
  }

  cache = codes;
  return codes;
}

/** The documented parameters of `actionCode`, in contract order. */
export function contractParams(actionCode: string): string[] {
  const params = load().get(actionCode);
  if (!params) throw new Error(`${actionCode} is not in docs/XYZ Action Codes.md`);
  return params;
}
