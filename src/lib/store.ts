import { useSyncExternalStore } from 'react';
import { goals, pairs, profiles } from '../data/starter';
import { archetypes, roles } from '../data/traits';
import { pointFromTraits, roleTraits } from './engine';
import { uid } from './id';
import type { Library, Person, Reading, SharedResult, Team } from './types';

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
  /** המפה הכללית: כל מי שאבחן את עצמו ושמר, מכל מכשיר */
  shared: SharedResult[];
  sharedSync: SyncStatus;
  /** הקבוצה שאליה הוזמנתי (?g= בקישור), למשל "משפחה" */
  group: string;
  /** התוצאה שלי במפה הכללית: המזהה, והמפתח שמאפשר לעדכן אותה רק מהמכשיר הזה */
  myShared: { id: string; token: string } | null;
  /** יש שינוי שעוד לא הגיע למפה הכללית (למשל כשאין חיבור) */
  publishPending: boolean;
  /** ביקשתי להסיר את עצמי מהמפה הכללית: לא שולחים עד שאוסיף שוב */
  optOut: boolean;
};

const KEYS: Partial<Record<keyof State, string>> = {
  library: 'idiot.library',
  editMode: 'idiot.editMode',
  readings: 'idiot.readings',
  myName: 'idiot.myName',
  people: 'idiot.people',
  teams: 'idiot.teams',
  shared: 'idiot.shared',
  group: 'idiot.group',
  myShared: 'idiot.myShared',
  publishPending: 'idiot.publishPending',
  optOut: 'idiot.optOut',
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

/** ארכיטיפים של תפקידים, כדי לראות את הקשר בין תפקיד לתכונות */
function seedPeople(): { people: Person[]; teams: Team[] } {
  const people: Person[] = archetypes.map((a) => {
    const role = roles[a.roleId];
    const traits = roleTraits(role);
    return { ...pointFromTraits(traits), id: `arch-${a.roleId}`, name: a.name, role: role.name, roleId: a.roleId, traits, note: '', demo: true, at: Date.now() };
  });
  return { people, teams: [{ id: 'demo-team', name: 'צוות פרויקט (ארכיטיפים)', members: people.map((p) => p.id), demo: true }] };
}

function groupFromUrl(): string | null {
  try {
    const url = new URL(location.href);
    const g = url.searchParams.get('g');
    if (g === null) return null;
    url.searchParams.delete('g');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    return g.trim().slice(0, 40);
  } catch {
    return null;
  }
}

const stored = read<Person[] | null>(KEYS.people, null);
// אנשי הדוגמה הישנים (בלי תפקיד) מוחלפים בארכיטיפים
const oldDemo = !!stored && stored.some((p) => p.demo && !p.roleId);
const seed = stored === null || oldDemo ? seedPeople() : null;
const kept = oldDemo ? stored!.filter((p) => !p.demo) : null;

let state: State = {
  library: { profiles, pairs, goals, roles, ...read<Partial<Library>>(KEYS.library, {}) },
  sync: 'loading',
  canEdit: false,
  editMode: read(KEYS.editMode, false),
  readings: read(KEYS.readings, []),
  myName: read(KEYS.myName, ''),
  people: seed ? [...(kept ?? []), ...seed.people] : (stored ?? []),
  teams: seed ? [...(oldDemo ? read<Team[]>(KEYS.teams, []).filter((t) => !t.demo) : []), ...seed.teams] : read(KEYS.teams, []),
  shared: read(KEYS.shared, []),
  sharedSync: 'loading',
  group: groupFromUrl() ?? read(KEYS.group, ''),
  myShared: read(KEYS.myShared, null),
  publishPending: read(KEYS.publishPending, false),
  optOut: read(KEYS.optOut, false),
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
setState({ group: state.group });

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
  setState({ myName: name.trim().slice(0, 40), publishPending: true, optOut: false });
}

export function addReading(r: Reading) {
  setState({ readings: [r, ...state.readings].slice(0, 30), publishPending: true });
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
