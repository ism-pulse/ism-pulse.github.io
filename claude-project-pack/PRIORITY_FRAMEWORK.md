# Priority framework — what matters this quarter

This document defines how Claude assigns a priority bucket to each in-scope
register item. It turns "here are 47 changes" into "here are the three you
need to act on this week and the five you need to plan for this quarter."

Priority is **not** a measure of control importance in the abstract. It is a
measure of action-pressure on **this** product, **this** quarter, given
**this** product's classification, current accreditation state and
assurance debt. The same control change can be P0 for one product and P3
for another.

## The four buckets

| Bucket | Meaning | Typical action window |
| --- | --- | --- |
| **P0 — Certification-blocking** | Action required before the SSP-A can be re-signed, or before the next IRAP assessment checkpoint. Not doing this is a material risk to accreditation. | Within 1–2 weeks. Escalate. |
| **P1 — This quarter** | Material control change affecting in-scope behaviour. Must be implemented and evidenced this quarter. | 4–8 weeks. Plan into BAU. |
| **P2 — Next quarter** | Clerical, low-impact, or deferable. Record and roll into the next quarter's planning. | 12 weeks or later. |
| **P3 — Watchlist** | Out-of-scope today; monitor in case classification, hosting or Essential Eight posture changes. | Review each quarter. |

## The triggers — in order

For each change, walk this list top-down. **The first rule that matches
sets the priority.** Stop there.

### P0 — Certification-blocking

A change is P0 if **any one** of the following is true:

1. **Rescinded control that was ticked "Implemented" in the baseline
   SSP-A.** This means the SSP-A is now asserting compliance against a
   control that no longer exists. The SSP-A must be resigned before any
   new evidence package is submitted.
2. **Rescinded control where the ASD rationale mentions merging or
   supersession without identifying the replacement.** The product may
   now be silently non-compliant against the replacement requirement.
3. **New or modified control that raises the Essential Eight maturity
   baseline for a maturity level the product currently claims.** If the
   product claims ML2 and the change adds a new ML2 control, the product
   must implement it or drop its ML2 claim.
4. **Modified control where the new `Description` narrows the scope in a
   way the product cannot meet today.** Example: a control that previously
   permitted quarterly review now mandates monthly review and the product
   is on a quarterly cycle.
5. **New mandatory control (CCM `Implementation Status` suggests the
   control is not optional) under an in-scope Guideline** that the product
   is clearly affected by — identified either from the product overview or
   from a matching Guideline already in scope.
6. **Control mapped to a data-sovereignty, Essential Eight identity, or
   foreign-access pillar** (see §3 below) where the change affects
   in-scope behaviour, and the operator's product handles PROTECTED or
   above.

P0 items must appear **first** in the register output, with a one-line
justification, and must be plotted on the burndown as "week 1 — escalate".

### P1 — This quarter

A change is P1 if it's not P0 and **any one** of the following is true:

1. **New control in scope under an in-scope Guideline.** Default "this
   quarter" bucket. Implement, evidence, close out.
2. **Modified control with a material wording change on an in-scope row.**
   "Material" = more than a typo / formatting / punctuation fix. If the
   new wording adds a new obligation (new control object, new frequency,
   new artefact), it's P1.
3. **Applicability drift on an in-scope row.** The classification
   applicability changed even though the control text didn't. The SSP-A
   likely needs a hand-update in the Applicability column.
4. **Possible rescission + re-issue pair** where the rescinded side was
   in scope. Review-and-confirm is P1 even if the new ID turns out to be
   P0 on confirmation.
5. **E8 evidence-lineage gap**: CCM says ML1/ML2/ML3 = Yes but SSP-A is
   silent on that claim. Either the SSP-A needs updating or the product's
   E8 maturity claim needs downgrading.

### P2 — Next quarter

A change is P2 if it's not P0 / P1 and **any one** of the following is
true:

1. **New or modified in-scope control with no operational impact.**
   Formatting, punctuation, or capitalisation changes to a row already
   implemented. Log it in the register, defer.
2. **Guideline-level pre-fill fired and the reviewer hasn't overridden.**
   Out of scope by rule; only revisit if the product's scope changes.
