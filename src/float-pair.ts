import type { FloatRecord } from "./floater.types.js";
import { Floater } from "./floater.enum.js";
import { floatCriterion, type FloatCriterion } from "./floater-checker.js";

/** A player as a proposed pairing sees them: a score, and how they have floated. */
export type PairCandidate = {
  score: number;
  history: FloatRecord[];
};

/** One side of a proposed pair, once it is known which way they float. */
export type FloatSide = {
  /** Which of the two arguments this is. */
  player: "a" | "b";
  direction: Floater;
  /**
   * Every criterion this side's float history engages, most severe first.
   * Empty when the float does not repeat a recent one.
   */
  criteria: FloatCriterion[];
};

/**
 * The float consequences of pairing two players, from FIDE art. 1.4 and the
 * criteria that follow from it.
 *
 * `scoreDifference` is `|a.score - b.score|`: the size of the float, and the key
 * C.18–C.21 order by. It is 0 when neither player floats.
 */
export type PairFloats = {
  scoreDifference: number;
  /** The higher-scored player, or null when the scores are equal. */
  downfloater: FloatSide | null;
  /** The lower-scored player, or null when the scores are equal. */
  upfloater: FloatSide | null;
};

/** The score-difference criterion that shadows each count criterion. */
const SCORE_DIFFERENCE_OF: Partial<Record<FloatCriterion, FloatCriterion>> = {
  C15: "C19",
  C17: "C21",
};

/**
 * Names every float criterion a proposed pairing engages, for both players.
 *
 * Deriving it from the pair rather than from a direction the caller picked is
 * what keeps the two sides straight: art. 1.4 makes the higher-scored player the
 * downfloater and the lower one the upfloater, and each answers to a different
 * family of criteria.
 *
 * - The **downfloater** is by definition moved down relative to its opponent, so
 *   its downfloat history answers to C.18/C.20 — score differences, no count.
 * - The **upfloater** is an MDP opponent, so its upfloat history answers to
 *   C.15/C.17 by count *and* C.19/C.21 by score difference. Both engage at once.
 *
 * C.14/C.16 are deliberately absent: they bind a resident being left *unpaired*,
 * which is not a pairing at all. Ask {@link floatCriterion} for those — and note
 * that they are the one population with no score-difference criterion, precisely
 * because there is no pair to measure.
 *
 * @throws {RangeError} if either score is not a finite, non-negative number
 * @throws {TypeError} if a record inside either player's window is unreadable
 */
export function floatCostOfPair(pair: {
  a: PairCandidate;
  b: PairCandidate;
}): PairFloats {
  for (const side of ["a", "b"] as const) {
    const { score } = pair[side];
    if (!Number.isFinite(score) || score < 0)
      throw new RangeError(
        `${side}.score must be a finite, non-negative number, got ${score}`,
      );
  }

  const scoreDifference = Math.abs(pair.a.score - pair.b.score);
  if (scoreDifference === 0)
    return { scoreDifference: 0, downfloater: null, upfloater: null };

  const [high, low] = pair.a.score > pair.b.score ? (["a", "b"] as const) : (["b", "a"] as const);

  // The higher-scored player of a mixed pair is, relative to this pairing, a
  // moved-down player — which is what puts it under C.18/C.20 rather than C.14.
  const down = floatCriterion(Floater.DESC, pair[high].history, "mdp");
  const up = floatCriterion(Floater.ASC, pair[low].history);

  return {
    scoreDifference,
    downfloater: {
      player: high,
      direction: Floater.DESC,
      criteria: down ? [down] : [],
    },
    upfloater: {
      player: low,
      direction: Floater.ASC,
      // Count first, then the score-difference criterion that shadows it —
      // C.15 before C.19, C.17 before C.21, as FIDE ranks them.
      criteria: up ? [up, SCORE_DIFFERENCE_OF[up]!] : [],
    },
  };
}
