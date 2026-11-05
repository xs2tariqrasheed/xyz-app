import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import type { BillingMethodValue } from "@/components/reservation/BillingMethodSection";
import type { PassengerRideInfoValue } from "@/components/reservation/PassengerRideInfoSection";
import type { PreferencesValue } from "@/components/reservation/PreferencesSection";
import type { RideAddressInfoValue } from "@/components/reservation/RideAddressInfoSection";
import { InfoCard } from "@/components/reservation/info/InfoCard";
import { InfoList, InfoRow } from "@/components/reservation/info/InfoRow";
import {
  RESERVATION_SECTIONS,
  sectionIndex,
  type ReservationSectionId,
} from "@/components/reservation/sections";
import {
  addressOnly,
  BILLING_LABELS,
  EMPTY,
  formatCard,
  formatPhone,
  orEmpty,
} from "@/components/reservation/summaryFormat";
import { CheckGlyph } from "@/components/ui/Glyph";
import { RESERVATION_MESSAGES } from "@/constants/messages";
import { AIRPORT_PICKUP_OPTIONS, ccEmailList } from "@/services/reservation";
import { breakpoints, colors, radii, space } from "@/theme";
import { formatFullDate, formatTime } from "@/utils/datetime";

export type ReservationConfirmSectionProps = {
  info: PassengerRideInfoValue;
  addresses: RideAddressInfoValue;
  billing: BillingMethodValue;
  preferences: PreferencesValue;
  /** Display name of the chosen car type (from `RES.S.VEHICLE_TYPE`). */
  carLabel: string;
  /** Who the ride is booked for, when it is not the customer themselves. */
  bookingForLabel?: string;
  /** Saving changes to an existing reservation rather than booking a new one. */
  editing?: boolean;
  /** Jumps back to the step that owns a card, from its Edit button. */
  onEdit: (index: number) => void;
};

/**
 * The last look before booking: every answer from steps 1–4 read back in full,
 * each panel linked to the step that can change it.
 *
 * Nothing here is editable in place — an Edit sends the customer back to the
 * step itself, so there is only ever one set of controls for a given field.
 */
