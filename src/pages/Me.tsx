import { motion } from 'framer-motion';
import { useState } from 'react';
import { ColorMap, type Dot } from '../components/ColorMap';
import { Quiz } from '../components/Quiz';
import { COLORS, selfQuestions } from '../data/starter';
import { colorAt, gap, gapText, score } from '../lib/engine';
import { toast } from '../lib/feedback';
import { addReading, useStore } from '../lib/store';
import { copyText, describe } from '../lib/text';
import type { Point, Reading } from '../lib/types';

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
          <p className="lead">סמנו על המפה איפה אתם חושבים שאתם נמצאים. אחר כך 12 שאלות קצרות. בסוף תראו את שתי הנקודות ואת הפער ביניהן.</p>
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
  const r = readings[0];
  if (!r) return null;
  const { main, sec, line } = describe(lib, r);
  const g = r.guess ? gap(r.guess, r) : null;
  const dots: Dot[] = [
    ...(r.guess ? [{ id: 'g', label: 'הניחוש', kind: 'guess' as const, ...r.guess }] : []),
    { id: 'me', label: 'אני', kind: 'me', x: r.x, y: r.y },
  ];

  const manual = [
    `המדריך לעבודה איתי: ${line}`,
    '',
    `איך לדבר איתי: ${main.communication}`,
    `מה מניע אותי: ${main.motivation}`,
    `מה אני מביא לצוות: ${main.contribution}`,
    `כשאני בלחץ: ${main.pressure}`,
    '',
    'מה עוזר לי:',
    ...main.speakTo.map((s) => `- ${s}`),
    `ומה כדאי לא לעשות: ${main.avoid.join(', ')}`,
  ].join('\n');

  return (
    <div className="page">
      <motion.section className={`result tone-${main.color}`} initial={{ opacity: 0, rotateX: 12, y: 30 }} animate={{ opacity: 1, rotateX: 0, y: 0 }}>
        <div className="result-text">
          <span className="label">התוצאה שלי</span>
          <h1>
            {main.name}
            <small> · {main.title}</small>
          </h1>
          <p className="lead">{line}.</p>
          <p>{main.essence}</p>
          <div className="mix" aria-label="חלוקת הצבעים בתשובות">
            {COLORS.map((c) => (
              <div key={c} className={`mix-row tone-${c}`}>
                <span>{lib.profiles[c].name}</span>
                <span className="bar">
                  <motion.i initial={{ width: 0 }} animate={{ width: `${Math.round(r.mix[c] * 100)}%` }} transition={{ delay: 0.3, duration: 0.8 }} />
                </span>
                <span className="mono">{Math.round(r.mix[c] * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
        <ColorMap dots={dots} size="md" />
      </motion.section>

      {g !== null && (
        <section className="panel gap">
          <span className="label">פער מודעות עצמית</span>
          <div className="gap-row">
            <span className="mono big">{g}%</span>
            <p>{gapText(g)}</p>
          </div>
          {r.guess && colorAt(r.guess) !== main.color && (
            <p className="muted">
              ניחשת {lib.profiles[colorAt(r.guess)].name}. התשובות מצביעות על {main.name}.
            </p>
          )}
        </section>
      )}

      <div className="detail-grid">
        <section className="panel">
          <h3>החוזקות שלי</h3>
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
        <p className="muted">טקסט מוכן לשליחה לצוות או לחתימה של מייל היכרות.</p>
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
              <li key={x.at} className={`tone-${colorAt(x)}`}>
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
