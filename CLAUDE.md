# chess-floaters

## What this repo is for

Three objectives, in priority order. Weigh every change against them.

1. **Cover FIDE's float rules as completely and as readably as possible, on
   behalf of a client Swiss pairing engine.** The engine owns brackets, scores
   and pairings; this package owns one player's float history and nothing else.
   Completeness is measured against the handbook, not against what feels done —
   and where a rule cannot be covered from in here, say so rather than let it
   look covered.
2. **Assert that coverage in the documentation, efficiently and legibly.**
   `docs/fide-float-rules.md` is the source of truth: every rule is a numbered
   `FL-` expectation with the test that defends it, or a written reason why none
   can exist. A claim of coverage with nothing behind it is worse than an
   admitted gap.
3. **Make it easy for any TypeScript developer to use.** Types that make the
   wrong call unrepresentable, errors that name what is wrong, no FIDE
   background required to read the README, and resolution that works under any
   `moduleResolution`.

Small surface, high precision cost: a wrong answer here becomes a non-compliant
pairing in someone's tournament. Objective 1 is why the guards throw instead of
guessing, objective 2 is why the rule below exists.

## Every PR gets a documentation re-read

**Before opening a PR that touches `src/`, re-read `README.md` and
`docs/fide-float-rules.md` end to end.** Not a diff review — a read of the
finished files, as a newcomer would.

This is a rule because the tests cannot cover it. Prose has no output to assert,
so a paragraph can contradict the code, or contradict another paragraph three
sections away, with the suite fully green. It has happened three times:

- a `protection: 1` example documented as `true` against a history returning
  `false`, wrong from the day it was written
- two `floatCriterion` examples in one file disagreeing about the same call
- a headline announcing "criteria C.14–C.17" while the compliance section below
  said six of eight

Each was found by someone re-reading the file, never by CI.

What to check, in order of how often it has actually broken:

1. **Claims that contradict each other.** The headline against the body, the API
   table against the prose under it. New scope tends to land in one place only.
2. **Output comments in examples.** Every one is asserted in
   `tests/readme.test.ts` — add the assertion when you add the example, and run
   it rather than reasoning about the value.
3. **New exports.** Documented in the README, with their throws and params.
   `tests/exports.test.ts` catches an undocumented name but not a stale
   description.
4. **Scope statements.** "Six of eight criteria", coverage counts, the ⛔ rows —
   check them against `docs/fide-float-rules.md`, which is the source of truth.
5. **Rule IDs.** A new expectation needs an `FL-` id, a row, and a citation in
   `tests/`. The gate in `tests/fide-traceability.test.ts` enforces the citation,
   not the accuracy.

## Conventions

- **Never let garbage read as "float allowed".** Every guard in `src/` exists
  because an unusable input that silently permits a float is worse than a throw.
  New inputs get the same treatment.
- **Quote FIDE, do not recall it.** Fetch the handbook chapter and quote the
  article. Two real defects in this repo came from a plausible paraphrase.
- **Mark deliberate simplifications** with a `ponytail:` comment naming the
  ceiling.

## Checks

```bash
bun test
bunx tsc --noEmit
```
