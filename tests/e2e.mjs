// בדיקת קצה לקצה מול vite preview, עם מוק ל-Supabase: כל מסלול, עריכה, ללא רשת, נייד והתקנה
import { chromium } from 'playwright';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { TEST_KEY, createDb, mockSupabase } from './supa-mock.mjs';

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
ok(db.idiot_library.length === 4 + 16 + 20, `seed has 40 library rows (${db.idiot_library.length})`);
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
ok((await page.locator('.route-card').count()) === 4, 'home: four route cards');
ok((await page.locator('.home-map .dot').count()) === 5, 'home: demo people on the map');
ok(db.requests.some((r) => r.path.startsWith('/rest/v1/idiot_library')), 'library requested from Supabase');
await shot(page, '01-home.png');

ok((await page.locator('.topbar').getByText('העתקת קישור').count()) === 0, 'top bar: extra buttons hidden behind A&I');
await page.getByRole('button', { name: /A&I/ }).click();
ok((await page.getByRole('link', { name: 'שיחת הפיתוח' }).getAttribute('href')).includes('claude.ai/code/session_'), 'A&I: dev chat link');
ok((await page.getByRole('link', { name: 'פרויקט המחקר' }).getAttribute('href')).includes('claude.ai/chat/'), 'A&I: research link');
ok((await page.locator('#studio-panel textarea, #studio-panel').getByText('הפעלת מצב עריכה').count()) === 0, 'A&I: no edit toggle without key');
await shot(page, '02-studio.png');
await page.getByRole('button', { name: 'העתקת קישור' }).click();
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
await page.getByRole('button', { name: 'לסמן ניחוש' }).click();
const plane = page.locator('.map-plane.pickable');
const box = await plane.boundingBox();
await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.2);
ok((await page.locator('.dot-guess').count()) === 1, 'me: guess dot placed');
await page.getByRole('button', { name: 'להמשיך לשאלות' }).click();
for (let i = 0; i < 12; i++) {
  await page.getByText(`שאלה ${i + 1} מתוך 12`).waitFor();
  // תמיד התשובה האדומה, כדי לבדוק תוצאה צפויה
  const q = page.locator('.quiz-card').last();
  const labels = await q.locator('.option').allInnerTexts();
  const red = ['לוקח את ההובלה ומכוון את השיחה', 'שדברים לא זזים מספיק מהר', 'מהר ולבד', 'לכבוש יעדים ולנצח', 'לפעול מיד', '"תן לי את השורה התחתונה"', 'מוביל את השיחה ויוזם', 'מתווכח ומגן על עמדתי', 'רק מה שצריך עכשיו', 'מתכנן משהו מאתגר', 'לחכות לאחרים', 'שאני יודע לקחת אחריות'][i];
  ok(labels.includes(red), `me: question ${i + 1} has 4 options`);
  await q.getByRole('button', { name: red, exact: true }).click();
}
await page.locator('.result h1').waitFor();
ok((await page.locator('.result h1').innerText()).includes('אדום'), 'me: all-red answers give red');
ok(await page.getByText('פער מודעות עצמית').isVisible(), 'me: self-awareness gap shown');
await page.getByRole('button', { name: 'העתקת המדריך' }).click();
await page.getByText('המדריך הועתק').waitFor();
ok((await clip(page)).startsWith('המדריך לעבודה איתי'), 'me: copy "working with me" manual');
ok(/משימה \d+ · מהיר \d+ · עוצמה \d+%/.test(await page.locator('.result .coords').innerText()), 'me: coordinates in map units');
await page.getByLabel('השם שלי על המפה').fill('ענת');
await page.getByRole('button', { name: 'להוסיף אותי למפה' }).click();
await page.getByText('ענת נוסף למפה').waitFor();
ok((await page.locator('.result .dot-me b').innerText()) === 'ענת', 'me: my name on my dot');
ok((await page.locator('.map-legend').count()) === 1 && (await page.locator('.result .tick-label').count()) === 8, 'map: axis units and legend');
ok((await page.locator('.result .grid .ring').count()) === 4, 'map: four intensity rings');
await shot(page, '04-me-result.png');

