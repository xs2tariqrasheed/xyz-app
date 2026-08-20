import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { TextField } from '@/components/ui/TextField';
import { breakpoints, space } from '@/theme';
import {
  digitsOnly,
  formatSubscriber,
  formatUsPhone,
  hasDigits,
  isCompleteSubscriber,
  isCompleteUsPhone,
  MAX_CODE_LENGTH,
  MAX_EXTENSION_LENGTH,
} from '@/utils/phone';

import { PhoneField } from './PhoneField';

/** Everything the personal info panel edits. */
export type PersonalInfoValue = {
  firstName: string;
  lastName: string;
  /** Domestic callback number, held formatted as typed. */
  usPhone: string;
  usPhoneExt: string;
  /** Country + city code for the international callback number. */
  intlCode: string;
  intlPhone: string;
  intlPhoneExt: string;
  faxCode: string;
  faxNumber: string;
};

export type PersonalInfoField = keyof PersonalInfoValue;
export type PersonalInfoErrors = Partial<Record<PersonalInfoField, string>>;

export const EMPTY_PERSONAL_INFO: PersonalInfoValue = {
  firstName: '',
  lastName: '',
  usPhone: '',
  usPhoneExt: '',
  intlCode: '',
  intlPhone: '',
  intlPhoneExt: '',
  faxCode: '',
  faxNumber: '',
};

/**
 * Checks the panel as a whole.
 *
 * A number is only half-entered when one of its two boxes is filled, so the
 * code and the subscriber number are validated as a pair rather than alone.
 */
export function validatePersonalInfo(value: PersonalInfoValue): PersonalInfoErrors {
  const errors: PersonalInfoErrors = {};

  if (value.firstName.trim().length === 0) errors.firstName = 'Enter your first name.';
  if (value.lastName.trim().length === 0) errors.lastName = 'Enter your last name.';

  const hasUs = hasDigits(value.usPhone);
  const hasIntl = hasDigits(value.intlCode) || hasDigits(value.intlPhone);

  if (hasUs && !isCompleteUsPhone(value.usPhone)) {
    errors.usPhone = 'A US number needs 10 digits, area code first.';
  }

  if (hasIntl) {
    if (!hasDigits(value.intlCode)) errors.intlCode = 'Add the country and city code.';
    else if (!isCompleteSubscriber(value.intlPhone)) errors.intlPhone = 'Add the full number.';
  }

  // A callback number is the whole point of the panel: a driver who cannot
  // find you has to be able to ring someone.
  if (!hasUs && !hasIntl) {
    errors.usPhone = 'Add a callback number — US or international.';
  }

  const hasFax = hasDigits(value.faxCode) || hasDigits(value.faxNumber);
  if (hasFax) {
    if (!hasDigits(value.faxCode)) errors.faxCode = 'Add the fax country and city code.';
    else if (!isCompleteSubscriber(value.faxNumber)) errors.faxNumber = 'Add the full fax number.';
  }

  return errors;
}

export function isSamePersonalInfo(a: PersonalInfoValue, b: PersonalInfoValue): boolean {
  return (Object.keys(EMPTY_PERSONAL_INFO) as PersonalInfoField[]).every((key) => a[key] === b[key]);
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
        hint="The number a driver rings on the day of the ride."
        error={errors.usPhone}
        number={{
          value: value.usPhone,
          onChangeText: (usPhone) => patch({ usPhone: formatUsPhone(usPhone) }),
          placeholder: '(555) 123-4567',
          invalid: !!errors.usPhone,
        }}
        extension={{
          value: value.usPhoneExt,
          onChangeText: (usPhoneExt) => patch({ usPhoneExt: digitsOnly(usPhoneExt, MAX_EXTENSION_LENGTH) }),
          placeholder: '000',
        }}
      />

      <PhoneField
        label="Callback phone (international)"
        error={errors.intlCode ?? errors.intlPhone}
        code={{
          value: value.intlCode,
          onChangeText: (intlCode) => patch({ intlCode: digitsOnly(intlCode, MAX_CODE_LENGTH) }),
          placeholder: '44 20',
          caption: 'Country + city code',
          invalid: !!errors.intlCode,
        }}
        number={{
          value: value.intlPhone,
          onChangeText: (intlPhone) => patch({ intlPhone: formatSubscriber(intlPhone) }),
          placeholder: '794 609 58',
          caption: 'Phone number',
          invalid: !!errors.intlPhone,
        }}
        extension={{
          value: value.intlPhoneExt,
          onChangeText: (intlPhoneExt) =>
            patch({ intlPhoneExt: digitsOnly(intlPhoneExt, MAX_EXTENSION_LENGTH) }),
          placeholder: '000',
        }}
      />

      <PhoneField
        label="Fax"
        hint="Optional. Used for corporate ride confirmations."
        error={errors.faxCode ?? errors.faxNumber}
        code={{
          value: value.faxCode,
          onChangeText: (faxCode) => patch({ faxCode: digitsOnly(faxCode, MAX_CODE_LENGTH) }),
          placeholder: '1 212',
          caption: 'Country + city code',
          invalid: !!errors.faxCode,
        }}
        number={{
          value: value.faxNumber,
          onChangeText: (faxNumber) => patch({ faxNumber: formatSubscriber(faxNumber) }),
          placeholder: '555 0147',
          caption: 'Fax number',
          invalid: !!errors.faxNumber,
        }}
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
