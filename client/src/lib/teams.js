export const TEAM_ORDER = ["a", "b", "c", "d", "e", "f"];

// Thứ tự đầy đủ các đội (vòng 1 / màn chờ): dùng thứ tự của state.teams nếu có.
export function allTeamIds(teams = []) {
  if (Array.isArray(teams) && teams.length) return teams.map((t) => t.id);
  return TEAM_ORDER;
}

// 4 đội điểm cao nhất — dùng cho các vòng 2/3/4. Hoà điểm ưu tiên id nhỏ (a→f).
export function topTeamIds(teams = []) {
  return teams
    .slice()
    .sort((x, y) => y.score - x.score || x.id.localeCompare(y.id))
    .slice(0, 4)
    .map((t) => t.id);
}

// Bộ 4 đội đang thi vòng 2–4: ưu tiên bộ đã đóng băng từ server (g.qualifiedTeams),
// nếu chưa có (chưa vào vòng 2) thì tự tính top-4 theo điểm hiện tại.
export function activeTeamIds(g, teams = []) {
  const q = g?.qualifiedTeams;
  if (Array.isArray(q) && q.length) return q;
  return topTeamIds(teams);
}

export function teamById(teams = [], id = "") {
  return teams.find((t) => t.id === id);
}