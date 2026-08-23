import { getDb } from "../models/store.js";
import { publicState } from "../services/state.service.js";
import * as exam from "../services/exam.service.js";
import { emitEvent } from "../config/io.js";

function notFound() {
  const err = new Error("Không tìm thấy thí sinh.");
  err.status = 404;
  throw err;
}

export function start(req) {
  return exam.startExam(req.body.contestantId);
}

export function answer(req) {
  const { contestantId, questionId, answer } = req.body;
  return exam.saveAnswer(contestantId, questionId, answer);
}

export function submit(req) {
  const result = exam.submitExam(req.body.contestantId);
  emitEvent("prelim:update", publicState());
  return result;
}

export function status(req) {
  const c = getDb().contestants.find((x) => x.id === req.params.id);
  if (!c) notFound();
  if (c.startedAt && !c.submittedAt && exam.remainingTime(c) <= 0) {
    return exam.submitExam(c.id);
  }
  if (c.submittedAt) return { submitted: true, result: exam.resultOf(c) };
  if (c.startedAt) return { started: true, remaining: exam.remainingTime(c) };
  return { registered: true, prelimOpen: getDb().settings.prelimOpen };
}

export function result(req) {
  const c = getDb().contestants.find((x) => x.id === req.params.id);
  if (!c) notFound();
  if (!c.submittedAt) {
    const err = new Error("Chưa có kết quả.");
    err.status = 400;
    throw err;
  }
  return exam.resultOf(c);
}
