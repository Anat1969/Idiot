import { motion } from 'framer-motion';
import { ColorMap, type Dot } from '../components/ColorMap';
import { Tilt } from '../components/Tilt';
import { Wheel3D } from '../components/Wheel3D';
import { colorAt } from '../lib/engine';
import { useStore } from '../lib/store';
import { describe } from '../lib/text';

export function Home() {
  const lib = useStore((s) => s.library);
  const reading = useStore((s) => s.readings[0]);
  const people = useStore((s) => s.people);
  const teams = useStore((s) => s.teams);
  const myName = useStore((s) => s.myName);
  const shared = useStore((s) => s.shared);

  const dots: Dot[] = [
    ...people.map((p) => ({ id: p.id, label: p.name, x: p.x, y: p.y, kind: 'person' as const, href: `#/people/${p.id}` })),
    ...(reading ? [{ id: 'me', label: myName || 'אני', x: reading.x, y: reading.y, kind: 'me' as const, href: '#/me' }] : []),
  ];

  const routes = [
    {
      href: '#/me',
      tag: '01',
      title: 'מי אני',
      text: reading ? describe(lib, reading).line : 'ניחוש, 16 שאלות, פרופיל של שמונה תכונות, והשוואה לעצמך, למודלים ולאחרים.',
      color: reading ? colorAt(reading) : null,
    },
    { href: '#/people', tag: '02', title: 'האנשים סביבי', text: `${people.length === 1 ? 'אדם אחד' : `${people.length} אנשים`} על המפה. שש שאלות תצפית לכל אחד.`, color: null },
    { href: '#/meet', tag: '03', title: 'הכנה לשיחה', text: 'בוחרים אדם ומטרה, ומקבלים משפט פתיחה, מהלך ומה לא לעשות.', color: null },
    { href: '#/team', tag: '04', title: 'צוות', text: `${teams.length === 1 ? 'צוות אחד' : `${teams.length} צוותים`}. איזון, חיכוכים, ומי ממלא איזה תפקיד.`, color: null },
    { href: '#/map', tag: '05', title: 'המפה הכללית', text: `${shared.length} אנשים אבחנו את עצמם ושמרו. מכל מכשיר, על מפה אחת.`, color: null },
    { href: '#/roles', tag: '06', title: 'תפקידים', text: 'מה כל תפקיד דורש, ומי מתאים לו לפי התכונות.', color: null },
  ];

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-text">
          <span className="label">מודל DISC · ארבעה סגנונות תקשורת</span>
          <h1>
            <span>"אתה מוקף</span> <span>אידיוטים"</span>
          </h1>
          <p className="lead">
            או שכל אחד סביבך פשוט מדבר בשפה אחרת.
            <br />
            ארבעה צבעים, מפה אחת, ותרגום לכל שיחה.
          </p>
          <div className="row wrap">
            <a className="btn solid" href="#/me">
              {reading ? 'האבחון שלי' : 'להתחיל באבחון'}
            </a>
            <a className="btn ghost" href="#/colors">
              להכיר את הצבעים
            </a>
          </div>
        </div>
        <Wheel3D />
      </section>

      <section className="routes" aria-label="מסלולים">
        {routes.map((r, i) => (
          <motion.div key={r.href} initial={{ opacity: 0, y: 30, rotateX: 20 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
            <Tilt max={7}>
              <a href={r.href} className={`route-card ${r.color ? `tone-${r.color}` : ''}`}>
                <span className="label">{r.tag}</span>
                <h2>{r.title}</h2>
                <p>{r.text}</p>
              </a>
            </Tilt>
          </motion.div>
        ))}
      </section>

      <section className="home-map">
        <div>
          <span className="label">המפה שלך</span>
          <h2>מי נמצא איפה</h2>
          <p className="muted">
            הציר האופקי: משימה מול אנשים. הציר האנכי: יוזם ופועל מיד, מול שקול ובודק קודם. כל רבע הוא צבע. לחיצה על נקודה פותחת את האדם.
          </p>
          {!reading && (
            <a className="btn ghost sm" href="#/me">
              להוסיף את עצמי למפה
            </a>
          )}
        </div>
        <ColorMap dots={dots} size="md" />
      </section>
    </div>
  );
}
