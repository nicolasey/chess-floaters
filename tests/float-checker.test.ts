import { test, expect } from "bun:test";
import type { FloatRecord } from "../src/floater.types";
import { Floater } from "../src/floater.enum";
import { canFloat } from "../src/floater-checker";

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

test("when_history_shorter_than_protection_window", () => {
  const history: FloatRecord[] = [
    { floater: Floater.ASC },
  ];

  const result = canFloat(Floater.ASC, history);
  expect(result).toBeFalse();
  const desc = canFloat(Floater.DESC, history);
  expect(desc).toBeTrue();
});

test("when_history_shorter_than_protection_window_and_no_float", () => {
  const history: FloatRecord[] = [
    { floater: null },
  ];

  const result = canFloat(Floater.ASC, history);
  expect(result).toBeTrue();
  const desc = canFloat(Floater.DESC, history);
  expect(desc).toBeTrue();
});

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

test("when_history_is_empty", () => {
  const history: FloatRecord[] = [];

  expect(canFloat(Floater.ASC, history)).toBeTrue();
  expect(canFloat(Floater.DESC, history)).toBeTrue();
});

test("when_player_floated_just_outside_protection_window", () => {
  const history: FloatRecord[] = [
    { floater: null },
    { floater: Floater.DESC }, // exactly one round too old to matter
    { floater: null },
    { floater: null },
  ];

  expect(canFloat(Floater.DESC, history)).toBeTrue();
});

test("when_protection_is_invalid", () => {
  const history: FloatRecord[] = [{ floater: Floater.DESC }];

  for (const bad of [-1, 1.5, NaN, Infinity]) {
    expect(() => canFloat(Floater.DESC, history, bad)).toThrow(RangeError);
  }
});
