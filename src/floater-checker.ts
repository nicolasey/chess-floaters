import type { FloatRecord } from "./floater.types.js";
import { Floater, Unplayed } from "./floater.enum.js";

const DEFAULT_FLOAT_PROTECTION = 2;
const KNOWN_ENTRIES = new Set<unknown>([
  ...Object.values(Floater),
  ...Object.values(Unplayed),
]);

/**
 * The four FIDE (Dutch) float criteria, in the order the pairing rules rank
 * them — C.14 is the costliest to breach, C.17 the cheapest.
 *
 * - **C14** minimise resident downfloaters who downfloated the previous round
 * - **C15** minimise MDP opponents who upfloated the previous round
 * - **C16** minimise resident downfloaters who downfloated two rounds before
 * - **C17** minimise MDP opponents who upfloated two rounds before
 */
export type FloatCriterion = "C14" | "C15" | "C16" | "C17";

const PRIORITY: Record<FloatCriterion, number> = { C14: 0, C15: 1, C16: 2, C17: 3 };

/** How strict to be: a round count, or the least-priority criterion to enforce. */
export type FloatProtection = number | FloatCriterion;

/** Round distance is the outer key: C.14/C.15 both outrank C.16/C.17. */
function criterionFor(direction: Floater, distance: number): FloatCriterion {
  if (distance === 1) return direction === Floater.DESC ? "C14" : "C15";
  return direction === Floater.DESC ? "C16" : "C17";
}

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
 * Rounds back to the player's nearest float in this direction, 1 being the
 * previous round, or null if there is none within `within` rounds.
 */
function distanceToFloat(
  direction: Floater,
  playerHistory: FloatRecord[],
  within: number,
): number | null {
  const last = playerHistory.length - 1;

  for (let index = last; index >= Math.max(0, playerHistory.length - within); index--) {
    // ponytail: same argument as the RangeError below — an unrecognised record
    // matches no direction and would read as "float allowed". Byes are
    // downfloats (art. 1.4), so a malformed round is a real pairing error.
    const entry = playerHistory[index]?.floater;
    if (entry !== null && !KNOWN_ENTRIES.has(entry))
      throw new TypeError(
        `playerHistory[${index}].floater must be a Floater, an Unplayed or null, got ${String(entry)}`,
      );

    if (floatOf(entry) === direction) return last - index + 1;
  }
  return null;
}

/**
 * Which float criterion this player would breach by floating in this direction,
 * or null if none would be.
 *
 * C.14–C.17 are *quality* criteria: FIDE minimises them in priority order and
 * relaxes them when no pairing satisfies them, so a pairing engine needs to
 * know which one is at stake, not merely that one is. Rank candidate pairings
 * by the criterion returned and take the cheapest.
 *
 * @param direction The float direction to test (ASC or DESC)
 * @param playerHistory Chronological, oldest first, one entry per round played or not
 * @throws {TypeError} if a record inside the two-round window is missing or has a
 *   `floater` that is neither a Floater, an Unplayed nor null
 */
export function floatCriterion(
  direction: Floater,
  playerHistory: FloatRecord[],
): FloatCriterion | null {
  // The criteria reach two rounds back and no further, whatever `canFloat`'s
  // caller asks of it.
  const distance = distanceToFloat(direction, playerHistory, 2);
  return distance === null ? null : criterionFor(direction, distance);
}

/**
 * Checks whether a Player can float this Round, at a given level of strictness.
 *
 * @param direction The float direction to check eligibility for (ASC or DESC)
 * @param playerHistory Chronological, oldest first, one entry per round played or not
 * @param protection How strict to be. A number is a count of recent rounds to scan
 *   (default 2, the reach of C.14–C.17); pass 0 to skip the check entirely. A
 *   {@link FloatCriterion} is the least-priority criterion still enforced, which
 *   is how FIDE relaxes them — `"C17"` enforces all four, `"C14"` only the
 *   costliest.
 * @throws {RangeError} if a numeric protection is not a non-negative integer
 * @throws {TypeError} if a record inside the window is missing or has a `floater`
 *   that is neither a Floater, an Unplayed nor null. Records older than the
 *   window are never read, and so never validated.
 */
export function canFloat(
  direction: Floater,
  playerHistory: FloatRecord[],
  protection: FloatProtection = DEFAULT_FLOAT_PROTECTION,
) {
  if (typeof protection !== "number") {
    // Unguarded, an unknown criterion makes PRIORITY[protection] undefined and
    // every comparison false — a blanket "cannot float" that looks deliberate.
    if (!Object.hasOwn(PRIORITY, protection))
      throw new RangeError(
        `protection must be a round count or one of C14, C15, C16, C17, got ${String(protection)}`,
      );

    const breached = floatCriterion(direction, playerHistory);
    return breached === null || PRIORITY[breached] > PRIORITY[protection];
  }

  // ponytail: reject rather than clamp — Math.max(0, protection) would silently
  // turn garbage into "float allowed", the unsafe direction for a pairing rule.
  if (!Number.isInteger(protection) || protection < 0)
    throw new RangeError(
      `protection must be a non-negative integer, got ${protection}`,
    );

  return distanceToFloat(direction, playerHistory, protection) === null;
}
