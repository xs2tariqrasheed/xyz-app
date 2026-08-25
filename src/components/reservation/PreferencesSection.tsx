import { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import {
  CAR_TYPES,
  findCarType,
  type CarTypeId,
} from "@/components/reservation/carTypes";
import { CarGlyph } from "@/components/ui/CarGlyph";
import { CheckboxCard } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { OptionCards } from "@/components/ui/OptionCards";
import { PhoneField, type PhoneValue } from "@/components/ui/PhoneField";
import { Stepper } from "@/components/ui/Stepper";
import { TextField } from "@/components/ui/TextField";
import { breakpoints, colors, radii, space } from "@/theme";
import {
  findCountry,
  formatIntlPhone,
  formatUsPhone,
  isCompleteUsPhone,
  isValidEmail,
} from "@/utils/phone";

/** Everything section 4 collects. */
export type PreferencesValue = {
  carType: CarTypeId;
  /** "Confirmation by phone" — we ring the callback number before pickup. */
  confirmByPhone: boolean;
  callbackUs: PhoneValue;
  callbackIntl: PhoneValue;
  email: string;
  passengers: number;
  stops: number;
};

export const MIN_PASSENGERS = 1;
export const MAX_PASSENGERS = 15;
export const MAX_STOPS = 8;

export function emptyPreferences(carType: CarTypeId): PreferencesValue {
  return {
    carType,
    confirmByPhone: false,
    callbackUs: { country: null, number: "", ext: "" },
    callbackIntl: { country: null, number: "", ext: "" },
    email: "",
    passengers: 1,
    stops: 0,
  };
}

export type PreferencesSectionProps = {
  value: PreferencesValue;
  onChange: (next: PreferencesValue) => void;
};

export function PreferencesSection({
  value,
  onChange,
}: PreferencesSectionProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;

  // Errors wait for the field to be left, so nothing reddens mid-keystroke.
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const patch = (next: Partial<PreferencesValue>) =>
    onChange({ ...value, ...next });

  const car = findCarType(value.carType);
  const overCapacity = value.passengers > car.seats;

  const emailError =
    emailTouched && value.email.trim().length > 0 && !isValidEmail(value.email)
      ? "Enter an email address in the form name@example.com."
      : undefined;

  const usPhoneError = phoneTouched ? checkUsPhone(value) : undefined;

  return (
    <View style={styles.root}>
      <OptionCards
        label="Car type"
        required
        options={CAR_TYPES.map((type) => ({
          value: type.id,
          label: type.label,
          caption: type.caption,
          renderIcon: (selected: boolean) => (
            <CarGlyph
              variant={type.id}
              size={44}
              color={selected ? colors.primary[600] : colors.textMuted}
            />
          ),
        }))}
        value={value.carType}
        onChange={(carType) => patch({ carType })}
      />

      <Field label="Confirmation by">
        <CheckboxCard
          checked={value.confirmByPhone}
          onChange={(confirmByPhone) => patch({ confirmByPhone })}
          label="Phone"
        />
      </Field>

      <PhoneField
        label="Callback phone (US)"
        variant="us"
        required={value.confirmByPhone}
        value={value.callbackUs}
        onChange={(callbackUs) => patch({ callbackUs })}
        onBlur={() => setPhoneTouched(true)}
        error={usPhoneError}
      />

      <PhoneField
        label="Callback phone (international)"
        variant="international"
        value={value.callbackIntl}
        onChange={(callbackIntl) => patch({ callbackIntl })}
      />

      <TextField
        label="Email"
        required
        value={value.email}
        onChangeText={(email) => patch({ email })}
        onBlur={() => setEmailTouched(true)}
        error={emailError}
        placeholder="name@example.com"
        keyboardType="email-address"
        inputMode="email"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <Stepper
          style={styles.field}
          label="No. of passengers"
          required
          value={value.passengers}
          onChange={(passengers) => patch({ passengers })}
          min={MIN_PASSENGERS}
          max={MAX_PASSENGERS}
          unit={(count) => (count === 1 ? "passenger" : "passengers")}
        />
        <Stepper
          style={styles.field}
          label="No. of stops"
          value={value.stops}
          onChange={(stops) => patch({ stops })}
          min={0}
          max={MAX_STOPS}
          unit={(count) => (count === 1 ? "stop" : "stops")}
        />
      </View>

      <Summary value={value} />
    </View>
  );
}

/** Only ever consulted once the field has been left, so it can be blunt. */
function checkUsPhone(value: PreferencesValue): string | undefined {
  const { number } = value.callbackUs;

  if (number.length === 0) {
    return value.confirmByPhone
      ? "Add a number we can call, or turn phone confirmation off."
      : undefined;
  }

  return isCompleteUsPhone(number)
    ? undefined
    : "A US number needs all 10 digits, area code first.";
}

/** Restates the choices in two lines, the way section 1 reads its ride back. */
function Summary({ value }: { value: PreferencesValue }) {
  const car = findCarType(value.carType);

  const ride = [
    car.label,
    `${value.passengers} ${value.passengers === 1 ? "passenger" : "passengers"}`,
    value.stops === 0
      ? "no extra stops"
      : `${value.stops} ${value.stops === 1 ? "stop" : "stops"}`,
    value.confirmByPhone ? "confirm by phone" : "confirm by email",
  ].join(" · ");

  const contact = [
    describePhone(value.callbackUs, "us"),
    describePhone(value.callbackIntl, "intl"),
    value.email.trim(),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.summary}>
      <View style={styles.summaryIcon}>
        <CarGlyph variant={car.id} size={26} color={colors.info} />
      </View>
      <View style={styles.summaryText}>
        <Text style={styles.summaryTitle} numberOfLines={2}>
          {ride}
        </Text>
        <Text style={styles.summaryDetail} numberOfLines={2}>
          {contact.length > 0 ? contact : "No contact details yet."}
        </Text>
      </View>
    </View>
  );
}

function describePhone(phone: PhoneValue, variant: "us" | "intl"): string {
  if (phone.number.length === 0) return "";

  const country = findCountry(phone.country);
  const dial = variant === "us" ? "+1 " : country ? `+${country.dial} ` : "";
  const number =
    variant === "us"
      ? formatUsPhone(phone.number)
      : formatIntlPhone(phone.number);
  const ext = phone.ext.length > 0 ? ` ext ${phone.ext}` : "";

  return `${dial}${number}${ext}`;
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  row: { gap: space.lg },
  rowWide: { flexDirection: "row" },
  field: { flex: 1 },

  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radii.lg,
    padding: space.md,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryText: { flex: 1 },
  summaryTitle: { color: colors.textStrong, fontSize: 14, fontWeight: "700" },
  summaryDetail: {
    color: colors.textBody,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
});
