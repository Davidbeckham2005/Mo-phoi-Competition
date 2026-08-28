import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { socket, on } from "../lib/socket.js";
import { loginTeam } from "../lib/api/team.js";
import { formatTime } from "../lib/format.js";
import { useGameState } from "../lib/useGame.js";
import { isOpen, isLocked } from "../lib/cnv.js";

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
      <div className="w-full max-w-[1240px] mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        <PuzzlePanel cnv={state.cnv} puzzle={g.puzzle || {}} />
        <div className="flex flex-col items-start min-w-0 gap-2.5">
          <KeywordPanel cnv={state.cnv} puzzle={g.puzzle || {}} />
          <button
            type="button"
            className="buzz-btn mt-4"
            style={{ width: 150, height: 150, fontSize: 15, borderWidth: 8 }}
            disabled={!canBuzz && !winner}
            onClick={buzz}
          >
            {winner ? "BẠN ĐƯỢC TRẢ LỜI!" : canBuzz ? "CHUÔNG" : "CHỜ"}
          </button>
        </div>
      </div>
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

function PuzzlePanel({ cnv, puzzle }) {
  const media = cnv?.media;
  const solved = [0, 1, 2, 3].map((i) => isOpen(puzzle, i));
  const locked = [0, 1, 2, 3].map((i) => isLocked(puzzle, i));
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-w-0">
      {media?.url &&
        (media.type === "video" ? (
          <video src={media.url} controls className="max-h-[28vh] max-w-full rounded-2xl border border-line shadow-[0_10px_40px_rgba(0,0,0,0.4)]" />
        ) : (
          <img src={media.url} alt="Ảnh ghép" className="max-h-[28vh] max-w-full object-contain rounded-2xl border border-line shadow-[0_10px_40px_rgba(0,0,0,0.4)]" />
        ))}
      <div className="relative w-[clamp(240px,24vw,400px)] aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-line">
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
          {[0, 1, 2, 3].map((r) => (
            <div
              key={r}
              className={`grid place-items-center font-display font-bold text-[clamp(28px,3vw,46px)] transition-colors ${
                solved[r]
                  ? "bg-gold/90 text-[#1a1400]"
                  : locked[r]
                    ? "bg-danger/10 text-danger/80"
                    : "bg-panel-solid text-mist"
              }`}
            >
              {solved[r] ? r + 1 : locked[r] ? "✕" : "?"}
            </div>
          ))}
        </div>

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-line" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-line" />
        </div>

        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[38%] h-[46%] rounded-xl border-2 grid place-items-center font-display font-bold text-[clamp(22px,2.4vw,36px)] ${
            puzzle.centerRevealed
              ? "bg-gold text-[#1a1400] border-gold shadow-[0_0_26px_rgba(255,214,10,0.45)]"
              : "bg-night border-line text-mist"
          }`}
        >
          {puzzle.centerRevealed ? "★" : "?"}
        </div>
      </div>
    </div>
  );
}

function KeywordPanel({ cnv, puzzle }) {
  return (
    <div className="flex flex-col items-start gap-2.5 min-w-0">
      {(cnv?.rows || []).map((row, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className={`text-sm w-14 shrink-0 text-right ${row.status === "open" ? "text-gold" : row.status === "locked" ? "text-danger/80" : "text-mist"}`}>
            Hàng {i + 1}
          </span>
          <div className="flex gap-1.5">
            {row.status === "open"
              ? row.word.replace(/\s/g, "").split("").map((ch, j) => (
                  <span key={j} className="ltr ltr-open">{ch}</span>
                ))
              : row.status === "locked"
                ? Array.from({ length: row.letterCount }, (_, j) => (
                    <span key={j} className="ltr ltr-locked">✕</span>
                  ))
                : Array.from({ length: row.letterCount }, (_, j) => (
                    <span key={j} className="ltr" />
                  ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-start gap-1.5 mt-2">
        <span className="text-sm w-14 shrink-0 text-right text-gold">Từ khóa</span>
        {puzzle.keywordSolved && cnv?.keyword
          ? cnv.keyword.split("").map((ch, j) => (
              <span key={j} className={`ltr ltr-kw ${/\s/.test(ch) ? "" : "ltr-gold"}`}>
                {/\s/.test(ch) ? "" : ch}
              </span>
            ))
          : Array.from({ length: cnv?.keywordLetterCount || 0 }, (_, j) => (
              <span key={j} className="ltr ltr-kw" />
            ))}
        {!!cnv?.keywordLetterCount && (
          <span className="text-mist text-sm ml-2">{cnv.keywordLetterCount} chữ cái</span>
        )}
      </div>

      {puzzle.centerRevealed && cnv?.centerHint && (
        <div className="stage-note mt-1">★ {cnv.centerHint}</div>
      )}
      {puzzle.awaitingSteal && (
        <div className="badge badge-warn mt-2">Hết giờ / sai — mở chuông giành quyền trả lời!</div>
      )}
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
