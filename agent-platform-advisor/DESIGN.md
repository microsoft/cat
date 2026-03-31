# Design System — Agent Platform Advisor

## Product Context
- **What this is:** A YAML-driven scoring wizard that recommends the right Microsoft agent platform for a given scenario
- **Who it's for:** Microsoft enterprise customers — business users, IT pros, professional developers, and data/ML engineers evaluating Microsoft agent platforms
- **Space/industry:** Microsoft productivity & AI tooling, enterprise decision-support tools
- **Project type:** Single-page web app (multi-step wizard with scored results)
- **Distribution:** Static site on GitHub Pages, published by Microsoft CAT

## Aesthetic Direction
- **Direction:** Fluent 2 — Microsoft's current design language. Layered surfaces, purposeful depth, clean hierarchy. Not flat, not skeuomorphic. Trustworthy without being stiff.
- **Decoration level:** Intentional — a subtle three-stop diagonal gradient on the canvas background (inspired by Microsoft's modern product pages), soft layered neutrals, nothing loud. Decoration serves depth, not decoration for its own sake.
- **Mood:** Authoritative and efficient. A user should feel they're using a real Microsoft product, not an internal hack. The tool should feel like it takes their scenario seriously.

## Typography

- **Body/UI:** `"Segoe UI Variable", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
  - The modern Fluent 2 font. Non-negotiable first-party signal. Segoe UI Variable is available natively on Windows; system-ui picks it up on macOS/Linux with acceptable fallback.
  - Use for: all body text, headings, labels, buttons, navigation, descriptions.

- **Data/Scores/Platform labels:** `"Geist Mono", "Cascadia Code", "Consolas", monospace`
  - Load from Google Fonts: `https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&display=swap`
  - Always use `font-variant-numeric: tabular-nums` for numeric score display.
  - Use for: platform identifier chips, score numbers, raw score display, step counters (`Question 3 of 8`), technical metadata.
  - Rationale: monospace makes scores feel like outputs of a technical scoring system rather than marketing copy. Enterprise dev tools use this pattern to signal precision.

- **Type scale:**

| Token    | Size  | Weight | Use                                  |
|----------|-------|--------|--------------------------------------|
| display  | 32px  | 700    | Welcome hero heading, question text  |
| heading  | 24px  | 600/700| Results heading, section titles      |
| subhead  | 20px  | 600    | Subsection headings                  |
| body-lg  | 16px  | 400    | Welcome description, important body  |
| body     | 14px  | 400    | Standard body, option descriptions   |
| caption  | 12px  | 400    | Metadata, hints, secondary info      |
| micro    | 11px  | 500    | Mono platform labels (all-caps)      |

## Color

- **Approach:** Restrained — one primary accent + semantic neutrals. Color is reserved and meaningful.

- **Primary:** `#0078D4` — Microsoft brand blue. Used for: interactive elements, progress bars, winner highlight, score bars, CTA buttons.
- **Primary Dark:** `#005A9E` — Hover/pressed state for primary elements.
- **Primary Light:** `#C7E0F4` — Badge backgrounds, winner card border accent.
- **Primary XLight:** `#EFF6FC` — Selected state backgrounds, info alert backgrounds, winner card fill.

- **Neutrals:**
  - `#242424` — Text primary (headings, labels, important body)
  - `#616161` — Text secondary (descriptions, hints, captions)
  - `#A0A0A0` — Text disabled / placeholder
  - `#D1D1D1` — Border (default)
  - `#E8E8E8` — Border subtle (card edges, dividers)
  - `#F5F5F5` — Canvas background base
  - `#FFFFFF` — Card/surface background

- **Canvas gradient:** `linear-gradient(135deg, #F0F6FF 0%, #F5F5F5 60%, #FAF5FF 100%)`
  - Applied to `body` background. Subtle, not loud. Gives the tool a slightly premium feel vs pure neutral.

- **Semantic:**
  - Success: `#107C10` / bg `#DFF6DD` — Assessment complete, strong match
  - Warning: `#C19C00` / bg `#FFF4CE` — Close match, confidence flag
  - Error: `#A4262C` / bg `#FDE7E9` — Load failures, errors
  - Info: `#0078D4` / bg `#EFF6FC` — Tips, informational callouts

- **Dark mode strategy:** Redesign surfaces to dark neutrals; reduce blue saturation ~10%. Canvas `#1A1A1A`, card `#2A2A2A`, primary `#2899F5`, border `#3D3D3D`. Canvas gradient: `linear-gradient(135deg, #0F1B2D 0%, #1A1A1A 60%, #1A1525 100%)`. Implement with CSS custom properties under `[data-theme="dark"]`.

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable — not cramped, not wasteful. Fluent standard.

| Token | Value | Common use                                |
|-------|-------|-------------------------------------------|
| sp-1  | 4px   | Icon gap, tight inline spacing           |
| sp-2  | 8px   | Compact gap, badge padding               |
| sp-3  | 12px  | Component internal padding               |
| sp-4  | 16px  | Card internal gap, form field spacing    |
| sp-5  | 20px  | List item padding                        |
| sp-6  | 24px  | Section gap, card padding edge           |
| sp-8  | 32px  | Major section spacing                    |
| sp-10 | 40px  | Card body horizontal padding             |
| sp-12 | 48px  | Welcome screen vertical padding          |
| sp-16 | 64px  | Between major page sections              |

## Layout

- **Approach:** Grid-disciplined — strict centering, predictable alignment. Wizard steps always horizontally centered. Results use a 2×2 platform grid.
- **Max content width:** `1024px`
- **Page padding:** `0 24px` (mobile collapses gracefully)
- **Border radius:**
  - `sm`: 4px — buttons, inputs, small controls
  - `md`: 8px — question options, result cards, badges
  - `lg`: 12px — main card container, welcome icon wrapper
  - `full`: 9999px — progress bar fill, step dots, round badges

- **Elevation / Shadows:**
  - `shadow-sm`: `0 1px 2px rgba(0,0,0,0.08)` — palette swatches, minor elements
  - `shadow-md`: `0 2px 8px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)` — main card
  - `shadow-lg`: `0 4px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)` — modals/overlays

## Motion

- **Approach:** Minimal-functional — only transitions that aid comprehension or signal state changes. No decoration for its own sake.
- **Easing:** `enter: ease-out` / `exit: ease-in` / `move: cubic-bezier(0.4, 0, 0.2, 1)`
- **Duration:**

| Token  | Range      | Use                                          |
|--------|------------|----------------------------------------------|
| micro  | 50–100ms   | Button hover states, focus rings            |
| short  | 150–200ms  | Card section fade-in, option hover           |
| medium | 300–400ms  | Card enter/exit transitions (`fade-in`)     |
| long   | 800–1200ms | Score bar animation on results reveal        |

- **Score bar animation:** Ease-out cubic over ~1s. Bars animate from 0% to final width simultaneously on results reveal. Use `IntersectionObserver` — trigger when results grid enters viewport, not on page load.
- **Progress bar:** Smooth fill `transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1)` on every question advance.
- **Card transitions:** Existing `.fade-in` class is correct. Keep it.

## Platform Visual Identity

Each platform gets a short `font-family: var(--font-mono)` identifier chip shown in all-caps with letter-spacing. Never spell out the full name in the chip — use the ID-style token:

| Platform           | Chip label         |
|--------------------|--------------------|
| Copilot Studio     | `COPILOT_STUDIO`   |
| Microsoft Foundry  | `MS_FOUNDRY`       |
| M365 Copilot       | `M365_COPILOT`     |
| Agent Builder      | `AGENT_BUILDER`    |

## Decisions Log

| Date       | Decision                         | Rationale                                                                 |
|------------|----------------------------------|---------------------------------------------------------------------------|
| 2026-03-20 | Initial design system created    | Created by /design-consultation. Fluent 2 + CAT identity for APA v2.    |
| 2026-03-20 | Geist Mono for scores + labels   | Technical authority signal; enterprise dev tools use monospace for precision |
| 2026-03-20 | Real MS brand blue #0078D4       | Replaces oversaturated #0090FF in v1 CSS; correct Fluent token           |
| 2026-03-20 | Canvas gradient (subtle)         | Matches Microsoft modern product pages; lifts perceived quality vs pure neutral |
| 2026-03-20 | Animated score bars              | Makes recommendation feel earned through visible computation, not instant |
