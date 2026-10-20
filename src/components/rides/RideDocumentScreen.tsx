import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { RideDocumentView } from '@/components/rides/RideDocumentView';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { RESERVATION_INFO_MESSAGES } from '@/constants/messages';
import { useReservationRecord } from '@/hooks/useReservationRecord';
import type { ReservationRecord } from '@/services/reservation';
import type { RideDocument } from '@/services/rideDocument';
import { colors, space } from '@/theme';

export type RideDocumentScreenProps = {
  title: string;
  printLabel: string;
  /** Whether the record has this paper yet. */
  isAvailable: (record: ReservationRecord) => boolean;
  /** Shown instead of the paper while it is not available. */
  unavailableMessage: string;
  toDocument: (record: ReservationRecord) => RideDocument;
};

/**
 * The voucher and receipt screens (guide 23): `?rideno=` → the reservation
 * record → the paper, with the usual loading, error and retry states.
 */
export function RideDocumentScreen({ title, ...documentProps }: RideDocumentScreenProps) {
  const { rideno } = useLocalSearchParams<{ rideno?: string }>();
  const reservationNumber = typeof rideno === 'string' ? rideno.trim() : '';
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/rides');
  };

  return (
    <Screen title={title}>
      <Stack.Screen options={{ title }} />
      {reservationNumber ? (
        <LoadedDocument key={reservationNumber} reservationNumber={reservationNumber} {...documentProps} />
      ) : (
        <Alert tone="info" message={RESERVATION_INFO_MESSAGES.NOT_FOUND} />
      )}
      <Button label={RESERVATION_INFO_MESSAGES.BACK} variant="outline" onPress={goBack} style={styles.back} />
    </Screen>
  );
}

function LoadedDocument({
  reservationNumber,
  printLabel,
  isAvailable,
  unavailableMessage,
  toDocument,
}: Omit<RideDocumentScreenProps, 'title'> & { reservationNumber: string }) {
  const { record, failureMessage, isLoading, refetch } = useReservationRecord(reservationNumber);

  if (isLoading) return <ActivityIndicator color={colors.primary[600]} />;

  if (failureMessage || !record) {
    return (
      <View style={styles.state}>
        <Alert tone="danger" title={RESERVATION_INFO_MESSAGES.LOAD_FAILED_TITLE} message={failureMessage ?? ''} />
        <Button label={RESERVATION_INFO_MESSAGES.RETRY} onPress={refetch} style={styles.back} />
      </View>
    );
  }

  if (!isAvailable(record)) return <Alert tone="info" message={unavailableMessage} />;

  return <RideDocumentView doc={toDocument(record)} printLabel={printLabel} />;
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start' },
  state: { gap: space.md },
});
