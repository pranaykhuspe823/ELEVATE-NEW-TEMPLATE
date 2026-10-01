// Single source of truth for course content lives in the frontend; the
// server imports it directly instead of duplicating it.
import { COURSE, BANK, EXAM_N, PASS } from "../../src/js/course-data.js";

export { EXAM_N, PASS };
export const MODULE_COUNT = COURSE.length;
export const MODULE_TITLES = COURSE.map((m) => m.title);

export function pickQuestionIds() {
  const idx = BANK.map((_, k) => k);
  for (let k = idx.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [idx[k], idx[j]] = [idx[j], idx[k]];
  }
  return idx.slice(0, EXAM_N);
}

// What the client is allowed to see before submitting: no answer key.
export function sanitizedQuestions(ids) {
  return ids.map((id, qi) => ({ qi, q: BANK[id].q, o: BANK[id].o }));
}

export function gradeAnswers(ids, answers) {
  let score = 0;
  const perQuestion = ids.map((id, qi) => {
    const q = BANK[id];
    const picked = answers ? answers[qi] : undefined;
    const correct = picked === q.a;
    if (correct) score++;
    return { qi, correct, yourAnswer: picked ?? null, correctAnswer: q.a, explanation: q.e };
  });
  return { score, passed: score >= PASS, perQuestion };
}
