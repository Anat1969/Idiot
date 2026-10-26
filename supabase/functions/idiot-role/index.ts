// מוקף: מומחה התאמת תפקידים. מקבל שם תפקיד (ותיאור לא חובה), ומחזיר אילו מתוך שמונה התכונות
// התפקיד צריך, באיזו חשיבות ולמה. שומר את התפקיד בטבלה idiot_roles (source = 'ai').
// ארבע שכבות: Claude (ANTHROPIC_API_KEY), Gemini (GEMINI_API_KEY, המפתח החינמי), מודל שפה דרך fal (FAL_API_KEY), ומאגר ידע מקומי (knowledge.ts).
// ניתוח מהמאגר נשמר כ-source = 'auto', ומנותח מחדש על ידי המומחה בפעם הבאה שמבקשים את התפקיד והמומחה זמין.
// פתוח לכל מבקר, עד HOURLY_LIMIT תפקידים בשעה.
import Anthropic from "npm:@anthropic-ai/sdk";
import { analyzeLocally } from "./knowledge.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const HOURLY_LIMIT = 30;

const TRAITS = [
  { key: "decisive", label: "החלטיות", text: "להכריע ולהתקדם גם כשהתמונה לא מלאה" },
  { key: "lead", label: "הובלה", text: "לקחת אחריות ולהזיז דברים תקועים" },
  { key: "inspire", label: "השראה", text: "להדליק אחרים ולחשוב בגדול" },
  { key: "connect", label: "יצירת קשרים", text: "לחבר בין אנשים ולגייס עזרה" },
  { key: "listen", label: "הקשבה", text: "להבין מה חשוב לאחר ולתת לו מקום" },
  { key: "steady", label: "עקביות", text: "להחזיק קצב קבוע ולשמור על יציבות" },
  { key: "thorough", label: "יסודיות", text: "לבדוק לעומק ולדייק" },
  { key: "plan", label: "תכנון", text: "לבנות סדר, מבנה ולוח זמנים" },
];
const LEVELS: Record<string, number> = { none: 0, helps: 0.4, important: 0.7, essential: 1 };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "why", "traits"],
  properties: {
    name: { type: "string" },
    why: { type: "string" },
    traits: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "level", "reason"],
        properties: {
          key: { type: "string", enum: TRAITS.map((t) => t.key) },
          level: { type: "string", enum: Object.keys(LEVELS) },
          reason: { type: "string" },
        },
      },
    },
  },
};

const SYSTEM = `את/ה מומחה/ית להתאמה בין תפקידים לתכונות, עם רקע בפסיכולוגיה ארגונית ובמודל DISC.
המשתמש כותב שם של תפקיד (לפעמים עם תיאור). המטרה: לקבוע אילו מתוך שמונה תכונות ההצלחה בתפקיד נשענת עליהן, ובאיזו מידה.

שמונה התכונות:
${TRAITS.map((t) => `- ${t.key} (${t.label}): ${t.text}`).join("\n")}

כללים:
- traits: בדיוק שמונה פריטים, אחד לכל תכונה.
- level: none (לא נדרש), helps (עוזר), important (חשוב), essential (חיוני).
- היו בררנים: תפקיד אמיתי נשען על 2 עד 4 תכונות מרכזיות. לפחות תכונה אחת essential, ולכל היותר שלוש essential. לפחות שלוש תכונות none.
- חשבו על מה שמבדיל הצלחה מכישלון בתפקיד הזה ביום יום, לא על מה שנשמע טוב בכל תפקיד.
- reason: משפט אחד קצר, קונקרטי לתפקיד הזה (מצב אמיתי מהעבודה), למה התכונה ברמה הזו. גם ל-none: למה היא פחות קריטית כאן.
- name: שם התפקיד כפי שנכתב.
- why: משפט אחד: מה עושים בתפקיד ומה נחשב הצלחה בו.
עברית טבעית, קצרה ומקצועית. בלי סימני קריאה ובלי אימוג'י.`;

async function count(path: string): Promise<number> {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { method: "HEAD", headers: { ...SB, Prefer: "count=exact" } });
  return Number((r.headers.get("content-range") ?? "").split("/")[1]) || 0;
}

