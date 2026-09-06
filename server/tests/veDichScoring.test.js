import assert from "node:assert/strict";
import { calculateAnswerScore } from "../services/rounds/veDich.service.js";

function score(P, star, outcome) {
  return calculateAnswerScore({ questionPoints: P, isStarOfHope: star, outcome });
}

function run() {
  // === CÂU THƯỜNG (P = 20, khớp ví dụ trong đề) ===
  // Đội chọn câu trả lời đúng        → Đội chọn +P
  assert.deepEqual(score(20, false, "selecting-correct"), { selecting: 20, stealing: 0 });
  // Chọn sai, không ai giành/trả lời → Đội chọn 0
  assert.deepEqual(score(20, false, "no-answer"), { selecting: 0, stealing: 0 });
  // Chọn sai, đội khác ĐÚNG           → Đội chọn -P, đội giành +P
  assert.deepEqual(score(20, false, "steal-correct"), { selecting: -20, stealing: 20 });
  // Chọn sai, đội khác SAI            → Đội chọn 0, đội giành -P
  assert.deepEqual(score(20, false, "steal-wrong"), { selecting: 0, stealing: -20 });

  // === NGÔI SAO HY VỌNG (P = 20) ===
  // Đội chọn NSHV trả lời đúng       → +2P
  assert.deepEqual(score(20, true, "selecting-correct"), { selecting: 40, stealing: 0 });
  // NSHV sai, không ai giành/trả lời → -P/2
  assert.deepEqual(score(20, true, "no-answer"), { selecting: -10, stealing: 0 });
  // NSHV sai, đội khác ĐÚNG          → Đội chọn -2P, đội giành +2P
  assert.deepEqual(score(20, true, "steal-correct"), { selecting: -40, stealing: 40 });
  // NSHV sai, đội khác SAI           → Đội chọn -P/2, đội giành -P
  assert.deepEqual(score(20, true, "steal-wrong"), { selecting: -10, stealing: -20 });

  // === KHÔNG HARD-CODE 10/20/30: cùng quy tắc với P = 10 và P = 30 ===
  assert.deepEqual(score(10, false, "steal-correct"), { selecting: -10, stealing: 10 });
  assert.deepEqual(score(10, true, "steal-correct"), { selecting: -20, stealing: 20 });
  assert.deepEqual(score(10, true, "no-answer"), { selecting: -5, stealing: 0 });
  assert.deepEqual(score(30, false, "steal-wrong"), { selecting: 0, stealing: -30 });
  assert.deepEqual(score(30, true, "steal-wrong"), { selecting: -15, stealing: -30 });
  assert.deepEqual(score(30, true, "selecting-correct"), { selecting: 60, stealing: 0 });

  // === Ngoại lệ: outcome không hợp lệ / điểm gốc thiếu → không tự ý tính ===
  assert.deepEqual(score(20, false, "something-else"), { selecting: 0, stealing: 0 });
  assert.deepEqual(score(0, true, "steal-correct"), { selecting: 0, stealing: 0 });

  console.log("OK — ve_dich scoring: all table cases passed (normal + star + parametric P).");
}

run();