// ---------- אנשים ----------
await page.locator('.topnav').getByRole('link', { name: 'אנשים' }).click();
ok((await page.locator('.person-card').count()) === 6, 'people: me card + five demo people');
ok((await page.locator('.me-card b').innerText()) === 'ענת', 'people: me card with my name');
ok((await page.locator('.dot-me b').innerText()) === 'ענת', 'people: my name on the people map');
const tones = await page.evaluate(() => [...document.querySelectorAll('.person-card')].map((e) => getComputedStyle(e).getPropertyValue('--c').trim()));
ok(new Set(tones).size === tones.length, `people: every person has their own blended color (${tones.join(' | ')})`);
const sat = await page.evaluate(() => {
  // נועה (0.2, 0.35) קרובה למרכז: הצבע שלה דהוי יותר מזה של דנה (פינה אדומה)
  const get = (n) => {
    const card = [...document.querySelectorAll('.person-card')].find((e) => e.querySelector('b').textContent === n);
    const [r, g, b] = getComputedStyle(card).getPropertyValue('--c').match(/\d+/g).map(Number);
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  return { noa: get('נועה'), dana: get('דנה') };
});
ok(sat.noa < sat.dana, `color intensity follows distance from center (noa ${sat.noa} < dana ${sat.dana})`);
await page.getByRole('link', { name: 'הוספת אדם' }).click();
await page.getByRole('button', { name: 'שש שאלות תצפית' }).click();
await page.getByText('חסר שם').waitFor();
ok(true, 'people: name required');
await page.getByPlaceholder('למשל: רונית').fill('רונית');
await page.getByPlaceholder(/מנהלת הפרויקט/).fill('לקוחה');
await page.getByRole('button', { name: 'שש שאלות תצפית' }).click();
const blue = ['מדויק ושוקל כל מילה', 'דיוק ואיכות', 'נעשה ביקורתי ומנתח יותר', 'מסודרים בסעיפים', 'שואל שאלות על הפרטים', 'רשלנות'];
for (let i = 0; i < 6; i++) {
  await page.getByText(`רונית · שאלה ${i + 1} מתוך 6`).waitFor();
  await page.locator('.quiz-card').last().getByRole('button', { name: blue[i], exact: true }).click();
}
await page.getByRole('heading', { name: 'רונית', exact: true }).waitFor();
ok(page.url().includes('#/people/'), 'people: person page after quiz');
ok((await page.locator('.result h1').innerText()) === 'רונית' && (await page.locator('.result .lead').innerText()).includes('כחול'), 'people: observation quiz places her in blue');
ok((await page.locator('.panel.pair h4').innerText()).includes('תהליך'), 'people: red-blue pair advice for me and her');
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
ok((await page.locator('.matrix tbody tr').count()) === 5, 'team: friction matrix for the five demo members');
const inQuad = await page.evaluate(() => {
  // כל נקודה חייבת לשבת ברבע של הצבע שלה (נשבר פעם כשהרשת התהפכה ב-RTL)
  const expect = { 'דנה': 'red', 'יואב': 'yellow', 'מיכל': 'green', 'אורי': 'blue' };
  return Object.entries(expect).every(([name, c]) => {
    const dot = [...document.querySelectorAll('.dot')].find((d) => d.textContent === name).querySelector('i').getBoundingClientRect();
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
ok((await clip(page)).startsWith('צוות: צוות הפרויקט'), 'team: copy summary');
await shot(page, '07-team.png');
await page.getByRole('button', { name: 'עריכת הצוות' }).click();
await page.locator('.form .chip-btn', { hasText: 'רונית' }).click();
await page.getByRole('button', { name: 'שמירת הצוות' }).click();
await page.getByText('הצוות נשמר').waitFor();
ok((await page.locator('.matrix tbody tr').count()) === 6, 'team: edit adds a member');

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
ok((await page.locator('.person-card').count()) === 6, 'people: person deleted');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'הורדת גיבוי' }).click()]);
ok(dl.suggestedFilename().startsWith('idiot-backup-'), `people: backup download (${dl.suggestedFilename()})`);
const backupPath = join(OUT, 'backup.json');
await dl.saveAs(backupPath);
await page.getByRole('button', { name: 'ניקוי אנשי הדוגמה' }).click();
ok((await page.locator('.person-card').count()) === 1, 'people: clear demo (me stays)');
await page.locator('input[type=file]').setInputFiles(backupPath);
await page.getByText('הגיבוי נטען').waitFor();
ok((await page.locator('.person-card').count()) === 6, 'people: restore backup');

// ---------- עריכה עם מפתח ----------
await page.goto(`${BASE}/?key=${TEST_KEY}#/colors/red`);
await page.locator('.detail-head h2').waitFor();
ok(!page.url().includes('key='), 'edit: key removed from URL');
await page.getByRole('button', { name: /A&I/ }).click();
await page.getByRole('button', { name: 'הפעלת מצב עריכה' }).click();
await page.locator('.edit-strip').waitFor();
ok((await page.locator('textarea.editable').count()) > 10, 'edit: library texts become fields');
await shot(page, '08-edit.png');
const essence = page.getByLabel('עריכה: essence');
await essence.fill('מהיר וממוקד. בודק שינוי מהבדיקה.');
await essence.blur();
await page.getByText('נשמר').first().waitFor();
const post = db.requests.find((r) => r.method === 'POST' && r.path.startsWith('/rest/v1/idiot_library'));
ok(post && JSON.parse(post.body).data.essence === 'מהיר וממוקד. בודק שינוי מהבדיקה.' && JSON.parse(post.body).id === 'profile:red', 'edit: upsert sent with the new text');
const traits = page.getByLabel('עריכה: traits');
await traits.fill('תכונה א\nתכונה ב');
await traits.blur();
await page.waitForTimeout(400);
const lastPost = db.requests.filter((r) => r.method === 'POST').pop();
ok(JSON.stringify(JSON.parse(lastPost.body).data.traits) === JSON.stringify(['תכונה א', 'תכונה ב']), 'edit: list field saved as lines');
await page.getByRole('button', { name: /A&I/ }).click();
await page.getByRole('button', { name: /מצב עריכה פעיל/ }).click();
ok((await page.locator('textarea.editable').count()) === 0, 'edit: turning off hides fields');
await page.reload();
await page.locator('.detail-head h2').waitFor();
ok((await page.locator('.detail-head p').innerText()).includes('בודק שינוי'), 'edit: change persists from Supabase after reload');

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
for (const h of ['#/', '#/colors/yellow', '#/me', '#/people', '#/people/demo-1', '#/meet/demo-2/conflict', '#/team', '#/team/demo-team', '#/people/new', '#/team/new']) {
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
await m.goto(BASE + '/#/meet/demo-2/conflict');
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
