import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Alert } from '@/components/ui/Alert';
import { SelectField } from '@/components/ui/SelectField';
import { Sheet } from '@/components/ui/Sheet';
import { TextArea } from '@/components/ui/TextArea';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { FEEDBACK_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useFetchData } from '@/hooks/useFetchData';
import { usePostData } from '@/hooks/usePostData';
import {
  askQuestionJData,
  assertQuestionSent,
  FeedbackError,
  type PredefinedQuestion,
  QUESTION_MESSAGE_MAX,
  toPredefinedQuestions,
  validateQuestionMessage,
} from '@/services/feedback';
import { getErrorDisplay } from '@/services/gateway';
import { colors, space } from '@/theme';

export type RideQuestionSheetProps = {
  /** The ride asked about; the sheet is open while one is set. */
  reservationNumber: string | null;
  onClose: () => void;
  /** After the server accepted the question. */
  onSent: (message: string) => void;
};

/**
 * "Ask about this ride" (reverse-engineer-guide/21, 24): one of the
 * predefined questions (`RES.S.ALL_PREDEFINED_QUESTIONS`) plus an optional
 * note, sent with `RES.I.ASKED_QUESTIONS`.
 */
export function RideQuestionSheet({ reservationNumber, onClose, onSent }: RideQuestionSheetProps) {
  const { session } = useAuth();
  const ask = usePostData();
  const [questionId, setQuestionId] = useState('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const messageError = validateQuestionMessage(message);
  const questionError = touched && !questionId ? FEEDBACK_MESSAGES.QUESTION_REQUIRED : undefined;

  const close = () => {
    setQuestionId('');
    setMessage('');
    setTouched(false);
    setFailure(null);
    onClose();
  };

  const send = async () => {
    setTouched(true);
    if (!questionId || messageError || !reservationNumber || !session || ask.isLoading) return;
    setFailure(null);
    try {
      const response = await ask.mutateAsync(
        ACTION_CODES.ASK_QUESTION,
        GATEWAY_VIEW_NAME,
        askQuestionJData(session.loginId, reservationNumber, questionId, message),
        { retry: false },
      );
      assertQuestionSent(response);
      close();
      onSent(FEEDBACK_MESSAGES.SENT);
    } catch (error) {
      setFailure(error instanceof FeedbackError ? error.message : getErrorDisplay(error).customDescription);
    }
  };

  return (
    <Sheet
      visible={reservationNumber !== null}
      title={FEEDBACK_MESSAGES.SHEET_TITLE}
      subtitle={reservationNumber ?? undefined}
      onClose={close}
      onConfirm={() => void send()}
      confirmLabel={ask.isLoading ? FEEDBACK_MESSAGES.SENDING : FEEDBACK_MESSAGES.SEND}
      confirmDisabled={ask.isLoading}
    >
      <View style={styles.body}>
        {failure ? <Alert tone="danger" title={FEEDBACK_MESSAGES.FAILED_TITLE} message={failure} /> : null}
        {/* Mounted only while open: the questions load when the sheet does. */}
        {reservationNumber ? (
          <QuestionPicker value={questionId} onChange={setQuestionId} error={questionError} />
        ) : null}
        <TextArea
          label={FEEDBACK_MESSAGES.MESSAGE_LABEL}
          value={message}
          onChangeText={setMessage}
          placeholder={FEEDBACK_MESSAGES.MESSAGE_PLACEHOLDER}
          maxLength={QUESTION_MESSAGE_MAX}
          rows={3}
          error={touched && messageError ? messageError : undefined}
        />
      </View>
    </Sheet>
  );
}

function QuestionPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const { data, isLoading, isError } = useFetchData(ACTION_CODES.ALL_PREDEFINED_QUESTIONS, GATEWAY_VIEW_NAME, {});

  let questions: PredefinedQuestion[] = [];
  let refused = false;
  if (data) {
    try {
      questions = toPredefinedQuestions(data);
    } catch {
      refused = true;
    }
  }

  if (isLoading && !data) return <ActivityIndicator color={colors.primary[600]} />;
  if (questions.length === 0) {
    return (
      <Text style={styles.muted}>
        {isError || refused ? FEEDBACK_MESSAGES.QUESTIONS_FAILED : FEEDBACK_MESSAGES.QUESTIONS_EMPTY}
      </Text>
    );
  }

  return (
    <SelectField
      label={FEEDBACK_MESSAGES.QUESTION_LABEL}
      required
      value={value}
      options={questions.map((question) => ({ value: question.id, label: question.text }))}
      onChange={onChange}
      error={error}
    />
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
