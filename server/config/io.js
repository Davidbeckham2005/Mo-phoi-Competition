let io = null;

export function setIo(serverIo) {
  io = serverIo;
}

export function getIo() {
  return io;
}

export function emitEvent(event, payload) {
  io?.emit(event, payload);
}
