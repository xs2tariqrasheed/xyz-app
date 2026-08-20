import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteMap } from '@/components/reservation/RouteMap';
import { AddressField } from '@/components/ui/AddressField';
import { SwapGlyph } from '@/components/ui/Glyph';
import { useRoute } from '@/hooks/useRoute';
import type { AddressSuggestion } from '@/services/places';
import { colors, radii, space } from '@/theme';

/** Everything section 2 collects. */
export type RideAddressInfoValue = {
  pickup: AddressSuggestion | null;
  destination: AddressSuggestion | null;
};

export type RideAddressInfoSectionProps = {
  value: RideAddressInfoValue;
  onChange: (next: RideAddressInfoValue) => void;
};

export function RideAddressInfoSection({ value, onChange }: RideAddressInfoSectionProps) {
  const { route, loading, error } = useRoute(value.pickup, value.destination);
  const canSwap = Boolean(value.pickup || value.destination);

  return (
    <View style={styles.root}>
      <AddressField
        label="Pickup From"
        placeholder="Street, place or airport"
        marker="A"
        markerColor={colors.success}
        required
        value={value.pickup}
        onChange={(pickup) => onChange({ ...value, pickup })}
      />

      <View style={styles.swapRow}>
        <View style={styles.swapRule} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Swap pickup and destination"
          accessibilityState={{ disabled: !canSwap }}
          disabled={!canSwap}
          onPress={() =>
            onChange({ pickup: value.destination, destination: value.pickup })
          }
          style={({ pressed }) => [
            styles.swap,
            !canSwap ? styles.swapDisabled : null,
            pressed && canSwap ? styles.swapPressed : null,
          ]}
        >
          <SwapGlyph color={canSwap ? colors.primary[600] : colors.textDisabled} size={14} />
          <Text style={[styles.swapLabel, !canSwap ? styles.swapLabelDisabled : null]}>Swap</Text>
        </Pressable>
      </View>

      <AddressField
        label="Going To"
        placeholder="Where is the ride heading?"
        marker="B"
        markerColor={colors.danger}
        required
        value={value.destination}
        onChange={(destination) => onChange({ ...value, destination })}
      />

      <RouteMap
        origin={value.pickup}
        destination={value.destination}
        route={route}
        loading={loading}
        error={error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },

  swapRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: -space.sm },
  swapRule: { flex: 1, height: 1, backgroundColor: colors.border },
  swap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm - 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  swapPressed: { backgroundColor: colors.surfaceSelected, borderColor: colors.primary[200] },
  swapDisabled: { backgroundColor: colors.disabledBg, borderColor: colors.disabledBorder },
  swapLabel: { color: colors.primary[600], fontSize: 13, fontWeight: '600' },
  swapLabelDisabled: { color: colors.textDisabled },
});
