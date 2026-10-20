import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SUPPORT_PHONE } from '@/components/reservation/RideReceiptSection';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { RIDE_DOCUMENT_MESSAGES } from '@/constants/messages';
import { isTotalCharge, type RideDocument } from '@/services/rideDocument';
import { colors, radii, space } from '@/theme';
import { printRideDocument } from '@/utils/printRideDocument';

export type RideDocumentViewProps = {
  doc: RideDocument;
  /** "Print voucher" / "Print receipt". */
  printLabel: string;
};

/** A voucher or receipt on screen, with the button that prints the same paper. */
export function RideDocumentView({ doc, printLabel }: RideDocumentViewProps) {
  const [printing, setPrinting] = useState(false);
  const [failed, setFailed] = useState(false);

  const print = async () => {
    setFailed(false);
    setPrinting(true);
    try {
      await printRideDocument(doc);
    } catch {
      setFailed(true);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      <View style={styles.document}>
        <View style={styles.header}>
          <Text style={styles.brand}>{RIDE_DOCUMENT_MESSAGES.BRAND}</Text>
          <Text style={styles.headerMeta}>{SUPPORT_PHONE}</Text>
          <Text style={styles.number}>{`${doc.title} ${doc.number}`}</Text>
        </View>

        <View style={styles.columns}>
          <View style={styles.fields}>
            {doc.fields.map((field) => (
              <Row key={field.label} label={field.label} value={field.value} />
            ))}
          </View>

          {doc.charges.length > 0 ? (
            <View style={styles.charges}>
              {doc.charges.map((charge) => (
                <Row key={charge.label} label={charge.label} value={charge.amount} total={isTotalCharge(charge)} />
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {failed ? <Alert tone="danger" message={RIDE_DOCUMENT_MESSAGES.PRINT_FAILED} /> : null}
      <Button label={printLabel} onPress={() => void print()} disabled={printing} style={styles.print} />
    </>
  );
}

function Row({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <View style={[styles.row, total ? styles.totalRow : null]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, total ? styles.totalValue : null]}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  document: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    padding: space.lg,
    gap: space.lg,
  },
  header: { gap: 2, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: space.md },
  brand: { color: colors.textTitle, fontSize: 17, fontWeight: '800' },
  headerMeta: { color: colors.textMuted, fontSize: 13 },
  number: { color: colors.primary[600], fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },
  columns: { gap: space.lg, flexDirection: 'row', flexWrap: 'wrap' },
  fields: { flexGrow: 2, flexBasis: 280, gap: space.sm },
  charges: {
    flexGrow: 1,
    flexBasis: 200,
    gap: space.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: space.md,
  },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'baseline' },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
  label: { color: colors.textMuted, fontSize: 13, width: 130 },
  value: { flex: 1, color: colors.textStrong, fontSize: 14, fontWeight: '600' },
  totalValue: { fontWeight: '800' },
  print: { alignSelf: 'flex-start' },
});
