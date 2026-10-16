import { ACTION_CODES, DB_SUCCESS_CODE } from '@/constants/actionCodes';
import type { GatewayJData, GatewayResponse } from '@/services/gateway';
import { hasColumn, pick } from '@/services/gatewayRows';
import { mapRows } from '@/services/gateway';
import type { StructuredPlace } from '@/services/places';

/**
 * Service-area zones for the two ends of a ride (reverse-engineer-guide/05,
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

/** Columns the zone may come back under (undocumented; stub returns none). */
const ZONE_COLUMNS = ['o_zone_num', 'zone_num', 'o_zone', 'zone', 'zone_number', 'o_zonenum'];

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
 * `o_code` "0" is a match (with the zone number when the row carries one);
 * any other code, or none, is "unmatched" — it fails closed into the
 * acknowledgement rather than silently booking an unknown address.
 */
export function toZoneState(response: GatewayResponse): ZoneState {
  const row = mapRows(response)[0];
  const matched = hasColumn(row, ['o_code'])
    ? pick(row, ['o_code']) === DB_SUCCESS_CODE
    : pick(row, ZONE_COLUMNS) !== '';
  return { status: matched ? 'matched' : 'unmatched', zoneNum: matched ? pick(row, ZONE_COLUMNS) : '' };
}
