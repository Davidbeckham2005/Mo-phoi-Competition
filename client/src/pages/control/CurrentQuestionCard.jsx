export default function CurrentQuestionCard({ q, revealed }) {
  if (!q) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-panel-solid to-night/80 px-5 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />

      {q.mediaUrl && (
        <img src={q.mediaUrl} className="relative mx-auto mb-3 max-h-[130px] rounded-lg border border-line/50" />
      )}

      <div className="relative font-display text-xl leading-snug text-white">{q.question}</div>

      <div
        className={`relative mt-2.5 rounded-lg border px-4 py-2.5 text-base transition ${
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
