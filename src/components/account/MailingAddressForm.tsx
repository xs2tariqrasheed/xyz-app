import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { GlobeGlyph, PinGlyph } from '@/components/ui/Glyph';
import { RadioGroup, type RadioOption } from '@/components/ui/RadioGroup';
import { SelectField, type SelectOption } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { FIELD_LIMITS } from '@/constants/fieldLimits';
import { MAILING_ADDRESS_MESSAGES as M } from '@/constants/messages';
import { COUNTRIES, US_STATES } from '@/data/regions';
import { breakpoints, colors, space } from '@/theme';
import { formatDialCode, normalizeIntlPhone } from '@/utils/contact';
import { formatUsPhone, toDigits } from '@/utils/phone';

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
  { value: 'office', label: M.ADDRESS_TYPE_OFFICE },
  { value: 'home', label: M.ADDRESS_TYPE_HOME },
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
          label={M.COUNTRY_LABEL}
          required
          value={value.country}
          options={countryOptions}
          onChange={(country) =>
            // The region field changes meaning with the country, so a switch
            // clears it rather than leaving a US code on a foreign address.
            patch({ country, state: country === value.country ? value.state : '' })
          }
          icon={<GlobeGlyph color={colors.primary[600]} />}
          placeholder={M.COUNTRY_PLACEHOLDER}
          sheetTitle={M.COUNTRY_LABEL}
          searchPlaceholder={M.COUNTRY_SEARCH}
          error={errors.country}
        />

        {domestic ? (
          <SelectField
            style={styles.field}
            label={M.STATE_LABEL}
            required
            value={value.state}
            options={stateOptions}
            onChange={(state) => patch({ state })}
            icon={<PinGlyph color={colors.primary[600]} />}
            placeholder={M.STATE_PLACEHOLDER}
            sheetTitle={M.STATE_LABEL}
            searchPlaceholder={M.STATE_SEARCH}
            error={errors.state}
          />
        ) : (
          <TextField
            style={styles.field}
            label={M.REGION_LABEL}
            required
            value={value.state}
            onChangeText={(state) => patch({ state })}
            placeholder={M.REGION_PLACEHOLDER}
            maxLength={FIELD_LIMITS.CITY}
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
          label={M.CITY_LABEL}
          required
          value={value.city}
          onChangeText={(city) => patch({ city })}
          placeholder={M.CITY_PLACEHOLDER}
          maxLength={FIELD_LIMITS.CITY}
          autoCapitalize="words"
          autoComplete="postal-address-locality"
          textContentType="addressCity"
          error={errors.city}
        />
        <TextField
          style={styles.field}
          label={domestic ? M.ZIP_LABEL : M.POSTAL_CODE_LABEL}
          required
          value={value.postalCode}
          onChangeText={(postalCode) =>
            patch({ postalCode: domestic ? toDigits(postalCode, FIELD_LIMITS.ZIP) : postalCode })
          }
          placeholder={domestic ? M.ZIP_PLACEHOLDER : M.POSTAL_CODE_PLACEHOLDER}
          maxLength={domestic ? FIELD_LIMITS.ZIP : FIELD_LIMITS.CITY}
          keyboardType={domestic ? 'number-pad' : 'default'}
          autoComplete="postal-code"
          textContentType="postalCode"
          error={errors.postalCode}
        />
      </View>

      <View style={rowStyle}>
        <TextField
          style={buildingStyle}
          label={M.BUILDING_LABEL}
          required
          value={value.buildingNumber}
          onChangeText={(buildingNumber) =>
            patch({ buildingNumber: toDigits(buildingNumber, FIELD_LIMITS.BUILDING_NO) })
          }
          placeholder={M.BUILDING_PLACEHOLDER}
          keyboardType="number-pad"
          maxLength={FIELD_LIMITS.BUILDING_NO}
          error={errors.buildingNumber}
        />
        <TextField
          style={streetStyle}
          label={M.STREET_LABEL}
          required
          value={value.streetName}
          onChangeText={(streetName) => patch({ streetName })}
          placeholder={M.STREET_PLACEHOLDER}
          maxLength={FIELD_LIMITS.STREET}
          autoCapitalize="words"
          autoComplete="street-address"
          textContentType="streetAddressLine1"
          error={errors.streetName}
        />
      </View>

      <View style={rowStyle}>
        <TextField
          style={styles.field}
          label={M.CROSS_STREET_LABEL}
          value={value.crossStreet}
          onChangeText={(crossStreet) => patch({ crossStreet })}
          placeholder={M.CROSS_STREET_PLACEHOLDER}
          maxLength={FIELD_LIMITS.MAILING_CROSS_STREET}
          autoCapitalize="words"
          autoComplete="address-line2"
          error={errors.crossStreet}
        />
        <TextField
          style={styles.field}
          label={M.UNIT_LABEL}
          value={value.unit}
          onChangeText={(unit) => patch({ unit })}
          placeholder={M.UNIT_PLACEHOLDER}
          maxLength={FIELD_LIMITS.UNIT}
          autoComplete="address-line2"
          textContentType="streetAddressLine2"
          error={errors.unit}
        />
      </View>

      <View style={styles.divider} />

      <TextField
        label={M.PHONE_LABEL}
        value={value.phone}
        onChangeText={(phone) => patch({ phone: formatUsPhone(phone) })}
        placeholder={M.PHONE_PLACEHOLDER}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        error={errors.phone}
      />

      <View style={styles.intl}>
        <Text style={styles.intlLabel}>{M.INTL_PHONE_TITLE}</Text>
        <View style={rowStyle}>
          <TextField
            style={dialStyle}
            label={M.INTL_DIAL_LABEL}
            value={value.intlDialCode}
            onChangeText={(intlDialCode) => patch({ intlDialCode: formatDialCode(intlDialCode) })}
            placeholder={M.INTL_DIAL_PLACEHOLDER}
            keyboardType="phone-pad"
            error={errors.intlDialCode}
          />
          <TextField
            style={streetStyle}
            label={M.INTL_NUMBER_LABEL}
            value={value.intlPhone}
            onChangeText={(intlPhone) => patch({ intlPhone: normalizeIntlPhone(intlPhone) })}
            placeholder={M.INTL_NUMBER_PLACEHOLDER}
            keyboardType="phone-pad"
            error={errors.intlPhone}
          />
        </View>
      </View>

      <View style={styles.divider} />

      <RadioGroup
        label={M.ADDRESS_TYPE_LABEL}
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
