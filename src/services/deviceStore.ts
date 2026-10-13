import * as SecureStore from 'expo-secure-store';

/**
 * Small device-level values that outlive sessions (web: deviceStore.web.ts).
 * Failures read as "nothing stored" — callers always have a fallback.
 */

export async function readDeviceValue(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function writeDeviceValue(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Kept in memory by the caller for this session.
  }
}
