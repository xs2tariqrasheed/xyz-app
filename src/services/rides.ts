import { hasRateRideUrl } from '@/config/rateRide';
import { type GatewayJData, type GatewayResponse, mapRowsByHeadings } from '@/services/gateway';
import { isYes, parseGatewayDate } from '@/services/gatewayRows';
import { addDays, endOfDay, pad2, startOfDay } from '@/utils/datetime';

/**
 * Rides on the account: history (`RES.S.ALL_ORDERS`, guide 18), open
 * reservations (`RES.S.UPDATABLE_ORDERS`, guide 19) and the home dashboard
 * built from them. Rows are mapped here, by each code's own headings, so
 * screens never read raw columns (docs/XYZ_INTEGRATION_GUIDE.md §10).
 */

export type RideStatus = 'confirmed' | 'in-progress' | 'completed' | 'canceled';

export const RIDE_STATUS_LABELS: Record<RideStatus, string> = {
  confirmed: 'Confirmed',
  'in-progress': 'In progress',
  completed: 'Completed',
  canceled: 'Canceled',
};

export type PaymentMethod = 'voucher' | 'credit-card' | 'cash' | 'account';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  voucher: 'Voucher',
  'credit-card': 'Credit card',
  cash: 'Cash',
  account: 'Corporate account',
};

/** The filter adds an "everything" option on top of the real methods. */
export type PaymentMethodFilter = PaymentMethod | 'all';

export const PAYMENT_METHOD_FILTERS: readonly {
  value: PaymentMethodFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'credit-card', label: 'Credit card' },
  { value: 'cash', label: 'Cash' },
  { value: 'account', label: 'Corporate account' },
];

export type Ride = {
  /** Ride number, as printed on the receipt, e.g. `W6091020269`. */
  id: string;
  passengerName: string;
  pickupAt: Date;
  /** "As Directed" when the passenger sets the route in the car. */
  pickupLocation: string;
  destination: string;
  status: RideStatus;
  paymentMethod: PaymentMethod;
  voucherNo: string | null;
  feedbackLeft: boolean;
};

export type RideSearchFilters = {
  from: Date;
  to: Date;
  paymentMethod: PaymentMethodFilter;
};

/** A ride can still be changed or called off while it is only booked. */
export function canModifyRide(ride: Ride, now: Date): boolean {
  return ride.status === 'confirmed' && ride.pickupAt.getTime() > now.getTime();
}

/**
 * A finished ride links to the live rate-a-ride form (guide 18's Feedback
 * column), unless the gateway says feedback was already left.
 */
export function canLeaveFeedback(ride: Ride): boolean {
  return ride.status === 'completed' && !ride.feedbackLeft && hasRateRideUrl;
}

/** Questions go to dispatch about a ride that is still open (guide 21), not one that is over. */
export function canAskAboutRide(ride: Ride): boolean {
  return ride.status === 'confirmed' || ride.status === 'in-progress';
}

/** Every completed (billed) ride has a receipt (guide 23). */
export function hasReceipt(ride: Ride): boolean {
  return ride.status === 'completed';
}

/** The rides a receipt can be opened for, in list order. */
export function receiptRides(rides: readonly Ride[]): Ride[] {
  return rides.filter(hasReceipt);
}

/** Sorts by pickup time — ascending for what is coming, descending for history. */
const byPickupAsc = (a: Ride, b: Ride) => a.pickupAt.getTime() - b.pickupAt.getTime();
const byPickupDesc = (a: Ride, b: Ride) => b.pickupAt.getTime() - a.pickupAt.getTime();

/** The home dashboard in one shape: the headline counts and the short lists. */
export type RideOverview = {
  counts: {
    /** Booked, still ahead of now. */
    upcoming: number;
    /** Cars on the road right now. */
    inProgress: number;
    completed: number;
    canceled: number;
    /** Every ride on the account, however it ended. */
    total: number;
  };
  /** Rides running right now, soonest pickup first. */
  active: readonly Ride[];
  /** Booked pickups still to come, soonest first. */
  upcoming: readonly Ride[];
  /** Finished and called-off rides, newest first. */
  past: readonly Ride[];
};

/**
 * Everything the home dashboard needs, bucketed from one ride list.
 *
 * Bucketed here rather than on the screen so the counts and the lists cannot
 * disagree about what "upcoming" means.
 */
export function toRideOverview(rides: readonly Ride[], now: Date): RideOverview {
  const active = rides.filter((ride) => ride.status === 'in-progress').sort(byPickupAsc);
  const upcoming = rides
    .filter((ride) => ride.status === 'confirmed' && ride.pickupAt.getTime() > now.getTime())
    .sort(byPickupAsc);
  const past = rides
    .filter((ride) => ride.status === 'completed' || ride.status === 'canceled')
    .sort(byPickupDesc);

  return {
    counts: {
      upcoming: upcoming.length,
      inProgress: active.length,
      completed: past.filter((ride) => ride.status === 'completed').length,
      canceled: past.filter((ride) => ride.status === 'canceled').length,
      total: rides.length,
    },
    active,
    upcoming,
    past,
  };
}

// ── Gateway ────────────────────────────────────────────────────────────────

/** How many rides one history search asks for (`P_TOTAL_RECORDS`). */
export const HISTORY_PAGE_SIZE = 100;

/** Default history range: the last three months up to today (guide 18). */
export const HISTORY_DEFAULT_DAYS = 90;

/** How far back and ahead a history search may reach (guide 18: three months each way). */
export const HISTORY_REACH_DAYS = 92;

