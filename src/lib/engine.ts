import { TRAITS, TRAIT_KEYS } from '../data/traits';
import type { Color, Point, Question, Reading, Role, Trait, Traits } from './types';

/** פינת כל צבע במפה: אדום משימה ויוזם, צהוב אנשים ויוזם, ירוק אנשים ושקול, כחול משימה ושקול */
export const CORNER: Record<Color, Point> = {
  red: { x: -1, y: 1 },
  yellow: { x: 1, y: 1 },
  green: { x: 1, y: -1 },
  blue: { x: -1, y: -1 },
};

export function colorAt({ x, y }: Point): Color {
  if (y >= 0) return x <= 0 ? 'red' : 'yellow';
  return x > 0 ? 'green' : 'blue';
}

const ACROSS_X: Record<Color, Color> = { red: 'yellow', yellow: 'red', green: 'blue', blue: 'green' };
const ACROSS_Y: Record<Color, Color> = { red: 'blue', blue: 'red', yellow: 'green', green: 'yellow' };

/** הצבע המשני: השכן שהגבול איתו הכי קרוב */
export function secondaryAt(p: Point): Color {
  const main = colorAt(p);
  return Math.abs(p.x) < Math.abs(p.y) ? ACROSS_X[main] : ACROSS_Y[main];
}

/** עוצמה: כמה הסגנון מובהק, 0 במרכז עד 1 בפינה */
export const intensity = (p: Point) => Math.min(1, Math.hypot(p.x, p.y) / Math.SQRT2);

export function score(answers: Record<string, Color>, questions: Question[]): Omit<Reading, 'at'> {
  const mix: Record<Color, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  const chosen = zeroTraits();
  const offered = zeroTraits();
  let n = 0;
  for (const q of questions) {
    q.options.forEach((o) => offered[o.trait]++);
    const c = answers[q.id];
    const opt = q.options.find((o) => o.color === c);
    if (!opt) continue;
    mix[c]++;
    chosen[opt.trait]++;
    n++;
  }
  const traits = zeroTraits();
  TRAIT_KEYS.forEach((t) => (traits[t] = offered[t] ? round(chosen[t] / offered[t]) : 0));
  if (!n) return { x: 0, y: 0, mix, traits };
  let x = 0;
  let y = 0;
  (Object.keys(mix) as Color[]).forEach((c) => {
    mix[c] /= n;
    x += CORNER[c].x * mix[c];
    y += CORNER[c].y * mix[c];
  });
  return { x: round(x), y: round(y), mix, traits };
}

export const zeroTraits = (): Traits => Object.fromEntries(TRAIT_KEYS.map((t) => [t, 0])) as Traits;

/** כל פרופיל מנורמל לסכום 2, כמו בשאלון: בכל שאלה נבחרת אחת מתוך ארבע תכונות שמוצעות, וכל תכונה מוצעת בחצי מהשאלות */
function normalize(t: Partial<Traits>): Traits {
  const out = zeroTraits();
  const sum = TRAIT_KEYS.reduce((s, k) => s + (t[k] ?? 0), 0) || 1;
  TRAIT_KEYS.forEach((k) => (out[k] = round(((t[k] ?? 0) / sum) * 2)));
  return out;
}

/** הערכת תכונות ממיקום בלבד (למי שסומן על המפה בלי שאלון) */
export function traitsFromPoint(p: Point): Traits {
  const t: Partial<Traits> = {};
  TRAITS.forEach(({ key, color }) => (t[key] = Math.max(0.02, 1 - Math.hypot(p.x - CORNER[color].x, p.y - CORNER[color].y) / 2.83) ** 2));
  return normalize(t);
}

/** מיקום על המפה מתוך פרופיל תכונות */
export function pointFromTraits(t: Traits): Point {
  let x = 0;
  let y = 0;
  let sum = 0;
  TRAITS.forEach(({ key, color }) => {
    x += CORNER[color].x * t[key];
    y += CORNER[color].y * t[key];
    sum += t[key];
  });
  return sum ? { x: round(x / sum), y: round(y / sum) } : { x: 0, y: 0 };
}

const ADJ: Record<Color, Color[]> = { red: ['yellow', 'blue'], yellow: ['red', 'green'], green: ['yellow', 'blue'], blue: ['red', 'green'] };

/** הפרופיל הטיפוסי של כל צבע: שתי התכונות שלו גבוהות, השכנים בינוני, הצבע הנגדי נמוך */
export function modelTraits(c: Color): Traits {
  const t: Partial<Traits> = {};
  TRAITS.forEach(({ key, color }) => (t[key] = color === c ? 0.6 : ADJ[c].includes(color) ? 0.15 : 0.1));
  return normalize(t);
}

/** דמיון בין שני פרופילים, 0 עד 100 (קוסינוס בין הווקטורים) */
export function similarity(a: Traits, b: Traits) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  TRAIT_KEYS.forEach((k) => {
    dot += a[k] * b[k];
    na += a[k] ** 2;
    nb += b[k] ** 2;
  });
  return na && nb ? Math.round((dot / Math.sqrt(na * nb)) * 100) : 0;
}

/** הפרופיל של הארכיטיפ של תפקיד: התכונות שהתפקיד דורש */
export const roleTraits = (role: Role) => normalize(role.needs);

/**
 * התאמה לתפקיד, 0 עד 100: ממוצע משוקלל של התכונות שהתפקיד דורש,
 * ביחס לפרופיל האידיאלי של התפקיד. 100 = הפרופיל זהה לדרישות
 */
export function fit(t: Traits, role: Role) {
  const ideal = roleTraits(role);
  let got = 0;
  let max = 0;
  (Object.keys(role.needs) as Trait[]).forEach((k) => {
    const w = role.needs[k] ?? 0;
    got += w * Math.min(t[k], ideal[k]);
    max += w * ideal[k];
  });
  return max ? Math.round((got / max) * 100) : 0;
}

/** התכונות מהחזקה לחלשה */
export const ranked = (t: Traits) => [...TRAIT_KEYS].sort((a, b) => t[b] - t[a]);

const round = (v: number) => Math.round(v * 1000) / 1000;

/** פער בין ניחוש למציאות, באחוזים מהאלכסון של המפה */
export const gap = (a: Point, b: Point) => Math.round((Math.hypot(a.x - b.x, a.y - b.y) / Math.hypot(2, 2)) * 100);

export function gapText(pct: number): string {
  if (pct <= 10) return 'אתה מכיר את עצמך היטב. כמעט אין פער בין מה שחשבת לבין התשובות שלך.';
  if (pct <= 25) return 'מודעות עצמית טובה. פער קטן, כנראה בהיבט אחד שפחות בולט לך.';
  if (pct <= 45) return 'פער בינוני. מה שאתה מקרין שונה במקצת ממה שאתה חווה. שווה לבקש משוב משני אנשים קרובים.';
  return 'פער גדול. התדמית העצמית והתשובות מספרות סיפורים שונים. זו נקודת פתיחה טובה לשיחה עם מישהו שמכיר אותך.';
}

/** מתח בין שני אנשים: כמה הם רחוקים זה מזה, 0 עד 100 */
export const friction = (a: Point, b: Point) => gap(a, b);

export function frictionLabel(v: number) {
  if (v < 20) return 'דומים מאוד';
  if (v < 45) return 'משלימים';
  if (v < 70) return 'דורש תרגום';
  return 'הפכים';
}
