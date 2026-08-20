import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { CancelReservationDialog } from '@/components/reservations/CancelReservationDialog';
import type { ReservationHandlers } from '@/components/reservations/ReservationActions';
import { ReservationCard } from '@/components/reservations/ReservationCard';
import { ReservationFilterTabs } from '@/components/reservations/ReservationFilterTabs';
import { ReservationsEmpty } from '@/components/reservations/ReservationsEmpty';
import { ReservationTable } from '@/components/reservations/ReservationTable';
import { TextField } from '@/components/ui/TextField';
import {
  buildSampleReservations,
  cancelReservation,
  countByFilter,
  RESERVATION_FILTERS,
  selectReservations,
  type Reservation,
  type ReservationFilterId,
} from '@/data/reservations';
import { breakpoints, colors, formMaxWidth, space } from '@/theme';

export default function ReservationsScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();

  // One "now" for the whole screen, so every relative caption agrees.
  const [today] = useState(() => new Date());
  const [reservations, setReservations] = useState<Reservation[]>(() =>
    buildSampleReservations(today),
  );
  const [filterId, setFilterId] = useState<ReservationFilterId>('open');
  const [query, setQuery] = useState('');
  // The ride the confirmation dialog is currently asking about.
  const [pendingCancel, setPendingCancel] = useState<Reservation | null>(null);

  // A table needs room for seven columns; anything narrower reads as cards.
  // The same width is what lets the search box and the tabs share a row.
  const asTable = width >= breakpoints.lg;

  // The cards keep a readable line length, so the controls above them line up
  // with the card column instead of spanning the whole page.
  const column = asTable ? null : styles.column;

  const filter = RESERVATION_FILTERS.find((item) => item.id === filterId) ?? RESERVATION_FILTERS[0];
  const counts = countByFilter(reservations);
  const visible = selectReservations(reservations, filter, query);

  // Update and rebook both land on the reservation form, and a voucher is
  // paperwork — it belongs with the receipts. Nothing here is a dead end.
  const handlers: ReservationHandlers = {
    onUpdate: () => router.navigate('/reserve'),
    onRebook: () => router.navigate('/reserve'),
    onPrintVoucher: () => router.navigate('/receipts'),
    onCancel: (reservation) => setPendingCancel(reservation),
  };

  const confirmCancel = (reservation: Reservation, reason: string) => {
    setReservations((current) => cancelReservation(current, reservation.id, reason));
    setPendingCancel(null);
  };

  return (
    <Screen
      title="My Reservations"
      subtitle="Every ride you have booked. Open one by its ride number to update or cancel it."
    >
      <View style={[styles.controls, asTable ? styles.controlsWide : null, column]}>
        <TextField
          label="Search"
          style={[styles.search, asTable ? styles.searchWide : null]}
          value={query}
          onChangeText={setQuery}
          placeholder="Ride number, passenger or address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          inputMode="search"
        />
        <ReservationFilterTabs value={filterId} onChange={setFilterId} counts={counts} />
      </View>

      <Text style={[styles.summary, column]}>
        {visible.length === counts.all
          ? `${counts.all} reservations`
          : `Showing ${visible.length} of ${counts.all} reservations`}
      </Text>

      {visible.length === 0 ? (
        <View style={column}>
          <ReservationsEmpty
            searching={query.trim().length > 0}
            onClearSearch={() => setQuery('')}
            onBook={() => router.navigate('/reserve')}
          />
        </View>
      ) : asTable ? (
        <ReservationTable reservations={visible} handlers={handlers} today={today} />
      ) : (
        <View style={[styles.cards, column]}>
          {visible.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              handlers={handlers}
              today={today}
            />
          ))}
        </View>
      )}

      <CancelReservationDialog
        reservation={pendingCancel}
        onClose={() => setPendingCancel(null)}
        onConfirm={confirmCancel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { gap: space.md },
  controlsWide: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  search: { width: '100%' },
  searchWide: { width: 300 },

  summary: { color: colors.textMuted, fontSize: 13, marginTop: -space.xs },

  column: { width: '100%', maxWidth: formMaxWidth, alignSelf: 'center' },
  cards: { gap: space.md },
});
