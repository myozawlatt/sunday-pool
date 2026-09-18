import type { MatchDay, Player } from './types';

/**
 * Sample data — shown when Supabase isn't configured, and used by `npm run seed`.
 * Covers every result case: single winner, draw with losers, draw for all, multiple losers,
 * single-match days, dense ranks (1,1,2,3,4,4) and a draft day that must stay hidden.
 */
export const samplePlayers: Player[] = [
  { id: 'p1', name: 'Alex Tan', avatarUrl: 'https://i.pravatar.cc/300?img=11' },
  { id: 'p2', name: 'Jordan Lim', avatarUrl: 'https://i.pravatar.cc/300?img=12' },
  { id: 'p3', name: 'Sam Wong', avatarUrl: 'https://i.pravatar.cc/300?img=13' },
  { id: 'p4', name: 'Casey Koh', avatarUrl: 'https://i.pravatar.cc/300?img=14' },
  { id: 'p5', name: 'Riley Ng', avatarUrl: 'https://i.pravatar.cc/300?img=15' },
  { id: 'p6', name: 'Morgan Teo', avatarUrl: 'https://i.pravatar.cc/300?img=33' },
  { id: 'p7', name: 'Jamie Chua', avatarUrl: 'https://i.pravatar.cc/300?img=47' },
  { id: 'p8', name: 'Taylor Goh', avatarUrl: 'https://i.pravatar.cc/300?img=52' },
];

export const sampleDays: MatchDay[] = [
  {
    id: 'd6',
    date: '2026-09-15', // draft — never shown publicly
    status: 'draft',
    matches: [{ type: 'card', rows: [{ playerId: 'p1', score: 2 }, { playerId: 'p2', score: 1 }] }],
  },
  {
    id: 'd5',
    date: '2026-09-14', // card: winner + two losers · snooker: draw + loser
    status: 'published',
    matches: [
      { type: 'card', rows: [{ playerId: 'p3', score: 6 }, { playerId: 'p7', score: 2 }, { playerId: 'p5', score: 0 }, { playerId: 'p1', score: 0 }] },
      { type: 'snooker', rows: [{ playerId: 'p2', score: 4 }, { playerId: 'p4', score: 4 }, { playerId: 'p6', score: 0 }] },
    ],
  },
  {
    id: 'd4',
    date: '2026-09-13', // snooker only: draw for all
    status: 'published',
    matches: [{ type: 'snooker', rows: [{ playerId: 'p1', score: 3 }, { playerId: 'p8', score: 3 }, { playerId: 'p3', score: 3 }] }],
  },
  {
    id: 'd3',
    date: '2026-09-12', // card only: winner, no loser
    status: 'published',
    matches: [{ type: 'card', rows: [{ playerId: 'p8', score: 7 }, { playerId: 'p1', score: 4 }, { playerId: 'p6', score: 1 }] }],
  },
  {
    id: 'd2',
    date: '2026-09-11', // card: winner · snooker: winner + loser
    status: 'published',
    matches: [
      { type: 'card', rows: [{ playerId: 'p4', score: 3 }, { playerId: 'p2', score: 2 }, { playerId: 'p8', score: 1 }] },
      { type: 'snooker', rows: [{ playerId: 'p5', score: 8 }, { playerId: 'p4', score: 2 }, { playerId: 'p2', score: 0 }] },
    ],
  },
  {
    id: 'd1',
    date: '2026-09-10', // snooker only: draw, dense ranks 1,1,2,3,4,4, two losers
    status: 'published',
    matches: [
      {
        type: 'snooker',
        rows: [
          { playerId: 'p1', score: 5 }, { playerId: 'p3', score: 5 }, { playerId: 'p7', score: 3 },
          { playerId: 'p6', score: 2 }, { playerId: 'p2', score: 0 }, { playerId: 'p5', score: 0 },
        ],
      },
    ],
  },
  {
    id: 'd0',
    date: '2026-09-09', // card only: winner + loser (7 published days → History shows 2 pages)
    status: 'published',
    matches: [{ type: 'card', rows: [{ playerId: 'p6', score: 5 }, { playerId: 'p8', score: 2 }, { playerId: 'p4', score: 0 }] }],
  },
  {
    id: 'd00',
    date: '2026-09-08', // card + snooker: winners
    status: 'published',
    matches: [
      { type: 'card', rows: [{ playerId: 'p2', score: 4 }, { playerId: 'p7', score: 3 }] },
      { type: 'snooker', rows: [{ playerId: 'p7', score: 6 }, { playerId: 'p3', score: 1 }] },
    ],
  },
];
