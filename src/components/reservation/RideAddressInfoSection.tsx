import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { RouteMap } from "@/components/reservation/RouteMap";
import { AddressField } from "@/components/ui/AddressField";
import { CheckboxCard } from "@/components/ui/Checkbox";
import { SwapGlyph } from "@/components/ui/Glyph";
import { SelectField } from "@/components/ui/SelectField";
import { TextArea } from "@/components/ui/TextArea";
import { TextField } from "@/components/ui/TextField";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { RESERVATION_MESSAGES } from "@/constants/messages";
import { useRoute } from "@/hooks/useRoute";
import type { AddressSuggestion, StructuredPlace } from "@/services/places";
import { IDLE_ZONE, type Leg, type ZoneState } from "@/services/zones";
import { breakpoints, colors, focusedFieldStyle, radii, space } from "@/theme";

/** Where the driver meets an airport pickup (guide 01): C, D, B or A. */
export type AirportPickupOption = "A" | "B" | "C" | "D";

/** The flight details an airport stop asks for (guide 15). */
export type AirportDetails = {
  airline: string;
  flightNumber: string;
  /** Pickup only. */
  arrivingFrom: string;
  /** Pickup only. */
  pickupOption: AirportPickupOption | "";
  /** Drop-off only. */
  terminal: string;
  /** Drop-off only. */
  flyingTo: string;
};

/**
 * What the booking knows about one end of the ride beyond its label: the
 * structured address, whether it is still being looked up, its service-area
 * zone, and any flight details.
 */
export type LegDetails = {
  place: StructuredPlace | null;
  lookup: "idle" | "resolving" | "failed" | "ready";
  zone: ZoneState;
  /** The customer accepted an address the zone check could not match. */
  acknowledged: boolean;
  airport: AirportDetails;
};

export const EMPTY_AIRPORT: AirportDetails = {
  airline: "",
  flightNumber: "",
  arrivingFrom: "",
  pickupOption: "",
  terminal: "",
  flyingTo: "",
};

export function emptyLeg(): LegDetails {
  return { place: null, lookup: "idle", zone: IDLE_ZONE, acknowledged: false, airport: EMPTY_AIRPORT };
}

/** Everything section 2 collects. */
export type RideAddressInfoValue = {
  pickup: AddressSuggestion | null;
  /** How to find the passenger at the pickup address — gate codes, door, floor. */
  pickupNotes: string;
  pickupLeg: LegDetails;
  destination: AddressSuggestion | null;
  /** How to reach the drop-off point once the driver arrives. */
  destinationNotes: string;
  destinationLeg: LegDetails;
};

export function emptyRideAddressInfo(): RideAddressInfoValue {
  return {
    pickup: null,
    pickupNotes: "",
    pickupLeg: emptyLeg(),
    destination: null,
    destinationNotes: "",
    destinationLeg: emptyLeg(),
  };
}

export type RideAddressInfoField =
  | "pickup"
  | "pickupNotes"
  | "pickupAirline"
  | "pickupFlight"
  | "pickupOption"
  | "pickupZone"
  | "destination"
  | "destinationNotes"
  | "destinationFlight"
  | "destinationZone";
export type RideAddressInfoErrors = Partial<Record<RideAddressInfoField, string>>;

export type RideAddressInfoSectionProps = {
  value: RideAddressInfoValue;
  onChange: (next: RideAddressInfoValue) => void;
  /** Picks a stop and starts its lookup and zone check. */
  onSelectPlace: (leg: Leg, suggestion: AddressSuggestion | null) => void;
  /** The customer's saved, profile and company places. */
  savedOptions?: readonly AddressSuggestion[];
  errors?: RideAddressInfoErrors;
};

const PICKUP_OPTIONS = [
  { value: "C" as const, label: RESERVATION_MESSAGES.PICKUP_OPTION_OUTSIDE },
  { value: "D" as const, label: RESERVATION_MESSAGES.PICKUP_OPTION_INSIDE },
  { value: "B" as const, label: RESERVATION_MESSAGES.PICKUP_OPTION_ON_DEMAND },
  { value: "A" as const, label: RESERVATION_MESSAGES.PICKUP_OPTION_STANDBY },
];

