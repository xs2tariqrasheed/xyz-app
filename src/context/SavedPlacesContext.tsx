import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { useAuth } from '@/context/AuthContext';
import { useFetchData } from '@/hooks/useFetchData';
import { type ErrorDisplay, mapRows } from '@/services/gateway';
import type { AddressSuggestion } from '@/services/places';
import { toSavedSuggestions, userAddressesJData } from '@/services/savedPlaces';

/**
 * The customer's saved addresses (`PROF.S.USER_ADDRESSES`), loaded once per
 * login and shared by the Express Checkout panel on Home and the address
 * fields of the booking form (reverse-engineer-guide/05, 06).
 */

export type SavedPlacesContextValue = {
  places: readonly AddressSuggestion[];
  isLoading: boolean;
  errorDisplay?: ErrorDisplay;
  refetch: () => void;
};

// Not exported: screens go through useSavedPlaces(), which guards a missing provider.
const SavedPlacesContext = createContext<SavedPlacesContextValue | null>(null);

const SIGNED_OUT: SavedPlacesContextValue = {
  places: [],
  isLoading: false,
  refetch: () => undefined,
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

  // Keyed on the response, so the list keeps its identity until a load lands.
  const places = useMemo(() => toSavedSuggestions(data ? mapRows(data) : [], 'saved'), [data]);
  const value: SavedPlacesContextValue = { places, isLoading, errorDisplay, refetch };

  return <SavedPlacesContext.Provider value={value}>{children}</SavedPlacesContext.Provider>;
}

/** The signed-in customer's saved addresses. Must be used inside `SavedPlacesProvider`. */
export function useSavedPlaces(): SavedPlacesContextValue {
  const value = useContext(SavedPlacesContext);
  if (!value) throw new Error('useSavedPlaces must be used inside SavedPlacesProvider');
  return value;
}
