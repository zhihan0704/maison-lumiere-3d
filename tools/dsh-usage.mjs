#!/usr/bin/env node
/**
 * dsh-usage — 查看 DeepSeek Harness 本机累积的 token 用量与上下文占用。
 *
 * 数据来源：$DSH_HOME/storages/session_projcache/sessions/*.json
 * （GUI 的「会话统计 / 本轮用量 / 上下文」读取的是同一份投影数据）
 *
 * 用法：
 *   node dsh-usage.mjs             只看当前会话（读 $DSH_SESSION_ID）
 *   node dsh-usage.mjs --all       列出全部会话
 *   node dsh-usage.mjs <会话id前缀>  只看指定会话
 *   node dsh-usage.mjs --json      输出原始 JSON
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh');
const dir = join(dshHome, 'storages', 'session_projcache', 'sessions');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const all = args.includes('--all');
const filter = args.find((a) => !a.startsWith('--')) ?? null;

if (!existsSync(dir)) {
  console.error(`找不到会话数据目录：${dir}`);
  process.exit(1);
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const fmt = (n) => n.toLocaleString('en-US');

/** 计费输入 = 未缓存输入 + 缓存读取 + 缓存写入（与应用内 billedInputTokens 一致） */
function billedInput(u) {
  return num(u.uncachedInputTokens) + num(u.cacheReadTokens) + num(u.cacheWriteTokens);
}

function readSessions() {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const id = name.replace(/\.json$/, '');
    let raw;
    try {
      raw = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    } catch {
      continue;
    }
    const rows = raw?.record?.rows ?? {};
    const val = (key) => rows[key]?.val;
    const usage = val('tokenUsage') ?? {};
    const totals = usage.totals ?? {};
    const last = usage.last ?? {};
    const stats = val('sessionStats') ?? {};
    const pressure = val('contextPressure') ?? {};
    out.push({
      id,
      title: val('title') ?? '(未命名)',
      cwd: raw?.record?.identity?.cwd ?? '',
      createdAt: num(raw?.record?.identity?.createdAt),
      seq: num(rows.tokenUsage?.seq),
      input: billedInput(totals),
      uncachedInput: num(totals.uncachedInputTokens),
      cacheRead: num(totals.cacheReadTokens),
      cacheWrite: num(totals.cacheWriteTokens),
      output: num(totals.outputTokens),
      total: billedInput(totals) + num(totals.outputTokens),
      cacheHitPct: billedInput(totals) > 0 ? (num(totals.cacheReadTokens) / billedInput(totals)) * 100 : null,
      turns: num(stats.turns),
      steps: num(stats.steps),
      llmMs: num(stats.llmMs),
      toolMs: num(stats.toolMs),
      tps: num(stats.decodeMs) > 0 ? num(stats.decodeTokens) / (num(stats.decodeMs) / 1000) : null,
      contextUsed: num(pressure.pressureTokens) || num(pressure.surfaceTokens),
      contextWindow: num(pressure.contextWindow),
      lastTurn: num(last.turn),
      lastStep: num(last.step),
    });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

let sessions = readSessions();
if (!sessions.length) {
  console.error(`没有会话数据：${dir}`);
  process.exit(1);
}

if (!all) {
  const want = filter ?? process.env.DSH_SESSION_ID;
  if (want) {
    const hit = sessions.filter((s) => s.id.includes(want));
    if (hit.length) sessions = hit;
  }
  if (!sessions.length) sessions = [readSessions()[0]];
}

if (asJson) {
  console.log(JSON.stringify(sessions, null, 2));
  process.exit(0);
}

const ms = (v) => (v > 60000 ? `${(v / 60000).toFixed(1)} 分` : `${(v / 1000).toFixed(1)} 秒`);
const pct = (v) => `${v.toFixed(1)}%`;

let sum = { input: 0, uncachedInput: 0, cacheRead: 0, cacheWrite: 0, output: 0, total: 0, turns: 0, steps: 0 };

for (const s of sessions) {
  console.log('─'.repeat(64));
  console.log(`会话   ${s.title}`);
  console.log(`ID     ${s.id}`);
  if (s.cwd) console.log(`目录   ${s.cwd}`);
  if (s.createdAt) console.log(`创建   ${new Date(s.createdAt).toLocaleString('zh-CN')}`);
  console.log('');
  console.log(`  未缓存输入   ${fmt(s.uncachedInput).padStart(12)}`);
  console.log(`  缓存读取     ${fmt(s.cacheRead).padStart(12)}   ${s.cacheHitPct !== null ? `缓存命中 ${pct(s.cacheHitPct)}` : ''}`);
  if (s.cacheWrite) console.log(`  缓存写入     ${fmt(s.cacheWrite).padStart(12)}`);
  console.log(`  输出         ${fmt(s.output).padStart(12)}`);
  console.log(`  ────────────────────────────`);
  console.log(`  合计 token   ${fmt(s.total).padStart(12)}`);
  if (s.contextWindow) {
    console.log(`  上下文占用   ${fmt(s.contextUsed).padStart(12)} / ${fmt(s.contextWindow)}  (${pct((s.contextUsed / s.contextWindow) * 100)})`);
  } else if (s.contextUsed) {
    console.log(`  上下文占用   ${fmt(s.contextUsed).padStart(12)}`);
  }
  const times = [];
  if (s.turns || s.steps) times.push(`${s.turns} 轮 ${s.steps} 步`);
  if (s.llmMs) times.push(`模型 ${ms(s.llmMs)}`);
  if (s.toolMs) times.push(`工具 ${ms(s.toolMs)}`);
  if (s.tps) times.push(`${s.tps.toFixed(1)} tok/s`);
  if (times.length) console.log(`  统计         ${times.join(' · ')}`);
  if (s.lastTurn) console.log(`  最近        第 ${s.lastTurn} 轮 / 第 ${s.lastStep} 步`);

  sum.input += s.input;
  sum.uncachedInput += s.uncachedInput;
  sum.cacheRead += s.cacheRead;
  sum.cacheWrite += s.cacheWrite;
  sum.output += s.output;
  sum.total += s.total;
  sum.turns += s.turns;
  sum.steps += s.steps;
}

if (sessions.length > 1) {
  console.log('─'.repeat(64));
  console.log(`合计（${sessions.length} 个会话）`);
  console.log(`  未缓存输入   ${fmt(sum.uncachedInput).padStart(12)}`);
  console.log(`  缓存读取     ${fmt(sum.cacheRead).padStart(12)}`);
  if (sum.cacheWrite) console.log(`  缓存写入     ${fmt(sum.cacheWrite).padStart(12)}`);
  console.log(`  输出         ${fmt(sum.output).padStart(12)}`);
  console.log(`  合计 token   ${fmt(sum.total).padStart(12)}   （${sum.turns} 轮 ${sum.steps} 步）`);
}

console.log('─'.repeat(64));
console.log('');
console.log('提示：账户余额与充值额度不在本机数据里，请在应用内查看 设置 → 账号与余额。');
