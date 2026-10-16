import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { InfoCard, SplitInfoCard } from '@/components/reservation/info/InfoCard';
import { InfoColumns, InfoList, InfoRow } from '@/components/reservation/info/InfoRow';
import { CancelReservationSheet } from '@/components/rides/CancelReservationSheet';
import { RideQuestionSheet } from '@/components/rides/RideQuestionSheet';
import { RideStatusBadge } from '@/components/rides/RideStatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RESERVATION_INFO_MESSAGES, RESERVATION_MESSAGES, RIDES_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useFetchData } from '@/hooks/useFetchData';
import { actionErrorMessage, useOpenReservation } from '@/hooks/useReservationActions';
import { getErrorDisplay } from '@/services/gateway';
import { placeLocalityLine } from '@/services/places';
import {
  AIRPORT_PICKUP_OPTIONS,
  columnReadJData,
  communicationLogJData,
  loadReservationJData,
  type RecordStop,
  type ReservationRecord,
  RESERVATION_COLUMN_IDS,
  toCommunicationLog,
  toReservationRecord,
  toSingleColumnValue,
} from '@/services/reservation';
import { PAYMENT_METHOD_LABELS } from '@/services/rides';
import { carJData, toCarInfo } from '@/services/tracking';
import { breakpoints, colors, radii, space } from '@/theme';
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

  const { data, isLoading, isError, error, refetch } = useFetchData(
    ACTION_CODES.LOAD_RESERVATION,
    GATEWAY_VIEW_NAME,
    loadReservationJData(loginId, reservationNumber),
  );
  const loaded = useMemo((): { record: ReservationRecord | null; failure: string | null } => {
    if (!data) return { record: null, failure: null };
    try {
      return { record: toReservationRecord(data), failure: null };
    } catch (failure) {
      return { record: null, failure: actionErrorMessage(failure) };
    }
  }, [data]);

  if (isLoading && !data) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.primary[600]} />
      </View>
    );
  }

  if (isError || loaded.failure || !loaded.record) {
    const message = loaded.failure ?? (isError ? getErrorDisplay(error).customDescription : RIDES_MESSAGES.LOAD_RESERVATION_FAILED);
    return (
      <>
        <Alert tone="danger" title={RESERVATION_INFO_MESSAGES.LOAD_FAILED_TITLE} message={message} />
        <View style={[styles.actions, roomy ? styles.actionsWide : null]}>
          <Button label={RESERVATION_INFO_MESSAGES.BACK} variant="outline" onPress={onBack} />
          <Button label={RESERVATION_INFO_MESSAGES.RETRY} onPress={refetch} />
        </View>
      </>
    );
  }

  const record = loaded.record;
  const cancelled = record.status === 'canceled';
  const upcoming = record.status === 'confirmed' && (record.rideAt?.getTime() ?? 0) > now.getTime();
  const finished = record.status === 'completed';
  const trackable = record.status === 'in-progress' || finished || record.driver.carNumber.length > 0;
  const hasVoucher = finished || record.voucherNumber.length > 0;
  const editSection = upcoming ? () => void opener.open(record.reservationNumber, 'edit') : undefined;
  const { preferences, billing } = record;

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
              <InfoRow label="First Name" value={record.firstName} />
              <InfoRow label="Last Name" value={record.lastName} />
              <InfoRow label="Ride Date" value={record.rideAt ? formatSlashDate(record.rideAt) : ''} />
              <InfoRow label="Ride Time" value={record.rideAt ? formatClockTime(record.rideAt) : ''} />
            </InfoList>
          }
          right={
            <InfoList>
              <InfoRow label="Originate Date" value={record.originateAt ? formatSlashDate(record.originateAt) : ''} />
              <InfoRow label="Originate Time" value={record.originateAt ? formatClockTime(record.originateAt) : ''} />
              <InfoRow label="Operator Name" value={record.operatorName} />
              <InfoRow label="Status" value={record.statusLabel} />
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
              <InfoRow label="Voucher Number" value={billing.voucherNumber} />
              <InfoRow label="Invoice Number" value={billing.invoiceNumber} />
              <InfoRow label="Approval Date" value={billing.approvalDate} />
              <InfoRow label="Transaction Date" value={billing.transactionDate} />
              <InfoRow label="Transaction Amt" value={billing.transactionAmount} />
            </InfoList>
          }
          right={
            <InfoList>
              <InfoRow
                label="Payment Method"
                value={billing.paymentLabel || PAYMENT_METHOD_LABELS[billing.paymentMethod]}
              />
              {billing.accountNumber ? (
                <InfoRow label="Account #">
                  <View style={styles.account}>
                    <Text style={styles.accountValue}>{billing.accountNumber}</Text>
                    {billing.vipNumber ? <Text style={styles.accountVip}>VIP # : {billing.vipNumber}</Text> : null}
                  </View>
                </InfoRow>
              ) : null}
              {billing.cardMasked ? (
                <InfoRow label="Card" value={[billing.cardType, `•••• ${billing.cardMasked.slice(-4)}`].filter(Boolean).join(' ')} />
              ) : null}
            </InfoList>
          }
        />
      </InfoCard>

      <DriverCard record={record} />

      <InfoCard title="Preferences" onEdit={editSection}>
        <InfoColumns
          left={
            <InfoList>
              <InfoRow label="Car Type" value={preferences.carType} />
              <InfoRow
                label="Callback Phone (US)"
                value={preferences.phoneUs ? withExt(formatUsPhone(preferences.phoneUs), preferences.phoneUsExt) : ''}
              />
              <InfoRow
                label="International Phone"
                value={preferences.phoneIntl ? withExt(formatIntlPhone(preferences.phoneIntl), preferences.phoneIntlExt) : ''}
              />
              <InfoRow label="Email">
                <EmailLink address={preferences.email} />
              </InfoRow>
              <ExtraContact reservationNumber={record.reservationNumber} />
            </InfoList>
          }
          right={
            <InfoList>
              <InfoRow label="Confirmation By" value={preferences.confirmByPhone ? 'Phone' : 'Email'} />
              <InfoRow label="No. of Passengers" value={preferences.passengers} />
              <InfoRow label="No. of Stops" value={preferences.stops} />
              {preferences.ridePurpose ? (
                <InfoRow label={RESERVATION_MESSAGES.RIDE_PURPOSE_LABEL} value={preferences.ridePurpose} />
              ) : null}
            </InfoList>
          }
        />
      </InfoCard>

      {record.charges.length > 0 ? (
        <InfoCard title={RESERVATION_INFO_MESSAGES.CHARGES_TITLE}>
          <InfoList>
            {record.charges.map((charge) => (
              <InfoRow key={charge.label} label={charge.label} value={charge.amount} />
            ))}
          </InfoList>
        </InfoCard>
      ) : null}

      {cancelled && record.cancelReason ? (
        <InfoCard title={RESERVATION_INFO_MESSAGES.CANCEL_REASON}>
          <Text style={styles.body}>{record.cancelReason}</Text>
        </InfoCard>
      ) : null}

      <MessagesCard loginId={loginId} reservationNumber={record.reservationNumber} />

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
            onPress={() =>
              router.push({
                pathname: '/track-ride',
                params: { rideno: record.reservationNumber, car: record.driver.carNumber },
              })
            }
          />
        ) : null}
        {hasVoucher ? (
          <Button
            label={RESERVATION_INFO_MESSAGES.VOUCHER}
            variant="outline"
            onPress={() => router.push({ pathname: '/voucher', params: { rideno: record.reservationNumber } })}
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
        <Button label={RESERVATION_INFO_MESSAGES.ASK} variant="outline" onPress={() => setAsking(true)} />
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

/** The car and driver: the record's own fields, completed by `PROF.S.CAR_INFO` when a car is assigned. */
function DriverCard({ record }: { record: ReservationRecord }) {
  return (
    <InfoCard title={RESERVATION_INFO_MESSAGES.DRIVER_TITLE}>
      {record.driver.carNumber ? (
        <CarInfo record={record} carNumber={record.driver.carNumber} />
      ) : (
        <Text style={styles.muted}>{RESERVATION_INFO_MESSAGES.DRIVER_PENDING}</Text>
      )}
    </InfoCard>
  );
}

function CarInfo({ record, carNumber }: { record: ReservationRecord; carNumber: string }) {
  const { data } = useFetchData(ACTION_CODES.CAR_INFO, GATEWAY_VIEW_NAME, carJData(carNumber));
  const info = useMemo(() => {
    if (!data) return null;
    try {
      return toCarInfo(data);
    } catch {
      return null;
    }
  }, [data]);
  const { driver } = record;

  return (
    <InfoColumns
      left={
        <InfoList>
          <InfoRow label="Car Number" value={carNumber} />
          <InfoRow label="Car Color" value={info?.carColor || driver.carColor} />
          <InfoRow label="Car Model" value={info?.carModel || driver.carModel} />
        </InfoList>
      }
      right={
        <InfoList>
          <InfoRow label="Driver Name" value={info?.driverName || driver.driverName} />
          <InfoRow label="Driver Number" value={info?.driverNumber || driver.driverNumber} />
          <InfoRow label="Car Type" value={info?.carType || record.preferences.carType} />
        </InfoList>
      }
    />
  );
}

/** The Email CC / extra contact stored on the reservation, when there is one. */
function ExtraContact({ reservationNumber }: { reservationNumber: string }) {
  const { data } = useFetchData(
    ACTION_CODES.LOAD_RESERVATION_COLUMN_SINGLE_VALUE,
    GATEWAY_VIEW_NAME,
    columnReadJData(reservationNumber, RESERVATION_COLUMN_IDS.emailCc),
  );
  const value = data ? toSingleColumnValue(data) : '';
  return value ? <InfoRow label={RESERVATION_INFO_MESSAGES.EXTRA_CONTACT} value={value} /> : null;
}

function MessagesCard({ loginId, reservationNumber }: { loginId: string; reservationNumber: string }) {
  const { data, isLoading } = useFetchData(
    ACTION_CODES.COMMUNICATION_LOG,
    GATEWAY_VIEW_NAME,
    communicationLogJData(loginId, reservationNumber),
  );
  const entries = useMemo(() => {
    if (!data) return [];
    try {
      return toCommunicationLog(data);
    } catch {
      return [];
    }
  }, [data]);

  return (
    <InfoCard title={RESERVATION_INFO_MESSAGES.MESSAGES_TITLE}>
      {isLoading && !data ? (
        <ActivityIndicator color={colors.primary[600]} />
      ) : entries.length === 0 ? (
        <Text style={styles.muted}>{RESERVATION_INFO_MESSAGES.MESSAGES_EMPTY}</Text>
      ) : (
        <View style={styles.messages}>
          {entries.map((entry) => (
            <View key={entry.id} style={styles.message}>
              <Text style={styles.messageMeta}>
                {[entry.at ? `${formatSlashDate(entry.at)} ${formatClockTime(entry.at)}` : '', entry.channel]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.body}>{entry.text}</Text>
            </View>
          ))}
        </View>
      )}
    </InfoCard>
  );
}

/** One end of the ride. Blank lines stay visible so the shape never shifts. */
function StopPane({ stop, pickup }: { stop: RecordStop; pickup?: boolean }) {
  const { place, airport } = stop;
  const option = AIRPORT_PICKUP_OPTIONS.find((item) => item.value === airport.pickupOption)?.label;
  return (
    <InfoList>
      <InfoRow label="City, State" value={placeLocalityLine(place)} />
      {place.kind === 'airport' ? (
        <>
          <InfoRow label="Airport" value={place.airportName} />
          <InfoRow label={RESERVATION_MESSAGES.AIRLINE_LABEL} value={airport.airline} />
          <InfoRow label={RESERVATION_MESSAGES.FLIGHT_LABEL} value={airport.flightNumber} />
          {pickup ? <InfoRow label={RESERVATION_MESSAGES.PICKUP_OPTION_LABEL} value={option ?? ''} /> : null}
        </>
      ) : place.kind === 'landmark' ? (
        <InfoRow label="Landmark" value={place.landmarkName} />
      ) : (
        <InfoRow label="St.# and Name" value={[place.streetNumber, place.streetName].filter(Boolean).join(' ')} />
      )}
      <InfoRow label="Cross Street1" value={place.crossStreet} />
      <InfoRow label="Cross Street2" value={stop.crossStreet2} />
      <InfoRow label="Pickup Point" value={place.pickupPoint || (pickup ? RESERVATION_INFO_MESSAGES.AS_DIRECTED : '')} />
      {stop.directions ? <InfoRow label="Directions" value={stop.directions} /> : null}
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
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  messages: { gap: space.md },
  message: {
    gap: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[200],
    paddingLeft: space.md,
    borderRadius: radii.sm,
  },
  messageMeta: { color: colors.textMuted, fontSize: 12 },

  actions: { gap: space.md, marginTop: space.xs, flexWrap: 'wrap' },
  actionsWide: { flexDirection: 'row', justifyContent: 'center' },
});
