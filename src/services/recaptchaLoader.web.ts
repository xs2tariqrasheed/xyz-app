/**
 * Loads Google's reCAPTCHA v2 script once per page, for the web build only
 * (`HumanCheck.web.tsx`). Explicit rendering: each widget is drawn by
 * `grecaptcha.render` into its own container. Native code never imports this
 * file — iOS and Android run the widget in a webview.
 */

const SCRIPT_URL = 'https://www.google.com/recaptcha/api.js';
const READY_CALLBACK = '__xyzRecaptchaReady';

export type RecaptchaRenderOptions = {
  sitekey: string;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};

export type Grecaptcha = {
  render: (container: HTMLElement, options: RecaptchaRenderOptions) => number;
  reset: (widgetId?: number) => void;
  getResponse: (widgetId?: number) => string;
};

type RecaptchaWindow = Window & {
  grecaptcha?: Partial<Grecaptcha>;
  [READY_CALLBACK]?: () => void;
};

let loading: Promise<Grecaptcha> | null = null;

const ready = (api: Partial<Grecaptcha> | undefined): api is Grecaptcha => typeof api?.render === 'function';

export function loadRecaptcha(): Promise<Grecaptcha> {
  if (loading) return loading;

  loading = new Promise<Grecaptcha>((resolve, reject) => {
    const host = window as RecaptchaWindow;
    if (ready(host.grecaptcha)) {
      resolve(host.grecaptcha);
      return;
    }

    host[READY_CALLBACK] = () => {
      if (ready(host.grecaptcha)) resolve(host.grecaptcha);
      else reject(new Error('reCAPTCHA loaded without grecaptcha.render'));
    };

    const script = document.createElement('script');
    script.src = `${SCRIPT_URL}?${new URLSearchParams({ onload: READY_CALLBACK, render: 'explicit' })}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('reCAPTCHA script could not be loaded'));
    };
    document.head.appendChild(script);
  });

  return loading;
}
