import { Pressable } from 'react-native';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { RIDES_MESSAGES } from '@/constants/messages';
import { RIDE_STATUS_LABELS, type RideStatus } from '@/services/rides';

const TONES: Record<RideStatus, BadgeTone> = {
  confirmed: 'info',
  'in-progress': 'accent',
  completed: 'success',
  canceled: 'muted',
};

/** The ride's status pill; with `onPress` (a live ride) it opens Track your route. */
export function RideStatusBadge({ status, onPress }: { status: RideStatus; onPress?: () => void }) {
  const badge = (
    <Badge
      label={RIDE_STATUS_LABELS[status].toUpperCase()}
      tone={TONES[status]}
      pulse={status === 'in-progress'}
    />
  );
  if (!onPress) return badge;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={RIDES_MESSAGES.TRACK} hitSlop={8} onPress={onPress}>
      {badge}
    </Pressable>
  );
}
