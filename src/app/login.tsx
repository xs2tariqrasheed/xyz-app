import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AuthCard } from '@/components/auth/AuthCard';
import { HumanCheck } from '@/components/auth/HumanCheck';
import { Screen } from '@/components/layout/Screen';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field, INLINE_LABEL_WIDTH } from '@/components/ui/Field';
import { TextField } from '@/components/ui/TextField';
import { CAPTCHA_MESSAGES, COMMON_MESSAGES, LOGIN_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { AuthError } from '@/services/auth';
import { GatewayError } from '@/services/gateway';
import { breakpoints, colors, space } from '@/theme';
import { isValidEmail } from '@/utils/validation';

type LoginErrors = {
  email?: string;
  password?: string;
  human?: string;
};

type LoginValue = {
  email: string;
  password: string;
  human: boolean;
};

function validate({ email, password, human }: LoginValue): LoginErrors {
  const errors: LoginErrors = {};

  if (!email.trim()) errors.email = LOGIN_MESSAGES.EMAIL_REQUIRED;
  else if (!isValidEmail(email)) errors.email = LOGIN_MESSAGES.EMAIL_INVALID;

  if (!password) errors.password = LOGIN_MESSAGES.PASSWORD_REQUIRED;
  if (!human) errors.human = CAPTCHA_MESSAGES.REQUIRED;

  return errors;
}

function describeSignInError(error: unknown): string {
  if (error instanceof AuthError) return error.message;
  if (error instanceof GatewayError) {
    if (error.kind === 'api') return error.message;
    if (error.kind === 'parsing') return COMMON_MESSAGES.PARSING_ERROR;
  }
  return COMMON_MESSAGES.NETWORK_ERROR;
}

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { width } = useWindowDimensions();
  const inline = width >= breakpoints.md;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [human, setHuman] = useState(false);
  const [remember, setRemember] = useState(false);

  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** Drops a field's message as soon as it is edited, rather than on re-submit. */
  const clear = (field: keyof LoginErrors) =>
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  const submit = async () => {
    if (submitting) return;

    const found = validate({ email, password, human });
    setErrors(found);
    setFormError(null);
    if (Object.values(found).some(Boolean)) return;

    setSubmitting(true);
    try {
      await signIn({ email, password, remember });
      router.replace('/');
    } catch (error) {
      setFormError(describeSignInError(error));
      // A rejected sign-in invalidates the challenge, same as a real CAPTCHA.
      setHuman(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Indents the rows that have no label of their own so they line up with the
  // inputs. Collapses to zero once the labels sit above their controls.
  const indent = inline ? { paddingLeft: INLINE_LABEL_WIDTH + space.lg } : null;

  return (
    <Screen title={LOGIN_MESSAGES.SCREEN_TITLE}>
      <AuthCard>
        {formError ? <Alert tone="danger" title={LOGIN_MESSAGES.SIGN_IN_FAILED_TITLE} message={formError} /> : null}

        <TextField
          label={LOGIN_MESSAGES.EMAIL_LABEL}
          required
          inline
          error={errors.email}
          value={email}
          onChangeText={(next) => {
            setEmail(next);
            clear('email');
          }}
          placeholder={LOGIN_MESSAGES.EMAIL_PLACEHOLDER}
          inputMode="email"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          editable={!submitting}
        />

        <TextField
          label={LOGIN_MESSAGES.PASSWORD_LABEL}
          required
          inline
          error={errors.password}
          value={password}
          onChangeText={(next) => {
            setPassword(next);
            clear('password');
          }}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
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

        <View style={[styles.meta, indent]}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}
            // react-native-web no longer derives aria-checked from accessibilityState.
            aria-checked={remember}
            accessibilityLabel={LOGIN_MESSAGES.REMEMBER_ME}
            accessibilityHint={LOGIN_MESSAGES.REMEMBER_ME_HINT}
            onPress={() => setRemember((current) => !current)}
            style={({ pressed }) => [styles.remember, pressed ? styles.pressed : null]}
          >
            <Checkbox checked={remember} />
            <Text style={styles.rememberLabel}>{LOGIN_MESSAGES.REMEMBER_ME}</Text>
          </Pressable>

          <Link href="/forgot-password" style={styles.link}>
            {LOGIN_MESSAGES.FORGOT_PASSWORD_LINK}
          </Link>
        </View>

        <View style={[styles.actions, inline ? styles.actionsInline : null]}>
          <Button
            label={submitting ? LOGIN_MESSAGES.SUBMITTING : LOGIN_MESSAGES.SUBMIT}
            size="lg"
            onPress={submit}
            disabled={submitting}
            style={inline ? styles.submitInline : undefined}
          />
        </View>

        <View style={inline ? styles.actionsInline : null}>
          <Link href="/register" style={styles.link}>
            {LOGIN_MESSAGES.REGISTER_LINK}
          </Link>
        </View>
      </AuthCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { gap: space.md, alignItems: 'flex-start' },
  remember: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pressed: { opacity: 0.7 },
  rememberLabel: { color: colors.textStrong, fontSize: 14 },
  link: { color: colors.textLink, fontSize: 14, fontWeight: '600' },

  actions: { marginTop: space.xs },
  actionsInline: { alignItems: 'center' },
  submitInline: { minWidth: 200 },
});
