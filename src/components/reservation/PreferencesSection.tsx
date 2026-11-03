import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { carGlyphFor } from "@/components/reservation/carTypes";
import { Button } from "@/components/ui/Button";
import { CarGlyph } from "@/components/ui/CarGlyph";
import { CheckboxCard } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { OptionCards } from "@/components/ui/OptionCards";
import { PhoneField, type PhoneValue } from "@/components/ui/PhoneField";
import { Stepper } from "@/components/ui/Stepper";
import { TextField } from "@/components/ui/TextField";
import { RESERVATION_MESSAGES } from "@/constants/messages";
import { findVehicleType, type VehicleType } from "@/services/vehicleTypes";
import { breakpoints, colors, radii, space } from "@/theme";
import { findCountry, formatIntlPhone, formatUsPhone } from "@/utils/phone";

/** Everything section 4 collects. */
export type PreferencesValue = {
  /** `P_CAR_TYPE` — a code from `RES.S.VEHICLE_TYPE`; '' until one is chosen. */
  carType: string;
  /** "Confirmation by phone" — we ring the callback number before pickup. */
  confirmByPhone: boolean;
  callbackUs: PhoneValue;
  callbackIntl: PhoneValue;
  email: string;
  /** Extra confirmation recipients, comma-separated (guide 17, ≤ 500 characters). */
  ccEmails: string;
  passengers: number;
  stops: number;
  /**
   * `P_RIDE_PURPOSE`. Required: the gateway refuses a booking without it
   * (`ORA-01400`, docs/XYZ_INTEGRATION_GUIDE.md §10).
   */
  ridePurpose: string;
};

/** Limits from the old booking form (guide 17). */
export const MIN_PASSENGERS = 1;
export const MAX_PASSENGERS = 4;
export const MAX_STOPS = 4;
export const CC_EMAILS_MAX_LENGTH = 500;
/** Longest trip purpose the form takes (`P_RIDE_PURPOSE`). */
export const RIDE_PURPOSE_MAX = 50;

export function emptyPreferences(carType = ""): PreferencesValue {
  return {
    carType,
    confirmByPhone: false,
    callbackUs: { country: null, number: "", ext: "" },
    callbackIntl: { country: null, number: "", ext: "" },
    email: "",
    ccEmails: "",
    passengers: 1,
    stops: 0,
    ridePurpose: "",
  };
}

export type PreferencesField =
  | "carType"
  | "passengers"
  | "callbackUs"
  | "callbackIntl"
  | "email"
  | "ccEmails"
  | "ridePurpose";
export type PreferencesErrors = Partial<Record<PreferencesField, string>>;

/** A gateway lookup as the section needs it: the rows plus whether they arrived. */
export type LookupState<T> = {
  items: readonly T[];
  loading: boolean;
  failed: boolean;
  retry?: () => void;
};

export type PreferencesSectionProps = {
  value: PreferencesValue;
  onChange: (next: PreferencesValue) => void;
  /** `RES.S.VEHICLE_TYPE`. */
  vehicleTypes: LookupState<VehicleType>;
  /** E-mail contacts on the profile, offered for the CC list. */
  emailContacts?: readonly string[];
  /** Phone contacts on the profile, offered for the US callback number. */
  phoneContacts?: readonly string[];
  errors?: PreferencesErrors;
};

export function PreferencesSection({
  value,
  onChange,
  vehicleTypes,
  emailContacts = [],
  phoneContacts = [],
  errors = {},
}: PreferencesSectionProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;

  const patch = (next: Partial<PreferencesValue>) =>
    onChange({ ...value, ...next });

  const car = findVehicleType(vehicleTypes.items, value.carType);
  const ccList = value.ccEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const unusedEmails = emailContacts.filter((email) => !ccList.includes(email.toLowerCase()));
  const unusedPhones = phoneContacts.filter((phone) => phone !== value.callbackUs.number);

  return (
    <View style={styles.root}>
      <CarTypePicker
        value={value.carType}
        onChange={(carType) => patch({ carType })}
        lookup={vehicleTypes}
        error={errors.carType}
      />

      {car?.callToBook ? (
        <Text style={styles.warning}>{RESERVATION_MESSAGES.PREMIUM_WHEELCHAIR}</Text>
      ) : null}

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
        error={errors.callbackUs}
      />
      {unusedPhones.length > 0 ? (
        <ContactChips
          values={unusedPhones}
          format={formatUsPhone}
          onPick={(number) => patch({ callbackUs: { country: null, number, ext: "" } })}
        />
      ) : null}

      <PhoneField
        label="Callback phone (international)"
        variant="international"
        value={value.callbackIntl}
        onChange={(callbackIntl) => patch({ callbackIntl })}
        error={errors.callbackIntl}
      />

      <TextField
        label="Email"
        required
        value={value.email}
        onChangeText={(email) => patch({ email })}
        error={errors.email}
        placeholder="name@example.com"
        keyboardType="email-address"
        inputMode="email"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={50}
      />

      <TextField
        label={RESERVATION_MESSAGES.CC_EMAIL_LABEL}
        value={value.ccEmails}
        onChangeText={(ccEmails) => patch({ ccEmails })}
        error={errors.ccEmails}
        placeholder={RESERVATION_MESSAGES.CC_EMAIL_PLACEHOLDER}
        keyboardType="email-address"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={CC_EMAILS_MAX_LENGTH}
      />
      {unusedEmails.length > 0 ? (
        <ContactChips
          values={unusedEmails}
          onPick={(email) =>
            patch({ ccEmails: [value.ccEmails.trim(), email].filter(Boolean).join(", ") })
          }
        />
      ) : null}

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
      {errors.passengers ? <Text style={styles.error}>{errors.passengers}</Text> : null}

      <TextField
        label={RESERVATION_MESSAGES.RIDE_PURPOSE_LABEL}
        required
        value={value.ridePurpose}
        onChangeText={(ridePurpose) => patch({ ridePurpose })}
        placeholder={RESERVATION_MESSAGES.RIDE_PURPOSE_PLACEHOLDER}
        maxLength={RIDE_PURPOSE_MAX}
        error={errors.ridePurpose}
      />

      <Summary value={value} car={car} />
    </View>
  );
}

