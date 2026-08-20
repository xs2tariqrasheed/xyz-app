import { ComingSoon } from '@/components/layout/ComingSoon';
import { Screen } from '@/components/layout/Screen';

export default function RatesScreen() {
  return (
    <Screen title="Rates" subtitle="What a ride costs, before you book it.">
      <ComingSoon
        blurb="Fare tables for every vehicle class, plus the surcharges that can apply to a trip."
        points={['Base fare and per-mile rates by vehicle', 'Airport, tolls and waiting-time charges', 'Live-call versus scheduled pricing']}
      />
    </Screen>
  );
}
