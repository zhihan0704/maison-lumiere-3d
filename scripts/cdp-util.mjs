import WebSocket from 'ws';
import fs from 'node:fs';
import path from 'node:path';

export async function connectCDP(port = 9223) {
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = pages.find(p => p.type === 'page') || pages[0];
  if (!page) throw new Error('No CDP page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 512 * 1024 * 1024 });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  let id = 0;
  const pending = new Map();
  const events = [];
  const listeners = new Map();
  ws.on('message', raw => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
      for (const fn of listeners.get(msg.method) || []) fn(msg.params);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id; pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(fn);
  };
  const evaluate = async (expression, awaitPromise = true) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  };
  const goto = async (url, waitMs = 1500) => {
    await send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, waitMs));
  };
  const waitFor = async (expr, timeout = 180000, interval = 800) => {
    const t0 = Date.now();
    let last;
    while (Date.now() - t0 < timeout) {
      try { last = await evaluate(expr); if (last) return last; } catch (e) { last = e.message; }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error(`waitFor timeout: ${expr}\nlast=${JSON.stringify(last)}\n` + JSON.stringify(events.slice(-15), null, 2));
  };
  const screenshot = async (file) => {
    const res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(res.data, 'base64'));
    return file;
  };
  const setupDownloads = async (dir) => {
    fs.mkdirSync(dir, { recursive: true });
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: path.resolve(dir), eventsEnabled: true });
  };
  return { send, on, evaluate, goto, waitFor, screenshot, setupDownloads, events, ws };
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
