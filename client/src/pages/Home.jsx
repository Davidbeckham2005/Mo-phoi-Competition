import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPublicState } from "../lib/api/public.js";

export default function Home() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    getPublicState().then(setInfo).catch(() => {});
  }, []);

  return (
    <div className="home">
      <div className="home-inner">
        <div className="kicker">Hệ thống tổ chức cuộc thi</div>
        <h1>{info?.settings?.title || "CUỘC THI TRI THỨC"}</h1>
        <p className="subtitle">
          {info?.settings?.subtitle || "Sơ khảo online • 4 đội tranh tài • Điều khiển trực tiếp"}
        </p>
        <div className="role-grid">
          <Link className="role-card" to="/dang-ky">
            <div className="kicker">01</div>
            <b>Thí sinh</b>
            <span>Đăng ký và làm bài sơ khảo 30 câu trong 15 phút.</span>
          </Link>
          <Link className="role-card" to="/man-hinh">
            <div className="kicker">02</div>
            <b>Người xem</b>
            <span>Màn hình khán giả: câu hỏi, bảng điểm, mảnh ghép realtime.</span>
          </Link>
          <Link className="role-card" to="/mc">
            <div className="kicker">03</div>
            <b>Ban tổ chức / MC</b>
            <span>Điều khiển vòng thi, chuông, điểm số và trạng thái câu hỏi.</span>
          </Link>
          <Link className="role-card" to="/admin">
            <div className="kicker">04</div>
            <b>Quản trị</b>
            <span>Câu hỏi, đội thi, hình ảnh/video, kết quả và top 16.</span>
          </Link>
          <Link className="role-card" to="/chuong">
            <div className="kicker">05</div>
            <b>Chuông đội</b>
            <span>Thiết bị bấm quyền trả lời cho từng đội.</span>
          </Link>
          <Link className="role-card" to="/vong-1">
            <div className="kicker">06</div>
            <b>Thí sinh — Vòng 1</b>
            <span>Thí sinh trong đội ghi đáp án Khởi động ngay trên máy.</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
