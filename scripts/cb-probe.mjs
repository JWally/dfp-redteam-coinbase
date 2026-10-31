#!/usr/bin/env node
/** cb-probe.mjs — load Coinbase app/exchange, capture every script + request
 *  + global fingerprinting surface. All 3rd-party telemetry fulfilled locally. */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const b = await chromium.launch({ headless:true });
const ctx = await b.newContext({ viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' });
const page = await ctx.newPage();
const log = { requests:[], bundles:{}, errors:[] };
page.on('request', req => {
  const u = req.url();
  if (/coinbase|cloudflare|turnstile|captcha|fingerprint|perimeter|human|signifyd|datadome|arkose|akamai|kasada|bot|geo/.test(u)) {
    log.requests.push({ method: req.method(), type: req.resourceType(), url: u.slice(0,200) });
  }
});
page.on('response', async r => {
  const u = r.url();
  if (/\.js($|\?)/.test(u) && /coinbase|turnstile|cloudflare/.test(u)) {
    try { const body = await r.text(); if (body.length > 20000) log.bundles[u.slice(0,220)] = body; } catch(_){}
  }
});
page.on('pageerror', e => log.errors.push(String(e).slice(0,200)));
await page.goto('https://exchange.coinbase.com/', { waitUntil:'load', timeout:60000 }).catch(()=>{});
await page.waitForTimeout(12000);
const state = await page.evaluate(() => ({
  title: document.title,
  fpGlobals: Object.keys(window).filter(k=>/fp|finger|px|perimeter|turnstile|captcha|arkose|_0x|webgl|bot|device|coinbase/i.test(k)).slice(0,40),
  hasLogin: !!document.querySelector('[data-testid*="login"], [href*="signin"], input[type="email"]'),
  cookies: document.cookie.split(';').map(c=>c.trim().split('=')[0]).slice(0,20),
})).catch(e=>({err:String(e).slice(0,150)}));
console.log('requests:', log.requests.length, '| bundles:', Object.keys(log.bundles).length);
console.log('\nstate:', JSON.stringify(state,null,1).slice(0,900));
console.log('\n=== interesting requests ===');
const hosts = {};
for (const r of log.requests) { try { const h = new URL(r.url).host; hosts[h]=(hosts[h]||0)+1; } catch(_){} }
for (const [h,n] of Object.entries(hosts).sort((a,b)=>b[1]-a[1])) console.log(`  ${h}: ${n}`);
console.log('\nerrors:', log.errors.slice(0,3));
writeFileSync('/tmp/opencode/cb/probe1.json', JSON.stringify({state, requests:log.requests.slice(0,60)},null,2));
await b.close();
