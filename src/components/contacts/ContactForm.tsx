import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SelectField, type SelectOption } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { CONTACTS_MESSAGES as M } from '@/constants/messages';
import { breakpoints, space } from '@/theme';
import {
  CONTACT_TYPES,
  contactType,
  DEFAULT_CONTACT_TYPE,
  formatPhone,
  phoneDigits,
  validateContact,
  type ContactErrors,
  type ContactTypeId,
} from '@/utils/contacts';

import { ContactTypeGlyph } from './ContactTypeGlyph';

export type ContactDraft = {
  type: ContactTypeId;
  value: string;
  extension: string;
};

export type ContactFormProps = {
  /** `edit` swaps the submit label; the fields are the same. */
  mode: 'add' | 'edit';
  initial?: ContactDraft;
  /**
   * Saves the draft. Resolves with a message when it is refused — a duplicate,
   * or the gateway's own reason — which is shown under the value field.
   */
  onSubmit: (draft: ContactDraft) => Promise<string | null>;
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
  const [extension, setExtension] = useState(initial?.extension ?? '');
  const [errors, setErrors] = useState<ContactErrors>({});
  const [saving, setSaving] = useState(false);

  const { kind, hasExtension } = contactType(type);
  const isPhone = kind === 'phone';

  const changeType = (nextType: ContactTypeId) => {
    setErrors({});
    setType(nextType);
    // A number is meaningless in an email field and vice versa, so the value
    // only survives a switch between two types of the same kind.
    if (contactType(nextType).kind !== kind) setValue('');
    if (!contactType(nextType).hasExtension) setExtension('');
  };

  const changeValue = (nextValue: string) => {
    setErrors({});
    setValue(isPhone ? formatPhone(nextValue) : nextValue);
  };

  const changeExtension = (nextValue: string) => {
    setErrors((current) => ({ ...current, extension: undefined }));
    setExtension(phoneDigits(nextValue).slice(0, 5));
  };

  const submit = async () => {
    if (saving) return;
    const invalid = validateContact(type, value, extension);
    if (invalid.value || invalid.extension) {
      setErrors(invalid);
      return;
    }

    setSaving(true);
    const rejected = await onSubmit({ type, value, extension });
    setSaving(false);
    if (rejected) {
      setErrors({ value: rejected });
      return;
    }

    if (mode === 'add') {
      // Keep the type — most people add several numbers of the same kind.
      setValue('');
      setExtension('');
    }
  };

  const submitLabel = saving ? (mode === 'edit' ? M.SAVING : M.ADDING) : mode === 'edit' ? M.SAVE : M.ADD;

  return (
    <View style={styles.root}>
      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <SelectField
          style={styles.field}
          label={M.TYPE_LABEL}
          required
          value={type}
          options={TYPE_OPTIONS}
          onChange={changeType}
          icon={<ContactTypeGlyph type={type} />}
          sheetTitle={M.TYPE_SHEET_TITLE}
          confirmLabel={M.TYPE_CONFIRM}
        />

        <TextField
          style={styles.field}
          label={isPhone ? M.NUMBER_LABEL : M.EMAIL_LABEL}
          required
          error={errors.value}
          value={value}
          onChangeText={changeValue}
          onSubmitEditing={submit}
          placeholder={isPhone ? M.PHONE_PLACEHOLDER : M.EMAIL_PLACEHOLDER}
          keyboardType={isPhone ? 'phone-pad' : 'email-address'}
          inputMode={isPhone ? 'tel' : 'email'}
          autoComplete={isPhone ? 'tel' : 'email'}
          textContentType={isPhone ? 'telephoneNumber' : 'emailAddress'}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={isPhone ? undefined : 50}
        />

        {hasExtension ? (
          <TextField
            style={twoUp ? styles.extension : null}
            label={M.EXTENSION_LABEL}
            error={errors.extension}
            value={extension}
            onChangeText={changeExtension}
            placeholder={M.EXTENSION_PLACEHOLDER}
            keyboardType="number-pad"
            inputMode="numeric"
          />
        ) : null}
      </View>

      <View style={[styles.actions, twoUp ? styles.actionsWide : null]}>
        <Button label={submitLabel} onPress={submit} disabled={saving} />
        <Button label={M.CANCEL} variant="outline" onPress={onCancel} disabled={saving} />
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
  // An extension never needs the width of a number; only applied in a row.
  extension: { flex: 0.4 },
  actions: { gap: space.md },
  actionsWide: { flexDirection: 'row', justifyContent: 'flex-end' },
});
