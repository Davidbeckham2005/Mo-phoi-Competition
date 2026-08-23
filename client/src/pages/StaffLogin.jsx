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
    <div className="mx-auto w-[min(1100px,calc(100%-32px))] py-7 pb-16">
      <div className="panel max-w-[420px] mx-auto mt-10">
        <div className="kicker">Ban tổ chức</div>
        <h2 className="text-xl font-bold mt-2">Nhập mã PIN</h2>
        <form className="grid gap-3.5 mt-5" onSubmit={submit}>
          <label className="label-grid">
            PIN
            <input
              type="password"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPinValue(e.target.value)}
            />
          </label>
          {error && <div className="badge badge-no">{error}</div>}
          <button className="btn" type="submit">Đăng nhập</button>
          <p className="text-mist text-sm">Mặc định: 2026 (đổi được trong trang quản trị)</p>
        </form>
      </div>
    </div>
  );
}
