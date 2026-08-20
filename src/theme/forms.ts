import type { TextStyle } from 'react-native';

import { colors } from './colors';

/**
 * Suppresses the platform's own focus ring on a web input.
 *
 * `outlineWidth: 0` alone is not enough: `:focus-visible` in Chrome sets
 * `outline-style: auto`, and an `auto` outline ignores both `outline-width`
 * and `outline-color`. Naming a concrete style first is what lets the zero
 * width take effect.
 *
 * Only safe because every field that uses this replaces the ring with
 * {@link focusedFieldStyle} — never drop the native ring without one.
 */
export const nativeFocusRingReset: TextStyle = {
  outlineStyle: 'solid',
  outlineWidth: 0,
};

/**
 * The focused treatment: brand border plus a 3px `--focus-ring` halo.
 *
 * Deliberately left un-annotated. `TextStyle` and `ViewStyle` are not mutually
 * assignable in React Native's types (`boxShadow` and `cursor` differ), so
 * naming either one would rule out half the call sites. The inferred shape
 * carries only these two properties, which both accept — and this is applied
 * to a bare `TextInput` as well as to a wrapper `View`.
 */
export const focusedFieldStyle = {
  borderColor: colors.primary[500],
  boxShadow: `0 0 0 3px ${colors.focusRing}`,
};
