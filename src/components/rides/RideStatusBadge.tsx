import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { RIDE_STATUS_LABELS, type RideStatus } from '@/services/rides';

const TONES: Record<RideStatus, BadgeTone> = {
  confirmed: 'info',
  'in-progress': 'accent',
  completed: 'success',
  canceled: 'muted',
};

export function RideStatusBadge({ status }: { status: RideStatus }) {
  return (
    <Badge
      label={RIDE_STATUS_LABELS[status].toUpperCase()}
      tone={TONES[status]}
      pulse={status === 'in-progress'}
    />
  );
}
