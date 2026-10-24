import { motion } from 'framer-motion';
import { ColorMap, type Dot } from '../components/ColorMap';
import { Editable } from '../components/Editable';
import { Explain, TraitBars, TraitRadar } from '../components/Traits';
import { Tilt } from '../components/Tilt';
import { TRAITS } from '../data/traits';
import { blend, toneStyle } from '../lib/color';
import { fullTraits, personTraits } from '../lib/compare';
import { fit, pointFromTraits, roleTraits } from '../lib/engine';
import { go } from '../lib/router';
import { mePerson, useStore } from '../lib/store';
import type { Point, Role, Traits } from '../lib/types';

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
  people.forEach((p) => out.push({ id: p.id, name: p.name, role: p.role, x: p.x, y: p.y, traits: personTraits(p), source: p.roleId ? 'ארכיטיפ' : p.traits ? 'תצפית' : 'הערכה מהמפה', href: `#/people/${p.id}` }));
  shared.forEach((r) => {
    const t = fullTraits(r.traits);
    if (t && r.id !== myShared?.id) out.push({ id: r.id, name: r.name, role: r.role, x: r.x, y: r.y, traits: t, source: r.group_name ? `המפה הכללית · ${r.group_name}` : 'המפה הכללית' });
  });
  return out;
}

export function Roles({ id }: { id?: string }) {
  const roles = useStore((s) => s.library.roles);
  const list = Object.values(roles);
  const role = id ? roles[id] : undefined;
  return (
    <div className="page">
      <header className="page-head">
        <span className="label">תפקידים · {list.length} ארכיטיפים</span>
        <h1>איזה תפקיד נשען על מה</h1>
        <p className="lead">לכל תפקיד יש תכונות שההצלחה בו נשענת עליהן. כאן רואים מה כל תפקיד דורש, איפה הארכיטיפ שלו יושב על המפה, ומי מהאנשים שלך מתאים לו.</p>
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
      {role ? <RoleDetail role={role} key={role.id} /> : <p className="hint">בחרו תפקיד כדי לראות מה הוא דורש ומי מתאים לו.</p>}
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
    { id: 'role', label: role.name, sub: 'ארכיטיפ', kind: 'guess', ...at },
    ...ranked.slice(0, 6).map(({ c }) => ({ id: c.id, label: c.name, sub: c.role, x: c.x, y: c.y, kind: (c.source === 'אני' ? 'me' : 'person') as Dot['kind'] })),
  ];

  return (
    <motion.article className="role-detail" style={toneStyle(at)} initial={{ opacity: 0, y: 30, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}>
      <header>
        <span className="label">תפקיד</span>
        <Editable section="roles" item={role.id} field="name" value={role.name} as="h2" />
        <Editable section="roles" item={role.id} field="why" value={role.why} className="lead" />
      </header>
      <div className="role-top">
        <section className="panel">
          <h3>מה התפקיד דורש</h3>
          <TraitBars traits={ideal} />
          <Explain>
            <p>הפרופיל האידיאלי של התפקיד: כמה כל תכונה חשובה בו, באותה סקאלה של השאלון. ההתאמה של כל אדם נמדדת מול הפרופיל הזה.</p>
          </Explain>
        </section>
        <ColorMap dots={dots} size="md" caption="המעגל המקווקו: איפה הארכיטיפ של התפקיד יושב" />
      </div>
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