3. **Revision-only change** (`Revision` bumped but `Description`
   whitespace-identical) — rare, but sometimes ASD does it for admin
   reasons.

### P3 — Watchlist

Everything else in scope. Classification-excluded rows, row-level pre-fill
fired, principles-level changes that don't touch the product today.

These aren't "ignore" — they're "don't act unless something else changes"
(the product's classification envelope, its hosting platform, its
provider-responsibility mix).

## Tilts — additional weight on certain domains

Controls in the following domains get **one bucket upgrade** (P1 → P0, P2 →
P1, etc.) given the AU gov threat landscape as of 2026. These tilts are
not hard rules; they're acknowledgements that reviewer attention is
well-spent here.

### 3.1 Identity and access

Anything touching MFA, privileged access, session management, conditional
access, just-in-time / just-enough access, break-glass accounts, or
federation. The Optus / Medibank-era regulatory climate makes identity
changes the single most scrutinised ISM domain in AU gov.

### 3.2 Data sovereignty

Anything touching offshore processing, foreign-owned vendor access,
extraterritorial legal reach (CLOUD Act, US FISA, foreign intelligence
cooperation), jurisdictional assurance, regional failover. The ASD
Certified Cloud Services List and the PSPF's "data location" controls sit
here.

### 3.3 Essential Eight (identity + application control specifically)

The two pillars most often audited first. MFA and application control
changes within E8 typically move from P1 to P0 even if the product claims
only ML1.

### 3.4 Supply-chain / third-party

New or modified controls referring to subcontractors, sub-processors,
build pipelines, code-signing, SBOM, or shared-service providers. These
tend to land on customer-responsibility even when the underlying platform
does the work.

### 3.5 Incident response and logging

Changes to IR obligations, log retention, SIEM integration, notification
thresholds, or detection coverage. The ASD's Notifiable Data Breaches
scheme interactions mean any change here surfaces in regulatory reporting.

### 3.6 AI / machine learning (new in 2026)

Any change to how the ISM treats AI systems, training data handling,
model output assurance, or LLM integration. The ISM is still catching up
to AI / LLM threat models, so anything novel here gets reviewer attention.

## Classification weighting

| Product classification | Weight |
| --- | --- |
| OFFICIAL | No additional weight. |
| OFFICIAL: SENSITIVE | Identity + data-sovereignty tilts apply. |
| PROTECTED | All six tilts apply. Errors are harder to unwind post-accreditation. |
| SECRET | Apply all tilts. Additional weight on physical, personnel and supply-chain controls. |
| TOP SECRET | Apply all tilts. Escalate every P1+ to leadership in the first week. |

## Provider-responsibility weighting

For controls where `Provider Responsibility = Customer` or `Shared`, the
product team owns the action. These changes generally land at the
priority the matrix suggests.

For controls where `Provider Responsibility = Provider`, the upstream
platform is expected to handle it (Microsoft, Google, AWS, etc.). These
changes still appear in the register but can typically be P2 or P3 unless:

- The provider's last published assurance letter predates the change, and
- The operator's product is the one responsible for demonstrating the
  control in their own SSP-A.

In that case, the priority stays where the matrix put it, and the
justification records "provider action assumed — verify on next assurance
letter".

## 5. Posture-grounded adjustments

The framework so far assigns priority from **external** inputs — the
control change, classification, Essential Eight claim, provider
responsibility, industry signals. That produces a defensible default, but
it doesn't know whether *your* product has an open finding on the
capability in question, or whether you're already over-engineered beyond
the new baseline.

The posture brief (see `POSTURE_BRIEF_TEMPLATE.md`) closes that loop.
Apply it as a **final pass** after the default bucket and tilts have been
set. Each adjustment must be surfaced in the output's "Posture adjustments
applied" section — never silent.

### 5.1 Upgrade rules (bump priority up by one bucket)

A change is upgraded one bucket (P2 → P1, P1 → P0) if **any one** of the
following holds, drawn from the posture brief:

