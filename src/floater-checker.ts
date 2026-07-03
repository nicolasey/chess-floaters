import type { FloatRecord } from "./floater.types";
import { Floater } from "./floater.enum";

const DEFAULT_FLOAT_PROTECTION = 2;

/**
 * Checks whether a Player can float this Round
 *
 * @param direction The float direction to check eligibility for
 * @param playerHistory FloatRecord[] More likely a PlayedGame[] that implements this type
 * @param protection Level of protection | defaults to 2 | some systems reduces protection to find pairings
 */
export function canFloat(
  direction: Floater,
  playerHistory: FloatRecord[],
  protection = DEFAULT_FLOAT_PROTECTION,
) {
  for (
    let index = playerHistory.length - 1;
    index >= Math.max(0, playerHistory.length - protection);
    index--
  ) {
    if (playerHistory[index].floater === direction)
      return false;
  }
  return true;
}
