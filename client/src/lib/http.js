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
  if (!res.ok) {
    const err = new Error(data.error || `Máy chủ trả lời lỗi ${res.status}.`);
    err.status = res.status;
    throw err;
  }
  return data;
}
