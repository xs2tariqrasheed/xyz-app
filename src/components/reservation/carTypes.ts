import type { CarGlyphVariant } from '@/components/ui/CarGlyph';

/** The vehicle ids are the glyph variants — one list, no mapping table. */
export type CarTypeId = CarGlyphVariant;

export type CarType = {
  id: CarTypeId;
  label: string;
  /** Second line on the tile. */
  caption: string;
  /** Seats sold, so the passenger count can flag an impossible pairing. */
  seats: number;
};

export const CAR_TYPES: readonly CarType[] = [
  { id: 'sedan', label: 'Sedan', caption: 'Up to 3 riders · 2 bags', seats: 3 },
  { id: 'suv', label: 'SUV', caption: 'Up to 6 riders · 4 bags', seats: 6 },
  { id: 'van', label: 'Van', caption: 'Up to 10 riders · 8 bags', seats: 10 },
  { id: 'limo', label: 'Stretch limo', caption: 'Up to 8 riders · 4 bags', seats: 8 },
];

export const DEFAULT_CAR_TYPE: CarTypeId = 'sedan';

export function findCarType(id: CarTypeId): CarType {
  // The id is constrained to the list, so the fallback is only for exhaustiveness.
  return CAR_TYPES.find((type) => type.id === id) ?? CAR_TYPES[0];
}
