import { getDb } from "../models/store.js";

export function requirePin(req, res, next) {
  const pin = req.headers["x-admin-pin"] || req.body?.pin || req.query.pin;
  if (pin !== getDb().settings.pin) {
    return res.status(401).json({ error: "Sai mã PIN ban tổ chức.", pin });
  }
  next();
}
