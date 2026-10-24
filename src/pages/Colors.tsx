import { motion } from 'framer-motion';
import { Editable } from '../components/Editable';
import { Tilt } from '../components/Tilt';
import { COLORS } from '../data/starter';
import { toast } from '../lib/feedback';
import { useStore } from '../lib/store';
import { copyText } from '../lib/text';
import type { Color } from '../lib/types';

export function Colors({ color }: { color?: Color }) {
  const profiles = useStore((s) => s.library.profiles);
  return (
    <div className="page">
      <header className="page-head">
        <span className="label">הספרייה</span>
        <h1>ארבעת הצבעים</h1>
        <p className="lead">שני צירים: האם האדם ממוקד במשימה או באנשים, והאם הוא פועל מיד או בודק קודם. אף צבע אינו טוב יותר, ולכל קצה יש חוזקה. כל אחד צריך תרגום אחר.</p>
      </header>
      <nav className="color-tabs" aria-label="צבעים">
        {COLORS.map((c, i) => (
          <motion.div key={c} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Tilt max={8}>
              <a href={`#/colors/${c}`} className={`color-tab tone-${c} ${color === c ? 'active' : ''} ${color && color !== c ? 'dim' : ''}`} aria-current={color === c ? 'page' : undefined}>
                <b>{profiles[c].name}</b>
                <span>{profiles[c].title}</span>
                <small>{profiles[c].essence}</small>
              </a>
            </Tilt>
          </motion.div>
        ))}
      </nav>
      {color ? <ColorDetail color={color} key={color} /> : <p className="hint">בחרו צבע כדי לפתוח את הפרופיל המלא: איך מזהים, איך מדברים, ומה קורה תחת לחץ.</p>}
    </div>
  );
}

function ColorDetail({ color }: { color: Color }) {
  const lib = useStore((s) => s.library);
  const p = lib.profiles[color];
  const E = (field: keyof typeof p, as?: 'p' | 'ul' | 'ol' | 'h2') => <Editable section="profiles" item={color} field={field} value={p[field] as string} as={as} />;

  const manual = [
    `איך לדבר עם ${p.name} (${p.title})`,
    '',
    ...p.speakTo.map((s, i) => `${i + 1}. ${s}`),
    '',
    `משפטים שעובדים: ${p.use.join(' · ')}`,
    `להימנע: ${p.avoid.join(' · ')}`,
    `מייל: ${p.email}`,
  ].join('\n');

  return (
    <motion.article className={`detail tone-${color}`} initial={{ opacity: 0, y: 30, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}>
      <header className="detail-head">
        <span className="swatch" aria-hidden="true" />
        <div>
          <span className="label">{p.title}</span>
          <h2>{p.name}</h2>
          {E('essence', 'p')}
        </div>
      </header>

      <div className="detail-grid">
        <section className="panel">
          <h3>תכונות</h3>
          {E('traits', 'ul')}
        </section>
        <section className="panel">
          <h3>אתגרים</h3>
          {E('challenges', 'ul')}
        </section>
        <section className="panel wide">
          <h3>איך מזהים</h3>
          {E('signals', 'ul')}
        </section>
        <section className="panel">
          <h3>התרומה לצוות</h3>
          {E('contribution')}
          <h3>מה מניע</h3>
          {E('motivation')}
        </section>
        <section className="panel">
          <h3>סגנון תקשורת</h3>
          {E('communication')}
          <h3>ממה חושש</h3>
          {E('fear')}
        </section>
        <section className="panel pressure">
          <h3>תחת לחץ</h3>
          {E('pressure')}
        </section>
      </div>

      <section className="panel manual">
        <div className="row between">
          <h3>איך לדבר איתו</h3>
          <button
            className="btn ghost sm"
            onClick={() => copyText(manual).then(() => toast('ההנחיות הועתקו'), () => toast('ההעתקה נחסמה', 'error'))}
          >
            העתקת ההנחיות
          </button>
        </div>
        {E('speakTo', 'ol')}
        <div className="two">
          <div>
            <h4>משפטים שעובדים</h4>
            {E('use', 'ul')}
          </div>
          <div>
            <h4>להימנע</h4>
            {E('avoid', 'ul')}
          </div>
        </div>
        <h4>מייל אליו</h4>
        {E('email')}
      </section>

      <section className="panel">
        <h3>כש{p.name} פוגש את האחרים</h3>
        <div className="pair-list">
          {COLORS.map((c) => {
            const pair = lib.pairs[`${color}-${c}`];
            return (
              <div key={c} className={`pair-row tone-${c}`}>
                <span className="chip">{lib.profiles[c].name}</span>
                <div>
                  <Editable section="pairs" item={`${color}-${c}`} field="title" value={pair.title} as="h4" />
                  <Editable section="pairs" item={`${color}-${c}`} field="doThis" value={pair.doThis} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </motion.article>
  );
}
