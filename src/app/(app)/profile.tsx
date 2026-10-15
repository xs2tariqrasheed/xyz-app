import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { PanelCard } from '@/components/profile/PanelCard';
import {
  isSamePersonalInfo,
  PersonalInfoSection,
  validatePersonalInfo,
  type PersonalInfoErrors,
  type PersonalInfoValue,
} from '@/components/profile/PersonalInfoSection';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChevronGlyph } from '@/components/ui/Glyph';
import { Notice } from '@/components/ui/Notice';
import { Reveal } from '@/components/ui/Reveal';
import { PROFILE_MESSAGES } from '@/constants/messages';
import { useProfile } from '@/context/ProfileContext';
import { getErrorDisplay } from '@/services/gateway';
import { ProfileError } from '@/services/profile';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';

/** Destinations not covered by the panel above, or by the primary nav. */
const ACCOUNT_ROWS = [
  { label: PROFILE_MESSAGES.MAILING_ADDRESS_LINK, href: '/mailing-address' as const },
  { label: PROFILE_MESSAGES.CHANGE_PASSWORD_LINK, href: '/change-password' as const },
];

/** 07-profile-personal-info.md: only the last name is required. */
const VALIDATION = { firstNameRequired: false };

export default function ProfileScreen() {
  const { profile, isLoading, errorDisplay, refetch, updatePersonalInfo } = useProfile();
  // Lives above the panel so the confirmation outlasts the reload it triggers.
  const [justSaved, setJustSaved] = useState(false);

  return (
    <Screen title={PROFILE_MESSAGES.SCREEN_TITLE}>
      <Stack.Screen options={{ title: PROFILE_MESSAGES.SCREEN_TITLE }} />

      {profile ? (
        <PersonalInfoPanel
          initial={profile.personalInfo}
          onSave={updatePersonalInfo}
          justSaved={justSaved}
          onSavedChange={setJustSaved}
        />
      ) : (
        <PanelCard title={PROFILE_MESSAGES.PANEL_TITLE}>
          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary[600]} />
            </View>
          ) : (
            <View style={styles.failed}>
              <Notice
                tone="danger"
                title={PROFILE_MESSAGES.LOAD_FAILED_TITLE}
                message={errorDisplay?.customDescription}
              />
              <Button label={PROFILE_MESSAGES.RETRY} variant="outline" onPress={refetch} />
            </View>
          )}
        </PanelCard>
      )}

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

type PersonalInfoPanelProps = {
  /** The profile as last loaded; a new load (new object) resets the form to it. */
  initial: PersonalInfoValue;
  onSave: (personal: PersonalInfoValue) => Promise<void>;
  justSaved: boolean;
  onSavedChange: (saved: boolean) => void;
};

function describeUpdateError(error: unknown): string {
  if (error instanceof ProfileError) return error.message;
  return getErrorDisplay(error).customDescription;
}

/** Name, callback phones and fax, saved through `PROF.U.PROFILE`. */
function PersonalInfoPanel({ initial, onSave, justSaved, onSavedChange }: PersonalInfoPanelProps) {
  const { width } = useWindowDimensions();
  const roomy = width >= breakpoints.sm;

  const [loaded, setLoaded] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<PersonalInfoErrors>({});
  // Nothing is flagged until the first Update — a form should not scold you
  // for fields you have not reached yet.
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Every load lands as a new object, even with the same values: the form
  // then shows what the server holds, so an update that did not stick shows.
  if (initial !== loaded) {
    setLoaded(initial);
    setSaved(initial);
    setDraft(initial);
    setErrors({});
    setSubmitted(false);
  }

  const dirty = !isSamePersonalInfo(draft, saved);

  const handleChange = (next: PersonalInfoValue) => {
    setDraft(next);
    setFormError(null);
    onSavedChange(false);
    // Once flagged, errors clear as they are fixed rather than waiting for
    // another submit.
    if (submitted) setErrors(validatePersonalInfo(next, VALIDATION));
  };

  const handleUpdate = async () => {
    const found = validatePersonalInfo(draft, VALIDATION);
    setSubmitted(true);
    setErrors(found);
    setFormError(null);
    onSavedChange(false);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await onSave(draft);
      setSaved(draft);
      onSavedChange(true);
    } catch (error) {
      setFormError(describeUpdateError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft(saved);
    setErrors({});
    setSubmitted(false);
    setFormError(null);
    onSavedChange(false);
  };

  const errorCount = Object.keys(errors).length;

  return (
    <PanelCard
      title={PROFILE_MESSAGES.PANEL_TITLE}
      trailing={dirty ? <Badge label={PROFILE_MESSAGES.UNSAVED_BADGE} tone="accent" /> : null}
      footer={
        <View style={styles.footer}>
          <View style={styles.footerNote}>
            {errorCount > 0 ? (
              <Text style={styles.errorNote}>
                {errorCount === 1
                  ? PROFILE_MESSAGES.ONE_FIELD_NEEDS_ATTENTION
                  : `${errorCount} ${PROFILE_MESSAGES.FIELDS_NEED_ATTENTION}`}
              </Text>
            ) : justSaved ? (
              <Reveal>
                <Text style={styles.savedNote}>{PROFILE_MESSAGES.UPDATE_SUCCESS}</Text>
              </Reveal>
            ) : null}
          </View>

          <View style={[styles.actions, roomy ? null : styles.actionsStacked]}>
            <Button
              label={PROFILE_MESSAGES.DISCARD}
              variant="outline"
              disabled={!dirty || saving}
              onPress={handleDiscard}
              fill={!roomy}
            />
            <Button
              label={saving ? PROFILE_MESSAGES.UPDATING : PROFILE_MESSAGES.UPDATE}
              size="lg"
              disabled={saving}
              onPress={() => void handleUpdate()}
              fill={!roomy}
            />
          </View>
        </View>
      }
    >
      {formError ? (
        <Alert tone="danger" title={PROFILE_MESSAGES.UPDATE_FAILED_TITLE} message={formError} />
      ) : null}

      {/* PROF.U.PROFILE has no fax extension, so the box is left off. */}
      <PersonalInfoSection
        value={draft}
        onChange={handleChange}
        errors={errors}
        faxExtension={false}
        firstNameRequired={VALIDATION.firstNameRequired}
      />
    </PanelCard>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  failed: { gap: space.md, alignItems: 'flex-start' },

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
