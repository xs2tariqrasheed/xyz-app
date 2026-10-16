import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { PhoneField, type PhoneValue } from '@/components/ui/PhoneField';
import { TextField } from '@/components/ui/TextField';
import { PROFILE_MESSAGES } from '@/constants/messages';
import { breakpoints, space } from '@/theme';
import { isCompleteUsPhone, toIntlDigits } from '@/utils/phone';

/** Everything the personal info panel edits. */
export type PersonalInfoValue = {
  firstName: string;
  lastName: string;
  /** Domestic callback number, pinned to +1. */
  usPhone: PhoneValue;
  intlPhone: PhoneValue;
  fax: PhoneValue;
};

export type PersonalInfoField = 'firstName' | 'lastName' | 'usPhone' | 'intlPhone' | 'fax';
export type PersonalInfoErrors = Partial<Record<PersonalInfoField, string>>;

const EMPTY_PHONE: PhoneValue = { country: null, number: '', ext: '' };

export const EMPTY_PERSONAL_INFO: PersonalInfoValue = {
  firstName: '',
  lastName: '',
  usPhone: EMPTY_PHONE,
  intlPhone: EMPTY_PHONE,
  fax: EMPTY_PHONE,
};

/** Column limits and rules from reverse-engineer-implemented/guide/07-profile-personal-info.md. */
const FIRST_NAME_MAX = 15;
const LAST_NAME_MIN = 2;
const LAST_NAME_MAX = 20;
const MAX_EXT_DIGITS = 5;
/** Shortest local part we accept as a real international number. */
const MIN_INTL_NUMBER_DIGITS = 4;
/** Shortest calling code + number we accept as a whole international number. */
const MIN_INTL_TOTAL_DIGITS = 7;
/** Names are free text, except for digits and the quote the server cannot store. */
const NAME_INVALID = /["\d]/;

type IntlMessages = { country: string; incomplete: string };

/** An international number is only whole once it has a country and a number. */
function intlProblem(phone: PhoneValue, messages: IntlMessages): string | undefined {
  if (phone.number.length === 0 && phone.country === null) return undefined;
  if (phone.country === null) return messages.country;
  if (
    phone.number.length < MIN_INTL_NUMBER_DIGITS ||
    toIntlDigits(phone).length < MIN_INTL_TOTAL_DIGITS
  ) {
    return messages.incomplete;
  }
  return undefined;
}

function firstNameProblem(name: string, required: boolean): string | undefined {
  if (name.length === 0) return required ? PROFILE_MESSAGES.FIRST_NAME_REQUIRED : undefined;
  if (name.length > FIRST_NAME_MAX) return PROFILE_MESSAGES.FIRST_NAME_TOO_LONG;
  if (NAME_INVALID.test(name)) return PROFILE_MESSAGES.FIRST_NAME_INVALID;
  return undefined;
}

function lastNameProblem(name: string): string | undefined {
  if (name.length === 0) return PROFILE_MESSAGES.LAST_NAME_REQUIRED;
  if (name.length < LAST_NAME_MIN || name.length > LAST_NAME_MAX) {
    return PROFILE_MESSAGES.LAST_NAME_LENGTH;
  }
  if (NAME_INVALID.test(name)) return PROFILE_MESSAGES.LAST_NAME_INVALID;
  return undefined;
}

export type ValidatePersonalInfoOptions = {
  /** The profile treats the first name as optional; registration asks for it. Defaults to true. */
  firstNameRequired?: boolean;
};

/** Checks the panel as a whole. */
export function validatePersonalInfo(
  value: PersonalInfoValue,
  { firstNameRequired = true }: ValidatePersonalInfoOptions = {},
): PersonalInfoErrors {
  const errors: PersonalInfoErrors = {};

  const firstNameError = firstNameProblem(value.firstName.trim(), firstNameRequired);
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = lastNameProblem(value.lastName.trim());
  if (lastNameError) errors.lastName = lastNameError;

  const hasUs = value.usPhone.number.length > 0;
  const hasIntl = value.intlPhone.number.length > 0 || value.intlPhone.country !== null;

  // A US area code never starts with 0 or 1.
  if (hasUs && (!isCompleteUsPhone(value.usPhone.number) || /^[01]/.test(value.usPhone.number))) {
    errors.usPhone = PROFILE_MESSAGES.US_PHONE_INVALID;
  }

  const intlError = intlProblem(value.intlPhone, {
    country: PROFILE_MESSAGES.INTL_COUNTRY_REQUIRED,
    incomplete: PROFILE_MESSAGES.INTL_NUMBER_INCOMPLETE,
  });
  if (intlError) errors.intlPhone = intlError;

  // A callback number is the whole point of the panel: a driver who cannot
  // find you has to be able to ring someone.
  if (!hasUs && !hasIntl) {
    errors.usPhone = PROFILE_MESSAGES.CALLBACK_REQUIRED;
  }

  const faxError = intlProblem(value.fax, {
    country: PROFILE_MESSAGES.FAX_COUNTRY_REQUIRED,
    incomplete: PROFILE_MESSAGES.FAX_NUMBER_INCOMPLETE,
  });
  if (faxError) errors.fax = faxError;

  // An over-long extension is the least of a field's problems, so it only
  // speaks when nothing else has.
  (['usPhone', 'intlPhone', 'fax'] as const).forEach((field) => {
    if (!errors[field] && value[field].ext.length > MAX_EXT_DIGITS) {
      errors[field] = PROFILE_MESSAGES.EXT_TOO_LONG;
    }
  });

  return errors;
}

function isSamePhone(a: PhoneValue, b: PhoneValue): boolean {
  return a.country === b.country && a.number === b.number && a.ext === b.ext;
}

export function isSamePersonalInfo(a: PersonalInfoValue, b: PersonalInfoValue): boolean {
  return (
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    isSamePhone(a.usPhone, b.usPhone) &&
    isSamePhone(a.intlPhone, b.intlPhone) &&
    isSamePhone(a.fax, b.fax)
  );
}

export type PersonalInfoSectionProps = {
  value: PersonalInfoValue;
  onChange: (next: PersonalInfoValue) => void;
  errors?: PersonalInfoErrors;
  /** Off where the fax is saved without an extension. Defaults to on. */
  faxExtension?: boolean;
  /** Marks the first name as required. Match the `validatePersonalInfo` option. Defaults to on. */
  firstNameRequired?: boolean;
};

export function PersonalInfoSection({
  value,
  onChange,
  errors = {},
  faxExtension = true,
  firstNameRequired = true,
}: PersonalInfoSectionProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;

  const patch = (next: Partial<PersonalInfoValue>) => onChange({ ...value, ...next });

  return (
    <View style={styles.root}>
      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label={PROFILE_MESSAGES.FIRST_NAME_LABEL}
          required={firstNameRequired}
          value={value.firstName}
          onChangeText={(firstName) => patch({ firstName })}
          error={errors.firstName}
          placeholder={PROFILE_MESSAGES.FIRST_NAME_PLACEHOLDER}
          maxLength={FIRST_NAME_MAX}
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextField
          style={styles.field}
          label={PROFILE_MESSAGES.LAST_NAME_LABEL}
          required
          value={value.lastName}
          onChangeText={(lastName) => patch({ lastName })}
          error={errors.lastName}
          placeholder={PROFILE_MESSAGES.LAST_NAME_PLACEHOLDER}
          maxLength={LAST_NAME_MAX}
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>

      <PhoneField
        label={PROFILE_MESSAGES.US_PHONE_LABEL}
        variant="us"
        value={value.usPhone}
        onChange={(usPhone) => patch({ usPhone })}
        error={errors.usPhone}
      />

      <PhoneField
        label={PROFILE_MESSAGES.INTL_PHONE_LABEL}
        variant="international"
        value={value.intlPhone}
        onChange={(intlPhone) => patch({ intlPhone })}
        error={errors.intlPhone}
      />

      <PhoneField
        label={PROFILE_MESSAGES.FAX_LABEL}
        variant="international"
        value={value.fax}
        onChange={(fax) => patch({ fax })}
        error={errors.fax}
        withExtension={faxExtension}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  row: { gap: space.lg },
  rowWide: { flexDirection: 'row' },
  field: { flex: 1 },
});