type Out = { name: string; why: string; traits: { key: string; level: string; reason: string }[] };
class Refusal extends Error {}

function valid(o: unknown): o is Out {
  const x = o as Out;
  return !!x && typeof x.name === "string" && Array.isArray(x.traits) && x.traits.some((t) => t && LEVELS[t.level] > 0);
}

/** 1. Claude ישירות, עם פלט מובנה */
async function viaClaude(brief: string): Promise<Out> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim();
  if (!apiKey) throw new Error("no anthropic key");
  const client = new Anthropic({ apiKey });
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: brief }],
  } as never);
  // deno-lint-ignore no-explicit-any
  const r = response as any;
  if (r.stop_reason === "refusal") throw new Refusal("refusal");
  const text = r.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  const out = JSON.parse(text);
  if (!valid(out)) throw new Error("bad shape");
  return out;
}

function falKey(): string | undefined {
  const direct = Deno.env.get("FAL_API_KEY") ?? Deno.env.get("FAL_KEY");
  if (direct?.trim()) return direct.trim();
  for (const n of Object.keys(Deno.env.toObject())) {
    if (!/fal/i.test(n) || /^SUPABASE_/i.test(n)) continue;
    const v = Deno.env.get(n)?.trim();
    if (v) return v;
  }
  return undefined;
}

/** 2. Gemini (המפתח החינמי של Google AI Studio) */
function geminiKey(): string | undefined {
  for (const n of ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_AI_API_KEY"]) {
    const v = Deno.env.get(n)?.trim();
    if (v) return v;
  }
  for (const n of Object.keys(Deno.env.toObject())) {
    if (!/gemini/i.test(n)) continue;
    const v = Deno.env.get(n)?.trim();
    if (v) return v;
  }
  return undefined;
}

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
async function viaGemini(brief: string): Promise<Out> {
  const key = geminiKey();
  if (!key) {
    const names = Object.keys(Deno.env.toObject()).filter((n) => /gemini|google/i.test(n));
    throw new Error(`no gemini key (names: ${names.join(",") || "none"})`);
  }
  const errs: string[] = [];
  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `${SYSTEM}\n\nהחזר JSON בלבד: אובייקט אחד עם המפתחות name, why, traits (מערך של {key, level, reason}).` }] },
          contents: [{ role: "user", parts: [{ text: brief }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        }),
      });
      const raw = await r.text();
      let text = "";
      try {
        const d = JSON.parse(raw);
        text = (d?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
      } catch { /* לא JSON */ }
      const m = text.match(/\{[\s\S]*\}/);
      if (r.ok && m) {
        const out = JSON.parse(m[0]);
        if (valid(out)) return out;
      }
      errs.push(`${model} ${r.status} ${raw.slice(0, 160)}`);
    } catch (e) {
      errs.push(`${model} ${e}`);
    }
  }
  throw new Error(errs.join(" ; "));
}

