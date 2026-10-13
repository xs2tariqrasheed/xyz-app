import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Field } from '@/components/ui/Field';
import { useAddressSuggestions } from '@/hooks/useAddressSuggestions';
import { hasGoogleMapsKey } from '@/config/maps';
import { formatAddress, MIN_QUERY_LENGTH, type AddressSuggestion } from '@/services/places';
import { colors, focusedFieldStyle, nativeFocusRingReset, radii, shadowValues, space } from '@/theme';

export type AddressFieldProps = {
  label: string;
  placeholder: string;
  value: AddressSuggestion | null;
  onChange: (address: AddressSuggestion | null) => void;
  /** Letter shown in the leading well; matches the pin label on the map. */
  marker: string;
  markerColor: string;
  required?: boolean;
  hint?: string;
  /** Fired when the text input takes focus — lets a parent highlight a group. */
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * react-native-web holds `onPressIn` back 50 ms by default. A mouse press moves
 * focus off the input at once, its blur closes the list, and the unmounting
 * option drops the pending press — so on web a click never selected anything.
 * Native names the same setting `unstable_pressDelay`; web reads
 * `delayPressIn`, which React Native's types do not declare.
 */
const PRESS_IN_WITHOUT_DELAY = { unstable_pressDelay: 0, delayPressIn: 0 };

/**
 * Address input with Places autocomplete.
 *
 * A combobox, not a free-text field: typing only drives the search, and the
 * committed value changes when a suggestion is picked or the field is cleared.
 * Leaving without picking restores the committed address.
 */
export function AddressField({
  label,
  placeholder,
  value,
  onChange,
  marker,
  markerColor,
  required,
  hint,
  onFocus,
  onBlur,
  style,
}: AddressFieldProps) {
  const [query, setQuery] = useState(() => (value ? formatAddress(value) : ''));
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [committed, setCommitted] = useState(value);

  // The parent can replace the value from outside — the swap button does. Sync
  // the text during render rather than in an effect.
  if (committed !== value) {
    setCommitted(value);
    setQuery(value ? formatAddress(value) : '');
  }

  const { suggestions, loading, error } = useAddressSuggestions(query, open);
  const showList = open && query.trim().length >= MIN_QUERY_LENGTH;

  const select = (address: AddressSuggestion) => {
    setQuery(formatAddress(address));
    setOpen(false);
    onChange(address);
  };

  const clear = () => {
    setQuery('');
    setOpen(false);
    onChange(null);
  };

  return (
    <View style={[styles.root, showList ? styles.rootRaised : null, style]}>
      <Field label={label} required={required} hint={hint}>
        <View style={[styles.control, focused ? styles.controlFocused : null]}>
          <View style={[styles.marker, { backgroundColor: markerColor }]}>
            <Text style={styles.markerLabel}>{marker}</Text>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={colors.textDisabled}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            accessibilityLabel={label}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
              onFocus?.();
            }}
            onBlur={() => {
              setFocused(false);
              setOpen(false);
              // Nothing was picked, so fall back to the committed address.
              setQuery(value ? formatAddress(value) : '');
              onBlur?.();
            }}
            style={styles.input}
          />

          {loading ? <ActivityIndicator size="small" color={colors.primary[500]} /> : null}

          {query.length > 0 && !loading ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Clear ${label}`}
              onPress={clear}
              style={({ pressed }) => [styles.clear, pressed ? styles.clearPressed : null]}
            >
              <Text style={styles.clearGlyph}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </Field>

      {showList ? (
        <View style={styles.dropdown}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!error && suggestions.length === 0 && !loading ? (
            <Text style={styles.empty}>No matching addresses.</Text>
          ) : null}

          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.placeId}
              accessibilityRole="button"
              accessibilityLabel={formatAddress(suggestion)}
              // Press-in beats the input's blur, which would otherwise close
              // the list before the tap lands.
              onPressIn={() => select(suggestion)}
              {...PRESS_IN_WITHOUT_DELAY}
              style={({ pressed }) => [
                styles.option,
                index > 0 ? styles.optionDivided : null,
                pressed ? styles.optionPressed : null,
              ]}
            >
              <Text style={styles.optionPrimary} numberOfLines={1}>
                {suggestion.primary}
              </Text>
              {suggestion.secondary ? (
                <Text style={styles.optionSecondary} numberOfLines={1}>
                  {suggestion.secondary}
                </Text>
              ) : null}
            </Pressable>
          ))}

          {!hasGoogleMapsKey ? (
            <Text style={styles.sampleNote}>
              Sample addresses — add a Google Maps key for live results.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // zIndex orders on iOS and web; Android needs elevation to match.
  root: { position: 'relative', zIndex: 1 },
  rootRaised: { zIndex: 30, elevation: 30 },

  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md - 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 50,
  },
  controlFocused: focusedFieldStyle,
  marker: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLabel: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '800' },
  input: { ...nativeFocusRingReset, flex: 1, fontSize: 15, color: colors.textStrong },
  clear: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearPressed: { backgroundColor: colors.border },
  clearGlyph: { color: colors.textBody, fontSize: 11, fontWeight: '700', lineHeight: 14 },

  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
    boxShadow: shadowValues.md,
  },
  option: { paddingHorizontal: space.md, paddingVertical: space.sm + 2 },
  optionDivided: { borderTopWidth: 1, borderTopColor: colors.surfaceSunken },
  optionPressed: { backgroundColor: colors.surfaceSelected },
  optionPrimary: { color: colors.textStrong, fontSize: 14, fontWeight: '600' },
  optionSecondary: { color: colors.textMuted, fontSize: 12, marginTop: 1 },

  error: { color: colors.danger, fontSize: 13, padding: space.md },
  empty: { color: colors.textMuted, fontSize: 13, padding: space.md },
  sampleNote: {
    color: colors.textMuted,
    fontSize: 11,
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
});
