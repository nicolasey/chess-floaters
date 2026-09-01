/**
 * Util to mark a game participant as floating in player's file
 */
export enum Floater {
  ASC = "↑",
  DESC = "↓",
}

/**
 * A round that was not played. Art. 1.4 splits these two ways: a bye, or any
 * unplayed round scoring more than a loss, is a downfloat; an unplayed round
 * scoring what a loss scores is no float at all.
 *
 * A zero-point bye is therefore a FORFEIT here, whatever the pairing sheet
 * calls it — what matters is the points, not the label.
 */
export enum Unplayed {
  BYE = "BYE",
  FORFEIT = "FORFEIT",
}
