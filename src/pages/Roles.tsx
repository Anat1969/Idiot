import { motion } from 'framer-motion';
import { ColorMap, type Dot } from '../components/ColorMap';
import { Editable } from '../components/Editable';
import { Explain, TraitRadar } from '../components/Traits';
import { Tilt } from '../components/Tilt';
import { GROWTH, NEED_LEVELS, TRAITS, traitInfo } from '../data/traits';
import { blend, toneStyle } from '../lib/color';
import { fullTraits, personTraits } from '../lib/compare';
import { fit, pointFromTraits, roleTraits } from '../lib/engine';
import { go } from '../lib/router';
import { mePerson, useStore } from '../lib/store';
import { useAllRoles } from '../lib/roles';
import { analyzeRole, createRole } from '../lib/shared';
import { toast } from '../lib/feedback';
import { copyText } from '../lib/text';
import { useState } from 'react';
import type { Point, Role, Trait, Traits } from '../lib/types';

const SOURCE_TAG = { ai: 'נותח על ידי המומחה', auto: 'ניתוח ראשוני', manual: 'סומן על ידי משתמש' } as const;

/** ניתוח ראשוני: מבקשים מהמומחה ניתוח מלא. אם הוא עדיין לא זמין, נשאר הניתוח הראשוני */
function Reanalyze({ role }: { role: Role }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn ghost sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await analyzeRole(role.name, role.why);
        setBusy(false);
      }}
    >
      {busy ? 'המומחה מנתח...' : 'ניתוח מלא על ידי המומחה'}
    </button>
  );
}

type Candidate = Point & { id: string; name: string; role?: string; traits: Traits; source: string; href?: string };

function useCandidates(): Candidate[] {
  const people = useStore((s) => s.people);
  const shared = useStore((s) => s.shared);
  const readings = useStore((s) => s.readings);
  const myName = useStore((s) => s.myName);
  const myShared = useStore((s) => s.myShared);
  const myRole = useStore((s) => s.myRole);
  const me = mePerson({ readings, myName, myRole });
  const out: Candidate[] = [];
  if (me && fullTraits(readings[0]?.traits)) out.push({ ...me, traits: readings[0].traits!, source: 'אני', href: '#/me' });
  people.forEach((p) => out.push({ id: p.id, name: p.name, role: p.role, x: p.x, y: p.y, traits: personTraits(p), source: p.roleId ? 'דמות לדוגמה' : p.traits ? 'תצפית' : 'הערכה מהמפה', href: `#/people/${p.id}` }));
  shared.forEach((r) => {
    const t = fullTraits(r.traits);
    if (t && r.id !== myShared?.id) out.push({ id: r.id, name: r.name, role: r.role, x: r.x, y: r.y, traits: t, source: r.group_name ? `המפה הכללית · ${r.group_name}` : 'המפה הכללית' });
  });
  return out;
}