/** `MM-DD-YYYY`, as the backend test client sends `P_DATE_FROM` / `P_DATE_TO`. */
function gatewayDate(date: Date): string {
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}-${date.getFullYear()}`;
}

/** `JData` for {@link ACTION_CODES.ALL_ORDERS}. `P_TOTAL_RECORDS` is a number in the contract. */
export function allOrdersJData(loginId: string, from: Date, to: Date): GatewayJData {
  return {
    P_LOGIN_ID: loginId,
    P_DATE_FROM: gatewayDate(from),
    P_DATE_TO: gatewayDate(to),
    P_TOTAL_RECORDS: HISTORY_PAGE_SIZE,
  };
}

/** `JData` for {@link ACTION_CODES.UPDATABLE_ORDERS}. */
export function updatableOrdersJData(loginId: string): GatewayJData {
  return { P_LOGIN_ID: loginId };
}

/** The headings both order codes send and the app reads (guide §10). */
const RIDE_HEADINGS = [
  'reservation_num',
  'passenger_name',
  'pickup_date',
  'pickup_time',
  'pickup_location',
  'destination',
  'status',
  'payment_method',
] as const;

/** `RES.S.ALL_ORDERS` adds the voucher and feedback headings. */
const ALL_ORDERS_HEADINGS = [...RIDE_HEADINGS, 'voucher_num', 'feedback_left'] as const;

/** `RES.S.UPDATABLE_ORDERS` ends in `car_type, number_of_passengers` instead, which no screen shows. */
const UPDATABLE_ORDERS_HEADINGS = RIDE_HEADINGS;

type RideRow = Record<(typeof RIDE_HEADINGS)[number], string>;
type OrderRow = Record<(typeof ALL_ORDERS_HEADINGS)[number], string>;

/** Status words, as the server spells them, onto the four the app shows. */
export function toRideStatus(value: string): RideStatus {
  const text = value.trim().toLowerCase();
  if (/cancel/.test(text)) return 'canceled';
  if (/progress|dispatch|on.?board|en.?route|in.?car|picked/.test(text)) return 'in-progress';
  if (/complete|billed|closed|done|dropped/.test(text)) return 'completed';
  return 'confirmed';
}

/** Payment words onto the four filterable methods; unknown reads as the account. */
export function toPaymentMethod(value: string): PaymentMethod {
  const text = value.trim().toLowerCase();
  if (/voucher/.test(text) || text === 'v') return 'voucher';
  if (/card|^cc$|^c$|visa|master|amex|discover/.test(text)) return 'credit-card';
  if (/cash/.test(text)) return 'cash';
  return 'account';
}

/**
 * One row as a ride, or `null` when it cannot be listed. Each field is read
 * from its own heading, as paired; today's rows are shifted (`pickup_date`
 * holds a name), so none of them parses into a ride (guide §10).
 */
function toRide(row: RideRow, extra: { voucherNo: string | null; feedbackLeft: boolean }): Ride | null {
  const id = row.reservation_num.trim();
  const pickupAt = parseGatewayDate(row.pickup_date, row.pickup_time);
  // A row with no ride number or no date cannot be listed or opened.
  if (!id || !pickupAt) return null;

  return {
    id,
    passengerName: row.passenger_name.trim(),
    pickupAt,
    pickupLocation: row.pickup_location.trim(),
    destination: row.destination.trim(),
    status: toRideStatus(row.status),
    paymentMethod: toPaymentMethod(row.payment_method),
    ...extra,
  };
}

/** Rides newest first, de-duplicated by ride number. */
function listRides(rides: (Ride | null)[]): Ride[] {
  const seen = new Set<string>();
  return rides
    .filter((ride): ride is Ride => {
      if (!ride || seen.has(ride.id)) return false;
      seen.add(ride.id);
      return true;
    })
    .sort(byPickupDesc);
}

/** `RES.S.ALL_ORDERS` rows → rides. Throws `GatewayError('parsing')` when a heading is missing. */
export function toRides(response: GatewayResponse): Ride[] {
  const rows: OrderRow[] = mapRowsByHeadings(response, ALL_ORDERS_HEADINGS);
  return listRides(
    rows.map((row) =>
      toRide(row, { voucherNo: row.voucher_num.trim() || null, feedbackLeft: isYes(row.feedback_left) }),
    ),
  );
}

/**
 * `RES.S.UPDATABLE_ORDERS` rows → rides. It has no voucher or feedback
 * heading, so those stay empty. Throws like {@link toRides}.
 */
export function toUpdatableRides(response: GatewayResponse): Ride[] {
  const rows: RideRow[] = mapRowsByHeadings(response, UPDATABLE_ORDERS_HEADINGS);
  return listRides(rows.map((row) => toRide(row, { voucherNo: null, feedbackLeft: false })));
}

/** The list narrowed to the form's dates and payment filter — the contract has no payment parameter. */
export function filterRides(rides: readonly Ride[], filters: RideSearchFilters): Ride[] {
  const from = startOfDay(filters.from).getTime();
  const to = endOfDay(filters.to).getTime();
  return rides.filter((ride) => {
    const at = ride.pickupAt.getTime();
    if (at < from || at > to) return false;
    return filters.paymentMethod === 'all' || ride.paymentMethod === filters.paymentMethod;
  });
}

/** The window the home dashboard loads: a history search's reach either side of today. */
export function overviewWindow(now: Date): { from: Date; to: Date } {
  return {
    from: addDays(startOfDay(now), -HISTORY_REACH_DAYS),
    to: addDays(startOfDay(now), HISTORY_REACH_DAYS),
  };
}
