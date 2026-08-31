# FIDE float rules → expectations

Rules this library is supposed to implement, each turned into a concrete,
checkable expectation. Every expectation has a stable ID so a test can cite it
and coverage gaps stay visible.

## Sources

| Chapter | Revision used | Link |
|---|---|---|
| C.04.3 FIDE (Dutch) System | effective 1 February 2026 | [handbook.fide.com](https://handbook.fide.com/chapter/C0403202602) |

Two scope notes:

- **The Dutch system is assumed.** FIDE approves several Swiss systems, and the
  float criteria are not identical across them. This library implements the
  Dutch one, the FIDE default.
- **The February 2026 revision renumbered everything.** The four float criteria
  are C.14–C.17 here; the 2017 text numbered them C.10–C.13 with the same
  wording. Older references map straight across.

Rules below are paraphrased for readability. Cite the article and read the
handbook before changing behaviour.

## Vocabulary

| Term | Definition | This codebase |
|---|---|---|
| Downfloat | Given to the higher ranked of two players with different scores who meet (1.4) | `Floater.DESC` (`↓`) |
| Upfloat | Given to the lower ranked of that pair (1.4) | `Floater.ASC` (`↑`) |
| Downfloater | A player who remains unpaired in a bracket and is thus moved to the next one (1.4) | — the caller's bracket logic |
| MDP | Moved-down player: one who remained unpaired after the previous bracket was paired | — the caller's bracket logic |
| PAB | Pairing-allocated bye: no opponent, no colour, as many points as a win (1.5) | encode as `{ floater: Floater.DESC }` |
| Protection window | The reach of C.14–C.17: the previous round and two rounds before | `protection`, default `2` |

## Float criteria — `canFloat`

The four criteria the library exists to serve, verbatim:

> **[C14]** Minimise the number of resident downfloaters who received a downfloat the previous round.
> **[C15]** Minimise the number of MDP opponents who received an upfloat the previous round.
> **[C16]** Minimise the number of resident downfloaters who received a downfloat two rounds before.
> **[C17]** Minimise the number of MDP opponents who received an upfloat two rounds before.

| ID | Art. | Rule | Expected behaviour | Test | Status |
|---|---|---|---|---|---|
| FL-1 | 1.4 | Of two different-scored players who meet, the higher ranked downfloats, the lower upfloats | caller derives the direction | n/a | ⚠️ caller contract |
| FL-2 | C.14 | A downfloat **the previous round** restricts a downfloat now | `[…, DESC]` → `false` | `FL-2:` | ✅ |
| FL-3 | C.16 | A downfloat **two rounds before** restricts a downfloat now | `[…, DESC, null]` → `false` | `when_player_has_floatted_desc_lately`, `when_player_floated_like_boat` | ✅ |
| FL-4 | C.15 | An upfloat **the previous round** restricts an upfloat now | `[…, ASC]` → `false` | `when_player_floated_like_boat`, `when_history_shorter_than_protection_window` | ✅ |
| FL-5 | C.17 | An upfloat **two rounds before** restricts an upfloat now | `[ASC, null]` → `false` | `when_player_has_floatted_asc` | ✅ |
| FL-6 | C.14–C.17 | The window stops at two rounds — a float three rounds back restricts nothing | `[DESC, null, null, null]` → `true` | `when_player_has_floatted_desc_long_ago`, `when_player_floated_just_outside_protection_window` | ✅ |
| FL-7 | C.14–C.17 | Direction-matched: past downfloats never restrict an upfloat, and the reverse | `[…, DESC]` → `canFloat(ASC)` is `true` | `when_player_has_floatted_asc`, `when_player_has_floatted_desc_lately` | ✅ |
| FL-8 | C.14–C.17 | No float in the window → both directions allowed | `[]` and `[null, null, null]` → `true` | `when_history_is_empty`, `when_player_has_not_floatted` | ✅ |
| FL-9 | — | These are quality criteria, so the check must be relaxable | `protection` 1 narrows the window, 0 disables it | `when_I_reduce_protection`, `when_I_disable_protection` | ✅ |
| FL-10 | C.14–C.17 | Round distance outranks direction, so the four positions must be **rankable**, not just pass/fail | previous-round repeat costs more than a two-rounds-back one | `FL-10:` | ✅ recipe pinned |
| FL-19 | C.14/C.16 vs C.15/C.17 | Downfloat criteria bind the resident downfloater, upfloat criteria the MDP opponent | caller tests both sides of the pair | n/a | ⚠️ caller contract |

FL-10 is the shape mismatch worth understanding before building on this. C.14–C.17
sit in the *quality* block; only C.1–C.3 are absolute, and FIDE guarantees a legal
pairing exists precisely because quality criteria give way when nothing satisfies
them. A boolean models an absolute prohibition, so an engine that reads `false` as
"forbidden" can dead-end on a bracket FIDE calls pairable, and the priority order
(C.14 ≻ C.15 ≻ C.16 ≻ C.17) is flattened away. Use it as a cost function:

```ts
// 0 = clean, 1 = repeats a float from two rounds back (C.16/C.17),
// 2 = repeats one from the previous round (C.14/C.15) — the costlier violation.
const cost = canFloat(dir, history, 1) ? (canFloat(dir, history, 2) ? 0 : 1) : 2;
```

Then sort candidate pairings by that cost and take the cheapest, rather than
discarding everything with `cost > 0`. FL-10 exists so this advertised recipe is
defended by a test and not just by prose.

## History encoding

Article 1.4 again:

> A downfloat is also given to any player who receives a pairing-allocated bye
> or who, without playing in a round, scores more points than those rewarded for
> a loss.

So byes are downfloats, and the window counts **array slots, not round numbers**.

| ID | Art. | Rule | Expected behaviour | Test | Status |
|---|---|---|---|---|---|
| FL-11 | 1.4 | A PAB, or any unplayed round scoring above a loss, is a downfloat | push `{ floater: DESC }` | n/a | ⚠️ caller contract |
| FL-12 | 1.4 | An unplayed round scoring what a loss scores is no float — but the round still happened | push `{ floater: null }`, never nothing | n/a | ⚠️ caller contract |
| FL-13 | — | Getting FL-11/FL-12 wrong flips the verdict the **permissive** way, and is undetectable from in here | a dropped bye round turns a `false` into `true` | `FL-13:` | ⚠️ hazard pinned, not prevented |

One record per round, played or not:

| That round | Record |
|---|---|
| Played a lower-scored opponent | `{ floater: Floater.DESC }` |
| Played a higher-scored opponent | `{ floater: Floater.ASC }` |
| Played someone on the same score | `{ floater: null }` |
| Pairing-allocated bye, half-point bye | `{ floater: Floater.DESC }` |
| Unplayed, scoring what a loss scores (forfeit, absence) | `{ floater: null }` |

## Input validation

| ID | Art. | Rule | Expected behaviour | Test | Status |
|---|---|---|---|---|---|
| FL-14 | — | An unusable window must not read as "float allowed" | `-1`, `1.5`, `NaN`, `Infinity` → `RangeError` | `when_protection_is_invalid` | ✅ |
| FL-15 | — | An unreadable round must not read as "float allowed" either | `{}`, `{floater: "x"}`, array hole → `TypeError` | `when_a_record_in_the_window_is_malformed` | ✅ |
| FL-16 | — | Only records actually read are validated — an older dirty tail cannot change the verdict, so it cannot throw | garbage outside the window, `protection` 0 or 2 → no throw | `when_a_malformed_record_is_outside_the_window` | ✅ |
| FL-17 | — | A history shorter than the window neither under-reads nor crashes | `[ASC]` with `protection` 2 → `false` | `when_history_shorter_than_protection_window`, `..._and_no_float` | ✅ |

## Out of scope

| ID | Art. | Rule | Why not here | Status |
|---|---|---|---|---|
| FL-18 | C.18–C.21 | Minimise the score differences of repeated floats, as a tie-break once C.14–C.17 are equal | needs the bracket scores; this package only ever sees float directions | ⛔ |

Also out of scope, and not given IDs: C.1–C.13 (rematches, colour preferences,
the PAB assignee, bracket completion, topscorers), acceleration (C.04.5 Baku),
and every non-Dutch pairing system. All of that lives in your pairing engine.

## Coverage summary

| Status | Count | IDs |
|---|---|---|
| ✅ correct and covered | 14 | FL-2…FL-10, FL-13…FL-17 |
| ⚠️ caller contract, no in-library check | 4 | FL-1, FL-11, FL-12, FL-19 |
| ⛔ out of scope | 1 | FL-18 |

**Four expectations cannot be tested at all, and they share one cause:** this
package sees a direction and one player's float history, never a pairing and
never a round number. It cannot check that the direction was derived from the
right side of the pair (FL-1, FL-19), nor that a round it was never handed
existed (FL-11, FL-12). Those are caller contracts with no in-library check,
written down rather than left looking covered.

FL-13 is the closest this gets to defending them: it pins the *shape* of the
failure — always permissive, never conservative — so the hazard is executable
rather than a paragraph. It does not prevent it.

Every ID above must appear somewhere under `tests/`; the gate in
`tests/fide-traceability.test.ts` fails the suite if one does not.

Citation proves a rule is *mentioned*, not that it is *defended*. Nothing here
runs a mutation check yet — worth adding if this file grows.
