import { ACTION_CODES, DB_SUCCESS_CODE } from '@/constants/actionCodes';
import { type GatewayJData, type GatewayResponse, mapRowsByHeadings } from '@/services/gateway';
import type { StructuredPlace } from '@/services/places';

/**
 * Service-area zones for the two ends of a ride (reverse-engineer-implemented/guide/05,
 * 13). A stop with coordinates and a ZIP (a Google place) is zoned with
 * `RES.S.GOOGLE_ZONE_NUM`; anything else (a saved address, an airport or a
 * landmark without coordinates) by its street with `RES.S.ZONE_THE_LOCATION`.
 *
 * An address that cannot be matched may still be booked, but only after the
 * customer acknowledges it (guide 13, `chkConfirmPickup`).
 */

export type Leg = 'pickup' | 'destination';

export type ZoneStatus = 'idle' | 'checking' | 'matched' | 'unmatched';

export type ZoneState = {
  status: ZoneStatus;
  /** `P_PICKUP_ZONE_NUM` / `P_DROPOFF_ZONE_NUM`; '' until a zone comes back. */
  zoneNum: string;
};

export const IDLE_ZONE: ZoneState = { status: 'idle', zoneNum: '' };

/** `P_PU_DO_TYPE`: "P" is the documented sample, "D" mirrors it for drop-off. */
const PU_DO_TYPE: Record<Leg, string> = { pickup: 'P', destination: 'D' };

/** Both zone codes answer under these headings (docs/XYZ_INTEGRATION_GUIDE.md §10). */
const ZONE_HEADINGS = ['o_code', 'o_message'] as const;

export type ZoneRequest = {
  actionCode: typeof ACTION_CODES.GOOGLE_ZONE_NUM | typeof ACTION_CODES.ZONE_THE_LOCATION;
  jData: GatewayJData;
};

/**
 * Which zone code to call for `place`, and with what: a Google-searched place
 * by its coordinates and ZIP, anything else (saved, profile, company
 * addresses — even once geocoded) by its street, as the old site did.
 */
export function zoneRequest(place: StructuredPlace, leg: Leg, searched: boolean): ZoneRequest {
  if (searched && place.latitude && place.longitude && place.zip) {
    return {
      actionCode: ACTION_CODES.GOOGLE_ZONE_NUM,
      jData: { P_LAT: place.latitude, P_LON: place.longitude, P_ZIP: place.zip },
    };
  }
  return {
    actionCode: ACTION_CODES.ZONE_THE_LOCATION,
    jData: {
      P_STREET_NUM: place.streetNumber,
      P_STREET_NAME: place.streetName,
      P_CITY_NAME: place.city,
      P_COUNTY_NAME: place.county,
      P_STATE_NAME: place.state,
      P_AIRPORT_NAME: place.kind === 'airport' ? place.airportName : '',
      P_LANDMARK_NAME: place.kind === 'landmark' ? place.landmarkName : '',
      P_PU_DO_TYPE: PU_DO_TYPE[leg],
    },
  };
}

/**
 * `o_code` "0" is a match, with the zone number in `o_message`; any other
 * code, an empty one, or no row is "unmatched" — it fails closed into the
 * acknowledgement rather than silently booking an unknown address. A missing
 * heading throws `GatewayError('parsing')`, which the caller also treats as
 * no match.
 *
 * Today neither code answers "0": `ZONE_THE_LOCATION` answers `["", ""]` for
 * every street tried, and `GOOGLE_ZONE_NUM` answers "1" with a zone number
 * even at 0,0, so "1" does not prove a match (guide §10).
 */
export function toZoneState(response: GatewayResponse): ZoneState {
  const row = mapRowsByHeadings(response, ZONE_HEADINGS)[0];
  // TODO(schema-unverified): no "0" answer has been seen from either code;
  // "0" + zone number in o_message is assumed. Confirm against guide §10.
  if (!row || row.o_code.trim() !== DB_SUCCESS_CODE) return { status: 'unmatched', zoneNum: '' };
  return { status: 'matched', zoneNum: row.o_message.trim() };
}
