const PACKAGES = {
  60: [10, 10, 20],
  80: [10, 20, 20],
  100: [20, 20, 30],
};

export default function RoundVeDich({ ctx }) {
  const { g, state, act, remaining, q, pts, revealed } = ctx;
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
    <div className="panel">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs tracking-[0.18em] text-mist uppercase">Quản lý câu hỏi — Về đích</div>
        <span className={`badge text-xs! ${phase === "answering" ? "badge-ok" : phase === "countdown" ? "badge-warn" : phase === "ready" ? "badge-warn" : "badge-warn"}`}>
          {phase === "soan" ? "Đang soạn bộ câu"
            : phase === "ready" ? "Đã xác nhận — sẵn sàng"
              : phase === "countdown" ? "3 • 2 • 1 …"
                : "Đang trả lời"}
        </span>
      </div>

      <div className="rounded-xl border border-gold ring-1 ring-gold/30 bg-panel-solid p-3">
        <div className="flex justify-between items-center mb-3">
          <b className="text-sm" style={{ color: activeTeam?.color }}>{activeTeam?.name || g.currentTeam?.toUpperCase()}</b>
          <span className="text-ok text-xs">Đã chọn {picked.length}/3 câu{hasPackage ? ` • gói ${PACKAGE_LABEL[pkg]}` : ""}</span>
        </div>

        {/* Chọn gói câu hỏi — khóa khi chốt; khi đã chọn gói, bấm gói khác để chọn lại */}
        <div className="grid gap-1.5">
          {Object.entries(PACKAGES).map(([total, structure]) => {
            const totalVal = Number(total);
            const isCurrent = hasPackage && pkg === totalVal;
            return (
              <button
                key={total}
                type="button"
                disabled={locked}
                onClick={() => selectPackage(totalVal)}
                className={`rounded-lg border px-3 py-2 text-xs text-left transition ${
                  isCurrent
                    ? "border-ok/60 bg-ok/5"
                    : "border-dashed border-line hover:border-gold/50"
                }`}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="text-base font-bold text-gold">Gói {totalVal}đ</span>
                  <span className={isCurrent ? "text-ok" : "text-mist"}>
                    {structure.join(" + ")} điểm
                  </span>
                  {isCurrent && <span className="text-ok text-xs shrink-0">● ĐANG CHỌN</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bộ 3 câu đã được server chọn theo gói */}
        {hasPackage && (
          <div className="grid gap-1 mt-3 pt-3 border-t border-line">
            {[0, 1, 2].map((idx) => {
              const cand = picked[idx];
              const isCurrent = locked && idx === curIndex && cand;
              return (
                <div
                  key={idx}
                  className={`rounded-lg border px-3 py-2 text-xs flex justify-between items-center gap-2 ${
                    isCurrent ? "border-gold bg-gold/10" : "border-line"
                  }`}
                >
                  <span>
                    <span className="text-gold font-bold">Câu {idx + 1}</span>{" "}
                    <span className="text-mist">
                      {cand ? `${cand.points} điểm` : "…"}
                    </span>
                  </span>
                  {isCurrent && <span className="text-gold text-xs shrink-0">● ĐANG HIỆN</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Nút Xóa hết khi chưa chốt */}
        {!locked && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-line">
            <button
              type="button"
              className="btn btn-ghost text-xs py-1!"
              onClick={() => act("vedich.clear", { teamId: activeTeam?.id })}
            >
              Xóa hết (chọn lại gói)
            </button>
            <span className="text-mist text-xs">
              Chọn đúng 1 gói → sửa nội dung từng câu trong ngân hàng nếu cần rồi chốt.
            </span>
          </div>
        )}
      </div>

      {/* Hành động chốt / sửa lại + ngôi sao */}
      <div className="rounded-xl border border-line bg-panel-solid p-3 mt-3">
        {locked ? (
          <div className="flex flex-wrap gap-2 items-center">
            {phase === "ready" && (
              <div className="flex flex-wrap gap-2 items-center">
                <button type="button" className="btn btn-ok flex-1 min-w-[180px]" onClick={() => act("vedich.start")}>
                  Bắt đầu thi (3 • 2 • 1)
                </button>
                <button
                  type="button"
                  className={`btn ${star ? "btn-ok" : ""}`}
                  onClick={() => act("vedich.star", { star: !star })}
                >
                  Ngôi sao hy vọng {star ? "×2 (ON)" : "OFF"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => act("vedich.unlock")}>
                  Sửa lại
                </button>
              </div>
            )}
            {phase === "countdown" && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-gold font-display text-xl">Chuẩn bị thi — {remaining >= 0 ? remaining : 3}…</span>
                <button type="button" className="btn btn-ghost" onClick={() => act("vedich.unlock")}>Hủy</button>
              </div>
            )}
            {phase === "prep" && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={starUsed && !star}
                  className={`btn ${star ? "btn-ok" : ""}`}
                  onClick={() => act("vedich.star", { star: !star })}
                >
                  Ngôi sao hy vọng {star ? "×2 (ON)" : starUsed ? "(đã dùng)" : "OFF"}
                </button>
                <span className="text-mist text-xs flex-1">Câu {(curIndex || 0) + 1} đã sẵn sàng — chọn sao (nếu muốn) rồi trình câu hỏi cho đội {activeTeam?.name}.</span>
                <button type="button" className="btn btn-ok px-3!" onClick={() => act("question.show")}>
                  Hiện câu hỏi
                </button>
              </div>
            )}
            {phase === "answering" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-mist text-xs flex-1">
                  {stealOpen ? "Đội giành chuông trả lời" : `${activeTeam?.name} (${g.currentTeam?.toUpperCase()}) trả lời`}
                </span>
                {revealed && (
                  <button type="button" className="btn px-3!" onClick={() => act("question.next")}>
                    Câu tiếp →
                  </button>
                )}
                {!revealed && (
                  <>
                    <button type="button" className="btn btn-danger px-3!" onClick={() => act("answer.mark", { correct: false })}>
                      Sai −{pts}
                    </button>
                    <button type="button" className="btn btn-ok px-3!" onClick={() => act("answer.mark", { correct: true })}>
                      Đúng +{pts}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              disabled={!hasPackage || picked.length < 3}
              className="btn btn-ok flex-1 min-w-[180px]"
              onClick={() => act("vedich.lock")}
            >
              {hasPackage ? `Xác nhận bộ câu (gói ${PACKAGE_LABEL[pkg]}, ${picked.length}/3)` : "Chọn gói để chốt"}
            </button>
            <span className="text-mist text-xs">Chọn đúng 1 gói để khóa bộ câu (không sửa được từng câu). Ngôi sao hy vọng chọn ngay khi chuẩn bị hiện từng câu (mỗi đội 1 lần).</span>
          </div>
        )}
        <p className="text-mist text-[11px] mt-2.5">
          Chọn gói 60/80/100 → "Xác nhận bộ câu" → "Bắt đầu thi" (đếm 3-2-1) → hiện câu 1 để đội trả lời. Trả lời Sai → các đội khác bấm chuông giành quyền trả lời. Muốn đổi gói, bấm "Sửa lại" rồi chọn gói khác.
        </p>
      </div>
    </div>
  );
}