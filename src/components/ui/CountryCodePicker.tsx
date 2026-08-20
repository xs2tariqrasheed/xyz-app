import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  COUNTRIES,
  findCountry,
  searchCountries,
  type Country,
} from '@/utils/phone';
import { colors, focusedFieldStyle, nativeFocusRingReset, radii, space } from '@/theme';

import { ChevronGlyph } from './Glyph';
import { Sheet } from './Sheet';

export type CountryCodePickerProps = {
  /** ISO alpha-2 code, or `null` while nothing is chosen. */
  value: string | null;
  onChange: (code: string) => void;
  /** Used in the picker's accessibility label, e.g. "callback phone". */
  fieldName: string;
};

/**
 * Leading control of the international phone field: an ISO chip plus the
 * dialling code, opening a searchable sheet.
 *
 * The chip shows the ISO code rather than a flag emoji — flag glyphs are
 * missing or substituted on some Android builds, and the code renders the
 * same everywhere.
 */
export function CountryCodePicker({ value, onChange, fieldName }: CountryCodePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(value);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const selected = findCountry(value);
  const drafted = findCountry(draft);
  const matches = searchCountries(query);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          selected
            ? `Country code for ${fieldName}: ${selected.name}, plus ${selected.dial}`
            : `Choose a country code for ${fieldName}`
        }
        onPress={() => {
          setDraft(value);
          setQuery('');
          setOpen(true);
        }}
        style={({ pressed }) => [styles.trigger, pressed ? styles.triggerPressed : null]}
      >
        {selected ? (
          <>
            <Text style={styles.iso}>{selected.code}</Text>
            <Text style={styles.dial}>+{selected.dial}</Text>
          </>
        ) : (
          <Text style={styles.placeholder}>Code</Text>
        )}
        <ChevronGlyph direction="down" color={colors.textMuted} size={7} />
      </Pressable>

      <Sheet
        visible={open}
        title="Country code"
        subtitle="Search by country, code or dialling code."
        footerHint={
          drafted
            ? `${drafted.name} · +${drafted.dial}`
            : `${matches.length} of ${COUNTRIES.length} countries`
        }
        confirmLabel="Use code"
        onClose={() => setOpen(false)}
        onConfirm={() => {
          if (draft) onChange(draft);
          setOpen(false);
        }}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="e.g. Ireland, IE or 353"
          placeholderTextColor={colors.textDisabled}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search countries"
          style={[styles.search, searchFocused ? styles.searchFocused : null]}
        />

        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {matches.length === 0 ? (
            <Text style={styles.empty}>No country matches “{query.trim()}”.</Text>
          ) : (
            matches.map((country) => (
              <Row
                key={country.code}
                country={country}
                selected={country.code === draft}
                onPress={() => setDraft(country.code)}
              />
            ))
          )}
        </ScrollView>
      </Sheet>
    </>
  );
}

function Row({
  country,
  selected,
  onPress,
}: {
  country: Country;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      aria-checked={selected}
      accessibilityLabel={`${country.name}, plus ${country.dial}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected ? styles.rowSelected : null,
        pressed && !selected ? styles.rowPressed : null,
      ]}
    >
      <View style={[styles.rowIso, selected ? styles.rowIsoSelected : null]}>
        <Text style={[styles.rowIsoText, selected ? styles.rowIsoTextSelected : null]}>
          {country.code}
        </Text>
      </View>
      <Text style={[styles.rowName, selected ? styles.rowNameSelected : null]} numberOfLines={1}>
        {country.name}
      </Text>
      <Text style={styles.rowDial}>+{country.dial}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm - 3,
    alignSelf: 'stretch',
    paddingLeft: space.md,
    paddingRight: space.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  triggerPressed: { backgroundColor: colors.surfaceSunken },
  iso: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  dial: { color: colors.textStrong, fontSize: 15, fontWeight: '600' },
  placeholder: { color: colors.textDisabled, fontSize: 15, fontWeight: '500' },

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
  },
  searchFocused: focusedFieldStyle,

  list: { maxHeight: 300, marginTop: space.md },
  empty: { color: colors.textMuted, fontSize: 13, paddingVertical: space.lg, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.sm,
    borderRadius: radii.sm,
  },
  rowPressed: { backgroundColor: colors.surfaceSunken },
  rowSelected: { backgroundColor: colors.surfaceSelected },
  rowIso: {
    width: 38,
    paddingVertical: 3,
    borderRadius: radii.sm - 2,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
  },
  rowIsoSelected: { backgroundColor: colors.primary[600] },
  rowIsoText: { color: colors.textBody, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  rowIsoTextSelected: { color: colors.textOnPrimary },
  rowName: { flex: 1, color: colors.textStrong, fontSize: 15 },
  rowNameSelected: { fontWeight: '600' },
  rowDial: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});
