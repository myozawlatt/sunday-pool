import type { MatchType } from '@/lib/types';

function PlayingCardIcon() {
  return (
    <svg className="card-icon" viewBox="0 0 22 26" aria-hidden="true">
      <rect x="3.5" y="1.5" width="15" height="21" rx="2.2" fill="#d9cfbd" transform="rotate(10 11 12)" />
      <rect x="1" y="3" width="15" height="21" rx="2.2" fill="#fbf7ef" stroke="rgba(0,0,0,.18)" strokeWidth=".6" />
      <text x="3" y="8.6" fontSize="5.2" fontWeight="700" fontFamily="Inter, sans-serif" fill="#c42a35">
        A
      </text>
      <path
        d="M8.5 18.6C4.6 15.7 4 14 4.6 12.7c.7-1.4 2.8-1.4 3.9.1 1.1-1.5 3.2-1.5 3.9-.1.6 1.3 0 3-3.9 5.9Z"
        fill="#c42a35"
      />
    </svg>
  );
}

/** Same-size slot so "Card" and "Snooker" titles line up and centre on their icon. */
export function MatchIcon({ type }: { type: MatchType }) {
  return (
    <span className="fixture-card__icon" aria-hidden="true">
      {type === 'card' ? <PlayingCardIcon /> : <span className="ball ball--black ball--md" />}
    </span>
  );
}
