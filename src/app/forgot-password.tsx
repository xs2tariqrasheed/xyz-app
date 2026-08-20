import { ComingSoon } from '@/components/layout/ComingSoon';
import { Screen } from '@/components/layout/Screen';

export default function ForgotPasswordScreen() {
  return (
    <Screen title="Reset your password" subtitle="We'll email you a link to set a new one.">
      <ComingSoon
        blurb="Password recovery: enter the email address on your account and we'll send a single-use link to choose a new password."
        points={['Email a reset link', 'Choose a new password', 'Sign back in']}
      />
    </Screen>
  );
}
