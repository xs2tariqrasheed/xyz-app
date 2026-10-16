import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { SUPPORT_PHONE } from '@/components/reservation/RideReceiptSection';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RESERVATION_INFO_MESSAGES, RIDES_MESSAGES, VOUCHER_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useFetchData } from '@/hooks/useFetchData';
import { actionErrorMessage } from '@/hooks/useReservationActions';
import { getErrorDisplay } from '@/services/gateway';
import { placeLocalityLine, placeStreetLine } from '@/services/places';
import {
  loadReservationJData,
  type RecordStop,
  type ReservationRecord,
  toReservationRecord,
} from '@/services/reservation';
import { colors, radii, space } from '@/theme';
import { formatClockTime, formatSlashDate } from '@/utils/datetime';

/**
 * The trip voucher of a billed ride (reverse-engineer-guide/23), drawn from
 * the reservation record itself (`RES.S.LOAD_RESERVATION`). The old site
 * fetched an image from an internal server the browser could not reach
 * (00-README §5 #6); nothing here leaves the gateway.
 */
export default function VoucherScreen() {
  const { rideno } = useLocalSearchParams<{ rideno?: string }>();
  const reservationNumber = typeof rideno === 'string' ? rideno.trim() : '';
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/rides');
  };

  return (
    <Screen title={VOUCHER_MESSAGES.SCREEN_TITLE}>
      <Stack.Screen options={{ title: VOUCHER_MESSAGES.SCREEN_TITLE }} />
      {reservationNumber ? (
        <Voucher reservationNumber={reservationNumber} />
      ) : (
        <Alert tone="info" message={RESERVATION_INFO_MESSAGES.NOT_FOUND} />
      )}
      <Button label={RESERVATION_INFO_MESSAGES.BACK} variant="outline" onPress={goBack} style={styles.back} />
    </Screen>
  );
}

function Voucher({ reservationNumber }: { reservationNumber: string }) {
  const { session } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useFetchData(
    ACTION_CODES.LOAD_RESERVATION,
    GATEWAY_VIEW_NAME,
    loadReservationJData(session?.loginId ?? '', reservationNumber),
  );
  const loaded = useMemo((): { record: ReservationRecord | null; failure: string | null } => {
    if (!data) return { record: null, failure: null };
    try {
      return { record: toReservationRecord(data), failure: null };
    } catch (failure) {
      return { record: null, failure: actionErrorMessage(failure) };
    }
  }, [data]);

  if (isLoading && !data) return <ActivityIndicator color={colors.primary[600]} />;

  if (isError || loaded.failure || !loaded.record) {
    return (
      <View style={styles.state}>
        <Alert
          tone="danger"
          title={RESERVATION_INFO_MESSAGES.LOAD_FAILED_TITLE}
          message={loaded.failure ?? (isError ? getErrorDisplay(error).customDescription : RIDES_MESSAGES.LOAD_RESERVATION_FAILED)}
        />
        <Button label={RESERVATION_INFO_MESSAGES.RETRY} onPress={refetch} style={styles.back} />
      </View>
    );
  }

  const record = loaded.record;
  if (record.status !== 'completed' && !record.voucherNumber) {
    return <Alert tone="info" message={VOUCHER_MESSAGES.NOT_BILLED} />;
  }

  const print = () => {
    // `print` only exists on web.
    const host = globalThis as { print?: () => void };
    if (Platform.OS === 'web' && typeof host.print === 'function') host.print();
    else setNotice(VOUCHER_MESSAGES.PRINT_WEB_ONLY);
  };

  return (
    <>
      <View style={styles.voucher}>
        <View style={styles.header}>
          <Text style={styles.brand}>XYZ Two Way Radio Service</Text>
          <Text style={styles.headerMeta}>{SUPPORT_PHONE}</Text>
          <Text style={styles.voucherNo}>{record.voucherNumber || RESERVATION_INFO_MESSAGES.NOT_ISSUED}</Text>
        </View>

        <View style={styles.columns}>
          <View style={styles.fields}>
            <Row label="Account No." value={record.billing.accountNumber} />
            <Row label="Job#" value={record.reservationNumber} />
            <Row label="Driver#" value={record.driver.driverNumber} />
            <Row label="Car#" value={record.driver.carNumber} />
            <Row
              label="Scheduled pick-up"
              value={record.rideAt ? `${formatSlashDate(record.rideAt)} ${formatClockTime(record.rideAt)}` : ''}
            />
            <Row label="Passenger" value={`${record.firstName} ${record.lastName}`.trim()} />
            <Row label="From" value={stopLine(record.pickup)} />
            <Row label="To" value={record.destination ? stopLine(record.destination) : RESERVATION_INFO_MESSAGES.AS_DIRECTED} />
            <Row label="Stops" value={String(record.preferences.stops)} />
          </View>

          {record.charges.length > 0 ? (
            <View style={styles.charges}>
              {record.charges.map((charge) => (
                <Row key={charge.label} label={charge.label} value={charge.amount} />
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {notice ? <Alert tone="info" message={notice} /> : null}
      <Button label={VOUCHER_MESSAGES.PRINT} onPress={print} style={styles.back} />
    </>
  );
}

function stopLine(stop: RecordStop): string {
  return [placeStreetLine(stop.place), placeLocalityLine(stop.place)].filter(Boolean).join(', ');
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start' },
  state: { gap: space.md },
  voucher: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    padding: space.lg,
    gap: space.lg,
  },
  header: { gap: 2, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: space.md },
  brand: { color: colors.textTitle, fontSize: 17, fontWeight: '800' },
  headerMeta: { color: colors.textMuted, fontSize: 13 },
  voucherNo: { color: colors.primary[600], fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },
  columns: { gap: space.lg, flexDirection: 'row', flexWrap: 'wrap' },
  fields: { flexGrow: 2, flexBasis: 280, gap: space.sm },
  charges: {
    flexGrow: 1,
    flexBasis: 200,
    gap: space.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: space.md,
  },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'baseline' },
  label: { color: colors.textMuted, fontSize: 13, width: 130 },
  value: { flex: 1, color: colors.textStrong, fontSize: 14, fontWeight: '600' },
});
