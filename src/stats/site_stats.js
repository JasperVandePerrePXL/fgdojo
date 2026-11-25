// Statistics for the hidden stats page (/stats.html), written to public/data/stats.json.
// Covers every tournament of every season: attendance per dojo, entrants per game,
// new vs returning players, a season comparison and the most played rivalries per game.
// Pure functions: no file or network access. Hidden players are left out everywhere.
import { formatBrusselsDate } from '../lib/dates.js';
import { isHiddenPlayer } from '../config/hidden_players.js';
import { formatDisplayName, getPlayerId } from './names.js';
import { readSet } from './sets.js';

/** Number of rivalries stored per game. */
export const RIVALRY_COUNT = 5;

/** Oldest event first; each event carries the ID of the season it belongs to. */
function flattenChronologically(seasons) {
  return seasons
    .flatMap(({ seasonId, events }) => events.map((event) => ({ event, seasonId })))
    .sort((a, b) => (a.event.tournament?.startAt ?? 0) - (b.event.tournament?.startAt ?? 0));
}

/**
 * Visible (non-hidden) participants of an event. Hidden player IDs are added to `hiddenIds`
 * so their sets can be skipped too (set slots carry no names).
 */
function visibleParticipants(event, hiddenIds) {
  const result = [];
  for (const entrant of event.entrants?.nodes ?? []) {
    for (const participant of entrant.participants ?? []) {
      const playerId = getPlayerId(participant);
      const gamerTag = participant.gamerTag ?? participant.player?.gamerTag ?? 'Unknown';
      const displayName = formatDisplayName({
        prefix: participant.prefix ?? '',
        gamerTag,
        entrantName: entrant.name,
      });
      if (playerId == null) continue;
      if (isHiddenPlayer({ playerId, displayName })) hiddenIds.add(String(playerId));
      else result.push({ playerId: String(playerId), displayName });
    }
  }
  return result;
}

function emptyDojo(event, seasonId) {
  const tournament = event.tournament ?? {};
  const date = formatBrusselsDate(tournament.startAt);
  return {
    dojoId: tournament.slug || `${date ?? ''}|${tournament.name ?? ''}`,
    name: tournament.name ?? 'Unknown Tournament',
    date,
    seasonId,
    playerIds: new Set(),
    entrantsByGame: {},
    sets: 0,
    games: 0,
  };
}

function emptySeason(seasonId, seasonName) {
  return { seasonId, seasonName, dojoIds: new Set(), playerIds: new Set(), entrants: 0, sets: 0, games: 0 };
}

/** Adds one set to the head-to-head record of its two players. */
function recordRivalry(rivalries, { p1, p2, p1Won }) {
  const [a, b] = p1 < p2 ? [p1, p2] : [p2, p1];
  const key = `${a}|${b}`;
  if (!rivalries.has(key)) rivalries.set(key, { a, b, winsA: 0, winsB: 0 });
  const rivalry = rivalries.get(key);
  if ((p1Won ? p1 : p2) === a) rivalry.winsA += 1;
  else rivalry.winsB += 1;
}

/** Most played rivalries first; ties go to the closest record, then alphabetically. */
function topRivalries(rivalries, names) {
  return [...rivalries.values()]
    .map(({ a, b, winsA, winsB }) => ({
      playerA: names.get(a) ?? 'Unknown',
      playerB: names.get(b) ?? 'Unknown',
      winsA,
      winsB,
      sets: winsA + winsB,
    }))
    .sort(
      (x, y) =>
        y.sets - x.sets ||
        Math.abs(x.winsA - x.winsB) - Math.abs(y.winsA - y.winsB) ||
        x.playerA.localeCompare(y.playerA) ||
        x.playerB.localeCompare(y.playerB),
    )
    .slice(0, RIVALRY_COUNT);
}

/**
 * @param {{ seasonId: number, seasonName: string, events: object[] }[]} seasons Raw events per season.
 * @returns {import('./types.js').SiteStats}
 */
export function buildSiteStats(seasons) {
  const hiddenIds = new Set();
  const names = new Map(); // playerId -> latest display name
  const dojos = new Map();
  const seasonStats = new Map(
    seasons.map(({ seasonId, seasonName }) => [seasonId, emptySeason(seasonId, seasonName)]),
  );
  const gameEntrants = new Map(); // game name -> entrants, in order of first appearance
  const rivalriesByGame = new Map(); // game name -> head-to-head records of that game

  for (const { event, seasonId } of flattenChronologically(seasons)) {
    const season = seasonStats.get(seasonId);
    const gameName = event.videogame?.name ?? event.name ?? 'Unknown Game';
    const participants = visibleParticipants(event, hiddenIds);

    const fresh = emptyDojo(event, seasonId);
    if (!dojos.has(fresh.dojoId)) dojos.set(fresh.dojoId, fresh);
    const dojo = dojos.get(fresh.dojoId);

    for (const { playerId, displayName } of participants) {
      names.set(playerId, displayName);
      dojo.playerIds.add(playerId);
      season.playerIds.add(playerId);
    }
    dojo.entrantsByGame[gameName] = (dojo.entrantsByGame[gameName] ?? 0) + participants.length;
    gameEntrants.set(gameName, (gameEntrants.get(gameName) ?? 0) + participants.length);
    season.dojoIds.add(dojo.dojoId);
    season.entrants += participants.length;

    for (const set of event.sets?.nodes ?? []) {
      const played = readSet(set);
      if (!played || hiddenIds.has(played.p1) || hiddenIds.has(played.p2)) continue;
      season.sets += 1;
      season.games += played.score1 + played.score2;
      dojo.sets += 1;
      dojo.games += played.score1 + played.score2;
      if (!rivalriesByGame.has(gameName)) rivalriesByGame.set(gameName, new Map());
      recordRivalry(rivalriesByGame.get(gameName), played);
    }
  }

  const seen = new Set();
  const dojoList = [...dojos.values()].map(({ playerIds, ...dojo }) => {
    const newPlayers = [...playerIds].filter((id) => !seen.has(id)).length;
    playerIds.forEach((id) => seen.add(id));
    return {
      ...dojo,
      players: playerIds.size,
      newPlayers,
      returningPlayers: playerIds.size - newPlayers,
      // Lets the stats page count unique players over any range of dojos.
      playerIds: [...playerIds].sort(),
    };
  });

  const seasonList = [...seasonStats.values()]
    .filter((season) => season.dojoIds.size > 0)
    .map(({ dojoIds, playerIds, entrants, ...season }) => {
      const attendance = dojoList.filter((dojo) => dojoIds.has(dojo.dojoId)).map((dojo) => dojo.players);
      return {
        ...season,
        dojos: dojoIds.size,
        uniquePlayers: playerIds.size,
        averageAttendance: Number((attendance.reduce((sum, n) => sum + n, 0) / attendance.length).toFixed(1)),
        entrants,
      };
    });

  return {
    totals: {
      dojos: dojoList.length,
      players: seen.size,
      sets: seasonList.reduce((sum, season) => sum + season.sets, 0),
      games: seasonList.reduce((sum, season) => sum + season.games, 0),
    },
    games: [...gameEntrants].map(([gameName, entrants]) => ({
      gameName,
      entrants,
      rivalries: topRivalries(rivalriesByGame.get(gameName) ?? new Map(), names),
    })),
    dojos: dojoList,
    seasons: seasonList,
  };
}
