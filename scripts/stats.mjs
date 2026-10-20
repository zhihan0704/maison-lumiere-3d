import { connectCDP } from './cdp-util.mjs';
const c = await connectCDP(9228);
c.on('Runtime.exceptionThrown', p => console.log('[exception]', p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
await c.send('Runtime.enable'); await c.send('Page.enable');
await c.goto('http://127.0.0.1:4174/build.html?stats=1', 1000);
await c.waitFor('window.__VILLA_READY__ === true || window.__VILLA_ERROR__', 240000);
const out = await c.evaluate(`({err: window.__VILLA_ERROR__||null, stats: window.__VILLA__?.stats, validation: window.__VILLA__?.validation?.summary})`);
console.log(JSON.stringify(out, null, 2));
c.ws.close();
