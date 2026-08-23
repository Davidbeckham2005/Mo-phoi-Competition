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

export function selectTop16AndAssign(mode = "snake") {
  rankAll();
  const db = getDb();
  const top = db.contestants
    .filter((c) => c.submittedAt)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, db.settings.topN);

  db.contestants.forEach((c) => {
    c.qualified = false;
    c.teamId = null;
  });
  db.teams.forEach((t) => {
    t.memberIds = [];
  });

  top.forEach((c) => {
    c.qualified = true;
  });

  const teams = db.teams;
  if (mode === "sequential") {
    const size = Math.ceil(top.length / 4) || 4;
    top.forEach((c, i) => {
      const team = teams[Math.min(3, Math.floor(i / size))];
      c.teamId = team.id;
      team.memberIds.push(c.id);
    });
  } else {
    const order = [0, 1, 2, 3, 3, 2, 1, 0];
    top.forEach((c, i) => {
      const team = teams[order[i % 8]];
      c.teamId = team.id;
      team.memberIds.push(c.id);
    });
  }
  saveDb();
  return {
    top: top.map((c) => ({
      id: c.id,
      name: c.name,
      rank: c.rank,
      score: c.score,
      teamId: c.teamId,
    })),
    teams: db.teams,
  };
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

export function seedDemoContestants() {
  const db = getDb();
  const first = [
    "An", "Bình", "Chi", "Dũng", "Em", "Giang", "Hà", "Khoa",
    "Lan", "Minh", "Nam", "Oanh", "Phúc", "Quân", "Trang", "Uyên",
    "Vinh", "Yến", "Hùng", "My", "Tú", "Linh",
  ];
  first.forEach((name, i) => {
    const studentId = `HS${String(i + 1).padStart(3, "0")}`;
    if (db.contestants.some((c) => c.studentId === studentId)) return;
    const score = Math.max(10, 30 - Math.floor(i * 0.7) - (i % 3));
    const timeSpent = 400 + i * 17;
    const order = db.questions.soKhao.map((q) => q.id);
    const answers = {};
    order.forEach((id, qi) => {
      const q = db.questions.soKhao[qi];
      answers[id] = qi < score ? q.answer : (q.answer === "A" ? "B" : "A");
    });
    db.contestants.push({
      id: crypto.randomUUID(),
      name: `Nguyễn ${name}`,
      studentId,
      school: "THPT Mini Project",
      className: `12A${(i % 4) + 1}`,
      startedAt: Date.now() - 20 * 60 * 1000,
      submittedAt: Date.now() - (22 - i) * 60 * 1000,
      questionOrder: order,
      answers,
      score,
      correctCount: score,
      timeSpent,
      rank: null,
      qualified: false,
      teamId: null,
    });
  });
  rankAll();
  saveDb();
  return leaderboard(100);
}
