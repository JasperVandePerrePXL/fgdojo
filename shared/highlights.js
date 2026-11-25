// Registry of the "highlight" top lists (most wins, best win rate, ...).
// The pipeline computes one list per entry into `funStats`; the website shows one block per entry.
// To add a highlight, add one entry here: both sides pick it up automatically.
import { MIN_GAMES_FOR_WIN_RATE } from './rules.js';

/**
 * @typedef {object} HighlightDefinition
 * @property {string} id                         Key in `funStats`.
 * @property {string} label                      Title shown on the site and in the process log.
 * @property {string} valueKey                   Player field shown next to the name.
 * @property {string} suffix                     Text appended to the value, e.g. "%".
 * @property {(player: object) => number} score  Sort key, higher is better.
 * @property {(player: object) => boolean} [eligible] Players that fail are left out.
 */

/** @type {HighlightDefinition[]} */
export const HIGHLIGHTS = [
  {
    id: 'mostFirstPlaces',
    label: 'Most wins',
    valueKey: 'firstPlaces',
    suffix: '',
    score: (player) => player.firstPlaces,
  },
  {
    id: 'highestWinRate',
    label: 'Best win rate',
    valueKey: 'winRate',
    suffix: '%',
    score: (player) => player.winRateNum,
    eligible: (player) => player.gamesWon + player.gamesLost >= MIN_GAMES_FOR_WIN_RATE,
  },
  {
    id: 'mostTournamentsAttended',
    label: 'Most attendance',
    valueKey: 'tournamentsAttended',
    suffix: '',
    score: (player) => player.tournamentsAttended,
  },
];
