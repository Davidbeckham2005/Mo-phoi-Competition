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

  if (!state) {
    return <div className="min-h-screen grid place-items-center text-mist">Đang kết nối màn hình…</div>;
  }

  const g = state.game || {};
  const remaining = timer?.remaining ?? g.timer?.remaining ?? 0;
  const running = timer?.running ?? g.timer?.running;
  const roundName = (state.rounds || []).find((r) => r.id === g.round)?.name
    || (g.phase === "finished" ? "Chung cuộc" : "Chờ bắt đầu");

  return (
    <div className="min-h-screen flex flex-col px-6 py-5 gap-5">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <div className="kicker">{state.settings?.subtitle}</div>
          <h1 className="font-display font-bold text-[clamp(28px,4vw,52px)] leading-tight mt-1">
            {state.settings?.title}
          </h1>
        </div>
        <div className="text-right">
          <div className="round-badge">{roundName}</div>
          <div className={`timer-xl mt-2 ${remaining <= 5 && running ? "timer-danger" : ""}`}>
            {formatTime(remaining)}
          </div>
        </div>
      </div>

      <div className="relative flex-1 grid place-items-center min-h-[40vh]">
        {g.buzzer?.winner && (
          <div className="round-badge absolute top-2 left-1/2 -translate-x-1/2 z-10">
            Quyền trả lời: {state.teams.find((t) => t.id === g.buzzer.winner)?.name}
          </div>
        )}
        <Stage state={state} />
      </div>

      <TeamsRow state={state} flash={flash} currentTeam={g.currentTeam} />
    </div>
  );
}

