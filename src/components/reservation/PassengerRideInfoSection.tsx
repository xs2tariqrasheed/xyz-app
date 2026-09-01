import { StyleSheet, useWindowDimensions, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { CheckboxCard } from "@/components/ui/Checkbox";
import { DateField } from "@/components/ui/DateField";
import { Reveal } from "@/components/ui/Reveal";
import { TextField } from "@/components/ui/TextField";
import { TimeField } from "@/components/ui/TimeField";
import { breakpoints, space } from "@/theme";
import { type TimeValue } from "@/utils/datetime";

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
});
