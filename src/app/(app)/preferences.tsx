import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { PreferencesForm } from '@/components/preferences/PreferencesForm';
import { preferencesEqual, type PreferencesValue } from '@/components/preferences/preferences';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Panel } from '@/components/ui/Panel';
import { Reveal } from '@/components/ui/Reveal';
import { PREFERENCES_MESSAGES } from '@/constants/messages';
import { useProfile } from '@/context/ProfileContext';
import { getErrorDisplay } from '@/services/gateway';
import { ProfileError } from '@/services/profile';
import { breakpoints, colors, formMaxWidth, radii, space } from '@/theme';

/** Confirmation by phone and special offers, loaded and saved with the profile. */
export default function PreferencesScreen() {
  const { profile, isLoading, errorDisplay, refetch, updatePreferences } = useProfile();

  return (
    <Screen title={PREFERENCES_MESSAGES.SCREEN_TITLE}>
      <View style={styles.column}>
        {profile?.preferences ? (
          <PreferencesPanel initial={profile.preferences} onSave={updatePreferences} />
        ) : profile ? (
          <Panel title={PREFERENCES_MESSAGES.PANEL_TITLE}>
            <Notice tone="info" title={PREFERENCES_MESSAGES.UNAVAILABLE} />
          </Panel>
        ) : (
          <Panel title={PREFERENCES_MESSAGES.PANEL_TITLE}>
            {isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary[600]} />
              </View>
            ) : (
              <View style={styles.failed}>
                <Notice
                  tone="danger"
                  title={PREFERENCES_MESSAGES.LOAD_FAILED_TITLE}
                  message={errorDisplay?.customDescription}
                />
                <Button label={PREFERENCES_MESSAGES.RETRY} variant="outline" onPress={refetch} />
              </View>
            )}
          </Panel>
        )}
      </View>
    </Screen>
  );
}

type PreferencesPanelProps = {
  /** The preferences as last loaded; a new load (new object) resets the form to it. */
  initial: PreferencesValue;
  onSave: (preferences: PreferencesValue) => Promise<void>;
};

function describeUpdateError(error: unknown): string {
  if (error instanceof ProfileError) return error.message;
  return getErrorDisplay(error).customDescription;
}

function PreferencesPanel({ initial, onSave }: PreferencesPanelProps) {
  const { width } = useWindowDimensions();
  // Phones stretch the actions; anything wider keeps them thumb-sized.
  const roomy = width >= breakpoints.sm;

  // `saved` is the last committed set, `draft` is what the form is editing.
  // Keeping both is what lets Update stay disabled until something changed
  // and lets Discard put the form back without a second source of truth.
  const [loaded, setLoaded] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Every load lands as a new object, even with the same values: the form
  // then shows what the server holds, so an update that did not stick shows.
  if (initial !== loaded) {
    setLoaded(initial);
    setSaved(initial);
    setDraft(initial);
  }

  const dirty = !preferencesEqual(saved, draft);

  const edit = (next: PreferencesValue) => {
    setDraft(next);
    setFormError(null);
    // A fresh edit retires the last confirmation, so the banner never claims
    // to describe the values currently on screen.
    setJustSaved(false);
  };

  const update = async () => {
    setFormError(null);
    setJustSaved(false);
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(draft);
      setJustSaved(true);
    } catch (error) {
      setFormError(describeUpdateError(error));
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDraft(saved);
    setFormError(null);
  };

  return (
    <Panel
      title={PREFERENCES_MESSAGES.PANEL_TITLE}
      footer={
        <View style={[styles.actions, roomy ? styles.actionsWide : null]}>
          {dirty ? (
            <Button
              label={PREFERENCES_MESSAGES.DISCARD}
              variant="outline"
              disabled={saving}
              onPress={discard}
              fill={!roomy}
            />
          ) : null}
          <Button
            label={saving ? PREFERENCES_MESSAGES.UPDATING : PREFERENCES_MESSAGES.UPDATE}
            size="lg"
            disabled={!dirty || saving}
            onPress={() => void update()}
            fill={!roomy}
          />
        </View>
      }
    >
      {formError ? (
        <Alert tone="danger" title={PREFERENCES_MESSAGES.UPDATE_FAILED_TITLE} message={formError} />
      ) : null}

      <PreferencesForm value={draft} onChange={edit} />

      {justSaved ? (
        <Reveal>
          <View style={styles.saved}>
            <Text style={styles.savedText}>{PREFERENCES_MESSAGES.UPDATE_SUCCESS}</Text>
          </View>
        </Reveal>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: formMaxWidth, alignSelf: 'center' },

  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  failed: { gap: space.md, alignItems: 'flex-start' },

  actions: { gap: space.md },
  // Centred on wider screens, matching where the panel's content sits.
  actionsWide: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },

  saved: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  savedText: { color: colors.success, fontSize: 13, fontWeight: '600' },
});
