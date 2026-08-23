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
  resetContest,
} from "../lib/api/admin.js";
import { getPin } from "../lib/session.js";
import { formatTime } from "../lib/format.js";

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

function QuestionsTab({ state, reload, setMsg }) {
  const [edit, setEdit] = useState(null);
  const [mainText, setMainText] = useState(JSON.stringify(state.questions.main, null, 2));

  async function saveSk(e) {
    e.preventDefault();
    await saveSoKhaoQuestion(edit);
    setEdit(null);
    setMsg("Đã lưu câu hỏi sơ khảo");
    reload();
  }

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

      <div className="panel mt-5">
        <h3 className="font-bold">Câu hỏi vòng chính (JSON)</h3>
        <p className="text-mist text-sm">Khởi động, Vượt CNV, Tăng tốc, Về đích — chỉnh trực tiếp rồi lưu.</p>
        <textarea rows={18} value={mainText} onChange={(e) => setMainText(e.target.value)} className="w-full mt-3 font-mono text-sm" />
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
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={async () => { await saveSettings(s); setMsg("Đã lưu cài đặt"); reload(); }}>Lưu</button>
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
