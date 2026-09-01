// MODULE VÒNG 2 — Vượt chướng ngại vật (vuot_cnv).
//
// Tách riêng toàn bộ logic xử lý bảng mảnh ghép / hàng ngang / chướng ngại vật ra khỏi
// game.service.js để tăng tính tái sử dụng và dễ bảo trì.
//
// Module này TỰ chứa các helper nội bộ (cornersResolved, keywordPoints, openKeywordWindow,
// advancePicker, lockRow, cnvView) và chỉ nhận các hàm dùng chung (emit, addScore, pauseTimer,
// resetDisplayToBoard, showQuestion, resetBuzzer) qua hàm init() — tránh import vòng (circular).
//
// Cách dùng (từ game.service.js):
//   import * as cnv from "./rounds/vuotCnv.service.js";
//   cnv.init({ emit, addScore, pauseTimer, resetDisplayToBoard, showQuestion, resetBuzzer });
//   cnv.selectRow(0); cnv.revealRow(1); ...

import { getDb, saveDb } from "../../models/store.js";

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

// Sang đội kế tiếp trong hàng đợi (sau khi ô đã được giải quyết xong)
export function advancePicker() {
  const p = g().puzzle;
  p.turnIndex = (p.turnIndex ?? 0) + 1;
}

// Trả lời sai lần 2: khóa mảnh vĩnh viễn
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
  if (p.orderPending) {
    throw new Error("Đang chờ xếp thứ tự đội bằng điểm — hãy chốt xong thứ tự trước.");
  }
  // Thứ tự trả lời theo hàng đợi từ đầu vòng: lọc bỏ đội bị CẤM trả lời hàng ngang
  // (đoán từ khóa sai), rồi lấy đội kế tiếp trong danh sách còn được phép, quay vòng.
  // Hết 1 vòng các đội còn được phép mới quay lại đội đầu.
  const banned = p.rowBanned || [];
  const order = p.order || [];
  const eligible = order.filter((id) => !banned.includes(id));
  if (eligible.length === 0) {
    throw new Error("Đã hết đội còn được trả lời hàng ngang — chuyển sang đoán từ khóa.");
  }
  // Duyệt theo thứ tự quay vòng GỐC (p.order) và BỎ QUA các đội bị CẤM trả lời hàng
  // ngang (đoán từ khóa sai). Không dùng chỉ số trên mảng eligible đã bị lọc — vì khi
  // một đội bị khóa, eligible.length thu nhỏ còn turnIndex vẫn đếm trên thứ tự gốc làm
  // đội kế tiếp bị nhảy cóc sai. Ví dụ order=[A,B,C,D], B bị cấm, turnIndex=2 → đội kế
  // tiếp phải là C (theo lượt) chứ không phải D.
  const start = p.turnIndex ?? 0;
  let teamId = null;
  for (let k = 0; k < order.length; k++) {
    const id = order[(start + k) % order.length];
    if (!banned.includes(id)) {
      teamId = id;
      break;
    }
  }
  p.teamForRow = p.teamForRow || [null, null, null, null];
  const owner = p.teamForRow[i];
  if (owner && owner !== teamId) {
    const rowActive =
      (p.currentRow === i && game.questionStatus !== "idle") || p.awaitingSteal;
    if (rowActive) {
      throw new Error(`Ô này đang thi đấu thuộc đội ${String(owner).toUpperCase()} — không chuyển sang đội ${teamId.toUpperCase()} được.`);
    }
  }
  p.teamForRow[i] = teamId;
  game.currentTeam = teamId;
  p.currentRow = i;
  p.awaitingSteal = false;
  // Bắt đầu ô mới: đóng cửa sổ đoán từ khóa giữa vòng (keywordBlocked vẫn giữ nguyên),
  // dọn chuông và danh sách đội bị chặn cướp của ô trước, xóa hiệu ứng trả lời vừa rồi
  p.keywordWindow = false;
  p.lastResult = null;
  game.buzzer = { open: false, locked: false, winner: null, order: [], blocked: [] };
  game.questionStatus = "idle";
  game.display.mode = "puzzle";
  game.display.answerRevealed = false;
  saveDb();
  emit();
  showQuestion();
}

// MC tự xếp thứ tự khi có đội bằng điểm: bấm từng đội vào thứ tự (bấm lại để bỏ).
// Đủ 4 đội → chốt thành thứ tự chính thức.
export function pickOrder(teamId) {
  const p = g().puzzle;
  if (!p.orderPending) return;
  if (!["a", "b", "c", "d"].includes(teamId)) return;
  p.pendingPick = p.pendingPick || [];
  if (p.pendingPick.includes(teamId)) {
    p.pendingPick = p.pendingPick.filter((id) => id !== teamId);
  } else {
    p.pendingPick.push(teamId);
  }
  if (p.pendingPick.length === 4) {
    p.order = [...p.pendingPick];
    p.orderPending = false;
  }
  saveDb();
  emit();
}

// Không đội nào cướp: đóng cửa cướp, KHÓA VĨNH VIỄN ô hàng ngang này (không mở lại,
// không tính điểm cho ai), quay về bảng và sang đội kế tiếp.
// Được gọi từ MC (nút "bỏ qua") HOẶC tự động khi hết giờ giành quyền mà không ai bấm chuông.
export function skipSteal() {
  const game = g();
  const p = game.puzzle;
  if (!p.awaitingSteal) return;
  p.awaitingSteal = false;
  lockRow(p.currentRow); // khóa vĩnh viễn (mở cửa sổ từ khóa, saveDb, emit)
  resetDisplayToBoard();
  game.buzzer = { open: false, locked: false, winner: null, order: [], blocked: [] };
  pauseTimer();
  advancePicker();
  saveDb();
  emit();
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
  const tid = ["a", "b", "c", "d"].includes(teamId) ? teamId : null;
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
    // Thêm quy tắc mới: đoán TỪ KHÓA (chướng ngại vật) SAI → đội này không được
    // phép trả lời các câu hỏi HÀNG NGANG còn lại (không làm đội chính, không cướp).
    const rb = game.puzzle.rowBanned || [];
    if (!rb.includes(tid)) game.puzzle.rowBanned = [...rb, tid];
    game.puzzle.keywordClaim = null;
    // Không mở chuông chính khi đoán từ khóa SAI — đội đoán từ khóa dùng lại nút
    // TỪ KHÓA riêng (puzzle.keywordClaim), chuông chính chỉ dành cho trả lời hàng ngang.
    resetBuzzer(false);
    // Cả 4 đội đã đoán sai → không còn ai được trả lời: tự mở đáp án (không tính điểm)
    const allBlocked = ["a", "b", "c", "d"].every((id) =>
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
