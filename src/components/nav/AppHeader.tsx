import { Link, usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { XyzLogo } from '@/components/brand/XyzLogo';
import { breakpoints, colors, contentMaxWidth, radii, space } from '@/theme';

import { MenuButton } from './MenuButton';
import { NavDrawer } from './NavDrawer';
import { isNavItemActive, NAV_ITEMS } from './navItems';

export type AppHeaderProps = {
  /** Page heading rendered under the brand row. */
  title?: string;
  subtitle?: string;
  /** Sits at the end of the title row, e.g. the live-call badge. */
  trailing?: React.ReactNode;
};

/**
 * App chrome: brand mark plus primary navigation.
 *
 * Mobile first — the six links live in a drawer behind a hamburger, and only
 * unfold into an inline row once the header is wide enough to hold them.
 */
export function AppHeader({ title, subtitle, trailing }: AppHeaderProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const inlineNav = width >= breakpoints.nav;
  // Derived, not synced: a rotate to landscape (or a desktop resize) closes the
  // drawer on its own rather than stranding it behind an inline nav.
  const drawerOpen = menuOpen && !inlineNav;

  return (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      <View style={styles.inner}>
        <View style={styles.brandRow}>
          <Link href="/" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="XYZ Two Way Radio — home">
              {({ pressed }) => (
                <View style={[styles.brand, pressed ? styles.brandPressed : null]}>
                  <XyzLogo size={44} />
                  <View>
                    <Text style={styles.wordmark}>XYZ</Text>
                    <Text style={styles.wordmarkSub}>TWO WAY RADIO</Text>
                  </View>
                </View>
              )}
            </Pressable>
          </Link>

          {inlineNav ? (
            <View style={styles.nav}>
              {NAV_ITEMS.map((item) => {
                const active = isNavItemActive(item, pathname);

                return (
                  <Link key={item.match} href={item.href} asChild>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityState={{ selected: active }}
                      aria-current={active ? 'page' : undefined}
                    >
                      {({ pressed }) => (
                        <View style={[styles.navItem, pressed ? styles.navItemPressed : null]}>
                          <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>
                            {item.label}
                          </Text>
                          <View style={[styles.navRule, active ? styles.navRuleActive : null]} />
                        </View>
                      )}
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          ) : (
            <MenuButton open={drawerOpen} onPress={() => setMenuOpen((open) => !open)} />
          )}
        </View>

        {title ? (
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {trailing}
          </View>
        ) : null}
      </View>

      <NavDrawer visible={drawerOpen} onClose={() => setMenuOpen(false)} pathname={pathname} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomLeftRadius: radii.xl + 6,
    borderBottomRightRadius: radii.xl + 6,
  },
  inner: { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  brandPressed: { opacity: 0.8 },
  wordmark: { color: colors.headerFg, fontSize: 17, fontWeight: '800', letterSpacing: 1.4 },
  wordmarkSub: {
    color: colors.headerFgMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 1,
  },

  nav: { flexDirection: 'row', alignItems: 'center', gap: space.xl - 4 },
  navItem: { alignItems: 'center', gap: 5, paddingVertical: space.sm },
  navItemPressed: { opacity: 0.75 },
  navLabel: { color: colors.headerFgMuted, fontSize: 14, fontWeight: '600' },
  navLabelActive: { color: colors.navActive },
  navRule: { height: 2, width: '100%', borderRadius: 1, backgroundColor: 'transparent' },
  navRuleActive: { backgroundColor: colors.navActive },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.lg,
  },
  titleText: { flex: 1 },
  title: { color: colors.headerFg, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.headerFgMuted, fontSize: 13, lineHeight: 18, marginTop: 3 },
});
