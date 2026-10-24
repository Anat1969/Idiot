import { motion } from 'framer-motion';
import { Editable } from '../components/Editable';
import { GOALS } from '../data/starter';
import { colorAt, friction, frictionLabel } from '../lib/engine';
import { toast } from '../lib/feedback';
import { go } from '../lib/router';
import { useStore } from '../lib/store';
import { blend, coords, toneStyle } from '../lib/color';
import { ColorMap } from '../components/ColorMap';
import { copyText, describe } from '../lib/text';
import type { GoalKey } from '../lib/types';

export function Meet({ id, goal }: { id?: string; goal?: GoalKey }) {
  const people = useStore((s) => s.people);
  const reading = useStore((s) => s.readings[0]);
  const person = people.find((p) => p.id === id);

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">הכנה לשיחה · שני צעדים</span>
        <h1>{person ? `שיחה עם ${person.name}` : 'עם מי השיחה?'}</h1>
        <p className="lead">בוחרים אדם ומטרה. מקבלים תדריך: משפט פתיחה, מהלך, ומה לא לעשות.</p>
      </header>

      <section className="step">
        <span className="label">1 · האדם</span>
        <div className="chips" role="radiogroup" aria-label="האדם">
          {people.map((p) => (
            <button
              key={p.id}
              role="radio"
              aria-checked={p.id === id}
              className={`chip-btn ${p.id === id ? 'on' : ''}`}
              style={toneStyle(p)}
              onClick={() => go(`/meet/${p.id}${goal ? `/${goal}` : ''}`, true)}
            >
              <i aria-hidden="true" />
              {p.name}
            </button>
          ))}
          <a className="chip-btn add" href="#/people/new">
            אדם חדש
          </a>
        </div>
      </section>

      {person && (
        <motion.section className="step" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <span className="label">2 · המטרה</span>
          <div className="goals" role="radiogroup" aria-label="מטרת השיחה">
            {GOALS.map((g) => (
              <button key={g.key} role="radio" aria-checked={g.key === goal} className={`goal ${g.key === goal ? 'on' : ''}`} onClick={() => go(`/meet/${person.id}/${g.key}`, true)}>
                <b>{g.label}</b>
                <small>{g.hint}</small>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {person && goal && <Brief key={`${person.id}-${goal}`} personId={person.id} goal={goal} />}
      {!person && people.length === 0 && <p className="hint">עדיין אין אנשים. הוסיפו אדם ראשון, והתדריך יחכה כאן.</p>}
      {person && !goal && !reading && (
        <p className="hint">
          עצה: אחרי <a href="#/me">האבחון שלך</a> התדריך יכלול גם את הדינמיקה בין שניכם.
        </p>
      )}
    </div>
  );
}

function Brief({ personId, goal }: { personId: string; goal: GoalKey }) {
  const lib = useStore((s) => s.library);
  const person = useStore((s) => s.people.find((p) => p.id === personId))!;
  const reading = useStore((s) => s.readings[0]);
  const myName = useStore((s) => s.myName) || 'אני';
  const { main, line } = describe(lib, person);
  const key = `${goal}-${main.color}`;
  const advice = lib.goals[key];
  const goalLabel = GOALS.find((g) => g.key === goal)!.label;
  const mine = reading ? colorAt(reading) : null;
  const pairKey = mine ? `${mine}-${main.color}` : null;
  const pair = pairKey ? lib.pairs[pairKey] : null;

  const text = [
    `תדריך לשיחה עם ${person.name} · מטרה: ${goalLabel}`,
    `${person.name}: ${line}`,
    '',
    `לפתוח ב: ${advice.open}`,
    '',
    'המהלך:',
    ...advice.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    `לא לעשות: ${advice.avoid}`,
    pair ? `\nהדינמיקה בינינו: ${pair.title}. ${pair.doThis}` : '',
    `\nסימני לחץ: ${main.pressure}`,
    `משפטים שעובדים: ${main.use.join(' · ')}`,
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  return (
    <motion.article className="brief" style={toneStyle(person)} initial={{ opacity: 0, rotateX: 14, y: 40 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 20 }}>
      <header className="brief-head">
        <div>
          <span className="label">
            תדריך · {goalLabel} · {main.name}
          </span>
          <h2>
            {person.name}, {line}
          </h2>
        </div>
        <button className="btn solid sm" onClick={() => copyText(text).then(() => toast('התדריך הועתק'), () => toast('ההעתקה נחסמה', 'error'))}>
          העתקת התדריך
        </button>
      </header>

      <section className="duo" aria-label="שני המשתתפים בשיחה">
        <div className="duo-people">
          {reading ? (
            <Orb name={myName} sub={describe(lib, reading).line} p={reading} />
          ) : (
            <a className="orb orb-empty" href="#/me">
              <span className="orb-ball" aria-hidden="true" />
              <b>{myName}</b>
              <small>עוד לא אבחנת את עצמך</small>
            </a>
          )}
          <div className="duo-bridge">
            {reading ? (
              <>
                <span className="mono big">{friction(reading, person)}</span>
                <span className="label">{frictionLabel(friction(reading, person))}</span>
                <span className="bridge-line" style={{ background: `linear-gradient(270deg, ${blend(reading).c}, ${blend(person).c})` }} />
                <small>מרחק על המפה, מתוך 100</small>
              </>
            ) : (
              <span className="label">מול</span>
            )}
          </div>
          <Orb name={person.name} sub={line} p={person} />
        </div>
        <ColorMap
          size="sm"
          legend={false}
          dots={[
            ...(reading ? [{ id: 'me', label: myName, kind: 'me' as const, x: reading.x, y: reading.y }] : []),
            { id: person.id, label: person.name, kind: 'person' as const, x: person.x, y: person.y },
          ]}
          links={reading ? [{ from: 'me', to: person.id }] : []}
        />
      </section>

      <section className="brief-open">
        <span className="label">משפט פתיחה</span>
        <Editable section="goals" item={key} field="open" value={advice.open} as="p" className="quote" />
      </section>

      <div className="brief-grid">
        <section className="panel">
          <h3>המהלך</h3>
          <Editable section="goals" item={key} field="steps" value={advice.steps} as="ol" className="steps" />
        </section>
        <section className="panel pressure">
          <h3>לא לעשות</h3>
          <Editable section="goals" item={key} field="avoid" value={advice.avoid} />
          <h3>אם הוא נכנס ללחץ</h3>
          <p>{main.pressure}</p>
        </section>
        <section className="panel">
          <h3>משפטים שעובדים איתו</h3>
          <ul>{main.use.map((u) => <li key={u}>{u}</li>)}</ul>
          <h3>אם כותבים לו</h3>
          <p>{main.email}</p>
        </section>
        {pair && pairKey && reading && (
          <section className="panel pair">
            <h3>אני והוא</h3>
            <span className="label">
              {lib.profiles[mine!].name} מול {main.name} · {frictionLabel(friction(reading, person))}
            </span>
            <h4>{pair.title}</h4>
            <ul>{pair.tips.map((t) => <li key={t}>{t}</li>)}</ul>
            <p>
              <b>להימנע: </b>
              {pair.avoidThis}
            </p>
          </section>
        )}
      </div>
    </motion.article>
  );
}

function Orb({ name, sub, p }: { name: string; sub: string; p: { x: number; y: number } }) {
  const c = coords(p);
  return (
    <div className="orb" style={toneStyle(p)}>
      <span className="orb-ball" aria-hidden="true" />
      <b>{name}</b>
      <small>{sub}</small>
      <small className="mono">{c.i}</small>
    </div>
  );
}
