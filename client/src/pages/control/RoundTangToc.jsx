export default function RoundTangToc({ ctx }) {
  const { g, act, state } = ctx;
  if (g.round !== "tang_toc") return null;
  const tt = g.tangToc || {};
  const phase = tt.phase || "video";
  const settled = !!tt.settled;
  const qs = state.questions?.main?.tangToc || [];
  const curIdx = g.questionIndex || 0;
  const curQ = qs[curIdx];
  const subs = tt.submissions || {};
  const ranked = tt.ranked || [];
  const teams = state.teams || [];
  const subList = Object.keys(subs).map((tid) => ({
    teamId: tid,
    answer: subs[tid]?.answer,
    elapsed: subs[tid]?.elapsed,
    correct: tt.corrections?.[tid] === true ? true : tt.corrections?.[tid] === false ? false : null,
    points: 0,
  }));
  const ordered = ranked.length
    ? ranked
    : subList.sort((a, b) => (a.elapsed ?? 0) - (b.elapsed ?? 0));

  return (
    <div className="panel">
      <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Quản lý câu hỏi — Tăng tốc</div>

      {/* Chọn câu hỏi / video */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {qs.map((qd, i) => {
          const isCurrent = i === curIdx;
          return (
            <button
              key={qd.id}
              type="button"
              onClick={() => act("question.jump", { teamId: g.currentTeam, questionIndex: i })}
              className={`rounded-xl border-2 px-3 py-2.5 text-left transition ${
                isCurrent ? "border-gold bg-gold/10 text-gold" : "border-line text-mist hover:border-gold/50"
              }`}
            >
              <div className="font-bold text-sm">Câu {i + 1}{isCurrent ? " ●" : ""}</div>
              <div className="text-xs truncate" title={qd.question}>{qd.question}</div>
              <div className="text-ok text-xs mt-1 font-semibold">Đáp án: {qd.answer}</div>
              {qd.duration && <div className="text-mist text-xs mt-0.5">⏱ {qd.duration}s</div>}
            </button>
          );
        })}
      </div>

      {/* Điều khiển phát video & chuyển màn hình */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button type="button" className="btn" onClick={() => act("question.show")}>▶ Chiếu video</button>
        <button
          type="button"
          className={`btn ${phase === "video" ? "btn-ok" : ""}`}
          onClick={() => act("tangtoc.phase", { phase: "video" })}
        >
          Màn hình video
        </button>
        <button
          type="button"
          className={`btn ${phase === "answers" ? "btn-ok" : ""}`}
          onClick={() => act("tangtoc.phase", { phase: "answers" })}
        >
          Màn hình đáp án
        </button>
        <span className="text-mist text-sm ml-auto">Pha: {phase === "video" ? "chiếu video" : "chấm đáp án"}</span>
      </div>

      {/* Chấm điểm từng đội */}
      <div className="text-mist text-sm mb-1.5">
        Chấm từng đội: bấm <b className="text-ok">Đúng</b> / <b className="text-danger">Sai</b> (sai = 0đ, không trừ). Điểm được cộng theo độ nhanh giữa các đội đúng: 40/30/20/10.
      </div>
      <div className="grid gap-2 mb-3">
        {ordered.map((it) => {
          const t = teams.find((x) => x.id === it.teamId);
          const ok = it.correct === true;
          const bad = it.correct === false;
          const undone = it.correct === null && !settled;
          return (
            <div key={it.teamId} className="rounded-xl bg-panel-solid border border-line px-3 py-2">
              <div className="flex items-center gap-3">
                <b style={{ color: t?.color }} className="w-24 shrink-0">{t?.name || it.teamId}</b>
                <span className="text-mist text-xs shrink-0">nộp lúc {it.elapsed?.toFixed(1)}s</span>
                <span className="min-w-0 flex-1 truncate text-sm" title={it.answer}>“{it.answer}”</span>
                <span className={`font-display font-bold min-w-[3.5rem] text-right ${ok ? "text-ok" : bad ? "text-danger" : "text-mist"}`}>
                  {ok ? `+${it.points}` : bad ? "0" : "—"}
                </span>
              </div>
              {!settled && (
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    className={`btn btn-ghost py-1! px-3! text-xs ${ok ? "btn-ok" : ""}`}
                    onClick={() => act("tangtoc.mark", { teamId: it.teamId, correct: true })}
                  >
                    Đúng
                  </button>
                  <button
                    type="button"
                    className={`btn btn-ghost py-1! px-3! text-xs ${bad ? "btn-danger" : ""}`}
                    onClick={() => act("tangtoc.mark", { teamId: it.teamId, correct: false })}
                  >
                    Sai
                  </button>
                  <span className="text-mist text-xs self-center">
                    {undone ? "chưa chấm" : ok ? "đã chấm: đúng" : "đã chấm: sai"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {ordered.length === 0 && (
          <div className="text-mist text-sm">Chưa có đội nào nộp đáp án cho câu này.</div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="text-mist text-sm">Đã nộp: {Object.keys(subs).length}/4 đội</div>
        {phase === "answers" && (
          <button type="button" className="btn" disabled={settled} onClick={() => act("tangtoc.settle")}>
            {settled ? "Đã chốt điểm ✓" : "Chốt điểm Tăng tốc"}
          </button>
        )}
      </div>
    </div>
  );
}
