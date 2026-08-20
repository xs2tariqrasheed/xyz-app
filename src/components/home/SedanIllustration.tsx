import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme';

/** Scene width ÷ height. Keeps the car the same shape at any column width. */
const SCENE_RATIO = 1.6;

export type SedanIllustrationProps = {
  style?: StyleProp<ViewStyle>;
};

/**
 * Executive sedan, drawn from plain views.
 *
 * The project ships no image assets and no vector library, so the home page's
 * artwork follows the same approach as `Glyph` — geometry derived from the
 * measured width, which renders identically on web, iOS and Android and scales
 * with whatever column it lands in.
 */
export function SedanIllustration({ style }: SedanIllustrationProps) {
  const [width, setWidth] = useState(0);

  return (
    <View
      style={[styles.scene, style]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="image"
      accessibilityLabel="An XYZ executive sedan"
    >
      <View style={styles.ground} />
      {width > 0 ? <Sedan width={width} /> : null}
    </View>
  );
}

function Sedan({ width }: { width: number }) {
  const height = width / SCENE_RATIO;

  const wheel = width * 0.16;
  const bodyWidth = width * 0.86;
  const bodyHeight = width * 0.15;
  const bodyLeft = (width - bodyWidth) / 2;
  const roadY = height * 0.78;
  const bodyTop = roadY - wheel * 0.55 - bodyHeight;

  const cabinWidth = bodyWidth * 0.54;
  const cabinHeight = width * 0.115;
  const cabinLeft = bodyLeft + bodyWidth * 0.19;
  const cabinTop = bodyTop - cabinHeight + 1;

  const glassHeight = cabinHeight * 0.62;
  const glassTop = cabinTop + cabinHeight * 0.24;

  return (
    <>
      {/* Cabin, then glass sitting inside it. */}
      <View
        style={{
          position: 'absolute',
          left: cabinLeft,
          top: cabinTop,
          width: cabinWidth,
          height: cabinHeight + bodyHeight * 0.4,
          backgroundColor: colors.primary[800],
          borderTopLeftRadius: cabinHeight * 0.75,
          borderTopRightRadius: cabinHeight * 0.6,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cabinLeft + cabinWidth * 0.1,
          top: glassTop,
          width: cabinWidth * 0.36,
          height: glassHeight,
          backgroundColor: colors.primary[300],
          borderTopLeftRadius: glassHeight * 0.5,
          borderTopRightRadius: 3,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cabinLeft + cabinWidth * 0.52,
          top: glassTop,
          width: cabinWidth * 0.36,
          height: glassHeight,
          backgroundColor: colors.primary[300],
          borderTopLeftRadius: 3,
          borderTopRightRadius: glassHeight * 0.5,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
        }}
      />

      {/* Body. */}
      <View
        style={{
          position: 'absolute',
          left: bodyLeft,
          top: bodyTop,
          width: bodyWidth,
          height: bodyHeight,
          backgroundColor: colors.primary[700],
          borderTopLeftRadius: bodyHeight * 0.45,
          borderTopRightRadius: bodyHeight * 0.6,
          borderBottomLeftRadius: bodyHeight * 0.5,
          borderBottomRightRadius: bodyHeight * 0.5,
        }}
      />
      {/* Headlight and tail light. */}
      <View
        style={{
          position: 'absolute',
          left: bodyLeft + bodyWidth - width * 0.045,
          top: bodyTop + bodyHeight * 0.24,
          width: width * 0.035,
          height: bodyHeight * 0.3,
          backgroundColor: colors.accentSubtle,
          borderRadius: 3,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: bodyLeft + width * 0.012,
          top: bodyTop + bodyHeight * 0.26,
          width: width * 0.025,
          height: bodyHeight * 0.26,
          backgroundColor: colors.dangerBorder,
          borderRadius: 3,
        }}
      />

      {/* Wheels. */}
      <Wheel size={wheel} left={bodyLeft + bodyWidth * 0.13} top={roadY - wheel * 0.78} />
      <Wheel size={wheel} left={bodyLeft + bodyWidth * 0.7} top={roadY - wheel * 0.78} />
    </>
  );
}

function Wheel({ size, left, top }: { size: number; left: number; top: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary[900],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: size * 0.21,
          backgroundColor: colors.primary[200],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: '100%',
    aspectRatio: SCENE_RATIO,
    backgroundColor: colors.primary[50],
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '22%',
    backgroundColor: colors.primary[100],
  },
});
