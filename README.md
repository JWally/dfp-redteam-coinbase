# dfp-redteam-coinbase — Coinbase anti-bot assessment

Full details in `COINBASE_ASSESSMENT_2026_10_31.md`.

---

## What we observed

**Coinbase has no in-house client fingerprinting.** The exchange app is a
clean client: `coinbase_device_id` is analytics, not device intel, and API
auth is HMAC/TOTP (`CB-ACCESS-*`). The blocking happens at the **Cloudflare
edge** (JS challenge + Turnstile, sitekey `0x4AAAAAAADnPIDROrmt1Wwj`) where
verification is server-side by construction.

There is **no client payload to read or tamper** — nothing client-mintable.
This is the reference for "buy the good blocker, keep the client clean"
(edge verification + HMAC/TOTP at the API).

## Status

- ⚪ Read payload: no device-fingerprint payload shipped (clean client)
- ⚪ Tamper with payload: nothing to tamper
- 🔴 Mint token: auth is HMAC/TOTP + edge verification; nothing client-mintable

## Files

- writeup: `COINBASE_ASSESSMENT_2026_10_31.md`
- scripts/artifacts per the writeup
