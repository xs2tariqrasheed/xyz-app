import { sessionMaxAgeMs } from '@/config/gateway';
import { DB_SUCCESS_CODE } from '@/constants/actionCodes';
import {
  CHANGE_PASSWORD_MESSAGES,
  FORGOT_PASSWORD_MESSAGES,
  LOGIN_MESSAGES,
} from '@/constants/messages';
import { GatewayError, type GatewayJData, type GatewayResponse, mapRows } from '@/services/gateway';
import { isValidEmail } from '@/utils/validation';

/**
 * Authentication against the API gateway.
 *
 * A login succeeds only when BOTH levels agree: the gateway executed the call
 * (`JHeader.ActionCode` 0, checked in `callGateway`) AND the procedure
 * accepted the credentials (`o_code` "0" in the first row). Anything missing
 * fails closed.
 *
 * The backend issues no token, so the session is only a record that this
 * device completed that check for a login ID, and when — plus the profile's
 * VIP number, which the procedure returns in `o_message` on success
 * (docs/XYZ_INTEGRATION_GUIDE.md §10). It is never re-verified on restore —
 * that needs a server-issued credential.
 */

export type Credentials = {
  email: string;
  password: string;
  /** Keep the session across app restarts rather than for this run/tab only. */
  remember: boolean;
};

/** Thrown when the server rejects the credentials, as opposed to failing. */
export class AuthError extends Error {
  constructor(message: string = LOGIN_MESSAGES.CREDENTIALS_NOT_RECOGNISED) {
    super(message);
    this.name = 'AuthError';
  }
}

/** 2 added `vipNumber`; a stored v1 session no longer parses and signs out once. */
const SESSION_VERSION = 2;

export type AuthSession = {
  version: typeof SESSION_VERSION;
  /** Login ID the credentials were checked for (the normalised email). */
  loginId: string;
  /** The profile's VIP number from the login response's `o_message`; '' when it sent none. */
  vipNumber: string;
  /** ISO timestamp of the successful credential check. */
  authenticatedAt: string;
};

export function normalizeLoginId(email: string): string {
  return email.trim().toLowerCase();
}

/** `JData` for {@link ACTION_CODES.CHECK_LOGIN_CREDENTIALS}. */
export function loginJData(loginId: string, password: string): GatewayJData {
  return { P_LOGIN_ID: loginId, P_PASSWORD: password };
}

/**
 * Turns a login response the gateway accepted into a session, or throws.
 * The procedure's own verdict (`o_code`) decides; a missing one fails closed.
 * On success `o_message` carries the VIP number; on a refusal, the reason.
 */
export function sessionFromLoginResponse(
  response: GatewayResponse,
  loginId: string,
  at: Date,
): AuthSession {
  const result = mapRows(response)[0];
  if (!result || !('o_code' in result) || !('o_message' in result)) {
    throw new GatewayError('parsing', 'The login response has no result code.');
  }
  if (result.o_code !== DB_SUCCESS_CODE) {
    throw new AuthError(result.o_message || undefined);
  }
  return createSession(loginId, result.o_message.trim(), at);
}

/** `JData` for {@link ACTION_CODES.PASSWORD_RECOVERY}. */
export function passwordRecoveryJData(loginId: string): GatewayJData {
  return { P_LOGIN_ID: loginId };
}

/**
 * Throws unless the procedure sent the recovery email. It answers `o_code` /
 * `o_message`: "0" / "Sendmail" when it mailed the password
 * (docs/XYZ_INTEGRATION_GUIDE.md §10). Any other code is a refusal; a
 * response without `o_code` fails closed.
 */
export function assertPasswordRecoverySent(response: GatewayResponse): void {
  const result = mapRows(response)[0];
  if (!result || !('o_code' in result)) {
    throw new GatewayError('parsing', 'The password recovery response has no result code.');
  }
  if (result.o_code !== DB_SUCCESS_CODE) {
    throw new AuthError(result.o_message || FORGOT_PASSWORD_MESSAGES.REQUEST_REJECTED);
  }
}

/** `JData` for {@link ACTION_CODES.CHANGE_PASSWORD}. */
export function changePasswordJData(
  loginId: string,
  oldPassword: string,
  newPassword: string,
): GatewayJData {
  return { P_LOGIN_ID: loginId, P_OLD_PASSWORD: oldPassword, P_NEW_PASSWORD: newPassword };
}

/**
 * Throws when the procedure refused the change (e.g. a wrong old password).
 * The contract lists no outputs for this code, so a response without
 * `o_code` counts as changed — the gateway itself already accepted the call.
 */
export function assertPasswordChanged(response: GatewayResponse): void {
  const result = mapRows(response)[0];
  if (result && 'o_code' in result && result.o_code !== DB_SUCCESS_CODE) {
    throw new AuthError(result.o_message || CHANGE_PASSWORD_MESSAGES.REJECTED);
  }
}

export function createSession(loginId: string, vipNumber: string, at: Date): AuthSession {
  return { version: SESSION_VERSION, loginId, vipNumber, authenticatedAt: at.toISOString() };
}

/**
 * Turns a stored value back into a session, or `null` when it is malformed,
 * from another schema version, dated in the future, or past its max age.
 */
export function parseStoredSession(raw: string | null, now: Date): AuthSession | null {
  if (!raw) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;

  const { version, loginId, vipNumber, authenticatedAt } = data as Record<string, unknown>;
  if (version !== SESSION_VERSION) return null;
  if (typeof loginId !== 'string' || !isValidEmail(loginId)) return null;
  if (typeof vipNumber !== 'string') return null;
  if (typeof authenticatedAt !== 'string') return null;

  const at = Date.parse(authenticatedAt);
  if (Number.isNaN(at)) return null;

  const age = now.getTime() - at;
  if (age < 0 || age > sessionMaxAgeMs) return null;

  return { version, loginId, vipNumber, authenticatedAt };
}
