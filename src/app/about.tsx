import { ComingSoon } from '@/components/layout/ComingSoon';
import { Screen } from '@/components/layout/Screen';

export default function AboutScreen() {
  return (
    <Screen title="About" subtitle="Who we are and how the service works.">
      <ComingSoon
        blurb="XYZ Two Way Radio has been moving people since the days of the dispatch handset. This page will carry the story, the coverage area and the service promise."
        points={['Company story and coverage map', 'Our drivers and vehicles', 'Service standards and contact details']}
      />
    </Screen>
  );
}
