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
import { confirmAction, toast } from '../lib/feedback';
import { addReading, groupsOf, newIdentity, setMyName, useStore } from '../lib/store';
import { blend, coords, toneStyle } from '../lib/color';
import { copyText, describe } from '../lib/text';
import type { Color, Point, Reading } from '../lib/types';

type Step = 'intro' | 'guess' | 'quiz' | 'result';

export function Me() {
  const readings = useStore((s) => s.readings);
  const myName = useStore((s) => s.myName);
  const [step, setStep] = useState<Step>(readings.length ? 'result' : 'intro');
  const [guess, setGuess] = useState<Point | null>(null);

  if (step === 'intro')
    return (
      <div className="page narrow">
        <header className="page-head">
          <span className="label">אבחון אישי · בערך 4 דקות</span>
          <h1>איך זה עובד</h1>
          <p className="lead">האבחון בודק איך אתם נוטים לפעול ולתקשר עם אחרים. אין תשובות טובות או רעות, ואין ציון. התוצאה היא תמונה של הסגנון שלכם, כדי להבין את עצמכם ואת האנשים סביבכם.</p>
        </header>
        <ol className="how">
          <li>
            <b>ניחוש על המפה</b>
            <span>
              לפני השאלות, לוחצים על המפה במקום שבו אתם חושבים שאתם נמצאים. המפה מחולקת לפי שתי שאלות: האם אתם מתמקדים יותר במשימה או באנשים, והאם אתם נוטים לפעול מיד או לבדוק קודם. הניחוש לא משפיע על התוצאה. הוא רק מאפשר לראות בסוף כמה קרוב ניחשתם. אפשר לדלג על השלב הזה.
            </span>
          </li>
          <li>
            <b>16 שאלות</b>
            <span>
              בכל שאלה יש מצב מהחיים וארבע תשובות. כל התשובות טובות. בוחרים את זו שהכי דומה למה שאתם באמת עושים, לא את מה שנראה נכון. אם שתיים מתאימות, בוחרים את הראשונה שעלתה בראש. אפשר לחזור לשאלה הקודמת.
            </span>
          </li>
          <li>
            <b>התוצאה</b>
            <span>
              תראו איפה אתם על המפה, איזה צבע מתאר אתכם, ואילו מתוך שמונה תכונות (כמו החלטיות, הקשבה, תכנון) בולטות אצלכם. תראו גם למי מהאנשים במפה הכללית אתם הכי דומים, ולאילו תפקידים התכונות שלכם מתאימות.
            </span>
          </li>
          <li>
            <b>המפה הכללית</b>
            <span>
              בסוף כותבים שם ותפקיד ולוחצים "להוסיף אותי למפה". מאותו רגע אתם מופיעים במפה הכללית, שכל מי שיש לו את הקישור רואה. בלי שם, התוצאה נשארת רק אצלכם במכשיר.
            </span>
          </li>
        </ol>
        <div className="row wrap">
          <button className="btn solid" onClick={() => setStep('guess')}>
            להתחיל בניחוש
          </button>
          <button className="btn ghost" onClick={() => (setGuess(null), setStep('quiz'))}>
            לדלג על הניחוש, ישר לשאלות
          </button>
        </div>
      </div>
    );

  if (step === 'guess')
    return (
      <div className="page narrow">
        <header className="page-head">
          <span className="label">שלב 1 מתוך 2 · ניחוש</span>
          <h1>איפה אתם חושבים שאתם?</h1>
          <p className="lead">
            שמאל המפה הוא מי שמתמקד במשימה, ימין הוא מי שמתמקד באנשים. למעלה מי שפועל מיד, למטה מי שבודק קודם. ככל שהנקודה רחוקה יותר מהמרכז, הסגנון בולט יותר. לחצו במקום שנראה לכם נכון. אפשר ללחוץ שוב כדי להזיז.
          </p>
        </header>
        <ColorMap onPick={setGuess} dots={guess ? [{ id: 'g', label: 'הניחוש שלי', kind: 'guess', ...guess }] : []} size="lg" tilt={false} />
        <div className="row wrap">
          <button className="btn solid" disabled={!guess} onClick={() => setStep('quiz')}>
            {guess ? 'להמשיך לשאלות' : 'קודם לוחצים על המפה'}
          </button>
          <button className="btn ghost" onClick={() => setStep('intro')}>
            חזרה להסבר
          </button>
        </div>
      </div>
    );

  if (step === 'quiz')
    return (
      <div className="page narrow">
        <p className="quiz-help">שלב 2 מתוך 2. בחרו את התשובה שהכי דומה למה שאתם באמת עושים. כל התשובות טובות, ואין ציון.</p>
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

  return (
    <Result
      readings={readings}
      onAgain={() => (setGuess(null), setStep('intro'))}
      onOther={() =>
        confirmAction({
          title: 'אבחון לאדם אחר במכשיר הזה?',
          body: `${myName ? `התוצאה של ${myName}` : 'התוצאה הנוכחית'} תישאר במפה הכללית, אבל המכשיר יתחיל מחדש בשביל אדם אחר. האנשים והצוותים שהוספת נשארים.`,
          action: 'להתחיל אבחון חדש',
          onConfirm: () => {
            newIdentity();
            setGuess(null);
            setStep('intro');
          },
        })
      }
    />
  );
}

function Result({ readings, onAgain, onOther }: { readings: Reading[]; onAgain: () => void; onOther: () => void }) {
  const lib = useStore((s) => s.library);
  const myName = useStore((s) => s.myName);
  const myRole = useStore((s) => s.myRole);
  const shared = useStore((s) => s.shared);
  const sharedSync = useStore((s) => s.sharedSync);
  const myShared = useStore((s) => s.myShared);
  const pending = useStore((s) => s.publishPending);
  const optOut = useStore((s) => s.optOut);
  const group = useStore((s) => s.group);
  const myGroups = useStore((s) => s.myGroups);
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
  const pool = group ? others.filter((x) => groupsOf(x).includes(group)) : others;
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
        : `מופיע במפה הכללית${myGroups.length ? ` ובקבוצות: ${myGroups.join(', ')}` : ''}`;

  return (
    <div className="page">
      <motion.section className="result" style={toneStyle(r)} initial={{ opacity: 0, rotateX: 12, y: 30 }} animate={{ opacity: 1, rotateX: 0, y: 0 }}>
        <div className="result-text">
          <div className="row wrap result-actions">
            <span className="label">התוצאה שלי</span>
            <button className="btn ghost xs" onClick={onAgain}>
              אבחון חוזר
            </button>
            <button className="btn ghost xs" onClick={onOther}>
              אבחון לאדם אחר במכשיר הזה
            </button>
          </div>
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
              <b>בולטות הסגנון</b> היא המרחק של הנקודה מהמרכז, באחוזים מהמרחק עד הפינה. 0% = מאוזן לגמרי, 100% = כל התשובות מאותו צבע. בולטות נמוכה היא לא חולשה: היא גמישות בין סגנונות.
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
              // בלי שם אין מה להוסיף. הכפתור לא מסיר אף פעם: הסרה נמצאת בנפרד, עם אישור
              if (!name.trim()) return toast('כתבו שם כדי להופיע במפה הכללית', 'error');
              const first = !myShared || optOut;
              setMyName(name, myRoleDraft);
              toast(first ? `${name.trim()} נוסף למפה הכללית` : 'הפרטים עודכנו במפה הכללית');
              publishMe();
            }}
          >
            <label htmlFor="my-name">השם והתפקיד שלי על המפה</label>
            <span className="form-help">כותבים שם ותפקיד ולוחצים. התוצאה שלכם תופיע במפה הכללית, שכל מי שיש לו את הקישור רואה. בלי שם היא נשארת רק במכשיר הזה.</span>
            <div className="row">
              <input id="my-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: ענת" maxLength={40} />
              <input id="my-role" value={myRoleDraft} onChange={(e) => setMyRoleDraft(e.target.value)} placeholder="תפקיד, למשל: אדריכלית" maxLength={60} aria-label="התפקיד שלי" />
              <button className="btn solid sm" type="submit" disabled={!name.trim()}>
                {myShared && !optOut ? 'עדכון הפרטים' : 'להוסיף אותי למפה'}
              </button>
            </div>
            <span className="share-status">{status}</span>
          </form>
        </div>
        <ColorMap dots={dots} size="md" />
      </motion.section>

      {traits ? (
        <>
          <section className="panel">
            <div className="row between">
              <h3>שמונה התכונות שלי</h3>
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
              <h3>כמה אני דומה לכל אחד מארבעת הסגנונות</h3>
              <span className="label">השוואה לסגנונות</span>
            </div>
            <p className="muted">לכל צבע יש צורה טיפוסית של תכונות. כאן הצורה שלך מונחת על הצורה הטיפוסית של צבע אחד. לחצו על צבע אחר כדי להשוות אליו. המספר הוא אחוז הדמיון.</p>
            <div className="model-tabs" role="tablist" aria-label="צבע להשוואה">
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
                { traits: modelTraits(shownModel), label: `הסגנון ה${lib.profiles[shownModel].name} הטיפוסי`, color: lib.profiles[shownModel].hex, dashed: true },
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
              <p className="muted">האנשים במפה הכללית שבחרו בתכונות הכי דומות לשלך. 100% = בחרו בדיוק כמוך.</p>
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
              <p className="muted">לכל תפקיד יש תכונות שההצלחה בו נשענת עליהן. המספר מראה כמה מהן קיימות אצלך.</p>
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
        <p className="hint">האבחון הזה נעשה בגרסה הקודמת, בלי שמונה התכונות. אבחון חוזר (16 שאלות) יוסיף את התכונות, את ההשוואה לסגנונות ואת ההתאמה לתפקידים.</p>
      )}

      {g !== null && (
        <section className="panel gap">
          <span className="label">כמה הניחוש שלי היה קרוב</span>
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

      {myShared && !optOut && (
        <section className="panel privacy">
          <h3>ההופעה שלי במפה הכללית</h3>
          <p className="muted">השם, התפקיד והתוצאה שלך גלויים במפה הכללית. אפשר להסיר אותם בכל רגע. ההסרה לא מוחקת את התוצאה מהמכשיר, ואפשר להוסיף שוב.</p>
          <button
            className="btn ghost sm danger-text"
            onClick={() =>
              confirmAction({ title: 'להסיר אותי מהמפה הכללית?', body: 'השם והתוצאה יימחקו מהמפה הכללית לכל המשתמשים. במכשיר הזה התוצאה נשארת.', action: 'הסרה', onConfirm: () => removeMe() })
            }
          >
            הסרה מהמפה הכללית
          </button>
        </section>
      )}

      <div className="row wrap">
        <button className="btn solid" onClick={onAgain}>
          אבחון חוזר
        </button>
        <button className="btn ghost" onClick={onOther}>
          אבחון לאדם אחר במכשיר הזה
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
