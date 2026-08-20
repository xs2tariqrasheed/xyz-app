import { useEffect, useState } from 'react';
import { Animated, Platform, type StyleProp, type ViewStyle } from 'react-native';

const useNative = Platform.OS !== 'web';

export type RevealProps = {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Fades and lifts its children in on mount. Give it a `key` that changes with
 * the branch you are swapping so the entrance replays.
 */
export function Reveal({ style, children }: RevealProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: useNative,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
