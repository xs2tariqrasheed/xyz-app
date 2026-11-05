import { useEffect, useState } from 'react';

import { StatusScreen } from '@/components/system/StatusScreen';
import { SYSTEM_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';

/** Seconds before the user is taken to sign in (reverse-engineer-guide/25 §2). */
const COUNTDOWN_SECONDS = 5;

/**
 * Shown when the session reaches its max age while the app is open. The
 * session is already wiped; acknowledging the expiry drops this route's guard,
 * so the root stack moves on to login by itself.
 */
export default function SessionExpiredScreen() {
  const { acknowledgeExpiry } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      acknowledgeExpiry();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, acknowledgeExpiry]);

  return (
    <StatusScreen
      title={SYSTEM_MESSAGES.SESSION_EXPIRED_TITLE}
      message={SYSTEM_MESSAGES.SESSION_EXPIRED_MESSAGE}
      detail={SYSTEM_MESSAGES.SESSION_EXPIRED_COUNTDOWN(Math.max(secondsLeft, 0))}
      actions={[{ label: SYSTEM_MESSAGES.SIGN_IN_NOW, onPress: acknowledgeExpiry }]}
    />
  );
}
