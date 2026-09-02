import { useEffect, useState } from "react";
import { on as onEvent } from "./socket.js";
import { bedKindFromGame, isAudioUnlocked, playSfx, setBed, setSoundPack, unlockAudio } from "./audio.js";

export function useAudienceAudio(state) {
  const [audioOn, setAudioOn] = useState(isAudioUnlocked);

  useEffect(() => {
    setSoundPack(state?.sounds);
  }, [state?.sounds]);

  useEffect(() => {
    return onEvent("sound:play", (p) => playSfx(p?.slot));
  }, []);

  useEffect(() => {
    setBed(bedKindFromGame(state?.game));
  }, [
    state?.game?.round,
    state?.game?.phase,
    state?.game?.questionStatus,
    state?.game?.khoiDong?.phase,
    state?.game?.tangToc?.phase,
    state?.game?.display?.mode,
    state?.game?.display?.mediaUrl,
    state?.game?.puzzle?.keywordWindow,
    state?.sounds,
    audioOn,
  ]);

  function enableAudio() {
    unlockAudio();
    setAudioOn(true);
  }

  return { audioOn, enableAudio };
}
