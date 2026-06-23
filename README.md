# Pragma Softwares — Homepage

An award-winning, dark-themed, AI-forward agency homepage for **Pragma Softwares**.
Art direction: **"Nebula"** — near-black canvas, violet→cyan plasma, computational/futuristic.

Built as a **static site** (no build step) so it's trivial to preview and later port to Next.js.

## Tech stack

| Layer | Tool |
|---|---|
| Markup | HTML5 (single `index.html`, no build step) |
| Styles | Hand-written CSS (`css/styles.css`) + **Tailwind CSS v3** via CDN |
| Scripts | Vanilla ES module (`js/main.js`) |
| Animations | **GSAP 3.13** + **ScrollTrigger** (CDN) |
| Smooth scroll | **Lenis 1.3** (CDN) |
| Text splitting | **Split-Type 0.3.4** (CDN) |
| Icons | **Lucide 0.460** (CDN, UMD) |
| Fonts | **Cerebri Sans** (local `/fonts/`) · **Space Mono** (Google Fonts) |
| Dev server | `npx serve` on port 5181 |

## Run it

It's a static site — any static server works:

```bash
# option A (Python)
python -m http.server 5181

# option B (Node)
npx serve . -l 5181
# or: npm run dev
```

Then open <http://localhost:5181>. Opening `index.html` directly also works (libraries load from CDN; a server is recommended so ES-module imports resolve cleanly).

## Structure

```
index.html        # the whole page + Tailwind theme config (inline) + CDN <script> tags
css/styles.css    # "Nebula" design system: tokens, cursor, grain, buttons, bento, reveals, responsive
js/main.js        # interaction engine (modular): smooth scroll, cursor, magnetic,
                  # reveals, hero plasma canvas, marquee, bento spotlight, work tilt,
                  # process progress, count-ups, AI terminal, footer parallax
brief/            # the AI-generated premium copy deck used for the final copy
previews/         # the 4 art-direction concepts shown during selection
```

## Design system (tokens)

| Token | Value | |
|---|---|---|
| `--bg` | `#07070B` | near-black canvas |
| `--ink` | `#ECECF2` | primary text |
| `--muted` / `--faint` | `#A9A9BC` / `#6E6E82` | secondary text |
| `--violet` / `--glow` / `--cyan` | `#6D4DFF` / `#8B5CFF` / `#22D3EE` | accent ramp |
| `--grad` | `linear-gradient(100deg,#8B5CFF,#22D3EE)` | signature gradient |
| Display / Body | **Cerebri Sans** | headings + copy |
| Mono | **Space Mono** | eyebrows, labels, numerics |

Tailwind utilities mirror these (`bg-bg`, `text-ink`, `text-muted`, `font-display`, `text-cyan2`, …) via the inline `tailwind.config` in `index.html`.

## Motion

- **Lenis** smooth scroll, synced to the **GSAP** ticker; **ScrollTrigger** drives reveals.
- **SplitType** line-masked reveals (line-based to preserve gradient-clipped words).
- **Motion (motion.dev)** is lazy-loaded off the critical path (with a GSAP fallback) for the capability-chip entrances.
- A `<canvas>` particle network (drifting nodes + cursor-reactive links) backs the hero; it caps DPR at 2 and pauses when offscreen.
- Everything respects `prefers-reduced-motion` (animations disabled, content shown statically, cursor/grain hidden) and degrades gracefully if a CDN library fails to load.

## Notes for the Next.js port

- The page is one document; sections are clearly delimited by `<!-- ===== SECTION ===== -->` comments — each maps cleanly to a component.
- Swap the Tailwind **CDN** for a real Tailwind install and move the inline `tailwind.config` into `tailwind.config.js`; move the tokens in `:root` into `@theme`.
- Replace CDN `<script>` libs with the npm packages already implied (`motion` is installed; add `gsap`, `lenis`, `split-type`, `lucide`).
- The page boots immediately on `DOMContentLoaded` (no preloader) for fast first contentful paint.
- `window.PRAGMA` is a tiny QA hook (exposed only with `?qa=1`, inert in production) to force-boot during testing.
```
```
