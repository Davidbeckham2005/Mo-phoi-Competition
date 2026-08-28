import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { socket, on } from "../lib/socket.js";
import { loginTeam } from "../lib/api/team.js";
import { formatTime } from "../lib/format.js";
import { useGameState } from "../lib/useGame.js";

const SESSION_KEY = "team_session";

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export default function Team() {
  const { state, timer } = useGameState();
  const [session, setSession] = useState(loadSession());
  const [pickId, setPickId] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [answer, setAnswer] = useState("");

  const g = state?.game || {};
  const d = g.display || {};
  const team = (state?.teams || []).find((t) => t.id === session?.teamId);

  useEffect(() => {
    if (!session) return undefined;
    loginTeam(session.teamId, session.pass).catch(() => {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
      setErr("Phiên đăng nhập hết hạn — hãy đăng nhập lại.");
    });
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return on("team:error", () => {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
      setPass("");
      setErr("Phiên đăng nhập không hợp lệ — hãy đăng nhập lại.");
    });
  }, []);

  useEffect(() => {
    setAnswer("");
  }, [d.question]);

  function doLogin(e) {
    e.preventDefault();
    if (!pickId) {
      setErr("Hãy chọn đội của bạn trước.");
      return;
    }
    setErr("");
    loginTeam(pickId, pass)
      .then(() => {
        const s = { teamId: pickId, pass };
        localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        setSession(s);
        setPass("");
      })
      .catch((ex) => {
        if (ex.status === 404) {
          setErr("Server đang chạy bản cũ — hãy dừng (Ctrl+C) rồi chạy lại npm run dev.");
        } else if (/fetch/i.test(ex.message || "")) {
          setErr("Không gọi được máy chủ — hãy chắc chắn server đang chạy (cổng 3001).");
        } else {
          setErr(ex.message || "Đăng nhập thất bại.");
        }
      });
  }

  function buzz() {
    socket.emit("buzzer:press", { teamId: session.teamId, pass: session.pass });
  }

  function submitTt(e) {
    e.preventDefault();
    if (!answer.trim()) return;
    socket.emit("tangtoc:submit", { teamId: session.teamId, pass: session.pass, answer });
    setAnswer("");
  }

  function quit() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setErr("");
  }

  if (!state) {
    return (
      <div className="min-h-screen grid place-items-center text-mist">
        <div className="text-center">
          <p>Đang kết nối máy chủ…</p>
          <p className="text-sm mt-2">Nếu kéo dài, hãy chắc chắn server đang chạy (cổng 3001).</p>
        </div>
      </div>
    );
  }

  if (!session || !team) {
    return (
      <div className="mx-auto w-[min(720px,calc(100%-24px))] py-8 text-center">
        <Link to="/" className="text-mist hover:text-gold">← Trang chủ</Link>
        <h2 className="font-display text-3xl font-bold mt-3">Giao diện thí sinh</h2>
        <p className="text-mist mt-1">Chọn đội rồi nhập mật khẩu đội để vào phòng thi.</p>

        <div className="grid gap-4 sm:grid-cols-2 mt-6">
          {(state.teams || []).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPickId(t.id)}
              style={{ borderColor: pickId === t.id ? "#ffd60a" : t.color }}
              className={`panel text-left cursor-pointer transition hover:-translate-y-0.5 ${
                pickId === t.id ? "shadow-[0_0_0_2px_rgba(255,214,10,0.35)]" : ""
              }`}
            >
              <b style={{ color: t.color }}>{t.name}</b>
              <div className="text-mist text-sm mt-1">
                {t.score} điểm • {(t.members || []).length} thành viên
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={doLogin} className="grid gap-3.5 w-[min(360px,90vw)] mx-auto mt-7 text-left">
          <label className="label-grid">
            Mật khẩu đội
            <input
              type="password"
              autoComplete="off"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Nhập mật khẩu đội…"
            />
          </label>
          <button className="btn disabled:opacity-45" type="submit" disabled={!pickId || !pass}>
            Vào phòng thi
          </button>
        </form>
        {err && <p className="badge badge-no inline-block mt-4">{err}</p>}
      </div>
    );
  }

  const winner = g.buzzer?.winner === team.id;
  const remaining = timer?.remaining ?? g.timer?.remaining ?? 0;
  const running = timer?.running ?? g.timer?.running;
  const canBuzz = !!g.buzzer?.open && !(g.buzzer.blocked || []).includes(team.id) && !g.buzzer.winner;
  const isKd = g.round === "khoi_dong";

  let body;
  if (g.phase === "finished") {
    body = <FinalBoard teams={[...state.teams].sort((a, b) => b.score - a.score)} me={team.id} />;
  } else if (isKd) {
    body = <KhoiDongBody g={g} d={d} team={team} />;
  } else if (g.round === "vuot_cnv") {
    body = (
      <Round2Status
        g={g}
        teams={state.teams || []}
        me={team.id}
        remaining={remaining}
        running={running}
        onBuzz={buzz}
      />
    );
  } else if (g.round === "tang_toc") {
    body = (
      <>
        <button type="button" className="buzz-btn mt-3" disabled={!canBuzz && !winner} onClick={buzz}>
          {winner ? "BẠN GIỮ CHUÔNG — NHANH TAY!" : canBuzz ? "CHUÔNG" : "CHỜ"}
        </button>
        {g.timer?.running && (
          <form onSubmit={submitTt} className="flex gap-2 justify-center mt-5">
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Nhập đáp án tăng tốc…" />
            <button className="btn" type="submit" disabled={!answer.trim()}>Gửi đáp án</button>
          </form>
        )}
      </>
    );
  } else if (g.round === "ve_dich") {
    const cur = state.teams.find((t) => t.id === g.currentTeam);
    body = (
      <>
        <div className="round-badge">Về đích — lượt {cur?.name || "?"}</div>
        <p className="text-mist mt-3 max-w-md mx-auto">
          Gói {g.veDich?.packagePoints} điểm{g.veDich?.star ? " • NGÔI SAO HY VỌNG ×2" : ""}. Theo dõi câu hỏi trên màn hình lớn.
        </p>
        <ScoreList teams={state.teams} me={team.id} />
      </>
    );
  } else {
    body = (
      <>
        <div className="round-badge">Chờ MC bắt đầu</div>
        <p className="text-mist mt-3">Giao diện sẽ tự chuyển theo từng vòng thi.</p>
        <ScoreList teams={state.teams} me={team.id} />
      </>
    );
  }

  // === Khung bố cục thống nhất giữa các vòng (nội dung từng vòng thiết kế sau) ===
  return (
    <TeamLayout team={team} remaining={remaining} running={running} onLogout={quit}>
      {body}
    </TeamLayout>
  );
}

