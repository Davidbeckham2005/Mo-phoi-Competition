// Gom toàn bộ logic phái sinh trạng thái Vòng 2 (Vượt chướng ngại vật).
// Tất cả phép tính phái sinh từ game.puzzle đều được đặt ở đây để MC,
// Khán giả và Thí sinh dùng chung — tránh lặp lại và lộn xộn.

const EMPTY = [false, false, false, false];

function bools(arr, fallback = EMPTY) {
  return Array.isArray(arr) && arr.length >= 4 ? arr : fallback;
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
  return [0, 1, 2, 3].map((i) => rowStatus(p, i));
}

export const isOpen = (p, i) => rowStatus(p, i) === "open";
export const isLocked = (p, i) => rowStatus(p, i) === "locked";

export const solvedCount = (p) => rowsStatus(p).filter((s) => s === "open").length;

// Đã xử lý xong cả 4 góc (mở hoặc khóa)?
export function cornersDone(p) {
  return [0, 1, 2, 3].every((i) => rowStatus(p, i) !== "hidden");
}

// Giai đoạn của vòng 2: "rows" (đang chơi hàng ngang) | "keyword" (đoán từ khóa) | "done" (đã xong)
export function cnvPhase(p) {
  if (p?.keywordSolved) return "done";
  if (cornersDone(p)) return "keyword";
  return "rows";
}

export const isRowPhase = (p) => cnvPhase(p) === "rows";
export const isKeywordPhase = (p) => cnvPhase(p) === "keyword";

// Hàng đang chọn, ngăn giá trị ngoài 0..3
export function currentRow(p) {
  const r = Number(p?.currentRow);
  return Number.isInteger(r) && r >= 0 && r <= 3 ? r : 0;
}

// Trạng thái keyword từ góc nhìn đã gom: "hidden" | "center" | "all" | "solved"
export function keywordReveal(p) {
  if (p?.keywordSolved) return "solved";
  if (p?.centerRevealed) return "center";
  return "hidden";
}
