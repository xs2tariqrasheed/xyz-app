import { RideDocumentScreen } from '@/components/rides/RideDocumentScreen';
import { RECEIPTS_MESSAGES } from '@/constants/messages';
import { hasRideReceipt, toReceiptDocument } from '@/services/rideDocument';

/**
 * The receipt of a completed ride (guide 23, missing-screens/13): what was
 * charged and how it was paid, from `RES.S.LOAD_RESERVATION`. Card numbers
 * show their last four digits only.
 */
export default function ReceiptScreen() {
  return (
    <RideDocumentScreen
      title={RECEIPTS_MESSAGES.RECEIPT_TITLE}
      printLabel={RECEIPTS_MESSAGES.PRINT}
      isAvailable={hasRideReceipt}
      unavailableMessage={RECEIPTS_MESSAGES.NOT_COMPLETED}
      toDocument={toReceiptDocument}
    />
  );
}
