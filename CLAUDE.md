# מוקף: הנחיות לעבודה בריפו

## אישורים קבועים
- ענת אישרה מיזוג קבוע: אחרי בדיקה ירוקה, למזג כל PR ל-main בלי לשאול.
- לא לעצור לשאלות שאפשר להכריע לבד. להחליט ולרשום את ההנחה בשורה אחת ב-README.

## נתונים
- Supabase: פרויקט cultura-GH (ktqmwpbzcnzkhjskqisy). קידומת idiot_ לטבלאות.
- `idiot_library` (id בצורה profile:red, pair:red-blue, goal:feedback-green). קריאה ציבורית, כתיבה ל-idiot_is_admin(): מייל ב-idiot_admins או sha256 של כותרת x-editor-key ב-idiot_editor_keys.
- ערכת הפתיחה ב-src/data/starter.ts היא גם הגיבוי בלי רשת. אחרי שינוי בה: `npm run seed:sql` והרצת seed.sql (on conflict do nothing, לא דורס עריכות).
- אנשים, צוותים ואבחונים נשארים במכשיר בלבד.

## רכיבים קבועים
- סרגל עליון קבוע: "מוקף" מקשר לדף הבית, קישורי ניווט, וכפתור הלוגו "אד' ענת שטיבלמן A&I".
- בתוך לוגו A&I: העתקת קישור, שיחת הפיתוח, פרויקט המחקר, התקנת האפליקציה (רק כש-Chrome מציע), וקבוצת העריכה. בלי מצב עריכה פעיל אין שדות עריכה בדפים.
- קישורים ב-src/lib/links.ts.
- עברית ו-RTL, בלי אייקונים. IBM Plex Sans Hebrew לטקסט, IBM Plex Mono לתוויות.
- ארבעת צבעי DISC נושאים משמעות (--red, --yellow, --green, --blue). לא להחליף באפור.
- עומק והנפשה: גלגל תלת־ממדי בבית, מפה נטויה עם נקודות מרחפות, שאלות שמתהפכות.

## בדיקה לפני דחיפה
1. `npm run build`
2. `npm run preview` ברקע, ואז `npm run test:e2e`.
3. להסתכל על צילומי המסך בתיקייה `screenshots`.

## מלכודות שנלמדו
- מפה ב-RTL: רשת הרבעים מתהפכת, והנקודות (left/top) לא. `.map-plane` מקבל direction: ltr והרבעים בסדר אדום, צהוב, כחול, ירוק. הבדיקה מוודאת שכל נקודה ברבע שלה.
- עורך הצוות בתוך דף הצוות: אחרי שמירה הכתובת לא משתנה, ולכן סוגרים אותו בקריאה חוזרת (onDone) ולא בניווט.
- מלכודות מ-Faces שתקפות גם כאן: בלי AnimatePresence סביב דפים; `.btn.menu-toggle`; `overflow-x: clip` ב-`.main`; בדיקת התקנה רק ב-launchPersistentContext; serviceWorkers: 'block' בבדיקות עם מוק; executablePath '/opt/pw-browsers/chromium'.
- הסביבה לא מגיעה ל-supabase.co: בדיקות דרך tests/supa-mock.mjs, שקורא את supabase/seed.sql.
