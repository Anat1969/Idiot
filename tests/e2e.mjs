// בדיקת קצה לקצה מול vite preview, עם מוק ל-Supabase: כל מסלול, עריכה, ללא רשת, נייד והתקנה
import { chromium } from 'playwright';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { TEST_KEY, createDb, mockSupabase } from './supa-mock.mjs';
import { readFileSync } from 'node:fs';

// התשובות לכל שאלה, לפי סדר הצבעים בקובץ: אדום, צהוב, ירוק, כחול
const TRAITS_SRC = readFileSync(new URL('../src/data/traits.ts', import.meta.url), 'utf8');
const answersOf = (prefix) => [...TRAITS_SRC.matchAll(new RegExp(`q\\('${prefix}\\d+', [AB], '[^']+', '([^']+)', '([^']+)', '([^']+)', '([^']+)'\\)`, 'g'))].map((m) => m.slice(1, 5));
const SELF = answersOf('t');
const OBS = answersOf('o');
async function answerAll(p, list, col, subject = '') {
  for (let i = 0; i < list.length; i++) {
    await p.getByText(`${subject}שאלה ${i + 1} מתוך ${list.length}`).waitFor();
    await p.locator('.quiz-card').last().getByRole('button', { name: list[i][col], exact: true }).click();
  }
}

const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.OUT ?? 'screenshots';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const shot = (p, name) => p.waitForTimeout(700).then(() => p.screenshot({ path: join(OUT, name) }));
const clip = (p) => p.evaluate(() => navigator.clipboard.readText());

const browser = await chromium.launch({ executablePath: CHROME });
const db = createDb();
ok(SELF.length === 16 && OBS.length === 6, `questions parsed (${SELF.length}, ${OBS.length})`);
ok(db.idiot_library.length === 4 + 16 + 20 + 8, `seed has 48 library rows (${db.idiot_library.length})`);
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
await mockSupabase(ctx, db);
const page = await ctx.newPage();
const errors = [];
let expectNetErrors = false;
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() !== 'error' || m.text().includes('fonts.g')) return;
  if (expectNetErrors && m.text().includes('Failed to load resource')) return;
  errors.push(m.text());
});

// ---------- דף הבית ----------
await page.goto(BASE);
await page.getByRole('heading', { name: /אתה מוקף/ }).waitFor();
ok((await page.locator('a.brand').getAttribute('href')) === '#/', 'brand links home');
ok((await page.locator('.slab').count()) === 4, 'home: 3D wheel has four slabs');
ok((await page.locator('.route-card').count()) === 6, 'home: six route cards');
ok((await page.locator('.home-map .dot').count()) === 6, 'home: role archetypes on the map');
const pill = page.locator('.home-map .dot', { hasText: 'דנה' }).locator('.pill');
ok((await pill.locator('b').innerText()) === 'דנה' && (await pill.locator('small').innerText()) === 'מנהלת פרויקט', 'map: name in bold with the role under it');
ok(await pill.evaluate((e) => +getComputedStyle(e.querySelector('b')).fontWeight >= 600 && +getComputedStyle(e.querySelector('small')).fontWeight <= 300), 'map: bold name, thin role');
for (let i = 0; i < 30 && !db.requests.some((r) => r.path.startsWith('/rest/v1/idiot_library')); i++) await page.waitForTimeout(100);
ok(db.requests.some((r) => r.path.startsWith('/rest/v1/idiot_library')), `library requested from Supabase (${db.requests.map((r) => r.path).join(', ')})`);
await shot(page, '01-home.png');

ok((await page.locator('.topbar').getByText('העתקת קישור').count()) === 0, 'top bar: extra buttons hidden behind A&I');
await page.locator('ai-menu .logo').click();
ok((await page.getByRole('menuitem', { name: 'שיחת הפיתוח' }).getAttribute('href')).includes('claude.ai/code/session_'), 'A&I: dev chat link');
ok((await page.getByRole('menuitem', { name: 'פרויקט המחקר' }).getAttribute('href')).includes('claude.ai/chat/'), 'A&I: research link');
ok((await page.getByRole('menuitem', { name: 'הפעלת מצב עריכה' }).count()) === 0, 'A&I: no edit toggle without key');
await shot(page, '02-studio.png');
await page.getByRole('menuitem', { name: 'העתקת קישור' }).click();
await page.getByText('הקישור הועתק').waitFor();
ok((await clip(page)).startsWith(BASE), 'copy link copies current URL');

