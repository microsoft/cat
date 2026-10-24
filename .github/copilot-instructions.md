# Copilot Instructions

## Project Overview

This is the **CAT (Copilot Acceleration Team) website**, a static GitHub Pages site hosted at https://microsoft.github.io/cat. It contains resources, tools, programs, and guidance for accelerating Microsoft 365 Copilot and Copilot Studio adoption.

## Architecture

- **Static site** — no build step, no bundler, no package.json. Files are served directly via GitHub Pages.
- **Main landing page**: `index.html` at the repo root uses Fluent UI Web Components and a custom CSS design system (`assets/css/fluent.css`).
- **Sub-sections** are self-contained folders (`agent-excellence/`, `agent-platform-advisor/`, `sparktank/`, `programs/`) each with their own `index.html` and local CSS/JS.
- **Shared assets** live in `assets/` (CSS, JS, fonts, Sass source).
- **Data-driven content**: `programs/ai-webinar-sessions.yml` feeds the AI webinar page.
- **Resources**: `resources/` holds downloadable PDFs and presentation decks (not code).

## Key Conventions

### Design System

- The primary design language is **Microsoft Fluent 2**. The theme token system is defined in `assets/css/fluent.css` using CSS custom properties (`--bg-canvas`, `--fg-primary`, `--accent-*`, etc.).
- Dark/light mode is supported via `[data-theme="dark"]` attribute on `<html>`, toggled by inline JS.
- Use semantic token variables (e.g., `var(--bg-surface)`) rather than hard-coded colors.

### HTML Pages

- Pages use the Segoe UI font via Google Fonts and load Fluent UI Web Components from unpkg CDN.
- Navigation is defined inline per page (no shared template engine).
- Sub-section pages (e.g., `agent-excellence/`) may use their own independent stylesheet and scripts rather than the shared `assets/` ones.

### JavaScript

- Vanilla JS only — no frameworks, no TypeScript, no transpilation.
- jQuery is present in `assets/js/` for legacy pages but newer pages (like `index.html` root) use plain DOM APIs.
- Workshop-style pages (e.g., `agent-excellence/script.js`) contain interactive utilities (timers, randomizers) for live workshop activities.

### Content Updates

- Webinar sessions are managed via `programs/ai-webinar-sessions.yml`. To add/modify sessions, edit this YAML file.
- Resource decks go in `resources/` — use descriptive filenames with the presentation title.
- Always update CHANGELOG.md with a summary of changes when modifying content or adding new resources.

## No Build/Test/Lint

There is no build pipeline, test suite, or linter configured for this repository. Changes are validated visually and via PR review. To preview locally, serve the root directory with any static file server (e.g., `python -m http.server` or VS Code Live Server extension).
