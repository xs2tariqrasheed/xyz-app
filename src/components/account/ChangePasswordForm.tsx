import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormCard } from '@/components/ui/FormCard';
import { CheckGlyph } from '@/components/ui/Glyph';
import { PasswordField } from '@/components/ui/PasswordField';
import { Reveal } from '@/components/ui/Reveal';
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
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  {
    id: 'case',
    label: 'An upper and a lower case letter',
    test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value),
  },
  { id: 'number', label: 'At least one number', test: (value: string) => /\d/.test(value) },
] as const;

function validate(values: Values): Errors {
  const errors: Errors = {};

  if (!values.current) {
    errors.current = 'Enter your current password.';
  }

  if (!values.next) {
    errors.next = 'Choose a new password.';
  } else if (!RULES.every((rule) => rule.test(values.next))) {
    errors.next = 'This password does not meet the requirements below yet.';
  } else if (values.next === values.current) {
    errors.next = 'Your new password must be different from your current one.';
  }

  if (!values.confirm) {
    errors.confirm = 'Re-type your new password.';
  } else if (values.next && values.confirm !== values.next) {
    errors.confirm = 'The two passwords do not match.';
  }

  return errors;
}

/**
 * Old / new / confirm, validated on the client.
 *
 * There is no auth service in the project yet, so submitting runs a short
 * pending state and reports success locally — swap {@link save} for the real
 * call when the endpoint lands.
 */
export function ChangePasswordForm() {
  const { width } = useWindowDimensions();
  // Only centre the action once the card is wider than a phone.
  const roomy = width >= breakpoints.sm;

  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Bumped on success to remount the inputs, so a field left revealed does
  // not show the *next* password in the clear.
  const [formKey, setFormKey] = useState(0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const errors = validate(values);
  // A field only shows its error once it has been left, or once Update was hit.
  const errorFor = (field: FieldName) => (touched[field] ? errors[field] : undefined);

  const patch = (next: Partial<Values>) => {
    setValues((current) => ({ ...current, ...next }));
    setSaved(false);
  };

  const blur = (field: FieldName) => () => setTouched((current) => ({ ...current, [field]: true }));

  const save = () => {
    if (Object.keys(errors).length > 0) {
      setTouched({ current: true, next: true, confirm: true });
      return;
    }

    setSaving(true);
    timer.current = setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setValues(EMPTY);
      setTouched({});
      setFormKey((current) => current + 1);
    }, 700);
  };

  return (
    <FormCard title="Please enter your old and new password">
      {saved ? (
        <Reveal style={styles.notice}>
          <View style={styles.noticeIcon}>
            <CheckGlyph size={16} />
          </View>
          <Text style={styles.noticeText}>
            Password updated. Use your new password the next time you sign in.
          </Text>
        </Reveal>
      ) : null}

      <PasswordField
        key={`current-${formKey}`}
        label="Old password"
        required
        value={values.current}
        onChangeText={(current) => patch({ current })}
        onBlur={blur('current')}
        error={errorFor('current')}
        placeholder="Your current password"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
      />

      <PasswordField
        key={`next-${formKey}`}
        label="New password"
        required
        value={values.next}
        onChangeText={(next) => patch({ next })}
        onBlur={blur('next')}
        error={errorFor('next')}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
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
        key={`confirm-${formKey}`}
        label="Confirm new password"
        required
        value={values.confirm}
        onChangeText={(confirm) => patch({ confirm })}
        onBlur={blur('confirm')}
        error={errorFor('confirm')}
        placeholder="Re-type the new password"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={save}
      />

      <View style={[styles.actions, roomy ? styles.actionsRoomy : null]}>
        <Button
          label={saving ? 'Updating…' : 'Update'}
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
