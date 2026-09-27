import { ImageResponse } from 'next/og';
import { formatDate, pointsLabel, weekday } from '@/lib/format';
import { playerOf } from '@/lib/players';
import { getPlayers, getPublishedDay } from '@/lib/queries';
import { computeResult } from '@/lib/results';
import { matchTitle, type Match, type PlayerMap } from '@/lib/types';

// Mirrors the page's tokens in app/globals.css
const BG = '#fbfaee';
const INK = '#2b1f1c';
const MUTED = 'rgba(43, 31, 28, 0.62)';
const RULE = 'rgba(43, 31, 28, 0.85)';
const BORDER = 'rgba(43, 31, 28, 0.14)';
const ACCENT = '#f1002a';

/**
 * The link-preview image for `/?date=YYYY-MM-DD` (the home page's og:image), so a shared link shows the
 * day's results in Facebook, Viber and other chats. It is drawn by Satori, which only does flexbox and
 * can't use the site's fonts (Clash Grotesk's licence, woff2), so it is a simpler card than the page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const [day, players] = await Promise.all([getPublishedDay(searchParams.get('date') ?? undefined), getPlayers()]);
  const asset = (path: string) => `${origin}${path}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '48px 64px',
          background: BG,
          color: INK,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset('/logo.png')} width={56} height={56} alt="" />
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, gap: 10 }}>
              <span>Sunday</span>
              <span style={{ color: ACCENT }}>Pool</span>
            </div>
          </div>
          {day && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 22, color: MUTED, textTransform: 'uppercase', letterSpacing: 3 }}>
                Match Day · {weekday(day.date)}
              </span>
              <span style={{ fontSize: 44, fontWeight: 700 }}>{formatDate(day.date)}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', height: 4, marginTop: 28, background: RULE }} />

        {day ? (
          <div style={{ display: 'flex', flex: 1, marginTop: 32, gap: 48 }}>
            {day.matches.map((match) => (
              <MatchColumn key={match.type} match={match} players={players} asset={asset} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', fontSize: 44, color: MUTED }}>
            Card &amp; Snooker league results
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // Matches the data cache's 300s, so a publish shows up here about as soon as on the page
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' },
    },
  );
}

function MatchColumn({ match, players, asset }: { match: Match; players: PlayerMap; asset: (path: string) => string }) {
  const result = computeResult(match.rows);
  const name = (id: string) => playerOf(players, id).name;
  const drawIds = result.outcome === 'draw-all' ? result.ranked.map((row) => row.playerId) : result.tiedTopIds;
  const winner = result.outcome === 'winner' ? result.ranked[0] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: 24, borderLeft: `2px solid ${BORDER}` }}>
      <span style={{ fontSize: 24, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 3 }}>
        {matchTitle(match.type)}
      </span>

      {winner ? (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, color: MUTED }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset('/crown.svg')} width={40} height={40} alt="" />
            Champion
          </div>
          <span style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>{name(winner.playerId)}</span>
          <span style={{ fontSize: 26, color: MUTED }}>{pointsLabel(winner.score)}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
          <span style={{ fontSize: 26, color: MUTED }}>Draw</span>
          <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15 }}>
            {drawIds.length > 0 ? drawIds.map(name).join(', ') : 'No points scored'}
          </span>
        </div>
      )}

      {result.loserIds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, color: MUTED }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset('/fried_egg.svg')} width={32} height={32} alt="" />
            {result.loserIds.length === 1 ? 'Protein' : 'Proteins'}
          </div>
          <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>{result.loserIds.map(name).join(', ')}</span>
        </div>
      )}
    </div>
  );
}
