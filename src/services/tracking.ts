import { DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { COMMON_MESSAGES, TRACKING_MESSAGES } from '@/constants/messages';
import type { GatewayJData, GatewayResponse } from '@/services/gateway';
import { mapRowsByHeadings } from '@/services/gateway';
import { parseGatewayDate, readRecords, readResult, refusalMessage } from '@/services/gatewayRows';

/**
 * Where a car has been and where it is now (reverse-engineer-implemented/guide/21):
 * `RES.S.VEHICLE_LOG` for the route and its timeline, and
 * `RES.S.LATITUDE_LONGITUDE_FOR_CAR` for the car's current position — looked up
 * as the screen opens, as the old site did behind the scenes, and again on Refresh.
 */

/** Thrown when the server refuses a tracking lookup, as opposed to failing. */
export class TrackingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TrackingError';
  }
}

export type VehicleLogEntry = {
  /** Stable key: the entry's time and position in the log. */
  id: string;
  at: Date | null;
  /** `oestatusdesc`: "Accept", "Tracking", "On Scene", "Load", "Unload", … */
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

/** `RES.S.VEHICLE_LOG` headings (guide §10); dates `MM/DD/YYYY`, times `hh:mm:ss AM|PM`. */
const LOG_HEADINGS = ['oetrackingdate', 'oetrackingtime', 'oestatusdesc', 'oelatitude', 'oelongitude'] as const;

/** `RES.S.LATITUDE_LONGITUDE_FOR_CAR` headings besides `o_code` / `o_message` (guide §10). */
const POSITION_HEADINGS = ['o_latitude', 'o_longitude'] as const;

/** `RES.S.LATITUDE_LONGITUDE_FOR_CAR`'s `"5"` / "No Data Found": the car has no position. */
const NO_POSITION_CODE = '5';

function coordinate(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : null;
}

/** The route's timeline in the order the server logged it. */
export function toVehicleLog(response: GatewayResponse): VehicleLogEntry[] {
  return readRecords(response, LOG_HEADINGS).map((row, index) => ({
    // The log has no reference of its own; its time and position in the list identify it.
    id: `${row.oetrackingdate} ${row.oetrackingtime} ${index}`,
    at: parseGatewayDate(row.oetrackingdate, row.oetrackingtime),
    status: row.oestatusdesc.trim() || COMMON_MESSAGES.NOT_AVAILABLE,
    latitude: coordinate(row.oelatitude),
    longitude: coordinate(row.oelongitude),
  }));
}

/**
 * The car's current position: `"0"` with `o_latitude` / `o_longitude`, which
 * may be blank (`null`), or `"5"` "No Data Found" (`null`). Any other code
 * is a refusal and throws.
 */
export function toCarPosition(response: GatewayResponse): CarPosition | null {
  const result = readResult(response);
  if (result.code === NO_POSITION_CODE) return null;
  if (result.code !== DB_SUCCESS_CODE) throw new TrackingError(refusalMessage(result, TRACKING_MESSAGES.CAR_FAILED));
  const row = mapRowsByHeadings(response, POSITION_HEADINGS)[0];
  const latitude = row ? coordinate(row.o_latitude) : null;
  const longitude = row ? coordinate(row.o_longitude) : null;
  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}

export type CarInfo = { carColor: string; carModel: string; driverName: string; driverNumber: string; carType: string };

/** The `PROF.S.CAR_INFO` headings the app reads (guide §10). */
const CAR_INFO_HEADINGS = ['driver_1st', 'color', 'make', 'model', 'model_year'] as const;

/**
 * `PROF.S.CAR_INFO`: the car and driver behind a car number, read by its
 * headings. An unknown car answers no headings and no rows (`null`). No
 * heading carries the driver number or the car type, so those stay empty.
 */
export function toCarInfo(response: GatewayResponse): CarInfo | null {
  const row = mapRowsByHeadings(response, CAR_INFO_HEADINGS)[0];
  if (!row) return null;
  return {
    carColor: row.color.trim(),
    carModel: [row.model_year, row.make, row.model].map((part) => part.trim()).filter(Boolean).join(' '),
    driverName: row.driver_1st.trim(),
    driverNumber: '',
    carType: '',
  };
}
