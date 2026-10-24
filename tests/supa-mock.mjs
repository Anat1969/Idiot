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
  return { idiot_library: rows, requests: [], offline: false };
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