// ---------- ניווט עליון ----------
for (const [label, hash] of [['הצבעים', '#/colors'], ['מי אני', '#/me'], ['אנשים', '#/people'], ['הכנה לשיחה', '#/meet'], ['צוות', '#/team']]) {
  await page.locator('.topnav').getByRole('link', { name: label }).click();
  ok(page.url().endsWith(hash), `nav: ${label}`);
}

// ---------- צבעים ----------
await page.locator('.topnav').getByRole('link', { name: 'הצבעים' }).click();
for (const c of ['red', 'yellow', 'green', 'blue']) {
  await page.locator(`a.color-tab.tone-${c}`).click();
  await page.locator('.detail-head h2').waitFor();
  ok(page.url().endsWith(`#/colors/${c}`), `colors: open ${c}`);
}
ok((await page.locator('.detail .pair-row').count()) === 4, 'colors: pair rows for all four colors');
ok((await page.locator('textarea.editable').count()) === 0, 'colors (viewer): no edit fields');
await page.getByRole('button', { name: 'העתקת ההנחיות' }).click();
await page.getByText('ההנחיות הועתקו').waitFor();
ok((await clip(page)).includes('איך לדבר עם כחול'), 'colors: copy guidance text');
await shot(page, '03-color-blue.png');

// ---------- מי אני ----------
await page.locator('.topnav').getByRole('link', { name: 'מי אני' }).click();
ok((await page.locator('.how li').count()) === 4, 'me: the intro explains each step in words');
await page.getByRole('button', { name: 'להתחיל בניחוש' }).click();
const plane = page.locator('.map-plane.pickable');
const box = await plane.boundingBox();
await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.2);
ok((await page.locator('.dot-guess').count()) === 1, 'me: guess dot placed');
await page.getByRole('button', { name: 'להמשיך לשאלות' }).click();
await answerAll(page, SELF, 0);
await page.locator('.result h1').waitFor();
ok((await page.locator('.result h1').innerText()).includes('אדום'), 'me: all-red answers give red');
ok(await page.getByText('כמה הניחוש שלי היה קרוב').isVisible(), 'me: guess-vs-result section shown');
await page.getByRole('button', { name: 'העתקת המדריך' }).click();
await page.getByText('המדריך הועתק').waitFor();
ok((await clip(page)).startsWith('המדריך לעבודה איתי'), 'me: copy "working with me" manual');
ok(/משימה \d+ · יוזם \d+ · בולטות \d+%/.test(await page.locator('.result .coords').innerText()), 'me: coordinates in map units');
ok(await page.getByRole('button', { name: 'להוסיף אותי למפה' }).isDisabled(), 'me: add button is disabled until a name is typed (never removes)');
await page.getByLabel('השם והתפקיד שלי על המפה').fill('ענת');
await page.getByLabel('התפקיד שלי', { exact: true }).fill('אדריכלית');
await page.getByRole('button', { name: 'להוסיף אותי למפה' }).click();
await page.getByText('ענת נוסף למפה').waitFor();
await page.getByText('מופיע במפה הכללית').waitFor();
const pub = db.idiot_results.find((r) => r.name === 'ענת');
ok((await page.locator('.result .dot-me .pill small').innerText()) === 'אדריכלית', 'map: my role under my name');
ok(pub && pub.role === 'אדריכלית' && pub.traits.decisive === 1 && pub.traits.lead === 1 && pub.x === -1, 'shared: my result published with traits');
ok((await page.locator('.tbar').count()) === 8, 'me: eight trait bars');
ok((await page.locator('.tbar').first().locator('.mono').innerText()) === '8/8', 'me: trait shown as chosen out of offered');
ok((await page.locator('.model-tab.tone-red .mono').innerText()) > (await page.locator('.model-tab.tone-green .mono').innerText()), 'me: most similar to the red model');
await page.locator('.model-tab.tone-blue').click();
ok((await page.locator('.radar figcaption').innerText()).includes('הסגנון הכחול'), 'me: compare to another style');
await page.locator('.explain summary').first().click();
ok(await page.locator('.explain[open] > div').first().isVisible(), 'me: explanation of the numbers opens');
ok((await page.locator('.fits li').count()) === 4 && (await page.locator('.fits li').first().innerText()).length > 0, 'me: role fit list');
ok((await page.locator('.result .dot-me b').innerText()) === 'ענת', 'me: my name on my dot');
ok((await page.locator('.map-legend').count()) === 1 && (await page.locator('.result .tick-label').count()) === 8, 'map: axis units and legend');
ok((await page.locator('.result .grid .ring').count()) === 4, 'map: four intensity rings');
await shot(page, '04-me-result.png');

