import * as XLSX from "xlsx";
import { getDb, saveDb } from "../models/store.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function registerContestant({ name, studentId, school, className }) {
  const db = getDb();
  const sid = String(studentId || "").trim();
  if (!name?.trim() || !sid) {
    throw Object.assign(new Error("Vui lòng nhập họ tên và mã số thí sinh."), { status: 400 });
  }
  const existed = db.contestants.find((c) => c.studentId.toLowerCase() === sid.toLowerCase());
  if (existed) {
    return existed;
  }
  const contestant = {
    id: crypto.randomUUID(),
    name: name.trim(),
    studentId: sid,
    school: (school || "").trim(),
    className: (className || "").trim(),
    startedAt: null,
    submittedAt: null,
    questionOrder: [],
    answers: {},
    score: 0,
    correctCount: 0,
    timeSpent: 0,
    rank: null,
    qualified: false,
    teamId: null,
  };
  db.contestants.push(contestant);
  saveDb();
  return contestant;
}

function normKey(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function pickField(obj, keys) {
  for (const [k, v] of Object.entries(obj)) {
    if (keys.has(normKey(k))) return String(v ?? "").trim();
  }
  return "";
}

function mapContestantRow(obj) {
  const name = pickField(obj, new Set(["name", "hoten", "hovaten", "ten", "fullname", "hovatenhocsinh"]));
  const studentId = pickField(obj, new Set(["studentid", "masothisinh", "mathisinh", "maso", "mssv", "ms", "sbd"]));
  const school = pickField(obj, new Set(["school", "truong", "tentruong"]));
  const className = pickField(obj, new Set(["classname", "class", "lop", "tenlop"]));
  if (name || studentId) return { name, studentId, school, className };
  const vals = Object.values(obj).map((v) => String(v ?? "").trim());
  return { name: vals[0] || "", studentId: vals[1] || "", school: vals[2] || "", className: vals[3] || "" };
}

function parseCsvRows(text) {
  const first = text.split(/\r?\n/).find((l) => l.trim()) || "";
  const sc = (first.match(/;/g) || []).length;
  const cc = (first.match(/,/g) || []).length;
  const tc = (first.match(/\t/g) || []).length;
  let delim = ",";
  if (tc > sc && tc > cc) delim = "\t";
  else if (sc > cc) delim = ";";

  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const nonempty = rows.filter((r) => r.some((c) => String(c).trim()));
  if (!nonempty.length) return [];
  const headers = nonempty[0].map((h) => String(h || "").trim());
  const headerLooksLikeData = !headers.some((h) => {
    const k = normKey(h);
    return ["name", "hoten", "hovaten", "ten", "studentid", "masothisinh", "mathisinh", "maso", "mssv"].includes(k);
  });
  const start = headerLooksLikeData ? 0 : 1;
  const keys = headerLooksLikeData ? ["name", "studentId", "school", "className"] : headers;
  return nonempty.slice(start).map((r) => {
    const obj = {};
    keys.forEach((k, i) => {
      obj[k] = r[i] || "";
    });
    return mapContestantRow(obj);
  });
}

export function parseContestantFile(text, filename = "") {
  const raw = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!raw) return [];
  const isJson = /\.json$/i.test(filename) || raw.startsWith("[") || raw.startsWith("{");
  if (isJson) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw Object.assign(new Error("Tệp JSON không hợp lệ."), { status: 400 });
    }
    const arr = Array.isArray(data) ? data : data.contestants || data.data || [];
    if (!Array.isArray(arr)) {
      throw Object.assign(new Error("JSON phải là mảng thí sinh."), { status: 400 });
    }
    return arr.map((row) => mapContestantRow(row && typeof row === "object" ? row : {}));
  }
  return parseCsvRows(raw);
}

export function parseContestantXlsx(buffer) {
  let wb;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  } catch {
    throw Object.assign(new Error("Tệp Excel không hợp lệ."), { status: 400 });
  }
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "", raw: false });
  return rows.map((row) => mapContestantRow(row && typeof row === "object" ? row : {}));
}

