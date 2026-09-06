export default function CurrentQuestionCard({ q, revealed }) {
  if (!q) return null;

  return (
    <div className="rounded-xl border border-line bg-panel-solid px-4 py-3">
      {q.mediaUrl && (
        <img src={q.mediaUrl} className="mx-auto mb-3 max-h-[130px] rounded-lg border border-line/50" />
      )}

      <div className="font-display text-xl leading-snug text-white">{q.question}</div>

      <div
        className={`mt-2.5 rounded-lg border px-4 py-2.5 text-base transition ${
          revealed
            ? "border-ok/40 bg-ok/10 font-semibold text-ok"
            : "border-line bg-night/50 tracking-[0.25em] text-mist"
        }`}
      >
        Đáp án: {revealed ? q.answer : "••••••••"}
      </div>
    </div>
  );
}
