  import { getDb, saveDb, defaultGame, emptyPuzzle, ROUNDS } from "../models/store.js";
  import * as cnv from "./rounds/vuotCnv.service.js";

  let timerHandle = null;
  let khoiDongTimer = null;
  let broadcast = () => {};

  export function setBroadcast(fn) {
    broadcast = fn;
  }

  export function emit() {
    broadcast("game:state", publicGame());
  }

  export function getTimer() {
    return g().timer;
  }
  // lấy dữ liệu game hiện tại hiển thị ra màng hình
  export function publicGame() {
    const db = getDb();
    const { timer, ...gameWithoutTimer } = db.game;
    const state = {
      teams: db.teams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        accent: t.accent,
        score: t.score,
        members: t.memberIds.map((id) => {
          const c = db.contestants.find((x) => x.id === id);
          return c ? { id: c.id, name: c.name } : null;
        }).filter(Boolean),
      })),
      game: gameWithoutTimer,
      questions: db.questions,
      settings: {
        title: db.settings.title,
        subtitle: db.settings.subtitle,
      },
      rounds: ROUNDS,
    };
    if (db.game.round === "vuot_cnv") {
      state.cnv = cnv.cnvView(db);
    }
    return state;
  }

  export const cnvView = (db) => cnv.cnvView(db);

  function g() {
    return getDb().game;
  }

  function team(id) {
    return getDb().teams.find((t) => t.id === id);
  }

  export function startTimerLoop() {
    stopTimerLoop();
    timerHandle = setInterval(() => {
      const game = g();
      if (!game.timer.running || !game.timer.endsAt) return;
      const remaining = Math.max(0, Math.ceil((game.timer.endsAt - Date.now()) / 1000));
      game.timer.remaining = remaining;
      if (remaining <= 0) {
        game.timer.running = false;
        game.timer.endsAt = null;
        if (game.round === "tang_toc") {
          // Hết video: tự đóng nhận bài, đưa màn hình khán giả sang vùng liệt kê đáp án.
          // AB: nếu client đã chuyển sớm hơn (onended) thì không làm gì thừa.
          if (game.tangToc?.phase === "video") {
            game.tangToc.phase = "answers";
          }
        } else if (
          game.round === "vuot_cnv" &&
          !game.puzzle.keywordSolved &&
          !cnv.cornersResolved() &&
          !game.puzzle.keywordWindow
        ) {
          // Hết thời gian trả lời: mở chuông cho các đội khác giành quyền.
          // Đội vừa hết giờ bị CHẶN (không được cướp lại chính ô của mình),
          // đối xứng với nhánh "sai lần đầu".
          // Điều kiện trên (chưa đủ 4 góc, chưa ra từ khóa, không trong cửa sổ từ khóa)
          // đã đủ xác định đang có hàng ngang đang thi — KHÔNG phụ thuộc display.mode,
          // để chuông cướp luôn mở dù MC đang hiện câu hỏi, bảng mảnh hay màn khác.
          const p = game.puzzle;
          if (p.awaitingSteal) {
            if (!game.buzzer?.winner) {
              cnv.skipSteal();
            }
          } else {
            p.awaitingSteal = true;
            game.buzzer = game.buzzer || {};
            game.buzzer.blocked = game.buzzer.blocked || [];
            if (!game.buzzer.blocked.includes(game.currentTeam)) game.buzzer.blocked.push(game.currentTeam);
            resetBuzzer(true);
          }
        }
        broadcast("game:timer", game.timer);
        emit();
        saveDb();
        return;
      }
      broadcast("game:timer", game.timer);
    }, 250);
  }

  export function stopTimerLoop() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  }

  export function setTimer(seconds, running = true) {
    const game = g();
    const duration = Math.max(0, Number(seconds) || 0);
    game.timer.duration = duration;
    game.timer.remaining = duration;
    game.timer.running = running && duration > 0;
    game.timer.endsAt = game.timer.running ? Date.now() + duration * 1000 : null;
    saveDb();
    broadcast("game:timer", game.timer);
    emit();
  }

  export function pauseTimer() {
    const game = g();
    if (game.timer.running && game.timer.endsAt) {
      game.timer.remaining = Math.max(0, Math.ceil((game.timer.endsAt - Date.now()) / 1000));
    }
    game.timer.running = false;
    game.timer.endsAt = null;
    saveDb();
    broadcast("game:timer", game.timer);
    emit();
  }

  export function resumeTimer() {
    const game = g();
    if (game.timer.remaining > 0) {
      game.timer.running = true;
      game.timer.endsAt = Date.now() + game.timer.remaining * 1000;
    }
    saveDb();
    broadcast("game:timer", game.timer);
    emit();
  }

  export function addScore(teamId, points) {
    const t = team(teamId);
    if (!t) return;
    t.score = Math.max(0, t.score + Number(points || 0));
    saveDb();
    emit();
  }

  // Xác thực mật khẩu đội (dùng cho API login và các sự kiện socket của đội)
  export function checkTeamPass(teamId, pass) {
    const t = team(teamId);
    if (!t) return false;
    return String(pass ?? "") === String(t.pass ?? "");
  }

  export function setScore(teamId, score) {
    const t = team(teamId);
    if (!t) return;
    t.score = Math.max(0, Number(score) || 0);
    saveDb();
    emit();
  }

