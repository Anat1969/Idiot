import { motion } from 'framer-motion';
import { useState } from 'react';
import { ColorMap, type Dot } from '../components/ColorMap';
import { Tilt } from '../components/Tilt';
import { COLORS, teamText } from '../data/starter';
import { colorAt, friction, frictionLabel } from '../lib/engine';
import { uid } from '../lib/id';
import { confirmAction, toast } from '../lib/feedback';
import { go } from '../lib/router';
import { ME_ID, deleteTeam, mePerson, saveTeam, useStore } from '../lib/store';
import { toneStyle } from '../lib/color';
import { copyText } from '../lib/text';
import type { Color, Person, Team as TeamT } from '../lib/types';

export function Team({ id }: { id?: string }) {
  const teams = useStore((s) => s.teams);
  if (id === 'new') return <TeamEditor />;
  const team = teams.find((t) => t.id === id);
  if (id && !team)
    return (
      <div className="page narrow">
        <h1>הצוות לא נמצא</h1>
        <p className="lead">צוותים נשמרים רק במכשיר שבו נוצרו.</p>
        <a className="btn solid" href="#/team">
          לכל הצוותים
        </a>
      </div>
    );
  return team ? <TeamPage team={team} key={team.id} /> : <TeamList />;
}

/** האנשים בצוות, כולל אותי אם צירפתי את עצמי */
function useRoster() {
  const people = useStore((s) => s.people);
  const readings = useStore((s) => s.readings);
  const myName = useStore((s) => s.myName);
  const myRole = useStore((s) => s.myRole);
  const me = mePerson({ readings, myName, myRole });
  return me ? [me, ...people] : people;
}

