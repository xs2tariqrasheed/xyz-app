import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

function RootNavigator() {
  const { status } = useAuth();
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
