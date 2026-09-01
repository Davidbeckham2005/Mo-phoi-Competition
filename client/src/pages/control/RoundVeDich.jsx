import { useState } from "react";

export default function RoundVeDich({ ctx }) {
  const { g, state, act, remaining, q, pts, revealed } = ctx;
  const [slot, setSlot] = useState(null);
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

  function pick(points, targetSlot) {
    setSlot(null);
    act("vedich.pick", { points, slot: targetSlot });
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
          <span className="text-ok text-xs">Đã chọn {picked.length}/3 câu</span>
        </div>

        {/* 3 vị trí câu — bấm để chọn slot (khi chưa chốt) */}
        <div className="grid gap-1.5">
          {[0, 1, 2].map((idx) => {
            const q = picked[idx];
            const isCurrent = locked && idx === curIndex && q;
            const isSelected = !locked && slot === idx;
            return (
              <button
                key={idx}
                type="button"
                disabled={locked}
                onClick={() => (locked ? undefined : setSlot(isSelected ? null : idx))}
                className={`rounded-lg border px-3 py-2 text-xs text-left transition ${
                  isCurrent
                    ? "border-gold bg-gold/10"
                    : isSelected
                      ? "border-gold ring-1 ring-gold/40 bg-gold/20"
                      : q
                        ? "border-ok/60 bg-ok/5"
                        : "border-dashed border-line"
                }`}
              >
                <div className="flex justify-between items-center gap-2">
                  <span>
                    {q
                      ? <span className="text-gold font-bold">Câu {idx + 1} • {q.points} điểm</span>
                      : <span className="text-mist">Chưa chọn câu {idx + 1}</span>}
                  </span>
                  {isCurrent && <span className="text-gold text-xs shrink-0">● ĐANG HIỆN</span>}
                  {isSelected && <span className="text-gold text-xs shrink-0">Đang thay thế →</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Thanh điều chỉnh khi chưa chốt */}
        {!locked && (
          <>
            {(() => {
              // Slots 20/30/40; khi thay thế 1 slot đã có câu, bỏ mức trùng để chỉ
              // cho đổi sang 1 trong 2 mức còn lại (mỗi câu chỉ chọn 1 trong 3 mức).
              const currentPts = slot !== null ? (picked[slot]?.points ?? null) : null;
              const levelOptions = [20, 30, 40].filter((pt) => pt !== currentPts);
              return (
                <>
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-line">
                    <span className="text-mist text-xs mr-1">
                      {slot !== null
                        ? `Thay thế Câu ${slot + 1} (đang ${currentPts}đ) bằng 1 trong 2 mức:`
                        : picked.length >= 3
                          ? "Đã đủ 3 câu — chọn 1 vị trí ở trên để thay thế."
                          : `Thêm câu ${picked.length + 1}/3 chọn mức:`}
                    </span>
                    {levelOptions.map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        className="btn"
                        disabled={slot === null && picked.length >= 3}
                        onClick={() => pick(pt, slot ?? picked.length)}
                      >
                        {pt}đ
                      </button>
                    ))}
                  </div>
                  <p className="text-mist text-[11px] mt-1">
                    Mỗi câu chỉ được chọn 1 trong 3 mức (20/30/40). Trong bộ, hai câu khác nhau vẫn có thể cùng mức.
                  </p>
                </>
              );
            })()}
            <div className="flex flex-wrap gap-2 mt-2">
              {picked.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  className="btn btn-danger text-xs py-1!"
                  onClick={() => act("vedich.remove", { slot: idx })}
                >
                  Bỏ {q.points}đ (câu {idx + 1})
                </button>
              ))}
              <button
                type="button"
                className="btn btn-ghost text-xs py-1!"
                onClick={() => act("vedich.clear", { teamId: activeTeam?.id })}
              >
                Xóa hết
              </button>
            </div>
          </>
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
              disabled={picked.length < 3}
              className="btn btn-ok flex-1 min-w-[180px]"
              onClick={() => act("vedich.lock")}
            >
              Xác nhận bộ câu ({picked.length}/3)
            </button>
            <span className="text-mist text-xs">Đã đủ 3 câu rồi bấm "Xác nhận bộ câu". Ngôi sao hy vọng sẽ chọn ngay khi chuẩn bị hiện từng câu (mỗi đội 1 lần).</span>
          </div>
        )}
        <p className="text-mist text-[11px] mt-2.5">
          Soạn xong 3 câu → "Xác nhận bộ câu" → "Bắt đầu thi" (đếm 3-2-1) → hiện câu 1 để đội trả lời. Trả lời Sai → các đội khác bấm chuông giành quyền trả lời.
        </p>
      </div>
    </div>
  );
}