// מייצר SQL שטוען את ערכת הפתיחה לטבלה idiot_library. לא דורס פריטים שכבר נערכו
import { goals, pairs, profiles } from '../src/data/starter.ts';
import { roles } from '../src/data/traits.ts';

const rows: [string, string, unknown, number][] = [];
let sort = 0;
for (const [k, v] of Object.entries(profiles)) rows.push([`profile:${k}`, 'profile', v, sort++]);
for (const [k, v] of Object.entries(pairs)) rows.push([`pair:${k}`, 'pair', v, sort++]);
for (const [k, v] of Object.entries(goals)) rows.push([`goal:${k}`, 'goal', v, sort++]);
for (const [k, v] of Object.entries(roles)) rows.push([`role:${k}`, 'role', v, sort++]);

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
console.log('insert into public.idiot_library (id, kind, data, sort) values');
console.log(rows.map(([id, kind, data, s]) => `  (${lit(id)}, ${lit(kind)}, ${lit(JSON.stringify(data))}::jsonb, ${s})`).join(',\n'));
console.log('on conflict (id) do nothing;');