// Bố cục tổng thể thống nhất: nút đăng xuất + header + vùng nội dung
function TeamLayout({ team, remaining, running, onLogout, children }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center px-4 py-5 text-center">
      <div className="absolute top-4 left-4">
        <button type="button" className="btn btn-ghost py-2! px-3! text-sm" onClick={onLogout}>
          ← Đăng xuất
        </button>
      </div>
      <Header team={team} remaining={remaining} running={running} />
      <div className="flex-1 flex flex-col items-center justify-center w-full min-w-0">
        {children}
      </div>
    </div>
  );
}

// Header thống nhất giữa các vòng: tên đội • điểm • đồng hồ
function Header({ team, remaining, running }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="font-display text-lg font-bold" style={{ color: team.color }}>{team.name}</div>
      <span className="text-mist text-sm">•</span>
      <span className="text-mist text-sm">{team.score} điểm</span>
      <span className={`timer-xl ml-4 text-3xl ${remaining <= 5 && running ? "timer-danger" : ""}`}>
        {formatTime(remaining)}
      </span>
    </div>
  );
}

// Vòng Khởi động: chỉ hiển thị câu hỏi (thí sinh ghi đáp án trên giấy bên ngoài)
function KhoiDongBody({ g, d, team }) {
  const active = g.questionStatus === "showing" && d.mode === "question";
  const myTurn = active && g.currentTeam === team.id;
  const curName = g.currentTeam ? `đội ${String(g.currentTeam).toUpperCase()}` : "";

  if (d.answerRevealed && d.mode === "question") {
    return (
      <div className="text-center">
        {d.mediaUrl && (
          <img src={d.mediaUrl} className="max-h-[26vh] max-w-[42vw] mx-auto rounded-xl mb-3" />
        )}
        <div className="kicker">ĐÁP ÁN</div>
        <div className="stage-answer mt-2">{d.answer}</div>
      </div>
    );
  }
  if (!active) {
    return (
      <div className="text-center">
        <div className="round-badge">Lượt {curName || "?"}</div>
        <p className="text-mist mt-4 text-lg">
          Đang chờ MC hiển thị câu hỏi…
        </p>
      </div>
    );
  }
  if (!myTurn) {
    return (
      <div className="text-center w-full">
        {d.mediaUrl && d.mediaType === "image" ? (
          <img src={d.mediaUrl} className="max-h-[40vh] mx-auto rounded-xl mb-4 opacity-50" />
        ) : (
          <div className="mx-auto w-[min(400px,80vw)] aspect-[4/3] rounded-xl bg-panel-solid border border-line grid place-items-center opacity-50 mb-4">
            <div className="text-5xl text-mist/40">?</div>
          </div>
        )}
        {d.question && <div className="stage-q mt-1 opacity-50">{d.question}</div>}
        <div className="badge badge-no mt-3">Chưa đến lượt — đang là lượt {curName}</div>
      </div>
    );
  }
  return (
    <div className="text-center w-full">
      {d.mediaUrl && d.mediaType === "image" ? (
        <img src={d.mediaUrl} className="max-h-[45vh] mx-auto rounded-xl mb-4" />
      ) : (
        <div className="mx-auto w-[min(400px,80vw)] aspect-[4/3] rounded-xl bg-panel-solid border border-line grid place-items-center mb-4">
          <div className="text-5xl text-mist/40">?</div>
        </div>
      )}
      {d.question && <div className="stage-q mt-1">{d.question}</div>}
    </div>
  );
}

