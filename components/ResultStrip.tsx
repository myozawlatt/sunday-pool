import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { playerOf } from '@/lib/players';
import type { MatchResult } from '@/lib/results';
import type { Player, PlayerMap } from '@/lib/types';

export function ResultChip({ kind, player, eager = false }: { kind: 'winner' | 'loser'; player: Player; eager?: boolean }) {
  const isWinner = kind === 'winner';
  return (
    <span className={`result-chip result-chip--${kind}`}>
      <Avatar player={player} size="sm" eager={eager} />
      <span className="result-chip__name">{player.name}</span>
      <Badge kind={isWinner ? 'crown' : 'fried-egg'} variant="chip" label={isWinner ? 'Winner' : 'Loser'} />
    </span>
  );
}

/** Compact result line under a fixture card header (History): crown chip or Draw pill, plus loser chips. */
export function ResultStrip({ result, players, eager = false }: { result: MatchResult; players: PlayerMap; eager?: boolean }) {
  return (
    <div className="result-strip">
      {result.winnerId && <ResultChip kind="winner" player={playerOf(players, result.winnerId)} eager={eager} />}
      {result.outcome !== 'winner' && <span className="pill pill--draw">Draw</span>}
      {result.loserIds.map((id) => (
        <ResultChip key={id} kind="loser" player={playerOf(players, id)} eager={eager} />
      ))}
    </div>
  );
}
