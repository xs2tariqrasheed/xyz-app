import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { colors, radii, shadowValues, space } from '@/theme';

export type SectionState = 'active' | 'complete' | 'upcoming';

export type SectionCardProps = {
  /** 1-based position, shown in the leading circle. */
  step: number;
  title: string;
  description: string;
  state: SectionState;
  children?: React.ReactNode;
};

const STATE_BADGE: Record<SectionState, { label: string; tone: 'primary' | 'success' | 'muted' }> = {
  active: { label: 'IN PROGRESS', tone: 'primary' },
  complete: { label: 'DONE', tone: 'success' },
  upcoming: { label: 'UP NEXT', tone: 'muted' },
};

/**
 * One numbered block of the reservation form. Only the active section renders
 * its body; the rest stay collapsed so the flow reads as a checklist.
 */
export function SectionCard({ step, title, description, state, children }: SectionCardProps) {
  const active = state === 'active';
  const badge = STATE_BADGE[state];

  return (
    <View style={[styles.card, active ? styles.cardActive : styles.cardIdle]}>
      <View style={styles.header}>
        <View style={[styles.step, active ? styles.stepActive : null]}>
          <Text style={[styles.stepLabel, active ? styles.stepLabelActive : null]}>{step}</Text>
        </View>

        <View style={styles.headerText}>
          <Text style={[styles.title, active ? null : styles.titleIdle]}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <Badge label={badge.label} tone={badge.tone} />
      </View>

      {active && children ? (
        <>
          <View style={styles.divider} />
          <View style={styles.body}>{children}</View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: space.lg,
  },
  cardActive: { borderColor: colors.primary[200], boxShadow: shadowValues.md },
  cardIdle: { borderColor: colors.border, backgroundColor: colors.surface, boxShadow: shadowValues.sm },

  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  step: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  stepLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  stepLabelActive: { color: colors.textOnPrimary },

  headerText: { flex: 1, gap: 2 },
  title: { color: colors.textHeading, fontSize: 16, fontWeight: '700' },
  titleIdle: { color: colors.textBody },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },

  divider: { height: 1, backgroundColor: colors.border, marginTop: space.lg },
  body: { marginTop: space.lg, gap: space.lg },
});
