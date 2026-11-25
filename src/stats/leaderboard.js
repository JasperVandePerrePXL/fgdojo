// Turns raw start.gg events into player, game and tournament statistics.
// Pure functions: no file or network access, so they are easy to test.
//
// Counting rules (see README "Counting rules"):
//  - a dojo counts once per tournament, even with several game events;
//  - a player counts once per dojo, identified by start.gg player ID;
//  - win rate is based on the recorded set scores (games won / games played).
import { formatBrusselsDate } from '../lib/dates.js';
import { isHiddenPlayer } from '../config/hidden_players.js';
import { dojoKeyOf } from './dojo.js';
import { formatDisplayName, getPlayerId } from './names.js';
import { addRankingScores } from './ranking.js';

/** Oldest event first, so the most recent gamerTag/prefix of a player wins. */
function sortChronologically(events) {
  return [...events].sort((a, b) => (a.tournament?.startAt ?? 0) - (b.tournament?.startAt ?? 0));
}

/** Display name of the event winner (placement 1), or null when unknown or hidden. */
function findWinnerName(event) {
  const firstPlace = (event.standings?.nodes ?? []).find((standing) => standing.placement === 1);
  if (!firstPlace) return null;

  const entrantName = firstPlace.entrant?.name;
  const participant = firstPlace.entrant?.participants?.[0];
  const gamerTag = participant?.gamerTag ?? entrantName ?? 'Unknown';
  const displayName = formatDisplayName({ prefix: participant?.prefix ?? '', gamerTag, entrantName });

  return isHiddenPlayer({ playerId: getPlayerId(participant), displayName }) ? null : displayName;
}

/** @returns {import('./types.js').TournamentInfo} */
function buildTournamentInfo(event) {
  return {
    dojoId: event.tournament?.slug ?? null,
    name: event.tournament?.name ?? 'Unknown Tournament',
    date: formatBrusselsDate(event.tournament?.startAt),
    eventName: event.name,
    winner: findWinnerName(event),
    entrantCount: event.entrants?.pageInfo?.total ?? 0,
  };
}

/** Returns the per-game bucket for this event (creating it on first use), or null without a game ID. */
function registerGame(games, event, tournament) {
  const gameId = event.videogame?.id;
  if (!gameId) return null;

  if (!games.has(gameId)) {
    games.set(gameId, {
      gameId,
      gameName: event.videogame?.name ?? 'Unknown Game',
      players: new Map(),
      tournaments: [],
    });
  }
  const game = games.get(gameId);
  game.tournaments.push(tournament);
  return game;
}

function createPlayerStats({ playerId, gamerTag, prefix, displayName }) {
  return {
    playerId,
    gamerTag,
    prefix,
    displayName,
    tournamentsAttended: 0,
    dojoIds: new Set(), // internal: dojos already counted for this player (removed before output)
    gamesWon: 0,
    gamesLost: 0,
    firstPlaces: 0,
    placements: [],
  };
}

/** Records that a player took part in a dojo: attendance (once per dojo), placement and dojo win. */
function recordVisit(statsByPlayer, playerId, { tournament, placement, gamerTag, prefix, displayName }) {
  if (!statsByPlayer.has(playerId)) {
    statsByPlayer.set(playerId, createPlayerStats({ playerId, gamerTag, prefix, displayName }));
  }
  const stats = statsByPlayer.get(playerId);

  // Events are processed oldest first, so the latest name/prefix ends up stored.
  Object.assign(stats, { gamerTag, prefix, displayName });

  const dojoKey = dojoKeyOf(tournament);
  if (!stats.dojoIds.has(dojoKey)) {
    stats.dojoIds.add(dojoKey);
    stats.tournamentsAttended += 1;
  }

  if (placement !== null) {
    stats.placements.push({ tournament: tournament.name, placement });
    if (placement === 1) stats.firstPlaces += 1;
  }
}

/** Registers every non-hidden participant of the event, globally and in the game's own ranking. */
function recordEntrants(event, tournament, players, game) {
  for (const entrant of event.entrants?.nodes ?? []) {
    for (const participant of entrant.participants ?? []) {
      const playerId = getPlayerId(participant);
      const gamerTag = participant.gamerTag ?? participant.player?.gamerTag ?? 'Unknown';
      const prefix = participant.prefix ?? '';
      const displayName = formatDisplayName({ prefix, gamerTag, entrantName: entrant.name });
      if (isHiddenPlayer({ playerId, displayName })) continue;

      const visit = {
        tournament,
        placement: entrant.standing?.placement ?? null,
        gamerTag,
        prefix,
        displayName,
      };
      recordVisit(players, playerId, visit);
      if (game) recordVisit(game.players, playerId, visit);
    }
  }
}

/** Adds games won/lost to every known (non-hidden) participant of one side of a set. */
function addGameScores(participants, won, lost, statsByPlayer) {
  for (const participant of participants) {
    const playerId = getPlayerId(participant);
    if (!playerId || !statsByPlayer.has(playerId)) continue;
    const stats = statsByPlayer.get(playerId);
    stats.gamesWon += won;
    stats.gamesLost += lost;
  }
}

/** Reads the 1v1 set scores of the event and credits the games to both players. */
function recordSetScores(event, players, game) {
  const rankings = game ? [players, game.players] : [players];

  for (const set of event.sets?.nodes ?? []) {
    if (!set.slots || set.slots.length !== 2) continue;
    const [slot1, slot2] = set.slots;

    const score1 = Math.max(0, slot1.standing?.stats?.score?.value ?? 0);
    const score2 = Math.max(0, slot2.standing?.stats?.score?.value ?? 0);
    const side1 = slot1.entrant?.participants ?? [];
    const side2 = slot2.entrant?.participants ?? [];

    for (const ranking of rankings) {
      addGameScores(side1, score1, score2, ranking);
      addGameScores(side2, score2, score1, ranking);
    }
  }
}

/** Calculates win rate and ranking score, and drops the internal `dojoIds` set. */
function finalizePlayers(playerMap) {
  return addRankingScores(playerMap).map(({ dojoIds, ...stats }) => stats);
}

/**
 * Builds all statistics for a list of raw events (one season, or every season combined).
 * @param {object[]} events Raw start.gg event objects as stored in data/events.json.
 * @returns {import('./types.js').LeaderboardResult}
 */
export function processLeaderboard(events) {
  const players = new Map();
  const games = new Map();
  const tournaments = [];

  for (const event of sortChronologically(events)) {
    const tournament = buildTournamentInfo(event);
    tournaments.push(tournament);

    const game = registerGame(games, event, tournament);
    recordEntrants(event, tournament, players, game);
    recordSetScores(event, players, game);
  }

  return {
    players: finalizePlayers(players),
    tournaments,
    games: Array.from(games.values()).map((game) => ({
      gameId: game.gameId,
      gameName: game.gameName,
      players: finalizePlayers(game.players),
      tournaments: game.tournaments,
    })),
    dojoCount: new Set(tournaments.map(dojoKeyOf)).size,
  };
}
