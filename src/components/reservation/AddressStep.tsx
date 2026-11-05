import {
  RideAddressInfoSection,
  type RideAddressInfoErrors,
  type RideAddressInfoValue,
} from '@/components/reservation/RideAddressInfoSection';
import { useSavedPlaces } from '@/context/SavedPlacesContext';
import { useCompanyPlaces, useProfilePlaces } from '@/hooks/useReservationLookups';
import type { AddressSuggestion } from '@/services/places';
import type { Leg } from '@/services/zones';

/**
 * Step 2 with the customer's own places above the Google results
 * (reverse-engineer-implemented/guide/15): saved addresses (`PROF.S.USER_ADDRESSES`,
 * shared with Home), the profile's address (`PROF.S.USER_PROFILE_ADDRESSES`)
 * and, with an account, the company's locations (`PROF.S.CORPORATE_ADDRESSES`).
 */

export type AddressStepProps = {
  loginId: string;
  accountNumber: string;
  value: RideAddressInfoValue;
  onChange: (next: RideAddressInfoValue) => void;
  onSelectPlace: (leg: Leg, suggestion: AddressSuggestion | null) => void;
  errors: RideAddressInfoErrors;
};

export function AddressStep(props: AddressStepProps) {
  const account = props.accountNumber.trim();
  return account ? <WithCompanyPlaces {...props} account={account} /> : <Addresses {...props} company={[]} />;
}

function WithCompanyPlaces({ account, ...props }: AddressStepProps & { account: string }) {
  const company = useCompanyPlaces(account);
  return <Addresses {...props} company={company.items} />;
}

function Addresses({
  loginId,
  value,
  onChange,
  onSelectPlace,
  errors,
  company,
}: AddressStepProps & { company: readonly AddressSuggestion[] }) {
  const saved = useSavedPlaces();
  const profile = useProfilePlaces(loginId);

  return (
    <RideAddressInfoSection
      value={value}
      onChange={onChange}
      onSelectPlace={onSelectPlace}
      savedOptions={[...saved.places, ...profile.items, ...company]}
      errors={errors}
    />
  );
}
