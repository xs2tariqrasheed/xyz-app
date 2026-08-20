import { View } from 'react-native';

import { colors } from '@/theme';

export type GlyphProps = {
  color?: string;
  size?: number;
};

/**
 * Small line icons drawn from plain views.
 *
 * The project ships no icon package (`expo-symbols` is SF Symbols, iOS only),
 * and these render pixel-identically on web, iOS and Android.
 */

export function CalendarGlyph({ color = colors.primary[600], size = 18 }: GlyphProps) {
  const nub = { width: 1.6, height: 4, backgroundColor: color, borderRadius: 1 } as const;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          top: 2,
          left: 0,
          right: 0,
          bottom: 0,
          borderWidth: 1.6,
          borderColor: color,
          borderRadius: 4,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 2,
          left: 0,
          right: 0,
          height: 4.5,
          backgroundColor: color,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        }}
      />
      <View style={[nub, { position: 'absolute', top: 0, left: size * 0.22 }]} />
      <View style={[nub, { position: 'absolute', top: 0, right: size * 0.22 }]} />
    </View>
  );
}

export function ClockGlyph({ color = colors.primary[600], size = 18 }: GlyphProps) {
  const centre = size / 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.6,
        borderColor: color,
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: 1.6,
          height: size * 0.3,
          left: centre - 2.4,
          top: centre - size * 0.3 - 1.6,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: 'absolute',
          height: 1.6,
          width: size * 0.24,
          left: centre - 2.4,
          top: centre - 3.2,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
    </View>
  );
}

export type ChevronDirection = 'up' | 'down' | 'left' | 'right';

const CHEVRON_ROTATION: Record<ChevronDirection, string> = {
  up: '-135deg',
  down: '45deg',
  left: '135deg',
  right: '-45deg',
};

export function ChevronGlyph({
  direction = 'down',
  color = colors.textMuted,
  size = 8,
}: GlyphProps & { direction?: ChevronDirection }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRightWidth: 1.8,
        borderBottomWidth: 1.8,
        borderColor: color,
        transform: [{ rotate: CHEVRON_ROTATION[direction] }],
      }}
    />
  );
}

/** Filled dot — the "live" pulse and the calendar's today marker. */
export function Dot({ color = colors.accent, size = 6 }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
  );
}

/** Teardrop map pin, drawn as a rotated square with three rounded corners. */
export function PinGlyph({ color = colors.primary[600], size = 16 }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.78,
          height: size * 0.78,
          borderWidth: 1.8,
          borderColor: color,
          borderTopLeftRadius: size * 0.4,
          borderTopRightRadius: size * 0.4,
          borderBottomLeftRadius: size * 0.4,
          borderBottomRightRadius: 0,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

/** Two opposed arrows — swaps pickup and destination. */
export function SwapGlyph({ color = colors.textStrong, size = 16 }: GlyphProps) {
  const stem = { width: 1.6, height: size * 0.46, backgroundColor: color, borderRadius: 1 } as const;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.22 }}>
      <View style={{ alignItems: 'center' }}>
        <ChevronGlyph direction="up" color={color} size={size * 0.3} />
        <View style={stem} />
      </View>
      <View style={{ alignItems: 'center' }}>
        <View style={stem} />
        <ChevronGlyph direction="down" color={color} size={size * 0.3} />
      </View>
    </View>
  );
}

/** Shield outline — marks the human-verification control. */
export function ShieldGlyph({ color = colors.primary[600], size = 18 }: GlyphProps) {
  return (
    <View
      style={{
        width: size * 0.82,
        height: size,
        borderWidth: 1.8,
        borderColor: color,
        borderTopLeftRadius: size * 0.16,
        borderTopRightRadius: size * 0.16,
        borderBottomLeftRadius: size * 0.44,
        borderBottomRightRadius: size * 0.44,
      }}
    />
  );
}
