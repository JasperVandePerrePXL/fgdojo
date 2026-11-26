// GraphQL documents used by the project.

/**
 * Everything the leaderboard needs about one event (one game at one tournament):
 * entrants, final standings and set scores. Paging is capped at 500 items per list.
 */
export const EVENT_QUERY = `query EventData($slug: String!) {
  event(slug: $slug) {
    id
    name
    slug
    startAt
    videogame {
      id
      name
    }
    tournament {
      id
      name
      slug
      startAt
    }
    entrants(query: { perPage: 500 }) {
      pageInfo {
        total
        totalPages
      }
      nodes {
        id
        name
        standing {
          placement
        }
        participants {
          id
          gamerTag
          prefix
          player {
            id
            gamerTag
          }
        }
      }
    }
    standings(query: { perPage: 500 }) {
      pageInfo {
        total
      }
      nodes {
        placement
        entrant {
          id
          name
          participants {
            gamerTag
          }
        }
      }
    }
    sets(perPage: 500, page: 1) {
      pageInfo {
        total
      }
      nodes {
        id
        displayScore
        fullRoundText
        winnerId
        slots {
          entrant {
            id
            name
            participants {
              id
              gamerTag
              player {
                id
              }
            }
          }
          standing {
            stats {
              score {
                value
              }
            }
          }
        }
      }
    }
  }
}`;

/** Basic data of one tournament, looked up by slug (`tournament/<slug>`). */
export const TOURNAMENT_QUERY = `query($slug: String!) { tournament(slug: $slug) { name slug startAt } }`;

/** Search tournaments by name, oldest first. Used as a fallback when the hub link cannot be read. */
export const TOURNAMENTS_BY_NAME_QUERY = `query($page: Int!) {
  tournaments(query: { perPage: 100, page: $page, sortBy: "startAt asc", filter: { name: "Fighting Game Dojo" } }) {
    pageInfo { totalPages }
    nodes { name slug startAt }
  }
}`;

/** Live sign-ups of every event of one tournament, for the local seeding list (`npm run seeding`). */
export const SEEDING_QUERY = `query Seeding($slug: String!) {
  tournament(slug: $slug) {
    name
    slug
    startAt
    events {
      id
      name
      videogame {
        id
        name
      }
      entrants(query: { perPage: 200 }) {
        nodes {
          name
          participants {
            id
            gamerTag
            prefix
            player {
              id
            }
          }
        }
      }
    }
  }
}`;
