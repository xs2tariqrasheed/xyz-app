import { STORAGE_KEYS } from '@/constants/storage';

/**
 * Where the auth session lives on web (native: authStorage.ts).
 *
 * A remembered session goes to localStorage so it survives closing the
 * browser; any other session goes to sessionStorage, which survives a reload
 * but ends with the tab. Storage can be missing (static rendering) or throw
 * (blocked site data); the session then lives in memory until the page goes.
 */

const KEY = STORAGE_KEYS.AUTH_SESSION;

let memorySession: string | null = null;

type StorageKind = 'localStorage' | 'sessionStorage';

function storage(kind: StorageKind): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window[kind];
  } catch {
    return null;
  }
}

function remove(kind: StorageKind) {
  try {
    storage(kind)?.removeItem(KEY);
  } catch {
    // Nothing stored that we can reach.
  }
}

export async function readSession(): Promise<string | null> {
  if (memorySession) return memorySession;
  try {
    return storage('sessionStorage')?.getItem(KEY) ?? storage('localStorage')?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}

export async function writeSession(value: string, persist: boolean): Promise<void> {
  const [keep, drop]: StorageKind[] = persist
    ? ['localStorage', 'sessionStorage']
    : ['sessionStorage', 'localStorage'];

  memorySession = null;
  try {
    const target = storage(keep);
    if (!target) throw new Error('Browser storage is unavailable.');
    target.setItem(KEY, value);
  } catch {
    memorySession = value;
  }
  remove(drop);
}

export async function clearSession(): Promise<void> {
  memorySession = null;
  remove('localStorage');
  remove('sessionStorage');
}
