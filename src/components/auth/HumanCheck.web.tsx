import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { RecaptchaStatus } from '@/components/auth/RecaptchaStatus';
import {
  RECAPTCHA_COMPACT_HEIGHT,
  RECAPTCHA_NORMAL_HEIGHT,
  recaptchaSizeFor,
  useRecaptchaVerification,
  type RecaptchaSize,
} from '@/components/auth/useRecaptchaVerification';
import { Alert } from '@/components/ui/Alert';
import { hasRecaptchaConfig, recaptchaSiteKey } from '@/config/recaptcha';
import { CAPTCHA_MESSAGES } from '@/constants/messages';
import { loadRecaptcha, type Grecaptcha } from '@/services/recaptchaLoader.web';
import { space } from '@/theme';

import type { HumanCheckProps } from './HumanCheck';

/** How long an unmounted widget's nodes are kept for Google's pending timers. */
const PARKED_WIDGET_MS = 5_000;

/**
 * The "I'm not a robot" control in the browser: Google's reCAPTCHA v2 checkbox,
 * drawn with `grecaptcha.render`. iOS and Android run the same widget in a
 * webview (`HumanCheck.tsx`). Either way the box counts as checked only once
 * the server has verified the token with Google.
 */
export function HumanCheck({ checked, onChange }: HumanCheckProps) {
  const containerRef = useRef<View>(null);
  const api = useRef<{ grecaptcha: Grecaptcha; widgetId: number } | null>(null);
  const [size, setSize] = useState<RecaptchaSize | null>(null);

  const { verifying, error, onToken, onExpired, onWidgetError } = useRecaptchaVerification({
    checked,
    onChange,
    resetWidget: () => {
      const widget = api.current;
      if (widget) widget.grecaptcha.reset(widget.widgetId);
    },
  });

  // The widget calls whatever handler was current when it was drawn.
  const handlers = useRef({ onToken, onExpired, onWidgetError });
  useEffect(() => {
    handlers.current = { onToken, onExpired, onWidgetError };
  });

  useEffect(() => {
    // react-native-web renders a View as a DOM element, which the widget mounts into.
    const container = containerRef.current as unknown as HTMLElement | null;
    if (!hasRecaptchaConfig || !size || !container) return;
    let cancelled = false;
    // A fresh node per render: grecaptcha cannot redraw into a used one.
    const target = document.createElement('div');
    container.appendChild(target);

    loadRecaptcha()
      .then((grecaptcha) => {
        if (cancelled) return;
        const widgetId = grecaptcha.render(target, {
          sitekey: recaptchaSiteKey,
          theme: 'light',
          size,
          callback: (token) => void handlers.current.onToken(token),
          'expired-callback': () => handlers.current.onExpired(),
          'error-callback': () => handlers.current.onWidgetError(),
        });
        api.current = { grecaptcha, widgetId };
      })
      .catch(() => {
        if (!cancelled) handlers.current.onWidgetError();
      });

    return () => {
      cancelled = true;
      const widget = api.current;
      api.current = null;
      if (!widget) {
        target.remove();
        return;
      }
      // Google's timers still reach for the widget's nodes for a moment after
      // it goes, so park them off-screen and drop them once those have run.
      const parked = document.createElement('div');
      parked.style.display = 'none';
      document.body.appendChild(parked);
      parked.appendChild(target);
      widget.grecaptcha.reset(widget.widgetId);
      setTimeout(() => parked.remove(), PARKED_WIDGET_MS);
    };
  }, [size]);

  if (!hasRecaptchaConfig) return <Alert tone="danger" message={CAPTCHA_MESSAGES.UNAVAILABLE} />;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = recaptchaSizeFor(event.nativeEvent.layout.width);
    if (next !== size) setSize(next);
  };

  return (
    <View style={styles.root}>
      <View
        ref={containerRef}
        onLayout={onLayout}
        style={{ minHeight: size === 'compact' ? RECAPTCHA_COMPACT_HEIGHT : RECAPTCHA_NORMAL_HEIGHT }}
      />
      <RecaptchaStatus verifying={verifying} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
});
