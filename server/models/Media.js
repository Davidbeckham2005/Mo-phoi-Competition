export async function loadAll(conn) {
  const rows = await conn.query("SELECT * FROM media ORDER BY created_at");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url,
    type: r.type,
    createdAt: r.created_at,
  }));
}

export async function saveAll(conn, media) {
  await conn.query("DELETE FROM media");
  for (const m of media) {
    await conn.query(
      "INSERT INTO media (id, name, url, type, created_at) VALUES (?, ?, ?, ?, ?)",
      [m.id, m.name, m.url, m.type, m.createdAt]
    );
  }
}
