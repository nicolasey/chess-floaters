import { Floatter } from "./src/floatter.enum";

export type FloatMarker = Floatter.ASC | Floatter.DESC;

/**
 * In both Game Participants, it must be indicated if any, if player is floating
 */
export type PlayerPairingFloatContract = {
  floater: FloatMarker | null;
}
