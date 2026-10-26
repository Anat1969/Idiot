// המפה הכללית ב-Supabase (טבלה idiot_results): כל מי שאבחן את עצמו, מכל מכשיר
import { toast } from './feedback';
import { getState, setState } from './store';
import { supa } from './supa';
import type { Group, Role, SharedResult } from './types';
import { groupsOf, joinGroup } from './store';

const COLS = 'id,name,role,group_name,groups,x,y,mix,traits,created_at,updated_at';

export async function loadShared() {
  loadGroups();
  loadRoles();
  const res = await supa.from('idiot_results').select(COLS).order('created_at');
  if (res.error) {
    setState({ sharedSync: 'offline' });
    return;
  }
  const rows = res.data as SharedResult[];
  setState({ shared: rows, sharedSync: 'ready' });
  // הקבוצות שלי במסד הן המקור: מישהו אחר אולי הוסיף אותי לקבוצה. שינוי שלי שעוד לא נשלח גובר
  const s = getState();
  const mine = s.myShared && !s.publishPending ? rows.find((r) => r.id === s.myShared!.id) : undefined;
  if (mine) setState({ myGroups: groupsOf(mine) });
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

export async function loadRoles() {
  const res = await supa.from('idiot_roles').select('id,name,why,needs,reasons,source,created_at').order('created_at');
  if (!res.error) setState({ customRoles: (res.data as Role[]).map((r) => ({ ...r, custom: true })) });
}

/** תפקיד חדש שכל אחד יכול להוסיף. מחזיר את המזהה */
export async function createRole(name: string, why: string, needs: Role['needs']): Promise<string | null> {
  const ins = await supa.from('idiot_roles').insert({ name: name.trim().slice(0, 60), why: why.trim().slice(0, 300), needs }).select('id').single();
  if (ins.error) {
    toast('שמירת התפקיד נכשלה. נסו שוב', 'error');
    return null;
  }
  await loadRoles();
  toast(`התפקיד "${name.trim()}" נוסף`);
  return (ins.data as { id: string }).id;
}

/** המומחה מנתח תפקיד לפי השם (והתיאור): אילו תכונות נדרשות, באיזו מידה ולמה. שומר לכולם ומחזיר את המזהה */
export async function analyzeRole(name: string, why: string): Promise<string | null> {
  const res = await supa.functions.invoke('idiot-role', { body: { name: name.trim(), why: why.trim() } });
  if (res.error || !res.data?.role?.id) {
    let msg = 'הניתוח לא הצליח. נסו שוב, או סמנו בעצמכם';
    const ctx = (res.error as { context?: Response } | null)?.context;
    try {
      const body = ctx ? await ctx.json() : null;
      if (body?.error && /[\u0590-\u05FF]/.test(body.error)) msg = body.error;
    } catch {
      /* נשארים עם ההודעה הכללית */
    }
    toast(msg, 'error');
    return null;
  }
  await loadRoles();
  const r = res.data.role as Role;
  const msg =
    res.data.existing && r.source === 'auto'
      ? 'המומחה המלא עוד לא זמין. בינתיים נשאר הניתוח הראשוני'
      : res.data.existing
        ? `התפקיד "${r.name}" כבר נותח, הנה הוא`
        : res.data.upgraded
          ? `המומחה ניתח מחדש את "${r.name}"`
          : r.source === 'auto'
            ? `התפקיד "${r.name}" נוסף בניתוח ראשוני`
            : `התפקיד "${r.name}" נותח ונוסף`;
  toast(msg);
  return r.id;
}
