import type { FloatRecord } from "./floater.types";
import { Floater } from "./floater.enum";

const DEFAULT_FLOAT_PROTECTION = 2;
const FLOAT_DIRECTIONS = new Set<unknown>(Object.values(Floater));

/**
 * Checks whether a Player can float this Round
 *
 * @param direction The float direction to check eligibility for (ASC or DESC)
 * @param playerHistory The player's pairing history; each entry records whether they floated that round
 * @param protection How many recent rounds to check for a prior float (default 2). Pass 0 to skip the check and always allow floating.
 * @throws {RangeError} if protection is not a non-negative integer
 * @throws {TypeError} if a record inside the protection window is missing or has a
 *   `floater` that is neither a Floater nor null. Records older than the window are
 *   never read, and so never validated.
 */
export function canFloat(
  direction: Floater,
  playerHistory: FloatRecord[],
  protection = DEFAULT_FLOAT_PROTECTION,
) {
  // ponytail: reject rather than clamp — Math.max(0, protection) would silently
  // turn garbage into "float allowed", the unsafe direction for a pairing rule.
  if (!Number.isInteger(protection) || protection < 0)
    throw new RangeError(
      `protection must be a non-negative integer, got ${protection}`,
    );

  for (
    let index = playerHistory.length - 1;
    index >= Math.max(0, playerHistory.length - protection);
    index--
  ) {
    // ponytail: same argument as above — an unrecognised record matches no
    // direction and would read as "float allowed". Byes are downfloats (FIDE
    // Art. 1.4), so a dropped or malformed round is a real pairing error.
    const float = playerHistory[index]?.floater;
    if (float !== null && !FLOAT_DIRECTIONS.has(float))
      throw new TypeError(
        `playerHistory[${index}].floater must be a Floater or null, got ${String(float)}`,
      );

    if (float === direction)
      return false;
  }
  return true;
}