export function Roles({ id }: { id?: string }) {
  const list = useAllRoles();
  if (id === 'new') return <NewRole />;
  const role = id ? list.find((r) => r.id === id) : undefined;
  return (
    <div className="page">
      <header className="page-head">
        <span className="label">תפקידים · {list.length}</span>
        <h1>איזה תפקיד נשען על מה</h1>
        <p className="lead">לכל תפקיד יש תכונות שההצלחה בו נשענת עליהן. בוחרים תפקיד ורואים מה הוא דורש, מי מתאים לו, ותוכנית אישית: מה כבר חזק אצלכם ומה כדאי לחזק. חסר תפקיד? מוסיפים אותו.</p>
        <div className="row wrap">
          <a className="btn solid" href="#/roles/new">
            הוספת תפקיד
          </a>
        </div>
      </header>
      <div className="role-grid">
        {list.map((r, i) => {
          const t = roleTraits(r);
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Tilt max={6}>
                <button className={`role-card ${id === r.id ? 'on' : ''}`} style={toneStyle(pointFromTraits(t))} onClick={() => go(`/roles/${r.id}`, true)} aria-pressed={id === r.id}>
                  <span className="swatch" aria-hidden="true" />
                  <b>{r.name}</b>
                  {r.custom && <small className="custom-tag">{SOURCE_TAG[r.source ?? 'manual']}</small>}
                  <span className="needs">
                    {TRAITS.filter((x) => r.needs[x.key]).map((x) => (
                      <span key={x.key} className={`need tone-${x.color}`}>
                        {x.label}
                      </span>
                    ))}
                  </span>
                </button>
              </Tilt>
            </motion.div>
          );
        })}
      </div>
      {role ? <RoleDetail role={role} key={role.id} /> : id ? <p className="hint">התפקיד לא נמצא. אולי הוא עוד נטען, או שנמחק.</p> : <p className="hint">בחרו תפקיד כדי לראות מה הוא דורש, מי מתאים לו, ותוכנית אישית.</p>}
    </div>
  );
}

