import { useSyncExternalStore } from 'react';
import { demoPeople, goals, pairs, profiles } from '../data/starter';
import { uid } from './id';
import type { Library, Person, Reading, Team } from './types';

export type SyncStatus = 'loading' | 'ready' | 'offline';

type State = {
  /** הספרייה מגיעה מ-Supabase. ערכת הפתיחה היא גם הגיבוי כשאין רשת */
  library: Library;
  sync: SyncStatus;
  canEdit: boolean;
  editMode: boolean;
  /** מכאן והלאה נשאר במכשיר בלבד: הערכות של אנשים הן מידע אישי */
  readings: Reading[];
  /** השם שלי, כפי שהוא מופיע על המפה ובצוותים */
  myName: string;
  people: Person[];
  teams: Team[];
};

const KEYS: Partial<Record<keyof State, string>> = {
  library: 'idiot.library',
  editMode: 'idiot.editMode',
  readings: 'idiot.readings',
  myName: 'idiot.myName',
  people: 'idiot.people',
  teams: 'idiot.teams',
};

function read<T>(key: string | undefined, fallback: T): T {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function seedPeople(): { people: Person[]; teams: Team[] } {
  const people = demoPeople.map((d, i) => ({ ...d, id: `demo-${i + 1}`, note: '', demo: true, at: Date.now() }));
  return { people, teams: [{ id: 'demo-team', name: 'צוות הפרויקט (דוגמה)', members: people.map((p) => p.id), demo: true }] };
}

const firstVisit = read<Person[] | null>(KEYS.people, null) === null;
const seed = firstVisit ? seedPeople() : null;

let state: State = {
  library: { profiles, pairs, goals, ...read<Partial<Library>>(KEYS.library, {}) },
  sync: 'loading',
  canEdit: false,
  editMode: read(KEYS.editMode, false),
  readings: read(KEYS.readings, []),
  myName: read(KEYS.myName, ''),
  people: seed ? seed.people : read(KEYS.people, []),
  teams: seed ? seed.teams : read(KEYS.teams, []),
};

const listeners = new Set<() => void>();

export function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const k of Object.keys(patch) as (keyof State)[]) {
    const key = KEYS[k];
    if (!key) continue;
    try {
      localStorage.setItem(key, JSON.stringify(state[k]));
    } catch {
      /* מכסה מלאה או מצב פרטי: המצב נשאר בזיכרון */
    }
  }
  listeners.forEach((l) => l());
}

if (seed) setState({ people: state.people, teams: state.teams });

export const getState = () => state;

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const selectEditing = (s: State) => s.canEdit && s.editMode && s.sync === 'ready';

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

/* ---------- פעולות על המידע האישי ---------- */

export const me = () => state.readings[0] ?? null;

/** המזהה שלי בצוות. אני לא ברשימת האנשים, אבל אפשר לצרף אותי לצוות */
export const ME_ID = 'me';

/** אני כאדם על המפה, לפי האבחון האחרון */
export function mePerson(s: Pick<State, 'readings' | 'myName'> = state): Person | null {
  const r = s.readings[0];
  return r ? { id: ME_ID, name: s.myName || 'אני', role: 'אני', note: '', x: r.x, y: r.y, at: r.at } : null;
}

export function setMyName(name: string) {
  setState({ myName: name.trim().slice(0, 40) });
}

export function addReading(r: Reading) {
  setState({ readings: [r, ...state.readings].slice(0, 30) });
}

export function savePerson(p: Omit<Person, 'id' | 'at'> & { id?: string }): Person {
  const existing = p.id ? state.people.find((x) => x.id === p.id) : undefined;
  const person: Person = { ...existing, ...p, id: p.id ?? uid(), at: Date.now(), demo: existing ? false : undefined } as Person;
  setState({ people: existing ? state.people.map((x) => (x.id === person.id ? person : x)) : [person, ...state.people] });
  return person;
}

export function deletePerson(id: string) {
  setState({
    people: state.people.filter((p) => p.id !== id),
    teams: state.teams.map((t) => ({ ...t, members: t.members.filter((m) => m !== id) })),
  });
}

export function clearDemo() {
  setState({ people: state.people.filter((p) => !p.demo), teams: state.teams.filter((t) => !t.demo) });
}

export function saveTeam(t: Team) {
  const has = state.teams.some((x) => x.id === t.id);
  setState({ teams: has ? state.teams.map((x) => (x.id === t.id ? t : x)) : [...state.teams, t] });
}

export function deleteTeam(id: string) {
  setState({ teams: state.teams.filter((t) => t.id !== id) });
}

/** גיבוי של כל המידע האישי לקובץ, ושחזור ממנו */
export function exportData() {
  return JSON.stringify({ app: 'idiot', version: 1, myName: state.myName, readings: state.readings, people: state.people, teams: state.teams }, null, 2);
}

export function importData(text: string): boolean {
  try {
    const d = JSON.parse(text);
    if (d.app !== 'idiot' || !Array.isArray(d.people)) return false;
    setState({ readings: d.readings ?? [], myName: d.myName ?? state.myName, people: d.people, teams: d.teams ?? [] });
    return true;
  } catch {
    return false;
  }
}
