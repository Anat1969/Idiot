import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { ConfirmDialog, Toasts } from './components/Feedback';
import { TopBar } from './components/TopBar';
import { loadLibrary } from './lib/library';
import { useRoute } from './lib/router';
import { useStore } from './lib/store';
import { Colors } from './pages/Colors';
import { Home } from './pages/Home';
import { Me } from './pages/Me';
import { Meet } from './pages/Meet';
import { People } from './pages/People';
import { Team } from './pages/Team';
import { SharedMap } from './pages/SharedMap';
import { Roles } from './pages/Roles';
import { loadShared } from './lib/shared';

const TITLES: Record<string, string> = {
  home: 'מוקף · אתה מוקף אידיוטים',
  colors: 'הצבעים · מוקף',
  me: 'מי אני · מוקף',
  people: 'אנשים · מוקף',
  meet: 'הכנה לשיחה · מוקף',
  team: 'צוות · מוקף',
  map: 'המפה הכללית · מוקף',
  roles: 'תפקידים · מוקף',
};

export function App() {
  const route = useRoute();
  const editing = useStore((s) => s.canEdit && s.editMode);
  useEffect(() => {
    loadLibrary();
    loadShared();
    const onFocus = () => document.visibilityState === 'visible' && (loadLibrary(), loadShared());
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, []);
  useEffect(() => {
    document.title = TITLES[route.page];
    window.scrollTo({ top: 0 });
  }, [route.page, 'id' in route ? route.id : '', 'color' in route ? route.color : '']);

  const key = JSON.stringify({ ...route, goal: undefined });

  return (
    <>
      <div className="backdrop" aria-hidden="true">
        <span className="plane p1" />
        <span className="plane p2" />
        <span className="plane p3" />
        <span className="plane p4" />
      </div>
      <TopBar route={route} />
      {editing && (
        <div className="edit-strip" role="status">
          מצב עריכה פעיל. כל טקסט מהספרייה הוא שדה, והשמירה ביציאה ממנו.
        </div>
      )}
      <main className="main">
        {/* כניסה מונפשת לכל דף, בלי AnimatePresence (לקח מ-Faces) */}
        <motion.div
          key={key}
          initial={{ opacity: 0, rotateX: 6, y: 24, transformPerspective: 1200 }}
          animate={{ opacity: 1, rotateX: 0, y: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {route.page === 'home' && <Home />}
          {route.page === 'colors' && <Colors color={route.color} />}
          {route.page === 'me' && <Me />}
          {route.page === 'people' && <People id={route.id} />}
          {route.page === 'meet' && <Meet id={route.id} goal={route.goal} />}
          {route.page === 'team' && <Team id={route.id} />}
          {route.page === 'map' && <SharedMap />}
          {route.page === 'roles' && <Roles id={route.id} />}
        </motion.div>
      </main>
      <footer className="foot">
        <span className="label">מוקף · מבוסס על מודל DISC · הערכות האנשים נשמרות רק במכשיר שלך</span>
      </footer>
      <Toasts />
      <ConfirmDialog />
    </>
  );
}
