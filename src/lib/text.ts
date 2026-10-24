import { colorAt, intensity, secondaryAt } from './engine';
import type { Library, Point } from './types';

export function strength(p: Point) {
  const v = intensity(p);
  if (v > 0.7) return 'מובהק';
  if (v > 0.4) return 'ברור';
  if (v > 0.18) return 'מתון';
  return 'מאוזן';
}

/** שם הסגנון במילים: צבע ראשי, משני ועוצמה */
export function describe(lib: Library, p: Point) {
  const main = lib.profiles[colorAt(p)];
  const sec = lib.profiles[secondaryAt(p)];
  return { main, sec, line: `${main.name} ${strength(p)}, עם נטייה ל${sec.name}` };
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}
