import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login } from "../lib/api/admin.js";
import { getPin, setPin } from "../lib/session.js";

export default function StaffLogin() {
  const [pin, setPinValue] = useState(getPin());
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const nav = useNavigate();
  const next = params.get("next") || "/mc";

  async function submit(e) {
    e.preventDefault();
    try {
      await login(pin);
      setPin(pin);
      nav(next);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (getPin()) {
      login(getPin()).then(() => nav(next)).catch(() => {});
    }
  }, [nav, next]);

  return (
    <div className="page">
      <div className="panel" style={{ maxWidth: 420, margin: "40px auto" }}>
        <div className="kicker">Ban tổ chức</div>
        <h2>Nhập mã PIN</h2>
        <form className="form-grid" onSubmit={submit} style={{ marginTop: 16 }}>
          <label>PIN
            <input type="password" value={pin} onChange={(e) => setPinValue(e.target.value)} />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="btn">Đăng nhập</button>
          <p className="muted">Mặc định: 2026 (đổi được trong trang quản trị)</p>
        </form>
      </div>
    </div>
  );
}
