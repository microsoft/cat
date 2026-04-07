# TODOS

## ~~Add Playwright E2E test infrastructure~~
**Priority:** High — **DONE**
**Context:** APA has 619+ lines of JS with zero automated tests. The Decision Card adds ~200 more. Manual testing won't scale as the codebase grows.
**What:** Add npm + Playwright. Create E2E tests for the 5 critical user flows: wizard completion, shared link loading, temporal change detection, fast-track path, and share/download buttons. Set up GitHub Actions CI.
**Why:** Catches regressions automatically. 25+ untested code paths need coverage.
**Depends on:** Decision Card feature should ship first (provides the most complex test surface).

## ~~Add dark mode support for Decision Card~~
**Priority:** Low — **DONE** (Decision Card was built with CSS custom properties from the start; dark mode works automatically via `[data-theme="dark"]` token overrides.)
**Context:** DESIGN.md already specifies dark mode tokens. The Decision Card token mapping uses hardcoded light-mode colors.
**What:** When implementing the Decision Card, use CSS custom properties for colors/surfaces instead of hardcoded hex values. This makes dark mode migration trivial when APA dark mode ships.
**Why:** Future-proofs the card. If built with hardcoded colors, dark mode will require touching every color declaration.
**Depends on:** Decision Card feature ships first. Dark mode for APA is not yet planned.

## ~~Fix welcome screen platform grid stacking on mobile~~
**Priority:** Low — **DONE**
**Context:** Discovered during design review — the exploration screen stacks to single column at 768px, but the welcome screen's `.platform-grid` forces `1fr 1fr` at 768px and never stacks. This creates inconsistent responsive behavior.
**What:** Add `@media (max-width: 480px)` rule to set `.platform-grid` to `1fr`. Four 200px-min cards in 2 columns at 375px width means each card is only ~170px wide — cramped.
**Why:** Consistent responsive behavior across screens; better mobile readability.
**Depends on:** Nothing — can be done independently.
