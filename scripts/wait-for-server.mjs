// Chờ backend (port 3001) sẵn sàng trước khi khởi chạy client (vite).
// Tránh lỗi "[vite] ws proxy socket error" ngay lúc khởi động: trình duyệt mở trang
// trước khi socket.io nói được với server → websocket proxy fail rồi tự kết nối lại.
const PORT = Number(process.env.PORT) || 3001;
const URL = `http://localhost:${PORT}/api/public`;
const TIMEOUT_S = Number(process.env.WAIT_SERVER_TIMEOUT) || 30;
const started = Date.now();

async function wait() {
  while (Date.now() - started < TIMEOUT_S * 1000) {
    try {
      const res = await fetch(URL);
      // Server đã listen (kể cả trả 4xx/5xx) là được — chỉ cần cổng mở.
      if (res.ok || res.status >= 400) {
        console.log(`[wait-for-server] Backend sẵn sàng tại http://localhost:${PORT}`);
        process.exit(0);
      }
    } catch {
      // chưa mở cổng → đợi tiếp
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.warn(
    `[wait-for-server] Không thấy backend http://localhost:${PORT} sau ${TIMEOUT_S}s — vẫn khởi client.`
  );
  process.exit(0);
}

wait();