import { createContext, type ReactNode, useContext, useMemo } from 'react';

import type { PreferencesValue } from '@/components/preferences/preferences';
import type { PersonalInfoValue } from '@/components/profile/PersonalInfoSection';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { PREFERENCES_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useFetchData } from '@/hooks/useFetchData';
import { usePostData } from '@/hooks/usePostData';
import { type ErrorDisplay, type GatewayJData, mapRows } from '@/services/gateway';
import {
  assertProfileUpdated,
  type CustomerProfile,
  toCustomerProfile,
  updatePreferencesJData,
  updateProfileJData,
} from '@/services/profile';

/**
 * The signed-in customer's profile (`PROF.S.LOAD_PROFILE`), loaded once after
 * login and shared by every screen that shows it.
 *
 * The raw profile row stays in here: `PROF.U.PROFILE` replaces the whole
 * profile, so an update re-sends the loaded row with the edits on top, and
 * screens only ever see the mapped {@link CustomerProfile}.
 */

export type ProfileContextValue = {
  /** `null` while loading, after a failed load, or when signed out. */
  profile: CustomerProfile | null;
  isLoading: boolean;
  errorDisplay?: ErrorDisplay;
  refetch: () => void;
  /**
   * Saves the Personal Info panel, then reloads the profile. Throws
   * `ProfileError` when the server refuses, `GatewayError` when the call fails.
   */
  updatePersonalInfo: (personal: PersonalInfoValue) => Promise<void>;
  /** Saves the Preferences screen, then reloads the profile. Throws like `updatePersonalInfo`. */
  updatePreferences: (preferences: PreferencesValue) => Promise<void>;
};

// Not exported: screens go through useProfile(), which guards a missing provider.
const ProfileContext = createContext<ProfileContextValue | null>(null);

const SIGNED_OUT: ProfileContextValue = {
  profile: null,
  isLoading: false,
  refetch: () => undefined,
  updatePersonalInfo: () => Promise.reject(new Error('No signed-in profile to update.')),
  updatePreferences: () => Promise.reject(new Error('No signed-in profile to update.')),
};

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  if (!session) {
    return <ProfileContext.Provider value={SIGNED_OUT}>{children}</ProfileContext.Provider>;
  }

  // Keyed so a different login never sees the previous one's profile.
  return (
    <SignedInProfileProvider key={session.loginId} loginId={session.loginId}>
      {children}
    </SignedInProfileProvider>
  );
}

/** Mounted only with a session: the fetch hook runs on mount and has no off switch. */
function SignedInProfileProvider({ loginId, children }: { loginId: string; children: ReactNode }) {
  const { data, isLoading, errorDisplay, refetch } = useFetchData(
    ACTION_CODES.LOAD_PROFILE,
    GATEWAY_VIEW_NAME,
    { P_LOGIN_ID: loginId },
  );
  const { mutateAsync: sendUpdate } = usePostData();

  // Keyed on the response, so the profile keeps its identity until a load lands.
  const row = useMemo(() => (data ? mapRows(data)[0] : undefined), [data]);
  const profile = useMemo(() => toCustomerProfile(row ? [row] : undefined), [row]);

  /** Sends the whole profile built from the loaded row, then reloads it. */
  const saveProfile = async (build: (loaded: Record<string, string>) => GatewayJData, rejected?: string) => {
    if (!row) throw new Error('The profile has not loaded yet.');
    const response = await sendUpdate(
      ACTION_CODES.UPDATE_PROFILE,
      GATEWAY_VIEW_NAME,
      build(row),
      // A write: a lost response must not send the update twice.
      { retry: false },
    );
    assertProfileUpdated(response, rejected);
    refetch();
  };

  const updatePersonalInfo = (personal: PersonalInfoValue) =>
    saveProfile((loaded) => updateProfileJData(loginId, loaded, personal));

  const updatePreferences = (preferences: PreferencesValue) =>
    saveProfile(
      (loaded) => updatePreferencesJData(loginId, loaded, preferences),
      PREFERENCES_MESSAGES.UPDATE_REJECTED,
    );

  const value: ProfileContextValue = {
    profile,
    isLoading,
    errorDisplay,
    refetch,
    updatePersonalInfo,
    updatePreferences,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/** The signed-in profile and its update. Must be used inside `ProfileProvider`. */
export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile must be used inside ProfileProvider');
  return value;
}
