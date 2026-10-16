import { TRACKING_MESSAGES } from '@/constants/messages';
import type { GatewayJData, GatewayResponse } from '@/services/gateway';
import { mapRows } from '@/services/gateway';
import { DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { hasColumn, parseGatewayDate, pick, recordSet } from '@/services/gatewayRows';

/**
 * Where a car has been and where it is now (reverse-engineer-implemented/guide/21):
 * `RES.S.VEHICLE_LOG` for the route and its timeline, and
 * `RES.S.LATITUDE_LONGITUDE_FOR_CAR` for the car's current position.
 *
 * The old site refreshed the position only when asked, so this does too.
 */

/** Thrown when the server refuses a tracking lookup, as opposed to failing. */
export class TrackingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TrackingError';
  }
}

export type VehicleLogEntry = {
  /** Stable key: the log's own reference, else its position. */
  id: string;
  at: Date | null;
  /** "Driver accepted the call.", "Passenger is in the car.", … */
  status: string;
  latitude: number | null;
  longitude: number | null;
};

export type CarPosition = { latitude: number; longitude: number };

/** `JData` for {@link ACTION_CODES.VEHICLE_LOG}. */
export function vehicleLogJData(reservationNumber: string): GatewayJData {
  return { P_RESERVATION_NUM: reservationNumber };
}

/** `JData` for {@link ACTION_CODES.CAR_POSITION} and {@link ACTION_CODES.CAR_INFO}. */
export function carJData(carNumber: string): GatewayJData {
  return { P_CAR_NUM: carNumber };
}

/** Columns: the old Route Detail table's (guide 21), then likely snake-case names. */
const LOG_COLUMNS = {
  id: ['ref_no', 'ref', 'refno', 'log_id', 'id'],
  date: ['log_date', 'date', 'event_date'],
  time: ['log_time', 'time', 'event_time'],
  status: ['status', 'event', 'status_text', 'message'],
  latitude: ['latitude', 'lat', 'o_latitude'],
  longitude: ['longitude', 'lon', 'lng', 'o_longitude'],
} as const;

function coordinate(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : null;
}

/** The route's timeline in the order the server logged it; stub filler dropped. */
export function toVehicleLog(response: GatewayResponse): VehicleLogEntry[] {
  const rows = recordSet(response, (message) => new TrackingError(message), TRACKING_MESSAGES.LOG_FAILED);
  return rows.flatMap((row, index) => {
    const status = pick(row, LOG_COLUMNS.status);
    const latitude = coordinate(pick(row, LOG_COLUMNS.latitude));
    const longitude = coordinate(pick(row, LOG_COLUMNS.longitude));
    if (!status && latitude === null) return [];
    return [
      {
        id: pick(row, LOG_COLUMNS.id) || String(index + 1),
        at: parseGatewayDate(pick(row, LOG_COLUMNS.date), pick(row, LOG_COLUMNS.time)),
        status,
        latitude,
        longitude,
      },
    ];
  });
}

/**
 * The car's current position, or `null` when the server has none (the stub
 * answers with blank coordinates). A refusal throws.
 */
export function toCarPosition(response: GatewayResponse): CarPosition | null {
  const row = mapRows(response)[0];
  if (row && hasColumn(row, ['o_code']) && pick(row, ['o_code']) !== DB_SUCCESS_CODE) {
    throw new TrackingError(pick(row, ['o_message']) || TRACKING_MESSAGES.CAR_FAILED);
  }
  const latitude = coordinate(pick(row, LOG_COLUMNS.latitude));
  const longitude = coordinate(pick(row, LOG_COLUMNS.longitude));
  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}

export type CarInfo = { carColor: string; carModel: string; driverName: string; driverNumber: string; carType: string };

/** `PROF.S.CAR_INFO` (columns undocumented): the car and driver behind a car number. */
export function toCarInfo(response: GatewayResponse): CarInfo | null {
  const rows = recordSet(response, (message) => new TrackingError(message), TRACKING_MESSAGES.CAR_FAILED);
  const row = rows[0];
  if (!row) return null;
  return {
    carColor: pick(row, ['car_color', 'color']),
    carModel: pick(row, ['car_model', 'model']),
    driverName: pick(row, ['driver_name', 'driver']),
    driverNumber: pick(row, ['driver_num', 'driver_number']),
    carType: pick(row, ['car_type']),
  };
}
