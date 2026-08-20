import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, space } from '@/theme';

import { CheckGlyph, ChevronGlyph } from './Glyph';
import { PickerField } from './PickerField';
import { Sheet } from './Sheet';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  /** Secondary line under the option label. */
  description?: string;
};

export type SelectFieldProps<T extends string> = {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** Sits in the control's icon well. */
  icon: React.ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Sheet copy; defaults to the field label. */
  sheetTitle?: string;
  sheetSubtitle?: string;
  confirmLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Single-choice picker: a native `<select>` is web-only and iOS/Android wheels
 * look nothing alike, so the same list sheet is used on all three targets.
 *
 * The sheet edits a draft and commits on confirm, matching `DateField`.
 */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  required,
  hint,
  error,
  sheetTitle,
  sheetSubtitle,
  confirmLabel = 'Select',
  style,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const selected = options.find((option) => option.value === value);
  const draftOption = options.find((option) => option.value === draft);

  return (
    <>
      <PickerField
        label={label}
        required={required}
        hint={hint}
        error={error}
        style={style}
        value={selected?.label}
        caption={selected?.description}
        icon={icon}
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
      />

      <Sheet
        visible={open}
        title={sheetTitle ?? label}
        subtitle={sheetSubtitle}
        footerHint={draftOption?.label}
        confirmLabel={confirmLabel}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          onChange(draft);
          setOpen(false);
        }}
      >
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {options.map((option) => {
            const active = option.value === draft;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option.label}
                onPress={() => setDraft(option.value)}
                style={({ pressed }) => [
                  styles.option,
                  active ? styles.optionActive : null,
                  pressed && !active ? styles.optionPressed : null,
                ]}
              >
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>
                    {option.label}
                  </Text>
                  {option.description ? (
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  ) : null}
                </View>
                {active ? (
                  <CheckGlyph color={colors.primary[600]} size={13} />
                ) : (
                  <ChevronGlyph direction="right" color={colors.textDisabled} size={7} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  // Caps the sheet on a short phone; a five-option list never reaches it.
  list: { maxHeight: 340 },
  listContent: { gap: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.primary[400], backgroundColor: colors.surfaceSelected },
  optionPressed: { backgroundColor: colors.surfaceSunken },
  optionText: { flex: 1 },
  optionLabel: { color: colors.textStrong, fontSize: 15, fontWeight: '600' },
  optionLabelActive: { color: colors.primary[600] },
  optionDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 },
});
