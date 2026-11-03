import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { InfoCard, SplitInfoCard } from '@/components/reservation/info/InfoCard';
import { DriverCard } from '@/components/reservation/info/DriverCard';
import { InfoColumns, InfoList, RecordRow } from '@/components/reservation/info/InfoRow';
import { MessagesCard } from '@/components/reservation/info/MessagesCard';
import { CancelReservationSheet } from '@/components/rides/CancelReservationSheet';
import { RideQuestionSheet } from '@/components/rides/RideQuestionSheet';
import { RideStatusBadge } from '@/components/rides/RideStatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { hasRateRideUrl } from '@/config/rateRide';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { COMMON_MESSAGES, RECEIPTS_MESSAGES, RESERVATION_INFO_MESSAGES, RESERVATION_MESSAGES, RIDES_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useCommunicationLog } from '@/hooks/useCommunicationLog';
import { useFetchData } from '@/hooks/useFetchData';
import { useOpenReservation } from '@/hooks/useReservationActions';
import { useVehicleTypes } from '@/hooks/useReservationLookups';
import { useReservationRecord } from '@/hooks/useReservationRecord';
import { placeLocalityLine } from '@/services/places';
import {
  AIRPORT_PICKUP_OPTIONS,
  columnReadJData,
  type RecordStop,
  RESERVATION_COLUMN_IDS,
  toSingleColumnValue,
} from '@/services/reservation';
import { hasRideReceipt, hasVoucherNumber } from '@/services/rideDocument';
import { openRateRide } from '@/services/rateRide';
import { findVehicleType } from '@/services/vehicleTypes';
import { breakpoints, colors, space } from '@/theme';
import { formatClockTime, formatSlashDate } from '@/utils/datetime';
import { formatIntlPhone, formatUsPhone } from '@/utils/phone';

type Notice = { tone: 'success' | 'danger'; message: string } | null;

/**
 * One reservation in full (reverse-engineer-implemented/guide/20): `RES.S.LOAD_RESERVATION`
 * for the record, `PROF.S.CAR_INFO` for the car and driver,
 * `RES.S.COMMUNICATION_LOG` for the messages sent, and the extra contact
 * stored on it (`RES.S.LOAD_RESERVATION_COLUMN_SINGLE_VALUE`).
 */
export default function ReservationInfoScreen() {
  const { rideno } = useLocalSearchParams<{ rideno?: string }>();
  const reservationNumber = typeof rideno === 'string' ? rideno.trim() : '';
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/rides');
  };

  return (
    <Screen title={RESERVATION_INFO_MESSAGES.SCREEN_TITLE}>
      <Stack.Screen options={{ title: RESERVATION_INFO_MESSAGES.SCREEN_TITLE }} />
      {reservationNumber ? (
        <LoadedReservation key={reservationNumber} reservationNumber={reservationNumber} onBack={goBack} />
      ) : (
        <>
          <Alert tone="info" message={RESERVATION_INFO_MESSAGES.NOT_FOUND} />
          <Button label={RESERVATION_INFO_MESSAGES.BACK} variant="outline" onPress={goBack} style={styles.back} />
        </>
      )}
    </Screen>
  );
}

