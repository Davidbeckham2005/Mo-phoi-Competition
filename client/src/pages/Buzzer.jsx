import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { socket } from "../lib/socket.js";
import { useGameState } from "../lib/useGame.js";

export default function Buzzer() {
  const { state } = useGameState();
  const [teamId, setTeamId] = useState(localStorage.getItem("buzz_team") || "");
  const [answer, setAnswer] = useState("");
  const nav = useNavigate();

  const team = (state?.teams || []).find((t) => t.id === teamId);

  function choose(id) {
    setTeamId(id);
    localStorage.setItem("buzz_team", id);
  }

  function buzz() {
    socket.emit("buzzer:press", { teamId });
  }

  function sendTangToc(e) {
    e.preventDefault();
    socket.emit("tangtoc:submit", { teamId, answer });
    setAnswer("");
  }

  if (!state) return <div className="buzz-page muted">Đang kết nối...</div>;

  if (!team) {
    return (
      <div className="page">
        <div className="topbar">
          <Link to="/" className="muted">← Trang chủ</Link>
        </div>
        <h2>Chọn đội để bấm chuông</h2>
        <div className="role-grid" style={{ marginTop: 16 }}>
          {state.teams.map((t) => (
            <button key={t.id} className="role-card" style={{ borderColor: t.color }} onClick={() => choose(t.id)}>
              <b>{t.name}</b>
              <span>{t.score} điểm</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const winner = state.game.buzzer?.winner === teamId;
  const open = state.game.buzzer?.open;

  return (
    <div className="buzz-page">
      <div style={{ textAlign: "center" }}>
        <div className="kicker">{team.name}</div>
        <div className="display" style={{ fontSize: 28, color: team.color }}>{team.score} điểm</div>
        <button className="buzz-btn" disabled={!open} onClick={buzz} style={{ margin: "24px 0" }}>
          {open ? "CHUÔNG" : winner ? "ĐƯỢC TRẢ LỜI" : "CHỜ"}
        </button>
        {state.game.round === "tang_toc" && state.game.timer?.running && (
          <form onSubmit={sendTangToc} className="form-grid" style={{ width: "min(420px, 90vw)", margin: "0 auto" }}>
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Nhập đáp án tăng tốc" />
            <button className="btn">Gửi đáp án</button>
          </form>
        )}
        <p className="muted">
          <button className="btn ghost" onClick={() => { localStorage.removeItem("buzz_team"); setTeamId(""); }}>Đổi đội</button>
          {" "}
          <button className="btn ghost" onClick={() => nav("/")}>Trang chủ</button>
        </p>
      </div>
    </div>
  );
}
