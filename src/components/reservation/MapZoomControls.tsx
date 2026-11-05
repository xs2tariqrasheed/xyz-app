import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ADDRESS_FIELD_MESSAGES } from '@/constants/messages';
import { colors, radii, shadowValues } from '@/theme';

export type MapZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Re-frames the whole route after the customer has panned or zoomed away. */
  onFit: () => void;
};

/**
 * + / − / fit buttons over the route map — the same control on web, iOS and
 * Android, so zooming never depends on knowing a pinch or ctrl+scroll gesture.
 */
export function MapZoomControls({ onZoomIn, onZoomOut, onFit }: MapZoomControlsProps) {
  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.group}>
        <ZoomButton label={ADDRESS_FIELD_MESSAGES.ZOOM_IN} glyph="+" onPress={onZoomIn} />
        <View style={styles.divider} />
        <ZoomButton label={ADDRESS_FIELD_MESSAGES.ZOOM_OUT} glyph="−" onPress={onZoomOut} />
      </View>
      <View style={styles.group}>
        <ZoomButton label={ADDRESS_FIELD_MESSAGES.FIT_ROUTE} glyph="⤢" onPress={onFit} />
      </View>
    </View>
  );
}

function ZoomButton({ label, glyph, onPress }: { label: string; glyph: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <Text style={styles.glyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', right: 10, top: 10, gap: 8, alignItems: 'flex-end' },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    boxShadow: shadowValues.sm,
  },
  divider: { height: 1, backgroundColor: colors.border },
  button: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.surfaceSelected },
  glyph: { color: colors.textStrong, fontSize: 20, fontWeight: '600', lineHeight: 22 },
});
