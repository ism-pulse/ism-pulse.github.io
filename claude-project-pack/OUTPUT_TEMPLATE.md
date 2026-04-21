# Output template — what Claude produces on every review

This document defines the structure and format of Claude's response when
the operator uploads the quarterly files and asks for a review. The goal
is that every review looks the same: same sections, same order, same
column layouts. A reviewer looking at their tenth quarterly output should
know exactly where to find anything.

## Delivery mechanics

Produce the full review as a **single Markdown artifact** titled
`ISM Quarterly Review — <Product name> — <Target quarter>`. One artifact,
not eleven. The artifact renders inline and the operator can copy it into
Confluence, Word, or Excel in one action.

If the operator later asks for an xlsx version, produce it as a separate
file alongside the artifact.

Keep prose concise. Tables over bullets where data is tabular. No emoji.
No motivational language. No hype.

Start the artifact with the "Header and inputs" section and emit the
remaining sections in the order below. Do not reorder.

## 1. Header and inputs

```markdown
# ISM Quarterly Review — <Product name>

**Target quarter:** <e.g. June 2026>
**Baseline:** <e.g. March 2026 SSP-A> (or "<e.g. March 2026 CCM>" in CCM-vs-CCM mode)
**Review date:** <Today's date>
**Classification:** <OFFICIAL / PROTECTED / SECRET / TOP SECRET>
**Product overview:** <One to three sentences the operator supplied.>

---
```

This header anchors every output so the reviewer never has to ask "which
quarter is this?". It is also what the leadership summary pulls from.

## 2. Change counts

A compact table with one row per kind. No hero numbers, no design flair.

```markdown
## Change counts

| Kind | New | Modified | Rescinded | Total |
| --- | ---:| ---:| ---:| ---:|
| Controls | 8 | 12 | 3 | 23 |
| Principles | 1 | 2 | 0 | 3 |
| **Overall** | **9** | **14** | **3** | **26** |
```

If any count is zero, show 0 — not a dash.

## 3. Priority summary

This is the "what matters most" answer at a glance.

```markdown
## Priority summary

| Priority | Count | Description |
| --- | ---:| --- |
| P0 — Certification-blocking | 3 | Act this week, escalate to SO. |
| P1 — This quarter | 11 | Plan, implement, evidence by end of quarter. |
| P2 — Next quarter | 8 | Record, defer, roll into next-quarter backlog. |
| P3 — Watchlist | 4 | Out of scope today; monitor for scope expansion. |

**Tilts applied (industry signals):** identity (1 item promoted from P1 to
P0), data sovereignty (1 item promoted from P2 to P1).

**Posture adjustments applied:** 2 upgrades (ISM-0123 P1→P0 — open IRAP
finding FIND-2024-007 on break-glass; ISM-0456 P2→P1 — actual ML1 below
claimed ML2 on application control); 1 downgrade (ISM-0789 P1→P2 —
in-flight phishing-resistant MFA rollout completing end-Q3, no open
finding). Brief supplied by <author>, confidence <high/medium/low>.
```

Always include both footnotes, even if empty. "*No tilts applied this
quarter.*" and "*No posture adjustments applied — brief silent on all
touched capabilities.*" make the inference auditable.

### 3a. Abstract-priority disclaimer (when no posture brief was supplied)

If the operator did not supply a posture brief, insert this block
immediately after the priority summary table, before the P0 list:

```markdown
> **Priorities are abstract, not posture-grounded.** No current-posture
> input was supplied for this review. The buckets below reflect the
> control change against classification, Essential Eight claim, provider
> responsibility and industry signals only — not the product's actual
> security state. P0 items may be lower-risk in practice if the underlying
> capability is already over-engineered; P2 items may be higher-risk if
> the capability is known-weak. The reviewer should reconcile against
> their own posture knowledge before circulating. See
> `POSTURE_BRIEF_TEMPLATE.md` for the input Claude needs to ground these
> priorities.
```

Do not produce this disclaimer if a brief *was* supplied (even a partial
one). If the brief is partial, use the per-section "posture inputs used
/ missing" note below instead.

