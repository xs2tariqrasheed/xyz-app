import { RideDocumentScreen } from '@/components/rides/RideDocumentScreen';
import { VOUCHER_MESSAGES } from '@/constants/messages';
import { hasVoucherNumber, toVoucherDocument } from '@/services/rideDocument';

/**
 * The trip voucher of a ride billed on a voucher (guide 23), drawn from the
 * reservation record itself (`RES.S.LOAD_RESERVATION`). The old site fetched
 * an image from an internal server the browser could not reach (00-README
 * §5 #6); nothing here leaves the gateway.
 */
export default function VoucherScreen() {
  return (
    <RideDocumentScreen
      title={VOUCHER_MESSAGES.SCREEN_TITLE}
      printLabel={VOUCHER_MESSAGES.PRINT}
      isAvailable={hasVoucherNumber}
      unavailableMessage={VOUCHER_MESSAGES.NOT_BILLED}
      toDocument={toVoucherDocument}
    />
  );
}
