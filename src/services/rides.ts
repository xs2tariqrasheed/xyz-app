import { hasRateRideUrl } from '@/config/rateRide';
import { COMMON_MESSAGES } from '@/constants/messages';
import { type GatewayJData, type GatewayResponse, mapRowsByHeadings } from '@/services/gateway';
import { parseGatewayDate } from '@/services/gatewayRows';
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
  /** `null`: a payment code the backend hasn't documented yet. */
  paymentMethod: PaymentMethod | null;
  /** The gateway's `oecanupdate` / `oecancancel` / `oecanprintvoucher` / `oeinvoiceposted` flags. */
  canUpdate: boolean;
  canCancel: boolean;
  canPrintVoucher: boolean;
  invoicePosted: boolean;
};

/** The payment label for a ride, or "not available" for an undocumented code. */
export function paymentLabel(ride: Ride): string {
  return ride.paymentMethod ? PAYMENT_METHOD_LABELS[ride.paymentMethod] : COMMON_MESSAGES.NOT_AVAILABLE;
}

export type RideSearchFilters = {
  from: Date;
  to: Date;
  paymentMethod: PaymentMethodFilter;
};

/**
 * A finished ride links to the live rate-a-ride form (guide 18's Feedback
 * column). Neither order code says whether feedback was already left.
 */
export function canLeaveFeedback(ride: Ride): boolean {
  return ride.status === 'completed' && hasRateRideUrl;
}

/** Questions go to dispatch about a ride that is still open (guide 21), not one that is over. */
export function canAskAboutRide(ride: Ride): boolean {
  return ride.status === 'confirmed' || ride.status === 'in-progress';
}

/** A ride has a receipt once its invoice is posted (`oeinvoiceposted`). */
export function hasReceipt(ride: Ride): boolean {
  return ride.invoicePosted;
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

/**
 * The headings the app reads; `RES.S.ALL_ORDERS` and `RES.S.UPDATABLE_ORDERS`
 * send the same 112 (guide §10).
 */
export const ORDER_HEADINGS = [
  'oreservationnumber',
  'ofirstname',
  'olastname',
  'oreservationdate',
  'oreservationtime',
  'opustreetnumber',
  'opustreetname',
  'opucity',
  'opustate',
  'opuairportname',
  'opulandmarkname',
  'odostreetnumber',
  'odostreetname',
  'odocity',
  'odostate',
  'odoairportname',
  'odolandmarkname',
  'opaymentmethod',
  'oecallstatusdesc',
  'oecurrentstatusdesc',
  'oecanupdate',
  'oecancancel',
  'oecanprintvoucher',
  'oeinvoiceposted',
] as const;

type OrderRow = Record<(typeof ORDER_HEADINGS)[number], string>;

/**
 * The reservation's call status (`oecallstatusdesc`: Open, Confirmed,
 * Canceled) with the trip's own status (`oecurrentstatusdesc`, e.g. UnLoaded)
 * onto the four the app shows.
 * TODO(schema-unverified): the status words are read from the values, not a
 * backend list; confirm them against guide §10.
 */
export function toRideStatus(callStatus: string, tripStatus: string): RideStatus {
  if (/cancel/i.test(callStatus)) return 'canceled';
  const trip = tripStatus.trim();
  if (/^unloaded$/i.test(trip)) return 'completed';
  if (trip) return 'in-progress';
  return 'confirmed';
}

/**
 * `opaymentmethod` codes. "1" is the corporate account (`RES.S.BILLING_METHOD`
 * answers "1" = Corporate Account); other codes (e.g. "3") aren't documented
 * yet, so they read as `null`.
 */
export function toPaymentMethod(code: string): PaymentMethod | null {
  return code.trim() === '1' ? 'account' : null;
}

/** `Y` flags (`oecanupdate`, …). */
function isFlagSet(value: string): boolean {
  return value.trim().toUpperCase() === 'Y';
}

/**
 * A stop as one line: the airport or landmark when there is one, otherwise
 * the street address with its city and state; "not available" when empty.
 */
function stopLabel(parts: { number: string; street: string; city: string; state: string; airport: string; landmark: string }): string {
  const place = parts.airport.trim() || parts.landmark.trim();
  const street = [parts.number.trim(), parts.street.trim()].filter(Boolean).join(' ');
  const locality = [parts.city.trim(), parts.state.trim()].filter(Boolean).join(', ');
  const label = place || [street, locality].filter(Boolean).join(', ');
  return label || COMMON_MESSAGES.NOT_AVAILABLE;
}

/** One row as a ride, or `null` when it cannot be listed. Each field is read from its own heading. */
function toRide(row: OrderRow): Ride | null {
  const id = row.oreservationnumber.trim();
  const pickupAt = parseGatewayDate(row.oreservationdate, row.oreservationtime);
  // A row with no ride number or no date cannot be listed or opened.
  if (!id || !pickupAt) return null;

  return {
    id,
    passengerName:
      [row.ofirstname.trim(), row.olastname.trim()].filter(Boolean).join(' ') || COMMON_MESSAGES.NOT_AVAILABLE,
    pickupAt,
    pickupLocation: stopLabel({
      number: row.opustreetnumber,
      street: row.opustreetname,
      city: row.opucity,
      state: row.opustate,
      airport: row.opuairportname,
      landmark: row.opulandmarkname,
    }),
    destination: stopLabel({
      number: row.odostreetnumber,
      street: row.odostreetname,
      city: row.odocity,
      state: row.odostate,
      airport: row.odoairportname,
      landmark: row.odolandmarkname,
    }),
    status: toRideStatus(row.oecallstatusdesc, row.oecurrentstatusdesc),
    paymentMethod: toPaymentMethod(row.opaymentmethod),
    canUpdate: isFlagSet(row.oecanupdate),
    canCancel: isFlagSet(row.oecancancel),
    canPrintVoucher: isFlagSet(row.oecanprintvoucher),
    // TODO(schema-unverified): assumed `oeinvoiceposted` "Y" means the
    // receipt can be opened; confirm against guide §10.
    invoicePosted: isFlagSet(row.oeinvoiceposted),
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
  return listRides(mapRowsByHeadings(response, ORDER_HEADINGS).map(toRide));
}

/** `RES.S.UPDATABLE_ORDERS` rows → rides; the same headings as {@link toRides}. */
export function toUpdatableRides(response: GatewayResponse): Ride[] {
  return listRides(mapRowsByHeadings(response, ORDER_HEADINGS).map(toRide));
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
