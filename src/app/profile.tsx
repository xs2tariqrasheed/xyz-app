import { AccountLinks } from '@/components/account/AccountLinks';
import { ComingSoon } from '@/components/layout/ComingSoon';
import { Screen } from '@/components/layout/Screen';

export default function ProfileScreen() {
  return (
    <Screen title="Profile" subtitle="Your details, addresses and saved contacts.">
      <AccountLinks />
      <ComingSoon
        blurb="The account area: personal details, saved pickup and drop-off addresses, and the contacts a ride can be booked for."
        points={['Name, phone and email', 'Saved addresses', 'Contacts and payment methods']}
      />
    </Screen>
  );
}
