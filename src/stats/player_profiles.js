// Data of the player pages (/player.html?id=…): per player and per game, the Elo rating after every dojo,
// the placement at every dojo and the head-to-head record against every opponent.
// Pure functions: no file or network access. Hidden players are left out everywhere.
import { formatBrusselsDate } from '../lib/dates.js';
import { formatDisplayName, getPlayerId } from './names.js';
import { hiddenPlayerIds, readSet } from './sets.js';

/** Oldest event first, so the most recent name of a player wins. */
function sortChronologically(events) {
  return [...events].sort((a, b) => (a.tournament?.startAt ?? 0) - (b.tournament?.startAt ?? 0));
}

/** The player's game entry, created on first use. */
function gameEntry(profile, event) {
  const gameId = String(event.videogame.id);
  if (!profile.games.has(gameId)) {
    profile.games.set(gameId, {
      gameId,
      gameName: event.videogame.name ?? 'Unknown Game',
      results: [],
      opponents: new Map(), // opponent ID -> { wins, losses, gameWins, gameLosses }
    });
  }
  return profile.games.get(gameId);
}

/** Registers every visible entrant of the event: latest name and placement. */
function recordEntrants(event, profiles, hidden, dojo) {
  for (const entrant of event.entrants?.nodes ?? []) {
    for (const participant of entrant.participants ?? []) {
      const id = getPlayerId(participant);
      if (id == null || hidden.has(String(id))) continue;
      const playerId = String(id);
      if (!profiles.has(playerId)) profiles.set(playerId, { playerId, displayName: '', games: new Map() });

      const profile = profiles.get(playerId);
      profile.displayName = formatDisplayName({
        prefix: participant.prefix ?? '',
        gamerTag: participant.gamerTag ?? participant.player?.gamerTag ?? 'Unknown',
        entrantName: entrant.name,
      });
      gameEntry(profile, event).results.push({ ...dojo, placement: entrant.standing?.placement ?? null });
    }
  }
}

/** Adds every rated 1v1 set between two visible players to both head-to-head records (sets and games). */
function recordSets(event, profiles, hidden) {
  for (const set of event.sets?.nodes ?? []) {
    const result = readSet(set);
    if (!result || hidden.has(result.p1) || hidden.has(result.p2)) continue;
    for (const [self, other, won, gamesFor, gamesAgainst] of [
      [result.p1, result.p2, result.p1Won, result.score1, result.score2],
      [result.p2, result.p1, !result.p1Won, result.score2, result.score1],
    ]) {
      const profile = profiles.get(self);
      if (!profile) continue;
      const opponents = gameEntry(profile, event).opponents;
      if (!opponents.has(other)) opponents.set(other, { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 });
      const record = opponents.get(other);
      record[won ? 'wins' : 'losses'] += 1;
      record.gameWins += gamesFor;
      record.gameLosses += gamesAgainst;
    }
  }
}

/**
 * @param {object[]} events Raw start.gg events of every season (finished events only).
 * @param {Map<string, Map<string, import('./elo.js').RatingPoint[]>>} historyByGame From computeRatings.
 * @returns {import('./types.js').PlayerProfiles}
 */
export function buildPlayerProfiles(events, historyByGame = new Map()) {
  const profiles = new Map();
  const dojoNames = new Map(); // tournament slug -> name

  for (const event of sortChronologically(events)) {
    if (event.videogame?.id == null) continue;
    const dojo = {
      dojoId: event.tournament?.slug ?? null,
      tournament: event.tournament?.name ?? 'Unknown Tournament',
      date: formatBrusselsDate(event.tournament?.startAt),
      entrants: event.entrants?.pageInfo?.total ?? event.entrants?.nodes?.length ?? 0,
    };
    dojoNames.set(dojo.dojoId, dojo.tournament);
    const hidden = hiddenPlayerIds(event);
    recordEntrants(event, profiles, hidden, dojo);
    recordSets(event, profiles, hidden);
  }

  const players = {};
  for (const [playerId, profile] of profiles) {
    const games = [...profile.games.values()].map(({ opponents, ...game }) => {
      const history = (historyByGame.get(game.gameId)?.get(playerId) ?? []).map((point) => ({
        date: formatBrusselsDate(point.startAt),
        dojoId: point.dojoId,
        tournament: dojoNames.get(point.dojoId) ?? point.dojoId,
        rating: point.rating,
      }));
      const headToHead = [...opponents]
        .map(([opponentId, record]) => ({
          opponentId,
          opponentName: profiles.get(opponentId)?.displayName ?? 'Unknown',
          ...record,
        }))
        // Most games played first, then most sets, then most games won.
        .sort(
          (a, b) =>
            b.gameWins + b.gameLosses - (a.gameWins + a.gameLosses) ||
            b.wins + b.losses - (a.wins + a.losses) ||
            b.gameWins - a.gameWins ||
            a.opponentName.localeCompare(b.opponentName),
        );
      return { ...game, rating: history.at(-1)?.rating ?? null, history, headToHead };
    });
    // Most played game first.
    games.sort((a, b) => b.results.length - a.results.length);
    players[playerId] = { playerId, displayName: profile.displayName, games };
  }
  return { players };
}
