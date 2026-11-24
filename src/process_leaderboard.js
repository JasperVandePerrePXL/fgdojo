#!/usr/bin/env node
// Process tournament data and generate leaderboard statistics
// Usage: node src/process_leaderboard.js

import fs from 'fs/promises';
import fsSync from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEASONS } from './seasons.js';
import { migrateLegacyData, readRawEvents } from './data_store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');

async function loadTournamentData(seasonId) {
  const data = await readRawEvents(baseDir);
  return data[seasonId] ?? [];
}

const publicDir = path.join(baseDir, 'public');

export const HIDDEN_PLAYER_CONFIG = JSON.parse(
  fsSync.readFileSync(path.join(baseDir, 'data', 'hidden_players.json'), 'utf8'),
);
export const TOURNAMENT_CONFIG = JSON.parse(
  fsSync.readFileSync(path.join(baseDir, 'data', 'tournament_slugs.json'), 'utf8'),
);

const normalizedHiddenNames = new Set(
  (HIDDEN_PLAYER_CONFIG.displayNames ?? []).map((name) => String(name).trim().toLowerCase()),
);
const hiddenPlayerIds = new Set(
  (HIDDEN_PLAYER_CONFIG.playerIds ?? []).map((id) => String(id)),
);

export function isHiddenPlayer({ playerId, displayName } = {}) {
  if (playerId != null && hiddenPlayerIds.has(String(playerId))) return true;
  if (typeof displayName !== 'string') return false;
  return normalizedHiddenNames.has(displayName.trim().toLowerCase());
}

async function loadAllTournamentData() {
  const data = await readRawEvents(baseDir);
  return Object.entries(data)
    .filter(([seasonId]) => /^\d+$/.test(seasonId))
    .flatMap(([, events]) => events);
}

export function calculateRankingScore(player, maxAttendance = 1, maxFirstPlaces = 1) {
  const winRate = Number(player.winRateNum ?? 0);
  const attendanceScore = maxAttendance > 0
    ? (Number(player.tournamentsAttended ?? 0) / maxAttendance) * 100
    : 0;
  const winsScore = maxFirstPlaces > 0
    ? (Number(player.firstPlaces ?? 0) / maxFirstPlaces) * 100
    : 0;

  return (winRate * 0.4) + (attendanceScore * 0.25) + (winsScore * 0.35);
}

