import { useEffect, useState } from 'react';
import { StudioMenu } from './StudioMenu';
import type { Route } from '../lib/router';


const NAV = [
  { href: '#/map', label: 'המפה הכללית', page: 'map' },
  { href: '#/colors', label: 'הצבעים', page: 'colors' },
  { href: '#/me', label: 'מי אני', page: 'me' },
  { href: '#/people', label: 'אנשים', page: 'people' },
  { href: '#/meet', label: 'הכנה לשיחה', page: 'meet' },
  { href: '#/team', label: 'צוות', page: 'team' },
  { href: '#/roles', label: 'תפקידים', page: 'roles' },
] as const;

export function TopBar({ route }: { route: Route }) {
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [route]);

  const activePage = route.page;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a href="#/" className="brand" aria-label="מוקף, דף הבית">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="brand-name">מוקף</span>
        </a>

        <StudioMenu />

        <button
          className="menu-toggle btn ghost sm"
          aria-expanded={open}
          aria-controls="topnav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'סגירה' : 'תפריט'}
        </button>

        <nav id="topnav" className={`topnav ${open ? 'open' : ''}`} aria-label="ניווט ראשי">
          <div className="topnav-links">
            {NAV.map((n) => (
              <a key={n.page} href={n.href} className={activePage === n.page ? 'active' : ''} aria-current={activePage === n.page ? 'page' : undefined}>
                {n.label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
