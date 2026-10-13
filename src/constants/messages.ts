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