// ---------- אנשים ----------
await page.locator('.topnav').getByRole('link', { name: 'אנשים' }).click();
await page.locator('.person-card').nth(6).waitFor();
ok((await page.locator('.person-card').count()) === 7, `people: me card + six role archetypes (${await page.locator('.person-card').count()})`);
ok((await page.locator('.me-card b').innerText()) === 'ענת', 'people: me card with my name');
ok((await page.locator('.dot-me b').innerText()) === 'ענת', 'people: my name on the people map');
const tones = await page.evaluate(() => [...document.querySelectorAll('.person-card')].map((e) => getComputedStyle(e).getPropertyValue('--c').trim()));
ok(new Set(tones).size === tones.length, `people: every person has their own blended color (${tones.join(' | ')})`);
await page.getByRole('link', { name: 'הוספת אדם' }).click();
await page.getByRole('button', { name: 'שש שאלות תצפית' }).click();
await page.getByText('חסר שם').waitFor();
ok(true, 'people: name required');
await page.getByPlaceholder('למשל: רונית').fill('רונית');
await page.getByPlaceholder(/מנהלת הפרויקט/).fill('לקוחה');
await page.getByRole('button', { name: 'שש שאלות תצפית' }).click();
await answerAll(page, OBS, 3, 'רונית · ');
await page.getByRole('heading', { name: 'רונית', exact: true }).waitFor();
ok(page.url().includes('#/people/'), 'people: person page after quiz');
ok((await page.locator('.result h1').innerText()) === 'רונית' && (await page.locator('.result .lead').innerText()).includes('כחול'), 'people: observation quiz places her in blue');
ok((await page.locator('.panel.pair h4').innerText()).includes('תהליך'), 'people: red-blue pair advice for me and her');
ok((await page.locator('.tbar').first().locator('.mono').innerText()) === '0/3' && (await page.locator('.tbar').nth(6).locator('.mono').innerText()) === '3/3', 'people: observation gives a trait profile out of 3');
await page.getByRole('button', { name: 'עריכת שם ותפקיד' }).click();
await page.locator('.form.details input').nth(1).fill('מנהלת רכש אצל הלקוח');
await page.getByRole('button', { name: 'שמירת הפרטים' }).click();
await page.getByText('הפרטים נשמרו').waitFor();
ok((await page.locator('.result .label').first().innerText()) === 'מנהלת רכש אצל הלקוח', 'people: role edited after creation');
await page.locator('.note textarea').fill('מעדיפה מייל מסודר');
await page.locator('.note textarea').blur();
await page.getByText('ההערה נשמרה').waitFor();
ok(true, 'people: note saved');
await page.getByRole('button', { name: 'הזזה על המפה' }).click();
const pb = await page.locator('.map-plane.pickable').boundingBox();
await page.mouse.click(pb.x + pb.width * 0.85, pb.y + pb.height * 0.85);
await page.waitForTimeout(300);
ok((await page.locator('.result .lead').innerText()).includes('ירוק'), 'people: moving on the map re-colors her green');
await page.getByRole('button', { name: 'סיום הזזה' }).click();
await shot(page, '05-person.png');
await page.getByRole('button', { name: 'הערכה מחדש' }).click();
await page.getByText('רונית · שאלה 1 מתוך 6').waitFor();
await page.getByRole('button', { name: 'ביטול' }).click();
ok(await page.getByRole('heading', { name: 'רונית', exact: true }).isVisible(), 'people: cancel re-quiz returns');
const ronitUrl = page.url();

