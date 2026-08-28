  import { getDb, saveDb, defaultGame, emptyPuzzle, ROUNDS } from "../models/store.js";

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
      state.cnv = cnvView(db);
    }
    return state;
  }

  // Góc nhìn Vòng 2 cho thí sinh/khán giả: số ô chữ mỗi hàng + từ chỉ khi đã mở
  export function cnvView(db) {
    const p = db.game.puzzle || {};
    const cnv = db.questions.main.vuotCnv;
    return {
      rows: (cnv.rows || []).map((r, i) => ({
        letterCount: r.letterCount || String(r.answer || "").replace(/\s/g, "").length,
        status: p.rowsSolved?.[i] ? "open" : p.rowsLocked?.[i] ? "locked" : "hidden",
        word: p.rowsSolved?.[i] ? r.answer : "",
      })),
      keywordLetterCount: cnv.letterCount || String(cnv.keyword || "").replace(/\s/g, "").length,
      keyword: p.keywordSolved ? cnv.keyword : "",
      centerHint: p.centerRevealed ? cnv.centerHint : "",
      media: cnv.media && cnv.media.url ? { type: cnv.media.type || "image", url: cnv.media.url } : null,
    };
  }

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
          settleTangToc();
        } else if (game.round === "vuot_cnv" && !game.puzzle.keywordSolved && !cornersResolved()) {
          // Hết thời gian trả lời: mở chuông cho các đội khác giành quyền
          const p = game.puzzle;
          if (!p.awaitingSteal) {
            p.awaitingSteal = true;
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
    if (roundId === "vuot_cnv") {
      game.puzzle = emptyPuzzle();
      game.display.mode = "puzzle";
    }
    if (roundId === "tang_toc") {
      game.tangToc = { submissions: {}, ranked: [] };
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
          points: keywordPoints(),
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

  // 4 ô góc đã được xử lý hết (mở hoặc khóa vĩnh viễn)
  function cornersResolved(p = g().puzzle) {
    return [0, 1, 2, 3].every((i) => p.rowsSolved?.[i] || p.rowsLocked?.[i]);
  }

  function keywordPoints() {
    const p = g().puzzle;
    const opened = p.rowsSolved.filter(Boolean).length;
    if (opened >= 4) return 20;
    if (p.centerRevealed) return 20;
    if (opened <= 0) return 60;
    if (opened === 1) return 50;
    if (opened === 2) return 40;
    return 30;
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
    if (game.round === "vuot_cnv" && !cornersResolved()) {
      game.display.note = `Hàng ngang ${game.puzzle.currentRow + 1} • ${q.letterCount || ""} chữ`;
      setTimer(game.vuotCnv?.answerSeconds || 30, true);
    }
    if (game.round === "tang_toc") {
      game.tangToc = { submissions: {}, ranked: [] };
      setTimer(q.timeLimit || 20, false);
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
    if (correct) {
      if (game.round === "vuot_cnv" && !cornersResolved() && game.puzzle.awaitingSteal) {
        // Đội giành quyền trả lời đúng: +10 và mở mảnh.
        // Chỉ cộng điểm khi THỰC SỰ có đội cướp (buzzer.winner) — không fallback về
        // đội đang chọn (vốn đã trả lời sai ở bước trước).
        if (game.buzzer.winner) {
          addScore(game.buzzer.winner, points);
          revealRow(game.puzzle.currentRow);
        }
        game.puzzle.awaitingSteal = false;
      } else {
        addScore(tid, points);
        if (game.round === "vuot_cnv" && !cornersResolved()) {
          revealRow(game.puzzle.currentRow);
        }
      }
    } else if (game.round === "vuot_cnv" && !cornersResolved()) {
      const p = game.puzzle;
      if (!p.awaitingSteal) {
        // Sai lần đầu: mở chuông cho đội khác giành quyền trả lời
        p.awaitingSteal = true;
        pauseTimer();
        resetBuzzer(true);
      } else {
        // Đội giành quyền trả lời sai: -20 và khóa mảnh vĩnh viễn
        addScore(game.buzzer.winner || tid, -20);
        lockRow(p.currentRow);
        p.awaitingSteal = false;
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
    // Chỉ lật đáp án khi câu hỏi đang thực sự hiển thị trên màn hình
    if (game.display.mode === "question") {
      game.display.answerRevealed = true;
      game.questionStatus = "revealed";
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
      game.tangToc = { submissions: {}, ranked: [] };
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

  export function pressBuzzer(teamId) {
    const game = g();
    if (!game.buzzer.open || game.buzzer.locked) return { ignored: true };
    if (game.buzzer.blocked.includes(teamId)) return { ignored: true, blocked: true };
    if (game.buzzer.order.includes(teamId)) return { ignored: true };
    game.buzzer.order.push(teamId);
    if (!game.buzzer.winner) {
      game.buzzer.winner = teamId;
      game.buzzer.locked = true;
      game.buzzer.open = false;
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

  export function revealPiece(index, value = true) {
    const game = g();
    const i = Number(index);
    if (!(i >= 0 && i <= 4)) return;
    if (i === 4) game.puzzle.centerRevealed = !!value;
    else {
      game.puzzle.rowsSolved[i] = !!value;
      if (value) game.puzzle.rowsLocked[i] = false;
    }
    saveDb();
    emit();
  }

  export function selectRow(rowIndex, teamId) {
    const game = g();
    const p = game.puzzle;
    const i = Number(rowIndex);
    if (!(i >= 0 && i <= 3)) return;
    if (p.rowsSolved?.[i] || p.rowsLocked?.[i] || p.keywordSolved) return;
    if (!teamId || !["a", "b", "c", "d"].includes(teamId)) {
      throw new Error("Phải chọn đội thi cho ô này trước khi mở câu hỏi.");
    }
    p.teamForRow = p.teamForRow || [null, null, null, null];
    const owner = p.teamForRow[i];
    if (owner) {
      if (owner !== teamId) {
        const rowActive =
          (p.currentRow === i && game.questionStatus !== "idle") || p.awaitingSteal;
        if (rowActive) {
          throw new Error(`Ô này đang thi đấu thuộc đội ${String(owner).toUpperCase()} — không chuyển sang đội ${teamId.toUpperCase()} được.`);
        }
      }
    }
    p.teamForRow[i] = teamId;
    game.currentTeam = teamId;
    p.currentRow = i;
    p.awaitingSteal = false;
    // Dọn trạng thái chuông của hàng trước để tránh giữ lại đội giữ chuông cũ
    game.buzzer = { open: false, locked: false, winner: null, order: [], blocked: game.buzzer?.blocked || [] };
    game.questionStatus = "idle";
    game.display.mode = "puzzle";
    game.display.answerRevealed = false;
    saveDb();
    emit();
    showQuestion();
  }

  // Đội trả lời đúng: mở đúng 1 mảnh góc tương ứng hàng ngang
  export function revealRow(rowIndex) {
    const game = g();
    const i = Number(rowIndex);
    if (!(i >= 0 && i <= 3)) return;
    if (game.puzzle.rowsLocked?.[i]) return; // khóa vĩnh viễn, không mở lại
    pauseTimer();
    game.puzzle.rowsSolved[i] = true;
    saveDb();
    emit();
  }

  // Trả lời sai lần 2: khóa mảnh vĩnh viễn
  function lockRow(rowIndex) {
    const game = g();
    const i = Number(rowIndex);
    if (!(i >= 0 && i <= 3)) return;
    pauseTimer();
    game.puzzle.rowsLocked[i] = true;
    saveDb();
    emit();
  }

  export function revealCenter() {
    const game = g();
    if (!cornersResolved()) return; // chỉ được chọn khi 4 ô góc đã xử lý hết
    game.puzzle.centerRevealed = true;
    saveDb();
    emit();
  }

  export function revealAllPuzzle() {
    const game = g();
    game.puzzle.rowsSolved = [true, true, true, true];
    game.puzzle.rowsLocked = [false, false, false, false];
    game.puzzle.centerRevealed = true;
    saveDb();
    emit();
  }

  export function solveKeyword(teamId, correct) {
    const game = g();
    if (!teamId) return;
    if (!cornersResolved()) return; // chỉ đoán từ khóa khi đã xử lý hết 4 hàng ngang
    const pts = keywordPoints();
    if (correct) {
      game.puzzle.keywordSolved = true;
      game.puzzle.keywordWinner = teamId;
      game.puzzle.keywordPointsAwarded = pts;
      addScore(teamId, pts);
      revealAllPuzzle();
      game.display.answerRevealed = true;
      game.display.answer = getDb().questions.main.vuotCnv.keyword;
    } else {
      blockBuzzerTeam(teamId);
      resetBuzzer(true);
    }
    saveDb();
    emit();
  }

  export function showPuzzle() {
    const game = g();
    game.display.mode = "puzzle";
    game.display.answerRevealed = game.puzzle.keywordSolved;
    game.display.answer = game.puzzle.keywordSolved
      ? getDb().questions.main.vuotCnv.keyword
      : "";
    game.display.question = getDb().questions.main.vuotCnv.hint;
    game.display.note = `Từ khóa: ${getDb().questions.main.vuotCnv.letterCount} chữ cái (không tính dấu cách)`;
    saveDb();
    emit();
  }

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
    if (game.round !== "tang_toc" || !game.timer.running) {
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

  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  export function settleTangToc() {
    const db = getDb();
    const game = db.game;
    const q = db.questions.main.tangToc[game.questionIndex];
    if (!q) return;
    const pointsLadder = [40, 30, 20, 10];
    const correct = Object.entries(game.tangToc.submissions)
      .map(([teamId, sub]) => ({ teamId, ...sub }))
      .filter((s) => normalize(s.answer) === normalize(q.answer))
      .sort((a, b) => a.elapsed - b.elapsed);

    const ranked = [];
    let ladderIdx = 0;
    for (let i = 0; i < correct.length; i++) {
      if (i > 0 && Math.abs(correct[i].elapsed - correct[i - 1].elapsed) < 0.05) {
        ranked.push({ ...correct[i], points: ranked[i - 1].points, place: ranked[i - 1].place });
      } else {
        ranked.push({
          ...correct[i],
          points: pointsLadder[ladderIdx] || 10,
          place: ladderIdx + 1,
        });
        ladderIdx += 1;
      }
    }
    ranked.forEach((r) => addScore(r.teamId, r.points));
    game.tangToc.ranked = ranked;
    game.display.answerRevealed = true;
    game.display.answer = q.answer;
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
    game.tangToc = { submissions: {}, ranked: [] };
    game.puzzle = emptyPuzzle();
    game.veDich = { packagePoints: 20, star: false, answeringTeam: "a", stealOpen: false };
    if (game.round === "vuot_cnv") game.display.mode = "puzzle";
    saveDb();
    emit();
  }

  export { currentQuestion, keywordPoints };
