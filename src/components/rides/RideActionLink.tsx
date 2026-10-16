import { Pressable, StyleSheet, Text } from 'react-native';

import type { Ride } from '@/services/rides';
import { colors, space } from '@/theme';

export type RideAction = 'view' | 'modify' | 'cancel' | 'feedback' | 'voucher';

export type RideActionHandler = (action: RideAction, ride: Ride) => void;

export type RideActionLinkProps = {
  label: string;
  onPress: () => void;
  /** Cancelling reads in the danger colour, everything else as a link. */
  tone?: 'link' | 'danger';
};

/** The underlined text action used in both the table and the phone cards. */
export function RideActionLink({ label, onPress, tone = 'link' }: RideActionLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.hit, pressed ? styles.pressed : null]}
    >
      <Text style={[styles.label, tone === 'danger' ? styles.danger : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { paddingVertical: space.xs, alignSelf: 'flex-start' },
  pressed: { opacity: 0.6 },
  label: {
    color: colors.textLink,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  danger: { color: colors.danger },
});
