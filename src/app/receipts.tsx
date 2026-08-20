import { ComingSoon } from '@/components/layout/ComingSoon';
import { Screen } from '@/components/layout/Screen';

export default function ReceiptsScreen() {
  return (
    <Screen title="Receipts & Invoices" subtitle="Every ride you have paid for.">
      <ComingSoon
        blurb="A searchable history of completed rides, with receipts you can download and invoices for account customers."
        points={['Receipts for past rides', 'Monthly account invoices', 'Email or download a copy']}
      />
    </Screen>
  );
}
