import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExamResult } from "../lib/api/exam.js";
import { getContestant } from "../lib/session.js";
import { formatTime } from "../lib/format.js";

export default function ExamResult() {
  const me = getContestant();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!me?.id) return;
    getExamResult(me.id).then(setResult).catch((e) => setError(e.message));
  }, [me?.id]);

  if (!me) {
    return (
      <div className="page">
        <Link to="/dang-ky">Hãy đăng ký để xem kết quả.</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/" className="muted">← Trang chủ</Link>
      </div>
      <div className="panel" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div className="kicker">Kết quả sơ khảo</div>
        {error && <div className="error">{error}</div>}
        {result && (
          <>
            <h2 className="display" style={{ fontSize: 36, margin: "10px 0" }}>{result.name}</h2>
            <div className="timer-xl">{result.score}/{result.total}</div>
            <p className="muted">Thời gian làm bài: {formatTime(result.timeSpent)}</p>
            <p style={{ margin: "16px 0" }}>
              Xếp hạng: <b>#{result.rank || "—"}</b>
            </p>
            {result.qualified ? (
              <div className="badge ok">XUẤT SẮC — vào top {result.topN}</div>
            ) : (
              <div className="badge no">Chưa vào top {result.topN}</div>
            )}
            <p className="muted" style={{ marginTop: 18 }}>
              Ban tổ chức sẽ công bố 16 thí sinh và chia 4 đội trên màn hình khán giả.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
