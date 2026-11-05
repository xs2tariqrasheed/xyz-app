import { StyleSheet, View } from 'react-native';

import { CheckboxCard } from '@/components/ui/Checkbox';
import { Field } from '@/components/ui/Field';
import { PREFERENCES_MESSAGES } from '@/constants/messages';
import { space } from '@/theme';

import type { PreferencesValue } from './preferences';

export type PreferencesFormProps = {
  value: PreferencesValue;
  onChange: (next: PreferencesValue) => void;
};

/** The body of the preferences panel: one labelled group per setting. */
export function PreferencesForm({ value, onChange }: PreferencesFormProps) {
  const patch = (next: Partial<PreferencesValue>) => onChange({ ...value, ...next });

  return (
    <View style={styles.root}>
      <Field label={PREFERENCES_MESSAGES.CONFIRMATION_LABEL}>
        <CheckboxCard
          checked={value.confirmByPhone}
          onChange={(confirmByPhone) => patch({ confirmByPhone })}
          label={PREFERENCES_MESSAGES.CONFIRM_BY_PHONE}
        />
      </Field>

      <Field label={PREFERENCES_MESSAGES.SPECIAL_OFFERS_LABEL}>
        <CheckboxCard
          checked={value.subscribeSpecialOffers}
          onChange={(subscribeSpecialOffers) => patch({ subscribeSpecialOffers })}
          label={PREFERENCES_MESSAGES.SPECIAL_OFFERS_OPTION}
        />
      </Field>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
});
