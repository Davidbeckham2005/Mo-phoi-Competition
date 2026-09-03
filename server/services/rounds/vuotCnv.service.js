// MODULE VÒNG 2 — Vượt chướng ngại vật (vuot_cnv).
//
// Tách riêng toàn bộ logic xử lý bảng mảnh ghép / hàng ngang / chướng ngại vật ra khỏi
// game.service.js để tăng tính tái sử dụng và dễ bảo trì.
//
// Module này TỰ chứa các helper nội bộ (cornersResolved, keywordPoints, openKeywordWindow,
// lockRow, cnvView) và chỉ nhận các hàm dùng chung (emit, addScore, pauseTimer,
// resetDisplayToBoard, showQuestion, resetBuzzer) qua hàm init() — tránh import vòng (circular).
//
// Cách dùng (từ game.service.js):
//   import * as cnv from "./rounds/vuotCnv.service.js";
//   cnv.init({ emit, addScore, pauseTimer, resetDisplayToBoard, showQuestion, resetBuzzer });
//   cnv.selectRow(0); cnv.revealRow(1); ...

import { getDb, saveDb } from "../../models/store.js";
import { TEAM_ORDER } from "../../config/constants.js";

// Team hợp lệ = có trong TEAM_ORDER (round 2 chỉ chạy với top-4, nhưng đội "e"/"f"
// cũng là team hợp lệ khi đạt top-4).
function isKnownTeam(id) {
  return TEAM_ORDER.includes(id);
}

// Các hàm dùng chung được game.service.js tiêm vào khi khởi động module.
let emit = () => {};
let addScore = () => {};
let pauseTimer = () => {};
let resetDisplayToBoard = () => {};
let showQuestion = () => {};
let resetBuzzer = () => {};

export function init(deps) {
  if (!deps) return;
  if (deps.emit) emit = deps.emit;
  if (deps.addScore) addScore = deps.addScore;
  if (deps.pauseTimer) pauseTimer = deps.pauseTimer;
  if (deps.resetDisplayToBoard) resetDisplayToBoard = deps.resetDisplayToBoard;
  if (deps.showQuestion) showQuestion = deps.showQuestion;
  if (deps.resetBuzzer) resetBuzzer = deps.resetBuzzer;
}

function g() {
  return getDb().game;
}

// === HELPER NỘI BỘ ============================================================

// Góc nhìn Vòng 2 cho thí sinh/khán giả: số ô chữ mỗi hàng + từ chỉ khi đã mở
export function cnvView(db) {
  const p = db.game.puzzle || {};
  const cnv = db.questions.main.vuotCnv;
  return {
    rows: (cnv.rows || []).map((r, i) => ({
      letterCount: r.letterCount || String(r.answer || "").replace(/\s/g, "").length,
      status: p.rowsSolved?.[i] ? "open" : p.rowsLocked?.[i] ? "locked" : "hidden",
      word: p.rowsSolved?.[i] ? r.answer : "",
    })),
    keywordLetterCount: cnv.letterCount || String(cnv.keyword || "").replace(/\s/g, "").length,
    keyword: p.keywordSolved ? cnv.keyword : "",
    centerHint: p.centerRevealed ? cnv.centerHint : "",
    media: cnv.media && cnv.media.url ? { type: cnv.media.type || "image", url: cnv.media.url } : null,
  };
}

// 4 ô góc đã được xử lý hết (mở hoặc khóa vĩnh viễn)
export function cornersResolved(p = g().puzzle) {
  return [0, 1, 2, 3].every((i) => p.rowsSolved?.[i] || p.rowsLocked?.[i]);
}

export function keywordPoints() {
  const p = g().puzzle;
  const opened = p.rowsSolved.filter(Boolean).length;
  // Điểm khi đoán TRÚNG từ khóa CNV theo giai đoạn:
  //   sau hàng ngang 1 → 60 · sau 2 → 50 · sau 3 → 40 · sau 4 → 30
  //   sau khi mở ô trung tâm → 20 (đúng câu trung tâm được +10 riêng)
  if (p.centerRevealed) return 20;
  if (opened <= 1) return 60;
  if (opened === 2) return 50;
  if (opened === 3) return 40;
  return 30; // opened >= 4
}

