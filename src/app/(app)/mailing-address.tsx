import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  type ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { MailingAddressForm } from '@/components/account/MailingAddressForm';
import {
  countErrors,
  mailingAddressEqual,
  validateMailingAddress,
  type MailingAddress,
  type MailingAddressErrors,
} from '@/components/account/mailingAddress';
import { Screen } from '@/components/layout/Screen';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Panel } from '@/components/ui/Panel';
import { Reveal } from '@/components/ui/Reveal';
import { MAILING_ADDRESS_MESSAGES as M } from '@/constants/messages';
import { useProfile } from '@/context/ProfileContext';
import { getErrorDisplay } from '@/services/gateway';
import { ProfileError } from '@/services/profile';
import { breakpoints, colors, formMaxWidth, radii, space } from '@/theme';

/** The profile's mailing (billing) address, loaded and saved with the profile. */
export default function MailingAddressScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { profile, isLoading, errorDisplay, refetch, updateMailingAddress } = useProfile();

  return (
    <Screen title={M.SCREEN_TITLE} scrollRef={scrollRef}>
      <View style={styles.column}>
        {profile?.mailingAddress ? (
          <MailingAddressPanel
            initial={profile.mailingAddress}
            onSave={updateMailingAddress}
            onScrollTop={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          />
        ) : profile ? (
          <Panel title={M.PANEL_TITLE}>
            <Notice tone="info" title={M.UNAVAILABLE} />
          </Panel>
        ) : (
          <Panel title={M.PANEL_TITLE}>
            {isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary[600]} />
              </View>
            ) : (
              <View style={styles.failed}>
                <Notice tone="danger" title={M.LOAD_FAILED_TITLE} message={errorDisplay?.customDescription} />
                <Button label={M.RETRY} variant="outline" onPress={refetch} />
              </View>
            )}
          </Panel>
        )}

        <Button
          label={M.BACK_TO_PROFILE}
          variant="ghost"
          onPress={() => router.navigate('/profile')}
          style={styles.back}
        />
      </View>
    </Screen>
  );
}

type MailingAddressPanelProps = {
  /** The address as last loaded; a new load (new object) resets the form to it. */
  initial: MailingAddress;
  onSave: (address: MailingAddress) => Promise<void>;
  onScrollTop: () => void;
};

function describeUpdateError(error: unknown): string {
  if (error instanceof ProfileError) return error.message;
  return getErrorDisplay(error).customDescription;
}

function MailingAddressPanel({ initial, onSave, onScrollTop }: MailingAddressPanelProps) {
  const { width } = useWindowDimensions();
  // Phones stretch the actions; anything wider keeps them thumb-sized.
  const roomy = width >= breakpoints.sm;

  // `saved` is the last committed address, `draft` is what the form is editing.
  const [loaded, setLoaded] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  // Errors stay empty until the first submit — nobody wants to be told a field
  // is required before they have reached it.
  const [errors, setErrors] = useState<MailingAddressErrors>({});
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Every load lands as a new object: the form then shows what the server
  // holds, so an update that did not stick shows.
  if (initial !== loaded) {
    setLoaded(initial);
    setSaved(initial);
    setDraft(initial);
  }

  const dirty = !mailingAddressEqual(saved, draft);
  const errorCount = countErrors(errors);

  const edit = (next: MailingAddress) => {
    setDraft(next);
    setFormError(null);
    setJustSaved(false);
    // Re-validate only what was already failing, so messages clear as they are
    // fixed without new ones appearing mid-typing.
    if (errorCount > 0) {
      const fresh = validateMailingAddress(next);
      setErrors(
        Object.fromEntries(
          Object.entries(fresh).filter(([field]) => field in errors),
        ) as MailingAddressErrors,
      );
    }
  };

  const update = async () => {
    const found = validateMailingAddress(draft);
    setErrors(found);
    setFormError(null);
    setJustSaved(false);
    if (countErrors(found) > 0) {
      onScrollTop();
      return;
    }

    setSaving(true);
    try {
      await onSave(draft);
      setSaved(draft);
      setJustSaved(true);
    } catch (error) {
      setFormError(describeUpdateError(error));
      onScrollTop();
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDraft(saved);
    setErrors({});
    setFormError(null);
  };

  return (
    <Panel
      title={M.PANEL_TITLE}
      footer={
        <View style={[styles.actions, roomy ? styles.actionsWide : null]}>
          {dirty ? (
            <Button label={M.DISCARD} variant="outline" disabled={saving} onPress={discard} fill={!roomy} />
          ) : null}
          <Button
            label={saving ? M.UPDATING : M.UPDATE}
            size="lg"
            disabled={!dirty || saving}
            onPress={() => void update()}
            fill={!roomy}
          />
        </View>
      }
    >
      {formError ? <Alert tone="danger" title={M.UPDATE_FAILED_TITLE} message={formError} /> : null}

      {errorCount > 0 ? (
        <Notice
          tone="danger"
          title={errorCount === 1 ? M.ONE_FIELD_NEEDS_ATTENTION : `${errorCount} ${M.FIELDS_NEED_ATTENTION}`}
        />
      ) : null}

      <MailingAddressForm value={draft} onChange={edit} errors={errors} />

      {justSaved ? (
        <Reveal>
          <View style={styles.saved}>
            <Text style={styles.savedText}>{M.UPDATE_SUCCESS}</Text>
          </View>
        </Reveal>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: formMaxWidth, alignSelf: 'center', gap: space.lg },

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

  back: { alignSelf: 'flex-start' },
});
