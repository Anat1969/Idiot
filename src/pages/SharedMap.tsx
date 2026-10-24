import { motion } from 'framer-motion';
import { useState } from 'react';
import { ColorMap, type Dot } from '../components/ColorMap';
import { Explain, TraitBars, TraitRadar } from '../components/Traits';
import { COLORS } from '../data/starter';
import { blend, coords, toneStyle } from '../lib/color';
import { averageTraits, fullTraits as toTraitsOrNull } from '../lib/compare';
import { colorAt, intensity } from '../lib/engine';
import { confirmAction, toast } from '../lib/feedback';
import { createGroup, deleteShared, publishMe, setGroupsFor } from '../lib/shared';
import { go } from '../lib/router';
import { groupsOf, joinGroup, leaveGroup, selectEditing, useStore } from '../lib/store';
import { copyText, describe } from '../lib/text';
import type { Color, SharedResult } from '../lib/types';

const NONE = '__none__';

/** כתובת האפליקציה, גם כשהיא רצה מתיקייה (למשל מגיטהאב) */
const appUrl = () => `${location.origin}${location.pathname}`;

export function SharedMap({ group: filterParam }: { group?: string }) {
  const lib = useStore((s) => s.library);
  const shared = useStore((s) => s.shared);
  const sync = useStore((s) => s.sharedSync);
  const myShared = useStore((s) => s.myShared);
  const myGroups = useStore((s) => s.myGroups);
  const allGroups = useStore((s) => s.groups);
  const hasReading = useStore((s) => s.readings.length > 0);
  const myName = useStore((s) => s.myName);
  const editing = useStore(selectEditing);
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const filter = filterParam ?? '';

  // כל הקבוצות: אלה שנפתחו, ואלה שמופיעות רק בתוצאות (מקישורי הזמנה ישנים)
  const names = [...new Set([...allGroups.map((g) => g.name), ...shared.flatMap(groupsOf)])];
  const members = (g: string) => shared.filter((r) => groupsOf(r).includes(g));
  const rows = filter === '' ? shared : filter === NONE ? shared.filter((r) => !groupsOf(r).length) : members(filter);
  const dots: Dot[] = rows.map((r) => ({ id: r.id, label: r.name, sub: r.role || undefined, x: r.x, y: r.y, kind: r.id === myShared?.id ? 'me' : 'person' }));
  const count = Object.fromEntries(COLORS.map((c) => [c, rows.filter((r) => colorAt(r) === c).length])) as Record<Color, number>;
  const avg = averageTraits(rows);
  const bins = [0, 0, 0, 0];
  rows.forEach((r) => bins[Math.min(3, Math.floor(intensity(r) * 4))]++);
  const maxBin = Math.max(1, ...bins);
  const show = (g: string) => go(g ? `/map/${encodeURIComponent(g)}` : '/map', true);
  const invite = (g: string) => copyText(`${appUrl()}?g=${encodeURIComponent(g)}#/me`).then(() => toast(`קישור ההזמנה לקבוצה "${g}" הועתק`), () => toast('ההעתקה נחסמה', 'error'));
  const about_ = (g: string) => allGroups.find((x) => x.name === g)?.about ?? '';

  return (
    <div className="page">
      <header className="page-head split">
        <div>
          <span className="label">המפה הכללית · {rows.length} אנשים{filter && filter !== NONE ? ` · קבוצה: ${filter}` : ''}</span>
          <h1>{filter && filter !== NONE ? filter : 'כל מי שאבחן את עצמו'}</h1>
          <p className="lead">
            {filter && filter !== NONE
              ? about_(filter) || `המפה של מי שהצטרף לקבוצה "${filter}".`
              : 'כל מי שעשה את האבחון ושמר את שמו, מכל טלפון ומכל מחשב, מופיע כאן. השם והתוצאה גלויים לכל מי שיש לו את הקישור.'}
          </p>
        </div>
      </header>

      {sync === 'offline' && <p className="hint">המפה הכללית לא זמינה כרגע. מוצג העותק האחרון שנשמר במכשיר.</p>}

      <section className="panel groups-panel">
        <h3>קבוצות</h3>
        <p className="muted">
          קבוצה היא אנשים עם עניין משותף: משפחה, צוות בעבודה, כיתה, ועד. כל אחד יכול לפתוח קבוצה ולהצטרף לכמה קבוצות. לכל קבוצה יש מפה משלה, וקישור הזמנה: מי שנכנס ממנו ועושה אבחון מצטרף לקבוצה אוטומטית.
          {!hasReading && ' כדי להופיע במפת הקבוצה צריך גם לעשות אבחון ולשמור שם.'}
          {hasReading && !myName && ' כדי להופיע במפת הקבוצה צריך גם לשמור שם בדף התוצאה.'}
        </p>
        {names.length > 0 && (
          <div className="group-grid">
            {names.map((g) => {
              const m = members(g);
              const mine = myGroups.includes(g);
              return (
                <div key={g} className={`group-card ${mine ? 'mine' : ''} ${filter === g ? 'on' : ''}`}>
                  <div className="row between">
                    <b>{g}</b>
                    <span className="mono">{m.length} אנשים</span>
                  </div>
                  {about_(g) && <small>{about_(g)}</small>}
                  <span className="stack" aria-hidden="true">
                    {m.slice(0, 12).map((r) => (
                      <i key={r.id} style={toneStyle(r)} />
                    ))}
                  </span>
                  <div className="row wrap">
                    <button className="btn solid xs" onClick={() => show(g)} aria-pressed={filter === g}>
                      המפה של הקבוצה
                    </button>
                    {mine ? (
                      <button className="btn ghost xs" onClick={() => (leaveGroup(g), publishMe(), toast(`יצאת מהקבוצה "${g}"`))}>
                        יציאה מהקבוצה
                      </button>
                    ) : (
                      <button className="btn ghost xs" onClick={() => (joinGroup(g), publishMe(), toast(hasReading && myName ? `הצטרפת לקבוצה "${g}"` : `הצטרפת לקבוצה "${g}". תופיע במפה שלה אחרי האבחון ושמירת השם`))}>
                        הצטרפות
                      </button>
                    )}
                    <button className="btn ghost xs" onClick={() => invite(g)}>
                      קישור הזמנה
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <form
          className="new-group"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return toast('כתבו שם לקבוצה', 'error');
            if (await createGroup(name, about)) {
              show(name.trim());
              setName('');
              setAbout('');
            }
          }}
        >
          <h4>קבוצה חדשה</h4>
          <div className="row wrap">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם הקבוצה, למשל: המשפחה" maxLength={40} aria-label="שם הקבוצה החדשה" />
            <input value={about} onChange={(e) => setAbout(e.target.value)} placeholder="על מה הקבוצה (לא חובה)" maxLength={200} aria-label="על מה הקבוצה" />
            <button className="btn solid sm" type="submit" disabled={!name.trim()}>
              פתיחת הקבוצה
            </button>
          </div>
        </form>
      </section>

      <div className="chips" role="radiogroup" aria-label="הצגה לפי קבוצה">
        {[['', 'כולם'], ...names.map((g) => [g, g]), ...(shared.some((r) => !groupsOf(r).length) && names.length ? [[NONE, 'בלי קבוצה']] : [])].map(([k, label]) => (
          <button key={k} role="radio" aria-checked={filter === k} className={`chip-btn ${filter === k ? 'on' : ''}`} onClick={() => show(k)}>
            {label} <span className="mono">{k === '' ? shared.length : k === NONE ? shared.filter((r) => !groupsOf(r).length).length : members(k).length}</span>
          </button>
        ))}
      </div>

      {filter && filter !== NONE && <GroupMembers group={filter} people={shared} names={names} />}

      {rows.length === 0 ? (
        <p className="hint">
          {filter && filter !== NONE
            ? `בקבוצה "${filter}" עוד אין אנשים. הוסיפו אנשים מהרשימה למעלה, או שלחו קישור הזמנה.`
            : 'עוד אין כאן אף אחד. שלחו קישור הזמנה, וכל מי שיעשה את האבחון יופיע על המפה.'}
        </p>
      ) : (
        <>
          <section className="shared-top">
            <ColorMap dots={dots} size="lg" />
            <div className="team-side">
              <div className="dist" aria-label="הרכב הצבעים">
                {COLORS.map((c) => (
                  <motion.span key={c} className={`dist-seg tone-${c}`} initial={{ flexGrow: 0 }} animate={{ flexGrow: count[c] || 0.0001 }} transition={{ duration: 0.8 }}>
                    {count[c] > 0 && (
                      <b>
                        {lib.profiles[c].name} {count[c]}
                      </b>
                    )}
                  </motion.span>
                ))}
              </div>
              <section className="panel">
                <h3>עד כמה הסגנון בולט</h3>
                <div className="hist" aria-label="כמה אנשים בכל מרחק מהמרכז">
                  {['0 עד 25%', '25 עד 50%', '50 עד 75%', '75 עד 100%'].map((l, i) => (
                    <div key={l} className="hist-col">
                      <motion.i initial={{ height: 0 }} animate={{ height: `${(bins[i] / maxBin) * 100}%` }} transition={{ delay: i * 0.08 }} />
                      <b className="mono">{bins[i]}</b>
                      <small>{l}</small>
                    </div>
                  ))}
                </div>
                <Explain>
                  <p>כמה אנשים נמצאים בכל מרחק מהמרכז. קרוב למרכז = סגנון מאוזן וגמיש. קרוב לפינה = סגנון מובהק.</p>
                </Explain>
              </section>
              {avg && (
                <section className="panel">
                  <h3>הפרופיל הממוצע ({avg.n} אנשים)</h3>
                  <TraitBars traits={avg.avg} />
                  <Explain>
                    <p>לכל תכונה: באיזה אחוז מהפעמים שהיא הוצעה בשאלון, אנשים בחרו בה. בממוצע של כל מי שמוצג.</p>
                  </Explain>
                </section>
              )}
            </div>
          </section>

          {avg && (
            <section className="panel">
              <h3>התכונות של כל אחד, זו על גבי זו</h3>
              <TraitRadar
                series={rows
                  .filter((r) => toTraitsOrNull(r.traits))
                  .slice(0, 8)
                  .map((r) => ({ traits: toTraitsOrNull(r.traits)!, label: r.name, color: blend(r).c }))}
              />
            </section>
          )}

          <section className="panel">
            <h3>כל התוצאות</h3>
            <div className="matrix-wrap">
              <table className="results">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>קבוצות</th>
                    <th>סגנון</th>
                    <th>מיקום</th>
                    <th>תאריך</th>
                    {editing && <th />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const c = coords(r);
                    return (
                      <tr key={r.id} style={toneStyle(r)}>
                        <td>
                          <span className="swatch sm" aria-hidden="true" />
                          <b>{r.name}</b>
                          {r.role && <small className="role-sub">{r.role}</small>}
                          {r.id === myShared?.id && <span className="tag">אני</span>}
                        </td>
                        <td>
                          <GroupCell r={r} names={names} current={filter && filter !== NONE ? filter : ''} />
                        </td>
                        <td>{describe(lib, r).line}</td>
                        <td className="mono">
                          {c.x} · {c.y} · {c.i}
                        </td>
                        <td className="mono">{new Date(r.updated_at).toLocaleDateString('he-IL')}</td>
                        {editing && (
                          <td>
                            <button
                              className="btn ghost xs danger-text"
                              onClick={() =>
                                confirmAction({ title: `למחוק את ${r.name} מהמפה הכללית?`, body: 'התוצאה תימחק לכל המשתמשים.', action: 'מחיקה', onConfirm: () => deleteShared(r.id) })
                              }
                            >
                              מחיקה
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** תא הקבוצות בטבלה: הקבוצות של האדם, ותפריט להוספה או להעברה */
function GroupCell({ r, names, current }: { r: SharedResult; names: string[]; current: string }) {
  const mine = groupsOf(r);
  const options = names.filter((g) => !mine.includes(g));
  return (
    <div className="group-cell">
      <span>{mine.join(', ') || 'בלי קבוצה'}</span>
      {options.length > 0 && (
        <select
          aria-label={current ? `העברת ${r.name} לקבוצה אחרת` : `הוספת ${r.name} לקבוצה`}
          value=""
          onChange={async (e) => {
            const g = e.target.value;
            if (!g) return;
            const next = current ? [...mine.filter((x) => x !== current), g] : [...mine, g];
            if (await setGroupsFor(r.id, next)) toast(current ? `${r.name} הועבר מ"${current}" ל"${g}"` : `${r.name} נוסף לקבוצה "${g}"`);
          }}
        >
          <option value="">{current ? 'העברה לקבוצה...' : 'הוספה לקבוצה...'}</option>
          {options.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/** בדף של קבוצה: מי בפנים, ומי אפשר להוסיף. כל אחד יכול להוסיף, להוציא ולהעביר */
function GroupMembers({ group, people, names }: { group: string; people: SharedResult[]; names: string[] }) {
  const inside = people.filter((r) => groupsOf(r).includes(group));
  const outside = people.filter((r) => !groupsOf(r).includes(group));
  const others = names.filter((g) => g !== group);
  const set = async (r: SharedResult, next: string[], msg: string) => {
    if (await setGroupsFor(r.id, next)) toast(msg);
  };
  return (
    <section className="panel members">
      <h3>מי בקבוצה "{group}"</h3>
      <p className="muted">כאן מוסיפים אנשים מהמפה הכללית לקבוצה, מוציאים, או מעבירים לקבוצה אחרת. השינוי נשמר לכולם מיד.</p>
      <div className="members-cols">
        <div>
          <h4>
            בקבוצה <span className="mono">{inside.length}</span>
          </h4>
          {inside.length === 0 && <p className="muted">עוד אין אף אחד.</p>}
          <ul>
            {inside.map((r) => (
              <li key={r.id} style={toneStyle(r)}>
                <span className="swatch sm" aria-hidden="true" />
                <span className="who">
                  <b>{r.name}</b>
                  {r.role && <small>{r.role}</small>}
                </span>
                <button className="btn ghost xs" onClick={() => set(r, groupsOf(r).filter((g) => g !== group), `${r.name} הוצא מהקבוצה "${group}"`)}>
                  הוצאה מהקבוצה
                </button>
                {others.length > 0 && (
                  <select
                    aria-label={`העברת ${r.name} לקבוצה אחרת`}
                    value=""
                    onChange={(e) => e.target.value && set(r, [...groupsOf(r).filter((g) => g !== group && g !== e.target.value), e.target.value], `${r.name} הועבר ל"${e.target.value}"`)}
                  >
                    <option value="">העברה ל...</option>
                    {others.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>
            כל השאר במפה הכללית <span className="mono">{outside.length}</span>
          </h4>
          {outside.length === 0 && <p className="muted">כולם כבר בקבוצה.</p>}
          <ul>
            {outside.map((r) => (
              <li key={r.id} style={toneStyle(r)}>
                <span className="swatch sm" aria-hidden="true" />
                <span className="who">
                  <b>{r.name}</b>
                  {r.role && <small>{r.role}</small>}
                  {groupsOf(r).length > 0 && <small>בקבוצות: {groupsOf(r).join(', ')}</small>}
                </span>
                <button className="btn solid xs" onClick={() => set(r, [...groupsOf(r), group], `${r.name} נוסף לקבוצה "${group}"`)}>
                  הוספה לקבוצה
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
