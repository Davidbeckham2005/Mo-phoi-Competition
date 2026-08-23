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
      <div className="page">
        <div className="panel">
          <div className="error">{error}</div>
          <p className="muted" style={{ marginTop: 10 }}>
            Vòng sơ khảo có thể chưa được ban tổ chức mở. <Link to="/">Về trang chủ</Link>
          </p>
        </div>
      </div>
    );
  }

  if (!data || !q) return <div className="page muted">Đang tải đề thi...</div>;

  const timerClass = remaining <= 60 ? "danger" : remaining <= 300 ? "warn" : "";

  return (
    <div className="exam">
      <div className="exam-head">
        <div>
          <div className="kicker">Sơ khảo • {data.contestant.name}</div>
          <div className="muted">Câu {idx + 1}/{data.questions.length} • Đã chọn {answered.size}</div>
        </div>
        <div className={`timer-xl ${timerClass}`}>{formatTime(remaining)}</div>
        <button className="btn danger" disabled={submitting} onClick={() => window.confirm("Nộp bài ngay?") && finish()}>
          Nộp bài
        </button>
      </div>
      <div className="nav-q">
        {data.questions.map((item, i) => (
          <button
            key={item.id}
            className={`${i === idx ? "on" : ""} ${item.chosen ? "done" : ""}`}
            onClick={() => setIdx(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="q-wrap">
        <div className="muted">{q.topic}</div>
        <div className="q-text">{q.question}</div>
        <div className="options">
          {q.options.map((opt) => {
            const letter = opt.trim().charAt(0);
            return (
              <button
                key={opt}
                className={`opt ${q.chosen === letter ? "picked" : ""}`}
                onClick={() => pick(letter)}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <div className="row" style={{ marginTop: 20 }}>
          <button className="btn ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Trước</button>
          <button className="btn" disabled={idx === data.questions.length - 1} onClick={() => setIdx(idx + 1)}>
            Câu tiếp
          </button>
        </div>
        {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  );
}
