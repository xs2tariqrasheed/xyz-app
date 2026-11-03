/**
 * User-facing copy — labels, validation, success and error messages.
 *
 * Screens and services import these rather than spelling the text inline, so
 * every message can be reviewed and changed in one place. Developer-only
 * error text (thrown, logged, never rendered) stays next to its code.
 */

/** Copy shared by every screen that talks to the gateway. */
export const COMMON_MESSAGES = {
  NETWORK_ERROR: "We couldn't reach the server. Check your connection and try again.",
  PARSING_ERROR: 'Something went wrong. Please try again.',
  CONNECTION_PROBLEM_TITLE: 'Connection problem',
  SOMETHING_WENT_WRONG_TITLE: 'Something went wrong',
  REQUEST_NOT_COMPLETED_TITLE: 'Request not completed',
  /** Fallback when the gateway rejects a call without a message of its own. */
  REQUEST_NOT_ACCEPTED: 'The request was not accepted.',
  /** Shown in place of a field the action code's response has no value for. */
  NOT_AVAILABLE: 'Not available',
} as const;

/** Captcha control, shared by the auth screens. */
export const CAPTCHA_MESSAGES = {
  LABEL: 'Captcha',
  CHECKBOX_LABEL: "I'm not a robot",
  VERIFYING: 'Verifying…',
  REQUIRED: 'Confirm you are not a robot.',
  UNAVAILABLE: 'Verification is unavailable right now. Please try again later.',
  FAILED: 'Verification failed. Please try again.',
  EXPIRED: 'Verification expired. Check the box again.',
  NETWORK: 'Could not reach verification. Check your connection and try again.',
} as const;

export const LOGIN_MESSAGES = {
  SCREEN_TITLE: 'Log in',
  EMAIL_LABEL: 'Email Address',
  EMAIL_PLACEHOLDER: 'you@example.com',
  PASSWORD_LABEL: 'Password',
  EMAIL_REQUIRED: 'Enter your email address.',
  EMAIL_INVALID: "That doesn't look like an email address.",
  PASSWORD_REQUIRED: 'Enter your password.',
  REMEMBER_ME: 'Remember me',
  REMEMBER_ME_HINT: 'Keeps you signed in on this device',
  FORGOT_PASSWORD_LINK: 'Forgot your password?',
  REGISTER_LINK: 'Create an account',
  SUBMIT: 'Log In',
  SUBMITTING: 'Logging in…',
  SIGN_IN_FAILED_TITLE: 'Sign-in failed',
  /** Server rejected the credentials without saying why. */
  CREDENTIALS_NOT_RECOGNISED: 'Those credentials were not recognised.',
} as const;

export const FORGOT_PASSWORD_MESSAGES = {
  SCREEN_TITLE: 'Reset your password',
  LOGIN_NAME_LABEL: 'Login Name',
  LOGIN_NAME_PLACEHOLDER: 'you@example.com',
  LOGIN_NAME_REQUIRED: 'Enter your login name.',
  LOGIN_NAME_INVALID: "That doesn't look like an email address.",
  SUBMIT: 'Send',
  SUBMITTING: 'Sending…',
  REQUEST_FAILED_TITLE: 'Request not sent',
  /** Server refused the request without saying why. */
  REQUEST_REJECTED: "We couldn't send your password for that login name.",
  SUCCESS_TITLE: 'Email sent',
  SUCCESS_MESSAGE: 'Your password has been sent to your email.',
  BACK_TO_LOGIN: 'Back to log in',
} as const;

export const CHANGE_PASSWORD_MESSAGES = {
  SCREEN_TITLE: 'Change password',
  FORM_TITLE: 'Please enter your old and new password',
  OLD_PASSWORD_LABEL: 'Old password',
  OLD_PASSWORD_PLACEHOLDER: 'Your current password',
  NEW_PASSWORD_LABEL: 'New password',
  NEW_PASSWORD_PLACEHOLDER: '4 to 10 characters',
  CONFIRM_PASSWORD_LABEL: 'Confirm new password',
  CONFIRM_PASSWORD_PLACEHOLDER: 'Re-type the new password',
  RULE_LENGTH: '4 to 10 characters, no quotation marks',
  RULE_CASE: 'An upper and a lower case letter',
  RULE_NUMBER: 'At least one number',
  OLD_PASSWORD_REQUIRED: 'Enter your current password.',
  NEW_PASSWORD_REQUIRED: 'Choose a new password.',
  NEW_PASSWORD_WEAK: 'This password does not meet the requirements below yet.',
  NEW_PASSWORD_UNCHANGED: 'Your new password must be different from your current one.',
  CONFIRM_PASSWORD_REQUIRED: 'Re-type your new password.',
  CONFIRM_PASSWORD_MISMATCH: 'The two passwords do not match.',
  SUBMIT: 'Update',
  SUBMITTING: 'Updating…',
  FAILED_TITLE: 'Password not changed',
  /** Server refused the change without saying why. */
  REJECTED: "We couldn't change your password.",
  SUCCESS_MESSAGE: 'Password updated. Use your new password the next time you sign in.',
} as const;

/**
 * Profile screen and the personal info panel it shares with registration
 * (reverse-engineer-implemented/guide/07-profile-personal-info.md).
 */
