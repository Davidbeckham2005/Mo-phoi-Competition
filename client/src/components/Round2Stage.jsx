import { Fragment } from "react";
import { isOpen, isLocked } from "../lib/cnv.js";

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
    <div className="w-full max-w-[1200px] min-h-[60vh] mx-auto flex flex-col items-center justify-center">
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
      {!minimal && p.keywordWindow && !p.keywordSolved && (
        <div className="flex justify-center pb-5">
          <div className="badge badge-warn text-base! px-4 py-2 animate-pulse">
            Đang chờ câu hỏi kế tiếp — bấm nút <b className="text-gold">TỪ KHÓA</b> để đoán chướng ngại vật
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
                className={`relative grid place-items-center font-display font-bold text-[clamp(24px,3vw,44px)] transition-colors ${
                  solved[r]
                    ? (media?.url && media.type !== "video")
                      ? "pointer-events-none"
                      : "bg-gold/90 text-[#1a1400]"
                    : locked[r]
                      ? "bg-danger/60 text-white"
                      : "bg-[#0e1830] text-mist"
                }`}
              >
                {(!media?.url || media.type === "video") ? (solved[r] ? r + 1 : locked[r] ? "✕" : "?") : (locked[r] ? "✕" : "?")}
              </div>
            ))}
          </div>
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[38%] h-[46%] rounded-xl border-2 grid place-items-center font-display font-bold text-[clamp(22px,2.6vw,38px)] ${
              solved[4]
                ? (media?.url && media.type !== "video")
                  ? "pointer-events-none border-transparent"
                  : "bg-gold text-[#1a1400] border-gold shadow-[0_0_26px_rgba(255,214,10,0.45)]"
                : locked[4]
                  ? "bg-danger/70 text-white border-danger/70"
                  : "bg-[#0e1830] text-mist border-line"
            }`}
          >
            {(!media?.url || media.type === "video") ? (solved[4] ? 5 : locked[4] ? "✕" : "?") : (locked[4] ? "✕" : "?")}
          </div>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-line/80" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-line/80" />
          </div>
        </div>
      </div>
      {!minimal && p.keywordClaim && !p.keywordSolved && (
        <div className="badge badge-warn text-base! px-4 py-2 mt-4">
          {state.teams.find((t) => t.id === p.keywordClaim)?.name} đang giành quyền đoán từ khóa!
        </div>
      )}
    </div>
  );
}
