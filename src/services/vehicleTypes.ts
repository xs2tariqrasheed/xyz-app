import { COMMON_MESSAGES } from '@/constants/messages';
import type { GatewayResponse } from '@/services/gateway';
import { readRecords } from '@/services/gatewayRows';

/**
 * Car types offered on the Preferences step, from `RES.S.VEHICLE_TYPE`
 * (reverse-engineer-implemented/guide/05, 17). The code goes out as `P_CAR_TYPE`.
 * Read by its headings `oevehiclecode, oevehicledesc` (guide §10); the code
 * sends no seat count or description.
 */

export type VehicleType = {
  /** `P_CAR_TYPE`, e.g. `3`. */
  code: string;
  label: string;
  /**
   * Premium wheelchair vehicles cannot be booked online — the customer is
   * asked to call (guide 17, car type `K`).
   */
  callToBook: boolean;
};

const HEADINGS = ['oevehiclecode', 'oevehicledesc'] as const;

/** The car type guide 17 says must be booked by phone. */
const CALL_TO_BOOK_CODE = 'K';

export function toVehicleTypes(response: GatewayResponse): VehicleType[] {
  const seen = new Set<string>();
  return readRecords(response, HEADINGS).flatMap((row) => {
    const code = row.oevehiclecode.trim();
    if (!code || seen.has(code)) return [];
    seen.add(code);
    return [{ code, label: row.oevehicledesc.trim() || COMMON_MESSAGES.NOT_AVAILABLE, callToBook: code === CALL_TO_BOOK_CODE }];
  });
}

export function findVehicleType(types: readonly VehicleType[], code: string): VehicleType | undefined {
  return types.find((type) => type.code === code);
}
