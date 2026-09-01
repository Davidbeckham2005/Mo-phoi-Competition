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

  // Reset ô đáp án Tăng tốc khi MC đổi câu hỏi: câu vòng 3 là video nên d.question
  // có thể KHÔNG đổi giữa các câu → đáp án cũ bị giữ nguyên trong ô, dễ nộp nhầm
  // cho câu mới. Gộp thêm g.questionIndex để luôn reset đúng mỗi lần đổi câu.
  useEffect(() => {
    setAnswer("");
  }, [d.question, g.questionIndex]);

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

  function buzz(intent = "row") {
    socket.emit("buzzer:press", { teamId: session.teamId, pass: session.pass, intent });
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
              style={{ borderColor: pickId === t.id ? "var(--color-gold)" : t.color }}
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
  // Nút nhỏ CỐ ĐỊNH góc phải dành riêng cho ĐOÁN ĐÁP ÁN CHƯỚNG NGẠI VẬT:
  // sáng BẤT KỲ LÚC NÀO trong vòng 2 (chưa ra từ khóa, chưa có đội nào đang giữ),
  // bấm = ghi danh giành quyền đoán từ khóa (kể cả khi đang chơi hàng ngang).
  const kwOpen =
    g.round === "vuot_cnv" &&
    !g.puzzle?.keywordSolved &&
    !g.puzzle?.keywordClaim;
  const kwBlocked = (g.puzzle?.keywordBlocked || []).includes(team.id);
  // Cấm ghi danh/trả lời chướng ngại vật khi đang có đội khác trả lời câu hỏi hàng ngang
  // (questionStatus === "showing"): nút TỪ KHÓA sẽ tạm khóa, hết câu hỏi mới mở lại.
  const rowAnswerActive = g.questionStatus === "showing";
  const buzzKeywordEnabled = kwOpen && !kwBlocked && !rowAnswerActive;

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
    const tt = g.tangToc || {};
    const phase = tt.phase || "video";
    const submitted = !!tt.submissions?.[team.id];
    body = (
      <div className="flex flex-col items-center gap-5 w-full max-w-lg">
        <div className="round-badge">
          {phase === "video"
            ? "TĂNG TỐC — ĐANG CHIẾU VIDEO"
            : phase === "answers"
              ? "TĂNG TỐC — CHỐT ĐÁP ÁN"
              : "TĂNG TỐC — CHUẨN BỊ CHIẾU"}
        </div>
        {submitted ? (
          <div className="panel w-full text-left">
            <div className="badge badge-ok inline-block mb-2">Đã gửi đáp án</div>
            <p className="text-mist">
              Đáp án của đội bạn: <b className="text-ink">“{tt.submissions[team.id].answer}”</b>. Chờ MC chốt điểm.
            </p>
          </div>
        ) : phase === "preparing" ? (
          <p className="text-mist max-w-md">
            Đang đếm ngược chuẩn bị — video sắp được chiếu trên màn hình lớn. Quan sát thật kỹ, ghi đáp án rồi gửi khi video bắt đầu.
          </p>
        ) : phase === "video" ? (
          <>
            <p className="text-mist max-w-md">
              Quan sát video trên màn hình lớn, ghi đáp án (dạng tự luận) rồi gửi. Nộp nhanh sẽ được cộng nhiều điểm hơn.
            </p>
            {running ? (
              <form onSubmit={submitTt} className="flex gap-2 justify-center w-full">
                <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Nhập đáp án tăng tốc…" className="flex-1" />
                <button className="btn" type="submit" disabled={!answer.trim()}>Gửi đáp án</button>
              </form>
            ) : (
              <p className="badge badge-warn">Video chưa phát hoặc MC đã dừng — chờ MC bấm Chiếu video.</p>
            )}
          </>
        ) : (
          <p className="text-mist">Video đã chiếu xong — chờ MC chốt điểm từng đội trên màn hình lớn.</p>
        )}
      </div>
    );
  } else if (g.round === "ve_dich") {
    body = (
      <VeDichBody
        g={g}
        d={d}
        teams={state.teams}
        me={team.id}
        remaining={remaining}
        running={running}
        onBuzz={buzz}
        winnerId={g.buzzer?.winner}
      />
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
    <>
      {g.round === "vuot_cnv" && (
        <button
          type="button"
          onClick={buzzKeywordEnabled ? () => buzz("keyword") : undefined}
          disabled={!buzzKeywordEnabled}
          title={
            buzzKeywordEnabled
              ? "Nhấn để ghi danh giành quyền đoán đáp án chướng ngại vật"
              : rowAnswerActive
                ? "Đang có đội khác trả lời câu hỏi hàng ngang — chờ xong mới đoán từ khóa"
                : "Từ khóa đã ra hoặc đội bạn đã đoán sai"
          }
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 h-12 text-sm font-semibold tracking-wide border transition ${
            buzzKeywordEnabled
              ? "bg-gold text-[#1a1400] border-gold shadow-[0_0_22px_rgba(255,214,10,0.5)] animate-pulse"
              : "bg-panel-solid text-mist/55 border-line cursor-not-allowed opacity-75"
          }`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          TỪ KHÓA
        </button>
      )}
      <TeamLayout team={team} remaining={remaining} running={running} onLogout={quit}>
        {body}
      </TeamLayout>
    </>
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

// Vòng 2 (Vượt CNV): trả lời HÀNG NGANG theo lượt, chỉ mở chuông cướp khi đội đó
// trả lời sai / hết giờ. Riêng giai đoạn TỪ KHÓA (chướng ngại vật): chuông bấm
// TỰ DO bất kỳ lúc nào để giành quyền trả lời.
function Round2Status({ g, teams, me, remaining, running, onBuzz }) {
  const curId = g.currentTeam;
  const curName = teams.find((t) => t.id === curId)?.name;
  const winnerId = g.buzzer?.winner;
  const winnerName = teams.find((t) => t.id === winnerId)?.name;
  const blocked = (g.buzzer?.blocked || []).includes(me);
  const rowBanned = (g.puzzle?.rowBanned || []).includes(me);
  const open = !!g.buzzer?.open;
  const awaitingSteal = !!g.puzzle?.awaitingSteal;
  const keywordDone = !!g.puzzle?.keywordSolved;
  const cornersAllDone = [0, 1, 2, 3].every((i) => g.puzzle?.rowsSolved?.[i] || g.puzzle?.rowsLocked?.[i]);
  // Cửa sổ đoán từ khóa theo lối cũ (sau từng hàng ngang / đủ 4 góc) — vẫn dùng để hiện hướng dẫn,
  // còn việc đoán vòng 2 giờ được ghi danh (puzzle.keywordClaim) bất kỳ lúc nào qua nút TỪ KHÓA.
  const keywordGuessOpen = !keywordDone && (!!g.puzzle?.keywordWindow || cornersAllDone);
  const kwClaim = g.puzzle?.keywordClaim;
  const kwBlocked = (g.puzzle?.keywordBlocked || []).includes(me);
  const showing = g.questionStatus === "showing";
  const last = g.puzzle?.lastResult;
  const lastTeam = last ? teams.find((t) => t.id === last.teamId) : null;
  // "Chờ giữa các câu hỏi" (vòng 2): đã xử lý xong một hàng ngang, chưa chọn ô kế tiếp,
  // không còn câu hỏi nào đang thi. Đồng hồ hiện "CHỜ" thay vì đứng yên mãi.
  const waitingBetween = g.round === "vuot_cnv" && !keywordDone && !!g.puzzle?.keywordWindow
    && !awaitingSteal && g.questionStatus !== "showing" && !winnerId;

  const won = winnerId === me;
  const someoneWon = !!winnerId && !won;
  // Chuông to ở giữa CHỈ dành cho trả lời/cướp HÀNG NGANG (dựa riêng vào trạng thái
  // buzer + lượt hàng ngang). TÁCH HOÀN TOÀN khỏi cửa sổ/ghi danh từ khóa
  // (puzzle.keywordClaim) để 2 nút không đè lẫn nhau. Đoán từ khóa dùng nút vàng TỪ KHÓA.
  const canSteal = open && !blocked && !rowBanned && !winnerId && !(awaitingSteal && me === curId);
  const myTurn = showing && !awaitingSteal && !keywordDone && !winnerId && curId === me && !rowBanned;
  const otherTurn = showing && !awaitingSteal && !keywordDone && !winnerId && !!curId && curId !== me;

  let status;
  if (last) {
    status = (
      <div key={`${last.row}-${last.correct}`} className={`flex flex-col items-center gap-3 r2-feedback ${last.correct ? "r2-correct" : "r2-wrong"}`}>
        <div className={`r2-feedback-pill ${last.correct ? "r2-pill-ok" : "r2-pill-no"}`}>
          <span className="text-[clamp(28px,5vw,44px)] font-display font-black tracking-wide">
            {last.correct ? "ĐÚNG!" : "SAI"}
          </span>
          {lastTeam && (
            <span className="text-sm font-bold" style={{ color: lastTeam.color }}>{lastTeam.name}</span>
          )}
        </div>
        <p className="text-mist">
          {last.correct
            ? `Trả lời đúng — cộng ${last.pts} điểm và mở hàng ${last.row + 1}.`
            : `Trả lời sai — trừ ${Math.abs(last.pts || 0)} điểm và khóa hàng ${last.row + 1}.`}
        </p>
      </div>
    );
  } else if (waitingBetween) {
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="badge badge-warn text-base! px-5 py-2 animate-pulse">CHỜ CÂU HỎI KẾ TIẾP</div>
        <p className="text-mist max-w-sm">
          Đang chờ MC chọn ô hàng ngang tiếp theo. Muốn giành quyền đoán từ khóa, bấm nút vàng{" "}
          <b className="text-gold">TỪ KHÓA</b> ở góc phải.
        </p>
      </div>
    );
  } else if (keywordDone) {
    const kwWinnerTeam = g.puzzle?.keywordWinner
      ? teams.find((t) => t.id === g.puzzle.keywordWinner)
      : null;
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="badge badge-ok text-base! px-5 py-2">ĐÃ TÌM RA TỪ KHÓA</div>
        {kwWinnerTeam ? (
          <div className="font-display font-bold text-gold text-[clamp(28px,4.5vw,54px)]">
            {kwWinnerTeam.name}
          </div>
        ) : (
          <div className="font-display font-bold text-mist text-[clamp(24px,4vw,44px)]">
            Không ai giải
          </div>
        )}
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
  } else if (rowBanned && open && !winnerId) {
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="badge badge-no text-base! px-5 py-2">ĐỘI BẠN BỊ CẤM TRẢ LỜI HÀNG NGANG</div>
        <div className="font-display font-bold text-mist text-[clamp(24px,4vw,40px)]">KHÔNG ĐƯỢC GIÀNH QUYỀN</div>
        <p className="text-mist max-w-sm">
          Đội bạn đã đoán từ khóa chưa đúng nên không được bấm chuông / cướp hàng ngang nữa.
          Vẫn có thể dùng nút vàng <b className="text-gold">TỪ KHÓA</b> nếu chưa bị chặn.
        </p>
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
          onClick={() => onBuzz("row")}
        >
          BẤM CHUÔNG
        </button>
        <p className="text-mist">Ai bấm trước sẽ giành quyền trả lời.</p>
      </div>
    );
  } else if (!!kwClaim && kwClaim === me) {
    status = (
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="badge badge-warn text-base! px-5 py-2">BẠN GHI DANH ĐOÁN TỪ KHÓA</div>
        <div className="font-display font-bold text-gold text-[clamp(30px,5vw,64px)] leading-tight">
          BẠN ĐANG GIỮ QUYỀN
        </div>
        <p className="text-mist">Nêu đáp án chướng ngại vật to, rõ ràng — chờ MC xác nhận đúng/sai.</p>
      </div>
    );
  } else if (!!kwClaim && kwClaim !== me) {
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="badge badge-warn text-base! px-5 py-2">CÓ ĐỘI GHI DANH ĐOÁN TỪ KHÓA</div>
        <div className="font-display font-bold text-gold text-[clamp(28px,4.5vw,54px)]">
          {teams.find((t) => t.id === kwClaim)?.name}
        </div>
        <p className="text-mist">Đang trả lời đáp án chướng ngại vật — quan sát diễn biến trên màn hình lớn.</p>
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
  } else if (keywordGuessOpen && kwBlocked) {
    status = (
      <div className="flex flex-col items-center gap-3">
        <div className="badge badge-no text-base! px-5 py-2">ĐỘI BẠN ĐOÁN CHƯA ĐÚNG</div>
        <div className="font-display font-bold text-mist text-[clamp(26px,4vw,44px)]">KHÔNG ĐƯỢC ĐOÁN TIẾP</div>
        <p className="text-mist">Đội bạn đã đoán từ khóa chưa đúng — các đội khác tiếp tục đoán.</p>
      </div>
    );
  } else if (keywordGuessOpen) {
    // Cửa sổ đoán TỪ KHÓA: dùng nút vàng cố định ở góc phải (không dùng chuông to)
    status = (
      <div className="flex flex-col items-center gap-4">
        <div className="badge badge-warn text-base! px-5 py-2">ĐOÁN TỪ KHÓA</div>
        <p className="text-mist max-w-sm">
          Nhấn nút vàng <b className="text-gold">TỪ KHÓA</b> ở góc phải màn hình để đoán đáp án chướng ngại vật.
        </p>
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
        {waitingBetween && !last ? "CHỜ" : formatTime(remaining)}
      </div>
      {status}
    </div>
  );
}

// Màn hình ĐỘI — Vòng 4 (Về đích): đồng bộ với MC và khán giả từ cùng g.display + g.veDich.
// Hiện câu hỏi, thông tin ngôi sao, lật đáp án, và nút giành quyền trả lời khi đối thủ trả lời sai.
function VeDichBody({ g, d, teams, me, remaining, running, onBuzz, winnerId }) {
  const ved = g.veDich || {};
  const phase = ved.phase || "soan";
  const cur = teams.find((t) => t.id === g.currentTeam);
  const star = ved.starQuestion === (ved.pickIndex ?? 0);
  const inQuestion = d.mode === "question" && !!d.question;
  const blocked = (g.buzzer?.blocked || []).includes(me);
  const open = !!g.buzzer?.open;
  const won = winnerId === me;

  // Có thể bấm chuông giành quyền: đang mở chuông (stealOpen), mình chưa bị chặn, chưa có người thắng.
  const canSteal = open && !!ved.stealOpen && !blocked && !winnerId;

  let inner;
  if (phase === "countdown") {
    const n = remaining > 0 ? remaining : 3;
    inner = (
      <div className="text-center">
        <div className="round-badge">Về đích — {cur?.name || g.currentTeam?.toUpperCase()}</div>
        <div className={`font-display font-black text-[clamp(72px,16vw,160px)] leading-none mt-4 ${running ? "text-gold" : "text-mist"}`}>{n}</div>
        <p className="text-mist mt-2">Chuẩn bị thi…</p>
      </div>
    );
  } else if (!inQuestion) {
    inner = (
      <div className="text-center">
        <div className="round-badge">Về đích — {cur?.name || g.currentTeam?.toUpperCase()}</div>
        <p className="text-mist mt-4 text-[clamp(16px,2.4vw,24px)]">
          {phase === "ready"
            ? "Bộ câu đã xác nhận — sẵn sàng thi"
            : phase === "prep"
              ? "Chuẩn bị câu hỏi kế tiếp …"
              : "MC đang soạn bộ câu. Quan sát màn hình lớn."}
        </p>
      </div>
    );
  } else {
    inner = (
      <div className="text-center w-full max-w-xl">
        <div
          className={`timer-xl ${running && remaining <= 5 ? "timer-danger" : ""}`}
          style={{ fontSize: "clamp(56px,9vw,90px)" }}
        >
          {formatTime(remaining)}
        </div>
        <div className="round-badge">Về đích — {cur?.name || g.currentTeam?.toUpperCase()}</div>
        {star && (
          <div className="badge badge-ok text-base! px-4 py-2 mt-3">Ngôi sao hy vọng — điểm ×2</div>
        )}
        {d.mediaUrl && d.mediaType === "image" && (
          <img src={d.mediaUrl} alt="" className="max-h-[24vh] mx-auto rounded-2xl mt-3 object-contain border border-line" />
        )}
        {d.question && <div className="stage-q mt-3">{d.question}</div>}
        {ved.stealOpen && (
          <div className="badge badge-warn text-base! px-4 py-2 mt-5 animate-pulse">
            {won ? "BẠN GIÀNH ĐƯỢC QUYỀN — hãy trả lời!" : "Mở chuông giành quyền trả lời"}
          </div>
        )}
        {d.answerRevealed && <div className="stage-answer mt-5">Đáp án: {d.answer}</div>}
        {d.note && <div className="stage-note mt-4">{d.note}</div>}
        {canSteal && (
          <button
            type="button"
            className="mt-7 px-8 py-4 rounded-2xl font-display font-black text-2xl text-[#140d00] bg-gold shadow-[0_0_30px_rgba(255,214,10,0.4)] active:scale-95 transition"
            onClick={() => onBuzz("row")}
          >
            BẤM GIÀNH QUYỀN TRẢ LỜI
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full min-w-0">
      {inner}
      <ScoreList teams={teams} me={me} />
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