### 3b. Posture inputs used / missing (when brief is partial)

If the brief was supplied but some sections are marked "unknown" or blank,
add a short audit block after the priority summary:

```markdown
**Posture inputs used / missing:**

- Used: accreditation state, E8 actual on 5 of 8 pillars, open IRAP
  findings, in-flight uplift, platform-vs-product evidence split.
- Missing / unknown: E8 actual on application control, macro config,
  admin privileges; pen-test data (product has never run one).

Posture adjustments above rely on the "used" inputs. The "missing"
sections produce no adjustment (neither up nor down).
```

## 4. P0 list

The most important section. Reviewer attention drops after five rows, so
keep each row tight.

```markdown
## P0 — Certification-blocking

### ISM-0123 — New

- **Guideline:** Guidelines for Identity and Access Management
- **Topic:** Phishing-resistant MFA for privileged accounts
- **Why P0:** New mandatory control raising the ML2 baseline. Product
  currently claims ML2 on identity. **Posture upgrade (P1 → P0):** open
  IRAP finding FIND-2024-007 on break-glass accounts still unremediated,
  so this lands on a known-weak capability.
- **Pre-fill:** In scope = Yes, Triage = Review, source = Default.
- **Suggested owner:** Identity platform lead.
- **Burndown:** Week 1 — escalate to SO for immediate planning.

### PRO-04 — Rescinded

- **Guideline:** (Principles — no guideline)
- **Topic:** Secure by design
- **Why P0:** Rescinded principle was cited as evidence in the product's
  last IRAP report. SSP-A must be resigned before any new evidence
  package is submitted.
- **ASD rationale (Changes PDF):** "Merged into the existing cyber
  security principle on 'secure system lifecycle'." (Source: ISM
  Changes PDF, June 2026.)
- **Possible pair:** PRO-02 (new) — 72% similarity, 11 shared terms.
  Reviewer to confirm.
- **Burndown:** Week 1 — escalate, confirm pair, update SSP-A.
```

If there are no P0s, write a single line: "*No certification-blocking
changes this quarter. Three P1 items require this-quarter action — see
below.*"

## 5. P1 list

Same format as P0 but tighter. One paragraph per item, not a sub-section.

```markdown
## P1 — This quarter

- **ISM-0456 (Modified)** — Guidelines for System Monitoring, Topic
  "Centralised logging retention". New wording mandates 12-month hot
  retention (previously 7 months). In scope. Pre-fill Default; reviewer
  confirmation needed. Suggested owner: platform engineering. Burndown
  week 3–5.

- **ISM-0789 (New)** — Guidelines for Gateways, Topic "DNS filtering
  baseline". Applies to OFFICIAL and above. Pre-fill Default, In scope =
  Yes. Tilts applied: identity (no, this is network). Suggested owner:
  network lead. Burndown week 4–6.
```

One bullet per item. Don't over-explain.

## 6. P2 and P3 summary

Don't list every row. Summarise.

```markdown
## P2 — Next quarter (8 items)

Mostly formatting / punctuation fixes to in-scope controls; one
Guideline-level pre-fill confirmation. Full list available on request.

## P3 — Watchlist (4 items)

Out of scope given the product's current OFFICIAL classification envelope.
Revisit if the product's classification envelope changes to
OFFICIAL: SENSITIVE or above.
```

If the operator asks "show me the P2 list", expand inline in the next
response.

## 7. The register

The full table. This is what the operator copies into Excel. Column
order mirrors the HTML tool's Change Register.

```markdown
## Register

### Controls

| ID | Change | Guideline | Topic | Old text | New text | Prov. resp. | Impl. status | ML | In scope | Triage | Action | Owner / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ISM-0123 | New | Guidelines for Identity … | Phishing-resistant MFA … | (new this quarter) | Agencies must … | Customer | — | ML2 | Yes | Review | | |

### Principles

| ID | Change | Function | Topic | Old text | New text | Rescission reason |
| --- | --- | --- | --- | --- | --- | --- |
| PRO-04 | Rescinded | PROTECT | Secure by design | <verbatim> | (rescinded) | Merged into … |
```

