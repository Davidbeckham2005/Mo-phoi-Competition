import { getDb } from "../models/store.js";
import * as game from "../services/game.service.js";

const actions = {
  // Reset vòng 2 (Vượt chướng ngại vật) yêu cầu nhập mật khẩu admin để xác nhận.
  "round.start": (p) => {
    if (p.round === "vuot_cnv" && getDb().game.round === "vuot_cnv") {
      if (!p.pin || p.pin !== getDb().settings.pin) {
        const err = new Error("Vui lòng nhập mật khẩu admin để reset vòng Vượt chướng ngại vật.");
        err.status = 401;
        throw err;
      }
    }
    return game.startRound(p.round);
  },
  "timer.set": (p) => game.setTimer(p.seconds, p.running !== false),
  "timer.pause": () => game.pauseTimer(),
  "timer.resume": () => game.resumeTimer(),
  "question.show": () => game.showQuestion(),
  "question.hide": () => game.hideQuestion(),
  "question.next": () => game.nextQuestion(),
  "question.prev": () => game.prevQuestion(),
  "question.reveal": () => game.revealAnswer(),
  "question.hideAnswer": () => game.hideAnswer(),
  "screen.set": (p) => game.setScreenMode(p.mode),
  "question.jump": (p) => game.jumpToQuestion(p.teamId, p.questionIndex),
  "answer.mark": (p) => game.markAnswer(!!p.correct, p.teamId),
  "score.add": (p) => game.addScore(p.teamId, p.points),
  "score.set": (p) => game.setScore(p.teamId, p.score),
  "khoi_dong.timer": (p) => game.setKhoiDongTimer(p.seconds),
  "khoi_dong.answerSeconds": (p) => game.setKhoiDongAnswerSeconds(p.seconds),
  "khoi_dong.reset": (p) => game.resetKhoiDong(p.teamId),
  "team.set": (p) => game.setCurrentTeam(p.teamId),
  "buzzer.open": () => game.openBuzzer(),
  "buzzer.close": () => game.closeBuzzer(),
  "buzzer.reset": (p) => game.resetBuzzer(!!p.open),
  "buzzer.press": (p) => game.pressBuzzer(p.teamId, p.intent),
  "puzzle.piece": (p) => game.revealPiece(p.index, p.value !== false),
  "puzzle.select": (p) => game.selectRow(p.row, p.teamId),
  "puzzle.row": (p) => game.revealRow(p.row),
  "puzzle.center": (p) => game.revealCenter(p.teamId),
  "puzzle.all": () => game.revealAllPuzzle(),
  "puzzle.show": () => game.showPuzzle(),
  "puzzle.skip": () => game.skipSteal(),
  "order.pick": (p) => game.pickOrder(p.teamId),
  "keyword.solve": (p) => game.solveKeyword(p.teamId, !!p.correct),
  "media.show": (p) => game.showMedia(p.url, p.type),
  "scores.show": () => game.showScores(),
  "vedich.package": (p) => game.setPackage(p.points, p.star),
  "tangtoc.submit": (p) => game.submitTangToc(p.teamId, p.answer),
  "tangtoc.settle": () => game.settleTangToc(),
  "tangtoc.phase": (p) => game.tangTocSetPhase(p.phase),
  "tangtoc.mark": (p) => game.tangTocMark(p.teamId, !!p.correct),
  "contest.finish": () => game.finishContest(),
  "contest.resetGame": () => game.resetGameKeepTeams(),
  "main.resetQuestions": (p) => {
    if (p.pin !== getDb().settings.pin) {
      const err = new Error("Sai PIN ban tổ chức — không thể reset câu hỏi.");
      err.status = 401;
      throw err;
    }
    return game.resetMainRoundState();
  },
};

export function runAction(req) {
  const fn = actions[req.params.action];
  if (!fn) {
    const err = new Error("Hành động không hợp lệ.");
    err.status = 400;
    throw err;
  }
  const result = fn(req.body || {});
  return result === undefined ? { ok: true } : result;
}

export function currentQuestion() {
  const q = game.currentQuestion();
  return {
    question: q,
    keywordPoints: game.keywordPoints(),
    game: getDb().game,
  };
}
