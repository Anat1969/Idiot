// הספרייה המשותפת ב-Supabase (פרויקט cultura-GH, טבלה idiot_library)
import { goals, pairs, profiles } from '../data/starter';
import { roles } from '../data/traits';
import { toast } from './feedback';
import { getState, setState } from './store';
import { supa } from './supa';
import type { Color, GoalAdvice, Library, Pair, Profile, Role } from './types';

type Row = { id: string; kind: 'profile' | 'pair' | 'goal' | 'role'; data: unknown };

export async function loadLibrary() {
  const [lib, can] = await Promise.all([supa.from('idiot_library').select('id,kind,data'), supa.rpc('idiot_can_edit')]);
  if (lib.error) {
    setState({ sync: 'offline', canEdit: false });
    return;
  }
  // מתחילים מערכת הפתיחה, כך ששדה או פריט חסר לא משאירים חור
  const next: Library = { profiles: { ...profiles }, pairs: { ...pairs }, goals: { ...goals }, roles: { ...roles } };
  for (const r of lib.data as Row[]) {
    const key = r.id.split(':')[1];
    if (r.kind === 'profile') next.profiles[key as Color] = { ...profiles[key as Color], ...(r.data as Profile) };
    if (r.kind === 'pair') next.pairs[key] = { ...pairs[key], ...(r.data as Pair) };
    if (r.kind === 'goal') next.goals[key] = { ...goals[key], ...(r.data as GoalAdvice) };
    if (r.kind === 'role') next.roles[key] = { ...roles[key], ...(r.data as Role) };
  }
  setState({ library: next, canEdit: can.data === true, sync: 'ready' });
}

const KIND = { profiles: 'profile', pairs: 'pair', goals: 'goal', roles: 'role' } as const;

/** שמירת שדה אחד מתוך הדף. מעדכן מיד, ומחזיר אחורה אם השמירה נכשלה */
export async function saveField<S extends keyof Library>(section: S, key: string, field: string, value: unknown) {
  const lib = getState().library;
  const item = { ...(lib[section] as Record<string, object>)[key], [field]: value };
  setState({ library: { ...lib, [section]: { ...lib[section], [key]: item } } });
  const id = `${KIND[section]}:${key}`;
  const res = await supa.from('idiot_library').upsert({ id, kind: KIND[section], data: item, updated_at: new Date().toISOString() });
  if (res.error) {
    console.warn(res.error);
    setState({ library: lib });
    toast('השמירה נכשלה', 'error');
    return;
  }
  toast('נשמר');
}
