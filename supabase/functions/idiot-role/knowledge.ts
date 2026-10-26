// מאגר ידע: משפחות תפקידים ואילו תכונות כל משפחה דורשת, ולמה.
// משמש כשהמומחה המלא (מודל שפה) לא זמין. התפקיד נשמר כ-source = 'auto' ומנותח מחדש כשהמומחה חוזר.
type Level = "helps" | "important" | "essential";
type Family = { words: string[]; topic: string; needs: Partial<Record<string, [Level, string]>> };

export const FAMILIES: Family[] = [
  {
    topic: "ניהול פרויקט",
    words: ["מנהל פרויקט", "מנהלת פרויקט", "ניהול פרויקט", "פרויקטור", "project", "pm"],
    needs: {
      plan: ["essential", "לוחות זמנים, תקציב ושלבים הם לב העבודה"],
      lead: ["essential", "צריך להזיז צוות ויועצים כשמשהו נתקע"],
      decisive: ["important", "הרבה החלטות קטנות ביום, בלי לחכות לתמונה מלאה"],
      connect: ["helps", "עובדים מול הרבה גורמים במקביל"],
    },
  },
  {
    topic: "ניהול אנשים",
    words: ["מנהל", "מנהלת", "ראש צוות", "ראש מחלקה", "סמנכ", "מנכ", "דירקטור", "manager", "lead", "head"],
    needs: {
      lead: ["essential", "האחריות על אנשים ועל התוצאה של הצוות"],
      listen: ["important", "להבין מה כל אחד בצוות צריך כדי לעבוד טוב"],
      decisive: ["important", "להכריע בין עמדות ולהתקדם"],
      steady: ["helps", "צוות צריך מנהל צפוי ויציב"],
    },
  },
  {
    topic: "יזמות והקמה",
    words: ["יזם", "יזמית", "מייסד", "מייסדת", "בעלים", "founder", "סטארט"],
    needs: {
      decisive: ["essential", "להחליט מהר עם מעט מידע ולשאת בסיכון"],
      inspire: ["essential", "לגייס אנשים, משקיעים ולקוחות לחזון שעוד לא קיים"],
      lead: ["important", "להוביל משהו מאפס בלי מבנה קיים"],
      connect: ["helps", "קשרים פותחים דלתות בשלב מוקדם"],
    },
  },
  {
    topic: "מכירות ופיתוח עסקי",
    words: ["מכיר", "מכירות", "איש מכירות", "אשת מכירות", "פיתוח עסקי", "sales", "סוכן", "סוכנת", "נציג"],
    needs: {
      connect: ["essential", "כל עסקה מתחילה בקשר אישי"],
      inspire: ["important", "לגרום ללקוח להתלהב מהפתרון"],
      decisive: ["important", "לסגור עסקה ולא להשאיר אותה פתוחה"],
      steady: ["helps", "מעקב עקבי אחרי לקוחות לאורך זמן"],
    },
  },
  {
    topic: "שירות ותמיכה",
    words: ["שירות", "תמיכה", "קשרי לקוחות", "מוקד", "support", "קבלת קהל", "מזכיר", "מזכירה"],
    needs: {
      listen: ["essential", "להבין מה הפנייה באמת לפני שעונים"],
      steady: ["important", "סבלנות ורמה קבועה גם בפנייה המאה ביום"],
      thorough: ["helps", "לפתור עד הסוף ולא חצי פתרון"],
    },
  },
  {
    topic: "קשר עם לקוחות",
    words: ["תיק לקוח", "לקוחות", "account", "קשר לקוח", "client"],
    needs: {
      listen: ["essential", "לשמוע מה הלקוח צריך גם כשהוא לא אומר את זה"],
      connect: ["important", "לבנות אמון שנמשך לאורך זמן"],
      plan: ["helps", "לנהל התחייבויות ומועדים מול הלקוח"],
    },
  },
  {
    topic: "תכנון ועיצוב",
    words: ["אדריכל", "מעצב", "מעצבת", "עיצוב", "קונספט", "designer", "design", "ux", "ui", "גרפיק"],
    needs: {
      inspire: ["essential", "להציג רעיון שגורם לאחרים לראות את מה שעוד לא קיים"],
      thorough: ["important", "הפרטים הקטנים הם מה שמבדיל עבודה טובה"],
      listen: ["important", "להבין את הצורך של המשתמש או הלקוח לפני שמשרטטים"],
    },
  },
  {
    topic: "הנדסה וחישוב",
    words: ["מהנדס", "מהנדסת", "קונסטרוקטור", "חישוב", "engineer", "הנדס"],
    needs: {
      thorough: ["essential", "טעות בחישוב עולה ביוקר באתר"],
      plan: ["important", "לעבוד בשיטה ובסדר שאפשר לבדוק"],
      steady: ["helps", "עבודה ארוכה שדורשת ריכוז קבוע"],
    },
  },
  {
    topic: "תיאום ובקרה",
    words: ["מתאם", "מתאמת", "תיאום", "bim", "בקר", "בקרה", "פיקוח", "מפקח", "מפקחת", "qa", "qc", "בודק", "בודקת"],
    needs: {
      thorough: ["essential", "לתפוס סתירות והתנגשויות לפני שהן מגיעות לביצוע"],
      plan: ["important", "לנהל רשימות, גרסאות ומסירות מכל הגורמים"],
      connect: ["helps", "לעבוד מול הרבה יועצים ולהביא אותם לאותו שולחן"],
    },
  },
  {
    topic: "ביצוע באתר",
    words: ["מנהל עבודה", "אתר", "ביצוע", "קבלן", "site", "שטח", "תפעול", "operations"],
    needs: {
      decisive: ["essential", "בעיות בשטח לא מחכות, צריך להחליט במקום"],
      lead: ["important", "להזיז צוותים וספקים כל יום"],
      plan: ["important", "לתאם סדר עבודה, חומרים ואנשים"],
    },
  },
  {
    topic: "רישוי ורגולציה",
    words: ["רישוי", "היתר", "רגולצי", "ציות", "compliance", "משפט", "עורך דין", "עורכת דין", "יועץ משפטי", "יועצת משפטית"],
    needs: {
      thorough: ["essential", "סעיף אחד שהוחמץ יכול לעצור הכול"],
      steady: ["important", "תהליכים ארוכים שדורשים מעקב סבלני"],
      plan: ["helps", "לנהל מועדים ומסמכים מול רשויות"],
    },
  },
  {
    topic: "כספים וחשבונות",
    words: ["חשב", "חשבונ", "כספים", "כלכל", "תקציב", "finance", "accountant", "רואה חשבון", "רואת חשבון", "הנהלת חשבונות"],
    needs: {
      thorough: ["essential", "כל מספר צריך להתאים עד השקל"],
      plan: ["important", "תקציב ותחזית הם תכנון לאורך זמן"],
      steady: ["helps", "שגרה קבועה של דיווחים וסגירות"],
    },
  },
  {
    topic: "פיתוח תוכנה",
    words: ["מפתח", "מפתחת", "תוכנ", "developer", "programmer", "dev", "קוד"],
    needs: {
      thorough: ["essential", "באג קטן יכול להפיל מערכת שלמה"],
      plan: ["important", "לפרק בעיה גדולה לשלבים שאפשר לבנות ולבדוק"],
      steady: ["helps", "עבודה ממוקדת לאורך זמן"],
    },
  },
  {
    topic: "נתונים ומחקר",
    words: ["חוקר", "חוקרת", "מחקר", "אנליסט", "נתונים", "data", "analyst", "מדען", "מדענית"],
    needs: {
      thorough: ["essential", "מסקנה טובה כמו הבדיקה שמאחוריה"],
      plan: ["important", "לבנות שיטת עבודה שאפשר לשחזר"],
      listen: ["helps", "להבין מה השאלה האמיתית של מי שמבקש"],
    },
  },
  {
    topic: "הוראה והדרכה",
    words: ["מורה", "מורים", "מדריך", "מדריכה", "מרצה", "הוראה", "חינוך", "גננת", "teacher", "trainer"],
    needs: {
      inspire: ["essential", "לגרום לאחרים לרצות ללמוד"],
      listen: ["important", "לזהות מה כל לומד צריך"],
      steady: ["important", "התקדמות בלמידה בנויה על עקביות"],
      plan: ["helps", "לבנות שיעור ותוכנית לימוד"],
    },
  },
  {
    topic: "טיפול וליווי",
    words: ["מטפל", "מטפלת", "פסיכולוג", "עובד סוציאלי", "עובדת סוציאלית", "יועץ", "יועצת", "מאמן", "מאמנת", "coach", "therapist", "אחות", "אח ", "רופא", "רופאה"],
    needs: {
      listen: ["essential", "הקשבה היא הכלי המרכזי של העבודה"],
      steady: ["important", "אמון נבנה מנוכחות קבועה וצפויה"],
      thorough: ["helps", "לא לפספס סימנים קטנים"],
    },
  },
  {
    topic: "שיווק ותוכן",
    words: ["שיווק", "מרקטינג", "marketing", "תוכן", "קופי", "כותב", "כותבת", "דוברות", "דובר", "יחסי ציבור", "סושיאל", "מותג"],
    needs: {
      inspire: ["essential", "מסר שלא מעורר רגש לא נזכר"],
      connect: ["important", "להגיע לאנשים ולהפיץ דרך קשרים"],
      plan: ["helps", "קמפיין הוא לוח זמנים של הרבה חלקים"],
    },
  },
  {
    topic: "משאבי אנוש",
    words: ["משאבי אנוש", "גיוס", "hr", "רווחה", "פיתוח ארגוני"],
    needs: {
      listen: ["essential", "להבין אנשים ומה מניע אותם"],
      connect: ["important", "לבנות קשרים בכל רחבי הארגון"],
      steady: ["helps", "תהליכים הוגנים וצפויים"],
    },
  },
  {
    topic: "רכש ולוגיסטיקה",
    words: ["רכש", "לוגיסטיק", "מחסן", "שרשרת אספקה", "procurement", "logistics", "הזמנות"],
    needs: {
      plan: ["essential", "הכול צריך להגיע בזמן ובכמות הנכונה"],
      thorough: ["important", "טעות בהזמנה עוצרת את כל השרשרת"],
      decisive: ["helps", "להחליט מהר כשספק מאכזב"],
    },
  },
  {
    topic: "אמנות ויצירה",
    words: ["אמן", "אמנית", "צלם", "צלמת", "במאי", "במאית", "שחקן", "שחקנית", "מוזיקאי", "יוצר", "יוצרת", "אוצר", "אוצרת"],
    needs: {
      inspire: ["essential", "היצירה צריכה לרגש ולהזיז"],
      decisive: ["important", "לבחור כיוון ולהתחייב אליו"],
      steady: ["helps", "יצירה נבנית מעבודה יומיומית"],
    },
  },
  {
    topic: "ניהול משרד",
    words: ["מנהלת משרד", "מנהל משרד", "אדמיניסטר", "office", "תפעול משרד"],
    needs: {
      plan: ["essential", "סדר, יומנים ומערכות שעובדות"],
      steady: ["important", "המשרד נשען על מי שתמיד שם"],
      listen: ["helps", "לשים לב למה שכל אחד במשרד צריך"],
    },
  },
];

