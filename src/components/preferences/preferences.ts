/** The two switches the preferences panel owns. */
export type PreferencesValue = {
  /** Confirm a reservation by phone as well as in the app. */
  confirmByPhone: boolean;
  /** Opt in to occasional promotions. */
  subscribeSpecialOffers: boolean;
};

/** What a customer starts with before they ever open the page. */
export const DEFAULT_PREFERENCES: PreferencesValue = {
  confirmByPhone: false,
  subscribeSpecialOffers: false,
};

/** Flat by design — a value compare, so the Update button knows it has work. */
export function preferencesEqual(a: PreferencesValue, b: PreferencesValue): boolean {
  return a.confirmByPhone === b.confirmByPhone && a.subscribeSpecialOffers === b.subscribeSpecialOffers;
}
