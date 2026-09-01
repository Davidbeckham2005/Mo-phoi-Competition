export async function load(conn) {
  const rows = await conn.query("SELECT * FROM settings WHERE id = 1");
  if (!rows.length) return null;
  const r = rows[0];
  return {
    title: r.title,
    subtitle: r.subtitle,
    pin: r.pin,
    prelimDuration: r.prelim_duration,
    prelimQuestionCount: r.prelim_question_count,
    topN: r.top_n,
    prelimOpen: !!r.prelim_open,
    showLiveRanking: !!r.show_live_ranking,
    audienceBg: r.audience_bg || "dark",
    audienceBgUrl: r.audience_bg_url || "",
  };
}

export async function save(conn, s) {
  await conn.query("DELETE FROM settings WHERE id = 1");
  await conn.query(
    `INSERT INTO settings (id, title, subtitle, pin, prelim_duration, prelim_question_count, top_n, prelim_open, show_live_ranking, audience_bg, audience_bg_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      s.title,
      s.subtitle,
      s.pin,
      s.prelimDuration,
      s.prelimQuestionCount,
      s.topN,
      s.prelimOpen ? 1 : 0,
      s.showLiveRanking ? 1 : 0,
      s.audienceBg || "dark",
      s.audienceBgUrl || "",
    ]
  );
}
