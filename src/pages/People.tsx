import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { ColorMap, type Dot } from '../components/ColorMap';
import { Editable } from '../components/Editable';
import { Quiz } from '../components/Quiz';
import { Tilt } from '../components/Tilt';
import { observeQuestions } from '../data/starter';
import { colorAt, friction, frictionLabel, score } from '../lib/engine';
import { confirmAction, toast } from '../lib/feedback';
import { go } from '../lib/router';
import { clearDemo, deletePerson, exportData, importData, savePerson, useStore } from '../lib/store';
import { describe } from '../lib/text';
import type { Person, Point } from '../lib/types';

export function People({ id }: { id?: string }) {
  const people = useStore((s) => s.people);
  if (id === 'new') return <AddPerson />;
  const person = id ? people.find((p) => p.id === id) : undefined;
  if (id && !person)
    return (
      <div className="page narrow">
        <h1>האדם לא נמצא</h1>
        <p className="lead">ייתכן שנמחק, או שהקישור נוצר במכשיר אחר. רשימת האנשים נשמרת רק במכשיר שבו נוצרה.</p>
        <a className="btn solid" href="#/people">
          לכל האנשים
        </a>
      </div>
    );
  return person ? <PersonPage person={person} key={person.id} /> : <PeopleList />;
}

function PeopleList() {
  const lib = useStore((s) => s.library);
  const people = useStore((s) => s.people);
  const reading = useStore((s) => s.readings[0]);
  const file = useRef<HTMLInputElement>(null);
  const dots: Dot[] = [
    ...people.map((p) => ({ id: p.id, label: p.name, x: p.x, y: p.y, kind: 'person' as const, href: `#/people/${p.id}` })),
    ...(reading ? [{ id: 'me', label: 'אני', x: reading.x, y: reading.y, kind: 'me' as const, href: '#/me' }] : []),
  ];

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
    a.download = `idiot-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('הגיבוי ירד');
  };

  return (
    <div className="page">
      <header className="page-head split">
        <div>
          <span className="label">אנשים · נשמר רק במכשיר הזה</span>
          <h1>האנשים סביבי</h1>
          <p className="lead">שש שאלות תצפית על כל אדם, או סימון ישיר על המפה. ההערכות האלה אישיות ולא יוצאות מהמכשיר.</p>
        </div>
        <a className="btn solid" href="#/people/new">
          הוספת אדם
        </a>
      </header>

      <div className="people-layout">
        <ColorMap dots={dots} size="lg" />
        <div className="people-list">
          {people.length === 0 && <p className="hint">עדיין אין אנשים. התחילו במישהו שקשה לכם לעבוד איתו.</p>}
          {people.map((p, i) => {
            const d = describe(lib, p);
            const f = reading ? friction(reading, p) : null;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <Tilt max={5}>
                  <a className={`person-card tone-${colorAt(p)}`} href={`#/people/${p.id}`}>
                    <span className="swatch" aria-hidden="true" />
                    <span className="person-main">
                      <b>{p.name}</b>
                      <small>{p.role || 'בלי תפקיד'}</small>
                    </span>
                    <span className="person-side">
                      <span>{d.main.name}</span>
                      {f !== null && <small>{frictionLabel(f)}</small>}
                    </span>
                    {p.demo && <span className="tag">דוגמה</span>}
                  </a>
                </Tilt>
              </motion.div>
            );
          })}
        </div>
      </div>

      <section className="panel backup">
        <h3>גיבוי והעברה בין מכשירים</h3>
        <p className="muted">האנשים, הצוותים והאבחונים שלך נשמרים בדפדפן הזה בלבד. כדי להעביר למכשיר אחר: מורידים קובץ גיבוי וטוענים אותו שם.</p>
        <div className="row wrap">
          <button className="btn ghost sm" onClick={download}>
            הורדת גיבוי
          </button>
          <button className="btn ghost sm" onClick={() => file.current?.click()}>
            טעינת גיבוי
          </button>
          {people.some((p) => p.demo) && (
            <button className="btn ghost sm" onClick={() => (clearDemo(), toast('הדוגמה נוקתה'))}>
              ניקוי אנשי הדוגמה
            </button>
          )}
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="קובץ גיבוי"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              const done = importData(await f.text());
              toast(done ? 'הגיבוי נטען' : 'זה לא קובץ גיבוי של האפליקציה', done ? 'ok' : 'error');
            }}
          />
        </div>
      </section>
    </div>
  );
}

function AddPerson() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [mode, setMode] = useState<'form' | 'quiz' | 'map'>('form');
  const [point, setPoint] = useState<Point | null>(null);

  const finish = (p: Point) => {
    const person = savePerson({ name: name.trim(), role: role.trim(), note: '', x: p.x, y: p.y });
    toast(`${person.name} נוסף למפה`);
    go(`/people/${person.id}`, true);
  };

  if (mode === 'quiz')
    return (
      <div className="page narrow">
        <Quiz questions={observeQuestions} subject={name} onCancel={() => setMode('form')} onDone={(a) => finish(score(a, observeQuestions))} />
      </div>
    );

  return (
    <div className="page narrow">
      <header className="page-head">
        <span className="label">אדם חדש</span>
        <h1>על מי מדובר?</h1>
      </header>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return toast('חסר שם', 'error');
          setMode('quiz');
        }}
      >
        <label>
          <span>שם</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: רונית" autoFocus maxLength={40} />
        </label>
        <label>
          <span>תפקיד או קשר</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="למשל: מנהלת הפרויקט מצד הלקוח" maxLength={60} />
        </label>
        <div className="row wrap">
          <button className="btn solid" type="submit">
            שש שאלות תצפית
          </button>
          <button className="btn ghost" type="button" onClick={() => (name.trim() ? setMode('map') : toast('חסר שם', 'error'))}>
            סימון ישיר על המפה
          </button>
          <a className="btn ghost" href="#/people">
            ביטול
          </a>
        </div>
      </form>
      {mode === 'map' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="lead">לחצו במקום שבו {name} נמצא, לפי מה שאתם מכירים.</p>
          <ColorMap onPick={setPoint} dots={point ? [{ id: 'n', label: name, kind: 'person', ...point }] : []} size="lg" tilt={false} />
          <button className="btn solid" disabled={!point} onClick={() => point && finish(point)}>
            שמירה
          </button>
        </motion.div>
      )}
    </div>
  );
}

