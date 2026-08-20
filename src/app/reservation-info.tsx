import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { InfoCard, SplitInfoCard } from '@/components/reservation/info/InfoCard';
import { InfoColumns, InfoList, InfoRow } from '@/components/reservation/info/InfoRow';
import {
  SAMPLE_RESERVATION,
  type RideAddress,
  type Reservation,
  type ReservationStatus,
} from '@/components/reservation/info/reservation';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';

const STATUS_TONE: Record<ReservationStatus, BadgeTone> = {
  Open: 'info',
  Confirmed: 'success',
  Completed: 'muted',
  Cancelled: 'accent',
};

export default function ReservationInfoScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const roomy = width >= breakpoints.sm;

  const [reservation, setReservation] = useState<Reservation>(SAMPLE_RESERVATION);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { passenger, pickup, destination, billing, preferences } = reservation;
  const cancelled = passenger.status === 'Cancelled';

  // A cancelled ride is a record, not a draft — its sections stop offering Edit.
  const editSection = cancelled ? undefined : () => router.navigate('/reserve');

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/');
  };

  const cancelRide = () => {
    setConfirmingCancel(false);
    setReservation((current) => ({
      ...current,
      passenger: { ...current.passenger, status: 'Cancelled' },
    }));
    setNotice(`Reservation ${reservation.reservationNumber} has been cancelled.`);
  };

  const printVoucher = () => {
    // `print` only exists on web; the same notice strip carries the news elsewhere.
    const host = globalThis as { print?: () => void };
    if (Platform.OS === 'web' && typeof host.print === 'function') {
      host.print();
      return;
    }
    setNotice('Printing a voucher is only available in the web app for now.');
  };

  return (
    <Screen
      title="Reservation info"
      subtitle="Everything we hold for this ride."
      trailing={<Badge label={passenger.status.toUpperCase()} tone={STATUS_TONE[passenger.status]} />}
    >
      <Stack.Screen options={{ title: 'Reservation info' }} />

      <View style={[styles.refs, roomy ? styles.refsWide : null]}>
        <Reference label="Reservation#" value={reservation.reservationNumber} />
        <Reference label="Voucher#" value={reservation.voucherNumber} />
      </View>

      <InfoCard title="Passenger Name & Ride Info" onEdit={editSection}>
        <InfoColumns
          left={
            <InfoList>
              <InfoRow label="First Name" value={passenger.firstName} />
              <InfoRow label="Last Name" value={passenger.lastName} />
              <InfoRow label="Ride Date" value={passenger.rideDate} />
              <InfoRow label="Ride Time" value={passenger.rideTime} />
            </InfoList>
          }
          right={
            <InfoList>
              <InfoRow label="Originate Date" value={passenger.originateDate} />
              <InfoRow label="Originate Time" value={passenger.originateTime} />
              <InfoRow label="Operator Name" value={passenger.operatorName} />
              <InfoRow label="Status">
                <Badge
                  label={passenger.status}
                  tone={STATUS_TONE[passenger.status]}
                  style={styles.statusBadge}
                />
              </InfoRow>
            </InfoList>
          }
        />
      </InfoCard>

      <SplitInfoCard
        onEdit={editSection}
        left={{ title: 'Pickup Address', content: <AddressPane address={pickup} /> }}
        right={{
          title: 'Destination Address',
          content: destination ? <AddressPane address={destination} /> : <AsDirected />,
        }}
      />

      <InfoCard title="Billing Info" onEdit={editSection}>
        <InfoColumns
          divider
          left={
            <InfoList>
              <InfoRow label="Voucher Number" value={billing.voucherNumber} />
              <InfoRow label="Invoice Number" value={billing.invoiceNumber} />
              <InfoRow label="Approval Date" value={billing.approvalDate} />
              <InfoRow label="Transaction Date" value={billing.transactionDate} />
              <InfoRow label="Transaction Amt" value={billing.transactionAmount} />
            </InfoList>
          }
          right={
            <InfoList>
              <InfoRow label="Payment Method" value={billing.paymentMethod} />
              <InfoRow label="Account #">
                <View style={styles.account}>
                  <Text style={styles.accountValue}>{billing.accountNumber}</Text>
                  <Text style={styles.accountVip}>VIP # : {billing.vipNumber}</Text>
                </View>
              </InfoRow>
            </InfoList>
          }
        />
      </InfoCard>

      <InfoCard title="Preferences" onEdit={editSection}>
        <InfoColumns
          left={
            <InfoList>
              <InfoRow label="Car Type" value={preferences.carType} />
              <InfoRow label="Callback Phone (US)" value={preferences.callbackPhone} />
              <InfoRow label="International Phone" value={preferences.internationalPhone} />
              <InfoRow label="Email">
                <EmailLink address={preferences.email} />
              </InfoRow>
            </InfoList>
          }
          right={
            <InfoList>
              <InfoRow label="Confirmation By" value={preferences.confirmationBy} />
              <InfoRow label="No. of Passengers" value={preferences.passengers} />
              <InfoRow label="No. of Stops" value={preferences.stops} />
            </InfoList>
          }
        />
      </InfoCard>

      {confirmingCancel ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmTitle}>Cancel this reservation?</Text>
          <Text style={styles.confirmBody}>
            Ride {reservation.reservationNumber} on {passenger.rideDate} at {passenger.rideTime}{' '}
            will be called off. This cannot be undone.
          </Text>
          <View style={[styles.confirmActions, roomy ? styles.actionsWide : null]}>
            <Button label="Keep reservation" variant="outline" onPress={() => setConfirmingCancel(false)} />
            <Button label="Yes, cancel it" variant="danger" onPress={cancelRide} />
          </View>
        </View>
      ) : null}

      {notice ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          onPress={() => setNotice(null)}
          style={styles.notice}
        >
          <Text style={styles.noticeText}>{notice}</Text>
        </Pressable>
      ) : null}

      <View style={[styles.actions, roomy ? styles.actionsWide : null]}>
        <Button label="Back" variant="outline" size="lg" onPress={goBack} />
        <Button
          label="Cancel Call"
          variant="outline"
          size="lg"
          disabled={cancelled}
          onPress={() => setConfirmingCancel(true)}
        />
        <Button label="Print Voucher" size="lg" onPress={printVoucher} />
      </View>
    </Screen>
  );
}

