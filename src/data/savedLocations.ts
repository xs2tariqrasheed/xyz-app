import type { AddressSuggestion } from '@/services/places';

/**
 * Addresses this customer rides between often.
 *
 * Same shape as a Places result, so a saved location can be handed straight to
 * the reservation form once express checkout is connected to the dispatcher.
 */
export const SAVED_LOCATIONS: readonly AddressSuggestion[] = [
  { placeId: 'saved-w41', primary: 'W 41 St', secondary: 'Manhattan, NY' },
  { placeId: 'saved-20st', primary: '275 20 St', secondary: 'Brooklyn, NY' },
  { placeId: 'saved-jfk', primary: 'JFK International Airport', secondary: 'Queens, NY' },
  { placeId: 'saved-lga', primary: 'LaGuardia Airport', secondary: 'Queens, NY' },
  { placeId: 'saved-hudson', primary: '90 Hudson St', secondary: 'Hoboken, NJ' },
];

/** How long express checkout promises before a car reaches the customer. */
export const EXPRESS_DISPATCH_MINUTES = 15;