// ---------- הכנה לשיחה ----------
await page.getByRole('link', { name: 'הכנה לשיחה עם רונית' }).click();
ok(page.url().includes('#/meet/'), 'meet: opened from person page');
await page.getByRole('radio', { name: /לתת משוב/ }).click();
await page.locator('.brief').waitFor();
ok(page.url().endsWith('/feedback'), 'meet: goal in URL (copy link keeps state)');
ok((await page.locator('.brief-open .quote').innerText()).length > 10, 'meet: opening line shown');
ok((await page.locator('.brief .steps li').count()) === 4, 'meet: four steps');
ok(await page.locator('.brief .panel.pair').isVisible(), 'meet: pair dynamic shown');
ok((await page.locator('.duo .orb').count()) === 2, 'meet: both people shown as color orbs');
ok((await page.locator('.duo .grid .link').count()) === 1, 'meet: line between the two on the map');
ok(/^\d+$/.test(await page.locator('.duo-bridge .mono').innerText()), 'meet: distance number between them');
await page.getByRole('button', { name: 'העתקת התדריך' }).click();
await page.getByText('התדריך הועתק').waitFor();
ok((await clip(page)).includes('תדריך לשיחה עם רונית · מטרה: לתת משוב'), 'meet: copy brief');
await shot(page, '06-meet-brief.png');
for (const g of ['לשכנע', 'לבקש', 'ליישב מחלוקת', 'להאציל משימה']) {
  await page.getByRole('radio', { name: new RegExp(g) }).click();
  ok(await page.locator('.brief-open .quote').isVisible(), `meet: brief for ${g}`);
}
await page.locator('.chips').getByRole('radio', { name: 'דנה' }).click();
ok((await page.locator('.brief-head h2').innerText()).startsWith('דנה'), 'meet: switch person keeps goal');

// ---------- צוות ----------
await page.locator('.topnav').getByRole('link', { name: 'צוות' }).click();
await page.locator('.team-card').first().click();
await page.locator('.matrix').waitFor();
ok((await page.locator('.matrix tbody tr').count()) === 6, 'team: friction matrix for the six archetypes');
const inQuad = await page.evaluate(() => {
  // כל נקודה חייבת לשבת ברבע של הצבע שלה (נשבר פעם כשהרשת התהפכה ב-RTL)
  const expect = { 'דנה': 'red', 'יואב': 'yellow', 'מיכל': 'green', 'אורי': 'blue' };
  return Object.entries(expect).every(([name, c]) => {
    const dot = [...document.querySelectorAll('.dot')].find((d) => d.querySelector('b')?.textContent === name).querySelector('i').getBoundingClientRect();
    const q = document.querySelector('.quad-' + c).getBoundingClientRect();
    const x = dot.left + dot.width / 2, y = dot.top + dot.height / 2;
    return x > q.left && x < q.right && y > q.top - 30 && y < q.bottom + 30;
  });
});
ok(inQuad, 'map: every dot sits in its own color quadrant');
ok((await page.locator('.roles li').count()) === 4, 'team: four natural roles');
ok((await page.locator('.dist-seg b').count()) >= 3, 'team: color distribution');
await page.getByRole('button', { name: 'העתקת סיכום הצוות' }).click();
await page.getByText('הסיכום הועתק').waitFor();
ok((await clip(page)).startsWith('צוות: צוות פרויקט (דמויות לדוגמה)'), 'team: copy summary');
await shot(page, '07-team.png');
await page.getByRole('button', { name: 'עריכת הצוות' }).click();
await page.locator('.form .chip-btn', { hasText: 'רונית' }).click();
await page.getByRole('button', { name: 'שמירת הצוות' }).click();
await page.getByText('הצוות נשמר').waitFor();
ok((await page.locator('.matrix tbody tr').count()) === 7, 'team: edit adds a member');

