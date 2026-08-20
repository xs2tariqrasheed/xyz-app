import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountPanel } from '@/components/account/AccountPanel';
import { MailingAddressForm } from '@/components/account/MailingAddressForm';
import {
  countErrors,
  formatMailingAddress,
  SAVED_MAILING_ADDRESS,
  validateMailingAddress,
  type MailingAddress,
  type MailingAddressErrors,
} from '@/components/account/mailingAddress';
import { AppHeader } from '@/components/nav/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { breakpoints, colors, contentMaxWidth, formMaxWidth, radii, space } from '@/theme';

export default function MailingAddressScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const roomy = width >= breakpoints.md;

  // The address on file. Editing works against a draft so Cancel can restore it.
  const [saved, setSaved] = useState<MailingAddress>(SAVED_MAILING_ADDRESS);
  const [draft, setDraft] = useState<MailingAddress>(SAVED_MAILING_ADDRESS);
  // Errors stay empty until the first submit — nobody wants to be told a field
  // is required before they have reached it.
  const [errors, setErrors] = useState<MailingAddressErrors>({});
  const [justSaved, setJustSaved] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const errorCount = countErrors(errors);

  const edit = (next: MailingAddress) => {
    setDraft(next);
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

  const submit = () => {
    const found = validateMailingAddress(draft);
    setErrors(found);

    if (countErrors(found) > 0) {
      setJustSaved(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setSaved(draft);
    setJustSaved(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const cancel = () => {
    setDraft(saved);
    setErrors({});
    setJustSaved(false);
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Update mailing address' }} />

      <AppHeader
        title="Update Mailing Address"
        subtitle="Where your statements, receipts and account mail are sent."
        trailing={dirty ? <Badge label="UNSAVED" tone="accent" pulse /> : null}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.page}>
            {justSaved ? (
              <Notice
                tone="success"
                title="Mailing address updated"
                message={formatMailingAddress(saved)}
              />
            ) : null}

            {errorCount > 0 ? (
              <Notice
                tone="danger"
                title={errorCount === 1 ? 'One field needs a look' : `${errorCount} fields need a look`}
                message="The highlighted fields below are missing or incomplete."
              />
            ) : null}

            <AccountPanel
              title="Mailing Address"
              trailing={<Badge label="ON FILE" tone="info" />}
              footer={
                <View style={[styles.actions, roomy ? styles.actionsWide : null]}>
                  <Button
                    label="Cancel"
                    variant="outline"
                    size={roomy ? 'md' : 'lg'}
                    disabled={!dirty}
                    onPress={cancel}
                    style={roomy ? null : styles.action}
                  />
                  <Button
                    label="Update"
                    size={roomy ? 'md' : 'lg'}
                    onPress={submit}
                    style={roomy ? null : styles.action}
                  />
                </View>
              }
            >
              <MailingAddressForm value={draft} onChange={edit} errors={errors} />
            </AccountPanel>

            <View style={styles.note}>
              <Text style={styles.noteText}>
                Changing this address does not change your billing address or your saved pickup
                addresses.
              </Text>
            </View>

            <Button
              label="Back to profile"
              variant="ghost"
              onPress={() => router.navigate('/profile')}
              style={styles.back}
            />
          </View>

          <View style={{ height: insets.bottom + space.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  scrollContent: { paddingHorizontal: space.lg, paddingTop: space.xl },
  page: {
    width: '100%',
    maxWidth: formMaxWidth,
    alignSelf: 'center',
    gap: space.lg,
  },

  actions: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  actionsWide: { justifyContent: 'flex-end' },
  action: { flex: 1 },

  note: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: space.md,
    maxWidth: contentMaxWidth,
  },
  noteText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },

  back: { alignSelf: 'flex-start' },
});