function RoleDetail({ role }: { role: Role }) {
  const candidates = useCandidates();
  const ideal = roleTraits(role);
  const at = pointFromTraits(ideal);
  const ranked = candidates.map((c) => ({ c, f: fit(c.traits, role) })).sort((a, b) => b.f - a.f);
  const best = ranked[0];
  const dots: Dot[] = [
    { id: 'role', label: role.name, sub: 'דמות לדוגמה', kind: 'guess', ...at },
    ...ranked.slice(0, 6).map(({ c }) => ({ id: c.id, label: c.name, sub: c.role, x: c.x, y: c.y, kind: (c.source === 'אני' ? 'me' : 'person') as Dot['kind'] })),
  ];

  return (
    <motion.article className="role-detail" style={toneStyle(at)} initial={{ opacity: 0, y: 30, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}>
      <header>
        <span className="label">תפקיד</span>
        {role.custom ? (
          <>
            <h2>{role.name}</h2>
            {role.why && <p className="lead">{role.why}</p>}
          </>
        ) : (
          <>
            <Editable section="roles" item={role.id} field="name" value={role.name} as="h2" />
            <Editable section="roles" item={role.id} field="why" value={role.why} className="lead" />
          </>
        )}
      </header>
      <div className="role-top">
        <section className="panel">
          <h3>מה התפקיד דורש</h3>
          <p className="muted">
            התכונות שההצלחה בתפקיד נשענת עליהן, וכמה כל אחת חשובה. תכונה שלא מופיעה כאן לא נדרשת בתפקיד.
            {role.source === 'ai' && ' הניתוח נעשה על ידי המומחה, ולכל תכונה כתוב למה.'}
            {role.source === 'auto' && ' זה ניתוח ראשוני לפי סוג התפקיד, מתוך מאגר הידע. כשהמומחה המלא זמין, אפשר לבקש ניתוח מדויק לתפקיד הזה.'}
          </p>
          {role.source === 'auto' && <Reanalyze role={role} />}
          <NeedBars role={role} />
          <Explain>
            <p>ההתאמה של כל אדם נמדדת מול התכונות האלה, לפי החשיבות של כל אחת. תכונה "חיונית" משפיעה על ההתאמה פי שניים וחצי מתכונה ש"עוזרת".</p>
          </Explain>
        </section>
        <ColorMap dots={dots} size="md" caption="המעגל המקווקו: איפה נמצא מי שיש לו בדיוק את התכונות שהתפקיד דורש" />
      </div>
      <Plan role={role} candidates={candidates} />
      {best && (
        <section className="panel">
          <h3>הפרופיל של התפקיד מול המתאים ביותר: {best.c.name}</h3>
          <TraitRadar
            series={[
              { traits: ideal, label: role.name, color: '#17181b', dashed: true },
              { traits: best.c.traits, label: best.c.name, color: blend(best.c).c },
            ]}
          />
        </section>
      )}
      <section className="panel">
        <h3>מי מתאים</h3>
        {ranked.length === 0 ? (
          <p className="muted">עוד אין אנשים עם פרופיל תכונות.</p>
        ) : (
          <ul className="fits ranked">
            {ranked.map(({ c, f }) => (
              <li key={c.id} style={toneStyle(c)}>
                <span className="swatch sm" aria-hidden="true" />
                {c.href ? <a href={c.href}>{c.name}</a> : <span>{c.name}</span>}
                <small>{c.source}</small>
                <span className="bar">
                  <i style={{ width: `${f}%` }} />
                </span>
                <span className="mono">{f}</span>
              </li>
            ))}
          </ul>
        )}
        <Explain>
          <p>ההתאמה (0 עד 100) בודקת כמה מכל תכונה נדרשת קיים אצל האדם, במשקל שהתפקיד נותן לה. 100 = הפרופיל מכסה את כל הדרישות. "תצפית" = מהשאלון על אדם אחר. "הערכה מהמפה" = לפי המיקום בלבד, פחות מדויק.</p>
        </Explain>
      </section>
    </motion.article>
  );
}

/** תוכנית אישית: מה כבר חזק, מה לחזק, איך, ועל מי להישען */
function Plan({ role, candidates }: { role: Role; candidates: Candidate[] }) {
  const real = candidates.filter((c) => c.source !== 'דמות לדוגמה');
  const [who, setWho] = useState(real.find((c) => c.source === 'אני')?.id ?? real[0]?.id ?? '');
  // הבחירה נשמרת, ואם היא עוד לא קיימת (האנשים נטענים) ברירת המחדל היא אני, או הראשון
  const c = real.find((x) => x.id === who) ?? real.find((x) => x.source === 'אני') ?? real[0];
  if (!real.length)
    return (
      <section className="panel plan">
        <h3>מה צריך כדי להצליח בתפקיד</h3>
        <p className="muted">כדי לקבל תוכנית אישית, עשו קודם את האבחון. אחר כך תראו כאן מה כבר חזק אצלכם, ומה כדאי לחזק.</p>
        <a className="btn solid sm" href="#/me">
          לאבחון
        </a>
      </section>
    );
  const ideal = roleTraits(role);
  const needed = (Object.keys(role.needs) as Trait[]).filter((k) => (role.needs[k] ?? 0) > 0).sort((a, b) => (role.needs[b] ?? 0) - (role.needs[a] ?? 0));
  const rows = c ? needed.map((k) => ({ k, need: ideal[k], have: c.traits[k], w: role.needs[k] ?? 0 })) : [];
  const gaps = rows.filter((r) => r.need - r.have > 0.03).sort((a, b) => b.w * (b.need - b.have) - a.w * (a.need - a.have));
  const strong = rows.filter((r) => r.need - r.have <= 0.03);
  const leanOn = (k: Trait) =>
    candidates
      .filter((x) => x.id !== c?.id && x.source !== 'דמות לדוגמה')
      .sort((a, b) => b.traits[k] - a.traits[k])
      .slice(0, 2);
  const f = c ? fit(c.traits, role) : 0;
  const level = (v: number) => (v >= 0.5 ? 'חזק מאוד' : v >= 0.3 ? 'חזק' : v >= 0.15 ? 'בינוני' : 'חלש');

  const text = c
    ? [
        `תוכנית ל${c.name}: ${role.name} (התאמה ${f} מתוך 100)`,
        '',
        strong.length ? `כבר חזק: ${strong.map((r) => traitInfo(r.k).label).join(', ')}` : '',
        '',
        ...gaps.slice(0, 3).flatMap((g) => [
          `לחזק: ${traitInfo(g.k).label}`,
          ...GROWTH[g.k].actions.map((a) => `- ${a}`),
          `הרגל: ${GROWTH[g.k].habit}`,
          leanOn(g.k).length ? `להישען על: ${leanOn(g.k).map((x) => x.name).join(', ')}` : '',
          '',
        ]),
      ]
        .filter((l, i, a) => l !== '' || a[i - 1] !== '')
        .join('\n')
    : '';

  return (
    <section className="panel plan">
      <div className="row between">
        <h3>מה צריך כדי להצליח בתפקיד</h3>
        <label className="who-pick">
          <span>התוכנית בשביל</span>
          <select value={c?.id ?? ''} onChange={(e) => setWho(e.target.value)} aria-label="התוכנית בשביל">
            {real.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
                {x.source === 'אני' ? ' (אני)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      {c && (
        <>
          <p className="muted">
            ההתאמה של {c.name} לתפקיד: <b className="mono">{f}</b> מתוך 100. למטה: לכל תכונה שהתפקיד צריך, כמה היא בולטת אצל {c.name} לעומת מה שהתפקיד צריך. התכונות שכדאי לחזק מסודרות לפי מה שיקדם הכי הרבה.
          </p>
          <ul className="need-rows">
            {rows.map((r) => (
              <li key={r.k} className={`tone-${traitInfo(r.k).color}`}>
                <span className="need-name">
                  <b>{traitInfo(r.k).label}</b>
                  <small>{NEED_LEVELS.slice().reverse().find((l) => r.w >= l.value)?.label} לתפקיד</small>
                </span>
                <span className="need-bar" aria-label={`יש ${Math.round(r.have * 100)}%, התפקיד צריך ${Math.round(r.need * 100)}%`}>
                  <i style={{ width: `${Math.min(100, r.have * 100)}%` }} />
                  <em style={{ insetInlineStart: `${Math.min(100, r.need * 100)}%` }} />
                </span>
                <span className="need-state">{r.need - r.have > 0.03 ? 'לחזק' : 'כבר חזק'}</span>
              </li>
            ))}
          </ul>
          <span className="tbar-legend">הפס: כמה התכונה בולטת אצל {c.name} ({rows.map((r) => `${traitInfo(r.k).label} ${level(r.have)}`).join(', ')}). הקו: מה התפקיד צריך.</span>

          {strong.length > 0 && (
            <p className="strong-line">
              <b>כבר חזק: </b>
              {strong.map((r) => traitInfo(r.k).label).join(', ')}. אלה נקודות המשען שלך בתפקיד.
            </p>
          )}

          {gaps.length === 0 ? (
            <p className="hint">כל מה שהתפקיד צריך כבר קיים. כדאי לחשוב איך להשתמש בזה, ומה לחזק כדי לגדול לתפקיד הבא.</p>
          ) : (
            <div className="growth">
              {gaps.slice(0, 3).map((g, i) => (
                <article key={g.k} className={`growth-card tone-${traitInfo(g.k).color}`}>
                  <span className="label">צעד {i + 1}</span>
                  <h4>לחזק: {traitInfo(g.k).label}</h4>
                  <p className="muted">{traitInfo(g.k).text}.</p>
                  <ol>
                    {GROWTH[g.k].actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ol>
                  <p className="habit">
                    <b>הרגל: </b>
                    {GROWTH[g.k].habit}
                  </p>
                  {leanOn(g.k).length > 0 && (
                    <p className="lean">
                      <b>על מי להישען: </b>
                      {leanOn(g.k)
                        .map((x) => x.name)
                        .join(', ')}
                      , החזקים ב{traitInfo(g.k).label} מבין האנשים שלך.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
          <button className="btn ghost sm" onClick={() => copyText(text).then(() => toast('התוכנית הועתקה'), () => toast('ההעתקה נחסמה', 'error'))}>
            העתקת התוכנית
          </button>
        </>
      )}
    </section>
  );
}

/** הוספת תפקיד: כותבים שם (ותיאור), והמומחה מנתח אילו תכונות התפקיד צריך. סימון ידני הוא אפשרות משנית */
function NewRole() {
  const [name, setName] = useState('');
  const [why, setWhy] = useState('');
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needs, setNeeds] = useState<Partial<Traits>>({});
  const all = useAllRoles();
  const chosen = TRAITS.filter((t) => (needs[t.key] ?? 0) > 0);
  const preview: Role = {
    id: 'preview',
    name: name || 'התפקיד החדש',
    why,
    needs,
  };
  const at = chosen.length ? pointFromTraits(roleTraits(preview)) : { x: 0, y: 0 };
  const same = all.find((r) => r.name.trim() === name.trim());

  const analyze = async () => {
    if (!name.trim()) return toast('חסר שם לתפקיד', 'error');
    if (same) return go(`/roles/${same.id}`, true);
    setBusy(true);
    const id = await analyzeRole(name, why);
    setBusy(false);
    if (id) go(`/roles/${id}`, true);
  };

  return (
    <div className="page">
      <header className="page-head">
        <a className="back" href="#/roles">
          כל התפקידים
        </a>
        <span className="label">תפקיד חדש</span>
        <h1>איזה תפקיד חסר?</h1>
        <p className="lead">
          כותבים את שם התפקיד, ואם רוצים גם משפט על מה עושים בו. המומחה מנתח אילו מתוך שמונה התכונות ההצלחה בתפקיד נשענת עליהן, כמה כל אחת חשובה, ולמה. התפקיד נשמר לכולם, ומיד רואים מי מתאים לו ותוכנית אישית.
        </p>
      </header>
      <div className="role-top">
        <form
          className="form panel"
          aria-busy={busy}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!manual) return analyze();
            if (!name.trim()) return toast('חסר שם לתפקיד', 'error');
            if (chosen.length < 2) return toast('סמנו לפחות שתי תכונות שהתפקיד צריך', 'error');
            const clean = Object.fromEntries(chosen.map((t) => [t.key, needs[t.key]]));
            const id = await createRole(name, why, clean);
            if (id) go(`/roles/${id}`, true);
          }}
        >
          <label>
            <span>שם התפקיד</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: מנהלת תיק לקוח" maxLength={60} disabled={busy} />
          </label>
          <label>
            <span>במה התפקיד עוסק (לא חובה, אבל עוזר לדייק)</span>
            <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="משפט אחד: מה עושים בתפקיד ומה מצפים להשיג" maxLength={300} disabled={busy} />
          </label>
          {same && <p className="hint">התפקיד "{same.name}" כבר קיים. הכפתור יעביר אליו.</p>}

          {!manual ? (
            <>
              <div className="row wrap">
                <button className="btn solid" type="submit" disabled={!name.trim() || busy}>
                  {busy ? 'המומחה מנתח את התפקיד...' : same ? 'מעבר לתפקיד' : 'ניתוח התפקיד'}
                </button>
                <a className="btn ghost" href="#/roles">
                  ביטול
                </a>
              </div>
              {busy && (
                <p className="analyzing" role="status">
                  בודק מה מבדיל הצלחה מכישלון בתפקיד הזה ביום יום, ומדרג כל תכונה: לא נדרש, עוזר, חשוב או חיוני. זה לוקח כמה שניות.
                </p>
              )}
              <button type="button" className="link-btn" onClick={() => setManual(true)} disabled={busy}>
                מכירים את התפקיד מקרוב? אפשר לסמן את התכונות בעצמכם
              </button>
            </>
          ) : (
            <>
              <fieldset className="need-pick">
                <legend>כמה כל תכונה חשובה בתפקיד</legend>
                {TRAITS.map((t) => (
                  <div key={t.key} className={`need-pick-row tone-${t.color}`}>
                    <span>
                      <b>{t.label}</b>
                      <small>{t.text}</small>
                    </span>
                    <div className="seg" role="radiogroup" aria-label={`כמה ${t.label} חשובה`}>
                      {NEED_LEVELS.map((l) => (
                        <button
                          key={l.label}
                          type="button"
                          role="radio"
                          aria-checked={(needs[t.key] ?? 0) === l.value}
                          className={(needs[t.key] ?? 0) === l.value ? 'on' : ''}
                          onClick={() => setNeeds((n) => ({ ...n, [t.key]: l.value }))}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </fieldset>
              <div className="row wrap">
                <button className="btn solid" type="submit" disabled={!name.trim() || chosen.length < 2}>
                  שמירת התפקיד
                </button>
                <button type="button" className="btn ghost" onClick={() => setManual(false)}>
                  חזרה לניתוח של המומחה
                </button>
              </div>
            </>
          )}
        </form>
        <div>
          {manual ? (
            <>
              <ColorMap
                dots={
                  chosen.length
                    ? [
                        {
                          id: 'new',
                          label: name || 'התפקיד החדש',
                          sub: 'תפקיד',
                          kind: 'guess',
                          ...at,
                        },
                      ]
                    : []
                }
                size="md"
                caption={chosen.length ? 'כאן התפקיד יושב על המפה' : 'סמנו תכונות כדי לראות איפה התפקיד יושב'}
              />
              {chosen.length > 0 && <NeedBars role={preview} />}
            </>
          ) : (
            <section className="panel how">
              <h3>מה המומחה עושה</h3>
              <ol>
                <li>קורא את שם התפקיד והתיאור.</li>
                <li>בוחר את 2 עד 4 התכונות שההצלחה בתפקיד באמת נשענת עליהן, לא את מה שנשמע טוב בכל תפקיד.</li>
                <li>מדרג כל תכונה (לא נדרש, עוזר, חשוב, חיוני) ומסביר במשפט אחד למה.</li>
                <li>ממקם את התפקיד על המפה, ומחשב לכל אחד התאמה ותוכנית אישית.</li>
              </ol>
              <p className="muted">תפקיד שכבר נותח לא מנותח שוב: מקבלים את הניתוח הקיים.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** מה התפקיד דורש, במילים: לכל תכונה נדרשת, כמה היא חשובה */
function NeedBars({ role }: { role: Role }) {
  const keys = (Object.keys(role.needs) as Trait[]).filter((k) => (role.needs[k] ?? 0) > 0).sort((a, b) => (role.needs[b] ?? 0) - (role.needs[a] ?? 0));
  const rest = TRAITS.map((t) => t.key).filter((k) => !keys.includes(k) && role.reasons?.[k]);
  return (
    <div className="tbars">
      {keys.map((k) => {
        const w = role.needs[k] ?? 0;
        return (
          <div key={k} className={`tbar tone-${traitInfo(k).color}`} title={traitInfo(k).text}>
            <span className="tbar-name">{traitInfo(k).label}</span>
            <span className="bar">
              <motion.i initial={{ width: 0 }} animate={{ width: `${w * 100}%` }} transition={{ duration: 0.6 }} />
            </span>
            <span className="need-word">
              {
                NEED_LEVELS.slice()
                  .reverse()
                  .find((l) => w >= l.value)?.label
              }
            </span>
            {role.reasons?.[k] && <p className="tbar-reason">{role.reasons[k]}</p>}
          </div>
        );
      })}
      {rest.length > 0 && (
        <details className="not-needed">
          <summary>ומה פחות נדרש בתפקיד ({rest.length} תכונות)</summary>
          <ul>
            {[...new Set(rest.map((k) => role.reasons?.[k] ?? ''))].map((reason) => (
              <li key={reason}>
                <b>
                  {rest
                    .filter((k) => role.reasons?.[k] === reason)
                    .map((k) => traitInfo(k).label)
                    .join(', ')}
                  :{' '}
                </b>
                {reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
