import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import {
  emptyBilling,
  needsAccount,
  needsCard,
  type BillingMethodValue,
} from '@/components/reservation/BillingMethodSection';
import type { PassengerRideInfoValue } from '@/components/reservation/PassengerRideInfoSection';
import { emptyPreferences, type PreferencesValue } from '@/components/reservation/PreferencesSection';
import {
  EMPTY_AIRPORT,
  emptyLeg,
  emptyRideAddressInfo,
  type LegDetails,
  type RideAddressInfoValue,
} from '@/components/reservation/RideAddressInfoSection';
import { sectionIndex } from '@/components/reservation/sections';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { RESERVATION_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { usePostData } from '@/hooks/usePostData';
import {
  APPROVAL_POLL_MS,
  APPROVAL_TIMEOUT_MS,
  type ApprovalState,
  assertAccountCheck,
  BillingError,
  cardFingerprint,
  checkApprovalJData,
  startApprovalJData,
  toApprovalState,
  verifyRequirementsJData,
} from '@/services/billing';
import { assertResultCode } from '@/services/gatewayRows';
import { type AddressSuggestion, resolvePlace } from '@/services/places';
import type { CustomerProfile } from '@/services/profile';
import {
  assertReservationSaved,
  ccEmailList,
  columnAddJData,
  columnChanges,
  columnReadJData,
  columnUpdateJData,
  createReservationJData,
  type DraftMode,
  emailMessageJData,
  recordToDraft,
  ReservationError,
  type ReservationDraft,
  type ReservationRecord,
  RESERVATION_COLUMN_IDS,
  toColumnValues,
  updateReservationJData,
} from '@/services/reservation';
import { usesCardOnFile } from '@/services/reservationValidation';
import { IDLE_ZONE, type Leg, toZoneState, zoneRequest } from '@/services/zones';
import { nextSlot, startOfDay } from '@/utils/datetime';

/**
 * The reservation being made or changed, shared by every step of the booking
 * wizard on Reservation 2, the Express Checkout panel and the ride screens
 * that start an edit, a return trip or a repeat (reverse-engineer-implemented/guide/13–22).
 *
 * Writes go out through `usePostData` with `retry: false` and behind an
 * in-flight lock, so a booking can never be sent twice. Card details live only
 * in this memory: never stored, never logged, and cleared once the booking is
 * sent or the customer signs out (00-README §5).
 */

export type ReservationReceipt = {
  mode: DraftMode;
  /** `null` when the server did not return one — never made up. */
  reservationNumber: string | null;
  /** The confirmation e-mail could not be sent; the booking still stands. */
  emailFailed: boolean;
};

export type ReservationContextValue = {
  draft: ReservationDraft;
  mode: DraftMode;
  /** The record an edit started from; `null` for a new booking. */
  editing: ReservationRecord | null;
  /** The wizard step to show. */
  stepIndex: number;
  setStepIndex: (index: number) => void;
  setInfo: (next: PassengerRideInfoValue) => void;
  setAddresses: (next: RideAddressInfoValue) => void;
  setBilling: (next: BillingMethodValue) => void;
  setPreferences: (next: PreferencesValue) => void;
  /** Picks a stop, then looks up its fields and checks its zone. */
  selectPlace: (leg: Leg, suggestion: AddressSuggestion | null) => void;
  startNew: () => void;
  /** Express Checkout: a ready-now ride between two saved places, opened on the preview. */
  startExpress: (pickup: AddressSuggestion, dropoff: AddressSuggestion) => void;
  /** An edit, return trip or repeat of a loaded reservation. */
  startFrom: (record: ReservationRecord, mode: Exclude<DraftMode, 'new'>) => void;
  /** After a booking: the way back, from the receipt. */
  startReturnLeg: () => void;
  /**
   * Checks the billing step with the server: the account's requirements, or
   * the card's authorisation (polled up to 90 s). Throws `BillingError` on a
   * refusal, `GatewayError` when a call fails.
   */
  confirmBilling: () => Promise<void>;
  authorising: boolean;
  /** Books or saves the draft. Throws `ReservationError` / `BillingError` / `GatewayError`. */
  submit: () => Promise<ReservationReceipt>;
  submitting: boolean;
  receipt: ReservationReceipt | null;
};

// Not exported: screens go through useReservation(), which guards a missing provider.
const ReservationContext = createContext<ReservationContextValue | null>(null);

const signedOut = (): never => {
  throw new Error('No signed-in customer to book for.');
};

const SIGNED_OUT: ReservationContextValue = {
  draft: {
    info: freshInfo(new Date(), null),
    addresses: emptyRideAddressInfo(),
    billing: emptyBilling(),
    preferences: emptyPreferences(),
  },
  mode: 'new',
  editing: null,
  stepIndex: 0,
  setStepIndex: () => undefined,
  setInfo: () => undefined,
  setAddresses: () => undefined,
  setBilling: () => undefined,
  setPreferences: () => undefined,
  selectPlace: () => undefined,
  startNew: () => undefined,
  startExpress: () => undefined,
  startFrom: () => undefined,
  startReturnLeg: () => undefined,
  confirmBilling: () => Promise.reject(new Error('No signed-in customer to book for.')),
  authorising: false,
  submit: signedOut,
  submitting: false,
  receipt: null,
};

export function ReservationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  if (!session) {
    return <ReservationContext.Provider value={SIGNED_OUT}>{children}</ReservationContext.Provider>;
  }

  // Keyed so a different login never sees — or books — the previous one's draft.
  return (
    <SignedInReservationProvider key={session.loginId} loginId={session.loginId}>
      {children}
    </SignedInReservationProvider>
  );
}

