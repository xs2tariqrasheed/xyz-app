import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ADDRESS_BOOK_MESSAGES as M } from '@/constants/messages';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';
import { formatUsPhone, toDigits } from '@/utils/phone';

import type { AddressDraft, AddressErrors } from './savedAddress';

export type AddressFormProps = {
  draft: AddressDraft;
  errors: AddressErrors;
  /** True while an existing location is loaded, which swaps the copy. */
  editing: boolean;
  /** A save is in flight: the buttons wait for it. */
  saving: boolean;
  /** The gateway's refusal of the last save, shown above the buttons. */
  formError: string | null;
  onChange: (next: AddressDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

/** Field limits from the old address book (reverse-engineer-guide/11 §3). */
const MAX = { zip: 5, building: 6, street: 30, ext: 5, directions: 500 } as const;

/**
 * Add or edit one saved location.
 *
 * Fully controlled: the screen owns the draft so a row in the list can load
 * itself into the form, and so cancelling is a single reset.
 */
export function AddressForm({
  draft,
  errors,
  editing,
  saving,
  formError,
  onChange,
  onSubmit,
  onCancel,
}: AddressFormProps) {
  const { width } = useWindowDimensions();
  // Phones keep one field per line; anything wider pairs them up.
  const twoUp = width >= breakpoints.sm;

  const patch = (next: Partial<AddressDraft>) => onChange({ ...draft, ...next });

  const submitLabel = saving ? (editing ? M.SAVING : M.ADDING) : editing ? M.SAVE : M.ADD;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{editing ? M.FORM_TITLE_EDIT : M.FORM_TITLE_ADD}</Text>
        <Badge label={editing ? M.BADGE_EDITING : M.BADGE_NEW} tone={editing ? 'accent' : 'primary'} />
      </View>

      <GroupLabel text={M.GROUP_ADDRESS} />

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label={M.COUNTRY_LABEL}
          required
          value={draft.country}
          onChangeText={(country) => patch({ country })}
          error={errors.country}
          placeholder={M.COUNTRY_PLACEHOLDER}
          autoComplete="country"
          textContentType="countryName"
          autoCapitalize="words"
        />
        <TextField
          style={styles.field}
          label={M.STATE_LABEL}
          required
          value={draft.state}
          onChangeText={(state) => patch({ state })}
          error={errors.state}
          placeholder={M.STATE_PLACEHOLDER}
          autoComplete="postal-address-region"
          textContentType="addressState"
          autoCapitalize="characters"
        />
      </View>

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label={M.CITY_LABEL}
          required
          value={draft.city}
          onChangeText={(city) => patch({ city })}
          error={errors.city}
          placeholder={M.CITY_PLACEHOLDER}
          autoComplete="postal-address-locality"
          textContentType="addressCity"
          autoCapitalize="words"
        />
        <TextField
          style={styles.field}
          label={M.ZIP_LABEL}
          value={draft.zip}
          onChangeText={(zip) => patch({ zip: toDigits(zip, MAX.zip) })}
          error={errors.zip}
          placeholder={M.ZIP_PLACEHOLDER}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="postal-code"
          textContentType="postalCode"
        />
      </View>

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={twoUp ? styles.building : null}
          label={M.BUILDING_LABEL}
          required
          value={draft.building}
          onChangeText={(building) => patch({ building: toDigits(building, MAX.building) })}
          error={errors.building}
          placeholder={M.BUILDING_PLACEHOLDER}
          keyboardType="number-pad"
          inputMode="numeric"
        />
        <TextField
          style={styles.field}
          label={M.STREET_LABEL}
          required
          value={draft.street}
          onChangeText={(street) => patch({ street })}
          error={errors.street}
          placeholder={M.STREET_PLACEHOLDER}
          autoComplete="street-address"
          textContentType="streetAddressLine1"
          autoCapitalize="words"
          maxLength={MAX.street}
        />
      </View>

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label={M.CROSS_STREET_LABEL}
          value={draft.crossStreet}
          onChangeText={(crossStreet) => patch({ crossStreet })}
          error={errors.crossStreet}
          placeholder={M.CROSS_STREET_PLACEHOLDER}
          autoCapitalize="words"
          maxLength={MAX.street}
        />
        <TextField
          style={styles.field}
          label={M.PICKUP_POINT_LABEL}
          value={draft.pickupPoint}
          onChangeText={(pickupPoint) => patch({ pickupPoint })}
          error={errors.pickupPoint}
          placeholder={M.PICKUP_POINT_PLACEHOLDER}
          autoCapitalize="sentences"
        />
      </View>

      <GroupLabel text={M.GROUP_CALLBACK} />

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label={M.US_PHONE_LABEL}
          value={formatUsPhone(draft.phoneUs)}
          // The mask is re-derived from digits on every keystroke, so pasting a
          // formatted number and deleting through one both behave.
          onChangeText={(value) => patch({ phoneUs: toDigits(value, 10) })}
          error={errors.phoneUs}
          placeholder={M.US_PHONE_PLACEHOLDER}
          keyboardType="phone-pad"
          inputMode="tel"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
        <TextField
          style={twoUp ? styles.ext : null}
          label={M.EXT_LABEL}
          value={draft.phoneUsExt}
          onChangeText={(value) => patch({ phoneUsExt: toDigits(value, MAX.ext) })}
          keyboardType="number-pad"
          inputMode="numeric"
        />
      </View>

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={twoUp ? styles.code : null}
          label={M.DIAL_CODE_LABEL}
          value={draft.phoneIntlCode}
          onChangeText={(value) => patch({ phoneIntlCode: toDigits(value, 4) })}
          error={errors.phoneIntlCode}
          placeholder={M.DIAL_CODE_PLACEHOLDER}
          keyboardType="number-pad"
          inputMode="numeric"
        />
        <TextField
          style={styles.field}
          label={M.INTL_PHONE_LABEL}
          value={draft.phoneIntl}
          onChangeText={(phoneIntl) => patch({ phoneIntl })}
          error={errors.phoneIntl}
          placeholder={M.INTL_PHONE_PLACEHOLDER}
          keyboardType="phone-pad"
          inputMode="tel"
        />
        <TextField
          style={twoUp ? styles.ext : null}
          label={M.EXT_LABEL}
          value={draft.phoneIntlExt}
          onChangeText={(value) => patch({ phoneIntlExt: toDigits(value, MAX.ext) })}
          keyboardType="number-pad"
          inputMode="numeric"
        />
      </View>

      <GroupLabel text={M.GROUP_DIRECTIONS} />

      <TextField
        label={M.DIRECTIONS_LABEL}
        value={draft.directions}
        onChangeText={(directions) => patch({ directions })}
        error={errors.directions}
        placeholder={M.DIRECTIONS_PLACEHOLDER}
        multiline
        numberOfLines={4}
        autoCapitalize="sentences"
        maxLength={MAX.directions}
      />

      {formError ? <Alert tone="danger" title={M.SAVE_FAILED_TITLE} message={formError} /> : null}

      <View style={[styles.actions, twoUp ? styles.actionsWide : null]}>
        <Button label={M.CANCEL} variant="outline" onPress={onCancel} disabled={saving} />
        <Button label={submitLabel} onPress={onSubmit} size="lg" disabled={saving} />
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
