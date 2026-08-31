import { test, expect } from "bun:test";
import type { FloatRecord } from "../src/floater.types";
import { Floater, Unplayed } from "../src/floater.enum";
import { canFloat } from "../src/floater-checker";
import { recordFor } from "../src/float-record";

// FL-1 — art. 1.4, first sentence: of two different-scored players who meet,
// the higher ranked downfloats and the lower upfloats. Deriving that was the
// caller's job until this function existed.
test("FL-1: the_higher_scored_player_downfloats_and_the_lower_upfloats", () => {
  expect(recordFor({ playerScore: 2.5, opponentScore: 2 })).toEqual({
    floater: Floater.DESC,
  });
  expect(recordFor({ playerScore: 2, opponentScore: 2.5 })).toEqual({
    floater: Floater.ASC,
  });
});

// FL-1 — the rule is conditioned on *different* scores. Same score, no float.
test("FL-1: two_players_on_the_same_score_float_neither_way", () => {
  expect(recordFor({ playerScore: 3, opponentScore: 3 })).toEqual({
    floater: null,
  });
  expect(recordFor({ playerScore: 0, opponentScore: 0 })).toEqual({
    floater: null,
  });
});

// FL-1 — a score that is not a score must not read as "no float", the same
// argument that guards `protection` and the history records.
test("FL-1: an_unusable_score_is_refused_rather_than_read_as_no_float", () => {
  for (const bad of [NaN, Infinity, -Infinity, -1]) {
    expect(() => recordFor({ playerScore: bad, opponentScore: 1 })).toThrow(RangeError);
    expect(() => recordFor({ playerScore: 1, opponentScore: bad })).toThrow(RangeError);
  }

  // The message must name the offending side, or a swap is undiagnosable.
  expect(() => recordFor({ playerScore: 1, opponentScore: NaN })).toThrow(
    /opponentScore/,
  );
});

// FL-1 — what the records are for: they feed straight into canFloat, mixed with
// the unplayed rounds that do not go through recordFor.
test("FL-1: the_records_it_builds_drive_canFloat", () => {
  const history: FloatRecord[] = [
    recordFor({ playerScore: 1, opponentScore: 1 }), // round 1: level pairing
    { floater: Unplayed.FORFEIT }, // round 2: absent, scored a loss
    recordFor({ playerScore: 1, opponentScore: 0.5 }), // round 3: downfloat
  ];

  expect(canFloat(Floater.DESC, history)).toBeFalse();
  expect(canFloat(Floater.ASC, history)).toBeTrue();
});
