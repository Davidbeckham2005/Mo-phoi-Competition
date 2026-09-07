// Test NHẬP CÂU HỎI Về đích từ file Excel/CSV:
//   - parse CSV có tiêu đề / không tiêu đề (vị trí 3 cột);
//   - parseVeDichRows nhận dạng header tiếng Việt/Anh, chuẩn mức điểm;
//   - importVeDichFile: thêm câu mới, bỏ qua câu trùng nội dung, thống kê đúng;
//   - test tự khôi phục DB về trạng thái trước khi chạy.
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

function csvBuffer(text) {
  return Buffer.from(text, "utf8");
}

await connectDb();

// 1) CSV có tiêu đề.
const rows = vedich.parseVeDichText("Điểm,Câu hỏi,Đáp án\n10,Thủ đô Việt Nam?,Hà Nội\n20,,Pháp\n");
ok(rows.length === 2, "parseVeDichText ĐỌC đủ dòng dữ liệu (bỏ qua tiêu đề)");
ok(rows[0].points === 10 && rows[0].question === "Thủ đô Việt Nam?" && rows[0].answer === "Hà Nội", "dòng hợp lệ: điểm/câu/đáp án đúng");
ok(rows[1].points === 20 && rows[1].question === "" && rows[1].answer === "Pháp", "dòng thiếu câu hỏi: giữ nguyên để import bỏ qua");

// 2) CSV không tiêu đề → quy ước 3 cột (điểm, câu hỏi, đáp án).
const p2 = vedich.parseVeDichText("30,Câu ba,Đáp án ba\n10,Câu một,Đáp án một\n");
ok(p2.length === 2 && p2[0].points === 30 && p2[0].question === "Câu ba" && p2[0].answer === "Đáp án ba", "CSV không tiêu đề: 3 cột theo vị trí");

// 3) parseVeDichRows nhận dạng cột tiếng Anh + chuẩn mức điểm.
const en = vedich.parseVeDichRows([{ points: "40", question: "Q?", answer: "A" }, { Score: 20, Question: "Q2", Key: "K" }]);
ok(en.length === 2 && en[0].points === 30, "mức 40đ lạ chuẩn về 30đ");
ok(en[1].points === 20 && en[1].question === "Q2" && en[1].answer === "K", "nhận dạng cột tiếng Anh (Score/Question/Key)");

// 4) Import thật vào ngân hàng chung + khôi phục DB.
let snapshot = null;
try {
  await loadDb();
  vedich.init({ emit: () => {} });
  snapshot = JSON.stringify(getDb().questions.main.veDich);

  const bank = getDb().questions.main.veDich;
  const dupQ = (bank.find((q) => q && q.question) || {}).question || "Thủ đô của Việt Nam là thành phố nào?";

  const csv = `Điểm,Câu hỏi,Đáp án\n10,${dupQ},Trùng\n10,Câu import mới A,Đáp A\n30,Câu import mới B,Đáp B\n,,\n20,,thiếu câu\n`;
  const r = vedich.importVeDichFile(csvBuffer(csv), "x.csv");

  ok(r.added === 2, `thêm đúng 2 câu mới (thực tế ${r.added})`);
  ok(r.skipped === 1, `bỏ qua 1 câu trùng nội dung (thực tế ${r.skipped})`);
  ok((r.errors || []).length === 1, "ghi lỗi 1 dòng thiếu câu hỏi");
  ok(r.total === bank.length + 2, `tổng ngân hàng tăng đúng ${bank.length} → ${r.total}`);
  ok(r.questions.every((q) => q.id && q.points === 10 || q.points === 30), "câu mới có id + mức điểm hợp lệ");

  // Import lặp lại → toàn bộ trùng (3 câu đã có: câu trùng ban đầu + A + B).
  const r2 = vedich.importVeDichFile(csvBuffer(csv), "x.csv");
  ok(r2.added === 0 && r2.skipped === 3, "import lặp: không thêm trùng, bỏ qua cả 3 câu đã có");
} catch (err) {
  fail += 1;
  console.error("ERROR:", err.message);
} finally {
  if (snapshot) {
    await loadDb();
    getDb().questions.main.veDich = JSON.parse(snapshot);
    await saveDbSync();
    console.log("Đã khôi phục DB về trạng thái ban đầu.");
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);