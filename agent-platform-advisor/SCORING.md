# Scoring System — Agent Platform Advisor

Reference document for how the APA scoring engine works. All data driven from `apa.yaml`.

## Platforms

| ID | Label | Description |
|---|---|---|
| `agent_builder` | Agent Builder | No-code agents within Microsoft 365 |
| `m365_copilot` | Microsoft 365 Copilot | Built-in Copilot experiences (fast-track path only) |
| `copilot_studio` | Copilot Studio | Low-code agents connecting to external systems |
| `foundry` | Microsoft Foundry | Full-code agents with custom AI models |

M365 Copilot is excluded from the scored assessment. It is only recommended via the prescreen fast-track path ("I want to enhance Microsoft 365 Copilot"). In the full wizard, `m365_copilot` is always zeroed.

## Questions and Scoring Matrix

Five questions, each scored 0–3 per platform. Max raw score: **15** (5 × 3).

### Q1 — Who is building this agent?

Sets persona weight. Determines whether the builder has the skills for each platform.

| Option | ID | Agent Builder | CS | Foundry |
|---|---|---|---|---|
| Business user / SME — no coding | q1a | **3** | 1 | 0 |
| Low-code maker / IT pro | q1b | 1 | **3** | 0 |
| Professional developer | q1c | 0 | 1 | **3** |
| Data scientist / ML engineer | q1d | 0 | 0 | **3** |

CS gets 1 for q1c because it supports pro developers via YAML authoring and VS Code extension.

### Q8 — Who will use this agent?

External-facing is a hard constraint that eliminates Agent Builder and M365 Copilot.

| Option | ID | Agent Builder | CS | Foundry | Hard Rule |
|---|---|---|---|---|---|
| Internal employees only | q8a | **3** | **3** | 1 | — |
| External users | q8b | 0 | **3** | **3** | Zeros AB, M365 |
| Not decided yet | q8d | 2 | 2 | 1 | — |

### Q2 — Where will users interact with this agent?

Deployment surface. Agent Builder can only run inside Microsoft 365.

| Option | ID | Agent Builder | CS | Foundry | Hard Rule |
|---|---|---|---|---|---|
| Inside Microsoft 365 apps | q2a | **3** | **3** | 1 | — |
| Custom app (website/mobile) | q2b | 0 | **3** | 2 | Zeros AB |
| Background (event-driven) | q2c | 0 | 2 | **3** | Zeros AB |
| Multiple / not decided | q2d | 1 | **3** | 2 | — |

Foundry gets 1 for q2a because Foundry agents can be surfaced in Teams via custom bot frameworks.

### Q4 — What should this agent do?

Single strongest discriminator between Copilot Studio and Foundry.

| Option | ID | Agent Builder | CS | Foundry | Hard Rule |
|---|---|---|---|---|---|
| Simple Q&A / lookups | q4a | **3** | **3** | 1 | — |
| Conversational (multi-turn) | q4b | 1 | **3** | 1 | — |
| Multi-step tasks | q4c | 0 | **3** | **3** | Zeros AB |
| Complex orchestration | q4d | 0 | 1 | **3** | Zeros AB, M365 |

Foundry gets 1 for q4a because Foundry can do Q&A via prompt flow.

### Q3 — What information does this agent need to access?

Data source requirements. Agent Builder can only access Microsoft 365 data.

| Option | ID | Agent Builder | CS | Foundry | Hard Rule |
|---|---|---|---|---|---|
| Microsoft 365 data | q3a | **3** | 2 | 0 | — |
| Business systems (CRM, etc.) | q3b | 0 | **3** | 2 | Zeros AB |
| Advanced / private data | q3c | 0 | 1 | **3** | Zeros AB |
| Mixed sources | q3d | 0 | **3** | 2 | — |

## Scoring Pipeline

### Step 1 — Hard rules (pre-sum)

Hard rules zero out platforms before scores are summed. They represent real platform limitations.

| Trigger | Platforms zeroed | Reason |
|---|---|---|
| q8b (external users) | AB, M365 | Cannot publish externally |
| q4d (complex orchestration) | AB, M365 | Requires Foundry |
| q4c (multi-step tasks) | AB | Cannot follow processes or take actions |
| q2b (custom app) | AB | Can only run inside Microsoft 365 |
| q2c (background) | AB | No event-driven capabilities |
| q3b (business systems) | AB | Can only access Microsoft 365 data |
| q3c (advanced data) | AB | Can only access Microsoft 365 data |

Additionally, M365 Copilot is always zeroed in the full assessment (hard-coded in JS).

### Step 2 — Sum raw scores

For each platform not zeroed: sum the scores from all answered questions. Range: 0–15.

