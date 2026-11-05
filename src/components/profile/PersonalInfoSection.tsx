import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { PhoneField, type PhoneValue } from '@/components/ui/PhoneField';
import { TextField } from '@/components/ui/TextField';
import { FIELD_LIMITS } from '@/constants/fieldLimits';
import { PROFILE_MESSAGES, VALIDATION_MESSAGES as V } from '@/constants/messages';
import { breakpoints, space } from '@/theme';
import { findCountry } from '@/utils/phone';
import { intlPhoneProblem, isValidExtension, isValidNameChars, isValidUsPhone } from '@/utils/validation';

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

type IntlMessages = { country: string; incomplete: string };

/** An international number is only whole once it has a country and a number. */
function intlProblem(phone: PhoneValue, messages: IntlMessages): string | undefined {
  const problem = intlPhoneProblem(findCountry(phone.country)?.dial ?? '', phone.number);
  if (problem === 'codeRequired') return messages.country;
  return problem ? messages.incomplete : undefined;
}

function firstNameProblem(name: string, required: boolean): string | undefined {
  if (name.length === 0) return required ? PROFILE_MESSAGES.FIRST_NAME_REQUIRED : undefined;
  if (name.length > FIELD_LIMITS.FIRST_NAME) return V.FIRST_NAME_TOO_LONG;
  if (!isValidNameChars(name)) return V.NAME_INVALID;
  return undefined;
}

function lastNameProblem(name: string): string | undefined {
  if (name.length === 0) return PROFILE_MESSAGES.LAST_NAME_REQUIRED;
  if (name.length < FIELD_LIMITS.LAST_NAME_MIN || name.length > FIELD_LIMITS.LAST_NAME) {
    return V.LAST_NAME_LENGTH;
  }
  if (!isValidNameChars(name)) return V.NAME_INVALID;
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

  if (hasUs && !isValidUsPhone(value.usPhone.number)) errors.usPhone = V.US_PHONE_INVALID;

  const intlError = intlProblem(value.intlPhone, {
    country: PROFILE_MESSAGES.INTL_COUNTRY_REQUIRED,
    incomplete: V.INTL_NUMBER_INCOMPLETE,
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
    if (!errors[field] && value[field].ext && !isValidExtension(value[field].ext)) {
      errors[field] = V.EXTENSION_INVALID;
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
          maxLength={FIELD_LIMITS.FIRST_NAME}
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
          maxLength={FIELD_LIMITS.LAST_NAME}
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