export const PROFILE_MESSAGES = {
  SCREEN_TITLE: 'Profile',
  PANEL_TITLE: 'Personal Info',
  UNSAVED_BADGE: 'UNSAVED',
  FIRST_NAME_LABEL: 'First name',
  FIRST_NAME_PLACEHOLDER: 'e.g. Amara',
  LAST_NAME_LABEL: 'Last name',
  LAST_NAME_PLACEHOLDER: 'e.g. Okafor',
  US_PHONE_LABEL: 'Callback phone (US)',
  INTL_PHONE_LABEL: 'Callback phone (international)',
  FAX_LABEL: 'Fax',
  FIRST_NAME_REQUIRED: 'Enter your first name.',
  FIRST_NAME_TOO_LONG: 'First name can be at most 15 characters.',
  FIRST_NAME_INVALID: 'First name cannot contain digits or quotation marks.',
  LAST_NAME_REQUIRED: 'Enter your last name.',
  LAST_NAME_LENGTH: 'Last name must be 2 to 20 characters.',
  LAST_NAME_INVALID: 'Last name cannot contain digits or quotation marks.',
  US_PHONE_INVALID: 'A US number needs 10 digits, area code first, not starting with 0 or 1.',
  CALLBACK_REQUIRED: 'Add a callback number — US or international.',
  INTL_COUNTRY_REQUIRED: 'Choose the country for the international number.',
  INTL_NUMBER_INCOMPLETE: 'Add the full international number.',
  FAX_COUNTRY_REQUIRED: 'Choose the country for the fax number.',
  FAX_NUMBER_INCOMPLETE: 'Add the full fax number.',
  EXT_TOO_LONG: 'An extension can be at most 5 digits.',
  ONE_FIELD_NEEDS_ATTENTION: '1 field needs a look.',
  /** Follows the count: "3 fields need a look." */
  FIELDS_NEED_ATTENTION: 'fields need a look.',
  DISCARD: 'Discard changes',
  UPDATE: 'Update',
  UPDATING: 'Updating…',
  UPDATE_FAILED_TITLE: 'Personal info not updated',
  /** Server refused the update without saying why. */
  UPDATE_REJECTED: "We couldn't update your personal information.",
  UPDATE_SUCCESS: 'Personal information updated.',
  LOAD_FAILED_TITLE: 'Your profile could not be loaded',
  RETRY: 'Try again',
  MAILING_ADDRESS_LINK: 'Update mailing address',
  CHANGE_PASSWORD_LINK: 'Change password',
} as const;

/** Preferences screen; the form labels are shared with registration. */
export const PREFERENCES_MESSAGES = {
  SCREEN_TITLE: 'Update Preferences',
  PANEL_TITLE: 'Preferences',
  CONFIRMATION_LABEL: 'Confirmation through',
  CONFIRM_BY_PHONE: 'Phone',
  SPECIAL_OFFERS_LABEL: 'Subscribe special offer',
  SPECIAL_OFFERS_OPTION: 'Send me special offers',
  DISCARD: 'Discard changes',
  UPDATE: 'Update',
  UPDATING: 'Updating…',
  UPDATE_SUCCESS: 'Preferences updated.',
  UPDATE_FAILED_TITLE: 'Preferences not updated',
  /** Server refused the update without saying why. */
  UPDATE_REJECTED: "We couldn't update your preferences.",
  LOAD_FAILED_TITLE: 'Your preferences could not be loaded',
  /** The profile came back without any preferences. */
  UNAVAILABLE: 'Your preferences are not available right now.',
  RETRY: 'Try again',
} as const;

/**
 * Mailing address: the Update Mailing Address screen and the registration
 * address step, which share the form (reverse-engineer-implemented/guide/08).
 */
export const MAILING_ADDRESS_MESSAGES = {
  SCREEN_TITLE: 'Update Mailing Address',
  PANEL_TITLE: 'Mailing Address',
  /** The profile came back without a mailing address. */
  UNAVAILABLE: 'Your mailing address is not available right now.',

  COUNTRY_LABEL: 'Country',
  COUNTRY_PLACEHOLDER: 'Select a country',
  COUNTRY_SEARCH: 'Search countries',
  STATE_LABEL: 'State',
  STATE_PLACEHOLDER: 'Select a state',
  STATE_SEARCH: 'Search states',
  REGION_LABEL: 'State / Province',
  REGION_PLACEHOLDER: 'Region',
  CITY_LABEL: 'City',
  CITY_PLACEHOLDER: 'e.g. Manhattan',
  ZIP_LABEL: 'ZIP',
  ZIP_PLACEHOLDER: '10103',
  POSTAL_CODE_LABEL: 'Postal code',
  POSTAL_CODE_PLACEHOLDER: 'Postal code',
  BUILDING_LABEL: 'Building no.',
  BUILDING_PLACEHOLDER: '666',
  STREET_LABEL: 'Street name',
  STREET_PLACEHOLDER: '5 Ave',
  CROSS_STREET_LABEL: 'Cross street',
  CROSS_STREET_PLACEHOLDER: '53 St',
  UNIT_LABEL: 'Apt # / Mail stop',
  UNIT_PLACEHOLDER: 'Apt 4B',
  PHONE_LABEL: 'Phone at this address (US)',
  PHONE_PLACEHOLDER: '(212) 555-0134',
  INTL_PHONE_TITLE: 'International phone',
  INTL_DIAL_LABEL: 'Country + city code',
  INTL_DIAL_PLACEHOLDER: '+44 20',
  INTL_NUMBER_LABEL: 'Phone number',
  INTL_NUMBER_PLACEHOLDER: '7123 456789',
  ADDRESS_TYPE_LABEL: 'Address type',
  ADDRESS_TYPE_HOME: 'This is my home address',
  ADDRESS_TYPE_OFFICE: 'This is my office address',

  COUNTRY_REQUIRED: 'Pick a country.',
  STATE_REQUIRED: 'Pick a state.',
  REGION_REQUIRED: 'Enter a state, province or region.',
  CITY_REQUIRED: 'Enter a city.',
  ZIP_REQUIRED: 'Enter a ZIP code.',
  ZIP_INVALID: 'Invalid zip code.',
  POSTAL_CODE_REQUIRED: 'Enter a postal code.',
  BUILDING_REQUIRED: 'Enter a building number.',
  BUILDING_INVALID: 'A building number is up to 6 digits.',
  STREET_REQUIRED: 'Enter a street name.',
  STREET_CHARACTERS: 'Street Name contains invalid character(s).',
  STREET_INVALID: 'Invalid Street Name specified.',
  UNIT_INVALID: 'Invalid apartment # specified.',
  PHONE_INVALID: 'A US number needs 10 digits, area code first, not starting with 0 or 1.',
  PHONE_REQUIRED: 'Please enter at least one Address Phone number.',
  INTL_NUMBER_REQUIRED: 'Please enter at least one Address Phone International number.',
  INTL_DIAL_REQUIRED: 'Please enter at least one Address Phone International Country+City Code.',
  INTL_NUMBER_INVALID: 'Add the full international number: country + city code, then at least 4 digits.',

  ONE_FIELD_NEEDS_ATTENTION: '1 field needs a look.',
  /** Follows the count: "3 fields need a look." */
  FIELDS_NEED_ATTENTION: 'fields need a look.',
  DISCARD: 'Discard changes',
  UPDATE: 'Update',
  UPDATING: 'Updating…',
  UPDATE_SUCCESS: 'Mailing address updated.',
  UPDATE_FAILED_TITLE: 'Mailing address not updated',
  /** Server refused the update without saying why. */
  UPDATE_REJECTED: "We couldn't update your mailing address.",
  LOAD_FAILED_TITLE: 'Your mailing address could not be loaded',
  RETRY: 'Try again',
  BACK_TO_PROFILE: 'Back to profile',
} as const;

