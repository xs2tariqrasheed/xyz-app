import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MailingAddressForm } from '@/components/account/MailingAddressForm';
import { validateMailingAddress } from '@/components/account/mailingAddress';
import { AuthCard } from '@/components/auth/AuthCard';
import { Screen } from '@/components/layout/Screen';
import { AccountStep } from '@/components/register/AccountStep';
import { BillingStep } from '@/components/register/BillingStep';
import {
  EMPTY_REGISTRATION,
  hasErrors,
  REGISTRATION_STEPS,
  type BillingErrors,
  EMPTY_REQUIREMENTS,
  type RegistrationBilling,
  type RegistrationDraft,
  validateAccountStep,
  validateBilling,
  validateCarPreferences,
} from '@/components/register/registration';
import { StepTabs } from '@/components/reservation/StepTabs';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ACTION_CODES, type ActionCode, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { CAPTCHA_MESSAGES, REGISTER_MESSAGES } from '@/constants/messages';
import { type PostDataResult, usePostData } from '@/hooks/usePostData';
import { normalizeLoginId } from '@/services/auth';
import { type GatewayJData, getErrorDisplay } from '@/services/gateway';
import {
  accountHasRequirements,
  accountRequirementLabels,
  accountRequirementsJData,
  assertRegistrationStep,
  companyNameJData,
  createProfileJData,
  RegistrationError,
  uniqueEmailJData,
  vipJData,
} from '@/services/registration';
import { breakpoints, colors, formMaxWidth, space } from '@/theme';

const LAST_STEP = REGISTRATION_STEPS.length - 1;

/** A server refusal, remembered with the input it was about so an edit retires it. */
type Rejection = { key: string; message: string };

/** The requirement fields an account asked for, remembered with the account number. */
type Requirements = { accountNumber: string; labels: readonly string[] };

const vipKey = (draft: RegistrationDraft) =>
  `${draft.billing.accountNumber.trim()}|${draft.billing.vipNumber.trim()}`;

function describeError(error: unknown): string {
  if (error instanceof RegistrationError) return error.message;
  return getErrorDisplay(error).customDescription;
}

