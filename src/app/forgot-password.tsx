import { ComingSoon } from '@/components/layout/ComingSoon';
import { Screen } from '@/components/layout/Screen';

export default function ForgotPasswordScreen() {
  return (
    <Screen title="Reset your password">
      <ComingSoon blurb="Emailing a reset link will be available here." />
    </Screen>
  );
}
