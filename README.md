# @nicolasey/chess-floaters

Float restrictions for Swiss-system chess pairings, per FIDE (Dutch) criteria
C.14–C.17: given one player's recent history, which criterion a downfloat or an
upfloat would breach, and whether that matters at the strictness you are pairing
at.

In a Swiss tournament, a player pulled into a higher score group floats **up**
(`↑`), one pushed into a lower group floats **down** (`↓`). FIDE restricts
repeating the same direction within the last two rounds — it does not *forbid*
it. These are quality criteria, minimised in priority order and relaxed when no
pairing satisfies them, which is why a legal pairing always exists. This package
answers for one player at a time; the bracket logic is yours.

## Install

```bash
bun add @nicolasey/chess-floaters
# or
npm install @nicolasey/chess-floaters
```

> Ships compiled ESM in `dist/` with declaration files, resolved through the
> `exports` map. Works with Bun, Node and any bundler, including
> `moduleResolution: "node16"`/`"nodenext"`.

## Usage

```ts
import {
  canFloat,
  floatCriterion,
  recordFor,
  Floater,
  Unplayed,
  type FloatRecord,
} from "@nicolasey/chess-floaters";

// Oldest round first, most recent last. One entry per round, played or not.
const history: FloatRecord[] = [
  recordFor({ playerScore: 0, opponentScore: 0 }), // round 1: level pairing
  { floater: Unplayed.BYE },                       // round 2: bye — a downfloat
  recordFor({ playerScore: 2, opponentScore: 2 }), // round 3: level again
];

canFloat(Floater.DESC, history); // false — that bye was a downfloat, two rounds back
canFloat(Floater.ASC, history);  // true

floatCriterion(Floater.DESC, history); // "C16" — which criterion is at stake
```

## API

### `canFloat(direction, playerHistory, protection?): boolean`

| Param | Type | Description |
|---|---|---|
| `direction` | `Floater` | Direction to test: `Floater.ASC` (`↑`) or `Floater.DESC` (`↓`) |
| `playerHistory` | `FloatRecord[]` | Chronological history, oldest first, one entry per round played or not |
| `protection` | `FloatProtection` | How strict to be. Default `2` |

Returns `true` if the float is permitted at that strictness — either the player
did not float in that direction inside the window, or the criterion it would
breach is one you are no longer enforcing.

Throws `RangeError` if `protection` is neither a non-negative integer nor a
known criterion, and `TypeError` if a record inside the window is missing or has
a `floater` that is neither a `Floater`, an `Unplayed` nor `null`. Nothing
unusable may silently read as "float allowed". Records older than the window are
never read, and so never validated.

```ts
const floated: FloatRecord[] = [{ floater: null }, { floater: Floater.DESC }];

canFloat(Floater.DESC, floated);    // false — downfloated last round
canFloat(Floater.DESC, floated, 0); // true  — protection disabled
```

### `floatCriterion(direction, playerHistory): FloatCriterion | null`

Names the criterion a float in that direction would breach — `"C14"`, `"C15"`,
`"C16"`, `"C17"` — or `null` if none would be. Rank candidate pairings by what
comes back and take the cheapest, rather than discarding everything that fails:
FIDE minimises these in priority order, so an engine that treats `false` as
"forbidden" can dead-end on a bracket FIDE calls pairable.

```ts
const lastRound: FloatRecord[] = [{ floater: null }, { floater: Floater.DESC }];
const twoBack: FloatRecord[] = [{ floater: Floater.DESC }, { floater: null }];

floatCriterion(Floater.DESC, lastRound); // "C14" — the costliest
floatCriterion(Floater.DESC, twoBack);   // "C16" — same direction, cheaper
floatCriterion(Floater.ASC, lastRound);  // null  — direction-matched
```

`canFloat` also takes a criterion in place of a round count, as the
least-priority one still enforced. That is how FIDE relaxes them, and it reaches
two steps a round count cannot — a count cannot split a round, so it cannot
enforce C.14 while tolerating C.15:

```ts
canFloat(Floater.DESC, lastRound, "C17"); // false — all four enforced, === protection 2
canFloat(Floater.DESC, lastRound, "C16"); // false
canFloat(Floater.DESC, lastRound, "C15"); // false — === protection 1
canFloat(Floater.DESC, lastRound, "C14"); // false — only the costliest left, and this is it
canFloat(Floater.ASC, twoBack, "C16");    // true  — C.17 given up
```

### `recordFor({ playerScore, opponentScore }): FloatRecord`

Builds the record for a round that was **played**, applying FIDE art. 1.4: the
higher-scored player downfloats, the lower upfloats, equal scores float neither
way. Pass the scores as they stood when the round was paired.

Throws `RangeError` if either is not a finite, non-negative number — a score
that is not a score must not read as "no float". Takes an object rather than two
positional numbers on purpose: swapping them would otherwise produce the
opposite float, confidently and in silence.

```ts
recordFor({ playerScore: 2.5, opponentScore: 2 }); // { floater: Floater.DESC }
recordFor({ playerScore: 2, opponentScore: 2.5 }); // { floater: Floater.ASC }
recordFor({ playerScore: 3, opponentScore: 3 });   // { floater: null }
```

### `Floater`

```ts
enum Floater { ASC = "↑", DESC = "↓" }
```

### `Unplayed`

```ts
enum Unplayed { BYE = "BYE", FORFEIT = "FORFEIT" }
```

Rounds that were not played are recorded as these, never omitted. `BYE` counts
as a downfloat and `FORFEIT` as no float, per FIDE art. 1.4 — the library
applies that itself, so record the round as it happened rather than translating
it. The split is by **points, not by label**: a zero-point bye scores what a
loss scores, so it is a `FORFEIT` here.

### `FloatRecord`

```ts
type FloatRecord = { floater: Floater | Unplayed | null };
```

Your own round objects can extend it — only `floater` is read.

Records must be chronological, oldest first, with **no round left out** — an
omitted round shifts the lookback window and cannot be detected from inside the
library.

| That round | Record |
|---|---|
| Played an opponent, any score | `recordFor({ playerScore, opponentScore })` |
| Pairing-allocated bye, half-point bye | `{ floater: Unplayed.BYE }` |
| Unplayed, scoring what a loss scores (forfeit, absence, zero-point bye) | `{ floater: Unplayed.FORFEIT }` |

### `FloatCriterion` and `FloatProtection`

```ts
type FloatCriterion = "C14" | "C15" | "C16" | "C17";
type FloatProtection = number | FloatCriterion;
```

`FloatCriterion` is ordered as FIDE ranks the criteria: C.14 is the costliest to
breach, C.17 the cheapest. As a `protection` value it means "the least-priority
criterion still enforced"; as a number, `protection` is a count of recent rounds
to scan, and `0` disables the check.

## Which criterion binds whom

The downfloat and upfloat criteria attach to two different decisions in bracket
pairing, not to the two ends of one pairing:

| Decision | Player to test | Call |
|---|---|---|
| Which resident do I leave unpaired, to move down a bracket? | that resident | `canFloat(Floater.DESC, …)` — C.14, C.16 |
| Which resident do I pair with a moved-down player? | that resident | `canFloat(Floater.ASC, …)` — C.15, C.17 |

Both are about residents, in two different roles. There is deliberately no
pair-level helper: each decision is one call on one player, and a
`canPairFloat(higher, lower)` would encode a rule FIDE does not state. See
[the traceability doc](./docs/fide-float-rules.md) for the article references.

## FIDE compliance

This package implements the lookback of FIDE (Dutch) criteria C.14–C.17 and
nothing else. Read [docs/fide-float-rules.md](./docs/fide-float-rules.md) before
building a pairing engine on it: every rule is turned into a numbered
expectation with the test that defends it, or a note saying why none can.

## Development

```bash
bun install
bun test
bunx tsc --noEmit
```