/** Card inputs, shared by registration and the reservation billing step. */
export const CARD_MESSAGES = {
  HOLDER_LABEL: 'Name on card',
  HOLDER_PLACEHOLDER: 'e.g. Amara Okafor',
  NUMBER_LABEL: 'Card number',
  EXPIRY_LABEL: 'Expiry',
  EXPIRY_PLACEHOLDER: 'MM/YY',
  CVV_LABEL: 'Security code',
  CVV_PLACEHOLDER_AMEX: '4 digits',
  CVV_PLACEHOLDER: '3 digits',
  NUMBER_CHECKSUM: 'Check this number — the digits do not add up.',
  EXPIRY_PAST: 'Enter a future MM/YY.',
} as const;

export const REGISTER_MESSAGES = {
  SCREEN_TITLE: 'Create an account',

  STEP_ACCOUNT_TITLE: 'Account & Personal Info',
  STEP_ACCOUNT_SHORT: 'Account',
  STEP_ADDRESS_TITLE: 'Mailing Address',
  STEP_ADDRESS_SHORT: 'Address',
  STEP_BILLING_TITLE: 'Billing Info',
  STEP_BILLING_SHORT: 'Billing',

  EMAIL_LABEL: 'Email address',
  EMAIL_PLACEHOLDER: 'you@example.com',
  CONFIRM_EMAIL_LABEL: 'Confirm email',
  PASSWORD_LABEL: 'Password',
  CONFIRM_PASSWORD_LABEL: 'Confirm password',
  EMAIL_REQUIRED: 'Enter your email address.',
  EMAIL_INVALID: "That doesn't look like an email address.",
  CONFIRM_EMAIL_MISMATCH: "The email addresses don't match.",
  PASSWORD_REQUIRED: 'Choose a password.',
  PASSWORD_LENGTH: 'Use 4 to 10 characters.',
  PASSWORD_INVALID: "A password can't contain quotation marks.",
  CONFIRM_PASSWORD_MISMATCH: "The passwords don't match.",
  /** Server refused the email without saying why. */
  EMAIL_TAKEN: 'An account already uses this email address.',

  BILLING_METHOD_LABEL: 'How would you pay for your rides?',
  BILLING_CORPORATE: 'Corporate account',
  BILLING_CORPORATE_CAPTION: 'Invoiced to the company',
  BILLING_CARD: 'Credit card',
  BILLING_CARD_CAPTION: 'Billed straight to your card',
  ACCOUNT_NUMBER_LABEL: 'Account number',
  ACCOUNT_NUMBER_PLACEHOLDER: 'e.g. CORP48213',
  COMPANY_NAME_LABEL: 'Account name',
  COMPANY_NAME_PLACEHOLDER: 'e.g. Acme Corp',
  VIP_NUMBER_LABEL: 'VIP number',
  VIP_NUMBER_PLACEHOLDER: 'e.g. 2045',
  ACCOUNT_NUMBER_REQUIRED: 'Enter the account number.',
  ACCOUNT_NUMBER_INVALID: 'Use up to 10 letters, digits or spaces.',
  COMPANY_NAME_REQUIRED: 'Enter the account name.',
  COMPANY_NAME_INVALID: "Use up to 50 characters, without quotation marks.",
  VIP_NUMBER_FORMAT: 'Use up to 10 digits.',
  /** Server refused the account / name pair without saying why. */
  COMPANY_INVALID: "That account number and name don't match.",
  /** Server refused the VIP number without saying why. */
  VIP_INVALID: "That VIP number isn't on this account.",
  /** Server refused the account's requirements lookup without saying why. */
  ACCOUNT_NOT_AVAILABLE: "This account can't be used for registration.",
  CARD_HOLDER_REQUIRED: 'Enter the name on the card.',
  CARD_HOLDER_INVALID: 'Use 2 to 30 letters, spaces, periods or apostrophes.',
  CARD_NUMBER_REQUIRED: 'Enter the card number.',
  CARD_NUMBER_INVALID: 'Check the card number.',
  CARD_BRAND_UNSUPPORTED: 'We accept Visa, Mastercard, Amex and Discover.',
  CARD_EXPIRY_INVALID: 'Enter a future MM/YY.',
  CARD_CVV_INVALID: 'Enter the security code.',
  /** An account requirement field the account asks for, left empty. */
  REQUIREMENT_REQUIRED: 'Fill this in for your account.',

  CAR_PREFERENCES_TITLE: 'Car preferences',
  PREFERRED_FLEET_LABEL: 'Preferred fleet',
  PREFERRED_FLEET_PLACEHOLDER: 'e.g. ABC Fleet',
  CAR_YEAR_LABEL: 'Car year',
  CAR_YEAR_PLACEHOLDER: 'e.g. 2023',
  CAR_PHONE_LABEL: 'Car phone',
  IVR_PIN_LABEL: 'IVR PIN',
  IVR_PIN_PLACEHOLDER: '4 digits',
  SMOKING_CAR_LABEL: 'Smoking car',
  CAR_YEAR_INVALID: 'Enter a 4-digit year.',
  CAR_PHONE_INVALID: 'A US number needs 10 digits.',
  IVR_PIN_INVALID: 'Use 4 digits.',

  BACK: 'Back',
  NEXT: 'Next',
  CHECKING: 'Checking…',
  SUBMIT: 'Create account',
  SUBMITTING: 'Creating account…',
  FAILED_TITLE: 'Registration not completed',
  /** Server refused the profile without saying why. */
  PROFILE_REJECTED: "We couldn't create your account.",
  SUCCESS_TITLE: 'Registration complete',
  SUCCESS_MESSAGE: 'Your account is ready. Log in to make a reservation.',
  BACK_TO_LOGIN: 'Go to log in',
  HAVE_ACCOUNT_LINK: 'Already have an account? Log in',
} as const;

