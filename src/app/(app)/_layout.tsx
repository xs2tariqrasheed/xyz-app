import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Signed-in screens. Access is guarded by the root layout. */
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
