import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendControl, getCurrentQuestion } from "../lib/api/control.js";
import { getPin } from "../lib/session.js";
import { formatTime } from "../lib/format.js";
import { on } from "../lib/socket.js";
import { useGameState } from "../lib/useGame.js";

export default function Control() {
  const nav = useNavigate();
  const { state } = useGameState();
  const [current, setCurrent] = useState(null);
  const [seconds, setSeconds] = useState(15);
  const [delta, setDelta] = useState(10);

  async function refreshQ() {
    try {
      setCurrent(await getCurrentQuestion());
    } catch {
      nav("/dang-nhap?next=/mc");
    }
  }

  useEffect(() => {
    if (!getPin()) {
      nav("/dang-nhap?next=/mc");
      return;
    }
    refreshQ();
    return on("game:state", () => {
      refreshQ();
    });
  }, [nav]);

  function act(action, body) {
    sendControl(action, body).catch((e) => alert(e.message));
  }

  if (!state) return <div className="page muted">Đang tải bàn điều khiển...</div>;

  const g = state.game || {};
  const q = current?.question;
  const d = g.display || {};
  const p = g.puzzle || {};

  const solved = p.rowsSolved || [false, false, false, false];
  const locked = p.rowsLocked || [false, false, false, false];
  const cornersDone = [0, 1, 2, 3].every((i) => solved[i] || locked[i]);
  const cnvRowPhase = g.round === "vuot_cnv" && !cornersDone;
  const cnvKeywordPhase = g.round === "vuot_cnv" && cornersDone && !p.keywordSolved;

  const showing = d.mode === "question";
  const revealed = !!d.answerRevealed;

  const winner = state.teams.find((t) => t.id === g.buzzer?.winner);
  const cur = state.teams.find((t) => t.id === g.currentTeam);
  const answering = winner || cur;

  let pts = q?.points || current?.keywordPoints || 10;
  if (g.round === "ve_dich") {
    pts = (g.veDich?.packagePoints || 20) * (g.veDich?.star ? 2 : 1);
  }

  let status = { cls: "", text: "BẢNG CHÍNH" };
  if (p.keywordSolved && g.round === "vuot_cnv") status = { cls: "ok", text: "ĐÃ XUẤT TỪ KHÓA" };
  else if (p.awaitingSteal) status = { cls: "warn", text: "CHỜ CƯỚP QUYỀN" };
  else if (showing && revealed) status = { cls: "warn", text: "ĐÃ LẬT ĐÁP ÁN" };
  else if (showing) status = { cls: "ok", text: "ĐANG HIỆN CÂU HỎI" };

  let progress = "";
  if (g.round === "khoi_dong") progress = `Câu ${g.questionIndex + 1} • ${cur?.name || ""}`;
  else if (g.round === "tang_toc") progress = `Câu ${(g.questionIndex || 0) + 1}/4`;
  else if (g.round === "vuot_cnv") {
    const doneCount = solved.filter(Boolean).length;
    progress = cnvKeywordPhase
      ? `Đoán từ khóa • ${doneCount}/4 góc mở`
      : `Hàng ngang ${(p.currentRow ?? 0) + 1} • ${cornersDone ? 4 : doneCount}/4 góc xong`;
  } else if (g.round === "ve_dich") {
    progress = `Gói ${g.veDich?.packagePoints}${g.veDich?.star ? " • Sao ×2" : ""} • ${cur?.name || ""}`;
  }

  const saiText = cnvRowPhase
    ? p.awaitingSteal ? "−20 & KHÓA mảnh" : "mở chuông cướp quyền"
    : g.round === "ve_dich" && g.veDich?.star
      ? `−${(g.veDich?.packagePoints || 20) * 2}`
      : "không trừ";

  return (
    <div className="control">
      <aside className="side">
        <div className="kicker">MC / Ban tổ chức</div>
        <h3 style={{ margin: "8px 0 14px" }}>{state.settings?.title}</h3>
        <div className="block-title">VÒNG THI</div>
        <div className="form-grid">
          <button className={`btn ghost ${g.round === "khoi_dong" ? "on-round" : ""}`} onClick={() => act("round.start", { round: "khoi_dong" })}>Khởi động</button>
          <button className={`btn ghost ${g.round === "vuot_cnv" ? "on-round" : ""}`} onClick={() => act("round.start", { round: "vuot_cnv" })}>Vượt CNV</button>
          <button className={`btn ghost ${g.round === "tang_toc" ? "on-round" : ""}`} onClick={() => act("round.start", { round: "tang_toc" })}>Tăng tốc</button>
          <button className={`btn ghost ${g.round === "ve_dich" ? "on-round" : ""}`} onClick={() => act("round.start", { round: "ve_dich" })}>Về đích</button>
          <button className="btn" onClick={() => act("scores.show")}>Hiện bảng điểm</button>
          <button className="btn ok" onClick={() => act("contest.finish")}>Kết quả cuối</button>
        </div>
        <hr style={{ margin: "16px 0", borderColor: "var(--line)" }} />
        <div className="block-title">ĐỘI ĐANG THI</div>
        <div className="row">
          {state.teams.map((t) => (
            <button
              key={t.id}
              className={`btn ghost ${g.currentTeam === t.id ? "team-active" : ""}`}
              style={{ borderColor: t.color, color: g.currentTeam === t.id ? t.color : undefined }}
              onClick={() => act("team.set", { teamId: t.id })}
            >
              {t.name}
            </button>
          ))}
        </div>
        {g.round === "ve_dich" && (
          <>
            <div className="block-title" style={{ marginTop: 16 }}>GÓI VỀ ĐÍCH</div>
            <div className="row">
              {[10, 20, 30].map((pt) => (
                <button key={pt} className="btn ghost" onClick={() => act("vedich.package", { points: pt, star: g.veDich?.star })}>
                  {pt}
                </button>
              ))}
              <button className="btn" onClick={() => act("vedich.package", { points: g.veDich?.packagePoints || 20, star: !g.veDich?.star })}>
                Ngôi sao {g.veDich?.star ? "ON" : "OFF"}
              </button>
            </div>
          </>
        )}
        <p style={{ marginTop: 18 }}><Link to="/admin">Mở trang quản trị</Link></p>
      </aside>

      <main className="main-col">
        {/* 1 · TRẠNG THÁI */}
        <div className="status-bar">
          <span className="round-badge">{g.round || "setup"}</span>
          <span className={`state-badge ${status.cls}`}>{status.text}</span>
          {progress && <span className="muted">{progress}</span>}
          {answering && (
            <span className="state-badge ans" style={{ "--c": answering.color }}>
              Trả lời: {winner ? `${winner.name} (chuông)` : cur?.name}
            </span>
          )}
          <span className={`timer-xl ${g.timer?.remaining <= 5 && g.timer?.running ? "danger" : ""}`}>
            {formatTime(g.timer?.remaining || 0)}
          </span>
        </div>

        {/* 2 · CÂU HỎI & ĐÁP ÁN */}
        <div className="panel" style={{ marginTop: 14 }}>
          <div className="block-title">CÂU HỎI &amp; ĐÁP ÁN</div>
          {!q && <div className="muted">Chưa chọn câu hỏi — chọn hàng ngang (Vượt CNV) hoặc bấm Câu sau.</div>}
          {q && (
            <>
              <div className="ctrl-q">{q.question}</div>
              <div className={`answer-box ${revealed ? "" : "answer-hidden"}`}>
                Đáp án: {revealed ? q.answer : "••••••"} • {pts} điểm
                {!!q.letterCount && <span className="muted"> • {q.letterCount} chữ cái</span>}
              </div>
            </>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" disabled={showing && !revealed} onClick={() => act("question.show")}>
              Hiện câu hỏi
            </button>
            <button className="btn ghost" disabled={!showing && !revealed} onClick={() => act("question.hide")}>
              Ẩn câu hỏi
            </button>
            <button className="btn ok" disabled={!showing || revealed} onClick={() => act("question.reveal")}>
              Lật đáp án
            </button>
            <button className="btn ghost" disabled={!revealed} onClick={() => act("question.hideAnswer")}>
              Che đáp án
            </button>
            {g.round !== "vuot_cnv" && (
              <>
                <button className="btn ghost" onClick={() => act("question.prev")}>← Câu trước</button>
                <button className="btn ghost" onClick={() => act("question.next")}>Câu sau →</button>
              </>
            )}
          </div>
          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Trình tự: Chọn câu → Hiện câu hỏi → Lật đáp án → Chấm điểm. “Ẩn câu hỏi” đưa màn hình về bảng.
          </div>
        </div>

        {/* 3 · CHẤM ĐIỂM */}
        <div className="panel" style={{ marginTop: 14 }}>
          <div className="block-title">CHẤM ĐIỂM</div>
          <div className="row">
            <button className="btn ok mark-btn" disabled={!q} onClick={() => act("answer.mark", { correct: true })}>
              ĐÚNG +{pts}{cnvRowPhase ? " • mở mảnh" : ""}
            </button>
            <button className="btn danger mark-btn" disabled={!q} onClick={() => act("answer.mark", { correct: false })}>
              SAI {saiText !== "không trừ" ? `• ${saiText}` : ""}
            </button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="muted" style={{ fontSize: 12 }}>Cộng nhanh cho đội:</span>
            {state.teams.map((t) => (
              <button key={t.id} className="btn ghost" onClick={() => act("answer.mark", { correct: true, teamId: t.id })}>
                {t.name} +{pts}
              </button>
            ))}
          </div>
        </div>

        {/* 4 · THEO VÒNG */}
        {g.round === "vuot_cnv" && (
          <div className="panel" style={{ marginTop: 14 }}>
            <div className="block-title">BÀNG VƯỢT CNV — CHỌN HÀNG NGANG</div>
            <div className="cnv-grid">
              {[0, 1, 2, 3].map((r) => (
                <button
                  key={r}
                  className={`cnv-cell ${solved[r] ? "on" : ""} ${locked[r] ? "locked" : ""} ${p.currentRow === r && !solved[r] && !locked[r] ? "sel" : ""}`}
                  onClick={() => act("puzzle.select", { row: r })}
                  disabled={solved[r] || locked[r]}
                >
                  Hàng {r + 1}{solved[r] ? " ✓" : locked[r] ? " ✕" : ""}
                </button>
              ))}
              <button
                className={`cnv-cell center ${p.centerRevealed ? "on" : ""}`}
                onClick={() => act("puzzle.center")}
                disabled={!cornersDone}
                title={cornersDone ? "Mở ô trung tâm" : "Chỉ mở khi 4 góc đã xử lý hết"}
              >
                Trung tâm
              </button>
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              {p.keywordSolved
                ? "Đã đoán trúng từ khóa — kết thúc vòng."
                : p.awaitingSteal
                  ? "Đội chọn trả lời SAI — chuông đang mở cho đội khác giành quyền (đúng +10 • sai −20 và khóa mảnh)."
                  : cnvKeywordPhase
                    ? "Đủ 4 góc — có thể mở trung tâm hoặc nhận đoán từ khóa của các đội."
                    : "Đội đang thi chọn một hàng ngang rồi bấm Hiện câu hỏi."}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn ghost" onClick={() => act("puzzle.show")}>Hiện bảng</button>
              <button className="btn ghost" onClick={() => act("puzzle.all")}>Mở hết (hạ màn)</button>
            </div>
            <div className="block-title" style={{ marginTop: 12 }}>ĐOÁN TỪ KHÓA</div>
            <div className="row">
              {state.teams.map((t) => (
                <button key={t.id} className="btn ok" onClick={() => act("keyword.solve", { teamId: t.id, correct: true })}>
                  Đúng: {t.name} (+{current?.keywordPoints ?? "?"})
                </button>
              ))}
              <button className="btn danger" onClick={() => act("keyword.solve", { teamId: g.buzzer?.winner, correct: false })}>
                Sai (khóa đội bấm chuông)
              </button>
            </div>
          </div>
        )}
        {g.round === "khoi_dong" && (
          <div className="panel" style={{ marginTop: 14 }}>
            <div className="block-title">BÀI LÀM THÍ SINH — KHỞI ĐỘNG</div>
            <div className="kd-grid">
              {(state.teams || []).map((t) => {
                const sub = g.khoiDong?.submissions?.[t.id];
                return (
                  <div
                    key={t.id}
                    className={`kd-team-card ${t.id === g.currentTeam ? "active" : ""}`}
                    style={{ "--c": t.color }}
                  >
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <b style={{ color: t.color }}>{t.name}</b>
                      {sub ? <span className="badge ok">Đã gửi</span> : <span className="muted">Chưa gửi</span>}
                    </div>
                    <div className="kd-answer">{sub?.answer || "—"}</div>
                    <div className="row" style={{ marginTop: 8 }}>
                      <button className="btn ok" onClick={() => act("answer.mark", { correct: true, teamId: t.id })}>Đúng +10</button>
                      <button className="btn danger" onClick={() => act("answer.mark", { correct: false, teamId: t.id })}>Sai</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {g.round === "tang_toc" && (
          <div className="panel" style={{ marginTop: 14 }}>
            <div className="block-title">TĂNG TỐC</div>
            <div className="muted" style={{ marginBottom: 8 }}>
              Bài nộp: {Object.keys(g.tangToc?.submissions || {}).length}/4 đội
              {(g.tangToc?.ranked || []).length > 0 &&
                ` — Xếp hạng: ${g.tangToc.ranked.map((r) => `${state.teams.find((t) => t.id === r.teamId)?.name || r.teamId} +${r.points}`).join(", ")}`}
            </div>
            <button className="btn" onClick={() => act("tangtoc.settle")}>Chốt điểm tăng tốc</button>
          </div>
        )}

        {/* 5 · THIẾT BỊ */}
        <div className="panel" style={{ marginTop: 14 }}>
          <div className="block-title">HẸN GIỜ &amp; CHUÔNG</div>
          <div className="row">
            <input type="number" value={seconds} onChange={(e) => setSeconds(e.target.value)} style={{ width: 80 }} />
            <button className="btn" onClick={() => act("timer.set", { seconds: Number(seconds), running: true })}>Bắt đầu giờ</button>
            <button className="btn ghost" disabled={!g.timer?.running} onClick={() => act("timer.pause")}>Dừng</button>
            <button className="btn ghost" disabled={!!g.timer?.running || !(g.timer?.remaining > 0)} onClick={() => act("timer.resume")}>Tiếp</button>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" disabled={!!g.buzzer?.open}>Mở chuông</button>
            <button className="btn ghost" onClick={() => act("buzzer.reset", { open: true })}>Reset chuông (mở)</button>
            <button className="btn ghost" disabled={!g.buzzer?.open} onClick={() => act("buzzer.close")}>Khóa chuông</button>
            {!!g.buzzer?.winner && (
              <span className="badge ok">Giữ chuông: {winner?.name || g.buzzer.winner}</span>
            )}
          </div>
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Chuông: {g.buzzer?.open ? "MỞ" : "KHÓA"}
            {(g.buzzer?.order || []).length > 0 &&
              ` • Thứ tự bấm: ${g.buzzer.order.map((id) => state.teams.find((t) => t.id === id)?.name || id).join(" → ")}`}
          </div>
        </div>

        {/* 6 · MEDIA */}
        {(state.media || []).length > 0 && (
          <div className="panel" style={{ marginTop: 14 }}>
            <div className="block-title">MEDIA GỢI Ý</div>
            <div className="row">
              {state.media.map((m) => (
                <button key={m.id} className="btn ghost" onClick={() => act("media.show", { url: m.url, type: m.type })}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <aside className="side right">
        <b>Bảng điểm</b>
        {(state.teams || []).map((t) => (
          <div key={t.id} className="panel" style={{ marginTop: 10, borderColor: t.color }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b>{t.name}</b>
              <span className="display" style={{ fontSize: 24, color: t.color }}>{t.score}</span>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} style={{ width: 70 }} />
              <button className="btn ok" onClick={() => act("score.add", { teamId: t.id, points: Number(delta) })}>+</button>
              <button className="btn danger" onClick={() => act("score.add", { teamId: t.id, points: -Number(delta) })}>−</button>
            </div>
            {g.buzzer?.winner === t.id && <div className="badge ok">Đang giữ chuông</div>}
          </div>
        ))}
      </aside>
    </div>
  );
}
