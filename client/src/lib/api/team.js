import { request } from "../http.js";

export function loginTeam(teamId, pass) {
  return request("/api/team/login", { method: "POST", body: { teamId, pass } });
}
