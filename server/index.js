import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { config } from "./config/env.js";
import { connectDb } from "./config/database.js";
import { loadDb, saveDbSync } from "./models/store.js";
import { setIo } from "./config/io.js";
import { registerSockets } from "./sockets/index.js";
import * as game from "./services/game.service.js";

await connectDb();
await loadDb();

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
setIo(io);
game.setBroadcast((event, payload) => io.emit(event, payload));
game.startTimerLoop();
registerSockets(io);

server.listen(config.port, () => {
  console.log(`Máy chủ cuộc thi chạy tại http://localhost:${config.port}`);
});
