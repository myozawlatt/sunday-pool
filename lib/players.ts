import type { Player, PlayerMap } from './types';

export const toPlayerMap = (players: Player[]): PlayerMap =>
  Object.fromEntries(players.map((player) => [player.id, player]));

/** Look up a player, falling back to a placeholder if they were removed. */
export const playerOf = (players: PlayerMap, id: string): Player =>
  players[id] ?? { id, name: 'Unknown player', avatarUrl: null, handle: '', quote: null };

/** Public profile path, or null for a placeholder player that has none. */
export const profileHref = (player: Player): string | null => (player.handle ? `/player/${player.handle}` : null);
