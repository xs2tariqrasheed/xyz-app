import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { isAllowedPassword, PASSWORD_MAX_LENGTH } from '@/components/register/registration';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormCard } from '@/components/ui/FormCard';
import { CheckGlyph } from '@/components/ui/Glyph';
import { PasswordField } from '@/components/ui/PasswordField';
import { Reveal } from '@/components/ui/Reveal';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { CHANGE_PASSWORD_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { usePostData } from '@/hooks/usePostData';
import { assertPasswordChanged, AuthError, changePasswordJData } from '@/services/auth';
import { getErrorDisplay } from '@/services/gateway';
import { breakpoints, colors, radii, space } from '@/theme';

type Values = {
  current: string;
  next: string;
  confirm: string;
};

type FieldName = keyof Values;
type Errors = Partial<Record<FieldName, string>>;

const EMPTY: Values = { current: '', next: '', confirm: '' };

/** What a new password has to satisfy, shown live as a checklist. */
const RULES = [
  {
    id: 'length',
    label: CHANGE_PASSWORD_MESSAGES.RULE_LENGTH,
    test: isAllowedPassword,
  },
  {
    id: 'case',
    label: CHANGE_PASSWORD_MESSAGES.RULE_CASE,
    test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value),
  },
  {
    id: 'number',
    label: CHANGE_PASSWORD_MESSAGES.RULE_NUMBER,
    test: (value: string) => /\d/.test(value),
  },
] as const;

function validate(values: Values): Errors {
  const errors: Errors = {};

  if (!values.current) {
    errors.current = CHANGE_PASSWORD_MESSAGES.OLD_PASSWORD_REQUIRED;
  }

  if (!values.next) {
    errors.next = CHANGE_PASSWORD_MESSAGES.NEW_PASSWORD_REQUIRED;
  } else if (!RULES.every((rule) => rule.test(values.next))) {
    errors.next = CHANGE_PASSWORD_MESSAGES.NEW_PASSWORD_WEAK;
  } else if (values.next === values.current) {
    errors.next = CHANGE_PASSWORD_MESSAGES.NEW_PASSWORD_UNCHANGED;
  }

  if (!values.confirm) {
    errors.confirm = CHANGE_PASSWORD_MESSAGES.CONFIRM_PASSWORD_REQUIRED;
  } else if (values.next && values.confirm !== values.next) {
    errors.confirm = CHANGE_PASSWORD_MESSAGES.CONFIRM_PASSWORD_MISMATCH;
  }

  return errors;
}

function describeChangeError(error: unknown): string {
  if (error instanceof AuthError) return error.message;
  return getErrorDisplay(error).customDescription;
}

/**
 * Old / new / confirm, validated on the client, then sent as
 * `PROF.U.PASSWORD` for the signed-in login. The session holds no password,
 * so it stays valid after the change.
 */