function freshInfo(now: Date, profile: CustomerProfile | null): PassengerRideInfoValue {
  return {
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    isLive: false,
    date: startOfDay(now),
    time: nextSlot(now),
    estimatedTime: nextSlot(now),
    bookingFor: '',
  };
}

/** A new booking, pre-filled from the profile the way the old site did (guide 14). */
function freshDraft(now: Date, profile: CustomerProfile | null): ReservationDraft {
  const preferences = emptyPreferences();
  return {
    info: freshInfo(now, profile),
    addresses: emptyRideAddressInfo(),
    billing: emptyBilling(profile?.accountNumber ?? ''),
    preferences: profile
      ? {
          ...preferences,
          // Module 09: the saved preference is the new booking's default.
          confirmByPhone: profile.preferences.confirmByPhone,
          email: profile.email,
          callbackUs: profile.personalInfo.usPhone,
          callbackIntl: profile.personalInfo.intlPhone,
        }
      : preferences,
  };
}

/** Drops the card number and security code — kept no longer than the call that needs them. */
function withoutCardSecrets(billing: BillingMethodValue): BillingMethodValue {
  return { ...billing, card: { ...billing.card, number: '', cvv: '' } };
}

/** What a billing check covered, so an unchanged step is not checked twice. */
function billingKey(billing: BillingMethodValue): string {
  return JSON.stringify([
    billing.method,
    billing.accountNumber.trim(),
    billing.vipNumber.trim(),
    billing.requirements,
    needsCard(billing.method) ? cardFingerprint(billing) : '',
  ]);
}

type DraftState = {
  /** `null` until the customer changes something, so a late profile still pre-fills. */
  draft: ReservationDraft | null;
  createdAt: Date;
  mode: DraftMode;
  editing: ReservationRecord | null;
  stepIndex: number;
  receipt: ReservationReceipt | null;
  /** {@link billingKey} of the last billing the server accepted. */
  billingVerified: string | null;
};

const PREVIEW_STEP = sectionIndex('confirm');
const RECEIPT_STEP = sectionIndex('receipt');

const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Stopped.'));
    });
  });

/**
 * Fills the blanks of a new booking's draft from the profile — never anything
 * the customer already typed. Returns `current` itself when nothing changes.
 */
