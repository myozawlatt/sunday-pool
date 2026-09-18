import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { MatchIcon } from './MatchIcon';
import { ResultStrip } from './ResultStrip';
import { Tally } from './Tally';
import { playerOf } from '@/lib/players';
import { computeResult } from '@/lib/results';
import { matchTitle, type Match, type MatchDay, type PlayerMap } from '@/lib/types';

export function FixtureCard({
  match,
  players,
  showResult = false,
  eager = false,
}: { match: Match; players: PlayerMap; showResult?: boolean; eager?: boolean }) {
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
        <thead>
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
              <tr key={row.playerId}>
                <td className="col-rank">
                  {row.playerId === result.winnerId ? (
                    <Badge kind="crown" variant="rank" label="Winner" />
                  ) : (
                    <span className="rank">{row.rank}</span>
                  )}
                </td>
                <td className="col-player">
                  <div className="player">
                    <Avatar player={player} eager={eager} />
                    <span className="player__name">{player.name}</span>
                  </div>
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
}: { day: MatchDay; players: PlayerMap; showResults?: boolean; eager?: boolean }) {
  return (
    <div className={`fixture-grid${day.matches.length === 1 ? ' fixture-grid--single' : ''}`}>
      {day.matches.map((match) => (
        <FixtureCard key={match.type} match={match} players={players} showResult={showResults} eager={eager} />
      ))}
    </div>
  );
}
