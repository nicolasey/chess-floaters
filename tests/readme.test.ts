import { test, expect } from "bun:test";
import type { FloatRecord } from "../src/floater.types";
import { Floater, Unplayed } from "../src/floater.enum";
import { canFloat, floatCriterion } from "../src/floater-checker";
import { recordFor } from "../src/float-record";

/**
 * Mirrors every example in README.md, so a claimed output has to be true.
 *
 * Two wrong output comments shipped before this existed, both authoring
 * mistakes rather than drift: `protection: 1` was documented as `true` against a
 * history that returns `false`, and a `floatCriterion` call was documented as
 * "C14" against a history that returns "C16". Neither would have survived here.
 *
 * These are copies, not extractions — the README is prose and cannot be
 * executed. Change an example there, change it here.
 */

test("README: usage", () => {
  const history: FloatRecord[] = [
    recordFor({ playerScore: 0, opponentScore: 0 }),
    { floater: Unplayed.BYE },
    recordFor({ playerScore: 2, opponentScore: 2 }),
  ];

  expect(canFloat(Floater.DESC, history)).toBeFalse();
  expect(canFloat(Floater.ASC, history)).toBeTrue();
  expect(floatCriterion(Floater.DESC, history)).toBe("C16");
  expect(floatCriterion(Floater.DESC, history, "mdp")).toBe("C20");
});

test("README: canFloat", () => {
  const floated: FloatRecord[] = [{ floater: null }, { floater: Floater.DESC }];

  expect(canFloat(Floater.DESC, floated)).toBeFalse();
  expect(canFloat(Floater.DESC, floated, 0)).toBeTrue();
});

test("README: floatCriterion and the strictness ladder", () => {
  const lastRound: FloatRecord[] = [{ floater: null }, { floater: Floater.DESC }];
  const twoBack: FloatRecord[] = [{ floater: Floater.DESC }, { floater: null }];

  expect(floatCriterion(Floater.DESC, lastRound)).toBe("C14");
  expect(floatCriterion(Floater.DESC, twoBack)).toBe("C16");
  expect(floatCriterion(Floater.ASC, lastRound)).toBeNull();

  expect(canFloat(Floater.DESC, lastRound, "C17")).toBeFalse();
  expect(canFloat(Floater.DESC, lastRound, "C16")).toBeFalse();
  expect(canFloat(Floater.DESC, lastRound, "C15")).toBeFalse();
  expect(canFloat(Floater.DESC, lastRound, "C14")).toBeFalse();
  expect(canFloat(Floater.ASC, twoBack, "C16")).toBeTrue();

  // The two equivalences the README claims between the criterion and count forms.
  expect(canFloat(Floater.DESC, lastRound, "C17")).toBe(canFloat(Floater.DESC, lastRound, 2));
  expect(canFloat(Floater.DESC, lastRound, "C15")).toBe(canFloat(Floater.DESC, lastRound, 1));
});

test("README: recordFor", () => {
  expect(recordFor({ playerScore: 2.5, opponentScore: 2 })).toEqual({ floater: Floater.DESC });
  expect(recordFor({ playerScore: 2, opponentScore: 2.5 })).toEqual({ floater: Floater.ASC });
  expect(recordFor({ playerScore: 3, opponentScore: 3 })).toEqual({ floater: null });
});

test("README: floatCriterion roles", () => {
  const lastRound: FloatRecord[] = [{ floater: null }, { floater: Floater.DESC }];
  const twoBack: FloatRecord[] = [{ floater: Floater.DESC }, { floater: null }];

  expect(floatCriterion(Floater.DESC, lastRound, "mdp")).toBe("C18");
  expect(floatCriterion(Floater.DESC, twoBack, "mdp")).toBe("C20");
});
