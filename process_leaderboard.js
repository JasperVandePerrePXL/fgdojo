#!/usr/bin/env node
// Process Guilty Gear Strive tournament data and generate leaderboard statistics
// Usage: node process_leaderboard.js

import fs from 'fs/promises';

const INPUT_FILE = 'output.json';
const OUTPUT_FILE = 'leaderboard.json';

async function loadTournamentData() {
  try {
    const data = await fs.readFile(INPUT_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${INPUT_FILE}:`, err.message);
    process.exit(1);
  }
}

function processLeaderboard(events) {
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
      name: event.tournament?.name ?? 'Unknown Tournament',
      date: event.tournament?.startAt ? new Date(event.tournament.startAt * 1000).toISOString().slice(0, 10) : null,
      eventName: event.name,
      winner: null,
      entrantCount: event.entrants?.pageInfo?.total ?? 0,
    };

    // Find winner from standings
    const standings = event.standings?.nodes ?? [];
    const firstPlace = standings.find(s => s.placement === 1);
    if (firstPlace) {
      const winnerName = firstPlace.entrant?.participants?.[0]?.gamerTag ?? firstPlace.entrant?.name ?? 'Unknown';
      tournamentInfo.winner = winnerName;
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
        const displayName = prefix ? `${prefix} | ${gamerTag}` : gamerTag;
        const placement = entrant.standing?.placement ?? null;

        const ensureStats = (map) => {
          if (!map.has(playerId)) {
            map.set(playerId, {
              playerId,
              gamerTag,
              prefix,
              displayName,
              tournamentsAttended: 0,
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
          stats.tournamentsAttended += 1;
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

  // Calculate win percentage for each player
  const playerList = Array.from(playerStats.values()).map(p => ({
    ...p,
    winRateNum: calcWin(p),
    winRate: (calcWin(p)).toFixed(2),
  }));

  const games = Array.from(gameStats.values()).map(g => {
    const players = Array.from(g.players.values()).map(p => ({
      ...p,
      winRateNum: calcWin(p),
      winRate: (calcWin(p)).toFixed(2),
    }));
    return {
      gameId: g.gameId,
      gameName: g.gameName,
      players,
      tournaments: g.tournaments,
    };
  });

  return { players: playerList, tournaments, games };
}

function calculateFunStats(players) {
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
  console.log(`Loading tournament data from ${INPUT_FILE}...`);
  const events = await loadTournamentData();
  
  console.log(`Processing ${events.length} event(s)...`);
  const { players, tournaments, games } = processLeaderboard(events);

  console.log(`Found ${players.length} unique player(s) across ${tournaments.length} tournament(s)`);

  const funStats = calculateFunStats(players);

  const output = {
    summary: {
      totalPlayers: players.length,
      totalTournaments: tournaments.length,
    },
    players: players.sort((a, b) => b.tournamentsAttended - a.tournamentsAttended),
    games,
    tournaments,
    funStats,
  };

  // Write to file
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nLeaderboard saved to ${OUTPUT_FILE}`);

  // Print fun stats to console
  console.log('\n=== FUN STATS ===\n');
  
  console.log('🏆 Most 1st Places:');
  funStats.mostFirstPlaces.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.displayName} - ${p.firstPlaces} wins (${p.tournamentsAttended} tournaments)`);
  });

  console.log('\n📈 Highest Win Rate (min. 10 games):');
  funStats.highestWinRate.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.displayName} - ${p.winRate} (${p.gamesWon}W - ${p.gamesLost}L)`);
  });

  console.log('\n🎮 Most Tournaments Attended:');
  funStats.mostTournamentsAttended.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.displayName} - ${p.tournamentsAttended} tournaments (${p.firstPlaces} wins)`);
  });

  console.log('\n📅 Tournament Winners:');
  tournaments.forEach(t => {
    console.log(`  ${t.date} - ${t.name}: ${t.winner ?? 'Unknown'}`);
  });
}

main().catch(console.error);
