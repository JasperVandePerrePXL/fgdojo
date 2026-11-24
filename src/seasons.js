#!/usr/bin/env node
// Tournament seasons are maintained manually in data/tournament_slugs.json.
import { TOURNAMENT_CONFIG, getTournamentGames, getGameEventCandidates } from './tournament_config.js';

export const SEASONS = Object.fromEntries(
  Object.entries(TOURNAMENT_CONFIG.seasons ?? {}).map(([seasonId, season]) => [
    seasonId,
    {
      name: season.name,
      tournaments: Object.fromEntries((season.tournaments ?? []).map((tournament) => [
        tournament.name,
        getTournamentGames(season, tournament).flatMap((gameId) => getGameEventCandidates(tournament.slug, gameId)),
      ])),
    },
  ]),
);
