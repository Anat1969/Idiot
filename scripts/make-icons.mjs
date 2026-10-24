// מייצר את אייקוני האפליקציה: ארבעה רבעים מרחפים בפרספקטיבה, בלי טקסט
import { chromium } from 'playwright';

const html = (size, pad) => {
  const s = size * (0.56 - pad);
  const q = (c1, c2, r, tx, ty, z) => `<div style="position:absolute;width:${s / 2 - size * 0.012}px;height:${s / 2 - size * 0.012}px;
    left:${tx}px;top:${ty}px;border-radius:${r};transform:translateZ(${z}px);
    background:linear-gradient(150deg,${c1},${c2});box-shadow:0 ${size * 0.03}px ${size * 0.06}px rgba(0,0,0,.45)"></div>`;
  const half = s / 2 + size * 0.012;
  const R = `${s / 2}px`;
  return `<!doctype html><html><body style="margin:0">
<div style="width:${size}px;height:${size}px;display:grid;place-items:center;
  background:radial-gradient(90% 90% at 30% 20%,#3a3c42,#141518);perspective:${size * 2.4}px;overflow:hidden">
  <div style="position:relative;width:${s}px;height:${s}px;transform-style:preserve-3d;transform:rotateX(38deg) rotateZ(-8deg)">
    ${q('#ff7a7e', '#b8262b', `${R} 0 0 0`, 0, 0, size * 0.05)}
    ${q('#ffd75a', '#c98f00', `0 ${R} 0 0`, half, 0, size * 0.02)}
    ${q('#5fd39a', '#1c7a4c', `0 0 ${R} 0`, half, half, size * 0.035)}
    ${q('#7aa7f2', '#2350a8', `0 0 0 ${R}`, 0, half, size * 0.01)}
    <div style="position:absolute;width:${size * 0.1}px;height:${size * 0.1}px;left:${s * 0.62}px;top:${s * 0.3}px;border-radius:50%;
      transform:translateZ(${size * 0.16}px);background:radial-gradient(circle at 35% 30%,#fff,#cfccc6);box-shadow:0 ${size * 0.05}px ${size * 0.05}px rgba(0,0,0,.5)"></div>
  </div>
</div></body></html>`;
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
for (const [size, name, pad] of [[192, 'icon-192.png', 0], [512, 'icon-512.png', 0], [512, 'icon-512-maskable.png', 0.1]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html(size, pad));
  await page.screenshot({ path: `public/icons/${name}` });
}
await browser.close();
console.log('icons done');
