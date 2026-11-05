import { Link, Stack } from 'expo-router';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  primary,
  primaryShades,
  shadowValues,
  shadows,
  status,
  type StatusName,
} from '@/theme';

const monospace = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
});

/** Mobile first: two columns on a phone, more as the viewport grows. */
function useColumns(): number {
  const { width } = useWindowDimensions();
  if (width < 600) return 2;
  if (width < 900) return 3;
  if (width < 1200) return 4;
  return 5;
}

const GAP = 12;

type SwatchProps = {
  name: string;
  token: string;
  value: string;
  /** Border on pale chips so they stay visible against the card. */
  outlined?: boolean;
};

function Swatch({ name, token, value, outlined }: SwatchProps) {
  return (
    <View style={styles.swatch}>
      <View
        style={[
          styles.chip,
          { backgroundColor: value },
          outlined ? styles.chipOutlined : null,
        ]}
      />
      <Text style={styles.swatchName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.swatchValue} numberOfLines={1}>
        {value.toUpperCase()}
      </Text>
      <Text style={styles.swatchToken} numberOfLines={1}>
        {token}
      </Text>
    </View>
  );
}

function SwatchGrid({ items }: { items: SwatchProps[] }) {
  const columns = useColumns();
  const basis = `${100 / columns}%` as const;

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.token} style={{ flexBasis: basis, maxWidth: basis, padding: GAP / 2 }}>
          <Swatch {...item} />
        </View>
      ))}
    </View>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function TextSample({ label, token, color }: { label: string; token: string; color: string }) {
  return (
    <View style={styles.textRow}>
      <Text style={[styles.textSample, { color }]}>{label}</Text>
      <Text style={styles.textRowToken}>
        {token} · {color.toUpperCase()}
      </Text>
    </View>
  );
}

const STATUS_COPY: Record<StatusName, string> = {
  success: 'Reservation confirmed for Fri, 22 Aug at 14:30.',
  danger: 'We could not cancel this reservation. Try again.',
  warning: 'This slot is nearly full — only 2 openings left.',
  info: 'A live reservation is matched to the nearest provider.',
};

function StatusCard({ name }: { name: StatusName }) {
  const tone = status[name];
  return (
    <View style={[styles.alert, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={styles.alertHeader}>
        <View style={[styles.alertDot, { backgroundColor: tone.base }]} />
        <Text style={[styles.alertTitle, { color: tone.base }]}>{name.toUpperCase()}</Text>
      </View>
      <Text style={styles.alertBody}>{STATUS_COPY[name]}</Text>
      <View style={styles.alertActions}>
        <View style={[styles.pill, { backgroundColor: tone.base }]}>
          <Text style={styles.pillLabel}>base</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: tone.hover }]}>
          <Text style={styles.pillLabel}>hover</Text>
        </View>
      </View>
    </View>
  );
}