Truncate `Old text` and `New text` to 400 characters inline. Offer to
"show full text for ISM-0123" on request.

**Important.** In scope and Triage are computed by the pre-fill rules in
METHODOLOGY.md §3 and are best-effort *suggestions*. The reviewer is
responsible for confirming or overriding each one before circulating the
register. Action and Owner / notes are left blank for the reviewer to fill.

## 8. Applicability drift

```markdown
## Applicability drift (scope changed but wording didn't)

4 controls have different classification applicability between the
baseline SSP-A and the current CCM. These won't appear in the delta above.

| ID | Baseline applicability | Current applicability |
| --- | --- | --- |
| ISM-0211 | OFFICIAL, PROTECTED | OFFICIAL |
| ISM-0307 | PROTECTED | OFFICIAL, PROTECTED |
| ISM-0544 | OFFICIAL | OFFICIAL, PROTECTED |
| ISM-0621 | PROTECTED, SECRET | SECRET |
```

If none, write "*No applicability drift detected.*"

If there are more than 10, show the top 10 and count the rest.

Skip this section entirely in CCM-vs-CCM mode.

## 9. Possible rescission + re-issue pairs

```markdown
## Possible rescission + re-issue pairs (heuristic)

2 possible pairs detected. Heuristic only — reviewer confirms.

| Rescinded ID | Possible new ID | Similarity | Shared terms |
| --- | --- | --- | --- |
| ISM-4242 | ISM-5050 | 68% | 9 |
| PRO-04 | PRO-02 | 72% | 11 |
```

If none, write "*No likely rescission + re-issue pairs detected in this
delta.*"

## 10. Essential Eight evidence lineage

Per METHODOLOGY.md §7. One table; a short corroboration summary.

```markdown
## Essential Eight evidence lineage

Evidence check for every E8 control in scope. "SSP-A corroborates CCM?"
flags any row where the SSP-A does not back up the CCM claim.

| ID | Guideline | Topic | CCM ML1 | SSP-A ML1 | CCM ML2 | SSP-A ML2 | CCM ML3 | SSP-A ML3 | SSP-A status | Corroborates? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ISM-0871 | Hardening | Application control | Yes | Yes | Yes | Yes | - | - | Implemented | Yes |
| ISM-0912 | Patch management | OS patching | Yes | - | - | - | - | - | — | No — SSP-A silent on ML1 |

**Summary.** 42 E8 controls in scope. 38 corroborated by the SSP-A. 3 with
gaps (SSP-A silent). 1 missing from the baseline SSP-A entirely.
```

If the product has no E8 claim, write "*Product does not claim Essential
Eight maturity — section skipped.*"

Skip this section's corroboration column in CCM-vs-CCM mode.

## 11. Industry signals this quarter

Per INDUSTRY_SIGNALS.md. Three to five dated, linked findings.

```markdown
## Industry signals this quarter

*Web search performed on <date>.*

- **ACSC Alert AA26-114 (April 2026).** ACSC flagged active exploitation
  of MFA push-notification fatigue targeting AU federal agencies. *Tilt:*
  identity controls remain P0-leaning this quarter.
  <https://www.cyber.gov.au/...>
- **ANAO Performance Audit 2026-12 (March 2026).** Auditor-General found
  three agencies retaining SIEM logs for under 90 days despite ISM
  guidance. *Tilt:* ISM-0456 (logging retention, P1) is in the auditor's
  line of sight this cycle. <https://www.anao.gov.au/...>
- *No signal found:* hyperscaler IRAP updates (Microsoft's latest
  PROTECTED assessment predates this ISM); PSPF protocol changes this
  quarter; Cyber Security Act amendments.
```

If web search is unavailable, emit the "*Industry signals skipped — web
search unavailable in this session.*" note.

## 12. Burndown

Per BURNDOWN_PLAYBOOK.md. Slot each P0 / P1 / P2 onto the 12-week
cadence.

