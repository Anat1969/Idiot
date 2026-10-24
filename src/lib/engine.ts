import type { Color, Point, Question, Reading } from './types';

/** פינת כל צבע במפה: אדום משימה ומהיר, צהוב אנשים ומהיר, ירוק אנשים ומתון, כחול משימה ומתון */
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
  let n = 0;
  for (const q of questions) {
    const c = answers[q.id];
    if (!c) continue;
    mix[c]++;
    n++;
  }
  if (!n) return { x: 0, y: 0, mix };
  let x = 0;
  let y = 0;
  (Object.keys(mix) as Color[]).forEach((c) => {
    mix[c] /= n;
    x += CORNER[c].x * mix[c];
    y += CORNER[c].y * mix[c];
  });
  return { x: round(x), y: round(y), mix };
}

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
