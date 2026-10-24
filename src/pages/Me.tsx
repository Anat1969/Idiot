import { motion } from 'framer-motion';
import { useState } from 'react';
import { ColorMap, type Dot } from '../components/ColorMap';
import { Quiz } from '../components/Quiz';
import { COLORS } from '../data/starter';
import { selfQuestions } from '../data/traits';
import { colorAt, fit, gap, gapText, modelTraits, ranked, score, similarity } from '../lib/engine';
import { averageTraits, fullTraits } from '../lib/compare';
import { publishMe, removeMe } from '../lib/shared';
import { Explain, TraitBars, TraitRadar } from '../components/Traits';
import { traitInfo } from '../data/traits';
import { toast } from '../lib/feedback';
import { addReading, setMyName, useStore } from '../lib/store';
import { blend, coords, toneStyle } from '../lib/color';
import { copyText, describe } from '../lib/text';
import type { Color, Point, Reading } from '../lib/types';

type Step = 'intro' | 'guess' | 'quiz' | 'result';

export function Me() {
  const readings = useStore((s) => s.readings);
  const [step, setStep] = useState<Step>(readings.length ? 'result' : 'intro');
  const [guess, setGuess] = useState<Point | null>(null);

  if (step === 'intro')
    return (
      <div className="page narrow">
        <header className="page-head">
          <span className="label">מי אני · שלושה שלבים</span>
          <h1>קודם ניחוש, אחר כך שאלות</h1>
          <p className="lead">סמנו על המפה איפה אתם חושבים שאתם נמצאים. אחר כך 16 שאלות קצרות. בכל שאלה ארבע תשובות טובות: בחרו את זו שהכי דומה לכם, לא את מה שנכון לעשות. בסוף תראו את שתי הנקודות ואת הפער ביניהן.</p>
        </header>
        <div className="row wrap">
          <button className="btn solid" onClick={() => setStep('guess')}>
            לסמן ניחוש
          </button>
          <button className="btn ghost" onClick={() => (setGuess(null), setStep('quiz'))}>
            ישר לשאלות
          </button>
        </div>
      </div>
    );

  if (step === 'guess')
    return (
      <div className="page narrow">
        <header className="page-head">
          <span className="label">שלב 1 מתוך 2</span>
          <h1>איפה אתם על המפה?</h1>
          <p className="lead">לחצו במקום שנראה לכם נכון. אפשר ללחוץ שוב כדי להזיז.</p>
        </header>
        <ColorMap onPick={setGuess} dots={guess ? [{ id: 'g', label: 'הניחוש שלי', kind: 'guess', ...guess }] : []} size="lg" tilt={false} />
        <div className="row wrap">
          <button className="btn solid" disabled={!guess} onClick={() => setStep('quiz')}>
            להמשיך לשאלות
          </button>
          <button className="btn ghost" onClick={() => setStep('intro')}>
            חזרה
          </button>
        </div>
      </div>
    );

  if (step === 'quiz')
    return (
      <div className="page narrow">
        <Quiz
          questions={selfQuestions}
          onCancel={() => setStep(readings.length ? 'result' : 'intro')}
          onDone={(a) => {
            addReading({ ...score(a, selfQuestions), at: Date.now(), ...(guess ? { guess } : {}) });
            setStep('result');
          }}
        />
      </div>
    );

  return <Result readings={readings} onAgain={() => (setGuess(null), setStep('guess'))} />;
}

