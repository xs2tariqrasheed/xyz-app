import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '@/components/reservation/info/InfoCard';
import { Button } from '@/components/ui/Button';
import { RESERVATION_INFO_MESSAGES } from '@/constants/messages';
import type { CommunicationLogState } from '@/hooks/useCommunicationLog';
import { colors, radii, space } from '@/theme';
import { formatClockTime, formatSlashDate } from '@/utils/datetime';

/** The ride's messages (`RES.S.COMMUNICATION_LOG`), on Details and Track your route. */
export function MessagesCard({ log }: { log: CommunicationLogState }) {
  return (
    <InfoCard title={RESERVATION_INFO_MESSAGES.MESSAGES_TITLE}>
      {log.isLoading ? (
        <ActivityIndicator color={colors.primary[600]} />
      ) : log.failed ? (
        <View style={styles.failed}>
          <Text style={styles.error}>{RESERVATION_INFO_MESSAGES.MESSAGES_FAILED}</Text>
          <Button label={RESERVATION_INFO_MESSAGES.RETRY} variant="outline" onPress={log.refetch} style={styles.retry} />
        </View>
      ) : log.entries.length === 0 ? (
        <Text style={styles.muted}>{RESERVATION_INFO_MESSAGES.MESSAGES_EMPTY}</Text>
      ) : (
        <View style={styles.messages}>
          {log.entries.map((entry) => (
            <View key={entry.id} style={styles.message}>
              <Text style={styles.messageMeta}>
                {[entry.at ? `${formatSlashDate(entry.at)} ${formatClockTime(entry.at)}` : '', entry.channel]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.body}>{entry.text}</Text>
            </View>
          ))}
        </View>
      )}
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.textBody, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 13 },
  failed: { gap: space.sm },
  retry: { alignSelf: 'flex-start' },
  messages: { gap: space.md },
  message: {
    gap: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[200],
    paddingLeft: space.md,
    borderRadius: radii.sm,
  },
  messageMeta: { color: colors.textMuted, fontSize: 12 },
});
