// Reading the result of one set from a raw start.gg event. Used by the Elo rating and the stats page.
import { isHiddenPlayer } from '../config/hidden_players.js';
import { formatDisplayName, getPlayerId } from './names.js';

/**
 * The two sides of a played 1v1 set, or null for team sets, DQs and sets without a result.
 * @returns {{ p1: string, p2: string, score1: number, score2: number, p1Won: boolean } | null}
 */
export function readSet(set) {
  if (set.slots?.length !== 2) return null;
  const [slot1, slot2] = set.slots;
  const side1 = slot1.entrant?.participants ?? [];
  const side2 = slot2.entrant?.participants ?? [];
  if (side1.length !== 1 || side2.length !== 1) return null;

  const p1 = getPlayerId(side1[0]);
  const p2 = getPlayerId(side2[0]);
  const score1 = slot1.standing?.stats?.score?.value ?? 0;
  const score2 = slot2.standing?.stats?.score?.value ?? 0;
  if (p1 == null || p2 == null || score1 < 0 || score2 < 0) return null; // negative score = DQ

  let p1Won;
  if (score1 !== score2) p1Won = score1 > score2;
  else if (set.winnerId != null) p1Won = set.winnerId === slot1.entrant?.id;
  else return null;

  return { p1: String(p1), p2: String(p2), score1, score2, p1Won };
}

/**
 * Player IDs of the hidden players in an event (see data/hidden_players.json).
 * Set slots carry no names, so hidden players are recognised from the entrant list.
 * @returns {Set<string>}
 */
export function hiddenPlayerIds(event) {
  const ids = new Set();
  for (const entrant of event.entrants?.nodes ?? []) {
    for (const participant of entrant.participants ?? []) {
      const playerId = getPlayerId(participant);
      const gamerTag = participant.gamerTag ?? participant.player?.gamerTag ?? 'Unknown';
      const displayName = formatDisplayName({
        prefix: participant.prefix ?? '',
        gamerTag,
        entrantName: entrant.name,
      });
      if (playerId != null && isHiddenPlayer({ playerId, displayName })) ids.add(String(playerId));
    }
  }
  return ids;
}
