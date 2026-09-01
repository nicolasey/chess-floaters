import type { FloatRecord } from "./floater.types";
import { Floater, Unplayed } from "./floater.enum";

const DEFAULT_FLOAT_PROTECTION = 2;
const KNOWN_ENTRIES = new Set<unknown>([
  ...Object.values(Floater),
  ...Object.values(Unplayed),
]);

/**
 * Art. 1.4: a bye, or any unplayed round scoring more than a loss, is a
 * downfloat. An unplayed round scoring what a loss scores is no float, but the
 * round still happened and still holds its slot in the window.
 */
function floatOf(entry: Floater | Unplayed | null): Floater | null {
  if (entry === Unplayed.BYE) return Floater.DESC;
  if (entry === Unplayed.FORFEIT) return null;
  return entry;
}

/**
 * Checks whether a Player can float this Round
 *
 * @param direction The float direction to check eligibility for (ASC or DESC)
 * @param playerHistory The player's pairing history, chronological and oldest first, one entry per round played or not
 * @param protection How many recent rounds to check for a prior float (default 2). Pass 0 to skip the check and always allow floating.
 * @throws {RangeError} if protection is not a non-negative integer
 * @throws {TypeError} if a record inside the protection window is missing or has a
 *   `floater` that is neither a Floater, an Unplayed nor null. Records older than the
 *   window are never read, and so never validated.
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
    const entry = playerHistory[index]?.floater;
    if (entry !== null && !KNOWN_ENTRIES.has(entry))
      throw new TypeError(
        `playerHistory[${index}].floater must be a Floater, an Unplayed or null, got ${String(entry)}`,
      );

    if (floatOf(entry) === direction)
      return false;
  }
  return true;
}
