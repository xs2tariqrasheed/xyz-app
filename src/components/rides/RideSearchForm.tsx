import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { HISTORY_QUICK_PICKS } from '@/components/ui/CalendarPicker';
import { DateField } from '@/components/ui/DateField';
import { CardGlyph } from '@/components/ui/Glyph';
import { SelectField } from '@/components/ui/SelectField';
import { PAYMENT_METHOD_FILTERS, type PaymentMethodFilter } from '@/services/rides';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';

export type RideSearchFormValue = {
  from: Date;
  to: Date;
  paymentMethod: PaymentMethodFilter;
};

export type RideSearchFormProps = {
  value: RideSearchFormValue;
  onChange: (next: RideSearchFormValue) => void;
  onSubmit: () => void;
  /** "Now" — the calendar's today marker and the ceiling on both dates. */
  today: Date;
  /** Earliest bookable history. Rides older than this are not kept. */
  earliest: Date;
  searching?: boolean;
};

/** The filter bar: a date range, a payment method and the search action. */
export function RideSearchForm({
  value,
  onChange,
  onSubmit,
  today,
  earliest,
  searching,
}: RideSearchFormProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;
  const wide = width >= breakpoints.md;

  const invalidRange = value.from.getTime() > value.to.getTime();
  // The basis is a *width* only while the fields sit in a row. Left on in the
  // stacked layout it would become a 220px-tall main axis for every field.
  const fieldStyle = twoUp ? styles.field : null;

  const patch = (next: Partial<RideSearchFormValue>) => onChange({ ...value, ...next });

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.title}>Find a ride</Text>
        <Text style={styles.description}>
          Pick a date range and a payment method. Leave the method on “All” to see everything.
        </Text>
      </View>

      <View style={[styles.fields, twoUp ? styles.fieldsRow : null]}>
        <DateField
          style={fieldStyle}
          label="From date"
          value={value.from}
          onChange={(from) => patch({ from })}
          today={today}
          minDate={earliest}
          quickPicks={HISTORY_QUICK_PICKS}
          sheetTitle="From date"
          sheetSubtitle="The earliest pickup date to include."
        />
        <DateField
          style={fieldStyle}
          label="To date"
          value={value.to}
          onChange={(to) => patch({ to })}
          today={today}
          minDate={earliest}
          quickPicks={HISTORY_QUICK_PICKS}
          sheetTitle="To date"
          sheetSubtitle="The latest pickup date to include."
        />
        <SelectField
          style={fieldStyle}
          label="Payment method"
          value={value.paymentMethod}
          options={PAYMENT_METHOD_FILTERS}
          onChange={(paymentMethod) => patch({ paymentMethod })}
          icon={<CardGlyph />}
          sheetTitle="Payment method"
          sheetSubtitle="Narrow the results to one way of paying."
        />
      </View>

      {invalidRange ? (
        <Text style={styles.error}>
          The “from” date is after the “to” date — swap them to run the search.
        </Text>
      ) : null}

      <View style={[styles.actions, wide ? styles.actionsWide : null]}>
        <Button
          label={searching ? 'Searching…' : 'Search'}
          size="lg"
          disabled={invalidRange || searching}
          onPress={onSubmit}
          style={wide ? null : styles.submitFull}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.lg,
    gap: space.lg,
    boxShadow: shadowValues.sm,
  },
  heading: { gap: 3 },
  title: { color: colors.textHeading, fontSize: 17, fontWeight: '700' },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },

  fields: { gap: space.md },
  // Wraps rather than squeezing: three controls sit inline on a desktop, the
  // two dates pair up on a large phone, and everything stacks below that.
  fieldsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  field: { flexGrow: 1, flexShrink: 1, flexBasis: 220 },

  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },

  actions: { flexDirection: 'row' },
  actionsWide: { justifyContent: 'flex-end' },
  submitFull: { flex: 1 },
});
