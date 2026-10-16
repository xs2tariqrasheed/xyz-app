import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/nav/AppHeader';
import { AddressStep } from '@/components/reservation/AddressStep';
import type { BillingErrors } from '@/components/reservation/BillingMethodSection';
import { type AccountRules, BillingStep, DEFAULT_ACCOUNT_RULES } from '@/components/reservation/BillingStep';
import {
  PassengerRideInfoSection,
  type PassengerRideInfoErrors,
} from '@/components/reservation/PassengerRideInfoSection';
import { PreferencesSection, type PreferencesErrors } from '@/components/reservation/PreferencesSection';
import { ReservationConfirmSection } from '@/components/reservation/ReservationConfirmSection';
import { ReservationSummary } from '@/components/reservation/ReservationSummary';
import type { RideAddressInfoErrors } from '@/components/reservation/RideAddressInfoSection';
import { RideReceiptSection } from '@/components/reservation/RideReceiptSection';
import { SectionCard } from '@/components/reservation/SectionCard';
import { RESERVATION_SECTIONS, sectionIndex } from '@/components/reservation/sections';
import { StepTabs } from '@/components/reservation/StepTabs';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RESERVATION_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useReservation } from '@/context/ReservationContext';
import {
  CONTACT_COLUMN_IDS,
  useAccountOnFile,
  useContactValues,
  useGrantedProfiles,
  useVehicleTypes,
} from '@/hooks/useReservationLookups';
import { BillingError } from '@/services/billing';
import { getErrorDisplay } from '@/services/gateway';
import { ReservationError } from '@/services/reservation';
import {
  checkAddresses,
  checkBilling,
  checkPassenger,
  checkPreferences,
} from '@/services/reservationValidation';
import { findVehicleType } from '@/services/vehicleTypes';
import { breakpoints, colors, contentMaxWidth, space } from '@/theme';

const PASSENGER = sectionIndex('passenger');
const ADDRESS = sectionIndex('address');
const BILLING = sectionIndex('billing');
const PREFERENCES = sectionIndex('preferences');
const PREVIEW = sectionIndex('confirm');
const RECEIPT = sectionIndex('receipt');

type StepErrors = {
  passenger: PassengerRideInfoErrors;
  address: RideAddressInfoErrors;
  billing: BillingErrors;
  preferences: PreferencesErrors;
};

const NO_ERRORS: StepErrors = { passenger: {}, address: {}, billing: {}, preferences: {} };

type Banner = { title: string; message: string } | null;

/**
 * "Make a reservation" with the steps across the top and a live summary
 * beside the form (reverse-engineer-implemented/guide/13–17). The draft lives in
 * `ReservationContext`; this screen validates each step, runs the server
 * checks, and books from the Preview step.
 */
