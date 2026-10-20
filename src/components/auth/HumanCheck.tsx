import { useRef, useState } from 'react';
import { Linking, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { RecaptchaStatus } from '@/components/auth/RecaptchaStatus';
import {
  RECAPTCHA_COMPACT_HEIGHT,
  RECAPTCHA_NORMAL_HEIGHT,
  recaptchaSizeFor,
  useRecaptchaVerification,
  type RecaptchaSize,
} from '@/components/auth/useRecaptchaVerification';
import { Alert } from '@/components/ui/Alert';
import { hasRecaptchaConfig, recaptchaBaseUrl, recaptchaSiteKey } from '@/config/recaptcha';
import { CAPTCHA_MESSAGES } from '@/constants/messages';
import { colors, space } from '@/theme';

export type HumanCheckProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
};

/** Room Google's image challenge needs while it is open. */
const CHALLENGE_HEIGHT = 600;

type WidgetMessage =
  | { type: 'token'; token: string }
  | { type: 'expired' }
  | { type: 'error' }
  | { type: 'challenge'; open: boolean };

function parseMessage(data: string): WidgetMessage | null {
  try {
    const message: unknown = JSON.parse(data);
    if (typeof message !== 'object' || message === null) return null;
    const { type, token, open } = message as { type?: unknown; token?: unknown; open?: unknown };
    if (type === 'token') return typeof token === 'string' && token ? { type, token } : null;
    if (type === 'expired' || type === 'error') return { type };
    if (type === 'challenge') return { type, open: open === true };
    return null;
  } catch {
    return null;
  }
}

/**
 * The page the webview loads under `recaptchaBaseUrl` (a host listed for the
 * key). It draws the widget explicitly and posts its callbacks back to React
 * Native; a MutationObserver reports when Google's image challenge opens, so
 * the webview can grow to fit it.
 */
function widgetHtml(size: RecaptchaSize): string {
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html, body { margin: 0; padding: 0; background: ${colors.surface}; }</style>
<script>
  var widgetId;
  function post(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
  function watchChallenge() {
    var open = false;
    function check() {
      var frame = document.querySelector('iframe[src*="/bframe"]');
      var box = frame && frame.parentNode && frame.parentNode.parentNode;
      var visible = !!box && box.style && box.style.visibility === 'visible';
      if (visible !== open) { open = visible; post({ type: 'challenge', open: visible }); }
    }
    new MutationObserver(check).observe(document.body, { attributes: true, childList: true, subtree: true });
  }
  function onRecaptchaReady() {
    widgetId = grecaptcha.render('widget', {
      sitekey: ${JSON.stringify(recaptchaSiteKey)},
      theme: 'light',
      size: ${JSON.stringify(size)},
      callback: function (token) { post({ type: 'token', token: token }); },
      'expired-callback': function () { post({ type: 'expired' }); },
      'error-callback': function () { post({ type: 'error' }); }
    });
    watchChallenge();
  }
  window.xyzResetRecaptcha = function () { if (widgetId !== undefined) grecaptcha.reset(widgetId); };
</script>
<script src="https://www.google.com/recaptcha/api.js?onload=onRecaptchaReady&render=explicit" async defer
  onerror="post({ type: 'error' })"></script>
</head>
<body><div id="widget"></div></body>
</html>`;
}

/**
 * The "I'm not a robot" control on iOS and Android: Google's reCAPTCHA v2
 * checkbox, run in a webview because the widget is web-only. The browser build
 * draws it directly (`HumanCheck.web.tsx`). Either way the box counts as
 * checked only once the server has verified the token with Google.
 */
export function HumanCheck({ checked, onChange }: HumanCheckProps) {
  const webView = useRef<WebView>(null);
  const [size, setSize] = useState<RecaptchaSize | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const { height: windowHeight } = useWindowDimensions();

  const { verifying, error, onToken, onExpired, onWidgetError } = useRecaptchaVerification({
    checked,
    onChange,
    resetWidget: () => webView.current?.injectJavaScript('window.xyzResetRecaptcha && window.xyzResetRecaptcha(); true;'),
  });

  if (!hasRecaptchaConfig) return <Alert tone="danger" message={CAPTCHA_MESSAGES.UNAVAILABLE} />;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = recaptchaSizeFor(event.nativeEvent.layout.width);
    if (next !== size) setSize(next);
  };

  const onMessage = (event: WebViewMessageEvent) => {
    const message = parseMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === 'token') void onToken(message.token);
    else if (message.type === 'expired') onExpired();
    else if (message.type === 'error') onWidgetError();
    else setChallengeOpen(message.open);
  };

  const widgetHeight = size === 'compact' ? RECAPTCHA_COMPACT_HEIGHT : RECAPTCHA_NORMAL_HEIGHT;
  const height = challengeOpen ? Math.min(CHALLENGE_HEIGHT, Math.round(windowHeight * 0.8)) : widgetHeight;

  return (
    <View style={styles.root}>
      <View onLayout={onLayout} style={{ height }}>
        {size ? (
          <WebView
            // A new size needs a freshly drawn widget.
            key={size}
            ref={webView}
            source={{ html: widgetHtml(size), baseUrl: recaptchaBaseUrl }}
            originWhitelist={['*']}
            javaScriptEnabled
            onMessage={onMessage}
            onError={onWidgetError}
            scrollEnabled={challengeOpen}
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
      <RecaptchaStatus verifying={verifying} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  webView: { flex: 1, backgroundColor: colors.surface },
});
