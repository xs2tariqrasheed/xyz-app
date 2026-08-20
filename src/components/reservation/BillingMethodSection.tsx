import { useState } from 'react';
import { StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CheckboxCard } from '@/components/ui/Checkbox';
import { Field } from '@/components/ui/Field';
import { BuildingGlyph, CardGlyph } from '@/components/ui/Glyph';
import { RadioCard } from '@/components/ui/Radio';
import { Reveal } from '@/components/ui/Reveal';
import { TextField } from '@/components/ui/TextField';
import {
  breakpoints,
  colors,
  focusedFieldStyle,
  nativeFocusRingReset,
  radii,
  space,
} from '@/theme';
import {
  BRAND_LABEL,
  cardNumberLength,
  cvvLength,
  detectBrand,
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  isCompleteCardNumber,
  isCompleteCvv,
  isValidExpiry,
  maskCardNumber,
  passesLuhn,
  type CardBrand,
} from '@/utils/payment';

/** How the ride is paid for. */
export type BillingMethodId = 'corporate' | 'corporate-card' | 'card';

export type CardDetails = {
  holder: string;
  /** Kept in its display form, e.g. `4242 4242 4242 4242`. */
  number: string;
  /** `MM/YY`. */
  expiry: string;
  cvv: string;
  postalCode: string;
};

/** Everything section 3 collects. */
export type BillingMethodValue = {
  method: BillingMethodId;
  /** Corporate account this ride is booked against. */
  accountNumber: string;
  /** Priority code issued by the company travel desk. Optional. */
  vipNumber: string;
  card: CardDetails;
  saveCard: boolean;
};

export const emptyCardDetails: CardDetails = {
  holder: '',
  number: '',
  expiry: '',
  cvv: '',
  postalCode: '',
};

type MethodOption = {
  id: BillingMethodId;
  label: string;
  description: string;
  badge: string;
  tone: BadgeTone;
};

const BILLING_METHODS: readonly MethodOption[] = [
  {
    id: 'corporate',
    label: 'Bill my corporate account',
    description: 'The ride goes on your company invoice. Nothing is charged at pickup.',
    badge: 'INVOICED',
    tone: 'primary',
  },
  {
    id: 'corporate-card',
    label: 'Bill credit card with corporate account',
    description: 'Booked against the corporate account, charged to a card instead of the invoice.',
    badge: 'ACCOUNT + CARD',
    tone: 'info',
  },
  {
    id: 'card',
    label: 'Bill my credit card',
    description: 'A personal booking, charged to the card you enter below.',
    badge: 'CARD',
    tone: 'muted',
  },
];

/** The two branches each method needs — `corporate-card` asks for both. */
const needsAccount = (method: BillingMethodId) => method !== 'card';
const needsCard = (method: BillingMethodId) => method !== 'corporate';

export type BillingMethodSectionProps = {
  value: BillingMethodValue;
  onChange: (next: BillingMethodValue) => void;
  /** Screen-level "now", so an expiry check cannot disagree with the pickup date. */
  today: Date;
};

export function BillingMethodSection({ value, onChange, today }: BillingMethodSectionProps) {
  const { width } = useWindowDimensions();
  const twoUp = width >= breakpoints.sm;

  const patch = (next: Partial<BillingMethodValue>) => onChange({ ...value, ...next });
  const patchCard = (next: Partial<CardDetails>) => patch({ card: { ...value.card, ...next } });

  const brand = detectBrand(value.card.number);

  return (
    <View style={styles.root}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Billing method" style={styles.options}>
        {BILLING_METHODS.map((option) => (
          <RadioCard
            key={option.id}
            selected={value.method === option.id}
            onSelect={() => patch({ method: option.id })}
            label={option.label}
            description={option.description}
            badge={<Badge label={option.badge} tone={option.tone} />}
          />
        ))}
      </View>

      {/* Keyed on the method so switching replays the entrance. */}
      <Reveal key={value.method} style={styles.branch}>
        {needsAccount(value.method) ? (
          <>
            <AccountNumberField
              value={value.accountNumber}
              onChange={(accountNumber) => patch({ accountNumber })}
            />
            <TextField
              label="VIP number"
              value={value.vipNumber}
              onChangeText={(vipNumber) => patch({ vipNumber })}
              placeholder="e.g. VIP-204"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              hint="Priority code from your travel desk. Leave blank if you do not have one."
            />
          </>
        ) : null}

        {value.method === 'corporate-card' ? (
          <View style={styles.divider}>
            <View style={styles.dividerRule} />
            <Text style={styles.dividerLabel}>Charged to</Text>
            <View style={styles.dividerRule} />
          </View>
        ) : null}

        {needsCard(value.method) ? (
          <CardFields
            card={value.card}
            brand={brand}
            onChange={patchCard}
            saveCard={value.saveCard}
            onSaveCardChange={(saveCard) => patch({ saveCard })}
            twoUp={twoUp}
            today={today}
          />
        ) : null}
      </Reveal>

      <Summary value={value} brand={brand} today={today} />
    </View>
  );
}

