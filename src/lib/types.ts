export type Color = 'red' | 'yellow' | 'green' | 'blue';
export type GoalKey = 'persuade' | 'ask' | 'feedback' | 'conflict' | 'delegate';

export type Profile = {
  color: Color;
  name: string;
  title: string;
  essence: string;
  traits: string[];
  challenges: string[];
  contribution: string;
  communication: string;
  pressure: string;
  motivation: string;
  fear: string;
  signals: string[];
  speakTo: string[];
  use: string[];
  avoid: string[];
  email: string;
  hex: string;
};

export type Pair = { title: string; tips: string[]; doThis: string; avoidThis: string };
export type GoalAdvice = { goal: GoalKey; color: Color; open: string; steps: string[]; avoid: string };
/** שמונה תכונות, שתיים לכל צבע. כל תכונה נמדדת בנפרד */
export type Trait = 'decisive' | 'lead' | 'inspire' | 'connect' | 'listen' | 'steady' | 'thorough' | 'plan';
export type Traits = Record<Trait, number>;

export type Question = { id: string; text: string; options: { label: string; color: Color; trait: Trait }[] };

/** תפקיד: אילו תכונות נדרשות להצלחה בו, ובאיזה משקל (0 עד 1) */
export type Role = { id: string; name: string; why: string; needs: Partial<Traits> };

export type Library = {
  profiles: Record<Color, Profile>;
  pairs: Record<string, Pair>;
  goals: Record<string, GoalAdvice>;
  roles: Record<string, Role>;
};

/** מיקום על המפה: x משימה (-1) עד אנשים (1), y שקול (-1) עד יוזם (1) */
export type Point = { x: number; y: number };

export type Reading = Point & {
  /** חלק כל צבע בתשובות, מ-0 עד 1 */
  mix: Record<Color, number>;
  at: number;
  /** הניחוש שלי לפני השאלון, כשהיה */
  guess?: Point;
  /** פרופיל התכונות: לכל תכונה, כמה פעמים נבחרה מתוך הפעמים שהוצעה (0 עד 1) */
  traits?: Traits;
};

export type Person = Point & {
  id: string;
  name: string;
  role: string;
  note: string;
  demo?: boolean;
  /** לארכיטיפ של תפקיד: מזהה התפקיד */
  roleId?: string;
  /** פרופיל תכונות, מתצפית או מהארכיטיפ */
  traits?: Traits;
  at: number;
};

/** תוצאה במפה הכללית: כל מי שאבחן את עצמו, מכל מכשיר */
export type SharedResult = Point & {
  id: string;
  name: string;
  role: string;
  group_name: string;
  /** כל הקבוצות שהאדם הצטרף אליהן */
  groups?: string[];
  mix: Partial<Record<Color, number>>;
  traits: Partial<Traits>;
  created_at: string;
  updated_at: string;
};

export type Team = { id: string; name: string; members: string[]; demo?: boolean };

/** קבוצה של אנשים עם עניין משותף, שכל אחד יכול לפתוח */
export type Group = { name: string; about: string; created_at: string };
