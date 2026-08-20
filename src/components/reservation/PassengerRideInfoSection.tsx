import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { CheckboxCard } from '@/components/ui/Checkbox';
import { DateField } from '@/components/ui/DateField';
import { CalendarGlyph, ClockGlyph } from '@/components/ui/Glyph';
import { Reveal } from '@/components/ui/Reveal';
import { TextField } from '@/components/ui/TextField';
import { TimeField } from '@/components/ui/TimeField';
import { breakpoints, colors, radii, space } from '@/theme';
import { formatRelativeDate, formatTime, type TimeValue } from '@/utils/datetime';

/** Everything section 1 collects. */
export type PassengerRideInfoValue = {
  firstName: string;
  lastName: string;
  /** "I'm ready now" — a live call, fulfilled immediately. */
  isLive: boolean;
  /** Only meaningful for a future reservation. */
  date: Date;
  time: TimeValue;
};

export type PassengerRideInfoSectionProps = {
  value: PassengerRideInfoValue;
  onChange: (next: PassengerRideInfoValue) => void;
  today: Date;
};

export function PassengerRideInfoSection({ value, onChange, today }: PassengerRideInfoSectionProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;

  const patch = (next: Partial<PassengerRideInfoValue>) => onChange({ ...value, ...next });

  return (
    <View style={styles.root}>
      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label="First name"
          required
          value={value.firstName}
          onChangeText={(firstName) => patch({ firstName })}
          placeholder="e.g. Amara"
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextField
          style={styles.field}
          label="Last name"
          required
          value={value.lastName}
          onChangeText={(lastName) => patch({ lastName })}
          placeholder="e.g. Okafor"
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      <CheckboxCard
        tone="accent"
        checked={value.isLive}
        onChange={(isLive) => patch({ isLive })}
        label="I'm ready now"
        description="Book this as a live call and we'll dispatch the nearest driver instead of scheduling ahead."
        badge={<Badge label="LIVE CALL" tone="accent" pulse={value.isLive} />}
      />

      {value.isLive ? (
        <Reveal key="live" style={styles.branch}>
          <TimeField
            tone="accent"
            label="Pickup time"
            required
            value={value.time}
            onChange={(time) => patch({ time })}
            caption="Today"
            hint="Live calls are held for 10 minutes while we match a driver."
          />
        </Reveal>
      ) : (
        <Reveal key="scheduled" style={[styles.row, twoUp ? styles.rowWide : null, styles.branch]}>
          <DateField
            style={styles.field}
            label="Pickup date"
            required
            value={value.date}
            onChange={(date) => patch({ date })}
            today={today}
          />
          <TimeField
            style={styles.field}
            label="Pickup time"
            required
            value={value.time}
            onChange={(time) => patch({ time })}
          />
        </Reveal>
      )}

      <Summary value={value} today={today} />
    </View>
  );
}

/** Restates the choice in one line, so the ride reads back before booking. */
function Summary({ value, today }: { value: PassengerRideInfoValue; today: Date }) {
  const name = [value.firstName.trim(), value.lastName.trim()].filter(Boolean).join(' ');
  const passenger = name.length > 0 ? name : 'Passenger';

  const detail = value.isLive
    ? `Live call · ready now, pickup by ${formatTime(value.time)}`
    : `${formatRelativeDate(value.date, today)} at ${formatTime(value.time)}`;

  return (
    <View style={[styles.summary, value.isLive ? styles.summaryLive : null]}>
      <View style={[styles.summaryIcon, value.isLive ? styles.summaryIconLive : null]}>
        {value.isLive ? (
          <ClockGlyph color={colors.accent} size={16} />
        ) : (
          <CalendarGlyph color={colors.info} size={16} />
        )}
      </View>
      <View style={styles.summaryText}>
        <Text style={styles.summaryTitle} numberOfLines={1}>
          {passenger}
        </Text>
        <Text style={styles.summaryDetail} numberOfLines={2}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  row: { gap: space.lg },
  rowWide: { flexDirection: 'row' },
  field: { flex: 1 },
  branch: { marginTop: -space.xs },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radii.lg,
    padding: space.md,
  },
  summaryLive: { backgroundColor: colors.accentSubtle, borderColor: colors.warningBorder },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconLive: { backgroundColor: colors.surface },
  summaryText: { flex: 1 },
  summaryTitle: { color: colors.textStrong, fontSize: 14, fontWeight: '700' },
  summaryDetail: { color: colors.textBody, fontSize: 13, lineHeight: 18, marginTop: 1 },
});
