import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { COMMON_MESSAGES } from '@/constants/messages';
import { breakpoints, colors, space } from '@/theme';

/** Stands in for a field the booking system left blank. */
export const EMPTY_VALUE = '—';

export type InfoRowProps = {
  label: string;
  /** Plain value. Blank, `null` or `undefined` renders `emptyLabel`, muted. */
  value?: string | number | null;
  /** What a blank value shows; a muted dash unless the screen says otherwise. */
  emptyLabel?: string;
  /** Rich value — a badge, a link — rendered instead of `value`. */
  children?: React.ReactNode;
};

/** A gateway record field: a blank value shows "not available" (gateway data, CLAUDE.md). */
export function RecordRow(props: InfoRowProps) {
  return <InfoRow emptyLabel={COMMON_MESSAGES.NOT_AVAILABLE} {...props} />;
}

/**
 * One `Label : value` line.
 *
 * Mobile first: the label sits above its value on a phone, and only folds into
 * the classic right-aligned label column once there is width for the two to
 * share a line.
 */
export function InfoRow({ label, value, emptyLabel = EMPTY_VALUE, children }: InfoRowProps) {
  const { width } = useWindowDimensions();
  const inline = width >= breakpoints.sm;

  const text = value == null ? '' : String(value).trim();
  const empty = !children && text.length === 0;

  return (
    <View style={[styles.row, inline ? styles.rowInline : null]}>
      <Text style={[styles.label, inline ? styles.labelInline : null]}>
        {label}
        {inline ? ' :' : ''}
      </Text>
      <View style={[styles.value, inline ? styles.valueInline : null]}>
        {children ?? (
          <Text style={[styles.text, empty ? styles.textEmpty : null]}>
            {empty ? emptyLabel : text}
          </Text>
        )}
      </View>
    </View>
  );
}

/** A stack of rows. Used on its own, or as one column of `InfoColumns`. */
export function InfoList({ children }: { children: React.ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

export type InfoColumnsProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Draws the rule between the two columns, as the billing panel does. */
  divider?: boolean;
};

/**
 * Two columns of rows side by side, collapsing to one continuous list on a
 * phone — the reading order is the same either way.
 */
export function InfoColumns({ left, right, divider }: InfoColumnsProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.md;

  if (!twoUp) {
    return (
      <View style={styles.list}>
        {left}
        {divider ? <View style={styles.stackedRule} /> : null}
        {right}
      </View>
    );
  }

  return (
    <View style={styles.columns}>
      <View style={styles.column}>{left}</View>
      {divider ? <View style={styles.rule} /> : null}
      <View style={styles.column}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },

  row: { gap: 2 },
  rowInline: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  // The label column is a shade narrower than the value column, so the colons
  // line up without squeezing longer values onto a second line.
  labelInline: { flex: 0.9, textAlign: 'right', color: colors.textBody },
  value: {},
  valueInline: { flex: 1.1 },
  text: { color: colors.textStrong, fontSize: 14, fontWeight: '600' },
  textEmpty: { color: colors.textDisabled, fontWeight: '400' },

  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg },
  column: { flex: 1, gap: space.md },
  rule: { alignSelf: 'stretch', width: 1, backgroundColor: colors.border },
  stackedRule: { height: 1, backgroundColor: colors.border },
});
