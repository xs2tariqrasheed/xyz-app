import type { CarGlyphVariant } from "@/components/ui/CarGlyph";
import type { VehicleType } from "@/services/vehicleTypes";

/**
 * Artwork for a gateway car type. The list itself comes from
 * `RES.S.VEHICLE_TYPE`; only the picture is chosen here, by name.
 */
export function carGlyphFor(type: Pick<VehicleType, "code" | "label"> | undefined): CarGlyphVariant {
  const text = `${type?.code ?? ""} ${type?.label ?? ""}`;
  if (/suv|van|wheelchair/i.test(text)) return "suv";
  if (/limo|stretch/i.test(text)) return "limo";
  return "sedan";
}
