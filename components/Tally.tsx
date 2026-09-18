import { Badge } from './Badge';
import { pointsLabel } from '@/lib/format';

const bars = (count: number) => Array.from({ length: count }, (_, i) => <i key={i} />);

/** Tally marks: four bars struck through for every five points; a fried egg for zero. */
export function Tally({ score }: { score: number }) {
  if (score === 0) return <Badge kind="fried-egg" variant="score" label="0 points" />;

  const fullGroups = Math.floor(score / 5);
  const remainder = score % 5;

  return (
    <span className="tally" role="img" aria-label={pointsLabel(score)} title={pointsLabel(score)}>
      {Array.from({ length: fullGroups }, (_, i) => (
        <span key={i} className="tally__group tally__group--full">
          {bars(4)}
        </span>
      ))}
      {remainder > 0 && <span className="tally__group">{bars(remainder)}</span>}
    </span>
  );
}
