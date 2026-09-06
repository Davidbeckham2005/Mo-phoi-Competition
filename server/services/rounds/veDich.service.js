// MODULE VÒNG 4 — Về đích (ve_dich).
//
// Mỗi đội thi theo lượt: MC CHỌN NGAY TRONG LÚC THI 1 trong 3 gói câu hỏi. Mỗi gói
// có đúng 3 câu theo cấu trúc cố định:
//   Gói 60  = câu 10 + 10 + 20
//   Gói 80  = câu 10 + 20 + 20
//   Gói 100 = câu 20 + 20 + 30
// Không cho MC ghép từng mức tùy ý — server TỰ lấy 3 câu từ ngân hàng của đội theo
// đúng cấu trúc gói, không trùng câu trong gói và không lấy lại câu đã dùng.
//
// Câu hỏi thuộc các mức 10đ/20đ/30đ; thời gian trả lời theo ANSWER_SECONDS.
// Mỗi đội có ngân hàng câu hỏi riêng nên bộ câu của các đội là khác nhau.
// Giữ cơ chế Ngôi sao hy vọng (x2 điểm, sai trừ gấp đôi).
//
// Tách riêng logic này khỏi game.service.js để giảm phức tạp và tránh lỗi phát sinh
// (giống vuotCnv.service.js cho Vòng 2). Module này TỰ quản lý saveDb/emit và nhận
// các hàm dùng chung qua init() — tránh import vòng (circular).
//
// Cách dùng (từ game.service.js):
//   import * as vedich from "./rounds/veDich.service.js";
//   vedich.init({ emit });
//   vedich.selectPackage(80); vedich.setStar(true); ...

import { getDb, saveDb } from "../../models/store.js";
import { TEAM_ORDER } from "../../config/constants.js";

// Các hàm dùng chung được game.service.js tiêm vào khi khởi động module.
let emit = () => {};

export function init(deps) {
  if (!deps) return;
  if (deps.emit) emit = deps.emit;
}

function g() {
  return getDb().game;
}

// Mức điểm câu hỏi → số giây trả lời (Vòng 4):
//   10đ → 30s, 20đ → 45s, 30đ → 60s.
export const ANSWER_SECONDS = { 10: 30, 20: 45, 30: 60 };

// Các gói câu hỏi hợp lệ của Vòng 4 (tổng điểm gói → cấu trúc 3 câu).
export const PACKAGES = {
  60: [10, 10, 20],
  80: [10, 20, 20],
  100: [20, 20, 30],
};

// Trạng thái mặc định khi vào vòng / reset.
export function defaultState() {
  return {
    packagePoints: null,
    // Ngôi sao hy vọng: mỗi đội được chọn đúng 1 câu duy nhất. starQuestion = vị trí câu
    // (pickIndex) được gắn sao; null = chưa chọn. Chọn TRƯỚC khi hiện câu (ready/prep),
    // khi đang trả lời không đổi được.
    starQuestion: null,
    answeringTeam: "a",
    stealOpen: false,
    // Đã chốt bộ 3 câu cho đội hiện tại chưa? (false = MC đang soạn/chỉnh, true = đưa cho thí sinh thi)
    locked: false,
    // Giai đoạn thi: "soan" (chưa chốt) | "countdown" (đang đếm 3-2-1) | "answering" (đang trả lời)
    phase: "soan",
    // Các câu hỏi đã CHỌN cho từng đội (tối đa 3 câu, mảng các id).
    picked: TEAM_ORDER.reduce((acc, id) => { acc[id] = []; return acc; }, {}),
    // Câu đang thi trong danh sách picked của đội hiện tại.
    pickIndex: 0,
  };
}

// Ngân hàng câu dự phòng tối thiểu cho MỖI đội ở mỗi mức điểm (12×10, 24×20, 12×30).
export const BANK_REQUIREMENTS = { 10: 12, 20: 24, 30: 12 };
// Tổng câu dự phòng mỗi đội: 12 + 24 + 12 = 48.
export const BANK_TOTAL = Object.values(BANK_REQUIREMENTS).reduce((a, b) => a + b, 0);

// Hằng tham chiếu ngân hàng câu Về đích của mọi đội trong db.questions.main.
function bank(db) {
  if (!db.questions.main.veDich) db.questions.main.veDich = {};
  return db.questions.main.veDich;
}

// Tự tạo câu mới đúng mức điểm (bản nháp) khi ngân hàng thiếu.
function makeQuestion(teamId, points) {
  return {
    id: `vd-${teamId}-${points}-auto-${Math.random().toString(36).slice(2, 8)}`,
    points,
    question: `(Câu tự tạo) ${points} điểm — hãy sửa nội dung cho đội ${String(teamId).toUpperCase()}.`,
    answer: "",
    auto: true,
  };
}