/** 3. מודל שפה דרך fal, כשהמפתח של Claude לא זמין */
const FAL_ROUTES: [string, string][] = [
  ["openrouter/router", "anthropic/claude-sonnet-4.5"],
  ["fal-ai/any-llm", "anthropic/claude-sonnet-4.5"],
  ["openrouter/router", "google/gemini-2.5-flash"],
];
async function viaFal(brief: string): Promise<Out> {
  const key = falKey();
  if (!key) throw new Error("no fal key");
  const errs: string[] = [];
  for (const [endpoint, model] of FAL_ROUTES) {
    try {
      const r = await fetch(`https://fal.run/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          system_prompt: `${SYSTEM}\n\nהחזר JSON בלבד: אובייקט אחד עם המפתחות name, why, traits (מערך של {key, level, reason}). בלי טקסט לפני או אחרי.`,
          prompt: brief,
        }),
      });
      const raw = await r.text();
      let text = "";
      try {
        text = String(JSON.parse(raw)?.output ?? "");
      } catch { /* לא JSON */ }
      const m = text.match(/\{[\s\S]*\}/);
      if (r.ok && m) {
        const out = JSON.parse(m[0]);
        if (valid(out)) return out;
      }
      errs.push(`${endpoint}:${model} ${r.status} ${raw.slice(0, 160)}`);
    } catch (e) {
      errs.push(`${endpoint}:${model} ${e}`);
    }
  }
  throw new Error(errs.join(" ; "));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { name?: string; why?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const name = String(body.name ?? "").trim().slice(0, 60);
  const why = String(body.why ?? "").trim().slice(0, 300);
  if (!name) return json({ error: "צריך לכתוב שם של תפקיד." }, 400);

  // תפקיד שכבר נותח על ידי המומחה: מחזירים אותו בלי לנתח שוב
  const existing = await fetch(`${SB_URL}/rest/v1/idiot_roles?select=id,name,why,needs,reasons,source,created_at&name=eq.${encodeURIComponent(name)}&limit=1`, { headers: SB });
  const found = (existing.ok ? await existing.json() : [])[0];
  if (found && found.source !== "auto") return json({ role: found, existing: true });

  if (!found) {
    const since = new Date(Date.now() - 3600_000).toISOString();
    if ((await count(`idiot_roles?select=id&created_at=gte.${since}`)) >= HOURLY_LIMIT) {
      return json({ error: "נוספו הרבה תפקידים בשעה האחרונה. נסו שוב מאוחר יותר." }, 429);
    }
  }

  const brief = `התפקיד: ${name}${why ? `\nתיאור: ${why}` : ""}`;
  let out: Out | null = null;
  let last = "";
  try {
    out = await viaClaude(brief);
  } catch (err) {
    if (err instanceof Refusal) return json({ error: "לא ניתן לנתח את התפקיד הזה. נסו ניסוח אחר." }, 422);
    last = String(err instanceof Error ? err.message : err);
  }
  if (!out) {
    try {
      out = await viaGemini(brief);
    } catch (err) {
      last += ` | ${err instanceof Error ? err.message : err}`;
    }
  }
  if (!out) {
    try {
      out = await viaFal(brief);
    } catch (err) {
      last += ` | ${err instanceof Error ? err.message : err}`;
    }
  }

  let row: Record<string, unknown>;
  if (out) {
    const needs: Record<string, number> = {};
    const reasons: Record<string, string> = {};
    for (const t of TRAITS) {
      const f = out.traits?.find((x) => x.key === t.key);
      const v = LEVELS[f?.level ?? "none"] ?? 0;
      if (v > 0) needs[t.key] = v;
      if (f?.reason) reasons[t.key] = String(f.reason).slice(0, 300);
    }
    if (Object.keys(needs).length < 2) return json({ error: "הניתוח לא הצליח. נסו להוסיף תיאור קצר לתפקיד." }, 422);
    row = { name, why: String(out.why || why).trim().slice(0, 300), needs, reasons, source: "ai" };
  } else {
    // המומחה לא זמין: ניתוח ראשוני מהמאגר
    if (found) return json({ role: found, existing: true, detail: last.slice(0, 900) });
    const labels = Object.fromEntries(TRAITS.map((t) => [t.key, t.label]));
    const local = analyzeLocally(name, why, labels);
    if (!local) {
      return json({ error: "לא זיהיתי את סוג התפקיד מהשם. הוסיפו משפט על מה עושים בו, או סמנו את התכונות בעצמכם.", detail: last.slice(0, 900) }, 422);
    }
    row = { name, why: why || `תפקיד בתחום ${local.topic}`, needs: local.needs, reasons: local.reasons, source: "auto" };
  }

  const ins = found
    ? await fetch(`${SB_URL}/rest/v1/idiot_roles?id=eq.${found.id}`, {
        method: "PATCH",
        headers: { ...SB, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(row),
      })
    : await fetch(`${SB_URL}/rest/v1/idiot_roles`, {
        method: "POST",
        headers: { ...SB, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
  if (!ins.ok) return json({ error: `שמירה נכשלה: ${await ins.text()}` }, 500);
  const [saved] = await ins.json();
  return json({ role: saved, upgraded: !!found });
});
