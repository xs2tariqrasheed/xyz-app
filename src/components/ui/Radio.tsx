import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadowValues, space } from '@/theme';

const useNative = Platform.OS !== 'web';

/** The inner dot, sprung in on selection so the choice reads as a change. */
function Fill({ color }: { color: string }) {
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

  return <Animated.View style={[styles.fill, { backgroundColor: color, transform: [{ scale }] }]} />;
}

export type RadioProps = {
  selected: boolean;
  tone?: 'primary' | 'accent';
};

/** The circle on its own, for rows that lay out their own label. */
export function Radio({ selected, tone = 'primary' }: RadioProps) {
  const fill = tone === 'accent' ? colors.accent : colors.primary[600];

  return (
    <View style={[styles.ring, selected ? { borderColor: fill } : null]}>
      {selected ? <Fill color={fill} /> : null}
    </View>
  );
}

export type RadioCardProps = {
  selected: boolean;
  onSelect: () => void;
  label: string;
  description?: string;
  /** Rendered to the right of the label — used for the billing-type pill. */
  badge?: React.ReactNode;
  tone?: 'primary' | 'accent';
  style?: StyleProp<ViewStyle>;
};

/**
 * One option in a radio group. The whole card is the hit target and tints when
 * selected, which is what makes the set legible on a phone.
 *
 * Sits next to `CheckboxCard` on purpose: same padding, same shadow, so a
 * form can mix single and multiple choice without the rows disagreeing.
 */
export function RadioCard({
  selected,
  onSelect,
  label,
  description,
  badge,
  tone = 'primary',
  style,
}: RadioCardProps) {
  const selectedCard =
    tone === 'accent'
      ? { backgroundColor: colors.accentSubtle, borderColor: colors.warningBorder }
      : { backgroundColor: colors.surfaceSelected, borderColor: colors.primary[200] };

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      // react-native-web no longer derives aria-checked from accessibilityState.
      aria-checked={selected}
      accessibilityLabel={label}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        selected ? selectedCard : null,
        pressed ? styles.cardPressed : null,
        style,
      ]}
    >
      <Radio selected={selected} tone={tone} />
      <View style={styles.cardText}>
        <View style={styles.cardHeading}>
          <Text style={styles.cardLabel}>{label}</Text>
          {badge}
        </View>
        {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { width: 11, height: 11, borderRadius: 6 },

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
});
