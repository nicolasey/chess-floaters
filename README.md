# @nicolasey/chess-floaters

Float protection for Swiss-system chess pairings: tells you whether a player may
float up or down this round, given their recent pairing history.

In a Swiss tournament, a player pulled into a higher score group floats **up**
(`↑`), one pushed into a lower group floats **down** (`↓`). Pairing rules
usually forbid repeating the same float direction within the last few rounds —
that check is all this package does.

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
import { canFloat, Floater, Unplayed, type FloatRecord } from "@nicolasey/chess-floaters";

// Oldest round first, most recent last. One entry per round, played or not:
// byes count as downfloats. See docs/fide-float-rules.md.
const history: FloatRecord[] = [
  { floater: null },          // round 1: no float
  { floater: Unplayed.BYE }   // round 2: bye — a downfloat under art. 1.4
];

canFloat(Floater.DESC, history); // false — floated down too recently
canFloat(Floater.ASC, history);  // true

canFloat(Floater.DESC, history, 1); // true  — only look back 1 round
canFloat(Floater.DESC, history, 0); // true  — protection disabled
```

## API

### `canFloat(direction, playerHistory, protection = 2): boolean`

| Param | Type | Description |
|---|---|---|
| `direction` | `Floater` | Direction to test: `Floater.ASC` (`↑`) or `Floater.DESC` (`↓`) |
| `playerHistory` | `FloatRecord[]` | Chronological history, oldest first, one entry per round played or not |
| `protection` | `number` | How many recent rounds to scan. `0` disables the check |

Returns `true` if the player did **not** float in that direction within the last
`protection` rounds.

Throws `RangeError` if `protection` is not a non-negative integer, and
`TypeError` if a record inside the window is missing or has a `floater` that is
neither a `Floater`, an `Unplayed` nor `null`. Neither an invalid window nor an unreadable
round may silently read as "float allowed". Records older than the window are
never read, and so never validated.

### `Floater`

```ts
enum Floater { ASC = "↑", DESC = "↓" }
```

### `recordFor({ playerScore, opponentScore }): FloatRecord`

Builds the record for a round that was played, applying FIDE art. 1.4: the
higher-scored player downfloats, the lower upfloats, equal scores float neither
way. Pass the scores **as they stood when the round was paired**. Throws
`RangeError` if either is not a finite, non-negative number — a score that is
not a score must not read as "no float".

Takes an object rather than two positional numbers on purpose: swapping the
arguments would otherwise produce the opposite float, confidently and in
silence.

### `Unplayed`

```ts
enum Unplayed { BYE = "BYE", FORFEIT = "FORFEIT" }
```

### `FloatRecord`

```ts
type FloatRecord = { floater: Floater | Unplayed | null };
```

Your own round objects can extend it — only `floater` is read.

Records must be chronological, oldest first, with **no round left out** — an
omitted round shifts the lookback window and cannot be detected from inside the
library. Rounds that were not played are recorded as such:

| That round | Record |
|---|---|
| Played an opponent, any score | `recordFor({ playerScore, opponentScore })` |
| Pairing-allocated bye, half-point bye | `{ floater: Unplayed.BYE }` |
| Unplayed, scoring what a loss scores (forfeit, absence, zero-point bye) | `{ floater: Unplayed.FORFEIT }` |

`Unplayed.BYE` counts as a downfloat and `Unplayed.FORFEIT` as no float, per
FIDE art. 1.4 — the library applies that itself, so record the round as it
happened rather than translating it. The split is by points, not by label: a
zero-point bye scores what a loss scores, so it is a `FORFEIT` here.

## FIDE compliance

`canFloat` implements the lookback of FIDE (Dutch) criteria C.14–C.17 and
nothing else — and those are *quality* criteria, minimised in priority order,
not absolute prohibitions. Read
[docs/fide-float-rules.md](./docs/fide-float-rules.md) before building a pairing
engine on it: every rule is turned into a numbered expectation with the test
that defends it, or a note saying why none can.

## Development

```bash
bun install
bun test
```