// Mở CỬA SỔ đoán TỪ KHÓA: chạy sau MỖI hàng ngang vừa xử lý xong (mở hoặc khóa).
// CHỈ bật cờ keywordWindow (dùng để hiện hướng dẫn / ghi danh). Không mở chuông
// chính — vì đoán từ khóa giờ đi qua nút TỪ KHÓA riêng (puzzle.keywordClaim).
// Cửa sổ được đóng lại khi MC chọn ô kế tiếp (selectRow).
function openKeywordWindow() {
  const game = g();
  const p = game.puzzle;
  if (!p || p.keywordSolved) return;
  p.keywordWindow = true;
  game.buzzer = { open: false, locked: false, winner: null, order: [], blocked: [] };
}

// Trả lời sai lần 2 / tất cả sai: khóa mảnh vĩnh viễn (không mở lại, không ai được chấm ô này nữa)
export function lockRow(rowIndex) {
  const game = g();
  const i = Number(rowIndex);
  if (!(i >= 0 && i <= 3)) return;
  pauseTimer();
  game.puzzle.rowsLocked[i] = true;
  // Vừa xử lý xong một hàng ngang (khóa) → mở cửa sổ đoán từ khóa cho mốc này
  openKeywordWindow();
  saveDb();
  emit();
}

// === THAO TÁC CÔNG KHAI =======================================================

export function revealPiece(index, value = true) {
  const game = g();
  const i = Number(index);
  if (!(i >= 0 && i <= 4)) return;
  if (i !== 4) {
    game.puzzle.rowsSolved[i] = !!value;
    if (value) game.puzzle.rowsLocked[i] = false;
    // Mỗi mốc vừa mở mảnh → mở cửa sổ đoán từ khóa (không xóa danh sách đội đã đoán sai)
    if (value) openKeywordWindow();
  } else {
    game.puzzle.centerRevealed = !!value;
  }
  saveDb();
  emit();
}

export function selectRow(rowIndex) {
  const game = g();
  const p = game.puzzle;
  const i = Number(rowIndex);
  if (!(i >= 0 && i <= 3)) return;
  if (p.rowsSolved?.[i] || p.rowsLocked?.[i] || p.keywordSolved) return;
  p.currentRow = i;
  // Bắt đầu ô mới: đóng cửa sổ đoán từ khóa giữa vòng (keywordBlocked vẫn giữ nguyên),
  // dọn chuông của ô trước, xóa hiệu ứng trả lời vừa rồi
  p.keywordWindow = false;
  p.lastResult = null;
  // Mở ô mới → chuẩn bị nhận bài tự luận của các đội
  p.rowPhase = "open";
  p.submissions = {};
  p.corrections = {};
  p.ranked = [];
  game.buzzer = { open: false, locked: false, winner: null, order: [], blocked: [] };
  game.questionStatus = "idle";
  game.display.mode = "puzzle";
  game.display.answerRevealed = false;
  saveDb();
  emit();
  showQuestion();
}

// Đội trả lời đúng: mở đúng 1 mảnh góc tương ứng hàng ngang
export function revealRow(rowIndex) {
  const game = g();
  const i = Number(rowIndex);
  if (!(i >= 0 && i <= 3)) return;
  if (game.puzzle.rowsLocked?.[i]) return; // khóa vĩnh viễn, không mở lại
  pauseTimer();
  game.puzzle.rowsSolved[i] = true;
  // Vừa xử lý xong một hàng ngang → mở cửa sổ đoán từ khóa cho mốc này
  openKeywordWindow();
  saveDb();
  emit();
}

export function revealCenter(teamId = null) {
  const game = g();
  if (!cornersResolved()) return; // chỉ được chọn khi 4 ô góc đã xử lý hết
  if (game.puzzle.centerRevealed) return; // không mở lại / không cộng điểm trùng
  game.puzzle.centerRevealed = true;
  // Đúng câu hỏi ô trung tâm → đội đó được thêm 10 điểm
  const tid = isKnownTeam(teamId) ? teamId : null;
  if (tid) addScore(tid, 10);
  saveDb();
  emit();
}

export function revealAllPuzzle() {
  const game = g();
  game.puzzle.rowsSolved = [true, true, true, true];
  game.puzzle.rowsLocked = [false, false, false, false];
  game.puzzle.centerRevealed = true;
  // "Mở hết" dùng sớm khi chưa đủ 4 góc cũng cần mở cửa sổ đoán từ khóa
  openKeywordWindow();
  saveDb();
  emit();
}

