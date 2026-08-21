import { useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { breakpoints, colors, radii, shadowValues, space } from '@/theme';

import { Button, type ButtonVariant } from './Button';

const useNative = Platform.OS !== 'web';

export type SheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  /** `danger` for a destructive confirm, e.g. deleting a saved address. */
  confirmVariant?: ButtonVariant;
  /** Blocks the confirm button while the sheet's own input is incomplete. */
  confirmDisabled?: boolean;
  /** Label of the dismiss button. Rename it when "Cancel" would be ambiguous. */
  dismissLabel?: string;
  /** Shown on the left of the footer, e.g. "Today". */
  footerHint?: string;
  children: React.ReactNode;
};

/**
 * Picker container. Mobile first: a bottom sheet on phones, promoted to a
 * centred dialog once there is room for one. Same component either way.
 */
export function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  confirmDisabled,
  dismissLabel = 'Cancel',
  footerHint,
  children,
}: SheetProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDialog = width >= breakpoints.md;

  // Rendered conditionally so the panel animation replays on every open.
  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={[styles.root, isDialog ? styles.rootDialog : styles.rootSheet]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close picker"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Panel isDialog={isDialog}>
          <View
            style={[
              styles.panel,
              isDialog ? styles.panelDialog : styles.panelSheet,
              !isDialog ? { paddingBottom: insets.bottom + space.md } : null,
            ]}
          >
            {isDialog ? null : <View style={styles.grabber} />}

            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={({ pressed }) => [styles.close, pressed ? styles.closePressed : null]}
              >
                <Text style={styles.closeGlyph}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.body}>{children}</View>

            <View style={styles.footer}>
              <Text style={styles.footerHint} numberOfLines={1}>
                {footerHint ?? ''}
              </Text>
              <View style={styles.footerActions}>
                <Button label={dismissLabel} variant="ghost" onPress={onClose} />
                <Button
                  label={confirmLabel}
                  variant={confirmVariant}
                  disabled={confirmDisabled}
                  onPress={onConfirm}
                />
              </View>
            </View>
          </View>
        </Panel>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Slides up on a phone, scales in as a dialog. */
function Panel({ isDialog, children }: { isDialog: boolean; children: React.ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: useNative,
      damping: 22,
      stiffness: 240,
      mass: 0.9,
    }).start();
  }, [progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [isDialog ? 12 : 44, 0],
  });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [isDialog ? 0.97 : 1, 1] });

  return (
    <Animated.View
      style={[
        isDialog ? styles.panelWrapDialog : styles.panelWrapSheet,
        { opacity: progress, transform: [{ translateY }, { scale }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.overlay },
  rootSheet: { justifyContent: 'flex-end' },
  rootDialog: { alignItems: 'center', justifyContent: 'center', padding: space.xl },

  panelWrapSheet: { width: '100%' },
  panelWrapDialog: { width: '100%', maxWidth: 440 },

  panel: { backgroundColor: colors.surface, boxShadow: shadowValues.md },
  panelSheet: {
    borderTopLeftRadius: radii.xl + 6,
    borderTopRightRadius: radii.xl + 6,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  panelDialog: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.xl - 4,
    paddingTop: space.lg,
    paddingBottom: space.lg,
  },

  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: space.md,
  },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headerText: { flex: 1 },
  title: { color: colors.textTitle, fontSize: 17, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  close: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: { opacity: 0.7 },
  closeGlyph: { color: colors.textBody, fontSize: 13, fontWeight: '700', lineHeight: 16 },

  body: { marginTop: space.lg },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerHint: { flex: 1, color: colors.textMuted, fontSize: 13 },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
