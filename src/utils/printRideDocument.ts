import * as Print from 'expo-print';

import { type RideDocument, rideDocumentHtml } from '@/services/rideDocument';

/** iOS rejects with this code when the print sheet is closed without printing. */
const PRINT_INCOMPLETE = 'ERR_PRINT_INCOMPLETE';

/**
 * Sends a voucher or receipt to the system print sheet (AirPrint / Android
 * print). Closing the sheet is not a failure; anything else throws.
 */
export async function printRideDocument(doc: RideDocument): Promise<void> {
  try {
    await Print.printAsync({ html: rideDocumentHtml(doc) });
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code === PRINT_INCOMPLETE) return;
    throw error;
  }
}
