import type { ViewStyle } from 'react-native';

/**
 * Elevation tokens. React Native 0.76+ supports the `boxShadow` style prop on
 * iOS, Android and web, so one value covers all three targets.
 */
export const shadowValues = {
  sm: '0 1px 2px rgba(2,27,55,0.08)', // --shadow-sm
  md: '0 4px 16px rgba(2,27,55,0.10)', // --shadow-md
} as const;

export const shadows: Record<keyof typeof shadowValues, ViewStyle> = {
  sm: { boxShadow: shadowValues.sm },
  md: { boxShadow: shadowValues.md },
};

export type ShadowName = keyof typeof shadowValues;
