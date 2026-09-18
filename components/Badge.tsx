type Kind = 'crown' | 'fried-egg';
type Variant = 'rank' | 'score' | 'chip' | 'spot' | 'mini';

const ICONS: Record<Kind, { src: string; className: string }> = {
  crown: { src: '/crown.svg', className: 'icon--crown' },
  'fried-egg': { src: '/fried_egg.svg', className: 'icon--egg' },
};

/** Crown (winner) or fried egg (0 points / loser). Pass a label when the badge carries meaning on its own. */
export function Badge({ kind, variant, label }: { kind: Kind; variant: Variant; label?: string }) {
  const a11y = label ? { role: 'img', 'aria-label': label, title: label } : { 'aria-hidden': true };
  return (
    <span className={`icon ${ICONS[kind].className} icon--${variant}`} {...a11y}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ICONS[kind].src} alt="" decoding="async" />
    </span>
  );
}
