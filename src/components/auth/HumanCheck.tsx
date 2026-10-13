import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Checkbox } from '@/components/ui/Checkbox';
import { CAPTCHA_MESSAGES } from '@/constants/messages';
import { ShieldGlyph } from '@/components/ui/Glyph';
import { colors, radii, space } from '@/theme';

/** How long the control pretends to check before it settles on "verified". */
const VERIFY_MS = 700;

export type HumanCheckProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
};

/**
 * The "I'm not a robot" control.
 *
 * This is a self-contained stand-in, NOT a real CAPTCHA — it proves nothing to
 * a server and stops no bots. It exists so the form has the right shape and a
 * single `checked` flag to hang real verification off later. Swapping in a
 * provider (reCAPTCHA, hCaptcha, Turnstile) means replacing the body of this
 * component and keeping the `checked`/`onChange` contract, so no caller
 * changes. On native that provider has to run in a webview.
 */
export function HumanCheck({ checked, onChange }: HumanCheckProps) {
  const [verifying, setVerifying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The timeout outlives a fast unmount (navigating away mid-check) otherwise.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const press = () => {
    if (verifying) return;

    if (checked) {
      onChange(false);
      return;
    }

    setVerifying(true);
    timer.current = setTimeout(() => {
      setVerifying(false);
      onChange(true);
    }, VERIFY_MS);
  };

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, busy: verifying }}
      // react-native-web no longer derives aria-checked from accessibilityState.
      aria-checked={checked}
      accessibilityLabel={CAPTCHA_MESSAGES.CHECKBOX_LABEL}
      accessibilityHint={CAPTCHA_MESSAGES.CHECKBOX_HINT}
      onPress={press}
      style={({ pressed }) => [styles.box, pressed ? styles.boxPressed : null]}
    >
      <View style={styles.control}>
        {verifying ? (
          <View style={styles.spinner}>
            <ActivityIndicator size="small" color={colors.primary[600]} />
          </View>
        ) : (
          <Checkbox checked={checked} />
        )}
        <Text style={styles.label}>{verifying ? CAPTCHA_MESSAGES.VERIFYING : CAPTCHA_MESSAGES.CHECKBOX_LABEL}</Text>
      </View>

      <View style={styles.mark}>
        <ShieldGlyph color={colors.primary[400]} size={20} />
        <Text style={styles.markLabel}>{CAPTCHA_MESSAGES.BADGE}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: space.lg - 2,
    paddingVertical: space.lg,
  },
  boxPressed: { opacity: 0.85 },

  control: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexShrink: 1 },
  // Holds the spinner on the checkbox's footprint so the row does not jump.
  spinner: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.textStrong, fontSize: 15, flexShrink: 1 },

  mark: { alignItems: 'center', gap: 3 },
  markLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
});