export function ReservationConfirmSection({
  info,
  addresses,
  billing,
  preferences,
  carLabel,
  bookingForLabel,
  editing,
  onEdit,
}: ReservationConfirmSectionProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.md;

  const pickupAirport =
    addresses.pickupLeg.place?.kind === "airport" ? addresses.pickupLeg.airport : null;
  const pickupOption = AIRPORT_PICKUP_OPTIONS.find(
    (option) => option.value === pickupAirport?.pickupOption,
  )?.label;
  const cc = ccEmailList(preferences.ccEmails).join(", ");
  const editStep = (id: ReservationSectionId) => () => onEdit(sectionIndex(id));
  const title = (id: ReservationSectionId) =>
    RESERVATION_SECTIONS[sectionIndex(id)].title;

  const paysByAccount = billing.method !== "card";
  const paysByCard = billing.method !== "corporate";

  // Half-width panels, so each card keeps its values in a single column.
  const cards = [
    <InfoCard
      key="passenger"
      title={title("passenger")}
      onEdit={editStep("passenger")}
      style={twoUp ? styles.fill : null}
    >
      <InfoList>
        {bookingForLabel ? (
          <InfoRow label={RESERVATION_MESSAGES.BOOKING_FOR_LABEL} value={bookingForLabel} />
        ) : null}
        <InfoRow label="First name" value={info.firstName} />
        <InfoRow label="Last name" value={info.lastName} />
        {info.isLive ? (
          <>
            <InfoRow label="Pickup" value="Live call — ready now" />
            <InfoRow
              label="Est. pickup"
              value={`Today, ${formatTime(info.estimatedTime)}`}
            />
          </>
        ) : (
          <>
            <InfoRow label="Ride date" value={formatFullDate(info.date)} />
            <InfoRow label="Ride time" value={formatTime(info.time)} />
          </>
        )}
      </InfoList>
    </InfoCard>,

    <InfoCard
      key="address"
      title={title("address")}
      onEdit={editStep("address")}
      style={twoUp ? styles.fill : null}
    >
      <InfoList>
        <InfoRow label="Pickup from" value={addressOnly(addresses.pickup)} />
        <InfoRow label="Pickup directions" value={addresses.pickupNotes} />
        {pickupAirport ? (
          <>
            <InfoRow label={RESERVATION_MESSAGES.AIRLINE_LABEL} value={pickupAirport.airline} />
            <InfoRow label={RESERVATION_MESSAGES.FLIGHT_LABEL} value={pickupAirport.flightNumber} />
            <InfoRow label={RESERVATION_MESSAGES.PICKUP_OPTION_LABEL} value={pickupOption ?? EMPTY} />
          </>
        ) : null}
        <InfoRow label="Going to" value={addressOnly(addresses.destination)} />
        <InfoRow
          label="Drop-off directions"
          value={addresses.destinationNotes}
        />
      </InfoList>
    </InfoCard>,

    <InfoCard
      key="billing"
      title={title("billing")}
      onEdit={editStep("billing")}
      style={twoUp ? styles.fill : null}
    >
      <InfoList>
        <InfoRow label="Method" value={BILLING_LABELS[billing.method]} />
        {paysByAccount ? (
          <>
            <InfoRow
              label="Account number"
              value={orEmpty(billing.accountNumber)}
            />
            <InfoRow label="VIP number" value={billing.vipNumber} />
          </>
        ) : null}
        {paysByCard ? (
          <>
            <InfoRow label="Name on card" value={billing.card.holder} />
            <InfoRow
              label="Card"
              value={formatCard(billing.card.number || billing.cardOnFile)}
            />
            {billing.card.number ? (
              <>
                <InfoRow label="Expires" value={billing.card.expiry} />
                <InfoRow label="Billing ZIP" value={billing.card.postalCode} />
              </>
            ) : null}
          </>
        ) : (
          <InfoRow label="Card" value={EMPTY} />
        )}
      </InfoList>
    </InfoCard>,

    <InfoCard
      key="preferences"
      title={title("preferences")}
      onEdit={editStep("preferences")}
      style={twoUp ? styles.fill : null}
    >
      <InfoList>
        <InfoRow label="Car type" value={orEmpty(carLabel)} />
        <InfoRow label="No. of passengers" value={preferences.passengers} />
        <InfoRow label="No. of stops" value={preferences.stops} />
        <InfoRow label="Email" value={preferences.email} />
        {cc ? <InfoRow label={RESERVATION_MESSAGES.CC_EMAIL_LABEL} value={cc} /> : null}
        {preferences.ridePurpose.trim() ? (
          <InfoRow label={RESERVATION_MESSAGES.RIDE_PURPOSE_LABEL} value={preferences.ridePurpose} />
        ) : null}
        <InfoRow
          label="Confirmation by"
          value={preferences.confirmByPhone ? "Phone" : "Email"}
        />
        <InfoRow
          label="Callback (US)"
          value={formatPhone(preferences.callbackUs)}
        />
        <InfoRow
          label="Callback (intl.)"
          value={formatPhone(preferences.callbackIntl)}
        />
      </InfoList>
    </InfoCard>,
  ];

  return (
    <View style={styles.root}>
      <Text style={styles.lede}>{RESERVATION_MESSAGES.PREVIEW_LEDE}</Text>

      {twoUp ? (
        pairs(cards).map((pair, index) => (
          <View key={index} style={styles.row}>
            {pair[0]}
            {/* Keeps a lone last card at half width rather than stretching it. */}
            {pair[1] ?? <View style={styles.fill} />}
          </View>
        ))
      ) : (
        <>{cards}</>
      )}

      <View style={styles.note}>
        <View style={styles.noteIcon}>
          <CheckGlyph color={colors.success} size={14} />
        </View>
        <Text style={styles.noteText}>
          {editing ? RESERVATION_MESSAGES.EDIT_PREVIEW_NOTE : RESERVATION_MESSAGES.PREVIEW_NOTE}
        </Text>
      </View>
    </View>
  );
}

/** Splits the cards into rows of two, in order. */
function pairs<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  lede: { color: colors.textBody, fontSize: 14, lineHeight: 20 },

  row: { flexDirection: "row", alignItems: "stretch", gap: space.lg },
  fill: { flex: 1 },

  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radii.lg,
    padding: space.md,
  },
  noteIcon: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  noteText: { flex: 1, color: colors.textBody, fontSize: 13, lineHeight: 18 },
});
