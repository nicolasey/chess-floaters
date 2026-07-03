import type { PlayerPairingFloatContract } from "../floater.types";
import { Floater } from "./floater.enum";

/**
 * Checks whether a Player can float this Round
 *
 * @param direction The float direction to check eligibility for
 * @param playerHistory PlayerPairingFloatContract[] More likely a PlayedGame[] that implements this type
 * @param protection Level of protection | defaults to 2 | some systems reduces protection to find pairings
 */
export function canFloat(
  direction: Floater,
  playerHistory: PlayerPairingFloatContract[],
  protection = 2,
) {
  for (
    let index = playerHistory.length - 1;
    index >= playerHistory.length - protection && index >= 0;
    index--
  ) {
    if (
      playerHistory[index].floater &&
      playerHistory[index].floater === direction
    )
      return false;
  }
  return true;
}