function LoadedReservation({ reservationNumber, onBack }: { reservationNumber: string; onBack: () => void }) {
  const { session } = useAuth();
  const loginId = session?.loginId ?? '';
  const router = useRouter();
  const { width } = useWindowDimensions();
  const roomy = width >= breakpoints.sm;

  const [now] = useState(() => new Date());
  const [notice, setNotice] = useState<Notice>(null);
  const [cancelling, setCancelling] = useState(false);
  const [asking, setAsking] = useState(false);
  const opener = useOpenReservation();

  const { record, failureMessage, isLoading, refetch } = useReservationRecord(reservationNumber);
  const vehicleTypes = useVehicleTypes();

  if (isLoading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.primary[600]} />
      </View>
    );
  }

  if (failureMessage || !record) {
    return (
      <>
        <Alert tone="danger" title={RESERVATION_INFO_MESSAGES.LOAD_FAILED_TITLE} message={failureMessage ?? ''} />
        <View style={[styles.actions, roomy ? styles.actionsWide : null]}>
          <Button label={RESERVATION_INFO_MESSAGES.BACK} variant="outline" onPress={onBack} />
          <Button label={RESERVATION_INFO_MESSAGES.RETRY} onPress={refetch} />
        </View>
      </>
    );
  }

  const cancelled = record.status === 'canceled';
  const upcoming = record.status === 'confirmed' && (record.rideAt?.getTime() ?? 0) > now.getTime();
  const finished = record.status === 'completed';
  // The old site offers Track Your Route on every ride; one with no log yet shows the empty state.
  const trackable = !cancelled;
  const hasVoucher = hasVoucherNumber(record);
  const hasReceipt = hasRideReceipt(record);
  const editSection = upcoming ? () => void opener.open(record.reservationNumber, 'edit') : undefined;
  const { preferences, billing } = record;
  const carTypeLabel = findVehicleType(vehicleTypes.items, preferences.carType)?.label ?? '';

  return (
    <>
      <View style={[styles.refs, roomy ? styles.refsWide : null]}>
        <Reference label="Reservation#" value={record.reservationNumber} />
        <Reference label="Voucher#" value={record.voucherNumber} />
        <RideStatusBadge status={record.status} />
      </View>

      {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}
      {opener.error ? <Alert tone="danger" message={opener.error} /> : null}

      <InfoCard title="Passenger Name & Ride Info" onEdit={editSection}>
        <InfoColumns
          left={
            <InfoList>
              <RecordRow label="First Name" value={record.firstName} />
              <RecordRow label="Last Name" value={record.lastName} />
              <RecordRow label="Ride Date" value={record.rideAt ? formatSlashDate(record.rideAt) : ''} />
              <RecordRow label="Ride Time" value={record.rideAt ? formatClockTime(record.rideAt) : ''} />
            </InfoList>
          }
          right={
            <InfoList>
              <RecordRow label="Originate Date" value={record.originateOn ? formatSlashDate(record.originateOn) : ''} />
              {/* The record stores the day only (`oeoriginatedatetime`, DD-MON-YY). */}
              <RecordRow label="Originate Time" value="" />
              <RecordRow label="Operator Name" value={record.operatorName} />
              <RecordRow label="Status" value={record.statusLabel} />
            </InfoList>
          }
        />
      </InfoCard>

      <SplitInfoCard
        onEdit={editSection}
        left={{ title: 'Pickup Address', content: <StopPane stop={record.pickup} pickup /> }}
        right={{
          title: 'Destination Address',
          content: record.destination ? <StopPane stop={record.destination} /> : <AsDirected />,
        }}
      />

      <InfoCard title="Billing Info" onEdit={editSection}>
        <InfoColumns
          divider
          left={
            <InfoList>
              <RecordRow label="Voucher Number" value={billing.voucherNumber} />
              <RecordRow label="Invoice Number" value={billing.invoiceNumber} />
              <RecordRow label="Approval Date" value={billing.approvalDate} />
              <RecordRow label="Transaction Date" value={billing.transactionDate} />
              <RecordRow label="Transaction Amt" value={billing.transactionAmount} />
            </InfoList>
          }
          right={
            <InfoList>
              <RecordRow label="Payment Method" value={billing.paymentLabel} />
              {billing.accountNumber ? (
                <RecordRow label="Account #">
                  <View style={styles.account}>
                    <Text style={styles.accountValue}>{billing.accountNumber}</Text>
                    {billing.vipNumber ? <Text style={styles.accountVip}>VIP # : {billing.vipNumber}</Text> : null}
                  </View>
                </RecordRow>
              ) : null}
              {billing.cardMasked ? (
                <RecordRow label="Card" value={[billing.cardType, `•••• ${billing.cardMasked.slice(-4)}`].filter(Boolean).join(' ')} />
              ) : null}
            </InfoList>
          }
        />
      </InfoCard>

      <DriverCard record={record} carTypeLabel={carTypeLabel} />

      <InfoCard title="Preferences" onEdit={editSection}>
        <InfoColumns
          left={
            <InfoList>
              <RecordRow label="Car Type" value={carTypeLabel} />
              <RecordRow
                label="Callback Phone (US)"
                value={preferences.phoneUs ? withExt(formatUsPhone(preferences.phoneUs), preferences.phoneUsExt) : ''}
              />
              <RecordRow
                label="International Phone"
                value={preferences.phoneIntl ? withExt(formatIntlPhone(preferences.phoneIntl), preferences.phoneIntlExt) : ''}
              />
              <RecordRow label="Email">
                <EmailLink address={preferences.email} />
              </RecordRow>
              <ExtraContact reservationNumber={record.reservationNumber} />
            </InfoList>
          }
          right={
            <InfoList>
              <RecordRow label="Confirmation By" value={preferences.confirmByPhone ? 'Phone' : 'Email'} />
              <RecordRow label="No. of Passengers" value={preferences.passengers} />
              <RecordRow label="No. of Stops" value={preferences.stops} />
              {preferences.ridePurpose ? (
                <RecordRow label={RESERVATION_MESSAGES.RIDE_PURPOSE_LABEL} value={preferences.ridePurpose} />
              ) : null}
            </InfoList>
          }
        />
      </InfoCard>

      {record.charges.length > 0 ? (
        <InfoCard title={RESERVATION_INFO_MESSAGES.CHARGES_TITLE}>
          <InfoList>
            {record.charges.map((charge) => (
              <RecordRow key={charge.label} label={charge.label} value={charge.amount} />
            ))}
          </InfoList>
        </InfoCard>
      ) : null}

      {cancelled ? (
        <InfoCard title={RESERVATION_INFO_MESSAGES.CANCEL_REASON}>
          {/* `LOAD_RESERVATION` sends no cancel-reason heading (guide §10). */}
          <Text style={styles.body}>{COMMON_MESSAGES.NOT_AVAILABLE}</Text>
        </InfoCard>
      ) : null}

      <Messages loginId={loginId} reservationNumber={record.reservationNumber} />

      <View style={[styles.actions, roomy ? styles.actionsWide : null]}>
        <Button label={RESERVATION_INFO_MESSAGES.BACK} variant="outline" onPress={onBack} />
        {upcoming ? (
          <>
            <Button
              label={RESERVATION_INFO_MESSAGES.EDIT}
              variant="outline"
              disabled={opener.openingId !== null}
              onPress={() => void opener.open(record.reservationNumber, 'edit')}
            />
            <Button
              label={RESERVATION_INFO_MESSAGES.CANCEL}
              variant="danger"
              onPress={() => setCancelling(true)}
            />
          </>
        ) : null}
        {trackable ? (
          <Button
            label={RESERVATION_INFO_MESSAGES.TRACK}
            variant="outline"
            onPress={() => router.push({ pathname: '/track-ride', params: { rideno: record.reservationNumber } })}
          />
        ) : null}
        {hasVoucher ? (
          <Button
            label={RESERVATION_INFO_MESSAGES.VOUCHER}
            variant="outline"
            onPress={() => router.push({ pathname: '/voucher', params: { rideno: record.reservationNumber } })}
          />
        ) : null}
        {hasReceipt ? (
          <Button
            label={RECEIPTS_MESSAGES.VIEW}
            variant="outline"
            onPress={() => router.push({ pathname: '/receipt', params: { rideno: record.reservationNumber } })}
          />
        ) : null}
        {record.destination ? (
          <Button
            label={RESERVATION_INFO_MESSAGES.RETURN_TRIP}
            variant="outline"
            disabled={opener.openingId !== null}
            onPress={() => void opener.open(record.reservationNumber, 'return')}
          />
        ) : null}
        <Button
          label={RESERVATION_INFO_MESSAGES.REPEAT}
          variant="outline"
          disabled={opener.openingId !== null}
          onPress={() => void opener.open(record.reservationNumber, 'repeat')}
        />
        {finished && hasRateRideUrl ? (
          <Button
            label={RESERVATION_INFO_MESSAGES.LEAVE_FEEDBACK}
            variant="outline"
            onPress={() => {
              setNotice(null);
              void openRateRide(record.reservationNumber).then(
                (failure) => failure && setNotice({ tone: 'danger', message: failure }),
              );
            }}
          />
        ) : null}
        {cancelled || finished ? null : (
          <Button label={RESERVATION_INFO_MESSAGES.ASK} variant="outline" onPress={() => setAsking(true)} />
        )}
      </View>

      <CancelReservationSheet
        reservationNumber={cancelling ? record.reservationNumber : null}
        onClose={() => setCancelling(false)}
        onCancelled={() => {
          setCancelling(false);
          setNotice({ tone: 'success', message: RIDES_MESSAGES.CANCEL_DONE });
          refetch();
        }}
      />

      <RideQuestionSheet
        reservationNumber={asking ? record.reservationNumber : null}
        onClose={() => setAsking(false)}
        onSent={(message) => setNotice({ tone: 'success', message })}
      />
    </>
  );
}

