import { useEffect, useRef, useState } from "react";

export default function RoundTangToc({ ctx }) {
  const { g, act, state } = ctx;
  const vidRef = useRef(null);
  // Modal nhập mật khẩu admin khi MC bấm "Dừng video" hoặc đổi câu giữa lúc đang chiếu.
  const [prompt, setPrompt] = useState(null); // { kind: "stop" } | { kind: "jump", index }
  const [promptPin, setPromptPin] = useState("");
  const tt = g.tangToc || {};
  const phase = tt.phase || "video";
  const settled = !!tt.settled;
  // CÁC hook KHÔNG được đặt sau return sớm (Rules of Hooks) — g.round từ khoi_dong
  // đổi sang tang_toc vẫn phải chạy hook ổn định.

  function closePrompt() {
    setPrompt(null);
    setPromptPin("");
  }
  function confirmPrompt() {
    if (!prompt) return;
    if (prompt.kind === "stop") {
      act("tangtoc.stop", { pin: promptPin });
    } else if (prompt.kind === "jump") {
      act("question.jump", { teamId: g.currentTeam, questionIndex: prompt.index, pin: promptPin });
    }
    closePrompt();
  }
  function selectQuestion(i) {
    if (phase === "video" && running) {
      if (i === curIdx) return; // đang chiếu chính câu này — bấm lại không làm gì (tránh xóa bài đã nộp)
      setPrompt({ kind: "jump", index: i });
      setPromptPin("");
      return;
    }
    act("question.jump", { teamId: g.currentTeam, questionIndex: i });
  }
  const qs = state.questions?.main?.tangToc || [];
  const curIdx = g.questionIndex || 0;
  const curQ = qs[curIdx];
  const subs = tt.submissions || {};
  const ranked = tt.ranked || [];
  const corrections = tt.corrections || {};
  const teams = state.teams || [];
  // Đồng hồ CHÍNH THỨC là game:timer trực tiếp (ctx.timer) — state.game.timer bị lược bỏ
  // ở state.service (publicGame bỏ timer ra khỏi game), nên KHÔNG dùng g.timer.
  const timer = ctx.timer || {};
  const running = !!timer.running;
  const shown = (g.display?.mode === "question") && (g.display?.mediaType === "video" || phase === "video");
  const duration = timer.duration || curQ?.duration || 0;
  const remaining = timer.remaining ?? 0;
  const subCount = Object.keys(subs).length;
  // ĐỒNG BỘ VIDEO + THỜI GIAN với màn hình khán giả: mọi màn hình SnAP video theo cùng
  // đồng hồ server (duration - remaining) mỗi 250ms → cùng vị trí, cùng lúc.
  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    const apply = () => {
      if (phase !== "video" || !shown) {
        v.pause();
        return;
      }
      if (!running || !timer.duration) {
        v.pause();
        return;
      }
      const elapsed = Math.max(0, timer.duration - remaining);
      const finiteDur = v.duration && isFinite(v.duration) && v.duration > 0;
      const target = Math.min(elapsed, finiteDur ? v.duration : timer.duration);
      // Chưa khớp vị trí: seek + dừng, chờ seeked/canplay rồi mới phát.
      if (v.readyState >= 1 && Math.abs(v.currentTime - target) > 0.15) {
        v.currentTime = target;
        v.pause();
        return;
      }
      v.play().catch(() => {});
    };
    apply();
    // Nạp xong / đổi duration / seek xong / phát được → căn ngay (không chờ nhịp 250ms kế).
    v.addEventListener("loadedmetadata", apply);
    v.addEventListener("durationchange", apply);
    v.addEventListener("canplay", apply);
    v.addEventListener("seeked", apply);
    return () => {
      v.removeEventListener("loadedmetadata", apply);
      v.removeEventListener("durationchange", apply);
      v.removeEventListener("canplay", apply);
      v.removeEventListener("seeked", apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, running, remaining, timer.duration, shown, g.display?.mediaUrl]);

  if (g.round !== "tang_toc") return null;

  let status = { label: "Chưa chọn câu — bấm Câu 1–4", tone: "badge" };
  if (settled) status = { label: "Đã kết thúc (đã chốt điểm)", tone: "badge-ok" };
  else if (phase === "preparing") status = { label: `Đang chuẩn bị chiếu — đếm ngược ${Math.max(0, remaining)}s`, tone: "badge-warn" };
  else if (phase === "answers") status = { label: "Đang chấm đáp án", tone: "badge-warn" };
  else if (shown && running) status = { label: "Đang chiếu video — các đội đang nộp đáp án", tone: "badge-ok" };
  else if (shown && !running) status = { label: "Sẵn sàng chiếu — bấm “▶ Chiếu video”", tone: "badge" };

  const rows = teams
    .filter((t) => ["a", "b", "c", "d"].includes(t.id))
    .map((t) => {
      const sub = subs[t.id];
      const r = ranked.find((x) => x.teamId === t.id);
      const corr = r
        ? r.correct
        : corrections[t.id] === true
          ? true
          : corrections[t.id] === false
            ? false
            : null;
      return {
        teamId: t.id,
        name: t.name,
        color: t.color,
        answer: r?.answer ?? sub?.answer ?? null,
        elapsed: r?.elapsed ?? sub?.elapsed ?? null,
        submitted: !!sub,
        correct: corr,
        points: r?.points ?? 0,
        place: r?.place ?? null,
      };
    })
    .sort((a, b) => (a.elapsed ?? Infinity) - (b.elapsed ?? Infinity));

  return (
    <div className="panel">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-xs tracking-[0.18em] text-mist uppercase">Quản lý vòng — Tăng tốc</div>
        <span className={`${status.tone} text-sm px-3 py-1`}>{status.label}</span>
        <span className="text-mist text-sm ml-auto">
          Đã nộp <b className="text-white">{subCount}</b>/4 • Đồng hồ{" "}
          {running ? <b className="text-gold">{remaining}s</b> : <b className="text-mist">{remaining}s (dừng)</b>} / {duration}s
        </span>
      </div>

      {/* 1. Chọn câu hỏi + điều khiển video */}
      <div className="rounded-xl border border-line bg-night/40 p-3 mb-3">
        <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Video đang chiếu</div>
        <div className="grid gap-2 sm:grid-cols-4 mb-3">
          {qs.map((qd, i) => {
            const isCurrent = i === curIdx;
            const switching = running && phase === "video";
            return (
              <button
                key={qd.id}
                type="button"
                onClick={() => selectQuestion(i)}
                title={
                  switching && i !== curIdx
                    ? "Đang chiếu video — đổi câu cần mật khẩu admin"
                    : `Chọn câu ${i + 1} để chuẩn bị chiếu`
                }
                className={`rounded-xl border-2 px-3 py-2 text-left transition ${
                  isCurrent ? "border-gold bg-gold/10 text-gold" : "border-line text-mist hover:border-gold/50"
                }`}
              >
                <div className="font-bold text-sm">
                  Câu {i + 1}{isCurrent ? " ●" : ""}
                  {switching && i !== curIdx ? <span className="ml-1 text-xs">🔒</span> : ""}
                </div>
                <div className="text-xs text-mist">{qd.duration}s</div>
              </button>
            );
          })}
        </div>
        <video
          ref={vidRef}
          src={g.display?.mediaUrl || undefined}
          controls
          muted
          playsInline
          preload="auto"
          className="w-full max-h-[42vh] rounded-xl border border-line bg-black object-contain mb-2"
        />
        {!g.display?.mediaUrl && (
          <div className="text-mist text-xs mb-3 text-center">
            Chưa cài video cho câu này — vào Admin → Câu hỏi → Tăng tốc để đặt video. Chưa có nội dung để phát.
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {phase === "preparing" ? (
            <button type="button" className="btn btn-ok disabled:opacity-60" disabled>
              Chuẩn bị chiếu… {Math.max(0, remaining)}s
            </button>
          ) : phase === "video" && running ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setPrompt({ kind: "stop" })}
              title="Dừng video — cần mật khẩu admin"
            >
              ⏸ Dừng video
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ok disabled:opacity-45"
              disabled={settled || phase === "answers"}
              onClick={() => act("tangtoc.play")}
              title={
                settled || phase === "answers"
                  ? "Đang chấm đáp án — chọn câu khác để chiếu"
                  : `Chuẩn bị ${Math.max(0, remaining)}s rồi chiếu video câu ${curIdx + 1} từ đầu, đồng bộ trên mọi màn hình`
              }
            >
              ▶ Chiếu video (Câu {curIdx + 1})
            </button>
          )}
          <span className="text-mist text-sm ml-auto">
            {phase === "video" && running
              ? "Bấm Dừng sẽ hỏi mật khẩu admin. Đang chiếu ⏺"
              : g.display?.mediaUrl
                ? "Video đã cài — chọn câu rồi bấm Chiếu"
                : "Chưa cài video — khán giả thấy ô chờ"}
          </span>
        </div>
      </div>

      {/* 2. Bảng 4 đội: trạng thái nộp bài + thời gian + thứ hạng + điểm */}
      <div className="rounded-xl border border-line bg-night/40 p-3 mb-3">
        <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Các đội — theo thứ tự nộp bài</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-mist text-xs uppercase tracking-wider">
              <th className="text-left font-medium pb-2">Đội</th>
              <th className="text-left font-medium pb-2">Trả lời</th>
              <th className="text-right font-medium pb-2">Thời gian</th>
              <th className="text-center font-medium pb-2">Thứ hạng</th>
              <th className="text-right font-medium pb-2">Điểm</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const rank = r.place ?? i + 1;
              return (
                <tr key={r.teamId} className="border-t border-line/50">
                  <td className="py-2 pr-2">
                    <span className="font-semibold" style={{ color: r.color }}>{r.name}</span>
                  </td>
                  <td className="py-2 pr-2">
                    {r.submitted ? (
                      <span className="truncate block max-w-[220px]" title={r.answer}>“{r.answer}”</span>
                    ) : (
                      <span className="text-mist">chưa nộp</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right text-mist">
                    {r.submitted ? `${r.elapsed?.toFixed ? r.elapsed.toFixed(1) : r.elapsed}s` : "—"}
                  </td>
                  <td className="py-2 text-center">
                    {r.submitted ? (
                      <b className={r.place === 1 ? "text-gold" : "text-mist"}>{r.place ?? i + 1}</b>
                    ) : (
                      <span className="text-mist">—</span>
                    )}
                  </td>
                  <td className={`py-2 text-right font-display font-bold ${r.correct === true ? "text-ok" : r.correct === false ? "text-danger" : "text-mist"}`}>
                    {r.correct === true ? `+${r.points}` : r.correct === false ? "0" : settled ? "0" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. Xử lý câu trả lời đúng / sai */}
      <div className="rounded-xl border border-line bg-night/40 p-3">
        <div className="text-xs tracking-[0.18em] text-mist uppercase mb-1">Chấm đúng / sai</div>
        <p className="text-mist text-sm mb-2">
          Chỉ đội <b className="text-ok">Đúng</b> mới được điểm theo độ nhanh (40/30/20/10); đội <b className="text-danger">Sai</b> = 0đ, không trừ.
        </p>
        <div className="space-y-2">
          {rows.map((r) => {
            const ok = r.correct === true;
            const bad = r.correct === false;
            const undetermined = r.correct !== true && r.correct !== false;
            return (
              <div key={r.teamId} className="flex items-center gap-3 rounded-xl bg-panel-solid border border-line px-3 py-2">
                <b style={{ color: r.color }} className="w-28 shrink-0 text-sm">{r.name}</b>
                <span className="min-w-0 flex-1 truncate text-xs text-mist" title={r.answer || ""}>
                  {r.submitted ? (
                    <>
                      nộp {r.elapsed?.toFixed ? r.elapsed.toFixed(1) : r.elapsed}s
                      {r.answer ? ` — “${r.answer}”` : ""}
                    </>
                  ) : (
                    "chưa nộp"
                  )}
                </span>
                {!settled && phase === "answers" && (
                  <>
                    <button
                      type="button"
                      className={`btn btn-ghost py-1! px-3! text-xs ${ok ? "btn-ok" : ""}`}
                      onClick={() => act("tangtoc.mark", { teamId: r.teamId, correct: true })}
                    >
                      Đúng {ok ? "✓" : ""}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost py-1! px-3! text-xs ${bad ? "btn-danger" : ""}`}
                      onClick={() => act("tangtoc.mark", { teamId: r.teamId, correct: false })}
                    >
                      Sai {bad ? "✕" : ""}
                    </button>
                  </>
                )}
                <span className={`w-16 text-right font-display font-bold text-sm ${ok ? "text-ok" : bad ? "text-danger" : "text-mist"}`}>
                  {ok ? `+${r.points}` : bad ? "0" : undetermined ? "—" : (settled && r.points ? `+${r.points}` : "")}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button
            type="button"
            className="btn"
            disabled={!settled && Object.keys(corrections).length === 0}
            onClick={() => act("tangtoc.settle")}
          >
            {settled ? "Đã chốt điểm ✓" : "Chốt điểm Tăng tốc"}
          </button>
          <span className="text-mist text-sm">
            {settled
              ? "Điểm đã cộng vào bảng tổng."
              : "Chốt điểm sẽ cộng điểm các đội đúng (đúng + sai không bị trừ)."}
          </span>
        </div>
      </div>

      {prompt && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closePrompt}
        >
          <div className="panel w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-danger">
              <span className="text-2xl">🔒</span>
              <h3 className="font-display font-bold">
                {prompt.kind === "stop" ? "Dừng video Tăng tốc?" : "Đổi câu giữa lúc chiếu?"}
              </h3>
            </div>
            <p className="text-mist mt-3 leading-relaxed">
              {prompt.kind === "stop"
                ? "Đang chiếu video cho khán giả và các đội. Bạn cần nhập mật khẩu admin để dừng video trước khi hết thời lượng."
                : `Đang chiếu video của Câu ${curIdx + 1}. Bạn cần nhập mật khẩu admin để đổi sang Câu ${prompt.index + 1}.`}
            </p>
            <input
              autoFocus
              type="password"
              placeholder="Nhập mật khẩu admin"
              value={promptPin}
              onChange={(e) => setPromptPin(e.target.value)}
              className="mt-3 w-full!"
              onKeyDown={(e) => {
                if (e.key === "Enter" && promptPin) confirmPrompt();
              }}
            />
            <div className="flex gap-2 mt-5">
              <button type="button" className="btn flex-1" onClick={closePrompt}>
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-danger flex-1"
                disabled={!promptPin}
                onClick={confirmPrompt}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
