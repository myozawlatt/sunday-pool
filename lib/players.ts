import type { Player, PlayerMap } from './types';

export const toPlayerMap = (players: Player[]): PlayerMap =>
  Object.fromEntries(players.map((player) => [player.id, player]));

/** Look up a player, falling back to a placeholder if they were removed. */
export const playerOf = (players: PlayerMap, id: string): Player =>
  players[id] ?? { id, name: 'Unknown player', avatarUrl: null };