// Đảm bảo mỗi đội có ngân hàng câu đủ theo BANK_REQUIREMENTS (12×10, 24×20, 12×30).
// Nếu thiếu, tự tạo câu bản nháp để đội vẫn chọn được đủ. Trả về số câu đã tạo thêm.
export function ensureBank() {
  const db = getDb();
  const b = bank(db);
  let created = 0;
  for (const teamId of TEAM_ORDER) {
    const list = Array.isArray(b[teamId]) ? b[teamId] : [];
    b[teamId] = list;
    for (const [pts, need] of Object.entries(BANK_REQUIREMENTS)) {
      const level = Number(pts);
      const have = list.filter((x) => Number(x.points) === level).length;
      for (let i = have; i < need; i += 1) {
        b[teamId].push(makeQuestion(teamId, level));
        created += 1;
      }
    }
  }
  if (created > 0) {
    saveDb();
    db.questions.main.veDich = b;
  }
  return created;
}

// Số giây trả lời theo điểm câu đang thi (10→30s, 20→45s, 30→60s).
// Trả về thời gian dựa trên điểm của câu hiện tại (currentPoints).
export function getAnswerSeconds(game = g()) {
  const pts = currentPoints(game);
  return ANSWER_SECONDS[pts] ?? 30;
}

// Điểm GỐC của câu đang thi (chưa nhân ngôi sao).
export function getBasePoints(game = g()) {
  return currentPoints(game);
}

// Điểm thưởng của câu đang thi (x2 nếu câu này được gán Ngôi sao hy vọng).
export function getPoints(game = g()) {
  const pts = currentPoints(game);
  const ved = game.veDich;
  const star = ved.starQuestion === (ved.pickIndex ?? 0);
  return star ? pts * 2 : pts;
}

// Bật/tắt Ngôi sao hy vọng cho câu SẮP được trình.
// Chỉ được chọn/đổi TRƯỚC KHI hiện câu (phase "ready" cho câu đầu, "prep" cho từng câu
// sau). Khi đang trả lời (phase "answering") hoặc đang soạn/đếm ngược thì KHÔNG được
// đổi. Mỗi đội chỉ được chọn đúng 1 câu duy nhất trong lượt thi.
export function setStar(star) {
  const game = g();
  const enable = !!star;
  if (game.veDich.phase !== "ready" && game.veDich.phase !== "prep") {
    const err = new Error("Ngôi sao hy vọng chỉ chọn được khi đang chuẩn bị hiện câu hỏi.");
    err.status = 400;
    throw err;
  }
  const curIdx = game.veDich.pickIndex ?? 0;
  game.veDich.starQuestion = game.veDich.starQuestion ?? null;
  if (enable) {
    if (game.veDich.starQuestion !== null && game.veDich.starQuestion !== curIdx) {
      const err = new Error(`Đội ${String(game.currentTeam).toUpperCase()} chỉ dùng ngôi sao hy vọng cho 1 câu duy nhất.`);
      err.status = 400;
      throw err;
    }
    game.veDich.starQuestion = curIdx;
  } else {
    game.veDich.starQuestion = null;
  }
  saveDb();
  emit();
}

function teamName(id) {
  const team = (getDb().teams || []).find((t) => t.id === id);
  return team?.name || id?.toUpperCase?.() || id;
}

// Lấy câu hỏi hiện tại của đội đang thi (theo picked[pickIndex]).
// Chỉ trả về câu sau khi bộ câu đã CHỐT — lúc chưa chốt, chưa có câu nào được đưa ra thi.
export function findQuestion(game = g()) {
  const team = game.currentTeam;
  if (!game.veDich.locked) return null;
  const qids = game.veDich.picked?.[team] || [];
  const qid = qids[game.veDich.pickIndex] || null;
  if (!qid) return null;
  return (getDb().questions.main.veDich?.[team] || []).find((q) => q.id === qid) || null;
}

// Mức điểm của câu đang thi (ưu tiên theo câu đã chọn, fallback về packagePoints).
function currentPoints(game = g()) {
  const q = findQuestion(game);
  return q?.points || game?.veDich?.packagePoints || 20;
}

