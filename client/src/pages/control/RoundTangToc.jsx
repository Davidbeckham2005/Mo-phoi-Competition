export default function RoundTangToc({ ctx }) {
  const { g, act, state } = ctx;
  if (g.round !== "tang_toc") return null;
  return (
    <div className="panel">
      <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Quản lý câu hỏi — Tăng tốc</div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(state.questions?.main?.tangToc || []).map((qd, i) => {
          const isCurrent = i === (g.questionIndex || 0);
          return (
            <button
              key={qd.id}
              type="button"
              onClick={() => act("question.jump", { teamId: g.currentTeam, questionIndex: i })}
              className={`rounded-xl border-2 px-3 py-3 text-left transition ${
                isCurrent
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-line text-mist hover:border-gold/50"
              }`}
            >
              <div className="font-bold text-sm mb-1">Câu {i + 1}{isCurrent ? " ●" : ""}</div>
              <div className="text-xs truncate" title={qd.question}>{qd.question}</div>
              <div className="text-ok text-xs mt-1 font-semibold">Đáp án: {qd.answer}</div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-mist text-sm">
          Bài nộp: {Object.keys(g.tangToc?.submissions || {}).length}/4 đội
        </div>
        {(g.tangToc?.ranked || []).length > 0 && (
          <div className="text-mist text-sm">
            Xếp hạng: {g.tangToc.ranked.map((r) => `${state.teams.find((t) => t.id === r.teamId)?.name || r.teamId} +${r.points}`).join(", ")}
          </div>
        )}
        <button type="button" className="btn" onClick={() => act("tangtoc.settle")}>Chốt điểm tăng tốc</button>
      </div>
    </div>
  );
}