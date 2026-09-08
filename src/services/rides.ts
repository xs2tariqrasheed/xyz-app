import { addDays, endOfDay, startOfDay } from '@/utils/datetime';

/**
 * Ride history: types, the search itself, and the sample book it runs against.
 *
 * The dispatch API is not wired up yet, so {@link searchRides} filters
 * {@link SAMPLE_RIDES} behind a short delay. Swapping in `fetch` later only
 * touches this file — every screen already awaits the same promise.
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
  description: string;
}[] = [
  { value: 'all', label: 'All', description: 'Every payment method' },
  { value: 'voucher', label: 'Voucher', description: 'Rides billed to a voucher' },
  { value: 'credit-card', label: 'Credit card', description: 'Card on file' },
  { value: 'cash', label: 'Cash', description: 'Paid to the driver' },
  { value: 'account', label: 'Corporate account', description: 'Invoiced monthly' },
];

export type Ride = {
  /** Ride number, as printed on the receipt. Voucher rides carry a "W" prefix. */
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

/**
 * Stands in for the network round trip, so every screen's loading state is
 * exercised in development exactly as it will be against the real API.
 */
function pause(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 350));
}

/**
 * Ride history for the signed-in customer, narrowed by date range and payment
 * method and sorted newest first.
 */
export async function searchRides(filters: RideSearchFilters): Promise<Ride[]> {
  await pause();

  const from = startOfDay(filters.from).getTime();
  const to = endOfDay(filters.to).getTime();

  return SAMPLE_RIDES.filter((ride) => {
    const at = ride.pickupAt.getTime();
    if (at < from || at > to) return false;
    return filters.paymentMethod === 'all' || ride.paymentMethod === filters.paymentMethod;
  }).sort((a, b) => b.pickupAt.getTime() - a.pickupAt.getTime());
}

/** Ride numbers are 10 digits; voucher rides are printed with a "W" in front. */
function rideNo(seed: number, paymentMethod: PaymentMethod): string {
  const digits = String(6_000_000_000 + seed * 3_607_919).slice(0, 10);
  return paymentMethod === 'voucher' && seed % 4 === 0 ? `W${digits}` : digits;
}

type RideSeed = {
  /** Days from today. Negative is history, positive is still to come. */
  offset: number;
  hour: number;
  minute: number;
  passengerName: string;
  pickupLocation: string;
  destination: string;
  status: RideStatus;
  paymentMethod: PaymentMethod;
  voucherNo?: string;
  feedbackLeft?: boolean;
};

