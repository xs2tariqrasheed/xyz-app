/**
 * A booked reservation, as read back on the reservation info page.
 *
 * Dates, times and amounts arrive from the booking system already formatted
 * for display, so they stay strings here — this screen never re-derives them
 * and so can never disagree with the voucher the customer was sent.
 */

export type ReservationStatus = 'Open' | 'Confirmed' | 'Completed' | 'Cancelled';

/** Section 1 — who is riding, when, and how the booking was taken. */
export type PassengerRideInfo = {
  firstName: string;
  lastName: string;
  rideDate: string;
  rideTime: string;
  /** When the booking itself was placed. */
  originateDate: string;
  originateTime: string;
  /** Who took it — an agent name, or "Website" for a self-service booking. */
  operatorName: string;
  status: ReservationStatus;
};

/** Section 2 — one end of the ride. Any field may be blank. */
export type RideAddress = {
  cityState: string;
  landmark: string;
  crossStreet1: string;
  crossStreet2: string;
  pickupPoint: string;
};

/** Section 3 — how the ride is paid for, and what has settled so far. */
export type BillingInfo = {
  voucherNumber: string;
  invoiceNumber: string;
  approvalDate: string;
  transactionDate: string;
  transactionAmount: string;
  paymentMethod: string;
  accountNumber: string;
  vipNumber: string;
};

/** Section 4 — vehicle, contact details and the shape of the trip. */
export type Preferences = {
  carType: string;
  /** US callback number. */
  callbackPhone: string;
  internationalPhone: string;
  email: string;
  /** How the confirmation is sent — "Email", "SMS" or "None". */
  confirmationBy: string;
  passengers: number;
  stops: number;
};

export type Reservation = {
  reservationNumber: string;
  voucherNumber: string;
  passenger: PassengerRideInfo;
  pickup: RideAddress;
  /** `null` for an as-directed ride, which has no fixed drop-off. */
  destination: RideAddress | null;
  billing: BillingInfo;
  preferences: Preferences;
};

/** Stand-in record until the reservation API is wired up. */
export const SAMPLE_RESERVATION: Reservation = {
  reservationNumber: 'W6081210500',
  voucherNumber: '',
  passenger: {
    firstName: 'XYZ TEST',
    lastName: 'XYZ TEST',
    rideDate: '9/30/2026',
    rideTime: '2:00 am',
    originateDate: '08/12/2026',
    originateTime: '09:22 AM',
    operatorName: 'Website',
    status: 'Open',
  },
  pickup: {
    cityState: 'NEW YORK,',
    landmark: 'WEST 34TH STREET',
    crossStreet1: 'WEST 34TH STREET',
    crossStreet2: '',
    pickupPoint: '',
  },
  destination: null,
  billing: {
    voucherNumber: '',
    invoiceNumber: '',
    approvalDate: '',
    transactionDate: '',
    transactionAmount: '',
    paymentMethod: 'Voucher',
    accountNumber: '99005',
    vipNumber: '1',
  },
  preferences: {
    carType: '',
    callbackPhone: '212',
    internationalPhone: '',
    email: 'DRIVERHELPDESK@XYZCAR.COM',
    confirmationBy: 'None',
    passengers: 1,
    stops: 0,
  },
};
