import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';
import { formatUsPhone, toDigits } from '@/utils/phone';

import type { AddressDraft, AddressErrors } from './savedAddress';

export type AddressFormProps = {
  draft: AddressDraft;
  errors: AddressErrors;
  /** True while an existing location is loaded, which swaps the copy. */
  editing: boolean;
  onChange: (next: AddressDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

/**
 * Add or edit one saved location.
 *
 * Fully controlled: the screen owns the draft so a row in the list can load
 * itself into the form, and so cancelling is a single reset.
 */
export function AddressForm({ draft, errors, editing, onChange, onSubmit, onCancel }: AddressFormProps) {
  const { width } = useWindowDimensions();
  // Phones keep one field per line; anything wider pairs them up.
  const twoUp = width >= breakpoints.sm;

  const patch = (next: Partial<AddressDraft>) => onChange({ ...draft, ...next });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{editing ? 'Edit this location' : 'Add a location'}</Text>
        <Badge label={editing ? 'EDITING' : 'NEW'} tone={editing ? 'accent' : 'primary'} />
      </View>

      <GroupLabel text="Address" />

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label="Country"
          required
          value={draft.country}
          onChangeText={(country) => patch({ country })}
          error={errors.country}
          placeholder="United States"
          autoComplete="country"
          textContentType="countryName"
          autoCapitalize="words"
        />
        <TextField
          style={styles.field}
          label="State"
          required
          value={draft.state}
          onChangeText={(state) => patch({ state })}
          error={errors.state}
          placeholder="e.g. NY"
          autoComplete="postal-address-region"
          textContentType="addressState"
          autoCapitalize="characters"
        />
      </View>

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label="City"
          required
          value={draft.city}
          onChangeText={(city) => patch({ city })}
          error={errors.city}
          placeholder="e.g. Manhattan"
          autoComplete="postal-address-locality"
          textContentType="addressCity"
          autoCapitalize="words"
        />
        <TextField
          style={styles.field}
          label="ZIP"
          value={draft.zip}
          onChangeText={(zip) => patch({ zip })}
          error={errors.zip}
          placeholder="e.g. 10019"
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="postal-code"
          textContentType="postalCode"
          maxLength={10}
        />
      </View>

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={twoUp ? styles.building : null}
          label="Building #"
          value={draft.building}
          onChangeText={(building) => patch({ building })}
          placeholder="666"
          keyboardType="numbers-and-punctuation"
        />
        <TextField
          style={styles.field}
          label="Street name"
          required
          value={draft.street}
          onChangeText={(street) => patch({ street })}
          error={errors.street}
          placeholder="e.g. 5 Ave"
          autoComplete="street-address"
          textContentType="streetAddressLine1"
          autoCapitalize="words"
        />
      </View>

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label="Cross street"
          value={draft.crossStreet}
          onChangeText={(crossStreet) => patch({ crossStreet })}
          placeholder="e.g. W 53 St"
          autoCapitalize="words"
        />
        <TextField
          style={styles.field}
          label="Pickup point"
          value={draft.pickupPoint}
          onChangeText={(pickupPoint) => patch({ pickupPoint })}
          placeholder="e.g. North entrance"
          autoCapitalize="sentences"
        />
      </View>

      <GroupLabel text="Callback numbers" />

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label="Callback phone (US)"
          value={formatUsPhone(draft.phoneUs)}
          // The mask is re-derived from digits on every keystroke, so pasting a
          // formatted number and deleting through one both behave.
          onChangeText={(value) => patch({ phoneUs: toDigits(value, 10) })}
          error={errors.phoneUs}
          placeholder="(212) 555-0134"
          keyboardType="phone-pad"
          inputMode="tel"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
        <TextField
          style={twoUp ? styles.ext : null}
          label="Ext."
          value={draft.phoneUsExt}
          onChangeText={(value) => patch({ phoneUsExt: toDigits(value, 6) })}
          placeholder="12"
          keyboardType="number-pad"
          inputMode="numeric"
        />
      </View>

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={twoUp ? styles.code : null}
          label="Dial code"
          value={draft.phoneIntlCode}
          onChangeText={(value) => patch({ phoneIntlCode: toDigits(value, 4) })}
          error={errors.phoneIntlCode}
          placeholder="44"
          keyboardType="number-pad"
          inputMode="numeric"
        />
        <TextField
          style={styles.field}
          label="Callback phone (international)"
          value={draft.phoneIntl}
          onChangeText={(phoneIntl) => patch({ phoneIntl })}
          placeholder="20 7946 0018"
          keyboardType="phone-pad"
          inputMode="tel"
        />
        <TextField
          style={twoUp ? styles.ext : null}
          label="Ext."
          value={draft.phoneIntlExt}
          onChangeText={(value) => patch({ phoneIntlExt: toDigits(value, 6) })}
          placeholder="4"
          keyboardType="number-pad"
          inputMode="numeric"
        />
      </View>

      <GroupLabel text="Directions" />

      <TextField
        label="Notes for the driver"
        value={draft.directions}
        onChangeText={(directions) => patch({ directions })}
        placeholder="Gate codes, which entrance to use, where to wait…"
        multiline
        numberOfLines={4}
        autoCapitalize="sentences"
      />

      <View style={[styles.actions, twoUp ? styles.actionsWide : null]}>
        <Button label="Cancel" variant="outline" onPress={onCancel} />
        <Button
          label={editing ? 'Save changes' : 'Add location'}
          onPress={onSubmit}
          size="lg"
        />
      </View>
    </View>
  );
}

/** Divides the form into the three things it asks for. */
function GroupLabel({ text }: { text: string }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupText}>{text}</Text>
      <View style={styles.groupRule} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: space.lg,
    gap: space.lg,
    boxShadow: shadowValues.sm,
  },

  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  // Takes the slack so the badge stays pinned to the end of the row.
  title: { flex: 1, color: colors.textHeading, fontSize: 17, fontWeight: '700' },

  group: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs },
  groupText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  groupRule: { flex: 1, height: 1, backgroundColor: colors.border },

  row: { gap: space.lg },
  rowWide: { flexDirection: 'row', alignItems: 'flex-start' },
  field: { flex: 1 },
  // Narrower companions: a house number, dial code or extension never needs
  // the width of a street name. Only applied while the row is a row — a
  // fractional `flex` in the stacked layout would shrink the field's height.
  building: { flex: 0.45 },
  code: { flex: 0.4 },
  ext: { flex: 0.4 },

  actions: { gap: space.md, marginTop: space.xs },
  // Phones stack the pair full width; wider screens park them on the right.
  actionsWide: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
});
