# Burndown playbook — 12-week quarterly cadence

This document defines the cadence for working through a quarterly ISM
refresh so the operator is never caught out by the next one. It turns the
priority matrix into dated commitments.

The playbook assumes the operator starts work in **week 1 of a 13-week
quarter** — ASD publishes the refresh, the operator reviews it, and the
next refresh lands at the end of week 13. Slippage is normal; the
playbook flags it explicitly rather than silently compressing.

## The seven states

Every P0 / P1 / P2 item moves through the same sequence of states. The
burndown is a tally of how many items are in each state at any point.

| State | Definition |
| --- | --- |
| **Triaged** | The item is on the register and has been placed in a priority bucket. |
| **Scoped** | The reviewer has confirmed or overridden the pre-fill. In-scope / out-of-scope is final. |
| **Planned** | An owner is assigned, a due-date is set, the implementation approach is chosen. |
| **In progress** | Implementation or evidence work has started. |
| **Evidenced** | The change is implemented and evidence is captured in the SSP-A or the evidence repository. |
| **Signed off** | An authorised reviewer (ITSA / SO / IRAP contact) has signed off that the change is complete. |
| **Closed** | The SSP-A is updated, the register row is marked closed, the change is visible to the next quarter's diff. |

A P3 (watchlist) item goes Triaged → Closed without moving through the
middle states. Its "closed" state is "recorded and deferred".

## The 12-week cadence

Counts are rough guides — adjust based on product complexity and the
quarter's volume of changes. The key is that each week has a dominant
purpose the team can hold itself to.

### Week 1 — Triage and escalate

**Goal.** Every register item has a priority. Every P0 has an owner and
an escalation path.

**Activities.**

- Run the review through the tool (or this Claude Project).
- Walk each P0 with the ITSA, SO and product owner; confirm or downgrade.
- Escalate any genuine P0s that need executive attention in the first
  week.
- Publish the register to a channel everyone can see.

**Exits.** Every P0 and P1 is Triaged. Every P0 has a named owner.

**Common slippage cause.** The register is built but no one walks the
P0s — they sit as "critical" on a spreadsheet for three weeks.

### Week 2 — Scope confirmation

**Goal.** Every in-scope pre-fill is confirmed or overridden.

**Activities.**

- For each P0 / P1 row, the reviewer reads the old text and the new text
  side by side and decides whether the pre-fill is correct.
- For each Guideline-level pre-fill out-of-scope, sanity-check that the
  Guideline really is still out of scope (classification envelope
  unchanged, no new platform component brings it in).
- For each possible rescission + re-issue pair, confirm or dismiss.
- Lock the Applicability column for each in-scope control — this is what
  the new SSP-A will carry forward.

**Exits.** Every P0 and P1 is Scoped. The Updated SSP-A draft is ready
for planning.

### Week 3 — Planning and sequencing

**Goal.** Every in-scope P0 and P1 has a named owner, a due date, and a
sequenced dependency chain.

**Activities.**

- Owners estimate implementation effort for each item (engineering,
  evidence, control design).
- Sequence dependencies — some changes have to land before others (e.g.
  a new logging control depends on log-retention retention uplift first).
- Identify items that need architectural review, security architecture
  review board sign-off, or external approvals.
- Lock the implementation plan with the SO / project delivery lead.

**Exits.** Every P0 and P1 is Planned. P2 items have a "next quarter"
label.

### Weeks 4–6 — Implementation sprint

**Goal.** P0 items are Evidenced. P1 items are In progress.

**Activities.**

- Engineering implements new / modified controls.
- Evidence capture happens in parallel — logs, config screenshots,
  process documents, training records, whatever the control requires.
- Owners update the register inline as each item progresses.
- Weekly stand-up reviews the burndown: how many P0s moved from Planned
  → In progress → Evidenced? Any stuck?
- If a P0 is at risk of slipping past week 6, re-escalate.

**Exits.** All P0s Evidenced. At least half of P1s In progress.

### Weeks 7–8 — P1 completion + evidence consolidation

**Goal.** All P1 items Evidenced. Evidence is consolidated for sign-off.

**Activities.**

