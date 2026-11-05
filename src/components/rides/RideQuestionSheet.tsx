import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Alert } from '@/components/ui/Alert';
import { SelectField } from '@/components/ui/SelectField';
import { Sheet } from '@/components/ui/Sheet';
import { TextArea } from '@/components/ui/TextArea';
import { ACTION_CODES, GATEWAY_VIEW_NAME } from '@/constants/actionCodes';
import { FIELD_LIMITS } from '@/constants/fieldLimits';
import { FEEDBACK_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/context/AuthContext';
import { useFetchData } from '@/hooks/useFetchData';
import { usePostData } from '@/hooks/usePostData';
import {
  askQuestionJData,
  assertQuestionSent,
  FeedbackError,
  type PredefinedQuestion,
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
 * "Ask about this ride" (reverse-engineer-implemented/guide/21): one of the
 * predefined questions (`RES.S.ALL_PREDEFINED_QUESTIONS`) plus an optional
 * note, sent with `RES.I.ASKED_QUESTIONS`.
 */
export function RideQuestionSheet({ reservationNumber, onClose, onSent }: RideQuestionSheetProps) {
  // Mounted only while open: the questions load, and the form starts empty, on every open.
  if (reservationNumber === null) return null;
  return <QuestionForm reservationNumber={reservationNumber} onClose={onClose} onSent={onSent} />;
}

function QuestionForm({
  reservationNumber,
  onClose,
  onSent,
}: RideQuestionSheetProps & { reservationNumber: string }) {
  const { session } = useAuth();
  const ask = usePostData();
  const questions = useFetchData(ACTION_CODES.ALL_PREDEFINED_QUESTIONS, GATEWAY_VIEW_NAME, {});
  const [questionId, setQuestionId] = useState('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  let options: PredefinedQuestion[] = [];
  let refused = false;
  if (questions.data) {
    try {
      options = toPredefinedQuestions(questions.data);
    } catch {
      refused = true;
    }
  }

  const messageError = validateQuestionMessage(message);
  const questionError = touched && !questionId ? FEEDBACK_MESSAGES.QUESTION_REQUIRED : undefined;

  const send = async () => {
    setTouched(true);
    if (!questionId || messageError || !session || ask.isLoading) return;
    setFailure(null);
    try {
      const response = await ask.mutateAsync(
        ACTION_CODES.ASK_QUESTION,
        GATEWAY_VIEW_NAME,
        askQuestionJData(session.loginId, reservationNumber, questionId, message),
        { retry: false },
      );
      assertQuestionSent(response);
      onClose();
      onSent(FEEDBACK_MESSAGES.SENT);
    } catch (error) {
      setFailure(error instanceof FeedbackError ? error.message : getErrorDisplay(error).customDescription);
    }
  };

  let picker: React.ReactNode;
  if (questions.isLoading && !questions.data) {
    picker = <ActivityIndicator color={colors.primary[600]} />;
  } else if (options.length === 0) {
    picker = (
      <Text style={styles.muted}>
        {questions.isError || refused ? FEEDBACK_MESSAGES.QUESTIONS_FAILED : FEEDBACK_MESSAGES.QUESTIONS_EMPTY}
      </Text>
    );
  } else {
    picker = (
      <SelectField
        label={FEEDBACK_MESSAGES.QUESTION_LABEL}
        required
        value={questionId}
        options={options.map((question) => ({ value: question.id, label: question.text }))}
        onChange={setQuestionId}
        error={questionError}
      />
    );
  }

  return (
    <Sheet
      visible
      title={FEEDBACK_MESSAGES.SHEET_TITLE}
      subtitle={reservationNumber}
      onClose={onClose}
      onConfirm={() => void send()}
      confirmLabel={ask.isLoading ? FEEDBACK_MESSAGES.SENDING : FEEDBACK_MESSAGES.SEND}
      // A question is required (`P_QUESTION_ID`), so there is nothing to send without one.
      confirmDisabled={ask.isLoading || !questionId}
    >
      <View style={styles.body}>
        {failure ? <Alert tone="danger" title={FEEDBACK_MESSAGES.FAILED_TITLE} message={failure} /> : null}
        {picker}
        <TextArea
          label={FEEDBACK_MESSAGES.MESSAGE_LABEL}
          value={message}
          onChangeText={setMessage}
          placeholder={FEEDBACK_MESSAGES.MESSAGE_PLACEHOLDER}
          maxLength={FIELD_LIMITS.QUESTION_MESSAGE}
          rows={3}
          error={touched && messageError ? messageError : undefined}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
