import { motion } from 'framer-motion';
import type { PointerEvent } from 'react';
import { blend } from '../lib/color';
import { useStore } from '../lib/store';
import type { Color, Point } from '../lib/types';

export type Dot = Point & { id: string; label: string; sub?: string; kind: 'me' | 'person' | 'guess'; href?: string };
export type Link = { from: string; to: string; label?: string };

// סדר הרבעים ברשת שמאל לימין: אדום וצהוב למעלה, כחול וירוק למטה, תואם למיקום הנקודות
const QUADS: Color[] = ['red', 'yellow', 'blue', 'green'];
const TICKS = [-100, -50, 50, 100];
// טבעות עוצמה: המרחק מהמרכז באחוזים מהמרחק לפינה
const RINGS = [25, 50, 75, 100];

const pos = (v: number) => `${((v + 1) / 2) * 100}%`;

/** מפת הסגנונות: שדה צבע רציף על משטח נטוי, צירים עם יחידות, טבעות עוצמה ונקודות שמרחפות מעליו */
export function ColorMap({
  dots = [],
  links = [],
  onPick,
  size = 'md',
  tilt = true,
  caption,
  legend = true,
}: {
  dots?: Dot[];
  links?: Link[];
  onPick?: (p: Point) => void;
  size?: 'sm' | 'md' | 'lg';
  tilt?: boolean;
  caption?: string;
  legend?: boolean;
}) {
  const profiles = useStore((s) => s.library.profiles);
  const pick = (e: PointerEvent<HTMLDivElement>) => {
    if (!onPick) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    onPick({ x: Math.max(-1, Math.min(1, +x.toFixed(3))), y: Math.max(-1, Math.min(1, +y.toFixed(3))) });
  };
  const byId = new Map(dots.map((d) => [d.id, d]));
  return (
    <figure className={`map map-${size} ${tilt ? 'tilted' : ''}`}>
      <div className="map-stage">
        <div
          className={`map-plane ${onPick ? 'pickable' : ''}`}
          onPointerDown={pick}
          role={onPick ? 'button' : undefined}
          tabIndex={onPick ? 0 : undefined}
          aria-label={onPick ? 'לחצו על המפה כדי לסמן מיקום' : 'מפת הסגנונות'}
          onKeyDown={(e) => onPick && e.key === 'Enter' && onPick({ x: 0, y: 0 })}
        >
          <span className="field" aria-hidden="true" />
          {QUADS.map((c) => (
            <span key={c} className={`quad quad-${c}`}>
              <span className="quad-name">{profiles[c].name}</span>
              <span className="quad-title">{profiles[c].title}</span>
            </span>
          ))}
          <svg className="grid" viewBox="-100 -100 200 200" preserveAspectRatio="none" aria-hidden="true">
            {RINGS.map((r) => (
              <circle key={r} className={r === 100 ? 'ring outer' : 'ring'} cx="0" cy="0" r={r * 1.4142} vectorEffect="non-scaling-stroke" />
            ))}
            <line className="ax" x1="-100" y1="0" x2="100" y2="0" vectorEffect="non-scaling-stroke" />
            <line className="ax" x1="0" y1="-100" x2="0" y2="100" vectorEffect="non-scaling-stroke" />
            {TICKS.map((t) => (
              <g key={t}>
                <line className="tick" x1={t} y1="-3" x2={t} y2="3" vectorEffect="non-scaling-stroke" />
                <line className="tick" x1="-3" y1={t} x2="3" y2={t} vectorEffect="non-scaling-stroke" />
              </g>
            ))}
            {links.map((l) => {
              const a = byId.get(l.from);
              const b = byId.get(l.to);
              if (!a || !b) return null;
              return <line key={l.from + l.to} className="link" x1={a.x * 100} y1={-a.y * 100} x2={b.x * 100} y2={-b.y * 100} vectorEffect="non-scaling-stroke" />;
            })}
          </svg>
          {TICKS.map((t) => (
            <span key={`x${t}`} className="tick-label tx" style={{ left: pos(t / 100) }}>
              {Math.abs(t)}
            </span>
          ))}
          {TICKS.map((t) => (
            <span key={`y${t}`} className="tick-label ty" style={{ top: pos(-t / 100) }}>
              {Math.abs(t)}
            </span>
          ))}
          {RINGS.slice(0, 3).map((r) => (
            <span key={r} className="ring-label" style={{ left: pos((r / 100) * 0.7071), top: pos((r / 100) * 0.7071) }}>
              {r}%
            </span>
          ))}
          <span className="origin" aria-hidden="true" />
          {links.map((l) => {
            const a = byId.get(l.from);
            const b = byId.get(l.to);
            if (!a || !b || !l.label) return null;
            return (
              <span key={`ll${l.from}${l.to}`} className="link-label" style={{ left: pos((a.x + b.x) / 2), top: pos(-(a.y + b.y) / 2) }}>
                {l.label}
              </span>
            );
          })}
          {dots.map((d, i) => {
            const style = { left: pos(d.x), top: pos(-d.y), ['--c' as string]: blend(d).c };
            const body = (
              <>
                <i />
                <span className="pill">
                  <b>{d.label}</b>
                  {d.sub && <small>{d.sub}</small>}
                </span>
              </>
            );
            return (
              <motion.span
                key={d.id}
                className={`dot dot-${d.kind}`}
                style={style}
                initial={{ opacity: 0, scale: 0.4, z: 60 }}
                animate={{ opacity: 1, scale: 1, z: d.kind === 'me' ? 26 : 14 }}
                transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 260, damping: 18 }}
              >
                {d.href ? (
                  <a href={d.href} onPointerDown={(e) => e.stopPropagation()} aria-label={d.sub ? `${d.label}, ${d.sub}` : d.label}>
                    {body}
                  </a>
                ) : (
                  body
                )}
              </motion.span>
            );
          })}
        </div>
        <span className="axis-label al-top">יוזם · פועל מיד</span>
        <span className="axis-label al-bottom">שקול · בודק קודם</span>
        <span className="axis-label al-left">משימה</span>
        <span className="axis-label al-right">אנשים</span>
      </div>
      {legend && (
        <figcaption className="map-legend">
          <span>
            <b>ציר אופקי:</b> משימה 100 עד אנשים 100
          </span>
          <span>
            <b>ציר אנכי:</b> שקול 100 עד יוזם 100
          </span>
          <span>
            <b>מרחק מהמרכז:</b> עד כמה הסגנון בולט. במרכז מאוזן וצבע דהוי, בפינה בולט מאוד וצבע מלא
          </span>
        </figcaption>
      )}
      {caption && <span className="label">{caption}</span>}
    </figure>
  );
}
