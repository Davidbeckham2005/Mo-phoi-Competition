export default function CurrentQuestionCard({ q }) {
  if (!q) return null;

  return (
    <div className="rounded-xl border border-line bg-panel-solid px-4 py-3">
      {q.mediaUrl && (
        <img src={q.mediaUrl} className="mx-auto mb-3 max-h-[130px] rounded-lg border border-line/50" />
      )}

      <div className="font-display text-xl leading-snug text-white">{q.question}</div>

      <div className="mt-2.5 rounded-lg border border-ok/40 bg-ok/10 px-4 py-2.5 text-base font-semibold text-ok">
        Đáp án: {q.answer}
      </div>
    </div>
  );
}
