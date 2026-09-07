// MODULE VÒNG 4 — Về đích (ve_dich).
//
// Dữ liệu câu hỏi KHÔNG phụ thuộc số lượng đội: một NGÂN HÀNG CÂU CHUNG chứa toàn bộ
// câu hỏi của vòng (không gắn teamId). Từ ngân hàng chung, MC chọn 1 trong 3 gói —
// mỗi gói có đúng 4 câu theo cấu trúc cố định:
//   Gói 60  = câu 10 + 10 + 20 + 20
//   Gói 80  = câu 10 + 20 + 20 + 30
//   Gói 100 = câu 20 + 20 + 30 + 30
// Server TỰ lấy câu từ ngân hàng chung theo đúng cấu trúc gói, không trùng câu trong
// gói. Câu đã được đưa vào gói của một đội được đánh dấu trong usedQuestionIds (cấp
// VÒNG, không phải cấp đội) → không bao giờ chọn lại cho đội khác.
//
// Câu hỏi thuộc các mức 10đ/20đ/30đ; thời gian trả lời theo ANSWER_SECONDS.
// Ngân hàng tối thiểu: 12×10 + 24×20 + 12×30 = 48 câu. Thiếu thì hệ thống tự tạo
// câu nháp (auto: true) để Admin sửa nội dung.
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

// Các gói câu hỏi hợp lệ của Vòng 4 (tổng điểm gói → cấu trúc 4 câu).
export const PACKAGES = {
  60: [10, 10, 20, 20],
  80: [10, 20, 20, 30],
  100: [20, 20, 30, 30],
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
    // Ngữ cảnh đội chọn câu đã trả lời SAI (đang chờ kết quả cướp quyền): điểm trừ của đội
    // chọn câu chỉ được quyết định khi cửa sổ cướp quyền kết thúc. null = không treo.
    stealPending: null,
    // Đã chốt bộ 4 câu cho đội hiện tại chưa? (false = MC đang soạn/chỉnh, true = đưa cho thí sinh thi)
    locked: false,
    // Giai đoạn thi: "soan" (chưa chốt) | "countdown" (đang đếm 3-2-1) | "answering" (đang trả lời)
    phase: "soan",
    // Các câu hỏi đã CHỌN cho từng đội (mỗi đội đúng 1 gói = 4 câu, mảng các id tham chiếu
    // NGÂN HÀNG CHUNG). Khóa được tạo động khi đội chọn gói — không hard-code số đội.
    picked: {},
    // Câu đang thi trong danh sách picked của đội hiện tại.
    pickIndex: 0,
    // id các câu đã được đưa vào gói của MỘT đội nào đó (cấp VÒNG, không phải cấp đội).
    // Câu trong đây không bao giờ được chọn lại cho đội khác. Chỉ ghi thêm, không gỡ.
    usedQuestionIds: [],
  };
}

// Ngân hàng câu hỏi CHUNG tối thiểu ở mỗi mức điểm (12×10, 24×20, 12×30).
export const BANK_REQUIREMENTS = { 10: 12, 20: 24, 30: 12 };
// Tổng câu tối thiểu trong ngân hàng chung: 12 + 24 + 12 = 48.
export const BANK_TOTAL = Object.values(BANK_REQUIREMENTS).reduce((a, b) => a + b, 0);

// Chuẩn mức điểm câu về mức hợp lệ của vòng 4 (10/20/30). Dữ liệu cũ có thể để 40đ.
function normalizePoints(p) {
  const n = Number(p) || 20;
  if (n <= 10) return 10;
  if (n <= 20) return 20;
  return 30;
}

