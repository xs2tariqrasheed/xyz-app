import { StyleSheet, View } from 'react-native';

import { CheckboxCard } from '@/components/ui/Checkbox';
import { Field } from '@/components/ui/Field';
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
      <Field label="Confirmation through">
        <CheckboxCard
          checked={value.confirmByPhone}
          onChange={(confirmByPhone) => patch({ confirmByPhone })}
          label="Phone"
        />
      </Field>

      <Field label="Subscribe special offer">
        <CheckboxCard
          checked={value.subscribeSpecialOffers}
          onChange={(subscribeSpecialOffers) => patch({ subscribeSpecialOffers })}
          label="Send me special offers"
        />
      </Field>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
});
