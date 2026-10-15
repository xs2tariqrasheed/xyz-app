import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { HumanCheck } from '@/components/auth/HumanCheck';
import { CardDetailsFields } from '@/components/payment/CardDetailsFields';
import { PreferencesForm } from '@/components/preferences/PreferencesForm';
import type { PreferencesValue } from '@/components/preferences/preferences';
import { Field } from '@/components/ui/Field';
import { BuildingGlyph, CardGlyph } from '@/components/ui/Glyph';
import { OptionCards, type OptionCard } from '@/components/ui/OptionCards';
import { Reveal } from '@/components/ui/Reveal';
import { TextField } from '@/components/ui/TextField';
import { CAPTCHA_MESSAGES, REGISTER_MESSAGES } from '@/constants/messages';
import { breakpoints, colors, space } from '@/theme';

import { CarPreferencesFields } from './CarPreferencesFields';
import type {
  BillingChoice,
  BillingErrors,
  CarPreferences,
  CarPreferencesErrors,
  RegistrationBilling,
} from './registration';

/** Brand when the tile is chosen, muted otherwise — matches the reservation tiles. */
const iconColor = (selected: boolean) => (selected ? colors.primary[600] : colors.textMuted);

const BILLING_CHOICES: readonly OptionCard<BillingChoice>[] = [
  {
    value: 'corporate',
    label: REGISTER_MESSAGES.BILLING_CORPORATE,
    caption: REGISTER_MESSAGES.BILLING_CORPORATE_CAPTION,
    renderIcon: (selected) => <BuildingGlyph color={iconColor(selected)} size={28} />,
  },
  {
    value: 'card',
    label: REGISTER_MESSAGES.BILLING_CARD,
    caption: REGISTER_MESSAGES.BILLING_CARD_CAPTION,
    renderIcon: (selected) => <CardGlyph color={iconColor(selected)} size={28} />,
  },
];

export type BillingStepProps = {
  billing: RegistrationBilling;
  onBillingChange: (next: RegistrationBilling) => void;
  billingErrors: BillingErrors;
  /** Fires when the account number loses focus, so its requirement fields can load. */
  onAccountBlur: () => void;
  /** Fires when the VIP field loses focus, so the number can be checked early. */
  onVipBlur: () => void;
  /** The extra fields the corporate account asks for; empty when it asks for none. */
  requirementLabels: readonly string[];
  preferences: PreferencesValue;
  onPreferencesChange: (next: PreferencesValue) => void;
  car: CarPreferences;
  onCarChange: (next: CarPreferences) => void;
  carErrors: CarPreferencesErrors;
  human: boolean;
  onHumanChange: (next: boolean) => void;
  humanError?: string;
  /** Screen-level "now" for the card expiry check. */
  today: Date;
};

/** Step 3: how rides are paid for, confirmation preferences and the captcha. */
export function BillingStep({
  billing,
  onBillingChange,
  billingErrors,
  onAccountBlur,
  onVipBlur,
  requirementLabels,
  preferences,
  onPreferencesChange,
  car,
  onCarChange,
  carErrors,
  human,
  onHumanChange,
  humanError,
  today,
}: BillingStepProps) {
  const { width } = useWindowDimensions();
  const rowStyle = [styles.row, width >= breakpoints.sm ? styles.rowWide : null];

  const patch = (next: Partial<RegistrationBilling>) => onBillingChange({ ...billing, ...next });

  return (
    <View style={styles.root}>
      <OptionCards
        label={REGISTER_MESSAGES.BILLING_METHOD_LABEL}
        required
        options={BILLING_CHOICES}
        value={billing.method}
        onChange={(method) => patch({ method })}
        labelLines={2}
      />

      {/* Keyed on the method so switching replays the entrance. */}
      <Reveal key={billing.method} style={styles.branch}>
        {billing.method === 'corporate' ? (
          <>
            <View style={rowStyle}>
              <TextField
                style={styles.field}
                label={REGISTER_MESSAGES.ACCOUNT_NUMBER_LABEL}
                required
                value={billing.accountNumber}
                onChangeText={(accountNumber) => patch({ accountNumber })}
                onBlur={onAccountBlur}
                error={billingErrors.accountNumber}
                placeholder={REGISTER_MESSAGES.ACCOUNT_NUMBER_PLACEHOLDER}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TextField
                style={styles.field}
                label={REGISTER_MESSAGES.COMPANY_NAME_LABEL}
                required
                value={billing.companyName}
                onChangeText={(companyName) => patch({ companyName })}
                error={billingErrors.companyName}
                placeholder={REGISTER_MESSAGES.COMPANY_NAME_PLACEHOLDER}
                autoComplete="organization"
                textContentType="organizationName"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            <TextField
              label={REGISTER_MESSAGES.VIP_NUMBER_LABEL}
              value={billing.vipNumber}
              onChangeText={(vipNumber) => patch({ vipNumber })}
              onBlur={onVipBlur}
              error={billingErrors.vipNumber}
              placeholder={REGISTER_MESSAGES.VIP_NUMBER_PLACEHOLDER}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
            />
            {requirementLabels.map((label, index) => (
              <TextField
                key={label}
                label={label}
                required
                value={billing.requirements[index] ?? ''}
                onChangeText={(answer) =>
                  patch({
                    requirements: billing.requirements.map((current, i) =>
                      i === index ? answer : current,
                    ),
                  })
                }
                error={billingErrors.requirements?.[index]}
                returnKeyType="next"
              />
            ))}
          </>
        ) : (
          <CardDetailsFields
            value={billing.card}
            onChange={(next) => patch({ card: { ...billing.card, ...next } })}
            today={today}
            errors={billingErrors.card}
          />
        )}
      </Reveal>

      <View style={styles.divider} />

      <PreferencesForm value={preferences} onChange={onPreferencesChange} />

      <View style={styles.divider} />

      <CarPreferencesFields value={car} onChange={onCarChange} errors={carErrors} />

      <Field label={CAPTCHA_MESSAGES.LABEL} required error={humanError}>
        <HumanCheck checked={human} onChange={onHumanChange} />
      </Field>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  branch: { gap: space.lg },
  row: { gap: space.lg },
  rowWide: { flexDirection: 'row', alignItems: 'flex-start' },
  field: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: -space.xs },
});