const RIDE_SEEDS: readonly RideSeed[] = [
  {
    offset: 6,
    hour: 6,
    minute: 15,
    passengerName: 'XYZ TEST',
    pickupLocation: '32 ADELE ST, STATEN ISLAND NY State',
    destination: 'JFK AIRPORT, QUEENS NY State',
    status: 'confirmed',
    paymentMethod: 'voucher',
    voucherNo: 'V-40118',
  },
  {
    offset: 2,
    hour: 14,
    minute: 30,
    passengerName: 'XYZ TEST',
    pickupLocation: '275 20 ST, BROOKLYN NY State',
    destination: 'MANHATTAN//MANHATTAN, MANHATTAN NY State',
    status: 'confirmed',
    paymentMethod: 'credit-card',
  },
  {
    offset: 0,
    hour: 9,
    minute: 5,
    passengerName: 'XYZ TEST',
    pickupLocation: 'As Directed',
    destination: 'As Directed',
    status: 'in-progress',
    paymentMethod: 'account',
  },
  {
    offset: -4,
    hour: 15,
    minute: 0,
    passengerName: 'XYZ TEST',
    pickupLocation: 'As Directed',
    destination: 'As Directed',
    status: 'canceled',
    paymentMethod: 'voucher',
    voucherNo: 'V-39877',
  },
  {
    offset: -11,
    hour: 18,
    minute: 45,
    passengerName: 'XYZ TEST',
    pickupLocation: '32 ADELE ST, STATEN ISLAND NY State',
    destination: 'NEWARK LIBERTY AIRPORT, New Jersey',
    status: 'completed',
    paymentMethod: 'credit-card',
    feedbackLeft: true,
  },
  {
    offset: -23,
    hour: 11,
    minute: 20,
    passengerName: 'XYZ TEST',
    pickupLocation: '275 20 ST, BROOKLYN NY State',
    destination: 'PORT READING New Jersey',
    status: 'completed',
    paymentMethod: 'cash',
  },
  {
    offset: -38,
    hour: 14,
    minute: 38,
    passengerName: 'XYZ TEST',
    pickupLocation: '32 ADELE ST, STATEN ISLAND NY State',
    destination: '275 20 ST, BROOKLYN NY State',
    status: 'completed',
    paymentMethod: 'voucher',
    voucherNo: 'V-39104',
  },
  {
    offset: -52,
    hour: 12,
    minute: 33,
    passengerName: 'XYZ TEST',
    pickupLocation: '32 ADELE ST, STATEN ISLAND NY State',
    destination: 'MANHATTAN//MANHATTAN, MANHATTAN NY State',
    status: 'completed',
    paymentMethod: 'voucher',
    voucherNo: 'V-38620',
    feedbackLeft: true,
  },
  {
    offset: -67,
    hour: 8,
    minute: 10,
    passengerName: 'XYZ TEST',
    pickupLocation: 'As Directed',
    destination: 'As Directed',
    status: 'canceled',
    paymentMethod: 'account',
  },
  {
    offset: -84,
    hour: 11,
    minute: 43,
    passengerName: 'XYZ TEST',
    pickupLocation: '32 ADELE ST, STATEN ISLAND NY State',
    destination: 'PORT READING New Jersey',
    status: 'completed',
    paymentMethod: 'account',
  },
  {
    offset: -119,
    hour: 16,
    minute: 55,
    passengerName: 'XYZ TEST',
    pickupLocation: '275 20 ST, BROOKLYN NY State',
    destination: 'LAGUARDIA AIRPORT, QUEENS NY State',
    status: 'completed',
    paymentMethod: 'credit-card',
    feedbackLeft: true,
  },
];

/**
 * Seeded off today rather than fixed calendar dates, so the sample history
 * keeps straddling "now" however long the API stays stubbed out.
 */
export const SAMPLE_RIDES: readonly Ride[] = RIDE_SEEDS.map((seed, index) => {
  const day = addDays(startOfDay(new Date()), seed.offset);

  return {
    id: rideNo(index + 1, seed.paymentMethod),
    passengerName: seed.passengerName,
    pickupAt: new Date(day.getFullYear(), day.getMonth(), day.getDate(), seed.hour, seed.minute),
    pickupLocation: seed.pickupLocation,
    destination: seed.destination,
    status: seed.status,
    paymentMethod: seed.paymentMethod,
    voucherNo: seed.voucherNo ?? null,
    feedbackLeft: seed.feedbackLeft ?? false,
  };
});

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
 * Everything the home dashboard needs, in one round trip.
 *
 * Bucketed here rather than on the screen so the counts and the lists cannot
 * disagree about what "upcoming" means once the dispatch API replaces the
 * sample book.
 */
export async function loadRideOverview(now: Date): Promise<RideOverview> {
  await pause();

  const active = SAMPLE_RIDES.filter((ride) => ride.status === 'in-progress').sort(byPickupAsc);
  const upcoming = SAMPLE_RIDES.filter(
    (ride) => ride.status === 'confirmed' && ride.pickupAt.getTime() > now.getTime(),
  ).sort(byPickupAsc);
  const past = SAMPLE_RIDES.filter(
    (ride) => ride.status === 'completed' || ride.status === 'canceled',
  ).sort(byPickupDesc);

  return {
    counts: {
      upcoming: upcoming.length,
      inProgress: active.length,
      completed: past.filter((ride) => ride.status === 'completed').length,
      canceled: past.filter((ride) => ride.status === 'canceled').length,
      total: SAMPLE_RIDES.length,
    },
    active,
    upcoming,
    past,
  };
}
