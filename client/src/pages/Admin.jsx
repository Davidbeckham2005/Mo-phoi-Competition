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
  const [timer, setTimer] = useState(null);

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

  useEffect(() => {
    if (!getPin()) return;
    return on("game:timer", setTimer);
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
          ["dieu-khien", "Hẹn giờ & chuông"],
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
      {tab === "dieu-khien" && <TimerBuzzerTab state={state} timer={timer} setMsg={setMsg} />}
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

function clone(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}
function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function uid() {
  return "q" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}
function probeVideoDuration(src) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const d = v.duration;
      resolve(d && isFinite(d) && d > 0 ? Math.ceil(d) : undefined);
      v.removeAttribute("src");
      v.load();
    };
    v.onloadedmetadata = finish;
    v.onerror = finish;
    setTimeout(finish, 8000);
    v.src = src;
  });
}
function normalizeMain(v) {
  const m = {
    khoiDong: v.khoiDong || {},
    vuotCnv: v.vuotCnv || { keyword: "", hint: "", letterCount: "", rows: [] },
    tangToc: v.tangToc || [],
    veDich: v.veDich || {},
  };
  for (const tid of ["a", "b", "c", "d"]) {
    m.khoiDong[tid] = (m.khoiDong[tid] || []).filter((q) => q && typeof q === "object").map((q) => ({ id: q.id || uid(), answer: q.answer || "", points: q.points || 10, mediaUrl: q.mediaUrl || "", mediaType: q.mediaType || "", ...q }));
    m.veDich[tid] = (m.veDich[tid] || []).filter((q) => q && typeof q === "object").map((q) => ({ id: q.id || uid(), points: q.points || 20, question: q.question || "", answer: q.answer || "", ...q }));
  }
  m.vuotCnv.rows = (m.vuotCnv.rows || []).filter((r) => r && typeof r === "object").map((r) => ({ id: r.id || uid(), question: r.question || "", answer: r.answer || "", letterCount: r.letterCount ?? "", ...r }));
  m.tangToc = (m.tangToc || []).filter((q) => q && typeof q === "object").map((q) => ({ id: q.id || uid(), answer: q.answer || "", duration: Number(q.duration) || 60, mediaUrl: q.mediaUrl || "", mediaType: "video", ...q }));
  return m;
}

