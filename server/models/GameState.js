import { parseJson } from "./helpers.js";

export async function load(conn) {
  const rows = await conn.query("SELECT data FROM game_state WHERE id = 1");
  return rows.length ? parseJson(rows[0].data, null) : null;
}

export async function save(conn, data) {
  await conn.query("DELETE FROM game_state WHERE id = 1");
  await conn.query("INSERT INTO game_state (id, data) VALUES (?, ?)", [1, JSON.stringify(data)]);
}
