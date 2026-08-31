import { test, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";

/**
 * Expectations that cannot be asserted from inside this package, cited here so
 * docs/fide-float-rules.md and the suite cannot drift apart.
 *
 * FL-1 (art. 1.4) — after two players with different scores meet, the higher
 * ranked one receives a downfloat and the lower one an upfloat. That mapping
 * happens before `canFloat` is called: the library is handed a direction and a
 * history, never a pairing, so it cannot check the direction was derived right.
 *
 * FL-11 (art. 1.4) — a pairing-allocated bye, and any unplayed round scoring
 * more than a loss, is a downfloat. FL-12 — an unplayed round scoring what a
 * loss scores is no float, but the round still happened and still needs a slot.
 * Both are encoding rules for the caller. A `{ floater: DESC }` from a bye is
 * indistinguishable in here from one earned over the board, which is the point;
 * what the library cannot see is the round that was never pushed. FL-13 pins
 * that failure instead.
 *
 * FL-19 (C.14/C.16 vs C.15/C.17) — the downfloat criteria apply to the resident
 * downfloater and the upfloat criteria to the MDP opponent. `canFloat` sees one
 * player, so choosing which side to test with which direction is the caller's.
 *
 * FL-18 (C.18–C.21) — score-difference tie-breaks, out of scope: they need the
 * bracket scores, and this package only ever sees float directions.
 */

/**
 * The doc's Test column is hand-written and would otherwise rot silently. This
 * makes it mechanical: every rule ID in docs/fide-float-rules.md must be cited
 * somewhere under tests/ — as a test name, or as a comment explaining why no
 * test is possible.
 */
test("every rule in docs/fide-float-rules.md is cited by a test", () => {
  const doc = readFileSync("docs/fide-float-rules.md", "utf8");
  // \d+ rather than \d: a two-digit id would not match at all, so the gate
  // would pass by ignoring it instead of by covering it.
  const ids = [...new Set(doc.match(/\bFL-\d+\b/g) ?? [])].sort();

  const suite = readdirSync("tests")
    .filter((file) => file.endsWith(".ts"))
    .map((file) => readFileSync(`tests/${file}`, "utf8"))
    .join("\n");

  // Guard against the regex quietly matching nothing.
  expect(ids.length).toBeGreaterThan(15);
  expect(ids.filter((id) => !suite.includes(id))).toEqual([]);
});
