import type { Floater, Unplayed } from "./floater.enum";

/**
 * One round in a player's history, played or not.
 *
 * Records must be chronological, oldest first, with no round left out — a
 * missing round shifts the protection window and cannot be detected from in
 * here. Unplayed rounds are recorded as `Unplayed`, never omitted.
 */
export type FloatRecord = {
  floater: Floater | Unplayed | null;
};