export function solveKeyword(teamId, correct) {
  const game = g();
  if (game.round !== "vuot_cnv" || game.puzzle?.keywordSolved) return;
  // Được đoán từ khóa BẤT KỲ LÚC NÀO đội đã ghi danh (nút TỪ KHÓA), hoặc trong
  // cửa sổ giữa vòng / sau khi đủ 4 góc. Không còn bị cấm chờ giải hàng ngang.
  const pts = keywordPoints();
  // Đội đang nắm quyền đoán: ưu tiên người đã ghi danh (puzzle.keywordClaim),
  // fallback về đội truyền vào (đủ 4 góc thường MC chọn trực tiếp).
  const tid = game.puzzle?.keywordClaim || teamId;
  if (correct) {
    game.puzzle.keywordSolved = true;
    game.puzzle.keywordWinner = tid;
    game.puzzle.keywordPointsAwarded = pts;
    game.puzzle.keywordWindow = false;
    game.puzzle.keywordClaim = null;
    addScore(tid, pts);
    revealAllPuzzle();
    game.display.mode = "puzzle";
    game.display.answerRevealed = true;
    game.display.answer = getDb().questions.main.vuotCnv.keyword;
  } else {
    // Đoán sai: đội này bị CHẶN khỏi đoán từ khóa cho tới khi ra từ khóa,
    // và nhả quyền nắm giữ (keywordClaim) để đội khác có thể ghi danh tiếp.
    const kb = game.puzzle.keywordBlocked || [];
    if (!kb.includes(tid)) game.puzzle.keywordBlocked = [...kb, tid];
    // Thêm quy tắc: đoán TỪ KHÓA (chướng ngại vật) SAI → đội này bị cấm ghi danh
    // đoán từ khóa tiếp theo cho tới hết vòng.
    const rb = game.puzzle.rowBanned || [];
    if (!rb.includes(tid)) game.puzzle.rowBanned = [...rb, tid];
    game.puzzle.keywordClaim = null;
    // Không mở chuông chính khi đoán từ khóa SAI — đội đoán từ khóa dùng lại nút
    // TỪ KHÓA riêng (puzzle.keywordClaim), chuông chính chỉ dành cho cướp quyền Về đích.
    resetBuzzer(false);
    // Cả 4 đội đã đoán sai → không còn ai được đoán: tự mở đáp án (không tính điểm)
    const active = game.qualifiedTeams?.length
      ? game.qualifiedTeams
      : TEAM_ORDER.slice(0, 4);
    const allBlocked = active.every((id) =>
      game.puzzle.keywordBlocked.includes(id)
    );
    if (allBlocked) {
      game.puzzle.keywordSolved = true;
      game.puzzle.keywordWinner = null;
      game.puzzle.keywordWindow = false;
      game.display.mode = "puzzle";
      game.display.answerRevealed = true;
      game.display.answer = getDb().questions.main.vuotCnv.keyword;
      revealAllPuzzle();
      game.buzzer.open = false;
    }
  }
  saveDb();
  emit();
}

// === TRẢ LỜI TỰ LUẬN GỬI VỀ MC (tham khảo vòng 3 Tăng tốc) ====================
// Mọi đội cùng nộp đáp án cho câu hàng ngang hiện tại; hệ thống ghi nhận thời gian
// nộp (elapsed, giây thập phân tính từ lúc hiện câu). MC chấm đúng/sai từng đội rồi
// bấm "Chốt" — điểm theo độ nhanh giữa các đội đúng: nhất 40 · nhì 30 · ba 20 · tư 10.
// Trả lời sai = 0 điểm (KHÔNG bị trừ). Có ≥1 đội đúng → mở mảnh; tất cả sai → khóa.

// Điểm khi trả lời đúng theo độ NANH (xếp giữa các đội đúng).
export const ROW_POINTS = [40, 30, 20, 10];

// Số giây miễn phí để bấm chấm: rowChấm không dùng chuông cướp nên không cần.
function rowElapsed() {
  const game = g();
  const dur = game.timer.duration || 0;
  const now = Date.now();
  if (game.timer.running && game.timer.endsAt) {
    return Math.max(0, Math.min(dur, (now - (game.timer.endsAt - dur * 1000)) / 1000));
  }
  return Math.max(0, dur - (game.timer.remaining || 0));
}

