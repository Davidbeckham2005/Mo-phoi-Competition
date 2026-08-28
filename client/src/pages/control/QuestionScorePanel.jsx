export default function QuestionScorePanel({ ctx }) {
  const { isKd, q, d, revealed, showing, pts, saiText, act, cnvRowPhase } = ctx;
  return (
    <>
      {/* CÂU HỎI & ĐÁP ÁN */}
      <div className="panel">
        <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Câu hỏi &amp; đáp án</div>
        {!q && (
          <div className="text-mist">{isKd ? "Chuyển đội để bắt đầu lượt." : "Chưa có câu hỏi — chọn hàng ngang (Vượt CNV) hoặc bấm Câu sau."}</div>
        )}
        {q && (
          <>
            {isKd &&
              (q.mediaUrl ? (
                <img src={q.mediaUrl} className="max-h-[150px] mx-auto rounded-lg mb-2" />
              ) : (
                <div className="mx-auto w-[180px] h-[110px] rounded-lg bg-panel-solid border border-line grid place-items-center mb-2">
                  <span className="text-3xl text-mist/40">?</span>
                </div>
              ))}
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
    </>
  );
}