import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { ChevronGlyph } from '@/components/ui/Glyph';
import { colors, radii, shadowValues, space } from '@/theme';

export type SectionState = 'active' | 'complete' | 'upcoming';

export type SectionCardProps = {
  /** 1-based position, shown in the leading circle. */
  step: number;
  title: string;
  state: SectionState;
  /** Makes the header tappable — used to reopen a finished section. */
  onPress?: () => void;
  children?: React.ReactNode;
};

const STATE_BADGE: Record<SectionState, { label: string; tone: 'primary' | 'success' | 'muted' }> = {
  active: { label: 'IN PROGRESS', tone: 'primary' },
  complete: { label: 'DONE', tone: 'success' },
  upcoming: { label: 'UP NEXT', tone: 'muted' },
};

/** One numbered block of the reservation form. */
export function SectionCard({ step, title, state, onPress, children }: SectionCardProps) {
  const active = state === 'active';
  const badge = STATE_BADGE[state];

  return (
    <View style={[styles.card, active ? styles.cardActive : styles.cardIdle]}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `Reopen ${title}` : undefined}
        disabled={!onPress}
        onPress={onPress}
      >
        {({ pressed }) => (
          <View style={[styles.header, pressed && onPress ? styles.headerPressed : null]}>
            <View style={[styles.step, active ? styles.stepActive : null]}>
              <Text style={[styles.stepLabel, active ? styles.stepLabelActive : null]}>{step}</Text>
            </View>

            <View style={styles.headerText}>
              <Text style={[styles.title, active ? null : styles.titleIdle]}>{title}</Text>
            </View>

            <Badge label={badge.label} tone={badge.tone} />
            {onPress ? <ChevronGlyph direction="down" color={colors.textMuted} size={7} /> : null}
          </View>
        )}
      </Pressable>

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
  headerPressed: { opacity: 0.7 },
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

  divider: { height: 1, backgroundColor: colors.border, marginTop: space.lg },
  body: { marginTop: space.lg, gap: space.lg },
});
