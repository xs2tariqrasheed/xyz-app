import { SUPPORT_PHONE } from '@/components/reservation/RideReceiptSection';
import {
  CHARGE_LABELS,
  RECEIPTS_MESSAGES,
  RESERVATION_INFO_MESSAGES,
  RIDE_DOCUMENT_MESSAGES,
  VOUCHER_MESSAGES,
} from '@/constants/messages';
import { placeLocalityLine, placeStreetLine } from '@/services/places';
import type { ChargeLine, RecordStop, ReservationRecord } from '@/services/reservation';
import { PAYMENT_METHOD_LABELS } from '@/services/rides';
import { colors } from '@/theme';
import { formatClockTime, formatSlashDate } from '@/utils/datetime';

/**
 * The printable papers of a ride (guide 23): the voucher of a ride billed on
 * a voucher, and the receipt of any completed ride. Both are drawn from the
 * reservation record (`RES.S.LOAD_RESERVATION`) — every value is the
 * server's, nothing is totalled or made up on the device.
 */

export type RideDocumentKind = 'voucher' | 'receipt';

export type RideDocumentField = { label: string; value: string };

export type RideDocument = {
  kind: RideDocumentKind;
  /** "Voucher" / "Receipt". */
  title: string;
  /** Voucher # or reservation #, as the server issued it. */
  number: string;
  fields: RideDocumentField[];
  charges: ChargeLine[];
};

/** A voucher exists once the server has issued its number. */
export function hasVoucherNumber(record: ReservationRecord): boolean {
  return record.voucherNumber.length > 0;
}

/** A receipt exists for every ride that has been completed (billed). */
export function hasRideReceipt(record: ReservationRecord): boolean {
  return record.status === 'completed';
}

/** Charges line that carries the server's total, styled apart from the items. */
export function isTotalCharge(charge: ChargeLine): boolean {
  return charge.label === CHARGE_LABELS.total;
}

export function stopLine(stop: RecordStop): string {
  return [placeStreetLine(stop.place), placeLocalityLine(stop.place)].filter(Boolean).join(', ');
}

function dateTime(at: Date | null): string {
  return at ? `${formatSlashDate(at)} ${formatClockTime(at)}` : '';
}

function routeFields(record: ReservationRecord): RideDocumentField[] {
  return [
    { label: RIDE_DOCUMENT_MESSAGES.PASSENGER, value: `${record.firstName} ${record.lastName}`.trim() },
    { label: RIDE_DOCUMENT_MESSAGES.FROM, value: stopLine(record.pickup) },
    {
      label: RIDE_DOCUMENT_MESSAGES.TO,
      value: record.destination ? stopLine(record.destination) : RESERVATION_INFO_MESSAGES.AS_DIRECTED,
    },
  ];
}

export function toVoucherDocument(record: ReservationRecord): RideDocument {
  return {
    kind: 'voucher',
    title: VOUCHER_MESSAGES.SCREEN_TITLE,
    number: record.voucherNumber || RESERVATION_INFO_MESSAGES.NOT_ISSUED,
    fields: [
      { label: VOUCHER_MESSAGES.ACCOUNT, value: record.billing.accountNumber },
      { label: VOUCHER_MESSAGES.JOB, value: record.reservationNumber },
      { label: VOUCHER_MESSAGES.DRIVER, value: record.driver.driverNumber },
      { label: VOUCHER_MESSAGES.CAR, value: record.driver.carNumber },
      { label: VOUCHER_MESSAGES.SCHEDULED, value: dateTime(record.rideAt) },
      ...routeFields(record),
      { label: VOUCHER_MESSAGES.STOPS, value: String(record.preferences.stops) },
    ],
    charges: record.charges,
  };
}

export function toReceiptDocument(record: ReservationRecord): RideDocument {
  const { billing } = record;
  // `cardMasked` is already masked by the service; only its last four digits are shown.
  const last4 = billing.cardMasked.slice(-4);
  const optional = (label: string, value: string): RideDocumentField[] => (value ? [{ label, value }] : []);

  return {
    kind: 'receipt',
    title: RECEIPTS_MESSAGES.RECEIPT_TITLE,
    number: record.reservationNumber,
    fields: [
      { label: RECEIPTS_MESSAGES.RESERVATION, value: record.reservationNumber },
      { label: RECEIPTS_MESSAGES.RIDE_DATE, value: dateTime(record.rideAt) },
      ...routeFields(record),
      { label: RECEIPTS_MESSAGES.PAYMENT, value: billing.paymentLabel || PAYMENT_METHOD_LABELS[billing.paymentMethod] },
      ...(last4 ? [{ label: RECEIPTS_MESSAGES.CARD, value: RECEIPTS_MESSAGES.CARD_ENDING(billing.cardType, last4) }] : []),
      ...optional(RECEIPTS_MESSAGES.ACCOUNT, billing.accountNumber),
      ...optional(RECEIPTS_MESSAGES.VOUCHER, billing.voucherNumber || record.voucherNumber),
      ...optional(RECEIPTS_MESSAGES.INVOICE, billing.invoiceNumber),
      ...optional(RECEIPTS_MESSAGES.APPROVAL_DATE, billing.approvalDate),
      ...optional(RECEIPTS_MESSAGES.TRANSACTION_DATE, billing.transactionDate),
    ],
    charges: record.charges,
  };
}

// ── Print (iOS / Android) ──────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function rowHtml(label: string, value: string, className = ''): string {
  return `<tr class="${className}"><th>${escapeHtml(label)}</th><td>${escapeHtml(value || '—')}</td></tr>`;
}

/**
 * The document as a standalone HTML page for the native print sheet. The web
 * prints the rendered screen instead (see `PrintStyles.web.tsx`).
 */
export function rideDocumentHtml(doc: RideDocument): string {
  const fields = doc.fields.map((field) => rowHtml(field.label, field.value)).join('');
  const charges = doc.charges
    .map((charge) => rowHtml(charge.label, charge.amount, isTotalCharge(charge) ? 'total' : ''))
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: ${colors.textStrong}; margin: 24px; }
  .doc { border: 1px solid ${colors.borderStrong}; border-radius: 12px; padding: 20px; }
  .head { border-bottom: 1px solid ${colors.border}; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { color: ${colors.textTitle}; font-size: 18px; font-weight: 800; }
  .meta { color: ${colors.textMuted}; font-size: 13px; }
  .number { color: ${colors.primary[600]}; font-size: 15px; font-weight: 700; letter-spacing: 0.4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { text-align: left; color: ${colors.textMuted}; font-size: 13px; font-weight: 400; width: 40%; padding: 4px 8px 4px 0; vertical-align: top; }
  td { font-size: 14px; font-weight: 600; padding: 4px 0; }
  .charges { background: ${colors.surfaceSunken}; border-radius: 8px; padding: 8px 12px; }
  .total th, .total td { border-top: 1px solid ${colors.border}; font-weight: 800; color: ${colors.textStrong}; }
</style></head>
<body><div class="doc">
  <div class="head">
    <div class="brand">${escapeHtml(RIDE_DOCUMENT_MESSAGES.BRAND)}</div>
    <div class="meta">${escapeHtml(SUPPORT_PHONE)}</div>
    <div class="number">${escapeHtml(`${doc.title} ${doc.number}`)}</div>
  </div>
  <table>${fields}</table>
  ${charges ? `<div class="charges"><table>${charges}</table></div>` : ''}
</div></body></html>`;
}
