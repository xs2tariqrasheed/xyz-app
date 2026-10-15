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
} as const;

/** Captcha control, shared by the auth screens. */
export const CAPTCHA_MESSAGES = {
  LABEL: 'Captcha',
  CHECKBOX_LABEL: "I'm not a robot",
  CHECKBOX_HINT: 'Confirms you are a person before continuing',
  VERIFYING: 'Verifying…',
  BADGE: 'Verification',
  REQUIRED: 'Confirm you are not a robot.',
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
  REQUEST_REJECTED: "We couldn't send a reset email for that login name.",
  SUCCESS_TITLE: 'Email sent',
  SUCCESS_MESSAGE: 'Check your email for instructions to reset your password.',
  BACK_TO_LOGIN: 'Back to log in',
} as const;

export const CHANGE_PASSWORD_MESSAGES = {
  SCREEN_TITLE: 'Change password',
  FORM_TITLE: 'Please enter your old and new password',
  OLD_PASSWORD_LABEL: 'Old password',
  OLD_PASSWORD_PLACEHOLDER: 'Your current password',
  NEW_PASSWORD_LABEL: 'New password',
  NEW_PASSWORD_PLACEHOLDER: 'At least 8 characters',
  CONFIRM_PASSWORD_LABEL: 'Confirm new password',
  CONFIRM_PASSWORD_PLACEHOLDER: 'Re-type the new password',
  RULE_LENGTH: 'At least 8 characters',
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
 * (reverse-engineer-guide/07-profile-personal-info.md).
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
  PASSWORD_TOO_SHORT: 'Use at least 8 characters.',
  CONFIRM_PASSWORD_MISMATCH: "The passwords don't match.",
  /** Server refused the email without saying why. */
  EMAIL_TAKEN: 'An account already uses this email address.',

  BILLING_METHOD_LABEL: 'How would you pay for your rides?',
  BILLING_CORPORATE: 'Corporate account',
  BILLING_CORPORATE_CAPTION: 'Invoiced to the company',
  BILLING_CARD: 'Credit card',
  BILLING_CARD_CAPTION: 'Billed straight to your card',
  ACCOUNT_NUMBER_LABEL: 'Account number',
  ACCOUNT_NUMBER_PLACEHOLDER: 'e.g. CORP-48213',
  COMPANY_NAME_LABEL: 'Account name',
  COMPANY_NAME_PLACEHOLDER: 'e.g. Acme Corp',
  VIP_NUMBER_LABEL: 'VIP number',
  VIP_NUMBER_PLACEHOLDER: 'e.g. VIP-204',
  ACCOUNT_NUMBER_REQUIRED: 'Enter the account number.',
  COMPANY_NAME_REQUIRED: 'Enter the account name.',
  /** Server refused the account / name pair without saying why. */
  COMPANY_INVALID: "That account number and name don't match.",
  /** Server refused the VIP number without saying why. */
  VIP_INVALID: "That VIP number isn't on this account.",
  /** Server refused the account's requirements lookup without saying why. */
  ACCOUNT_NOT_AVAILABLE: "This account can't be used for registration.",
  CARD_HOLDER_REQUIRED: 'Enter the name on the card.',
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
