import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BillingMethodSection,
  emptyCardDetails,
  type BillingMethodValue,
} from '@/components/reservation/BillingMethodSection';
import {
  PassengerRideInfoSection,
  type PassengerRideInfoValue,
} from '@/components/reservation/PassengerRideInfoSection';
import {
  emptyPreferences,
  PreferencesSection,
  type PreferencesValue,
} from '@/components/reservation/PreferencesSection';
import {
  RideAddressInfoSection,
  type RideAddressInfoValue,
} from '@/components/reservation/RideAddressInfoSection';
import { ReservationConfirmSection } from '@/components/reservation/ReservationConfirmSection';
import {
  makeReservationNumber,
  RideReceiptSection,
} from '@/components/reservation/RideReceiptSection';
import { SectionCard } from '@/components/reservation/SectionCard';
import { DEFAULT_CAR_TYPE } from '@/components/reservation/carTypes';
import { RESERVATION_SECTIONS } from '@/components/reservation/sections';
import { StepProgress, StepRail } from '@/components/reservation/StepRail';
import { AppHeader } from '@/components/nav/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { breakpoints, colors, contentMaxWidth, formMaxWidth, radii, space } from '@/theme';
import { nextSlot, startOfDay } from '@/utils/datetime';

const LAST_INDEX = RESERVATION_SECTIONS.length - 1;

export default function MakeReservationScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // `wide` earns the step rail; `roomy` only earns a right-aligned action bar.
  const wide = width >= breakpoints.lg;
  const roomy = width >= breakpoints.md;

  // A single "now" for the whole screen, so the calendar floor and the default
  // pickup slot cannot disagree as the clock ticks over.
  const [today] = useState(() => new Date());
  const [info, setInfo] = useState<PassengerRideInfoValue>(() => ({
    firstName: '',
    lastName: '',
    isLive: false,
    date: startOfDay(today),
    time: nextSlot(today),
  }));
  const [addresses, setAddresses] = useState<RideAddressInfoValue>({
    pickup: null,
    pickupNotes: '',
    destination: null,
    destinationNotes: '',
  });
  const [billing, setBilling] = useState<BillingMethodValue>({
    method: 'corporate',
    // Stands in for the account on the customer's profile, which is why the
    // field renders locked behind an Edit button rather than empty.
    accountNumber: 'CORP-48213',
    vipNumber: '',
    card: emptyCardDetails,
    saveCard: false,
  });
  const [preferences, setPreferences] = useState<PreferencesValue>(() =>
    emptyPreferences(DEFAULT_CAR_TYPE),
  );

  // Stands in for the number a booking endpoint will return; fixed for the
  // life of the screen so the receipt never renumbers itself mid-flow.
  const [reservationNumber] = useState(() => makeReservationNumber(today));

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goToSection = (index: number) => {
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const section = RESERVATION_SECTIONS[activeIndex];
  const nextSection = RESERVATION_SECTIONS[activeIndex + 1];

  // Leaving the confirmation step is what books the ride, so its action says so.
  const books = section.id === 'confirm';
  const continueLabel = !nextSection
    ? 'Book reservation'
    : books
      ? wide
        ? `Book and Continue to ${nextSection.title}`
        : 'Book and Continue'
      : wide
        ? `Continue to ${nextSection.title}`
        : 'Continue';

  /**
   * The return leg reuses the passenger and flips the addresses, so the
   * customer only has to pick a new date and time.
   */
  const bookAnotherLeg = () => {
    setAddresses({
      pickup: addresses.destination,
      pickupNotes: addresses.destinationNotes,
      destination: addresses.pickup,
      destinationNotes: addresses.pickupNotes,
    });
    setInfo((current) => ({ ...current, isLive: false }));
    goToSection(0);
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Make a reservation' }} />

      <AppHeader
        title="Make a reservation"
        subtitle="Six short steps. You can review everything before it is booked."
        trailing={info.isLive ? <Badge label="LIVE CALL" tone="accent" pulse /> : null}
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
          <View style={[styles.page, wide ? styles.pageWide : null]}>
            {wide ? (
              <View style={styles.railColumn}>
                <StepRail activeIndex={activeIndex} onSelect={goToSection} />
              </View>
            ) : null}

            <View style={styles.formColumn}>
              {wide ? null : <StepProgress activeIndex={activeIndex} onSelect={goToSection} />}

              <SectionCard step={activeIndex + 1} title={section.title} state="active">
                {section.id === 'passenger' ? (
                  <PassengerRideInfoSection value={info} onChange={setInfo} today={today} />
                ) : section.id === 'address' ? (
                  <RideAddressInfoSection value={addresses} onChange={setAddresses} />
                ) : section.id === 'billing' ? (
                  <BillingMethodSection value={billing} onChange={setBilling} today={today} />
                ) : section.id === 'preferences' ? (
                  <PreferencesSection value={preferences} onChange={setPreferences} />
                ) : section.id === 'confirm' ? (
                  <ReservationConfirmSection
                    info={info}
                    addresses={addresses}
                    billing={billing}
                    preferences={preferences}
                    onEdit={goToSection}
                  />
                ) : section.id === 'receipt' ? (
                  <RideReceiptSection
                    reservationNumber={reservationNumber}
                    onViewReservation={() => router.push('/receipts')}
                    onBookAnotherLeg={bookAnotherLeg}
                  />
                ) : (
                  <NotBuiltYet title={section.title} />
                )}
              </SectionCard>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.actionBar, { paddingBottom: insets.bottom + space.md }]}>
          <View style={[styles.actionInner, roomy ? styles.actionInnerWide : null]}>
            <Button label="Save draft" variant="outline" />
            <Button
              label={continueLabel}
              size="lg"
              disabled={activeIndex === LAST_INDEX}
              onPress={() => goToSection(Math.min(activeIndex + 1, LAST_INDEX))}
              style={roomy ? null : styles.continue}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Keeps an unbuilt step honest instead of rendering an empty card. */
function NotBuiltYet({ title }: { title: string }) {
  return (
    <View style={styles.notBuilt}>
      <Text style={styles.notBuiltText}>{title} is not built yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  scrollContent: { paddingHorizontal: space.lg, paddingTop: space.xl },
  page: { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center', gap: space.lg },
  pageWide: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xl },
  railColumn: { paddingTop: space.xs },
  formColumn: { flex: 1, maxWidth: formMaxWidth, gap: space.lg },

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
  // Phones stretch the primary action; wider screens keep it thumb-sized and
  // park the pair on the right, where the form column ends.
  actionInnerWide: { justifyContent: 'flex-end' },
  continue: { flex: 1 },

  notBuilt: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: space.lg,
  },
  notBuiltText: { color: colors.textMuted, fontSize: 14 },
});
