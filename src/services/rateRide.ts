import { rateRideUrl } from '@/config/rateRide';
import { RIDES_MESSAGES } from '@/constants/messages';
import { openExternalUrl } from '@/services/website';

/**
 * Opens the live "Rate a ride" form for a ride (reverse-engineer-guide/24,
 * guide 18's Feedback column): an in-app browser on iOS / Android, a new tab
 * on web. Call it straight from the press handler — mobile browsers block
 * `window.open` that comes too long after the tap.
 *
 * Resolves to an error message when the page could not be opened, else null.
 */
export function openRateRide(rideNo: string): Promise<string | null> {
  return openExternalUrl(rateRideUrl(rideNo), RIDES_MESSAGES.FEEDBACK_OPEN_FAILED);
}