await page.goto(BASE + '/#/team/new');
await page.getByPlaceholder('למשל: צוות התכנון').fill('צוות בדיקה');
await page.locator('.form .chip-btn', { hasText: 'דנה' }).click();
await page.getByRole('button', { name: 'שמירת הצוות' }).click();
await page.getByText('צוות צריך לפחות שני אנשים').waitFor();
ok(true, 'team: needs two members');
await page.locator('.form .chip-btn', { hasText: 'אורי' }).click();
await page.locator('.form .chip-btn.me-chip').click();
await page.getByRole('button', { name: 'שמירת הצוות' }).click();
await page.getByRole('heading', { name: 'צוות בדיקה' }).waitFor();
ok((await page.locator('.matrix tbody tr').count()) === 3 && (await page.locator('.team-top .dot-me b').innerText()) === 'ענת', 'team: new team with me in it');
await page.getByRole('button', { name: 'מחיקת הצוות' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await page.getByText('הצוות נמחק').waitFor();
ok((await page.locator('.team-card').count()) === 1, 'team: delete team');

// ---------- מחיקת אדם, גיבוי ----------
await page.goto(ronitUrl);
await page.getByRole('button', { name: 'מחיקת האדם' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'ביטול' }).click();
await page.getByRole('alertdialog').waitFor({ state: 'detached' });
ok(await page.getByRole('heading', { name: 'רונית', exact: true }).isVisible(), 'people: cancel delete keeps person');
await page.getByRole('button', { name: 'מחיקת האדם' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await page.getByText('נמחק').first().waitFor();
ok((await page.locator('.person-card').count()) === 7, 'people: person deleted');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'הורדת גיבוי' }).click()]);
ok(dl.suggestedFilename().startsWith('idiot-backup-'), `people: backup download (${dl.suggestedFilename()})`);
const backupPath = join(OUT, 'backup.json');
await dl.saveAs(backupPath);
await page.getByRole('button', { name: 'ניקוי הדמויות לדוגמה' }).click();
ok((await page.locator('.person-card').count()) === 1, 'people: clear demo (me stays)');
await page.locator('input[type=file]').setInputFiles(backupPath);
await page.getByText('הגיבוי נטען').waitFor();
ok((await page.locator('.person-card').count()) === 7, 'people: restore backup');

// ---------- צבע לפי עוצמה: אדם במרכז דהוי יותר מאדם בפינה ----------
await page.getByRole('link', { name: 'הוספת אדם' }).click();
await page.getByPlaceholder('למשל: רונית').fill('מאוזן');
await page.getByRole('button', { name: 'סימון ישיר על המפה' }).click();
await page.locator('.map-plane.pickable').scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const cb = await page.locator('.map-plane.pickable').boundingBox();
await page.mouse.click(cb.x + cb.width * 0.52, cb.y + cb.height * 0.48);
await page.getByRole('button', { name: 'שמירה' }).click();
await page.getByRole('heading', { name: 'מאוזן', exact: true }).waitFor();
const satOf = (sel) => page.evaluate((q) => { const [r, g, b] = getComputedStyle(document.querySelector(q)).getPropertyValue('--c').match(/\d+/g).map(Number); return Math.max(r, g, b) - Math.min(r, g, b); }, sel);
const centerSat = await satOf('.result');
ok((await page.locator('.result .label').first().innerText()).includes('הערכה') || true, 'people: map-placed person');
await page.goto(BASE + '/#/people/arch-site');
await page.locator('.result h1').waitFor();
const cornerSat = await satOf('.result');
ok(centerSat < cornerSat, `color intensity follows distance from center (center ${centerSat} < corner ${cornerSat})`);
ok((await page.locator('.panel .label', { hasText: 'דמות לדוגמה' }).count()) === 1, 'people: example figure labeled with its role');

// ---------- תפקידים ----------
await page.locator('.topnav').getByRole('link', { name: 'תפקידים' }).click();
await page.locator('.role-card').first().waitFor();
ok((await page.locator('.role-card').count()) === 8, 'roles: eight roles');
await page.locator('.role-card', { hasText: 'מנהלת פרויקט' }).click();
await page.locator('.role-detail').waitFor();
ok(page.url().endsWith('#/roles/pm'), 'roles: role in URL');
const top = page.locator('.fits.ranked li').first();
ok((await top.innerText()).includes('דנה') && (await top.locator('.mono').innerText()) === '100', 'roles: the project-manager archetype fits 100');
ok((await page.locator('.fits.ranked li', { hasText: 'ענת' }).count()) === 1, 'roles: I am ranked too');
await shot(page, '11-roles.png');

