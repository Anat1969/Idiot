import { TRAIT_KEYS } from '../data/traits';
import { zeroTraits } from './engine';
import type { SharedResult, Traits } from './types';

/** פרופיל שלם מתוצאה במפה הכללית, או null לאבחון ישן בלי תכונות */
export function fullTraits(t: Partial<Traits> | undefined): Traits | null {
  if (!t || !TRAIT_KEYS.every((k) => typeof t[k] === 'number')) return null;
  return t as Traits;
}

/** ממוצע התכונות של קבוצת אנשים */
export function averageTraits(rows: SharedResult[]): { avg: Traits; n: number } | null {
  const list = rows.map((r) => fullTraits(r.traits)).filter(Boolean) as Traits[];
  if (!list.length) return null;
  const avg = zeroTraits();
  list.forEach((t) => TRAIT_KEYS.forEach((k) => (avg[k] += t[k] / list.length)));
  return { avg, n: list.length };
}

import { traitsFromPoint } from './engine';
import type { Point } from './types';

/** תכונות של אדם: מהשאלון או מהארכיטיפ, ואם אין, הערכה מהמיקום */
export const personTraits = (p: Point & { traits?: Partial<Traits> }) => fullTraits(p.traits) ?? traitsFromPoint(p);
