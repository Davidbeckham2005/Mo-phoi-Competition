import { checkTeamPass, publicGame } from "../services/game.service.js";

export function login(req) {
  const { teamId, pass } = req.body || {};
  if (!checkTeamPass(teamId, pass)) {
    const err = new Error("Sai mật khẩu đội.");
    err.status = 401;
    throw err;
  }
  const t = publicGame().teams.find((x) => x.id === teamId);
  return { ok: true, team: t };
}
