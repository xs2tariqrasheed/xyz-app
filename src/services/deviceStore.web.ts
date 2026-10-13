/**
 * Small device-level values that outlive sessions (native: deviceStore.ts).
 * Failures read as "nothing stored" — callers always have a fallback.
 */

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export async function readDeviceValue(key: string): Promise<string | null> {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export async function writeDeviceValue(key: string, value: string): Promise<void> {
  try {
    storage()?.setItem(key, value);
  } catch {
    // Kept in memory by the caller for this session.
  }
}
