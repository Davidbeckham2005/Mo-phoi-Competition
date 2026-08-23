import { request } from "../http.js";

export function registerContestant(payload) {
  return request("/api/contestants/register", { method: "POST", body: payload });
}
