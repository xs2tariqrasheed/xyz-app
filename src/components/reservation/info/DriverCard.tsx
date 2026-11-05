import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { InfoCard } from '@/components/reservation/info/InfoCard';
import { InfoColumns, InfoList, RecordRow } from '@/components/reservation/info/InfoRow';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RESERVATION_INFO_MESSAGES } from '@/constants/messages';
import { useFetchData } from '@/hooks/useFetchData';
import type { ReservationRecord } from '@/services/reservation';
import { carJData, toCarInfo } from '@/services/tracking';
import { colors } from '@/theme';

/**
 * The car and driver: the record's own fields, completed by `PROF.S.CAR_INFO`
 * when a car is assigned. On Details and Track your route.
 */
export function DriverCard({ record, carTypeLabel }: { record: ReservationRecord; carTypeLabel: string }) {
  const carNumber = record.driver.carNumber.trim();
  return (
    <InfoCard title={RESERVATION_INFO_MESSAGES.DRIVER_TITLE}>
      {carNumber ? (
        <CarInfo key={carNumber} record={record} carNumber={carNumber} carTypeLabel={carTypeLabel} />
      ) : (
        <Text style={styles.muted}>{RESERVATION_INFO_MESSAGES.DRIVER_PENDING}</Text>
      )}
    </InfoCard>
  );
}

function CarInfo({ record, carNumber, carTypeLabel }: { record: ReservationRecord; carNumber: string; carTypeLabel: string }) {
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
          <RecordRow label="Car Number" value={carNumber} />
          <RecordRow label="Car Color" value={info?.carColor || driver.carColor} />
          <RecordRow label="Car Model" value={info?.carModel || driver.carModel} />
        </InfoList>
      }
      right={
        <InfoList>
          <RecordRow label="Driver Name" value={info?.driverName || driver.driverName} />
          <RecordRow label="Driver Number" value={info?.driverNumber || driver.driverNumber} />
          <RecordRow label="Car Type" value={info?.carType || carTypeLabel} />
        </InfoList>
      }
    />
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
});
