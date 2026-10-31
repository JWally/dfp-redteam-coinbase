#!/usr/bin/env node
/** cb-www.mjs — load www.coinbase.com, capture the Cloudflare challenge flow:
 *  what scripts run, what the challenge JS does, cookies. */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch({ headless:true });
const ctx = await b.newContext({ viewport:{width:1280,height:900} });
const page = await ctx.newPage();
const reqs = [];
const bodies = {};
page.on('request', req => {
  const u = req.url();
  if (/cloudflare|challenge|coinbase/.test(u)) reqs.push([req.method(), req.resourceType(), u.slice(0,160)]);
});
page.on('response', async r => {
  const u = r.url();
  if (/challenges\.cloudflare\.com/.test(u) && /\.js/.test(u)) {
    try { const t = await r.text(); if (t.length>5000) bodies[u]=t; } catch(_){}
  }
});
await page.goto('https://www.coinbase.com/', { waitUntil:'domcontentloaded', timeout:60000 }).catch(()=>{});
await page.waitForTimeout(12000);
const state = await page.evaluate(() => ({
  title: document.title,
  bodyStart: (document.body?.innerText||'').slice(0,120),
  cookies: document.cookie.split(';').map(c=>c.trim().split('=')[0]).filter(c=>/cf|turnstile|clearance/i.test(c)),
})).catch(e=>({err:String(e).slice(0,120)}));
console.log('requests:');
for (const r of reqs.slice(0,20)) console.log(' ', r[0], r[1], r[2]);
console.log('\nstate:', JSON.stringify(state));
console.log('\nchallenge bundles:', Object.keys(bodies).length);
for (const [u,body] of Object.entries(bodies)) {
  console.log('\n===', u.slice(-70), 'len', body.length);
  console.log(body.slice(0,400));
}
writeFileSync('/tmp/opencode/cb/www-challenge.json', JSON.stringify({state, reqs},null,2));
await b.close();
