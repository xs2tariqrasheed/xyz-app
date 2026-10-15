import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { TextField } from '@/components/ui/TextField';
import { CARD_MESSAGES } from '@/constants/messages';
import { breakpoints, space } from '@/theme';
import {
  cardNumberLength,
  cvvLength,
  detectBrand,
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  isValidExpiry,
  passesLuhn,
} from '@/utils/payment';

/** The four values every card form collects. */
export type CardFieldsValue = {
  holder: string;
  /** Kept in its display form, e.g. `4242 4242 4242 4242`. */
  number: string;
  /** `MM/YY`. */
  expiry: string;
  cvv: string;
};

export type CardFieldsErrors = Partial<Record<keyof CardFieldsValue, string>>;

export type CardDetailsFieldsProps = {
  value: CardFieldsValue;
  onChange: (next: Partial<CardFieldsValue>) => void;
  /** Screen-level "now", so the expiry check agrees with the rest of the form. */
  today: Date;
  /** Submit-time errors; they win over the as-you-type checks. */
  errors?: CardFieldsErrors;
};

/** Name, number, expiry and security code, formatted as the customer types. */
export function CardDetailsFields({ value, onChange, today, errors = {} }: CardDetailsFieldsProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;

  const brand = detectBrand(value.number);
  const digits = digitsOnly(value.number);
  // Only complain once there is a whole number to judge — not mid-typing.
  const numberError =
    digits.length === cardNumberLength(brand) && !passesLuhn(value.number)
      ? CARD_MESSAGES.NUMBER_CHECKSUM
      : undefined;
  const expiryError =
    digitsOnly(value.expiry).length === 4 && !isValidExpiry(value.expiry, today)
      ? CARD_MESSAGES.EXPIRY_PAST
      : undefined;

  return (
    <>
      <TextField
        label={CARD_MESSAGES.HOLDER_LABEL}
        required
        value={value.holder}
        onChangeText={(holder) => onChange({ holder })}
        placeholder={CARD_MESSAGES.HOLDER_PLACEHOLDER}
        autoComplete="cc-name"
        textContentType="creditCardName"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        error={errors.holder}
      />

      <TextField
        label={CARD_MESSAGES.NUMBER_LABEL}
        required
        value={value.number}
        onChangeText={(next) => onChange({ number: formatCardNumber(next) })}
        placeholder={brand === 'amex' ? '3782 822463 10005' : '4242 4242 4242 4242'}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="cc-number"
        textContentType="creditCardNumber"
        maxLength={brand === 'amex' ? 17 : 19}
        returnKeyType="next"
        error={errors.number ?? numberError}
      />

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label={CARD_MESSAGES.EXPIRY_LABEL}
          required
          value={value.expiry}
          onChangeText={(next) => onChange({ expiry: formatExpiry(next) })}
          placeholder={CARD_MESSAGES.EXPIRY_PLACEHOLDER}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="cc-exp"
          textContentType="creditCardExpiration"
          maxLength={5}
          returnKeyType="next"
          error={errors.expiry ?? expiryError}
        />
        <TextField
          style={styles.field}
          label={CARD_MESSAGES.CVV_LABEL}
          required
          value={value.cvv}
          onChangeText={(next) => onChange({ cvv: digitsOnly(next).slice(0, cvvLength(brand)) })}
          placeholder={brand === 'amex' ? CARD_MESSAGES.CVV_PLACEHOLDER_AMEX : CARD_MESSAGES.CVV_PLACEHOLDER}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="cc-csc"
          textContentType="creditCardSecurityCode"
          maxLength={cvvLength(brand)}
          returnKeyType="next"
          error={errors.cvv}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.lg },
  rowWide: { flexDirection: 'row' },
  field: { flex: 1 },
});
