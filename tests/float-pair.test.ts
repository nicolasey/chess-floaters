import { test, expect } from "bun:test";
import type { FloatRecord } from "../src/floater.types.js";
import { Floater, Unplayed } from "../src/floater.enum.js";
import { floatCostOfPair } from "../src/float-pair.js";

const clean: FloatRecord[] = [{ floater: null }, { floater: null }];
const downfloatedLastRound: FloatRecord[] = [{ floater: null }, { floater: Floater.DESC }];
const upfloatedLastRound: FloatRecord[] = [{ floater: null }, { floater: Floater.ASC }];
const upfloatedTwoBack: FloatRecord[] = [{ floater: Floater.ASC }, { floater: null }];

// FL-23 — art. 1.4 from the pair, not from a direction the caller picked. The
// higher score downfloats, the lower upfloats; FL-19's wrong-side error becomes
// unrepresentable.
test("FL-23: the_pair_decides_who_floats_which_way", () => {
  const result = floatCostOfPair({
    a: { score: 2, history: clean },
    b: { score: 3, history: clean },
  });

  expect(result.downfloater?.player).toBe("b");
  expect(result.downfloater?.direction).toBe(Floater.DESC);
  expect(result.upfloater?.player).toBe("a");
  expect(result.upfloater?.direction).toBe(Floater.ASC);

  // Argument order must not change who floats which way.
  const swapped = floatCostOfPair({
    a: { score: 3, history: clean },
    b: { score: 2, history: clean },
  });
  expect(swapped.downfloater?.player).toBe("a");
  expect(swapped.upfloater?.player).toBe("b");
});

// FL-23 — equal scores are not a float in either direction (art. 1.4 is
// conditioned on *different* scores), so there is nothing to measure.
test("FL-23: an_equal_scored_pair_floats_neither_way", () => {
  const result = floatCostOfPair({
    a: { score: 2.5, history: downfloatedLastRound },
    b: { score: 2.5, history: upfloatedLastRound },
  });

  expect(result).toEqual({ scoreDifference: 0, downfloater: null, upfloater: null });
});

// FL-24 — scoreDifference is |a.score - b.score|: the size of the float, and the
// key C.18-C.21 order by. Symmetric by construction.
test("FL-24: scoreDifference_is_the_absolute_gap_between_the_pair", () => {
  const gap = (a: number, b: number) =>
    floatCostOfPair({ a: { score: a, history: clean }, b: { score: b, history: clean } })
      .scoreDifference;

  expect(gap(3, 2)).toBe(1);
  expect(gap(2, 3)).toBe(1);
  expect(gap(2.5, 2)).toBe(0.5);
  expect(gap(0, 0)).toBe(0);
});

// FL-25 — the two sides answer to different families. The downfloater is an MDP
// relative to this pairing, so C.18/C.20 and no count criterion at all. The
// upfloater is an MDP opponent, so a count *and* its score-difference shadow.
test("FL-25: each_side_gets_its_own_family_of_criteria", () => {
  const result = floatCostOfPair({
    a: { score: 3, history: downfloatedLastRound },
    b: { score: 2, history: upfloatedLastRound },
  });

  expect(result.downfloater?.criteria).toEqual(["C18"]);
  expect(result.upfloater?.criteria).toEqual(["C15", "C19"]);

  // Two rounds back moves both families down a notch.
  const older = floatCostOfPair({
    a: { score: 3, history: [{ floater: Unplayed.BYE }, { floater: null }] },
    b: { score: 2, history: upfloatedTwoBack },
  });

  expect(older.downfloater?.criteria).toEqual(["C20"]);
  expect(older.upfloater?.criteria).toEqual(["C17", "C21"]);
});

// FL-25 — C.14/C.16 never appear here: they bind a resident left *unpaired*,
// which is not a pairing. A clean history engages nothing.
test("FL-25: a_pairing_never_engages_C14_or_C16", () => {
  const result = floatCostOfPair({
    a: { score: 3, history: downfloatedLastRound },
    b: { score: 2, history: clean },
  });

  expect(result.downfloater?.criteria).not.toContain("C14");
  expect(result.upfloater?.criteria).toEqual([]);
});

// FL-24 — a score that is not a score must not read as "no float", the same
// guard recordFor and canFloat carry.
test("FL-24: an_unusable_score_is_refused", () => {
  for (const bad of [NaN, Infinity, -1]) {
    expect(() =>
      floatCostOfPair({ a: { score: bad, history: clean }, b: { score: 1, history: clean } }),
    ).toThrow(RangeError);
    expect(() =>
      floatCostOfPair({ a: { score: 1, history: clean }, b: { score: bad, history: clean } }),
    ).toThrow(RangeError);
  }

  expect(() =>
    floatCostOfPair({ a: { score: 1, history: clean }, b: { score: NaN, history: clean } }),
  ).toThrow(/b\.score/);
});
