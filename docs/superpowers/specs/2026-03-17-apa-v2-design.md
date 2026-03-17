# Agent Platform Advisor v2 — Design Spec
Date: 2026-03-17

## Overview

Replace the empty `agent-platform-advisor/index.html` with a new version of the Agent Platform Advisor tool. The new tool uses `apa.yaml` as its data source (fetched and parsed at runtime), replaces the v1 hardcoded 4-question scoring matrix with the 8-question matrix defined in the YAML, and focuses exclusively on the assessment → recommendation flow. The Agent Structure Planning and Implementation Checklist sections from v1 are out of scope and will be rebuilt separately.

## Files

- **Create:** `agent-platform-advisor/index.html`
- **Read:** `agent-platform-advisor/apa.yaml` (fetched at runtime, not modified)
- **Reference:** `agent-platform-advisor/index_v1.html` (visual style source, not modified)

## User Flow

1. **Welcome** — hero intro with tool name, brief description, and "Get Started" button
2. **Pre-screen** — single yes/no question: "Are you looking for a built-in Microsoft 365 Copilot experience?" Yes fast-tracks to an M365 Copilot recommendation (see Fast-track Recommendation below); No proceeds to the 8-question assessment
3. **Assessment** — 8 questions from apa.yaml rendered one at a time. Each question shows its `prompt` text and radio-style option cards. Prev/Next navigation; Next is disabled until an option is selected. On the final question, Next becomes "Get Recommendation"
4. **Recommendation** — displays top platform + 2nd choice with explanation (see Recommendation Screen below)
5. **Restart** — returns to Welcome, clears all state

Progress indicator across the top renders three nodes: **Welcome · Assessment · Recommendation**. Welcome/Pre-screen screens show node 1 as active. Assessment questions show node 2 as active. The Recommendation screen shows node 3 as active (nodes 1 and 2 marked complete). This differs from v1's four-step bar; the new labels and count reflect v2's reduced scope.

## Data Loading

- Fetch `./apa.yaml` using the Fetch API on page load
- Parse with `js-yaml` loaded from CDN: `https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js`
- Show a loading spinner while fetching; show an error message if fetch or parse fails
- All questions, scores, options, hard rules, tiebreaker config, thresholds, and recommendation copy come from the parsed YAML — nothing is hardcoded in JS

## Scoring Engine

Runs after the user completes all 8 questions (or is fast-tracked via pre-screen).

### Note on hard rule implementation
The YAML `effect` field is human-readable prose and is not machine-parsed. The hard rule *triggers* (which option IDs have `hard_rule_trigger: true`) and *effects* (which platforms get zeroed or capped) are hardcoded in JS as a lookup table keyed on option ID. The "all data from YAML" principle applies to questions, prompts, options, scores, thresholds, and recommendation copy — hard rule effects are the one exception.

Complete JS hard rule lookup table (option ID → platforms zeroed/capped):
- `q4d`: zero `agent_builder`, zero `m365_copilot`
- `q5d`: zero `agent_builder`, zero `m365_copilot`, zero `copilot_studio`
- `q6c`: zero `agent_builder`, zero `m365_copilot` (copilot_studio is NOT zeroed)
- `q8b`: zero `agent_builder`, zero `m365_copilot`
- `q8c`: zero `agent_builder`, zero `m365_copilot`

### Step 0 — Early exit for q5d
If the user selects option `q5d` (Full control — bring your own model), immediately score and show the recommendation after they click Next on Q5, skipping questions 6–8. The q5d hard rule zeros agent_builder, m365_copilot, and copilot_studio (see lookup table above). The tiebreaker step is skipped entirely when Q7 was not answered due to early exit.

### Step 1 — Hard rules (pre-sum)
Scan all selected options for `hard_rule_trigger: true`. For each triggered option, apply the hardcoded rule effect (zero out or cap the specified platforms). Multiple hard rules stack (e.g. if both q4d and q8b were selected, their zero-outs accumulate).

