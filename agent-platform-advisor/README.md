# Agent Platform Advisor

Answer a few questions about what you're trying to build, and get a recommendation for the best Microsoft agent platform for your scenario.

**Live tool:** [microsoft.github.io/cat/agent-platform-advisor](https://microsoft.github.io/cat/agent-platform-advisor/index.html)

---

## What it does

The Agent Platform Advisor is a single-page web app that walks you through a short assessment and recommends the right Microsoft agent platform — **Agent Builder**, **Copilot Studio**, **Microsoft Foundry**, or **Microsoft 365 Copilot** — based on your answers.

The assessment asks about:

- Who is building the agent (business user, low-code maker, developer, data scientist)
- Who will use it (internal employees or external users)
- Where users will interact with it (Microsoft 365 apps, a custom app, background/event-triggered)
- What the agent needs to do (Q&A, multi-turn conversation, multi-step tasks, complex orchestration)
- What data the agent needs to access (Microsoft 365 content, external systems, advanced data sources)

After completing the wizard, you get a primary recommendation with fit badges, key factors, score breakdown, contextual warnings for contradictory answer combinations, and a shareable link.

## Project structure

```
agent-platform-advisor/
├── index.html              # App shell (v2, YAML-driven)
├── apa.yaml                # Scoring matrix, questions, recommendations, and content
├── assets/
│   ├── apa.css             # All styles
│   └── apa.js              # All JavaScript
├── images/                 # Platform icons and favicons
├── docs/
│   ├── CHANGELOG.md        # Version history
│   ├── DESIGN.md           # Design system reference
│   ├── FLOWCHART.md        # Scoring pipeline decision tree
│   └── SCORING.md          # Scoring system reference
└── tests/
    └── e2e/                # Playwright end-to-end tests
```

The app is purely static — no build step, no backend. All content (questions, scores, platform descriptions, hard rules, tiebreakers) lives in `apa.yaml` and is fetched at runtime.

## How scoring works

See [docs/SCORING.md](docs/SCORING.md) for the full reference and [docs/FLOWCHART.md](docs/FLOWCHART.md) for a visual decision tree. The short version:

1. **Hard rules** zero out platforms for certain answer combinations (e.g., Agent Builder is zeroed if the user needs external users, a custom app, background execution, or advanced data sources).
2. **Raw scores** are summed across all 5 questions (max 15 points per platform).
3. **Tiebreakers** in `apa.yaml` resolve equal scores using persona context (e.g., professional developer + tie → Copilot Studio preferred over Agent Builder).
4. **Thresholds** map final scores to fit labels: Strong fit (12–15), Good fit (8–11), Partial fit (4–7), Not recommended (0–3).

## Running the tests

The project uses [Playwright](https://playwright.dev/) for end-to-end tests. Tests run against a local static file server.

```bash
npm install
npm test              # headless
npm run test:headed   # with browser visible
```

Tests cover wizard completion, shared link loading, temporal change detection, the M365 fast-track path, and share button behavior. CI runs automatically on push and pull request via GitHub Actions (`.github/workflows/apa-tests.yml`).

## Sharing results

After completing the assessment, a **Decision Card** appears with a "Share link" button. The URL encodes your answers and the recommendation date. Recipients can view the recommendation directly or retake the assessment with your answers pre-filled (`?mode=wizard`).

If `apa.yaml` is updated after a link was shared and the recommendation has changed, the app shows a banner explaining what shifted (temporal change detection).

## Contributing

Content changes (question text, scores, platform descriptions, hard rules) go in `apa.yaml`. UI changes go in `assets/apa.css` and `assets/apa.js`. Read [docs/DESIGN.md](docs/DESIGN.md) before making any visual changes — colors, spacing, typography, and component specs are all defined there.

Always update [docs/CHANGELOG.md](docs/CHANGELOG.md) after making changes.
