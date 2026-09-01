// MODULE VÒNG 4 — Về đích (ve_dich).
//
// Mỗi đội thi theo lượt: MC CHỌN NGAY TRONG LÚC THI 3 câu hỏi từ ngân hàng câu hỏi
// của đội. Mỗi câu thuộc một mức điểm: 20đ (trả lời 15s), 30đ (trả lời 20s),
// 40đ (trả lời 25s). Các câu được chọn KHÔNG trùng nhau trong cùng một đội (vd gói
// 20,20,20 = 3 câu 20đ khác nhau) và mỗi đội có ngân hàng câu hỏi riêng nên bộ câu
// của các đội là khác nhau. Giữ cơ chế Ngôi sao hy vọng (x2 điểm, sai trừ gấp đôi).
//
// Tách riêng logic này khỏi game.service.js để giảm phức tạp và tránh lỗi phát sinh
// (giống vuotCnv.service.js cho Vòng 2). Module này TỰ quản lý saveDb/emit và nhận
// các hàm dùng chung qua init() — tránh import vòng (circular).
//
// Cách dùng (từ game.service.js):
//   import * as vedich from "./rounds/veDich.service.js";
//   vedich.init({ emit });
//   vedich.pick(points); vedich.setStar(true); ...

import { getDb, saveDb } from "../../models/store.js";

// Các hàm dùng chung được game.service.js tiêm vào khi khởi động module.
let emit = () => {};

export function init(deps) {
  if (!deps) return;
  if (deps.emit) emit = deps.emit;
}

function g() {
  return getDb().game;
}

// Mức điểm hợp lệ → số giây trả lời
export const POINT_SECONDS = { 20: 15, 30: 20, 40: 25 };

// Trạng thái mặc định khi vào vòng / reset.
export function defaultState() {
  return {
    packagePoints: 20,
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
    picked: { a: [], b: [], c: [], d: [] },
    // Câu đang thi trong danh sách picked của đội hiện tại.
    pickIndex: 0,
  };
}

// Mức điểm hợp lệ cho Về đích.
export const PACKAGE_POINTS = [20, 30, 40];
// Số câu tối thiểu cần có cho mỗi đội ở MỖI mức điểm (20/30/40).
export const Q_PER_LEVEL = 3;
// Q_PER_LEVEL câu × số mức.
export const Q_PER_TEAM = PACKAGE_POINTS.length * Q_PER_LEVEL; // 9

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

// Đảm bảo mỗi đội có đủ Q_PER_LEVEL câu ở mỗi mức 20/30/40. Nếu thiếu, tự tạo câu
// bản nháp để đội vẫn chọn được đủ 3 câu. Trả về số câu đã tạo thêm.
export function ensureBank() {
  const db = getDb();
  const b = bank(db);
  let created = 0;
  for (const teamId of ["a", "b", "c", "d"]) {
    const list = Array.isArray(b[teamId]) ? b[teamId] : [];
    b[teamId] = list;
    for (const pts of PACKAGE_POINTS) {
      const have = list.filter((x) => Number(x.points) === pts).length;
      for (let i = have; i < Q_PER_LEVEL; i += 1) {
        b[teamId].push(makeQuestion(teamId, pts));
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

// Số giây trả lời theo điểm câu đang thi (20→15s, 30→20s, 40→25s).
export function getAnswerSeconds(game = g()) {
  return POINT_SECONDS[currentPoints(game)] || 15;
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

// MC chọn (thêm mới hoặc thay thế) một câu trong bộ câu của đội đang thi.
//   - slot = 0..picked.length (vị trí muốn thêm/thay): nếu slot < picked.length thì THAY THẾ
//     câu tại vị trí đó; nếu slot >= picked.length thì THÊM MỚI vào cuối.
//   - Chỉ cho phép khi chưa chốt (locked == false) — sau khi chốt phải unlock để sửa.
//   - Tự chọn câu đầu tiên ở mức chỉ định trong ngân hàng CHƯA được đội dùng ở vị trí khác.
export function pick(points, slot) {
  const game = g();
  const team = game.currentTeam;
  const pts = Number(points);
  if (![20, 30, 40].includes(pts)) {
    const err = new Error("Giá trị điểm phải là 20, 30 hoặc 40.");
    err.status = 400;
    throw err;
  }
  if (game.veDich.locked) {
    const err = new Error("Bộ câu đã chốt — hãy bấm Sửa lại trước khi điều chỉnh.");
    err.status = 400;
    throw err;
  }
  const picked = game.veDich.picked?.[team] || [];
  const pos = Number.isInteger(slot) && slot >= 0 ? slot : picked.length;
  // Chặn: vị trí vượt danh sách, hoặc THÊM MỚI (pos == length) khi đã đủ 3 câu.
  if (pos > picked.length || (pos === picked.length && picked.length >= 3)) {
    const err = new Error(`Đội này đã chọn ${picked.length}/3 câu — chỉ có thể thay thế vị trí 0..${Math.max(0, picked.length - 1)}.`);
    err.status = 400;
    throw err;
  }
  const bank = getDb().questions.main.veDich?.[team] || [];
  // Trường hợp THAY THẾ 1 vị trí đã có câu: chỉ được đổi sang MỨC KHÁC, không được
  // chọn lại đúng mức của câu hiện tại (vì câu đó đã ở mức đó rồi).
  const existing = pos < picked.length ? picked[pos] : null;
  if (existing) {
    const cur = bank.find((x) => x.id === existing);
    if (cur && Number(cur.points) === pts) {
      const err = new Error(`Câu ${pos + 1} đã ở mức ${pts} điểm — chọn 1 trong 2 mức còn lại để thay thế.`);
      err.status = 400;
      throw err;
    }
  }
  // Các câu đã dùng ở các vị trí KHÁC (không tính vị trí đang được thay thế).
  const usedElsewhere = picked.filter((_, i) => i !== pos);
  const q = bank.find((x) => x.points === pts && !usedElsewhere.includes(x.id));
  if (!q) {
    const err = new Error(
      `Đội ${team.toUpperCase()} không còn câu hỏi ${pts} điểm chưa dùng — chọn mức khác hoặc bỏ bớt câu.`
    );
    err.status = 400;
    throw err;
  }
  const next = picked.slice();
  if (pos < picked.length) next[pos] = q.id;
  else next.push(q.id);
  game.veDich.picked = { ...(game.veDich.picked || {}), [team]: next };
  game.veDich.packagePoints = pts;
  saveDb();
  emit();
  return q;
}

// Bỏ câu tại một vị trí trong bộ câu đang soạn (chưa chốt).
export function removePicked(slot) {
  const game = g();
  const team = game.currentTeam;
  if (game.veDich.locked) {
    const err = new Error("Bộ câu đã chốt — hãy bấm Sửa lại trước khi điều chỉnh.");
    err.status = 400;
    throw err;
  }
  const picked = game.veDich.picked?.[team] || [];
  if (!Number.isInteger(slot) || slot < 0 || slot >= picked.length) {
    const err = new Error("Vị trí câu cần xóa không hợp lệ.");
    err.status = 400;
    throw err;
  }
  const next = picked.slice();
  next.splice(slot, 1);
  game.veDich.picked = { ...(game.veDich.picked || {}), [team]: next };
  saveDb();
  emit();
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