export default function ThemeScreen() {
  const insets = useSafeAreaInsets();
  const columns = useColumns();
  const isWide = columns > 2;

  const brandItems: SwatchProps[] = [
    ...primaryShades.map((shade) => ({
      name: `primary ${shade}`,
      token: `--primary-${shade}`,
      value: primary[shade],
      outlined: shade <= 100,
    })),
    { name: 'secondary', token: '--secondary', value: colors.secondary },
    {
      name: 'secondary subtle',
      token: '--secondary-subtle',
      value: colors.secondarySubtle,
      outlined: true,
    },
    { name: 'accent', token: '--accent', value: colors.accent },
    { name: 'accent subtle', token: '--accent-subtle', value: colors.accentSubtle, outlined: true },
  ];

  const surfaceItems: SwatchProps[] = [
    { name: 'bg', token: '--bg', value: colors.bg, outlined: true },
    { name: 'surface', token: '--surface', value: colors.surface, outlined: true },
    { name: 'surface sunken', token: '--surface-sunken', value: colors.surfaceSunken, outlined: true },
    {
      name: 'surface selected',
      token: '--surface-selected',
      value: colors.surfaceSelected,
      outlined: true,
    },
    { name: 'border', token: '--border', value: colors.border, outlined: true },
    { name: 'border strong', token: '--border-strong', value: colors.borderStrong },
    { name: 'overlay', token: '--overlay', value: colors.overlay },
  ];

  const semanticItems: SwatchProps[] = (Object.keys(status) as StatusName[]).flatMap((name) => [
    { name, token: `--${name}`, value: status[name].base },
    { name: `${name} hover`, token: `--${name}-hover`, value: status[name].hover },
    { name: `${name} bg`, token: `--${name}-bg`, value: status[name].bg, outlined: true },
    { name: `${name} border`, token: `--${name}-border`, value: status[name].border, outlined: true },
  ]);

  const interactionItems: SwatchProps[] = [
    { name: 'focus ring', token: '--focus-ring', value: colors.focusRing, outlined: true },
    { name: 'disabled bg', token: '--disabled-bg', value: colors.disabledBg, outlined: true },
    {
      name: 'disabled border',
      token: '--disabled-border',
      value: colors.disabledBorder,
      outlined: true,
    },
  ];

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Theme' }} />

      {/* Header / nav tokens, shown as the real thing. */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerInner}>
          <Text style={styles.headerTitle}>xyz-app</Text>
          <Text style={styles.headerSubtitle}>Color theme</Text>
          <View style={styles.nav}>
            <View style={styles.navItemActive}>
              <Text style={styles.navLabelActive}>Theme</Text>
            </View>
            <Text style={styles.navLabel}>Reservations</Text>
            {isWide ? <Text style={styles.navLabel}>Profile</Text> : null}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View style={styles.page}>
          <Text style={styles.pageTitle}>Design tokens</Text>
          <Text style={styles.pageIntro}>
            Every color in the app comes from{' '}
            <Text style={styles.code}>@/theme</Text>. Each swatch renders the exact token value, with
            its CSS custom property name underneath.
          </Text>

          <Section
            title="Brand"
            description="Primary ramp 50 → 900, plus the secondary and accent pairs."
          >
            <SwatchGrid items={brandItems} />
          </Section>

          <Section title="Surfaces" description="Page, cards, sunken wells, borders and overlay.">
            <SwatchGrid items={surfaceItems} />
            <View style={styles.divider} />
            <View style={[styles.elevationRow, isWide ? styles.elevationRowWide : null]}>
              <View style={[styles.elevationCard, shadows.sm]}>
                <Text style={styles.elevationTitle}>shadow-sm</Text>
                <Text style={styles.elevationValue}>{shadowValues.sm}</Text>
              </View>
              <View style={[styles.elevationCard, shadows.md]}>
                <Text style={styles.elevationTitle}>shadow-md</Text>
                <Text style={styles.elevationValue}>{shadowValues.md}</Text>
              </View>
              <View style={styles.overlayDemo}>
                <View style={styles.overlayFill}>
                  <Text style={styles.overlayLabel}>overlay</Text>
                </View>
              </View>
            </View>
          </Section>

          <Section title="Text" description="Type colors on --surface, and on --primary-600.">
            <TextSample label="Title — Book a reservation" token="--text-title" color={colors.textTitle} />
            <TextSample label="Heading — Upcoming" token="--text-heading" color={colors.textHeading} />
            <TextSample label="Strong — Fri, 22 Aug" token="--text-strong" color={colors.textStrong} />
            <TextSample
              label="Body — Choose a date and time that works for you."
              token="--text-body"
              color={colors.textBody}
            />
            <TextSample label="Muted — Updated 2 min ago" token="--text-muted" color={colors.textMuted} />
            <TextSample label="Disabled — Not available" token="--text-disabled" color={colors.textDisabled} />
            <TextSample label="Link — View details" token="--text-link" color={colors.textLink} />
            <TextSample
              label="Link hover — View details"
              token="--text-link-hover"
              color={colors.textLinkHover}
            />
            <View style={styles.onPrimary}>
              <Text style={styles.onPrimaryText}>On primary — Confirm reservation</Text>
              <Text style={styles.onPrimaryToken}>--text-on-primary on --primary-600</Text>
            </View>
          </Section>

          <Section title="Semantic" description="Status families: base, hover, background, border.">
            <View style={[styles.alertRow, isWide ? styles.alertRowWide : null]}>
              {(Object.keys(status) as StatusName[]).map((name) => (
                <View key={name} style={isWide ? styles.alertCell : null}>
                  <StatusCard name={name} />
                </View>
              ))}
            </View>
            <View style={styles.divider} />
            <SwatchGrid items={semanticItems} />
          </Section>

          <Section title="Interaction" description="Focus, disabled and button states.">
            <View style={styles.buttonRow}>
              <View style={[styles.button, { backgroundColor: colors.primary[600] }]}>
                <Text style={[styles.buttonLabel, { color: colors.textOnPrimary }]}>Book now</Text>
              </View>
              <View style={[styles.button, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.buttonLabel, { color: colors.textOnPrimary }]}>Schedule</Text>
              </View>
              <View
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.borderStrong,
                  },
                ]}
              >
                <Text style={[styles.buttonLabel, { color: colors.textStrong }]}>Preview</Text>
              </View>
              <View style={[styles.button, { backgroundColor: colors.danger }]}>
                <Text style={[styles.buttonLabel, { color: colors.textOnPrimary }]}>Cancel</Text>
              </View>
              <View
                style={[
                  styles.button,
                  { backgroundColor: colors.disabledBg, borderWidth: 1, borderColor: colors.disabledBorder },
                ]}
              >
                <Text style={[styles.buttonLabel, { color: colors.textDisabled }]}>Unavailable</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.fieldFocused}>
              <Text style={styles.fieldLabel}>Focused field — 3px --focus-ring</Text>
              <Text style={styles.fieldValue}>22 Aug 2026, 14:30</Text>
            </View>
            <View style={styles.fieldSelected}>
              <Text style={styles.fieldLabel}>Selected row — --surface-selected</Text>
              <Text style={styles.fieldValue}>Home · 12 Oak Street</Text>
            </View>
            <View style={styles.divider} />
            <SwatchGrid items={interactionItems} />
          </Section>

          <Link href="/" style={styles.backLink}>
            ← Back home
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}

