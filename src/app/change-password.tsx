import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { Screen } from '@/components/layout/Screen';
import { formMaxWidth } from '@/theme';

export default function ChangePasswordScreen() {
  return (
    <Screen title="Change Password">
      <Stack.Screen options={{ title: 'Change password' }} />

      {/* A three-field form reads badly at the full page width. */}
      <View style={styles.column}>
        <ChangePasswordForm />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: formMaxWidth, alignSelf: 'center' },
});
