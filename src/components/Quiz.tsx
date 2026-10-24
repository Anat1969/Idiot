import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Color, Question } from '../lib/types';

/** ערבוב קבוע לכל שאלה, כדי שסדר הצבעים לא יחזור על עצמו */
function shuffled<T>(arr: T[], seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function Quiz({ questions, subject, onDone, onCancel }: { questions: Question[]; subject?: string; onDone: (a: Record<string, Color>) => void; onCancel: () => void }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Color>>({});
  const q = questions[i];
  const options = useMemo(() => shuffled(q.options, q.id), [q]);

  const choose = (c: Color) => {
    const next = { ...answers, [q.id]: c };
    setAnswers(next);
    if (i === questions.length - 1) onDone(next);
    else setTimeout(() => setI(i + 1), 160);
  };

  return (
    <section className="quiz" aria-label="שאלון">
      <div className="quiz-head">
        <span className="label">
          {subject ? `${subject} · ` : ''}שאלה {i + 1} מתוך {questions.length}
        </span>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={i}>
          <motion.span animate={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={q.id}
          className="quiz-card"
          initial={{ opacity: 0, rotateY: -35, x: -60 }}
          animate={{ opacity: 1, rotateY: 0, x: 0 }}
          exit={{ opacity: 0, rotateY: 30, x: 60 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        >
          <h2>{q.text}</h2>
          <div className="options">
            {options.map((o) => (
              <button key={o.label} className={`option ${answers[q.id] === o.color ? 'chosen' : ''}`} onClick={() => choose(o.color)}>
                {o.label}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="row quiz-nav">
        <button className="btn ghost sm" onClick={() => (i ? setI(i - 1) : onCancel())}>
          {i ? 'לשאלה הקודמת' : 'ביטול'}
        </button>
      </div>
    </section>
  );
}
