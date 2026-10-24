// המפה הכללית ב-Supabase (טבלה idiot_results): כל מי שאבחן את עצמו, מכל מכשיר
import { toast } from './feedback';
import { getState, setState } from './store';
import { supa } from './supa';
import type { Group, SharedResult } from './types';
import { joinGroup } from './store';

const COLS = 'id,name,role,group_name,groups,x,y,mix,traits,created_at,updated_at';

export async function loadShared() {
  loadGroups();
  const res = await supa.from('idiot_results').select(COLS).order('created_at');
  if (res.error) {
    setState({ sharedSync: 'offline' });
    return;
  }
  setState({ shared: res.data as SharedResult[], sharedSync: 'ready' });
  if (getState().publishPending) publishMe();
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const newToken = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');

let busy = false;

/**
 * שולח את האבחון האחרון שלי למפה הכללית. נשלח רק כשיש אבחון ושם.
 * אם אין חיבור, נשאר ממתין ונשלח בטעינה הבאה
 */
export async function publishMe(): Promise<boolean> {
  const s = getState();
  const r = s.readings[0];
  if (!r || !s.myName || s.optOut || busy) return false;
  busy = true;
  try {
    const row = { name: s.myName, role: s.myRole, group_name: s.myGroups[0] ?? '', groups: s.myGroups, x: r.x, y: r.y, mix: r.mix, traits: r.traits ?? {} };
    if (s.myShared) {
      const up = await supa.rpc('idiot_result_save', {
        p_id: s.myShared.id,
        p_token: s.myShared.token,
        p_name: row.name,
        p_role: row.role,
        p_groups: row.groups,
        p_x: row.x,
        p_y: row.y,
        p_mix: row.mix,
        p_traits: row.traits,
      });
      if (up.error) throw up.error;
      if (up.data === true) return done();
      // השורה נמחקה במפה הכללית: יוצרים חדשה
    }
    const token = newToken();
    const ins = await supa
      .from('idiot_results')
      .insert({ ...row, token_hash: await sha256(token) })
      .select('id')
      .single();
    if (ins.error) throw ins.error;
    setState({ myShared: { id: (ins.data as { id: string }).id, token } });
    return done();
  } catch (e) {
    console.warn(e);
    setState({ publishPending: true });
    return false;
  } finally {
    busy = false;
  }
}

function done() {
  setState({ publishPending: false });
  loadShared();
  return true;
}

/** מחיקה מהמפה הכללית: העורכת יכולה למחוק כל שורה */
export async function deleteShared(id: string) {
  const prev = getState().shared;
  setState({ shared: prev.filter((r) => r.id !== id) });
  const del = await supa.from('idiot_results').delete().eq('id', id);
  if (del.error) {
    setState({ shared: prev });
    toast('המחיקה נכשלה', 'error');
    return;
  }
  toast('נמחק מהמפה הכללית');
}

/** הסרת התוצאה שלי מהמפה הכללית, מהמכשיר שיצר אותה */
export async function removeMe() {
  const m = getState().myShared;
  if (!m) return;
  const res = await supa.rpc('idiot_result_delete', { p_id: m.id, p_token: m.token });
  if (res.error) return toast('ההסרה נכשלה', 'error');
  setState({ myShared: null, publishPending: false, optOut: true });
  toast('הוסרת מהמפה הכללית');
  loadShared();
}

export async function loadGroups() {
  const res = await supa.from('idiot_groups').select('name,about,created_at').order('created_at');
  if (!res.error) setState({ groups: res.data as Group[] });
}

/** פתיחת קבוצה חדשה, והצטרפות אליה. שם שכבר קיים: פשוט מצטרפים */
export async function createGroup(name: string, about: string): Promise<boolean> {
  const g = name.trim().slice(0, 40);
  if (!g) return false;
  const exists = getState().groups.some((x) => x.name === g);
  if (!exists) {
    const ins = await supa.from('idiot_groups').insert({ name: g, about: about.trim().slice(0, 200) });
    if (ins.error && ins.error.code !== '23505') {
      toast('פתיחת הקבוצה נכשלה. נסו שוב', 'error');
      return false;
    }
  }
  joinGroup(g);
  await loadGroups();
  publishMe();
  toast(exists ? `הצטרפת לקבוצה "${g}"` : `הקבוצה "${g}" נפתחה, והצטרפת אליה`);
  return true;
}

/** שיוך אדם לקבוצות (הוספה, הוצאה, העברה). פתוח לכולם, כמו פתיחת קבוצה */
export async function setGroupsFor(id: string, groups: string[]): Promise<boolean> {
  const clean = [...new Set(groups.map((g) => g.trim()).filter(Boolean))].slice(0, 10);
  const prev = getState().shared;
  setState({ shared: prev.map((r) => (r.id === id ? { ...r, groups: clean, group_name: clean[0] ?? '' } : r)) });
  if (getState().myShared?.id === id) setState({ myGroups: clean });
  const res = await supa.rpc('idiot_result_set_groups', { p_id: id, p_groups: clean });
  if (res.error || res.data !== true) {
    setState({ shared: prev });
    toast('השינוי לא נשמר. נסו שוב', 'error');
    return false;
  }
  return true;
}
