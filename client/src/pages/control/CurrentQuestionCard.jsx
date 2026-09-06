export default function CurrentQuestionCard({ q }) {
  if (!q) return null;

  return (
    <div>
      {q.mediaUrl && (
        <img src={q.mediaUrl} className="mx-auto mb-3 max-h-[130px] rounded-lg border border-line/50" />
      )}

      <div className="font-display text-xl leading-snug text-white">{q.question}</div>

      <div className="mt-2.5 border-l-4 border-gold bg-night/50 px-4 py-2.5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-mist">Đáp án</div>
        <div className="font-display text-lg text-white">{q.answer}</div>
      </div>
    </div>
  );
}
