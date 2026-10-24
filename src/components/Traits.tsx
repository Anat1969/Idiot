import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { TRAITS } from '../data/traits';
import type { Traits } from '../lib/types';

/** הסבר קצר למספר: נפתח בלחיצה, בלי אייקונים */
export function Explain({ title = 'מה המספר הזה אומר', children }: { title?: string; children: ReactNode }) {
  return (
    <details className="explain">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

/**
 * פרופיל התכונות כפסים. offered = כמה פעמים הוצעה כל תכונה (8 בשאלון האישי, 3 בתצפית).
 * avg = ממוצע של קבוצת השוואה, מסומן כקו על כל פס
 */
export function TraitBars({ traits, offered, avg, avgLabel }: { traits: Traits; offered?: number; avg?: Traits | null; avgLabel?: string }) {
  const top = [...TRAITS].sort((a, b) => traits[b.key] - traits[a.key]).slice(0, 3).map((t) => t.key);
  return (
    <div className="tbars">
      {TRAITS.map((t, i) => {
        const v = traits[t.key];
        return (
          <div key={t.key} className={`tbar tone-${t.color} ${top.includes(t.key) ? 'top' : ''}`} title={t.text}>
            <span className="tbar-name">{t.label}</span>
            <span className="bar">
              <motion.i initial={{ width: 0 }} animate={{ width: `${v * 100}%` }} transition={{ delay: 0.1 + i * 0.04, duration: 0.7 }} />
              {avg && <em style={{ insetInlineStart: `${avg[t.key] * 100}%` }} aria-hidden="true" />}
            </span>
            <span className="mono">{offered ? `${Math.round(v * offered)}/${offered}` : `${Math.round(v * 100)}%`}</span>
          </div>
        );
      })}
      {avg && <span className="tbar-legend">הקו הדק: {avgLabel ?? 'ממוצע'}</span>}
    </div>
  );
}

const N = TRAITS.length;
const pt = (i: number, v: number) => {
  const a = (Math.PI * 2 * i) / N - Math.PI / 2;
  return [Math.cos(a) * v * 90, Math.sin(a) * v * 90];
};

/** מכ"ם תכונות: הפרופיל שלי מול מודל או ממוצע. ככל שהצורה רחוקה מהמרכז בכיוון מסוים, התכונה חזקה יותר */
export function TraitRadar({ series }: { series: { traits: Traits; label: string; color: string; dashed?: boolean }[] }) {
  return (
    <figure className="radar">
      <svg viewBox="-125 -115 250 230" role="img" aria-label="מכ״ם תכונות">
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon key={r} className="radar-ring" points={TRAITS.map((_, i) => pt(i, r).join(',')).join(' ')} />
        ))}
        {TRAITS.map((t, i) => {
          const [x, y] = pt(i, 1);
          const [lx, ly] = pt(i, 1.2);
          return (
            <g key={t.key}>
              <line className="radar-axis" x1="0" y1="0" x2={x} y2={y} />
              <text className={`radar-label tone-${t.color}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle">
                {t.label}
              </text>
            </g>
          );
        })}
        {series.map((s, si) => (
          <motion.polygon
            key={s.label}
            className={`radar-shape ${s.dashed ? 'dashed' : ''}`}
            style={{ ['--c' as string]: s.color }}
            points={TRAITS.map((t, i) => pt(i, Math.max(0.03, s.traits[t.key])).join(',')).join(' ')}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + si * 0.15, duration: 0.6 }}
          />
        ))}
      </svg>
      <figcaption>
        {series.map((s) => (
          <span key={s.label} className={s.dashed ? 'dashed' : ''} style={{ ['--c' as string]: s.color }}>
            <i />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
