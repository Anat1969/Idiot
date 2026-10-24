import { useEffect, useRef } from 'react';
import { toast } from '../lib/feedback';
import { DEV_CHAT_URL, RESEARCH_URL } from '../lib/links';
import { go } from '../lib/router';
import { setState, useStore } from '../lib/store';
import { forgetEditorKey, saveEditorKey } from '../lib/supa';

interface MenuItem {
  label: string;
  hint?: string;
  pressed?: boolean;
  disabled?: boolean;
  onSelect?: () => unknown;
}
interface MenuElement extends HTMLElement {
  items: MenuItem[];
  status: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'ai-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { chat?: string; research?: string; class?: string };
    }
  }
}

/** כפתור הלוגו A&I (https://appofapp-gh.vercel.app/ai-menu.js): העתקת קישור, שיחת הפיתוח, פרויקט המחקר, ההתקנה וכל פעולות העריכה */
export function StudioMenu() {
  const canEdit = useStore((s) => s.canEdit);
  const editMode = useStore((s) => s.editMode);
  const sync = useStore((s) => s.sync);
  const ref = useRef<MenuElement>(null);
  const editing = canEdit && editMode;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.items = canEdit
      ? [
          {
            label: editing ? 'מצב עריכה פעיל. לכיבוי' : 'הפעלת מצב עריכה',
            pressed: editing,
            onSelect: () => {
              setState({ editMode: !editMode });
              toast(editMode ? 'מצב עריכה כבוי' : 'מצב עריכה פעיל');
            },
          },
          { label: 'עריכת פרופילי הצבעים', disabled: !editing, onSelect: () => go('/colors/red') },
          { label: 'עריכת עצות לשיחה', disabled: !editing, onSelect: () => go('/meet') },
          {
            label: 'ניתוק המכשיר מהעריכה',
            onSelect: () => {
              forgetEditorKey();
              setState({ editMode: false });
              location.reload();
            },
          },
        ]
      : sync === 'offline'
        ? [{ label: 'אין חיבור לספרייה', hint: 'העריכה תחזור עם החיבור', disabled: true }]
        : [
            {
              label: 'כניסה לעריכה במכשיר הזה',
              hint: 'מפתח עריכה',
              onSelect: () => {
                const key = prompt('מפתח עריכה')?.trim();
                if (!key) return;
                if (key.length < 16) return toast('מפתח העריכה קצר מדי', 'error');
                saveEditorKey(key);
                setState({ editMode: true });
                location.reload();
              },
            },
          ];
    el.status = editing ? 'עריכה פעילה' : '';
  }, [canEdit, editMode, editing, sync]);

  return <ai-menu ref={ref} class="studio" chat={DEV_CHAT_URL} research={RESEARCH_URL} />;
}