export function RideAddressInfoSection({
  value,
  onChange,
  onSelectPlace,
  savedOptions = [],
  errors = {},
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
          onChange={(pickup) => onSelectPlace("pickup", pickup)}
          savedOptions={savedOptions}
          error={errors.pickup}
          {...focusProps("pickup")}
        />

        <LegStatus
          leg={value.pickupLeg}
          onAcknowledge={(acknowledged) =>
            onChange({ ...value, pickupLeg: { ...value.pickupLeg, acknowledged } })
          }
          error={errors.pickupZone}
        />

        {value.pickupLeg.place?.kind === "airport" ? (
          <AirportFields
            leg="pickup"
            airport={value.pickupLeg.airport}
            onChange={(airport) => onChange({ ...value, pickupLeg: { ...value.pickupLeg, airport } })}
            errors={errors}
          />
        ) : null}

        <TextArea
          label="Directions / Special Instructions"
          accessibilityLabel="Directions or special instructions for the pickup address"
          placeholder="Gate code, building entrance, floor, or anything the driver should know."
          rows={3}
          maxLength={FIELD_LIMITS.DIRECTIONS}
          value={value.pickupNotes}
          onChangeText={(pickupNotes) => onChange({ ...value, pickupNotes })}
          error={errors.pickupNotes}
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
              pickupLeg: value.destinationLeg,
              destination: value.pickup,
              destinationNotes: value.pickupNotes,
              destinationLeg: value.pickupLeg,
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
          onChange={(destination) => onSelectPlace("destination", destination)}
          savedOptions={savedOptions}
          error={errors.destination}
          {...focusProps("destination")}
        />

        <LegStatus
          leg={value.destinationLeg}
          onAcknowledge={(acknowledged) =>
            onChange({ ...value, destinationLeg: { ...value.destinationLeg, acknowledged } })
          }
          error={errors.destinationZone}
        />

        {value.destinationLeg.place?.kind === "airport" ? (
          <AirportFields
            leg="destination"
            airport={value.destinationLeg.airport}
            onChange={(airport) =>
              onChange({ ...value, destinationLeg: { ...value.destinationLeg, airport } })
            }
            errors={errors}
          />
        ) : null}

        <TextArea
          label="Directions / Special Instructions"
          accessibilityLabel="Directions or special instructions for the destination address"
          placeholder="Which entrance, terminal or suite the ride should end at."
          rows={3}
          maxLength={FIELD_LIMITS.DIRECTIONS}
          value={value.destinationNotes}
          onChangeText={(destinationNotes) =>
            onChange({ ...value, destinationNotes })
          }
          error={errors.destinationNotes}
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
 * Zone feedback under an address: a quiet line while it is checked, and an
 * acknowledgement when the address cannot be matched (guide 13). Silent once
 * matched — a confirmation nobody needs is noise.
 */
function LegStatus({
  leg,
  onAcknowledge,
  error,
}: {
  leg: LegDetails;
  onAcknowledge: (acknowledged: boolean) => void;
  error?: string;
}) {
  if (leg.lookup === "resolving" || leg.zone.status === "checking") {
    return <Text style={styles.statusText}>{RESERVATION_MESSAGES.ZONE_CHECKING}</Text>;
  }
  if (leg.zone.status !== "unmatched") return null;

  return (
    <View style={styles.unmatched}>
      <Text style={styles.unmatchedText}>{RESERVATION_MESSAGES.ZONE_UNMATCHED}</Text>
      <CheckboxCard
        checked={leg.acknowledged}
        onChange={onAcknowledge}
        label={RESERVATION_MESSAGES.ZONE_ACKNOWLEDGE}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

/**
 * Flight details for an airport stop (guide 15): a pickup needs the airline,
 * the flight and where to meet; a drop-off's are optional.
 */
function AirportFields({
  leg,
  airport,
  onChange,
  errors,
}: {
  leg: Leg;
  airport: AirportDetails;
  onChange: (next: AirportDetails) => void;
  errors: RideAddressInfoErrors;
}) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;
  const pickup = leg === "pickup";
  const patch = (next: Partial<AirportDetails>) => onChange({ ...airport, ...next });

  return (
    <View style={styles.airport}>
      <View style={[styles.airportRow, twoUp ? styles.airportRowWide : null]}>
        <TextField
          style={styles.airportField}
          label={RESERVATION_MESSAGES.AIRLINE_LABEL}
          required={pickup}
          value={airport.airline}
          onChangeText={(airline) => patch({ airline })}
          placeholder={RESERVATION_MESSAGES.AIRLINE_PLACEHOLDER}
          maxLength={30}
          autoCapitalize="words"
          error={pickup ? errors.pickupAirline : undefined}
        />
        <TextField
          style={styles.airportField}
          label={RESERVATION_MESSAGES.FLIGHT_LABEL}
          required={pickup}
          value={airport.flightNumber}
          onChangeText={(flightNumber) => patch({ flightNumber })}
          placeholder={RESERVATION_MESSAGES.FLIGHT_PLACEHOLDER}
          maxLength={FIELD_LIMITS.FLIGHT_NUMBER}
          autoCapitalize="characters"
          autoCorrect={false}
          error={pickup ? errors.pickupFlight : errors.destinationFlight}
        />
      </View>

      {pickup ? (
        <>
          <TextField
            label={RESERVATION_MESSAGES.ARRIVING_FROM_LABEL}
            value={airport.arrivingFrom}
            onChangeText={(arrivingFrom) => patch({ arrivingFrom })}
            placeholder={RESERVATION_MESSAGES.ARRIVING_FROM_PLACEHOLDER}
            maxLength={30}
            autoCapitalize="words"
          />
          <SelectField
            label={RESERVATION_MESSAGES.PICKUP_OPTION_LABEL}
            required
            value={airport.pickupOption}
            options={PICKUP_OPTIONS}
            onChange={(pickupOption) => patch({ pickupOption })}
            error={errors.pickupOption}
          />
        </>
      ) : (
        <View style={[styles.airportRow, twoUp ? styles.airportRowWide : null]}>
          <TextField
            style={styles.airportField}
            label={RESERVATION_MESSAGES.TERMINAL_LABEL}
            value={airport.terminal}
            onChangeText={(terminal) => patch({ terminal })}
            placeholder={RESERVATION_MESSAGES.TERMINAL_PLACEHOLDER}
            maxLength={30}
          />
          <TextField
            style={styles.airportField}
            label={RESERVATION_MESSAGES.DESTINATION_CITY_LABEL}
            value={airport.flyingTo}
            onChangeText={(flyingTo) => patch({ flyingTo })}
            placeholder={RESERVATION_MESSAGES.DESTINATION_CITY_PLACEHOLDER}
            maxLength={30}
            autoCapitalize="words"
          />
        </View>
      )}
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

  statusText: { color: colors.textMuted, fontSize: 13, marginTop: -space.sm },
  unmatched: { gap: space.sm, marginTop: -space.sm },
  unmatchedText: { color: colors.warning, fontSize: 13, fontWeight: "600" },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "500" },

  airport: { gap: space.lg },
  airportRow: { gap: space.lg },
  airportRowWide: { flexDirection: "row" },
  airportField: { flex: 1 },

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
