export function formatTime(total) {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

// Thời gian chi tiết theo mili giây → MM:SS.CC (phần lẻ trăm giây).
export function formatMs(ms) {
  const v = Math.max(0, Math.floor(ms));
  const m = Math.floor(v / 60000);
  const s = Math.floor((v % 60000) / 1000);
  const cc = Math.floor((v % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cc).padStart(2, "0")}`;
}