/** Address combobox shared by the booking form (reverse-engineer-implemented/guide/15). */
export const ADDRESS_FIELD_MESSAGES = {
  SAVED_GROUP: 'Your places',
  NO_MATCHES: 'No matching addresses.',
  SEARCH_UNAVAILABLE: 'Address search is unavailable right now. Choose one of your places or try again later.',
  ROUTE_UNAVAILABLE: 'The route preview is unavailable right now.',
  ZOOM_IN: 'Zoom in',
  ZOOM_OUT: 'Zoom out',
  FIT_ROUTE: 'Show the whole route',
} as const;

/** My Addresses: saved pickup / drop-off locations (reverse-engineer-implemented/guide/11). */
export const ADDRESS_BOOK_MESSAGES = {
  SCREEN_TITLE: 'Addresses',
  FORM_TITLE_ADD: 'Add a location',
  FORM_TITLE_EDIT: 'Edit this location',
  BADGE_NEW: 'NEW',
  BADGE_EDITING: 'EDITING',
  GROUP_ADDRESS: 'Address',
  GROUP_CALLBACK: 'Callback numbers',
  GROUP_DIRECTIONS: 'Directions',
  COUNTRY_LABEL: 'Country',
  COUNTRY_PLACEHOLDER: 'United States',
  STATE_LABEL: 'State',
  STATE_PLACEHOLDER: 'e.g. NY',
  CITY_LABEL: 'City',
  CITY_PLACEHOLDER: 'e.g. Manhattan',
  ZIP_LABEL: 'ZIP',
  ZIP_PLACEHOLDER: 'e.g. 10019',
  BUILDING_LABEL: 'Building #',
  BUILDING_PLACEHOLDER: '666',
  STREET_LABEL: 'Street name',
  STREET_PLACEHOLDER: 'e.g. 5 Ave',
  CROSS_STREET_LABEL: 'Cross street',
  CROSS_STREET_PLACEHOLDER: 'e.g. W 53 St',
  PICKUP_POINT_LABEL: 'Pickup point',
  PICKUP_POINT_PLACEHOLDER: 'e.g. North entrance',
  US_PHONE_LABEL: 'Callback phone (US)',
  US_PHONE_PLACEHOLDER: '(212) 555-0134',
  EXT_LABEL: 'Ext.',
  DIAL_CODE_LABEL: 'Dial code',
  DIAL_CODE_PLACEHOLDER: '44',
  INTL_PHONE_LABEL: 'Callback phone (international)',
  INTL_PHONE_PLACEHOLDER: '20 7946 0018',
  DIRECTIONS_LABEL: 'Notes for the driver',
  DIRECTIONS_PLACEHOLDER: 'Gate codes, which entrance to use, where to wait…',
  CANCEL: 'Cancel',
  ADD: 'Add location',
  ADDING: 'Adding…',
  SAVE: 'Save changes',
  SAVING: 'Saving…',
  LIST_TITLE: 'Saved locations',
  /** Follows the count: "3 SAVED". */
  SAVED_BADGE: 'SAVED',
  EMPTY: 'No saved locations yet',
  UNTITLED: 'Untitled location',
  PICKUP_POINT_PREFIX: 'Pickup point',
  EDIT_A11Y: 'Edit',
  DELETE_A11Y: 'Delete',
  DELETE_TITLE: 'Delete this location?',
  DELETE_SUBTITLE: 'It will no longer be offered when you book a ride.',
  DELETE_CONFIRM: 'Delete',
  DELETING: 'Deleting…',
  ADDED: 'Location added.',
  UPDATED: 'Location updated.',
  DELETED: 'Location deleted.',
  LOAD_FAILED_TITLE: 'Your saved locations could not be loaded',
  SAVE_FAILED_TITLE: 'Location not saved',
  DELETE_FAILED_TITLE: 'Location not deleted',
  /** The gateway refused a write without saying why. */
  SAVE_REJECTED: "We couldn't save this location.",
  DELETE_REJECTED: "We couldn't delete this location.",
  LOAD_REJECTED: "We couldn't load your saved locations.",
  RETRY: 'Try again',
  // Validation (reverse-engineer-implemented/guide/11 §3, 26).
  COUNTRY_REQUIRED: 'Country is required.',
  STATE_REQUIRED: 'State is required.',
  STATE_INVALID: 'Use the 2-letter state code, e.g. NY.',
  CITY_REQUIRED: 'City is required.',
  BUILDING_REQUIRED: 'Building number is required.',
  BUILDING_INVALID: 'Use digits only, up to 6.',
  STREET_REQUIRED: 'Street name is required.',
  STREET_INVALID: 'Use 4 to 30 letters, digits, spaces or . , - ( ) / &',
  CROSS_STREET_INVALID: 'Use 4 to 30 letters, digits, spaces or . , - ( ) / &',
  PICKUP_POINT_INVALID: 'Use up to 20 letters, digits, spaces or . , ~ & / - ( ) \\ #',
  ZIP_INVALID: 'Use a 5-digit ZIP, e.g. 10019.',
  US_PHONE_INVALID: 'A US number needs 10 digits, area code first, not starting with 0 or 1.',
  INTL_CODE_REQUIRED: 'Add the country dial code.',
  INTL_NUMBER_REQUIRED: 'Add the international number.',
  INTL_NUMBER_INVALID: 'Use at least 4 digits.',
  PHONE_REQUIRED: 'Add a callback number — US or international.',
  DIRECTIONS_INVALID: 'Use up to 500 characters, without quotation marks.',
} as const;

