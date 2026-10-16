import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui/Button';
import { RESERVATION_MESSAGES } from '@/constants/messages';
import { useReservation } from '@/context/ReservationContext';
import { useSavedPlaces } from '@/context/SavedPlacesContext';
import type { AddressSuggestion } from '@/services/places';
import { EXPRESS_DISPATCH_MINUTES } from '@/services/reservation';
import { colors, radii, space } from '@/theme';

import { HomePanel } from './HomePanel';
import { LocationSelect } from './LocationSelect';

export type ExpressPickupPanelProps = {
  style?: StyleProp<ViewStyle>;
};

/**
 * Express checkout for riders who always travel between the same places
 * (reverse-engineer-guide/06): pick both ends from the saved addresses
 * (`PROF.S.USER_ADDRESSES`) and a ready-now ride opens on Reservation 2's
 * preview, zoned and filled from the profile — one more tap books it.
 */
export function ExpressPickupPanel({ style }: ExpressPickupPanelProps) {
  const router = useRouter();
  const { places, isLoading, errorDisplay, refetch } = useSavedPlaces();
  const { startExpress } = useReservation();
  const [pickup, setPickup] = useState<AddressSuggestion | null>(null);
  const [dropoff, setDropoff] = useState<AddressSuggestion | null>(null);

  const sameEnds = pickup !== null && pickup.placeId === dropoff?.placeId;
  const ready = pickup !== null && dropoff !== null && !sameEnds;

  const checkout = () => {
    if (!pickup || !dropoff) return;
    startExpress(pickup, dropoff);
    router.navigate('/reserver-2');
  };

  return (
    <HomePanel
      heading={RESERVATION_MESSAGES.EXPRESS_HEADING}
      barTitle={RESERVATION_MESSAGES.EXPRESS_BAR}
      style={style}
    >
      {isLoading && places.length === 0 ? (
        <ActivityIndicator color={colors.primary[600]} style={styles.loading} />
      ) : errorDisplay && places.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{RESERVATION_MESSAGES.EXPRESS_FAILED}</Text>
          <Button label={RESERVATION_MESSAGES.RETRY} variant="outline" onPress={refetch} />
        </View>
      ) : places.length === 0 ? (
        <Text style={styles.stateText}>{RESERVATION_MESSAGES.EXPRESS_EMPTY}</Text>
      ) : (
        <>
          <LocationSelect
            label={RESERVATION_MESSAGES.EXPRESS_PICKUP_LABEL}
            options={places}
            value={pickup}
            onChange={setPickup}
            markerColor={colors.primary[600]}
          />

          <LocationSelect
            label={RESERVATION_MESSAGES.EXPRESS_DROPOFF_LABEL}
            options={places}
            value={dropoff}
            onChange={setDropoff}
            markerColor={colors.accent}
            hint={sameEnds ? RESERVATION_MESSAGES.EXPRESS_SAME_ENDS : undefined}
          />

          <Button
            label={RESERVATION_MESSAGES.EXPRESS_BUTTON}
            size="lg"
            disabled={!ready}
            onPress={checkout}
          />

          <View style={styles.note}>
            <Text style={styles.noteText}>
              With express checkout a car is{' '}
              <Text style={styles.noteStrong}>dispatched</Text> to your location{' '}
              <Text style={styles.noteStrong}>in {EXPRESS_DISPATCH_MINUTES} minutes</Text> from now.
            </Text>
          </View>
        </>
      )}
    </HomePanel>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: space.lg },
  state: { gap: space.md, alignItems: 'flex-start' },
  stateText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  note: {
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  noteText: { color: colors.textBody, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  noteStrong: { color: colors.info, fontWeight: '700' },
});
