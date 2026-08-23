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
    <div className="mx-auto w-[min(1100px,calc(100%-32px))] py-7 pb-16">
      <div className="flex justify-between items-center gap-3 mb-6">
        <Link to="/" className="text-mist hover:text-gold">← Trang chủ</Link>
        <div className="kicker">Vòng sơ khảo</div>
      </div>
      <div className="panel max-w-[560px] mx-auto">
        <h2 className="font-display text-2xl font-bold">Đăng ký dự thi</h2>
        <p className="text-mist mt-2 mb-5">
          30 câu trắc nghiệm • 15 phút • 16 thí sinh xuất sắc nhất vào 4 đội.
        </p>
        <p className="text-mist text-sm">
          Trạng thái: {info?.settings?.prelimOpen ? "Đang mở" : "Chưa mở"} • Đã đăng ký{" "}
          {info?.contestantCount || 0} • Đã nộp {info?.submittedCount || 0}
        </p>
        {existing && (
          <p className="my-4">
            Bạn đã đăng ký với mã <b>{existing.studentId}</b>.{" "}
            <Link to="/thi" className="text-gold underline">Tiếp tục làm bài</Link>
          </p>
        )}
        <form className="grid gap-3.5 mt-5" onSubmit={submit}>
          <label className="label-grid">
            Họ và tên
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="label-grid">
            Mã số thí sinh
            <input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
          </label>
          <label className="label-grid">
            Trường
            <input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
          </label>
          <label className="label-grid">
            Lớp
            <input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} />
          </label>
          {error && <div className="badge badge-no">{error}</div>}
          <button className="btn" type="submit">Vào phòng thi</button>
        </form>
      </div>
    </div>
  );
}