/** My Contacts: extra phones and e-mails (reverse-engineer-implemented/guide/12). */
export const CONTACTS_MESSAGES = {
  SCREEN_TITLE: 'My Contacts',
  FORM_TITLE_ADD: 'Add a contact',
  FORM_TITLE_EDIT: 'Edit this contact',
  BADGE_EDITING: 'EDITING',
  LIST_TITLE: 'Saved contacts',
  /** Follows the count: "2 SAVED". */
  SAVED_BADGE: 'SAVED',
  EMPTY: 'No contacts saved yet',
  TYPE_LABEL: 'Contact type',
  TYPE_SHEET_TITLE: 'Contact type',
  TYPE_CONFIRM: 'Use this type',
  NUMBER_LABEL: 'Contact number',
  EMAIL_LABEL: 'Email address',
  EXTENSION_LABEL: 'Ext.',
  EXTENSION_PLACEHOLDER: '101',
  PHONE_PLACEHOLDER: '(212) 555-0134',
  EMAIL_PLACEHOLDER: 'name@example.com',
  TYPE_HOME: 'Home Phone',
  TYPE_OFFICE: 'Office Phone',
  TYPE_FAX: 'Fax',
  TYPE_CELL: 'Cell Phone',
  TYPE_EMAIL: 'Email',
  ADD: 'Add',
  ADDING: 'Adding…',
  SAVE: 'Save changes',
  SAVING: 'Saving…',
  CANCEL: 'Cancel',
  EDIT: 'Edit',
  REMOVE: 'Remove',
  REMOVE_TITLE: 'Remove this contact?',
  REMOVE_SUBTITLE: 'It will no longer be offered when you book a ride.',
  REMOVE_CONFIRM: 'Remove',
  REMOVING: 'Removing…',
  ADDED: 'Contact added.',
  UPDATED: 'Contact updated.',
  REMOVED: 'Contact removed.',
  LOAD_FAILED_TITLE: 'Your contacts could not be loaded',
  REMOVE_FAILED_TITLE: 'Contact not removed',
  SAVE_REJECTED: "We couldn't save this contact.",
  REMOVE_REJECTED: "We couldn't remove this contact.",
  LOAD_REJECTED: "We couldn't load your contacts.",
  RETRY: 'Try again',
  // Validation (reverse-engineer-implemented/guide/12 §6, 26 §11).
  EMAIL_REQUIRED: 'Please provide your email address.',
  EMAIL_INVALID: 'Invalid email address.',
  EMAIL_TOO_LONG: 'An email address can be at most 50 characters.',
  PHONE_REQUIRED: 'Please provide your contact number.',
  PHONE_INVALID: 'Enter 10 digits, area code first, not starting with 0 or 1.',
  EXTENSION_INVALID: 'An extension is up to 5 digits.',
  DUPLICATE: 'This contact is already saved.',
} as const;

/**
 * The booking wizard on Reservation 2 and the screens around it
 * (reverse-engineer-implemented/guide/13–17).
 */
