/**
 * Layout tokens: breakpoints, radii and spacing.
 *
 * Mobile first — every breakpoint is a *minimum* width, so styles cascade up
 * from the phone layout rather than down from desktop.
 */

export const breakpoints = {
  /** Phone landscape / large phone: two fields can sit side by side. */
  sm: 600,
  /** Tablet portrait. */
  md: 768,
  /** Wide enough for the primary nav links (and Log out) to sit inline in the header. */
  nav: 1180,
  /** Tablet landscape: the picker sheet becomes a centred dialog. */
  lg: 1024,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** Corner radii, matched to the swatch/card language of the theme page. */
export const radii = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export type Radius = keyof typeof radii;

/** 4pt spacing scale. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type Space = keyof typeof space;

/** Widest the reservation form column ever gets, so line length stays readable. */
export const contentMaxWidth = 1100;
export const formMaxWidth = 720;
