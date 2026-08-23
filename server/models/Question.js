import { parseJson } from "./helpers.js";

export async function loadSoKhao(conn) {
  const rows = await conn.query("SELECT * FROM questions_so_khao ORDER BY sort_order, id");
  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    options: parseJson(r.options, []),
    answer: r.answer,
    topic: r.topic,
  }));
}

export async function saveSoKhao(conn, list) {
  await conn.query("DELETE FROM questions_so_khao");
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    await conn.query(
      "INSERT INTO questions_so_khao (id, question, options, answer, topic, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [q.id, q.question, JSON.stringify(q.options || []), q.answer, q.topic || "", i]
    );
  }
}

export async function loadMain(conn) {
  const rows = await conn.query("SELECT data FROM questions_main WHERE id = 1");
  return rows.length ? parseJson(rows[0].data, null) : null;
}

export async function saveMain(conn, data) {
  await conn.query("DELETE FROM questions_main WHERE id = 1");
  await conn.query("INSERT INTO questions_main (id, data) VALUES (?, ?)", [1, JSON.stringify(data)]);
}
