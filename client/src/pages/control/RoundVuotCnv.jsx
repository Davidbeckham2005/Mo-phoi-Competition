export default function RoundVuotCnv({ ctx }) {
  const { g, d, q, p, cnv, state, pts, solved, locked, cornersDone, cnvRowPhase, cnvKeywordPhase, rowOwner, cur, revealed, showing, status, act, pickTeam, setPickTeam } = ctx;
  if (g.round !== "vuot_cnv") return null;

  return (
    <div className="panel">
      <div className="rounded-xl border border-line bg-panel-solid/60 p-3 mb-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="text-xs tracking-[0.18em] text-mist uppercase">Câu hỏi &amp; chấm điểm</div>
          {cnvRowPhase && <span className="badge text-xs!">Hàng {(p.currentRow ?? 0) + 1} • {pts} điểm</span>}
          <span className={`badge text-xs! ${status.cls === "warn" ? "badge-warn" : status.cls === "ok" ? "badge-ok" : ""}`}>
            {status.text}
          </span>
        </div>

        {/* Bộ chuyển màn hình lớn — Round 2: lật qua lại CÂU HỎI / BẢNG một cách linh hoạt */}
        <div className="flex flex-wrap items-center gap-2 mb-3 rounded-xl border border-line bg-night/40 p-2.5">
          <span className="text-xs tracking-[0.18em] text-mist uppercase mr-1">Màn hình lớn:</span>
          <button
            type="button"
            className={`btn btn-ghost text-xs! py-1.5! px-3! ${d.mode === "question" ? "!border-gold text-gold" : ""}`}
            disabled={!q}
            onClick={() => {
              if (!q) return;
              if (d.mode !== "question") act("screen.set", { mode: "question" });
            }}
          >
            MÀN CÂU HỎI
          </button>
          <button
            type="button"
            className={`btn btn-ghost text-xs! py-1.5! px-3! ${d.mode !== "question" ? "!border-gold text-gold" : ""}`}
            onClick={() => {
              if (d.mode === "question") act("screen.set", { mode: "puzzle" });
            }}
          >
            MÀN ẢNH + HÀNG NGANG
          </button>
          <span className="text-mist text-xs ml-auto">
            {d.mode === "question" ? "Đang hiện: MÀN CÂU HỎI" : "Đang hiện: ẢNH + HÀNG NGANG"}
          </span>
        </div>

        {!q ? (
          <div className="text-mist text-sm mb-3">
            Chưa có câu hỏi — bấm một hàng ngang (hoặc ô) trên bảng để hiện câu hỏi.
          </div>
        ) : (
          <>
            <div className="font-display text-lg leading-snug mb-1.5">{q.question}</div>
            <div className="mb-3">
              <span
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                  revealed
                    ? "border-ok/50 bg-ok/10 text-ok font-semibold"
                    : "border-line bg-night/60 text-mist tracking-[0.2em]"
                }`}
              >
                Đáp án: {revealed ? q.answer : "••••••"}
                {!!q.letterCount && <span className="tracking-normal text-mist"> • {q.letterCount} chữ</span>}
              </span>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" className="btn" disabled={!q} onClick={() => act("question.show")}>Hiện câu hỏi</button>
            <button type="button" className="btn btn-ghost" disabled={!showing} onClick={() => act("question.hide")}>Ẩn câu hỏi</button>
            <button type="button" className="btn btn-ok" disabled={!showing || revealed} onClick={() => act("question.reveal")}>Lật đáp án</button>
            {showing && revealed && (
              <button type="button" className="btn btn-ghost" onClick={() => act("question.hideAnswer")}>Che đáp án</button>
            )}
          </div>
          <div className="flex gap-2 items-center ml-auto">
            <span className="text-mist text-xs uppercase mr-1">Chấm:</span>
            <button type="button" className="btn btn-ok" disabled={!q} onClick={() => act("answer.mark", { correct: true })}>
              Đúng +{pts}{cnvRowPhase ? " • mở mảnh" : ""}
            </button>
            <button type="button" className="btn btn-danger" disabled={!q} onClick={() => act("answer.mark", { correct: false })}>
              Sai {cnvRowPhase ? (p.awaitingSteal ? "−20 • khóa mảnh" : "mở chuông cướp quyền") : ""}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center">
        {/* Cột 1 — bảng 5 ô (giống khán giả) */}
        <div className="flex flex-col items-center justify-center gap-4 min-w-0">
          {/* Đội thi cho ô — ràng buộc: ô chỉ được gán cho 1 đội, đã gán không thể đổi tùy tiện */}
          <div className="w-full rounded-xl border border-line bg-night/40 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs tracking-[0.18em] text-mist uppercase mr-1">Đội thi cho ô:</span>
              {state.teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPickTeam(t.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm transition ${
                    pickTeam === t.id
                      ? "bg-gold/10 text-gold font-semibold"
                      : "text-mist hover:bg-panel-solid"
                  }`}
                  style={pickTeam === t.id ? { boxShadow: `0 0 0 2px ${t.color}66` } : undefined}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </button>
              ))}
              <span className="text-mist text-xs ml-auto">
                Ô đã gán đội khác sẽ bị chặn cho tới khi ô đó kết thúc.
              </span>
            </div>
          </div>

          <div className="relative w-full max-w-[420px] aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-line">
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
              {[0, 1, 2, 3].map((r) => {
                const owner = rowOwner(r);
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={solved[r] || locked[r]}
                    onClick={() => act("puzzle.select", { row: r, teamId: pickTeam })}
                    className={`relative grid place-items-center font-display font-bold text-[clamp(24px,2.6vw,44px)] transition-colors ${
                      solved[r]
                        ? "bg-gold/90 text-[#1a1400]"
                        : locked[r]
                          ? "bg-danger/10 text-danger/80 cursor-not-allowed"
                          : p.currentRow === r
                            ? "bg-gold/20 text-gold"
                            : "bg-panel-solid text-mist hover:bg-gold/10"
                    }`}
                  >
                    {solved[r] ? r + 1 : locked[r] ? "✕" : "?"}
                    {owner && (
                      <span
                        className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-night"
                        style={{ background: owner.color }}
                        title={`Đội ${owner.name} thi ô này`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-line" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-line" />
            </div>

            <button
              type="button"
              disabled={!cornersDone}
              onClick={() => act("puzzle.center")}
              title={cornersDone ? "Mở ô trung tâm" : "Chỉ mở khi 4 góc đã xử lý hết"}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[38%] h-[46%] rounded-xl border-2 grid place-items-center font-display font-bold text-[clamp(20px,2.2vw,36px)] ${
                p.centerRevealed
                  ? "bg-gold text-[#1a1400] border-gold"
                  : cornersDone
                    ? "bg-night border-gold text-gold hover:bg-gold/10"
                    : "bg-night border-line text-mist cursor-not-allowed"
              }`}
            >
              {p.centerRevealed ? "★" : "?"}
            </button>
          </div>

          <div className="text-mist text-sm text-center mt-1">
            {p.keywordSolved
              ? "Đã đoán trúng từ khóa — kết thúc vòng."
              : p.awaitingSteal
                ? "Đội chọn trả lời SAI — chuông đang mở cho đội khác giành quyền (đúng +10 • sai −20 và khóa mảnh)."
                : cnvKeywordPhase
                  ? "Đủ 4 góc — có thể mở trung tâm hoặc nhận đoán từ khóa của các đội."
                  : `Chọn một hàng ngang rồi bấm Hiện câu hỏi.${cur?.name ? ` (${cur.name} đang thi ô ${(p.currentRow ?? 0) + 1})` : ""}`}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <button type="button" className="btn btn-ghost" onClick={() => act("puzzle.show")}>Hiện bảng</button>
            <button type="button" className="btn btn-ghost" onClick={() => act("puzzle.all")}>Mở hết (hạ màn)</button>
          </div>
        </div>

        {/* Cột 2 — danh mục từ khóa (giống khán giả) */}
        <div className="cnv-mc flex flex-col gap-2.5 min-w-0">
          {(state.questions?.main?.vuotCnv?.rows || []).map((row, i) => {
            const st = cnv?.rows?.[i]?.status || (solved[i] ? "open" : locked[i] ? "locked" : "hidden");
            const word = cnv?.rows?.[i]?.word || (solved[i] ? row.answer || "" : "");
            const count = row.letterCount || String(row.answer || "").replace(/\s/g, "").length;
            const isCurrent = i === (p.currentRow ?? 0);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => !solved[i] && !locked[i] && act("puzzle.select", { row: i, teamId: pickTeam })}
                disabled={solved[i] || locked[i]}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left w-full transition ${
                  isCurrent ? "ring-1 ring-gold bg-gold/10" : "hover:bg-panel-solid"
                }`}
              >
                <span className={`flex items-center justify-center w-9 h-8 rounded-lg text-sm font-bold shrink-0 ${
                  solved[i] ? "bg-gold text-[#1a1400]" : locked[i] ? "bg-danger/10 text-danger/80" : isCurrent ? "bg-gold text-[#1a1400]" : "border border-line text-mist"
                }`}>
                  {i + 1}
                </span>
                <span className={`shrink-0 text-sm ${solved[i] ? "text-gold" : locked[i] ? "text-danger/80" : isCurrent ? "text-gold font-semibold" : "text-mist"}`}>
                  Hàng {i + 1}
                  {rowOwner(i) && (solved[i] || locked[i]) && (
                    <span className="text-mist text-xs" style={{ color: rowOwner(i).color }}>
                      {" "}• {rowOwner(i).name}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-mist text-xs">{row.points}đ</span>
                <span className="flex gap-1.5 ltr-row">
                  {st === "open"
                    ? word.replace(/\s/g, "").split("").map((ch, j) => <span key={j} className="ltr ltr-open">{ch}</span>)
                    : st === "locked"
                      ? Array.from({ length: count }, (_, j) => <span key={j} className="ltr ltr-locked">✕</span>)
                      : Array.from({ length: count }, (_, j) => <span key={j} className="ltr" />)}
                </span>
                {isCurrent && <span className="badge badge-ok ml-auto shrink-0 text-xs!">đang hiện ảnh {i + 1}</span>}
              </button>
            );
          })}

          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-sm w-14 shrink-0 text-right text-gold">Từ khóa</span>
            <div className="flex gap-1.5 ltr-row">
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
          </div>

          {p.centerRevealed && cnv?.centerHint && (
            <div className="text-gold text-sm mt-1">★ {cnv.centerHint}</div>
          )}
        </div>
      </div>

      {p.awaitingSteal && (
        <div className="mt-4 rounded-xl border border-danger/40 bg-danger/5 p-3">
          <div className="text-xs tracking-[0.18em] uppercase mb-2 text-danger">
            {g.buzzer?.winner ? "Đang trả lời" : "Hết giờ — trao quyền trả lời"}
          </div>
          {g.buzzer?.winner ? (
            <div className="text-sm text-ok font-semibold">
              {state.teams.find((t) => t.id === g.buzzer.winner)?.name} đang trả lời.
              Bấm ĐÚNG / SAI ở panel Chấm điểm để chấm (Đúng +10 • mở mảnh, Sai −20 • khóa mảnh).
            </div>
          ) : (
            <>
              <div className="text-mist text-sm mb-2">Bấm chọn đội giành được quyền:</div>
              <div className="flex flex-wrap gap-2">
                {(state.teams || [])
                  .filter((t) => t.id !== g.currentTeam)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="btn"
                      onClick={() => act("buzzer.press", { teamId: t.id })}
                    >
                      {t.name}
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="text-xs tracking-[0.18em] text-mist uppercase mt-5 mb-2">Đoán từ khóa</div>
      <div className="flex flex-wrap gap-2">
        {state.teams.map((t) => (
          <button
            key={t.id}
            type="button"
            className="btn btn-ok"
            onClick={() => act("keyword.solve", { teamId: t.id, correct: true })}
          >
            Đúng: {t.name} (+{ctx.current?.keywordPoints ?? "?"})
          </button>
        ))}
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => act("keyword.solve", { teamId: g.buzzer?.winner, correct: false })}
        >
          Sai (khóa đội bấm chuông)
        </button>
      </div>
    </div>
  );
}