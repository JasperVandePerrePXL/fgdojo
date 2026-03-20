#!/usr/bin/env node
// Tournament seasons and event slugs configuration
// Organized by season, then by month

export const SEASONS = {
  0: {
    name: 'Season 0',
    tournaments: {
      'December 2025': [
        'tournament/fighting-game-dojo-december-25/event/1v1-fgdojo-street-fighter-6-pc',
        'tournament/fighting-game-dojo-december-25/event/1v1-fgdojo-tekken-8-ps5',
        'tournament/fighting-game-dojo-december-25/event/1v1-fgdojo-guilty-gear-strive-pc',
      ],
      'November 2025': [
        'tournament/fighting-game-dojo-november-25/event/1v1-fgdojo-street-fighter-6-pc',
        'tournament/fighting-game-dojo-november-25/event/1v1-fgdojo-tekken-8-ps5',
        'tournament/fighting-game-dojo-november-25/event/1v1-fgdojo-guilty-gear-strive-pc',
      ],
      'Anniversary (October 2025)': [
        'tournament/fighting-game-dojo-anniversary-evo-prep-weekend/event/1v1-fgdojo-street-fighter-6-pc',
        'tournament/fighting-game-dojo-anniversary-evo-prep-weekend/event/1v1-fgdojo-tekken-8-ps5',
        'tournament/fighting-game-dojo-anniversary-evo-prep-weekend/event/1v1-fgdojo-guilty-gear-strive-pc',
      ],
      'Back To School (September 2025)': [
        'tournament/fighting-game-dojo-back-to-school/event/1v1-fgdojo-street-fighter-6-pc',
        'tournament/fighting-game-dojo-back-to-school/event/1v1-fgdojo-tekken-8-ps5',
        'tournament/fighting-game-dojo-back-to-school/event/1v1-fgdojo-guilty-gear-strive-pc',
      ],
      'Summer Part 2 (August 2025)': [
        'tournament/fighting-game-dojo-summer-part-2/event/1v1-fgdojo-street-fighter-6-pc',
        'tournament/fighting-game-dojo-summer-part-2/event/1v1-fgdojo-tekken-8-ps5',
        'tournament/fighting-game-dojo-summer-part-2/event/1v1-fgdojo-guilty-gear-strive-pc',
      ],
      'Summer Edition (July 2025)': [
        'tournament/fighting-game-dojo-summer-edition/event/1v1-fgdojo-street-fighter-6-pc',
        'tournament/fighting-game-dojo-summer-edition/event/1v1-fgdojo-tekken-8-ps5',
        'tournament/fighting-game-dojo-summer-edition/event/1v1-fgdojo-guilty-gear-strive-pc',
      ],
      'Fifth Round (June 2025)': [
        'tournament/fighting-game-dojo-the-fifth-round/event/1v1-fgdojo-street-fighter-6',
        'tournament/fighting-game-dojo-the-fifth-round/event/1v1-fgdojo-tekken-8',
        'tournament/fighting-game-dojo-the-fifth-round/event/1v1-fgdojo-guilty-gear-strive',
      ],
      'Fourth Round (May 2025)': [
        'tournament/fighting-game-dojo-the-fourth-round/event/1v1-fgdojo-street-fighter-6',
        'tournament/fighting-game-dojo-the-fourth-round/event/1v1-fgdojo-tekken-8',
        'tournament/fighting-game-dojo-the-fourth-round/event/1v1-fgdojo-guilty-gear-strive',
      ],
      'Third Round (April 2025)': [
        'tournament/fighting-game-dojo-the-third-round-including-rb-kumite-view/event/1v1-fgdojo-street-fighter-6',
        'tournament/fighting-game-dojo-the-third-round-including-rb-kumite-view/event/1v1-fgdojo-tekken-8',
      ],
      'Second Round (March 2025)': [
        'tournament/fighting-game-dojo-the-second-round/event/1v1-fgdojo-street-fighter-6',
        'tournament/fighting-game-dojo-the-second-round/event/1v1-fgdojo-tekken-8',
      ],
      'First Round (January 2025)': [
        'tournament/fighting-game-dojo-the-first-round-frag-o-matic-invitational/event/1v1-sf6-frag-o-matic-invitational',
        'tournament/fighting-game-dojo-the-first-round-frag-o-matic-invitational/event/1v1-t8-frag-o-matic-invitational',
      ],
    },
  },
  1: {
    name: 'Season 1',
    tournaments: {
      // Add Season 1 tournaments here as they happen
      // Example format:
      // 'Tournament Name (Month Year)': [
      //   'tournament/slug/event/slug',
      //   'tournament/slug/event/slug',
      // ],
      'Fighting Game Dojo - January \'26 edition': [
        'tournament/fighting-game-dojo-january-26-edition/event/1v1-fgdojo-street-fighter-6-pc',
        'tournament/fighting-game-dojo-january-26-edition/event/1v1-fgdojo-tekken-8-ps5',
        'tournament/fighting-game-dojo-january-26-edition/event/1v1-fgdojo-guilty-gear-strive-pc',
      ],
      'Fighting Game Dojo - March \'26 edition': [
        'tournament/fighting-game-dojo-march-edition/event/1v1-fgdojo-guilty-gear-strive-pc',
        'tournament/fighting-game-dojo-march-edition/event/1v1-fgdojo-street-fighter-6-pc',
        'tournament/fighting-game-dojo-march-edition/event/1v1-fgdojo-tekken-8-ps5',
      ]
    },
  },
};
