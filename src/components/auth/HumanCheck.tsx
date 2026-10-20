import { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { RecaptchaStatus } from '@/components/auth/RecaptchaStatus';
import { recaptchaSizeFor, useRecaptchaVerification, type RecaptchaSize } from '@/components/auth/useRecaptchaVerification';
import { Alert } from '@/components/ui/Alert';
import { Checkbox } from '@/components/ui/Checkbox';
import { hasRecaptchaConfig, recaptchaBaseUrl, recaptchaSiteKey } from '@/config/recaptcha';
import { CAPTCHA_MESSAGES } from '@/constants/messages';
import { colors, radii, space } from '@/theme';

export type HumanCheckProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
};

type WidgetMessage = { type: 'token'; token: string } | { type: 'expired' } | { type: 'error' } | { type: 'dismiss' };

function parseMessage(data: string): WidgetMessage | null {
  try {
    const message: unknown = JSON.parse(data);
    if (typeof message !== 'object' || message === null) return null;
    const { type, token } = message as { type?: unknown; token?: unknown };
    if (type === 'token') return typeof token === 'string' && token ? { type, token } : null;
    if (type === 'expired' || type === 'error' || type === 'dismiss') return { type };
    return null;
  } catch {
    return null;
  }
}

/**
 * The page the full-screen webview loads under `recaptchaBaseUrl` (a host
 * listed for the key): Google's checkbox centred on a see-through page, so its
 * image challenge is laid out against the whole screen. A tap on the empty page
 * around it asks to close the sheet; taps on Google's own challenge backdrop do
 * not count.
 */
function widgetHtml(size: RecaptchaSize): string {
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: transparent; }
  /* cursor: pointer — iOS only fires click on elements that look clickable. */
  #stage { height: 100%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
</style>
<script>
  function post(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
  function onRecaptchaReady() {
    grecaptcha.render('widget', {
      sitekey: ${JSON.stringify(recaptchaSiteKey)},
      theme: 'light',
      size: ${JSON.stringify(size)},
      callback: function (token) { post({ type: 'token', token: token }); },
      'expired-callback': function () { post({ type: 'expired' }); },
      'error-callback': function () { post({ type: 'error' }); }
    });
  }
</script>
<script src="https://www.google.com/recaptcha/api.js?onload=onRecaptchaReady&render=explicit" async defer
  onerror="post({ type: 'error' })"></script>
</head>
<body><div id="stage" onclick="if (event.target === this) post({ type: 'dismiss' })"><div id="widget"></div></div></body>
</html>`;
}

/**
 * The "I'm not a robot" control on iOS and Android. Google's reCAPTCHA v2
 * widget is web-only, and its image challenge needs a full page to lay itself
 * out — squeezed into an inline webview it renders as a blank box. So the row
 * opens Google's checkbox in a full-screen sheet, which closes once a token
 * arrives. The browser build draws the widget inline (`HumanCheck.web.tsx`).
 * Either way the box counts as checked only once the server has verified the
 * token with Google.
 */
export function HumanCheck({ checked, onChange }: HumanCheckProps) {
  const [open, setOpen] = useState(false);
  const { width: windowWidth } = useWindowDimensions();

  // A fresh widget is drawn every time the sheet opens, so there is nothing to reset.
  const { verifying, error, onToken, onExpired, onWidgetError } = useRecaptchaVerification({
    checked,
    onChange,
    resetWidget: () => {},
  });

  if (!hasRecaptchaConfig) return <Alert tone="danger" message={CAPTCHA_MESSAGES.UNAVAILABLE} />;

  const press = () => {
    if (checked || verifying) return;
    setOpen(true);
  };

  const onMessage = (event: WebViewMessageEvent) => {
    const message = parseMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === 'dismiss') {
      setOpen(false);
      return;
    }
    setOpen(false);
    if (message.type === 'token') void onToken(message.token);
    else if (message.type === 'expired') onExpired();
    else onWidgetError();
  };

  const size = recaptchaSizeFor(windowWidth - 2 * space.lg);

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, busy: verifying }}
        accessibilityLabel={CAPTCHA_MESSAGES.CHECKBOX_LABEL}
        onPress={press}
        style={({ pressed }) => [styles.box, pressed ? styles.boxPressed : null]}
      >
        {verifying ? (
          <View style={styles.spinner}>
            <ActivityIndicator size="small" color={colors.primary[600]} />
          </View>
        ) : (
          <Checkbox checked={checked} />
        )}
        <Text style={styles.label}>{verifying ? CAPTCHA_MESSAGES.VERIFYING : CAPTCHA_MESSAGES.CHECKBOX_LABEL}</Text>
      </Pressable>
      <RecaptchaStatus verifying={false} error={error} />

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={styles.backdrop}>
          {open ? (
            <WebView
              source={{ html: widgetHtml(size), baseUrl: recaptchaBaseUrl }}
              originWhitelist={['*']}
              javaScriptEnabled
              onMessage={onMessage}
              onError={() => {
                setOpen(false);
                onWidgetError();
              }}
              setSupportMultipleWindows={false}
              // Google's Privacy / Terms links open in the system browser, not in the widget.
              onShouldStartLoadWithRequest={(request) => {
                if (!request.isTopFrame || request.url === 'about:blank' || request.url.startsWith(recaptchaBaseUrl)) {
                  return true;
                }
                void Linking.openURL(request.url);
                return false;
              }}
              style={styles.webView}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: space.lg - 2,
    paddingVertical: space.lg,
  },
  boxPressed: { opacity: 0.85 },
  // Holds the spinner on the checkbox's footprint so the row does not jump.
  spinner: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.textStrong, fontSize: 15, flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  webView: { flex: 1, backgroundColor: 'transparent' },
});
