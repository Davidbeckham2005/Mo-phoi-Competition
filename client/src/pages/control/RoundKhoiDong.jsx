export default function RoundKhoiDong({ ctx }) {
  const { isKd, act, state, g, firstValidIndex } = ctx;
  if (!isKd) return null;
  return (
    <div className="panel">
      {/* Quản lý câu hỏi — mỗi đội thi theo số thí sinh, mỗi thí sinh 5 ảnh */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs tracking-[0.18em] text-mist uppercase">Quản lý câu hỏi</div>
        <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => act("khoi_dong.reset")}>
          Reset tất cả
        </button>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {(state.teams || []).map((t) => {
          const clusters = state.questions?.main?.khoiDong?.[t.id] || [];
          const isActive = t.id === g.currentTeam;
          const hist = g.khoiDong?.history?.[t.id] || {};
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-3 bg-panel-solid ${isActive ? "border-gold ring-1 ring-gold/30" : "border-line"}`}
            >
              <div className="flex justify-between items-center mb-2">
                <b className="text-sm" style={{ color: t.color }}>{t.name}</b>
                {isActive && <span className="badge badge-ok text-xs!">Đang thi</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                {!Array.isArray(clusters) || clusters.length === 0 ? (
                  <div className="text-xs text-mist">Chưa có ảng (bọc thí sinh).</div>
                ) : clusters.map((cluster, m) => {
                  const memberCluster = Array.isArray(cluster) ? cluster : [cluster];
                  const isActiveMember = isActive && m === (g.khoiDong?.memberIndex ?? 0);
                  const memberHist = hist[m] || {};
                  return (
                    <div
                      key={`${t.id}-m${m}`}
                      className={`rounded-lg border px-2 py-1 ${isActiveMember ? "border-gold bg-gold/8" : "border-line"}`}
                    >
                      <button
                        type="button"
                        className="text-xs font-semibold text-mist hover:text-ink"
                        onClick={() => act("question.jump", { teamId: t.id, memberIndex: m, questionIndex: 0 })}
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
                              onClick={() => act("question.jump", { teamId: t.id, memberIndex: m, questionIndex: i })}
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
                onClick={() => act("khoi_dong.reset", { teamId: t.id })}
              >
                Reset trạng thái {t.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}