# Changelog

All notable changes to the Agent Platform Advisor are documented here.

## v2 — Complete redesign (March 2026)

We have completely redesigned Agent Platform Advisor for the ground up, based on feedback and product changes. Highlights of the new version include:

- YAML-driven 5-question assessment with weighted scoring engine that results in better advice
- Hard rules and tiebreaker logic for platform selection for more reliable outcomes
- Recommendation screen with primary/secondary platform cards, fit badges, and key factors
- Share the results with others with a single link
- Pre-screen fast-track for M365 Copilot built-in experiences
- Dark mode
- Much, much more!

### Added
- **Accordion for Best For & Considerations** — "Best For" and "Important Considerations" in recommendation cards are now collapsible accordions, matching the existing pattern used for first-party agents and templates. Each shows an item count badge.
- **Logo link to Get Started** — the "Agent Platform Advisor" header text is now a link that navigates back to the Get Started (welcome) screen from any point in the flow.
- **Persona-based tiebreakers** — when two platforms score equally, a `tiebreakers` section in `apa.yaml scoring.tie_handling` picks the better fit based on the user's answers (e.g., professional developer + equal score → Copilot Studio preferred over Agent Builder). Applied in `rankPlatforms()` before falling back to `valid_pairs`.
- **FLOWCHART.md** — decision-tree flowchart documenting the full scoring pipeline from question answers through hard rules, raw score, tiebreakers, and final recommendation.
- **Docs subfolder** — CHANGELOG.md, DESIGN.md, and SCORING.md moved to `docs/` to keep the project root clean.
- **Playwright E2E test infrastructure** — 25 tests across 5 spec files covering the critical user flows: wizard completion (4 tests), shared link loading (7 tests), temporal change detection (3 tests), fast-track path (6 tests), and share button (5 tests). Uses `serve` for static file hosting during tests. GitHub Actions CI workflow triggers on push/PR to `agent-platform-advisor/`.
- **Cross-question contradiction notes** — contextual warning banners on the results page when the user's answer combination is logically contradictory (e.g., background agent + simple Q&A, external users + M365 apps deployment, business user + complex orchestration). Driven by new `scoring.cross_question_notes` section in apa.yaml.
- **Winner-persona mismatch notes** — when Foundry wins but the builder is a business user (q1a), a banner advises partnering with a development team. Driven by new `scoring.winner_persona_notes` section in apa.yaml.
- **Per-question fit grid** — visual dot matrix in the Score Breakdown showing how each platform scored on each of the 5 questions (strong/moderate/weak/none/disqualified). Replaces the opaque single "Top factor" line with full transparency into per-question scoring.
- **Comparative reason text** — Score Breakdown now shows context-aware explanations: winners get breadth summaries ("Strong match across nearly all dimensions"), runners-up get gap explanations ("Close — lost ground on data access"), and zeroed platforms show all applicable hard rules instead of just the first.
- **Close-score callout** — when the top two platforms are within 2 points, a callout in the Score Breakdown notes that team skills and existing tooling may be the deciding factor.
- **SCORING.md** — comprehensive scoring system reference covering the full matrix, pipeline, distribution analysis, and cross-question notes.
- **Dark mode** — theme toggle button in the header. Uses `data-theme="dark"` attribute and `cat-theme` localStorage key, consistent with the main CAT landing page. Respects `prefers-color-scheme` OS preference on first visit. Dark palette follows DESIGN.md strategy: canvas `#1A1A1A`, cards `#2A2A2A`, primary `#2899F5`, gradient `#0F1B2D → #1A1A1A → #1A1525`. Anti-FOUC script in `<head>` prevents flash of wrong theme.
- **Guided Exploration** — third prescreen option "I'm exploring what's possible with agents" leads to a dedicated exploration screen showing all four platforms with "Best for" labels and scenario-focused summaries. Back navigation and CTA to start the assessment. New `exploration_best_for` and `exploration_summary` fields in apa.yaml.
- **"Why not?" explainer** — when the top two platforms score within 2 points, a sentence inside the pair banner explains the decisive factor (e.g., "Copilot Studio edged out Foundry because..."). Uses `computeWhyNot()` delta algorithm.
- **Dynamic browser tab title** — tab shows "APA: [Platform] recommended" after assessment, reverts to "Agent Platform Advisor — Microsoft CAT" on restart.
- **sessionStorage persistence** — wizard answers survive page refresh. URL params take precedence. Schema drift detection silently discards stale data. Private browsing guard (try/catch).
- **YAML schema validation** — validates questions, scoring, recommendations, and meta.platforms after load. Errors shown in existing error section.
- **Clarity custom analytics** — 6 event tags: wizard_completed, fast_track, card_shared, card_url_loaded, temporal_change, platform.
- **Decision Card** — shareable summary card appears below the recommendation with platform name, score, key factors, and a "Share link" button that copies a URL encoding the user's answers. Recipients can visit the shared URL to see the recommendation directly (no wizard replay), or use `mode=wizard` to retake with pre-filled answers.
- **Temporal change detection** — shared URLs include the original recommendation date and platform. On revisit, if the recommendation has changed (because `apa.yaml` was updated), a banner explains what shifted.
- **Schema drift handling** — if `apa.yaml` adds or removes questions after a URL was generated, missing questions are scored as 0 and a note explains that criteria have been updated.
- **Recommendation nav bar** — links at the top of the results page to Recommendation, Also Consider (conditional), and Score Breakdown. Smooth-scrolls to each section.
- **Share anchor** — "📋 Share this recommendation" link below the primary card scrolls to the Decision Card.
- **Persona-specific tips** — new `persona_tips` field in `apa.yaml` recommendations. When a professional developer gets Copilot Studio, a tip about building agents in YAML with the VS Code extension is shown.
- **TODOS.md** — created with Playwright E2E, dark mode, and welcome grid mobile stacking items.
- **Two new assessment questions** — "How important is testing and evaluation?" (Q6) and "Does the agent need to remember users over time?" (Q7), bringing the total to 8 scored questions
- **Maturity guidance panel** on the results page — shows a four-stage progression (Individual → Team → Division → External) with the recommended platform's stages highlighted; content driven by new `maturity_guidance` section in `apa.yaml`
- **Browser history navigation** — each wizard step pushes a history entry so the browser Back/Forward buttons move between questions instead of leaving the site
- **Agent Builder early exit** — if the first 6 questions point to Agent Builder, the wizard skips the evaluation and memory questions (which don't apply) and goes straight to the recommendation
- **Implementation Guide** (step 5 of wizard) — per-platform pre-development and post-development checklists loaded from `apa.yaml`
- **Agent Structure Planning** (step 4 of wizard) — interactive component cards with checkboxes and notes fields; structure data defined in `apa.yaml`
- SVG icon system using Lucide stroke icons (`getIcon()` helper); replaces all emoji icons in structure data
- `structures` and `implementation` sections in `apa.yaml` for all four platforms
- Platform-specific structure titles rendered dynamically from YAML
- **Platform resource links** — each recommendation card now links to the corresponding page on microsoft.github.io/agent-resources (Copilot Studio, Foundry, M365 Copilot, Agent Builder). URLs are driven by `resources_url` in apa.yaml.
- **Score comparison panel** — "See how we scored this" toggle reveals animated score bars, fit badges, and a per-platform explanation of why it scored how it did. Shows Agent Builder, Copilot Studio, and Foundry (M365 Copilot excluded since it's only available via the shortcut path). Hidden on M365 fast-track path.
- **Accordion controls** — 1st Party Copilot Agents and Available Templates lists are now wrapped in collapsible `<details>` accordions with item counts, keeping recommendation cards compact by default.

### Changed
- **6 Agent Builder hard rules** — zeroes Agent Builder for q1c (professional developer), q2b (custom app), q2c (background), q3b (external systems), q3c (advanced data), q4c (multi-step tasks). Professional developers should be directed to Copilot Studio or Foundry, not a no-code tool.
- **Copilot Studio score for pro dev (q1c)** — 0 → 1. CS supports professional developers via YAML authoring and VS Code extension; a weak signal is more accurate than zero.
- **Foundry score for M365 deployment (q2a)** — 0 → 1. Foundry agents can be surfaced in Teams via custom bot frameworks.
- **Foundry score for simple Q&A (q4a)** — 0 → 1. Foundry can do Q&A via prompt flow; score of 1 acknowledges capability without encouraging overkill.
- **All hard rules shown** — `getKeyFactors()` and `getScoreReason()` now show every applicable hard rule for a zeroed platform, not just the first one found.
- **Score Breakdown always visible** — moved out of the accordion toggle; bar animations trigger automatically on render.
- **"Start Over" moved to bottom** — now appears below the Decision Card instead of mid-page.
- **Close-score threshold** — pair banner and "Why not?" threshold raised from 1 to 2 points.
- **Hard rules moved to YAML** — `HARD_RULES` and `HARD_RULE_LABELS` moved from JS constants to `apa.yaml scoring.hard_rules`.
- **DRY scoring helpers** — extracted shared `getContributions()` function, replacing duplicated iteration in `getKeyFactors()`, `getScoreReason()`, and `computeDecisionKeyFactors()`.
- **Dark mode CSS prep** — body gradient extracted to `--gradient-start/mid/end` custom properties; hardcoded `#fff` and `#107C10` replaced with `var(--card)` and `var(--success)`.
- **Page title** — changed from "Agent Platform Advisor" to "Agent Platform Advisor — Microsoft CAT".
- **Question wording updates** — all 5 question labels, prompts, and several option labels updated to match apa.md wireframes:
  - q1: prompt reworded; option q1b renamed from "IT professional or Power Platform user" to "Low-code maker or IT professional"
  - q8: prompt reworded for clarity
  - q2: label changed to "Where will users interact with this agent?"; prompt reworded
  - q4: label changed to "What should this agent do?"; prompt updated to direct users to select the most advanced task; all 4 option labels shifted to imperative tense
  - q3: label changed to "What information does this agent need to access?"; prompt reworded; q3a and q3c option labels updated ("Content in Microsoft 365", "Advanced or private data sources")
- **Assessment reduced from 8 to 5 questions** — removed q5 (technical customization), q6 (testing/evaluation), and q7 (memory/personalization); scoring thresholds recalibrated for new max score of 15 (5 × 3); removed q5d/q6c hard rules and early-exit logic from apa.js
- **Question order swapped** — "Where will users interact?" (q2) now appears before "What should this agent do?" (q4)
- **Scoring weights corrected** — adjusted platform weights across several questions for accuracy
- **"Both — internal and external" audience option removed from q8** — users needing both audiences should select "External users" since that's the binding constraint (Agent Builder and M365 Copilot can't publish externally regardless)
- **"M365" → "Microsoft 365"** — all user-facing references updated to the full product name.
- **index.html rename** — previous v1 index moved to `index-old.html`; v2 is now the default `index.html`.
- **Zero inline styles** — migrated all 20+ `style=` attributes from `index.html` to named CSS classes (`main-container`, `status-section`, `welcome-icon-wrapper`, `welcome-heading`, `prescreen-heading`, `assessment-nav`, `rec-actions`, etc.); HTML now has 0 inline styles (D-007)
- **Question order revised** for a more natural decision flow: Who is building → Who will use it → What does it do → Where → What data → How much customization → Evaluation → Memory
- **Recommendation copy enriched** from transcript analysis:
  - Copilot Studio: added 1,400+ connectors, MCP server support, agent-to-agent orchestration, built-in evaluation test sets; added watch-outs for limited model selection and no per-user memory
  - Microsoft Foundry: added memory as a service, full evaluation suite (auto/human/red teaming), lifecycle management (git/CI/CD/native versioning), OpenTelemetry + App Insights observability, cross-platform orchestration, AI gateway for cost control
  - Agent Builder: added watch-outs for no evaluation tools, no lifecycle management, minimal observability
- Scoring engine recalibrated — thresholds adjusted for 8 questions (max raw score 24)
- YAML version bumped to 1.1
- "AI Foundry" renamed to "Microsoft Foundry" throughout
- M365 Copilot excluded from custom agent path recommendations (prescreen fast-track now routes correctly)
- Progress bar updated to 5 steps: Welcome → Assessment → Recommendation → Structure → Implementation

### Fixed
- **Platform grid mobile stacking** — `.platform-grid` on the welcome screen now stacks to single column at ≤480px, matching the exploration grid's responsive behavior. Previously forced 2 columns at all widths below 768px, causing cramped ~170px cards on phones.
- **q8c dead reference** — removed non-existent `q8c` option from `hard_rules` condition in apa.yaml.
- **Platform chip label** — Decision Card now shows the human-readable platform name (e.g., "Copilot Studio") instead of the raw ID (`COPILOT_STUDIO`).
- **Question counter uses Geist Mono** — CSS class selector (`.question-counter`) didn't match the HTML `id` attribute; added class and moved inline styles to stylesheet (FINDING-001)
- **Option cards keyboard-accessible** — prescreen and assessment option cards now have `role="button"`, `tabindex="0"`, and Enter/Space keyboard handlers; assessment options also expose `aria-pressed` (FINDING-002)
- **Mobile header no longer cramped** — logo text shrinks to 16px at 375px, progress bar gets smaller font and shorter connectors to prevent wrapping to 3 lines (FINDING-003)
- **Platform preview titles explicit** — H3 titles set to 16px (body-lg token) instead of relying on browser default 18.72px (FINDING-004)
- **Color system unified** — replaced 4 raw `hsl()` / Tailwind color values with design system tokens: step-completed green → `#107C10`, selected option bg → `var(--primary-xlight)`, check icon → `#107C10`, next-steps card → `var(--primary-xlight/light)` (FINDING-005)
- **Fade-in easing corrected** — changed from `ease-in` (sluggish entry) to `ease-out` per DESIGN.md enter animation spec (FINDING-006)
- **Card shadow matches spec** — updated from Tailwind's `shadow-sm` to DESIGN.md's `shadow-md` (`0 2px 8px`) (FINDING-007)
- **Border radius 4-tier system** — expanded single `--radius: 8px` to `--radius-sm` (4px), `--radius` (8px), `--radius-lg` (12px), `--radius-full` (9999px) per DESIGN.md; cards use lg, buttons/inputs use sm, badges use full (D-005)
- **Badge colors use semantic tokens** — replaced Tailwind hex values with new `--success`, `--success-bg`, `--warning`, `--warning-bg` CSS variables mapped to DESIGN.md semantic palette (D-004)
- **Recommendation spacing on 4px grid** — snapped 6 off-grid values (6px → 8px, 14px → 16px, 28px → 32px) to the 4px base unit (D-003)
- **Type scale normalized** — snapped all font sizes to the 7-token scale: 13px → 12px (caption), 18px → 20px (subhead), 22px → 24px (heading), 28px → 24px (heading) (D-002)
- **DESIGN.md type scale updated** — question titles intentionally use display (32px) not subhead; spec updated to match implementation (D-001)
- `.center` changed from `display:block` to `display:flex` — button `gap` spacing now renders correctly (FINDING-001)
- Progress bar gained `flex-wrap:wrap` to prevent overflow on mobile viewports (FINDING-002)
- Implementation checklist `list-style:disc` removed — eliminates double bullets when checkboxes are present (FINDING-003)
- Structure and Implementation section titles reduced from 48px to 28px to match app hierarchy (FINDING-004)
- Added `:focus-visible` keyboard focus rings to `.btn` and `.option-card` (FINDING-005)
- Textarea placeholder text shortened (FINDING-006)
- Welcome screen sparkle icon replaced with Fluent SVG; robot emoji removed (FINDING-007)
- CSS variable system rebuilt and aligned with DESIGN.md tokens (FINDING-001–006, prior review)

### Removed
- **Maturity guidance section** — "Your platform choice will evolve" section removed entirely.
- **PNG download** — html2canvas produced low-quality output with washed-out colors; removed in favor of the shareable URL.
- **Dead code cleanup** — removed ICON_PATHS (38 lines), getIcon(), 244 lines of dead v1 CSS (checklist, structure, component, agent-types selectors), duplicate .question-subtitle selector, stale `meta.scale_max` and `meta.questions_count` from YAML, and `index-old.html` (2,875 lines).
- **CLAUDE.md duplicate** — removed duplicate "Key actions" section.
- **313 lines of dead v1 CSS** — 38 unused class definitions including v1 welcome section, v1 progress indicator (step-circle/label/connector), v1 recommendation styles, pre-built agents section, 18 unused icon classes, and their dead responsive/motion overrides (D-006)

---

## v1 — Initial release and iterative updates

### Added

- **Initial release** of the Agent Platform Advisor as a single-page HTML app with an interactive questionnaire, platform recommendation engine, agent structure planning, and implementation checklists
- **Deployment options question** — new 5th assessment question: "Where and how do you want users to access your AI agent?" with four deployment channel options and corresponding scoring logic
- **Pre-built agents section** — informational screen about Microsoft 365 Copilot pre-built agents with "Ask yourself" guidance prompts; added before the custom agent questionnaire flow
- **Back navigation from questionnaire** — pressing Back on the first question returns to the pre-built agents section instead of being disabled
- **OG meta tags** for social sharing (image, title, description, URL, author, publish date)
- **Templates mention** added to Copilot Studio Lite (Agent Builder) benefits: "Templates with design guidelines and best practices"
- **Favicon** added
- **Footer issue link** — "If you encounter a problem, please create an issue" with link to GitHub repo
- **"Assessment" → "Questionnaire"** label rename throughout progress bar and UI
- **Title shortened** from "Microsoft Agent Platform Advisor" to "Agent Platform Advisor"
- **Welcome copy revised** — heading changed to "Find the Right Microsoft Agent Platform for You"
- **Question and option text refined** — deployment descriptions, audience labels, and scoring reasons improved
- **Recommendation reasons expanded** — added business process automation reasoning for Azure AI Foundry suggestions
- **Checklist styling reworked** — switched from checkboxes to disc list items; removed interactive checkbox inputs
- **Removed Copilot Studio structure cards** for Fallback Handling and Entity Extraction
- **"Microsoft 365 Copilot Chat" → "Microsoft 365 Copilot"** platform name
- **Link added** to Microsoft 365 pre-built agents adoption page
- **Major code reformat** — full HTML/CSS/JS reformatted and restructured for consistency
- **Footer credit** linked to LinkedIn profile
- **Image paths switched** from absolute GitHub Pages URLs to relative paths
- **Product names updated** throughout (part of broader rename effort)
- **AI Foundry deployment description** updated — added on-premises options, fixed double-comma typo
- **Low customization option** copy updated to mention templates
- **Meta description** moved from empty to full descriptive text
- **"Copilot Studio full experience" → "Copilot Studio"** simplified name in platform cards and structure titles
- **Foundry icon updated**
- **Typo fix** — "development nad" → "development and" in target audience description