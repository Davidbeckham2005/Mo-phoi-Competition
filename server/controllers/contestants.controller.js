import { publicState } from "../services/state.service.js";
import * as exam from "../services/exam.service.js";
import { emitEvent } from "../config/io.js";

export function register(req) {
  const c = exam.registerContestant(req.body || {});
  emitEvent("prelim:update", publicState());
  return {
    id: c.id,
    name: c.name,
    studentId: c.studentId,
    startedAt: c.startedAt,
    submittedAt: c.submittedAt,
  };
}