const cardBase: ViewStyle = {
  backgroundColor: colors.surface,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.border,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { backgroundColor: colors.headerBg, paddingBottom: 16, paddingHorizontal: 16 },
  headerInner: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  headerTitle: { color: colors.headerFg, fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: colors.headerFgMuted, fontSize: 14, marginTop: 2 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  navItemActive: { borderBottomWidth: 2, borderBottomColor: colors.navActive, paddingBottom: 4 },
  navLabelActive: { color: colors.navActive, fontSize: 14, fontWeight: '600' },
  navLabel: { color: colors.headerFgMuted, fontSize: 14, paddingBottom: 4 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },
  page: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  pageTitle: { color: colors.textTitle, fontSize: 26, fontWeight: '700' },
  pageIntro: { color: colors.textBody, fontSize: 15, lineHeight: 22, marginTop: 8 },
  code: { color: colors.textStrong, fontFamily: monospace, fontSize: 14 },

  section: { marginTop: 32 },
  sectionTitle: { color: colors.textHeading, fontSize: 19, fontWeight: '700' },
  sectionDescription: { color: colors.textMuted, fontSize: 14, marginTop: 4, marginBottom: 12 },
  card: { ...cardBase, padding: 14, ...shadows.sm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -GAP / 2 },
  swatch: { gap: 2 },
  chip: { height: 56, borderRadius: 10, marginBottom: 6 },
  chipOutlined: { borderWidth: 1, borderColor: colors.border },
  swatchName: { color: colors.textStrong, fontSize: 13, fontWeight: '600' },
  swatchValue: { color: colors.textBody, fontSize: 12, fontFamily: monospace },
  swatchToken: { color: colors.textMuted, fontSize: 11, fontFamily: monospace },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },

  elevationRow: { gap: 12 },
  elevationRowWide: { flexDirection: 'row' },
  elevationCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    minHeight: 88,
    justifyContent: 'center',
  },
  elevationTitle: { color: colors.textStrong, fontSize: 14, fontWeight: '600' },
  elevationValue: { color: colors.textMuted, fontSize: 12, fontFamily: monospace, marginTop: 4 },
  overlayDemo: {
    flex: 1,
    minHeight: 88,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.primary[200],
  },
  overlayFill: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayLabel: { color: colors.textOnPrimary, fontSize: 14, fontWeight: '600' },

  textRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.surfaceSunken },
  textSample: { fontSize: 16 },
  textRowToken: { color: colors.textMuted, fontSize: 11, fontFamily: monospace, marginTop: 2 },
  onPrimary: { backgroundColor: colors.primary[600], borderRadius: 12, padding: 14, marginTop: 14 },
  onPrimaryText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
  onPrimaryToken: {
    color: colors.headerFgMuted,
    fontSize: 11,
    fontFamily: monospace,
    marginTop: 4,
  },

  alertRow: { gap: 12 },
  alertRowWide: { flexDirection: 'row', flexWrap: 'wrap' },
  alertCell: { flexGrow: 1, flexBasis: '48%' },
  alert: { borderRadius: 12, borderWidth: 1, padding: 12 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertDot: { width: 10, height: 10, borderRadius: 5 },
  alertTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  alertBody: { color: colors.textBody, fontSize: 14, lineHeight: 20, marginTop: 6 },
  alertActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillLabel: { color: colors.textOnPrimary, fontSize: 11, fontWeight: '600' },

  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  buttonLabel: { fontSize: 14, fontWeight: '600' },

  fieldFocused: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary[500],
    borderRadius: 10,
    padding: 12,
    boxShadow: `0 0 0 3px ${colors.focusRing}`,
  },
  fieldSelected: {
    backgroundColor: colors.surfaceSelected,
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  fieldLabel: { color: colors.textMuted, fontSize: 12 },
  fieldValue: { color: colors.textStrong, fontSize: 15, fontWeight: '600', marginTop: 2 },

  backLink: { color: colors.textLink, fontSize: 15, fontWeight: '600', marginTop: 32 },
});