export default function RegisterScreen() {
  const { width } = useWindowDimensions();
  const roomy = width >= breakpoints.sm;

  const emailCheck = usePostData();
  const companyCheck = usePostData();
  const vipCheck = usePostData();
  const requirementsCheck = usePostData();
  const requirementsList = usePostData();
  const createProfile = usePostData();

  const scrollRef = useRef<ScrollView>(null);
  const [today] = useState(() => new Date());
  const [draft, setDraft] = useState<RegistrationDraft>(EMPTY_REGISTRATION);
  const [step, setStep] = useState(0);
  const [human, setHuman] = useState(false);

  // Errors appear once a step's Next has been pressed, then track every edit.
  const [attempted, setAttempted] = useState<readonly boolean[]>(() =>
    REGISTRATION_STEPS.map(() => false),
  );
  const [emailRejection, setEmailRejection] = useState<Rejection | null>(null);
  const [vipRejection, setVipRejection] = useState<Rejection | null>(null);
  const [accountRejection, setAccountRejection] = useState<Rejection | null>(null);
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'checking' | 'submitting' | null>(null);
  const [done, setDone] = useState(false);

  const patch = (next: Partial<RegistrationDraft>) =>
    setDraft((current) => ({ ...current, ...next }));

  const step1 = attempted[0] ? validateAccountStep(draft) : { account: {}, personal: {} };
  const accountErrors = {
    ...step1.account,
    email:
      step1.account.email ??
      (emailRejection?.key === normalizeLoginId(draft.account.email) ? emailRejection.message : undefined),
  };
  const addressErrors = attempted[1] ? validateMailingAddress(draft.address) : {};
  // Only the fields the current account asked for; a different account starts clean.
  const requirementLabels =
    draft.billing.method === 'corporate' &&
    requirements?.accountNumber === draft.billing.accountNumber.trim()
      ? requirements.labels
      : [];
  const billingErrors: BillingErrors = attempted[2]
    ? validateBilling(draft.billing, today, requirementLabels)
    : {};
  const carErrors = attempted[2] ? validateCarPreferences(draft.car, today) : {};
  if (draft.billing.method === 'corporate') {
    if (!billingErrors.accountNumber && accountRejection?.key === draft.billing.accountNumber.trim()) {
      billingErrors.accountNumber = accountRejection.message;
    }
    if (vipRejection?.key === vipKey(draft)) billingErrors.vipNumber = vipRejection.message;
  }
  const humanError = attempted[2] && !human ? CAPTCHA_MESSAGES.REQUIRED : undefined;

  const markAttempted = (index: number) =>
    setAttempted((current) => current.map((value, i) => (i === index ? true : value)));

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: false });

  const goTo = (index: number) => {
    setFormError(null);
    setStep(index);
    // A new step starts at its first field, not where the last one ended.
    scrollToTop();
  };

  /** The alert sits above the fields, so bring it into view. */
  const showFormError = (error: unknown) => {
    setFormError(describeError(error));
    scrollToTop();
  };

  /** Asks one registration question of the gateway; throws on a refusal. */
  const check = async (
    request: PostDataResult,
    actionCode: ActionCode,
    jData: GatewayJData,
    fallback: string,
  ) => {
    const response = await request.mutateAsync(actionCode, GATEWAY_VIEW_NAME, jData);
    assertRegistrationStep(response, fallback);
  };

  const nextFromAccount = async () => {
    markAttempted(0);
    if (hasErrors(validateAccountStep(draft))) return;

    const email = normalizeLoginId(draft.account.email);
    setBusy('checking');
    try {
      await check(
        emailCheck,
        ACTION_CODES.IS_UNIQUE_EMAIL,
        uniqueEmailJData(email),
        REGISTER_MESSAGES.EMAIL_TAKEN,
      );
      setEmailRejection(null);
      goTo(1);
    } catch (error) {
      if (error instanceof RegistrationError) setEmailRejection({ key: email, message: error.message });
      else showFormError(error);
    } finally {
      setBusy(null);
    }
  };

  const nextFromAddress = () => {
    markAttempted(1);
    if (hasErrors(validateMailingAddress(draft.address))) return;
    goTo(2);
  };

  /** Early VIP check when the field is left; Create account checks it again. */
  const checkVipOnBlur = async () => {
    const { accountNumber, vipNumber } = draft.billing;
    if (!accountNumber.trim() || !vipNumber.trim()) return;

    const key = vipKey(draft);
    try {
      await check(
        vipCheck,
        ACTION_CODES.IS_VALID_VIP,
        vipJData(accountNumber, vipNumber),
        REGISTER_MESSAGES.VIP_INVALID,
      );
      setVipRejection(null);
    } catch (error) {
      // Only a refusal is worth showing here; anything else resurfaces on submit.
      if (error instanceof RegistrationError) setVipRejection({ key, message: error.message });
    }
  };

  /**
   * The requirement fields an account asks for. `ACCOUNT_REQUIREMENTS` says
   * whether there are any; only then does `ACCOUNT_REQUIREMENTS_RS` list them.
   * The answer is kept per account number, so leaving the field and then
   * pressing Create account asks once.
   */
  const loadRequirements = async (accountNumber: string): Promise<readonly string[]> => {
    const key = accountNumber.trim();
    if (requirements?.accountNumber === key) return requirements.labels;

    try {
      const jData = accountRequirementsJData(key);
      const summary = await requirementsCheck.mutateAsync(
        ACTION_CODES.ACCOUNT_REQUIREMENTS,
        GATEWAY_VIEW_NAME,
        jData,
      );

      let labels: readonly string[] = [];
      if (accountHasRequirements(summary, REGISTER_MESSAGES.ACCOUNT_NOT_AVAILABLE)) {
        const list = await requirementsList.mutateAsync(
          ACTION_CODES.ACCOUNT_REQUIREMENTS_RS,
          GATEWAY_VIEW_NAME,
          jData,
        );
        labels = accountRequirementLabels(list, REGISTER_MESSAGES.ACCOUNT_NOT_AVAILABLE);
      }

      setAccountRejection(null);
      setRequirements({ accountNumber: key, labels });
      return labels;
    } catch (error) {
      if (error instanceof RegistrationError) setAccountRejection({ key, message: error.message });
      throw error;
    }
  };

  /** Shows the account's requirement fields as soon as its number is entered. */
  const loadRequirementsOnBlur = async () => {
    const { accountNumber } = draft.billing;
    if (draft.billing.method !== 'corporate' || !accountNumber.trim()) return;
    try {
      await loadRequirements(accountNumber);
    } catch {
      // A refusal is already on the field; anything else resurfaces on submit.
    }
  };

  /** A new account number makes the old account's answers meaningless. */
  const changeBilling = (billing: RegistrationBilling) =>
    patch({
      billing:
        billing.accountNumber === draft.billing.accountNumber
          ? billing
          : { ...billing, requirements: EMPTY_REQUIREMENTS },
    });

  /**
   * Corporate billing: the account, its VIP number and its requirements.
   * Resolves with the requirement fields the account asks for.
   */
  const verifyCorporateAccount = async () => {
    const { accountNumber, companyName, vipNumber } = draft.billing;

    await check(
      companyCheck,
      ACTION_CODES.IS_VALID_COMPANY_NAME,
      companyNameJData(accountNumber, companyName),
      REGISTER_MESSAGES.COMPANY_INVALID,
    );

    if (vipNumber.trim()) {
      const key = vipKey(draft);
      try {
        await check(
          vipCheck,
          ACTION_CODES.IS_VALID_VIP,
          vipJData(accountNumber, vipNumber),
          REGISTER_MESSAGES.VIP_INVALID,
        );
        setVipRejection(null);
      } catch (error) {
        if (error instanceof RegistrationError) setVipRejection({ key, message: error.message });
        throw error;
      }
    }

    return loadRequirements(accountNumber);
  };

  const submit = async () => {
    markAttempted(2);
    setFormError(null);
    if (
      hasErrors(validateBilling(draft.billing, today, requirementLabels)) ||
      hasErrors(validateCarPreferences(draft.car, today)) ||
      !human
    ) {
      return;
    }

    setBusy('submitting');
    try {
      let labels: readonly string[] = [];
      if (draft.billing.method === 'corporate') {
        labels = await verifyCorporateAccount();
        // The account may ask for fields the form was not showing yet; they
        // appear with their errors and the user answers before resubmitting.
        if (hasErrors(validateBilling(draft.billing, today, labels))) {
          scrollToTop();
          return;
        }
      }
      await check(
        createProfile,
        ACTION_CODES.CREATE_PROFILE,
        createProfileJData(draft, labels.length),
        REGISTER_MESSAGES.PROFILE_REJECTED,
      );
      setDone(true);
    } catch (error) {
      showFormError(error);
      // A rejected attempt invalidates the challenge, same as a real CAPTCHA.
      setHuman(false);
    } finally {
      setBusy(null);
    }
  };

  const next = () => {
    if (busy) return;
    if (step === 0) void nextFromAccount();
    else if (step === 1) nextFromAddress();
    else void submit();
  };

  if (done) {
    return (
      <Screen title={REGISTER_MESSAGES.SCREEN_TITLE}>
        <AuthCard>
          <Alert
            tone="success"
            title={REGISTER_MESSAGES.SUCCESS_TITLE}
            message={REGISTER_MESSAGES.SUCCESS_MESSAGE}
          />
          <Link href="/login" style={styles.link}>
            {REGISTER_MESSAGES.BACK_TO_LOGIN}
          </Link>
        </AuthCard>
      </Screen>
    );
  }

  let nextLabel: string = REGISTER_MESSAGES.NEXT;
  if (step === LAST_STEP) nextLabel = busy ? REGISTER_MESSAGES.SUBMITTING : REGISTER_MESSAGES.SUBMIT;
  else if (busy) nextLabel = REGISTER_MESSAGES.CHECKING;

  return (
    <Screen title={REGISTER_MESSAGES.SCREEN_TITLE} scrollRef={scrollRef}>
      <View style={styles.column}>
        <StepTabs
          steps={REGISTRATION_STEPS}
          activeIndex={step}
          onSelect={busy ? undefined : goTo}
          compact={!roomy}
        />

        <AuthCard>
          {formError ? (
            <Alert tone="danger" title={REGISTER_MESSAGES.FAILED_TITLE} message={formError} />
          ) : null}

          {step === 0 ? (
            <AccountStep
              account={draft.account}
              onAccountChange={(account) => patch({ account })}
              accountErrors={accountErrors}
              personal={draft.personal}
              onPersonalChange={(personal) => patch({ personal })}
              personalErrors={step1.personal}
            />
          ) : null}

          {step === 1 ? (
            <MailingAddressForm
              value={draft.address}
              onChange={(address) => patch({ address })}
              errors={addressErrors}
            />
          ) : null}

          {step === 2 ? (
            <BillingStep
              billing={draft.billing}
              onBillingChange={changeBilling}
              billingErrors={billingErrors}
              onAccountBlur={() => void loadRequirementsOnBlur()}
              onVipBlur={() => void checkVipOnBlur()}
              requirementLabels={requirementLabels}
              preferences={draft.preferences}
              onPreferencesChange={(preferences) => patch({ preferences })}
              car={draft.car}
              onCarChange={(car) => patch({ car })}
              carErrors={carErrors}
              human={human}
              onHumanChange={setHuman}
              humanError={humanError}
              today={today}
            />
          ) : null}

          <View style={styles.actions}>
            {step > 0 ? (
              <Button
                label={REGISTER_MESSAGES.BACK}
                variant="outline"
                size="lg"
                onPress={() => goTo(step - 1)}
                disabled={busy !== null}
                fill={!roomy}
              />
            ) : null}
            <Button
              label={nextLabel}
              size="lg"
              onPress={next}
              disabled={busy !== null}
              fill={!roomy}
              style={roomy ? styles.primaryRoomy : undefined}
            />
          </View>

          {step === 0 ? (
            <Link href="/login" style={styles.link}>
              {REGISTER_MESSAGES.HAVE_ACCOUNT_LINK}
            </Link>
          ) : null}
        </AuthCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: formMaxWidth, alignSelf: 'center', gap: space.lg },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.md, marginTop: space.xs },
  primaryRoomy: { minWidth: 200 },
  link: { color: colors.textLink, fontSize: 14, fontWeight: '600' },
});
