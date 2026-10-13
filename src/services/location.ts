import * as Location from 'expo-location';

import { STORAGE_KEYS } from '@/constants/storage';
import { readDeviceValue, writeDeviceValue } from '@/services/deviceStore';

/**
 * Device position for the gateway's JHeader GPS fields (docs/DM.md §4, steps
 * 2–3 of the GPS rule): the last known position cached on the device, else
 * one fresh device read per app session.
 *
 * The session read always runs once, in the background, so the cache stays
 * current; a request only waits for it (briefly) when nothing is cached yet.
 * A denied permission or a failed read simply yields `null`.
 */

export type GpsFix = { latitude: number; longitude: number };

/** How long a request waits for the first fix before falling back. */
const FIRST_FIX_WAIT_MS = 5_000;

let cachedFix: GpsFix | null | undefined;
let sessionRead: Promise<GpsFix | null> | null = null;

export async function getDevicePosition(): Promise<GpsFix | null> {
  const fresh = readOncePerSession();

  if (cachedFix === undefined) {
    cachedFix = parseFix(await readDeviceValue(STORAGE_KEYS.LAST_GPS_FIX));
  }
  if (cachedFix) return cachedFix;

  return Promise.race([fresh, delay(FIRST_FIX_WAIT_MS).then(() => null)]);
}

function readOncePerSession(): Promise<GpsFix | null> {
  sessionRead ??= readDevice().then((fix) => {
    if (fix) {
      cachedFix = fix;
      void writeDeviceValue(STORAGE_KEYS.LAST_GPS_FIX, JSON.stringify(fix));
    }
    return fix;
  });
  return sessionRead;
}

async function readDevice(): Promise<GpsFix | null> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted' && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }
    if (permission.status !== 'granted') return null;

    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return isValidFix(coords) ? { latitude: coords.latitude, longitude: coords.longitude } : null;
  } catch {
    // Location services off, timed out, or unsupported here.
    return null;
  }
}

function parseFix(raw: string | null): GpsFix | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isValidFix(value) ? { latitude: value.latitude, longitude: value.longitude } : null;
  } catch {
    return null;
  }
}

export function isValidFix(value: unknown): value is GpsFix {
  if (typeof value !== 'object' || value === null) return false;
  const { latitude, longitude } = value as Record<string, unknown>;
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
