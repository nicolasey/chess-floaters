import { test, expect } from "bun:test";
import type { FloatRecord } from "../src/floater.types";
import { Floater } from "../src/floater.enum";
import { canFloat } from "../src/floater-checker";

// FL-5, FL-7
test("when_player_has_floatted_asc", () => {
  const history: FloatRecord[] = [
    { floater: Floater.ASC },
    { floater: null },
  ];

  const desc = canFloat(Floater.DESC, history);
  expect(desc).toBeTrue();
  const result = canFloat(Floater.ASC, history);
  expect(result).toBeFalse();
});

// FL-3, FL-7
test("when_player_has_floatted_desc_lately", () => {
  const history: FloatRecord[] = [
    { floater: null },
    { floater: null },
    { floater: Floater.DESC },
    { floater: null },
  ];

  const result = canFloat(Floater.DESC, history);
  expect(result).toBeFalse();
  const asc = canFloat(Floater.ASC, history);
  expect(asc).toBeTrue();
});

// FL-6
test("when_player_has_floatted_desc_long_ago", () => {
  const history: FloatRecord[] = [
    { floater: Floater.DESC },
    { floater: null },
    { floater: null },
    { floater: null },
  ];

  const result = canFloat(Floater.DESC, history);
  expect(result).toBeTrue();
  const asc = canFloat(Floater.ASC, history);
  expect(asc).toBeTrue();
});

// FL-8
test("when_player_has_not_floatted", () => {
  const history: FloatRecord[] = [
    { floater: null },
    { floater: null },
    { floater: null },
  ];

  const desc = canFloat(Floater.DESC, history);
  expect(desc).toBeTrue();
  const asc = canFloat(Floater.ASC, history);
  expect(asc).toBeTrue();
});

// FL-3, FL-4
test("when_player_floated_like_boat", () => {
  const history: FloatRecord[] = [
    { floater: null },
    { floater: null },
    { floater: Floater.DESC },
    { floater: Floater.ASC },
  ];

  const result = canFloat(Floater.DESC, history);
  expect(result).toBeFalse();
  const asc = canFloat(Floater.ASC, history);
  expect(asc).toBeFalse();
});

// FL-9
test("when_I_reduce_protection", () => {
  const history: FloatRecord[] = [
    { floater: null },
    { floater: null },
    { floater: Floater.DESC },
    { floater: Floater.ASC },
  ];

  const result = canFloat(Floater.DESC, history, 1);
  expect(result).toBeTrue();
  const asc = canFloat(Floater.ASC, history, 1);
  expect(asc).toBeFalse();
});

// FL-4, FL-17
test("when_history_shorter_than_protection_window", () => {
  const history: FloatRecord[] = [
    { floater: Floater.ASC },
  ];

  const result = canFloat(Floater.ASC, history);
  expect(result).toBeFalse();
  const desc = canFloat(Floater.DESC, history);
  expect(desc).toBeTrue();
});

// FL-17
test("when_history_shorter_than_protection_window_and_no_float", () => {
  const history: FloatRecord[] = [
    { floater: null },
  ];

  const result = canFloat(Floater.ASC, history);
  expect(result).toBeTrue();
  const desc = canFloat(Floater.DESC, history);
  expect(desc).toBeTrue();
});

// FL-9
test("when_I_disable_protection", () => {
  const history: FloatRecord[] = [
    { floater: null },
    { floater: null },
    { floater: Floater.DESC },
    { floater: Floater.ASC },
  ];

  const result = canFloat(Floater.DESC, history, 0);
  expect(result).toBeTrue();
  const asc = canFloat(Floater.ASC, history, 0);
  expect(asc).toBeTrue();
});

// FL-8
test("when_history_is_empty", () => {
  const history: FloatRecord[] = [];

  expect(canFloat(Floater.ASC, history)).toBeTrue();
  expect(canFloat(Floater.DESC, history)).toBeTrue();
});

// FL-6
test("when_player_floated_just_outside_protection_window", () => {
  const history: FloatRecord[] = [
    { floater: null },
    { floater: Floater.DESC }, // exactly one round too old to matter
    { floater: null },
    { floater: null },
  ];

  expect(canFloat(Floater.DESC, history)).toBeTrue();
});

// FL-14
test("when_protection_is_invalid", () => {
  const history: FloatRecord[] = [{ floater: Floater.DESC }];

  for (const bad of [-1, 1.5, NaN, Infinity]) {
    expect(() => canFloat(Floater.DESC, history, bad)).toThrow(RangeError);
  }
});

