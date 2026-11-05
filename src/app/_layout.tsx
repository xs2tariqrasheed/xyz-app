import { type ErrorBoundaryProps, Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StatusScreen } from '@/components/system/StatusScreen';
import { SUPPORT_EMAIL } from '@/config/support';
import { SYSTEM_MESSAGES } from '@/constants/messages';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { ReservationProvider } from '@/context/ReservationContext';
import { SavedPlacesProvider } from '@/context/SavedPlacesContext';
import { colors } from '@/theme';

// Hold the native splash until the stored session has been checked, so no
// screen renders — or redirects — before the app knows who is signed in.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProfileProvider>
          <SavedPlacesProvider>
            <ReservationProvider>
              <RootNavigator />
            </ReservationProvider>
          </SavedPlacesProvider>
        </ProfileProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Any render error in the app lands here (expo-router replaces this layout,
 * providers included, with it) — so it stays free of context. Gateway errors
 * are not thrown into it: each screen shows its own inline.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const router = useRouter();

  return (
    <SafeAreaProvider>
      <StatusScreen
        title={SYSTEM_MESSAGES.UNEXPECTED_ERROR_TITLE}
        message={SYSTEM_MESSAGES.UNEXPECTED_ERROR_MESSAGE}
        detail={SUPPORT_EMAIL ? SYSTEM_MESSAGES.UNEXPECTED_ERROR_CONTACT(SUPPORT_EMAIL) : undefined}
        actions={[
          { label: SYSTEM_MESSAGES.TRY_AGAIN, onPress: () => void retry() },
          {
            label: SYSTEM_MESSAGES.GO_HOME,
            onPress: () => {
              router.replace('/');
              void retry();
            },
          },
        ]}
      />
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status, sessionExpired } = useAuth();
  const restoring = status === 'restoring';
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (!restoring) SplashScreen.hide();
  }, [restoring]);

  if (restoring) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {/* Declared first: when a session times out, this is the first screen
          still available, so the stack lands here rather than on login. */}
      <Stack.Protected guard={sessionExpired}>
        <Stack.Screen name="session-expired" />
      </Stack.Protected>

      {/* Every route in (app) needs a session; a guard that turns false
          sends the user to the first screen still available — login. */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}
