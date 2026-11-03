import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CardDetailsFields, type CardFieldsErrors } from "@/components/payment/CardDetailsFields";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { BuildingGlyph, CardGlyph } from "@/components/ui/Glyph";
import { OptionCards } from "@/components/ui/OptionCards";
import { Reveal } from "@/components/ui/Reveal";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { RESERVATION_MESSAGES } from "@/constants/messages";
import type { RequirementField } from "@/services/billing";
import {
  colors,
  focusedFieldStyle,
  nativeFocusRingReset,
  radii,
  space,
} from "@/theme";
import {
  BRAND_LABEL,
  detectBrand,
  isCompleteCardNumber,
  isCompleteCvv,
  isValidExpiry,
  maskCardNumber,
  type CardBrand,
} from "@/utils/payment";

/** How the ride is paid for. */
export type BillingMethodId = "corporate" | "corporate-card" | "card";

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
  /** Answers to the account's requirement fields, by number (1–4). */
  requirements: Partial<Record<number, string>>;
  /** `P_APPROVAL_NUM` from the card authorisation; '' until approved. */
  approvalNumber: string;
  /** Which card details the approval covers, so a changed card is re-authorised. */
  approvedFor: string;
  /**
   * An edited reservation's card, masked as the server stores it. Sent back
   * unchanged unless a new number is typed; never a full number.
   */
  cardOnFile: string;
  cardTypeOnFile: string;
};

export function emptyBilling(accountNumber = ""): BillingMethodValue {
  return {
    method: "corporate",
    accountNumber,
    vipNumber: "",
    card: emptyCardDetails,
    requirements: {},
    approvalNumber: "",
    approvedFor: "",
    cardOnFile: "",
    cardTypeOnFile: "",
  };
}

export type BillingField =
  | "method"
  | "account"
  | "vip"
  | "postalCode"
  | "requirement1"
  | "requirement2"
  | "requirement3"
  | "requirement4"
  | keyof CardFieldsErrors;
export type BillingErrors = Partial<Record<BillingField, string>>;

export const emptyCardDetails: CardDetails = {
  holder: "",
  number: "",
  expiry: "",
  cvv: "",
  postalCode: "",
};

type MethodOption = {
  id: BillingMethodId;
  /** Kept short — a tile gives it two lines at phone width. */
  label: string;
  caption: string;
  renderIcon: (selected: boolean) => React.ReactNode;
};

/** Brand when the tile is chosen, muted otherwise — matches the car tiles. */
const iconColor = (selected: boolean) =>
  selected ? colors.primary[600] : colors.textMuted;

const BILLING_METHODS: readonly MethodOption[] = [
  {
    id: "corporate",
    label: "Corporate account",
    caption: "Invoiced to the company",
    renderIcon: (selected) => (
      <BuildingGlyph color={iconColor(selected)} size={28} />
    ),
  },
  {
    id: "corporate-card",
    label: "Card + corporate account",
    caption: "Billed to a card against the account",
    renderIcon: (selected) => (
      <View style={styles.iconPair}>
        <BuildingGlyph color={iconColor(selected)} size={28} />
        <CardGlyph color={iconColor(selected)} size={28} />
      </View>
    ),
  },
  {
    id: "card",
    label: "Credit card",
    caption: "Billed straight to your card",
    renderIcon: (selected) => (
      <CardGlyph color={iconColor(selected)} size={28} />
    ),
  },
];

/** The two branches each method needs — `corporate-card` asks for both. */
export const needsAccount = (method: BillingMethodId) => method !== "card";
export const needsCard = (method: BillingMethodId) => method !== "corporate";

export type BillingMethodSectionProps = {
  value: BillingMethodValue;
  onChange: (next: BillingMethodValue) => void;
  /** Screen-level "now", so an expiry check cannot disagree with the pickup date. */
  today: Date;
  /** Methods the account allows (`RES.S.BILLING_METHOD`); all three when omitted. */
  allowedMethods?: readonly BillingMethodId[];
  /** Fields the account asks for (`RES.S.ACCOUNT_REQUIREMENTS_LIST`). */
  requirementFields?: readonly RequirementField[];
  /** Fired when the VIP field is left, so the number can be checked. */
  onVipBlur?: () => void;
  /** Card authorisation in progress — the waiting message replaces the summary. */
  authorising?: boolean;
  errors?: BillingErrors;
};