// Chuyển ngân hàng câu veDich về mảng CHUNG, KHÔNG phụ thuộc đội.
// Dữ liệu cũ (object { teamId: [câu...] }) được dẹp phẳng thành mảng chung, khử trùng theo id
// và chuẩn mức điểm về 10/20/30. Nếu đã là mảng thì giữ nguyên (chỉ chuẩn từng câu).
export function normalizeBank(list) {
  if (list && typeof list === "object" && !Array.isArray(list)) {
    const seen = new Set();
    const out = [];
    for (const tid of Object.keys(list)) {
      const arr = Array.isArray(list[tid]) ? list[tid] : [];
      for (const q of arr) {
        if (!q || typeof q !== "object") continue;
        const id = q.id || `vd-migrate-${out.length}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          id,
          question: q.question || "",
          answer: q.answer || "",
          ...q,
          points: normalizePoints(q.points),
          auto: !!q.auto,
        });
      }
    }
    return out;
  }
  const arr = Array.isArray(list) ? list : [];
  return arr.map((q) => (q && typeof q === "object" ? { ...q, points: normalizePoints(q.points) } : q));
}

// Hằng tham chiếu ngân hàng câu CHUNG Về đích trong db.questions.main (mảng).
function bank(db) {
  if (!Array.isArray(db.questions.main.veDich)) db.questions.main.veDich = [];
  return db.questions.main.veDich;
}

// Tự tạo câu mới đúng mức điểm (bản nháp) khi ngân hàng chung thiếu.
function makeQuestion(points) {
  return {
    id: `vd-auto-${points}-${Math.random().toString(36).slice(2, 8)}`,
    points,
    question: `(Câu tự tạo) ${points} điểm — hãy sửa nội dung.`,
    answer: "",
    auto: true,
  };
}

// Đảm bảo ngân hàng CHUNG có đủ câu theo BANK_REQUIREMENTS (12×10, 24×20, 12×30).
// Nếu thiếu (hoặc dữ liệu cũ gắn đội), tự chuẩn hóa/tạo câu bản nháp (auto: true).
// Trả về số câu đã tạo thêm.
export function ensureBank() {
  const db = getDb();
  const b = normalizeBank(bank(db));
  db.questions.main.veDich = b;
  let created = 0;
  for (const [pts, need] of Object.entries(BANK_REQUIREMENTS)) {
    const level = Number(pts);
    const have = b.filter((x) => Number(x.points) === level).length;
    for (let i = have; i < need; i += 1) {
      b.push(makeQuestion(level));
      created += 1;
    }
  }
  if (created > 0) {
    saveDb();
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

// Tính điểm cho Vòng Về đích theo đúng bảng luật câu thường + Ngôi sao hy vọng.
// Mọi mức đều dựa trên điểm GỐC P (questionPoints) của câu, không hard-code 10/20/30.
//   outcome:
//     "selecting-correct" — đội chọn câu trả lời ĐÚNG ngay           → +P (NSHV: +2P).
//     "no-answer"         — chọn câu sai, KHÔNG ai giành quyền/trả lời
//                                                                    → 0 (NSHV: −P/2).
//     "steal-correct"     — chọn câu sai, đội khác giành quyền ĐÚNG → −P / +P
//                                                                    (NSHV: −2P / +2P).
//     "steal-wrong"       — chọn câu sai, đội khác giành quyền SAI  → 0 / −P
//                                                                    (NSHV: −P/2 / −P).
// Trả về { selecting, stealing } = số điểm cộng (+) / trừ (−) cho đội chọn câu và đội
// giành quyền (stealing = 0 khi không có đội giành quyền).
export function calculateAnswerScore({ questionPoints, isStarOfHope, outcome }) {
  const P = Number(questionPoints) || 0;
  const star = !!isStarOfHope;
  let r;
  switch (outcome) {
    case "selecting-correct":
      r = { selecting: star ? 2 * P : P, stealing: 0 };
      break;
    case "no-answer":
      r = { selecting: star ? -(P / 2) : 0, stealing: 0 };
      break;
    case "steal-correct":
      r = { selecting: star ? -2 * P : -P, stealing: star ? 2 * P : P };
      break;
    case "steal-wrong":
      r = { selecting: star ? -(P / 2) : 0, stealing: -P };
      break;
    default:
      r = { selecting: 0, stealing: 0 };
  }
  // Tránh -0 khi P = 0.
  return { selecting: r.selecting || 0, stealing: r.stealing || 0 };
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

// Lấy câu hỏi hiện tại của đội đang thi (theo picked[pickIndex], tìm trong ngân hàng CHUNG).
// Chỉ trả về câu sau khi bộ câu đã CHỐT — lúc chưa chốt, chưa có câu nào được đưa ra thi.
export function findQuestion(game = g()) {
  const team = game.currentTeam;
  if (!game.veDich.locked) return null;
  const qids = game.veDich.picked?.[team] || [];
  const qid = qids[game.veDich.pickIndex] || null;
  if (!qid) return null;
  return (normalizeBank(getDb().questions.main.veDich) || []).find((q) => q.id === qid) || null;
}

// Mức điểm của câu đang thi (ưu tiên theo câu đã chọn, fallback về packagePoints).
function currentPoints(game = g()) {
  const q = findQuestion(game);
  return q?.points || game?.veDich?.packagePoints || 20;
}

// MC chọn gói câu hỏi cho đội đang thi. Server TỰ lấy 4 câu từ NGÂN HÀNG CHUNG
// theo đúng cấu trúc gói (PACKAGES), không lấy lại câu đã dùng (usedQuestionIds).
//   - packagePoints bắt buộc là 60, 80 hoặc 100.
//   - Chỉ cho phép khi chưa chốt (locked == false) — sau khi chốt phải unlock để đổi gói.
//   - Nếu không đủ câu ở mức cần thiết → trả lỗi rõ ràng, không tự chọn bừa.
//   - Trả về mảng id của 4 câu đã chọn.
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
  const bankArr = normalizeBank(getDb().questions.main.veDich) || [];
  // Câu đã sử dụng ở cấp VÒNG: usedQuestionIds (lũy kế theo vòng) + mọi câu đang nằm trong
  // gói của CÁC đội (kể cả gói cũ của chính đội này nếu đang đổi sang gói khác) — không được
  // lấy lại. Đổi gói trước khi chốt không "giải phóng" câu cũ để tránh trùng câu giữa các lượt.
  const usedIds = new Set(game.veDich.usedQuestionIds || []);
  for (const qids of Object.values(game.veDich.picked || {})) {
    (qids || []).forEach((qid) => usedIds.add(qid));
  }
  const pickedIds = [];
  const needByLevel = structure.reduce((acc, lv) => { acc[lv] = (acc[lv] || 0) + 1; return acc; }, {});
  for (const level of Object.keys(needByLevel)) {
    const lv = Number(level);
    const need = needByLevel[lv];
    const candidates = bankArr.filter((x) => Number(x.points) === lv && !usedIds.has(x.id));
    if (candidates.length < need) {
      const err = new Error(
        `Ngân hàng câu chung không đủ câu ${lv} điểm chưa dùng: cần ${need}, hiện còn ${candidates.length}. Hãy bổ sung câu ${lv} điểm trong ngân hàng rồi thử lại.`
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
  // Đánh dấu câu đã được đưa vào gói của một đội — cấp VÒNG, các đội sau không lấy lại.
  game.veDich.usedQuestionIds = [...(game.veDich.usedQuestionIds || []), ...pickedIds];
  saveDb();
  emit();
  return pickedIds;
}

// Chốt bộ 4 câu — đưa câu hỏi cho thí sinh trả lời (bắt đầu từ câu 1).
export function lockPackage() {
  const game = g();
  const team = game.currentTeam;
  const picked = game.veDich.picked?.[team] || [];
  if (picked.length !== 4) {
    const err = new Error(`Bộ câu phải đủ 4 câu (hiện có ${picked.length}) để bắt đầu thi.`);
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
  if (!game.veDich.locked || game.veDich.picked?.[game.currentTeam]?.length !== 4) {
    const err = new Error("Chưa chốt đủ bộ 4 câu để bắt đầu thi.");
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
  game.veDich.stealPending = null;
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
  game.veDich.stealPending = null;
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
  game.veDich.stealPending = null;
  game.veDich.phase = "soan";
  saveDb();
  emit();
}