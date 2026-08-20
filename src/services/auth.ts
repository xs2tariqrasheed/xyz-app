/**
 * Authentication.
 *
 * There is no auth backend yet, so {@link signIn} is a STUB: it waits, then
 * reports success for any credentials. Nothing is persisted and no session
 * exists — the app has no logged-in state to write to.
 *
 * Replacing it: keep the signature, POST the credentials, store the returned
 * token, and throw {@link AuthError} on a rejected sign-in so the login screen
 * shows its error banner without any change of its own.
 */

/** How long the stub pretends to talk to a server. */
const STUB_LATENCY_MS = 600;

export type Credentials = {
  email: string;
  password: string;
  /** Ask the server for a long-lived session rather than a per-tab one. */
  remember: boolean;
};

/** Thrown when the server rejects the credentials, as opposed to failing. */
export class AuthError extends Error {
  constructor(message = 'Those credentials were not recognised.') {
    super(message);
    this.name = 'AuthError';
  }
}

export async function signIn(_credentials: Credentials): Promise<void> {
  // TODO: replace with the real sign-in request.
  await new Promise((resolve) => setTimeout(resolve, STUB_LATENCY_MS));
}
