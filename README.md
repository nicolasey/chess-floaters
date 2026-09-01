# @nicolasey/chess-floaters

Float restrictions for Swiss-system chess pairings, per the FIDE (Dutch) system.

Your engine owns the brackets, the scores and the pairings. This package owns
**floats**: given a player's recent history, which FIDE criterion a downfloat or
an upfloat would engage, and how much it costs. It names all eight float
criteria, C.14 through C.21.

In a Swiss tournament, a player pulled into a higher score group floats **up**
(`↑`), one pushed into a lower group floats **down** (`↓`). FIDE restricts
repeating a float within the last two rounds, but **never forbids it**:
C.14–C.17 are quality criteria, relaxed when no pairing satisfies them, and
C.18–C.21 only order candidates by how far the player was moved. That is why a
legal pairing always exists — and why nothing here returns a verdict you cannot
overrule.

## Install

```bash
bun add @nicolasey/chess-floaters
# or
npm install @nicolasey/chess-floaters
```

> Ships compiled ESM in `dist/` with declaration files. Works with Bun, Node and
> any bundler, including `moduleResolution: "node16"`/`"nodenext"`.

## Quick start

A pairing engine makes two decisions where floats matter. Each has one call.

### 1. "Which resident do I leave unpaired?"

That player will be moved down a bracket, so they downfloat. C.14 and C.16 apply.

```ts
import { canFloat, floatCriterion, Floater } from "@nicolasey/chess-floaters";

canFloat(Floater.DESC, player.floatHistory);       // false — restricted
floatCriterion(Floater.DESC, player.floatHistory); // "C14" — by which criterion
```

Prefer `floatCriterion` when you have several candidates: it tells you *which*
criterion is at stake, so you can pick the cheapest instead of discarding every
candidate that fails. `canFloat` is the yes/no form, useful once you have fixed
how strict to be.

### 2. "Is this proposed pairing costly?"

Pass both players. The package works out who floats which way — art. 1.4 makes
the higher score downfloat and the lower upfloat — so you never pick a side or a
direction yourself.

```ts
import { floatCostOfPair } from "@nicolasey/chess-floaters";

floatCostOfPair({
  a: { score: 3, history: mdp.floatHistory },
  b: { score: 2, history: resident.floatHistory },
});
// {
//   scoreDifference: 1,
//   downfloater: { player: "a", direction: "↓", criteria: ["C18"] },
//   upfloater:   { player: "b", direction: "↑", criteria: ["C15", "C19"] },
// }
```

The two sides answer to different criteria, which is the part most easily got
backwards:

| Side | Criteria | Why |
|---|---|---|
| downfloater | C.18, C.20 | it is a moved-down player; **no count criterion covers it** |
| upfloater | C.15, C.17 by count, plus C.19, C.21 by score difference | it is an MDP opponent, and both families engage at once |

C.14 and C.16 never appear here. They bind a resident being left *unpaired*,
which is not a pairing at all — decision 1, not decision 2.

### Ranking candidates

FIDE compares whole candidate pairings: the counts in criterion order first
(C.14, then C.15, C.16, C.17), then the score-difference sequences taken in
descending order and compared element by element. That comparison needs every
pairing in a bracket at once, so it is yours to make. This package gives you the
per-pair costs it operates on: which criteria, and the score difference.

## Building the history

Every call takes a `FloatRecord[]`, chronological and oldest first, with **one
entry per round played or not**. An omitted round shifts the two-round lookback
window and cannot be detected from inside the library.

```ts
import { recordFor, Unplayed, type FloatRecord } from "@nicolasey/chess-floaters";

const history: FloatRecord[] = [
  recordFor({ playerScore: 0, opponentScore: 0 }), // round 1: level pairing
  recordFor({ playerScore: 1, opponentScore: 0 }), // round 2: beat a lower score
  { floater: Unplayed.BYE },                       // round 3: bye
];
```

| That round | Record |
|---|---|
| Played an opponent, any score | `recordFor({ playerScore, opponentScore })` |
| Pairing-allocated bye, half-point bye | `{ floater: Unplayed.BYE }` |
| Unplayed, scoring what a loss scores (forfeit, absence, zero-point bye) | `{ floater: Unplayed.FORFEIT }` |

`Unplayed.BYE` counts as a downfloat and `Unplayed.FORFEIT` as no float, per
FIDE art. 1.4 — the library applies that, so record the round as it happened
rather than translating it. The split is by **points, not by label**: a
zero-point bye scores what a loss scores, so it is a `FORFEIT` here.

Your own round objects can extend `FloatRecord` — only `floater` is read.

## API

### `floatCostOfPair({ a, b }): PairFloats`

Every float criterion a proposed pairing engages, for both players. Each side is
`{ score, history }`.

