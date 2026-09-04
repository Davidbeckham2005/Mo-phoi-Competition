import { parseJson } from "./helpers.js";

export async function loadAll(conn) {
  const rows = await conn.query("SELECT * FROM teams ORDER BY id");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    accent: r.accent,
    score: r.score,
    memberIds: parseJson(r.member_ids, []),
    pass: r.pass || "",
    eliminated: !!r.eliminated,
  }));
}
// fix sau...
export async function saveAll(conn, teams) {
  await conn.query("DELETE FROM teams");
  for (const t of teams) {
    await conn.query(
      "INSERT INTO teams (id, name, color, accent, score, member_ids, pass, eliminated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [t.id, t.name, t.color, t.accent, t.score, JSON.stringify(t.memberIds || []), t.pass || "", t.eliminated ? 1 : 0]
    );
  }
}
