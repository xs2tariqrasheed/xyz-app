/** The six parts of a reservation, in the order the customer fills them in. */

export type ReservationSectionId =
  | 'passenger'
  | 'address'
  | 'billing'
  | 'preferences'
  | 'confirm'
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
    id: 'confirm',
    title: 'Preview',
    short: 'Preview',
  },
  {
    id: 'receipt',
    title: 'Ride Receipt',
    short: 'Receipt',
  },
];

/**
 * Position of a section in the flow.
 *
 * Callers that need a step number ask by id rather than counting, so inserting
 * a step cannot silently renumber anyone.
 */
export function sectionIndex(id: ReservationSectionId): number {
  return RESERVATION_SECTIONS.findIndex((section) => section.id === id);
}
