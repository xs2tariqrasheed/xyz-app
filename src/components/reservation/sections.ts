/** The five parts of a reservation, in the order the customer fills them in. */

export type ReservationSectionId =
  | 'passenger'
  | 'address'
  | 'billing'
  | 'preferences'
  | 'receipt';

export type ReservationSection = {
  id: ReservationSectionId;
  /** Full heading on the section card. */
  title: string;
  /** Condensed label for the step rail, where space is tight. */
  short: string;
};

export const RESERVATION_SECTIONS: readonly ReservationSection[] = [
  {
    id: 'passenger',
    title: 'Passenger & Ride Info',
    short: 'Passenger',
  },
  {
    id: 'address',
    title: 'Ride Address Info',
    short: 'Addresses',
  },
  {
    id: 'billing',
    title: 'Billing Method',
    short: 'Billing',
  },
  {
    id: 'preferences',
    title: 'Preferences',
    short: 'Preferences',
  },
  {
    id: 'receipt',
    title: 'Ride Receipt',
    short: 'Receipt',
  },
];
