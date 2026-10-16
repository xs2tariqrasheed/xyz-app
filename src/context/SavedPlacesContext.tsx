import { createContext, type ReactNode, useContext, useMemo } from 'react';

import type { AddressDraft, SavedAddress } from '@/components/addresses/savedAddress';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { useAuth } from '@/context/AuthContext';
import { useFetchData } from '@/hooks/useFetchData';
import { usePostData } from '@/hooks/usePostData';
import {
  addAddressJData,
  assertAddressDeleted,
  assertAddressSaved,
  deleteAddressJData,
  toSavedAddresses,
  updateAddressJData,
} from '@/services/addressBook';
import { type ErrorDisplay, mapRows } from '@/services/gateway';
import type { AddressSuggestion } from '@/services/places';
import { toSavedSuggestions, userAddressesJData } from '@/services/savedPlaces';

/**
 * The customer's saved addresses (`PROF.S.USER_ADDRESSES`), loaded once per
 * login and shared by My Addresses, the Express Checkout panel on Home and the
 * address fields of the booking form (reverse-engineer-guide/05, 06, 11).
 * Adding, changing or deleting one reloads the list for all of them.
 */

export type SavedPlacesContextValue = {
  /** The list as booking suggestions. */
  places: readonly AddressSuggestion[];
  /** The same list as editable address-book entries. */
  addresses: readonly SavedAddress[];
  isLoading: boolean;
  errorDisplay?: ErrorDisplay;
  refetch: () => void;
  /** `PROF.I.USER_ADDRESS`, or `PROF.U.USER_ADDRESS` when `id` is given. Throws on refusal. */
  saveAddress: (draft: AddressDraft, id?: string) => Promise<void>;
  /** `PROF.D.USER_ADDRESS`. Throws on refusal. */
  deleteAddress: (id: string) => Promise<void>;
};

// Not exported: screens go through useSavedPlaces(), which guards a missing provider.
const SavedPlacesContext = createContext<SavedPlacesContextValue | null>(null);

const notSignedIn = () => Promise.reject(new Error('No signed-in customer.'));

const SIGNED_OUT: SavedPlacesContextValue = {
  places: [],
  addresses: [],
  isLoading: false,
  refetch: () => undefined,
  saveAddress: notSignedIn,
  deleteAddress: notSignedIn,
};

export function SavedPlacesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  if (!session) {
    return <SavedPlacesContext.Provider value={SIGNED_OUT}>{children}</SavedPlacesContext.Provider>;
  }

  // Keyed so a different login never sees the previous one's addresses.
  return (
    <SignedInSavedPlacesProvider key={session.loginId} loginId={session.loginId}>
      {children}
    </SignedInSavedPlacesProvider>
  );
}

/** Mounted only with a session: the fetch hook runs on mount and has no off switch. */
function SignedInSavedPlacesProvider({ loginId, children }: { loginId: string; children: ReactNode }) {
  const { data, isLoading, errorDisplay, refetch } = useFetchData(
    ACTION_CODES.USER_ADDRESSES,
    GATEWAY_VIEW_NAME,
    userAddressesJData(loginId),
  );
  const { mutateAsync: send } = usePostData();

  // Keyed on the response, so the lists keep their identity until a load lands.
  const rows = useMemo(() => (data ? mapRows(data) : []), [data]);
  const places = useMemo(() => toSavedSuggestions(rows, 'saved'), [rows]);
  const addresses = useMemo(() => toSavedAddresses(rows), [rows]);

  const saveAddress = async (draft: AddressDraft, id?: string) => {
    const response = id
      ? await send(ACTION_CODES.UPDATE_USER_ADDRESS, GATEWAY_VIEW_NAME, updateAddressJData(loginId, id, draft), {
          retry: false,
        })
      : // A write: a lost response must not add the location twice.
        await send(ACTION_CODES.ADD_USER_ADDRESS, GATEWAY_VIEW_NAME, addAddressJData(loginId, draft), {
          retry: false,
        });
    assertAddressSaved(response);
    refetch();
  };

  const deleteAddress = async (id: string) => {
    const response = await send(ACTION_CODES.DELETE_USER_ADDRESS, GATEWAY_VIEW_NAME, deleteAddressJData(loginId, id), {
      retry: false,
    });
    assertAddressDeleted(response);
    // Ids may be list positions (guide 05), which shift after a delete: reload.
    refetch();
  };

  const value: SavedPlacesContextValue = {
    places,
    addresses,
    isLoading,
    errorDisplay,
    refetch,
    saveAddress,
    deleteAddress,
  };

  return <SavedPlacesContext.Provider value={value}>{children}</SavedPlacesContext.Provider>;
}

/** The signed-in customer's saved addresses. Must be used inside `SavedPlacesProvider`. */
export function useSavedPlaces(): SavedPlacesContextValue {
  const value = useContext(SavedPlacesContext);
  if (!value) throw new Error('useSavedPlaces must be used inside SavedPlacesProvider');
  return value;
}