export function ChangePasswordForm() {
  const { width } = useWindowDimensions();
  // Only centre the action once the card is wider than a phone.
  const roomy = width >= breakpoints.sm;

  const { session } = useAuth();
  const change = usePostData();

  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Bumped on success to remount the inputs, so a field left revealed does
  // not show the *next* password in the clear.
  const [formKey, setFormKey] = useState(0);

  const errors = validate(values);
  // A field only shows its error once it has been left, or once Update was hit.
  const errorFor = (field: FieldName) => (touched[field] ? errors[field] : undefined);

  const patch = (next: Partial<Values>) => {
    setValues((current) => ({ ...current, ...next }));
    setSaved(false);
    setFormError(null);
  };

  const blur = (field: FieldName) => () => setTouched((current) => ({ ...current, [field]: true }));

  const save = async () => {
    // The (app) group only renders while signed in, so a session is always there.
    if (saving || !session) return;

    if (Object.keys(errors).length > 0) {
      setTouched({ current: true, next: true, confirm: true });
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const response = await change.mutateAsync(
        ACTION_CODES.CHANGE_PASSWORD,
        GATEWAY_VIEW_NAME,
        changePasswordJData(session.loginId, values.current, values.next),
        // A resend after a lost response would carry an old password that no
        // longer matches, and report a change that worked as a failure.
        { retry: false },
      );
      assertPasswordChanged(response);
      setSaved(true);
      setValues(EMPTY);
      setTouched({});
      setFormKey((current) => current + 1);
    } catch (error) {
      setFormError(describeChangeError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormCard title={CHANGE_PASSWORD_MESSAGES.FORM_TITLE}>
      {formError ? (
        <Alert tone="danger" title={CHANGE_PASSWORD_MESSAGES.FAILED_TITLE} message={formError} />
      ) : null}

      {saved ? (
        <Reveal style={styles.notice}>
          <View style={styles.noticeIcon}>
            <CheckGlyph size={16} />
          </View>
          <Text style={styles.noticeText}>{CHANGE_PASSWORD_MESSAGES.SUCCESS_MESSAGE}</Text>
        </Reveal>
      ) : null}

      <PasswordField
        maxLength={PASSWORD_MAX_LENGTH}
        key={`current-${formKey}`}
        label={CHANGE_PASSWORD_MESSAGES.OLD_PASSWORD_LABEL}
        required
        value={values.current}
        onChangeText={(current) => patch({ current })}
        onBlur={blur('current')}
        error={errorFor('current')}
        placeholder={CHANGE_PASSWORD_MESSAGES.OLD_PASSWORD_PLACEHOLDER}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
        editable={!saving}
      />

      <PasswordField
        maxLength={PASSWORD_MAX_LENGTH}
        key={`next-${formKey}`}
        label={CHANGE_PASSWORD_MESSAGES.NEW_PASSWORD_LABEL}
        required
        value={values.next}
        onChangeText={(next) => patch({ next })}
        onBlur={blur('next')}
        error={errorFor('next')}
        placeholder={CHANGE_PASSWORD_MESSAGES.NEW_PASSWORD_PLACEHOLDER}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        editable={!saving}
      />

      <View style={styles.rules}>
        {RULES.map((rule) => {
          const met = rule.test(values.next);

          return (
            <View key={rule.id} style={styles.rule}>
              <View style={[styles.ruleMark, met ? styles.ruleMarkMet : null]}>
                {met ? <CheckGlyph size={11} color={colors.textOnPrimary} /> : null}
              </View>
              <Text style={[styles.ruleLabel, met ? styles.ruleLabelMet : null]}>{rule.label}</Text>
            </View>
          );
        })}
      </View>

      <PasswordField
        maxLength={PASSWORD_MAX_LENGTH}
        key={`confirm-${formKey}`}
        label={CHANGE_PASSWORD_MESSAGES.CONFIRM_PASSWORD_LABEL}
        required
        value={values.confirm}
        onChangeText={(confirm) => patch({ confirm })}
        onBlur={blur('confirm')}
        error={errorFor('confirm')}
        placeholder={CHANGE_PASSWORD_MESSAGES.CONFIRM_PASSWORD_PLACEHOLDER}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={save}
        editable={!saving}
      />

      <View style={[styles.actions, roomy ? styles.actionsRoomy : null]}>
        <Button
          label={saving ? CHANGE_PASSWORD_MESSAGES.SUBMITTING : CHANGE_PASSWORD_MESSAGES.SUBMIT}
          size="lg"
          onPress={save}
          disabled={saving}
          fill={!roomy}
          style={roomy ? styles.action : undefined}
        />
      </View>
    </FormCard>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radii.lg,
    padding: space.md,
  },
  noticeIcon: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: { flex: 1, color: colors.textStrong, fontSize: 14, lineHeight: 20 },

  rules: { gap: space.sm, marginTop: -space.sm },
  rule: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ruleMark: {
    width: 16,
    height: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleMarkMet: { backgroundColor: colors.success, borderColor: colors.success },
  ruleLabel: { color: colors.textMuted, fontSize: 13 },
  ruleLabelMet: { color: colors.textStrong },

  actions: { marginTop: space.xs },
  actionsRoomy: { alignItems: 'center' },
  action: { minWidth: 200 },
});