export const RESERVATION_MESSAGES = {
  SCREEN_TITLE: 'Make a reservation',
  EDIT_SCREEN_TITLE: 'Change reservation',
  SCREEN_SUBTITLE: 'Six short steps. You can review everything before it is booked.',
  EDIT_SCREEN_SUBTITLE: 'Change what you need, then save on the last step.',
  BACK: 'Back',
  CONTINUE: 'Continue',
  CONTINUE_TO: 'Continue to',
  BOOK: 'Book reservation',
  BOOKING: 'Booking…',
  SAVE_CHANGES: 'Save changes',
  SAVING: 'Saving…',
  CHECKING: 'Checking…',
  NEW_RESERVATION: 'New reservation',
  LIVE_BADGE: 'LIVE CALL',

  // Step 1 — passenger and time (guide 14)
  BOOKING_FOR_LABEL: 'Reservation for',
  BOOKING_FOR_SELF: 'Myself',
  FIRST_NAME_TOO_LONG: 'First name can be at most 15 characters.',
  NAME_INVALID: 'Names cannot contain digits or quotation marks.',
  LAST_NAME_REQUIRED: 'Enter the passenger’s last name.',
  LAST_NAME_LENGTH: 'Last name must be 2 to 20 characters.',
  DATE_TOO_FAR: 'Reservations can be made at most 90 days in advance.',
  TIME_PAST: 'Choose a pickup time later than now.',

  // Step 2 — locations (guide 15)
  PICKUP_REQUIRED: 'Choose where the ride starts.',
  DESTINATION_REQUIRED: 'Choose where the ride ends.',
  SAME_ENDS: 'Pickup and destination must be different places.',
  PLACE_LOOKUP_FAILED: 'We could not read this address. Pick it again or choose another.',
  ZONE_CHECKING: 'Checking the service area…',
  ZONE_UNMATCHED: 'This address could not be matched with our service area.',
  ZONE_ACKNOWLEDGE: 'Book it anyway — dispatch will confirm the address',
  ZONE_ACK_REQUIRED: 'Confirm the unmatched address to continue.',
  DIRECTIONS_INVALID: 'Directions cannot contain quotation marks.',
  AIRLINE_LABEL: 'Airline',
  AIRLINE_PLACEHOLDER: 'e.g. Delta',
  AIRLINE_REQUIRED: 'Enter the airline.',
  FLIGHT_LABEL: 'Flight #',
  FLIGHT_PLACEHOLDER: 'e.g. DL 412',
  FLIGHT_REQUIRED: 'Enter the flight number.',
  FLIGHT_INVALID: 'Use letters, digits and spaces only (20 at most).',
  ARRIVING_FROM_LABEL: 'Arriving from',
  ARRIVING_FROM_PLACEHOLDER: 'e.g. Atlanta, GA',
  PICKUP_OPTION_LABEL: 'Pickup option',
  PICKUP_OPTION_REQUIRED: 'Choose where the driver meets you.',
  PICKUP_OPTION_OUTSIDE: 'Outside the terminal',
  PICKUP_OPTION_INSIDE: 'Inside the terminal (meet & greet)',
  PICKUP_OPTION_ON_DEMAND: 'On demand — ready now',
  PICKUP_OPTION_STANDBY: 'Outside — standby',
  TERMINAL_LABEL: 'Terminal',
  TERMINAL_PLACEHOLDER: 'e.g. 4',
  DESTINATION_CITY_LABEL: 'Flying to',
  DESTINATION_CITY_PLACEHOLDER: 'e.g. Atlanta, GA',

  // Step 3 — billing (guide 16)
  BILLING_METHOD_LABEL: 'Billing method',
  ACCOUNT_REQUIRED: 'Enter the account number this ride is billed to.',
  ACCOUNT_INVALID: 'Use letters, digits, spaces and hyphens only (16 at most).',
  ACCOUNT_REJECTED: 'This account number was not accepted.',
  VIP_INVALID: 'A VIP number is digits only, 10 at most.',
  VIP_REJECTED: 'This VIP number does not belong to the account.',
  REQUIREMENT_FALLBACK_LABEL: 'Account field',
  REQUIREMENT_REQUIRED: 'Fill in this field for your account.',
  REQUIREMENT_INVALID: 'Use letters, digits, spaces and - _ . , / & only.',
  REQUIREMENTS_REJECTED: 'The account details were not accepted.',
  HOLDER_REQUIRED: 'Enter the name on the card (2 to 30 letters).',
  HOLDER_INVALID: 'Use letters, spaces, full stops and apostrophes only.',
  CARD_REQUIRED: 'Enter a complete card number.',
  EXPIRY_REQUIRED: 'Enter the card’s expiry date.',
  CVV_REQUIRED: 'Enter the card’s security code.',
  ZIP_REQUIRED: 'Enter the billing ZIP code.',
  CARD_DECLINED: 'The card was not approved.',
  CARD_PENDING: 'Authorising your card. This can take up to 90 seconds.',
  CARD_TIMEOUT: 'The card could not be authorised in time. Try again or choose another method.',
  CARD_PRESENT_NOTE: 'No debit cards. Present the card to the driver in the car.',
  CARD_UNCHANGED: 'Card on file',
  METHOD_NOT_ALLOWED: 'This account does not allow this billing method.',

  // Step 4 — preferences (guide 17)
  CAR_TYPE_LABEL: 'Car type',
  CAR_TYPE_REQUIRED: 'Choose a car type.',
  CAR_TYPES_EMPTY: 'No car types are available right now.',
  CAR_TYPES_FAILED: 'Car types could not be loaded.',
  RETRY: 'Try again',
  EMAIL_REQUIRED: 'Enter the e-mail address for the confirmation.',
  EMAIL_INVALID: 'Enter an email address in the form name@example.com.',
  CC_EMAIL_LABEL: 'Email CC',
  CC_EMAIL_PLACEHOLDER: 'Separate addresses with commas',
  CC_EMAIL_INVALID: 'Check the CC addresses — one of them is not an e-mail address.',
  CC_EMAIL_TOO_LONG: 'The CC list can be at most 500 characters.',
  CALLBACK_REQUIRED: 'Add a callback number, or turn phone confirmation off.',
  US_PHONE_INVALID: 'A US number needs all 10 digits, area code first, not starting with 0 or 1.',
  RIDE_PURPOSE_LABEL: 'Trip purpose',
  RIDE_PURPOSE_PLACEHOLDER: 'e.g. Client meeting',
  RIDE_PURPOSE_REQUIRED: 'Enter the trip purpose.',
  RIDE_PURPOSE_TOO_LONG: 'Use 50 characters at most for the trip purpose.',
  FROM_CONTACTS: 'From your contacts',
  PREMIUM_WHEELCHAIR: 'Please call XYZ at 929-XYZLimo to book this vehicle.',

  // Preview, booking and receipt (guide 13)
  PREVIEW_LEDE: 'Check the details below. Booking sends the ride to dispatch.',
  PREVIEW_NOTE: 'Nothing has been booked yet.',
  EDIT_PREVIEW_NOTE: 'Nothing has been changed yet.',
  BOOK_FAILED_TITLE: 'Reservation not booked',
  SAVE_FAILED_TITLE: 'Changes not saved',
  BOOK_REJECTED: 'The reservation was not accepted.',
  BOOK_DUPLICATE_TITLE: 'Already booked',
  BOOK_DUPLICATE: (reservationNumber: string) =>
    `You already have a reservation with these details: ${reservationNumber}. Nothing new was booked.`,
  BOOK_DUPLICATE_NO_NUMBER: 'You already have a reservation with these details. Nothing new was booked.',
  STEP_FAILED_TITLE: 'Check this step',
  RECEIPT_THANKS: 'Thank you',
  RECEIPT_NUMBER: 'for making a reservation with us. Your reservation number is',
  RECEIPT_NO_NUMBER: 'for making a reservation with us. Your reservation is booked — you will find it under Upcoming rides.',
  RECEIPT_UPDATED: 'Your reservation has been updated.',
  RECEIPT_NEXT: 'You will receive an acknowledgement shortly through your preferred confirmation method.',
  RECEIPT_EMAIL_FAILED: 'The confirmation e-mail could not be sent. Your reservation is still booked.',
  VIEW_RESERVATION: 'View your reservation',
  VIEW_UPCOMING: 'View upcoming rides',
  BOOK_ANOTHER_LEG: 'Book the return leg',
  HELP_PREFIX: 'Need help? Contact us anytime at',
  DISCLAIMER:
    'Acceptance of this reservation is subject to validity / approval of the credit card, account number or VIP number.',

  // Express checkout (guide 06)
  EXPRESS_HEADING: 'Frequent Users',
  EXPRESS_BAR: 'I am ready for pickup',
  EXPRESS_PICKUP_LABEL: 'Select your pickup location',
  EXPRESS_DROPOFF_LABEL: 'Select your dropoff location',
  EXPRESS_SAME_ENDS: 'Pickup and dropoff must be different addresses.',
  EXPRESS_BUTTON: 'Express Checkout',
  EXPRESS_EMPTY: 'Save an address under My Addresses to use express checkout.',
  EXPRESS_FAILED: 'Your saved addresses could not be loaded.',
  // Dispatch note under the button; the bold spans are separate keys.
  EXPRESS_NOTE_LEAD: 'With express checkout a car is',
  EXPRESS_NOTE_DISPATCHED: 'dispatched',
  EXPRESS_NOTE_DESTINATION: 'to your location',
  EXPRESS_NOTE_WITHIN: (minutes: number) => `in ${minutes} minutes`,
  EXPRESS_NOTE_TAIL: 'from now.',
} as const;

