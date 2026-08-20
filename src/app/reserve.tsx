import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PassengerRideInfoSection,
  type PassengerRideInfoValue,
} from '@/components/reservation/PassengerRideInfoSection';
import { SectionCard, type SectionState } from '@/components/reservation/SectionCard';
import { RESERVATION_SECTIONS } from '@/components/reservation/sections';
import { StepProgress, StepRail } from '@/components/reservation/StepRail';
import { AppHeader } from '@/components/nav/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { breakpoints, colors, contentMaxWidth, formMaxWidth, space } from '@/theme';
import { nextSlot, startOfDay } from '@/utils/datetime';

/** Section 1 is the only one built out so far. */
const ACTIVE_INDEX = 0;

export default function MakeReservationScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Make a reservation' }} />

      <AppHeader
        title="Make a reservation"
        subtitle="Five short steps. You can review everything before it is booked."
        trailing={info.isLive ? <Badge label="LIVE CALL" tone="accent" pulse /> : null}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: space.xxl }]}
        >
          <View style={[styles.page, wide ? styles.pageWide : null]}>
            {wide ? (
              <View style={styles.railColumn}>
                <StepRail activeIndex={ACTIVE_INDEX} />
              </View>
            ) : null}

            <View style={styles.formColumn}>
              {wide ? null : <StepProgress activeIndex={ACTIVE_INDEX} />}

              {RESERVATION_SECTIONS.map((section, index) => {
                const state: SectionState =
                  index === ACTIVE_INDEX ? 'active' : index < ACTIVE_INDEX ? 'complete' : 'upcoming';

                return (
                  <SectionCard
                    key={section.id}
                    step={index + 1}
                    title={section.title}
                    description={section.description}
                    state={state}
                  >
                    {section.id === 'passenger' ? (
                      <PassengerRideInfoSection value={info} onChange={setInfo} today={today} />
                    ) : null}
                  </SectionCard>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.actionBar, { paddingBottom: insets.bottom + space.md }]}>
          <View style={[styles.actionInner, roomy ? styles.actionInnerWide : null]}>
            <Button label="Save draft" variant="outline" />
            <Button
              label={wide ? 'Continue to ride address info' : 'Continue'}
              size="lg"
              style={roomy ? null : styles.continue}
            />
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
});
