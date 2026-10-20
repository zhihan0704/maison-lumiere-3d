#!/usr/bin/env node
/**
 * fetch-image.mjs — 用 Node 的 TLS 栈经系统代理下载图片。
 *
 * 用法：
 *   node fetch-image.mjs <输出文件> <URL> [参考页URL] [作者/许可说明]
 *
 * 会写入同名 .json 记录来源，便于幻灯片标注引用。
 */

import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const PROXY = process.env.DSH_FETCH_PROXY || 'http://127.0.0.1:12450';
const [out, url, creditPage = '', creditNote = ''] = process.argv.slice(2);

if (!out || !url) {
  console.error('用法: node fetch-image.mjs <输出文件> <URL> [参考页URL] [作者/许可说明]');
  process.exit(2);
}

// 让 Node 也走本地代理：显式用 undici ProxyAgent（Node 20 无全局 fetch 代理）
async function get(targetUrl) {
  const res = await fetch(targetUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) academic-pptx-fetch/1.0',
      'Accept': 'image/avif,image/webp,image/png,image/jpeg,*/*',
    },
  });
  return res;
}

try {
  const res = await get(url);
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(out, buf);
  writeFileSync(
    out + '.json',
    JSON.stringify(
      {
        file: basename(out),
        url,
        contentType: res.headers.get('content-type'),
        bytes: buf.length,
        fetchedAt: new Date().toISOString(),
        creditPage,
        creditNote,
      },
      null,
      2,
    ),
  );
  console.log(`OK ${buf.length} bytes  ${res.headers.get('content-type')}  -> ${out}`);
} catch (err) {
  console.error(`FAIL ${url}: ${err?.message ?? err}${err?.cause ? ` (cause: ${err.cause?.message ?? err.cause})` : ''}`);
  process.exit(1);
}