const RANK: Record<Level, number> = { helps: 1, important: 2, essential: 3 };
const VALUE: Record<Level, number> = { helps: 0.4, important: 0.7, essential: 1 };

/** ניתוח לפי משפחות התפקידים. מחזיר null כשלא זוהתה אף משפחה */
export function analyzeLocally(name: string, why: string, labels: Record<string, string>) {
  const text = ` ${name} ${why} `.toLowerCase();
  const hits = FAMILIES.map((f) => ({ f, score: f.words.filter((w) => text.includes(w.toLowerCase())).reduce((s, w) => s + w.length * (name.toLowerCase().includes(w.toLowerCase()) ? 2 : 1), 0) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  if (!hits.length) return null;
  const best: Record<string, { level: Level; reason: string; w: number }> = {};
  hits.forEach(({ f }, i) => {
    for (const [k, v] of Object.entries(f.needs)) {
      if (!v) continue;
      // המשפחה השנייה מוסיפה, אבל לא מעל "חשוב"
      const level: Level = i === 0 ? v[0] : v[0] === "essential" ? "important" : v[0];
      const w = RANK[level];
      if (!best[k] || w > best[k].w) best[k] = { level, reason: v[1], w };
    }
  });
  const top = Object.entries(best).sort((a, b) => b[1].w - a[1].w).slice(0, 4);
  const needs: Record<string, number> = {};
  const reasons: Record<string, string> = {};
  for (const [k, v] of top) {
    needs[k] = VALUE[v.level];
    reasons[k] = v.reason;
  }
  for (const k of Object.keys(labels)) if (!needs[k]) reasons[k] = `פחות קריטית בתפקיד של ${hits[0].f.topic}`;
  return { needs, reasons, topic: hits.map((h) => h.f.topic).join(" ו") };
}
