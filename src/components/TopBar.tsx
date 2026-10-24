import { useEffect, useState } from 'react';
import { toast } from '../lib/feedback';
import { StudioMenu } from './StudioMenu';
import type { Route } from '../lib/router';


type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

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
  const [install, setInstall] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setInstall(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstall(null);
      toast('האפליקציה הותקנה');
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => setOpen(false), [route]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast('הקישור הועתק');
    } catch {
      toast('ההעתקה נחסמה בדפדפן', 'error');
    }
  };

  const doInstall = async () => {
    if (!install) return;
    await install.prompt();
    await install.userChoice;
    setInstall(null);
  };

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

        <StudioMenu install={!!install} onInstall={doInstall} onCopy={copyLink} />

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
