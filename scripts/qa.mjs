import fs from 'node:fs';
import { connectCDP, sleep } from './cdp-util.mjs';

const c = await connectCDP(9228);
c.on('Runtime.exceptionThrown', p => console.log('[exception]', p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
c.on('Log.entryAdded', p => { if (p.entry.level === 'error') console.log('[log]', p.entry.text); });
await c.send('Runtime.enable');
await c.send('Page.enable');
await c.send('Log.enable');
await c.goto('http://127.0.0.1:4174/build.html?qa=1', 1000);
await c.waitFor('window.__VILLA_READY__ === true', 180000);
const data = await c.evaluate(`({
  validation: window.__VILLA__.validation,
  manifest: window.__VILLA__.manifest,
  stats: window.__VILLA__.stats
})`);
fs.writeFileSync('qa-report.json', JSON.stringify(data, null, 2));
console.log('validation summary', data.validation.summary);
console.log('checks', data.validation.checks);
if (data.validation.failures.length) console.log('FAILURES', JSON.stringify(data.validation.failures, null, 2));
if (data.validation.collisions.length) console.log('COLLISIONS', JSON.stringify(data.validation.collisions, null, 2));
console.log('fixes', JSON.stringify(data.validation.fixes, null, 2));

await c.evaluate(`document.getElementById('hud').style.display='none'; document.getElementById('badge').style.display='none'; true`);
const shots = [
  { name: 'hero', floor: null, camera: [39, 23, 43], look: [0, 5.1, 1.5], fov: 33 },
  { name: 'rear', floor: null, camera: [0, 10.5, -43], look: [0, 5.2, -3], fov: 33 },
  { name: 'aerial', floor: null, camera: [30, 34, 32], look: [0, 3.5, 0], fov: 35 },
  { name: 'floor-0-top', floor: 0, camera: [20, 44, 26], look: [0, .35, 0], fov: 35 },
  { name: 'floor-1-top', floor: 1, camera: [18, 42, 24], look: [0, 4.1, 0], fov: 35 },
  { name: 'floor-2-top', floor: 2, camera: [18, 42, 24], look: [0, 7.7, 0], fov: 35 },
  { name: 'floor-0-angle', floor: 0, camera: [23, 20, 25], look: [0, 1.5, 0], fov: 36 },
  { name: 'floor-1-angle', floor: 1, camera: [23, 22, 25], look: [0, 5.2, 0], fov: 36 },
  { name: 'floor-2-angle', floor: 2, camera: [23, 22, 25], look: [0, 8.5, 0], fov: 36 },
];
fs.mkdirSync('renders', { recursive: true });
for (const s of shots) {
  await c.evaluate(`(() => {
    const v = window.__VILLA__;
    v.setFloor(${s.floor === null ? 'null' : s.floor});
    v.setCamera(${JSON.stringify(s.camera)}, ${JSON.stringify(s.look)}, ${s.fov});
    v.setDayNight(false);
    return true;
  })()`);
  await sleep(700);
  await c.screenshot(`renders/${s.name}.png`);
  console.log('shot', s.name);
}
c.ws.close();