/**
 * The account number already on file, shown read-only behind an Edit button —
 * changing it is deliberate, not something a stray tap can do.
 */
function AccountNumberField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  // A blank account opens straight into edit mode, so there is nothing to press first.
  const [editing, setEditing] = useState(() => value.trim().length === 0);
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  if (!editing) {
    return (
      <Field
        label="Account number"
        required
        hint="This ride is billed to the account above. Edit it if it belongs to another one."
      >
        <View style={styles.locked}>
          <View style={styles.iconWell}>
            <BuildingGlyph color={colors.primary[600]} size={16} />
          </View>
          <Text style={styles.lockedValue} numberOfLines={1}>
            {value}
          </Text>
          <Button
            label="Edit"
            variant="outline"
            onPress={() => {
              setDraft(value);
              setEditing(true);
            }}
            style={styles.inlineButton}
          />
        </View>
      </Field>
    );
  }

  const trimmed = draft.trim();

  return (
    <Field label="Account number" required hint="Ask your travel desk if you are not sure.">
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="e.g. CORP-48213"
        placeholderTextColor={colors.textDisabled}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus={value.trim().length > 0}
        returnKeyType="done"
        onSubmitEditing={() => {
          if (trimmed.length > 0) {
            onChange(trimmed);
            setEditing(false);
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused ? focusedFieldStyle : null]}
      />
      <View style={styles.editActions}>
        {value.trim().length > 0 ? (
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => {
              setDraft(value);
              setEditing(false);
            }}
            style={styles.inlineButton}
          />
        ) : null}
        <Button
          label="Save"
          disabled={trimmed.length === 0}
          onPress={() => {
            onChange(trimmed);
            setEditing(false);
          }}
          style={styles.inlineButton}
        />
      </View>
    </Field>
  );
}

function CardFields({
  card,
  brand,
  onChange,
  saveCard,
  onSaveCardChange,
  twoUp,
  today,
}: {
  card: CardDetails;
  brand: CardBrand;
  onChange: (next: Partial<CardDetails>) => void;
  saveCard: boolean;
  onSaveCardChange: (next: boolean) => void;
  twoUp: boolean;
  today: Date;
}) {
  const digits = digitsOnly(card.number);
  // Only complain once there is a whole number to judge — not mid-typing.
  const numberError =
    digits.length === cardNumberLength(brand) && !passesLuhn(card.number)
      ? 'Check this number — the digits do not add up.'
      : undefined;
  const expiryError =
    digitsOnly(card.expiry).length === 4 && !isValidExpiry(card.expiry, today)
      ? 'Enter a future MM/YY.'
      : undefined;

  return (
    <>
      <TextField
        label="Name on card"
        required
        value={card.holder}
        onChangeText={(holder) => onChange({ holder })}
        placeholder="e.g. Amara Okafor"
        autoComplete="cc-name"
        textContentType="creditCardName"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
      />

      <TextField
        label="Card number"
        required
        value={card.number}
        onChangeText={(next) => onChange({ number: formatCardNumber(next) })}
        placeholder={brand === 'amex' ? '3782 822463 10005' : '4242 4242 4242 4242'}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="cc-number"
        textContentType="creditCardNumber"
        maxLength={brand === 'amex' ? 17 : 19}
        returnKeyType="next"
        error={numberError}
        hint={digits.length > 0 ? `${BRAND_LABEL[brand]} card` : undefined}
      />

      <View style={[styles.row, twoUp ? styles.rowWide : null]}>
        <TextField
          style={styles.field}
          label="Expiry"
          required
          value={card.expiry}
          onChangeText={(next) => onChange({ expiry: formatExpiry(next) })}
          placeholder="MM/YY"
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="cc-exp"
          textContentType="creditCardExpiration"
          maxLength={5}
          returnKeyType="next"
          error={expiryError}
        />
        <TextField
          style={styles.field}
          label="Security code"
          required
          value={card.cvv}
          onChangeText={(next) => onChange({ cvv: digitsOnly(next).slice(0, cvvLength(brand)) })}
          placeholder={brand === 'amex' ? '4 digits' : '3 digits'}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="cc-csc"
          textContentType="creditCardSecurityCode"
          maxLength={cvvLength(brand)}
          returnKeyType="next"
          hint={brand === 'amex' ? 'Four digits on the front.' : 'Three digits on the back.'}
        />
      </View>

      <TextField
        label="Billing ZIP / postal code"
        required
        value={card.postalCode}
        onChangeText={(postalCode) => onChange({ postalCode })}
        placeholder="e.g. 60601"
        autoComplete="postal-code"
        textContentType="postalCode"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={10}
        returnKeyType="done"
        hint="Must match the billing address on the card."
      />

      <CheckboxCard
        checked={saveCard}
        onChange={onSaveCardChange}
        label="Save this card for next time"
        description="Stored on your profile so future reservations are one tap. You can remove it from Profile."
      />
    </>
  );
}

