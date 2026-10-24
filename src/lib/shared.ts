// המפה הכללית ב-Supabase (טבלה idiot_results): כל מי שאבחן את עצמו, מכל מכשיר
import { toast } from './feedback';
import { getState, setState } from './store';
import { supa } from './supa';
import type { SharedResult } from './types';

const COLS = 'id,name,role,group_name,x,y,mix,traits,created_at,updated_at';

export async function loadShared() {
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
    const row = { name: s.myName, role: s.myRole, group_name: s.group, x: r.x, y: r.y, mix: r.mix, traits: r.traits ?? {} };
    if (s.myShared) {
      const up = await supa.rpc('idiot_result_update', {
        p_id: s.myShared.id,
        p_token: s.myShared.token,
        p_name: row.name,
        p_role: row.role,
        p_group: row.group_name,
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
