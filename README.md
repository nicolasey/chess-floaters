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

> Ships as TypeScript source, no build step. Works with Bun and with any
> bundler or `tsconfig` using `moduleResolution: "bundler"`. It does **not**
> resolve under `moduleResolution: "node16"`/`"nodenext"`.

## Usage

```ts
import { canFloat, Floater, type FloatRecord } from "@nicolasey/chess-floaters";

// Oldest round first, most recent last. One entry per played round.
const history: FloatRecord[] = [
  { floater: null },        // round 1: no float
  { floater: Floater.DESC } // round 2: floated down
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
| `playerHistory` | `FloatRecord[]` | Chronological history, oldest first |
| `protection` | `number` | How many recent rounds to scan. `0` disables the check |

Returns `true` if the player did **not** float in that direction within the last
`protection` rounds. Throws `RangeError` if `protection` is not a non-negative
integer — an invalid window must not silently read as "float allowed".

### `Floater`

```ts
enum Floater { ASC = "↑", DESC = "↓" }
```

### `FloatRecord`

```ts
type FloatRecord = { floater: Floater | null };
```

Your own round objects can extend it — only `floater` is read.

## Development

```bash
bun install
bun test
```
