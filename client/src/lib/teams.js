export const TEAM_ORDER = ["a", "b", "c", "d", "e", "f"];

// Thứ tự đầy đủ các đội (vòng 1 / màn chờ): dùng thứ tự của state.teams nếu có.
export function allTeamIds(teams = []) {
  if (Array.isArray(teams) && teams.length) return teams.map((t) => t.id);
  return TEAM_ORDER;
}

// Các đội còn thi trong mọi vòng: MC tự quyết định ai loại bằng nút Khóa (khóa vĩnh
// viễn, team.eliminated trên DB) — hệ thống không tự loại/chọn đội nào.
// Khớp với activeTeamIds server.
export function activeTeamIds(g, teams = []) {
  return teams.filter((t) => !t.eliminated).map((t) => t.id);
}

export function teamById(teams = [], id = "") {
  return teams.find((t) => t.id === id);
}
