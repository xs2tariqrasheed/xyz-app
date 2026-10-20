import { FEEDBACK_MESSAGES } from '@/constants/messages';
import type { GatewayJData, GatewayResponse } from '@/services/gateway';
import { assertResultCode, pick, recordSet } from '@/services/gatewayRows';

/**
 * "Ask about this ride" — the predefined questions and the rider's answer
 * (reverse-engineer-implemented/guide/21, reverse-engineer-guide/24): `RES.S.ALL_PREDEFINED_QUESTIONS` and
 * `RES.I.ASKED_QUESTIONS`, keeping feedback inside the app instead of the
 * marketing site's forms.
 */

/** Thrown when the server refuses a question, as opposed to failing. */
export class FeedbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedbackError';
  }
}

export type PredefinedQuestion = { id: string; text: string };

/** Longest message the old panel accepted (guide 21). */
export const QUESTION_MESSAGE_MAX = 200;

/** Letters, digits, spaces and full stops — guide 21's rule — plus everyday punctuation it never blocked. */
const MESSAGE_CHARACTERS = /^[\p{L}\p{N}\s.,?!'-]*$/u;

/** Columns are undocumented: the old panel's names, then likely snake-case ones. */
const QUESTION_COLUMNS = {
  id: ['question_id', 'questionid', 'o_question_id', 'id'],
  text: ['question_text', 'question', 'description', 'o_question'],
} as const;

/**
 * TEMPORARY (product decision, 2026-10-20): the gateway stub answers
 * `RES.S.ALL_PREDEFINED_QUESTIONS` with no question rows, which leaves Ask a
 * Question unusable. Until it returns real rows, offer the live site's two
 * questions (guide 21: `questionid` 1 and 2) so `RES.I.ASKED_QUESTIONS` can be
 * sent. Used only for an accepted, empty answer — a failed or refused call
 * still shows its error. Delete this once the gateway returns questions.
 */
const FALLBACK_QUESTIONS: readonly PredefinedQuestion[] = [
  { id: '1', text: FEEDBACK_MESSAGES.QUESTION_CONTACT_DRIVER },
  { id: '2', text: FEEDBACK_MESSAGES.QUESTION_VEHICLE_LATE },
];

export function toPredefinedQuestions(response: GatewayResponse): PredefinedQuestion[] {
  const rows = recordSet(response, (message) => new FeedbackError(message), FEEDBACK_MESSAGES.QUESTIONS_FAILED);
  const questions = rows.flatMap((row) => {
    const id = pick(row, QUESTION_COLUMNS.id);
    const text = pick(row, QUESTION_COLUMNS.text);
    return id && text ? [{ id, text }] : [];
  });
  return questions.length > 0 ? questions : [...FALLBACK_QUESTIONS];
}

/** `JData` for {@link ACTION_CODES.ASK_QUESTION}. `P_QUESTION_ID` is a number in the contract. */
export function askQuestionJData(
  loginId: string,
  reservationNumber: string,
  questionId: string,
  message: string,
): GatewayJData {
  const numeric = Number(questionId);
  return {
    P_LOGIN_ID: loginId,
    P_RESERVATION_NUM: reservationNumber,
    P_QUESTION_ID: Number.isFinite(numeric) ? numeric : questionId,
    P_ADDITIONAL_MESSAGE: message.trim(),
  };
}

export function assertQuestionSent(response: GatewayResponse): void {
  assertResultCode(response, (message) => new FeedbackError(message), FEEDBACK_MESSAGES.REJECTED);
}

export function validateQuestionMessage(message: string): string | null {
  const trimmed = message.trim();
  if (trimmed.length > QUESTION_MESSAGE_MAX || !MESSAGE_CHARACTERS.test(trimmed)) {
    return FEEDBACK_MESSAGES.MESSAGE_INVALID;
  }
  return null;
}
