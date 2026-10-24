import { motion } from 'framer-motion';
import type { PointerEvent } from 'react';
import { useStore } from '../lib/store';
import type { Color, Point } from '../lib/types';

export type Dot = Point & { id: string; label: string; kind: 'me' | 'person' | 'guess'; href?: string };

// סדר הרבעים ברשת שמאל לימין: אדום וצהוב למעלה, כחול וירוק למטה, תואם למיקום הנקודות
const QUADS: Color[] = ['red', 'yellow', 'blue', 'green'];

const pos = (v: number) => `${((v + 1) / 2) * 100}%`;

/** מפת הסגנונות: ארבעה רבעים על משטח נטוי, ונקודות שמרחפות מעליו */
export function ColorMap({ dots = [], onPick, size = 'md', tilt = true, caption }: { dots?: Dot[]; onPick?: (p: Point) => void; size?: 'sm' | 'md' | 'lg'; tilt?: boolean; caption?: string }) {
  const profiles = useStore((s) => s.library.profiles);
  const pick = (e: PointerEvent<HTMLDivElement>) => {
    if (!onPick) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    onPick({ x: Math.max(-1, Math.min(1, +x.toFixed(3))), y: Math.max(-1, Math.min(1, +y.toFixed(3))) });
  };
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
          {QUADS.map((c) => (
            <span key={c} className={`quad quad-${c}`}>
              <span className="quad-name">{profiles[c].name}</span>
              <span className="quad-title">{profiles[c].title}</span>
            </span>
          ))}
          <span className="axis axis-x" aria-hidden="true" />
          <span className="axis axis-y" aria-hidden="true" />
          {dots.map((d, i) => {
            const style = { left: pos(d.x), top: pos(-d.y) };
            const body = (
              <>
                <i />
                <b>{d.label}</b>
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
                  <a href={d.href} onPointerDown={(e) => e.stopPropagation()} aria-label={d.label}>
                    {body}
                  </a>
                ) : (
                  body
                )}
              </motion.span>
            );
          })}
        </div>
        <span className="axis-label al-top">מהיר · יוזם</span>
        <span className="axis-label al-bottom">מתון · שוקל</span>
        <span className="axis-label al-left">משימה</span>
        <span className="axis-label al-right">אנשים</span>
      </div>
      {caption && <figcaption className="label">{caption}</figcaption>}
    </figure>
  );
}
