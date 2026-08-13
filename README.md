<div align="center">

<svg width="64" height="64" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="72" height="72" rx="16" fill="#0a0d10"/>
  <polyline points="12,60 12,36 36,36 36,12 60,12" stroke="#3ddc84" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="60" r="3.5" fill="#3ddc84"/>
  <circle cx="36" cy="36" r="3.5" fill="#3ddc84"/>
  <circle cx="60" cy="12" r="3.5" fill="#3ddc84"/>
  <circle cx="36" cy="36" r="8" stroke="#3ddc84" stroke-width="1" fill="none" stroke-dasharray="3 3"/>
</svg>

# TraceLine

**See what your browser hands over before you even click anything.**

[![License: MIT](https://img.shields.io/badge/License-MIT-3ddc84.svg?style=flat-square)](LICENSE)
[![No Build Step](https://img.shields.io/badge/build-none-blue.svg?style=flat-square)](#running-it)
[![Zero Backend](https://img.shields.io/badge/backend-none-orange.svg?style=flat-square)](#what-it-does-with-your-data)
[![Open Source](https://img.shields.io/badge/source-github-3ddc84.svg?style=flat-square)](https://github.com/itztrmin/traceline)

</div>

---

TraceLine is a one-page, one-button site that runs the same fingerprinting tricks ad networks and bot detectors use, then shows you exactly what it found. No sign-up, no server, nothing saved. Click the button, watch it dig through your browser in real time, get a privacy score at the end.

I built it because most "check your fingerprint" tools either hide their methodology or just dump raw JSON at you. This one narrates what it's doing and why each signal matters.

It's fully open source under MIT — code, README, everything — at [github.com/itztrmin/traceline](https://github.com/itztrmin/traceline). Read it, fork it, run it offline, whatever you want.

## What it checks

<table>
<tr><td width="26">

<svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14" r="10" stroke="#3ddc84" stroke-width="1.8" fill="none"/><ellipse cx="14" cy="14" rx="4.5" ry="10" stroke="#3ddc84" stroke-width="1.2" fill="none"/><line x1="4" y1="14" x2="24" y2="14" stroke="#3ddc84" stroke-width="1.2"/></svg>

</td><td>

**Network** — IP, ISP/ASN, rough geolocation, and a VPN/datacenter check that cross-references your system timezone against the one your IP resolves to.

</td></tr>
<tr><td>

<svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="20" height="20" rx="3" stroke="#3ddc84" stroke-width="1.8" fill="none"/><path d="M8 20 Q11 10 14 15 Q17 20 20 8" stroke="#3ddc84" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>

</td><td>

**Canvas & audio fingerprints** — renders a hidden canvas scene and an inaudible audio signal, hashes the output. Sub-pixel rendering and DSP rounding differ just enough per device to make both reproducible fingerprints. Also flags when a privacy browser is injecting noise to defeat this.

</td></tr>
<tr><td>

<svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="8" width="18" height="12" rx="2.5" stroke="#3ddc84" stroke-width="1.8" fill="none"/><line x1="9" y1="20" x2="9" y2="23" stroke="#3ddc84" stroke-width="1.8" stroke-linecap="round"/><line x1="14" y1="20" x2="14" y2="23" stroke="#3ddc84" stroke-width="1.8" stroke-linecap="round"/><line x1="19" y1="20" x2="19" y2="23" stroke="#3ddc84" stroke-width="1.8" stroke-linecap="round"/></svg>

</td><td>

**GPU & hardware** — unmasked WebGL renderer string, a WebGL scene hash, WebGPU adapter info where supported, CPU core count, device memory, screen/DPI, and Client Hints.

</td></tr>
<tr><td>

<svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 14 C6 8 10 5 14 5 C18 5 22 8 25 14 C22 20 18 23 14 23 C10 23 6 20 3 14Z" stroke="#3ddc84" stroke-width="1.8" fill="none"/><circle cx="14" cy="14" r="4" stroke="#3ddc84" stroke-width="1.5" fill="none"/><circle cx="14" cy="14" r="1.5" fill="#3ddc84"/></svg>

</td><td>

**Privacy signals** — DNT/GPC headers, cookie and storage policy, WebRTC leak exposure, ad blocker detection via real ad-network requests, and known extension fingerprints (Dark Reader, Grammarly, etc).

</td></tr>
<tr><td>

<svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14" r="10" stroke="#3ddc84" stroke-width="1.8" fill="none"/><circle cx="14" cy="14" r="6.5" stroke="#3ddc84" stroke-width="1.2" fill="none"/><circle cx="14" cy="14" r="3" stroke="#3ddc84" stroke-width="1" fill="none"/></svg>

</td><td>

**Fonts, voices, Tor & bot heuristics** - canvas-based font probing, speech synthesis voice list, Tor Browser letterboxing checks, battery API spoof detection, and a CPU timing benchmark used to spot throttled or virtualized environments.

</td></tr>
</table>

Everything runs in parallel and lands in a weighted 0–10 privacy score, broken into Network / Fingerprint / Hardware / Privacy categories. Full scoring breakdown is in [`js/ui/score.js`](js/ui/score.js) if you want to see exactly how a number gets calculated.

## What it does with your data

Nothing. There's no backend to send it to. The only network calls TraceLine makes are to public IP-geolocation APIs (needed to compute the network score) and, optionally, map tiles for the location view. Everything else canvas, audio, GPU, fonts never leaves the tab. Close it and it's gone.

## Running it

No install, no build:

```bash
git clone https://github.com/itztrmin/traceline.git
cd traceline
open index.html          # or xdg-open / start on Linux / Windows
```

A couple of checks (device enumeration, some Client Hints) want a secure context, so if those look empty, serve it locally instead:

```bash
python3 -m http.server 8080
```

There's also a `fast/` build with the typewriter animation stripped out same audit, results appear instantly. Useful if you're testing repeatedly.

## Layout

```
index.html
css/            base, terminal chrome, components, scorecards, location
js/
  core/         theme toggle, shared helpers (TL namespace, hashing, tz comparison)
  engine/       the actual collectors one file per signal type
  ui/           terminal typewriter, score cards, app wiring
fast/           same app, no animation
```

Everything hangs off a single `window.TL` object, scripts load with `defer` in dependency order, and `collect.js` fans every engine module out through `Promise.all` so the audit takes as long as the slowest single check, not the sum of all of them.

Adding a new check means writing a module in `js/engine/` that exports a `get()` (sync or async), wiring it into `collect.js`, and optionally adding a scoring line in `score.js`. That's the whole contract.

## Hardening against what it finds

| Signal | What helps |
|---|---|
| Canvas / audio fingerprint | Brave Shields, or Firefox's `privacy.resistFingerprinting` |
| WebGL renderer leak | Same as above, or uBlock Origin |
| IP / geolocation | A VPN with residential exit nodes |
| Timezone mismatch | Match your system clock to your VPN server's region |
| WebRTC IP leak | Disable in `about:config` → `media.peerconnection.enabled` |
| Device memory / CPU cores | Brave randomizes these, Firefox caps both |

Refresh-rate fingerprinting has no real mitigation yet, and honestly isn't used much in the wild it's in here mostly to show it's possible.

## Developer & Maintainers

This project is Founded and Developed by [@itztrmin](https://github.com/itztrmin)

## Contributing

PRs welcome, no build tooling required just vanilla JS and CSS. Stick to the `TL.<module>.get()` pattern and you're good.

## License

MIT, see [LICENSE](LICENSE).