function withExt(number: string, ext: string): string {
  return ext ? `${number} ext. ${ext}` : number;
}

/** The Email CC / extra contact stored on the reservation, when there is one. */
function ExtraContact({ reservationNumber }: { reservationNumber: string }) {
  const { data } = useFetchData(
    ACTION_CODES.LOAD_RESERVATION_COLUMN_SINGLE_VALUE,
    GATEWAY_VIEW_NAME,
    columnReadJData(reservationNumber, RESERVATION_COLUMN_IDS.emailCc),
  );
  const value = data ? toSingleColumnValue(data) : '';
  return value ? <RecordRow label={RESERVATION_INFO_MESSAGES.EXTRA_CONTACT} value={value} /> : null;
}

function Messages({ loginId, reservationNumber }: { loginId: string; reservationNumber: string }) {
  return <MessagesCard log={useCommunicationLog(loginId, reservationNumber)} />;
}

/** One end of the ride. Blank lines stay visible so the shape never shifts. */
function StopPane({ stop, pickup }: { stop: RecordStop; pickup?: boolean }) {
  const { place, airport } = stop;
  const option = AIRPORT_PICKUP_OPTIONS.find((item) => item.value === airport.pickupOption)?.label;
  return (
    <InfoList>
      <RecordRow label="City, State" value={placeLocalityLine(place)} />
      {place.kind === 'airport' ? (
        <>
          <RecordRow label="Airport" value={place.airportName} />
          <RecordRow label={RESERVATION_MESSAGES.AIRLINE_LABEL} value={airport.airline} />
          <RecordRow label={RESERVATION_MESSAGES.FLIGHT_LABEL} value={airport.flightNumber} />
          {pickup ? <RecordRow label={RESERVATION_MESSAGES.PICKUP_OPTION_LABEL} value={option ?? ''} /> : null}
        </>
      ) : place.kind === 'landmark' ? (
        <RecordRow label="Landmark" value={place.landmarkName} />
      ) : (
        <RecordRow label="St.# and Name" value={[place.streetNumber, place.streetName].filter(Boolean).join(' ')} />
      )}
      <RecordRow label="Cross Street1" value={place.crossStreet} />
      <RecordRow label="Cross Street2" value={stop.crossStreet2} />
      <RecordRow label="Pickup Point" value={place.pickupPoint || (pickup ? RESERVATION_INFO_MESSAGES.AS_DIRECTED : '')} />
      {stop.directions ? <RecordRow label="Directions" value={stop.directions} /> : null}
    </InfoList>
  );
}

