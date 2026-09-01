import { test, expect } from "bun:test";
import type { FloatRecord } from "../src/floater.types";
import { Floater, Unplayed } from "../src/floater.enum";
import { canFloat, floatCriterion } from "../src/floater-checker";

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

// FL-11 — art. 1.4: a bye, or any unplayed round scoring above a loss, is a
// downfloat. The library resolves that itself; callers record the round as it
// happened rather than translating it to a direction.
test("FL-11: a_bye_counts_as_a_downfloat", () => {
  const history: FloatRecord[] = [{ floater: null }, { floater: Unplayed.BYE }];

  expect(canFloat(Floater.DESC, history)).toBeFalse();
  // A downfloat, not a float in both directions — C.15 is untouched.
  expect(canFloat(Floater.ASC, history)).toBeTrue();

  // Indistinguishable from a downfloat earned over the board, which is the point.
  expect(canFloat(Floater.DESC, [{ floater: null }, { floater: Floater.DESC }])).toBeFalse();
});

// FL-12 — an unplayed round scoring what a loss scores is no float, but the
// round still happened and still holds its slot.
test("FL-12: a_forfeit_is_no_float_but_still_holds_its_slot", () => {
  const history: FloatRecord[] = [
    { floater: Floater.DESC },
    { floater: Unplayed.FORFEIT },
    { floater: Unplayed.FORFEIT },
  ];

  // The downfloat is three rounds back, so the window no longer reaches it.
  expect(canFloat(Floater.DESC, history)).toBeTrue();

  // Drop the two forfeits and the same tournament reads as a fresh downfloat:
  // the slots are what keeps the window aligned.
  expect(canFloat(Floater.DESC, [{ floater: Floater.DESC }])).toBeFalse();
});

// FL-13 — what BYE and FORFEIT cannot fix. An omitted round leaves no trace:
// the window counts array slots, and the library has no round number to check
// them against.
test("FL-13: an_omitted_round_is_undetectable_and_reads_permissively", () => {
  // Rounds 1-2 clean, round 3 a bye. C.14 restricts a downfloat now.
  const correct: FloatRecord[] = [
    { floater: null },
    { floater: null },
    { floater: Unplayed.BYE },
  ];

  expect(canFloat(Floater.DESC, correct)).toBeFalse();

  // Leave the bye round out and the verdict flips the unsafe way, with nothing
  // to distinguish the result from a legitimate two-round history.
  const roundOmitted: FloatRecord[] = [{ floater: null }, { floater: null }];

  expect(canFloat(Floater.DESC, roundOmitted)).toBeTrue();
});

// FL-10 — C.14–C.17 are quality criteria, minimised in priority order, so an
// engine needs to know *which* one a float would breach, not merely that one
// would. Round distance is the outer key: C.14/C.15 both outrank C.16/C.17.
test("FL-10: floatCriterion_names_the_criterion_a_float_would_breach", () => {
  const previous = (floater: Floater): FloatRecord[] => [
    { floater: null },
    { floater },
  ];
  const twoBack = (floater: Floater): FloatRecord[] => [
    { floater },
    { floater: null },
  ];

  expect(floatCriterion(Floater.DESC, previous(Floater.DESC))).toBe("C14");
  expect(floatCriterion(Floater.ASC, previous(Floater.ASC))).toBe("C15");
  expect(floatCriterion(Floater.DESC, twoBack(Floater.DESC))).toBe("C16");
  expect(floatCriterion(Floater.ASC, twoBack(Floater.ASC))).toBe("C17");

  // Direction-matched and window-bounded, exactly as canFloat is.
  expect(floatCriterion(Floater.ASC, previous(Floater.DESC))).toBeNull();
  expect(
    floatCriterion(Floater.DESC, [
      { floater: Floater.DESC },
      { floater: null },
      { floater: null },
    ]),
  ).toBeNull();

  // The nearest float wins: C.14 is reported over the C.16 behind it.
  expect(
    floatCriterion(Floater.DESC, [{ floater: Floater.DESC }, { floater: Unplayed.BYE }]),
  ).toBe("C14");
});

// FL-20 — FIDE relaxes quality criteria one at a time down the priority order,
// so every step of that sequence has to be expressible. A round count cannot
// reach the two steps that split a round: enforcing C.14 while tolerating C.15.
test("FL-20: canFloat_accepts_a_criterion_as_the_strictness_level", () => {
  const downfloatedLastRound: FloatRecord[] = [{ floater: null }, { floater: Floater.DESC }];
  const upfloatedLastRound: FloatRecord[] = [{ floater: null }, { floater: Floater.ASC }];

  // "C17" enforces all four; "C15" enforces the previous-round pair.
  expect(canFloat(Floater.DESC, downfloatedLastRound, "C17")).toBeFalse();
  expect(canFloat(Floater.DESC, downfloatedLastRound, "C15")).toBeFalse();

  // "C14" is the step a round count cannot express: downfloat repeats still
  // forbidden, upfloat repeats already tolerated.
  expect(canFloat(Floater.DESC, downfloatedLastRound, "C14")).toBeFalse();
  expect(canFloat(Floater.ASC, upfloatedLastRound, "C14")).toBeTrue();
  expect(canFloat(Floater.ASC, upfloatedLastRound, "C15")).toBeFalse();

  // And the two levels that do have a numeric equivalent agree with it.
  const twoBack: FloatRecord[] = [{ floater: Floater.DESC }, { floater: null }];
  expect(canFloat(Floater.DESC, twoBack, "C17")).toBe(canFloat(Floater.DESC, twoBack, 2));
  expect(canFloat(Floater.DESC, twoBack, "C15")).toBe(canFloat(Floater.DESC, twoBack, 1));
});

// FL-20 — an unknown level must not read as a blanket verdict either way.
test("FL-20: an_unknown_strictness_level_is_refused", () => {
  const history: FloatRecord[] = [{ floater: Floater.DESC }];

  // @ts-expect-error — the type forbids it; the guard is for untyped callers.
  expect(() => canFloat(Floater.DESC, history, "C99")).toThrow(RangeError);
  // @ts-expect-error
  expect(() => canFloat(Floater.DESC, history, "all")).toThrow(RangeError);
});
