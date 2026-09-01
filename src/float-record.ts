import type { FloatRecord } from "./floater.types.js";
import { Floater } from "./floater.enum.js";

/**
 * Builds the history record for a round the player actually played.
 *
 * Art. 1.4: after two players with different scores have played each other, the
 * higher ranked receives a downfloat and the lower one an upfloat. Two players
 * on the same score float neither way.
 *
 * Unplayed rounds do not go through here — record those as `Unplayed.BYE` or
 * `Unplayed.FORFEIT`, which art. 1.4 treats separately.
 *
 * @param scores The two scores as they stood when the round was paired
 * @throws {RangeError} if either score is not a finite, non-negative number
 */
// ponytail: an object rather than two positional numbers — swapping the
// arguments would produce the opposite float, confidently and in silence.
export function recordFor(scores: {
  playerScore: number;
  opponentScore: number;
}): FloatRecord {
  const { playerScore, opponentScore } = scores;

  for (const [name, value] of Object.entries({ playerScore, opponentScore }))
    if (!Number.isFinite(value) || value < 0)
      throw new RangeError(
        `${name} must be a finite, non-negative number, got ${value}`,
      );

  if (playerScore === opponentScore) return { floater: null };
  return { floater: playerScore > opponentScore ? Floater.DESC : Floater.ASC };
}
