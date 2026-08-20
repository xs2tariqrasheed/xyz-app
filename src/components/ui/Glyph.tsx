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

/** Static tick — marks the chosen row in a select sheet. */
export function TickGlyph({ color = colors.primary[600], size = 12 }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.85,
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }, { translateY: -size * 0.08 }],
        }}
      />
    </View>
  );
}

/** Payment card: a rounded rectangle with a magnetic stripe. */
export function CardGlyph({ color = colors.primary[600], size = 18 }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center' }}>
      <View
        style={{
          height: size * 0.72,
          borderWidth: 1.6,
          borderColor: color,
          borderRadius: 3,
          justifyContent: 'flex-start',
          overflow: 'hidden',
        }}
      >
        <View style={{ height: size * 0.18, marginTop: size * 0.1, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** Magnifier — the search action and the empty-results state. */
export function SearchGlyph({ color = colors.primary[600], size = 18 }: GlyphProps) {
  const ring = size * 0.66;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: 1.8,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.08,
          bottom: size * 0.08,
          width: 1.8,
          height: size * 0.34,
          borderRadius: 1,
          backgroundColor: color,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

/** Office block — marks anything billed to the company rather than a person. */
export function BuildingGlyph({ color = colors.primary[600], size = 18 }: GlyphProps) {
  const pane = { width: size * 0.15, height: size * 0.15, borderRadius: 1, backgroundColor: color } as const;
  const row = { flexDirection: 'row', justifyContent: 'space-between' } as const;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.76,
          height: size * 0.84,
          borderWidth: 1.6,
          borderColor: color,
          borderRadius: 2,
          paddingHorizontal: size * 0.12,
          paddingTop: size * 0.12,
          gap: size * 0.11,
        }}
      >
        <View style={row}>
          <View style={pane} />
          <View style={pane} />
        </View>
        <View style={row}>
          <View style={pane} />
          <View style={pane} />
        </View>
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

/** Eye outline — the password reveal toggle. `off` draws the slash through it. */
export function EyeGlyph({ color = colors.textMuted, size = 18, off = false }: GlyphProps & { off?: boolean }) {
  const lens = size * 0.64;
  const pupil = size * 0.3;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: lens,
          borderRadius: lens / 2,
          borderWidth: 1.6,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: pupil, height: pupil, borderRadius: pupil / 2, backgroundColor: color }} />
      </View>

      {off ? (
        <View
          style={{
            position: 'absolute',
            width: size * 1.15,
            height: 1.6,
            backgroundColor: color,
            borderRadius: 1,
            transform: [{ rotate: '-45deg' }],
          }}
        />
      ) : null}
    </View>
  );
}

/** Tick from two positioned bars — the password rules checklist. */
export function CheckGlyph({ color = colors.success, size = 14 }: GlyphProps) {
  const stroke = 1.8;
  const bar = { position: 'absolute', height: stroke, backgroundColor: color, borderRadius: 1 } as const;

  return (
    <View style={{ width: size, height: size }}>
      {/* Short down-stroke, then the long up-stroke — a tick from two bars. */}
      <View
        style={[bar, { width: size * 0.37, left: size * 0.1, top: size * 0.675 - stroke / 2, transform: [{ rotate: '42deg' }] }]}
      />
      <View
        style={[bar, { width: size * 0.7, left: size * 0.285, top: size * 0.525 - stroke / 2, transform: [{ rotate: '-52deg' }] }]}
      />
    </View>
  );
}

/** Handset outline — marks a phone, mobile, work or fax contact. */
export function PhoneGlyph({ color = colors.primary[600], size = 16 }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.62,
          height: size,
          borderWidth: 1.6,
          borderColor: color,
          borderRadius: size * 0.18,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: size * 0.08,
        }}
      >
        <View
          style={{
            width: size * 0.2,
            height: 1.6,
            borderRadius: 1,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

/** Envelope — marks an email contact. */
export function MailGlyph({ color = colors.primary[600], size = 16 }: GlyphProps) {
  return (
    <View
      style={{
        width: size,
        height: size * 0.76,
        borderWidth: 1.6,
        borderColor: color,
        borderRadius: size * 0.12,
        overflow: 'hidden',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.52,
          height: size * 0.52,
          borderRightWidth: 1.6,
          borderBottomWidth: 1.6,
          borderColor: color,
          transform: [{ rotate: '45deg' }, { translateY: -size * 0.24 }],
        }}
      />
    </View>
  );
}