### Step 3 — Threshold labels

| Score | Label |
|---|---|
| 12–15 | Strong fit |
| 8–11 | Good fit |
| 4–7 | Possible fit — review tradeoffs |
| 0–3 | Not recommended |

### Step 4 — Rank and recommend

Platforms are sorted by score descending. The highest-scoring platform is the primary recommendation. The second-highest is shown as "Also consider."

### Step 5 — Tie handling

When the top two platforms score within **2 points**, they're presented as a complementary pair with a rationale banner:

| Pair | Rationale |
|---|---|
| Copilot Studio + Foundry | Build in CS, extend with custom code in Foundry |
| M365 Copilot + Copilot Studio | M365 Copilot for end users, CS for customization |
| Agent Builder + M365 Copilot | AB for M365-native agents, M365 for extensibility |

A "Why not?" explainer identifies the single question where the winner most outscored the runner-up.

### Step 6 — Cross-question notes

Contextual warning banners when answer combinations are logically contradictory:

| Condition | Note |
|---|---|
| q2c + q4a | Background agent doing simple Q&A — contradictory |
| q8b + q2a | External users in M365 apps — external users can't access your tenant |
| q1a + q4d | Business user wants complex orchestration — requires dev skills |
| q1a + q3c | Business user needs advanced data sources — requires technical expertise |

### Step 7 — Winner-persona mismatch

When Foundry wins but the builder is a business user (q1a), a banner advises partnering with a development team.

## Distribution Analysis

Across all 768 possible answer combinations:

| Platform | Wins | % |
|---|---|---|
| Copilot Studio | 599 | 78.0% |
| Foundry | 159 | 20.7% |
| Agent Builder | 10 | 1.3% |

**Ties:** 70 combos (9.1%) — 68 are CS/Foundry, 2 are AB/CS.

### When Agent Builder wins

AB only wins in its narrow sweet spot: **business user or undecided persona, internal audience, M365 deployment, simple Q&A or conversation, M365 data**. All 10 winning combos share this profile.

| Combo | AB | CS | F |
|---|---|---|---|
| BizUser + Internal + M365 + SimpleQA + M365Data | **15** | 12 | 3 |
| BizUser + Internal + M365 + Converse + M365Data | **13** | 12 | 3 |
| BizUser + Internal + Multiple + SimpleQA + M365Data | **13** | 12 | 4 |
| BizUser + Undecided + M365 + SimpleQA + M365Data | **14** | 11 | 3 |
| BizUser + Undecided + M365 + Converse + M365Data | **12** | 11 | 3 |
| BizUser + Undecided + Multiple + SimpleQA + M365Data | **12** | 11 | 4 |
| ProDev + Internal + M365 + SimpleQA + M365Data | **12** | 12 | 6 |
| ProDev + Undecided + M365 + SimpleQA + M365Data | **11** | 11 | 6 |
| MLEng + Internal + M365 + SimpleQA + M365Data | **12** | 11 | 6 |
| MLEng + Undecided + M365 + SimpleQA + M365Data | **11** | 10 | 6 |

The last four (ProDev/MLEng) are technically correct — even a developer building a simple Q&A bot on SharePoint data should consider Agent Builder. The scenario is simple enough that full code platforms would be overkill.

### When Foundry wins

Foundry wins when answers include any combination of: pro dev or ML persona (q1c/q1d), background deployment (q2c), complex tasks (q4c/q4d), or advanced data (q3c). Its strongest signal comes from persona + task complexity.

### Copilot Studio dominance

CS wins 78% of combinations because it scores 2–3 on almost every option. It's the most versatile platform — usable by low-code makers, deployable anywhere, and capable of multi-step tasks. This distribution is intentional: CS is the default recommendation unless the user's needs clearly require Foundry's full-code capabilities or fit entirely within AB's narrow scope.

### Score ranges when winning

| Platform | Min | Max | Avg |
|---|---|---|---|
| Agent Builder | 11 | 15 | 12.5 |
| Copilot Studio | 8 | 15 | 11.9 |
| Foundry | 9 | 15 | 11.9 |

No combination produces a "best platform" below 8, so every user gets at least a "Good fit" recommendation.

## Cross-question note frequency

| Note | Combos | % |
|---|---|---|
| Background + SimpleQA | 48 | 6.2% |
| External + M365Apps | 64 | 8.3% |
| BizUser + Orchestrate | 48 | 6.2% |
| BizUser + AdvData | 48 | 6.2% |
| Foundry + BizUser (persona mismatch) | 12 | 1.6% |

Notes are not mutually exclusive — a single combo can trigger multiple notes.