/** Ride history, open reservations and their row actions (guides 18–19, 24). */
export const RIDES_MESSAGES = {
  SCREEN_TITLE: 'My rides',
  UPCOMING_TAB: 'Upcoming',
  HISTORY_TAB: 'History',
  UPCOMING_TITLE: 'Open reservations',
  UPCOMING_EMPTY: 'No open reservation(s) found.',
  UPCOMING_FAILED: 'Your open reservations could not be loaded.',
  HISTORY_FAILED: 'We could not load your rides',
  RETRY: 'Try again',
  LOAD_RESERVATION_FAILED: 'This reservation could not be opened.',
  CANCEL_TITLE: 'Cancel this reservation?',
  CANCEL_BODY: 'The ride will be called off. This cannot be undone.',
  CANCEL_REASON_LABEL: 'Reason',
  CANCEL_REASON_PLACEHOLDER: 'e.g. Change of plans',
  CANCEL_REASON_REQUIRED: 'Tell us why the ride is being cancelled.',
  CANCEL_REASON_INVALID: 'Use 50 characters at most, without quotation marks.',
  CANCEL_CONFIRM: 'Yes, cancel it',
  CANCEL_KEEP: 'Keep reservation',
  CANCELLING: 'Cancelling…',
  CANCEL_DONE: 'The reservation has been cancelled.',
  CANCEL_FAILED_TITLE: 'Reservation not cancelled',
  CANCEL_REJECTED: 'The reservation could not be cancelled.',
  HOME_RIDES_FAILED_TITLE: 'Your rides could not be loaded',
  HOME_RIDES_FAILED: 'The dispatch service did not answer. Booking still works.',
  ASK: 'Ask about this ride',
  ASK_SHORT: 'Ask',
  LEAVE_FEEDBACK: 'Leave feedback',
  FEEDBACK_SHORT: 'Feedback',
  FEEDBACK_COLUMN: 'Feedback',
  FEEDBACK_OPEN_FAILED: 'The feedback page could not be opened. Try again.',
} as const;

/** Home dashboard: greeting, stat tiles, next-ride card, ride lists and quick links. */
export const HOME_MESSAGES = {
  WELCOME: 'Welcome back',
  WELCOME_NAMED: (firstName: string) => `Welcome back, ${firstName}`,
  LAST_LOGIN: (date: string) => `Last login ${date}`,
  BOOK_RIDE: 'Book a ride',
  LOADING: 'Loading…',

  // Stat tiles
  TILE_UPCOMING: 'Upcoming',
  TILE_UPCOMING_NEXT: (when: string) => `Next ${when}`,
  TILE_UPCOMING_NONE: 'Nothing booked',
  TILE_IN_PROGRESS: 'In progress',
  TILE_IN_PROGRESS_ACTIVE: 'Car on the road',
  TILE_IN_PROGRESS_NONE: 'No car out now',
  TILE_COMPLETED: 'Completed',
  TILE_COMPLETED_CAPTION: 'Rides finished',
  TILE_TOTAL: 'Total rides',
  TILE_TOTAL_CAPTION: 'On this account',
  /** Screen-reader label for a tile. */
  TILE_A11Y: (label: string, value: number | null) => `${label}: ${value ?? 'loading'}`,

  // Next ride card
  NEXT_LOADING: 'Loading your next ride',
  NEXT_EMPTY_TITLE: 'No rides booked',
  NEXT_EMPTY_BODY: 'Book ahead for a set date and time, or have a car sent to you now.',
  NEXT_LIVE: 'Ride in progress',
  NEXT_UPCOMING: 'Next ride',
  RIDE_NO: 'Ride no.',
  PAYMENT: 'Payment',
  VIEW_DETAILS: 'View details',
  ALL_RIDES: 'All rides',

  // Ride lists
  UPCOMING_TITLE: 'Upcoming rides',
  UPCOMING_EMPTY: 'Nothing booked yet.',
  PAST_TITLE: 'Past rides',
  PAST_EMPTY: 'No rides on this account yet.',
  VIEW_ALL: 'View all',
  VIEW_ALL_COUNT: (total: number) => `View all ${total}`,
  RIDE_FROM: (time: string, pickup: string) => `${time} · from ${pickup}`,

  // Quick links
  QUICK_LINKS_TITLE: 'Quick links',
  LINK_REVIEW_RIDE: 'Review a booked ride',
  LINK_RECEIPTS: 'Receipts',
  LINK_ADDRESSES: 'Saved addresses',
  LINK_THEME: 'Color theme',
} as const;

/** Reservation details, voucher and route tracking (guides 20, 21, 23). */
export const RESERVATION_INFO_MESSAGES = {
  SCREEN_TITLE: 'Reservation info',
  NOT_FOUND: 'No reservation was chosen.',
  LOAD_FAILED_TITLE: 'This reservation could not be loaded',
  RETRY: 'Try again',
  BACK: 'Back',
  EDIT: 'Change',
  CANCEL: 'Cancel ride',
  TRACK: 'Track your route',
  VOUCHER: 'View voucher',
  RETURN_TRIP: 'Book return trip',
  REPEAT: 'Book again',
  ASK: 'Ask about this ride',
  LEAVE_FEEDBACK: 'Leave feedback',
  NOT_ISSUED: 'Not issued',
  AS_DIRECTED: 'As Directed',
  DRIVER_TITLE: 'Driver & Vehicle Info',
  DRIVER_PENDING: 'A driver has not been assigned yet.',
  CHARGES_TITLE: 'Call Charges',
  MESSAGES_TITLE: 'Messages',
  MESSAGES_EMPTY: 'No messages have been sent for this ride yet.',
  EXTRA_CONTACT: 'Additional contact',
  CANCEL_REASON: 'Cancellation reason',
} as const;

