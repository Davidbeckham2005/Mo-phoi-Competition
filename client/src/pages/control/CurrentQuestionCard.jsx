import { formatTime } from "../../lib/format.js";

export default function CurrentQuestionCard({
  q,
  revealed,
  pts,
  team,
  star,
  running = false,
  remaining = 0,
  label = "Câu hỏi",
}) {
  if (!q) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-panel-solid to-night/80 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="kicker text-[11px] tracking-[0.2em] text-mist uppercase">{label}</span>
          {star && <span className="rounded-full border border-gold/50 bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold uppercase">★ ×2</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {team && (
            <span className="inline-flex items-center gap-1.5 text-xs text-white/85">
              <span className="h-2 w-2 rounded-full" style={{ background: team.color }} />
              <b style={{ color: team.color }}>{team.name}</b>
            </span>
          )}
          <span className="rounded-full border border-line bg-night/60 px-2.5 py-1 text-xs font-display text-gold">
            {pts}đ
          </span>
        </div>
      </div>

      {q.mediaUrl && (
        <img src={q.mediaUrl} className="relative mt-3 max-h-[130px] mx-auto rounded-lg border border-line/50" />
      )}

      <div className="relative mt-3 font-display text-xl leading-snug text-white">
        {q.question}
      </div>

      <div className="relative mt-3 flex items-center justify-between gap-3">
        <div
          className={`min-w-0 flex-1 rounded-lg border px-4 py-2.5 text-base transition ${
            revealed
              ? "border-ok/40 bg-ok/10 font-semibold text-ok"
              : "border-line bg-night/50 tracking-[0.25em] text-mist"
          }`}
        >
          {revealed ? q.answer : "••••••••"}
        </div>
        {running && (
          <span
            className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-[rgba(255,214,10,0.45)] bg-[#0e1830]/60 px-4 py-1.5 font-display text-2xl tabular-nums ${
              remaining <= 5 ? "text-danger" : "text-gold"
            }`}
          >
            {formatTime(remaining)}
          </span>
        )}
      </div>
    </div>
  );
}
