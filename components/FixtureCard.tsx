import Link from 'next/link';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { MatchIcon } from './MatchIcon';
import { ResultStrip } from './ResultStrip';
import { Tally } from './Tally';
import { playerOf, profileHref } from '@/lib/players';
import { computeResult } from '@/lib/results';
import { matchTitle, type Match, type MatchDay, type Player, type PlayerMap } from '@/lib/types';

/** Avatar + name, linked to the player's profile when they have one. */
function PlayerCell({ player, eager }: { player: Player; eager: boolean }) {
  const content = (
    <>
      <Avatar player={player} eager={eager} />
      <span className="player__name">{player.name}</span>
    </>
  );
  const href = profileHref(player);
  return href ? (
    <Link className="player player--link" href={href}>
      {content}
    </Link>
  ) : (
    <div className="player">{content}</div>
  );
}

/** `highlightId` marks one player's row (their own profile). */
export function FixtureCard({
  match,
  players,
  showResult = false,
  eager = false,
  highlightId,
}: { match: Match; players: PlayerMap; showResult?: boolean; eager?: boolean; highlightId?: string }) {
  const result = computeResult(match.rows);

  return (
    <article className={`fixture-card fixture-card--${match.type}`}>
      <header className="fixture-card__head">
        <MatchIcon type={match.type} />
        <h3 className="fixture-card__title">{matchTitle(match.type)}</h3>
        <span className="fixture-card__count">{match.rows.length} players</span>
      </header>
      {showResult && <ResultStrip result={result} players={players} eager={eager} />}
      <table className="fixture-table">
        <thead className="visually-hidden">
          <tr>
            <th className="col-rank" scope="col">#</th>
            <th className="col-player" scope="col">Player</th>
            <th className="col-score" scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {result.ranked.map((row) => {
            const player = playerOf(players, row.playerId);
            return (
              <tr key={row.playerId} className={row.playerId === highlightId ? 'is-self' : undefined}>
                <td className="col-rank">
                  {row.playerId === result.winnerId ? (
                    <Badge kind="crown" variant="rank" label="Winner" />
                  ) : (
                    <span className="rank">{row.rank}</span>
                  )}
                </td>
                <td className="col-player">
                  <PlayerCell player={player} eager={eager} />
                </td>
                <td className="col-score">
                  <Tally score={row.score} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}

export function FixtureGrid({
  day,
  players,
  showResults = false,
  eager = false,
  highlightId,
}: { day: MatchDay; players: PlayerMap; showResults?: boolean; eager?: boolean; highlightId?: string }) {
  return (
    <div className={`fixture-grid${day.matches.length === 1 ? ' fixture-grid--single' : ''}`}>
      {day.matches.map((match) => (
        <FixtureCard
          key={match.type}
          match={match}
          players={players}
          showResult={showResults}
          eager={eager}
          highlightId={highlightId}
        />
      ))}
    </div>
  );
}
