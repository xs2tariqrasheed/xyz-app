import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { RouteMap } from "@/components/reservation/RouteMap";
import { AddressField } from "@/components/ui/AddressField";
import { SwapGlyph } from "@/components/ui/Glyph";
import { TextArea } from "@/components/ui/TextArea";
import { useRoute } from "@/hooks/useRoute";
import type { AddressSuggestion } from "@/services/places";
import { colors, focusedFieldStyle, radii, space } from "@/theme";

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

/** Which leg of the ride owns the field the cursor is in. */
type Leg = "pickup" | "destination";

export function RideAddressInfoSection({
  value,
  onChange,
}: RideAddressInfoSectionProps) {
  const { route, loading, error } = useRoute(value.pickup, value.destination);
  const canSwap = Boolean(value.pickup || value.destination);
  const [focusedLeg, setFocusedLeg] = useState<Leg | null>(null);

  /**
   * Focus lands on the new field after it leaves the old one, so a blur only
   * clears the highlight when it is still the one that set it — moving between
   * two fields of the same group keeps the group lit.
   */
  const focusProps = (leg: Leg) => ({
    onFocus: () => setFocusedLeg(leg),
    onBlur: () => setFocusedLeg((current) => (current === leg ? null : current)),
  });

  return (
    <View style={styles.root}>
      <AddressGroup active={focusedLeg === "pickup"}>
        <AddressField
          label="Pickup From"
          placeholder="Street, place or airport"
          marker="A"
          markerColor={colors.success}
          required
          value={value.pickup}
          onChange={(pickup) => onChange({ ...value, pickup })}
          {...focusProps("pickup")}
        />

        <TextArea
          label="Directions / Special Instructions"
          accessibilityLabel="Directions or special instructions for the pickup address"
          placeholder="Gate code, building entrance, floor, or anything the driver should know."
          rows={3}
          maxLength={NOTES_MAX_LENGTH}
          value={value.pickupNotes}
          onChangeText={(pickupNotes) => onChange({ ...value, pickupNotes })}
          {...focusProps("pickup")}
        />
      </AddressGroup>

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

      <AddressGroup active={focusedLeg === "destination"}>
        <AddressField
          label="Going To"
          placeholder="Where is the ride heading?"
          marker="B"
          markerColor={colors.danger}
          required
          value={value.destination}
          onChange={(destination) => onChange({ ...value, destination })}
          {...focusProps("destination")}
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
          {...focusProps("destination")}
        />
      </AddressGroup>

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

/**
 * Binds an address to the directions that belong with it.
 *
 * `active` lifts the group as well as tinting it: the address field's
 * autocomplete list escapes the box, and the wrapper would otherwise stack it
 * under whatever follows.
 */
function AddressGroup({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.group, active ? styles.groupActive : null]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },

  group: {
    gap: space.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: space.md,
    zIndex: 1,
  },
  groupActive: {
    ...focusedFieldStyle,
    backgroundColor: colors.surfaceSelected,
    zIndex: 30,
    elevation: 30,
  },

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