export function importContestants(rows) {
  const db = getDb();
  let created = 0;
  let skipped = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i]?.name || "").trim();
    const sid = String(rows[i]?.studentId || "").trim();
    const school = String(rows[i]?.school || "").trim();
    const className = String(rows[i]?.className || "").trim();
    if (!name && !sid) continue;
    if (!name || !sid) {
      errors.push({ line: i + 1, message: "Thiếu họ tên hoặc mã số thí sinh." });
      continue;
    }
    const existed = db.contestants.find((c) => c.studentId.toLowerCase() === sid.toLowerCase());
    if (existed) {
      skipped++;
      continue;
    }
    db.contestants.push({
      id: crypto.randomUUID(),
      name,
      studentId: sid,
      school,
      className,
      startedAt: null,
      submittedAt: null,
      questionOrder: [],
      answers: {},
      score: 0,
      correctCount: 0,
      timeSpent: 0,
      rank: null,
      qualified: false,
      teamId: null,
    });
    created++;
  }
  if (created) saveDb();
  return { created, skipped, errors, total: rows.length };
}

export function startExam(contestantId) {
  const db = getDb();
  if (!db.settings.prelimOpen) {
    throw Object.assign(new Error("Vòng sơ khảo chưa mở."), { status: 403 });
  }
  const c = db.contestants.find((x) => x.id === contestantId);
  if (!c) throw Object.assign(new Error("Không tìm thấy thí sinh."), { status: 404 });
  if (c.submittedAt) {
    throw Object.assign(new Error("Bạn đã nộp bài."), { status: 400 });
  }
  if (!c.startedAt) {
    const pool = db.questions.soKhao.slice(0, db.settings.prelimQuestionCount);
    c.questionOrder = shuffle(pool.map((q) => q.id));
    c.startedAt = Date.now();
    c.answers = {};
    saveDb();
  }
  return examPayload(c);
}

export function examPayload(c, includeAnswers = false) {
  const db = getDb();
  const map = Object.fromEntries(db.questions.soKhao.map((q) => [q.id, q]));
  const remaining = remainingTime(c);
  const questions = c.questionOrder.map((id, idx) => {
    const q = map[id];
    if (!q) return null;
    const item = {
      index: idx,
      id: q.id,
      question: q.question,
      options: q.options,
      topic: q.topic,
      chosen: c.answers[id] || null,
    };
    if (includeAnswers) item.correct = q.answer;
    return item;
  }).filter(Boolean);
  return {
    contestant: {
      id: c.id,
      name: c.name,
      studentId: c.studentId,
      startedAt: c.startedAt,
      submittedAt: c.submittedAt,
      score: c.submittedAt ? c.score : null,
      remaining,
      duration: db.settings.prelimDuration,
    },
    questions,
  };
}

export function remainingTime(c) {
  const db = getDb();
  if (!c.startedAt) return db.settings.prelimDuration;
  if (c.submittedAt) return Math.max(0, db.settings.prelimDuration - c.timeSpent);
  const elapsed = Math.floor((Date.now() - c.startedAt) / 1000);
  return Math.max(0, db.settings.prelimDuration - elapsed);
}

export function saveAnswer(contestantId, questionId, answer) {
  const db = getDb();
  const c = db.contestants.find((x) => x.id === contestantId);
  if (!c) throw Object.assign(new Error("Không tìm thấy thí sinh."), { status: 404 });
  if (c.submittedAt) throw Object.assign(new Error("Bài thi đã nộp."), { status: 400 });
  if (!c.startedAt) throw Object.assign(new Error("Chưa bắt đầu bài thi."), { status: 400 });
  if (remainingTime(c) <= 0) {
    return submitExam(contestantId);
  }
  if (!c.questionOrder.includes(questionId)) {
    throw Object.assign(new Error("Câu hỏi không hợp lệ."), { status: 400 });
  }
  const key = String(answer || "").trim().toUpperCase();
  if (!["A", "B", "C", "D"].includes(key)) {
    throw Object.assign(new Error("Đáp án phải là A, B, C hoặc D."), { status: 400 });
  }
  c.answers[questionId] = key;
  saveDb();
  return { ok: true, remaining: remainingTime(c) };
}

