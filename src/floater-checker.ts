import type { FloatRecord } from "./floater.types";
import { Floater } from "./floater.enum";

const DEFAULT_FLOAT_PROTECTION = 2;

/**
 * Checks whether a Player can float this Round
 *
 * @param direction The float direction to check eligibility for (ASC or DESC)
 * @param playerHistory The player's pairing history; each entry records whether they floated that round
 * @param protection How many recent rounds to check for a prior float (default 2). Pass 0 to skip the check and always allow floating.
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