export function BillingMethodSection({
  value,
  onChange,
  today,
  allowedMethods,
  requirementFields = [],
  onVipBlur,
  authorising,
  errors = {},
}: BillingMethodSectionProps) {
  const patch = (next: Partial<BillingMethodValue>) =>
    onChange({ ...value, ...next });
  const patchCard = (next: Partial<CardDetails>) =>
    patch({ card: { ...value.card, ...next } });

  const brand = detectBrand(value.card.number);
  const methods = BILLING_METHODS.filter(
    (option) => !allowedMethods || allowedMethods.includes(option.id) || option.id === value.method,
  );

  return (
    <View style={styles.root}>
      <OptionCards
        label={RESERVATION_MESSAGES.BILLING_METHOD_LABEL}
        required
        error={errors.method}
        options={methods.map((option) => ({
          value: option.id,
          label: option.label,
          caption: option.caption,
          renderIcon: option.renderIcon,
        }))}
        value={value.method}
        onChange={(method) => patch({ method })}
        labelLines={2}
      />

      {/* Keyed on the method so switching replays the entrance. */}
      <Reveal key={value.method} style={styles.branch}>
        {needsAccount(value.method) ? (
          <>
            <AccountNumberField
              value={value.accountNumber}
              // A new account has its own requirements, answers and approval.
              onChange={(accountNumber) => patch({ accountNumber, requirements: {} })}
              error={errors.account}
            />
            <TextField
              label="VIP number"
              value={value.vipNumber}
              onChangeText={(vipNumber) => patch({ vipNumber: vipNumber.replace(/\D/g, "") })}
              onBlur={onVipBlur}
              placeholder="e.g. 204"
              keyboardType="number-pad"
              maxLength={10}
              autoCorrect={false}
              returnKeyType="done"
              error={errors.vip}
            />
            {requirementFields.map((field) => (
              <RequirementInput
                key={field.index}
                field={field}
                value={value.requirements[field.index] ?? ""}
                onChange={(answer) =>
                  patch({ requirements: { ...value.requirements, [field.index]: answer } })
                }
                error={errors[`requirement${field.index}` as BillingField]}
              />
            ))}
          </>
        ) : null}

        {value.method === "corporate-card" ? (
          <View style={styles.divider}>
            <View style={styles.dividerRule} />
            <Text style={styles.dividerLabel}>Charged to</Text>
            <View style={styles.dividerRule} />
          </View>
        ) : null}

        {needsCard(value.method) ? (
          <CardFields
            card={value.card}
            onChange={patchCard}
            cardOnFile={value.cardOnFile}
            today={today}
            errors={errors}
          />
        ) : null}
      </Reveal>

      {authorising ? (
        <View style={styles.pending}>
          <Text style={styles.pendingText}>{RESERVATION_MESSAGES.CARD_PENDING}</Text>
        </View>
      ) : (
        <Summary value={value} brand={brand} today={today} />
      )}
    </View>
  );
}

/** One of the account's own fields: a pick-list when it lists answers, else free text. */
function RequirementInput({
  field,
  value,
  onChange,
  error,
}: {
  field: RequirementField;
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  const label = field.label || `${RESERVATION_MESSAGES.REQUIREMENT_FALLBACK_LABEL} ${field.index}`;
  if (field.options.length > 0) {
    return (
      <SelectField
        label={label}
        required
        value={value}
        options={field.options}
        onChange={onChange}
        error={error}
      />
    );
  }
  return (
    <TextField
      label={label}
      required
      value={value}
      onChangeText={onChange}
      maxLength={30}
      autoCorrect={false}
      error={error}
    />
  );
}

/**
 * The account number already on file, shown read-only behind an Edit button —
 * changing it is deliberate, not something a stray tap can do.
 */
function AccountNumberField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  // A blank account opens straight into edit mode, so there is nothing to press first.
  const [editing, setEditing] = useState(() => value.trim().length === 0);
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  if (!editing) {
    return (
      <Field label="Account number" required error={error}>
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
    <Field label="Account number" required error={error}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="e.g. 99005"
        maxLength={16}
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
  onChange,
  cardOnFile,
  today,
  errors,
}: {
  card: CardDetails;
  onChange: (next: Partial<CardDetails>) => void;
  cardOnFile: string;
  today: Date;
  errors: BillingErrors;
}) {
  return (
    <>
      <Text style={styles.cardNote}>{RESERVATION_MESSAGES.CARD_PRESENT_NOTE}</Text>
      {cardOnFile && !card.number ? (
        <Text style={styles.cardNote}>
          {RESERVATION_MESSAGES.CARD_UNCHANGED} {maskCardNumber(cardOnFile)}
        </Text>
      ) : null}
      <CardDetailsFields value={card} onChange={onChange} today={today} errors={errors} />

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
        error={errors.postalCode}
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

  const onFile = !value.card.number && value.cardOnFile.length > 0;
  const cardReady =
    onFile ||
    (isCompleteCardNumber(value.card.number) &&
      isValidExpiry(value.card.expiry, today) &&
      isCompleteCvv(value.card.cvv, brand));
  const cardLine = onFile
    ? maskCardNumber(value.cardOnFile)
    : cardReady
      ? `${BRAND_LABEL[brand]} ${masked}`
      : "Card details incomplete";

  let title: string;
  let detail: string;

  if (value.method === "corporate") {
    title = account.length > 0 ? account : "Corporate account";
    detail =
      account.length > 0
        ? `Invoiced to the company${vip.length > 0 ? ` · VIP ${vip}` : ""}`
        : "Add the account number this ride is billed to.";
  } else if (value.method === "corporate-card") {
    title = account.length > 0 ? account : "Corporate account";
    detail = `${cardLine}${vip.length > 0 ? ` · VIP ${vip}` : ""}`;
  } else {
    title = cardReady ? cardLine : "Personal card";
    detail = cardReady
      ? `${value.card.holder.trim() || "Cardholder"} · expires ${value.card.expiry}`
      : "Add your card details to finish this step.";
  }

  return (
    <View style={styles.summary}>
      <View style={styles.summaryIcon}>
        {value.method === "corporate" ? (
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
  branch: { gap: space.lg },
  cardNote: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  pending: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radii.lg,
    padding: space.md,
  },
  pendingText: { color: colors.textBody, fontSize: 13, lineHeight: 18 },
  iconPair: { flexDirection: "row", alignItems: "center", gap: space.sm },

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
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: space.sm,
  },
  inlineButton: { paddingHorizontal: space.md, paddingVertical: space.sm - 1 },

  locked: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  lockedValue: {
    flex: 1,
    color: colors.textStrong,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.4,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginVertical: -space.xs,
  },
  dividerRule: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },

  summary: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  summaryText: { flex: 1 },
  summaryTitle: { color: colors.textStrong, fontSize: 14, fontWeight: "700" },
  summaryDetail: {
    color: colors.textBody,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
});
