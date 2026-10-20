import { RIDES_MESSAGES } from '@/constants/messages';
import type { GatewayJData, GatewayResponse } from '@/services/gateway';
import { type GatewayRow, isYes, parseGatewayDate, pick, recordSet } from '@/services/gatewayRows';
import { addDays, endOfDay, pad2, startOfDay } from '@/utils/datetime';

/**
 * Rides on the account: history (`RES.S.ALL_ORDERS`, guide 18), open
 * reservations (`RES.S.UPDATABLE_ORDERS`, guide 19) and the home dashboard
 * built from them. Rows are mapped here so screens never read raw columns.
 */

/** Thrown when the server refuses a rides lookup, as opposed to failing. */
export class RidesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RidesError';
  }
}

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

/** Feedback is offered once the ride is over, not while it is still running. */
export function canLeaveFeedback(ride: Ride): boolean {
  return (ride.status === 'completed' || ride.status === 'canceled') && !ride.feedbackLeft;
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

/** `MM/DD/YYYY`, the gateway's date format. */
function gatewayDate(date: Date): string {
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()}`;
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

/** Column candidates: today's gateway names first, then the old grid's (guide 18). */
const COLUMNS = {
  id: ['reservation_num', 'reservationid', 'ride_no', 'rideno'],
  passenger: ['passenger_name', 'passengername'],
  date: ['pickup_date', 'ride_date', 'reservation_date', 'ridedate'],
  time: ['pickup_time', 'ride_time', 'reservation_time'],
  pickup: ['pickup_location', 'pickupshortaddress', 'pickup_address'],
  destination: ['destination', 'dropshortaddress', 'dropoff_location', 'drop_address'],
  status: ['status', 'callstatus', 'call_status'],
  payment: ['payment_method', 'cardno', 'payment_type'],
  voucher: ['voucher_num', 'voucher_number', 'voucherno'],
  feedback: ['feedback_left', 'feedback'],
} as const;

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

function toRide(row: GatewayRow): Ride | null {
  const id = pick(row, COLUMNS.id);
  const pickupAt = parseGatewayDate(pick(row, COLUMNS.date), pick(row, COLUMNS.time));
  // A row with no ride number or no date cannot be listed or opened.
  if (!id || !pickupAt) return null;

  return {
    id,
    passengerName: pick(row, COLUMNS.passenger),
    pickupAt,
    pickupLocation: pick(row, COLUMNS.pickup),
    destination: pick(row, COLUMNS.destination),
    status: toRideStatus(pick(row, COLUMNS.status)),
    paymentMethod: toPaymentMethod(pick(row, COLUMNS.payment)),
    voucherNo: pick(row, COLUMNS.voucher) || null,
    feedbackLeft: isYes(pick(row, COLUMNS.feedback)),
  };
}

/** Rows → rides, newest first, de-duplicated by ride number. */
export function toRides(response: GatewayResponse): Ride[] {
  const rows = recordSet(response, (message) => new RidesError(message), RIDES_MESSAGES.HISTORY_FAILED);
  const seen = new Set<string>();
  return rows
    .map(toRide)
    .filter((ride): ride is Ride => {
      if (!ride || seen.has(ride.id)) return false;
      seen.add(ride.id);
      return true;
    })
    .sort(byPickupDesc);
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
