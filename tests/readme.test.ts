import { test, expect } from "bun:test";
import type { FloatRecord } from "../src/floater.types.js";
import { Floater, Unplayed } from "../src/floater.enum.js";
import { canFloat, floatCriterion } from "../src/floater-checker.js";
import { recordFor } from "../src/float-record.js";
import { floatCostOfPair } from "../src/float-pair.js";

/**
 * Mirrors every example in README.md, so a claimed output has to be true.
 *
 * Wrong output comments have shipped three times, all authoring mistakes rather
 * than drift: a `protection: 1` documented as true against a history returning
 * false, two floatCriterion examples disagreeing about the same call, and a
 * headline contradicting the compliance section below it.
 *
 * These are copies, not extractions — the README is prose and cannot be
 * executed. Change an example there, change it here.
 */

const lastRound: FloatRecord[] = [{ floater: null }, { floater: Floater.DESC }];
const twoBack: FloatRecord[] = [{ floater: Floater.DESC }, { floater: null }];

test("README: decision 1, the resident left unpaired", () => {
  expect(canFloat(Floater.DESC, lastRound)).toBeFalse();
  expect(floatCriterion(Floater.DESC, lastRound)).toBe("C14");
});

test("README: decision 2, a proposed pairing", () => {
  const mdp: FloatRecord[] = [{ floater: null }, { floater: Floater.DESC }];
  const resident: FloatRecord[] = [{ floater: null }, { floater: Floater.ASC }];

  expect(
    floatCostOfPair({
      a: { score: 3, history: mdp },
      b: { score: 2, history: resident },
    }),
  ).toEqual({
    scoreDifference: 1,
    downfloater: { player: "a", direction: Floater.DESC, criteria: ["C18"] },
    upfloater: { player: "b", direction: Floater.ASC, criteria: ["C15", "C19"] },
  });
});

test("README: building the history", () => {
  const history: FloatRecord[] = [
    recordFor({ playerScore: 0, opponentScore: 0 }),
    recordFor({ playerScore: 1, opponentScore: 0 }),
    { floater: Unplayed.BYE },
  ];

  expect(history).toEqual([
    { floater: null },
    { floater: Floater.DESC },
    { floater: Unplayed.BYE },
  ]);
});

test("README: floatCriterion", () => {
  const upfloated: FloatRecord[] = [{ floater: null }, { floater: Floater.ASC }];

  expect(floatCriterion(Floater.DESC, lastRound)).toBe("C14");
  expect(floatCriterion(Floater.DESC, twoBack)).toBe("C16");
  expect(floatCriterion(Floater.DESC, lastRound, "mdp")).toBe("C18");
  expect(floatCriterion(Floater.ASC, upfloated)).toBe("C15");
  expect(floatCriterion(Floater.ASC, lastRound)).toBeNull();
});

test("README: canFloat strictness", () => {
  expect(canFloat(Floater.DESC, twoBack)).toBeFalse();
  expect(canFloat(Floater.DESC, twoBack, 1)).toBeTrue();
  expect(canFloat(Floater.DESC, twoBack, 0)).toBeTrue();
  expect(canFloat(Floater.DESC, twoBack, "C16")).toBeFalse();
  expect(canFloat(Floater.DESC, twoBack, "C15")).toBeTrue();
});