// Đội gửi đáp án tự luận về MC (ghi nhận thời gian nộp).
export function submitRowAnswer(teamId, answer) {
  const game = g();
  const p = game.puzzle;
  if (game.round !== "vuot_cnv" || p.keywordSolved) return { ok: false, reason: "closed" };
  if (p.rowPhase !== "open") return { ok: false, reason: "closed" };
  if (game.questionStatus !== "showing") return { ok: false, reason: "not-open" };
  const prev = p.submissions[teamId];
  if (prev) return { ok: false, reason: "already" };
  p.submissions[teamId] = {
    answer: String(answer || "").trim(),
    elapsed: rowElapsed(),
  };
  saveDb();
  emit();
  return { ok: true };
}

// MC chấm đúng/sai một đội (cho phép sửa lại trước khi chốt).
export function markRowAnswer(teamId, correct) {
  const game = g();
  if (!game.puzzle?.submissions?.[teamId]) return;
  game.puzzle.corrections[teamId] = !!correct;
  saveDb();
  emit();
}

// Đóng nhận bài (MC bấm hoặc tự động khi hết giờ): chuyển sang giai đoạn chấm.
export function closeRowSubmissions() {
  const game = g();
  const p = game.puzzle;
  if (p.rowPhase !== "open") return;
  p.rowPhase = "closed";
  saveDb();
  emit();
}

// Xếp hạng các bài nộp theo độ nhanh + nhận định đúng/sai + điểm dự kiến.
export function computeRowRanked() {
  const game = g();
  const p = game.puzzle;
  const subs = Object.entries(p.submissions || {}).map(([teamId, s]) => ({
    teamId,
    answer: s.answer,
    elapsed: s.elapsed,
  }));
  const byElapsed = [...subs].sort((a, b) => a.elapsed - b.elapsed);
  const corr = p.corrections || {};
  const correct = byElapsed
    .filter((s) => corr[s.teamId] === true)
    .map((s, i) => ({ ...s, place: i + 1, points: ROW_POINTS[i] || 10 }));
  const correctMap = {};
  correct.forEach((s) => (correctMap[s.teamId] = s));
  return byElapsed.map((s) => {
    const c = correctMap[s.teamId];
    return {
      teamId: s.teamId,
      answer: s.answer,
      elapsed: s.elapsed,
      correct: corr[s.teamId] === true ? true : corr[s.teamId] === false ? false : null,
      points: c ? c.points : 0,
      place: c ? c.place : null,
    };
  });
}

// MC "Chốt điểm" cho ô hiện tại: cộng điểm theo tốc độ, mở/khóa mảnh, sang đội kế.
export function settleRow() {
  const game = g();
  const p = game.puzzle;
  if (game.round !== "vuot_cnv" || p.keywordSolved || p.rowPhase === "scored") return;
  const ranked = computeRowRanked();
  p.ranked = ranked;
  p.rowPhase = "scored";
  // Cộng điểm cho các đội ĐÚNG theo độ nhanh (sai = 0, không trừ).
  ranked.filter((r) => r.correct === true && r.points > 0).forEach((r) => addScore(r.teamId, r.points));
  // Phản hồi kết quả ô vừa xử lý (cho màn Đội & Khán giả).
  const anyCorrect = ranked.some((r) => r.correct === true);
  p.lastResult = {
    correct: anyCorrect,
    teamId: anyCorrect ? (ranked.find((r) => r.correct === true && r.place === 1)?.teamId ?? null) : null,
    row: p.currentRow,
    pts: anyCorrect ? (ranked.find((r) => r.correct === true && r.place === 1)?.points || 0) : 0,
  };
  // Có ≥1 đội đúng → mở mảnh; tất cả sai → khóa vĩnh viễn. Cả hai đều mở cửa sổ từ khóa.
  if (anyCorrect) {
    revealRow(p.currentRow);
  } else {
    lockRow(p.currentRow);
  }
  resetDisplayToBoard();
  saveDb();
  emit();
}

export function showPuzzle() {
  const game = g();
  game.display.mode = "puzzle";
  game.display.answerRevealed = game.puzzle.keywordSolved;
  game.display.answer = game.puzzle.keywordSolved
    ? getDb().questions.main.vuotCnv.keyword
    : "";
  game.display.question = getDb().questions.main.vuotCnv.hint;
  game.display.note = `Từ khóa: ${getDb().questions.main.vuotCnv.letterCount} chữ cái (không tính dấu cách)`;
  saveDb();
  emit();
}
