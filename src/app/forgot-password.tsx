import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AuthCard } from '@/components/auth/AuthCard';
import { AuthFooter } from '@/components/website/AuthFooter';
import { HumanCheck } from '@/components/auth/HumanCheck';
import { Screen } from '@/components/layout/Screen';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextField } from '@/components/ui/TextField';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { CAPTCHA_MESSAGES, FORGOT_PASSWORD_MESSAGES } from '@/constants/messages';
import { usePostData } from '@/hooks/usePostData';
import {
  assertPasswordRecoverySent,
  AuthError,
  normalizeLoginId,
  passwordRecoveryJData,
} from '@/services/auth';
import { getErrorDisplay } from '@/services/gateway';
import { breakpoints, colors, space } from '@/theme';
import { isValidEmail } from '@/utils/validation';

type RecoveryErrors = {
  loginName?: string;
  human?: string;
};

function validate(loginName: string, human: boolean): RecoveryErrors {
  const errors: RecoveryErrors = {};

  if (!loginName.trim()) errors.loginName = FORGOT_PASSWORD_MESSAGES.LOGIN_NAME_REQUIRED;
  else if (!isValidEmail(loginName)) errors.loginName = FORGOT_PASSWORD_MESSAGES.LOGIN_NAME_INVALID;

  if (!human) errors.human = CAPTCHA_MESSAGES.REQUIRED;

  return errors;
}

function describeRecoveryError(error: unknown): string {
  if (error instanceof AuthError) return error.message;
  return getErrorDisplay(error).customDescription;
}

export default function ForgotPasswordScreen() {
  const { width } = useWindowDimensions();
  const inline = width >= breakpoints.md;

  const recovery = usePostData();

  const [loginName, setLoginName] = useState('');
  const [human, setHuman] = useState(false);

  const [errors, setErrors] = useState<RecoveryErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  /** Drops a field's message as soon as it is edited, rather than on re-submit. */
  const clear = (field: keyof RecoveryErrors) =>
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  const submit = async () => {
    if (submitting) return;

    const found = validate(loginName, human);
    setErrors(found);
    setFormError(null);
    if (Object.values(found).some(Boolean)) return;

    setSubmitting(true);
    try {
      const response = await recovery.mutateAsync(
        ACTION_CODES.PASSWORD_RECOVERY,
        GATEWAY_VIEW_NAME,
        passwordRecoveryJData(normalizeLoginId(loginName)),
      );
      assertPasswordRecoverySent(response);
      setSent(true);
    } catch (error) {
      setFormError(describeRecoveryError(error));
      // A rejected request invalidates the challenge, same as a real CAPTCHA.
      setHuman(false);
    } finally {
      setSubmitting(false);
    }
  };

  const backLink = (
    <Link href="/login" style={styles.link}>
      {FORGOT_PASSWORD_MESSAGES.BACK_TO_LOGIN}
    </Link>
  );

  if (sent) {
    return (
      <Screen title={FORGOT_PASSWORD_MESSAGES.SCREEN_TITLE}>
        <AuthCard>
          <Alert
            tone="success"
            title={FORGOT_PASSWORD_MESSAGES.SUCCESS_TITLE}
            message={FORGOT_PASSWORD_MESSAGES.SUCCESS_MESSAGE}
          />
          {backLink}
        </AuthCard>
        <AuthFooter />
      </Screen>
    );
  }

  return (
    <Screen title={FORGOT_PASSWORD_MESSAGES.SCREEN_TITLE}>
      <AuthCard>
        {formError ? (
          <Alert
            tone="danger"
            title={FORGOT_PASSWORD_MESSAGES.REQUEST_FAILED_TITLE}
            message={formError}
          />
        ) : null}

        <TextField
          label={FORGOT_PASSWORD_MESSAGES.LOGIN_NAME_LABEL}
          required
          inline
          error={errors.loginName}
          value={loginName}
          onChangeText={(next) => {
            setLoginName(next);
            clear('loginName');
          }}
          placeholder={FORGOT_PASSWORD_MESSAGES.LOGIN_NAME_PLACEHOLDER}
          inputMode="email"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={submit}
          editable={!submitting}
        />

        <Field label={CAPTCHA_MESSAGES.LABEL} required inline error={errors.human}>
          <HumanCheck
            checked={human}
            onChange={(next) => {
              setHuman(next);
              clear('human');
            }}
          />
        </Field>

        <View style={[styles.actions, inline ? styles.actionsInline : null]}>
          <Button
            label={
              submitting ? FORGOT_PASSWORD_MESSAGES.SUBMITTING : FORGOT_PASSWORD_MESSAGES.SUBMIT
            }
            size="lg"
            onPress={submit}
            disabled={submitting}
            style={inline ? styles.submitInline : undefined}
          />
        </View>

        <View style={inline ? styles.actionsInline : null}>{backLink}</View>
      </AuthCard>
      <AuthFooter />
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.textLink, fontSize: 14, fontWeight: '600' },

  actions: { marginTop: space.xs },
  actionsInline: { alignItems: 'center' },
  submitInline: { minWidth: 200 },
});
