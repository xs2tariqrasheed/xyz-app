import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { PreferencesForm } from '@/components/preferences/PreferencesForm';
import {
  DEFAULT_PREFERENCES,
  preferencesEqual,
  type PreferencesValue,
} from '@/components/preferences/preferences';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Reveal } from '@/components/ui/Reveal';
import { breakpoints, colors, formMaxWidth, radii, space } from '@/theme';

export default function PreferencesScreen() {
  const { width } = useWindowDimensions();
  // Phones stretch the actions; anything wider keeps them thumb-sized.
  const roomy = width >= breakpoints.sm;

  // `saved` is the last committed set, `draft` is what the form is editing.
  // Keeping both is what lets Update stay disabled until something changed
  // and lets Discard put the form back without a second source of truth.
  const [saved, setSaved] = useState<PreferencesValue>(DEFAULT_PREFERENCES);
  const [draft, setDraft] = useState<PreferencesValue>(DEFAULT_PREFERENCES);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = !preferencesEqual(saved, draft);

  const edit = (next: PreferencesValue) => {
    setDraft(next);
    // A fresh edit retires the last confirmation, so the banner never claims
    // to describe the values currently on screen.
    setJustSaved(false);
  };

  const update = () => {
    setSaved(draft);
    setJustSaved(true);
  };

  return (
    <Screen
      title="Update Preferences"
      subtitle="Choose how we confirm your reservations and whether we send you offers."
    >
      <View style={styles.column}>
        <Panel
          title="Preferences"
          footer={
            <View style={[styles.actions, roomy ? styles.actionsWide : null]}>
              {dirty ? (
                <Button
                  label="Discard changes"
                  variant="outline"
                  onPress={() => setDraft(saved)}
                  fill={!roomy}
                />
              ) : null}
              <Button
                label="Update"
                size="lg"
                disabled={!dirty}
                onPress={update}
                fill={!roomy}
              />
            </View>
          }
        >
          <PreferencesForm value={draft} onChange={edit} />

          {justSaved ? (
            <Reveal>
              <View style={styles.saved}>
                <Text style={styles.savedText}>Preferences updated.</Text>
              </View>
            </Reveal>
          ) : null}
        </Panel>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: formMaxWidth, alignSelf: 'center' },

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
