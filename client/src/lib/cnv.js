// Gom toàn bộ logic phái sinh trạng thái Vòng 2 (Vượt chướng ngại vật).
// Tất cả phép tính phái sinh từ game.puzzle đều được đặt ở đây để MC,
// Khán giả và Thí sinh dùng chung — tránh lặp lại và lộn xộn.
// Round 2 có 5 mảnh ghép = 5 HÀNG NGANG đều là câu hỏi. Từ khóa (chướng ngại vật)
// chỉ nhận biết bằng cách NHÌN bức ảnh hoàn chỉnh khi mở đủ 5 mảnh — không có câu hỏi riêng.

const ROW_COUNT = 5;
const EMPTY = [false, false, false, false, false];

function bools(arr, fallback = EMPTY) {
  return Array.isArray(arr) && arr.length >= ROW_COUNT ? arr : fallback;
}

// Trạng thái của một hàng ngang: "hidden" | "open" | "locked"
export function rowStatus(p, i) {
  const solved = bools(p?.rowsSolved);
  const locked = bools(p?.rowsLocked);
  if (locked[i]) return "locked";
  if (solved[i]) return "open";
  return "hidden";
}

export function rowsStatus(p) {
  return [0, 1, 2, 3, 4].map((i) => rowStatus(p, i));
}

export const isOpen = (p, i) => rowStatus(p, i) === "open";
export const isLocked = (p, i) => rowStatus(p, i) === "locked";

export const solvedCount = (p) => rowsStatus(p).filter((s) => s === "open").length;

// Đã xử lý xong cả 5 mảnh (mở hoặc khóa)?
export function cornersDone(p) {
  return [0, 1, 2, 3, 4].every((i) => rowStatus(p, i) !== "hidden");
}

// Giai đoạn của vòng 2:
//   "rows"    – đang chơi hàng ngang (chưa có mốc nào)
//   "window"  – cửa sổ ĐOÁN TỪ KHÓA giữa vòng (vừa xử lý xong một hàng ngang,
//               chuông mở cho các đội giành quyền đoán với mức điểm theo mốc)
//   "keyword" – đoán từ khóa (đã đủ 5 mảnh)
//   "done"    – đã ra từ khóa
export function cnvPhase(p) {
  if (p?.keywordSolved) return "done";
  if (cornersDone(p)) return "keyword";
  if (p?.keywordWindow) return "window";
  return "rows";
}

export const isRowPhase = (p) => cnvPhase(p) === "rows";
export const isKeywordPhase = (p) => cnvPhase(p) === "keyword";
export const isKeywordWindow = (p) => cnvPhase(p) === "window";

// Đội có thể bấm chuông đoán TỪ KHÓA (cửa sổ giữa vòng hoặc giai đoạn đủ 5 mảnh)?
export const keywordGuessOpen = (p) => cnvPhase(p) === "keyword" || cnvPhase(p) === "window";

// Hàng đang chọn, ngăn giá trị ngoài 0..4
export function currentRow(p) {
  const r = Number(p?.currentRow);
  return Number.isInteger(r) && r >= 0 && r < ROW_COUNT ? r : 0;
}

// Trạng thái keyword từ góc nhìn đã gom: "hidden" | "all" | "solved"
export function keywordReveal(p) {
  if (p?.keywordSolved) return "solved";
  return "hidden";
}