// Vòng 2 (Vượt CNV): thí sinh theo dõi câu hỏi/hàng ngang trên màn hình khán giả.
// Màn hình thí sinh chỉ hiển thị: đồng hồ đếm giây + trạng thái quyền trả lời + chuông.
// Vòng 2 (Vượt CNV): các đội TRẢ LỜI THEO LƯỢT, không bấm chuông.
// Chỉ khi đội đó sai / hết giờ, chuông mới mở để đội khác giành quyền trả lời.
function Round2Status({ g, teams, me, remaining, running, onBuzz }) {
  const curId = g.currentTeam;
  const curName = teams.find((t) => t.id === curId)?.name;
  const winnerId = g.buzzer?.winner;
  const winnerName = teams.find((t) => t.id === winnerId)?.name;
  const blocked = (g.buzzer?.blocked || []).includes(me);
  const open = !!g.buzzer?.open;
  const awaitingSteal = !!g.puzzle?.awaitingSteal;
  const keywordDone = !!g.puzzle?.keywordSolved;
  const rowsOpen = (g.puzzle?.rowsSolved || []).filter(Boolean).length;
  const keywordPhase = !keywordDone && (!!g.puzzle?.centerRevealed || rowsOpen === 4);
  const showing = g.questionStatus === "showing";

  const won = winnerId === me;
  const someoneWon = !!winnerId && !won;
  const canSteal = open && !blocked && !winnerId && !(awaitingSteal && me === curId);
  const myTurn = showing && !awaitingSteal && !keywordPhase && !keywordDone && !winnerId && curId === me;
  const otherTurn = showing && !awaitingSteal && !keywordPhase && !keywordDone && !winnerId && !!curId && curId !== me;

  let status;
  if (keywordDone) {
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="badge badge-ok text-base! px-5 py-2">ĐÃ TÌM RA TỪ KHÓA</div>
        <p className="text-mist">Vòng 2 kết thúc — chờ MC chuyển vòng tiếp theo.</p>
      </div>
    );
  } else if (won) {
    status = (
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="badge badge-ok text-base! px-5 py-2">QUYỀN TRẢ LỜI THUỘC VỀ BẠN</div>
        <div className="font-display font-bold text-gold text-[clamp(38px,6vw,72px)] leading-tight">
          BẠN ĐƯỢC TRẢ LỜI!
        </div>
        <p className="text-mist">Trả lời to, rõ ràng — MC sẽ xác nhận kết quả.</p>
      </div>
    );
  } else if (someoneWon) {
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="badge badge-ok text-base! px-5 py-2">CÓ ĐỘI GIÀNH ĐƯỢC QUYỀN</div>
        <div className="font-display font-bold text-gold text-[clamp(30px,4.5vw,54px)]">Đội {winnerName}</div>
        <p className="text-mist">đang trả lời — quan sát diễn biến trên màn hình lớn.</p>
      </div>
    );
  } else if (canSteal) {
    status = (
      <div className="flex flex-col items-center gap-5">
        <div className="badge badge-warn text-base! px-5 py-2 animate-pulse">ĐANG MỞ CHUÔNG — BẤM NGAY!</div>
        <button
          type="button"
          className="buzz-btn buzz-live"
          style={{ width: "clamp(220px,30vw,300px)", height: "clamp(220px,30vw,300px)", fontSize: 26 }}
          onClick={onBuzz}
        >
          BẤM CHUÔNG
        </button>
        <p className="text-mist">Ai bấm trước sẽ giành quyền trả lời.</p>
      </div>
    );
  } else if (awaitingSteal && me === curId) {
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="badge badge-no text-base! px-5 py-2">ĐỘI BẠN TRẢ LỜI CHƯA ĐÚNG</div>
        <p className="text-mist">Các đội khác đang giành quyền — theo dõi trên màn hình lớn.</p>
      </div>
    );
  } else if (myTurn) {
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="badge badge-warn text-base! px-5 py-2">LƯỢT TRẢ LỜI</div>
        <div className="font-display font-bold text-gold text-[clamp(34px,5.5vw,64px)]">
          LƯỢT CỦA BẠN!
        </div>
        <p className="text-mist">Đây là lượt trả lời của đội bạn — quan sát câu hỏi trên màn hình lớn rồi trả lời.</p>
      </div>
    );
  } else if (otherTurn) {
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="badge text-base! px-5 py-2">ĐANG TRẢ LỜI</div>
        <div className="font-display font-bold text-gold text-[clamp(30px,4.5vw,54px)]">Lượt đội {curName}</div>
        <p className="text-mist">Quan sát câu hỏi trên màn hình lớn — chờ đến lượt đội bạn.</p>
      </div>
    );
  } else if (keywordPhase) {
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="badge badge-warn text-base! px-5 py-2">ĐOÁN TỪ KHÓA</div>
        <p className="text-mist">4 góc đã mở — quan sát và đoán chướng ngại vật trên màn hình lớn.</p>
      </div>
    );
  } else {
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="round-badge">Vòng 2 — Vượt chướng ngại vật</div>
        <p className="text-mist">Chờ MC bắt đầu. Quan sát câu hỏi, hình ảnh và hàng ngang trên màn hình lớn.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full min-w-0">
      <div
        className={`timer-xl ${remaining <= 5 && running ? "timer-danger" : ""}`}
        style={{ fontSize: "clamp(80px, 14vw, 150px)" }}
      >
        {formatTime(remaining)}
      </div>
      {status}
    </div>
  );
}

function ScoreList({ teams, me }) {
  return (
    <div className="grid gap-2 w-[min(420px,92%)] mt-5">
      {[...teams].sort((a, b) => b.score - a.score).map((t) => (
        <div
          key={t.id}
          className={`flex justify-between items-center rounded-xl bg-panel-solid border border-line px-4 py-2.5 ${
            t.id === me ? "!border-gold shadow-[0_0_12px_rgba(255,214,10,0.2)]" : ""
          }`}
        >
          <b>{t.name}</b>
          <span>{t.score} điểm</span>
        </div>
      ))}
    </div>
  );
}

function FinalBoard({ teams, me }) {
  return (
    <div className="grid gap-2 w-[min(420px,92%)] mt-5">
      {teams.map((t, i) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 justify-between rounded-xl bg-panel-solid border border-line px-4 py-2.5 ${
            t.id === me ? "!border-gold shadow-[0_0_12px_rgba(255,214,10,0.2)]" : ""
          }`}
        >
          <span className="text-mist">#{i + 1}</span>
          <b>{t.name}</b>
          <span>{t.score} điểm</span>
        </div>
      ))}
    </div>
  );
}
