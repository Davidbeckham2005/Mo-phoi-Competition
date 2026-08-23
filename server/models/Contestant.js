import { parseJson } from "./helpers.js";

export async function loadAll(conn) {
  const rows = await conn.query("SELECT * FROM contestants");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    studentId: r.student_id,
    school: r.school,
    className: r.class_name,
    //thời gian bắt đầu làm bài thi
    startedAt: r.started_at,
    //thời gian nộp bài thi
    submittedAt: r.submitted_at,
    // thứ tự câu hỏi (dạng mảng) được nạp từ CSDL (SQLite / MySQL)
    questionOrder: parseJson(r.question_order, []),
    // câu trả lời của thí sinh (dạng object) được nạp từ CSDL (SQLite / MySQL)
    answers: parseJson(r.answers, {}),
    // điểm số, số câu trả lời đúng, thời gian làm bài, thứ hạng và trạng thái được nạp từ CSDL (SQLite / MySQL)
    score: r.score,
    // số câu trả lời đúng
    correctCount: r.correct_count,
    // thời gian làm bài
    timeSpent: r.time_spent,
    // thứ hạng
    rank: r.rank_num,
    // trạng thái qualified
    qualified: !!r.qualified,
    // ID của đội thi
    teamId: r.team_id,
  }));
}
// fix sau luôn vì để vậy rất nguy hiểm
export async function saveAll(conn, contestants) {
  await conn.query("DELETE FROM contestants");
  for (const c of contestants) {
    await conn.query(
      `INSERT INTO contestants
        (id, name, student_id, school, class_name, started_at, submitted_at, question_order, answers, score, correct_count, time_spent, rank_num, qualified, team_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.name,
        c.studentId,
        c.school || "",
        c.className || "",
        c.startedAt,
        c.submittedAt,
        JSON.stringify(c.questionOrder || []),
        JSON.stringify(c.answers || {}),
        c.score || 0,
        c.correctCount || 0,
        c.timeSpent || 0,
        c.rank,
        c.qualified ? 1 : 0,
        c.teamId,
      ]
    );
  }
}
