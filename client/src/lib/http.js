import { getPin } from "./session.js";

export async function request(path, { method = "GET", body, pin } = {}) {
  const headers = { "Content-Type": "application/json" };
  const usePin = pin ?? getPin();
  if (usePin) headers["x-admin-pin"] = usePin;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Lỗi kết nối máy chủ.");
  return data;
}
