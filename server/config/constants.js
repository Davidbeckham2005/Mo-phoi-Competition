export const TEAM_DEFS = [
  { id: "a", name: "Đội A", color: "#ff4d6d", accent: "#ff8fa3", pass: "dragon" },
  { id: "b", name: "Đội B", color: "#4cc9f0", accent: "#90e0ef", pass: "phoenix" },
  { id: "c", name: "Đội C", color: "#80ed99", accent: "#b7efc5", pass: "tiger" },
  { id: "d", name: "Đội D", color: "#ffd60a", accent: "#ffe566", pass: "turtle" },
];

export const ROUNDS = [
  { id: "khoi_dong", name: "Khởi động" },
  { id: "vuot_cnv", name: "Vượt chướng ngại vật" },
  { id: "tang_toc", name: "Tăng tốc" },
  { id: "ve_dich", name: "Về đích" },
];

export function emptyPuzzle() {
  return {
    rowsSolved: [false, false, false, false],
    rowsLocked: [false, false, false, false],
    teamForRow: [null, null, null, null],
    centerRevealed: false,
    keywordSolved: false,
    keywordWinner: null,
    keywordPointsAwarded: 0,
    currentRow: 0,
    order: [],
    turnIndex: 0,
    orderPending: false,
    pendingPick: [],
    awaitingSteal: false,
    // Cửa sổ giành quyền đoán TỪ KHÓA giữa vòng: mở sau mỗi hàng ngang, đóng khi chọn ô mới
    keywordWindow: false,
    // Các đội đã đoán TỪ KHÓA sai (giữ nguyên tới khi ra từ khóa, không được đoán lại)
    keywordBlocked: [],
    // Đội đang ghi danh (nắm giữ quyền) đoán TỪ KHÓA qua nút TỪ KHÓA — bất kỳ lúc nào trong vòng
    keywordClaim: null,
    // Kết quả hàng ngang vừa xử lý xong (đúng/sai) để hiển thị hiệu ứng phản hồi,
    // tự động xóa khi chọn ô kế tiếp (selectRow)
    lastResult: null,
    // Các đội đoán TỪ KHÓA (chướng ngại vật) SAI → bị cấm trả lời câu hỏi hàng ngang
    // tiếp theo (không làm đội chính, không được cướp) cho tới hết vòng.
    rowBanned: [],
  };
}

export function defaultGame() {
  return {
    phase: "setup",
    round: null,
    currentTeam: "a",
    questionIndex: 0,
    questionStatus: "idle",
    display: {
      mode: "idle",
      title: "",
      question: "",
      options: [],
      mediaUrl: "",
      mediaType: "",
      answer: "",
      answerRevealed: false,
      note: "",
    },
    timer: { remaining: 0, running: false, endsAt: null, duration: 0 },
    buzzer: { open: false, locked: false, winner: null, order: [], blocked: [] },
    puzzle: emptyPuzzle(),
    veDich: { packagePoints: 20, star: false, answeringTeam: null, stealOpen: false },
    tangToc: { submissions: {}, ranked: [] },
    khoiDong: { submissions: {}, history: {}, timerSeconds: 60, answerSeconds: 4 },
    roundStarted: false,
    finished: false,
    winnerTeamId: null,
  };
}

export function defaultSettings() {
  return {
    title: "CUỘC THI TRI THỨC 2026",
    subtitle: "Hành trình kiến thức — 4 đội tranh tài",
    pin: "2026",
    prelimDuration: 15 * 60,
    prelimQuestionCount: 30,
    topN: 16,
    prelimOpen: false,
    showLiveRanking: false,
  };
}
