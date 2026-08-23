import { useEffect, useState } from "react";
import { getPublicState } from "./api/public.js";
import { on } from "./socket.js";

export function useGameState() {
  const [state, setState] = useState(null);
  const [timer, setTimer] = useState(null);

  useEffect(() => {
    getPublicState().then(setState).catch(() => {});
    const off1 = on("game:state", (next) => {
      setState((prev) => ({ ...(prev || {}), ...next }));
    });
    const off2 = on("game:timer", setTimer);
    const off3 = on("prelim:update", (next) => {
      setState((prev) => ({ ...(prev || {}), ...next }));
    });
    return () => {
      off1();
      off2();
      off3();
    };
  }, []);

  return { state, timer };
}
