# Copilot Instructions — CAT Website

## Project Overview

This is the **Microsoft Copilot Acceleration Team (CAT) website**, hosted at `https://microsoft.github.io/cat` via GitHub Pages. It is a static site — no build system, no bundler, no package manager. All HTML, CSS, and JS are hand-authored and served directly.

## Architecture

**Landing page** (`/index.html`): Single-page site using Fluent UI Web Components, `assets/css/fluent.css`, and inline JS. Sections are anchor-linked (`#tools`, `#programs`, `#guidance`, `#stories`). Supports dark/light theme via `data-theme` attribute on `<html>` and `localStorage` key `cat-theme`.

**Subpages** (`/programs/*.html`): Standalone HTML pages sharing `assets/css/subpage.css`. Each is self-contained with its own inline `<script>` blocks. Navigation back to the main site is via a header logo link.

**YAML-driven pages**: Two pages load content dynamically from YAML files at runtime using `js-yaml` from CDN:
- `/agent-platform-advisor/index.html` ← reads `apa.yaml` (scoring matrix, questions, recommendations)
- `/programs/ai-webinar.html` ← reads `ai-webinar-sessions.yml` (session schedule)

**Agent Platform Advisor** (`/agent-platform-advisor/`): The most complex sub-app — a multi-step scoring wizard. It has its own CSS (`assets/apa.css`), JS (`assets/apa.js`), and a dedicated design system documented in `DESIGN.md`. Always read `agent-platform-advisor/DESIGN.md` before making visual changes to this app.

**SparkTank** (`/sparktank/`): Facilitation/game page with its own CSS (`assets/css/strategix.css`) and JS (`assets/js/strategix.js`). Uses `html2canvas` and `jspdf` from CDN for export.

## Key Conventions

- **No build step.** Edit HTML/CSS/JS files directly. Sass sources exist under `assets/sass/` but compiled CSS is checked in — there is no automated Sass compilation in the repo.
- **No framework.** All JS is vanilla DOM manipulation. No React, Vue, or similar.
- **CDN dependencies only.** External libraries (Fluent UI, js-yaml, html2canvas, jspdf) are loaded from CDNs, not installed locally.
- **Font stack:** Segoe UI / Segoe UI Variable with system fallbacks. The Agent Platform Advisor additionally uses Geist Mono for scores and platform labels.
- **Primary brand color:** `#0078D4` (Microsoft blue). Subpage CSS uses the custom property `--ms-blue`.
- **Dark mode:** The landing page supports dark/light themes toggled via `data-theme` attribute. Subpages generally do not have dark mode.
- **Scroll reveal pattern:** Multiple pages use `IntersectionObserver` to add a `.visible` class for entrance animations. CSS classes: `.reveal`, `.reveal-stagger`.
- **AI Webinar sessions:** `programs/ai-webinar-sessions.yml` is the source of truth for webinar data. The page classifies sessions as upcoming/past using a hardcoded Pacific Time cutoff (`11:00:00-08:00`).
- **Analytics:** Some pages include Microsoft Clarity tracking scripts.

## Agent Platform Advisor Design System

The advisor app at `/agent-platform-advisor/` has a documented design system in `DESIGN.md` and coding conventions in `CLAUDE.md`. Key constraints:
- Primary blue is `#0078D4` (not `#0090FF`)
- Body font is Segoe UI Variable — never swap to Inter, Roboto, etc.
- Geist Mono for scores, platform labels, and step counters only
- Canvas background uses a 3-stop diagonal gradient
- Score bar animations use `IntersectionObserver` with ease-out cubic timing (~1s)
- `apa.yaml` is the source of truth for all content, questions, and scoring logic
