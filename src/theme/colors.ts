/**
 * xyz-app color theme.
 *
 * Single source of truth for color. Values mirror the design tokens 1:1 —
 * the CSS custom property name for each token is noted in a comment so the
 * web design spec and the native palette never drift apart.
 *
 * React Native has no CSS variables, so tokens are plain values consumed
 * through `StyleSheet` / inline styles on web, iOS and Android alike.
 */

/** Brand ramp, 50 (lightest) → 900 (darkest). */
export const primary = {
  50: '#F0F5FB',
  100: '#D9E6F5',
  200: '#B3CBE9',
  300: '#85ACD9',
  400: '#5286C2',
  500: '#1E60A4',
  600: '#013F83',
  700: '#01346C',
  800: '#022851',
  900: '#021B37',
} as const;

export type PrimaryShade = keyof typeof primary;

/** Ramp order, for iterating the scale in a stable sequence. */
export const primaryShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const satisfies readonly PrimaryShade[];

export const colors = {
  /* ---- brand ---- */
  primary,
  secondary: '#0E7490', // --secondary
  secondarySubtle: '#E0F2F6', // --secondary-subtle
  accent: '#B45309', // --accent
  accentSubtle: '#FDF3E7', // --accent-subtle

  /* ---- surfaces ---- */
  bg: '#F6F8FA', // --bg
  surface: '#FFFFFF', // --surface
  surfaceSunken: '#EEF1F6', // --surface-sunken
  surfaceSelected: '#F0F5FB', // --surface-selected
  border: '#DFE3EA', // --border
  borderStrong: '#C2C9D4', // --border-strong
  overlay: 'rgba(2,27,55,0.55)', // --overlay

  /* ---- text ---- */
  textTitle: '#0E1421', // --text-title
  textHeading: '#0E1421', // --text-heading
  textBody: '#4D5764', // --text-body
  textStrong: '#2B3240', // --text-strong
  textMuted: '#6B7482', // --text-muted
  textDisabled: '#8C95A3', // --text-disabled
  textOnPrimary: '#FFFFFF', // --text-on-primary
  textLink: '#0B5CAD', // --text-link
  textLinkHover: '#013F83', // --text-link-hover

  /* ---- header / nav ---- */
  headerBg: '#01346C', // --header-bg
  headerFg: '#FFFFFF', // --header-fg
  headerFgMuted: '#B3CBE9', // --header-fg-muted
  navActive: '#85ACD9', // --nav-active

  /* ---- semantic ---- */
  success: '#137A4A', // --success
  successHover: '#0F6039', // --success-hover
  successBg: '#E7F4EC', // --success-bg
  successBorder: '#A8D9BD', // --success-border

  danger: '#B3261E', // --danger
  dangerHover: '#8E1D17', // --danger-hover
  dangerBg: '#FDECEA', // --danger-bg
  dangerBorder: '#F0B3AE', // --danger-border

  warning: '#B45309', // --warning
  warningHover: '#8F4107', // --warning-hover
  warningBg: '#FDF3E7', // --warning-bg
  warningBorder: '#F0CFA3', // --warning-border

  info: '#0B5CAD', // --info
  infoHover: '#08488A', // --info-hover
  infoBg: '#EAF2FC', // --info-bg
  infoBorder: '#AECBEC', // --info-border

  /* ---- interaction ---- */
  focusRing: '#D9E6F5', // --focus-ring
  disabledBg: '#EEF1F6', // --disabled-bg
  disabledBorder: '#DFE3EA', // --disabled-border
} as const;

export type Colors = typeof colors;

/** Semantic status families, for components that switch on a status prop. */
export const status = {
  success: {
    base: colors.success,
    hover: colors.successHover,
    bg: colors.successBg,
    border: colors.successBorder,
  },
  danger: {
    base: colors.danger,
    hover: colors.dangerHover,
    bg: colors.dangerBg,
    border: colors.dangerBorder,
  },
  warning: {
    base: colors.warning,
    hover: colors.warningHover,
    bg: colors.warningBg,
    border: colors.warningBorder,
  },
  info: {
    base: colors.info,
    hover: colors.infoHover,
    bg: colors.infoBg,
    border: colors.infoBorder,
  },
} as const;

export type StatusName = keyof typeof status;
