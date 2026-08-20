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
import { AuthError, signIn } from '@/services/auth';
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

  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!isValidEmail(email)) errors.email = "That doesn't look like an email address.";

  if (!password) errors.password = 'Enter your password.';
  if (!human) errors.human = 'Confirm you are not a robot.';

  return errors;
}

export default function LoginScreen() {
  const router = useRouter();
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
      await signIn({ email: email.trim(), password, remember });
      router.replace('/');
    } catch (error) {
      setFormError(
        error instanceof AuthError
          ? error.message
          : "We couldn't reach the server. Check your connection and try again.",
      );
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
    <Screen title="Log in" subtitle="Reach your profile, reservations and receipts.">
      <AuthCard title="Your profile, your reservations — online with XYZ">
        {formError ? <Alert tone="danger" title="Sign-in failed" message={formError} /> : null}

        <TextField
          label="Email Address"
          required
          inline
          error={errors.email}
          value={email}
          onChangeText={(next) => {
            setEmail(next);
            clear('email');
          }}
          placeholder="you@example.com"
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
          label="Password"
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

        <Field label="Captcha" required inline error={errors.human}>
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
            accessibilityLabel="Remember me"
            accessibilityHint="Keeps you signed in on this device"
            onPress={() => setRemember((current) => !current)}
            style={({ pressed }) => [styles.remember, pressed ? styles.pressed : null]}
          >
            <Checkbox checked={remember} />
            <Text style={styles.rememberLabel}>Remember me</Text>
          </Pressable>

          <Link href="/forgot-password" style={styles.link}>
            Forgot your password?
          </Link>
        </View>

        <View style={[styles.actions, inline ? styles.actionsInline : null]}>
          <Button
            label={submitting ? 'Logging in…' : 'Log In'}
            size="lg"
            onPress={submit}
            disabled={submitting}
            style={inline ? styles.submitInline : undefined}
          />
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
