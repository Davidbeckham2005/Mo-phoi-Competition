  import { getDb, saveDb, resetContest } from "../models/store.js";
  import { publicState, adminState } from "../services/state.service.js";
  import * as exam from "../services/exam.service.js";
  import * as game from "../services/game.service.js";
  import { emitEvent } from "../config/io.js";

  export function login(req) {
    if (req.body.pin !== getDb().settings.pin) {
      const err = new Error("Sai mã PIN.");
      err.status = 401;
      throw err;
    }
    return { ok: true };
  }

  export function getState() {
    return adminState();
  }

  export function getLeaderboard() {
    return exam.leaderboard(200);
  }

  export function saveSettings(req) {
    // lấy dữ liệu đang cài đặt trên Ram
    Object.assign(getDb().settings, req.body || {});
    saveDb();
    emitEvent("prelim:update", publicState());
    game.emit();
    return getDb().settings;
  }
// mở phần thi sơ khảo (prelim) hoặc đóng lại ?
  export function openPrelim(req) {
    getDb().settings.prelimOpen = !!req.body.open;
    saveDb();
    emitEvent("prelim:update", publicState());
    return { prelimOpen: getDb().settings.prelimOpen };
  }

  export function selectTop(req) {
    const result = exam.selectTop16AndAssign(req.body.mode || "snake");
    emitEvent("prelim:update", publicState());
    game.emit();
    return result;
  }

  export function assignTeams(req) {
    const teams = exam.assignTeams(req.body.assignments || []);
    game.emit();
    return teams;
  }

  export function createDemo() {
    const lb = exam.seedDemoContestants();
    emitEvent("prelim:update", publicState());
    return lb;
  }

  export async function reset(req) {
    await resetContest(req.body.keepQuestions !== false);
    game.emit();
    emitEvent("prelim:update", publicState());
    return { ok: true };
  }

  export function saveTeams(req) {
    const db = getDb();
    (req.body.teams || []).forEach((patch) => {
      const t = db.teams.find((x) => x.id === patch.id);
      if (!t) return;
      if (patch.name) t.name = patch.name;
      if (patch.color) t.color = patch.color;
      if (patch.pass !== undefined) t.pass = String(patch.pass);
    });
    saveDb();
    game.emit();
    return db.teams;
  }

  export function saveSoKhaoQuestion(req) {
    const db = getDb();
    const q = req.body;
    if (!q.id) q.id = `sk-${Date.now()}`;
    const idx = db.questions.soKhao.findIndex((x) => x.id === q.id);
    if (idx >= 0) db.questions.soKhao[idx] = q;
    else db.questions.soKhao.push(q);
    saveDb();
    return db.questions.soKhao;
  }

  export function deleteSoKhaoQuestion(req) {
    const db = getDb();
    db.questions.soKhao = db.questions.soKhao.filter((q) => q.id !== req.params.id);
    saveDb();
    return db.questions.soKhao;
  }

  export function saveMainQuestions(req) {
    const db = getDb();
    db.questions.main = req.body.main || db.questions.main;
    saveDb();
    return db.questions.main;
  }

  export function uploadMedia(req) {
    if (!req.file) {
      const err = new Error("Không có tệp.");
      err.status = 400;
      throw err;
    }
    const item = {
      id: crypto.randomUUID(),
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      type: req.file.mimetype.startsWith("video") ? "video" : "image",
      createdAt: Date.now(),
    };
    getDb().media.push(item);
    saveDb();
    return item;
  }

  export function deleteMedia(req) {
    const db = getDb();
    db.media = db.media.filter((m) => m.id !== req.params.id);
    saveDb();
    return db.media;
  }

  export function setKhoiDongAnswerSeconds(req) {
    const v = Math.max(0, Number(req.body.seconds) || 0);
    game.setKhoiDongAnswerSeconds(v);
    return { ok: true, seconds: v };
  }

  export function setKhoiDongTimerSeconds(req) {
    const v = Math.max(5, Number(req.body.seconds) || 60);
    game.setKhoiDongTimerSeconds(v);
    return { ok: true, seconds: v };
  }