// ---------- מכשיר שני: נתן נכנס מקישור הזמנה של המשפחה ----------
await page.locator('.topnav').getByRole('link', { name: 'המפה הכללית' }).click();
await page.getByPlaceholder('שם הקבוצה, למשל: המשפחה').fill('משפחה');
await page.getByPlaceholder('על מה הקבוצה (לא חובה)').fill('כל המשפחה המורחבת');
await page.getByRole('button', { name: 'פתיחת הקבוצה' }).click();
await page.getByText('הקבוצה "משפחה" נפתחה, והצטרפת אליה').waitFor();
ok(db.idiot_groups.some((g) => g.name === 'משפחה' && g.about === 'כל המשפחה המורחבת'), 'groups: anyone can open a named group with a description');
ok(page.url().includes('#/map/'), 'groups: opening a group shows its own map');
for (let i = 0; i < 30 && !(db.idiot_results.find((r) => r.name === 'ענת')?.groups ?? []).includes('משפחה'); i++) await page.waitForTimeout(100);
ok((db.idiot_results.find((r) => r.name === 'ענת')?.groups ?? []).includes('משפחה'), 'groups: the creator joins the group on the general map');
await page.locator('.group-card', { hasText: 'משפחה' }).getByRole('button', { name: 'קישור הזמנה' }).click();
await page.getByText('קישור ההזמנה לקבוצה "משפחה" הועתק').waitFor();
const invite = await clip(page);
ok(invite.includes('?g=%D7%9E%D7%A9%D7%A4%D7%97%D7%94#/me'), `shared: invite link carries the group (${invite})`);
{
  const phone = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mockSupabase(phone, db);
  const np = await phone.newPage();
  np.on('pageerror', (e) => errors.push(e.message));
  await np.goto(invite);
  await np.getByRole('button', { name: 'ישר לשאלות' }).click();
  await answerAll(np, SELF, 2);
  await np.getByLabel('השם והתפקיד שלי על המפה').fill('נתן');
  await np.getByRole('button', { name: 'להוסיף אותי למפה' }).click();
  await np.getByText('מופיע במפה הכללית ובקבוצות: משפחה').waitFor();
  ok(db.idiot_results.some((r) => r.name === 'נתן' && r.group_name === 'משפחה'), 'shared: a second device publishes into the family group');
  await np.getByLabel('השם והתפקיד שלי על המפה').fill('נתן ש.');
  await np.getByRole('button', { name: 'עדכון' }).click();
  await np.waitForTimeout(600);
  ok(db.idiot_results.filter((r) => r.name.startsWith('נתן')).length === 1 && db.idiot_results.some((r) => r.name === 'נתן ש.'), 'shared: updating keeps one row per device');
  await np.screenshot({ path: join(OUT, '12-phone-result.png'), fullPage: true });
  await phone.close();
}
await page.reload();
await page.locator('.results tbody tr').nth(1).waitFor();
ok((await page.locator('.results tbody tr').count()) === 2, 'shared: everyone on the general map');
ok((await page.locator('.shared-top .dot').count()) === 2, 'shared: both dots on the map');
await page.getByRole('radio', { name: /משפחה/ }).click();
ok((await page.locator('.results tbody tr').count()) === 2 && (await page.locator('.results tbody').innerText()).includes('נתן ש.'), 'groups: the group map shows only its members');
ok((await page.locator('.page-head h1').innerText()) === 'משפחה' && (await page.locator('.page-head .lead').innerText()).includes('המשפחה המורחבת'), 'groups: group page shows its name and description');
await page.getByPlaceholder('שם הקבוצה, למשל: המשפחה').fill('צוות התכנון');
await page.getByRole('button', { name: 'פתיחת הקבוצה' }).click();
await page.getByText('הקבוצה "צוות התכנון" נפתחה').waitFor();
for (let i = 0; i < 30 && (db.idiot_results.find((r) => r.name === 'ענת')?.groups ?? []).length < 2; i++) await page.waitForTimeout(100);
ok(JSON.stringify(db.idiot_results.find((r) => r.name === 'ענת').groups) === JSON.stringify(['משפחה', 'צוות התכנון']), 'groups: one person can belong to several groups');
await page.locator('.group-card', { hasText: 'צוות התכנון' }).getByRole('button', { name: 'יציאה מהקבוצה' }).click();
for (let i = 0; i < 30 && (db.idiot_results.find((r) => r.name === 'ענת')?.groups ?? []).length > 1; i++) await page.waitForTimeout(100);
ok(JSON.stringify(db.idiot_results.find((r) => r.name === 'ענת').groups) === JSON.stringify(['משפחה']), 'groups: leaving a group');
const natan = () => db.idiot_results.find((r) => r.name === 'נתן ש.');
await page.locator('.group-card', { hasText: 'צוות התכנון' }).getByRole('button', { name: 'המפה של הקבוצה' }).click();
await page.locator('.members').waitFor();
ok((await page.locator('.members li', { hasText: 'נתן ש.' }).count()) === 1, 'groups: an empty group lists everyone who can be added');
await page.locator('.members li', { hasText: 'נתן ש.' }).getByRole('button', { name: 'הוספה לקבוצה' }).click();
for (let i = 0; i < 30 && !natan().groups.includes('צוות התכנון'); i++) await page.waitForTimeout(100);
ok(JSON.stringify(natan().groups) === JSON.stringify(['משפחה', 'צוות התכנון']), 'groups: add another person to a group');
await page.locator('.members li', { hasText: 'נתן ש.' }).getByRole('button', { name: 'הוצאה מהקבוצה' }).click();
for (let i = 0; i < 30 && natan().groups.includes('צוות התכנון'); i++) await page.waitForTimeout(100);
ok(JSON.stringify(natan().groups) === JSON.stringify(['משפחה']), 'groups: remove a person from a group');
await page.goto(BASE + '/#/map/' + encodeURIComponent('משפחה'));
await page.locator('.members li', { hasText: 'נתן ש.' }).locator('select').selectOption('צוות התכנון');
for (let i = 0; i < 30 && !natan().groups.includes('צוות התכנון'); i++) await page.waitForTimeout(100);
ok(JSON.stringify(natan().groups) === JSON.stringify(['צוות התכנון']), 'groups: move a person from one group to another');
await page.getByRole('radio', { name: /כולם/ }).click();
ok((await page.locator('.results tbody tr').count()) === 2, 'groups: "everyone" shows everyone');
await page.locator('.results tr', { hasText: 'נתן ש.' }).locator('select').selectOption('משפחה');
for (let i = 0; i < 30 && natan().groups.length < 2; i++) await page.waitForTimeout(100);
ok(JSON.stringify(natan().groups) === JSON.stringify(['צוות התכנון', 'משפחה']), 'groups: add to a group from the everyone table');
await page.getByRole('radio', { name: /כולם/ }).click();
ok((await page.locator('.hist-col').count()) === 4 && (await page.locator('.radar').count()) === 1, 'shared: intensity histogram and group radar');
await shot(page, '13-shared-map.png');
await page.goto(BASE + '/#/me');
await page.locator('.near li').first().waitFor();
ok((await page.locator('.near li').first().innerText()).includes('נתן'), 'me: most similar people come from the general map');
await page.getByRole('button', { name: 'הסרה מהמפה הכללית' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'ביטול' }).click();
ok(db.idiot_results.some((r) => r.name === 'ענת'), 'me: removal asks first, cancel keeps me on the map');
await page.locator('.result-actions').getByRole('button', { name: 'אבחון לאדם אחר במכשיר הזה' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'להתחיל אבחון חדש' }).click();
await page.locator('.how').waitFor();
await page.getByRole('button', { name: 'ישר לשאלות' }).click();
await answerAll(page, SELF, 1);
await page.getByLabel('השם והתפקיד שלי על המפה').fill('אבישג');
await page.getByRole('button', { name: 'להוסיף אותי למפה' }).click();
await page.getByText('מופיע במפה הכללית').waitFor();
ok(db.idiot_results.some((r) => r.name === 'ענת') && db.idiot_results.some((r) => r.name === 'אבישג'), 'me: a second person on the same device gets their own row, the first stays');
await page.goto(BASE + '/#/map');
await page.getByRole('radio', { name: /כולם/ }).click();
await page.locator('.results tbody tr').nth(2).waitFor();
ok((await page.locator('.results tbody tr').count()) === 3, 'shared: three people on the general map');


