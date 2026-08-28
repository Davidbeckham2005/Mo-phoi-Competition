import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendControl, getCurrentQuestion } from "../lib/api/control.js";
import { getPin } from "../lib/session.js";
import { formatTime } from "../lib/format.js";
import { on } from "../lib/socket.js";
import { useGameState } from "../lib/useGame.js";
import {
  isOpen,
  isLocked,
  isRowPhase,
  isKeywordPhase,
  cornersDone as allCornersDone,
} from "../lib/cnv.js";

export default function Control() {
  const nav = useNavigate();
  const { state, timer } = useGameState();
  const [current, setCurrent] = useState(null);
  const [seconds, setSeconds] = useState(15);
  const [sideOpen, setSideOpen] = useState(true);
  const [scoreOpen, setScoreOpen] = useState(true);
  const [scoreSort, setScoreSort] = useState("rank");
  const [customScore, setCustomScore] = useState({});
  const [confirmStart, setConfirmStart] = useState(null);

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
  const cnv = state.cnv;
  const isKd = g.round === "khoi_dong";

  const solved = [0, 1, 2, 3].map((i) => isOpen(p, i));
  const locked = [0, 1, 2, 3].map((i) => isLocked(p, i));
  const cornersDone = allCornersDone(p);
  const cnvRowPhase = g.round === "vuot_cnv" && isRowPhase(p);
  const cnvKeywordPhase = g.round === "vuot_cnv" && isKeywordPhase(p);

  const showing = d.mode === "question";
  const revealed = !!d.answerRevealed;
  const remaining = timer?.remaining ?? 0;
  const running = timer?.running ?? false;

  function requestRound(id, label) {
    if (!g.round || g.round === "finished") {
      act("round.start", { round: id });
      return;
    }
    if (id === g.round) {
      const active = showing || running || (g.questionStatus && g.questionStatus !== "idle");
      if (!active) {
        act("round.start", { round: id });
        return;
      }
      setConfirmStart({
        roundId: id,
        title: `Reset vòng ${label}?`,
        message: "Vòng này đang có câu hỏi/đồng hồ đang chạy hoặc đang thi dở. Chuyển sẽ đặt lại vòng từ đầu và mất trạng thái hiện tại.",
        danger: true,
      });
      return;
    }
    const currentInProgress =
      showing ||
      running ||
      (g.questionStatus && g.questionStatus !== "idle") ||
      (g.round === "khoi_dong" && Object.keys(g.khoiDong?.submissions || {}).length > 0) ||
      (g.round === "tang_toc" && Object.keys(g.tangToc?.submissions || {}).length > 0) ||
      (g.round === "vuot_cnv" && ((p.rowsSolved || []).some(Boolean) || p.keywordSolved)) ||
      (g.round === "ve_dich" && (g.veDich?.answeringTeam || false));
    if (currentInProgress) {
      setConfirmStart({
        roundId: id,
        title: `Chuyển sang vòng ${label}?`,
        message: `Vòng hiện tại đang hoạt động (${state.rounds?.find((r) => r.id === g.round)?.name || g.round}). Chuyển vòng sẽ bỏ qua trạng thái đang dở của vòng này.`,
        danger: false,
      });
      return;
    }
    act("round.start", { round: id });
  }

  const winner = state.teams.find((t) => t.id === g.buzzer?.winner);
  const cur = state.teams.find((t) => t.id === g.currentTeam);
  const answering = winner || cur;

  const rankedById = [...(state.teams || [])]
    .slice()
    .sort((a, b) => b.score - a.score)
    .reduce((acc, t, i) => {
      acc[t.id] = i + 1;
      return acc;
    }, {});
  const maxScore = Math.max(1, ...(state.teams || []).map((t) => t.score));
  const sortedTeams = [...(state.teams || [])].sort((a, b) =>
    scoreSort === "asc" ? a.score - b.score : scoreSort === "desc" ? b.score - a.score : rankedById[a.id] - rankedById[b.id]
  );
  const rankBadge = (rank) =>
    rank === 1 ? "1" : rank === 2 ? "2" : rank === 3 ? "3" : `#${rank}`;

  const firstValidIndex = (teamId) => {
    const hist = g.khoiDong?.history?.[teamId] || {};
    const list = state.questions?.main?.khoiDong?.[teamId] || [];
    for (let i = 0; i < list.length; i++) {
      if (typeof hist[i] !== "boolean") return i;
    }
    return 0;
  };

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
  if (isKd) progress = `Ảnh ${g.questionIndex + 1}/${(state.questions?.main?.khoiDong?.[g.currentTeam] || []).length} • ${cur?.name || ""}`;
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
    <>
    <div className="fixed top-4 right-4 z-30 flex gap-1.5">
      <button
        type="button"
        className="btn btn-ghost text-sm px-2.5! py-1!"
        title={sideOpen ? "Ẩn cột trái" : "Hiện cột trái"}
        onClick={() => setSideOpen(!sideOpen)}
      >
        {sideOpen ? "◀" : "▶"} Cột trái
      </button>
      <button
        type="button"
        className="btn btn-ghost text-sm px-2.5! py-1!"
        title={scoreOpen ? "Ẩn bảng điểm" : "Hiện bảng điểm"}
        onClick={() => setScoreOpen(!scoreOpen)}
      >
        Bảng điểm {scoreOpen ? "▼" : "▲"}
      </button>
    </div>
    <div
      className="grid gap-4 px-4 py-5 mx-auto max-w-[1600px] lg:grid-cols-[var(--col-l,240px)_minmax(0,1fr)_var(--col-r,280px)] items-start"
      style={{ "--col-l": sideOpen ? "240px" : "0px", "--col-r": scoreOpen ? "280px" : "0px" }}
    >
      {/* CỘT TRÁI — Vòng thi / đội */}
      <aside className="aside-col panel">
        <div className="flex justify-between items-center select-none">
          <div>
            <div className="kicker">MC / Ban tổ chức</div>
            <h3 className="font-display font-bold mt-2">{state.settings?.title}</h3>
          </div>
        </div>
        {sideOpen && (<>
        <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2 mt-4">Vòng thi</div>
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
              onClick={() => requestRound(id, label)}
            >
              {label}
            </button>
          ))}
          <button type="button" className="btn" onClick={() => act("scores.show")}>Hiện bảng điểm</button>
          <button type="button" className="btn btn-ok" onClick={() => act("contest.finish")}>Kết quả cuối</button>
        </div>
        <hr className="my-4 border-line" />
        <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Đội đang thi</div>
        <div className="grid gap-2">
          {state.teams.map((t) => {
            const active = g.currentTeam === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  isKd
                    ? act("question.jump", { teamId: t.id, questionIndex: firstValidIndex(t.id) })
                    : act("team.set", { teamId: t.id })
                }
                className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition ${
                  active
                    ? "border-gold bg-gold/10 ring-1 ring-gold/30"
                    : "border-line bg-panel-solid hover:border-gold/40"
                }`}
                style={active ? {} : { borderLeftColor: t.color }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-sm truncate" style={{ color: t.color }}>{t.name}</span>
                </span>
                <span className="font-display text-lg font-bold">{t.score}</span>
                {active && <span className="badge badge-ok text-xs!">●</span>}
              </button>
            );
          })}
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
        </>)}
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
          <span className={`timer-xl ml-auto text-3xl ${remaining <= 5 && running ? "timer-danger" : ""}`}>
            {formatTime(remaining)}
          </span>
        </div>

        {/* 2 · CÂU HỎI & ĐÁP ÁN */}
        {g.round !== "vuot_cnv" && (
        <div className="panel">
          <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Câu hỏi &amp; đáp án</div>
          {!q && (
            <div className="text-mist">{isKd ? "Chuyển đội để bắt đầu lượt." : "Chưa có câu hỏi — chọn hàng ngang (Vượt CNV) hoặc bấm Câu sau."}</div>
          )}
          {q && (
            <>
              {isKd && (
                q.mediaUrl ? (
                  <img src={q.mediaUrl} className="max-h-[150px] mx-auto rounded-lg mb-2" />
                ) : (
                  <div className="mx-auto w-[180px] h-[110px] rounded-lg bg-panel-solid border border-line grid place-items-center mb-2">
                    <span className="text-3xl text-mist/40">?</span>
                  </div>
                )
              )}
              {isKd ? (
                <div className="font-display text-xl leading-snug">{d.question || "Ảnh này là gì?"}</div>
              ) : (
                <div className="font-display text-xl leading-snug">{q.question}</div>
              )}
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
        )}

        {/* 3 · CHẤM ĐIỂM */}
        {g.round !== "vuot_cnv" && (
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
        </div>
        )}

        {/* 4 · THEO VÒNG */}
        {g.round === "vuot_cnv" && (
          <div className="panel">
            <div className="rounded-xl border border-line bg-panel-solid/60 p-3 mb-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="text-xs tracking-[0.18em] text-mist uppercase">Câu hỏi &amp; chấm điểm</div>
                {cnvRowPhase && <span className="badge text-xs!">Hàng {(p.currentRow ?? 0) + 1} • {pts} điểm</span>}
                <span className={`badge text-xs! ${status.cls === "warn" ? "badge-warn" : status.cls === "ok" ? "badge-ok" : ""}`}>
                  {status.text}
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
                <div className="relative w-full max-w-[420px] aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-line">
                  <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                    {[0, 1, 2, 3].map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={solved[r] || locked[r]}
                        onClick={() => act("puzzle.select", { row: r })}
                        className={`grid place-items-center font-display font-bold text-[clamp(24px,2.6vw,44px)] transition-colors ${
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
                      </button>
                    ))}
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
                        : `Chọn một hàng ngang rồi bấm Hiện câu hỏi.${cur?.name ? ` (${cur.name} đang chơi)` : ""}`}
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
                      onClick={() => !solved[i] && !locked[i] && act("puzzle.select", { row: i })}
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
              <button type="button" className="btn btn-ghost" disabled={!running} onClick={() => act("timer.pause")}>
                Dừng
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!!running || !(remaining > 0)}
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
      <aside className="aside-col panel">
        <b>Bảng điểm</b>
        {scoreOpen && (
          <>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs tracking-[0.18em] text-mist uppercase">Sắp xếp</span>
              <div className="flex gap-1">
                {[
                  ["rank", "Thứ tự"],
                  ["desc", "Điểm ↓"],
                  ["asc", "Điểm ↑"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScoreSort(val)}
                    className={`btn btn-ghost text-xs py-0.5! px-2! ${scoreSort === val ? "!border-gold text-gold" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-3">
              {sortedTeams.map((t) => {
                const rank = rankedById[t.id];
                const top = rank <= 3 && (scoreSort === "rank" || scoreSort === "desc");
                return (
                  <div
                    key={t.id}
                    className={`rounded-xl border bg-panel-solid p-3 transition ${
                      g.currentTeam === t.id ? "ring-1 ring-gold/70" : ""
                    } ${
                      top
                        ? rank === 1
                          ? "border-gold shadow-[0_0_16px_rgba(255,214,10,0.35)]"
                          : rank === 2
                            ? "border-gold/60 shadow-[0_0_12px_rgba(255,214,10,0.2)]"
                            : "border-gold/40"
                        : "border-line"
                    }`}
                    style={{ borderLeft: `6px solid ${t.color}` }}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 font-display font-bold ${top ? (rank === 1 ? "text-gold text-lg" : "text-gold/90 text-base") : "text-mist text-sm"}`}>
                          {rankBadge(rank)}
                        </span>
                        <b style={{ color: t.color }} className="truncate">{t.name}</b>
                      </div>
                      <span
                        className={`font-display text-xl font-bold ${top ? (rank === 1 ? "text-gold" : rank === 2 ? "text-gold/90" : "") : ""}`}
                      >
                        {t.score}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        className="btn btn-danger flex-1! py-1! text-base!"
                        onClick={() => act("score.add", { teamId: t.id, points: -(Number(customScore[t.id]) || 0) })}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        className="w-full text-center!"
                        value={customScore[t.id] ?? 10}
                        onChange={(e) => setCustomScore({ ...customScore, [t.id]: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn btn-ok flex-1! py-1! text-base!"
                        onClick={() => act("score.add", { teamId: t.id, points: Number(customScore[t.id]) || 0 })}
                      >
                        +
                      </button>
                    </div>
                    {g.buzzer?.winner === t.id && <div className="badge badge-ok mt-2">Đang giữ chuông</div>}
                    {top && (
                      <div className="mt-1.5 h-1 rounded-full bg-line overflow-hidden">
                        <div
                          className={`h-full ${rank === 1 ? "bg-gold" : rank === 2 ? "bg-gold/70" : "bg-gold/40"}`}
                          style={{ width: `${Math.max(5, (t.score / maxScore) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </aside>

      {confirmStart && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmStart(null)}>
          <div className="panel w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center gap-2 ${confirmStart.danger ? "text-danger" : "text-gold"}`}>
              <span className="text-2xl">⚠️</span>
              <h3 className="font-display font-bold">{confirmStart.title}</h3>
            </div>
            <p className="text-mist mt-3 leading-relaxed">{confirmStart.message}</p>
            <div className="flex gap-2 mt-5">
              <button type="button" className="btn flex-1" onClick={() => setConfirmStart(null)}>
                Hủy
              </button>
              <button
                type="button"
                className={`btn flex-1 ${confirmStart.danger ? "btn-danger" : "btn-ok"}`}
                onClick={() => {
                  const { roundId } = confirmStart;
                  setConfirmStart(null);
                  act("round.start", { round: roundId });
                }}
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
