import { StyleSheet, Text, View } from "react-native";

import type { BillingMethodValue } from "@/components/reservation/BillingMethodSection";
import type { PassengerRideInfoValue } from "@/components/reservation/PassengerRideInfoSection";
import type { PreferencesValue } from "@/components/reservation/PreferencesSection";
import type { RideAddressInfoValue } from "@/components/reservation/RideAddressInfoSection";
import { findCarType } from "@/components/reservation/carTypes";
import { InfoCard, SplitInfoCard } from "@/components/reservation/info/InfoCard";
import {
  InfoColumns,
  InfoList,
  InfoRow,
} from "@/components/reservation/info/InfoRow";
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
import { colors, radii, space } from "@/theme";
import { formatFullDate, formatTime } from "@/utils/datetime";

export type ReservationConfirmSectionProps = {
  info: PassengerRideInfoValue;
  addresses: RideAddressInfoValue;
  billing: BillingMethodValue;
  preferences: PreferencesValue;
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
  onEdit,
}: ReservationConfirmSectionProps) {
  const car = findCarType(preferences.carType);
  const editStep = (id: ReservationSectionId) => () => onEdit(sectionIndex(id));
  const title = (id: ReservationSectionId) =>
    RESERVATION_SECTIONS[sectionIndex(id)].title;

  const paysByAccount = billing.method !== "card";
  const paysByCard = billing.method !== "corporate";

  return (
    <View style={styles.root}>
      <Text style={styles.lede}>
        Check the details below. Booking sends the ride to dispatch and issues
        your receipt.
      </Text>

      <InfoCard title={title("passenger")} onEdit={editStep("passenger")}>
        <InfoColumns
          left={
            <InfoList>
              <InfoRow label="First name" value={info.firstName} />
              <InfoRow label="Last name" value={info.lastName} />
            </InfoList>
          }
          right={
            <InfoList>
              {info.isLive ? (
                <InfoRow label="Pickup" value="Live call — ready now" />
              ) : (
                <>
                  <InfoRow label="Ride date" value={formatFullDate(info.date)} />
                  <InfoRow label="Ride time" value={formatTime(info.time)} />
                </>
              )}
            </InfoList>
          }
        />
      </InfoCard>

      <SplitInfoCard
        onEdit={editStep("address")}
        left={{
          title: "Pickup From",
          content: (
            <InfoList>
              <InfoRow label="Address" value={addressOnly(addresses.pickup)} />
              <InfoRow label="Directions" value={addresses.pickupNotes} />
            </InfoList>
          ),
        }}
        right={{
          title: "Going To",
          content: (
            <InfoList>
              <InfoRow
                label="Address"
                value={addressOnly(addresses.destination)}
              />
              <InfoRow label="Directions" value={addresses.destinationNotes} />
            </InfoList>
          ),
        }}
      />

      <InfoCard title={title("billing")} onEdit={editStep("billing")}>
        <InfoColumns
          divider
          left={
            <InfoList>
              <InfoRow label="Method" value={BILLING_LABELS[billing.method]} />
              {paysByAccount ? (
                <InfoRow
                  label="Account number"
                  value={orEmpty(billing.accountNumber)}
                />
              ) : null}
              {paysByAccount ? (
                <InfoRow label="VIP number" value={billing.vipNumber} />
              ) : null}
            </InfoList>
          }
          right={
            <InfoList>
              {paysByCard ? (
                <>
                  <InfoRow label="Name on card" value={billing.card.holder} />
                  <InfoRow
                    label="Card"
                    value={formatCard(billing.card.number)}
                  />
                  <InfoRow label="Expires" value={billing.card.expiry} />
                  <InfoRow
                    label="Billing ZIP"
                    value={billing.card.postalCode}
                  />
                </>
              ) : (
                <InfoRow label="Card" value={EMPTY} />
              )}
            </InfoList>
          }
        />
      </InfoCard>

      <InfoCard title={title("preferences")} onEdit={editStep("preferences")}>
        <InfoColumns
          left={
            <InfoList>
              <InfoRow label="Car type" value={car.label} />
              <InfoRow label="No. of passengers" value={preferences.passengers} />
              <InfoRow label="No. of stops" value={preferences.stops} />
            </InfoList>
          }
          right={
            <InfoList>
              <InfoRow label="Email" value={preferences.email} />
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
          }
        />
      </InfoCard>

      <View style={styles.note}>
        <View style={styles.noteIcon}>
          <CheckGlyph color={colors.success} size={14} />
        </View>
        <Text style={styles.noteText}>
          Nothing has been booked yet. Use{" "}
          <Text style={styles.noteStrong}>Book and Continue</Text> below to
          confirm this ride.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  lede: { color: colors.textBody, fontSize: 14, lineHeight: 20 },

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
  noteStrong: { color: colors.textStrong, fontWeight: "700" },
});
