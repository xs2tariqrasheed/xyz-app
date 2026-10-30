import { useMemo } from 'react';

import type { SelectOption } from '@/components/ui/SelectField';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { useFetchData } from '@/hooks/useFetchData';
import { type AccountOnFile, accountVipJData, toAccountOnFile } from '@/services/billing';
import { type GatewayResponse, mapRows } from '@/services/gateway';
import { pick } from '@/services/gatewayRows';
import type { AddressSuggestion } from '@/services/places';
import { toAddressRecords, toSavedSuggestions, userAddressesJData } from '@/services/savedPlaces';
import { toVehicleTypes, type VehicleType } from '@/services/vehicleTypes';

/**
 * Read-only lookups behind the booking steps (reverse-engineer-implemented/guide/05,
 * 14–17). Each is a single-screen read through `useFetchData`, mapped once
 * here. A lookup the gateway refuses or cannot answer leaves its list empty:
 * the step then simply offers nothing extra, never local stand-in data.
 */

export type Lookup<T> = {
  items: readonly T[];
  loading: boolean;
  failed: boolean;
  retry: () => void;
};

/** Maps a response, treating a mapping refusal like a failed call. */
function safely<T>(data: GatewayResponse | undefined, map: (response: GatewayResponse) => T[]): { items: T[]; failed: boolean } {
  if (!data) return { items: [], failed: false };
  try {
    return { items: map(data), failed: false };
  } catch {
    return { items: [], failed: true };
  }
}

function useLookup<T>(
  actionCode: Parameters<typeof useFetchData>[0],
  jData: Parameters<typeof useFetchData>[2],
  map: (response: GatewayResponse) => T[],
): Lookup<T> {
  const { data, isLoading, isError, refetch } = useFetchData(actionCode, GATEWAY_VIEW_NAME, jData);
  // Keyed on the response, so the list keeps its identity until a load lands.
  const mapped = useMemo(() => safely(data, map), [data, map]);
  return { items: mapped.items, loading: isLoading, failed: isError || mapped.failed, retry: refetch };
}

/** `RES.S.VEHICLE_TYPE` — the car-type tiles. */
export function useVehicleTypes(): Lookup<VehicleType> {
  return useLookup(ACTION_CODES.VEHICLE_TYPE, {}, toVehicleTypes);
}

// Both send the verified 17-column address record (guide §10).
const toProfilePlaces = (response: GatewayResponse) => toSavedSuggestions(toAddressRecords(response), 'profile');
const toCompanyPlaces = (response: GatewayResponse) => toSavedSuggestions(toAddressRecords(response), 'company');

/** `PROF.S.USER_PROFILE_ADDRESSES` — the profile's home / office address. */
export function useProfilePlaces(loginId: string): Lookup<AddressSuggestion> {
  return useLookup(ACTION_CODES.USER_PROFILE_ADDRESSES, userAddressesJData(loginId), toProfilePlaces);
}

/** `PROF.S.CORPORATE_ADDRESSES` — mount only with an account number. */
export function useCompanyPlaces(accountNumber: string): Lookup<AddressSuggestion> {
  return useLookup(ACTION_CODES.CORPORATE_ADDRESSES, { P_ACCOUNT_NUM: accountNumber.trim() }, toCompanyPlaces);
}

const GRANTOR_COLUMNS = {
  loginId: ['login_id_from', 'login_id', 'p_login_id_from'],
  firstName: ['first_name'],
  lastName: ['last_name'],
} as const;

const toGrantors = (response: GatewayResponse): SelectOption<string>[] =>
  mapRows(response).flatMap((row) => {
    const loginId = pick(row, GRANTOR_COLUMNS.loginId);
    if (!loginId) return [];
    const name = [pick(row, GRANTOR_COLUMNS.firstName), pick(row, GRANTOR_COLUMNS.lastName)].filter(Boolean).join(' ');
    return [{ value: loginId, label: name || loginId, description: name ? loginId : undefined }];
  });

/**
 * `PROF.S.LOAD_PROFILE_WHO_GRANTED_ACCESS` — people who let this login book
 * for them (Step 1 "Reservation for").
 */
export function useGrantedProfiles(loginId: string): Lookup<SelectOption<string>> {
  return useLookup(ACTION_CODES.LOAD_PROFILE_WHO_GRANTED_ACCESS, { P_LOGIN_ID_TO: loginId }, toGrantors);
}

/** Contact types (guide 01): 3 home, 4 office, 6 cell, 8 e-mail. */
export const CONTACT_COLUMN_IDS = { home: 3, office: 4, cell: 6, email: 8 } as const;

const CONTACT_VALUE_COLUMNS = ['contact_number', 'column_value', 'o_columnvalue', 'value', 'contactnumber'];

const toContactValues = (response: GatewayResponse): string[] => [
  ...new Set(mapRows(response).map((row) => pick(row, CONTACT_VALUE_COLUMNS)).filter(Boolean)),
];

/** `PROF.S.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE` — the profile's contacts of one type. */
export function useContactValues(loginId: string, columnId: number): Lookup<string> {
  return useLookup(
    ACTION_CODES.LOAD_PROFILE_COLUMN_VALUES_BY_TYPE,
    { P_LOGIN_ID: loginId, P_COLUMN_ID: columnId },
    toContactValues,
  );
}

const toAccountList = (response: GatewayResponse): AccountOnFile[] => [toAccountOnFile(response)];

/** `PROF.S.ACCOUNT_VIP_NUM` with blanks — the account and VIP number on file. */
export function useAccountOnFile(loginId: string): AccountOnFile | null {
  const lookup = useLookup(ACTION_CODES.ACCOUNT_VIP_NUM, accountVipJData(loginId), toAccountList);
  return lookup.items[0] ?? null;
}