Returns `scoreDifference` — `|a.score - b.score|`, the size of the float and the
key C.18–C.21 order by — plus a `downfloater` and an `upfloater`, each naming
which of the two arguments it is, its direction, and its criteria. Equal scores
float neither way: `scoreDifference` is `0` and both sides are `null`.

### `floatCriterion(direction, playerHistory, role?): FloatCriterion | null`

Names the criterion a float in that direction would engage, or `null` if none
would. `role` defaults to `"resident"`.

```ts
const lastRound = [{ floater: null }, { floater: Floater.DESC }];
const twoBack = [{ floater: Floater.DESC }, { floater: null }];
const upfloated = [{ floater: null }, { floater: Floater.ASC }];

floatCriterion(Floater.DESC, lastRound);        // "C14" — resident left unpaired
floatCriterion(Floater.DESC, twoBack);          // "C16" — same, cheaper
floatCriterion(Floater.DESC, lastRound, "mdp"); // "C18" — same history, moved down
floatCriterion(Floater.ASC, upfloated);         // "C15" — an MDP opponent
floatCriterion(Floater.ASC, lastRound);         // null  — direction-matched
```

An upfloat takes no role: an MDP opponent is always a resident, and an MDP
outscores its bracket, so it downfloats whenever paired there and can never
upfloat. Asking anyway throws rather than returning a plausible `"C15"`.

### `canFloat(direction, playerHistory, protection?): boolean`

`true` if the float is permitted at that strictness — either the player did not
float that way inside the window, or the criterion it would engage is one you no
longer enforce.

`protection` is how strict to be, and defaults to `2`:

```ts
// twoBack: downfloated two rounds ago, nothing since.
canFloat(Floater.DESC, twoBack);        // false — default 2, C.16 reaches it
canFloat(Floater.DESC, twoBack, 1);     // true  — only look back one round
canFloat(Floater.DESC, twoBack, 0);     // true  — disabled
canFloat(Floater.DESC, twoBack, "C16"); // false — enforced down to C.16
canFloat(Floater.DESC, twoBack, "C15"); // true  — C.16 given up, same as 1
```

A criterion means "the least-priority one still enforced", which is how FIDE
relaxes them. It reaches two steps a round count cannot: a count cannot split a
round, so it cannot enforce C.14 while tolerating C.15.

Only C.14–C.17 are accepted. C.18–C.21 order a bucket rather than refuse a
pairing, so there is no threshold to set them at — ask `floatCostOfPair` or
`floatCriterion` for those.

### `recordFor({ playerScore, opponentScore }): FloatRecord`

The record for a round that was **played**, per FIDE art. 1.4: the higher-scored
player downfloats, the lower upfloats, equal scores float neither way. Pass the
scores as they stood when the round was paired.

Takes an object rather than two positional numbers on purpose: swapping them
would otherwise produce the opposite float, confidently and in silence.

### Errors

Nothing unusable is allowed to read as "float allowed":

| Thrown | When |
|---|---|
| `RangeError` | a score that is not finite and non-negative; a `protection` that is neither a non-negative integer nor an enforceable criterion; an unknown `role`; an MDP asked about an upfloat |
| `TypeError` | a record inside the lookback window that is missing, or whose `floater` is neither a `Floater`, an `Unplayed` nor `null` |

Records older than the window are never read, and so never validated.

### Types

```ts
enum Floater { ASC = "↑", DESC = "↓" }
enum Unplayed { BYE = "BYE", FORFEIT = "FORFEIT" }

type FloatRecord = { floater: Floater | Unplayed | null };
type FloatCriterion = "C14" | "C15" | "C16" | "C17" | "C18" | "C19" | "C20" | "C21";
type EnforceableCriterion = Extract<FloatCriterion, "C14" | "C15" | "C16" | "C17">;
type FloatProtection = number | EnforceableCriterion;
type PlayerRole = "resident" | "mdp";
type PairCandidate = { score: number; history: FloatRecord[] };
type FloatSide = { player: "a" | "b"; direction: Floater; criteria: FloatCriterion[] };
type PairFloats = {
  scoreDifference: number;
  downfloater: FloatSide | null;
  upfloater: FloatSide | null;
};
```

`FloatCriterion` is ordered as FIDE ranks the criteria: C.14 is the costliest to
engage, C.21 the cheapest.

## FIDE compliance

All eight float criteria are named. What stays out is the comparison *between*
candidate pairings, which needs a whole bracket at once.

Read [docs/fide-float-rules.md](./docs/fide-float-rules.md) before building on
this: every rule is a numbered expectation with the test that defends it, or a
written reason why none can exist.

Reference: [FIDE Handbook C.04.3](https://handbook.fide.com/chapter/C0403202602),
revision effective 1 February 2026.

## Development

```bash
bun install
bun test
bunx tsc --noEmit
```