export function processLeaderboard(events) {
  const formatTournamentDate = (timestamp) => {
    if (!timestamp) return null;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Brussels',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(timestamp * 1000));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  const playerStats = new Map(); // playerId -> stats
  const tournaments = [];
  const gameStats = new Map(); // gameId -> { gameId, gameName, players: Map, tournaments: [] }
  
  // Sort events by date to process chronologically (latest name wins)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.tournament?.startAt ?? 0;
    const dateB = b.tournament?.startAt ?? 0;
    return dateA - dateB;
  });

  for (const event of sortedEvents) {
    const tournamentInfo = {
      dojoId: event.tournament?.slug ?? null,
      name: event.tournament?.name ?? 'Unknown Tournament',
      date: formatTournamentDate(event.tournament?.startAt),
      eventName: event.name,
      winner: null,
      entrantCount: event.entrants?.pageInfo?.total ?? 0,
    };

    // Find winner from standings
    const standings = event.standings?.nodes ?? [];
    const firstPlace = standings.find(s => s.placement === 1);
    if (firstPlace) {
      const winnerParticipant = firstPlace.entrant?.participants?.[0];
      const winnerGamerTag = winnerParticipant?.gamerTag ?? firstPlace.entrant?.name ?? 'Unknown';
      const winnerPrefix = winnerParticipant?.prefix ?? '';
      const winnerName = winnerPrefix
        ? `${winnerPrefix} | ${winnerGamerTag}`
        : (firstPlace.entrant?.name && firstPlace.entrant.name.includes(' | ')
          ? firstPlace.entrant.name
          : winnerGamerTag);
      const winnerPlayerId = winnerParticipant?.player?.id ?? winnerParticipant?.id;
      if (!isHiddenPlayer({ playerId: winnerPlayerId, displayName: winnerName })) {
        tournamentInfo.winner = winnerName;
      }
    }

    tournaments.push(tournamentInfo);

    // per-game tournament collection
    const gameId = event.videogame?.id;
    const gameName = event.videogame?.name ?? 'Unknown Game';
    if (gameId) {
      if (!gameStats.has(gameId)) {
        gameStats.set(gameId, { gameId, gameName, players: new Map(), tournaments: [] });
      }
      gameStats.get(gameId).tournaments.push(tournamentInfo);
    }

    // Process entrants and their participants to initialize player stats
    const entrants = event.entrants?.nodes ?? [];
    for (const entrant of entrants) {
      const participants = entrant.participants ?? [];
      
      for (const participant of participants) {
        const playerId = participant.player?.id ?? participant.id;
        const gamerTag = participant.gamerTag ?? participant.player?.gamerTag ?? 'Unknown';
        const prefix = participant.prefix ?? '';
        const displayName = prefix
          ? `${prefix} | ${gamerTag}`
          : (entrant.name && entrant.name.includes(' | ') ? entrant.name : gamerTag);
        if (isHiddenPlayer({ playerId, displayName })) continue;
        const placement = entrant.standing?.placement ?? null;

        const dojoKey = tournamentInfo.dojoId || `${tournamentInfo.date}|${tournamentInfo.name}`;
        const ensureStats = (map) => {
          if (!map.has(playerId)) {
            map.set(playerId, {
              playerId,
              gamerTag,
              prefix,
              displayName,
              tournamentsAttended: 0,
              dojoIds: new Set(),
              gamesWon: 0,
              gamesLost: 0,
              firstPlaces: 0,
              placements: [],
            });
          }
          const stats = map.get(playerId);
          // Update to latest username/prefix (since we process chronologically)
          stats.gamerTag = gamerTag;
          stats.prefix = prefix;
          stats.displayName = displayName;
          if (!stats.dojoIds.has(dojoKey)) {
            stats.dojoIds.add(dojoKey);
            stats.tournamentsAttended += 1;
          }
          if (placement !== null) {
            stats.placements.push({ tournament: tournamentInfo.name, placement });
            if (placement === 1) {
              stats.firstPlaces += 1;
            }
          }
          return stats;
        };

        const globalStats = ensureStats(playerStats);

        // per-game stats
        if (gameId) {
          const g = gameStats.get(gameId) ?? { gameId, gameName, players: new Map(), tournaments: [] };
          gameStats.set(gameId, g);
          ensureStats(g.players);
        }
      }
    }

    // Process sets to calculate games won/lost
    const sets = event.sets?.nodes ?? [];
    for (const set of sets) {
      if (!set.slots || set.slots.length !== 2) continue;

      const [slot1, slot2] = set.slots;
      
      // Get scores from each slot, ensure they're non-negative
      const score1 = Math.max(0, slot1.standing?.stats?.score?.value ?? 0);
      const score2 = Math.max(0, slot2.standing?.stats?.score?.value ?? 0);

      // Get player IDs from each slot
      const participants1 = slot1.entrant?.participants ?? [];
      const participants2 = slot2.entrant?.participants ?? [];

      // Update game wins/losses for each participant
      const addScores = (participants, won, lost, targetMap) => {
        for (const p of participants) {
          const playerId = p.player?.id ?? p.id;
          if (!playerId) continue;
          if (targetMap.has(playerId)) {
            const stats = targetMap.get(playerId);
            stats.gamesWon += Math.max(0, won);
            stats.gamesLost += Math.max(0, lost);
          }
        }
      };

      addScores(participants1, score1, score2, playerStats);
      addScores(participants2, score2, score1, playerStats);

      if (gameId && gameStats.has(gameId)) {
        const g = gameStats.get(gameId);
        addScores(participants1, score1, score2, g.players);
        addScores(participants2, score2, score1, g.players);
      }
    }
  }

  const calcWin = (p) => p.gamesWon + p.gamesLost > 0 ? (p.gamesWon / (p.gamesWon + p.gamesLost) * 100) : 0;

  const addWeightedScore = (playerMap) => {
    const rawPlayers = Array.from(playerMap.values()).map((p) => {
      const winRateNum = calcWin(p);
      return { ...p, winRateNum, winRate: winRateNum.toFixed(2) };
    });
    const maxAttendance = Math.max(1, ...rawPlayers.map((p) => p.tournamentsAttended));
    const maxFirstPlaces = Math.max(1, ...rawPlayers.map((p) => p.firstPlaces));
    return rawPlayers.map((p) => ({
      ...p,
      rankingScore: Number(calculateRankingScore(p, maxAttendance, maxFirstPlaces).toFixed(2)),
    }));
  };

  const playerList = addWeightedScore(playerStats).map((p) => {
    const { dojoIds, ...stats } = p;
    return stats;
  });

  const games = Array.from(gameStats.values()).map(g => {
    const players = addWeightedScore(g.players).map((p) => {
      const { dojoIds, ...stats } = p;
      return stats;
    });
    return {
      gameId: g.gameId,
      gameName: g.gameName,
      players,
      tournaments: g.tournaments,
    };
  });

  const dojoIds = new Set(tournaments.map((tournament) => tournament.dojoId || `${tournament.date}|${tournament.name}`));
  return { players: playerList, tournaments, games, dojoCount: dojoIds.size };
}

