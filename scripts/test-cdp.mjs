import { connectCDP, sleep } from './cdp-util.mjs';

const c = await connectCDP(9228);
console.log('Connected. Evaluating blank page...');
c.on('Runtime.consoleAPICalled', p => console.log('[console]', p.type, p.args?.map(a => a.value || a.description).join(' ')));
c.on('Runtime.exceptionThrown', p => console.log('[exception]', p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
c.on('Log.entryAdded', p => console.log('[log]', p.entry.level, p.entry.text));
await c.send('Runtime.enable');
await c.send('Page.enable');
await c.send('Log.enable');
await c.goto('http://127.0.0.1:4174/build.html', 1000);
console.log('Navigated.');
for (let i = 0; i < 10; i++) {
  await sleep(2000);
  try {
    const state = await c.evaluate(`({
      ready: !!window.__VILLA_READY__,
      err: window.__VILLA_ERROR__ || null,
      status: document.getElementById('status')?.textContent,
      webgl: (()=>{const c=document.createElement('canvas');const gl=c.getContext('webgl2')||c.getContext('webgl');return !!gl;})()
    })`);
    console.log(i, state);
    if (state.ready || state.err) break;
  } catch (e) { console.log('eval error', e.message); }
}
await c.screenshot('./renders/test-build.png');
console.log('screenshot saved');
c.ws.close();