/** What the voucher and the receipt share: the letterhead, the route rows and printing (guide 23). */
export const RIDE_DOCUMENT_MESSAGES = {
  BRAND: 'XYZ Two Way Radio Service',
  PASSENGER: 'Passenger',
  FROM: 'From',
  TO: 'To',
  PRINT_FAILED: 'The document could not be printed. Please try again.',
} as const;

export const VOUCHER_MESSAGES = {
  SCREEN_TITLE: 'Voucher',
  NOT_BILLED: 'A voucher is issued once the ride has been billed.',
  PRINT: 'Print voucher',
  ACCOUNT: 'Account No.',
  JOB: 'Job#',
  DRIVER: 'Driver#',
  CAR: 'Car#',
  SCHEDULED: 'Scheduled pick-up',
  STOPS: 'Stops',
} as const;

/** Receipts list and the receipt of one finished ride (guide 23, missing-screens/13). */
export const RECEIPTS_MESSAGES = {
  SCREEN_TITLE: 'Receipts',
  RECEIPT_TITLE: 'Receipt',
  VIEW: 'View receipt',
  VIEW_SHORT: 'Receipt',
  PRINT: 'Print receipt',
  LIST_TITLE: 'Completed rides',
  EMPTY: 'No receipts in this period',
  FAILED: 'We could not load your receipts',
  NOT_COMPLETED: 'A receipt is available once the ride is completed.',
  RESERVATION: 'Reservation#',
  RIDE_DATE: 'Ride date',
  PAYMENT: 'Payment',
  CARD: 'Card',
  CARD_ENDING: (cardType: string, last4: string) => `${cardType ? `${cardType} ` : ''}ending ${last4}`.trim(),
  ACCOUNT: 'Account No.',
  VOUCHER: 'Voucher#',
  INVOICE: 'Invoice#',
  APPROVAL_DATE: 'Approval date',
  TRANSACTION_DATE: 'Transaction date',
} as const;

export const TRACKING_MESSAGES = {
  SCREEN_TITLE: 'Track your route',
  ROUTE_TITLE: 'Route detail',
  LOG_EMPTY: 'Vehicle log is not available against this ride.',
  LOG_FAILED: 'The vehicle log could not be loaded.',
  REFRESH: 'Refresh car position',
  REFRESHING: 'Locating…',
  CAR_POSITION: 'Car position',
  CAR_MARKER: 'Car',
  CAR_UNKNOWN: 'The car’s position is not available right now.',
  CAR_FAILED: 'The car could not be located.',
  NO_CAR: 'A car has not been assigned to this ride yet.',
} as const;

/** "Ask about this ride" (guide 21). Ride ratings (guide 24) wait on a gateway code. */
export const FEEDBACK_MESSAGES = {
  SHEET_TITLE: 'Ask about this ride',
  QUESTION_LABEL: 'Question',
  QUESTION_REQUIRED: 'Choose a question.',
  QUESTIONS_EMPTY: 'There are no questions to choose from right now.',
  QUESTIONS_FAILED: 'The questions could not be loaded.',
  MESSAGE_LABEL: 'Message',
  MESSAGE_PLACEHOLDER: 'Anything we should know',
  MESSAGE_INVALID: 'Use 200 characters at most: letters, digits, spaces and full stops.',
  SEND: 'Send',
  SENDING: 'Sending…',
  SENT: 'Question inserted successfully.',
  FAILED_TITLE: 'Question not sent',
  REJECTED: 'Error occurred during insertion.',
} as const;

/**
 * Links to the marketing site (reverse-engineer-external-redirects/): About,
 * Rates, Contact Us, Receipts and the legal footer.
 */
export const WEBSITE_MESSAGES = {
  // Group titles
  ABOUT_TITLE: 'About XYZ',
  RATES_TITLE: 'Rates',
  CONTACT_SCREEN_TITLE: 'Contact Us',
  CONTACT_TITLE: 'How can we help?',
  LEGAL_TITLE: 'Legal',
  RECEIPTS_TITLE: 'Receipts & invoices online',

  // About
  COMPANY_INFO: 'Company Info',
  OUR_SERVICES: 'Our Services',
  OUR_POLICIES: 'Our Policies',
  WEBSITE_HOME: 'xyzcar.com',

  // Rates
  SAMPLE_RATES: 'Sample Rates',
  SERVICES_RATES: 'Services Rates',
  RATE_BOOK: 'Complete Ratebook (PDF)',

  // Receipts & invoices
  DOWNLOAD_RECEIPT: 'Download Receipt',
  DOWNLOAD_INVOICE: 'Download Invoice',

  // Contact Us
  CUSTOMER_SERVICE: 'Customer Service',
  OPEN_ACCOUNT: 'Open an Account',
  COMPLAINT: 'Complaint',
  RATE_A_RIDE: 'Rate a Ride',
  FAQS: 'FAQs',
  DRIVERS_JOIN: 'Drivers - Join XYZ',
  CONTACT_US: 'Contact Us',

  // Legal
  TERMS: 'Terms and Conditions',
  PRIVACY: 'Privacy Policy',

  // Registration agreement; the links are separate keys.
  AGREE_LEAD: 'By creating an account you agree to the',
  AGREE_AND: 'and',
  AGREE_TAIL: '.',

  OPEN_FAILED: 'The page could not be opened. Try again.',
} as const;

/** Itemised charges on a billed ride, in the order guide 20 lists them. */
export const CHARGE_LABELS = {
  fare: 'Fare',
  tolls: 'Tolls/Parking',
  tips: 'Tips',
  waitingTime: 'Waiting Time',
  stops: 'Stops',
  stopWaitingTime: 'Stop Waiting Time',
  serviceCharge: 'Service Charge',
  phoneUsage: 'Phone Usage',
  package: 'Package',
  additionalPassenger: 'Additional Passenger',
  misc: 'Misc',
  taxes: 'Taxes',
  stateSalesTax: 'State Sales Tax',
  nysSurcharge: 'NYS Surcharge',
  total: 'Total Call Charges',
} as const;
