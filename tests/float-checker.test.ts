import { test, expect } from "bun:test";
import type { FloatRecord } from "../floater.types";
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