function TeamsRow({ state, flash, currentTeam, ranked }) {
  const teams = ranked || state.teams || [];
  return (
    <div className="grid gap-3 w-[min(1100px,100%)] mx-auto sm:grid-cols-2 lg:grid-cols-4">
      {teams.map((t) => (
        <div
          key={t.id}
          style={{ "--tc": t.color }}
          className={`team-card ${currentTeam === t.id ? "team-active" : ""} ${flash === t.id ? "team-buzz" : ""}`}
        >
          <div className="font-bold">{t.name}</div>
          <div className="font-display text-4xl font-bold" style={{ color: t.color }}>{t.score}</div>
          {!ranked && (
            <div className="text-mist text-xs mt-1">
              {(t.members || []).map((m) => m.name).join(" • ") || "Chưa có thành viên"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Stage({ state }) {
  const g = state.game;
  const d = g.display || {};

  if (g.phase === "finished" || d.mode === "winner") {
    const ranked = [...(state.teams || [])].sort((a, b) => b.score - a.score);
    return (
      <div className="text-center">
        <div className="kicker">Đội quán quân</div>
        <div className="font-display font-bold text-[clamp(40px,8vw,96px)] text-gold drop-shadow-[0_0_30px_rgba(255,214,10,0.35)]">
          {ranked[0]?.name || "—"}
        </div>
        <div className="text-mist mt-2">Tổng điểm {ranked[0]?.score ?? 0}</div>
        <div className="mt-7 w-[min(900px,92%)] mx-auto">
          <TeamsRow state={state} flash={null} currentTeam="" ranked={ranked} />
        </div>
      </div>
    );
  }

  if (g.round && !g.roundStarted) {
    return (
      <div className="text-center">
        <div className="kicker">{(state.rounds || []).find((r) => r.id === g.round)?.name || g.round}</div>
        <div className="stage-q mt-3 text-mist">Đang chờ MC bắt đầu…</div>
      </div>
    );
  }

  if (d.mode === "puzzle" || (g.round === "vuot_cnv" && d.mode !== "question" && d.mode !== "media")) {
    const p = g.puzzle || {};
    const cnv = state.cnv;
    const solved = p.rowsSolved || [false, false, false, false];
    const locked = p.rowsLocked || [false, false, false, false];
    const media = cnv?.media;
    return (
      <div className="w-full max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-6 items-center">
        {/* CỘT TRÁI — Bảng ảnh ghép */}
        <div className="flex flex-col items-center justify-center gap-4 min-w-0">
          {media?.url &&
            (media.type === "video" ? (
              <video src={media.url} controls className="max-h-[34vh] max-w-full rounded-2xl border border-line shadow-[0_10px_40px_rgba(0,0,0,0.4)]" />
            ) : (
              <img src={media.url} alt="Ảnh ghép" className="max-h-[34vh] max-w-full object-contain rounded-2xl border border-line shadow-[0_10px_40px_rgba(0,0,0,0.4)]" />
            ))}
          <div className="relative w-[clamp(250px,26vw,420px)] aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-line">
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
              {[0, 1, 2, 3].map((r) => (
                <div
                  key={r}
                  className={`grid place-items-center font-display font-bold text-[clamp(28px,3.4vw,50px)] transition-colors ${
                    solved[r]
                      ? "bg-gold/90 text-[#1a1400]"
                      : locked[r]
                        ? "bg-danger/10 text-danger/80"
                        : "bg-panel-solid text-mist"
                  }`}
                >
                  {solved[r] ? r + 1 : locked[r] ? "✕" : "?"}
                </div>
              ))}
            </div>

            {/* Đường chia mảnh ghép */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-line" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-line" />
            </div>

            {/* Ô trung tâm nằm chồng lên điểm gặp nhau của 4 mảnh */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[38%] h-[46%] rounded-xl border-2 grid place-items-center font-display font-bold text-[clamp(22px,2.6vw,38px)] ${
                p.centerRevealed
                  ? "bg-gold text-[#1a1400] border-gold shadow-[0_0_26px_rgba(255,214,10,0.45)]"
                  : "bg-night border-line text-mist"
              }`}
            >
              {p.centerRevealed ? "★" : "?"}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI — Danh mục từ khóa */}
        <div className="flex flex-col items-center gap-2.5">
          {(cnv?.rows || []).map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={`text-sm w-14 shrink-0 text-right ${row.status === "open" ? "text-gold" : row.status === "locked" ? "text-danger/80" : "text-mist"}`}>
                Hàng {i + 1}
              </span>
              <div className="flex gap-1.5">
                {row.status === "open"
                  ? row.word.replace(/\s/g, "").split("").map((ch, j) => (
                      <span key={j} className="ltr ltr-open">{ch}</span>
                    ))
                  : row.status === "locked"
                    ? Array.from({ length: row.letterCount }, (_, j) => (
                        <span key={j} className="ltr ltr-locked">✕</span>
                      ))
                    : Array.from({ length: row.letterCount }, (_, j) => (
                        <span key={j} className="ltr" />
                      ))}
              </div>
            </div>
          ))}

          {/* Từ khóa */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="text-sm w-14 shrink-0 text-right text-gold">Từ khóa</span>
            {p.keywordSolved && cnv?.keyword
              ? cnv.keyword.split("").map((ch, j) => (
                  <span key={j} className={`ltr ltr-kw ${/\s/.test(ch) ? "" : "ltr-gold"}`}>
                    {/\s/.test(ch) ? "" : ch}
                  </span>
                ))
              : Array.from({ length: cnv?.keywordLetterCount || 0 }, (_, j) => (
                  <span key={j} className="ltr ltr-kw" />
                ))}
            {!!cnv?.keywordLetterCount && (
              <span className="text-mist text-sm ml-2">{cnv.keywordLetterCount} chữ cái</span>
            )}
          </div>

          {p.centerRevealed && cnv?.centerHint && (
            <div className="stage-note mt-1">★ {cnv.centerHint}</div>
          )}
        </div>

        <div className="md:col-span-2 text-center">
          {d.question && <div className="text-mist">{d.question}</div>}
          {d.note && <div className="stage-note">{d.note}</div>}
        </div>
      </div>
    );
  }

  if (d.mode === "media" && d.mediaUrl) {
    return d.mediaType === "video" ? (
      <video src={d.mediaUrl} autoPlay controls className="max-w-[90%] max-h-[50vh]" />
    ) : (
      <img src={d.mediaUrl} alt="" className="max-w-[90%] max-h-[50vh] rounded-2xl" />
    );
  }

  if (d.mode === "scores") {
    return (
      <div className="w-[90%]">
        <TeamsRow state={state} flash={null} currentTeam="" />
      </div>
    );
  }

  if (d.mode === "question") {
    const isKd = g.round === "khoi_dong";
    return (
      <div className="text-center">
        {isKd ? (
          d.mediaUrl ? (
            <img src={d.mediaUrl} alt="" className="max-h-[55vh] max-w-[80vw] mx-auto rounded-2xl object-contain" />
          ) : (
            <div className="mx-auto w-[min(500px,80vw)] aspect-[4/3] rounded-2xl bg-panel-solid border border-line grid place-items-center">
              <div className="text-6xl text-mist/40">?</div>
            </div>
          )
        ) : (
          <>
            {d.mediaUrl && d.mediaType === "image" && (
              <img src={d.mediaUrl} alt="" className="max-h-[220px] rounded-xl mb-4 inline-block" />
            )}
            {d.mediaUrl && d.mediaType === "video" && (
              <video src={d.mediaUrl} autoPlay controls className="max-h-[260px] mb-4" />
            )}
          </>
        )}
        {!isKd && d.question && <div className="stage-q">{d.question}</div>}
        {!isKd && d.options?.length > 0 && (
          <div className="grid gap-2.5 mt-5 text-left w-[min(720px,90%)] mx-auto">
            {d.options.map((o) => (
              <div key={o} className="opt cursor-default">{o}</div>
            ))}
          </div>
        )}
        <div className="stage-note">{d.note}</div>
        {d.answerRevealed && <div className="stage-answer">Đáp án: {d.answer}</div>}
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="kicker">Sẵn sàng</div>
      <div className="stage-q mt-2">Chào mừng đến với cuộc thi</div>
      <div className="text-mist mt-4">
        Đã đăng ký {state.contestantCount || 0} thí sinh • Nộp bài {state.submittedCount || 0}
      </div>
      {state.leaderboard?.length > 0 && (
        <div className="text-mist mt-4">
          Dẫn đầu:{" "}
          {state.leaderboard.slice(0, 3).map((c) => `${c.rank}. ${c.name} (${c.score})`).join(" • ")}
        </div>
      )}
    </div>
  );
}
