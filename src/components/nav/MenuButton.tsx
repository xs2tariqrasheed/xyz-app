import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme';

export type MenuButtonProps = {
  onPress: () => void;
  /** Morphs the bars into a cross while the drawer is open. */
  open?: boolean;
};

/** Hamburger toggle. Three views — no icon package needed. */
export function MenuButton({ onPress, open }: MenuButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open ? 'Close menu' : 'Open menu'}
      accessibilityState={{ expanded: !!open }}
      aria-expanded={!!open}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <View style={[styles.bar, open ? styles.barTopOpen : null]} />
      <View style={[styles.bar, open ? styles.barMiddleOpen : null]} />
      <View style={[styles.bar, open ? styles.barBottomOpen : null]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.22)' },
  bar: { width: 18, height: 2, borderRadius: 1, backgroundColor: colors.headerFg },
  barTopOpen: { transform: [{ translateY: 6 }, { rotate: '45deg' }] },
  barMiddleOpen: { opacity: 0 },
  barBottomOpen: { transform: [{ translateY: -6 }, { rotate: '-45deg' }] },
});
