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

import { ChevronGlyph, TickGlyph } from './Glyph';
import { PickerField } from './PickerField';
import { Sheet } from './Sheet';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  /** Optional second line, e.g. what the option covers, or a state code. */
  description?: string;
};

export type SelectFieldProps<T extends string> = {
  label: string;
  /** The chosen option's `value`. Pass `''` (part of `T`) while nothing is picked yet. */
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (next: T) => void;
  /** Leading icon in the closed control. Defaults to a chevron well. */
  icon?: React.ReactNode;
  placeholder?: string;
  sheetTitle?: string;
  sheetSubtitle?: string;
  confirmLabel?: string;
  searchPlaceholder?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/** Lists longer than this get a search box — below it, scrolling is quicker. */
const SEARCH_THRESHOLD = 12;

/**
 * Dropdown. A native `<select>` would only exist on web, so this is the same
 * picker sheet the date and time fields use, with a list of options in it —
 * identical on web, iOS and Android. Same draft-then-confirm contract as
 * `DateField`: the sheet edits a draft and only the confirm button commits,
 * so a mis-tap on a long list costs nothing.
 */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  placeholder = 'Select',
  sheetTitle,
  sheetSubtitle,
  confirmLabel = 'Apply',
  searchPlaceholder = 'Search',
  required,
  hint,
  error,
  style,
}: SelectFieldProps<T>) {
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
        option.description?.toLowerCase().includes(needle),
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
        caption={selected?.description}
        placeholder={placeholder}
        icon={icon ?? <ChevronGlyph direction="down" color={colors.primary[600]} size={9} />}
        onPress={openSheet}
      />

      <Sheet
        visible={open}
        title={sheetTitle ?? label}
        subtitle={sheetSubtitle}
        footerHint={draftOption?.label ?? 'Nothing selected'}
        confirmLabel={confirmLabel}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          onChange(draft);
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
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {matches.length === 0 ? (
            <Text style={styles.empty}>No matches for “{query.trim()}”.</Text>
          ) : null}

          {matches.map((option, index) => {
            const active = option.value === draft;

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

  // Capped so a long list scrolls inside the sheet instead of pushing the
  // footer off a short phone screen.
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  listContent: { gap: space.sm, padding: space.sm },
  empty: { color: colors.textMuted, fontSize: 14, padding: space.md },
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
