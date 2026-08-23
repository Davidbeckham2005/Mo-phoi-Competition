import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getExamStatus, startExam, saveAnswer, submitExam } from "../lib/api/exam.js";
import { getContestant } from "../lib/session.js";
import { formatTime } from "../lib/format.js";

export default function Exam() {
  const nav = useNavigate();
  const me = useMemo(() => getContestant(), []);
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(15 * 60);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    if (!me?.id) {
      nav("/dang-ky");
      return;
    }
    try {
      const status = await getExamStatus(me.id);
      if (status.submitted || status.score != null) {
        nav("/ket-qua");
        return;
      }
      const payload = await startExam(me.id);
      setData(payload);
      setRemaining(payload.contestant.remaining);
    } catch (err) {
      setError(err.message);
    }
  }, [me?.id, nav]);

  useEffect(() => {
    load();
  }, [load]);

  const finish = useCallback(async () => {
    if (submittingRef.current || !me) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await submitExam(me.id);
      nav("/ket-qua");
    } catch (err) {
      setError(err.message);
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [me, nav]);

  useEffect(() => {
    if (!data || data.contestant.submittedAt) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          finish();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [data, finish]);

  const q = data?.questions?.[idx];
  const answered = useMemo(
    () => new Set((data?.questions || []).filter((x) => x.chosen).map((x) => x.id)),
    [data]
  );

  async function pick(letter) {
    if (!q || !me) return;
    setData((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.id === q.id ? { ...item, chosen: letter } : item
      ),
    }));
    try {
      await saveAnswer({ contestantId: me.id, questionId: q.id, answer: letter });
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !data) {
    return (
      <div className="mx-auto w-[min(1100px,calc(100%-32px))] py-7 pb-16">
        <div className="panel">
          <div className="badge badge-no">{error}</div>
          <p className="text-mist mt-3">
            Vòng sơ khảo có thể chưa được ban tổ chức mở.{" "}
            <Link to="/" className="text-gold underline">Về trang chủ</Link>
          </p>
        </div>
      </div>
    );
  }

  if (!data || !q) {
    return <div className="mx-auto w-[min(1100px,calc(100%-32px))] py-7 text-mist">Đang tải đề thi…</div>;
  }

  const timerClass = remaining <= 60 ? "timer-danger" : "";

  return (
    <div className="min-h-screen flex flex-col px-4 py-5 mx-auto max-w-[900px]">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <div className="kicker">Sơ khảo • {data.contestant.name}</div>
          <div className="text-mist text-sm mt-1">
            Câu {idx + 1}/{data.questions.length} • Đã chọn {answered.size}
          </div>
        </div>
        <div className={`timer-xl ${timerClass}`}>{formatTime(remaining)}</div>
        <button
          type="button"
          className="btn btn-danger"
          disabled={submitting}
          onClick={() => window.confirm("Nộp bài ngay?") && finish()}
        >
          Nộp bài
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 my-4">
        {data.questions.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setIdx(i)}
            className={`w-9 h-9 rounded-lg text-sm font-semibold border transition ${
              i === idx
                ? "bg-gold text-[#1a1400] border-gold"
                : item.chosen
                  ? "border-gold/50 text-gold bg-transparent"
                  : "border-line text-mist bg-transparent"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="panel flex-1">
        <div className="text-mist text-sm">{q.topic}</div>
        <div className="font-display text-[clamp(20px,2.6vw,30px)] leading-snug mt-2">{q.question}</div>
        <div className="grid gap-2.5 mt-5">
          {q.options.map((opt) => {
            const letter = opt.trim().charAt(0);
            return (
              <button
                key={opt}
                type="button"
                className={`opt ${q.chosen === letter ? "opt-picked" : ""}`}
                onClick={() => pick(letter)}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between gap-3 mt-6">
          <button type="button" className="btn btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            Trước
          </button>
          <button
            type="button"
            className="btn"
            disabled={idx === data.questions.length - 1}
            onClick={() => setIdx(idx + 1)}
          >
            Câu tiếp
          </button>
        </div>
        {error && <div className="badge badge-no inline-block mt-4">{error}</div>}
      </div>
    </div>
  );
}
