#!/usr/bin/env node
/** cb-payload.mjs — capture what Coinbase's client actually sends: (1) the
 *  Cloudflare challenge fo/ proof POST body on www, (2) exchange analytics
 *  POSTs to as.coinbase.com. Attach to clean Chrome. */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const b = await chromium.connectOverCDP('http://127.0.0.1:9888');
const ctx = b.contexts()[0];
const page = await ctx.newPage();
const posts = [];
page.on('request', req => {
  const u = req.url();
  if (/cloudflare|challenge-platform|coinbase|as\.coinbase/.test(u) && /POST|PUT/.test(req.method())) {
    posts.push({ url: u.slice(0,200), method: req.method(), postData: (req.postData()||'').slice(0,1200) });
  }
});
// also grab the challenge orchestrator response (has the JS proof)
const bodies = [];
page.on('response', async r => {
  const u = r.url();
  if (/challenge-platform\/h\/g\/fo/.test(u)) {
    try { bodies.push({ url: u.slice(0,150), body: (await r.text()).slice(0,800) }); } catch(_){}
  }
});
await page.goto('https://www.coinbase.com/', { waitUntil:'domcontentloaded', timeout:60000 }).catch(()=>{});
await page.waitForTimeout(14000);
console.log('posts:', posts.length, '| fo bodies:', bodies.length);
for (const p of posts.slice(0,8)) {
  console.log('\n===', p.method, p.url.slice(0,130));
  console.log('  ', p.postData.slice(0,600));
}
for (const bb of bodies) { console.log('\n=== fo RESP ==='); console.log(bb.body.slice(0,400)); }
writeFileSync('/tmp/opencode/cb/payload-posts.json', JSON.stringify({posts,bodies},null,2));
await b.close();
