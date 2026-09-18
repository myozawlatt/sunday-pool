'use client';

import { useRef, useState, useTransition } from 'react';
import { Badge } from '@/components/Badge';
import { MatchIcon } from '@/components/MatchIcon';
import { validateDayPayload, type DayPayload } from '@/lib/day-form';
import { computeResult } from '@/lib/results';
import { MATCH_TYPES, type DayStatus, type MatchDay, type MatchType, type Player } from '@/lib/types';

type Row = { key: number; playerId: string; score: string };
type MatchState = Record<MatchType, { enabled: boolean; rows: Row[] }>;

export type SaveDayAction = (payload: DayPayload) => Promise<{ error: string } | void>;

function ResultPreview({ rows, players }: { rows: Row[]; players: Player[] }) {
  const scored = rows
    .filter((row) => row.playerId && row.score !== '' && Number.isInteger(Number(row.score)) && Number(row.score) >= 0)
    .map((row) => ({ playerId: row.playerId, score: Number(row.score) }));
  if (scored.length < 2) return <p className="preview preview--empty">Add scores to preview the result.</p>;

  const result = computeResult(scored);
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? 'Unknown';

  return (
    <div className="preview">
      {result.winnerId && (
        <span className="preview__item">
          <Badge kind="crown" variant="chip" /> Winner: <strong>{name(result.winnerId)}</strong>
        </span>
      )}
      {result.outcome !== 'winner' && <span className="preview__item">Draw</span>}
      {result.loserIds.length > 0 && (
        <span className="preview__item">
          <Badge kind="fried-egg" variant="chip" /> {result.loserIds.length === 1 ? 'Loser' : 'Losers'}:{' '}
          <strong>{result.loserIds.map(name).join(', ')}</strong>
        </span>
      )}
    </div>
  );
}

export function DayForm({
  players,
  day,
  defaultDate,
  save,
}: {
  players: Player[];
  day?: MatchDay;
  defaultDate: string;
  save: SaveDayAction;
}) {
  const keyRef = useRef(0);
  const newRow = (playerId = '', score = ''): Row => ({ key: ++keyRef.current, playerId, score });

  const [date, setDate] = useState(day?.date ?? defaultDate);
  const [matches, setMatches] = useState<MatchState>(() => {
    const state = {} as MatchState;
    for (const { type } of MATCH_TYPES) {
      const existing = day?.matches.find((m) => m.type === type);
      state[type] = existing
        ? { enabled: true, rows: existing.rows.map((r) => newRow(r.playerId, String(r.score))) }
        : { enabled: !day && type === 'card', rows: [newRow(), newRow()] };
    }
    return state;
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const updateMatch = (type: MatchType, change: (m: MatchState[MatchType]) => MatchState[MatchType]) =>
    setMatches((current) => ({ ...current, [type]: change(current[type]) }));

  const updateRow = (type: MatchType, key: number, patch: Partial<Row>) =>
    updateMatch(type, (m) => ({ ...m, rows: m.rows.map((row) => (row.key === key ? { ...row, ...patch } : row)) }));

  function submit(status: DayStatus) {
    const payload: DayPayload = {
      id: day?.id,
      date,
      status,
      matches: MATCH_TYPES.filter(({ type }) => matches[type].enabled).map(({ type }) => ({
        type,
        rows: matches[type].rows.map((row) => ({
          playerId: row.playerId,
          score: row.score.trim() === '' ? Number.NaN : Number(row.score),
        })),
      })),
    };

    const problems = validateDayPayload(payload);
    setErrors(problems);
    if (problems.length > 0) return;

    startTransition(async () => {
      const result = await save(payload);
      if (result?.error) setErrors([result.error]);
    });
  }

  const isPublished = day?.status === 'published';

  return (
    <form className="day-form" onSubmit={(event) => event.preventDefault()}>
      <label className="field">
        <span className="field__label">Match day</span>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      {MATCH_TYPES.map(({ type, title }) => {
        const match = matches[type];
        const chosen = new Set(match.rows.map((row) => row.playerId).filter(Boolean));
        return (
          <fieldset key={type} className={`match-editor${match.enabled ? '' : ' is-off'}`}>
            <legend className="match-editor__head">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={match.enabled}
                  onChange={(e) => updateMatch(type, (m) => ({ ...m, enabled: e.target.checked }))}
                />
                <MatchIcon type={type} />
                <span className="match-editor__title">{title}</span>
              </label>
            </legend>

            {match.enabled && (
              <>
                <div className="score-rows">
                  {match.rows.map((row, index) => (
                    <div key={row.key} className="score-row">
                      <select
                        className="input"
                        aria-label={`${title} player ${index + 1}`}
                        value={row.playerId}
                        onChange={(e) => updateRow(type, row.key, { playerId: e.target.value })}
                      >
                        <option value="">Choose player…</option>
                        {players.map((player) => (
                          <option key={player.id} value={player.id} disabled={chosen.has(player.id) && player.id !== row.playerId}>
                            {player.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input input--score"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        placeholder="Score"
                        aria-label={`${title} score ${index + 1}`}
                        value={row.score}
                        onChange={(e) => updateRow(type, row.key, { score: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn btn--icon"
                        aria-label="Remove row"
                        disabled={match.rows.length <= 2}
                        onClick={() => updateMatch(type, (m) => ({ ...m, rows: m.rows.filter((r) => r.key !== row.key) }))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="match-editor__foot">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={match.rows.length >= players.length}
                    onClick={() => updateMatch(type, (m) => ({ ...m, rows: [...m.rows, newRow()] }))}
                  >
                    + Add player
                  </button>
                  <ResultPreview rows={match.rows} players={players} />
                </div>
              </>
            )}
          </fieldset>
        );
      })}

      {errors.length > 0 && (
        <ul className="form-errors" role="alert">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="form-actions">
        {isPublished ? (
          <>
            <button type="button" className="btn btn--ghost" disabled={pending} onClick={() => submit('draft')}>
              Unpublish (save as draft)
            </button>
            <button type="button" className="btn btn--primary" disabled={pending} onClick={() => submit('published')}>
              {pending ? 'Saving…' : 'Update'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn--ghost" disabled={pending} onClick={() => submit('draft')}>
              {pending ? 'Saving…' : 'Save draft'}
            </button>
            <button type="button" className="btn btn--primary" disabled={pending} onClick={() => submit('published')}>
              Publish
            </button>
          </>
        )}
      </div>
    </form>
  );
}
