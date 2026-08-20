import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ComingSoon } from '@/components/layout/ComingSoon';
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
  { label: 'Update mailing address', detail: 'Where statements and account mail are sent.', href: '/mailing-address' as const },
  { label: 'Change password', detail: 'Update the password you use to sign in.', href: '/change-password' as const },
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
    <Screen title="Profile" subtitle="Your details, addresses and saved contacts.">
      <Stack.Screen options={{ title: 'Profile' }} />

      <PanelCard
        title="Personal Info"
        subtitle="How we address you, and how a driver reaches you."
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
              ) : (
                <Text style={styles.hintNote}>* Required</Text>
              )}
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
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{row.label}</Text>
                  <Text style={styles.rowDetail}>{row.detail}</Text>
                </View>
                <ChevronGlyph direction="right" color={colors.textMuted} size={8} />
              </View>
            )}
          </Pressable>
        </Link>
      ))}

      <ComingSoon
        blurb="Still to come in the account area: saved pickup and drop-off addresses, and the contacts a ride can be booked for."
        points={['Saved addresses', 'Contacts', 'Payment methods']}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: space.md },
  footerNote: { minHeight: 18, justifyContent: 'center' },
  hintNote: { color: colors.textMuted, fontSize: 12 },
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
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.textHeading, fontSize: 16, fontWeight: '700' },
  rowDetail: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