function PersonPage({ person }: { person: Person }) {
  const lib = useStore((s) => s.library);
  const reading = useStore((s) => s.readings[0]);
  const [moving, setMoving] = useState(false);
  const [requiz, setRequiz] = useState(false);
  const [note, setNote] = useState(person.note);
  const { main, line } = describe(lib, person);
  const mine = reading ? colorAt(reading) : null;
  const pairKey = mine ? `${mine}-${main.color}` : null;
  const pair = pairKey ? lib.pairs[pairKey] : null;
  const f = reading ? friction(reading, person) : null;

  if (requiz)
    return (
      <div className="page narrow">
        <Quiz
          questions={observeQuestions}
          subject={person.name}
          onCancel={() => setRequiz(false)}
          onDone={(a) => {
            const s = score(a, observeQuestions);
            savePerson({ ...person, x: s.x, y: s.y });
            setRequiz(false);
            toast('ההערכה עודכנה');
          }}
        />
      </div>
    );

  const dots: Dot[] = [
    { id: person.id, label: person.name, kind: 'person', x: person.x, y: person.y },
    ...(reading ? [{ id: 'me', label: 'אני', kind: 'me' as const, x: reading.x, y: reading.y }] : []),
  ];

  return (
    <div className="page">
      <motion.section className={`result tone-${main.color}`} initial={{ opacity: 0, rotateX: 10, y: 24 }} animate={{ opacity: 1, rotateX: 0, y: 0 }}>
        <div className="result-text">
          <a className="back" href="#/people">
            כל האנשים
          </a>
          <span className="label">{person.role || 'אדם'}</span>
          <h1>{person.name}</h1>
          <p className="lead">{line}.</p>
          <p>{main.communication}</p>
          <div className="row wrap">
            <a className="btn solid" href={`#/meet/${person.id}`}>
              הכנה לשיחה עם {person.name}
            </a>
            <button className="btn ghost sm" onClick={() => setRequiz(true)}>
              הערכה מחדש
            </button>
            <button className="btn ghost sm" onClick={() => setMoving((v) => !v)} aria-pressed={moving}>
              {moving ? 'סיום הזזה' : 'הזזה על המפה'}
            </button>
          </div>
        </div>
        <ColorMap
          dots={dots}
          size="md"
          tilt={!moving}
          onPick={moving ? (p) => savePerson({ ...person, ...p }) : undefined}
          caption={moving ? 'לחצו במקום החדש' : undefined}
        />
      </motion.section>

      <div className="detail-grid">
        <section className="panel">
          <h3>איך לדבר איתו</h3>
          <Editable section="profiles" item={main.color} field="speakTo" value={main.speakTo} as="ol" />
        </section>
        <section className="panel">
          <h3>איך מזהים שהוא בלחץ</h3>
          <Editable section="profiles" item={main.color} field="pressure" value={main.pressure} />
          <h3>ממה הוא חושש</h3>
          <Editable section="profiles" item={main.color} field="fear" value={main.fear} />
        </section>
        <section className="panel pair">
          <h3>אני והוא</h3>
          {pair && pairKey ? (
            <>
              <span className="label">
                {lib.profiles[mine!].name} מול {main.name} · {frictionLabel(f!)}
              </span>
              <Editable section="pairs" item={pairKey} field="title" value={pair.title} as="h4" />
              <Editable section="pairs" item={pairKey} field="tips" value={pair.tips} as="ul" />
              <p>
                <b>לעשות: </b>
                {pair.doThis}
              </p>
              <p>
                <b>להימנע: </b>
                {pair.avoidThis}
              </p>
            </>
          ) : (
            <>
              <p>כדי לקבל עצות לזוג שלכם, צריך קודם לדעת מה הצבע שלך.</p>
              <a className="btn ghost sm" href="#/me">
                לאבחון שלי
              </a>
            </>
          )}
        </section>
      </div>

      <section className="panel">
        <label className="note">
          <span>
            <h3>הערות שלי</h3>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== person.note && (savePerson({ ...person, note }), toast('ההערה נשמרה'))}
            placeholder="מה עבד בשיחה האחרונה, מה הרגיז, מה חשוב לו"
            rows={4}
          />
        </label>
      </section>

      <button
        className="btn ghost sm danger-text"
        onClick={() =>
          confirmAction({
            title: `למחוק את ${person.name}?`,
            body: 'האדם יוסר מהמפה ומכל הצוותים. אי אפשר לבטל.',
            action: 'מחיקה',
            onConfirm: () => {
              deletePerson(person.id);
              go('/people', true);
              toast('נמחק');
            },
          })
        }
      >
        מחיקת האדם
      </button>
    </div>
  );
}
