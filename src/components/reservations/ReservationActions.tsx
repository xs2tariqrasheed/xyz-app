import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { isCancellable, isEditable, type Reservation } from '@/data/reservations';
import { colors, space } from '@/theme';

/** What the list can do to a reservation. The page owns all four. */
export type ReservationHandlers = {
  /** Open the reservation for editing — the ride number does this too. */
  onUpdate: (reservation: Reservation) => void;
  onCancel: (reservation: Reservation) => void;
  onPrintVoucher: (reservation: Reservation) => void;
  /** Start a fresh reservation from a finished or called-off one. */
  onRebook: (reservation: Reservation) => void;
};

export type ActionTone = 'link' | 'danger';

export type ActionLinkProps = {
  label: string;
  onPress: () => void;
  tone?: ActionTone;
  /** Spoken label, so "Cancel" is not ambiguous out of context. */
  accessibilityLabel?: string;
};

/** A row action. Reads as a link, sized as a tap target. */
export function ActionLink({ label, onPress, tone = 'link', accessibilityLabel }: ActionLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
    >
      <Text style={[styles.actionLabel, tone === 'danger' ? styles.actionDanger : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export type ReservationActionsProps = {
  reservation: Reservation;
  handlers: ReservationHandlers;
  style?: StyleProp<ViewStyle>;
};

/**
 * The actions a reservation currently allows.
 *
 * Status decides the set: a live ride can still be called off but not edited,
 * and a finished one only offers its paperwork and a rebook.
 */
export function ReservationActions({ reservation, handlers, style }: ReservationActionsProps) {
  const ride = `ride ${reservation.id}`;

  return (
    <View style={[styles.row, style]}>
      {isEditable(reservation) ? (
        <ActionLink
          label="Update"
          accessibilityLabel={`Update ${ride}`}
          onPress={() => handlers.onUpdate(reservation)}
        />
      ) : null}

      {reservation.hasVoucher ? (
        <ActionLink
          label="Voucher"
          accessibilityLabel={`Print voucher for ${ride}`}
          onPress={() => handlers.onPrintVoucher(reservation)}
        />
      ) : null}

      {isCancellable(reservation) ? (
        <ActionLink
          label="Cancel"
          tone="danger"
          accessibilityLabel={`Cancel ${ride}`}
          onPress={() => handlers.onCancel(reservation)}
        />
      ) : (
        <ActionLink
          label="Rebook"
          accessibilityLabel={`Book ${ride} again`}
          onPress={() => handlers.onRebook(reservation)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.xs },
  action: { paddingVertical: space.xs + 2, paddingHorizontal: space.xs + 2, borderRadius: 6 },
  actionPressed: { backgroundColor: colors.surfaceSunken },
  actionLabel: { color: colors.textLink, fontSize: 13, fontWeight: '600' },
  actionDanger: { color: colors.danger },
});