```markdown
## Burndown

**Review started:** <anchor date from operator, or "today">.
**Current week:** 1 of 12.

### This week (week 1 — Triage and escalate)

- Confirm or downgrade the 3 P0s with the ITSA and SO.
- Escalate the PRO-04 rescission to the SO for Updated SSP-A signing.
- Publish the register to <channel>.

### Next two weeks (weeks 2–3)

- Scope confirmation for all P0 / P1 rows.
- Lock the Applicability column for each in-scope control.
- Planning: owners, dates, dependencies.

### Weeks 4–6 — Implementation sprint (planned)

- P0 implementations Evidenced.
- Half of P1 implementations In progress.
```

If the review is already running late (operator says "we started in week
4"), flag the slippage and compress the cadence:

```markdown
**Slippage detected — this review started in week 4 of the quarter.**
Weeks 1–3 compressed: triage, scope, and plan must all complete in the
next 7 days for the P0s to land by week 6.
```

## 13. Leadership summary

A one-paragraph prose block the operator can paste into an email or slide.

```markdown
## Leadership summary

This quarter's ISM refresh introduces 23 control changes and 3 principle
changes affecting <Product>. Three changes are certification-blocking:
a new phishing-resistant MFA control (ISM-0123), a retired "secure by
design" principle (PRO-04) that was cited in the last IRAP report, and a
tightening of logging retention from 7 to 12 months (ISM-0456). Eleven
items require this-quarter action. No applicability drift. Two possible
rescission + re-issue pairs are flagged for reviewer confirmation. The
Essential Eight evidence lineage identifies three SSP-A gaps that should
be remediated alongside this quarter's changes.
```

Prose, not bullets. Max 120 words. Name every P0 identifier. Do not hedge.

## 14. Reviewer caveat

Always present. Always last. Always the same wording.

```markdown
---

*This review is a decision-support artefact, not IRAP advice. The reviewer
is responsible for confirming each pre-fill, each priority placement, each
posture adjustment and each industry-signal interpretation before
circulating or acting. Posture adjustments are only as accurate as the
brief that drove them — if the brief is stale or partial, the priority
output is too. The methodology is documented in METHODOLOGY.md;
heuristics are described transparently in PRIORITY_FRAMEWORK.md (§2–§5)
and BURNDOWN_PLAYBOOK.md.*

*Generated by Claude Project: ISM Quarterly Review. Maintained by Gaurav
Vikash — https://www.linkedin.com/in/gauravvikash/.*
```

## Optional sections (only on request)

Do **not** include these by default. Produce them if the operator asks.

- **Full P2 list.** Expanded out of the P2 summary.
- **Full old text / new text.** Un-truncated for a specific identifier.
- **xlsx register.** Produce as a separate downloadable file; column
  layout mirrors the HTML tool's Change Register.
- **Stakeholder note.** Plain-text draft suitable for internal Slack /
  email / Teams. Leadership summary + owner assignments. One screen's
  worth.
- **Jira / Asana issue export.** One issue per P0 / P1 / P2 row, priority
  mapped, summary + description filled. Produce as CSV.
- **Updated SSP-A.** A re-written baseline with this quarter's changes
  folded in. Only if the operator asks and has the SSP-A uploaded.

## What not to include by default

- Author biographies, product disclaimers (beyond the reviewer caveat at
  the bottom), explanations of what the ISM is, or how the CCM is
  published. The operator already knows.
- The methodology in full. Reference METHODOLOGY.md by name once; don't
  reproduce it.
- Every possible heuristic. If a heuristic didn't fire, don't mention it.
- Emoji, decoration, praise for the reviewer ("great job on the scoping
  last quarter"). Professional tone throughout.

---

*See also: PROJECT_INSTRUCTIONS.md (the top-level workflow);
METHODOLOGY.md (delta rules); PRIORITY_FRAMEWORK.md (the priority
buckets in §3 above, and the posture-grounded adjustments surfaced in
§3 footnotes); POSTURE_BRIEF_TEMPLATE.md (the brief that grounds those
adjustments); BURNDOWN_PLAYBOOK.md (the cadence in §12 above);
INDUSTRY_SIGNALS.md (the signals in §11 above).*
