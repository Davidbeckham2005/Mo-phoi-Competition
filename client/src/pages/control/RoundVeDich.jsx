const PACKAGES = {
  60: [10, 10, 20],
  80: [10, 20, 20],
  100: [20, 20, 30],
};

const ANSWER_SECONDS = { 10: 30, 20: 45, 30: 60 };

export default function RoundVeDich({ ctx }) {
  const { g, state, act, remaining, q, pts, revealed, running } = ctx;
  if (g.round !== "ve_dich") return null;

  const activeTeam = state.teams.find((t) => t.id === g.currentTeam);
  const bank = (state.questions?.main?.veDich || {})[g.currentTeam] || [];
  const pickedIds = (g.veDich?.picked || {})[g.currentTeam] || [];
  const picked = pickedIds
    .map((id) => bank.find((x) => x.id === id))
    .filter(Boolean)
    .map((q) => ({ id: q.id, points: q.points }));
  const locked = !!g.veDich?.locked;
  const phase = g.veDich?.phase || "soan";
  const curIndex = g.veDich?.pickIndex || 0;
  const star = g.veDich?.starQuestion === curIndex;
  const starUsed = g.veDich?.starQuestion !== null;
  const stealOpen = !!g.veDich?.stealOpen;
  const pkg = g.veDich?.packagePoints;
  const hasPackage = pkg === 60 || pkg === 80 || pkg === 100;

  const PACKAGE_LABEL = { 60: "60đ", 80: "80đ", 100: "100đ" };

  function selectPackage(packagePoints) {
    act("vedich.pick", { packagePoints });
  }

  return (
    <div className="panel divide-y divide-line">
      {/* CÂU HỎI & ĐÁP ÁN */}
      <section className="px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs tracking-[0.2em] text-gold uppercase">{activeTeam?.name || g.currentTeam?.toUpperCase()}</span>
          {running && (
            <span className="flex items-center gap-2">
              <span className="font-display text-3xl tabular-nums text-gold">{remaining}</span>
              <span className="text-mist text-[10px] uppercase">giây</span>
            </span>
          )}
        </div>

        {q.mediaUrl && (
          <img src={q.mediaUrl} className="mx-auto mt-3 max-h-[150px] rounded-lg border border-line/50" />
        )}

        <div className="mt-3 font-display text-2xl leading-snug text-white">{q?.question || "Chưa chọn câu hỏi"}</div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 border-l-4 border-gold bg-night/50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-mist">Đáp án</div>
            <div className="font-display text-xl text-white">
              {q ? q.answer : "—"}
            </div>
          </div>
          {q && (
            <div className="shrink-0 text-center">
              <div className="font-display text-3xl font-bold text-gold">{pts}đ</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-mist">điểm</div>
            </div>
          )}
        </div>
      </section>

      {/* CHỌN GÓI */}
      <section className="px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs tracking-[0.2em] text-mist uppercase">Chọn gói câu hỏi</span>
          <span className="text-xs text-mist">Đã chọn {picked.length}/3 câu{hasPackage ? ` • ${PACKAGE_LABEL[pkg]}` : ""}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PACKAGES).map(([total, structure]) => {
            const totalVal = Number(total);
            const isCurrent = hasPackage && pkg === totalVal;
            return (
              <button
                key={total}
                type="button"
                disabled={locked}
                onClick={() => selectPackage(totalVal)}
                className={`border px-3 py-3 text-left transition ${
                  isCurrent
                    ? "border-gold bg-gold/10"
                    : "border-line hover:border-gold/50"
                }`}
              >
                <div className="text-lg font-bold text-gold">{totalVal}đ</div>
                <div className="text-xs text-mist">{structure.join(" + ")}</div>
              </button>
            );
          })}
        </div>

        {hasPackage && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((idx) => {
              const cand = picked[idx];
              const isCurrent = locked && idx === curIndex && cand;
              return (
                <div
                  key={idx}
                  className={`border px-3 py-2 text-center transition ${
                    isCurrent ? "border-gold bg-gold/10" : "border-line"
                  }`}
                >
                  <div className="text-xs text-mist">Câu {idx + 1}</div>
                  <div className="font-semibold text-white">{cand ? `${cand.points}đ` : "…"}</div>
                  {isCurrent && <div className="text-[10px] text-gold uppercase">Đang hiện</div>}
                </div>
              );
            })}
          </div>
        )}

        {!locked && (
          <button
            type="button"
            className="btn btn-ghost text-xs py-1! mt-3"
            onClick={() => act("vedich.clear", { teamId: activeTeam?.id })}
          >
            Xóa hết (chọn lại gói)
          </button>
        )}
      </section>

      {/* ĐIỀU KHIỂN */}
      <section className="px-4 py-4">
        {locked ? (
          phase === "ready" && (
            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" className="btn btn-ok flex-1 min-w-[180px]" onClick={() => act("vedich.start")}>
                Bắt đầu thi
              </button>
              <button
                type="button"
                className={`btn ${star ? "btn-ok" : ""}`}
                onClick={() => act("vedich.star", { star: !star })}
              >
                Sao hy vọng {star ? "×2" : "OFF"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => act("vedich.unlock")}>
                Sửa lại
              </button>
            </div>
          )
        ) : (
          <button
            type="button"
            disabled={!hasPackage || picked.length < 3}
            className="btn btn-ok w-full"
            onClick={() => act("vedich.lock")}
          >
            Xác nhận bộ câu
          </button>
        )}

        {phase === "prep" && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              type="button"
              disabled={starUsed && !star}
              className={`btn ${star ? "btn-ok" : ""}`}
              onClick={() => act("vedich.star", { star: !star })}
            >
              Sao hy vọng {star ? "×2" : "OFF"}
            </button>
            <button type="button" className="btn btn-ok flex-1" onClick={() => act("question.show")}>
              Hiện câu hỏi
            </button>
          </div>
        )}

        {phase === "countdown" && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="font-display text-xl text-gold">Chuẩn bị thi — {remaining >= 0 ? remaining : 3}…</span>
            <button type="button" className="btn btn-ghost ml-auto" onClick={() => act("vedich.unlock")}>
              Hủy
            </button>
          </div>
        )}

        {phase === "answering" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-mist text-xs flex-1">
              {stealOpen ? "Đội giành chuông trả lời" : `${activeTeam?.name} trả lời`}
            </span>
            {!revealed && !stealOpen && !running && (
              <button type="button" className="btn btn-ok" onClick={() => act("vedich.startAnswer")}>
                Bắt đầu tính giờ
              </button>
            )}
            {revealed && (
              <button type="button" className="btn" onClick={() => act("question.next")}>
                Câu tiếp →
              </button>
            )}
            {!revealed && (
              <>
                <button type="button" className="btn btn-danger text-base! px-6!" onClick={() => act("answer.mark", { correct: false })}>
                  Sai
                </button>
                <button type="button" className="btn btn-ok text-base! px-6!" onClick={() => act("answer.mark", { correct: true })}>
                  Đúng
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