export function submitExam(contestantId) {
  const db = getDb();
  const c = db.contestants.find((x) => x.id === contestantId);
  if (!c) throw Object.assign(new Error("Không tìm thấy thí sinh."), { status: 404 });
  if (!c.startedAt) throw Object.assign(new Error("Chưa bắt đầu bài thi."), { status: 400 });
  if (c.submittedAt) return resultOf(c);
  const elapsed = Math.min(
    db.settings.prelimDuration,
    Math.floor((Date.now() - c.startedAt) / 1000)
  );
  const map = Object.fromEntries(db.questions.soKhao.map((q) => [q.id, q]));
  let correct = 0;
  for (const id of c.questionOrder) {
    const q = map[id];
    if (q && c.answers[id] === q.answer) correct += 1;
  }
  c.correctCount = correct;
  c.score = correct;
  c.timeSpent = elapsed;
  c.submittedAt = Date.now();
  rankAll();
  saveDb();
  return resultOf(c);
}

export function rankAll() {
  const db = getDb();
  const submitted = db.contestants.filter((c) => c.submittedAt);
  submitted.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.timeSpent - b.timeSpent;
  });
  submitted.forEach((c, i) => {
    c.rank = i + 1;
    c.qualified = i < db.settings.topN;
  });
  db.contestants
    .filter((c) => !c.submittedAt)
    .forEach((c) => {
      c.rank = null;
      c.qualified = false;
    });
}

export function resultOf(c) {
  const db = getDb();
  return {
    id: c.id,
    name: c.name,
    studentId: c.studentId,
    score: c.score,
    correctCount: c.correctCount,
    total: c.questionOrder.length || db.settings.prelimQuestionCount,
    timeSpent: c.timeSpent,
    rank: c.rank,
    qualified: c.qualified,
    submittedAt: c.submittedAt,
    topN: db.settings.topN,
  };
}

export function leaderboard(limit = 50) {
  rankAll();
  const db = getDb();
  return db.contestants
    .filter((c) => c.submittedAt)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      name: c.name,
      studentId: c.studentId,
      school: c.school,
      className: c.className,
      score: c.score,
      timeSpent: c.timeSpent,
      rank: c.rank,
      qualified: c.qualified,
      teamId: c.teamId,
    }));
}

export function assignTeams(assignments) {
  const db = getDb();
  db.teams.forEach((t) => {
    t.memberIds = [];
  });
  db.contestants.forEach((c) => {
    c.teamId = null;
  });
  for (const { contestantId, teamId } of assignments) {
    const c = db.contestants.find((x) => x.id === contestantId);
    const team = db.teams.find((t) => t.id === teamId);
    if (!c || !team) continue;
    c.teamId = teamId;
    c.qualified = true;
    if (!team.memberIds.includes(c.id)) team.memberIds.push(c.id);
  }
  saveDb();
  return db.teams;
}

// BTC xóa trực tiếp một thí sinh khỏi cuộc thi (cả khỏi đội đang thuộc).
export function deleteContestant(id) {
  const db = getDb();
  const idx = db.contestants.findIndex((c) => c.id === id);
  if (idx < 0) {
    throw Object.assign(new Error("Không tìm thấy thí sinh."), { status: 404 });
  }
  db.contestants.splice(idx, 1);
  db.teams.forEach((t) => {
    t.memberIds = (t.memberIds || []).filter((mid) => mid !== id);
  });
  saveDb();
  return { ok: true };
}

export function deleteContestants(ids) {
  const db = getDb();
  const set = new Set((ids || []).map(String).filter(Boolean));
  if (!set.size) {
    throw Object.assign(new Error("Chưa chọn thí sinh."), { status: 400 });
  }
  const before = db.contestants.length;
  db.contestants = db.contestants.filter((c) => !set.has(c.id));
  db.teams.forEach((t) => {
    t.memberIds = (t.memberIds || []).filter((mid) => !set.has(mid));
  });
  saveDb();
  return { ok: true, deleted: before - db.contestants.length };
}

// Chia đều toàn bộ thí sinh vào các đội theo lượt (round-robin).
export function divideAllTeams() {
  const db = getDb();
  db.teams.forEach((t) => {
    t.memberIds = [];
  });
  db.contestants.forEach((c) => {
    c.teamId = null;
    c.qualified = true;
  });
  db.contestants.forEach((c, i) => {
    const team = db.teams[i % db.teams.length];
    c.teamId = team.id;
    team.memberIds.push(c.id);
  });
  saveDb();
  return db.teams;
}