export function setKhoiDongTimer(seconds) {
  const game = g();
  if (game.round !== "khoi_dong") return;
  game.khoiDong = game.khoiDong || { submissions: {} };
  game.khoiDong.timerSeconds = Math.max(5, Number(seconds) || 60);
  setTimer(game.khoiDong.timerSeconds, false);
}

export function setKhoiDongAnswerSeconds(seconds) {
  const game = g();
  game.khoiDong = game.khoiDong || { submissions: {} };
  game.khoiDong.answerSeconds = Math.max(0, Number(seconds) || 0);
  saveDb();
  emit();
}

export function setKhoiDongTimerSeconds(seconds) {
  const game = g();
  game.khoiDong = game.khoiDong || { submissions: {} };
  game.khoiDong.timerSeconds = Math.max(5, Number(seconds) || 60);
  saveDb();
  emit();
}

// Reset trạng thái trả lời vòng Khởi động (đưa các câu về "chưa trả lời")
export function resetKhoiDong(teamId = null) {
  const game = g();
  if (game.round !== "khoi_dong") return;
  game.khoiDong = game.khoiDong || { submissions: {}, timerSeconds: 60, history: {} };
  game.khoiDong.history = game.khoiDong.history || {};
  game.khoiDong.submissions = game.khoiDong.submissions || {};
  if (teamId) {
    game.khoiDong.history[teamId] = [];
    delete game.khoiDong.submissions[teamId];
  } else {
    game.khoiDong.history = {};
    game.khoiDong.submissions = {};
  }
  saveDb();
  emit();
}

  export function startRound(roundId) {
    const game = g();
    if (khoiDongTimer) {
      clearTimeout(khoiDongTimer);
      khoiDongTimer = null;
    }
    game.phase = "main";
    game.round = roundId;
    game.questionIndex = 0;
    game.currentTeam = "a";
    game.questionStatus = "idle";
    game.finished = false;
    game.roundStarted = true;
    game.display = {
      mode: "idle",
      title: ROUNDS.find((r) => r.id === roundId)?.name || "",
      question: "",
      options: [],
      mediaUrl: "",
      mediaType: "",
      answer: "",
      answerRevealed: false,
      note: "",
    };
    resetBuzzer();
    g().buzzer.blocked = [];
    // Dọn đồng hồ của vòng trước: đồng hồ cũ vẫn chạy có thể đếm ngược sang vòng mới
    // (và tới 0 sẽ vô tình mở chuông "chờ cướp" dù chưa có câu hỏi nào đang thi)
    setTimer(0, false);
    if (roundId === "vuot_cnv") {
      game.puzzle = emptyPuzzle();
      // Thứ tự chọn ô theo điểm hiện tại: điểm cao nhất được chọn trước.
      // Nếu có đội bằng điểm → hoãn chốt, để MC tự xếp thứ tự (orderPick).
      const sorted = getDb()
        .teams.filter((t) => ["a", "b", "c", "d"].includes(t.id))
        .slice()
        .sort((x, y) => y.score - x.score || x.id.localeCompare(y.id));
      const hasTie = sorted.some((t, i) => i > 0 && t.score === sorted[i - 1].score);
      game.puzzle.order = hasTie ? [] : sorted.map((t) => t.id);
      game.puzzle.orderPending = hasTie;
      game.puzzle.turnIndex = 0;
      game.display.mode = "puzzle";
    }
    if (roundId === "tang_toc") {
      game.tangToc = { submissions: {}, ranked: [], phase: "video", corrections: {}, settled: false };
    }
    if (roundId === "khoi_dong") {
      game.khoiDong = { submissions: {}, timerSeconds: game.khoiDong?.timerSeconds || 60, answerSeconds: game.khoiDong?.answerSeconds, history: {} };
      setTimer(game.khoiDong.timerSeconds, false);
    }
    if (roundId === "ve_dich") {
      game.veDich = { packagePoints: 20, star: false, answeringTeam: "a", stealOpen: false };
    }
    saveDb();
    emit();
  }

  function currentQuestion() {
    const db = getDb();
    const game = db.game;
    const main = db.questions.main;
    if (game.round === "khoi_dong") {
      const list = main.khoiDong[game.currentTeam] || [];
      return list[game.questionIndex] || null;
    }
    if (game.round === "vuot_cnv") {
      if (game.puzzle.centerRevealed) {
        return {
          id: "cnv-keyword",
          question: `Chướng ngại vật (${main.vuotCnv.letterCount} chữ cái, không tính dấu cách). Gợi ý: ${main.vuotCnv.hint}`,
          answer: main.vuotCnv.keyword,
          points: cnv.keywordPoints(),
        };
      }
      return main.vuotCnv.rows[game.puzzle.currentRow] || null;
    }
    if (game.round === "tang_toc") {
      return main.tangToc[game.questionIndex] || null;
    }
    if (game.round === "ve_dich") {
      const pts = game.veDich.packagePoints;
      const list = main.veDich[game.currentTeam] || [];
      return list.find((q) => q.points === pts) || list[0] || null;
    }
    return null;
  }

  // Đưa màn hình về bảng chính, xóa sạch câu hỏi/đáp án đang hiển thị
  function resetDisplayToBoard() {
    const game = g();
    game.display.mode = game.round === "vuot_cnv" ? "puzzle" : "idle";
    game.display.question = "";
    game.display.options = [];
    game.display.answer = "";
    game.display.answerRevealed = false;
    game.display.note = "";
    game.questionStatus = "idle";
  }

  export function showQuestion() {
    const game = g();
    const q = currentQuestion();
    if (!q) {
      const err = new Error("Chưa có câu hỏi phù hợp — hãy chọn đội/gói câu hỏi trước khi hiện.");
      err.status = 400;
      throw err;
    }
    game.questionStatus = "showing";
    game.display.mode = "question";
    game.display.question = game.round === "khoi_dong" ? "Ảnh này là gì?" : q.question || (q.mediaUrl || q.mediaType ? "Ảnh này là gì?" : "");
    game.display.options = q.options || [];
    game.display.answer = q.answer;
    game.display.answerRevealed = false;
    game.display.mediaUrl = q.mediaUrl || "";
    game.display.mediaType = q.mediaType || "";
    game.display.note = q.note || "";
    game.display.title = ROUNDS.find((r) => r.id === game.round)?.name || "";
    if (game.round === "vuot_cnv" && !cnv.cornersResolved()) {
      game.display.note = `Hàng ngang ${game.puzzle.currentRow + 1} • ${q.letterCount || ""} chữ`;
      setTimer(game.vuotCnv?.answerSeconds || 30, true);
    }
    if (game.round === "tang_toc") {
      game.tangToc = { submissions: {}, ranked: [], phase: "video", corrections: {}, settled: false, duration: q.duration || q.timeLimit || 120 };
      const ttDur = q.duration || q.timeLimit || 120;
      game.display.note = `Chiếu video ${ttDur}s — cả 4 đội gửi đáp án; nộp nhanh được cộng điểm.`;
      setTimer(ttDur, true);
    }
    if (game.round === "khoi_dong") {
      const timerSec = game.khoiDong?.timerSeconds || 60;
      game.khoiDong = game.khoiDong || {};
      game.khoiDong.submissions = {};
      const kdList = getDb().questions.main.khoiDong?.[game.currentTeam] || [];
      game.display.note = `${team(game.currentTeam)?.name || ""} • Ảnh ${game.questionIndex + 1}/${kdList.length} • 10 điểm`;
      setTimer(timerSec, true);
    }
    if (game.round === "ve_dich") {
      const star = game.veDich.star ? " • Ngôi sao hy vọng" : "";
      game.display.note = `${team(game.currentTeam)?.name || ""} • Gói ${game.veDich.packagePoints} điểm${star}`;
      setTimer(15, false);
    }
    saveDb();
    emit();
  }

  export function revealAnswer() {
    const game = g();
    if (game.display.mode !== "question") {
      const err = new Error("Chưa hiện câu hỏi — bấm “Hiện câu hỏi” trước khi lật đáp án.");
      err.status = 400;
      throw err;
    }
    game.display.answerRevealed = true;
    game.questionStatus = "revealed";
    saveDb();
    emit();
  }

  export function hideAnswer() {
    const game = g();
    if (!game.display.answerRevealed) return;
    game.display.answerRevealed = false;
    game.questionStatus = "showing";
    saveDb();
    emit();
  }

  // Ẩn câu hỏi, đưa màn hình về bảng chính (Vòng 2 quay về bảng mảnh ghép)
  export function hideQuestion() {
    const game = g();
    if (!game.round) return;
    game.display.mode = game.round === "vuot_cnv" ? "puzzle" : "idle";
    game.display.answerRevealed = false;
    game.questionStatus = "idle";
    saveDb();
    emit();
  }

  // Bật/tắt màn hình hiển thị trên màn hình lớn (chỉ dùng cho Vòng 2):
  //   mode === "question" → MÀN HÌNH CÂU HỎI
  //   còn lại            → MÀN HÌNH ẢNH GHÉP + HÀNG NGANG
  // Giữ nguyên dữ liệu câu hỏi (display.question/answer...) để MC chuyển qua lại thoải mái.
  export function setScreenMode(mode) {
    const game = g();
    if (game.round !== "vuot_cnv") return;
    game.display.mode = mode === "question" ? "question" : "puzzle";
    saveDb();
    emit();
  }

  export function markAnswer(correct, teamId = null) {
    const game = g();
    const q = currentQuestion();
    const tid = teamId || game.currentTeam;
    if (!q) {
      // Chưa chọn câu hỏi: vẫn chấm điểm thủ công (+10 mặc định / không trừ)
      if (correct) addScore(tid, 10);
      saveDb();
      emit();
      return;
    }
    let points = q.points || 10;
    if (game.round === "ve_dich") {
      points = game.veDich.packagePoints;
      if (game.veDich.star) points *= 2;
    }
    // Vòng 2: ô hiện tại đã được xử lý xong (mở/khóa) → KHÔNG chấm lại.
    // Tránh nhấn đúp "Đúng"/"Sai": +điểm 2 lần, −20 2 lần, hoặc advancePicker
    // đúp làm nhảy cóc lượt của đội kế tiếp. Hết 4 góc thì nút hàng ngang cũng vô tác dụng.
    if (game.round === "vuot_cnv") {
      if (cnv.cornersResolved()) {
        // Đã đủ 4 góc: hàng ngang không còn điểm để chấm nữa (từ khóa dùng action riêng)
        saveDb();
        emit();
        return;
      } else {
        const row = game.puzzle.currentRow;
        if (game.puzzle.rowsSolved?.[row] || game.puzzle.rowsLocked?.[row]) {
          saveDb();
          emit();
          return;
        }
      }
    }
    // Vòng 2: cờ đánh dấu một ô vừa được xử lý xong (mở/khóa) → sau khi chấm,
    // tự động đưa màn hình khán giả quay về bảng mảnh ghép thay vì đứng yên trên câu hỏi.
    let resolvedInCnv = false;
    if (correct) {
      if (game.round === "vuot_cnv" && !cnv.cornersResolved() && game.puzzle.awaitingSteal) {
        // Đội giành quyền trả lời đúng: +10 và mở mảnh.
        // Chỉ cộng điểm khi THỰC SỰ có đội cướp (buzzer.winner) — không fallback về
        // đội đang chọn (vốn đã trả lời sai ở bước trước).
        if (game.buzzer.winner) {
          addScore(game.buzzer.winner, points);
          cnv.revealRow(game.puzzle.currentRow);
          game.puzzle.lastResult = {
            correct: true,
            teamId: game.buzzer.winner,
            row: game.puzzle.currentRow,
            pts: points,
          };
          cnv.advancePicker();
          resolvedInCnv = true;
        }
        game.puzzle.awaitingSteal = false;
      } else {
        addScore(tid, points);
        if (game.round === "vuot_cnv" && !cnv.cornersResolved()) {
          cnv.revealRow(game.puzzle.currentRow);
          game.puzzle.lastResult = {
            correct: true,
            teamId: tid,
            row: game.puzzle.currentRow,
            pts: points,
          };
          cnv.advancePicker();
          resolvedInCnv = true;
        }
      }
    } else if (game.round === "vuot_cnv" && !cnv.cornersResolved()) {
      const p = game.puzzle;
      if (!p.awaitingSteal) {
        // Sai lần đầu: mở chuông cho các đội CÒN LẠI giành quyền trả lời (đội vừa sai bị chặn)
        p.awaitingSteal = true;
        pauseTimer();
        game.buzzer = game.buzzer || {};
        game.buzzer.blocked = game.buzzer.blocked || [];
        if (!game.buzzer.blocked.includes(tid)) game.buzzer.blocked.push(tid);
        resetBuzzer(true);
      } else {
        // Đội giành quyền trả lời sai: -20 và khóa mảnh vĩnh viễn.
        // Bắt buộc phải THỰC SỰ có đội đã cướp (buzzer.winner) mới tính —
        // tránh bấm "Sai" lần 2 khi chuông còn mở gây −20 nhầm cho đội chưa ai trả lời.
        if (!game.buzzer.winner) {
          saveDb();
          emit();
          return;
        }
        addScore(game.buzzer.winner, -20);
        cnv.lockRow(p.currentRow);
        p.lastResult = {
          correct: false,
          teamId: game.buzzer.winner,
          row: p.currentRow,
          pts: -20,
        };
        p.awaitingSteal = false;
        cnv.advancePicker();
        resolvedInCnv = true;
      }
    } else if (game.round === "ve_dich" && game.veDich.star && tid === game.currentTeam) {
      addScore(tid, -game.veDich.packagePoints * 2);
    }
    // Vòng Khởi động: chấm xong hiện đáp án trong answerSeconds rồi mới tự sang câu kế
    if (game.round === "khoi_dong" && game.display.mode === "question") {
      // Lưu lịch sử đúng/sai
      game.khoiDong.history = game.khoiDong.history || {};
      game.khoiDong.history[tid] = game.khoiDong.history[tid] || [];
      game.khoiDong.history[tid][game.questionIndex] = !!correct;
      const seconds = Math.max(0, Number(game.khoiDong?.answerSeconds) || 0);
      if (seconds > 0) {
        game.display.answerRevealed = true;
        game.questionStatus = "revealed";
        saveDb();
        emit();
        scheduleKhoiDongAdvance();
      } else {
        // 0 giây: giữ hành vi cũ — chuyển ngay sang câu kế
        const before = `${game.currentTeam}:${game.questionIndex}`;
        nextQuestion();
        const moved = `${game.currentTeam}:${game.questionIndex}` !== before;
        if (moved && currentQuestion()) {
          showQuestion();
        }
      }
      return;
    }
    // Vòng 2: vừa xử lý xong một ô (mở/khóa) → tự đưa màn hình khán giả quay về
    // bảng mảnh ghép luôn, MC khỏi bấm thêm nút chuyển. (Khi sai lần đầu đang chờ
    // cướp thì resolvedInCnv = false → giữ nguyên màn hình câu hỏi cho đội cướp.)
    if (resolvedInCnv) {
      resetDisplayToBoard();
      saveDb();
      emit();
      return;
    }
    // Chỉ lật đáp án khi câu hỏi đang thực sự hiển thị trên màn hình.
    // Vòng 2: phạm sai LẦN ĐẦU (đang chờ các đội khác cướp) thì CHƯA lật đáp án —
    // để đội cướp tự trả lời, không bị lộ đáp án.
    if (game.display.mode === "question") {
      const noReveal =
        game.round === "vuot_cnv" &&
        game.puzzle?.awaitingSteal &&
        !cnv.cornersResolved();
      if (!noReveal) {
        game.display.answerRevealed = true;
        game.questionStatus = "revealed";
      }
    }
    saveDb();
    emit();
  }

  // Khởi động: sau khi chấm, hiện đáp án answerSeconds rồi tự chuyển sang câu kế
  function scheduleKhoiDongAdvance() {
    const game = g();
    const secs = Math.max(1, Number(game.khoiDong?.answerSeconds) || 4);
    if (khoiDongTimer) clearTimeout(khoiDongTimer);
    khoiDongTimer = setTimeout(() => {
      khoiDongTimer = null;
      advanceKhoiDongNext();
    }, secs * 1000);
  }

  // Chuyển sang câu kế (đã hết thời gian hiện đáp án)
  function advanceKhoiDongNext() {
    const game = g();
    if (game.round !== "khoi_dong") return;
    const before = `${game.currentTeam}:${game.questionIndex}`;
    nextQuestion();
    const moved = `${game.currentTeam}:${game.questionIndex}` !== before;
    if (moved && currentQuestion()) {
      showQuestion();
    } else {
      saveDb();
      emit();
    }
  }

  export function nextQuestion() {
    const game = g();
    resetDisplayToBoard();
    resetBuzzer();
    if (game.round === "khoi_dong") {
      const list = getDb().questions.main.khoiDong[game.currentTeam] || [];
      if (game.questionIndex + 1 < list.length) {
        game.questionIndex += 1;
      } else {
        const order = ["a", "b", "c", "d"];
        const i = order.indexOf(game.currentTeam);
        if (i < 3) {
          game.currentTeam = order[i + 1];
          game.questionIndex = 0;
          setTimer(game.khoiDong?.timerSeconds || 60, false);
        }
      }
    } else if (game.round === "vuot_cnv") {
      // Hàng ngang do đội chọn trực tiếp (puzzle.select), không tự tăng
    } else if (game.round === "tang_toc") {
      game.questionIndex = Math.min(3, game.questionIndex + 1);
      game.tangToc = { submissions: {}, ranked: [], phase: "video", corrections: {}, settled: false };
    } else if (game.round === "ve_dich") {
      game.veDich.star = false;
      game.veDich.stealOpen = false;
    }
    saveDb();
    emit();
  }

  export function prevQuestion() {
    const game = g();
    resetDisplayToBoard();
    if (game.round === "khoi_dong") {
      if (game.questionIndex > 0) game.questionIndex -= 1;
    } else if (game.round === "vuot_cnv") {
      if (game.puzzle.currentRow > 0) game.puzzle.currentRow -= 1;
    } else if (game.round === "tang_toc") {
      game.questionIndex = Math.max(0, game.questionIndex - 1);
    }
    saveDb();
    emit();
  }

  export function setCurrentTeam(teamId) {
    const game = g();
    game.currentTeam = teamId;
    game.questionIndex = 0;
    if (game.round === "khoi_dong") {
      const timerSec = game.khoiDong?.timerSeconds || 60;
      const history = game.khoiDong?.history || {};
      game.khoiDong = { submissions: {}, timerSeconds: timerSec, answerSeconds: game.khoiDong?.answerSeconds, history };
      setTimer(timerSec, false);
      showQuestion();
      return;
    }
    if (game.round === "ve_dich") {
      game.veDich.answeringTeam = teamId;
      game.veDich.star = false;
    }
    saveDb();
    emit();
  }

  export function jumpToQuestion(teamId, questionIndex) {
    const game = g();
    const prevTeam = game.currentTeam;
    game.currentTeam = teamId;
    game.questionIndex = Math.max(0, questionIndex);
    if (game.round === "khoi_dong") {
      const timerSec = game.khoiDong?.timerSeconds || 60;
      if (teamId !== prevTeam) {
        const history = game.khoiDong?.history || {};
        game.khoiDong = { submissions: {}, timerSeconds: timerSec, answerSeconds: game.khoiDong?.answerSeconds, history };
      }
      setTimer(timerSec, false);
      showQuestion();
      return;
    }
    if (game.round === "tang_toc") {
      game.tangToc = { submissions: {}, ranked: game.tangToc?.ranked || [] };
      showQuestion();
      return;
    }
    saveDb();
    emit();
  }

  export function setPackage(points, star = false) {
    const game = g();
    game.veDich.packagePoints = Number(points);
    game.veDich.star = !!star;
    saveDb();
    emit();
  }

  export function resetBuzzer(open = false) {
    const game = g();
    game.buzzer = { open, locked: false, winner: null, order: [], blocked: game.buzzer?.blocked || [] };
    saveDb();
    emit();
  }

  export function openBuzzer() {
    const game = g();
    game.buzzer.open = true;
    game.buzzer.locked = false;
    game.buzzer.winner = null;
    game.buzzer.order = [];
    saveDb();
    emit();
  }

  export function closeBuzzer() {
    const game = g();
    game.buzzer.open = false;
    saveDb();
    emit();
  }

  export function pressBuzzer(teamId, intent = "row") {
    const game = g();
    if (!["a", "b", "c", "d"].includes(teamId)) return { ignored: true };
    // === ĐOÁN TỪ KHÓA (nút vàng TỪ KHÓA) — ghi danh được bất kỳ lúc nào trong
    // vòng 2, kể cả đang thi hàng ngang. Dùng puzzle.keywordClaim riêng (KHÔNG dùng
    // game.buzzer.winner) để không làm lẫn với chuông trả lời hàng ngang. ===
    const kwIntent = intent === "keyword";
    if (kwIntent) {
      if (game.round !== "vuot_cnv" || game.puzzle?.keywordSolved) return { ignored: true };
      // Cấm ghi danh/trả lời chướng ngại vật khi đang có đội khác trả lời câu hỏi
      // hàng ngang (questionStatus === "showing") — chờ hết câu hỏi mới được đoán.
      if (game.questionStatus === "showing") return { ignored: true, reason: "row-answering" };
      if (game.puzzle?.keywordClaim) return { ignored: true, reason: "already-claimed" };
      if (game.puzzle?.keywordBlocked?.includes(teamId)) return { ignored: true, blocked: true };
      game.puzzle.keywordClaim = teamId;
      saveDb();
      broadcast("buzzer:press", { teamId, winner: teamId, kind: "keyword", order: [teamId] });
      emit();
      return { winner: teamId, kind: "keyword" };
    }
    // === CHUÔNG TRẢ LỜI HÀNG NGANG / giành quyền cướp (nút CHUÔNG to) ===
    // Chuông này CHỈ dành cho hàng ngang: chỉ có hiệu lực khi MC mở chuông
    // (game.buzzer.open). Hoàn toàn tách biệt với nút TỪ KHÓA (keywordClaim).
    // Không còn nhánh "kwActive" — trước đây khi cửa sổ từ khóa mở hoặc đủ 4 góc,
    // chuông chính bị coi là đoán từ khóa gây dính logic. Giờ mọi chuyện đoán từ
    // khóa đều đi qua nút TỪ KHÓA riêng (intent === "keyword").
    if (!game.buzzer.open || game.buzzer.locked) return { ignored: true };
    // Đội bị chặn cướp hàng ngang (đã trả lời sai / hết giờ) không được cướp lại
    if (game.buzzer.blocked?.includes(teamId)) return { ignored: true, blocked: true };
    // Đội đoán TỪ KHÓA sai → bị cấm trả lời hàng ngang: không được cướp ô nào nữa
    if ((game.puzzle?.rowBanned || []).includes(teamId)) return { ignored: true, banned: true };
    if (game.buzzer.order?.includes(teamId)) return { ignored: true };
    game.buzzer.order = game.buzzer.order || [];
    game.buzzer.order.push(teamId);
    if (!game.buzzer.winner) {
      game.buzzer.winner = teamId;
      game.buzzer.locked = true;
      game.buzzer.open = false;
      // Cướp quyền trả lời hàng ngang thành công → đếm ngược THIẾT LẬP LẠI TỪ ĐẦU
      // (mặc định 30s) cho đội mới giành quyền trả lời.
      if (game.round === "vuot_cnv" && game.puzzle?.awaitingSteal) {
        setTimer(game.vuotCnv?.answerSeconds || 30, true);
      }
    }
    saveDb();
    broadcast("buzzer:press", {
      teamId,
      winner: game.buzzer.winner,
      order: game.buzzer.order,
    });
    emit();
    return { winner: game.buzzer.winner, order: game.buzzer.order };
  }

  export function blockBuzzerTeam(teamId) {
    const game = g();
    if (!game.buzzer.blocked.includes(teamId)) game.buzzer.blocked.push(teamId);
    saveDb();
    emit();
  }

  export function clearBuzzerBlocks() {
    g().buzzer.blocked = [];
    saveDb();
    emit();
  }

  export const revealPiece = (index, value = true) => cnv.revealPiece(index, value);
  export const selectRow = (rowIndex) => cnv.selectRow(rowIndex);
  export const pickOrder = (teamId) => cnv.pickOrder(teamId);
  export const skipSteal = () => cnv.skipSteal();
  export const revealRow = (rowIndex) => cnv.revealRow(rowIndex);
  export const revealCenter = (teamId = null) => cnv.revealCenter(teamId);
  export const revealAllPuzzle = () => cnv.revealAllPuzzle();
  export const solveKeyword = (teamId, correct) => cnv.solveKeyword(teamId, correct);
  export const showPuzzle = () => cnv.showPuzzle();

  export function showScores() {
    const game = g();
    game.display.mode = "scores";
    saveDb();
    emit();
  }

  export function showMedia(url, type = "image") {
    const game = g();
    game.display.mode = "media";
    game.display.mediaUrl = url;
    game.display.mediaType = type;
    saveDb();
    emit();
  }

  export function submitKhoiDong(teamId, answer) {
    const game = g();
    if (game.round !== "khoi_dong") {
      return { ok: false, reason: "wrong-round" };
    }
    if (game.questionStatus !== "showing" || game.display.mode !== "question") {
      return { ok: false, reason: "not-open" };
    }
    if (game.currentTeam !== teamId) {
      return { ok: false, reason: "not-your-turn" };
    }
    if (!game.khoiDong) game.khoiDong = { submissions: {} };
    if (game.khoiDong.submissions[teamId]) {
      return { ok: false, reason: "already" };
    }
    game.khoiDong.submissions[teamId] = {
      answer: String(answer || "").trim(),
      at: Date.now(),
      elapsed: Math.max(0, game.timer.duration - game.timer.remaining),
    };
    saveDb();
    emit();
    return { ok: true };
  }

  export function submitTangToc(teamId, answer) {
    const game = g();
    // Chỉ nhận bài khi đang trong giai đoạn chiếu video, đồng hồ còn chạy.
    if (game.round !== "tang_toc" || game.tangToc?.phase !== "video" || !game.timer.running) {
      return { ok: false, reason: "not-open" };
    }
    if (game.tangToc.submissions[teamId]) {
      return { ok: false, reason: "already" };
    }
    const elapsed = game.timer.duration - game.timer.remaining;
    game.tangToc.submissions[teamId] = {
      answer: String(answer || "").trim(),
      at: Date.now(),
      elapsed,
    };
    saveDb();
    emit();
    return { ok: true };
  }

  // Liệt kê bài nộp (theo thứ tự thời gian thấp → cao) kèm nhận định đúng/sai của MC
  // và điểm dự kiến. Điểm chỉ được cộng thật khi MC bấm "Chốt điểm" (settleTangToc).
  // QUY TẮC: chỉ đội TRẢ LỜI ĐÚNG mới được điểm, xếp theo độ nhanh GIỮA CÁC ĐỘI ĐÚNG
  // (nhất 40, nhì 30, ba 20, tư 10). Đội sai = 0 điểm, KHÔNG bị trừ.
  function computeTangTocRanked() {
    const game = g();
    const subs = Object.entries(game.tangToc.submissions || {}).map(([teamId, sub]) => ({
      teamId,
      answer: sub.answer,
      elapsed: sub.elapsed,
      at: sub.at,
    }));
    const corr = game.tangToc.corrections || {};
    const byElapsed = [...subs].sort((a, b) => a.elapsed - b.elapsed);
    const correct = byElapsed
      .filter((s) => corr[s.teamId] === true)
      .map((s, i) => ({ ...s, place: i + 1, points: [40, 30, 20, 10][i] || 10 }));
    const correctMap = {};
    correct.forEach((s) => (correctMap[s.teamId] = s));
    return byElapsed.map((s) => {
      const c = correctMap[s.teamId];
      return {
        teamId: s.teamId,
        answer: s.answer,
        elapsed: s.elapsed,
        correct: corr[s.teamId] === true ? true : corr[s.teamId] === false ? false : null,
        points: c ? c.points : 0,
        place: c ? c.place : null,
      };
    });
  }

  // MC chuyển màn hình khán giả: "video" (đang chiếu) / "answers" (liệt kê đáp án).
  export function tangTocSetPhase(phase) {
    const game = g();
    if (game.round !== "tang_toc") return;
    if (phase === "video" || phase === "answers") {
      game.tangToc.phase = phase;
    }
    saveDb();
    emit();
  }

  // MC chấm đúng/sai từng đội sau khi video chiếu xong. Đúng → tính điểm theo hạng
  // (sẽ cộng khi Chốt điểm); sai → 0 điểm, không trừ.
  export function tangTocMark(teamId, correct) {
    const game = g();
    if (game.round !== "tang_toc" || game.tangToc.phase !== "answers" || game.tangToc.settled) {
      return;
    }
    if (!game.tangToc.submissions?.[teamId]) return;
    if (game.tangToc.corrections[teamId] !== undefined) {
      // đã chấm đội này rồi — cho phép sửa lại
    }
    game.tangToc.corrections[teamId] = !!correct;
    game.tangToc.ranked = computeTangTocRanked();
    saveDb();
    emit();
  }

  export function settleTangToc() {
    const game = g();
    if (game.round !== "tang_toc" || game.tangToc.phase !== "answers") return;
    if (game.tangToc.settled) return; // tránh cộng điểm trùng
    if (!game.tangToc.ranked || game.tangToc.ranked.length === 0) {
      game.tangToc.ranked = computeTangTocRanked();
    }
    game.tangToc.ranked
      .filter((r) => r.correct === true && r.points > 0)
      .forEach((r) => addScore(r.teamId, r.points));
    game.tangToc.settled = true;
    const q = getDb().questions.main.tangToc[game.questionIndex];
    game.display.answerRevealed = true;
    game.display.answer = q ? q.answer : "";
    saveDb();
    emit();
  }

  export function finishContest() {
    const db = getDb();
    const ranked = [...db.teams].sort((a, b) => b.score - a.score);
    db.game.phase = "finished";
    db.game.round = "finished";
    db.game.finished = true;
    db.game.winnerTeamId = ranked[0]?.id || null;
    db.game.display.mode = "winner";
    db.game.display.title = "Kết quả chung cuộc";
    saveDb();
    emit();
  }

  export function resetGameKeepTeams() {
    const db = getDb();
    db.teams.forEach((t) => {
      t.score = 0;
    });
    db.game = defaultGame();
    db.game.phase = "teams_ready";
    saveDb();
    emit();
  }

  // Reset trạng thái trả lời vòng chính (Khởi động + round 2) để chạy demo lại.
  // Giữ nguyên vòng hiện tại, câu hỏi và điểm số của các đội.
  export function resetMainRoundState() {
    const game = g();
    if (khoiDongTimer) {
      clearTimeout(khoiDongTimer);
      khoiDongTimer = null;
    }
    stopTimerLoop();
    setTimer(0, false);
    game.currentTeam = "a";
    game.questionIndex = 0;
    game.questionStatus = "idle";
    game.finished = false;
    game.buzzer = { open: false, locked: false, winner: null, order: [], blocked: [] };
    game.display = {
      mode: "idle",
      title: ROUNDS.find((r) => r.id === game.round)?.name || "",
      question: "",
      options: [],
      mediaUrl: "",
      mediaType: "",
      answer: "",
      answerRevealed: false,
      note: "",
    };
    game.khoiDong = game.khoiDong || {};
    game.khoiDong.history = {};
    game.khoiDong.submissions = {};
    game.tangToc = { submissions: {}, ranked: [], phase: "video", corrections: {}, settled: false };
    game.puzzle = emptyPuzzle();
    game.veDich = { packagePoints: 20, star: false, answeringTeam: "a", stealOpen: false };
    if (game.round === "vuot_cnv") game.display.mode = "puzzle";
    saveDb();
    emit();
  }

  const keywordPoints = cnv.keywordPoints;
  export { currentQuestion, keywordPoints };

  cnv.init({ emit, addScore, pauseTimer, resetDisplayToBoard, showQuestion, resetBuzzer });
