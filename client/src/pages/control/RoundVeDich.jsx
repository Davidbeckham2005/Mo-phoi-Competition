export default function RoundVeDich({ ctx }) {
  const { g, state } = ctx;
  if (g.round !== "ve_dich") return null;
  return (
    <div className="panel">
      <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Quản lý câu hỏi — Về đích</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(state.teams || []).map((t) => {
          const qs = state.questions?.main?.veDich?.[t.id] || [];
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
              <div className="grid gap-1.5">
                {qs.map((qd) => {
                  const isCurrentPkg = isActive && g.veDich?.packagePoints === qd.points;
                  return (
                    <div
                      key={qd.id}
                      className={`rounded-lg border px-3 py-2 text-xs transition ${
                        isCurrentPkg
                          ? "border-gold bg-gold/10"
                          : "border-line"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-gold font-bold">{qd.points} điểm</span>
                        {isCurrentPkg && <span className="text-gold text-xs">●</span>}
                      </div>
                      <div className="text-mist mt-0.5 truncate" title={qd.question}>{qd.question}</div>
                      <div className="text-ok mt-0.5 font-semibold">Đáp án: {qd.answer}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}