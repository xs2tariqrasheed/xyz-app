import { brand } from './brand';
import { colors, primary, primaryShades, status } from './colors';
import { breakpoints, contentMaxWidth, formMaxWidth, radii, space } from './layout';
import { shadows, shadowValues } from './shadows';

export { brand } from './brand';
export type { Brand } from './brand';
export { colors, primary, primaryShades, status } from './colors';
export type { Colors, PrimaryShade, StatusName } from './colors';
export { shadows, shadowValues } from './shadows';
export type { ShadowName } from './shadows';
export { breakpoints, contentMaxWidth, formMaxWidth, radii, space } from './layout';
export type { Breakpoint, Radius, Space } from './layout';

/** Convenience bundle: `import { theme } from '@/theme'`. */
export const theme = {
  brand,
  colors,
  primary,
  primaryShades,
  status,
  shadows,
  shadowValues,
  breakpoints,
  radii,
  space,
  contentMaxWidth,
  formMaxWidth,
} as const;

export type Theme = typeof theme;
