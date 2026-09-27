import type { Metadata } from 'next';
import { Badge } from '@/components/Badge';
import { PlayerCell } from '@/components/FixtureCard';
import { playerOf } from '@/lib/players';
import { getAllPublishedDays, getPlayers } from '@/lib/queries';
import { computeStandings } from '@/lib/ranking';

export const metadata: Metadata = { title: 'Ranking' };

export default async function RankingPage() {
  const [days, players] = await Promise.all([getAllPublishedDays(), getPlayers()]);
  const standings = computeStandings(days);

  return (
    <>
      <section className="page-head">
        <h1 className="page-title">
          Ranking <span className="page-title__sub">(Card + Snooker)</span>
        </h1>
        <div className="cue" aria-hidden="true" />
      </section>

      {standings.length > 0 ? (
        <table className="fixture-table ranking-table">
          <thead>
            <tr>
              <th className="col-rank" scope="col">Rank</th>
              <th className="col-player" scope="col">Name</th>
              <th className="col-num" scope="col">Total</th>
              <th className="col-num" scope="col">Win</th>
              <th className="col-num" scope="col">
                <span className="ranking-table__long">Win Rate</span>
                <span className="ranking-table__short">Win %</span>
              </th>
              <th className="col-num" scope="col">
                <Badge kind="crown" variant="chip" label="Crown" />
              </th>
              <th className="col-num" scope="col">
                <Badge kind="fried-egg" variant="chip" label="Egg" />
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr key={row.playerId}>
                <td className="col-rank">
                  <span className="rank">{row.rank}</span>
                </td>
                <td className="col-player">
                  <PlayerCell player={playerOf(players, row.playerId)} eager={i < 8} />
                </td>
                <td className="col-num">{row.total}</td>
                <td className="col-num">{row.wins}</td>
                <td className="col-num">{row.winRate}%</td>
                <td className="col-num">{row.crowns}</td>
                <td className="col-num">{row.eggs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-note">No match days published yet.</p>
      )}
    </>
  );
}
