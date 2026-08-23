import { request } from "../http.js";

export function sendControl(action, body = {}) {
  return request(`/api/control/${action}`, { method: "POST", body });
}

export function getCurrentQuestion() {
  return request("/api/control/current-question");
}
