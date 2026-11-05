import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { CheckboxCard } from "@/components/ui/Checkbox";
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { RESERVATION_MESSAGES } from "@/constants/messages";
import { DateField } from "@/components/ui/DateField";
import { ClockGlyph } from "@/components/ui/Glyph";
import { Reveal } from "@/components/ui/Reveal";
import { TextField } from "@/components/ui/TextField";
import { TimeField } from "@/components/ui/TimeField";
import { latestBookableDay } from "@/services/reservation";
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
  /**
   * Login of the profile this ride is booked for, '' for the signed-in
   * customer themselves (`P_LOGIN_ID_RESERVATION_MAKE_FOR`).
   */
  bookingFor: string;
};

export type PassengerRideInfoField = "firstName" | "lastName" | "date" | "time";
export type PassengerRideInfoErrors = Partial<Record<PassengerRideInfoField, string>>;

export type PassengerRideInfoSectionProps = {
  value: PassengerRideInfoValue;
  onChange: (next: PassengerRideInfoValue) => void;
  today: Date;
  /**
   * Profiles that let this customer book on their behalf. The picker only
   * appears when there is someone to choose — otherwise it is noise.
   */
  bookingForOptions?: readonly SelectOption<string>[];
  errors?: PassengerRideInfoErrors;
};

export function PassengerRideInfoSection({
  value,
  onChange,
  today,
  bookingForOptions = [],
  errors = {},
}: PassengerRideInfoSectionProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;

  const patch = (next: Partial<PassengerRideInfoValue>) =>
    onChange({ ...value, ...next });

  return (
    <View style={styles.root}>
      {bookingForOptions.length > 0 ? (
        <SelectField
          label={RESERVATION_MESSAGES.BOOKING_FOR_LABEL}
          value={value.bookingFor}
          options={[{ value: "", label: RESERVATION_MESSAGES.BOOKING_FOR_SELF }, ...bookingForOptions]}
          onChange={(bookingFor) => patch({ bookingFor })}
        />
      ) : null}

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label="First name"
          error={errors.firstName}
          maxLength={FIELD_LIMITS.FIRST_NAME}
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
          error={errors.lastName}
          maxLength={FIELD_LIMITS.LAST_NAME}
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
        badge={<Badge label={RESERVATION_MESSAGES.LIVE_BADGE} tone="accent" pulse={value.isLive} />}
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
            maxDate={latestBookableDay(today)}
            error={errors.date}
          />
          <TimeField
            style={styles.field}
            label="Pickup time"
            required
            value={value.time}
            onChange={(time) => patch({ time })}
            error={errors.time}
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
