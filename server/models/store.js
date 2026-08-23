// kĩ thuật In-Memory Caching (Bộ nhớ đệm trên RAM) kết hợp với Debounced Persistence (Ghi đệm xuống Database).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getConnection } from "../config/database.js";
import {
  TEAM_DEFS,
  ROUNDS,
  emptyPuzzle,
  defaultGame,
  defaultSettings,
} from "../config/constants.js";
import * as Setting from "./Setting.js";
import * as Team from "./Team.js";
import * as Contestant from "./Contestant.js";
import * as Question from "./Question.js";
import * as Media from "./Media.js";
import * as GameState from "./GameState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data");
const DB_JSON_PATH = path.join(DATA_DIR, "db.json");
const SK_PATH = path.join(DATA_DIR, "questions-so-khao.json");
const MAIN_PATH = path.join(DATA_DIR, "questions-main.json");

let db = null;
let writeTimer = null;
// dữ liệu ban đầu của CSDL (nếu chưa có dữ liệu nào được nạp từ file db.json)
export function defaultDb() {
  const soKhao = JSON.parse(fs.readFileSync(SK_PATH, "utf8"));
  const main = JSON.parse(fs.readFileSync(MAIN_PATH, "utf8"));
  return {
    settings: defaultSettings(),
    contestants: [],
    teams: TEAM_DEFS.map((t) => ({ ...t, memberIds: [], score: 0 })),
    questions: { soKhao, main },
    media: [],
    game: defaultGame(),
  };
}

async function persist(data) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await Setting.save(conn, data.settings);
    await Team.saveAll(conn, data.teams);
    await Contestant.saveAll(conn, data.contestants);
    await Question.saveSoKhao(conn, data.questions.soKhao);
    await Question.saveMain(conn, data.questions.main);
    await Media.saveAll(conn, data.media || []);
    await GameState.save(conn, data.game);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
// assemble() sẽ nạp dữ liệu từ CSDL (SQLite / MySQL) và trả về cấu trúc dữ liệu chuẩn của CSDL. 
// Nếu chưa có dữ liệu nào trong CSDL, nó sẽ trả về null.
async function assemble() {
  const conn = await getConnection();
  try {
    const settings = await Setting.load(conn);
    if (!settings) return null;
    const teams = await Team.loadAll(conn);
    const contestants = await Contestant.loadAll(conn);
    const soKhao = await Question.loadSoKhao(conn);
    const main = await Question.loadMain(conn);
    const media = await Media.loadAll(conn);
    const game = await GameState.load(conn);
    const fallback = defaultDb();
    return {
      settings: { ...fallback.settings, ...settings },
      teams: teams.length ? teams : fallback.teams,
      contestants,
      questions: {
        soKhao: soKhao.length ? soKhao : fallback.questions.soKhao,
        main: main || fallback.questions.main,
      },
      media,
      game: game || defaultGame(),
    };
  } finally {
    conn.release();
  }
}
// loadDb() sẽ nạp dữ liệu từ CSDL (SQLite / MySQL) hoặc từ file db.json (nếu chưa có dữ liệu trong CSDL).
export async function loadDb() {
  const existing = await assemble();
  if (existing) {
    db = existing;
    return db;
  }
  if (fs.existsSync(DB_JSON_PATH)) {
    const json = JSON.parse(fs.readFileSync(DB_JSON_PATH, "utf8"));
    db = {
      ...defaultDb(),
      ...json,
      settings: { ...defaultDb().settings, ...(json.settings || {}) },
    };
    if (!db.game) db.game = defaultGame();
  } else {
    db = defaultDb();
  }
  await persist(db);
  return db;
}

export function getDb() {
  if (!db) throw new Error("CSDL chưa được nạp. Hãy gọi loadDb() khi khởi động.");
  return db;
}

export function saveDb() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    persist(db).catch((err) => console.error("Lỗi ghi CSDL:", err.message));
  }, 80);
}

export async function saveDbSync() {
  await persist(db);
}

export async function resetContest(keepQuestions = true) {
  const prev = getDb();
  const next = defaultDb();
  if (keepQuestions) next.questions = prev.questions;
  next.media = prev.media || [];
  next.settings = { ...next.settings, ...prev.settings, prelimOpen: false };
  db = next;
  await persist(db);
  return db;
}

export { emptyPuzzle, TEAM_DEFS, ROUNDS, defaultGame };