function TeamList() {
  const teams = useStore((s) => s.teams);
  const people = useRoster();
  return (
    <div className="page">
      <header className="page-head split">
        <div>
          <span className="label">צוותים</span>
          <h1>מי עובד עם מי</h1>
          <p className="lead">בוחרים אנשים מהמפה ומקבלים תמונת צוות: איזון, חיכוכים צפויים ומי ממלא איזה תפקיד.</p>
        </div>
        <a className="btn solid" href="#/team/new">
          צוות חדש
        </a>
      </header>
      <div className="team-grid">
        {teams.length === 0 && <p className="hint">עדיין אין צוותים.</p>}
        {teams.map((t, i) => {
          const members = t.members.map((m) => people.find((p) => p.id === m)).filter(Boolean) as Person[];
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Tilt max={6}>
                <a className="team-card" href={`#/team/${t.id}`}>
                  <span className="label">{members.length} אנשים</span>
                  <h2>{t.name}</h2>
                  <span className="stack" aria-hidden="true">
                    {members.map((m) => (
                      <i key={m.id} style={toneStyle(m)} />
                    ))}
                  </span>
                  <small>{members.map((m) => m.name).join(', ') || 'אין חברים'}</small>
                </a>
              </Tilt>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TeamEditor({ team, onDone }: { team?: TeamT; onDone?: () => void }) {
  const people = useRoster();
  const [name, setName] = useState(team?.name ?? '');
  const [members, setMembers] = useState<string[]>(team?.members ?? []);
  const toggle = (id: string) => setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  return (
    <div className="page narrow">
      <header className="page-head">
        <span className="label">{team ? 'עריכת צוות' : 'צוות חדש'}</span>
        <h1>{team ? team.name : 'מי בצוות?'}</h1>
      </header>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return toast('חסר שם לצוות', 'error');
          if (members.length < 2) return toast('צוות צריך לפחות שני אנשים', 'error');
          const t = { id: team?.id ?? uid(), name: name.trim(), members };
          saveTeam(t);
          toast('הצוות נשמר');
          if (onDone) onDone();
          else go(`/team/${t.id}`, true);
        }}
      >
        <label>
          <span>שם הצוות</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: צוות התכנון" maxLength={50} />
        </label>
        <fieldset>
          <legend>חברים ({members.length})</legend>
          <div className="chips">
            {people.map((p) => (
              <button type="button" key={p.id} style={toneStyle(p)} className={`chip-btn ${p.id === ME_ID ? 'me-chip' : ''} ${members.includes(p.id) ? 'on' : ''}`} aria-pressed={members.includes(p.id)} onClick={() => toggle(p.id)}>
                <i aria-hidden="true" />
                {p.name}
              </button>
            ))}
            <a className="chip-btn add" href="#/people/new">
              אדם חדש
            </a>
          </div>
        </fieldset>
        <div className="row wrap">
          <button className="btn solid" type="submit">
            שמירת הצוות
          </button>
          {onDone ? (
            <button className="btn ghost" type="button" onClick={onDone}>
              ביטול
            </button>
          ) : (
            <a className="btn ghost" href="#/team">
              ביטול
            </a>
          )}
        </div>
      </form>
    </div>
  );
}

const ROLE: Record<Color, string> = { red: 'מכריע', yellow: 'מייצר רעיונות', green: 'שומר על הקבוצה', blue: 'בודק איכות' };

function TeamPage({ team }: { team: TeamT }) {
  const lib = useStore((s) => s.library);
  const people = useRoster();
  const [editing, setEditing] = useState(false);
  if (editing) return <TeamEditor team={team} onDone={() => setEditing(false)} />;

  const members = team.members.map((m) => people.find((p) => p.id === m)).filter(Boolean) as Person[];
  const n = members.length || 1;
  const count = Object.fromEntries(COLORS.map((c) => [c, members.filter((m) => colorAt(m) === c).length])) as Record<Color, number>;
  const missing = COLORS.filter((c) => count[c] === 0);
  const excess = COLORS.filter((c) => members.length >= 3 && count[c] / n >= 0.5);
  const insights = [...missing.map((c) => ({ c, t: teamText.missing[c] })), ...excess.map((c) => ({ c, t: teamText.excess[c] }))];

  // מי הכי קרוב לכל פינה: התפקיד הטבעי שלו בצוות
  const roles = COLORS.map((c) => {
    const corner = { red: [-1, 1], yellow: [1, 1], green: [1, -1], blue: [-1, -1] }[c];
    const best = [...members].sort((a, b) => Math.hypot(a.x - corner[0], a.y - corner[1]) - Math.hypot(b.x - corner[0], b.y - corner[1]))[0];
    return { c, best };
  });

  const pairs = members.flatMap((a, i) => members.slice(i + 1).map((b) => ({ a, b, f: friction(a, b) }))).sort((x, y) => y.f - x.f);

  const summary = [
    `צוות: ${team.name} (${members.length} אנשים)`,
    `הרכב: ${COLORS.map((c) => `${lib.profiles[c].name} ${count[c]}`).join(' · ')}`,
    '',
    ...(insights.length ? insights.map((x) => `- ${x.t}`) : [teamText.balanced]),
    '',
    'תפקידים טבעיים:',
    ...roles.filter((r) => r.best).map((r) => `- ${ROLE[r.c]}: ${r.best.name}`),
    '',
    'זוגות שדורשים תשומת לב:',
    ...pairs.slice(0, 3).map((p) => `- ${p.a.name} ו${p.b.name}: ${lib.pairs[`${colorAt(p.a)}-${colorAt(p.b)}`].title}`),
  ].join('\n');

  const dots: Dot[] = members.map((m) => ({ id: m.id, label: m.name, sub: m.role, kind: m.id === ME_ID ? 'me' : 'person', x: m.x, y: m.y, href: m.id === ME_ID ? '#/me' : `#/people/${m.id}` }));

  return (
    <div className="page">
      <header className="page-head split">
        <div>
          <a className="back" href="#/team">
            כל הצוותים
          </a>
          <span className="label">{members.length} אנשים</span>
          <h1>{team.name}</h1>
        </div>
        <div className="row wrap">
          <button className="btn solid sm" onClick={() => copyText(summary).then(() => toast('הסיכום הועתק'), () => toast('ההעתקה נחסמה', 'error'))}>
            העתקת סיכום הצוות
          </button>
          <button className="btn ghost sm" onClick={() => setEditing(true)}>
            עריכת הצוות
          </button>
          <button
            className="btn ghost sm danger-text"
            onClick={() =>
              confirmAction({
                title: `למחוק את ${team.name}?`,
                body: 'הצוות יימחק. האנשים נשארים על המפה.',
                action: 'מחיקה',
                onConfirm: () => {
                  deleteTeam(team.id);
                  go('/team', true);
                  toast('הצוות נמחק');
                },
              })
            }
          >
            מחיקת הצוות
          </button>
        </div>
      </header>

      <section className="team-top">
        <ColorMap dots={dots} size="md" />
        <div className="team-side">
          <div className="dist" aria-label="הרכב הצוות">
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
            <h3>האבחנה</h3>
            {insights.length === 0 ? (
              <p>{teamText.balanced}</p>
            ) : (
              <ul className="insights">
                {insights.map((x) => (
                  <li key={x.t} className={`tone-${x.c}`}>
                    {x.t}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel">
            <h3>תפקידים טבעיים</h3>
            <ul className="roles">
              {roles.map(
                (r) =>
                  r.best && (
                    <li key={r.c} className={`tone-${r.c}`}>
                      <span className="chip">{ROLE[r.c]}</span>
                      <a href={r.best.id === ME_ID ? '#/me' : `#/people/${r.best.id}`}>{r.best.name}</a>
                      {count[r.c] === 0 && <small>אין {lib.profiles[r.c].name} מובהק. זה הכי קרוב.</small>}
                    </li>
                  )
              )}
            </ul>
          </section>
        </div>
      </section>

      {members.length > 1 && (
        <section className="panel">
          <h3>מפת חיכוכים</h3>
          <p className="muted">כמה רחוקים הסגנונות של כל שניים. ככל שהתא כהה יותר, השיחה ביניהם דורשת יותר תרגום.</p>
          <div className="matrix-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th />
                  {members.map((m) => (
                    <th key={m.id} scope="col" style={toneStyle(m)}>
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((a) => (
                  <tr key={a.id}>
                    <th scope="row" style={toneStyle(a)}>
                      {a.name}
                    </th>
                    {members.map((b) => {
                      const f = friction(a, b);
                      return (
                        <td key={b.id} style={{ ['--f' as string]: a.id === b.id ? 0 : f / 100 }} title={a.id === b.id ? '' : `${a.name} ו${b.name}: ${frictionLabel(f)}`}>
                          {a.id === b.id ? '' : f}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>שלושת הזוגות שכדאי לשים אליהם לב</h3>
          <div className="pair-list">
            {pairs.slice(0, 3).map(({ a, b, f }) => {
              const pr = lib.pairs[`${colorAt(a)}-${colorAt(b)}`];
              return (
                <div className="pair-row" key={a.id + b.id}>
                  <span className="chip">{frictionLabel(f)}</span>
                  <div>
                    <h4>
                      {a.name} ו{b.name}: {pr.title}
                    </h4>
                    <p>{pr.doThis}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
