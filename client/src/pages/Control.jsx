import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendControl, getCurrentQuestion } from "../lib/api/control.js";
import { getPin } from "../lib/session.js";
import { formatTime } from "../lib/format.js";
import { on } from "../lib/socket.js";
import { useGameState } from "../lib/useGame.js";

export default function Control() {
  const nav = useNavigate();
  const { state } = useGameState();
  const [current, setCurrent] = useState(null);
  const [seconds, setSeconds] = useState(15);
  const [delta, setDelta] = useState(10);
  const [kdTimer, setKdTimer] = useState(60);

  async function refreshQ() {
    try {
      setCurrent(await getCurrentQuestion());
    } catch {
      nav("/dang-nhap?next=/mc");
    }
  }

  useEffect(() => {
    if (!getPin()) {
      nav("/dang-nhap?next=/mc");
      return;
    }
    refreshQ();
    return on("game:state", () => {
      refreshQ();
    });
  }, [nav]); // eslint-disable-line react-hooks/exhaustive-deps

  function act(action, body) {
    sendControl(action, body).catch((e) => alert(e.message));
  }

  if (!state) return <div className="min-h-screen grid place-items-center text-mist">Đang tải bàn điều khiển…</div>;

  const g = state.game || {};
  const q = current?.question;
  const d = g.display || {};
  const p = g.puzzle || {};
  const isKd = g.round === "khoi_dong";

  const solved = p.rowsSolved || [false, false, false, false];
  const locked = p.rowsLocked || [false, false, false, false];
  const cornersDone = [0, 1, 2, 3].every((i) => solved[i] || locked[i]);
  const cnvRowPhase = g.round === "vuot_cnv" && !cornersDone;
  const cnvKeywordPhase = g.round === "vuot_cnv" && cornersDone && !p.keywordSolved;

  const showing = d.mode === "question";
  const revealed = !!d.answerRevealed;

  const winner = state.teams.find((t) => t.id === g.buzzer?.winner);
  const cur = state.teams.find((t) => t.id === g.currentTeam);
  const answering = winner || cur;

  let pts = q?.points || current?.keywordPoints || 10;
  if (g.round === "ve_dich") {
    pts = (g.veDich?.packagePoints || 20) * (g.veDich?.star ? 2 : 1);
  }

  let status = { cls: "", text: "BẢNG CHÍNH" };
  if (isKd && showing) status = { cls: "ok", text: "ĐANG THI" };
  else if (p.keywordSolved && g.round === "vuot_cnv") status = { cls: "ok", text: "ĐÃ XUẤT TỪ KHÓA" };
  else if (p.awaitingSteal) status = { cls: "warn", text: "CHỜ CƯỚP QUYỀN" };
  else if (showing && revealed) status = { cls: "warn", text: "ĐÃ LẬT ĐÁP ÁN" };
  else if (showing) status = { cls: "ok", text: "ĐANG HIỆN CÂU HỎI" };

  let progress = "";
  if (isKd) progress = `Câu ${g.questionIndex + 1}/6 • ${cur?.name || ""}`;
  else if (g.round === "tang_toc") progress = `Câu ${(g.questionIndex || 0) + 1}/4`;
  else if (g.round === "vuot_cnv") {
    const doneCount = solved.filter(Boolean).length;
    progress = cnvKeywordPhase
      ? `Đoán từ khóa • ${doneCount}/4 góc mở`
      : `Hàng ngang ${(p.currentRow ?? 0) + 1} • ${cornersDone ? 4 : doneCount}/4 góc xong`;
  } else if (g.round === "ve_dich") {
    progress = `Gói ${g.veDich?.packagePoints}${g.veDich?.star ? " • Sao ×2" : ""} • ${cur?.name || ""}`;
  }

  const saiText = cnvRowPhase
    ? p.awaitingSteal ? "−20 & KHÓA mảnh" : "mở chuông cướp quyền"
    : g.round === "ve_dich" && g.veDich?.star
      ? `−${(g.veDich?.packagePoints || 20) * 2}`
      : "không trừ";

  return (
    <div className="grid gap-4 px-4 py-5 mx-auto max-w-[1400px] lg:grid-cols-[280px_1fr_300px] items-start">
      {/* CỘT TRÁI — Vòng thi / đội */}
      <aside className="panel">
        <div className="kicker">MC / Ban tổ chức</div>
        <h3 className="font-display font-bold mt-2 mb-4">{state.settings?.title}</h3>
        <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Vòng thi</div>
        <div className="grid gap-2">
          {[
            ["khoi_dong", "Khởi động"],
            ["vuot_cnv", "Vượt CNV"],
            ["tang_toc", "Tăng tốc"],
            ["ve_dich", "Về đích"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn btn-ghost ${g.round === id ? "!border-gold text-gold" : ""}`}
              onClick={() => act("round.start", { round: id })}
            >
              {label}
            </button>
          ))}
          <button type="button" className="btn" onClick={() => act("scores.show")}>Hiện bảng điểm</button>
          <button type="button" className="btn btn-ok" onClick={() => act("contest.finish")}>Kết quả cuối</button>
        </div>
        <hr className="my-4 border-line" />
        <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Đội đang thi</div>
        <div className="grid grid-cols-2 gap-2">
          {state.teams.map((t) => (
            <button
              key={t.id}
              type="button"
              style={{
                borderColor: g.currentTeam === t.id ? undefined : t.color,
                color: g.currentTeam === t.id ? t.color : undefined,
              }}
              className={`btn btn-ghost ${g.currentTeam === t.id ? "!border-gold" : ""}`}
              onClick={() => act("team.set", { teamId: t.id })}
            >
              {t.name}
            </button>
          ))}
        </div>
        {g.round === "ve_dich" && (
          <>
            <div className="text-xs tracking-[0.18em] text-mist uppercase mt-5 mb-2">Gói Về đích</div>
            <div className="flex flex-wrap gap-2">
              {[10, 20, 30].map((pt) => (
                <button
                  key={pt}
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => act("vedich.package", { points: pt, star: g.veDich?.star })}
                >
                  {pt}
                </button>
              ))}
              <button
                type="button"
                className="btn"
                onClick={() => act("vedich.package", { points: g.veDich?.packagePoints || 20, star: !g.veDich?.star })}
              >
                Ngôi sao {g.veDich?.star ? "ON" : "OFF"}
              </button>
            </div>
          </>
        )}
        <p className="mt-5">
          <Link to="/admin" className="text-gold underline">Mở trang quản trị</Link>
        </p>
      </aside>

      {/* CỘT GIỮA */}
      <main className="flex flex-col gap-3.5 min-w-0">
        {/* 1 · TRẠNG THÁI */}
        <div className="panel flex flex-wrap items-center gap-3 py-3">
          <span className="round-badge">{g.round || "setup"}</span>
          <span className={`badge ${status.cls === "ok" ? "badge-ok" : status.cls === "warn" ? "badge-warn" : ""}`}>
            {status.text}
          </span>
          {progress && <span className="text-mist text-sm">{progress}</span>}
          {answering && (
            <span
              className="badge"
              style={{ borderColor: answering.color, color: answering.color }}
            >
              Trả lời: {winner ? `${winner.name} (chuông)` : cur?.name}
            </span>
          )}
          <span className={`timer-xl ml-auto text-3xl ${g.timer?.remaining <= 5 && g.timer?.running ? "timer-danger" : ""}`}>
            {formatTime(g.timer?.remaining || 0)}
          </span>
        </div>

        {/* 2 · CÂU HỎI & ĐÁP ÁN */}
        <div className="panel">
          <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Câu hỏi &amp; đáp án</div>
          {!q && (
            <div className="text-mist">{isKd ? "Chuyển đội để bắt đầu lượt." : "Chưa có câu hỏi — chọn hàng ngang (Vượt CNV) hoặc bấm Câu sau."}</div>
          )}
          {q && (
            <>
              <div className="font-display text-xl leading-snug">{q.question}</div>
              {isKd ? (
                <div className="mt-2 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-ok font-semibold">
                  Đáp án: {q.answer} • {pts} điểm
                </div>
              ) : (
                <div
                  className={`mt-2 rounded-lg border border-line bg-night/60 px-3 py-2 ${
                    revealed ? "text-ok font-semibold" : "tracking-[0.3em] text-mist"
                  }`}
                >
                  Đáp án: {revealed ? q.answer : "••••••"} • {pts} điểm
                  {!!q.letterCount && <span className="text-mist tracking-normal"> • {q.letterCount} chữ cái</span>}
                </div>
              )}
            </>
          )}
          {!isKd && (
            <>
              <div className="flex flex-wrap gap-2 mt-4">
                <button type="button" className="btn" disabled={showing && !revealed} onClick={() => act("question.show")}>
                  Hiện câu hỏi
                </button>
                <button type="button" className="btn btn-ghost" disabled={!showing} onClick={() => act("question.hide")}>
                  Ẩn câu hỏi
                </button>
                <button type="button" className="btn btn-ok" disabled={!showing || revealed} onClick={() => act("question.reveal")}>
                  Lật đáp án
                </button>
                <button type="button" className="btn btn-ghost" disabled={!showing || !revealed} onClick={() => act("question.hideAnswer")}>
                  Che đáp án
                </button>
                {g.round !== "vuot_cnv" && (
                  <>
                    <button type="button" className="btn btn-ghost" onClick={() => act("question.prev")}>← Câu trước</button>
                    <button type="button" className="btn btn-ghost" onClick={() => act("question.next")}>Câu sau →</button>
                  </>
                )}
              </div>
              <div className="text-mist text-xs mt-2.5">
                Trình tự: Chọn câu → Hiện câu hỏi → Lật đáp án → Chấm điểm. "Ẩn câu hỏi" đưa màn hình về bảng.
              </div>
            </>
          )}
        </div>

        {/* 3 · CHẤM ĐIỂM */}
        <div className="panel">
          <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Chấm điểm</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ok flex-1 min-w-[180px]" disabled={!q} onClick={() => act("answer.mark", { correct: true })}>
              ĐÚNG +{pts}{cnvRowPhase ? " • mở mảnh" : ""}
            </button>
            <button type="button" className="btn btn-danger flex-1 min-w-[180px]" disabled={!q} onClick={() => act("answer.mark", { correct: false })}>
              SAI {saiText !== "không trừ" ? `• ${saiText}` : ""}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-mist text-xs">Cộng nhanh cho đội:</span>
            {state.teams.map((t) => (
              <button
                key={t.id}
                type="button"
                className="btn btn-ghost flex items-center gap-1.5"
                style={{ borderColor: t.color, color: t.color }}
                onClick={() => act("answer.mark", { correct: true, teamId: t.id })}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                {t.name} +{pts}
              </button>
            ))}
          </div>
        </div>

        {/* 4 · THEO VÒNG */}
        {g.round === "vuot_cnv" && (
          <div className="panel">
            <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Bàng Vượt CNV — chọn hàng ngang</div>
            <div className="inline-grid grid-cols-3 grid-rows-3 gap-2.5">
              {[0, 1, 2, 3].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`rounded-xl border-2 px-3 py-4 font-display font-bold transition ${
                    solved[r]
                      ? "bg-gold text-[#1a1400] border-gold"
                      : locked[r]
                        ? "border-danger/60 text-danger/80 bg-danger/5 cursor-not-allowed opacity-70"
                        : p.currentRow === r
                          ? "border-gold text-gold bg-transparent shadow-[0_0_0_2px_rgba(255,214,10,0.25)]"
                          : "border-line text-ink bg-transparent hover:border-gold/60"
                  }`}
                  style={{ gridColumn: r === 0 || r === 2 ? 1 : 3, gridRow: r < 2 ? 1 : 3 }}
                  onClick={() => act("puzzle.select", { row: r })}
                  disabled={solved[r] || locked[r]}
                >
                  Hàng {r + 1}{solved[r] ? " ✓" : locked[r] ? " ✕" : ""}
                </button>
              ))}
              <button
                type="button"
                className={`rounded-xl border-2 px-3 py-4 font-display font-bold ${
                  p.centerRevealed ? "bg-gold text-[#1a1400] border-gold" : cornersDone ? "border-gold/70 text-gold hover:bg-gold/10" : "border-line text-mist cursor-not-allowed"
                }`}
                style={{ gridColumn: 2, gridRow: 2 }}
                onClick={() => act("puzzle.center")}
                disabled={!cornersDone}
                title={cornersDone ? "Mở ô trung tâm" : "Chỉ mở khi 4 góc đã xử lý hết"}
              >
                Trung tâm
              </button>
            </div>
            <div className="text-mist text-sm mt-3">
              {p.keywordSolved
                ? "Đã đoán trúng từ khóa — kết thúc vòng."
                : p.awaitingSteal
                  ? "Đội chọn trả lời SAI — chuông đang mở cho đội khác giành quyền (đúng +10 • sai −20 và khóa mảnh)."
                  : cnvKeywordPhase
                    ? "Đủ 4 góc — có thể mở trung tâm hoặc nhận đoán từ khóa của các đội."
                    : "Đội đang thi chọn một hàng ngang rồi bấm Hiện câu hỏi."}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" className="btn btn-ghost" onClick={() => act("puzzle.show")}>Hiện bảng</button>
              <button type="button" className="btn btn-ghost" onClick={() => act("puzzle.all")}>Mở hết (hạ màn)</button>
            </div>

            {/* Danh sách câu hỏi Vượt CNV */}
            <div className="text-xs tracking-[0.18em] text-mist uppercase mt-5 mb-2">Danh sách câu hỏi</div>
            <div className="rounded-xl border border-line bg-night/40 p-3 mb-3">
              <div className="text-sm">Từ khóa: <span className="text-gold font-bold">{state.questions?.main?.vuotCnv?.keyword || "—"}</span></div>
              <div className="text-mist text-xs mt-0.5">Gợi ý: {state.questions?.main?.vuotCnv?.hint || "—"} • {state.questions?.main?.vuotCnv?.letterCount || "?"} chữ cái</div>
            </div>
            <div className="grid gap-2">
              {(state.questions?.main?.vuotCnv?.rows || []).map((row, i) => {
                const isCurrent = i === (p.currentRow ?? 0);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => !solved[i] && !locked[i] && act("puzzle.select", { row: i })}
                    disabled={solved[i] || locked[i]}
                    className={`rounded-xl border px-4 py-2.5 text-left transition ${
                      solved[i]
                        ? "border-ok/30 bg-ok/5 opacity-60"
                        : locked[i]
                          ? "border-danger/30 bg-danger/5 opacity-50 cursor-not-allowed"
                          : isCurrent
                            ? "border-gold bg-gold/10"
                            : "border-line hover:border-gold/50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">Hàng {i + 1}{solved[i] ? " ✓" : locked[i] ? " ✕" : isCurrent ? " ●" : ""}</span>
                      <span className="text-mist text-xs">{row.letterCount} chữ • {row.points} điểm</span>
                    </div>
                    <div className="text-xs text-mist mt-1 truncate" title={row.question}>{row.question}</div>
                    <div className="text-ok text-xs mt-0.5">Đáp án: {row.answer}</div>
                  </button>
                );
              })}
            </div>
            <div className="text-xs tracking-[0.18em] text-mist uppercase mt-5 mb-2">Đoán từ khóa</div>
            <div className="flex flex-wrap gap-2">
              {state.teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="btn btn-ok"
                  onClick={() => act("keyword.solve", { teamId: t.id, correct: true })}
                >
                  Đúng: {t.name} (+{current?.keywordPoints ?? "?"})
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
        )}

        {g.round === "ve_dich" && (
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
        )}

        {isKd && (
          <div className="panel">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="text-xs tracking-[0.18em] text-mist uppercase">Thời gian mỗi lượt</div>
              <input
                type="number"
                min={5}
                max={300}
                value={kdTimer}
                onChange={(e) => setKdTimer(e.target.value)}
                className="w-20!"
              />
              <span className="text-mist text-sm">giây</span>
              <button type="button" className="btn btn-ok" onClick={() => act("khoi_dong.timer", { seconds: Number(kdTimer) })}>
                Áp dụng
              </button>
            </div>

            {/* Quản lý câu hỏi — 4 đội × 6 câu */}
            <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Quản lý câu hỏi</div>
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
                        const answered = hist && hist[i] !== undefined;
                        const correct = answered && hist[i];
                        const wrong = answered && !hist[i];
                        return (
                          <button
                            key={qd.id}
                            type="button"
                            onClick={() => act("question.jump", { teamId: t.id, questionIndex: i })}
                            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition truncate ${
                              isCurrent
                                ? "border-gold bg-gold/15 text-gold"
                                : correct
                                  ? "border-ok/30 bg-ok/8 text-ok/70"
                                  : wrong
                                    ? "border-danger/40 bg-danger/8 text-danger/80"
                                    : "border-line text-mist hover:border-gold/50 hover:text-ink"
                            }`}
                            title={qd.question}
                          >
                            {i + 1}{isCurrent ? " ●" : correct ? " ✓" : wrong ? " ✕" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Đội đang thi + nộp bài */}
            <div className="text-xs tracking-[0.18em] text-mist uppercase mt-5 mb-2">Nộp bài thi</div>
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {(state.teams || []).map((t) => {
                const sub = g.khoiDong?.submissions?.[t.id];
                return (
                  <div
                    key={t.id}
                    style={{ "--tc": t.color }}
                    className={`team-card ${t.id === g.currentTeam ? "team-active" : ""}`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <b style={{ color: t.color }}>{t.name}</b>
                      {sub ? <span className="badge badge-ok">Đã gửi</span> : <span className="text-mist text-xs">Chưa gửi</span>}
                    </div>
                    <div className="my-1.5 min-h-[20px] font-medium text-sm">{sub?.answer || "—"}</div>
                    <div className="flex gap-1.5">
                      <button type="button" className="btn btn-ok flex-1 py-1.5! text-sm!" onClick={() => act("answer.mark", { correct: true, teamId: t.id })}>
                        Đúng +10
                      </button>
                      <button type="button" className="btn btn-danger flex-1 py-1.5! text-sm!" onClick={() => act("answer.mark", { correct: false, teamId: t.id })}>
                        Sai
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {g.round === "tang_toc" && (
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
        )}

        {/* 5 · THIẾT BỊ — ẩn khi vòng Khởi động */}
        {!isKd && (
          <div className="panel">
            <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Hẹn giờ &amp; chuông</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                className="w-20!"
              />
              <button type="button" className="btn" onClick={() => act("timer.set", { seconds: Number(seconds), running: true })}>
                Bắt đầu giờ
              </button>
              <button type="button" className="btn btn-ghost" disabled={!g.timer?.running} onClick={() => act("timer.pause")}>
                Dừng
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!!g.timer?.running || !(g.timer?.remaining > 0)}
                onClick={() => act("timer.resume")}
              >
                Tiếp
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button type="button" className="btn" disabled={!!g.buzzer?.open} onClick={() => act("buzzer.open")}>
                Mở chuông
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => act("buzzer.reset", { open: true })}>
                Reset chuông (mở)
              </button>
              <button type="button" className="btn btn-ghost" disabled={!g.buzzer?.open} onClick={() => act("buzzer.close")}>
                Khóa chuông
              </button>
              {!!g.buzzer?.winner && <span className="badge badge-ok">Giữ chuông: {winner?.name || g.buzzer.winner}</span>}
            </div>
            <div className="text-mist text-xs mt-2">
              Chuông: {g.buzzer?.open ? "MỞ" : "KHÓA"}
              {(g.buzzer?.order || []).length > 0 &&
                ` • Thứ tự bấm: ${g.buzzer.order.map((id) => state.teams.find((t) => t.id === id)?.name || id).join(" → ")}`}
            </div>
          </div>
        )}

        {/* 6 · MEDIA */}
        {!isKd && (state.media || []).length > 0 && (
          <div className="panel">
            <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Media gợi ý</div>
            <div className="flex flex-wrap gap-2">
              {state.media.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => act("media.show", { url: m.url, type: m.type })}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* CỘT PHẢI — Bảng điểm */}
      <aside className="panel">
        <b>Bảng điểm</b>
        <div className="flex flex-col gap-3 mt-3">
          {(state.teams || []).map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border border-line bg-panel-solid p-3 ${g.currentTeam === t.id ? "ring-1 ring-gold/70" : ""}`}
              style={{ borderLeft: `6px solid ${t.color}` }}
            >
              <div className="flex justify-between items-center">
                <b style={{ color: t.color }}>{t.name}</b>
                <span className="font-display text-2xl font-bold">{t.score}</span>
              </div>
              <div className="flex gap-2 mt-2 items-center">
                <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} className="w-16!" />
                <button type="button" className="btn btn-ok flex-1" onClick={() => act("score.add", { teamId: t.id, points: Number(delta) })}>
                  +
                </button>
                <button type="button" className="btn btn-danger flex-1" onClick={() => act("score.add", { teamId: t.id, points: -Number(delta) })}>
                  −
                </button>
              </div>
              {g.buzzer?.winner === t.id && <div className="badge badge-ok mt-2">Đang giữ chuông</div>}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
