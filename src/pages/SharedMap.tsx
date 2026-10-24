import { motion } from 'framer-motion';
import { useState } from 'react';
import { ColorMap, type Dot } from '../components/ColorMap';
import { Explain, TraitBars, TraitRadar } from '../components/Traits';
import { COLORS } from '../data/starter';
import { blend, coords, toneStyle } from '../lib/color';
import { averageTraits, fullTraits as toTraitsOrNull } from '../lib/compare';
import { colorAt, intensity } from '../lib/engine';
import { confirmAction, toast } from '../lib/feedback';
import { deleteShared } from '../lib/shared';
import { selectEditing, setState, useStore } from '../lib/store';
import { copyText, describe } from '../lib/text';
import type { Color } from '../lib/types';

const NONE = '__none__';

export function SharedMap() {
  const lib = useStore((s) => s.library);
  const shared = useStore((s) => s.shared);
  const sync = useStore((s) => s.sharedSync);
  const myShared = useStore((s) => s.myShared);
  const group = useStore((s) => s.group);
  const editing = useStore(selectEditing);
  const [filter, setFilter] = useState<string>(group && shared.some((r) => r.group_name === group) ? group : '');
  const [invite, setInvite] = useState(group);

  const groups = [...new Set(shared.map((r) => r.group_name).filter(Boolean))];
  const rows = filter === '' ? shared : shared.filter((r) => (filter === NONE ? !r.group_name : r.group_name === filter));
  const dots: Dot[] = rows.map((r) => ({ id: r.id, label: r.name, sub: r.role || undefined, x: r.x, y: r.y, kind: r.id === myShared?.id ? 'me' : 'person' }));
  const count = Object.fromEntries(COLORS.map((c) => [c, rows.filter((r) => colorAt(r) === c).length])) as Record<Color, number>;
  const avg = averageTraits(rows);
  const bins = [0, 0, 0, 0];
  rows.forEach((r) => bins[Math.min(3, Math.floor(intensity(r) * 4))]++);
  const maxBin = Math.max(1, ...bins);

  const inviteLink = `${location.origin}/?g=${encodeURIComponent(invite.trim())}#/me`;

  return (
    <div className="page">
      <header className="page-head split">
        <div>
          <span className="label">המפה הכללית · {rows.length} אנשים</span>
          <h1>כל מי שאבחן את עצמו</h1>
          <p className="lead">כל מי שעשה את האבחון ושמר את שמו, מכל טלפון ומכל מחשב, מופיע כאן. השם והתוצאה גלויים לכל מי שיש לו את הקישור.</p>
        </div>
      </header>

      {sync === 'offline' && <p className="hint">המפה הכללית לא זמינה כרגע. מוצג העותק האחרון שנשמר במכשיר.</p>}

      <section className="panel invite">
        <h3>הזמנה לקבוצה</h3>
        <p className="muted">כותבים שם לקבוצה (למשל "משפחה"), מעתיקים את הקישור ושולחים. מי שנכנס מהקישור ועושה אבחון מופיע כאן עם תווית הקבוצה.</p>
        <div className="row wrap">
          <input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="שם הקבוצה" maxLength={40} aria-label="שם הקבוצה" />
          <button
            className="btn solid sm"
            onClick={() => {
              setState({ group: invite.trim() });
              copyText(inviteLink).then(() => toast('קישור ההזמנה הועתק'), () => toast('ההעתקה נחסמה', 'error'));
            }}
          >
            העתקת קישור הזמנה
          </button>
        </div>
      </section>

      <div className="chips" role="radiogroup" aria-label="סינון לפי קבוצה">
        {[['', 'כולם'], ...groups.map((g) => [g, g]), ...(shared.some((r) => !r.group_name) && groups.length ? [[NONE, 'בלי קבוצה']] : [])].map(([k, label]) => (
          <button key={k} role="radio" aria-checked={filter === k} className={`chip-btn ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
            {label} <span className="mono">{k === '' ? shared.length : shared.filter((r) => (k === NONE ? !r.group_name : r.group_name === k)).length}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="hint">עוד אין כאן אף אחד. שלחו קישור הזמנה, וכל מי שיעשה את האבחון יופיע על המפה.</p>
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
                <h3>עוצמת הסגנון</h3>
                <div className="hist" aria-label="התפלגות העוצמה">
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
              <h3>מכ"ם התכונות של הקבוצה</h3>
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
                    <th>קבוצה</th>
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
                        <td>{r.group_name || '-'}</td>
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
