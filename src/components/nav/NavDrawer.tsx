import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { XyzLogo } from '@/components/brand/XyzLogo';
import { ChevronGlyph } from '@/components/ui/Glyph';
import { useAuth } from '@/context/AuthContext';
import { colors, radii, space } from '@/theme';

import { isNavItemActive, NAV_ITEMS } from './navItems';

const useNative = Platform.OS !== 'web';
const MAX_WIDTH = 320;

export type NavDrawerProps = {
  visible: boolean;
  onClose: () => void;
  /** Current pathname, so the open drawer marks the page you are on. */
  pathname: string;
};

/**
 * Side drawer for phones and tablets.
 *
 * Stays mounted through the closing animation — unmounting on `visible=false`
 * would snap the panel away instead of sliding it out.
 */
export function NavDrawer({ visible, onClose, pathname }: NavDrawerProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status, signOut } = useAuth();

  const [progress] = useState(() => new Animated.Value(0));
  const [closing, setClosing] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);

  // Adjusting state during render on a prop change, rather than in an effect:
  // the panel has to outlive `visible` long enough to slide back out.
  if (wasVisible !== visible) {
    setWasVisible(visible);
    setClosing(!visible);
  }

  const mounted = visible || closing;

  useEffect(() => {
    if (!mounted) return;
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 240 : 180,
      useNativeDriver: useNative,
    }).start(({ finished }) => {
      if (finished && !visible) setClosing(false);
    });
  }, [visible, mounted, progress]);

  if (!mounted) return null;

  const panelWidth = Math.min(MAX_WIDTH, width * 0.84);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              width: panelWidth,
              paddingTop: insets.top + space.lg,
              paddingBottom: insets.bottom + space.lg,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-panelWidth, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <XyzLogo size={72} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed ? styles.closePressed : null]}
            >
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.eyebrow}>Menu</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.items}>
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(item, pathname);

              return (
                <Pressable
                  key={item.match}
                  accessibilityRole="link"
                  accessibilityState={{ selected: active }}
                  aria-current={active ? 'page' : undefined}
                  onPress={() => {
                    onClose();
                    router.navigate(item.href);
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    active ? styles.itemActive : null,
                    pressed && !active ? styles.itemPressed : null,
                  ]}
                >
                  <View style={[styles.itemBar, active ? styles.itemBarActive : null]} />
                  <Text style={[styles.itemLabel, active ? styles.itemLabelActive : null]}>
                    {item.label}
                  </Text>
                  <ChevronGlyph
                    direction="right"
                    color={active ? colors.navActive : colors.headerFgMuted}
                    size={7}
                  />
                </Pressable>
              );
            })}

            {status === 'signedIn' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  void signOut();
                }}
                style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
              >
                <View style={styles.itemBar} />
                <Text style={styles.itemLabel}>Log out</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <Text style={styles.footnote}>XYZ Two Way Radio · Book in a few taps</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay },

  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.headerBg,
    paddingHorizontal: space.lg,
    borderTopRightRadius: radii.xl + 6,
    borderBottomRightRadius: radii.xl + 6,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  close: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: { backgroundColor: 'rgba(255,255,255,0.24)' },
  closeGlyph: { color: colors.headerFg, fontSize: 13, fontWeight: '700', lineHeight: 16 },

  eyebrow: {
    color: colors.headerFgMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginTop: space.xl,
    marginBottom: space.sm,
  },

  items: { gap: 2, paddingBottom: space.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radii.md,
    paddingRight: space.md,
    paddingVertical: space.md + 2,
  },
  itemActive: { backgroundColor: 'rgba(255,255,255,0.10)' },
  itemPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  itemBar: { width: 3, height: 20, borderRadius: 2, backgroundColor: 'transparent' },
  itemBarActive: { backgroundColor: colors.navActive },
  itemLabel: { flex: 1, color: colors.headerFg, fontSize: 15, fontWeight: '600' },
  itemLabelActive: { color: colors.navActive },

  footnote: {
    color: colors.headerFgMuted,
    fontSize: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    paddingTop: space.md,
  },
});
