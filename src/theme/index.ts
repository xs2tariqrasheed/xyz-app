export { colors, primary, primaryShades, status } from './colors';
export type { Colors, PrimaryShade, StatusName } from './colors';
export { shadows, shadowValues } from './shadows';
export type { ShadowName } from './shadows';

import { colors, primary, primaryShades, status } from './colors';
import { shadows, shadowValues } from './shadows';

/** Convenience bundle: `import { theme } from '@/theme'`. */
export const theme = { colors, primary, primaryShades, status, shadows, shadowValues } as const;

export type Theme = typeof theme;
