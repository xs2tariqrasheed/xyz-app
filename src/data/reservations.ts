/**
 * The reservation list model.
 *
 * There is no reservations API yet, so {@link buildSampleReservations} stands
 * in for one. Everything else here is pure — sorting, filtering and searching
 * are the same on web, iOS and Android, and stay testable without a network.
 */

import { addDays, startOfDay } from '@/utils/datetime';

export type ReservationStatus = 'open' | 'in-progress' | 'completed' | 'cancelled';

export type Reservation = {
  /** Ride number — the customer-facing identifier, e.g. "W6081210500". */
  id: string;
  passengerName: string;
  /** Local pickup date *and* time; the list splits it across two lines. */
  pickupAt: Date;
  pickupLocation: string;
  destination: string;
  status: ReservationStatus;
  /** A voucher only exists once the ride is confirmed. */
  hasVoucher: boolean;
  /** Why the ride was called off. Only ever set on a cancelled reservation. */
  cancellationReason?: string;
};

/** Statuses a customer can still act on — these sort to the top of the list. */
const ACTIVE_STATUSES: readonly ReservationStatus[] = ['open', 'in-progress'];

export function isActive(reservation: Reservation): boolean {
  return ACTIVE_STATUSES.includes(reservation.status);
}

/** Only an active reservation can be edited or called off. */
export function isEditable(reservation: Reservation): boolean {
  return reservation.status === 'open';
}

export function isCancellable(reservation: Reservation): boolean {
  return isActive(reservation);
}

/**
 * Calls a ride off, with the reason the customer gave.
 *
 * Returns a new list — the reason is required, so a cancelled reservation can
 * always say why, both here and in whatever the API eventually stores.
 */
export function cancelReservation(
  reservations: readonly Reservation[],
  id: string,
  reason: string,
): Reservation[] {
  return reservations.map((item) =>
    item.id === id ? { ...item, status: 'cancelled', cancellationReason: reason } : item,
  );
}

/* ---------------------------------------------------------------- filters */

export type ReservationFilterId = 'all' | 'open' | 'completed' | 'cancelled';

export type ReservationFilter = {
  id: ReservationFilterId;
  label: string;
  /** `null` matches every status. */
  statuses: readonly ReservationStatus[] | null;
};

export const RESERVATION_FILTERS: readonly ReservationFilter[] = [
  { id: 'open', label: 'Open', statuses: ACTIVE_STATUSES },
  { id: 'completed', label: 'Completed', statuses: ['completed'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
  { id: 'all', label: 'All', statuses: null },
];

function matchesFilter(reservation: Reservation, filter: ReservationFilter): boolean {
  return filter.statuses === null || filter.statuses.includes(reservation.status);
}

/** Ride number, passenger and both addresses are all searchable. */
function matchesQuery(reservation: Reservation, query: string): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [
    reservation.id,
    reservation.passengerName,
    reservation.pickupLocation,
    reservation.destination,
  ].some((field) => field.toLowerCase().includes(needle));
}

/**
 * Upcoming rides first, soonest at the top, then finished ones most-recent
 * first — the order a customer scans when looking for "what's next".
 */
function byRelevance(a: Reservation, b: Reservation): number {
  const activeA = isActive(a);
  if (activeA !== isActive(b)) return activeA ? -1 : 1;
  const delta = a.pickupAt.getTime() - b.pickupAt.getTime();
  return activeA ? delta : -delta;
}

export function selectReservations(
  reservations: readonly Reservation[],
  filter: ReservationFilter,
  query: string,
): Reservation[] {
  return reservations
    .filter((item) => matchesFilter(item, filter) && matchesQuery(item, query))
    .sort(byRelevance);
}

/** How many rides each tab would show, so the tabs can carry counts. */
export function countByFilter(
  reservations: readonly Reservation[],
): Record<ReservationFilterId, number> {
  const counts = { all: 0, open: 0, completed: 0, cancelled: 0 };

  for (const filter of RESERVATION_FILTERS) {
    counts[filter.id] = reservations.filter((item) => matchesFilter(item, filter)).length;
  }

  return counts;
}

/* ----------------------------------------------------------- sample data */

/** Pickup instant, `days` away from `today` at a wall-clock time. */
function pickupAt(today: Date, days: number, hour: number, minute: number): Date {
  const date = addDays(startOfDay(today), days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * Stand-in for `GET /reservations`.
 *
 * Dates are relative to `today` so the list always has genuinely upcoming and
 * genuinely past rides in it, whenever the app is opened.
 */
export function buildSampleReservations(today: Date): Reservation[] {
  return [
    {
      id: 'W6081210500',
      passengerName: 'Amara Okafor',
      pickupAt: pickupAt(today, 41, 2, 0),
      pickupLocation: 'West 34th Street, New York, NY',
      destination: 'West Street, New York, NY',
      status: 'open',
      hasVoucher: true,
    },
    {
      id: 'W6079940213',
      passengerName: 'Daniel Whitfield',
      pickupAt: pickupAt(today, 2, 7, 15),
      pickupLocation: 'JFK Airport — Terminal 4, Queens, NY',
      destination: '432 Park Avenue, New York, NY',
      status: 'open',
      hasVoucher: true,
    },
    {
      id: 'W6079880191',
      passengerName: 'Priya Raman',
      pickupAt: pickupAt(today, 0, 18, 45),
      pickupLocation: '1 Wall Street, New York, NY',
      destination: 'LaGuardia Airport — Terminal B, Queens, NY',
      status: 'in-progress',
      hasVoucher: true,
    },
    {
      id: 'W6079510088',
      passengerName: 'Marcus Lee',
      pickupAt: pickupAt(today, 9, 11, 30),
      pickupLocation: 'Grand Central Terminal, New York, NY',
      destination: 'Newark Liberty Intl — Terminal C, Newark, NJ',
      status: 'open',
      hasVoucher: false,
    },
    {
      id: 'W6078220017',
      passengerName: 'Amara Okafor',
      pickupAt: pickupAt(today, -3, 8, 0),
      pickupLocation: '350 5th Avenue, New York, NY',
      destination: 'Brooklyn Navy Yard, Brooklyn, NY',
      status: 'completed',
      hasVoucher: true,
    },
    {
      id: 'W6077991002',
      passengerName: 'Sofia Alvarez',
      pickupAt: pickupAt(today, -8, 21, 20),
      pickupLocation: 'Barclays Center, Brooklyn, NY',
      destination: '75 Park Place, New York, NY',
      status: 'completed',
      hasVoucher: true,
    },
    {
      id: 'W6077640955',
      passengerName: 'Daniel Whitfield',
      pickupAt: pickupAt(today, -12, 5, 5),
      pickupLocation: 'Hoboken Terminal, Hoboken, NJ',
      destination: 'JFK Airport — Terminal 8, Queens, NY',
      status: 'cancelled',
      hasVoucher: false,
      cancellationReason: 'Flight was rescheduled to the following week.',
    },
    {
      id: 'W6076980440',
      passengerName: 'Grace Nwosu',
      pickupAt: pickupAt(today, -20, 15, 40),
      pickupLocation: 'Columbia University, New York, NY',
      destination: 'Yankee Stadium, Bronx, NY',
      status: 'completed',
      hasVoucher: true,
    },
  ];
}
