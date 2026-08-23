import { request } from "../http.js";

export function startExam(contestantId) {
  return request("/api/exam/start", { method: "POST", body: { contestantId } });
}

export function saveAnswer(payload) {
  return request("/api/exam/answer", { method: "POST", body: payload });
}

export function submitExam(contestantId) {
  return request("/api/exam/submit", { method: "POST", body: { contestantId } });
}

export function getExamStatus(id) {
  return request(`/api/exam/status/${id}`);
}

export function getExamResult(id) {
  return request(`/api/exam/result/${id}`);
}
