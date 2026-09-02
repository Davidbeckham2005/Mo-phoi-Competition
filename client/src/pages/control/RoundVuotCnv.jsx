import { activeTeamIds } from "../../lib/teams.js";

export default function RoundVuotCnv({ ctx }) {
  const { g, d, q, p, cnv, state, pts, solved, locked, cornersDone, cnvRowPhase, cnvKeywordPhase, rowOwner, revealed, showing, status, act } = ctx;
  if (g.round !== "vuot_cnv") return null;

  const rows = state.questions?.main?.vuotCnv?.rows || [];
  const hasSteal = p.awaitingSteal;
  const remain = [0, 1, 2, 3].filter((r) => !solved[r] && !locked[r]).length;
  // Được đánh giá "Đoán từ khóa": CHỈ khi có đội GHI DANH qua nút TỪ KHÓA
  // (puzzle.keywordClaim). Tách hoàn toàn khỏi chuông trả lời hàng ngang
  // (buzzer.winner) để không lẫn 2 chuông — tránh chấm nhầm điểm từ khóa cho
  // đội chỉ mới giành quyền trả lời hàng ngang.
  const kwClaim = p.keywordClaim;
  const kwGuessable = !p.keywordSolved && !!kwClaim;
  const kwWinner = kwClaim || null;
  const findTeam = (id) => state.teams?.find((t) => t.id === id);
  const banned = p.rowBanned || [];
  // Đội kế tiếp theo hàng đợi từ đầu vòng (order), lọc bỏ đội bị CẤM trả lời hàng ngang,
  // quay vòng qua danh sách còn được phép. Khớp logic bên server (selectRow).
  // VD: order = a,c,d,b, a bị ban → kế tiếp lần lượt c,d,b,c.
  const nextEligible = (() => {
    const eligible = (p.order || []).filter((id) => !banned.includes(id));
    if (eligible.length === 0) return null;
    return state.teams.find((t) => t.id === eligible[(p.turnIndex ?? 0) % eligible.length]);
  })();
  const picker = nextEligible;
  const pickerIndex = (p.order || []).indexOf(picker ? picker.id : -1);
  const pendingPick = p.pendingPick || [];
  const helpingOrder = p.orderPending;

  return (
    <div className="grid gap-3.5">
      {/* ĐIỀU KHIỂN — 1 switch màn hình + 2 nút chấm */}
      <div className="panel">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-line bg-night/50 p-1">
            <button
              type="button"
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                showing ? "bg-gold text-[#1a1400]" : "text-mist hover:text-gold"
              }`}
              title="Chuyển màn hình lớn sang câu hỏi (giữ nguyên đáp án đã lật, không đếm lại giờ)"
              onClick={() => act("screen.set", { mode: "question" })}
            >
              Câu hỏi
            </button>
            <button
              type="button"
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                !showing ? "bg-gold text-[#1a1400]" : "text-mist hover:text-gold"
              }`}
              onClick={() => act("screen.set", { mode: "puzzle" })}
            >
              Bảng mảnh
            </button>
          </div>
          {showing && !revealed && (
            <button type="button" className="btn btn-ghost text-sm! py-1.5!" onClick={() => act("question.reveal")}>
              Lật đáp án
            </button>
          )}
          {showing && revealed && (
            <button type="button" className="btn btn-ghost text-sm! py-1.5!" onClick={() => act("question.hideAnswer")}>
              Che đáp án
            </button>
          )}
          <span className={`badge text-xs! ${status.cls === "warn" ? "badge-warn" : status.cls === "ok" ? "badge-ok" : ""}`}>
            {status.text}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ok text-sm! py-1.5! px-3!"
              disabled={!q}
              title={cnvRowPhase ? `Đúng: +${pts} điểm và mở mảnh` : `Đúng: +${pts} điểm`}
              onClick={() => act("answer.mark", { correct: true })}
            >
              Đúng +{pts}
            </button>
            <button
              type="button"
              className="btn btn-danger text-sm! py-1.5! px-3!"
              disabled={!q}
              title={cnvRowPhase ? (hasSteal ? "Sai: −20 điểm và khóa ô" : "Sai: mở chuông cho các đội khác cướp") : "Sai: không trừ điểm"}
              onClick={() => act("answer.mark", { correct: false })}
            >
              Sai{hasSteal ? " −20" : ""}
            </button>
          </div>
        </div>
      </div>

      {/* CHỌN Ô — list câu hỏi + đáp án + đội gán */}
      <div className="panel">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="text-xs tracking-[0.18em] text-mist uppercase">Chọn ô</div>
          {helpingOrder ? (
            <div className="w-full mt-1.5 flex flex-wrap items-center gap-2 rounded-xl border border-gold/40 bg-gold/5 px-3 py-2">
              <span className="text-xs tracking-[0.18em] uppercase text-gold">Bằng điểm — xếp thứ tự chọn:</span>
              {state.teams.filter((t) => activeTeamIds(g, state.teams).includes(t.id)).map((t) => {
                const placed = pendingPick.includes(t.id);
                const pos = pendingPick.indexOf(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition ${
                      placed ? "border-gold bg-gold/15 text-gold" : "border-line text-mist hover:border-gold/60 hover:text-gold"
                    }`}
                    title={placed ? "Bấm để bỏ khỏi thứ tự" : "Bấm để xếp vào thứ tự"}
                    onClick={() => act("order.pick", { teamId: t.id })}
                  >
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                    {t.id.toUpperCase()}. {t.name}
                    {placed && <span className="text-mist text-[10px] font-bold ml-0.5">{pos + 1}✓</span>}
                  </button>
                );
              })}
              <span className="text-mist text-xs">
                Bấm đội theo thứ tự ai chọn trước ({pendingPick.length}/4) — bấm lại để bỏ, đủ 4 đội là chốt.
              </span>
            </div>
          ) : (
            <>
              <span className="text-xs tracking-wide text-mist uppercase">Thứ tự (điểm cao chọn trước):</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {p.order.map((id, j) => {
                  const t = findTeam(id);
                  if (!t) return null;
                  const isBanned = banned.includes(id);
                  const isNext = j === pickerIndex;
                  return (
                    <span
                      key={id}
                      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${
                        isBanned
                          ? "border-red-500/60 bg-red-500/10 text-red-300 line-through"
                          : isNext
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-line text-mist/60"
                      }`}
                    >
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: t.color }} />
                      {j + 1}. {t.name}
                    </span>
                  );
                })}
              </div>
            </>
          )}
          <span className="text-mist text-xs ml-auto">
            {p.keywordSolved
              ? "Đã đoán trúng từ khóa"
              : helpingOrder
                ? "Đang xếp thứ tự"
                : picker
                  ? `Kế tiếp: ${picker.name} — bấm "Chọn" ở ô cần mở`
                  : "Đã hết lượt chọn"}
          </span>
        </div>
        <div className="grid gap-2">
          {rows.map((row, i) => {
            const isCurrent = i === (p.currentRow ?? 0);
            const owner = rowOwner(i);
            const count = row.letterCount || String(row.answer || "").replace(/\s/g, "").length;
            const canOpen = !solved[i] && !locked[i] && !p.keywordSolved;
            const label = solved[i] ? "Đã mở" : locked[i] ? "Đã khóa" : isCurrent ? (hasSteal ? "Chờ cướp" : "Đang thi") : "Chưa gán";
            return (
              <div
                key={row.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 transition ${
                  isCurrent
                    ? "border-gold bg-gold/10"
                    : solved[i]
                      ? "border-ok/40 bg-ok/5"
                      : locked[i]
                        ? "border-danger/40 bg-danger/5"
                        : "border-line bg-panel-solid"
                }`}
              >
                <div className="flex items-center gap-2 w-9 shrink-0">
                  <span className={`flex items-center justify-center w-9 h-8 rounded-lg text-sm font-bold ${
                    solved[i] || isCurrent ? "bg-gold text-[#1a1400]" : locked[i] ? "bg-danger/10 text-danger/80" : "border border-line text-mist"
                  }`}>
                    {i + 1}
                  </span>
                </div>
                <div className="w-24 shrink-0 text-xs leading-tight">
                  <div className="text-gold font-bold">{row.points}đ</div>
                  <div className={solved[i] ? "text-ok" : locked[i] ? "text-danger/80" : isCurrent ? "text-gold" : "text-mist"}>{label}</div>
                </div>
                <div className="w-28 shrink-0 text-sm truncate" title={owner?.name}>
                  {owner ? (
                    <>
                      <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ background: owner.color }} />
                      <span style={{ color: owner.color }}>{owner.name}</span>
                    </>
                  ) : (
                    <span className="text-mist">—</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" title={row.question}>{row.question}</div>
                  <div className="text-ok text-sm font-semibold mt-0.5 truncate" title={row.answer}>
                    Đáp án: {row.answer} <span className="text-mist font-normal">• {count} chữ</span>
                  </div>
                </div>
                {canOpen ? (
                  picker ? (
                    <button
                      type="button"
                      className="btn text-sm! py-1.5! px-3! shrink-0"
                      title={`Gán ${picker.name} và mở câu hỏi`}
                      onClick={() => act("puzzle.select", { row: i })}
                    >
                      Chọn
                    </button>
                  ) : (
                    <span className="shrink-0 text-mist text-xs uppercase">Hết lượt</span>
                  )
                ) : (
                  <span className="shrink-0 w-14 text-right text-mist text-xs uppercase">Đã đóng</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* TỪ KHÓA */}
      <div className="panel">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs tracking-[0.18em] text-mist uppercase">Từ khóa</span>
          <div className="flex gap-1.5 ltr-row">
            {p.keywordSolved && cnv?.keyword
              ? cnv.keyword.split("").map((ch, j) => (
                  <span key={j} className={`ltr ${/\s/.test(ch) ? "" : "!border-line bg-panel-solid text-mist"}`}>
                    {/\s/.test(ch) ? "" : ch}
                  </span>
                ))
              : Array.from({ length: cnv?.keywordLetterCount || 0 }, (_, j) => <span key={j} className="ltr" />)}
            {!!cnv?.keywordLetterCount && <span className="text-mist text-sm ml-1">{cnv.keywordLetterCount} chữ</span>}
          </div>
          {p.centerRevealed && cnv?.centerHint && <span className="text-mist text-sm">★ {cnv.centerHint}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line px-2 py-1">
            <span className="text-xs text-mist mr-1">★ Ô trung tâm +10:</span>
            {state.teams.filter((t) => activeTeamIds(g, state.teams).includes(t.id)).map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={!cornersDone || p.centerRevealed}
                className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-mist transition hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed"
                title={`Đội ${t.name} trả lời đúng câu ô trung tâm → +10 và mở ô`}
                onClick={() => act("puzzle.center", { teamId: t.id })}
              >
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: t.color }} />
                {t.id.toUpperCase()}. {t.name}
              </button>
            ))}
            <button
              type="button"
              disabled={!cornersDone || p.centerRevealed}
              className="ml-1 text-xs text-mist transition hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed"
              title="Mở ô trung tâm không cộng điểm"
              onClick={() => act("puzzle.center", {})}
            >
              mở (không điểm)
            </button>
          </div>
          <button type="button" className="btn btn-ghost text-sm! py-1.5!" onClick={() => act("puzzle.all")}>
            Mở hết
          </button>
          <span className="text-mist text-xs">
            {p.keywordSolved
              ? "Đã có từ khóa."
              : hasSteal
                ? "Đang cướp quyền — sai −20 & khóa mảnh."
                : `Còn ${remain} ô chưa xử lý.`}
          </span>
        </div>
      </div>

      {/* GIÀNH QUYỀN KHI SAI / HẾT GIỜ */}
      {hasSteal && (
        <div className="panel border-danger/40 bg-danger/5">
          {g.buzzer?.winner ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-ok">Đang trả lời</span>
              <span className="text-sm text-mist">
                {state.teams.find((t) => t.id === g.buzzer.winner)?.name} — bấm Đúng / Sai ở trên để chấm.
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-mist">Sai / hết giờ — đội giành quyền:</span>
              {(state.teams || [])
                .filter((t) => activeTeamIds(g, state.teams).includes(t.id) && t.id !== g.currentTeam)
                .map((t) => (
                  <button key={t.id} type="button" className="btn btn-sm" onClick={() => act("buzzer.press", { teamId: t.id })}>
                    {t.name}
                  </button>
                ))}
              <button type="button" className="btn btn-ghost text-sm! py-1.5!" onClick={() => act("puzzle.skip")}>
                Bỏ qua
              </button>
            </div>
          )}
        </div>
      )}

      {/* ĐOÁN TỪ KHÓA — đơn giản: ai đã giải / ai giữ quyền + nút Đúng/Sai */}
      <div className="panel">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs tracking-[0.18em] text-mist uppercase">Từ khóa</span>
          {p.keywordSolved ? (
            <span className={`badge ${p.keywordWinner ? "badge-ok" : ""}`}>
              {p.keywordWinner
                ? `${findTeam(p.keywordWinner)?.name || ""} ĐÃ GIẢI`
                : "ĐÃ MỞ — không ai giải"}
            </span>
          ) : kwWinner ? (
            <span className="flex items-center gap-1.5 text-sm text-mist">
              Giữ quyền:
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: findTeam(kwWinner)?.color }}
              />
              <b>{findTeam(kwWinner)?.name}</b>
            </span>
          ) : (
            <span className="text-sm text-mist">Chờ đội bấm nút TỪ KHÓA</span>
          )}
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              className="btn btn-ok text-sm! py-1.5!"
              disabled={!kwGuessable || !kwWinner}
              title="Đúng: cộng điểm từ khóa cho đội đang giữ quyền và kết thúc vòng"
              onClick={() => act("keyword.solve", { teamId: kwWinner, correct: true })}
            >
              Đúng +{ctx.current?.keywordPoints ?? "?"}
            </button>
            <button
              type="button"
              className="btn btn-danger text-sm! py-1.5!"
              disabled={!kwGuessable || !kwWinner}
              title="Sai: chặn đội này, các đội khác tiếp tục giành quyền"
              onClick={() => act("keyword.solve", { teamId: kwWinner, correct: false })}
            >
              Sai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}