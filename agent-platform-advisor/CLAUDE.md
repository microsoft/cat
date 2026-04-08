# Agent Platform Advisor — Claude Code Context

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, border radius, shadows, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

Key constraints from DESIGN.md:

- Primary blue is `#0078D4` (not #0090FF or any other blue)
- Body font is Segoe UI Variable with system fallbacks — never swap to Inter, Roboto, or similar
- Geist Mono is used specifically for scores, platform labels, and step counters — not general body text
- Canvas background uses a 3-stop diagonal gradient, not a flat color

## Project Structure

- `index.html` — main app shell (v2, YAML-driven)
- `index_v1.html` — previous version, kept for reference
- `apa.yaml` — scoring matrix and question definitions (source of truth for content)
- `assets/apa.css` — all styles
- `assets/apa.js` — all JavaScript
- `DESIGN.md` — design system (read this before any CSS/UI work)

## Key actions

Always update CHANGELOG.md after making changes.