export function calculateFunStats(players) {
  const mostFirstPlaces = [...players].sort((a, b) => b.firstPlaces - a.firstPlaces).slice(0, 5);
  const highestWinRate = [...players]
    .filter(p => p.gamesWon + p.gamesLost >= 10) // Minimum 10 games played
    .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
    .slice(0, 5);
  const mostTournaments = [...players].sort((a, b) => b.tournamentsAttended - a.tournamentsAttended).slice(0, 5);

  return {
    mostFirstPlaces: mostFirstPlaces.map(p => ({
      displayName: p.displayName,
      firstPlaces: p.firstPlaces,
      tournamentsAttended: p.tournamentsAttended,
    })),
    highestWinRate: highestWinRate.map(p => ({
      displayName: p.displayName,
      winRate: `${p.winRate}%`,
      gamesWon: p.gamesWon,
      gamesLost: p.gamesLost,
    })),
    mostTournamentsAttended: mostTournaments.map(p => ({
      displayName: p.displayName,
      tournamentsAttended: p.tournamentsAttended,
      firstPlaces: p.firstPlaces,
    })),
  };
}

async function main() {
  await migrateLegacyData(baseDir);
  for (const file of await fs.readdir(publicDir).catch(() => [])) {
    if (/^leaderboard(?:_season_\d+)?\.json$/.test(file)) {
      await fs.rm(path.join(publicDir, file), { force: true });
    }
  }
  console.log('🎮 Processing leaderboards by season...\n');

  const seasonLeaderboards = {};

  // Process each season's leaderboard
  for (const [seasonId, seasonData] of Object.entries(SEASONS)) {
    console.log(`📅 ${seasonData.name}:`);
    const events = await loadTournamentData(seasonId);
    
    if (events.length === 0) {
      console.log(`  ⚠️  No tournament data found for ${seasonData.name}`);
      continue;
    }

    console.log(`  Loading ${events.length} event(s)...`);
    const { players, tournaments, games, dojoCount } = processLeaderboard(events);

    console.log(`  Found ${players.length} unique player(s) across ${dojoCount} dojo(s)`);

    const funStats = calculateFunStats(players);

    const output = {
      seasonId: parseInt(seasonId),
      seasonName: seasonData.name,
      summary: {
        totalPlayers: players.length,
        totalTournaments: dojoCount,
        totalDojos: dojoCount,
      },
      players: players.sort((a, b) => b.tournamentsAttended - a.tournamentsAttended),
      games,
      tournaments,
      funStats,
    };

    seasonLeaderboards[seasonId] = output;

    console.log(`  ✓ Processed ${seasonData.name}\n`);
  }

  // Create a combined leaderboard for backwards compatibility
  const allEvents = await loadAllTournamentData();
  if (allEvents.length > 0) {
    const { players, tournaments, games, dojoCount } = processLeaderboard(allEvents);
    const funStats = calculateFunStats(players);

    const combinedOutput = {
      seasonId: -1,
      seasonName: 'All Seasons Combined',
      summary: {
        totalPlayers: players.length,
        totalTournaments: dojoCount,
        totalDojos: dojoCount,
      },
      players: players.sort((a, b) => b.tournamentsAttended - a.tournamentsAttended),
      games,
      tournaments,
      funStats,
    };

    console.log('✓ Processed combined leaderboard');

    await fs.mkdir(path.join(publicDir, 'data'), { recursive: true });
    await fs.writeFile(
      path.join(publicDir, 'data', 'leaderboards.json'),
      JSON.stringify({ nextEventUrl: TOURNAMENT_CONFIG.nextEventUrl, seasons: seasonLeaderboards, combined: combinedOutput }, null, 2),
      'utf8',
    );
    console.log('✓ Saved consolidated public data to public/data/leaderboards.json');
  }

  // Print fun stats for Season 0
  if (seasonLeaderboards[0]) {
    const output = seasonLeaderboards[0];
    console.log(`\n=== ${output.seasonName} - FUN STATS ===\n`);
    
    console.log('🏆 Most 1st Places:');
    output.funStats.mostFirstPlaces.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.displayName} - ${p.firstPlaces} wins (${p.tournamentsAttended} tournaments)`);
    });

    console.log('\n📈 Highest Win Rate (min. 10 games):');
    output.funStats.highestWinRate.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.displayName} - ${p.winRate} (${p.gamesWon}W - ${p.gamesLost}L)`);
    });

    console.log('\n🎮 Most Tournaments Attended:');
    output.funStats.mostTournamentsAttended.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.displayName} - ${p.tournamentsAttended} tournaments (${p.firstPlaces} wins)`);
    });

    console.log('\n📅 Tournament Winners:');
    output.tournaments.forEach(t => {
      console.log(`  ${t.date} - ${t.name}: ${t.winner ?? 'Unknown'}`);
    });
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch(console.error);
