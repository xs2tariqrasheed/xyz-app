import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { CheckboxCard } from "@/components/ui/Checkbox";
import { DateField } from "@/components/ui/DateField";
import { ClockGlyph } from "@/components/ui/Glyph";
import { Reveal } from "@/components/ui/Reveal";
import { TextField } from "@/components/ui/TextField";
import { TimeField } from "@/components/ui/TimeField";
import { breakpoints, colors, space } from "@/theme";
import { formatFullDate, formatTime, type TimeValue } from "@/utils/datetime";

/** Everything section 1 collects. */
export type PassengerRideInfoValue = {
  firstName: string;
  lastName: string;
  /** "I'm ready now" — a live call, fulfilled immediately. */
  isLive: boolean;
  /** Only meaningful for a future reservation. */
  date: Date;
  time: TimeValue;
  /** Only meaningful for a live call — always today. */
  estimatedTime: TimeValue;
};

export type PassengerRideInfoSectionProps = {
  value: PassengerRideInfoValue;
  onChange: (next: PassengerRideInfoValue) => void;
  today: Date;
};

export function PassengerRideInfoSection({
  value,
  onChange,
  today,
}: PassengerRideInfoSectionProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;

  const patch = (next: Partial<PassengerRideInfoValue>) =>
    onChange({ ...value, ...next });

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
        description=""
        badge={<Badge label="LIVE CALL" tone="accent" pulse={value.isLive} />}
        trailing={
          value.isLive ? (
            <View
              style={styles.eta}
              accessible
              accessibilityLabel={`Estimated pickup time: ${formatTime(value.estimatedTime)}, today`}
            >
              <View style={styles.etaTime}>
                <ClockGlyph color={colors.accent} />
                <Text style={styles.etaValue}>{formatTime(value.estimatedTime)}</Text>
              </View>
              <Text style={styles.etaCaption}>Today · {formatFullDate(today)}</Text>
            </View>
          ) : null
        }
      />

      {value.isLive ? null : (
        <Reveal
          key="scheduled"
          style={[styles.row, twoUp ? styles.rowWide : null, styles.branch]}
        >
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  row: { gap: space.lg },
  rowWide: { flexDirection: "row" },
  field: { flex: 1 },
  branch: { marginTop: -space.xs },
  eta: { alignItems: "flex-end", gap: 2 },
  etaTime: { flexDirection: "row", alignItems: "center", gap: space.xs },
  etaValue: { color: colors.textStrong, fontSize: 15, fontWeight: "600" },
  etaCaption: { color: colors.textMuted, fontSize: 12 },
});
