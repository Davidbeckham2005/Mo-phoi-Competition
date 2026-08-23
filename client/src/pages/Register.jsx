import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicState } from "../lib/api/public.js";
import { registerContestant } from "../lib/api/contestants.js";
import { getContestant, setContestant } from "../lib/session.js";
import { on } from "../lib/socket.js";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", studentId: "", school: "", className: "" });
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const existing = getContestant();

  useEffect(() => {
    getPublicState().then(setInfo).catch(() => {});
    return on("prelim:update", setInfo);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const c = await registerContestant(form);
      setContestant(c);
      if (c.submittedAt) nav("/ket-qua");
      else nav("/thi");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/" className="muted">← Trang chủ</Link>
        <div className="kicker">Vòng sơ khảo</div>
      </div>
      <div className="panel" style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 className="display">Đăng ký dự thi</h2>
        <p className="muted" style={{ margin: "8px 0 18px" }}>
          30 câu trắc nghiệm • 15 phút • 16 thí sinh xuất sắc nhất vào 4 đội.
        </p>
        <p className="muted">
          Trạng thái: {info?.settings?.prelimOpen ? "Đang mở" : "Chưa mở"} • Đã đăng ký {info?.contestantCount || 0} • Đã nộp {info?.submittedCount || 0}
        </p>
        {existing && (
          <p style={{ margin: "12px 0" }}>
            Bạn đã đăng ký với mã <b>{existing.studentId}</b>.{" "}
            <Link to="/thi">Tiếp tục làm bài</Link>
          </p>
        )}
        <form className="form-grid" onSubmit={submit} style={{ marginTop: 16 }}>
          <label>Họ và tên
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>Mã số thí sinh
            <input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
          </label>
          <label>Trường
            <input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
          </label>
          <label>Lớp
            <input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="btn" type="submit">Vào phòng thi</button>
        </form>
      </div>
    </div>
  );
}
