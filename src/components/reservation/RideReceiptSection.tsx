import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, space } from '@/theme';
import { pad2 } from '@/utils/datetime';

/** Where customers reach a human once the reservation is in. */
export const SUPPORT_PHONE = '929-XYZLimo';

/**
 * Confirmation number in the format the dispatch system hands back: a `W`
 * followed by the booking's month/day/hour and a four digit sequence.
 *
 * Generated on the client until a booking endpoint exists to return the real
 * one, so the receipt always has a number to show.
 */
export function makeReservationNumber(bookedAt: Date): string {
  const stamp =
    pad2(bookedAt.getMonth() + 1) + pad2(bookedAt.getDate()) + pad2(bookedAt.getHours());
  const sequence = pad2(bookedAt.getMinutes()) + pad2(bookedAt.getSeconds());

  return `W${stamp}${sequence}`;
}

export type RideReceiptSectionProps = {
  /** Confirmation number the booking came back with, e.g. `W6081210500`. */
  reservationNumber: string;
  /** Opens the online status page for this reservation. */
  onViewReservation?: () => void;
  /** Starts a fresh reservation for the return or next leg of the same trip. */
  onBookAnotherLeg?: () => void;
};

/**
 * Section 5 — the confirmation the customer lands on after booking.
 *
 * Unlike the earlier sections this one collects nothing: it hands back the
 * reservation number, says what happens next, and offers the two follow-on
 * actions plus the support and disclaimer copy.
 */
export function RideReceiptSection({
  reservationNumber,
  onViewReservation,
  onBookAnotherLeg,
}: RideReceiptSectionProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.paragraph}>
        <Text style={styles.strong}>Thank you</Text> for making a reservation with us. Your
        reservation number is <Text style={styles.number}>{reservationNumber}</Text>.
      </Text>

      <Text style={styles.paragraph}>
        You can expect an acknowledgement of your reservation shortly through your preferred
        confirmation method i.e email or phone. If you want to check the online status of your
        reservation you can click on the links below.
      </Text>

      <View style={styles.links}>
        <ReceiptLink label="View Your Reservation" onPress={onViewReservation} />
        <ReceiptLink
          label="Click here to make reservation for another leg of your trip"
          onPress={onBookAnotherLeg}
        />
      </View>

      <Text style={styles.paragraph}>
        Need more <Text style={styles.strong}>help?</Text>
      </Text>

      <Text style={styles.paragraph}>
        Contact us anytime at <Text style={styles.strong}>{SUPPORT_PHONE}</Text>
      </Text>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          <Text style={styles.strong}>Disclaimer:</Text> XYZ System is not responsible for any
          problem regarding network connections to retrieve these reservation. Acceptance of this
          reservation is subject to validity / approval of credit card, account number or vip
          number.
        </Text>
      </View>
    </View>
  );
}

/** Centred, underlined call to action — the receipt's only interactive parts. */
function ReceiptLink({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={styles.link}
    >
      {({ pressed }) => (
        <Text style={[styles.linkLabel, pressed && onPress ? styles.linkLabelPressed : null]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },

  paragraph: { color: colors.textBody, fontSize: 15, lineHeight: 24 },
  strong: { color: colors.textHeading, fontWeight: '700' },
  number: { color: colors.primary[600], fontWeight: '700', letterSpacing: 0.4 },

  // Wrapped so the two links sit closer to each other than to the surrounding
  // paragraphs, and stay centred at every width.
  links: { alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  link: { paddingHorizontal: space.sm, paddingVertical: space.xs },
  linkLabel: {
    color: colors.textHeading,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  linkLabelPressed: { color: colors.textLink },

  disclaimer: {
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radii.md,
    padding: space.lg,
  },
  disclaimerText: { color: colors.textBody, fontSize: 14, lineHeight: 22 },
});