export default function MakeReservationTopStepsScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // `wide` earns the summary column beside the form; `roomy` only earns a
  // right-aligned action bar.
  const wide = width >= breakpoints.lg;
  const roomy = width >= breakpoints.md;

  const { session } = useAuth();
  const loginId = session?.loginId ?? '';
  const reservation = useReservation();
  const { draft, mode, editing, stepIndex, receipt, submitting, authorising } = reservation;

  // A single "now" for the screen, so the calendar floor and the expiry check agree.
  const [today] = useState(() => new Date());
  const [errors, setErrors] = useState<StepErrors>(NO_ERRORS);
  const [banner, setBanner] = useState<Banner>(null);
  const [checking, setChecking] = useState(false);
  const [rules, setRules] = useState<AccountRules>(DEFAULT_ACCOUNT_RULES);
  const scrollRef = useRef<ScrollView>(null);

  const vehicleTypes = useVehicleTypes();
  const granted = useGrantedProfiles(loginId);
  const emailContacts = useContactValues(loginId, CONTACT_COLUMN_IDS.email);
  const cellContacts = useContactValues(loginId, CONTACT_COLUMN_IDS.cell);
  const accountOnFile = useAccountOnFile(loginId);

  // Arriving on a finished booking (from the menu) starts the next one — once.
  const { startNew, setBilling, setPreferences } = reservation;
  const restartPending = useRef(receipt !== null);
  useEffect(() => {
    if (!restartPending.current) return;
    restartPending.current = false;
    startNew();
  }, [startNew]);

  // The first car type is the default, as on the old form.
  const firstCarType = vehicleTypes.items[0]?.code ?? '';
  const carTypeKnown = findVehicleType(vehicleTypes.items, draft.preferences.carType) !== undefined;
  useEffect(() => {
    if (!carTypeKnown && firstCarType && !draft.preferences.carType) {
      setPreferences({ ...draft.preferences, carType: firstCarType });
    }
  }, [carTypeKnown, firstCarType, draft.preferences, setPreferences]);

  // The account and VIP on file fill a new booking's billing when the profile had none.
  useEffect(() => {
    if (mode !== 'new' || !accountOnFile) return;
    const { billing } = draft;
    const account = billing.accountNumber || accountOnFile.accountNumber;
    const vip = billing.vipNumber || accountOnFile.vipNumber;
    if (account !== billing.accountNumber || vip !== billing.vipNumber) {
      setBilling({ ...billing, accountNumber: account, vipNumber: vip });
    }
  }, [mode, accountOnFile, draft, setBilling]);

  const onRules = useCallback((next: AccountRules) => setRules(next), []);

  const section = RESERVATION_SECTIONS[stepIndex];
  const nextSection = RESERVATION_SECTIONS[stepIndex + 1];
  const onReceipt = stepIndex === RECEIPT;
  const onPreview = stepIndex === PREVIEW;
  const editMode = mode === 'edit';
  const busy = checking || submitting || authorising;

  const goTo = (index: number) => {
    setBanner(null);
    reservation.setStepIndex(index);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const showError = (error: unknown, title: string) => {
    if (error instanceof ReservationError || error instanceof BillingError) {
      setBanner({ title, message: error.message });
      return;
    }
    const display = getErrorDisplay(error);
    setBanner({ title: display.title, message: display.customDescription });
  };

  /** Every step's checks, so the preview can send the customer to the first problem. */
  const checkAll = () => {
    const passenger = checkPassenger(draft.info, new Date());
    const address = checkAddresses(draft.addresses);
    const billing = checkBilling(draft.billing, new Date(), rules.allowedMethods, rules.requirementFields);
    const preferences = checkPreferences(draft.preferences, vehicleTypes.items);
    const billingErrors = { ...rules.errors, ...billing.errors };
    const next: StepErrors = {
      passenger: passenger.errors,
      address: address.errors,
      billing: billingErrors,
      preferences: preferences.errors,
    };
    const firstBad = !passenger.ok
      ? PASSENGER
      : !address.ok
        ? ADDRESS
        : !billing.ok || Object.values(rules.errors).some(Boolean)
          ? BILLING
          : !preferences.ok
            ? PREFERENCES
            : null;
    return { errors: next, firstBad };
  };

  const continueStep = async () => {
    setBanner(null);

    // A stop whose lookup failed (a dropped connection, say) is looked up
    // again rather than sending the customer back to pick it a second time.
    if (stepIndex === ADDRESS) {
      const { addresses } = draft;
      const retry = (
        [
          ['pickup', addresses.pickup, addresses.pickupLeg],
          ['destination', addresses.destination, addresses.destinationLeg],
        ] as const
      ).filter(([, suggestion, leg]) => suggestion && leg.lookup === 'failed');
      if (retry.length > 0) {
        for (const [leg, suggestion] of retry) reservation.selectPlace(leg, suggestion);
        return;
      }
    }

    const { errors: next, firstBad } = checkAll();

    // Only the current step blocks Continue; later steps are checked when reached.
    const stepOk =
      stepIndex === PREVIEW ? firstBad === null : firstBad === null || firstBad > stepIndex;
    if (!stepOk) {
      setErrors(next);
      if (firstBad !== null && firstBad !== stepIndex) goTo(firstBad);
      return;
    }
    setErrors(NO_ERRORS);

    if (stepIndex === BILLING) {
      setChecking(true);
      try {
        await reservation.confirmBilling();
      } catch (error) {
        showError(error, RESERVATION_MESSAGES.STEP_FAILED_TITLE);
        return;
      } finally {
        setChecking(false);
      }
    }

    if (stepIndex === PREVIEW) {
      try {
        await reservation.submit();
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      } catch (error) {
        showError(error, editMode ? RESERVATION_MESSAGES.SAVE_FAILED_TITLE : RESERVATION_MESSAGES.BOOK_FAILED_TITLE);
      }
      return;
    }

    goTo(stepIndex + 1);
  };

  const continueLabel = onPreview
    ? submitting
      ? editMode
        ? RESERVATION_MESSAGES.SAVING
        : RESERVATION_MESSAGES.BOOKING
      : editMode
        ? RESERVATION_MESSAGES.SAVE_CHANGES
        : RESERVATION_MESSAGES.BOOK
    : busy
      ? RESERVATION_MESSAGES.CHECKING
      : wide && nextSection
        ? `${RESERVATION_MESSAGES.CONTINUE_TO} ${nextSection.title}`
        : RESERVATION_MESSAGES.CONTINUE;

  const carLabel = findVehicleType(vehicleTypes.items, draft.preferences.carType)?.label ?? '';
  const bookingForLabel = draft.info.bookingFor
    ? (granted.items.find((option) => option.value === draft.info.bookingFor)?.label ?? draft.info.bookingFor)
    : undefined;
  const reservationNumber = receipt?.reservationNumber ?? editing?.reservationNumber ?? null;

  const summary = (
    <ReservationSummary
      info={draft.info}
      addresses={draft.addresses}
      billing={draft.billing}
      preferences={draft.preferences}
      carLabel={carLabel}
      reservationNumber={reservationNumber}
      activeIndex={stepIndex}
      onSelect={onReceipt ? undefined : goTo}
    />
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: RESERVATION_MESSAGES.SCREEN_TITLE }} />

      <AppHeader
        title={editMode ? RESERVATION_MESSAGES.EDIT_SCREEN_TITLE : RESERVATION_MESSAGES.SCREEN_TITLE}
        subtitle={editMode ? RESERVATION_MESSAGES.EDIT_SCREEN_SUBTITLE : RESERVATION_MESSAGES.SCREEN_SUBTITLE}
        trailing={
          draft.info.isLive && !onReceipt ? (
            <Badge label={RESERVATION_MESSAGES.LIVE_BADGE} tone="accent" pulse />
          ) : null
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: space.xxl }]}
        >
          <View style={styles.page}>
            <StepTabs
              activeIndex={stepIndex}
              onSelect={onReceipt || busy ? undefined : goTo}
              compact={!roomy}
            />

            <View style={[styles.columns, wide ? styles.columnsWide : null]}>
              <View style={styles.formColumn}>
                {banner ? <Alert tone="danger" title={banner.title} message={banner.message} /> : null}

                <SectionCard step={stepIndex + 1} title={section.title} state="active">
                  {section.id === 'passenger' ? (
                    <PassengerRideInfoSection
                      value={draft.info}
                      onChange={reservation.setInfo}
                      today={today}
                      bookingForOptions={granted.items}
                      errors={errors.passenger}
                    />
                  ) : section.id === 'address' ? (
                    <AddressStep
                      loginId={loginId}
                      accountNumber={draft.billing.accountNumber}
                      value={draft.addresses}
                      onChange={reservation.setAddresses}
                      onSelectPlace={reservation.selectPlace}
                      errors={errors.address}
                    />
                  ) : section.id === 'billing' ? (
                    <BillingStep
                      value={draft.billing}
                      onChange={reservation.setBilling}
                      today={today}
                      authorising={authorising}
                      errors={errors.billing}
                      onRules={onRules}
                    />
                  ) : section.id === 'preferences' ? (
                    <PreferencesSection
                      value={draft.preferences}
                      onChange={reservation.setPreferences}
                      vehicleTypes={vehicleTypes}
                      emailContacts={emailContacts.items}
                      phoneContacts={cellContacts.items}
                      errors={errors.preferences}
                    />
                  ) : section.id === 'confirm' ? (
                    <ReservationConfirmSection
                      info={draft.info}
                      addresses={draft.addresses}
                      billing={draft.billing}
                      preferences={draft.preferences}
                      carLabel={carLabel}
                      bookingForLabel={bookingForLabel}
                      editing={editMode}
                      onEdit={goTo}
                    />
                  ) : (
                    <RideReceiptSection
                      reservationNumber={receipt?.reservationNumber ?? null}
                      updated={receipt?.mode === 'edit'}
                      emailFailed={receipt?.emailFailed}
                      onViewReservation={() =>
                        receipt?.reservationNumber
                          ? router.push({
                              pathname: '/reservation-info',
                              params: { rideno: receipt.reservationNumber },
                            })
                          : router.push('/rides')
                      }
                      onBookAnotherLeg={reservation.startReturnLeg}
                    />
                  )}
                </SectionCard>
              </View>

              {/* Narrow screens keep the same panel, stacked under the form.
                  The preview is itself the summary, so it drops the column
                  rather than saying everything twice. */}
              {onPreview ? null : <View style={wide ? styles.summaryColumn : null}>{summary}</View>}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.actionBar, { paddingBottom: insets.bottom + space.md }]}>
          <View style={[styles.actionInner, roomy ? styles.actionInnerWide : null]}>
            {onReceipt ? (
              <Button
                label={RESERVATION_MESSAGES.NEW_RESERVATION}
                size="lg"
                onPress={startNew}
                style={roomy ? null : styles.continue}
              />
            ) : (
              <>
                <Button
                  label={RESERVATION_MESSAGES.BACK}
                  variant="outline"
                  disabled={stepIndex === 0 || busy}
                  onPress={() => goTo(stepIndex - 1)}
                />
                <Button
                  label={continueLabel}
                  size="lg"
                  disabled={busy}
                  onPress={() => void continueStep()}
                  style={roomy ? null : styles.continue}
                />
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  scrollContent: { paddingHorizontal: space.lg, paddingTop: space.xl },
  page: { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center', gap: space.lg },
  columns: { gap: space.lg },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xl },
  formColumn: { flex: 1, gap: space.lg },
  summaryColumn: { width: 300 },

  actionBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  actionInner: {
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  actionInnerWide: { justifyContent: 'flex-end' },
  continue: { flex: 1 },
});