function fillBlanksFromProfile(current: DraftState, profile: CustomerProfile): DraftState {
  if (!current.draft || current.mode !== 'new') return current;
  const { info, billing, preferences } = current.draft;
  const fresh = freshDraft(current.createdAt, profile);
  const namesBlank = !info.firstName && !info.lastName;
  const next: ReservationDraft = {
    ...current.draft,
    info: namesBlank ? { ...info, firstName: fresh.info.firstName, lastName: fresh.info.lastName } : info,
    billing: billing.accountNumber ? billing : { ...billing, accountNumber: fresh.billing.accountNumber },
    preferences: {
      ...preferences,
      email: preferences.email || fresh.preferences.email,
      callbackUs: preferences.callbackUs.number ? preferences.callbackUs : fresh.preferences.callbackUs,
      callbackIntl: preferences.callbackIntl.number ? preferences.callbackIntl : fresh.preferences.callbackIntl,
    },
  };
  const changed =
    next.info !== info ||
    next.billing !== billing ||
    next.preferences.email !== preferences.email ||
    next.preferences.callbackUs !== preferences.callbackUs ||
    next.preferences.callbackIntl !== preferences.callbackIntl;
  return changed ? { ...current, draft: next } : current;
}

function SignedInReservationProvider({ loginId, children }: { loginId: string; children: ReactNode }) {
  const { profile } = useProfile();

  const [state, setState] = useState<DraftState>(() => ({
    draft: null,
    createdAt: new Date(),
    mode: 'new',
    editing: null,
    stepIndex: 0,
    receipt: null,
    billingVerified: null,
  }));
  const [authorising, setAuthorising] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // One instance per action (docs/XYZ_INTEGRATION_GUIDE.md §5).
  const pickupZone = usePostData();
  const destinationZone = usePostData();
  const verifyAccount = usePostData();
  const startApproval = usePostData();
  const checkApproval = usePostData();
  const saveReservation = usePostData();
  const readColumns = usePostData();
  const writeColumn = usePostData();
  const sendEmail = usePostData();

  const draft = state.draft ?? freshDraft(state.createdAt, profile);

  // Event handlers and async work read the latest committed state, never a
  // render's stale copy.
  const stateRef = useRef(state);
  const draftRef = useRef(draft);
  const profileRef = useRef(profile);
  useEffect(() => {
    stateRef.current = state;
    draftRef.current = draft;
    profileRef.current = profile;
  });

  // A profile that lands after the draft was first touched still fills the
  // blanks of a new booking. Adjusted during render rather than in an effect,
  // so the filled draft is what the next paint shows.
  const [seenProfile, setSeenProfile] = useState(profile);
  if (profile !== seenProfile) {
    setSeenProfile(profile);
    if (profile) setState((current) => fillBlanksFromProfile(current, profile));
  }

  /** Only the latest pick of each stop may write its lookup back. */
  const legSeq = useRef<Record<Leg, number>>({ pickup: 0, destination: 0 });
  const busy = useRef(false);
  /**
   * Cancels lookups and card polling when the provider goes away. Made fresh
   * each time the effect runs: Fast Refresh (and React's effect replays)
   * re-run effects without remounting, and a controller created once in
   * `useRef` would stay aborted — failing every later lookup at once.
   */
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);
  const lifetimeSignal = () => lifetime.current?.signal;

  const updateDraft = (update: (current: ReservationDraft) => ReservationDraft) =>
    setState((current) => ({
      ...current,
      draft: update(current.draft ?? freshDraft(current.createdAt, profileRef.current)),
    }));

  const patchLeg = (leg: Leg, seq: number, next: Partial<LegDetails>) => {
    if (legSeq.current[leg] !== seq) return;
    const key = leg === 'pickup' ? 'pickupLeg' : 'destinationLeg';
    updateDraft((current) => ({
      ...current,
      addresses: { ...current.addresses, [key]: { ...current.addresses[key], ...next } },
    }));
  };

  const selectPlace = (leg: Leg, suggestion: AddressSuggestion | null) => {
    const seq = ++legSeq.current[leg];
    const notesKey = leg === 'pickup' ? 'pickupNotes' : 'destinationNotes';
    const legKey = leg === 'pickup' ? 'pickupLeg' : 'destinationLeg';

    updateDraft((current) => ({
      ...current,
      addresses: {
        ...current.addresses,
        [leg]: suggestion,
        [legKey]: { ...emptyLeg(), lookup: suggestion ? 'resolving' : 'idle' },
        // A saved address brings its own directions, unless the customer
        // already wrote some of their own.
        [notesKey]:
          !current.addresses[notesKey] ||
          current.addresses[notesKey] === current.addresses[leg]?.place?.directions
            ? (suggestion?.place?.directions ?? '')
            : current.addresses[notesKey],
      },
    }));
    if (!suggestion) return;

    const zoneCall = leg === 'pickup' ? pickupZone : destinationZone;
    void (async () => {
      let place;
      try {
        place = await resolvePlace(suggestion, lifetimeSignal());
      } catch (error) {
        if (lifetimeSignal()?.aborted) return;
        if (__DEV__) console.warn(`[Reservation] ${leg} lookup failed:`, error instanceof Error ? error.message : error);
        patchLeg(leg, seq, { lookup: 'failed' });
        return;
      }
      patchLeg(leg, seq, { place, lookup: 'ready', zone: { ...IDLE_ZONE, status: 'checking' }, airport: EMPTY_AIRPORT });

      const request = zoneRequest(place, leg, !suggestion.place);
      try {
        const response = await zoneCall.mutateAsync(request.actionCode, GATEWAY_VIEW_NAME, request.jData);
        patchLeg(leg, seq, { zone: toZoneState(response) });
      } catch {
        // No answer is no match: the customer must acknowledge the address.
        patchLeg(leg, seq, { zone: { status: 'unmatched', zoneNum: '' } });
      }
    })();
  };

  const reset = (next: Partial<DraftState>) => {
    legSeq.current = { pickup: legSeq.current.pickup + 1, destination: legSeq.current.destination + 1 };
    setState({
      draft: null,
      createdAt: new Date(),
      mode: 'new',
      editing: null,
      stepIndex: 0,
      receipt: null,
      billingVerified: null,
      ...next,
    });
  };

  const startNew = () => reset({});

  const startExpress = (pickup: AddressSuggestion, dropoff: AddressSuggestion) => {
    const now = new Date();
    const base = freshDraft(now, profileRef.current);
    reset({
      createdAt: now,
      draft: { ...base, info: { ...base.info, isLive: true } },
      stepIndex: PREVIEW_STEP,
    });
    selectPlace('pickup', pickup);
    selectPlace('destination', dropoff);
  };

  const startFrom = (record: ReservationRecord, mode: Exclude<DraftMode, 'new'>) => {
    const now = new Date();
    reset({
      createdAt: now,
      draft: recordToDraft(record, mode, freshDraft(now, profileRef.current), now),
      mode,
      editing: mode === 'edit' ? record : null,
    });
  };

  const startReturnLeg = () => {
    const current = draftRef.current;
    const now = new Date();
    const { addresses } = current;
    reset({
      createdAt: now,
      draft: {
        ...current,
        info: { ...current.info, isLive: false, date: startOfDay(now), time: nextSlot(now) },
        addresses: {
          pickup: addresses.destination,
          pickupNotes: addresses.destinationNotes,
          pickupLeg: { ...addresses.destinationLeg, airport: EMPTY_AIRPORT },
          destination: addresses.pickup,
          destinationNotes: addresses.pickupNotes,
          destinationLeg: { ...addresses.pickupLeg, airport: EMPTY_AIRPORT },
        },
        billing: { ...withoutCardSecrets(current.billing), approvalNumber: '', approvedFor: '', cardOnFile: '' },
      },
    });
  };

  /** Starts an authorisation and waits for its outcome, polling every 10 s for up to 90 s. */
  const authoriseCard = async (billing: BillingMethodValue): Promise<string> => {
    const signal = lifetimeSignal() ?? new AbortController().signal;
    const started = Date.now();
    const first = await startApproval.mutateAsync(
      ACTION_CODES.START_CREDIT_CARD_APPROVAL,
      GATEWAY_VIEW_NAME,
      startApprovalJData(loginId, billing),
      // Never resent: a lost answer must not authorise the card twice.
      { retry: false },
    );
    let outcome: ApprovalState = toApprovalState(first);

    while (outcome.status === 'pending') {
      if (Date.now() - started + APPROVAL_POLL_MS > APPROVAL_TIMEOUT_MS) {
        throw new BillingError(RESERVATION_MESSAGES.CARD_TIMEOUT);
      }
      await delay(APPROVAL_POLL_MS, signal);
      const requestNumber = outcome.requestNumber;
      const answer = await checkApproval.mutateAsync(
        ACTION_CODES.CHECK_CREDIT_CARD_APPROVAL,
        GATEWAY_VIEW_NAME,
        checkApprovalJData(loginId, requestNumber),
      );
      outcome = toApprovalState(answer, requestNumber);
    }

    if (outcome.status === 'declined') throw new BillingError(outcome.message);
    return outcome.approvalNumber;
  };

  /**
   * The server-side billing checks. Returns the billing with any new approval
   * applied, so the caller books exactly what was approved.
   */
  const verifyBilling = async (billing: BillingMethodValue): Promise<BillingMethodValue> => {
    const key = billingKey(billing);
    if (stateRef.current.billingVerified === key) return billing;

    if (needsAccount(billing.method)) {
      const response = await verifyAccount.mutateAsync(
        ACTION_CODES.VERIFY_ACCOUNT_REQUIREMENTS,
        GATEWAY_VIEW_NAME,
        verifyRequirementsJData(billing),
      );
      assertAccountCheck(response, RESERVATION_MESSAGES.REQUIREMENTS_REJECTED);
    }

    let verified = billing;
    // An edit that keeps the card on file was authorised when it was booked.
    if (needsCard(billing.method) && !usesCardOnFile(billing)) {
      const fingerprint = cardFingerprint(billing);
      if (billing.approvedFor !== fingerprint) {
        setAuthorising(true);
        try {
          verified = { ...billing, approvalNumber: await authoriseCard(billing), approvedFor: fingerprint };
        } finally {
          setAuthorising(false);
        }
      }
    }

    stateRef.current = { ...stateRef.current, billingVerified: key };
    setState((current) => {
      const currentDraft = current.draft ?? freshDraft(current.createdAt, profileRef.current);
      return {
        ...current,
        draft: { ...currentDraft, billing: { ...currentDraft.billing, approvalNumber: verified.approvalNumber, approvedFor: verified.approvedFor } },
        billingVerified: key,
      };
    });
    return verified;
  };

  const confirmBilling = async () => {
    await verifyBilling(draftRef.current.billing);
  };

  /** Brings the Email CC values stored on the reservation in line with the draft. Best effort. */
  const syncCcColumns = async (reservationNumber: string, mode: DraftMode, ccEmails: string) => {
    const columnId = RESERVATION_COLUMN_IDS.emailCc;
    const wanted = ccEmailList(ccEmails);
    const before =
      mode === 'edit'
        ? toColumnValues(
            await readColumns.mutateAsync(
              ACTION_CODES.LOAD_RESERVATION_COLUMN_VALUES_BY_TYPE,
              GATEWAY_VIEW_NAME,
              columnReadJData(reservationNumber, columnId),
            ),
          )
        : [];
    const changes = columnChanges(before, wanted);
    const write = async (actionCode: Parameters<typeof writeColumn.mutateAsync>[0], jData: Record<string, string | number>) => {
      const response = await writeColumn.mutateAsync(actionCode, GATEWAY_VIEW_NAME, jData, { retry: false });
      assertResultCode(response, (message) => new ReservationError(message), RESERVATION_MESSAGES.BOOK_REJECTED);
    };

    if (changes.update) {
      await write(
        ACTION_CODES.UPDATE_RESERVATION_COLUMN_VALUE,
        columnUpdateJData(reservationNumber, columnId, changes.update.from, changes.update.to),
      );
    }
    for (const value of changes.remove) {
      await write(ACTION_CODES.DELETE_RESERVATION_COLUMN_VALUE, {
        ...columnReadJData(reservationNumber, columnId),
        P_COLUMN_VALUE: value,
      });
    }
    for (const value of changes.add) {
      await write(ACTION_CODES.ADD_RESERVATION_COLUMN_VALUE, columnAddJData(reservationNumber, columnId, value));
    }
  };

  const submit = async (): Promise<ReservationReceipt> => {
    if (busy.current) throw new Error('A booking is already being sent.');
    busy.current = true;
    setSubmitting(true);
    try {
      const current = draftRef.current;
      const booked: ReservationDraft = { ...current, billing: await verifyBilling(current.billing) };
      const { mode, editing } = stateRef.current;
      const now = new Date();
      const context = { loginId, now, carPreferences: profileRef.current?.carPreferences };
      const response =
        mode === 'edit' && editing
          ? await saveReservation.mutateAsync(
              ACTION_CODES.UPDATE_RESERVATION,
              GATEWAY_VIEW_NAME,
              updateReservationJData(booked, editing, context),
              { retry: false },
            )
          : await saveReservation.mutateAsync(
              ACTION_CODES.CREATE_RESERVATION,
              GATEWAY_VIEW_NAME,
              createReservationJData(booked, context),
              { retry: false },
            );
      const saved = assertReservationSaved(response);
      const reservationNumber = saved.reservationNumber ?? (mode === 'edit' && editing ? editing.reservationNumber : null);

      let emailFailed = false;
      // Both follow-ups need the reservation's number; neither may undo the booking.
      if (reservationNumber) {
        const ccChanged =
          mode === 'edit' ? booked.preferences.ccEmails !== editing?.preferences.ccEmail : ccEmailList(booked.preferences.ccEmails).length > 0;
        if (ccChanged) {
          await syncCcColumns(reservationNumber, mode, booked.preferences.ccEmails).catch(() => undefined);
        }
        try {
          const email = await sendEmail.mutateAsync(
            ACTION_CODES.FORMAT_EMAIL_MESSAGE,
            GATEWAY_VIEW_NAME,
            emailMessageJData(booked, reservationNumber, now),
            { retry: false },
          );
          assertResultCode(email, (message) => new ReservationError(message), RESERVATION_MESSAGES.RECEIPT_EMAIL_FAILED);
        } catch {
          emailFailed = true;
        }
      }

      const receipt: ReservationReceipt = { mode, reservationNumber, emailFailed };
      setState((current) => {
        const currentDraft = current.draft ?? freshDraft(current.createdAt, profileRef.current);
        return {
          ...current,
          draft: { ...currentDraft, billing: withoutCardSecrets(currentDraft.billing) },
          receipt,
          stepIndex: RECEIPT_STEP,
        };
      });
      return receipt;
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  const value: ReservationContextValue = {
    draft,
    mode: state.mode,
    editing: state.editing,
    stepIndex: state.stepIndex,
    setStepIndex: (stepIndex) => setState((current) => ({ ...current, stepIndex })),
    setInfo: (info) => updateDraft((current) => ({ ...current, info })),
    setAddresses: (addresses) => updateDraft((current) => ({ ...current, addresses })),
    setBilling: (billing) => updateDraft((current) => ({ ...current, billing })),
    setPreferences: (preferences) => updateDraft((current) => ({ ...current, preferences })),
    selectPlace,
    startNew,
    startExpress,
    startFrom,
    startReturnLeg,
    confirmBilling,
    authorising,
    submit,
    submitting,
    receipt: state.receipt,
  };

  return <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>;
}

/** The reservation draft and its actions. Must be used inside `ReservationProvider`. */
export function useReservation(): ReservationContextValue {
  const value = useContext(ReservationContext);
  if (!value) throw new Error('useReservation must be used inside ReservationProvider');
  return value;
}

