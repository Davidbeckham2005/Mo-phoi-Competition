const PIN_KEY = "cuocthi_pin";
const CONTESTANT_KEY = "cuocthi_contestant";

export function getPin() {
  return localStorage.getItem(PIN_KEY) || "";
}

export function setPin(pin) {
  localStorage.setItem(PIN_KEY, pin);
}

export function getContestant() {
  try {
    return JSON.parse(localStorage.getItem(CONTESTANT_KEY) || "null");
  } catch {
    return null;
  }
}

export function setContestant(c) {
  localStorage.setItem(CONTESTANT_KEY, JSON.stringify(c));
}
