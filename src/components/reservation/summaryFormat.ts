/**
 * Display helpers shared by every read-back of a reservation in progress —
 * the summary panel beside the form and the confirmation step before booking.
 *
 * Kept in one place so the two can never phrase the same answer differently.
 */

import type { BillingMethodValue } from "@/components/reservation/BillingMethodSection";
import type { RideAddressInfoValue } from "@/components/reservation/RideAddressInfoSection";
import type { PhoneValue } from "@/components/ui/PhoneField";

export const BILLING_LABELS: Record<BillingMethodValue["method"], string> = {
  corporate: "Corporate account",
  "corporate-card": "Credit card + corporate account",
  card: "Credit card",
};

/** Em dash stands in for anything the customer has not filled in yet. */
export const EMPTY = "—";

export function orEmpty(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : EMPTY;
}

export function formatPhone(phone: PhoneValue): string {
  if (!phone.number.trim()) return EMPTY;
  const prefix = phone.country ? `${phone.country} ` : "";
  const ext = phone.ext.trim() ? ` ext. ${phone.ext.trim()}` : "";
  return `${prefix}${phone.number.trim()}${ext}`;
}

/** Last four digits only — a read-back never repeats a full card number. */
export function formatCard(number: string): string {
  const digits = number.replace(/\D/g, "");
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : EMPTY;
}

/** The address on one line, with its directions in brackets when there are any. */
export function addressLine(
  place: RideAddressInfoValue["pickup"],
  notes: string,
): string {
  if (!place) return EMPTY;
  const base = [place.primary, place.secondary].filter(Boolean).join(", ");
  const trimmed = notes.trim();
  return trimmed ? `${base} (${trimmed})` : base;
}

/** Just the address, for a layout that gives the directions their own row. */
export function addressOnly(place: RideAddressInfoValue["pickup"]): string {
  if (!place) return EMPTY;
  return [place.primary, place.secondary].filter(Boolean).join(", ");
}
