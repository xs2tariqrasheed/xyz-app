import * as SecureStore from 'expo-secure-store';

import { STORAGE_KEYS } from '@/constants/storage';

/**
 * Where the auth session lives on iOS and Android (web: authStorage.web.ts).
 *
 * A remembered session goes to the Keychain / Keystore so it survives a
 * restart; any other session stays in memory and ends with the process.
 */

const KEY = STORAGE_KEYS.AUTH_SESSION;

let memorySession: string | null = null;

export async function readSession(): Promise<string | null> {
  if (memorySession) return memorySession;
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    // An unreadable entry (e.g. keychain reset) is the same as no session.
    return null;
  }
}

export async function writeSession(value: string, persist: boolean): Promise<void> {
  if (persist) {
    try {
      await SecureStore.setItemAsync(KEY, value);
      memorySession = null;
      return;
    } catch {
      // Keychain unavailable: still signed in, just not remembered.
    }
  }
  memorySession = value;
  // A remembered session from an earlier login must not outlive this one.
  await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
}

export async function clearSession(): Promise<void> {
  memorySession = null;
  await SecureStore.deleteItemAsync(KEY);
}
