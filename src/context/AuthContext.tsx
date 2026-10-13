import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { usePostData } from '@/hooks/usePostData';
import {
  type AuthSession,
  type Credentials,
  loginJData,
  normalizeLoginId,
  parseStoredSession,
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
 */

export type AuthStatus = 'restoring' | 'signedIn' | 'signedOut';

type AuthState = {
  status: AuthStatus;
  session: AuthSession | null;
};

type AuthAction = { type: 'signedIn'; session: AuthSession } | { type: 'signedOut' };

export type AuthContextValue = AuthState & {
  /** Throws `AuthError` / `GatewayError` on failure; nothing is stored then. */
  signIn: (credentials: Credentials) => Promise<void>;
  signOut: () => Promise<void>;
};

// Not exported: screens go through useAuth(), which guards a missing provider.
const AuthContext = createContext<AuthContextValue | null>(null);

function reducer(_state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'signedIn':
      return { status: 'signedIn', session: action.session };
    case 'signedOut':
      return { status: 'signedOut', session: null };
  }
}

const INITIAL_STATE: AuthState = { status: 'restoring', session: null };

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

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Auth state and actions. Must be used inside `AuthProvider`. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
