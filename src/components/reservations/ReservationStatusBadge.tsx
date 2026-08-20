import { Badge, type BadgeTone } from '@/components/ui/Badge';
import type { ReservationStatus } from '@/data/reservations';

const STATUS: Record<ReservationStatus, { label: string; tone: BadgeTone; pulse?: boolean }> = {
  open: { label: 'OPEN', tone: 'info' },
  'in-progress': { label: 'EN ROUTE', tone: 'accent', pulse: true },
  completed: { label: 'COMPLETED', tone: 'success' },
  cancelled: { label: 'CANCELLED', tone: 'muted' },
};

/** The one place a reservation status turns into words and colour. */
export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const { label, tone, pulse } = STATUS[status];

  return <Badge label={label} tone={tone} pulse={pulse} />;
}
