import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space } from '@/theme';

export type WaypointProps = {
  /** "A" for the pickup, "B" for the drop-off — same language as the form. */
  marker: string;
  color: string;
  address: string;
  /** Caption above the address, e.g. "Pickup". Omitted inside the table. */
  label?: string;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
};

/** One end of a ride: a lettered chip and the address next to it. */
export function Waypoint({ marker, color, address, label, numberOfLines = 2, style }: WaypointProps) {
  return (
    <View style={[styles.root, style]}>
      <View style={[styles.marker, { backgroundColor: color }]}>
        <Text style={styles.markerLabel}>{marker}</Text>
      </View>
      <View style={styles.text}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.address} numberOfLines={numberOfLines}>
          {address}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  marker: {
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  markerLabel: { color: colors.textOnPrimary, fontSize: 10, fontWeight: '800' },
  text: { flex: 1, gap: 1 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  address: { color: colors.textStrong, fontSize: 13, lineHeight: 18 },
});
