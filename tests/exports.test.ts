import { test, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import * as api from "../index.js";

/**
 * The mechanical half of the documentation re-read in CLAUDE.md: every exported
 * name must appear somewhere in the README.
 *
 * It catches an export nobody documented — `recordFor`, `FloatCriterion` and
 * `FloatProtection` all shipped that way once. It cannot tell whether what the
 * README says about them is still true, which is why the rule asks for a read.
 */
test("every export is named in the README", () => {
  const readme = readFileSync("README.md", "utf8");

  // Object.keys sees only runtime exports. Two of the three names that shipped
  // undocumented were types, which are erased — so read those off the source.
  const types = readdirSync("src")
    .filter((file) => file.endsWith(".ts"))
    .flatMap((file) => [
      ...readFileSync(`src/${file}`, "utf8").matchAll(/^export type (\w+)/gm),
    ])
    .map(([, name]) => name);

  const exported = [...new Set([...Object.keys(api), ...types])];

  // Guard against either source resolving to nothing and the check passing empty.
  expect(Object.keys(api).length).toBeGreaterThan(3);
  expect(types.length).toBeGreaterThan(2);
  expect(exported.filter((name) => !readme.includes(name))).toEqual([]);
});