// MC chọn gói câu hỏi cho đội đang thi. Server TỰ lấy 3 câu từ ngân hàng của đội
// theo đúng cấu trúc gói (PACKAGES), không lấy lại câu đã dùng trước đó.
//   - packagePoints bắt buộc là 60, 80 hoặc 100.
//   - Chỉ cho phép khi chưa chốt (locked == false) — sau khi chốt phải unlock để đổi gói.
//   - Nếu không đủ câu ở mức cần thiết → trả lỗi rõ ràng, không tự chọn bừa.
//   - Trả về mảng id của 3 câu đã chọn.
export function selectPackage(packagePoints) {
  const game = g();
  const team = game.currentTeam;
  const pts = Number(packagePoints);
  const structure = PACKAGES[pts];
  if (!structure) {
    const err = new Error("Gói câu hỏi chỉ có thể là 60, 80 hoặc 100 điểm.");
    err.status = 400;
    throw err;
  }
  if (game.veDich.locked) {
    const err = new Error("Bộ câu đã chốt — không thể đổi gói. Bấm Sửa lại nếu muốn chọn gói khác.");
    err.status = 400;
    throw err;
  }
  const bank = getDb().questions.main.veDich?.[team] || [];
  // Câu đã sử dụng: mọi câu đang nằm trong gói của CÁC đội (kể cả gói cũ của chính đội
  // này nếu đang đổi sang gói khác) — không được lấy lại. Đổi gói trước khi chốt không
  // "giải phóng" câu cũ để tránh trùng câu giữa các lượt.
  const usedIds = new Set();
  for (const qids of Object.values(game.veDich.picked || {})) {
    (qids || []).forEach((qid) => usedIds.add(qid));
  }
  const pickedIds = [];
  const needByLevel = structure.reduce((acc, lv) => { acc[lv] = (acc[lv] || 0) + 1; return acc; }, {});
  for (const level of Object.keys(needByLevel)) {
    const lv = Number(level);
    const need = needByLevel[lv];
    const candidates = bank.filter((x) => Number(x.points) === lv && !usedIds.has(x.id));
    if (candidates.length < need) {
      const err = new Error(
        `Đội ${team.toUpperCase()} không đủ câu ${lv} điểm chưa dùng: cần ${need}, hiện còn ${candidates.length}. Hãy bổ sung câu ${lv} điểm trong ngân hàng rồi thử lại.`
      );
      err.status = 400;
      throw err;
    }
    // Lấy các câu đầu tiên chưa dùng; ưu tiên câu đã soạn nội dung (không phải bản nháp tự tạo).
    const chosen = candidates
      .slice()
      .sort((a, b) => (a.auto ? 1 : 0) - (b.auto ? 1 : 0))
      .slice(0, need)
      .map((x) => x.id);
    chosen.forEach((qid) => usedIds.add(qid));
    pickedIds.push(...chosen);
  }
  game.veDich.picked = { ...(game.veDich.picked || {}), [team]: pickedIds };
  game.veDich.packagePoints = pts;
  game.veDich.pickIndex = 0;
  saveDb();
  emit();
  return pickedIds;
}

// Chốt bộ 3 câu — đưa câu hỏi cho thí sinh trả lời (bắt đầu từ câu 1).
export function lockPackage() {
  const game = g();
  const team = game.currentTeam;
  const picked = game.veDich.picked?.[team] || [];
  if (picked.length !== 3) {
    const err = new Error(`Bộ câu phải đủ 3 câu (hiện có ${picked.length}) để bắt đầu thi.`);
    err.status = 400;
    throw err;
  }
  game.veDich.locked = true;
  game.veDich.pickIndex = 0;
  // Ở màn "sẵn sàng" MC sẽ chọn ngôi sao hy vọng (nếu muốn) trước khi Bắt đầu thi.
  game.veDich.phase = "ready";
  saveDb();
  emit();
}

// Bắt đầu thi: từ trạng thái đã chốt, chuyển sang đếm ngược 3-2-1 (do timer loop xử lý).
export function startGame() {
  const game = g();
  if (!game.veDich.locked || game.veDich.picked?.[game.currentTeam]?.length !== 3) {
    const err = new Error("Chưa chốt đủ bộ 3 câu để bắt đầu thi.");
    err.status = 400;
    throw err;
  }
  game.veDich.phase = "countdown";
  game.veDich.pickIndex = 0;
  saveDb();
  emit();
}

// Mở khóa để MC điều chỉnh lại bộ câu.
export function unlockPackage() {
  const game = g();
  game.veDich.locked = false;
  game.veDich.starQuestion = null;
  game.veDich.phase = "soan";
  saveDb();
  emit();
}

// Xóa toàn bộ câu đã chọn của một đội (để chọn lại).
export function clearPicked(teamId) {
  const game = g();
  const team = teamId || game.currentTeam;
  game.veDich.picked = { ...(game.veDich.picked || {}), [team]: [] };
  game.veDich.pickIndex = 0;
  game.veDich.locked = false;
  game.veDich.starQuestion = null;
  game.veDich.phase = "soan";
  saveDb();
  emit();
}

// Đổi đội đang thi: lưu answeringTeam, tắt sao, quay lại câu đầu của đội mới.
export function setAnsweringTeam(teamId) {
  const game = g();
  game.veDich.answeringTeam = teamId;
  game.veDich.starQuestion = null;
  game.veDich.pickIndex = 0;
  // Mỗi đội tự chốt bộ câu của mình — đội mới chưa chốt.
  game.veDich.locked = false;
  game.veDich.phase = "soan";
  saveDb();
  emit();
}