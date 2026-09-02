import { formatTime } from "../../lib/format.js";

export default function QuestionScorePanel({ ctx }) {
  const { isKd, q, d, revealed, showing, pts, saiText, act, cnvRowPhase, g, remaining, running } = ctx;
  // Vòng 3 (Tăng tốc) chấm điểm theo từng đội (nhanh → 40/30/20/10) qua bảng riêng,
  // không dùng nút Đúng/Sai cộng điểm một đội này — ẩn bảng chấm điểm chung.
  const ttscoring = g?.round === "tang_toc";
  // Round 1 (Khởi động): câu đã chấm Đúng/Sai (có giá trị boolean trong history) →
  // khóa hẳn, không cho ấn Đúng/Sai lại.
  const mi = g?.khoiDong?.memberIndex ?? 0;
  const kdCurMark = isKd ? g?.khoiDong?.history?.[g.currentTeam]?.[mi]?.[g.questionIndex] : undefined;
  const alreadyScored = isKd && typeof kdCurMark === "boolean";
  return (
    <>
      {/* CÂU HỎI & ĐÁP ÁN */}
      <div className={`panel !rounded-2xl !shadow-[0_10px_40px_rgba(0,0,0,0.45)] ${isKd ? "!bg-[#0e1830]/60 !border-[rgba(255,214,10,0.18)]" : ""}`}>
        {!isKd && (
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="kicker text-xs tracking-[0.18em] uppercase">Câu hỏi &amp; đáp án</div>
          </div>
        )}
        {!q && (
          <div className="text-mist">
            {isKd
              ? "Chuyển đội để bắt đầu lượt."
              : g.round === "ve_dich"
                ? "Chưa có câu nào được chọn — hãy chọn mức 20/30/40 cho đội đang thi ở panel bên dưới."
                : "Chưa có câu hỏi — chọn hàng ngang (Vượt CNV) hoặc bấm Câu sau."}
          </div>
        )}
        {q && !isKd && (
          <>
            {q.mediaUrl && <img src={q.mediaUrl} className="max-h-[150px] mx-auto rounded-lg mb-2" />}
            <div className="font-display text-xl leading-snug">{q.question}</div>
            <div
              className={`mt-2 rounded-lg border border-line bg-night/60 px-3 py-2 ${
                revealed ? "text-ok font-semibold" : "tracking-[0.3em] text-mist"
              }`}
            >
              Đáp án: {revealed ? q.answer : "••••••"} • {pts} điểm
              {!!q.letterCount && <span className="text-mist tracking-normal"> • {q.letterCount} chữ cái</span>}
            </div>
          </>
        )}
        {q && isKd && (
          <div className="flex flex-col items-stretch gap-3">
            <span className={`self-center inline-flex items-center justify-center rounded-xl border border-[rgba(255,214,10,0.45)] bg-[#0e1830]/70 px-5 py-1.5 timer-xl text-4xl ${remaining <= 5 && running ? "timer-danger" : "text-gold"}`}>
              {formatTime(remaining)}
            </span>
            <div className="font-display text-xl leading-snug text-white text-center">{q.answer}</div>
            <div className="flex-1 min-w-0">
              <div className="h-[420px] w-full rounded-xl bg-[#0e1830] overflow-hidden grid place-items-center">
                {q.mediaUrl ? (
                  <img src={q.mediaUrl} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-6xl text-[#9aa7c7]/40">?</span>
                )}
              </div>
            </div>
          </div>
        )}
        {!isKd && !(g.round === "ve_dich" && !q) && (
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
              <button type="button" className="btn btn-ghost" onClick={() => act("question.prev")}>← Câu trước</button>
              <button type="button" className="btn btn-ghost" onClick={() => act("question.next")}>Câu sau →</button>
            </div>
            <div className="text-mist text-xs mt-2.5">
              Trình tự: Chọn câu → Hiện câu hỏi → Lật đáp án → Chấm điểm. "Ẩn câu hỏi" đưa màn hình về bảng.
            </div>
          </>
        )}
      </div>

      {/* CHẤM ĐIỂM */}
      {!ttscoring && !(g.round === "ve_dich" && !q) && (
      <div className="panel !rounded-2xl !border-[rgba(255,214,10,0.18)] !bg-[#2a3d63] !shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
        <div className="kicker text-xs tracking-[0.18em] uppercase mb-2">Chấm điểm</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ok flex-1 min-w-[180px]" disabled={!q || alreadyScored} onClick={() => act("answer.mark", { correct: true })}>
            ĐÚNG +{pts}{cnvRowPhase ? " • mở mảnh" : ""}
          </button>
          <button type="button" className="btn btn-danger flex-1 min-w-[180px]" disabled={!q || alreadyScored} onClick={() => act("answer.mark", { correct: false })}>
            SAI {saiText !== "không trừ" ? `• ${saiText}` : ""}
          </button>
        </div>
        {alreadyScored && (
          <div className={`mt-2.5 rounded-lg border px-3 py-2 text-xs font-semibold ${
            kdCurMark ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"
          }`}>
            Đã chấm {kdCurMark ? "ĐÚNG" : "SAI"}
          </div>
        )}
      </div>
      )}
    </>
  );
}