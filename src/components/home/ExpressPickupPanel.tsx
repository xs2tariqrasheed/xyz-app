import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EXPRESS_DISPATCH_MINUTES, SAVED_LOCATIONS } from '@/data/savedLocations';
import type { AddressSuggestion } from '@/services/places';
import { colors, radii, space } from '@/theme';

import { HomePanel } from './HomePanel';
import { LocationSelect } from './LocationSelect';

export type ExpressPickupPanelProps = {
  style?: StyleProp<ViewStyle>;
};

/**
 * Express checkout for riders who always travel between the same places:
 * pick both ends from the address book and a car is dispatched now, with no
 * date, time or passenger details to fill in.
 */
export function ExpressPickupPanel({ style }: ExpressPickupPanelProps) {
  const router = useRouter();
  const [pickup, setPickup] = useState<AddressSuggestion | null>(null);
  const [dropoff, setDropoff] = useState<AddressSuggestion | null>(null);

  const sameEnds = pickup !== null && pickup.placeId === dropoff?.placeId;
  const ready = pickup !== null && dropoff !== null && !sameEnds;

  return (
    <HomePanel heading="Frequent Users" barTitle="I am ready for pickup" style={style}>
      <LocationSelect
        label="Select your pickup location"
        options={SAVED_LOCATIONS}
        value={pickup}
        onChange={setPickup}
        markerColor={colors.primary[600]}
      />

      <LocationSelect
        label="Select your dropoff location"
        options={SAVED_LOCATIONS}
        value={dropoff}
        onChange={setDropoff}
        markerColor={colors.accent}
        hint={sameEnds ? 'Pickup and dropoff must be different addresses.' : undefined}
      />

      <Button
        label="Express Checkout"
        size="lg"
        disabled={!ready}
        onPress={() => router.navigate('/reserve')}
      />

      <View style={styles.note}>
        <Text style={styles.noteText}>
          With express checkout a car is{' '}
          <Text style={styles.noteStrong}>dispatched</Text> to your location{' '}
          <Text style={styles.noteStrong}>in {EXPRESS_DISPATCH_MINUTES} minutes</Text> from now.
        </Text>
      </View>
    </HomePanel>
  );
}

const styles = StyleSheet.create({
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
