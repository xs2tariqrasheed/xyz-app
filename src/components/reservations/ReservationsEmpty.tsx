import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { CalendarGlyph } from '@/components/ui/Glyph';
import { colors, radii, space } from '@/theme';

export type ReservationsEmptyProps = {
  /** The search box is not empty — the fix is to clear it, not to book a ride. */
  searching: boolean;
  onClearSearch: () => void;
  onBook: () => void;
};

/** Shown in place of the list when nothing matches the tab and the search. */
export function ReservationsEmpty({ searching, onClearSearch, onBook }: ReservationsEmptyProps) {
  return (
    <View style={styles.root}>
      <View style={styles.icon}>
        <CalendarGlyph color={colors.primary[400]} size={26} />
      </View>

      <Text style={styles.title}>{searching ? 'No matching rides' : 'Nothing here yet'}</Text>
      <Text style={styles.body}>
        {searching
          ? 'No reservation matches that ride number, name or address.'
          : 'Reservations you book will show up here, with everything you need to update or cancel them.'}
      </Text>

      {searching ? (
        <Button label="Clear search" variant="outline" onPress={onClearSearch} />
      ) : (
        <Button label="Make a reservation" onPress={onBook} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.xl,
    alignItems: 'center',
    gap: space.md,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.textTitle, fontSize: 17, fontWeight: '700' },
  body: {
    color: colors.textBody,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 420,
  },
});
