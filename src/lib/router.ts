import { useSyncExternalStore } from 'react';
import type { Color, GoalKey } from './types';

export type Route =
  | { page: 'home' }
  | { page: 'colors'; color?: Color }
  | { page: 'me' }
  | { page: 'people'; id?: string }
  | { page: 'meet'; id?: string; goal?: GoalKey }
  | { page: 'team'; id?: string };

const COLORS = ['red', 'yellow', 'green', 'blue'];
const GOALS = ['persuade', 'ask', 'feedback', 'conflict', 'delegate'];

export function parse(hash: string): Route {
  const [, a, b, c] = hash.replace(/^#/, '').split('/').map(decodeURIComponent);
  switch (a) {
    case 'colors':
      return { page: 'colors', color: COLORS.includes(b) ? (b as Color) : undefined };
    case 'me':
      return { page: 'me' };
    case 'people':
      return { page: 'people', id: b || undefined };
    case 'meet':
      return { page: 'meet', id: b || undefined, goal: GOALS.includes(c) ? (c as GoalKey) : undefined };
    case 'team':
      return { page: 'team', id: b || undefined };
    default:
      return { page: 'home' };
  }
}

const sub = (l: () => void) => {
  window.addEventListener('hashchange', l);
  return () => window.removeEventListener('hashchange', l);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(sub, () => location.hash);
  return parse(hash);
}

export function go(path: string, replace = false) {
  const h = '#' + path;
  if (replace) history.replaceState(null, '', h), window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = h;
}
