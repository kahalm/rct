# Real Chess Training — Prompts für Bild-/Asset-Generierung (anderes LLM)

Kontext für alle Prompts (mitgeben!): siehe „Master-Prompt". Die Assets ersetzen/ergänzen
`public/favicon.svg`, `public/icons/*` (PWA/TWA), und liefern Social/Store-Grafiken.
Nach Erhalt: Icons als 512/192 px PNG + maskable-Variante ablegen, `ngsw`/Manifest bleiben.

---

## Master-Prompt (Basis, vor jedes Asset kopieren)

> You are designing brand assets for **"Real Chess Training"** — a focused chess calculation
> training web app by a chess grandmaster's coaching brand (Next Level Chess). The product:
> users get hard chess positions, calculate deeply in their head against a 45-minute clock,
> commit to exactly ONE move, then review with a video. Brand feel: disciplined, calm focus,
> premium coaching — NOT playful, NOT cartoonish.
> Visual identity so far: a white chess knight combined with a 45-minute timer arc (3/4 circle),
> flat vector style, on a very dark background (#121316). Accent color: azure blue (#4a9eff
> range); secondary warm accent: amber (#f5a623) used sparingly (the "golden rule" star).
> Constraints for ALL assets: flat vector look (no photorealism, no 3D render, no gradients
> heavier than subtle), high contrast, must work on both dark and light backgrounds unless
> stated otherwise, NO text unless the asset explicitly includes the wordmark
> "Real Chess Training", clean silhouette readable at small sizes.

> **Lektion aus Run 1 (2026-08-20):** Die gelieferte „Transparent"-Variante (01b) hatte das
> Schachbrett-Transparenzmuster FEST EINGEBACKEN (RGB ohne Alphakanal) und war unbrauchbar.
> Beim nächsten Run für alle Transparent-Varianten explizit fordern:
> **"PNG with a REAL alpha channel (RGBA). Fully transparent background — do NOT paint a
> checkerboard pattern into the image."**

## 1) App-Icon (PWA/Android), 1024×1024

> Design a square app icon, 1024×1024. Motif: minimalist white chess knight silhouette,
> encircled by a 3/4 timer arc (the arc suggests 45 of 60 minutes, opening at the top-right),
> azure blue arc on near-black (#121316) rounded-square background. Flat vector, centered,
> generous padding: all important shapes inside the central 66% safe zone (Android maskable).
> No text, no border, no drop shadows. Also provide a variant on transparent background.

## 2) Monochrome / Notification-Icon, 1024×1024

> Same knight + 3/4 timer arc motif as the app icon, but strictly single-color white on
> transparent background, simplified to work at 48×48 (Android monochrome/notification icon).
> Solid shapes only, no outlines thinner than 1/24 of the canvas.

## 3) Favicon-Motiv, 512×512

> Reduce the knight + timer arc motif to its simplest readable form for a favicon: bold white
> knight head, single azure arc stroke, dark background. Must stay recognizable at 16×16.
> No fine details (no mane lines, no eye).

## 4) Social/Open-Graph-Card, 1200×630

> A social preview card, 1200×630. Left half: the wordmark "Real Chess Training" in a clean
> modern geometric sans (white), small subline "Train your decision-making under pressure."
> (azure). Right half: the knight + 45-minute timer arc motif, large, slightly cropped by the
> right edge. Background: #121316 with a very subtle diagonal chessboard pattern (2–3% white).
> Flat vector style, lots of negative space, premium coaching feel.

## 5) Play-Store Feature Graphic, 1024×500

> Google Play feature graphic, 1024×500. Same system as the social card: dark background,
> subtle chessboard texture, knight + timer arc motif right, wordmark "Real Chess Training"
> left, one-line tagline "Commit to one move." No screenshots, no device frames, no badges.

## 6) Startseiten-/Splash-Hero, 1920×1080

> A hero/splash illustration, 1920×1080, very dark (#121316). Center-left: a lone white knight
> on a fading minimalist chessboard that dissolves into darkness toward the edges; a large
> azure 3/4 timer arc frames the scene. Mood: deep focus, quiet intensity, "the clock is
> running". Flat vector with subtle depth via 2–3 shades of grey-blue only. Leave the right
> third mostly empty (UI text goes there). No text in the image.

## 7) E-Mail-Header, 600×200

> A slim email header banner, 600×200: dark #121316 background, small knight + timer arc mark
> left, wordmark "Real Chess Training" beside it in white, thin azure rule along the bottom
> edge. Flat, minimal, crisp at 1x and 2x.

---

**Abgabeformate:** bevorzugt SVG (Icons 1–3) bzw. PNG mit transparentem Hintergrund;
Karten/Banner (4–7) als PNG. Farbwerte exakt: Hintergrund #121316, Azure ≈ #4a9eff,
Amber #f5a623, Weiß #ffffff.
