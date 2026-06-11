---
name: answer-shaped-content
description: |
  Rewrites policy, procedural, or compliance text into direct, "answer-shaped"
  responses that an AI agent can safely give to an end-user. Converts hedged,
  abstract policy wording into decisive Yes/No answers with explicit conditions,
  allowed/not-allowed boundaries, required approvals, and next steps.
  Use when the user provides policy or procedural text and asks to "make this
  answer-shaped", "rewrite this policy as an answer", "turn this into a clear
  answer", "make this user-facing", "de-jargon this policy", "convert this to a
  direct answer", or pastes policy/handbook/HR/compliance text and wants it
  rephrased decisively.
  Do NOT use for: drafting original policy, summarizing meetings (use
  meeting-intel), writing stakeholder updates (use stakeholder-comms), or
  general document creation (use docx).
cowork:
  category: writing
  icon: Sparkle
---

# Answer-Shaped Content Rewriter

Convert policy-shaped writing into user-answer-shaped writing: direct, decisive,
low-ambiguity responses an AI agent can give an end-user without further interpretation.

## When NOT to Use

- Writing new policy from scratch — this skill rewrites existing text only
- Meeting summaries (use meeting-intel), leadership updates (use stakeholder-comms)
- Tasks where the user wants the original policy *preserved verbatim*

## Workflow

1. **Read the source text** the user provides. If they reference but don't paste
   the policy, ask them to paste it (or look it up in their files if named).
2. **Identify the core question** the policy answers from an end-user's point of
   view (e.g. "Can I work from another country?").
3. **Rewrite** following the rules below.
4. **Return the rewritten answer inline** — no file unless the user asks for one.
   For multiple distinct policies, produce one answer block per policy.

## Rewrite Rules

- **Lead with a direct verdict**: "Yes", "No", "Only if…", "Usually not — unless…".
- **Resolve implied meaning into explicit conditions.** State the actual rule, not
  the abstraction.
- **Replace policy wording with user-facing guidance.** Strip these and convert
  them to concrete outcomes:
  | Avoid | Convert to |
  |-------|-----------|
  | "generally" / "normally" | the actual default outcome |
  | "may" | "can" (if allowed) or "cannot" (if not) |
  | "employees are expected to" | "you must" |
  | "should consult" | "contact [team] before you…" |
  | "depending on" | the explicit condition that decides it |
- **Make four things explicit** in every answer:
  1. What **is allowed**
  2. What is **not allowed**
  3. What **approval** is required (and from whom)
  4. What the user **must do next**
- **Preserve the original intent and restrictions** — do not loosen or invent rules.
- **Do not merely restate** the source text or mirror its structure.
- **If the source references other policies**, summarize the practical implication
  ("this also requires manager sign-off") instead of naming the document.

## Tone

Professional, concise, decisive. Optimize for clarity, low interpretation burden,
and minimal ambiguity. Assume the output is read by an AI agent answering an
end-user directly.

## Example

**Source:**
> "Employees are generally expected to perform their work in the country where
> they are employed…"

**Answer-shaped:**
> "No — you cannot normally work from another country unless the travel is for an
> approved business purpose. Contact HR before making any arrangements to work
> abroad."

## Guardrails

- Never invent rules, approvers, or conditions not present in or directly implied
  by the source. If the source is silent on approval or next steps, say so
  ("the policy doesn't specify who approves this — confirm with your manager")
  rather than fabricating a name or team.
- If the source is genuinely ambiguous and can't be resolved into a clear verdict,
  state the ambiguity plainly instead of forcing a false "Yes/No".
