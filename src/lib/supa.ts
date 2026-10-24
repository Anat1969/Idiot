import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://ktqmwpbzcnzkhjskqisy.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0cW13cGJ6Y256a2hqc2txaXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxODM4OTgsImV4cCI6MjEwNTc1OTg5OH0.uPKn4hrLk16jhDoajMjPl4OmV5j1b3bMIECVmOdhWGI';

// מפתח עריכה מגיע בקישור (?key=...), נשמר במכשיר ונמחק מהכתובת
const KEY_STORE = 'idiot.editorKey';
function editorKey(): string | null {
  const url = new URL(location.href);
  const fromUrl = url.searchParams.get('key');
  if (fromUrl) {
    try {
      localStorage.setItem(KEY_STORE, fromUrl);
    } catch {
      /* מצב פרטי */
    }
    url.searchParams.delete('key');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    return fromUrl;
  }
  try {
    return localStorage.getItem(KEY_STORE);
  } catch {
    return null;
  }
}

export function saveEditorKey(k: string) {
  try {
    localStorage.setItem(KEY_STORE, k);
  } catch {
    /* מצב פרטי */
  }
}

export function forgetEditorKey() {
  try {
    localStorage.removeItem(KEY_STORE);
  } catch {
    /* מצב פרטי */
  }
}

const key = editorKey();

export const supa = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: key ? { 'x-editor-key': key } : {} },
});

