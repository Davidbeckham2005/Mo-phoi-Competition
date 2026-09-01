import { getDb, ROUNDS } from "../models/store.js";
import { cnvView } from "./game.service.js";

export function publicState() {
  const d = getDb();
  const state = {
    // các cài đặt chung của giải 
    settings: {
      title: d.settings.title,
      subtitle: d.settings.subtitle,
      // thời lượng vòng loại. 
      prelimDuration: d.settings.prelimDuration,
      // số câu hỏi ???
      prelimQuestionCount: d.settings.prelimQuestionCount,
      // số đội thí sinh được vào vòng trong ???
      topN: d.settings.topN,
      // trạng thái mở đề
      prelimOpen: d.settings.prelimOpen,
      // có show bảng xếp hạng trực tiếp hay không  
      showLiveRanking: d.settings.showLiveRanking,
      // kiểu nền + ảnh nền của màn hình khán giả (vòng khởi động)
      audienceBg: d.settings.audienceBg || "dark",
      audienceBgUrl: d.settings.audienceBgUrl || "",
    },
    // danh sách các đội thi
    teams: d.teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      accent: t.accent,
      score: t.score,
      members: t.memberIds.map((id) => {
        const c = d.contestants.find((x) => x.id === id);
        return c ? { id: c.id, name: c.name } : null;
      }).filter(Boolean),
    })),
    // tổng số thí sinh đã đăng ký?
    contestantCount: d.contestants.length,
    // tổng số thí sinh đã nộp bài
    submittedCount: d.contestants.filter((c) => c.submittedAt).length,
    // trạng thái game hiện tại
    game: d.game,
    // danh sách các phương tiện truyền thông (hình ảnh, video, âm thanh)
    media: d.media,
    // định nghĩa cấu trúc vòng thi
    rounds: ROUNDS,
  };
  if (d.game.round === "vuot_cnv") {
    state.cnv = cnvView(d);
  }
  return state;
}

export function adminState() {
  const d = getDb();
  return {
    ...publicState(),
    settings: d.settings,
    // BTC xem được mật khẩu đội để phát cho thí sinh
    teams: d.teams.map((t) => ({ ...t })),
    contestants: d.contestants.map(stripAnswersForList),
    questions: d.questions,
  };
}

function stripAnswersForList(c) {
  return {
    id: c.id,
    name: c.name,
    studentId: c.studentId,
    school: c.school,
    className: c.className,
    score: c.score,
    correctCount: c.correctCount,
    timeSpent: c.timeSpent,
    submittedAt: c.submittedAt,
    rank: c.rank,
    qualified: c.qualified,
    teamId: c.teamId,
    startedAt: c.startedAt,
  };
}
