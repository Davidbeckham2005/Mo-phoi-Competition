export const TEAM_DEFS = [
  { id: "a", name: "Đội A", color: "#ff4d6d", accent: "#ff8fa3" },
  { id: "b", name: "Đội B", color: "#4cc9f0", accent: "#90e0ef" },
  { id: "c", name: "Đội C", color: "#80ed99", accent: "#b7efc5" },
  { id: "d", name: "Đội D", color: "#ffd60a", accent: "#ffe566" },
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
    centerRevealed: false,
    keywordSolved: false,
    keywordWinner: null,
    keywordPointsAwarded: 0,
    currentRow: 0,
    awaitingSteal: false,
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
    khoiDong: { submissions: {} },
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
