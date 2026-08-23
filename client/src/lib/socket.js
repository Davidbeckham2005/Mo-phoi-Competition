import { io } from "socket.io-client";

export const socket = io({
  transports: ["websocket", "polling"],
});

export function on(event, handler) {
  socket.on(event, handler);
  return () => socket.off(event, handler);
}