/** Restates the choice in one line, the same read-back as the earlier sections. */
function Summary({
  value,
  brand,
  today,
}: {
  value: BillingMethodValue;
  brand: CardBrand;
  today: Date;
}) {
  const account = value.accountNumber.trim();
  const vip = value.vipNumber.trim();
  const masked = maskCardNumber(value.card.number);

  const cardReady =
    isCompleteCardNumber(value.card.number) &&
    isValidExpiry(value.card.expiry, today) &&
    isCompleteCvv(value.card.cvv, brand);
  const cardLine = cardReady ? `${BRAND_LABEL[brand]} ${masked}` : 'Card details incomplete';

  let title: string;
  let detail: string;

  if (value.method === 'corporate') {
    title = account.length > 0 ? account : 'Corporate account';
    detail =
      account.length > 0
        ? `Invoiced to the company${vip.length > 0 ? ` · VIP ${vip}` : ''}`
        : 'Add the account number this ride is billed to.';
  } else if (value.method === 'corporate-card') {
    title = account.length > 0 ? account : 'Corporate account';
    detail = `${cardLine}${vip.length > 0 ? ` · VIP ${vip}` : ''}`;
  } else {
    title = cardReady ? cardLine : 'Personal card';
    detail = cardReady
      ? `${value.card.holder.trim() || 'Cardholder'} · expires ${value.card.expiry}`
      : 'Add your card details to finish this step.';
  }

  return (
    <View style={styles.summary}>
      <View style={styles.summaryIcon}>
        {value.method === 'corporate' ? (
          <BuildingGlyph color={colors.info} size={16} />
        ) : (
          <CardGlyph color={colors.info} size={16} />
        )}
      </View>
      <View style={styles.summaryText}>
        <Text style={styles.summaryTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.summaryDetail} numberOfLines={2}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  options: { gap: space.md },
  branch: { gap: space.lg },
  row: { gap: space.lg },
  rowWide: { flexDirection: 'row' },
  field: { flex: 1 },

  input: {
    ...nativeFocusRingReset,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: 15,
    color: colors.textStrong,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  inlineButton: { paddingHorizontal: space.md, paddingVertical: space.sm - 1 },

  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 50,
  },
  iconWell: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedValue: { flex: 1, color: colors.textStrong, fontSize: 15, fontWeight: '600', letterSpacing: 0.4 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: -space.xs },
  dividerRule: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radii.lg,
    padding: space.md,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1 },
  summaryTitle: { color: colors.textStrong, fontSize: 14, fontWeight: '700' },
  summaryDetail: { color: colors.textBody, fontSize: 13, lineHeight: 18, marginTop: 1 },
});
