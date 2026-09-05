import { Fragment } from "react";
import { isOpen, isLocked } from "../lib/cnv.js";
import { activeTeamIds } from "../lib/teams.js";

// Khung ô chữ Vòng 2: bên trái các hàng ngang (ô chữ tròn), bên phải số mảnh ghép dọc.
// Dùng chung cho màn hình Khán giả và Thí sinh.
export function CnvRowsFrame({ state, g }) {
  const p = g.puzzle || {};
  const cnv = state.cnv;
  return (
    <div className="grid grid-cols-[auto_2.5rem] gap-x-4 gap-y-2.5 w-fit mx-auto">
      {(cnv?.rows || []).map((row, i) => (
        <Fragment key={i}>
          <div className="flex gap-1.5 self-center">
            {row.status === "open"
              ? row.word.replace(/\s/g, "").split("").map((ch, j) => (
                  <span key={j} className="ltr ltr-open">{ch}</span>
                ))
              : row.status === "locked"
                ? Array.from({ length: row.letterCount }, (_, j) => (
                    <span key={j} className="ltr ltr-locked">✕</span>
                  ))
                : Array.from({ length: row.letterCount }, (_, j) => (
                    <span key={j} className={`ltr ${i === p.currentRow ? "r2-current" : ""}`} />
                  ))}
          </div>
          <span className="text-sm w-10 justify-self-start font-display font-bold tabular-nums text-gold self-center">
            {i + 1}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

// MÀN KẾT QUẢ TRẢ LỜI — Vòng 2: luôn hiện đủ các đội đang thi (top 4). Mỗi đội 1 hàng,
// không bọc trong border; đội đã nộp hiện đáp án + thời gian nộp, đội chưa nộp để trống.
// Không còn duyệt qua revealedRows — MC mở màn này là thấy hết luôn.
export function RowResults({ state, g }) {
  const p = g.puzzle || {};
  const teams = state.teams || [];
  const active = activeTeamIds(g, teams);
  const subs = p.submissions || {};
  const corr = p.corrections || {};
  const cards = active.map((id) => {
    const t = teams.find((x) => x.id === id);
    const s = subs[id];
    return {
      teamId: id,
      team: t,
      answer: s?.answer,
      elapsed: s?.elapsed,
      ok: corr[id] === true,
      ng: corr[id] === false,
    };
  });

  return (
    <div className="w-full max-w-[1100px] mx-auto">
      <div className="kicker text-center mb-6">
        KẾT QUẢ TRẢ LỜI — HÀNG {p.currentRow + 1}
      </div>
      <div className="grid gap-x-4 gap-y-6 mx-auto w-[min(980px,94%)]" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {cards.map((c) => (
          <div key={c.teamId} className="flex flex-col items-center text-center gap-2">
            <span
              className="font-bold text-[clamp(16px,1.6vw,22px)] truncate max-w-full"
              style={{ color: c.team?.color }}
            >
              {c.team?.name || `Đội ${c.teamId}`}
            </span>
            {c.answer != null && c.answer !== "" ? (
              <>
                <span className="text-mist text-sm font-mono tabular-nums">
                  {c.elapsed != null ? c.elapsed.toFixed(2) + "s" : "—"}
                </span>
                <span
                  className={`font-semibold text-[clamp(14px,1.5vw,20px)] leading-snug max-w-full ${
                    c.ok ? "text-[#80ed99]" : c.ng ? "text-[#ffb3c1]" : "text-white"
                  }`}
                >
                  “{c.answer}”
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${
                    c.ok ? "text-[#80ed99]" : c.ng ? "text-[#ffb3c1]" : "text-mist"
                  }`}
                >
                  {c.ok ? "Đúng" : c.ng ? "Sai" : "Đang chờ…"}
                </span>
              </>
            ) : (
              <span className="text-lg text-mist/40">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// MÀN CÂU HỎI — Vòng 2: khung hàng ngang + câu hỏi/ảnh hiện tại. Nhận children để chèn
// ô nhập đáp án của thí sinh.
export function Round2Question({ state, d, g, children }) {
  const p = g.puzzle || {};
  const cnv = state.cnv || {};
  const question = cnv.question || d.question || "";
  return (
    <div className="w-full max-w-[1200px] min-h-[60vh] mx-auto text-center flex flex-col items-center justify-center">
      <div className="r2-rows mb-6 rounded-2xl border border-[rgba(255,214,10,0.28)] px-6 py-4">
        <CnvRowsFrame state={state} g={g} />
      </div>
      {d.mediaUrl && d.mediaType === "image" && (
        <img src={d.mediaUrl} alt="" className="max-h-[30vh] mx-auto rounded-2xl object-contain border border-line shadow-[0_10px_40px_rgba(0,0,0,0.4)]" />
      )}
      {d.mediaUrl && d.mediaType === "video" && (
        <video src={d.mediaUrl} autoPlay controls className="max-h-[30vh] mx-auto rounded-2xl" />
      )}
      {question && <div className="stage-q mt-4">{question}</div>}
      {d.note && <div className="stage-note">{d.note}</div>}
      {d.answerRevealed && <div className="stage-answer mt-3">Đáp án: {d.answer}</div>}
      {children}
    </div>
  );
}

// MÀN BẢNG MẢNH GHÉP — Vòng 2: bộ 5 mảnh (4 góc + ô trung tâm) ghép thành 1 bức ảnh.
// Prop `minimal` (màn hình thí sinh): ẩn các khung thông báo hiệu ứng (ĐÚNG!/SAI,
// "đang chờ", "đang giành quyền") — chỉ giữ bảng mảnh ghép.
export function Round2Board({ state, g, minimal }) {
  const p = g.puzzle || {};
  const cnv = state.cnv;
  const solved = [0, 1, 2, 3, 4].map((i) => isOpen(p, i));
  const locked = [0, 1, 2, 3, 4].map((i) => isLocked(p, i));
  const media = cnv?.media;
  const last = p.lastResult;
  const lastTeam = last ? state.teams.find((t) => t.id === last.teamId) : null;
  return (
    <div className="relative w-full max-w-[1200px] min-h-[60vh] mx-auto flex flex-col items-center justify-center">
      {!minimal && p.keywordClaim && !p.keywordSolved && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 z-30">
          <div className="animate-pulse rounded-lg border-2 border-red-500 bg-red-600/90 px-3 py-2 text-center">
            <div className="font-display font-black text-[clamp(20px,2.2vw,34px)] leading-none text-white">
              {state.teams.find((t) => t.id === p.keywordClaim)?.name}
            </div>
          </div>
        </div>
      )}
      {!minimal && last && (
        <div
          key={`${last.row}-${last.correct}`}
          className={`flex justify-center pb-5 r2-feedback ${last.correct ? "r2-correct" : "r2-wrong"}`}
        >
          <div className={`r2-feedback-pill ${last.correct ? "r2-pill-ok" : "r2-pill-no"}`}>
            <span className="text-2xl font-display font-black tracking-wide">
              {last.correct ? "ĐÚNG!" : "SAI"}
            </span>
            <span className="text-sm opacity-80">
              {last.correct
                ? `+${last.pts} • Hàng ${last.row + 1} đã mở`
                : `−${Math.abs(last.pts || 0)} • Hàng ${last.row + 1} đã khóa`}
            </span>
            {lastTeam && <span className="text-sm" style={{ color: lastTeam.color }}>{lastTeam.name}</span>}
          </div>
        </div>
      )}
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="relative w-[clamp(300px,40vw,680px)] aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-line bg-night">
          {media?.url && media.type !== "video" && (
            <img src={media.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {[0, 1, 2, 3].map((r) => (
              <div
                key={r}
                className={`relative flex ${r % 2 === 0 ? "justify-start" : "justify-end"} ${r < 2 ? "items-start" : "items-end"} font-display font-black text-[clamp(26px,3.4vw,52px)] tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] transition-colors ${
                  solved[r]
                    ? (media?.url && media.type !== "video")
                      ? "pointer-events-none"
                      : "bg-gold/90 text-[#1a1400]"
                    : locked[r]
                      ? "bg-danger/60 text-white"
                      : "bg-[#0e1830] text-mist"
                }`}
              >
                {locked[r] ? (
                  <span className={`px-3 ${r < 2 ? "pt-2" : "pb-2"}`}>✕</span>
                ) : solved[r] && media?.url && media.type !== "video" ? (
                  ""
                ) : (
                  <span className={`px-3 ${r < 2 ? "pt-2" : "pb-2"}`}>{r + 1}</span>
                )}
              </div>
            ))}
          </div>
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[52%] h-[60%] rounded-xl border-2 grid place-items-center font-display font-black text-[clamp(26px,3.4vw,52px)] tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] ${
              solved[4]
                ? (media?.url && media.type !== "video")
                  ? "pointer-events-none border-transparent"
                  : "bg-gold text-[#1a1400] border-gold shadow-[0_0_26px_rgba(255,214,10,0.45)]"
                : locked[4]
                  ? "bg-danger/70 text-white border-danger/70"
                  : "bg-[#0e1830] text-mist border-line"
            }`}
          >
            {locked[4] ? "✕" : solved[4] && media?.url && media.type !== "video" ? "" : 5}
          </div>
        </div>
      </div>
    </div>
  );
}
