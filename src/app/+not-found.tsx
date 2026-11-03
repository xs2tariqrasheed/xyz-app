import { useRouter } from 'expo-router';

import { StatusScreen } from '@/components/system/StatusScreen';
import { SYSTEM_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';

/**
 * Any URL that matches no route. "Home" is the first screen the guards allow:
 * navigating straight to a guarded route is refused, not redirected.
 */
export default function NotFoundScreen() {
  const router = useRouter();
  const { status } = useAuth();

  return (
    <StatusScreen
      title={SYSTEM_MESSAGES.NOT_FOUND_TITLE}
      message={SYSTEM_MESSAGES.NOT_FOUND_MESSAGE}
      actions={[
        {
          label: SYSTEM_MESSAGES.GO_HOME,
          onPress: () => router.replace(status === 'signedIn' ? '/' : '/login'),
        },
      ]}
    />
  );
}
