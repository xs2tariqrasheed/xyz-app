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
  /** One line under the heading. */
  description: string;
  /** Condensed label for the step rail, where space is tight. */
  short: string;
};

export const RESERVATION_SECTIONS: readonly ReservationSection[] = [
  {
    id: 'passenger',
    title: 'Passenger & Ride Info',
    description: 'Who is riding, and when we pick them up.',
    short: 'Passenger',
  },
  {
    id: 'address',
    title: 'Ride Address Info',
    description: 'Pickup, stops along the way and drop-off.',
    short: 'Addresses',
  },
  {
    id: 'billing',
    title: 'Billing Method',
    description: 'How this ride is paid for.',
    short: 'Billing',
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Vehicle, seating and special requests.',
    short: 'Preferences',
  },
  {
    id: 'receipt',
    title: 'Ride Receipt',
    description: 'Your confirmation number and what happens next.',
    short: 'Receipt',
  },
];