/** Stands in for the destination pane on an as-directed ride. */
function AsDirected() {
  return (
    <View style={styles.asDirected}>
      <Text style={styles.asDirectedTitle}>{RESERVATION_INFO_MESSAGES.AS_DIRECTED}</Text>
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
        {filled ? value : RESERVATION_INFO_MESSAGES.NOT_ISSUED}
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
  state: { paddingVertical: space.xxl, alignItems: 'center' },
  back: { alignSelf: 'flex-start' },

  refs: { gap: space.sm },
  refsWide: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.lg },
  reference: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  referenceLabel: { color: colors.textBody, fontSize: 14, fontWeight: '700' },
  referenceValue: { color: colors.textTitle, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  referenceEmpty: { color: colors.textDisabled, fontWeight: '400', letterSpacing: 0 },

  account: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space.sm },
  accountValue: { color: colors.textStrong, fontSize: 14, fontWeight: '600' },
  accountVip: { color: colors.textMuted, fontSize: 13 },

  asDirected: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  asDirectedTitle: { color: colors.textStrong, fontSize: 15, fontWeight: '700' },

  email: { color: colors.textLink, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  emailPressed: { color: colors.textLinkHover },
  emailEmpty: { color: colors.textDisabled, fontSize: 14 },

  body: { color: colors.textBody, fontSize: 14, lineHeight: 20 },

  actions: { gap: space.md, marginTop: space.xs, flexWrap: 'wrap' },
  actionsWide: { flexDirection: 'row', justifyContent: 'center' },
});