// FL-15
test("when_a_record_in_the_window_is_malformed", () => {
  for (const bad of [{}, { floater: undefined }, { floater: "x" }, { floater: 0 }]) {
    const history = [bad, { floater: null }] as FloatRecord[];
    expect(() => canFloat(Floater.DESC, history)).toThrow(TypeError);
  }

  const sparse = new Array(2) as FloatRecord[];
  expect(() => canFloat(Floater.DESC, sparse)).toThrow(TypeError);
});

// FL-16
test("when_a_malformed_record_is_outside_the_window", () => {
  // ponytail: only records actually read are validated — a dirty tail older
  // than the protection window cannot change the verdict, so it cannot throw.
  const history = [{}, { floater: null }, { floater: null }] as FloatRecord[];

  expect(canFloat(Floater.DESC, history)).toBeTrue();
  expect(() => canFloat(Floater.DESC, history, 3)).toThrow(TypeError);
  expect(canFloat(Floater.DESC, history, 0)).toBeTrue();
});

// FL-2 — C.14, the costliest of the four float criteria. Every other downfloat
// test here puts the float two rounds back; this one pins the nearest slot.
test("FL-2: a_downfloat_in_the_previous_round_blocks_a_downfloat", () => {
  const history: FloatRecord[] = [{ floater: null }, { floater: Floater.DESC }];

  expect(canFloat(Floater.DESC, history)).toBeFalse();
  expect(canFloat(Floater.DESC, history, 1)).toBeFalse();
  expect(canFloat(Floater.ASC, history)).toBeTrue();
});

// FL-10 — C.14–C.17 are quality criteria, minimised in priority order, so the
// docs tell callers to rank candidates by cost instead of filtering on the
// boolean. That recipe is advertised; without this it is not defended.
const floatCost = (direction: Floater, history: FloatRecord[]) =>
  canFloat(direction, history, 1) ? (canFloat(direction, history, 2) ? 0 : 1) : 2;

test("FL-10: the_documented_cost_recipe_ranks_the_four_float_criteria", () => {
  const clean: FloatRecord[] = [
    { floater: Floater.DESC }, // three rounds back: outside the window
    { floater: null },
    { floater: null },
  ];
  const twoBack: FloatRecord[] = [
    { floater: null },
    { floater: Floater.DESC },
    { floater: null },
  ];
  const previous: FloatRecord[] = [
    { floater: null },
    { floater: null },
    { floater: Floater.DESC },
  ];

  expect(floatCost(Floater.DESC, clean)).toBe(0);
  expect(floatCost(Floater.DESC, twoBack)).toBe(1); // C.16
  expect(floatCost(Floater.DESC, previous)).toBe(2); // C.14 outranks C.16

  // Same ladder one notch down the priority list, C.17 then C.15.
  const upTwoBack = twoBack.map((r) => (r.floater ? { floater: Floater.ASC } : r));
  const upPrevious = previous.map((r) => (r.floater ? { floater: Floater.ASC } : r));

  expect(floatCost(Floater.ASC, upTwoBack)).toBe(1);
  expect(floatCost(Floater.ASC, upPrevious)).toBe(2);
});

// FL-13 — the hazard behind FL-11/FL-12, pinned rather than fixed. The window
// counts array slots, not round numbers, so a round the caller never pushed is
// undetectable from in here.
test("FL-13: dropping_a_bye_round_flips_the_verdict_the_permissive_way", () => {
  // Rounds 1-2 clean, round 3 a pairing-allocated bye. Art. 1.4 makes that bye
  // a downfloat in the previous round, so C.14 restricts a downfloat now.
  const correct: FloatRecord[] = [
    { floater: null },
    { floater: null },
    { floater: Floater.DESC }, // the PAB
  ];

  expect(canFloat(Floater.DESC, correct)).toBeFalse();

  // Two ways to encode it wrongly. Both read as "float allowed" — the unsafe
  // direction — and neither is distinguishable from a legitimate history.
  const roundDropped: FloatRecord[] = [{ floater: null }, { floater: null }];
  const byeRecordedAsNoFloat: FloatRecord[] = [
    { floater: null },
    { floater: null },
    { floater: null },
  ];

  expect(canFloat(Floater.DESC, roundDropped)).toBeTrue();
  expect(canFloat(Floater.DESC, byeRecordedAsNoFloat)).toBeTrue();
});
