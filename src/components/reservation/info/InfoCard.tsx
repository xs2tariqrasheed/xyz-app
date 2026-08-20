import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { breakpoints, colors, radii, shadowValues, space } from '@/theme';

export type InfoCardProps = {
  title: string;
  /** Renders the Edit action in the card footer. Omit to hide it. */
  onEdit?: () => void;
  children: React.ReactNode;
};

/** A titled panel of read-only reservation details. */
export function InfoCard({ title, onEdit, children }: InfoCardProps) {
  return (
    <View style={styles.card}>
      <CardHeader title={title} />
      <View style={styles.body}>{children}</View>
      <EditFooter title={title} onEdit={onEdit} />
    </View>
  );
}

export type Pane = {
  title: string;
  content: React.ReactNode;
};

export type SplitInfoCardProps = {
  left: Pane;
  right: Pane;
  onEdit?: () => void;
};

/**
 * A panel that holds two titled halves — pickup beside destination.
 *
 * Wide screens get one header bar split in two over a pair of panes; a phone
 * gets the same two panes stacked, each under its own full-width bar, so a
 * heading is never stranded from the values it names.
 */
export function SplitInfoCard({ left, right, onEdit }: SplitInfoCardProps) {
  const { width } = useWindowDimensions();
  const sideBySide = width >= breakpoints.md;
  const label = `${left.title} and ${right.title}`;

  if (!sideBySide) {
    return (
      <View style={styles.card}>
        <CardHeader title={left.title} />
        <View style={styles.body}>{left.content}</View>
        <CardHeader title={right.title} />
        <View style={styles.body}>{right.content}</View>
        <EditFooter title={label} onEdit={onEdit} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, styles.headerHalf]}>{left.title}</Text>
        <View style={styles.headerRule} />
        <Text style={[styles.headerTitle, styles.headerHalf]}>{right.title}</Text>
      </View>

      <View style={styles.panes}>
        <View style={styles.pane}>{left.content}</View>
        <View style={styles.paneRule} />
        <View style={styles.pane}>{right.content}</View>
      </View>

      <EditFooter title={label} onEdit={onEdit} />
    </View>
  );
}

function CardHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function EditFooter({ title, onEdit }: { title: string; onEdit?: () => void }) {
  if (!onEdit) return null;

  return (
    <View style={styles.footer}>
      <Button label="Edit" size="sm" onPress={onEdit} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSelected,
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: radii.lg,
    // Keeps the header bar's square corners inside the card's rounded ones.
    overflow: 'hidden',
    boxShadow: shadowValues.sm,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.headerBg,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
  },
  headerTitle: { color: colors.headerFg, fontSize: 15, fontWeight: '700' },
  headerHalf: { flex: 1 },
  headerRule: { alignSelf: 'stretch', width: 1, backgroundColor: colors.primary[600] },

  body: { padding: space.lg },

  panes: { flexDirection: 'row', alignItems: 'stretch' },
  pane: { flex: 1, padding: space.lg },
  paneRule: { width: 1, backgroundColor: colors.primary[200] },

  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    paddingTop: space.xs,
  },
});
