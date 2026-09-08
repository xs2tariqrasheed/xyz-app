import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { PanelCard } from '@/components/profile/PanelCard';
import {
  EMPTY_PERSONAL_INFO,
  isSamePersonalInfo,
  PersonalInfoSection,
  validatePersonalInfo,
  type PersonalInfoErrors,
  type PersonalInfoValue,
} from '@/components/profile/PersonalInfoSection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChevronGlyph } from '@/components/ui/Glyph';
import { Reveal } from '@/components/ui/Reveal';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';

/**
 * The account as it stands today.
 *
 * A stand-in until there is a profile service to read from — the screen keeps
 * its edits in memory, so an Update survives navigation but not a reload.
 */
const SAVED_PROFILE: PersonalInfoValue = {
  ...EMPTY_PERSONAL_INFO,
  firstName: 'XYZ',
  lastName: 'TEST',
};

/** Destinations not covered by the panel above, or by the primary nav. */
const ACCOUNT_ROWS = [
  { label: 'Update mailing address', href: '/mailing-address' as const },
  { label: 'Change password', href: '/change-password' as const },
];

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const roomy = width >= breakpoints.sm;

  const [saved, setSaved] = useState<PersonalInfoValue>(SAVED_PROFILE);
  const [draft, setDraft] = useState<PersonalInfoValue>(SAVED_PROFILE);
  const [errors, setErrors] = useState<PersonalInfoErrors>({});
  // Nothing is flagged until the first Update — a form should not scold you
  // for fields you have not reached yet.
  const [submitted, setSubmitted] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = !isSamePersonalInfo(draft, saved);

  const handleChange = (next: PersonalInfoValue) => {
    setDraft(next);
    setJustSaved(false);
    // Once flagged, errors clear as they are fixed rather than waiting for
    // another submit.
    if (submitted) setErrors(validatePersonalInfo(next));
  };

  const handleUpdate = () => {
    const found = validatePersonalInfo(draft);
    setSubmitted(true);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      setJustSaved(false);
      return;
    }

    setSaved(draft);
    setJustSaved(true);
  };

  const handleDiscard = () => {
    setDraft(saved);
    setErrors({});
    setSubmitted(false);
    setJustSaved(false);
  };

  const errorCount = Object.keys(errors).length;

  return (
    <Screen title="Profile">
      <Stack.Screen options={{ title: 'Profile' }} />

      <PanelCard
        title="Personal Info"
        trailing={dirty ? <Badge label="UNSAVED" tone="accent" /> : null}
        footer={
          <View style={styles.footer}>
            <View style={styles.footerNote}>
              {errorCount > 0 ? (
                <Text style={styles.errorNote}>
                  {errorCount === 1 ? '1 field needs a look.' : `${errorCount} fields need a look.`}
                </Text>
              ) : justSaved ? (
                <Reveal>
                  <Text style={styles.savedNote}>Personal information updated.</Text>
                </Reveal>
              ) : null}
            </View>

            <View style={[styles.actions, roomy ? null : styles.actionsStacked]}>
              <Button
                label="Discard changes"
                variant="outline"
                disabled={!dirty}
                onPress={handleDiscard}
                fill={!roomy}
              />
              <Button label="Update" size="lg" onPress={handleUpdate} fill={!roomy} />
            </View>
          </View>
        }
      >
        <PersonalInfoSection value={draft} onChange={handleChange} errors={errors} />
      </PanelCard>

      {ACCOUNT_ROWS.map((row) => (
        <Link key={row.href} href={row.href} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={row.label}>
            {({ pressed }) => (
              <View style={[styles.row, pressed ? styles.rowPressed : null]}>
                <Text style={styles.rowTitle}>{row.label}</Text>
                <ChevronGlyph direction="right" color={colors.textMuted} size={8} />
              </View>
            )}
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: space.md },
  footerNote: { minHeight: 18, justifyContent: 'center' },
  errorNote: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  savedNote: {
    alignSelf: 'flex-start',
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radii.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.md },
  actionsStacked: { flexDirection: 'column-reverse', alignItems: 'stretch' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.lg,
    boxShadow: shadowValues.sm,
  },
  rowPressed: { backgroundColor: colors.surfaceSelected, borderColor: colors.primary[200] },
  rowTitle: { flex: 1, color: colors.textHeading, fontSize: 16, fontWeight: '700' },
});
