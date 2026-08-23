import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Register from "./pages/Register.jsx";
import Exam from "./pages/Exam.jsx";
import ExamResult from "./pages/ExamResult.jsx";
import Audience from "./pages/Audience.jsx";
import Control from "./pages/Control.jsx";
import Admin from "./pages/Admin.jsx";
import Team from "./pages/Team.jsx";
import StaffLogin from "./pages/StaffLogin.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dang-ky" element={<Register />} />
        <Route path="/thi" element={<Exam />} />
        <Route path="/ket-qua" element={<ExamResult />} />
        <Route path="/man-hinh" element={<Audience />} />
        <Route path="/mc" element={<Control />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/thi-sinh" element={<Team />} />
        <Route path="/vong-1" element={<Navigate to="/thi-sinh" replace />} />
        <Route path="/chuong" element={<Navigate to="/thi-sinh" replace />} />
        <Route path="/dang-nhap" element={<StaffLogin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
