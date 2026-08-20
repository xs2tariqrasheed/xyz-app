/**
 * The signed-in customer.
 *
 * A stand-in until authentication is wired up. The login stamp is a fixed
 * date rather than `new Date()` so the welcome bar renders the same value on
 * every launch instead of drifting with the clock.
 */

export type CustomerSession = {
  /** Name shown in the welcome bar. */
  name: string;
  lastLoginAt: Date;
};

export const DEMO_SESSION: CustomerSession = {
  name: 'User',
  lastLoginAt: new Date(2026, 7, 12, 9, 20, 23),
};
