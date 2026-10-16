import { useEffect, useMemo, useState } from 'react';

import {
  BillingMethodSection,
  type BillingErrors,
  type BillingMethodId,
  type BillingMethodValue,
  needsAccount,
} from '@/components/reservation/BillingMethodSection';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RESERVATION_MESSAGES } from '@/constants/messages';
import { useFetchData } from '@/hooks/useFetchData';
import { usePostData } from '@/hooks/usePostData';
import {
  accountJData,
  ALL_BILLING_METHODS,
  assertAccountCheck,
  BillingError,
  REQUIREMENT_INDEXES,
  requirementListJData,
  type RequirementField,
  toAllowedMethods,
  toRequirementField,
} from '@/services/billing';
import type { GatewayResponse } from '@/services/gateway';
import { vipJData } from '@/services/registration';

/**
 * Step 3 with the account's own rules (reverse-engineer-guide/16):
 *
 * - `RES.S.BILLING_METHOD` — which billing methods the account allows;
 * - `RES.S.IS_CREDIT_CARD_SPECIFIC_ACCOUNT` — whether the account is accepted;
 * - `RES.S.ACCOUNT_REQUIREMENTS_LIST` (1–4) — the account's own fields;
 * - `PROF.S.IS_VALID_VIP` — when the VIP field is left.
 *
 * The account-keyed reads only mount once there is an account number, as the
 * fetch hook has no off switch. The rules are reported up so the screen's
 * Continue can validate against them.
 */

export type AccountRules = {
  allowedMethods: readonly BillingMethodId[];
  requirementFields: readonly RequirementField[];
  /** Server refusals to show on the account / VIP fields. */
  errors: BillingErrors;
};

export const DEFAULT_ACCOUNT_RULES: AccountRules = {
  allowedMethods: ALL_BILLING_METHODS,
  requirementFields: [],
  errors: {},
};

export type BillingStepProps = {
  value: BillingMethodValue;
  onChange: (next: BillingMethodValue) => void;
  today: Date;
  authorising: boolean;
  errors: BillingErrors;
  onRules: (rules: AccountRules) => void;
};

export function BillingStep(props: BillingStepProps) {
  const account = needsAccount(props.value.method) ? props.value.accountNumber.trim() : '';
  return account ? <AccountBillingStep {...props} account={account} /> : <Billing {...props} rules={DEFAULT_ACCOUNT_RULES} />;
}

/** Reads a refusal as an error message, and a mapping as its value. */
function readAccount<T>(data: GatewayResponse | undefined, map: (response: GatewayResponse) => T): { value?: T; error?: string } {
  if (!data) return {};
  try {
    return { value: map(data) };
  } catch (error) {
    return { error: error instanceof BillingError ? error.message : undefined };
  }
}

function AccountBillingStep({ account, ...props }: BillingStepProps & { account: string }) {
  const method = useFetchData(ACTION_CODES.BILLING_METHOD, GATEWAY_VIEW_NAME, accountJData(account));
  const specific = useFetchData(ACTION_CODES.IS_CREDIT_CARD_SPECIFIC_ACCOUNT, GATEWAY_VIEW_NAME, accountJData(account));
  // Four fixed reads, one per possible requirement field.
  const req1 = useFetchData(ACTION_CODES.ACCOUNT_REQUIREMENTS_LIST, GATEWAY_VIEW_NAME, requirementListJData(account, 1));
  const req2 = useFetchData(ACTION_CODES.ACCOUNT_REQUIREMENTS_LIST, GATEWAY_VIEW_NAME, requirementListJData(account, 2));
  const req3 = useFetchData(ACTION_CODES.ACCOUNT_REQUIREMENTS_LIST, GATEWAY_VIEW_NAME, requirementListJData(account, 3));
  const req4 = useFetchData(ACTION_CODES.ACCOUNT_REQUIREMENTS_LIST, GATEWAY_VIEW_NAME, requirementListJData(account, 4));

  const rules = useMemo<AccountRules>(() => {
    const allowed = readAccount(method.data, toAllowedMethods);
    const accepted = readAccount(specific.data, (response) =>
      assertAccountCheck(response, RESERVATION_MESSAGES.ACCOUNT_REJECTED),
    );
    const requirementFields = [req1.data, req2.data, req3.data, req4.data].flatMap((data, position) => {
      const field = readAccount(data, (response) => toRequirementField(REQUIREMENT_INDEXES[position], response));
      return field.value ? [field.value] : [];
    });
    const accountError = allowed.error ?? accepted.error;
    return {
      allowedMethods: allowed.value ?? ALL_BILLING_METHODS,
      requirementFields,
      errors: accountError ? { account: accountError } : {},
    };
  }, [method.data, specific.data, req1.data, req2.data, req3.data, req4.data]);

  return <Billing {...props} rules={rules} />;
}

function Billing({
  value,
  onChange,
  today,
  authorising,
  errors,
  onRules,
  rules,
}: BillingStepProps & { rules: AccountRules }) {
  const vipCheck = usePostData();
  const [vipError, setVipError] = useState<{ vip: string; message: string } | null>(null);

  const reported = useMemo<AccountRules>(
    () => ({
      ...rules,
      errors: {
        ...rules.errors,
        ...(vipError && vipError.vip === value.vipNumber ? { vip: vipError.message } : {}),
      },
    }),
    [rules, vipError, value.vipNumber],
  );

  const rulesKey = JSON.stringify(reported);
  useEffect(() => {
    onRules(JSON.parse(rulesKey) as AccountRules);
  }, [rulesKey, onRules]);

  const checkVip = () => {
    const vip = value.vipNumber.trim();
    const account = value.accountNumber.trim();
    if (!vip || !account) {
      setVipError(null);
      return;
    }
    vipCheck
      .mutateAsync(ACTION_CODES.IS_VALID_VIP, GATEWAY_VIEW_NAME, vipJData(account, vip))
      .then((response) => {
        assertAccountCheck(response, RESERVATION_MESSAGES.VIP_REJECTED);
        setVipError(null);
      })
      .catch((error: unknown) => {
        // Only a refusal is the customer's to fix; a failed call is checked again on Continue.
        setVipError(error instanceof BillingError ? { vip, message: error.message } : null);
      });
  };

  return (
    <BillingMethodSection
      value={value}
      onChange={onChange}
      today={today}
      allowedMethods={rules.allowedMethods}
      requirementFields={rules.requirementFields}
      onVipBlur={checkVip}
      authorising={authorising}
      errors={{ ...reported.errors, ...errors }}
    />
  );
}
