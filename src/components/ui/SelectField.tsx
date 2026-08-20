import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space } from '@/theme';

import { ChevronGlyph, TickGlyph } from './Glyph';
import { PickerField } from './PickerField';
import { Sheet } from './Sheet';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  /** Optional second line, e.g. what the option covers. */
  description?: string;
};

export type SelectFieldProps<T extends string> = {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (next: T) => void;
  /** Leading icon in the closed control. Defaults to a chevron well. */
  icon?: React.ReactNode;
  sheetTitle?: string;
  sheetSubtitle?: string;
  confirmLabel?: string;
  required?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Dropdown. A native `<select>` would only exist on web, so this is the same
 * picker sheet the date and time fields use, with a list of options in it —
 * identical on web, iOS and Android.
 */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  sheetTitle,
  sheetSubtitle,
  confirmLabel = 'Apply',
  required,
  hint,
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
        style={style}
        value={selected?.label}
        caption={selected?.description}
        icon={icon ?? <ChevronGlyph direction="down" color={colors.primary[600]} size={9} />}
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
      />

      <Sheet
        visible={open}
        title={sheetTitle ?? label}
        subtitle={sheetSubtitle}
        footerHint={draftOption?.label ?? ''}
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
                  pressed ? styles.pressed : null,
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
                {active ? <TickGlyph /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  // Capped so a long list scrolls inside the sheet instead of pushing the
  // footer off a short phone screen.
  list: { maxHeight: 320 },
  listContent: { gap: space.sm },
  pressed: { opacity: 0.7 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.md - 2,
    minHeight: 48,
  },
  optionActive: { borderColor: colors.primary[300], backgroundColor: colors.surfaceSelected },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { color: colors.textStrong, fontSize: 15, fontWeight: '600' },
  optionLabelActive: { color: colors.primary[600] },
  optionDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
});
