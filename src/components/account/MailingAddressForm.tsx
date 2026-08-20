import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { GlobeGlyph, PinGlyph } from '@/components/ui/Glyph';
import { RadioGroup, type RadioOption } from '@/components/ui/RadioGroup';
import { SelectField, type SelectOption } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { COUNTRIES, US_STATES } from '@/data/regions';
import { breakpoints, colors, space } from '@/theme';
import { formatDialCode, formatIntlPhone, formatUsPhone, formatUsZip } from '@/utils/contact';

import {
  isUnitedStates,
  type AddressType,
  type MailingAddress,
  type MailingAddressErrors,
} from './mailingAddress';

export type MailingAddressFormProps = {
  value: MailingAddress;
  onChange: (next: MailingAddress) => void;
  /** Only populated once the form has been submitted at least once. */
  errors: MailingAddressErrors;
};

const ADDRESS_TYPES: readonly RadioOption<AddressType>[] = [
  { value: 'home', label: 'This is my home address', description: 'Residential delivery.' },
  { value: 'office', label: 'This is my office address', description: 'Business hours delivery.' },
];

export function MailingAddressForm({ value, onChange, errors }: MailingAddressFormProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;

  const domestic = isUnitedStates(value);
  const patch = (next: Partial<MailingAddress>) => onChange({ ...value, ...next });

  const countryOptions = useMemo<readonly SelectOption<string>[]>(
    () => COUNTRIES.map((country) => ({ value: country, label: country })),
    [],
  );
  const stateOptions = useMemo<readonly SelectOption<string>[]>(
    () => US_STATES.map((state) => ({ value: state.code, label: state.name, description: state.code })),
    [],
  );

  const rowStyle = [styles.row, twoUp ? styles.rowWide : null];
  // Capping a short field only pays off side by side; stacked, it reads as a
  // half-drawn input.
  const buildingStyle = twoUp ? styles.buildingField : styles.field;
  const dialStyle = twoUp ? styles.dialField : styles.field;
  const streetStyle = twoUp ? styles.streetField : styles.field;

  return (
    <View style={styles.root}>
      <View style={rowStyle}>
        <SelectField
          style={styles.field}
          label="Country"
          required
          value={value.country}
          options={countryOptions}
          onChange={(country) =>
            // The region field changes meaning with the country, so a switch
            // clears it rather than leaving a US code on a foreign address.
            patch({ country, state: country === value.country ? value.state : '' })
          }
          icon={<GlobeGlyph color={colors.primary[600]} />}
          placeholder="Select a country"
          sheetTitle="Country"
          sheetSubtitle="Where should we send your mail?"
          searchPlaceholder="Search countries"
          error={errors.country}
        />

        {domestic ? (
          <SelectField
            style={styles.field}
            label="State"
            required
            value={value.state}
            options={stateOptions}
            onChange={(state) => patch({ state })}
            icon={<PinGlyph color={colors.primary[600]} />}
            placeholder="Select a state"
            sheetTitle="State"
            sheetSubtitle="States, DC and US territories."
            searchPlaceholder="Search states"
            error={errors.state}
          />
        ) : (
          <TextField
            style={styles.field}
            label="State / Province"
            required
            value={value.state}
            onChangeText={(state) => patch({ state })}
            placeholder="Region"
            autoCapitalize="words"
            autoComplete="postal-address-region"
            textContentType="addressState"
            error={errors.state}
          />
        )}
      </View>

      <View style={rowStyle}>
        <TextField
          style={styles.field}
          label="City"
          required
          value={value.city}
          onChangeText={(city) => patch({ city })}
          placeholder="e.g. Manhattan"
          autoCapitalize="words"
          autoComplete="postal-address-locality"
          textContentType="addressCity"
          error={errors.city}
        />
        <TextField
          style={styles.field}
          label={domestic ? 'ZIP' : 'Postal code'}
          required
          value={value.postalCode}
          onChangeText={(postalCode) =>
            patch({ postalCode: domestic ? formatUsZip(postalCode) : postalCode })
          }
          placeholder={domestic ? '10103' : 'Postal code'}
          keyboardType={domestic ? 'number-pad' : 'default'}
          autoComplete="postal-code"
          textContentType="postalCode"
          hint={domestic ? '5 digits, or 9 for ZIP+4.' : undefined}
          error={errors.postalCode}
        />
      </View>

      <View style={rowStyle}>
        <TextField
          style={buildingStyle}
          label="Building no."
          required
          value={value.buildingNumber}
          onChangeText={(buildingNumber) => patch({ buildingNumber })}
          placeholder="666"
          keyboardType="default"
          error={errors.buildingNumber}
        />
        <TextField
          style={streetStyle}
          label="Street name"
          required
          value={value.streetName}
          onChangeText={(streetName) => patch({ streetName })}
          placeholder="5 Ave"
          autoCapitalize="words"
          autoComplete="street-address"
          textContentType="streetAddressLine1"
          error={errors.streetName}
        />
      </View>

      <View style={rowStyle}>
        <TextField
          style={styles.field}
          label="Cross street"
          value={value.crossStreet}
          onChangeText={(crossStreet) => patch({ crossStreet })}
          placeholder="53 St"
          autoCapitalize="words"
          autoComplete="address-line2"
          hint="Optional — helps the driver find the door."
        />
        <TextField
          style={styles.field}
          label="Apt # / Mail stop"
          value={value.unit}
          onChangeText={(unit) => patch({ unit })}
          placeholder="Apt 4B"
          autoComplete="address-line2"
          textContentType="streetAddressLine2"
        />
      </View>

      <View style={styles.divider} />

      <TextField
        label="Phone at this address (US)"
        value={value.phone}
        onChangeText={(phone) => patch({ phone: formatUsPhone(phone) })}
        placeholder="(212) 555-0134"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        hint="Optional. We only call about a delivery."
        error={errors.phone}
      />

      <View style={styles.intl}>
        <Text style={styles.intlLabel}>International phone</Text>
        <View style={rowStyle}>
          <TextField
            style={dialStyle}
            label="Country + city code"
            value={value.intlDialCode}
            onChangeText={(intlDialCode) => patch({ intlDialCode: formatDialCode(intlDialCode) })}
            placeholder="+44 20"
            keyboardType="phone-pad"
            error={errors.intlDialCode}
          />
          <TextField
            style={streetStyle}
            label="Phone number"
            value={value.intlPhone}
            onChangeText={(intlPhone) => patch({ intlPhone: formatIntlPhone(intlPhone) })}
            placeholder="7123 456789"
            keyboardType="phone-pad"
            error={errors.intlPhone}
          />
        </View>
      </View>

      <View style={styles.divider} />

      <RadioGroup
        label="Address type"
        required
        value={value.addressType}
        options={ADDRESS_TYPES}
        onChange={(addressType) => patch({ addressType })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  row: { gap: space.lg },
  rowWide: { flexDirection: 'row', alignItems: 'flex-start' },
  field: { flex: 1 },
  // The building number never needs the room a street name does.
  buildingField: { flex: 1, maxWidth: 160 },
  dialField: { flex: 1, maxWidth: 180 },
  streetField: { flex: 2 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: -space.xs },

  intl: { gap: space.sm },
  intlLabel: { color: colors.textStrong, fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
});
