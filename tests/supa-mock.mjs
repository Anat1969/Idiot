// מוק ל-Supabase: PostgREST ו-RPC, עם בדיקת מפתח עריכה כמו ה-RLS האמיתי
import { readFileSync } from 'node:fs';
export const TEST_KEY = 'test-editor-key-1234567890';

// הנתונים נקראים מקובץ ה-seed שנטען ל-Supabase, כך שהמוק והמסד זהים
export function createDb() {
  const sql = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
  const rows = [...sql.matchAll(/\('([^']+)', '(\w+)', '((?:[^']|'')*)'::jsonb, (\d+)\)/g)].map((m) => ({
    id: m[1],
    kind: m[2],
    data: JSON.parse(m[3].replace(/''/g, "'")),
    sort: +m[4],
  }));
  return { idiot_library: rows, idiot_results: [], tokens: new Map(), requests: [], offline: false };
}

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

export async function mockSupabase(ctx, db) {
  await ctx.route('https://ktqmwpbzcnzkhjskqisy.supabase.co/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const isEditor = req.headers()['x-editor-key'] === TEST_KEY;
    db.requests.push({ method, path: url.pathname + url.search, body: req.postData() });
    if (db.offline) return route.fulfill({ status: 503, body: 'down' });
    if (url.pathname === '/rest/v1/rpc/idiot_can_edit') return json(route, isEditor);
    if (url.pathname === '/rest/v1/idiot_results') {
      if (method === 'GET') return json(route, db.idiot_results);
      if (method === 'POST') {
        const body = req.postDataJSON();
        const row = { ...body, id: `r${db.idiot_results.length + 1}-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        db.tokens.set(row.id, body.token_hash);
        delete row.token_hash;
        db.idiot_results.push(row);
        return json(route, { id: row.id }, 201);
      }
      if (method === 'DELETE') {
        if (!isEditor) return json(route, [], 200);
        const id = url.searchParams.get('id')?.replace(/^eq\./, '');
        db.idiot_results = db.idiot_results.filter((r) => r.id !== id);
        return route.fulfill({ status: 204, body: '' });
      }
    }
    if (url.pathname === '/rest/v1/rpc/idiot_result_update' || url.pathname === '/rest/v1/rpc/idiot_result_delete') {
      const b = req.postDataJSON();
      const { createHash } = await import('node:crypto');
      const ok = db.tokens.get(b.p_id) === createHash('sha256').update(b.p_token).digest('hex');
      if (!ok) return json(route, false);
      if (url.pathname.endsWith('delete')) db.idiot_results = db.idiot_results.filter((r) => r.id !== b.p_id);
      else Object.assign(db.idiot_results.find((r) => r.id === b.p_id), { name: b.p_name, group_name: b.p_group, x: b.p_x, y: b.p_y, mix: b.p_mix, traits: b.p_traits, updated_at: new Date().toISOString() });
      return json(route, true);
    }
    if (url.pathname === '/rest/v1/idiot_library') {
      if (method === 'GET') return json(route, db.idiot_library);
      if (!isEditor) return json(route, { message: 'new row violates row-level security policy' }, 403);
      if (method === 'POST') {
        const body = req.postDataJSON();
        for (const r of Array.isArray(body) ? body : [body]) {
          const i = db.idiot_library.findIndex((x) => x.id === r.id);
          if (i >= 0) db.idiot_library[i] = { ...db.idiot_library[i], ...r };
          else db.idiot_library.push(r);
        }
        return route.fulfill({ status: 201, body: '' });
      }
    }
    return json(route, { message: 'unmocked' }, 404);
  });
}
