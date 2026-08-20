import { StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { breakpoints, colors, space } from '@/theme';

export type FieldProps = {
  label: string;
  /** Renders the muted asterisk after the label. */
  required?: boolean;
  /** Small helper line under the control. */
  hint?: string;
  /** Replaces the hint with a danger-toned message when set. */
  error?: string;
  /**
   * Moves the label into a right-aligned column beside the control once the
   * viewport is tablet-wide. Below that it stays stacked, so the phone layout
   * is unaffected.
   */
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Width of the label column in `inline` mode. Exported so a screen can indent
 * its own rows (checkboxes, buttons) to line up with the inputs above them.
 */
export const INLINE_LABEL_WIDTH = 132;

/** Label + control + hint. Every input in the reservation form sits in one. */
export function Field({ label, required, hint, error, inline, style, children }: FieldProps) {
  const { width } = useWindowDimensions();
  const row = !!inline && width >= breakpoints.md;
  const note = error ?? hint;

  return (
    <View style={[row ? styles.rootInline : styles.root, style]}>
      <Text style={[styles.label, row ? styles.labelInline : null]}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>

      <View style={row ? styles.controlInline : styles.control}>
        {children}
        {note ? (
          <Text
            style={[styles.hint, error ? styles.error : null]}
            accessibilityRole={error ? 'alert' : undefined}
          >
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const GAP = space.sm - 2;

const styles = StyleSheet.create({
  root: { gap: GAP },
  rootInline: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg },

  label: { color: colors.textStrong, fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  // Nudged down so the label sits on the same baseline as the input's own text
  // rather than the top edge of its border box.
  labelInline: {
    width: INLINE_LABEL_WIDTH,
    textAlign: 'right',
    paddingTop: space.md + 1,
    fontSize: 14,
  },
  required: { color: colors.textMuted, fontWeight: '400' },

  control: { gap: GAP },
  controlInline: { flex: 1, gap: GAP },

  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  error: { color: colors.danger, fontWeight: '500' },
});
