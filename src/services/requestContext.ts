import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { jHeaderConfig } from '@/config/gateway';
import {
  JDATA_GPS_BEARING_KEY,
  JDATA_GPS_KEYS,
  JDATA_GPS_SPEED_KEY,
} from '@/constants/actionCodes';
import { STORAGE_KEYS } from '@/constants/storage';
import { readDeviceValue, writeDeviceValue } from '@/services/deviceStore';
import { getDevicePosition, isValidFix } from '@/services/location';

/**
 * Everything the gateway envelope needs that is not the call itself
 * (docs/DM.md §4): client IP, device identity, app version and GPS.
 * Device id, IP and the device position are each resolved once and reused.
 */

/** Sent when the public IP is unknown (docs/DM.md §4). */
const CLIENT_IP_FALLBACK = '0.0.0.0';
const IP_LOOKUP_TIMEOUT_MS = 5_000;

export type RequestContext = {
  clientIp: string;
  deviceType: string;
  deviceInfo: string;
  deviceId: string;
  clientVersion: string;
  gpsLatitude: string;
  gpsLongitude: string;
  gpsSpeed: string;
  gpsBearing: string;
};

type JDataValues = Record<string, string | number>;

export async function collectRequestContext(jData: JDataValues): Promise<RequestContext> {
  const [clientIp, deviceId, gps] = await Promise.all([
    getClientIp(),
    getDeviceId(),
    resolveGps(jData),
  ]);

  return {
    clientIp,
    deviceId,
    // DM.md only knows iOS ("Apple") and Android; web reports itself honestly.
    deviceType: Platform.select({ ios: 'Apple', android: 'Android', default: 'Web' }),
    deviceInfo: deviceInfo(),
    clientVersion: jHeaderConfig.clientVersion || (Constants.expoConfig?.version ?? ''),
    gpsLatitude: String(gps.latitude),
    gpsLongitude: String(gps.longitude),
    gpsSpeed: jDataString(jData, JDATA_GPS_SPEED_KEY),
    gpsBearing: jDataString(jData, JDATA_GPS_BEARING_KEY),
  };
}

/** "<model> <model id>", e.g. "iPhone 15 iPhone15,4"; OS name/version on web. */
function deviceInfo(): string {
  const model = Device.modelName ?? Device.osName;
  const id: unknown = Device.modelId ?? Device.osVersion;
  return [model, typeof id === 'string' ? id : null].filter(Boolean).join(' ');
}

/**
 * GPS rule, first valid pair wins: coordinates in JData → cached / fresh
 * device position → configured fallback. Never empty.
 */
async function resolveGps(
  jData: JDataValues,
): Promise<{ latitude: string | number; longitude: string | number }> {
  for (const keys of JDATA_GPS_KEYS) {
    const fix = { latitude: Number(jData[keys.latitude]), longitude: Number(jData[keys.longitude]) };
    if (jData[keys.latitude] !== undefined && jData[keys.longitude] !== undefined && isValidFix(fix)) {
      return fix;
    }
  }

  const device = await getDevicePosition();
  if (device) return device;

  return { latitude: jHeaderConfig.fallbackLatitude, longitude: jHeaderConfig.fallbackLongitude };
}

function jDataString(jData: JDataValues, key: string): string {
  const value = jData[key];
  return value === undefined ? '' : String(value);
}

// ── Device id ───────────────────────────────────────────────────────────────

let deviceIdRequest: Promise<string> | null = null;

/**
 * A random id created on first launch and kept on the device — stable for the
 * install, gone on reinstall, and not derived from any hardware identifier.
 */
function getDeviceId(): Promise<string> {
  deviceIdRequest ??= (async () => {
    const stored = await readDeviceValue(STORAGE_KEYS.DEVICE_ID);
    if (stored) return stored;

    const id = randomId();
    await writeDeviceValue(STORAGE_KEYS.DEVICE_ID, id);
    return id;
  })();
  return deviceIdRequest;
}

function randomId(): string {
  const { crypto } = globalThis as { crypto?: { randomUUID?: () => string } };
  if (crypto?.randomUUID) return crypto.randomUUID();

  // RFC 4122 v4 layout from Math.random — an install id, not a secret.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const nibble = Math.floor(Math.random() * 16);
    return (char === 'x' ? nibble : (nibble & 0x3) | 0x8).toString(16);
  });
}

// ── Client IP ───────────────────────────────────────────────────────────────

let clientIpRequest: Promise<string> | null = null;

/** The device's public IP, looked up once per session. */
function getClientIp(): Promise<string> {
  clientIpRequest ??= lookUpClientIp();
  return clientIpRequest;
}

async function lookUpClientIp(): Promise<string> {
  const url = jHeaderConfig.clientIpLookupUrl;
  if (!url) return CLIENT_IP_FALLBACK;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IP_LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return CLIENT_IP_FALLBACK;

    const text = (await response.text()).trim();
    let ip = text;
    try {
      const json: unknown = JSON.parse(text);
      if (typeof json === 'object' && json !== null && 'ip' in json) ip = String(json.ip);
    } catch {
      // Plain-text response.
    }
    return isIpAddress(ip) ? ip : CLIENT_IP_FALLBACK;
  } catch {
    return CLIENT_IP_FALLBACK;
  } finally {
    clearTimeout(timer);
  }
}

function isIpAddress(value: string): boolean {
  const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const ipv6 = /^[0-9a-f:]+$/i;
  return ipv4.test(value) || (value.includes(':') && ipv6.test(value) && value.length <= 39);
}
