import type { FloatRecord } from "./floater.types";
import { Floater, Unplayed } from "./floater.enum";

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
export type FloatCriterion = "C14" | "C15" | "C16" | "C17" | "C18" | "C20";

/**
 * The criteria that can be *enforced*. C.18 and C.20 are missing on purpose:
 * they minimise score differences, which orders a bucket rather than refusing a
 * pairing, so treating one as a threshold would turn an ordering criterion into
 * a prohibition.
 */
export type EnforceableCriterion = Exclude<FloatCriterion, "C18" | "C20">;

/** How strict to be: a round count, or the least-priority criterion to enforce. */
export type FloatProtection = number | EnforceableCriterion;

/**
 * Whether the player is being looked at as a resident of the bracket or as one
 * moved down into it. The same downfloat history answers to different criteria
 * depending on which (art. 1.3.2).
 */
export type PlayerRole = "resident" | "mdp";

const PRIORITY: Record<FloatCriterion, number> = {
  C14: 0,
  C15: 1,
  C16: 2,
  C17: 3,
  C18: 4,
  // C19 sits here, and C21 after C20 — neither is ever returned, both order by
  // score differences this package does not see.
  C20: 6,
};
const ENFORCEABLE = new Set<unknown>(["C14", "C15", "C16", "C17"]);
const ROLES = new Set<unknown>(["resident", "mdp"]);

/**
 * Round distance is the outer key — C.14/C.15 both outrank C.16/C.17 — and the
 * player's role picks between the two downfloat families. A resident left
 * unpaired answers to C.14/C.16; once moved down, the same player's downfloat
 * history answers to C.18/C.20 instead, which no count criterion covers.
 */
function criterionFor(
  direction: Floater,
  distance: number,
  role: PlayerRole,
): FloatCriterion {
  if (direction === Floater.ASC) return distance === 1 ? "C15" : "C17";
  if (role === "mdp") return distance === 1 ? "C18" : "C20";
  return distance === 1 ? "C14" : "C16";
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
 * A downfloat answers to different criteria depending on `role`: a resident
 * left unpaired is C.14/C.16, while the same player once moved down is
 * C.18/C.20 — the only criteria covering an MDP's own downfloat history, and
 * ones that order by score difference rather than forbid. An upfloat is always
 * C.15/C.17, since an MDP opponent is always a resident.
 *
 * @param direction The float direction to test (ASC or DESC)
 * @param playerHistory Chronological, oldest first, one entry per round played or not
 * @param role Whether the player is a resident of the bracket or moved down into it
 * @throws {TypeError} if a record inside the two-round window is missing or has a
 *   `floater` that is neither a Floater, an Unplayed nor null
 * @throws {RangeError} on an unknown role, or on an MDP asked about an upfloat,
 *   which its score makes impossible
 */
export function floatCriterion(
  direction: Floater,
  playerHistory: FloatRecord[],
  role: PlayerRole = "resident",
): FloatCriterion | null {
  if (!ROLES.has(role))
    throw new RangeError(`role must be "resident" or "mdp", got ${String(role)}`);

  // An MDP outscores the bracket it was moved into, so it downfloats whenever it
  // is paired there and can never upfloat. Answering "C15" would dress an
  // impossible question in a plausible answer.
  if (role === "mdp" && direction === Floater.ASC)
    throw new RangeError(
      "an MDP outscores its bracket and cannot upfloat; ask about the resident it is paired with",
    );

  // The criteria reach two rounds back and no further, whatever `canFloat`'s
  // caller asks of it.
  const distance = distanceToFloat(direction, playerHistory, 2);
  return distance === null ? null : criterionFor(direction, distance, role);
}

/**
 * Checks whether a Player can float this Round, at a given level of strictness.
 *
 * @param direction The float direction to check eligibility for (ASC or DESC)
 * @param playerHistory Chronological, oldest first, one entry per round played or not
 * @param protection How strict to be. A number is a count of recent rounds to scan
 *   (default 2, the reach of C.14–C.17); pass 0 to skip the check entirely. An
 *   {@link EnforceableCriterion} is the least-priority criterion still enforced,
 *   which is how FIDE relaxes them — `"C17"` enforces all four, `"C14"` only the
 *   costliest. C.18 and C.20 are not accepted: they order rather than forbid, so
 *   there is no threshold to set them at. Ask {@link floatCriterion} instead.
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
    // C18 and C20 are refused for a different reason: they order a bucket by
    // score difference and never refuse a pairing, so there is no threshold to
    // set them at.
    if (!ENFORCEABLE.has(protection))
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