/** One end of the ride. Blank lines stay visible so the shape never shifts. */
function AddressPane({ address }: { address: RideAddress }) {
  return (
    <InfoList>
      <InfoRow label="City, State" value={address.cityState} />
      <InfoRow label="Landmark" value={address.landmark} />
      <InfoRow label="Cross Street1" value={address.crossStreet1} />
      <InfoRow label="Cross Street2" value={address.crossStreet2} />
      <InfoRow label="Pickup Point" value={address.pickupPoint} />
    </InfoList>
  );
}

/** Stands in for the destination pane on an as-directed ride. */
function AsDirected() {
  return (
    <View style={styles.asDirected}>
      <Text style={styles.asDirectedTitle}>As Directed</Text>
      <Text style={styles.asDirectedBody}>
        No drop-off was set — the driver follows the passenger&apos;s directions.
      </Text>
    </View>
  );
}

/** `Reservation# : W6081210500` — the identifiers that head the page. */
function Reference({ label, value }: { label: string; value: string }) {
  const filled = value.trim().length > 0;

  return (
    <View style={styles.reference}>
      <Text style={styles.referenceLabel}>{label} :</Text>
      <Text
        style={[styles.referenceValue, filled ? null : styles.referenceEmpty]}
        selectable={filled}
      >
        {filled ? value : 'Not issued'}
      </Text>
    </View>
  );
}

function EmailLink({ address }: { address: string }) {
  if (address.trim().length === 0) {
    return <Text style={styles.emailEmpty}>—</Text>;
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Email ${address}`}
      onPress={() => {
        Linking.openURL(`mailto:${address}`).catch(() => {
          /* No mail client registered — nothing useful to say. */
        });
      }}
    >
      {({ pressed }) => (
        <Text style={[styles.email, pressed ? styles.emailPressed : null]}>
          {address}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  refs: { gap: space.sm },
  refsWide: { flexDirection: 'row', justifyContent: 'space-between', gap: space.lg },
  reference: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  referenceLabel: { color: colors.textBody, fontSize: 14, fontWeight: '700' },
  referenceValue: { color: colors.textTitle, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  referenceEmpty: { color: colors.textDisabled, fontWeight: '400', letterSpacing: 0 },

  statusBadge: { alignSelf: 'flex-start' },

  account: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space.sm },
  accountValue: { color: colors.textStrong, fontSize: 14, fontWeight: '600' },
  accountVip: { color: colors.textMuted, fontSize: 13 },

  asDirected: { gap: space.xs, alignItems: 'center', justifyContent: 'center', flex: 1 },
  asDirectedTitle: { color: colors.textStrong, fontSize: 15, fontWeight: '700' },
  asDirectedBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center' },

  email: { color: colors.textLink, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  emailPressed: { color: colors.textLinkHover },
  emailEmpty: { color: colors.textDisabled, fontSize: 14 },

  confirm: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.lg,
    padding: space.lg,
    gap: space.sm,
  },
  confirmTitle: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  confirmBody: { color: colors.textBody, fontSize: 14, lineHeight: 20 },
  confirmActions: { gap: space.md, marginTop: space.xs },

  notice: {
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radii.lg,
    padding: space.md,
    boxShadow: shadowValues.sm,
  },
  noticeText: { color: colors.info, fontSize: 14, lineHeight: 20 },

  actions: { gap: space.md, marginTop: space.xs },
  actionsWide: { flexDirection: 'row', justifyContent: 'center' },
});
