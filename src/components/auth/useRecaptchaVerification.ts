import { useEffect, useRef, useState } from 'react';

import { CAPTCHA_MESSAGES } from '@/constants/messages';
import { RecaptchaNetworkError, verifyRecaptchaToken } from '@/services/recaptcha';

/** Google's v2 checkbox is 304 px wide; narrower columns get the compact one. */
export const RECAPTCHA_NORMAL_WIDTH = 304;
export const RECAPTCHA_NORMAL_HEIGHT = 78;
export const RECAPTCHA_COMPACT_HEIGHT = 144;

export type RecaptchaSize = 'normal' | 'compact';

/**
 * Google animates the tick for a moment after it hands over the token; a reset
 * during that animation pulls the checkbox out from under it and the widget
 * throws "Cannot read properties of null (reading 'style')". A verify call that
 * fails fast (server down) lands inside that window, so the reset waits.
 */
const RESET_DELAY_MS = 1_000;

export const recaptchaSizeFor = (width: number): RecaptchaSize =>
  width >= RECAPTCHA_NORMAL_WIDTH ? 'normal' : 'compact';

type Options = {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Clears the platform widget so the user can tick it again. */
  resetWidget: () => void;
};

/**
 * The flow both `HumanCheck` files share. The Google widget hands over a token;
 * it counts only once the server has verified it with Google, and anything else
 * resets the widget. Expiry, a failed check, or the screen clearing `checked`
 * (after a failed submit) all leave the box unticked.
 */
export function useRecaptchaVerification({ checked, onChange, resetWidget }: Options) {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Bumped on every token and reset, so a late verify answer is ignored. */
  const attempt = useRef(0);
  const solved = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latest = useRef({ onChange, resetWidget });
  useEffect(() => {
    latest.current = { onChange, resetWidget };
  });

  // The screen unticks the box after a failed submit — the token was used up,
  // so the widget has to be solved again.
  useEffect(() => {
    if (!checked && solved.current) {
      solved.current = false;
      attempt.current += 1;
      setVerifying(false);
      latest.current.resetWidget();
    }
  }, [checked]);

  useEffect(
    () => () => {
      attempt.current += 1;
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const resetAfterAnimation = () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      resetTimer.current = null;
      latest.current.resetWidget();
    }, RESET_DELAY_MS);
  };

  const fail = (message: string) => {
    solved.current = false;
    setVerifying(false);
    setError(message);
    resetAfterAnimation();
    latest.current.onChange(false);
  };

  const onToken = async (token: string) => {
    const id = ++attempt.current;
    setError(null);
    setVerifying(true);
    try {
      const ok = await verifyRecaptchaToken(token);
      if (id !== attempt.current) return;
      if (!ok) {
        fail(CAPTCHA_MESSAGES.FAILED);
        return;
      }
      solved.current = true;
      setVerifying(false);
      latest.current.onChange(true);
    } catch (cause) {
      if (id !== attempt.current) return;
      fail(cause instanceof RecaptchaNetworkError ? CAPTCHA_MESSAGES.NETWORK : CAPTCHA_MESSAGES.FAILED);
    }
  };

  const onExpired = () => {
    attempt.current += 1;
    solved.current = false;
    setVerifying(false);
    setError(CAPTCHA_MESSAGES.EXPIRED);
    latest.current.onChange(false);
  };

  const onWidgetError = () => {
    attempt.current += 1;
    solved.current = false;
    setVerifying(false);
    setError(CAPTCHA_MESSAGES.NETWORK);
    latest.current.onChange(false);
  };

  return { verifying, error, onToken, onExpired, onWidgetError };
}
