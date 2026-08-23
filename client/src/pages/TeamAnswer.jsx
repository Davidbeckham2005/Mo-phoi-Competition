import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { socket } from "../lib/socket.js";
import { formatTime } from "../lib/format.js";
import { useGameState } from "../lib/useGame.js";

export default function TeamAnswer() {
  const { state, timer } = useGameState();
  const [teamId, setTeamId] = useState(localStorage.getItem("kd_team") || "");
  const [answer, setAnswer] = useState("");

  const team = (state?.teams || []).find((t) => t.id === teamId);
  const g = state?.game || {};
  const d = g.display || {};
  const active = g.round === "khoi_dong" && g.questionStatus === "showing" && d.mode === "question";
  const myTurn = active && g.currentTeam === teamId;
  const submitted = g.khoiDong?.submissions?.[teamId];

  useEffect(() => {
    setAnswer("");
  }, [d.question]);

  function choose(id) {
    setTeamId(id);
    localStorage.setItem("kd_team", id);
  }

  function submit(e) {
    e.preventDefault();
    if (!answer.trim()) return;
    socket.emit("khoidong:submit", { teamId, answer });
    setAnswer("");
  }

  if (!state) return <div className="kd-page muted">Đang kết nối...</div>;

  if (!team) {
    return (
      <div className="kd-page">
        <div className="topbar" style={{ position: "absolute", top: 16, left: 16 }}>
          <Link to="/" className="muted">← Trang chủ</Link>
        </div>
        <h2>Chọn đội của bạn</h2>
        <p className="muted">Thí sinh trong đội dùng trang này để ghi đáp án vòng Khởi động.</p>
        <div className="role-grid" style={{ marginTop: 16, width: "min(720px, 92vw)" }}>
          {(state.teams || []).map((t) => (
            <button key={t.id} className="role-card" style={{ borderColor: t.color }} onClick={() => choose(t.id)}>
              <b>{t.name}</b>
              <span>{t.score} điểm • {(t.members || []).length} thành viên</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const remaining = timer?.remaining ?? g.timer?.remaining ?? 0;
  const running = timer?.running ?? g.timer?.running;
  const currentTeamName = (state.teams || []).find((t) => t.id === g.currentTeam)?.name;

  let body;
  if (g.round !== "khoi_dong") {
    body = (
      <>
        <div className="round-badge">Chờ MC mở vòng Khởi động</div>
        <p className="muted">Khi MC hiện câu hỏi, ô ghi đáp án sẽ xuất hiện tại đây.</p>
      </>
    );
  } else if (!active) {
    body = (
      <>
        <div className="round-badge">Lượt {currentTeamName} — chờ MC hiện câu hỏi</div>
        <p className="muted">MC chưa hiển thị câu hỏi. Hãy để ý màn hình lớn.</p>
      </>
    );
  } else if (!myTurn) {
    body = (
      <>
        <div className={`stage-q`} style={{ opacity: 0.55 }}>{d.question}</div>
        <div className="badge no">Chưa đến lượt — đang là lượt {currentTeamName}</div>
      </>
    );
  } else if (submitted) {
    body = (
      <>
        <div className="stage-q">{d.question}</div>
        <div className="kd-sent">
          Đã gửi đáp án: <b>{submitted.answer}</b>
        </div>
        <p className="muted">Chờ MC chấm điểm. Không thể sửa sau khi gửi.</p>
      </>
    );
  } else {
    body = (
      <>
        <div className="stage-q">{d.question}</div>
        <form onSubmit={submit} className="kd-form">
          <input
            autoFocus
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Ghi đáp án của bạn..."
          />
          <button className="btn" disabled={!answer.trim()}>Gửi đáp án</button>
        </form>
      </>
    );
  }

  return (
    <div className="kd-page">
      <div style={{ position: "absolute", top: 16, left: 16 }}>
        <button
          className="btn ghost"
          onClick={() => { localStorage.removeItem("kd_team"); setTeamId(""); }}
        >
          ← Đổi đội
        </button>
      </div>
      <div className="kicker">Vòng khởi động — thí sinh ghi đáp án</div>
      <h2 style={{ color: team.color }}>{team.name}</h2>
      <div className="display" style={{ fontSize: 26 }}>{team.score} điểm</div>
      <div className="muted">
        {(team.members || []).map((m) => m.name).join(" • ") || "Chưa có thành viên"}
      </div>
      {g.round === "khoi_dong" && (
        <div className={`timer-xl ${remaining <= 5 && running ? "danger" : ""}`}>
          {formatTime(remaining)}
        </div>
      )}
      {body}
      {d.note && active && <div className="stage-note">{d.note}</div>}
    </div>
  );
}
