import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAdminState,
  getLeaderboard,
  openPrelim,
  selectTop,
  createDemo,
  saveTeams,
  assignTeams,
  saveSoKhaoQuestion,
  deleteSoKhaoQuestion,
  saveMainQuestions,
  uploadFile,
  saveSettings,
  setKhoiDongAnswerSeconds,
  setKhoiDongTimerSeconds,
  resetContest,
} from "../lib/api/admin.js";
import { getPin } from "../lib/session.js";
import { formatTime } from "../lib/format.js";
import { sendControl } from "../lib/api/control.js";
import { on } from "../lib/socket.js";

export default function Admin() {
  const nav = useNavigate();
  const [tab, setTab] = useState("ket-qua");
  const [state, setState] = useState(null);
  const [board, setBoard] = useState([]);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const s = await getAdminState();
      setState(s);
      setBoard(await getLeaderboard());
    } catch {
      nav("/dang-nhap?next=/admin");
    }
  }

  useEffect(() => {
    if (!getPin()) {
      nav("/dang-nhap?next=/admin");
      return;
    }
    load();
  }, [nav]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!getPin()) return;
    return on("game:state", () => {
      load();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) return <div className="min-h-screen grid place-items-center text-mist">Đang tải quản trị…</div>;

  return (
    <div className="mx-auto w-[min(1200px,calc(100%-24px))] py-7 pb-16">
      <div className="flex justify-between items-end gap-3 mb-6 flex-wrap">
        <div>
          <Link to="/" className="text-mist hover:text-gold">← Trang chủ</Link>
          <h2 className="font-display text-2xl font-bold mt-1.5">Quản trị cuộc thi</h2>
        </div>
        <Link className="btn" to="/mc">Bàn MC</Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {[
          ["ket-qua", "Kết quả sơ khảo"],
          ["doi", "4 đội"],
          ["bang-diem", "Bảng điểm"],
          ["cau-hoi", "Câu hỏi"],
          ["media", "Hình ảnh / Video"],
          ["cai-dat", "Cài đặt"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab === id ? "bg-gold text-[#1a1400] border-gold" : "border-line text-mist hover:border-gold/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && <p className="badge badge-ok inline-block mb-4">{msg}</p>}
      {tab === "ket-qua" && <ResultsTab board={board} reload={load} setMsg={setMsg} />}
      {tab === "doi" && <TeamsTab state={state} board={board} reload={load} setMsg={setMsg} />}
      {tab === "bang-diem" && <ScoreTab state={state} reload={load} setMsg={setMsg} />}
      {tab === "cau-hoi" && <QuestionsTab state={state} reload={load} setMsg={setMsg} />}
      {tab === "media" && <MediaTab state={state} reload={load} setMsg={setMsg} />}
      {tab === "cai-dat" && <SettingsTab state={state} reload={load} setMsg={setMsg} />}
    </div>
  );
}

function ResultsTab({ board, reload, setMsg }) {
  return (
    <div className="panel">
      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" className="btn" onClick={async () => { await openPrelim(true); setMsg("Đã mở sơ khảo"); reload(); }}>
          Mở sơ khảo
        </button>
        <button type="button" className="btn btn-ghost" onClick={async () => { await openPrelim(false); setMsg("Đã đóng sơ khảo"); reload(); }}>
          Đóng sơ khảo
        </button>
        <button type="button" className="btn" onClick={async () => { await selectTop("snake"); setMsg("Đã chọn top 16 và chia 4 đội (kiểu rắn)"); reload(); }}>
          Chọn top 16 + chia đội
        </button>
        <button type="button" className="btn btn-ghost" onClick={async () => { await createDemo(); setMsg("Đã tạo dữ liệu demo"); reload(); }}>
          Tạo thí sinh demo
        </button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>#</th><th>Họ tên</th><th>Mã</th><th>Lớp</th><th>Điểm</th><th>Thời gian</th><th>Top 16</th><th>Đội</th>
          </tr>
        </thead>
        <tbody>
          {board.map((c) => (
            <tr key={c.id}>
              <td>{c.rank}</td>
              <td>{c.name}</td>
              <td>{c.studentId}</td>
              <td>{c.className}</td>
              <td>{c.score}</td>
              <td>{formatTime(c.timeSpent)}</td>
              <td>{c.qualified ? <span className="badge badge-ok">Có</span> : <span className="badge badge-no">Không</span>}</td>
              <td>{c.teamId ? c.teamId.toUpperCase() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {board.length === 0 && <p className="text-mist">Chưa có bài nộp. Mở sơ khảo hoặc tạo dữ liệu demo.</p>}
    </div>
  );
}

function TeamsTab({ state, board, reload, setMsg }) {
  const [names, setNames] = useState(() => Object.fromEntries(state.teams.map((t) => [t.id, t.name])));
  const [passes, setPasses] = useState(() => Object.fromEntries(state.teams.map((t) => [t.id, t.pass || ""])));
  const top = board.filter((c) => c.qualified || c.rank <= 16).slice(0, 16);

  async function saveAll() {
    await saveTeams(state.teams.map((t) => ({ id: t.id, name: names[t.id], pass: passes[t.id] })));
    setMsg("Đã lưu tên và mật khẩu đội");
    reload();
  }

  async function assign(contestantId, teamId) {
    const current = Object.fromEntries(
      board.filter((c) => c.teamId).map((c) => [c.id, c.teamId])
    );
    current[contestantId] = teamId;
    const assignments = Object.entries(current).map(([id, tid]) => ({ contestantId: id, teamId: tid }));
    await assignTeams(assignments);
    reload();
  }

  return (
    <div className="panel">
      <div className="grid gap-4 sm:grid-cols-2 mb-5">
        {state.teams.map((t) => (
          <div key={t.id} className="rounded-xl border p-4 bg-panel-solid" style={{ borderColor: t.color }}>
            <b style={{ color: t.color }}>{t.name}</b>
            <label className="label-grid mt-3">
              Tên đội
              <input value={names[t.id] || ""} onChange={(e) => setNames({ ...names, [t.id]: e.target.value })} />
            </label>
            <label className="label-grid mt-2">
              Mật khẩu vào giao diện thí sinh
              <input autoComplete="off" value={passes[t.id] || ""} onChange={(e) => setPasses({ ...passes, [t.id]: e.target.value })} />
            </label>
            <div className="text-mist text-xs mt-2">{(t.members || []).length} thành viên</div>
          </div>
        ))}
      </div>
      <button type="button" className="btn" onClick={saveAll}>Lưu tên &amp; mật khẩu đội</button>

      <h3 className="font-bold mt-7 mb-2">Gán thí sinh vào đội</h3>
      <table className="table">
        <thead>
          <tr><th>#</th><th>Họ tên</th><th>Điểm</th><th>Đội</th></tr>
        </thead>
        <tbody>
          {top.map((c) => (
            <tr key={c.id}>
              <td>{c.rank}</td>
              <td>{c.name}</td>
              <td>{c.score}</td>
              <td>
                <select value={c.teamId || ""} onChange={(e) => assign(c.id, e.target.value)}>
                  <option value="">—</option>
                  {state.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamScoreControls({ team, reload, setMsg, compact }) {
  const [addAmount, setAddAmount] = useState(10);
  const [setAmount, setSetAmount] = useState(team.score);

  useEffect(() => {
    setSetAmount(team.score);
  }, [team.score]);

  async function add(points) {
    try {
      await sendControl("score.add", { teamId: team.id, points });
    } catch (e) {
      alert(e.message);
      return;
    }
    setSetAmount(team.score + points);
    setMsg(`Đã ${points >= 0 ? "cộng" : "trừ"} ${Math.abs(points)} điểm cho ${team.name}`);
    reload();
  }

  async function setScore(score) {
    try {
      await sendControl("score.set", { teamId: team.id, score });
    } catch (e) {
      alert(e.message);
      return;
    }
    setMsg(`Đã đặt điểm ${team.name} thành ${score}`);
    reload();
  }

  return (
    <div className="rounded-xl border p-4 bg-panel-solid" style={{ borderColor: team.color }}>
      <div className="flex justify-between items-center gap-3">
        <b style={{ color: team.color }}>{team.name}</b>
        <span className="font-display text-2xl font-bold">{team.score}</span>
      </div>

      <div className="text-mist text-xs mt-3 mb-1">Cộng nhanh</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ok py-1.5! text-sm!" onClick={() => add(5)}>+5</button>
        <button type="button" className="btn btn-ok py-1.5! text-sm!" onClick={() => add(10)}>+10</button>
        <button type="button" className="btn btn-ok py-1.5! text-sm!" onClick={() => add(20)}>+20</button>
        <button type="button" className="btn btn-ok py-1.5! text-sm!" onClick={() => add(30)}>+30</button>
        <button type="button" className="btn btn-danger py-1.5! text-sm!" onClick={() => add(-5)}>−5</button>
        <button type="button" className="btn btn-danger py-1.5! text-sm!" onClick={() => add(-10)}>−10</button>
        <button type="button" className="btn btn-danger py-1.5! text-sm!" onClick={() => add(-20)}>−20</button>
      </div>

      <div className="text-mist text-xs mt-3 mb-1">Cộng / trừ tùy chỉnh</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="w-24!"
          value={addAmount}
          onChange={(e) => setAddAmount(Number(e.target.value))}
        />
        <button type="button" className="btn btn-ok py-1.5! text-sm!" onClick={() => add(addAmount || 0)}>+ Cộng</button>
        <button type="button" className="btn btn-danger py-1.5! text-sm!" onClick={() => add(-(addAmount || 0))}>− Trừ</button>
      </div>

      <div className="text-mist text-xs mt-3 mb-1">Đặt điểm trực tiếp</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="w-24!"
          value={setAmount}
          onChange={(e) => setSetAmount(Number(e.target.value))}
        />
        <button type="button" className="btn py-1.5! text-sm!" onClick={() => setScore(setAmount || 0)}>Đặt</button>
      </div>
    </div>
  );
}

function ScoreTab({ state, reload, setMsg }) {
  const [freeAmounts, setFreeAmounts] = useState(() => Object.fromEntries(state.teams.map((t) => [t.id, 10])));

  async function add(teamId, points) {
    try {
      await sendControl("score.add", { teamId, points });
    } catch (e) {
      alert(e.message);
      return;
    }
    const team = state.teams.find((t) => t.id === teamId);
    setMsg(`Đã ${points >= 0 ? "cộng" : "trừ"} ${Math.abs(points)} điểm cho ${team?.name}`);
    reload();
  }

  return (
    <div className="panel">
      <h3 className="font-bold">Bảng điểm — cộng điểm</h3>
      <p className="text-mist text-sm mt-1">Nhập số điểm bất kỳ rồi bấm Cộng / Trừ, hoặc dùng nút nhanh bên dưới.</p>
      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        {state.teams.map((t) => {
          const amt = Number(freeAmounts[t.id]) || 0;
          return (
            <div key={t.id} className="rounded-xl border p-4 bg-panel-solid" style={{ borderColor: t.color }}>
              <div className="flex justify-between items-center mb-3">
                <b style={{ color: t.color }}>{t.name}</b>
                <span className="font-display text-3xl font-bold">{t.score}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-mist text-sm">Cộng điểm tự do:</span>
                <input
                  type="number"
                  className="w-28!"
                  value={freeAmounts[t.id]}
                  onChange={(e) => setFreeAmounts({ ...freeAmounts, [t.id]: e.target.value })}
                />
                <button type="button" className="btn btn-ok" onClick={() => add(t.id, amt)}>+ Cộng</button>
                <button type="button" className="btn btn-danger" onClick={() => add(t.id, -amt)}>− Trừ</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button type="button" className="btn btn-ok py-1.5! text-sm!" onClick={() => add(t.id, 10)}>+10</button>
                <button type="button" className="btn btn-ok py-1.5! text-sm!" onClick={() => add(t.id, 20)}>+20</button>
                <button type="button" className="btn btn-danger py-1.5! text-sm!" onClick={() => add(t.id, -10)}>−10</button>
                <button type="button" className="btn btn-danger py-1.5! text-sm!" onClick={() => add(t.id, -20)}>−20</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionsTab({ state, reload, setMsg }) {
  const [edit, setEdit] = useState(null);
  const [mainTab, setMainTab] = useState("khoi_dong");
  const [mainText, setMainText] = useState(JSON.stringify(state.questions.main, null, 2));
  const [kdEdit, setKdEdit] = useState(null);

  async function saveSk(e) {
    e.preventDefault();
    await saveSoKhaoQuestion(edit);
    setEdit(null);
    setMsg("Đã lưu câu hỏi sơ khảo");
    reload();
  }

  async function addKdWithImage(teamId, file) {
    const result = await uploadFile(file);
    const m = { ...state.questions.main };
    const qs = [...(m.khoiDong?.[teamId] || [])];
    qs.push({ id: `kd-${teamId}-${Date.now()}`, answer: "", points: 10, mediaUrl: result.url, mediaType: result.type });
    m.khoiDong = { ...m.khoiDong, [teamId]: qs };
    await saveMainQuestions(m);
    setMsg("Đã thêm ảnh");
    reload();
  }

  async function saveKdEdit() {
    if (!kdEdit) return;
    const m = { ...state.questions.main };
    const qs = [...(m.khoiDong?.[kdEdit.teamId] || [])];
    qs[kdEdit.index] = { ...qs[kdEdit.index], answer: kdEdit.answer, mediaUrl: kdEdit.mediaUrl, mediaType: kdEdit.mediaType };
    m.khoiDong = { ...m.khoiDong, [kdEdit.teamId]: qs };
    await saveMainQuestions(m);
    setKdEdit(null);
    setMsg("Đã lưu");
    reload();
  }

  async function deleteKdQuestion(teamId, index) {
    const m = { ...state.questions.main };
    const qs = [...(m.khoiDong?.[teamId] || [])];
    qs.splice(index, 1);
    m.khoiDong = { ...m.khoiDong, [teamId]: qs };
    await saveMainQuestions(m);
    setMsg("Đã xóa");
    reload();
  }

  const main = state.questions.main || {};
  const teamIds = ["a", "b", "c", "d"];

  return (
    <div>
      <div className="panel">
        <h3 className="font-bold">Sơ khảo ({state.questions.soKhao.length} câu)</h3>
        <button
          type="button"
          className="btn my-3"
          onClick={() => setEdit({ id: "", question: "", options: ["A. ", "B. ", "C. ", "D. "], answer: "A", topic: "" })}
        >
          Thêm câu
        </button>
        {edit && (
          <form className="grid gap-3.5" onSubmit={saveSk}>
            <label className="label-grid">
              Câu hỏi
              <textarea value={edit.question} onChange={(e) => setEdit({ ...edit, question: e.target.value })} rows={3} />
            </label>
            {["A", "B", "C", "D"].map((L, i) => (
              <label key={L} className="label-grid">
                Phương án {L}
                <input value={edit.options[i]} onChange={(e) => {
                  const options = [...edit.options];
                  options[i] = e.target.value;
                  setEdit({ ...edit, options });
                }} />
              </label>
            ))}
            <label className="label-grid">
              Đáp án đúng
              <select value={edit.answer} onChange={(e) => setEdit({ ...edit, answer: e.target.value })}>
                {["A", "B", "C", "D"].map((L) => <option key={L}>{L}</option>)}
              </select>
            </label>
            <label className="label-grid">
              Chủ đề
              <input value={edit.topic} onChange={(e) => setEdit({ ...edit, topic: e.target.value })} />
            </label>
            <div className="flex gap-2">
              <button className="btn" type="submit">Lưu</button>
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Hủy</button>
            </div>
          </form>
        )}
        <table className="table mt-4">
          <thead><tr><th>#</th><th>Câu hỏi</th><th>Đáp án</th><th></th></tr></thead>
          <tbody>
            {state.questions.soKhao.map((q, i) => (
              <tr key={q.id}>
                <td>{i + 1}</td>
                <td>{q.question}</td>
                <td>{q.answer}</td>
                <td>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-ghost" onClick={() => setEdit(q)}>Sửa</button>
                    <button type="button" className="btn btn-danger" onClick={async () => { await deleteSoKhaoQuestion(q.id); reload(); }}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Câu hỏi vòng chính — quản lý theo vòng */}
      <div className="panel mt-5">
        <h3 className="font-bold mb-3">Câu hỏi vòng chính</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            ["khoi_dong", "Khởi động"],
            ["vuot_cnv", "Vượt CNV"],
            ["tang_toc", "Tăng tốc"],
            ["ve_dich", "Về đích"],
            ["json", "Chỉnh JSON"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMainTab(id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                mainTab === id ? "bg-gold text-[#1a1400] border-gold" : "border-line text-mist hover:border-gold/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mainTab === "khoi_dong" && (
          <div>
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 mb-4">
              <h4 className="font-bold mb-3">Cộng điểm linh hoạt — vòng Khởi động</h4>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {state.teams.map((t) => (
                  <TeamScoreControls key={t.id} team={t} reload={reload} setMsg={setMsg} />
                ))}
              </div>
            </div>
            {kdEdit && (
              <div className="rounded-xl border border-gold bg-night/60 p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-sm">
                    Sửa — {state.teams.find((t) => t.id === kdEdit.teamId)?.name} #{kdEdit.index + 1}
                  </h4>
                  <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => setKdEdit(null)}>Đóng</button>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="shrink-0">
                    {kdEdit.mediaUrl ? (
                      <img src={kdEdit.mediaUrl} className="w-[140px] h-[100px] object-cover rounded-lg" />
                    ) : (
                      <div className="w-[140px] h-[100px] rounded-lg border border-dashed border-line grid place-items-center text-mist text-xs">Chưa có ảnh</div>
                    )}
                    <label className="btn btn-ghost mt-2 cursor-pointer inline-block text-xs w-full text-center">
                      {kdEdit.mediaUrl ? "Đổi ảnh" : "Chọn ảnh"}
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const r = await uploadFile(f);
                        setKdEdit({ ...kdEdit, mediaUrl: r.url, mediaType: r.type });
                      }} />
                    </label>
                  </div>
                  <div className="grid gap-3 flex-1">
                    <label className="label-grid">
                      Đáp án
                      <input value={kdEdit.answer || ""} onChange={(e) => setKdEdit({ ...kdEdit, answer: e.target.value })} placeholder="Đáp án đúng" autoFocus />
                    </label>
                    <div className="flex gap-2">
                      <button type="button" className="btn" onClick={saveKdEdit}>Lưu</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setKdEdit(null)}>Hủy</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              {teamIds.map((tid) => (
                <label key={tid} className="btn btn-ghost text-xs cursor-pointer">
                  + Ảnh {state.teams.find((t) => t.id === tid)?.name}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addKdWithImage(tid, f); }} />
                </label>
              ))}
            </div>

            <table className="table">
              <thead>
                <tr><th>#</th><th>Ảnh</th><th>Đội</th><th>Đáp án</th><th></th></tr>
              </thead>
              <tbody>
                {teamIds.flatMap((tid) =>
                  (main.khoiDong?.[tid] || []).map((qd, i) => ({ qd, i, tid }))
                ).map(({ qd, i, tid }, idx) => {
                  const team = state.teams.find((t) => t.id === tid);
                  return (
                    <tr key={qd.id}>
                      <td className="text-mist">{idx + 1}</td>
                      <td>
                        {qd.mediaUrl ? (
                          <img src={qd.mediaUrl} className="h-10 rounded object-cover cursor-pointer" onClick={() => setKdEdit({ teamId: tid, index: i, mediaUrl: qd.mediaUrl || "", mediaType: qd.mediaType || "", answer: qd.answer || "" })} />
                        ) : (
                          <span className="text-mist">—</span>
                        )}
                      </td>
                      <td style={{ color: team?.color }} className="font-semibold text-sm">{team?.name} #{i + 1}</td>
                      <td className="text-ok font-semibold">{qd.answer || <span className="text-mist">—</span>}</td>
                      <td>
                        <div className="flex gap-2">
                          <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => setKdEdit({ teamId: tid, index: i, mediaUrl: qd.mediaUrl || "", mediaType: qd.mediaType || "", answer: qd.answer || "" })}>Sửa</button>
                          <button type="button" className="btn btn-danger text-xs py-1!" onClick={() => deleteKdQuestion(tid, i)}>Xóa</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {teamIds.flatMap((tid) => main.khoiDong?.[tid] || []).length === 0 && (
              <p className="text-mist text-sm mt-2">Chưa có ảnh. Nhấn nút "+ Ảnh" phía trên để thêm.</p>
            )}
          </div>
        )}

        {/* Vượt CNV: 4 hàng ngang */}
        {mainTab === "vuot_cnv" && (
          <div>
            <div className="rounded-xl border border-line bg-night/40 p-3 mb-3">
              <div className="font-bold text-sm mb-1">Từ khóa: <span className="text-gold">{main.vuotCnv?.keyword || "—"}</span></div>
              <div className="text-mist text-sm">Gợi ý: {main.vuotCnv?.hint || "—"} • {main.vuotCnv?.letterCount || "?"} chữ cái</div>
            </div>
            <table className="table">
              <thead><tr><th>#</th><th>Câu hỏi</th><th>Đáp án</th><th>Số chữ cái</th></tr></thead>
              <tbody>
                {(main.vuotCnv?.rows || []).map((row, i) => (
                  <tr key={row.id}>
                    <td className="text-mist">{i + 1}</td>
                    <td>{row.question}</td>
                    <td className="text-ok font-semibold">{row.answer}</td>
                    <td className="text-mist">{row.letterCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(main.vuotCnv?.rows || []).length === 0 && <p className="text-mist text-sm mt-2">Chưa có câu hỏi Vượt CNV.</p>}
          </div>
        )}

        {/* Tăng tốc: 4 câu */}
        {mainTab === "tang_toc" && (
          <table className="table">
            <thead><tr><th>#</th><th>Câu hỏi</th><th>Đáp án</th><th>Thời gian</th></tr></thead>
            <tbody>
              {(main.tangToc || []).map((qd, i) => (
                <tr key={qd.id}>
                  <td className="text-mist">{i + 1}</td>
                  <td>{qd.question}</td>
                  <td className="text-ok font-semibold">{qd.answer}</td>
                  <td className="text-mist">{qd.timeLimit || 20}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Về đích: 4 đội × 3 gói điểm */}
        {mainTab === "ve_dich" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {teamIds.map((tid) => {
              const qs = main.veDich?.[tid] || [];
              return (
                <div key={tid} className="rounded-xl border border-line bg-night/40 p-3">
                  <div className="font-bold text-sm mb-2" style={{ color: state.teams.find((t) => t.id === tid)?.color }}>
                    {state.teams.find((t) => t.id === tid)?.name || tid.toUpperCase()} — {qs.length} gói
                  </div>
                  <table className="table">
                    <thead><tr><th>Điểm</th><th>Câu hỏi</th><th>Đáp án</th></tr></thead>
                    <tbody>
                      {qs.map((qd) => (
                        <tr key={qd.id}>
                          <td className="text-gold font-bold">{qd.points}</td>
                          <td className="truncate max-w-[200px]" title={qd.question}>{qd.question}</td>
                          <td className="text-ok font-semibold">{qd.answer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {qs.length === 0 && <p className="text-mist text-xs">Chưa có câu hỏi.</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* JSON editor (fallback) */}
        {mainTab === "json" && (
          <>
            <p className="text-mist text-sm mb-2">Chỉnh sửa trực tiếp JSON — useful khi cần bulk update.</p>
            <textarea rows={18} value={mainText} onChange={(e) => setMainText(e.target.value)} className="w-full font-mono text-sm" />
            <button
              type="button"
              className="btn mt-3"
              onClick={async () => {
                await saveMainQuestions(JSON.parse(mainText));
                setMsg("Đã lưu câu hỏi vòng chính");
                reload();
              }}
            >
              Lưu vòng chính
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MediaTab({ state, reload, setMsg }) {
  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    setMsg("Đã tải media");
    reload();
  }

  return (
    <div className="panel">
      <p className="text-mist">Tải ảnh/video gợi ý. MC có thể hiện lên màn hình khán giả.</p>
      <input type="file" accept="image/*,video/*" onChange={onFile} className="my-3" />
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {(state.media || []).map((m) => (
          <div key={m.id}>
            {m.type === "video" ? (
              <video src={m.url} className="w-full rounded-lg" />
            ) : (
              <img src={m.url} alt={m.name} className="w-full rounded-lg object-cover" />
            )}
            <div className="text-mist text-xs mt-1 truncate">{m.name}</div>
            <button type="button" className="btn btn-ghost mt-1 text-sm py-1.5!" onClick={() => navigator.clipboard.writeText(m.url)}>
              Copy URL
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({ state, reload, setMsg }) {
  const [s, setS] = useState(state.settings);
  const [kdAnswerSec, setKdAnswerSec] = useState(() => Number(state.game?.khoiDong?.answerSeconds) || 4);
  const [kdTimerSec, setKdTimerSec] = useState(() => Number(state.game?.khoiDong?.timerSeconds) || 60);
  return (
    <div className="panel grid gap-3.5 max-w-[560px]">
      <label className="label-grid">
        Tên cuộc thi
        <input value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} />
      </label>
      <label className="label-grid">
        Phụ đề
        <input value={s.subtitle} onChange={(e) => setS({ ...s, subtitle: e.target.value })} />
      </label>
      <label className="label-grid">
        PIN ban tổ chức
        <input value={s.pin} onChange={(e) => setS({ ...s, pin: e.target.value })} />
      </label>
      <label className="label-grid">
        Thời gian sơ khảo (giây)
        <input type="number" value={s.prelimDuration} onChange={(e) => setS({ ...s, prelimDuration: Number(e.target.value) })} />
      </label>
      <label className="label-grid">
        Số câu sơ khảo
        <input type="number" value={s.prelimQuestionCount} onChange={(e) => setS({ ...s, prelimQuestionCount: Number(e.target.value) })} />
      </label>
      <label className="label-grid">
        Số thí sinh vào vòng trong
        <input type="number" value={s.topN} onChange={(e) => setS({ ...s, topN: Number(e.target.value) })} />
      </label>
      <label className="flex items-center gap-2 text-sm text-mist">
        <input
          type="checkbox"
          checked={!!s.showLiveRanking}
          onChange={(e) => setS({ ...s, showLiveRanking: e.target.checked })}
          className="w-auto!"
        />
        Hiện bảng xếp hạng live
      </label>
      <label className="label-grid">
        Thời gian hiện đáp án khởi động (giây — 0 = sang câu kế ngay)
        <input type="number" value={kdAnswerSec} onChange={(e) => setKdAnswerSec(Number(e.target.value))} />
      </label>
      <label className="label-grid">
        Thời gian mỗi lượt khởi động (giây)
        <input type="number" value={kdTimerSec} onChange={(e) => setKdTimerSec(Number(e.target.value))} />
      </label>
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={async () => { await saveSettings(s); setMsg("Đã lưu cài đặt"); reload(); }}>Lưu</button>
        <button type="button" className="btn btn-ghost" onClick={async () => { await setKhoiDongAnswerSeconds(kdAnswerSec || 0); await setKhoiDongTimerSeconds(kdTimerSec || 60); setMsg("Đã lưu cấu hình khởi động"); reload(); }}>Lưu thời gian khởi động</button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={async () => {
            if (confirm("Xóa toàn bộ thí sinh và điểm?")) {
              await resetContest();
              reload();
            }
          }}
        >
          Reset cuộc thi
        </button>
      </div>
    </div>
  );
}
