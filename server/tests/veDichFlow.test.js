// Test LUỒNG chọn gói Vòng 4 trên NGÂN HÀNG CHUNG (không phụ thuộc số đội):
//   - mỗi đội chọn gói nhận đúng 4 câu theo cấu trúc;
//   - câu đã được giao cho một đội không bao giờ lặp lại cho đội khác (usedQuestionIds);
//   - chọn lại gói không "giải phóng" câu cũ (tránh trùng).
// Test tự khôi phục DB về trạng thái trước khi chạy (không làm bẩn dữ liệu thật).
import { connectDb } from "../config/database.js";
import { loadDb, getDb, saveDbSync } from "../models/store.js";
import * as vedich from "../services/rounds/veDich.service.js";

let pass = 0;
let fail = 0;
function ok(cond, msg) {
  if (cond) {
    pass += 1;
    console.log("PASS:", msg);
  } else {
    fail += 1;
    console.error("FAIL:", msg);
  }
}

let snapshot = null;
try {
  await connectDb();
  await loadDb();
  vedich.init({ emit: () => {} });

  snapshot = {
    game: JSON.stringify(getDb().game),
    veDich: JSON.stringify(getDb().questions.main.veDich),
  };

  const db = getDb();
  const teams = ["a", "b", "c", "d"];
  const packages = [60, 80, 100, 60];
  db.game.veDich = vedich.defaultState();
  db.game.round = "ve_dich";

  const plans = {};
  teams.forEach((tid, i) => {
    db.game.currentTeam = tid;
    const pickedIds = vedich.selectPackage(packages[i]);
    plans[tid] = { pkg: packages[i], ids: pickedIds };
    ok(Array.isArray(pickedIds) && pickedIds.length === 4, `đội ${tid.toUpperCase()} chọn gói ${packages[i]} nhận đúng 4 câu`);
  });

  // Kết cấu gói khớp cấu trúc + đủ mức điểm.
  for (const tid of teams) {
    const { pkg, ids } = plans[tid];
    const ptrs = ids.map((id) => (db.questions.main.veDich.find((x) => x.id === id) || {}).points);
    ok(String(ptrs.sort((a, b) => a - b)) === String(vedich.PACKAGES[pkg].slice().sort((a, b) => a - b)), `đội ${tid.toUpperCase()}: bộ câu đúng mức điểm gói ${pkg}`);
  }

  // Không câu nào được dùng cho 2 đội.
  const all = teams.flatMap((t) => plans[t].ids);
  ok(new Set(all).size === all.length, `4 đội dùng 16 câu KHÔNG trùng lặp (unique ${new Set(all).size}/16)`);
  ok((db.game.veDich.usedQuestionIds || []).length === all.length, `usedQuestionIds = ${all.length} (cấp VÒNG, lũy kế)`);

  // Chọn lại gói cho 1 đội KHÔNG lấy lại câu cũ của chính nó.
  const oldA = [...plans.a.ids];
  db.game.currentTeam = "a";
  const repick = vedich.selectPackage(60);
  const clash = repick.filter((id) => new Set([...oldA, ...(db.game.veDich.usedQuestionIds || [])]).has(id) && oldA.includes(id));
  ok(clash.length === 0, "chọn lại gói đội A không lấy lại câu cũ của A");
} catch (err) {
  fail += 1;
  console.error("ERROR:", err.message);
} finally {
  if (snapshot) {
    const db = getDb();
    db.game = JSON.parse(snapshot.game);
    db.questions.main.veDich = JSON.parse(snapshot.veDich);
    await saveDbSync();
    console.log("Đã khôi phục DB về trạng thái ban đầu.");
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);