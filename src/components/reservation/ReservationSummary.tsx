import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BillingMethodValue } from '@/components/reservation/BillingMethodSection';
import type { PassengerRideInfoValue } from '@/components/reservation/PassengerRideInfoSection';
import type { PreferencesValue } from '@/components/reservation/PreferencesSection';
import type { RideAddressInfoValue } from '@/components/reservation/RideAddressInfoSection';
import { findCarType } from '@/components/reservation/carTypes';
import { RESERVATION_SECTIONS, sectionIndex } from '@/components/reservation/sections';
import {
  addressLine,
  BILLING_LABELS,
  EMPTY,
  formatCard,
  formatPhone,
  orEmpty,
} from '@/components/reservation/summaryFormat';
import { colors, radii, shadowValues, space } from '@/theme';
import { formatFullDate, formatTime } from '@/utils/datetime';

export type ReservationSummaryProps = {
  info: PassengerRideInfoValue;
  addresses: RideAddressInfoValue;
  billing: BillingMethodValue;
  preferences: PreferencesValue;
  reservationNumber: string;
  /** 0-based index of the step being filled in — its group is highlighted. */
  activeIndex: number;
  /** Jump back to an already-reached step from its group heading. */
  onSelect?: (index: number) => void;
};

type Row = { label: string; value: string };

/**
 * Read-only digest of everything the form sections have collected so far.
 *
 * It reads the same state the sections write, so it needs no changes inside the
 * section components themselves.
 */
export function ReservationSummary({
  info,
  addresses,
  billing,
  preferences,
  reservationNumber,
  activeIndex,
  onSelect,
}: ReservationSummaryProps) {
  const car = findCarType(preferences.carType);
  const name = `${info.firstName} ${info.lastName}`.trim();

  const group = (id: Parameters<typeof sectionIndex>[0], rows: Row[]) => {
    const index = sectionIndex(id);
    return { index, title: RESERVATION_SECTIONS[index].title, rows };
  };

  // The confirmation step has no answers of its own — it reads these back.
  const groups: { index: number; title: string; rows: Row[] }[] = [
    group('passenger', [
      { label: 'Passenger', value: name || EMPTY },
      ...(info.isLive
        ? [
            { label: 'Pickup', value: 'Live call — ready now' },
            { label: 'Est. pickup', value: `Today, ${formatTime(info.estimatedTime)}` },
          ]
        : [
            { label: 'Date', value: formatFullDate(info.date) },
            { label: 'Time', value: formatTime(info.time) },
          ]),
    ]),
    group('address', [
      { label: 'Pickup from', value: addressLine(addresses.pickup, addresses.pickupNotes) },
      {
        label: 'Drop off at',
        value: addressLine(addresses.destination, addresses.destinationNotes),
      },
    ]),
    group('billing', [
      { label: 'Method', value: BILLING_LABELS[billing.method] },
      ...(billing.method === 'corporate' || billing.method === 'corporate-card'
        ? [{ label: 'Account', value: orEmpty(billing.accountNumber) }]
        : []),
      ...(billing.method === 'card' || billing.method === 'corporate-card'
        ? [{ label: 'Card', value: formatCard(billing.card.number) }]
        : []),
      ...(billing.vipNumber.trim() ? [{ label: 'VIP', value: billing.vipNumber.trim() }] : []),
    ]),
    group('preferences', [
      { label: 'Vehicle', value: car.label },
      { label: 'Passengers', value: String(preferences.passengers) },
      { label: 'Extra stops', value: String(preferences.stops) },
      { label: 'Email', value: orEmpty(preferences.email) },
      ...(preferences.confirmByPhone
        ? [{ label: 'Confirm by phone', value: formatPhone(preferences.callbackUs) }]
        : []),
    ]),
    group('receipt', [{ label: 'Reservation #', value: reservationNumber }]),
  ];

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Summary</Text>

      {groups.map((group) => {
        const active = group.index === activeIndex;
        const reachable = group.index < activeIndex;

        return (
          <View key={group.title} style={[styles.group, active ? styles.groupActive : null]}>
            <Pressable
              accessibilityRole={reachable ? 'button' : undefined}
              accessibilityLabel={reachable ? `Go to ${group.title}` : undefined}
              disabled={!reachable || !onSelect}
              onPress={() => onSelect?.(group.index)}
            >
              <Text style={[styles.groupTitle, active ? styles.groupTitleActive : null]}>
                {group.index + 1}. {group.title}
              </Text>
            </Pressable>

            {group.rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue} numberOfLines={3}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.lg,
    gap: space.md,
    boxShadow: shadowValues.sm,
  },
  heading: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  group: {
    gap: space.xs,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
  },
  groupActive: { backgroundColor: colors.surfaceSelected },
  groupTitle: {
    color: colors.textBody,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  groupTitleActive: { color: colors.primary[600] },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  rowLabel: { color: colors.textMuted, fontSize: 12, width: 92 },
  rowValue: { flex: 1, color: colors.textHeading, fontSize: 12, fontWeight: '600' },
});
