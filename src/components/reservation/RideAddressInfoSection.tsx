import { Pressable, StyleSheet, Text, View } from "react-native";

import { RouteMap } from "@/components/reservation/RouteMap";
import { AddressField } from "@/components/ui/AddressField";
import { SwapGlyph } from "@/components/ui/Glyph";
import { TextArea } from "@/components/ui/TextArea";
import { useRoute } from "@/hooks/useRoute";
import type { AddressSuggestion } from "@/services/places";
import { colors, radii, space } from "@/theme";

/** Keeps a note short enough to read at a glance on a driver's phone. */
const NOTES_MAX_LENGTH = 300;

/** Everything section 2 collects. */
export type RideAddressInfoValue = {
  pickup: AddressSuggestion | null;
  /** How to find the passenger at the pickup address — gate codes, door, floor. */
  pickupNotes: string;
  destination: AddressSuggestion | null;
  /** How to reach the drop-off point once the driver arrives. */
  destinationNotes: string;
};

export type RideAddressInfoSectionProps = {
  value: RideAddressInfoValue;
  onChange: (next: RideAddressInfoValue) => void;
};

export function RideAddressInfoSection({
  value,
  onChange,
}: RideAddressInfoSectionProps) {
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

      <TextArea
        label="Directions / Special Instructions"
        accessibilityLabel="Directions or special instructions for the pickup address"
        placeholder="Gate code, building entrance, floor, or anything the driver should know."
        rows={3}
        maxLength={NOTES_MAX_LENGTH}
        value={value.pickupNotes}
        onChangeText={(pickupNotes) => onChange({ ...value, pickupNotes })}
      />

      <View style={styles.swapRow}>
        <View style={styles.swapRule} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Swap pickup and destination"
          accessibilityState={{ disabled: !canSwap }}
          disabled={!canSwap}
          onPress={() =>
            onChange({
              ...value,
              pickup: value.destination,
              pickupNotes: value.destinationNotes,
              destination: value.pickup,
              destinationNotes: value.pickupNotes,
            })
          }
          style={({ pressed }) => [
            styles.swap,
            !canSwap ? styles.swapDisabled : null,
            pressed && canSwap ? styles.swapPressed : null,
          ]}
        >
          <SwapGlyph
            color={canSwap ? colors.primary[600] : colors.textDisabled}
            size={14}
          />
          <Text
            style={[
              styles.swapLabel,
              !canSwap ? styles.swapLabelDisabled : null,
            ]}
          >
            Swap
          </Text>
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

      <TextArea
        label="Directions / Special Instructions"
        accessibilityLabel="Directions or special instructions for the destination address"
        placeholder="Which entrance, terminal or suite the ride should end at."
        rows={3}
        maxLength={NOTES_MAX_LENGTH}
        value={value.destinationNotes}
        onChangeText={(destinationNotes) =>
          onChange({ ...value, destinationNotes })
        }
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

  swapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginVertical: -space.sm,
  },
  swapRule: { flex: 1, height: 1, backgroundColor: colors.border },
  swap: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm - 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  swapPressed: {
    backgroundColor: colors.surfaceSelected,
    borderColor: colors.primary[200],
  },
  swapDisabled: {
    backgroundColor: colors.disabledBg,
    borderColor: colors.disabledBorder,
  },
  swapLabel: { color: colors.primary[600], fontSize: 13, fontWeight: "600" },
  swapLabelDisabled: { color: colors.textDisabled },
});
