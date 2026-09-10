import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';

const useNative = Platform.OS !== 'web';

/** The tick itself: two borders on a rotated box, so no icon dependency. */
function Tick() {
  const [scale] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: useNative,
      damping: 12,
      stiffness: 220,
      mass: 0.6,
    }).start();
  }, [scale]);

  return (
    <Animated.View style={[styles.tick, { transform: [{ rotate: '45deg' }, { scale }] }]} />
  );
}

export type CheckboxProps = {
  checked: boolean;
  /** Brand blue by default; `accent` marks the amber "ready now" state. */
  tone?: 'primary' | 'accent';
};

/** The square on its own, for rows that lay out their own label. */
export function Checkbox({ checked, tone = 'primary' }: CheckboxProps) {
  const fill = tone === 'accent' ? colors.accent : colors.primary[600];

  return (
    <View
      style={[
        styles.box,
        checked ? { backgroundColor: fill, borderColor: fill } : null,
      ]}
    >
      {checked ? <Tick /> : null}
    </View>
  );
}

export type CheckboxCardProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  /** Rendered to the right of the label — used for the LIVE pill. */
  badge?: React.ReactNode;
  /** Rendered at the far right of the row, vertically centred. */
  trailing?: React.ReactNode;
  tone?: 'primary' | 'accent';
  style?: StyleProp<ViewStyle>;
};

/**
 * A checkbox that owns its whole row: the card is the hit target, and it tints
 * to match the tone once checked so the state reads at a glance on a phone.
 */
export function CheckboxCard({
  checked,
  onChange,
  label,
  description,
  badge,
  trailing,
  tone = 'primary',
  style,
}: CheckboxCardProps) {
  const checkedCard =
    tone === 'accent'
      ? { backgroundColor: colors.accentSubtle, borderColor: colors.warningBorder }
      : { backgroundColor: colors.surfaceSelected, borderColor: colors.primary[200] };

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      // react-native-web no longer derives aria-checked from accessibilityState.
      aria-checked={checked}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [
        styles.card,
        checked ? checkedCard : null,
        pressed ? styles.cardPressed : null,
        style,
      ]}
    >
      <Checkbox checked={checked} tone={tone} />
      <View style={styles.cardText}>
        <View style={styles.cardHeading}>
          <Text style={styles.cardLabel}>{label}</Text>
          {badge}
        </View>
        {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
      </View>
      {trailing ? <View style={styles.cardTrailing}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: 6,
    height: 11,
    marginTop: -2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.textOnPrimary,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: space.lg - 2,
    boxShadow: shadowValues.sm,
  },
  cardPressed: { opacity: 0.85 },
  cardText: { flex: 1, gap: 3 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  cardLabel: { color: colors.textStrong, fontSize: 15, fontWeight: '600' },
  cardDescription: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  cardTrailing: { alignSelf: 'center' },
});
