import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { PinGlyph } from '@/components/ui/Glyph';
import { colors, radii, space } from '@/theme';

export type RideRouteProps = {
  pickup: string;
  destination: string;
  style?: StyleProp<ViewStyle>;
};

/** Pickup over destination, joined by the pin rail — one ride's route. */
export function RideRoute({ pickup, destination, style }: RideRouteProps) {
  return (
    <View style={[styles.route, style]}>
      <Leg label="Pickup" value={pickup} tone="primary" />
      <View style={styles.legLine} />
      <Leg label="Destination" value={destination} tone="accent" />
    </View>
  );
}

function Leg({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'accent' }) {
  return (
    <View style={styles.leg}>
      <View style={[styles.legPin, tone === 'accent' ? styles.legPinAccent : null]}>
        <PinGlyph color={tone === 'accent' ? colors.accent : colors.primary[600]} size={14} />
      </View>
      <View style={styles.legText}>
        <Text style={styles.legLabel}>{label}</Text>
        <Text style={styles.legValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  route: { gap: 2 },
  leg: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  legPin: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legPinAccent: { backgroundColor: colors.accentSubtle },
  legText: { flex: 1, gap: 1 },
  legLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  legValue: { color: colors.textStrong, fontSize: 14, lineHeight: 19 },
  legLine: {
    width: 1,
    height: space.md,
    marginLeft: 13,
    backgroundColor: colors.borderStrong,
  },
});
