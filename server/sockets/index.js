import { publicState } from "../services/state.service.js";
import * as game from "../services/game.service.js";

export function registerSockets(io) {
  io.on("connection", (socket) => {
    socket.emit("game:state", game.publicGame());
    socket.emit("prelim:update", publicState());

    socket.on("buzzer:press", (payload) => {
      if (!payload?.teamId) return;
      game.pressBuzzer(payload.teamId);
    });

    socket.on("tangtoc:submit", (payload) => {
      if (!payload?.teamId) return;
      game.submitTangToc(payload.teamId, payload.answer);
    });

    socket.on("khoidong:submit", (payload) => {
      if (!payload?.teamId) return;
      game.submitKhoiDong(payload.teamId, payload.answer);
    });
  });
}
