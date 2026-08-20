/**
 * Brand mark colors.
 *
 * The XYZ badge keeps its own dark ground rather than inheriting `headerBg`,
 * so the logo reads as a badge wherever it is placed — navy header, white
 * surface or drawer.
 */
export const brand = {
  /** Badge ground. */
  logoBg: '#1B1F3B',
  /** Frame and letterforms. */
  logoInk: '#E8E4DA',
} as const;

export type Brand = typeof brand;
