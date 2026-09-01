export default function RoundKhoiDong({ ctx }) {
  const { isKd, act, state, g, firstValidIndex } = ctx;
  if (!isKd) return null;
  const order = ["a", "b", "c", "d"];
  const curIdx = order.indexOf(g.currentTeam);
  const curTeamId = order[curIdx] || g.currentTeam;
  const t = (state.teams || []).find((x) => x.id === curTeamId);
  const clusters = Array.isArray(state.questions?.main?.khoiDong?.[curTeamId])
    ? state.questions.main.khoiDong[curTeamId]
    : [];
  const hist = g.khoiDong?.history?.[curTeamId] || {};
  const step = (delta) => {
    const nextIdx = (curIdx + delta + order.length) % order.length;
    const next = order[nextIdx];
    const f = firstValidIndex(next);
    act("question.jump", { teamId: next, memberIndex: f.memberIndex, questionIndex: f.questionIndex });
  };
  return (
    <div className="panel">
      {/* Quản lý câu hỏi Round 1 — chỉ hiển thị đúng đội đang thi */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs tracking-[0.18em] text-mist uppercase">Quản lý câu hỏi</div>
        <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => act("khoi_dong.reset")}>
          Reset tất cả
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3">
        <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => step(-1)} disabled={order.length < 2}>◀</button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t?.color }} />
          <b className="text-base truncate" style={{ color: t?.color }}>{t?.name}</b>
          <span className={`badge ${g.khoiDong?.phase === "break" ? "badge-warn" : g.khoiDong?.phase === "done" ? "badge-ok" : "badge-ok"} text-xs! shrink-0`}>
            {g.khoiDong?.phase === "break" ? "Khoàng nghỉ" : g.khoiDong?.phase === "done" ? "Kết thúc" : "Đang thi"}
          </span>
        </div>
        <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => step(1)} disabled={order.length < 2}>▶</button>
      </div>

      {g.khoiDong?.phase === "break" && (
        <button
          type="button"
          className="btn btn-ok text-xs py-1! w-full mt-2"
          onClick={() => act("khoi_dong.continue")}
        >
          Tiếp tục —{g.khoiDong?.breakInfo?.kind === "team"
            ? ` sang đội ${state.teams.find((x) => x.id === g.khoiDong?.breakInfo?.nextTeamId)?.name || g.khoiDong?.breakInfo?.nextTeamId}`
            : g.khoiDong?.breakInfo?.kind === "member"
              ? ` sang thí sinh ${(g.khoiDong?.breakInfo?.nextMember || 1) + 1}`
              : " sang tổng kết"}
        </button>
      )}

      <div className="flex flex-col gap-1.5">
        {!clusters.length ? (
          <div className="text-xs text-mist">Chưa có ảng (bọc thí sinh) cho {t?.name || curTeamId}.</div>
        ) : clusters.map((cluster, m) => {
          const memberCluster = Array.isArray(cluster) ? cluster : [cluster];
          const mi = g.khoiDong?.memberIndex ?? 0;
          const isActiveMember = m === mi;
          const memberHist = hist[m] || {};
          return (
            <div
              key={`${curTeamId}-m${m}`}
              className={`rounded-lg border px-2 py-1 ${isActiveMember ? "border-gold bg-gold/8" : "border-line"}`}
            >
              <button
                type="button"
                className="text-xs font-semibold text-mist hover:text-ink"
                onClick={() => act("question.jump", { teamId: curTeamId, memberIndex: m, questionIndex: 0 })}
              >
                Thí sinh {m + 1}
                {isActiveMember ? " \u25CF" : ""}
              </button>
              <div className="grid grid-cols-5 gap-1">
                {memberCluster.map((qd, i) => {
                  const isCurrent = isActiveMember && i === (g.questionIndex || 0);
                  const mark = memberHist[i];
                  const answered = typeof mark === "boolean";
                  const correct = mark === true;
                  const wrong = mark === false;
                  return (
                    <button
                      key={qd.id}
                      type="button"
                      onClick={() => act("question.jump", { teamId: curTeamId, memberIndex: m, questionIndex: i })}
                      className={`rounded-md border px-1 py-1 text-xs font-semibold transition truncate ${
                        isCurrent
                          ? "border-gold bg-gold/15 text-gold"
                          : correct
                            ? "border-ok/30 bg-ok/8 text-ok/70"
                            : wrong
                              ? "border-danger/40 bg-danger/8 text-danger/80"
                              : "border-line text-mist hover:border-gold/50 hover:text-ink"
                      }`}
                      title={qd.answer || qd.question}
                    >
                      {i + 1}{qd.mediaUrl ? " \u25C9" : ""}{isCurrent ? " \u25CF" : correct ? " \u2713" : wrong ? " \u2715" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn-ghost text-xs py-1! mt-2 w-full"
        onClick={() => act("khoi_dong.reset", { teamId: curTeamId })}
      >
        Reset trạng thái {t?.name || curTeamId}
      </button>
    </div>
  );
}