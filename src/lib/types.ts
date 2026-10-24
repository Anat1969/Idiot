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
export type Question = { id: string; text: string; options: { label: string; color: Color }[] };

export type Library = {
  profiles: Record<Color, Profile>;
  pairs: Record<string, Pair>;
  goals: Record<string, GoalAdvice>;
};

/** מיקום על המפה: x משימה (-1) עד אנשים (1), y מתון (-1) עד מהיר (1) */
export type Point = { x: number; y: number };

export type Reading = Point & {
  /** חלק כל צבע בתשובות, מ-0 עד 1 */
  mix: Record<Color, number>;
  at: number;
  /** הניחוש שלי לפני השאלון, כשהיה */
  guess?: Point;
};

export type Person = Point & {
  id: string;
  name: string;
  role: string;
  note: string;
  demo?: boolean;
  at: number;
};

export type Team = { id: string; name: string; members: string[]; demo?: boolean };
