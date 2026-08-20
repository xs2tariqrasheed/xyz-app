import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DEMO_SESSION } from '@/data/session';
import { breakpoints, colors, space } from '@/theme';
import { formatClockTime, formatFullDate } from '@/utils/datetime';

import { HomePanel } from './HomePanel';
import { SedanIllustration } from './SedanIllustration';

const HEADLINE = "Great news — XYZ's executive sedan reservation system is new and improved!";

const BODY = [
  'We have made several great improvements to our service. On top of everything you already ' +
    'enjoy, you can now check the status of your recent car orders under Previous orders.',
  'Thank you for choosing the XYZ car reservation system. We will always provide a quality ' +
    'service, and hope you enjoy the additional services now at your fingertips. For more ' +
    'information, please visit our help page.',
] as const;

export type WhatsNewPanelProps = {
  style?: StyleProp<ViewStyle>;
};

/** The announcement panel: what changed, with the two ways to act on it. */
export function WhatsNewPanel({ style }: WhatsNewPanelProps) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const roomy = width >= breakpoints.md;

  const { lastLoginAt } = DEMO_SESSION;
  const lastLogin = `${formatFullDate(lastLoginAt)} · ${formatClockTime(lastLoginAt)}`;

  return (
    <HomePanel
      heading="What's New"
      barTitle={`Welcome back, ${DEMO_SESSION.name}`}
      barMeta={`Last login ${lastLogin}`}
      style={style}
    >
      <View style={[styles.split, roomy ? styles.splitWide : null]}>
        <View style={[styles.copy, roomy ? styles.copyWide : null]}>
          <Text style={styles.headline}>{HEADLINE}</Text>
          {BODY.map((paragraph) => (
            <Text key={paragraph.slice(0, 24)} style={styles.body}>
              {paragraph}
            </Text>
          ))}
          <Link href="/about" style={styles.helpLink}>
            Visit the help page →
          </Link>
        </View>

        <View style={[styles.media, roomy ? styles.mediaWide : null]}>
          <SedanIllustration />
          <Text style={styles.caption}>Executive sedans, chauffeur driven, door to door.</Text>
        </View>
      </View>

      <View style={[styles.actions, roomy ? styles.actionsWide : null]}>
        <Button
          label="Continue to reservation"
          size="lg"
          onPress={() => router.navigate('/reserve')}
        />
        <Button
          label="Previous orders"
          variant="outline"
          size="lg"
          onPress={() => router.navigate('/rides')}
        />
      </View>
    </HomePanel>
  );
}

const styles = StyleSheet.create({
  split: { gap: space.lg },
  splitWide: { flexDirection: 'row', alignItems: 'flex-start' },

  copy: { gap: space.md },
  copyWide: { flex: 2 },
  headline: { color: colors.textTitle, fontSize: 19, fontWeight: '700', lineHeight: 26 },
  body: { color: colors.textBody, fontSize: 14, lineHeight: 22 },
  helpLink: {
    color: colors.textLink,
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginTop: space.xs,
  },

  media: { gap: space.sm },
  mediaWide: { flex: 1 },
  caption: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },

  actions: { gap: space.md },
  actionsWide: { flexDirection: 'row', alignItems: 'center' },
});
