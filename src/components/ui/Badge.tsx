import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space } from '@/theme';

import { Dot } from './Glyph';

const useNative = Platform.OS !== 'web';

export type BadgeTone = 'primary' | 'accent' | 'success' | 'info' | 'muted';

const TONES: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.surfaceSelected, fg: colors.primary[600], border: colors.primary[200] },
  accent: { bg: colors.accentSubtle, fg: colors.accent, border: colors.warningBorder },
  success: { bg: colors.successBg, fg: colors.success, border: colors.successBorder },
  info: { bg: colors.infoBg, fg: colors.info, border: colors.infoBorder },
  muted: { bg: colors.surfaceSunken, fg: colors.textMuted, border: colors.border },
};

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  /** Adds the pulsing dot used by the live-call state. */
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ label, tone = 'muted', pulse, style }: BadgeProps) {
  const palette = TONES[tone];

  return (
    <View
      style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }, style]}
    >
      {pulse ? <PulseDot color={palette.fg} /> : null}
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

/** A dot with a slow halo — reads as "happening now" without any copy. */
function PulseDot({ color }: { color: string }) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: useNative }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: useNative }),
        Animated.delay(250),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.pulseRoot}>
      <Animated.View
        style={[
          styles.halo,
          {
            backgroundColor: color,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
            transform: [
              { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) },
            ],
          },
        ]}
      />
      <Dot color={color} size={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 1,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: space.sm + 1,
    paddingVertical: 3,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  pulseRoot: { width: 6, height: 6, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
});
