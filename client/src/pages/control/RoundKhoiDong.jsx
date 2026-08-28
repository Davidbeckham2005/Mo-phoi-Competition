export default function RoundKhoiDong({ ctx }) {
  const { isKd, act, state, g, firstValidIndex } = ctx;
  if (!isKd) return null;
  return (
    <div className="panel">
      {/* Quản lý câu hỏi — 4 đội × 6 câu */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs tracking-[0.18em] text-mist uppercase">Quản lý câu hỏi</div>
        <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => act("khoi_dong.reset")}>
          Reset tất cả
        </button>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {(state.teams || []).map((t) => {
          const questions = state.questions?.main?.khoiDong?.[t.id] || [];
          const isActive = t.id === g.currentTeam;
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-3 bg-panel-solid ${isActive ? "border-gold ring-1 ring-gold/30" : "border-line"}`}
            >
              <div className="flex justify-between items-center mb-2">
                <b className="text-sm" style={{ color: t.color }}>{t.name}</b>
                {isActive && <span className="badge badge-ok text-xs!">Đang thi</span>}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {questions.map((qd, i) => {
                  const isCurrent = isActive && i === (g.questionIndex || 0);
                  const hist = g.khoiDong?.history?.[t.id];
                  const mark = hist && hist[i];
                  const answered = typeof mark === "boolean";
                  const correct = mark === true;
                  const wrong = mark === false;
                  return (
                    <button
                      key={qd.id}
                      type="button"
                      onClick={() => act("question.jump", { teamId: t.id, questionIndex: firstValidIndex(t.id) })}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition truncate ${
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