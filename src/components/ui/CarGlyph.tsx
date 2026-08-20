import { View } from 'react-native';

import { colors } from '@/theme';

/** The vehicle silhouettes the Preferences step offers. */
export type CarGlyphVariant = 'sedan' | 'suv' | 'van' | 'limo';

type Box = {
  /** All values are fractions: horizontal of the width, vertical of the height. */
  left: number;
  right: number;
  top: number;
  height: number;
  radius: number;
};

type Geometry = {
  cabin: Box;
  body: Omit<Box, 'left' | 'right'>;
  /** Diameter as a fraction of the height; `x` is the centre across the width. */
  wheel: number;
  wheelsAt: readonly number[];
};

/**
 * Side profiles, tuned so the four read apart at 36px: the cabin's width and
 * height carry the difference, the body only grounds it.
 */
const GEOMETRY: Record<CarGlyphVariant, Geometry> = {
  sedan: {
    cabin: { left: 0.28, right: 0.28, top: 0.08, height: 0.4, radius: 0.13 },
    body: { top: 0.42, height: 0.32, radius: 0.14 },
    wheel: 0.32,
    wheelsAt: [0.25, 0.75],
  },
  suv: {
    cabin: { left: 0.22, right: 0.27, top: 0.04, height: 0.46, radius: 0.1 },
    body: { top: 0.42, height: 0.33, radius: 0.12 },
    wheel: 0.32,
    wheelsAt: [0.25, 0.77],
  },
  // Nearly full-width and nearly full-height: a box on wheels, not a bonnet.
  van: {
    cabin: { left: 0.02, right: 0.14, top: 0.0, height: 0.58, radius: 0.14 },
    body: { top: 0.5, height: 0.26, radius: 0.09 },
    wheel: 0.3,
    wheelsAt: [0.22, 0.82],
  },
  limo: {
    cabin: { left: 0.36, right: 0.28, top: 0.14, height: 0.32, radius: 0.08 },
    body: { top: 0.4, height: 0.34, radius: 0.09 },
    wheel: 0.28,
    wheelsAt: [0.15, 0.87],
  },
};

export type CarGlyphProps = {
  variant: CarGlyphVariant;
  color?: string;
  /** Width in px; the glyph is 0.62 as tall. */
  size?: number;
};

/**
 * Filled vehicle icon built from plain views, so it renders identically on
 * web, iOS and Android without pulling in an icon package.
 */
export function CarGlyph({ variant, color = colors.primary[600], size = 40 }: CarGlyphProps) {
  const w = size;
  const h = size * 0.62;
  const { cabin, body, wheel, wheelsAt } = GEOMETRY[variant];
  const diameter = wheel * h;

  return (
    <View style={{ width: w, height: h }}>
      <View
        style={{
          position: 'absolute',
          left: cabin.left * w,
          right: cabin.right * w,
          top: cabin.top * h,
          height: cabin.height * h,
          backgroundColor: color,
          borderTopLeftRadius: cabin.radius * w,
          borderTopRightRadius: cabin.radius * w,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: body.top * h,
          height: body.height * h,
          backgroundColor: color,
          borderRadius: body.radius * w,
        }}
      />
      {wheelsAt.map((x) => (
        <View
          key={x}
          style={{
            position: 'absolute',
            left: x * w - diameter / 2,
            top: h - diameter,
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}