### Step 2 — Sum raw scores
For each platform, sum the score values from all answered questions, after hard rule overrides are applied.

### Step 3 — Tiebreaker
If the top two platform scores are within 2 points of each other, multiply Q7's selected option scores by 1.5 and re-sum all scores. Final scores are rounded to the nearest integer before comparison and threshold mapping.

### Step 4 — Threshold label
Map the top platform's final (rounded) score to a recommendation strength label:
- 18–24: Strong fit
- 12–17: Good fit
- 6–11: Possible fit — review tradeoffs
- 0–5: Not recommended

### 2nd Choice & Tie Handling
The platform with the second-highest final score is always shown as a second card. The card label is "Also consider:" unless the top two scores are within 1 point AND the platform pair appears in `apa.yaml`'s `tie_handling.valid_pairs`, in which case the label changes to "Complementary platform:". If no matching pair entry exists for a within-1-point result, the label stays "Also consider:" with no rationale banner.

### Key Factors (Why Explanation)
For each of the top two platforms, generate 2–3 key factor bullets:
- Find the questions where the user's selected option scored highest for that platform
- Surface the question label + selected option label as a bullet
- If any hard rule fired that affected this platform, always include it as a factor (e.g. "Strict compliance requirements — Foundry is required for sovereign cloud or regulatory mandates")

## Fast-track Recommendation (pre-screen Yes path)

When the user selects Yes on the pre-screen, no scoring is run. The Recommendation Screen is shown with:
- Primary card for `m365_copilot` using the YAML recommendation copy (headline, summary, best_for, watch_out_for)
- No threshold badge (score is not computed)
- No "Why this was recommended" key factors section
- No second-choice card
- A note in place of the second card: "If you need more customization, try the full assessment"
  with a button that starts the questionnaire (goes to Assessment, step 1)

## Recommendation Screen

### Primary card (top, prominent)
- Platform icon image + platform name + threshold label badge (color-coded: green for Strong fit, blue for Good fit, yellow for Possible fit, gray for Not recommended)
- Summary text from `recommendations.[platform].summary`
- "Why this was recommended" section: 2–3 key factor bullets
- "Best for" list from `recommendations.[platform].best_for`
- "Watch out for" list from `recommendations.[platform].watch_out_for`

### Complementary pair banner (conditional)
Shown between the two cards only when scores are within 1 point and a valid pair entry exists. Displays the pair rationale text from apa.yaml.

### Second choice card (below, de-emphasized)
- Labeled "Also consider:" normally; label changes to "Complementary platform:" only when scores are within 1 point AND a valid pair entry exists in apa.yaml
- Same structure as primary card but visually smaller/lighter
- No threshold badge

### Footer area
- "Start Over" button (returns to Welcome)
- Footer credit line matching v1: "Developed by Robert Standefer & Vasavi Bhaviri Setty"

## Visual Design

Follows `index_v1.html` exactly:
- Font: Segoe UI via Google Fonts
- CSS custom properties for colors (same variable names as v1)
- White card backgrounds with border, blue primary color (`hsl(210, 100%, 50%)`)
- `border-radius: 8px` on cards and buttons
- Fade-in transitions between sections (`.fade-in` class + `hidden` toggle)
- Progress indicator bar across the top
- Same button styles: `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- Platform icons reuse existing images: `../images/m365-copilot-logo.png`, `../images/copilot.png`, `../images/copilot-studio.png`, `../images/ai-foundry.png`

## Error States

- **YAML load failure:** Show an inline error message in place of the assessment with a retry button
- **No recommendation possible** (all platforms zeroed by hard rules): Should not occur given the YAML data, but if it does, show a fallback message suggesting they contact the CAT team

## Out of Scope

- Agent Structure Planning section (v1 step 4)
- Implementation Checklist section (v1 step 5)
- Word/RTF export
- Dark mode toggle
- Analytics/tracking scripts (keep existing gtag/Clarity tags from v1 head)