function Result({ readings, onAgain }: { readings: Reading[]; onAgain: () => void }) {
  const lib = useStore((s) => s.library);
  const myName = useStore((s) => s.myName);
  const myRole = useStore((s) => s.myRole);
  const shared = useStore((s) => s.shared);
  const sharedSync = useStore((s) => s.sharedSync);
  const myShared = useStore((s) => s.myShared);
  const pending = useStore((s) => s.publishPending);
  const optOut = useStore((s) => s.optOut);
  const group = useStore((s) => s.group);
  const [name, setName] = useState(myName);
  const [myRoleDraft, setMyRoleDraft] = useState(myRole);
  const [model, setModel] = useState<Color | null>(null);
  const r = readings[0];
  if (!r) return null;
  const cc = coords(r);
  const { main, sec, line } = describe(lib, r);
  const g = r.guess ? gap(r.guess, r) : null;
  const traits = r.traits ?? null;
  const shownModel = model ?? main.color;
  const others = shared.filter((x) => x.id !== myShared?.id);
  const pool = group ? others.filter((x) => x.group_name === group) : others;
  const avg = averageTraits(pool.length >= 2 ? pool : others);
  const avgLabel = avg ? `ממוצע של ${avg.n} אנשים ${pool.length >= 2 && group ? `בקבוצה "${group}"` : 'במפה הכללית'}` : '';
  const answered = Math.round(Object.values(r.mix).reduce((a, b) => a + b, 0) ? (traits ? 16 : 12) : 0);
  const dots: Dot[] = [
    ...(r.guess ? [{ id: 'g', label: 'הניחוש', kind: 'guess' as const, ...r.guess }] : []),
    { id: 'me', label: myName || 'אני', sub: myRole, kind: 'me', x: r.x, y: r.y },
  ];
  const nearest = traits
    ? others
        .map((o) => ({ o, t: fullTraits(o.traits) }))
        .filter((x) => x.t)
        .map((x) => ({ ...x, sim: similarity(traits, x.t!) }))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 3)
    : [];
  const roleFits = traits ? Object.values(lib.roles).map((role) => ({ role, f: fit(traits, role) })).sort((a, b) => b.f - a.f) : [];
  const order = traits ? ranked(traits) : [];

  const manual = [
    `המדריך לעבודה איתי: ${line}`,
    traits ? `החוזקות הבולטות שלי: ${order.slice(0, 3).map((k) => traitInfo(k).label).join(', ')}` : '',
    '',
    `איך לדבר איתי: ${main.communication}`,
    `מה מניע אותי: ${main.motivation}`,
    `מה אני מביא לצוות: ${main.contribution}`,
    `כשאני בלחץ: ${main.pressure}`,
    '',
    'מה עוזר לי:',
    ...main.speakTo.map((s) => `- ${s}`),
    `ומה כדאי לא לעשות: ${main.avoid.join(', ')}`,
  ]
    .filter((l, i, arr) => l !== '' || arr[i - 1] !== '')
    .join('\n');

  const status = !myName
    ? 'הוסיפו שם כדי להופיע במפה הכללית'
    : optOut
      ? 'הוסרת מהמפה הכללית. עדכון השם יחזיר אותך'
      : pending || !myShared
        ? sharedSync === 'offline'
          ? 'נשמר במכשיר. יישלח למפה הכללית כשיהיה חיבור'
          : 'נשלח למפה הכללית...'
        : `מופיע במפה הכללית${group ? ` בקבוצה "${group}"` : ''}`;

  return (
    <div className="page">
      <motion.section className="result" style={toneStyle(r)} initial={{ opacity: 0, rotateX: 12, y: 30 }} animate={{ opacity: 1, rotateX: 0, y: 0 }}>
        <div className="result-text">
          <span className="label">התוצאה שלי</span>
          <h1>
            {main.name}
            <small> · {main.title}</small>
          </h1>
          <p className="lead">{line}.</p>
          <p className="coords mono">
            {cc.x} · {cc.y} · {cc.i}
          </p>
          <Explain>
            <p>
              <b>המיקום על המפה</b> הוא ממוצע של כל התשובות: כל תשובה מושכת לעבר הפינה של הצבע שלה. "משימה {Math.abs(Math.round(r.x * 100))}" פירושו שהנקודה נמצאת {Math.abs(Math.round(r.x * 100))} יחידות מהמרכז לכיוון {r.x < 0 ? 'משימה' : 'אנשים'}, מתוך 100 עד הקצה.
            </p>
            <p>
              <b>העוצמה</b> היא המרחק מהמרכז, באחוזים מהמרחק עד הפינה. 0% = מאוזן לגמרי, 100% = כל התשובות מאותו צבע. עוצמה נמוכה היא לא חולשה: היא גמישות בין סגנונות.
            </p>
          </Explain>
          <div className="mix" aria-label="חלוקת הצבעים בתשובות">
            {COLORS.map((c) => (
              <div key={c} className={`mix-row tone-${c}`}>
                <span>{lib.profiles[c].name}</span>
                <span className="bar">
                  <motion.i initial={{ width: 0 }} animate={{ width: `${Math.round(r.mix[c] * 100)}%` }} transition={{ delay: 0.3, duration: 0.8 }} />
                </span>
                <span className="mono">
                  {Math.round(r.mix[c] * answered)}/{answered}
                </span>
              </div>
            ))}
            <span className="tbar-legend">כמה מתוך {answered} התשובות שלך היו בסגנון של כל צבע</span>
          </div>
          <form
            className="name-row"
            onSubmit={(e) => {
              e.preventDefault();
              setMyName(name, myRoleDraft);
              toast(name.trim() ? `${name.trim()} נוסף למפה` : 'השם הוסר מהמפה');
              publishMe();
            }}
          >
            <label htmlFor="my-name">השם והתפקיד שלי על המפה</label>
            <div className="row">
              <input id="my-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: ענת" maxLength={40} />
              <input id="my-role" value={myRoleDraft} onChange={(e) => setMyRoleDraft(e.target.value)} placeholder="תפקיד, למשל: אדריכלית" maxLength={60} aria-label="התפקיד שלי" />
              <button className="btn solid sm" type="submit">
                {myName ? 'עדכון' : 'להוסיף אותי למפה'}
              </button>
            </div>
            <span className="share-status">
              {status}
              {myShared && !optOut && (
                <button type="button" className="linkish" onClick={() => removeMe()}>
                  הסרה מהמפה הכללית
                </button>
              )}
            </span>
          </form>
        </div>
        <ColorMap dots={dots} size="md" />
      </motion.section>

      {traits ? (
        <>
          <section className="panel">
            <div className="row between">
              <h3>פרופיל התכונות שלי</h3>
              <span className="label">ביחס לעצמי</span>
            </div>
            <p className="muted">
              שמונה תכונות, שתיים לכל צבע. כל תכונה הוצעה 8 פעמים לאורך השאלון. המספר הוא כמה פעמים בחרת בה. זו השוואה שלך לעצמך: מה אתה בוחר כשיש לך ארבע אפשרויות טובות.
            </p>
            <div className="trait-layout">
              <TraitBars traits={traits} offered={8} avg={avg?.avg} avgLabel={avgLabel} />
              <div className="strengths">
                <h4>החוזקות הבולטות</h4>
                <ol>
                  {order.slice(0, 3).map((k) => (
                    <li key={k} className={`tone-${traitInfo(k).color}`}>
                      <b>{traitInfo(k).label}</b>
                      <span>{traitInfo(k).text}</span>
                    </li>
                  ))}
                </ol>
                <h4>מה פחות נשען עליו</h4>
                <p className="muted">
                  {order
                    .slice(-2)
                    .map((k) => traitInfo(k).label)
                    .join(' ו')}
                  . לא חולשה: פשוט לא הבחירה הראשונה שלך. ליד מי שחזק בהן כדאי לעבוד.
                </p>
              </div>
            </div>
            <Explain title="למה ׳שקול׳ זה לא ׳איטי׳">
              <p>
                הציר האנכי מודד מתי אתה פועל: מיד, או אחרי שבדקת. שני הקצוות הם חוזקה. מי שבצד השקול לוקח זמן לפני החלטה, ולכן ההחלטה שלו בדרך כלל מבוססת יותר. ההשוואה הנכונה היא בין התכונות שלך לבין מה שהמצב דורש, לא בין אנשים על סרגל אחד.
              </p>
            </Explain>
          </section>

          <section className="panel">
            <div className="row between">
              <h3>אני מול ארבעת המודלים</h3>
              <span className="label">ביחס למודלים</span>
            </div>
            <div className="model-tabs" role="tablist" aria-label="מודל להשוואה">
              {COLORS.map((c) => {
                const sim = similarity(traits, modelTraits(c));
                return (
                  <button key={c} role="tab" aria-selected={shownModel === c} className={`model-tab tone-${c} ${shownModel === c ? 'on' : ''}`} onClick={() => setModel(c)}>
                    <b>{lib.profiles[c].name}</b>
                    <span className="mono">{sim}%</span>
                  </button>
                );
              })}
            </div>
            <TraitRadar
              series={[
                { traits: modelTraits(shownModel), label: `המודל ה${lib.profiles[shownModel].name}`, color: lib.profiles[shownModel].hex, dashed: true },
                ...(avg ? [{ traits: avg.avg, label: avgLabel, color: '#8d8a84', dashed: true }] : []),
                { traits, label: myName || 'אני', color: blend(r).c },
              ]}
            />
            <Explain>
              <p>
                <b>אחוז הדמיון</b> משווה את צורת הפרופיל שלך לצורה הטיפוסית של כל צבע (שתי התכונות שלו גבוהות, השכנים בינוני, הנגדי נמוך). 100% = אותה צורה בדיוק. אפשר להיות דומה לשני מודלים בבת אחת.
              </p>
            </Explain>
          </section>

          <div className="detail-grid">
            <section className="panel">
              <h3>הכי דומים לי במפה הכללית</h3>
              {nearest.length ? (
                <ul className="near">
                  {nearest.map(({ o, sim }) => (
                    <li key={o.id} style={toneStyle(o)}>
                      <span className="swatch" aria-hidden="true" />
                      <b>{o.name}</b>
                      <span className="mono">{sim}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">עוד אין מספיק אנשים עם פרופיל תכונות במפה הכללית.</p>
              )}
              <a className="btn ghost sm" href="#/map">
                למפה הכללית
              </a>
            </section>
            <section className="panel">
              <h3>התאמה לתפקידים</h3>
              <ul className="fits">
                {roleFits.slice(0, 4).map(({ role, f }) => (
                  <li key={role.id}>
                    <span>{role.name}</span>
                    <span className="bar">
                      <i style={{ width: `${f}%` }} />
                    </span>
                    <span className="mono">{f}</span>
                  </li>
                ))}
              </ul>
              <Explain>
                <p>כל תפקיד דורש כמה תכונות במשקלים שונים. ההתאמה (0 עד 100) בודקת כמה מהפרופיל הנדרש קיים אצלך, לפי המשקלים. היא לא מנבאת הצלחה: היא מראה על אילו תכונות התפקיד יישען, ואיפה תצטרך תמיכה.</p>
              </Explain>
              <a className="btn ghost sm" href="#/roles">
                כל התפקידים
              </a>
            </section>
          </div>
        </>
      ) : (
        <p className="hint">האבחון הזה נעשה בגרסה הקודמת, בלי פרופיל תכונות. אבחון חוזר (16 שאלות) יוסיף את התכונות, ההשוואה למודלים וההתאמה לתפקידים.</p>
      )}

      {g !== null && (
        <section className="panel gap">
          <span className="label">פער מודעות עצמית</span>
          <div className="gap-row">
            <span className="mono big">{g}%</span>
            <p>{gapText(g)}</p>
          </div>
          <Explain>
            <p>המרחק בין הניחוש שלך לבין התוצאה, באחוזים מהאלכסון של המפה (המרחק הכי גדול אפשרי, מפינה לפינה). 0% = ניחשת בדיוק.</p>
          </Explain>
          {r.guess && colorAt(r.guess) !== main.color && (
            <p className="muted">
              ניחשת {lib.profiles[colorAt(r.guess)].name}. התשובות מצביעות על {main.name}.
            </p>
          )}
        </section>
      )}

      <div className="detail-grid">
        <section className="panel">
          <h3>מה אני מביא</h3>
          <ul>{main.traits.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
        <section className="panel">
          <h3>לשים לב</h3>
          <ul>{main.challenges.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
        <section className="panel pressure">
          <h3>כשאני בלחץ</h3>
          <p>{main.pressure}</p>
          <h3>הצד המשני: {sec.name}</h3>
          <p>{sec.essence}</p>
        </section>
      </div>

      <section className="panel manual">
        <div className="row between">
          <h3>המדריך לעבודה איתי</h3>
          <button className="btn ghost sm" onClick={() => copyText(manual).then(() => toast('המדריך הועתק'), () => toast('ההעתקה נחסמה', 'error'))}>
            העתקת המדריך
          </button>
        </div>
        <pre className="manual-text">{manual}</pre>
      </section>

      <div className="row wrap">
        <button className="btn solid" onClick={onAgain}>
          אבחון חוזר
        </button>
        <a className="btn ghost" href={`#/colors/${main.color}`}>
          הפרופיל המלא של {main.name}
        </a>
        <a className="btn ghost" href="#/people">
          להוסיף אנשים למפה
        </a>
      </div>

      {readings.length > 1 && (
        <section className="panel history">
          <h3>אבחונים קודמים</h3>
          <ol>
            {readings.map((x) => (
              <li key={x.at} style={toneStyle(x)}>
                <span className="chip">{lib.profiles[colorAt(x)].name}</span>
                <span>{describe(lib, x).line}</span>
                <span className="mono">{new Date(x.at).toLocaleDateString('he-IL')}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