1. **Open finding on the touched capability.** The change lands on a
   Guideline / pillar / control area that has an open IRAP, pen-test or
   internal-audit finding. Justification: "posture upgrade — open
   <ref> on <area>".
2. **Known weakness.** The capability is listed under §5 of the brief
   (known control weaknesses / compensating controls). Justification:
   "posture upgrade — known gap on <area>".
3. **E8 actual below claim.** The CCM change affects an E8 pillar where
   the brief records *actual* maturity below *claimed* maturity.
   Justification: "posture upgrade — actual ML<n> below claimed ML<m>".
4. **Claimed-platform-but-actually-product.** The control is pre-filled
   platform-evidenced in the SSP-A but the brief §6 flags that the
   product actually demonstrates it. Justification: "posture upgrade —
   control mis-scoped in SSP-A, product is on the hook".

Upgrades stack with industry-signal tilts but do not compound beyond one
bucket total — a P2 with both a tilt and a posture upgrade lands at P0,
not "P0-urgent". The framework is buckets, not a continuous score.

### 5.2 Downgrade rules (bump priority down by one bucket)

A change is downgraded one bucket (P0 → P1, P1 → P2) if **all** of the
following hold:

1. **In-flight uplift closing the gap.** The brief §8 lists a workstream
   that will close or neutralise the change's intent before the end of
   the quarter, *and*
2. **No open finding or known weakness** on the touched capability, *and*
3. **No recent incident** reset the capability (brief §9).

Downgrades only apply to P0 → P1 or P1 → P2. Do not downgrade to P3 —
a change that appears in the delta still needs tracking, even if low.
Justification: "posture downgrade — in-flight uplift <name> completes
<date>, no open finding on area".

### 5.3 When the brief is silent on a capability

Default: **no adjustment**. A missing posture signal is not a downgrade.
Flag the silence explicitly in the output: "posture-neutral — brief
silent on <area>".

### 5.4 When no brief was supplied at all

Skip §5 entirely. Emit the abstract-priority disclaimer in the output
(see `OUTPUT_TEMPLATE.md §3`). Offer once, at the end of the output, to
re-run with a brief using `POSTURE_BRIEF_TEMPLATE.md`.

### 5.5 Audit requirements

Every posture-driven change to priority must be:

- **Explicit** — surfaced under "Posture adjustments applied", with
  direction (upgrade / downgrade), trigger (which brief section fired),
  and justification.
- **Reversible** — the default bucket is still recorded alongside so the
  reviewer can audit the adjustment and undo it if they disagree.
- **Conservative** — when posture evidence is ambiguous (e.g. "ML2 claimed,
  actual unknown"), do not adjust. Silence beats speculation.

## Output — what Claude produces

After applying this framework, output per the OUTPUT_TEMPLATE.md layout:

1. **Priority summary table.** Counts per bucket per kind.
2. **P0 list.** Identifier, one-line rationale, owner suggestion, action
   window.
3. **P1 list.** Same format, shorter.
4. **P2 / P3.** Counts and collapsible detail — the reviewer can ask to
   expand if they want.
5. **Tilts applied.** A short "these P1-to-P0 upgrades were driven by
   tilt rules" list, so the reviewer can audit the inference.

Never hide the pre-fill that fed into the priority. A change pre-filled
out-of-scope that lands P3 should say so. A change that the reviewer
already overrode in-scope should carry the override forward.

## What this framework is NOT

- **Not a threat-model.** Priority here is about action-pressure on a
  specific product, not on the Australian threat environment at large.
- **Not a risk assessment.** Risk ratings (Low / Medium / High /
  Critical) require the product's own risk register and cannot be
  automated from an ISM delta alone.
- **Not politically weighted.** A change that is P3 for a product will
  still be P3 regardless of how much air time a control gets in the
  Changes PDF.
- **Not static.** The tilts section (§3) and classification weighting
  (§4) need review each quarter as the threat environment shifts. Treat
  them as expected to change.

---

*See also: BURNDOWN_PLAYBOOK.md (once priority is assigned, when does it
get done?), INDUSTRY_SIGNALS.md (external context that may shift tilts),
METHODOLOGY.md (how the register got built in the first place).*
