import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { AppState } from 'react-native';

import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { usePostData } from '@/hooks/usePostData';
import {
  type AuthSession,
  type Credentials,
  loginJData,
  isSessionExpired,
  normalizeLoginId,
  parseStoredSession,
  sessionExpiresAt,
  sessionFromLoginResponse,
} from '@/services/auth';
import { clearSession, readSession, writeSession } from '@/services/authStorage';

/**
 * App-wide authentication state.
 *
 * Starts in `restoring` while the stored session is read and validated; the
 * root layout renders nothing until then, so no screen can redirect on a
 * guess. Only a session that passes {@link parseStoredSession} signs the user
 * back in — an unreadable or stale one is wiped.
 *
 * A session that reaches its max age while the app is open is wiped too, and
 * `sessionExpired` stays true until the user has seen the timeout screen
 * (`acknowledgeExpiry`).
 */

export type AuthStatus = 'restoring' | 'signedIn' | 'signedOut';

type AuthState = {
  status: AuthStatus;
  session: AuthSession | null;
  /** Signed out because the session timed out; the timeout screen is still due. */
  sessionExpired: boolean;
};

type AuthAction =
  | { type: 'signedIn'; session: AuthSession }
  | { type: 'signedOut' }
  | { type: 'expired' }
  | { type: 'expiryAcknowledged' };

export type AuthContextValue = AuthState & {
  /** Throws `AuthError` / `GatewayError` on failure; nothing is stored then. */
  signIn: (credentials: Credentials) => Promise<void>;
  signOut: () => Promise<void>;
  /** Called by the timeout screen once it is done; login becomes available. */
  acknowledgeExpiry: () => void;
};

// Not exported: screens go through useAuth(), which guards a missing provider.
const AuthContext = createContext<AuthContextValue | null>(null);

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'signedIn':
      return { status: 'signedIn', session: action.session, sessionExpired: false };
    case 'signedOut':
      return { status: 'signedOut', session: null, sessionExpired: false };
    case 'expired':
      return { status: 'signedOut', session: null, sessionExpired: true };
    case 'expiryAcknowledged':
      return { ...state, sessionExpired: false };
  }
}

const INITIAL_STATE: AuthState = { status: 'restoring', session: null, sessionExpired: false };

/** `setTimeout` overflows past 2³¹−1 ms (~24.8 days); longer waits re-arm. */
const MAX_TIMER_MS = 2 ** 31 - 1;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    let live = true;

    const restore = async () => {
      const session = parseStoredSession(await readSession(), new Date());
      if (!session) await clearSession().catch(() => undefined);
      if (!live) return;
      dispatch(session ? { type: 'signedIn', session } : { type: 'signedOut' });
    };

    void restore();
    return () => {
      live = false;
    };
  }, []);

  const { session } = state;

  // Expire the session while the app is open. Native timers pause in the
  // background, so returning to the foreground checks again.
  useEffect(() => {
    if (!session) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = () => {
      clearTimeout(timer);
      if (isSessionExpired(session, new Date())) {
        void clearSession()
          .catch(() => undefined)
          .finally(() => dispatch({ type: 'expired' }));
        return;
      }
      const remaining = sessionExpiresAt(session) - Date.now();
      timer = setTimeout(check, Math.min(remaining + 1, MAX_TIMER_MS));
    };

    check();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [session]);

  const login = usePostData();
  const { mutateAsync: sendLogin } = login;

  const signIn = useCallback(
    async ({ email, password, remember }: Credentials) => {
      const loginId = normalizeLoginId(email);
      const response = await sendLogin(
        ACTION_CODES.CHECK_LOGIN_CREDENTIALS,
        GATEWAY_VIEW_NAME,
        loginJData(loginId, password),
      );
      const session = sessionFromLoginResponse(response, loginId, new Date());
      await writeSession(JSON.stringify(session), remember);
      dispatch({ type: 'signedIn', session });
    },
    [sendLogin],
  );

  const signOut = useCallback(async () => {
    try {
      await clearSession();
    } finally {
      // Leave the app even if the device refused the delete.
      dispatch({ type: 'signedOut' });
    }
  }, []);

  const acknowledgeExpiry = useCallback(() => dispatch({ type: 'expiryAcknowledged' }), []);

  const value = useMemo(
    () => ({ ...state, signIn, signOut, acknowledgeExpiry }),
    [state, signIn, signOut, acknowledgeExpiry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Auth state and actions. Must be used inside `AuthProvider`. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
