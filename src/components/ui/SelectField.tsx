import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, focusedFieldStyle, nativeFocusRingReset, radii, space } from '@/theme';

import { CheckGlyph } from './Glyph';
import { PickerField } from './PickerField';
import { Sheet } from './Sheet';

export type SelectOption = {
  value: string;
  label: string;
  /** Secondary text on the option row, e.g. a state code. */
  caption?: string;
};

export type SelectFieldProps = {
  label: string;
  /** The chosen option's `value`; empty string means nothing is picked yet. */
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
  sheetTitle?: string;
  sheetSubtitle?: string;
  searchPlaceholder?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/** Lists longer than this get a search box — below it, scrolling is quicker. */
const SEARCH_THRESHOLD = 12;

/**
 * Single-choice select: a picker field over a sheet full of options.
 *
 * Same draft-then-confirm contract as `DateField` — the sheet edits a draft and
 * only the Confirm button commits, so a mis-tap on a long list costs nothing.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  icon,
  placeholder = 'Select',
  sheetTitle,
  sheetSubtitle,
  searchPlaceholder = 'Search',
  required,
  hint,
  error,
  style,
}: SelectFieldProps) {
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const selected = options.find((option) => option.value === value);
  const draftOption = options.find((option) => option.value === draft);
  const searchable = options.length > SEARCH_THRESHOLD;

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return options;

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.caption?.toLowerCase().includes(needle),
    );
  }, [options, query]);

  // A list this long opens hundreds of rows above the current value. Options
  // never wrap, so every row is the same height: measure the first one and the
  // offset of the selected row is just its index times that height.
  const listRef = useRef<ScrollView>(null);
  const rowHeight = useRef(0);
  const restored = useRef(false);

  const restoreScroll = () => {
    if (restored.current || rowHeight.current === 0 || query.length > 0) return;

    const index = options.findIndex((option) => option.value === value);
    if (index < 1) return;

    restored.current = true;
    listRef.current?.scrollTo({ y: index * rowHeight.current, animated: false });
  };

  const openSheet = () => {
    setDraft(value);
    setQuery('');
    restored.current = false;
    setOpen(true);
  };

  return (
    <>
      <PickerField
        label={label}
        required={required}
        hint={hint}
        error={error}
        style={style}
        value={selected?.label}
        caption={selected?.caption}
        placeholder={placeholder}
        icon={icon}
        onPress={openSheet}
      />

      <Sheet
        visible={open}
        title={sheetTitle ?? label}
        subtitle={sheetSubtitle}
        footerHint={draftOption?.label ?? 'Nothing selected'}
        confirmLabel="Select"
        onClose={() => setOpen(false)}
        onConfirm={() => {
          if (draftOption) onChange(draftOption.value);
          setOpen(false);
        }}
      >
        {searchable ? (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textDisabled}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={`Search ${label}`}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={[styles.search, searchFocused ? styles.searchFocused : null]}
          />
        ) : null}

        <ScrollView
          ref={listRef}
          style={[styles.list, { maxHeight: Math.min(340, height * 0.42) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {matches.length === 0 ? (
            <Text style={styles.empty}>No matches for “{query.trim()}”.</Text>
          ) : null}

          {matches.map((option, index) => {
            const checked = option.value === draft;

            return (
              <Pressable
                key={option.value}
                onLayout={
                  index === 0
                    ? (event) => {
                        rowHeight.current = event.nativeEvent.layout.height;
                        restoreScroll();
                      }
                    : undefined
                }
                accessibilityRole="radio"
                accessibilityState={{ checked }}
                // react-native-web no longer derives aria-checked from accessibilityState.
                aria-checked={checked}
                accessibilityLabel={option.label}
                onPress={() => setDraft(option.value)}
                style={({ pressed }) => [
                  styles.option,
                  index > 0 ? styles.optionDivided : null,
                  checked ? styles.optionChecked : null,
                  pressed && !checked ? styles.optionPressed : null,
                ]}
              >
                <View style={styles.optionText}>
                  <Text
                    style={[styles.optionLabel, checked ? styles.optionLabelChecked : null]}
                    numberOfLines={1}
                  >
                    {option.label}
                  </Text>
                  {option.caption ? (
                    <Text style={styles.optionCaption} numberOfLines={1}>
                      {option.caption}
                    </Text>
                  ) : null}
                </View>
                {checked ? <CheckGlyph color={colors.primary[600]} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    ...nativeFocusRingReset,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    fontSize: 15,
    color: colors.textStrong,
    marginBottom: space.md,
  },
  searchFocused: focusedFieldStyle,

  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  empty: { color: colors.textMuted, fontSize: 14, padding: space.md },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    minHeight: 46,
  },
  optionDivided: { borderTopWidth: 1, borderTopColor: colors.surfaceSunken },
  optionChecked: { backgroundColor: colors.surfaceSelected },
  optionPressed: { backgroundColor: colors.surfaceSunken },
  optionText: { flex: 1 },
  optionLabel: { color: colors.textStrong, fontSize: 15 },
  optionLabelChecked: { color: colors.primary[600], fontWeight: '600' },
  optionCaption: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
});
