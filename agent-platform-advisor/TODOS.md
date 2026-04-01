# TODOS

## Add Playwright E2E test infrastructure
**Priority:** Medium
**Context:** APA has 619+ lines of JS with zero automated tests. The Decision Card adds ~200 more. Manual testing won't scale as the codebase grows.
**What:** Add npm + Playwright. Create E2E tests for the 5 critical user flows: wizard completion, shared link loading, temporal change detection, fast-track path, and share/download buttons. Set up GitHub Actions CI.
**Why:** Catches regressions automatically. 25+ untested code paths need coverage.
**Depends on:** Decision Card feature should ship first (provides the most complex test surface).

## Add Clarity custom event tracking for APA user flows
**Priority:** High
**Context:** The Decision Card design doc's success criteria (#1-3) require measuring sharing and revisit behavior. Clarity is already loaded but only tracks page views.
**What:** Add Clarity custom event tags for: wizard completion, recommendation viewed, share button clicked, download button clicked, shared link loaded, temporal change banner shown. ~10 lines of code.
**Why:** Validates whether the Decision Card is actually used. Answers "do users follow the recommendation?" without user interviews.
**Depends on:** Decision Card feature (provides the events to track). Can be part of the same PR or a fast follow-up.

## Add dark mode support for Decision Card
**Priority:** Low
**Context:** DESIGN.md already specifies dark mode tokens. The Decision Card token mapping uses hardcoded light-mode colors.
**What:** When implementing the Decision Card, use CSS custom properties for colors/surfaces instead of hardcoded hex values. This makes dark mode migration trivial when APA dark mode ships.
**Why:** Future-proofs the card. If built with hardcoded colors, dark mode will require touching every color declaration.
**Depends on:** Decision Card feature ships first. Dark mode for APA is not yet planned.

## Fix welcome screen platform grid stacking on mobile
**Priority:** Low
**Context:** Discovered during design review — the exploration screen stacks to single column at 768px, but the welcome screen's `.platform-grid` forces `1fr 1fr` at 768px and never stacks. This creates inconsistent responsive behavior.
**What:** Add `@media (max-width: 480px)` rule to set `.platform-grid` to `1fr`. Four 200px-min cards in 2 columns at 375px width means each card is only ~170px wide — cramped.
**Why:** Consistent responsive behavior across screens; better mobile readability.
**Depends on:** Nothing — can be done independently.
