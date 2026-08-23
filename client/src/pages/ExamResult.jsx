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
      <div className="mx-auto w-[min(1100px,calc(100%-32px))] py-7 pb-16">
        <Link to="/dang-ky" className="text-gold underline">Hãy đăng ký để xem kết quả.</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[min(1100px,calc(100%-32px))] py-7 pb-16">
      <div className="flex justify-between items-center gap-3 mb-6">
        <Link to="/" className="text-mist hover:text-gold">← Trang chủ</Link>
      </div>
      <div className="panel max-w-[640px] mx-auto text-center">
        <div className="kicker">Kết quả sơ khảo</div>
        {error && <div className="badge badge-no mt-3">{error}</div>}
        {result && (
          <>
            <h2 className="font-display text-4xl font-bold my-3">{result.name}</h2>
            <div className="timer-xl">
              {result.score}/{result.total}
            </div>
            <p className="text-mist mt-2">Thời gian làm bài: {formatTime(result.timeSpent)}</p>
            <p className="my-5">
              Xếp hạng: <b>#{result.rank || "—"}</b>
            </p>
            {result.qualified ? (
              <div className="badge badge-ok">XUẤT SẮC — vào top {result.topN}</div>
            ) : (
              <div className="badge badge-no">Chưa vào top {result.topN}</div>
            )}
            <p className="text-mist mt-5">
              Ban tổ chức sẽ công bố 16 thí sinh và chia 4 đội trên màn hình khán giả.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
