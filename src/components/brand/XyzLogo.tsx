import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { brand } from '@/theme';

/** Below this the "TWO WAY RADIO" strip is illegible, so the mark drops it. */
const LOCKUP_MIN_SIZE = 64;

export type XyzLogoProps = {
  /** Edge length of the square badge, in points. */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * The XYZ Two Way Radio badge.
 *
 * Drawn from views rather than a bitmap so it stays crisp at every density on
 * web, iOS and Android, and so it scales with the header instead of shipping
 * three raster sizes. Every measurement is a ratio of `size`.
 */
export function XyzLogo({ size = 44, style }: XyzLogoProps) {
  const showLockup = size >= LOCKUP_MIN_SIZE;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="XYZ Two Way Radio"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.17,
          backgroundColor: brand.logoBg,
          padding: size * 0.06,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.frame,
          {
            borderWidth: Math.max(1.5, size * 0.05),
            borderRadius: size * 0.07,
          },
        ]}
      >
        <Text
          style={{
            color: brand.logoInk,
            fontSize: size * 0.33,
            lineHeight: size * 0.4,
            fontWeight: '900',
            letterSpacing: size * 0.008,
          }}
        >
          XYZ
        </Text>
      </View>

      {showLockup ? (
        <View style={[styles.lockup, { bottom: size * 0.035 }]}>
          <View style={[styles.lockupInner, { paddingHorizontal: size * 0.03, gap: size * 0.025 }]}>
            <Tick size={size} />
            <Text
              // Never let the strapline wrap — it has to read as one rule of type.
              numberOfLines={1}
              style={{
                color: brand.logoInk,
                fontSize: size * 0.065,
                lineHeight: size * 0.085,
                fontWeight: '700',
                letterSpacing: size * 0.004,
              }}
            >
              TWO WAY RADIO
            </Text>
            <Tick size={size} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The small marks flanking the strapline. */
function Tick({ size }: { size: number }) {
  return (
    <View
      style={{
        width: size * 0.03,
        height: size * 0.03,
        borderRadius: size * 0.02,
        backgroundColor: brand.logoInk,
      }}
    />
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderColor: brand.logoInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockup: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  lockupInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.logoBg,
  },
});
