import { getDb } from "../models/store.js";
import { publicState } from "../services/state.service.js";
import * as exam from "../services/exam.service.js";

export function getPublic() {
  const state = publicState();
  const lb = getDb().settings.showLiveRanking ? exam.leaderboard(20) : [];
  return { ...state, leaderboard: lb };
}
