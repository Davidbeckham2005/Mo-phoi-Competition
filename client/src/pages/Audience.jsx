import { useEffect, useState } from "react";
import { formatTime } from "../lib/format.js";
import { on } from "../lib/socket.js";
import { useGameState } from "../lib/useGame.js";

function playBuzz() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    /* ignore */
  }
}

export default function Audience() {
  const { state, timer } = useGameState();
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    return on("buzzer:press", (p) => {
      setFlash(p.winner);
      playBuzz();
      setTimeout(() => setFlash(null), 1200);
    });
  }, []);

  if (!state) return <div className="audience muted">Đang kết nối màn hình...</div>;

  const g = state.game || {};
  const remaining = timer?.remaining ?? g.timer?.remaining ?? 0;
  const running = timer?.running ?? g.timer?.running;
  const roundName = (state.rounds || []).find((r) => r.id === g.round)?.name
    || (g.phase === "finished" ? "Chung cuộc" : "Chờ bắt đầu");

  return (
    <div className="audience">
      <div className="audience-top">
        <div>
          <div className="kicker">{state.settings?.subtitle}</div>
          <h1>{state.settings?.title}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="round-badge">{roundName}</div>
          <div className={`timer-xl ${remaining <= 5 && running ? "danger" : ""}`}>
            {formatTime(remaining)}
          </div>
        </div>
      </div>

      <div className="stage">
        {g.buzzer?.winner && (
          <div className="round-badge" style={{ position: "absolute", top: 18 }}>
            Quyền trả lời: {state.teams.find((t) => t.id === g.buzzer.winner)?.name}
          </div>
        )}
        <Stage state={state} />
      </div>

      <div className="teams">
        {(state.teams || []).map((t) => (
          <div
            key={t.id}
            className={`team-card ${g.currentTeam === t.id ? "active" : ""} ${flash === t.id ? "buzz" : ""}`}
            style={{ "--c": t.color }}
          >
            <div className="name">{t.name}</div>
            <div className="score" style={{ color: t.color }}>{t.score}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {(t.members || []).map((m) => m.name).join(" • ") || "Chưa có thành viên"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stage({ state }) {
  const g = state.game;
  const d = g.display || {};

  if (g.phase === "finished" || d.mode === "winner") {
    const ranked = [...(state.teams || [])].sort((a, b) => b.score - a.score);
    return (
      <div style={{ textAlign: "center" }}>
        <div className="kicker">Đội quán quân</div>
        <div className="winner-name">{ranked[0]?.name || "—"}</div>
        <div className="muted" style={{ marginTop: 8 }}>Tổng điểm {ranked[0]?.score ?? 0}</div>
        <div className="teams" style={{ marginTop: 28, width: "min(900px, 92%)" }}>
          {ranked.map((t, i) => (
            <div key={t.id} className="team-card" style={{ "--c": t.color }}>
              <div>#{i + 1} {t.name}</div>
              <div className="score">{t.score}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (d.mode === "puzzle" || (g.round === "vuot_cnv" && d.mode !== "question" && d.mode !== "media")) {
    const p = g.puzzle || {};
    const cnv = state.cnv;
    const solved = p.rowsSolved || [false, false, false, false];
    const locked = p.rowsLocked || [false, false, false, false];
    return (
      <div style={{ textAlign: "center" }}>
        <div className="puzzle cnv">
          {[0, 1, 2, 3].map((r) => (
            <div
              key={r}
              className={`piece ${solved[r] ? "on" : ""} ${locked[r] ? "locked" : ""}`}
              style={{ gridArea: r < 2 ? `1/${r === 0 ? 1 : 3}` : `3/${r === 2 ? 1 : 3}` }}
            >
              {solved[r] ? r + 1 : locked[r] ? "✕" : "?"}
            </div>
          ))}
          <div className={`piece center ${p.centerRevealed ? "on" : ""}`} style={{ gridArea: "2/2" }}>
            {p.centerRevealed ? "★" : "?"}
          </div>
        </div>

        <div className="cnv-words">
          {(cnv?.rows || []).map((row, i) => (
            <div className="cnv-word-row" key={i}>
              <span className="cnv-row-label">{i + 1}</span>
              <div className="cnv-cells">
                {row.status === "open"
                  ? row.word.replace(/\s/g, "").split("").map((ch, j) => (
                      <span key={j} className="ltr open">{ch}</span>
                    ))
                  : row.status === "locked"
                    ? Array.from({ length: row.letterCount }, (_, j) => (
                        <span key={j} className="ltr locked">✕</span>
                      ))
                    : Array.from({ length: row.letterCount }, (_, j) => (
                        <span key={j} className="ltr" />
                      ))}
              </div>
            </div>
          ))}
        </div>

        {p.centerRevealed && cnv?.centerHint && (
          <div className="stage-note">★ {cnv.centerHint}</div>
        )}

        <div className="cnv-keyword">
          {p.keywordSolved && cnv?.keyword
            ? cnv.keyword.split("").map((ch, j) => (
                <span key={j} className={`ltr kw ${/\s/.test(ch) ? "space" : "gold"}`}>
                  {/\s/.test(ch) ? "" : ch}
                </span>
              ))
            : Array.from({ length: cnv?.keywordLetterCount || 0 }, (_, j) => (
                <span key={j} className="ltr kw" />
              ))}
          {!!cnv?.keywordLetterCount && (
            <span className="muted cnv-kw-count">{cnv.keywordLetterCount} chữ cái</span>
          )}
        </div>

        <div className="muted">{d.question}</div>
        {d.note && <div className="stage-note">{d.note}</div>}
      </div>
    );
  }

  if (d.mode === "media" && d.mediaUrl) {
    return d.mediaType === "video" ? (
      <video src={d.mediaUrl} autoPlay controls style={{ maxWidth: "90%", maxHeight: "50vh" }} />
    ) : (
      <img src={d.mediaUrl} alt="" style={{ maxWidth: "90%", maxHeight: "50vh", borderRadius: 16 }} />
    );
  }

  if (d.mode === "scores") {
    return (
      <div className="teams" style={{ width: "90%" }}>
        {state.teams.map((t) => (
          <div key={t.id} className="team-card" style={{ "--c": t.color }}>
            <div className="name">{t.name}</div>
            <div className="score">{t.score}</div>
          </div>
        ))}
      </div>
    );
  }

  if (d.mode === "question") {
    return (
      <div style={{ textAlign: "center" }}>
        {d.mediaUrl && d.mediaType === "image" && (
          <img src={d.mediaUrl} alt="" style={{ maxHeight: 220, borderRadius: 12, marginBottom: 16 }} />
        )}
        {d.mediaUrl && d.mediaType === "video" && (
          <video src={d.mediaUrl} autoPlay controls style={{ maxHeight: 260, marginBottom: 16 }} />
        )}
        <div className="stage-q">{d.question}</div>
        {d.options?.length > 0 && (
          <div className="options" style={{ marginTop: 20, textAlign: "left", width: "min(720px, 90%)" }}>
            {d.options.map((o) => <div key={o} className="opt">{o}</div>)}
          </div>
        )}
        <div className="stage-note">{d.note}</div>
        {d.answerRevealed && <div className="stage-answer">Đáp án: {d.answer}</div>}
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div className="kicker">Sẵn sàng</div>
      <div className="stage-q">Chào mừng đến với cuộc thi</div>
      <div className="muted" style={{ marginTop: 12 }}>
        Đã đăng ký {state.contestantCount || 0} thí sinh • Nộp bài {state.submittedCount || 0}
      </div>
      {state.leaderboard?.length > 0 && (
        <div className="muted" style={{ marginTop: 16 }}>
          Dẫn đầu: {state.leaderboard.slice(0, 3).map((c) => `${c.rank}. ${c.name} (${c.score})`).join(" • ")}
        </div>
      )}
    </div>
  );
}
