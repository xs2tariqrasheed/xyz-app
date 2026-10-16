import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RESERVATION_MESSAGES } from '@/constants/messages';
import { colors, radii, space } from '@/theme';

/** Where customers reach a human once the reservation is in. */
export const SUPPORT_PHONE = '929-XYZLimo';

export type RideReceiptSectionProps = {
  /** Number the booking came back with; `null` when the server sent none. */
  reservationNumber: string | null;
  /** The receipt follows saved changes rather than a new booking. */
  updated?: boolean;
  /** The confirmation e-mail could not be sent. */
  emailFailed?: boolean;
  /** Opens the reservation, or the upcoming list when there is no number. */
  onViewReservation?: () => void;
  /** Starts a fresh reservation for the return or next leg of the same trip. */
  onBookAnotherLeg?: () => void;
};

/**
 * Section 6 — the confirmation the customer lands on after booking
 * (reverse-engineer-implemented/guide/13). It shows the number the server issued, never
 * one made up on the device.
 */
export function RideReceiptSection({
  reservationNumber,
  updated,
  emailFailed,
  onViewReservation,
  onBookAnotherLeg,
}: RideReceiptSectionProps) {
  return (
    <View style={styles.root}>
      {updated ? (
        <Text style={styles.paragraph}>
          {RESERVATION_MESSAGES.RECEIPT_UPDATED}
          {reservationNumber ? (
            <>
              {' '}
              <Text style={styles.number}>{reservationNumber}</Text>
            </>
          ) : null}
        </Text>
      ) : (
        <Text style={styles.paragraph}>
          <Text style={styles.strong}>{RESERVATION_MESSAGES.RECEIPT_THANKS}</Text>{' '}
          {reservationNumber ? (
            <>
              {RESERVATION_MESSAGES.RECEIPT_NUMBER}{' '}
              <Text style={styles.number}>{reservationNumber}</Text>.
            </>
          ) : (
            RESERVATION_MESSAGES.RECEIPT_NO_NUMBER
          )}
        </Text>
      )}

      <Text style={styles.paragraph}>{RESERVATION_MESSAGES.RECEIPT_NEXT}</Text>

      {emailFailed ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{RESERVATION_MESSAGES.RECEIPT_EMAIL_FAILED}</Text>
        </View>
      ) : null}

      <View style={styles.links}>
        <ReceiptLink
          label={reservationNumber ? RESERVATION_MESSAGES.VIEW_RESERVATION : RESERVATION_MESSAGES.VIEW_UPCOMING}
          onPress={onViewReservation}
        />
        {updated ? null : (
          <ReceiptLink label={RESERVATION_MESSAGES.BOOK_ANOTHER_LEG} onPress={onBookAnotherLeg} />
        )}
      </View>

      <Text style={styles.paragraph}>
        {RESERVATION_MESSAGES.HELP_PREFIX} <Text style={styles.strong}>{SUPPORT_PHONE}</Text>
      </Text>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{RESERVATION_MESSAGES.DISCLAIMER}</Text>
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

  warning: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radii.md,
    padding: space.md,
  },
  warningText: { color: colors.textBody, fontSize: 14, lineHeight: 20 },

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
