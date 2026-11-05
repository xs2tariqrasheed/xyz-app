import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CheckboxCard } from '@/components/ui/Checkbox';
import { PhoneField } from '@/components/ui/PhoneField';
import { TextField } from '@/components/ui/TextField';
import { REGISTER_MESSAGES } from '@/constants/messages';
import { breakpoints, colors, space } from '@/theme';
import { digitsOnly } from '@/utils/phone';

import { type CarPreferences, type CarPreferencesErrors, IVR_PIN_LENGTH } from './registration';

export type CarPreferencesFieldsProps = {
  value: CarPreferences;
  onChange: (next: CarPreferences) => void;
  errors: CarPreferencesErrors;
};

/** The optional car preferences saved with a new profile. */
export function CarPreferencesFields({ value, onChange, errors }: CarPreferencesFieldsProps) {
  const { width } = useWindowDimensions();
  const rowStyle = [styles.row, width >= breakpoints.sm ? styles.rowWide : null];

  const patch = (next: Partial<CarPreferences>) => onChange({ ...value, ...next });

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>{REGISTER_MESSAGES.CAR_PREFERENCES_TITLE}</Text>

      <View style={rowStyle}>
        <TextField
          style={styles.field}
          label={REGISTER_MESSAGES.PREFERRED_FLEET_LABEL}
          value={value.preferredFleet}
          onChangeText={(preferredFleet) => patch({ preferredFleet })}
          placeholder={REGISTER_MESSAGES.PREFERRED_FLEET_PLACEHOLDER}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextField
          style={styles.field}
          label={REGISTER_MESSAGES.CAR_YEAR_LABEL}
          value={value.carYear}
          onChangeText={(carYear) => patch({ carYear: digitsOnly(carYear).slice(0, 4) })}
          error={errors.carYear}
          placeholder={REGISTER_MESSAGES.CAR_YEAR_PLACEHOLDER}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={4}
          returnKeyType="next"
        />
      </View>

      <View style={rowStyle}>
        <PhoneField
          style={styles.field}
          label={REGISTER_MESSAGES.CAR_PHONE_LABEL}
          variant="us"
          value={value.carPhone}
          onChange={(carPhone) => patch({ carPhone })}
          error={errors.carPhone}
          withExtension={false}
        />
        <TextField
          style={styles.field}
          label={REGISTER_MESSAGES.IVR_PIN_LABEL}
          value={value.ivrPin}
          onChangeText={(ivrPin) => patch({ ivrPin: digitsOnly(ivrPin).slice(0, IVR_PIN_LENGTH) })}
          error={errors.ivrPin}
          placeholder={REGISTER_MESSAGES.IVR_PIN_PLACEHOLDER}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={IVR_PIN_LENGTH}
          secureTextEntry
          autoComplete="off"
          returnKeyType="done"
        />
      </View>

      <CheckboxCard
        checked={value.smokingCar}
        onChange={(smokingCar) => patch({ smokingCar })}
        label={REGISTER_MESSAGES.SMOKING_CAR_LABEL}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  heading: { color: colors.textStrong, fontSize: 15, fontWeight: '700' },
  row: { gap: space.lg },
  rowWide: { flexDirection: 'row', alignItems: 'flex-start' },
  field: { flex: 1 },
});
