import { StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  PersonalInfoSection,
  type PersonalInfoErrors,
  type PersonalInfoValue,
} from '@/components/profile/PersonalInfoSection';
import { PasswordField } from '@/components/ui/PasswordField';
import { TextField } from '@/components/ui/TextField';
import { REGISTER_MESSAGES } from '@/constants/messages';
import { breakpoints, colors, space } from '@/theme';

import { type AccountErrors, type AccountValue, PASSWORD_MAX_LENGTH } from './registration';

export type AccountStepProps = {
  account: AccountValue;
  onAccountChange: (next: AccountValue) => void;
  accountErrors: AccountErrors;
  personal: PersonalInfoValue;
  onPersonalChange: (next: PersonalInfoValue) => void;
  personalErrors: PersonalInfoErrors;
};

/** Step 1: the login (email + password) and who the account belongs to. */
export function AccountStep({
  account,
  onAccountChange,
  accountErrors,
  personal,
  onPersonalChange,
  personalErrors,
}: AccountStepProps) {
  const { width } = useWindowDimensions();
  const rowStyle = [styles.row, width >= breakpoints.sm ? styles.rowWide : null];

  const patch = (next: Partial<AccountValue>) => onAccountChange({ ...account, ...next });

  return (
    <View style={styles.root}>
      <View style={rowStyle}>
        <TextField
          style={styles.field}
          label={REGISTER_MESSAGES.EMAIL_LABEL}
          required
          value={account.email}
          onChangeText={(email) => patch({ email })}
          error={accountErrors.email}
          placeholder={REGISTER_MESSAGES.EMAIL_PLACEHOLDER}
          inputMode="email"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <TextField
          style={styles.field}
          label={REGISTER_MESSAGES.CONFIRM_EMAIL_LABEL}
          required
          value={account.confirmEmail}
          onChangeText={(confirmEmail) => patch({ confirmEmail })}
          error={accountErrors.confirmEmail}
          placeholder={REGISTER_MESSAGES.EMAIL_PLACEHOLDER}
          inputMode="email"
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
      </View>

      <View style={rowStyle}>
        <PasswordField
          maxLength={PASSWORD_MAX_LENGTH}
          style={styles.field}
          label={REGISTER_MESSAGES.PASSWORD_LABEL}
          required
          value={account.password}
          onChangeText={(password) => patch({ password })}
          error={accountErrors.password}
          autoComplete="new-password"
          textContentType="newPassword"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <PasswordField
          maxLength={PASSWORD_MAX_LENGTH}
          style={styles.field}
          label={REGISTER_MESSAGES.CONFIRM_PASSWORD_LABEL}
          required
          value={account.confirmPassword}
          onChangeText={(confirmPassword) => patch({ confirmPassword })}
          error={accountErrors.confirmPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
      </View>

      <View style={styles.divider} />

      {/* PROF.I.PROFILE has no fax extension, so the box is left off. */}
      <PersonalInfoSection
        value={personal}
        onChange={onPersonalChange}
        errors={personalErrors}
        faxExtension={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  row: { gap: space.lg },
  rowWide: { flexDirection: 'row', alignItems: 'flex-start' },
  field: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: -space.xs },
});
