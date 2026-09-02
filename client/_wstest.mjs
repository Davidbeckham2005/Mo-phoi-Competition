import { io } from "socket.io-client";
const s = io("http://localhost:3001", { transports: ["websocket"], timeout: 5000 });
s.on("game:state", (st) => {
  console.log("GAME:STATE settings:", JSON.stringify(st.settings));
  s.close();
  process.exit(0);
});
s.on("connect_error", (e) => { console.log("CONN ERR", e.message); process.exit(1); });
setTimeout(() => { console.log("TIMEOUT"); process.exit(1); }, 6000);