function QuestionsTab({ state, reload, setMsg }) {
  const main = state.questions.main || {};
  const [sub, setSub] = useState("sokhao");
  const [draft, setDraft] = useState({ main: clone(main) });
  const dirty = !eq(draft.main, main);

  useEffect(() => {
    setDraft({ main: clone(state.questions.main || {}) });
  }, [state.questions.main]);

  async function saveDraft() {
    await saveMainQuestions(draft.main);
    setMsg("Đã lưu câu hỏi vòng chính");
    reload();
  }
  function revert() {
    setDraft({ main: clone(main) });
  }

  const items = [
    ["sokhao", "Sơ khảo"],
    ["khoi_dong", "Khởi động"],
    ["vuot_cnv", "Vượt CNV"],
    ["tang_toc", "Tăng tốc"],
    ["ve_dich", "Về đích"],
    ["json", "Chỉnh JSON"],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {items.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSub(id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              sub === id ? "bg-gold text-[#1a1400] border-gold" : "border-line text-mist hover:border-gold/60"
            }`}
          >
            {label}
            {id === "sokhao" && <span className="ml-1 text-xs">{state.questions.soKhao?.length || 0}</span>}
          </button>
        ))}
      </div>

      {sub === "sokhao" ? (
        <div className="panel">
          <PrelimManager qs={state.questions.soKhao || []} reload={reload} setMsg={setMsg} />
        </div>
      ) : (
        <div className="panel">
          <div className="flex flex-wrap items-center gap-3 mb-4 rounded-xl border border-line bg-night/40 px-3 py-2">
            <span className="text-sm font-semibold">Sửa trực tiếp — bấm <b>Lưu vòng chính</b> khi xong</span>
            <div className="ml-auto flex items-center gap-2">
              <span className={`text-xs ${dirty ? "badge badge-warn" : "text-mist"}`}>
                {dirty ? "Có thay đổi chưa lưu" : "Đã lưu hết"}
              </span>
              <button type="button" className="btn btn-ghost py-1! text-xs!" disabled={!dirty} onClick={revert}>Hoàn tác</button>
              <button type="button" className="btn btn-ok py-1! text-xs!" disabled={!dirty} onClick={saveDraft}>Lưu vòng chính</button>
            </div>
          </div>

          {sub === "khoi_dong" && <KhoiDongEditor draft={draft} setDraft={setDraft} teams={state.teams} />}
          {sub === "vuot_cnv" && <VuotCnvEditor draft={draft} setDraft={setDraft} />}
          {sub === "tang_toc" && <TangTocEditor draft={draft} setDraft={setDraft} />}
          {sub === "ve_dich" && <VeDichEditor draft={draft} setDraft={setDraft} teams={state.teams} />}
          {sub === "json" && <JsonEditor draft={draft} setDraft={setDraft} setMsg={setMsg} />}
        </div>
      )}
    </div>
  );
}

function PrelimManager({ qs, reload, setMsg }) {
  const [search, setSearch] = useState("");
  const [bulk, setBulk] = useState("");
  const [draft, setDraft] = useState(() => clone(qs));

  useEffect(() => {
    setDraft(clone(qs));
  }, [qs]);

  function patch(i, fn) {
    setDraft(draft.map((q, k) => (k === i ? fn(q) : q)));
  }
  async function saveItem(q) {
    await saveSoKhaoQuestion({ ...q, options: q.options || ["A.", "B.", "C.", "D."] });
    setMsg("Đã lưu câu hỏi");
    reload();
  }
  async function saveAll() {
    const rows = draft.filter((q) => (q.question || "").trim());
    for (const q of rows) await saveSoKhaoQuestion(q);
    setMsg("Đã lưu " + rows.length + " câu");
    reload();
  }
  async function del(q) {
    if (!confirm("Xóa câu hỏi này?")) return;
    await deleteSoKhaoQuestion(q.id);
    setMsg("Đã xóa câu hỏi");
    reload();
  }
  function addEmpty() {
    setDraft([...draft, { id: "", question: "", options: ["A.", "B.", "C.", "D."], answer: "A", topic: "" }]);
  }
  function importBulk() {
    const parsed = [];
    for (const line of bulk.split("\n")) {
      const parts = line.split("|").map((s) => s.trim());
      if (parts.length < 3) continue;
      const options = [];
      for (let i = 1; i <= 4; i++) options.push((parts[i] || "").replace(/^[A-D]\.\s*/, ""));
      parsed.push({
        id: "",
        question: parts[0],
        options,
        answer: (parts[5] || "A").replace(/\.$/, "").toUpperCase(),
        topic: (parts[6] || "").trim(),
      });
    }
    if (!parsed.length) {
      setMsg("Không thấy câu hợp lệ — mỗi dòng: Câu hỏi | A | B | C | D | Đáp án | Chủ đề");
      return;
    }
    setDraft([...draft, ...parsed]);
    setBulk("");
    setMsg("Đã thêm " + parsed.length + " câu — bấm Lưu tất cả");
  }

  const s = search.trim().toLowerCase();
  const filtered = draft.filter((q) =>
    !s
      ? true
      : (q.question || "").toLowerCase().includes(s) || (q.topic || "").toLowerCase().includes(s) || (q.answer || "").toLowerCase().includes(s)
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="font-bold mr-auto">Câu hỏi sơ khảo</h3>
        <input className="w-56!" placeholder="🔍 Tìm câu hỏi / chủ đề / đáp án…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" className="btn" onClick={addEmpty}>+ Thêm câu</button>
        <button type="button" className="btn btn-ok" disabled={!draft.some((q) => (q.question || "").trim())} onClick={saveAll}>Lưu tất cả</button>
      </div>

      <details className="rounded-xl border border-line bg-night/40 p-3 mb-3">
        <summary className="text-sm font-semibold cursor-pointer text-mist">Nhập nhanh nhiều câu (mỗi dòng: Câu hỏi | A | B | C | D | Đáp án | Chủ đề)</summary>
        <textarea rows={5} value={bulk} onChange={(e) => setBulk(e.target.value)} className="w-full font-mono text-sm mt-2" placeholder={"Ví dụ:\nĐường lên đỉnh núi gồm mấy khúc cong | 3 | 4 | 5 | 6 | B | châm ngôn"} />
        <div className="flex items-center gap-2 mt-2">
          <button type="button" className="btn btn-ghost text-sm!" disabled={!bulk.trim()} onClick={importBulk}>+ Thêm {bulk.split("\n").filter((l) => l.trim()).length} dòng vừa nhập</button>
          <span className="text-mist text-xs">Câu mới chưa có ID sẽ được nạp khi bấm Lưu</span>
        </div>
      </details>

      <table className="table mt-3">
        <thead><tr><th>#</th><th>Câu hỏi</th><th>Phương án</th><th>Đáp án</th><th>Chủ đề</th><th></th></tr></thead>
        <tbody>
          {filtered.map((q, i) => (
            <tr key={q.id || "new-" + i}>
              <td className="text-mist">{draft.indexOf(q) + 1}</td>
              <td><textarea rows={2} className="min-w-[240px]" value={q.question || ""} onChange={(e) => patch(i, (t) => ({ ...t, question: e.target.value }))} /></td>
              <td>
                {["A", "B", "C", "D"].map((l, k) => (
                  <div key={l} className="flex items-center gap-1 text-xs">
                    <b className="w-4">{l}.</b>
                    <input className="w-36!" value={(q.options && q.options[k]) || ""} onChange={(e) => patch(i, (t) => { const o = [...(t.options || ["", "", "", ""])]; o[k] = e.target.value; return { ...t, options: o }; })} />
                  </div>
                ))}
              </td>
              <td>
                <select value={q.answer || "A"} onChange={(e) => patch(i, (t) => ({ ...t, answer: e.target.value }))}>
                  {["A", "B", "C", "D"].map((l) => <option key={l}>{l}</option>)}
                </select>
              </td>
              <td><input className="w-24!" value={q.topic || ""} onChange={(e) => patch(i, (t) => ({ ...t, topic: e.target.value }))} /></td>
              <td>
                <div className="flex flex-col gap-1">
                  <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => saveItem(draft[i])}>Lưu</button>
                  <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => { const c = clone(draft[i]); c.id = ""; setDraft([...draft.slice(0, i + 1), c, ...draft.slice(i + 1)]); }}>Sao chép</button>
                  <button type="button" className="btn btn-danger text-xs py-1!" onClick={() => (q.id ? del(q) : setDraft(draft.filter((_, k) => k !== i)))}>Xóa</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <p className="text-mist text-sm mt-3">Không có câu hỏi nào.</p>}
    </div>
  );
}

function KhoiDongEditor({ draft, setDraft, teams }) {
  const m = draft.main;
  const teamIds = ["a", "b", "c", "d"];

  function setQ(tid, i, p) {
    const qs = (m.khoiDong?.[tid] || []).map((q, k) => (k === i ? { ...q, ...p } : q));
    setDraft({ ...draft, main: { ...m, khoiDong: { ...(m.khoiDong || {}), [tid]: qs } } });
  }
  function addImg(tid, file) {
    uploadFile(file).then((r) => {
      const qs = [...(m.khoiDong?.[tid] || []), { id: uid(), answer: "", points: 10, mediaUrl: r.url, mediaType: r.type }];
      setDraft({ ...draft, main: { ...m, khoiDong: { ...(m.khoiDong || {}), [tid]: qs } } });
    });
  }
  function delQ(tid, i) {
    const qs = (m.khoiDong?.[tid] || []).filter((_, k) => k !== i);
    setDraft({ ...draft, main: { ...m, khoiDong: { ...(m.khoiDong || {}), [tid]: qs } } });
  }
  function dupQ(tid, i) {
    const c = { ...clone(m.khoiDong[tid][i]), id: uid() };
    const qs = [...(m.khoiDong?.[tid] || []), c];
    setDraft({ ...draft, main: { ...m, khoiDong: { ...(m.khoiDong || {}), [tid]: qs } } });
  }

  function setImg(tid, i, file) {
    uploadFile(file).then((r) => setQ(tid, i, { mediaUrl: r.url, mediaType: r.type }));
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {teamIds.map((tid) => {
        const team = teams.find((t) => t.id === tid);
        const qs = m.khoiDong?.[tid] || [];
        return (
          <div key={tid} className="rounded-xl border border-line bg-night/40 p-3">
            <div className="flex items-center gap-2 mb-3">
              <b style={{ color: team?.color }}>{team?.name}{qs.length > 0 && <span className="text-mist font-normal"> — {qs.length} ảnh</span>}</b>
              <label className="btn btn-ghost text-xs py-1! cursor-pointer ml-auto">
                + Thêm ảnh
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addImg(tid, f); }} />
              </label>
            </div>

            {qs.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-line bg-night/60 p-2 mb-3 last:mb-0">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0 w-[130px]">
                    {q.mediaUrl ? (
                      <img src={q.mediaUrl} className="w-[130px] h-[90px] object-cover rounded-lg" />
                    ) : (
                      <div className="w-[130px] h-[90px] rounded-lg border border-dashed border-line grid place-items-center text-mist text-xs text-center p-2">
                        Chưa có ảnh
                      </div>
                    )}
                    <label className="btn btn-ok text-xs py-1! cursor-pointer absolute bottom-1 left-1 opacity-90">
                      📁 Chọn ảnh
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setImg(tid, i, f); }} />
                    </label>
                    {q.mediaUrl && (
                      <button type="button" className="btn btn-danger text-xs py-0.5! px-1.5! absolute top-1 right-1 opacity-90" onClick={() => setQ(tid, i, { mediaUrl: "" })}>✕</button>
                    )}
                  </div>
                  <div className="grid gap-2 flex-1">
                    <div>
                      <div className="text-mist text-xs mb-1">Ảnh #{i + 1} — chọn từ thiết bị hoặc dán URL</div>
                      <input className="w-full!" value={q.mediaUrl || ""} placeholder="Dán URL ảnh…" onChange={(e) => setQ(tid, i, { mediaUrl: e.target.value })} />
                    </div>
                    <div>
                      <div className="text-mist text-xs mb-1">Đáp án đúng</div>
                      <input value={q.answer || ""} placeholder="Đáp án đúng" onChange={(e) => setQ(tid, i, { answer: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => dupQ(tid, i)}>Sao chép câu</button>
                  <button type="button" className="btn btn-danger text-xs py-1! ml-auto" onClick={() => delQ(tid, i)}>Xóa câu</button>
                </div>
              </div>
            ))}

            {qs.length === 0 && <p className="text-mist text-sm">Chưa có ảnh. Bấm "+ Thêm ảnh" để chọn từ thiết bị.</p>}
          </div>
        );
      })}
    </div>
  );
}

function VuotCnvEditor({ draft, setDraft }) {
  const m = draft.main;
  const v = m.vuotCnv || { keyword: "", hint: "", letterCount: "", rows: [] };
  const setV = (p) => setDraft({ ...draft, main: { ...m, vuotCnv: { ...v, ...p } } });
  function setRow(i, p) {
    setV({ rows: (v.rows || []).map((r, k) => (k === i ? { ...r, ...p } : r)) });
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <label className="label-grid">
          Từ khóa chính
          <input value={v.keyword || ""} placeholder="VD: HỮU NGHỊ" onChange={(e) => setV({ keyword: e.target.value })} />
        </label>
        <label className="label-grid">
          Số chữ cái
          <input type="number" min={1} value={v.letterCount || ""} placeholder="VD: 12" onChange={(e) => setV({ letterCount: e.target.value })} />
        </label>
        <label className="label-grid">
          Gợi ý (hint)
          <input value={v.hint || ""} placeholder="Gợi ý ngắn cho khán giả" onChange={(e) => setV({ hint: e.target.value })} />
        </label>
      </div>

      <div>
        {(v.rows || []).map((row, i) => (
          <div key={row.id} className="rounded-xl border border-line bg-night/40 p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <b className="text-gold text-xl">{i + 1}</b>
              <span className="text-mist text-xs">Câu hỏi sẽ phóng to khi chiếu</span>
              <div className="ml-auto flex gap-1">
                <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => setRow(i, { question: "" })}>Xóa nội dung</button>
                <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => setV({ rows: [...(v.rows || []), { id: uid(), question: "", answer: "", letterCount: v.letterCount || "" }] })}>+ Thêm</button>
                <button type="button" className="btn btn-danger text-xs py-1!" onClick={() => setV({ rows: (v.rows || []).filter((_, k) => k !== i) })}>Xóa câu</button>
              </div>
            </div>
            <textarea
              rows={5}
              className="w-full text-2xl! font-bold! leading-snug"
              value={row.question || ""}
              onChange={(e) => setRow(i, { question: e.target.value })}
              placeholder="Nhập câu hỏi ở đây…"
            />
            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              <label className="label-grid">
                Đáp án
                <input className="text-lg!" value={row.answer || ""} onChange={(e) => setRow(i, { answer: e.target.value })} placeholder="Đáp án cho dòng ngang này" />
              </label>
              <label className="label-grid">
                Số chữ cái
                <input type="number" min={1} value={row.letterCount || ""} onChange={(e) => setRow(i, { letterCount: e.target.value })} />
              </label>
            </div>
          </div>
        ))}
        {(v.rows || []).length === 0 && <p className="text-mist text-sm">Chưa có câu hỏi Vượt CNV.</p>}
      </div>
    </div>
  );
}

function TangTocEditor({ draft, setDraft }) {
  const m = draft.main;
  const qs = m.tangToc || [];
  const setQs = (next) => setDraft({ ...draft, main: { ...m, tangToc: next } });
  function setQ(i, p) {
    setQs(qs.map((q, k) => (k === i ? { ...q, ...p } : q)));
  }

  return (
    <div>
      <p className="text-mist text-sm mb-3">Mỗi câu là <b>1 video</b>. Đổi video ngay tại cột; nếu chưa có, khán giả thấy ô chờ. Đáp án & thời lượng để MC tham khảo.</p>
      <div className="block sm:hidden text-mist text-xs mb-2">Lưu ý: xem chi tiết & chỉnh trên màn hình rộng.</div>
      <table className="table">
        <thead><tr><th>#</th><th>Video</th><th>Thời lượng (s)</th><th>Đáp án (MC)</th><th></th></tr></thead>
        <tbody>
          {qs.map((q, i) => (
            <tr key={q.id}>
              <td className="text-mist">{i + 1}</td>
              <td>
                <div className="flex items-center gap-2">
                  {q.mediaUrl ? (
                    <video src={q.mediaUrl} className="w-[150px] h-[90px] object-contain rounded bg-black" controls />
                  ) : (
                    <div className="w-[150px] h-[90px] rounded border border-dashed border-line grid place-items-center text-mist text-xs">Chưa có video</div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="btn btn-ghost text-xs py-1! cursor-pointer">
                      {q.mediaUrl ? "Đổi video" : "Chọn video"}
                      <input type="file" accept="video/*" className="hidden" onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const localUrl = URL.createObjectURL(f);
                        const dur = await probeVideoDuration(localUrl);
                        URL.revokeObjectURL(localUrl);
                        const r = await uploadFile(f);
                        setQ(i, { mediaUrl: r.url, duration: dur ?? q.duration ?? 60 });
                      }} />
                    </label>
                    {q.mediaUrl && <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => setQ(i, { mediaUrl: "" })}>Gỡ video</button>}
                  </div>
                </div>
              </td>
              <td>
                <div className="flex items-center gap-1">
                  <input type="number" min={1} className="w-20!" value={q.duration || 60} onChange={(e) => setQ(i, { duration: Number(e.target.value) || 60 })} />
                  {q.mediaUrl && (
                    <button
                      type="button"
                      className="btn btn-ghost text-xs py-1! px-2!"
                      title="Tự nhận thời lượng từ video"
                      onClick={async () => {
                        const d = await probeVideoDuration(q.mediaUrl);
                        if (d) setQ(i, { duration: d });
                      }}
                    >
                      ⟳
                    </button>
                  )}
                </div>
              </td>
              <td><input value={q.answer || ""} placeholder="Đáp án chuẩn" onChange={(e) => setQ(i, { answer: e.target.value })} /></td>
              <td>
                <div className="flex flex-col gap-1">
                  <button type="button" className="btn btn-ghost text-xs py-1!" onClick={() => setQs([...qs, { id: uid(), answer: "", duration: 60, mediaUrl: "", mediaType: "video" }])}>+ Thêm</button>
                  <button type="button" className="btn btn-danger text-xs py-1!" onClick={() => setQs(qs.filter((_, k) => k !== i))}>Xóa</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {qs.length === 0 && <p className="text-mist text-sm mt-2">Chưa có câu hỏi Tăng tốc.</p>}
    </div>
  );
}

function VeDichEditor({ draft, setDraft, teams }) {
  const m = draft.main;
  const teamIds = ["a", "b", "c", "d"];
  function findIdx(tid, id) {
    return (m.veDich?.[tid] || []).findIndex((q) => q.id === id);
  }
  function setQ(tid, id, p) {
    const qs = (m.veDich?.[tid] || []).map((q, k) => (k === findIdx(tid, id) ? { ...q, ...p } : q));
    setDraft({ ...draft, main: { ...m, veDich: { ...(m.veDich || {}), [tid]: qs } } });
  }
  function delQ(tid, id) {
    const qs = (m.veDich?.[tid] || []).filter((q) => q.id !== id);
    setDraft({ ...draft, main: { ...m, veDich: { ...(m.veDich || {}), [tid]: qs } } });
  }
  function addQ(tid, points) {
    const qs = [...(m.veDich?.[tid] || []), { id: uid(), points, question: "", answer: "" }].sort((x, y) => x.points - y.points);
    setDraft({ ...draft, main: { ...m, veDich: { ...(m.veDich || {}), [tid]: qs } } });
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {teamIds.map((tid) => {
          const qs = (m.veDich?.[tid] || []).slice().sort((x, y) => x.points - y.points);
          return (
            <div key={tid} className="rounded-xl border border-line bg-night/40 p-3">
              <div className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: teams.find((t) => t.id === tid)?.color }}>
                {teams.find((t) => t.id === tid)?.name || tid.toUpperCase()}
                <span className="ml-auto flex gap-1">
                  {[20, 30, 40].map((p) => (
                    <button key={p} type="button" className="btn btn-ghost text-xs py-0.5!" onClick={() => addQ(tid, p)}>+{p}</button>
                  ))}
                </span>
              </div>
              {qs.map((qd) => (
                <div key={qd.id} className="flex items-start gap-2 mb-2">
                  <b className="text-gold pt-1 w-8 shrink-0">{qd.points}</b>
                  <div className="grid gap-1 flex-1">
                    <textarea rows={2} value={qd.question || ""} placeholder={`Câu hỏi ${qd.points} điểm`} onChange={(e) => setQ(tid, qd.id, { question: e.target.value })} />
                    <input value={qd.answer || ""} placeholder="Đáp án" onChange={(e) => setQ(tid, qd.id, { answer: e.target.value })} />
                  </div>
                  <button type="button" className="btn btn-danger text-xs py-1! mt-1" onClick={() => delQ(tid, qd.id)}>Xóa</button>
                </div>
              ))}
              {qs.length === 0 && <p className="text-mist text-xs">Chưa có câu hỏi.</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JsonEditor({ draft, setDraft, setMsg }) {
  const [text, setText] = useState(JSON.stringify(draft.main, null, 2));
  const [err, setErr] = useState(null);

  useEffect(() => {
    setText(JSON.stringify(draft.main, null, 2));
  }, [draft.main]);

  function apply() {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") throw new Error("Phải là object bọc các vòng");
      setDraft({ ...draft, main: normalizeMain(parsed) });
      setErr(null);
      setMsg("Đã nạp JSON vào bản nháp — bấm Lưu vòng chính");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <p className="text-mist text-sm mb-2">Sửa JSON rồi bấm <b>Nạp vào bản nháp</b>, sau đó <b>Lưu vòng chính</b>. Cấu trúc thiếu sẽ tự được bổ sung.</p>
      <textarea rows={18} className="w-full font-mono text-sm" value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} />
      {err && <p className="text-red-400 text-sm mt-1">Lỗi: {err}</p>}
      <button type="button" className="btn mt-3" onClick={apply} disabled={err}>Nạp vào bản nháp</button>
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

function TimerBuzzerTab({ state, timer: liveTimer, setMsg }) {
  const g = state.game || {};
  const t = liveTimer || g.timer || {};
  const [seconds, setSeconds] = useState(() => Number(t.remaining) || 15);
  const remaining = t.remaining ?? 0;
  const running = !!t.running;
  const winner = state.teams.find((x) => x.id === g.buzzer?.winner);
  const act = async (action, body) => {
    try {
      await sendControl(action, body);
    } catch (e) {
      setMsg(e.message);
    }
  };
  return (
    <div className="panel max-w-[560px]">
      <div className="text-xs tracking-[0.18em] text-mist uppercase mb-2">Hẹn giờ</div>
      <span className={`timer-xl text-4xl ${remaining <= 5 && running ? "timer-danger" : ""}`}>
        {formatTime(remaining)}
      </span>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <input type="number" value={seconds} onChange={(e) => setSeconds(e.target.value)} className="w-20!" />
        <button type="button" className="btn" onClick={() => act("timer.set", { seconds: Number(seconds), running: true })}>
          Bắt đầu giờ
        </button>
        <button type="button" className="btn btn-ghost" disabled={!running} onClick={() => act("timer.pause")}>
          Dừng
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!!running || !(remaining > 0)}
          onClick={() => act("timer.resume")}
        >
          Tiếp
        </button>
        <span className="text-mist text-xs">{running ? "Đang chạy" : "Đã dừng"}</span>
      </div>

      <div className="text-xs tracking-[0.18em] text-mist uppercase mt-6 mb-2">Chuông</div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn" disabled={!!g.buzzer?.open} onClick={() => act("buzzer.open")}>
          Mở chuông
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => act("buzzer.reset", { open: true })}>
          Reset chuông (mở)
        </button>
        <button type="button" className="btn btn-ghost" disabled={!g.buzzer?.open} onClick={() => act("buzzer.close")}>
          Khóa chuông
        </button>
        {!!g.buzzer?.winner && <span className="badge badge-ok">Giữ chuông: {winner?.name || g.buzzer.winner}</span>}
      </div>
      <div className="text-mist text-xs mt-2">
        Chuông: {g.buzzer?.open ? "MỞ" : "KHÓA"}
        {(g.buzzer?.order || []).length > 0 &&
          ` • Thứ tự bấm: ${g.buzzer.order.map((id) => state.teams.find((x) => x.id === id)?.name || id).join(" → ")}`}
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