/** The car-type tiles, with their own loading, failed and empty states. */
function CarTypePicker({
  value,
  onChange,
  lookup,
  error,
}: {
  value: string;
  onChange: (code: string) => void;
  lookup: LookupState<VehicleType>;
  error?: string;
}) {
  if (lookup.loading && lookup.items.length === 0) {
    return (
      <Field label={RESERVATION_MESSAGES.CAR_TYPE_LABEL} required>
        <ActivityIndicator color={colors.primary[600]} style={styles.loading} />
      </Field>
    );
  }

  if (lookup.items.length === 0) {
    return (
      <Field
        label={RESERVATION_MESSAGES.CAR_TYPE_LABEL}
        required
        error={lookup.failed ? RESERVATION_MESSAGES.CAR_TYPES_FAILED : RESERVATION_MESSAGES.CAR_TYPES_EMPTY}
      >
        {lookup.failed && lookup.retry ? (
          <Button label={RESERVATION_MESSAGES.RETRY} variant="outline" onPress={lookup.retry} style={styles.retry} />
        ) : null}
      </Field>
    );
  }

  return (
    <OptionCards
      label={RESERVATION_MESSAGES.CAR_TYPE_LABEL}
      required
      error={error}
      options={lookup.items.map((type) => ({
        value: type.code,
        label: type.label,
        renderIcon: (selected: boolean) => (
          <CarGlyph
            variant={carGlyphFor(type)}
            size={44}
            color={selected ? colors.primary[600] : colors.textMuted}
          />
        ),
      }))}
      value={value}
      onChange={onChange}
    />
  );
}

/** One-tap fills from the profile's saved contacts. */
function ContactChips({
  values,
  format = (value: string) => value,
  onPick,
}: {
  values: readonly string[];
  format?: (value: string) => string;
  onPick: (value: string) => void;
}) {
  return (
    <View style={styles.chips}>
      <Text style={styles.chipsLabel}>{RESERVATION_MESSAGES.FROM_CONTACTS}</Text>
      {values.map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={format(value)}
          onPress={() => onPick(value)}
          style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
        >
          <Text style={styles.chipText}>{format(value)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Restates the choices in two lines, the way section 1 reads its ride back. */
function Summary({ value, car }: { value: PreferencesValue; car: VehicleType | undefined }) {
  const ride = [
    car?.label ?? "",
    `${value.passengers} ${value.passengers === 1 ? "passenger" : "passengers"}`,
    value.stops === 0
      ? "no extra stops"
      : `${value.stops} ${value.stops === 1 ? "stop" : "stops"}`,
    value.confirmByPhone ? "confirm by phone" : "confirm by email",
  ]
    .filter(Boolean)
    .join(" · ");

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
        <CarGlyph variant={carGlyphFor(car)} size={26} color={colors.info} />
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
  loading: { alignSelf: "flex-start", paddingVertical: space.md },
  retry: { alignSelf: "flex-start" },
  warning: { color: colors.warning, fontSize: 13, fontWeight: "600", marginTop: -space.sm },
  error: { color: colors.danger, fontSize: 13, fontWeight: "500", marginTop: -space.sm },

  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm, marginTop: -space.sm },
  chipsLabel: { color: colors.textMuted, fontSize: 12 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  chipPressed: { backgroundColor: colors.surfaceSelected },
  chipText: { color: colors.textLink, fontSize: 12, fontWeight: "600" },

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
