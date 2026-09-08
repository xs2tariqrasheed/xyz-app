import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SelectField, type SelectOption } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { breakpoints, space } from '@/theme';
import {
  CONTACT_TYPES,
  contactType,
  DEFAULT_CONTACT_TYPE,
  formatPhone,
  validateContactValue,
  type ContactTypeId,
} from '@/utils/contacts';

import { ContactTypeGlyph } from './ContactTypeGlyph';

export type ContactDraft = {
  type: ContactTypeId;
  value: string;
};

export type ContactFormProps = {
  /** `edit` swaps the copy and the submit label; the fields are the same. */
  mode: 'add' | 'edit';
  initial?: ContactDraft;
  /**
   * Saves the draft. Returns a message when the parent rejects it — a
   * duplicate, say — which is shown under the value field.
   */
  onSubmit: (draft: ContactDraft) => string | null;
  onCancel: () => void;
};

const TYPE_OPTIONS: readonly SelectOption<ContactTypeId>[] = CONTACT_TYPES.map((type) => ({
  value: type.id,
  label: type.label,
}));

/**
 * Add or edit one contact.
 *
 * Holds its own draft: give it a `key` that changes with the contact being
 * edited so a new target starts from that contact's values.
 */
export function ContactForm({ mode, initial, onSubmit, onCancel }: ContactFormProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;

  const [type, setType] = useState<ContactTypeId>(initial?.type ?? DEFAULT_CONTACT_TYPE);
  const [value, setValue] = useState(() =>
    initial ? displayValue(initial.type, initial.value) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const { kind, placeholder } = contactType(type);
  const isPhone = kind === 'phone';

  const changeType = (nextType: ContactTypeId) => {
    setError(null);
    setType(nextType);
    // A number is meaningless in an email field and vice versa, so the value
    // only survives a switch between two types of the same kind.
    if (contactType(nextType).kind !== kind) setValue('');
  };

  const changeValue = (nextValue: string) => {
    setError(null);
    setValue(isPhone ? formatPhone(nextValue) : nextValue);
  };

  const submit = () => {
    const invalid = validateContactValue(type, value);
    if (invalid) {
      setError(invalid);
      return;
    }

    const rejected = onSubmit({ type, value });
    if (rejected) {
      setError(rejected);
      return;
    }

    if (mode === 'add') {
      // Keep the type — most people add several numbers of the same kind.
      setValue('');
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <SelectField
          style={styles.field}
          label="Contact Type"
          required
          value={type}
          options={TYPE_OPTIONS}
          onChange={changeType}
          icon={<ContactTypeGlyph type={type} />}
          sheetTitle="Contact type"
          confirmLabel="Use this type"
        />

        <TextField
          style={styles.field}
          label={isPhone ? 'Contact Number' : 'Email Address'}
          required
          error={error ?? undefined}
          value={value}
          onChangeText={changeValue}
          onSubmitEditing={submit}
          placeholder={placeholder}
          keyboardType={isPhone ? 'phone-pad' : 'email-address'}
          inputMode={isPhone ? 'tel' : 'email'}
          autoComplete={isPhone ? 'tel' : 'email'}
          textContentType={isPhone ? 'telephoneNumber' : 'emailAddress'}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>

      <View style={[styles.actions, twoUp ? styles.actionsWide : null]}>
        <Button label={mode === 'edit' ? 'Save changes' : 'Add'} onPress={submit} />
        <Button label="Cancel" variant="outline" onPress={onCancel} />
      </View>
    </View>
  );
}

function displayValue(type: ContactTypeId, value: string): string {
  return contactType(type).kind === 'phone' ? formatPhone(value) : value;
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  row: { gap: space.lg },
  rowWide: { flexDirection: 'row' },
  field: { flex: 1 },
  actions: { gap: space.md },
  actionsWide: { flexDirection: 'row', justifyContent: 'flex-end' },
});
