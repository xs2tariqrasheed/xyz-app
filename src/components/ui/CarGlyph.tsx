import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

/** The vehicle silhouettes the Preferences step offers. */
export type CarGlyphVariant = 'sedan' | 'suv' | 'van' | 'limo';

export type CarGlyphProps = {
  variant: CarGlyphVariant;
  color?: string;
  /** Width in px; the glyph is 0.62 as tall. */
  size?: number;
};

/** Each icon is drawn in a 100 × 62 box. */
const VIEW_BOX = '0 0 100 62';
const STROKE = 6;

function Wheel({ cx, cy, r, color, filled }: { cx: number; cy: number; r: number; color: string; filled: boolean }) {
  return filled ? (
    <Circle cx={cx} cy={cy} r={r} fill={color} />
  ) : (
    <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={STROKE} />
  );
}

/**
 * Side-profile vehicle icons. Van and SUV are outlined, sedan and limo are
 * filled silhouettes — matching the reference artwork for the car-type tiles.
 */
export function CarGlyph({ variant, color = colors.primary[600], size = 40 }: CarGlyphProps) {
  const w = size;
  const h = size * 0.62;

  return (
    <Svg width={w} height={h} viewBox={VIEW_BOX}>
      {variant === 'van' && (
        <>
          {/* Cargo box */}
          <Rect x={4} y={4} width={56} height={40} rx={5} fill="none" stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
          {/* Cab */}
          <Path
            d="M60 14 H78 Q83 14 85.5 18 L94 31 Q96 34 96 38 V42 Q96 44 94 44 H60 Z"
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          {/* Cab window */}
          <Path d="M67 20 H78 L85 30 H67 Z" fill="none" stroke={color} strokeWidth={4.5} strokeLinejoin="round" />
          <Wheel cx={22} cy={50} r={8} color={color} filled={false} />
          <Wheel cx={76} cy={50} r={8} color={color} filled={false} />
        </>
      )}

      {variant === 'limo' && (
        <>
          <Path
            d="M3 36 Q3 30 8 29 L22 28 L36 18 Q38 16.5 41 16.5 H72 Q75 16.5 77 18 L88 27 L94 29 Q97 30 97 34 V40 Q97 43 94 43 H6 Q3 43 3 40 Z"
            fill={color}
          />
          {/* Windows carved out of the silhouette */}
          <Path d="M27 27 L39 19.5 H48 V27 Z M52 19.5 H63 V27 H52 Z M67 19.5 H73 L82 27 H67 Z" fill={colors.surface} />
          <Circle cx={17} cy={44} r={8} fill={colors.surface} />
          <Circle cx={83} cy={44} r={8} fill={colors.surface} />
          <Wheel cx={17} cy={44} r={6.5} color={color} filled={false} />
          <Wheel cx={83} cy={44} r={6.5} color={color} filled={false} />
        </>
      )}

      {variant === 'suv' && (
        <>
          <Path
            d="M14 8 H60 Q64 8 66.5 11 L78 24 L92 27 Q96 28 96 32 V42 Q96 45 93 45 H7 Q4 45 4 42 V18 Q4 8 14 8 Z"
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          {/* Side window line */}
          <Path d="M16 24 H52" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
          <Circle cx={24} cy={48} r={9} fill={colors.surface} stroke={color} strokeWidth={STROKE} />
          <Circle cx={74} cy={48} r={9} fill={colors.surface} stroke={color} strokeWidth={STROKE} />
        </>
      )}

      {variant === 'sedan' && (
        <>
          <Path
            d="M3 36 Q3 29 9 28 L24 26 L40 14 Q43 12 47 12 H63 Q67 12 70 14 L84 25 L93 28 Q97 29.5 97 34 V41 Q97 44 94 44 H6 Q3 44 3 41 Z"
            fill={color}
          />
          {/* Windows */}
          <Path d="M30 26 L42 16.5 H53 V26 Z M57 16.5 H64 L77 26 H57 Z" fill={colors.surface} />
          <Circle cx={19} cy={44} r={10.5} fill={colors.surface} />
          <Circle cx={81} cy={44} r={10.5} fill={colors.surface} />
          <Wheel cx={19} cy={44} r={7.5} color={color} filled />
          <Wheel cx={81} cy={44} r={7.5} color={color} filled />
        </>
      )}
    </Svg>
  );
}