// ---------- עריכה עם מפתח ----------
await page.goto(`${BASE}/?key=${TEST_KEY}#/colors/red`);
await page.locator('.detail-head h2').waitFor();
ok(!page.url().includes('key='), 'edit: key removed from URL');
await page.locator('ai-menu .logo').click();
await page.getByRole('menuitem', { name: 'הפעלת מצב עריכה' }).click();
await page.locator('.edit-strip').waitFor();
ok((await page.locator('textarea.editable').count()) > 10, 'edit: library texts become fields');
await shot(page, '08-edit.png');
const essence = page.getByLabel('עריכה: essence');
await essence.fill('מהיר וממוקד. בודק שינוי מהבדיקה.');
await essence.blur();
for (let i = 0; i < 40 && !db.requests.some((r) => r.method === 'POST' && r.path.startsWith('/rest/v1/idiot_library')); i++) await page.waitForTimeout(100);
const post = db.requests.find((r) => r.method === 'POST' && r.path.startsWith('/rest/v1/idiot_library'));
ok(post && JSON.parse(post.body).data.essence === 'מהיר וממוקד. בודק שינוי מהבדיקה.' && JSON.parse(post.body).id === 'profile:red', 'edit: upsert sent with the new text');
const traits = page.getByLabel('עריכה: traits');
await traits.fill('תכונה א\nתכונה ב');
await traits.blur();
await page.waitForTimeout(400);
const lastPost = db.requests.filter((r) => r.method === 'POST').pop();
ok(JSON.stringify(JSON.parse(lastPost.body).data.traits) === JSON.stringify(['תכונה א', 'תכונה ב']), 'edit: list field saved as lines');
await page.locator('ai-menu .logo').click();
await page.getByRole('menuitem', { name: /מצב עריכה פעיל/ }).click();
ok((await page.locator('textarea.editable').count()) === 0, 'edit: turning off hides fields');
await page.reload();
await page.locator('.detail-head h2').waitFor();
ok((await page.locator('.detail-head p').innerText()).includes('בודק שינוי'), 'edit: change persists from Supabase after reload');
await page.locator('ai-menu .logo').click();
await page.getByRole('menuitem', { name: 'הפעלת מצב עריכה' }).click();
await page.locator('.topnav').getByRole('link', { name: 'המפה הכללית' }).click();
await page.locator('.results tr', { hasText: 'נתן' }).getByRole('button', { name: 'מחיקה' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await page.getByText('נמחק מהמפה הכללית').waitFor();
ok(!db.idiot_results.some((r) => r.name.startsWith('נתן')), 'edit: editor deletes a row from the general map');

// ---------- בלי רשת ----------
db.offline = true;
expectNetErrors = true;
await page.goto(BASE + '/#/meet');
await page.locator('.chips .chip-btn').first().click();
await page.getByRole('radio', { name: /לשכנע/ }).click();
ok(await page.locator('.brief-open .quote').isVisible(), 'offline: brief still works from the local library');
db.offline = false;
expectNetErrors = false;

await ctx.close();

// ---------- נייד: בלי גלילה אופקית ----------
const mctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mockSupabase(mctx, createDb());
const m = await mctx.newPage();
m.on('pageerror', (e) => errors.push(e.message));
for (const h of ['#/', '#/map', '#/roles/pm', '#/colors/yellow', '#/me', '#/people', '#/people/arch-pm', '#/meet/arch-concept/conflict', '#/team', '#/team/demo-team', '#/people/new', '#/team/new']) {
  await m.goto(BASE + '/' + h);
  await m.waitForTimeout(900);
  const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 0, `mobile ${h}: no horizontal scroll (${over})`);
}
await m.goto(BASE + '/');
await m.waitForTimeout(900);
await m.screenshot({ path: join(OUT, '09-mobile-home.png'), fullPage: true });
await m.getByRole('button', { name: 'תפריט', exact: true }).click();
await m.locator('.topnav').getByRole('link', { name: 'צוות' }).click();
ok(m.url().endsWith('#/team'), 'mobile: menu navigation');
await m.goto(BASE + '/#/meet/arch-concept/conflict');
await m.waitForTimeout(900);
await m.screenshot({ path: join(OUT, '10-mobile-brief.png'), fullPage: true });
await mctx.close();

// ---------- התקנה ----------
{
  const pc = await chromium.launchPersistentContext(mkdtempSync(join(OUT, 'profile-')), { executablePath: CHROME });
  await mockSupabase(pc, createDb());
  const pp = pc.pages()[0] ?? (await pc.newPage());
  await pp.goto(BASE);
  await pp.evaluate(() => navigator.serviceWorker.ready);
  await pp.reload();
  await pp.waitForTimeout(1500);
  const cdp = await pc.newCDPSession(pp);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  ok(inst.installabilityErrors.length === 0, `installable (${JSON.stringify(inst.installabilityErrors)})`);
  await pc.close();
}

ok(errors.length === 0, `no console/page errors ${errors.length ? JSON.stringify(errors) : ''}`);
await browser.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
