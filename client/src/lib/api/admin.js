import { getPin } from "../session.js";
import { request } from "../http.js";

export function login(pin) {
  return request("/api/admin/login", { method: "POST", body: { pin } });
}

export function getAdminState() {
  return request("/api/admin/state");
}

export function getLeaderboard() {
  return request("/api/admin/leaderboard");
}

export function saveSettings(body) {
  return request("/api/admin/settings", { method: "POST", body });
}

export function openPrelim(open) {
  return request("/api/admin/prelim/open", { method: "POST", body: { open } });
}

export function selectTop(mode) {
  return request("/api/admin/select-top", { method: "POST", body: { mode } });
}

export function assignTeams(assignments) {
  return request("/api/admin/assign-teams", { method: "POST", body: { assignments } });
}

export function createDemo() {
  return request("/api/admin/demo", { method: "POST", body: {} });
}

export function resetContest() {
  return request("/api/admin/reset", { method: "POST", body: { keepQuestions: true } });
}

export function saveTeams(teams) {
  return request("/api/admin/teams", { method: "POST", body: { teams } });
}

export function saveSoKhaoQuestion(q) {
  return request("/api/admin/questions/so-khao", { method: "POST", body: q });
}

export function deleteSoKhaoQuestion(id) {
  return request(`/api/admin/questions/so-khao/${id}`, { method: "DELETE" });
}

export function saveMainQuestions(main) {
  return request("/api/admin/questions/main", { method: "POST", body: { main } });
}

export async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "x-admin-pin": getPin() },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Tải tệp thất bại.");
  return data;
}
