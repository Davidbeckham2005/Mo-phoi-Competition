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
import QuestionScorePanel from "./control/QuestionScorePanel.jsx";
import RoundKhoiDong from "./control/RoundKhoiDong.jsx";
import RoundVuotCnv from "./control/RoundVuotCnv.jsx";
import RoundTangToc from "./control/RoundTangToc.jsx";
import RoundVeDich from "./control/RoundVeDich.jsx";

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
  const [pickTeam, setPickTeam] = useState("a");

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
  const rowOwner = (i) => {
    const id = p.teamForRow?.[i];
    return state.teams.find((t) => t.id === id);
  };

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

  const ctx = {
    state,
    g,
    q,
    current,
    d,
    p,
    cnv,
    isKd,
    timer,
    solved,
    locked,
    cornersDone,
    cnvRowPhase,
    cnvKeywordPhase,
    rowOwner,
    showing,
    revealed,
    remaining,
    running,
    winner,
    cur,
    answering,
    rankedById,
    maxScore,
    sortedTeams,
    firstValidIndex,
    pts,
    status,
    progress,
    saiText,
    act,
    pickTeam,
    setPickTeam,
  };

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

        {/* 2+3 · CÂU HỎI & CHẤM ĐIỂM — dùng chung cho các vòng không phải Vượt CNV */}
        {g.round !== "vuot_cnv" && <QuestionScorePanel ctx={ctx} />}

        {/* 4 · THEO VÒNG — Vượt chướng ngại vật */}
        <RoundVuotCnv ctx={ctx} />

        {/* QUẢN LÝ CÂU HỎI theo vòng */}
        <RoundVeDich ctx={ctx} />
        <RoundKhoiDong ctx={ctx} />
        <RoundTangToc ctx={ctx} />

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