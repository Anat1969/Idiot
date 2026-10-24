import type { CSSProperties } from 'react';
import { CORNER, intensity } from './engine';
import type { Color, Point } from './types';

type RGB = [number, number, number];
const HEX: Record<Color, RGB> = { red: [229, 72, 77], yellow: [245, 183, 0], green: [47, 163, 107], blue: [61, 123, 224] };
const NEUTRAL: RGB = [150, 146, 139];

const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;
const css = ([r, g, b]: RGB) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

/**
 * הצבע של אדם לפי המיקום המדויק שלו: גוון מהפינות הקרובות (כולל מעברים בין צבעים),
 * ועוצמה לפי המרחק מהמרכז. קרוב למרכז הצבע דהוי, בפינה הוא מלא.
 */
export function blend(p: Point) {
  let sum = 0;
  let rgb: RGB = [0, 0, 0];
  (Object.keys(CORNER) as Color[]).forEach((c) => {
    const d = Math.hypot(p.x - CORNER[c].x, p.y - CORNER[c].y);
    const w = Math.max(0, 1 - d / 2.4) ** 3;
    sum += w;
    rgb = [0, 1, 2].map((i) => rgb[i] + HEX[c][i] * w) as RGB;
  });
  const hue: RGB = sum ? (rgb.map((v) => v / sum) as RGB) : NEUTRAL;
  const strength = Math.min(1, 0.15 + intensity(p) * 1.15);
  const c = mix(NEUTRAL, hue, strength);
  return { c: css(c), deep: css(mix(c, [20, 20, 24], 0.42)), soft: css(mix(c, [255, 255, 255], 0.82)), strength };
}

/** משתני הצבע לרכיב שמייצג אדם */
export function toneStyle(p: Point): CSSProperties {
  const b = blend(p);
  return { ['--c' as string]: b.c, ['--c-deep' as string]: b.deep, ['--c-soft' as string]: b.soft };
}

/** קואורדינטות במילים, ביחידות של המפה (100- עד 100) */
export function coords(p: Point) {
  const x = Math.round(p.x * 100);
  const y = Math.round(p.y * 100);
  const i = Math.round(intensity(p) * 100);
  return {
    x: `${x < 0 ? 'משימה' : x > 0 ? 'אנשים' : 'מאוזן'} ${Math.abs(x)}`,
    y: `${y > 0 ? 'מהיר' : y < 0 ? 'מתון' : 'מאוזן'} ${Math.abs(y)}`,
    i: `עוצמה ${i}%`,
  };
}