- Engineering closes out remaining P1 implementations.
- Evidence is reviewed for completeness — an external assessor should
  be able to read the artefact and trace the control.
- Gaps in evidence are filled — retro-screenshots, retro log extracts.
- Start drafting the Updated SSP-A with all confirmed scoping
  decisions.

**Exits.** All P1s Evidenced. Updated SSP-A v0.9 ready for sign-off.

### Weeks 9–10 — Sign-off

**Goal.** All P0 / P1 items Signed off. Updated SSP-A is signed.

**Activities.**

- The ITSA / SO / authorising officer walks the Updated SSP-A end-to-end
  and signs it.
- The IRAP contact reviews the quarter's delta and confirms no re-
  assessment trigger was hit.
- Any P0 that required executive sign-off is actioned.
- Leadership summary is produced and circulated.

**Exits.** All P0 / P1 items Signed off. Updated SSP-A published. Evidence
repository updated.

### Weeks 11–12 — Closure and next-quarter prep

**Goal.** Every register item is Closed. The operator is ready for the
next quarter.

**Activities.**

- The register is archived as the quarter's artefact of record.
- P2 items are rolled into a "next quarter" backlog — they become the
  starting backlog for the week 1 triage of the next cycle.
- Continuous monitoring and evidence-refresh jobs are scheduled for
  controls whose evidence expires (e.g. pen-test results).
- Any residual risks that came out of the quarter are logged in the
  product risk register.
- The team does a 30-minute retrospective — what slipped, what was
  slower than planned, what to do differently.

**Exits.** All register items Closed. Next quarter's backlog seeded.
Retrospective captured.

### Week 13 — Buffer

The next CCM lands. Use this week to re-read it before starting week 1
of the new cycle. If the previous quarter slipped, this is where the
catch-up happens.

## Slippage handling

The real world:

- Quarterly refreshes often overlap. You'll sometimes be in week 10 of
  quarter N and week 1 of quarter N+1 simultaneously.
- Some quarters have trivial deltas (10 changes, no P0s). Don't force
  full cadence on them — collapse weeks 4–8 if no one has material work.
- Some quarters have heavy deltas (100+ changes, 5+ P0s). Don't pretend
  they'll fit a 12-week cadence. Carry items forward explicitly with an
  "overflow" label rather than quietly dropping state.

**Rule.** Never mark an item Closed if its evidence isn't captured. A
closed item without evidence is audit debt.

## What Claude emits

When the operator runs a review, Claude produces a burndown section in
the output that:

1. Plots each P0 / P1 / P2 item on the cadence (which week it's
   currently in — `Triage` at week 1, etc.).
2. Shows the "expected state" for today's date given when the review
   started.
3. Flags any item whose current state is behind the expected state for
   the week.
4. Produces a short next-week action list ("this week: move these three
   P0s from Planned to In progress").

If the operator gives Claude a "the review started on <date>" anchor,
Claude can compute the week number. Without an anchor, Claude assumes
the review is happening on week 1 of the quarter and says so.

## What this playbook is NOT

- **Not an SDLC.** This is ISM-refresh cadence, not software delivery.
  Actual implementation follows the operator's normal delivery process.
- **Not a SLA with ASD.** ASD publishes quarterly; they don't mandate
  the operator's response cadence. The 12-week cadence is a working
  heuristic, not a regulatory obligation.
- **Not the operator's only project.** The register is one stream of
  work. Don't assume the owner of a P1 item has zero other priorities.
- **Not a replacement for change management.** Every implementation
  still goes through the operator's change-advisory process — this
  playbook doesn't bypass it.

## Integrating with the operator's existing tooling

If the operator uses Jira / Asana / Monday, Claude can produce a
backlog-compatible export (one issue per register item, priority set,
description = change summary + rationale, component = Guideline). Ask
before producing; it's only useful if they actually want the issues
created.

---

*See also: PRIORITY_FRAMEWORK.md (how items get their P0 / P1 / P2 /
P3 bucket before landing on this cadence); METHODOLOGY.md (how the
register got built); OUTPUT_TEMPLATE.md §12 (how the burndown appears
in the output).*
