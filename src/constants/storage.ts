/** Device storage keys. SecureStore allows only letters, digits, `.`, `-` and `_`. */
export const STORAGE_KEYS = {
  AUTH_SESSION: 'xyz.auth.session',
  /** Random id for this app install, sent as JHeader.DeviceID. */
  DEVICE_ID: 'xyz.device.id',
  /** Last device position, the GPS fallback before a fresh read. */
  LAST_GPS_FIX: 'xyz.gps.last',
} as const;
