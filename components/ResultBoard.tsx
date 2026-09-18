import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { MatchIcon } from './MatchIcon';
import { playerOf } from '@/lib/players';
import { computeResult } from '@/lib/results';
import { matchTitle, type Match, type PlayerMap } from '@/lib/types';

function MemberRow({ ids, players, egg = false }: { ids: string[]; players: PlayerMap; egg?: boolean }) {
  return (
    <ul className="board__members">
      {ids.map((id) => {
        const player = playerOf(players, id);
        return (
          <li key={id} className="board__member">
            <span className="board__member-media">
              <Avatar player={player} size="lg" />
              {egg && <Badge kind="fried-egg" variant="mini" />}
            </span>
            <span className="board__member-name">{player.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Home result board for one match: winner with crown, or a draw, plus any 0-point losers. */
export function ResultBoard({ match, players }: { match: Match; players: PlayerMap }) {
  const result = computeResult(match.rows);
  const isWinner = result.outcome === 'winner' && result.winnerId;
  const drawIds = result.outcome === 'draw-all' ? result.ranked.map((row) => row.playerId) : result.tiedTopIds;

  return (
    <article className={`spot board ${isWinner ? 'spot--winner' : 'spot--draw'}`}>
      <header className="board__head">
        <MatchIcon type={match.type} />
        <span className="board__match">{matchTitle(match.type)}</span>
      </header>

      {isWinner ? (
        <>
          <div className="spot__media">
            <Avatar player={playerOf(players, result.winnerId!)} size="xl" eager />
            <Badge kind="crown" variant="spot" />
          </div>
          <h2 className="spot__title">Champion</h2>
          <p className="spot__name">{playerOf(players, result.winnerId!).name}</p>
        </>
      ) : (
        <>
          <h2 className="spot__title">Draw</h2>
          {drawIds.length > 0 ? (
            <MemberRow ids={drawIds} players={players} />
          ) : (
            <p className="board__note">No points scored</p>
          )}
        </>
      )}

      {result.loserIds.length > 0 && (
        <div className="board__losers">
          <p className="board__label board__label--protein">{result.loserIds.length === 1 ? 'Protein' : 'Proteins'}</p>
          <MemberRow ids={result.loserIds} players={players} egg />
        </div>
      )}
    </article>
  );
}
