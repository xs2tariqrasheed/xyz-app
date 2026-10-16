import { RESERVATION_MESSAGES } from '@/constants/messages';
import type { GatewayResponse } from '@/services/gateway';
import { pick, recordSet, toInt } from '@/services/gatewayRows';

/**
 * Car types offered on the Preferences step, from `RES.S.VEHICLE_TYPE`
 * (reverse-engineer-implemented/guide/05, 17). The code goes out as `P_CAR_TYPE`.
 */

export type VehicleType = {
  /** `P_CAR_TYPE`, e.g. `SEDAN`. */
  code: string;
  label: string;
  description: string;
  /** Seats sold, so the passenger count can flag an impossible pairing; `null` when unknown. */
  seats: number | null;
  /**
   * Premium wheelchair vehicles cannot be booked online — the customer is
   * asked to call (guide 17, car type `K`).
   */
  callToBook: boolean;
};

/** Thrown when the server refuses the lookup, as opposed to failing. */
export class VehicleTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VehicleTypeError';
  }
}

const COLUMNS = {
  code: ['car_type', 'car_type_id', 'cartypeid', 'code'],
  label: ['car_type_name', 'car_type_desc', 'name', 'description'],
  description: ['description'],
  seats: ['max_passengers', 'seats', 'capacity'],
} as const;

const CALL_TO_BOOK = /^k$|premium\s*wheelchair/i;

export function toVehicleTypes(response: GatewayResponse): VehicleType[] {
  const rows = recordSet(response, (message) => new VehicleTypeError(message), RESERVATION_MESSAGES.CAR_TYPES_FAILED);
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const code = pick(row, COLUMNS.code);
    if (!code || seen.has(code)) return [];
    seen.add(code);
    const label = pick(row, COLUMNS.label) || code;
    const seats = toInt(pick(row, COLUMNS.seats), 0);
    const description = pick(row, COLUMNS.description);
    return [
      {
        code,
        label,
        description: description === label ? '' : description,
        seats: seats > 0 ? seats : null,
        callToBook: CALL_TO_BOOK.test(code) || CALL_TO_BOOK.test(label),
      },
    ];
  });
}

export function findVehicleType(types: readonly VehicleType[], code: string): VehicleType | undefined {
  return types.find((type) => type.code === code);
}
