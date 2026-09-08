import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { PhoneField, type PhoneValue } from '@/components/ui/PhoneField';
import { TextField } from '@/components/ui/TextField';
import { breakpoints, space } from '@/theme';
import { isCompleteUsPhone } from '@/utils/phone';

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

/** Shortest run of digits we will accept as a real international number. */
const MIN_INTL_DIGITS = 4;

/** An international number is only whole once it has a country and a number. */
function intlProblem(phone: PhoneValue, what: string): string | undefined {
  if (phone.number.length === 0 && phone.country === null) return undefined;
  if (phone.country === null) return `Choose the country for the ${what}.`;
  if (phone.number.length < MIN_INTL_DIGITS) return `Add the full ${what}.`;
  return undefined;
}

/** Checks the panel as a whole. */
export function validatePersonalInfo(value: PersonalInfoValue): PersonalInfoErrors {
  const errors: PersonalInfoErrors = {};

  if (value.firstName.trim().length === 0) errors.firstName = 'Enter your first name.';
  if (value.lastName.trim().length === 0) errors.lastName = 'Enter your last name.';

  const hasUs = value.usPhone.number.length > 0;
  const hasIntl = value.intlPhone.number.length > 0 || value.intlPhone.country !== null;

  if (hasUs && !isCompleteUsPhone(value.usPhone.number)) {
    errors.usPhone = 'A US number needs 10 digits, area code first.';
  }

  const intlError = intlProblem(value.intlPhone, 'international number');
  if (intlError) errors.intlPhone = intlError;

  // A callback number is the whole point of the panel: a driver who cannot
  // find you has to be able to ring someone.
  if (!hasUs && !hasIntl) {
    errors.usPhone = 'Add a callback number — US or international.';
  }

  const faxError = intlProblem(value.fax, 'fax number');
  if (faxError) errors.fax = faxError;

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
};

export function PersonalInfoSection({ value, onChange, errors = {} }: PersonalInfoSectionProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;

  const patch = (next: Partial<PersonalInfoValue>) => onChange({ ...value, ...next });

  return (
    <View style={styles.root}>
      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label="First name"
          required
          value={value.firstName}
          onChangeText={(firstName) => patch({ firstName })}
          error={errors.firstName}
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
          error={errors.lastName}
          placeholder="e.g. Okafor"
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>

      <PhoneField
        label="Callback phone (US)"
        variant="us"
        value={value.usPhone}
        onChange={(usPhone) => patch({ usPhone })}
        error={errors.usPhone}
      />

      <PhoneField
        label="Callback phone (international)"
        variant="international"
        value={value.intlPhone}
        onChange={(intlPhone) => patch({ intlPhone })}
        error={errors.intlPhone}
      />

      <PhoneField
        label="Fax"
        variant="international"
        value={value.fax}
        onChange={(fax) => patch({ fax })}
        error={errors.fax}
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
