# Methodology — ISM Quarterly Review

This document defines the deterministic rules Claude must apply when computing
a quarterly ISM delta from an uploaded SSP-A and CCM. Every rule has a single
purpose: produce a register the reviewer can audit without needing to re-read
the source files themselves.

When in doubt between two readings, choose the reading that produces a more
visible, flag-raising result. Silent failures are the enemy.

## 0. Assumptions about the inputs

Every deterministic rule in this document depends on the following
assumptions about the uploaded artefacts. If any assumption is untrue for
the product being reviewed, Claude must surface the violation in the
cross-validation themes panel rather than silently absorbing it.

| Assumption | Why it matters | Detection hook |
| --- | --- | --- |
| **SSP-A is a complete baseline.** Every ISM control in force when the SSP-A was finalised is present, including Not-Applicable rows. | The delta treats identifiers that appear in the current CCM but not in the baseline as **New**. If Not-Applicable rows were deleted from the SSP-A rather than marked NA, they will reappear in the current CCM with no match and inflate the New count. | If the computed New count is disproportionately high relative to ASD's published change count for the quarter, flag this assumption in the themes panel and ask the reviewer to confirm the SSP-A was not pruned. |
| **Identifiers are stable across quarters.** ASD does not rename a control unless it is rescinded and re-issued. | Matching is by identifier. A rename produces a false Rescinded + false New pair. | The possible-rescission-pair detector flags candidate pairs (Jaccard ≥ 0.35, ≥ 3 shared content words) as hints; it does not auto-link them. |
| **Applicability changes are accompanied by description changes.** Material updates touch both columns. | Modified detection runs on description text only. An applicability-only change produces no Modified flag. | The applicability-drift check surfaces rows whose description is unchanged but whose applicability labels differ between baseline and current CCM. |
| **Previous-quarter scoping is still valid.** Row- and Guideline-level pre-fills come directly from the baseline SSP-A. | If the product's architecture has changed since sign-off, pre-filled Not-Applicable decisions may be stale. | The Change Register records the reviewer's final In-scope/Triage decision, making any override visible on the artefact. Claude must prompt the reviewer in the posture brief to revisit pre-fills after any architectural change. |
| **Essential Eight maturity labels live in the CCM's `ML1` / `ML2` / `ML3` columns.** | The E8 Snapshot and E8 Evidence tabs read these columns by name. | The startup self-test catches gross schema drift. Subtle E8 column restructuring must be spot-checked against expected controls. |
| **Quarter labels follow the ASD sheet-name convention** (e.g. `Controls - March 2026`). | Used for display-only meta; not for matching. | A custom-renamed sheet produces a blank baseline-quarter label; matching is unaffected. |

## 1. File parsing

### 1.1 Workbook structure

Both the SSP-A and CCM follow the ASD / ACSC Cloud Controls Matrix template.
Expect at minimum:

- A `Controls` sheet (sometimes named `Controls - <Quarter> <Year>`, for
  example `Controls - June 2026`). If the name ends in a month and year,
  use that as the quarter label.
- A `Principles` sheet (same naming convention).
- Possibly an `Info` / `Information` / `Pivot` tab — ignore these for delta
  computation. They do not contribute to scoping.

### 1.2 Header detection

The first row of each sheet may be a merged banner row ("Cloud Controls
Matrix — June 2026"). The real header row is the first row that contains
an `Identifier` column. Tolerate up to two lead-in rows before the header.

### 1.3 Expected columns

At minimum:

| Column | Required? | Notes |
| --- | --- | --- |
| `Identifier` | Yes | ISM control ID (e.g. `ISM-0123`) or principle prefix (e.g. `PRO-02`). |
| `Revision` | Controls only | Integer. `0` for newly minted controls. |
| `Updated` | Controls only | Quarter label, e.g. `June 2026`. |
| `Guideline` | Controls only | Used for guideline-level scoping. |
| `Topic` | Yes | Short human label. |
| `Description` | Yes | The actual control / principle text. |
| `Provider Responsibility` | Controls only | Customer / Shared / Provider / Not Applicable. |
| `Implementation Status` | Controls only | Implemented / Not Implemented / Not Applicable / etc. |
| `Applicability` | Controls only | Classification list — OFFICIAL, PROTECTED, SECRET, TOP SECRET (often abbreviated). |
| `ML1`, `ML2`, `ML3` or `Essential 8 ML1`, `Essential 8 ML2`, `Essential 8 ML3` | Controls only | `Yes` values mean the control contributes at that maturity level. |

Principles carry `Identifier`, `Topic`, `Description` and optionally
`Applicability`. They do not carry `Guideline`, `ML*` or `Provider
Responsibility`.

If a required column is missing, stop and ask the operator. Do not fabricate
values.

## 2. Delta computation

### 2.1 Normalising text

Before comparing descriptions, collapse all whitespace runs to a single
space and trim leading / trailing whitespace. This is the only normalisation
applied. Do **not** lowercase, strip punctuation or "smart-quote" correct —
those changes sometimes matter for ISM wording.

### 2.2 Classification

For each identifier:

| Condition | Change type |
| --- | --- |
| In current CCM, not in baseline | **New** |
| In both, normalised `Description` differs | **Modified** |
| In both, normalised `Description` identical | Unchanged — omit from the register |
| In baseline, not in current CCM | **Rescinded** |

Run this separately for Controls and for Principles. Do not mix the two
sets — a Controls identifier and a Principles identifier with the same
number are different things.

### 2.3 Sort order

Register output order: Controls before Principles, then within each kind
Rescinded → Modified → New, then by identifier ascending. This matches the
operational read order an IRAP reviewer expects (retirements first — they're
usually the most time-sensitive — then changes, then additions).

## 3. Pre-fill heuristics

Pre-fills populate the `In Scope` and `Triage` columns as *suggestions*.
The reviewer is responsible for confirming or overriding each one before
the register is circulated. The rule that fired for a given row is held
as internal state (so Claude can explain "why is this No Action?" when
asked) but it is not exported as a separate column in the register.

### 3.1 Guideline-level out-of-scope rule

**Trigger.** Every Control in the baseline SSP-A under a given `Guideline`
has `Provider Responsibility = Not Applicable` *or* `Implementation
Status = Not Applicable` (that is, the whole Guideline is already
consistently scoped out).

**Effect.** For any New or Modified control in the current CCM under that
same Guideline:

- `In Scope` = `No`
- `Triage` = `No Action`
- (Source rule: `Guideline-level`)

### 3.2 Row-level out-of-scope rule

**Trigger.** The specific Control identifier has, in the baseline SSP-A,
`Provider Responsibility = Not Applicable` *or* `Implementation Status =
Not Applicable`.

**Effect.**

- `In Scope` = `No`
- `Triage` = `No Action`
- (Source rule: `Row-level`)

This applies to Modified (we already have a scoping decision on this row).
It does not apply to New (the row wasn't in the baseline).

### 3.3 Classification-bound-out rule

**Trigger.** The current CCM row's `Applicability` does not cover the
product's information classification. Example: product is OFFICIAL; the
row applies only to SECRET / TOP SECRET.

**Effect.**

- `In Scope` = `No`
- `Triage` = `No Action`
- (Source rule: `Classification`)

### 3.4 Default

If none of the above fire:

- `In Scope` = `Yes`
- `Triage` = `Review`
- (Source rule: `Default`)

### 3.5 Principles

Principles do not carry `Provider Responsibility`, `Implementation Status`
or `Guideline`. They always pre-fill as `Default` — the reviewer scopes
them manually.

## 4. Cross-validation with the Changes PDF

The Changes PDF is a narrative companion published by ASD. Use it for two
purposes only:

### 4.1 Rescission rationale extraction

For each `Rescinded` identifier, find the first paragraph in the PDF that
mentions the identifier and includes one of these signal words:

`merged`, `rescind`, `removed`, `withdraw`, `consolidat`,
`replac`, `deprecat`, `subsum`, `supersed`, `combined`,
`incorporat`, `retir`, `delet`

Extract the first one to two sentences after the identifier mention, up to
the next identifier reference. Attach this text to the register row as
"ASD rescission rationale" with a "Source: ISM Changes PDF" tag.

If you can't find a reason, leave it blank. Don't invent one.

### 4.2 Coverage cross-check

Compute the set of identifiers in your delta and the set extracted from the
PDF (anything matching `ISM-\d{3,5}` or the two-to-four-letter principle
prefix pattern). Flag:

- IDs in delta but not in PDF — usually fine (the PDF summarises by topic,
  not by ID). Mention as "no narrative in PDF" only if there are fewer than
  five total.
- IDs in PDF but not in delta — often cross-references, not misses. Same
  caveat.

Do not treat these as errors. Treat them as "check the PDF before sharing".

## 5. Applicability drift

For each identifier present in **both** the baseline SSP-A and the current
CCM where the `Description` is unchanged (so it's not already in the
delta):

- Compare the baseline SSP-A's `Applicability` to the current CCM's
  `Applicability`.
- If they differ, emit a drift row: `Identifier`, `Baseline Applicability`,
  `Current Applicability`.

Drift is a hint, not a delta. Surface it under a heading like
"Applicability drift — ASD changed scope without changing the wording".
Include up to 10 rows inline; if there are more, count them and offer to
show the rest.

Skip this check entirely in CCM-vs-CCM mode (neither side is a product
SSP-A, so "drift" doesn't mean anything).

## 6. Possible rescission + re-issue pair detection

ASD sometimes retires one ISM identifier and reintroduces the same
requirement under a new one. The naive delta flags the old ID as Rescinded
and the new ID as New without linking them.

### 6.1 Tokenisation

For each delta item, build a token set from `Topic` + new `Description` +
old `Description` + `Section`:

1. Lowercase.
2. Replace non-alphanumeric characters with spaces.
3. Split on whitespace.
4. Drop tokens shorter than 4 characters.
5. Drop common stop words (`the`, `and`, `for`, `with`, `that`, `this`,
   `from`, `into`, `have`, `has`, `are`, `was`, `were`, `been`, `being`,
   `their`, `these`, `those`, `which`, `when`, `where`, `while`, `such`,
   `other`, `must`, `may`, `can`, `will`, `shall`, `not`, `also`, `any`,
   `all`, `each`, `per`, `than`, `then`, `only`, `they`, `them`, `some`,
   `more`, `most`, `including`, `used`, `use`, `using`, `ism`, `control`,
   `controls`, `principle`, `principles`, `system`, `systems`,
   `information`).

### 6.2 Pair scoring

For each Rescinded item, for every New item **of the same kind**:

- `overlap` = size of token-set intersection.
- `score` = Jaccard similarity = `|intersection| / |union|`.

### 6.3 Thresholds

Surface a pair as a "possible rescission + re-issue pair" iff:

- `score >= 0.35` AND
- `overlap >= 3`

Sort matches by descending `score`, then descending `overlap`. Show the top
N in the register — usually 5 on-screen, 25 in any xlsx export, with a
count of any others.

### 6.4 Reporting

Phrase every pair as "possible pair — reviewer to confirm". Include the
similarity percentage and the shared-term count so the reviewer can
calibrate whether to trust it. **Never** auto-merge the pair in the
register. Mispairs are worse than misses.

## 7. Essential Eight evidence lineage

For each Control in the current CCM where `ML1`, `ML2` or `ML3 = Yes` AND
the `Applicability` covers the product's classification:

1. Look up the matching `Identifier` in the baseline SSP-A.
2. Emit a row with:
   - `Identifier`, `Guideline`, `Topic`.
   - CCM ML1 / ML2 / ML3 values.
   - SSP-A ML1 / ML2 / ML3 values (or `(no SSP-A row)` if missing).
   - SSP-A `Implementation Status` and `Provider Responsibility`.
   - **Corroboration verdict**: `Yes` if every CCM `Yes` is matched by a
     SSP-A `Yes`; `No — SSP-A silent on ML<n>` with the list of missing
     levels; `Not in baseline SSP-A` if no matching row.

Emit a short summary at the bottom: total E8 controls in scope, count
corroborated, count with gaps, count missing from SSP-A.

Principles do not participate in this lineage (they don't carry ML
columns).

## 8. Quarter label handling

If the current CCM sheet name ends in a month and year, use it as the
target quarter. If the baseline SSP-A sheet name does the same, use it as
the baseline quarter. If either is missing, ask the operator and don't
guess.

"Target quarter" and "baseline quarter" should appear on every output so
the register is self-describing.

## 9. CCM-vs-CCM comparison mode

If the operator is comparing a prior-quarter CCM to the current CCM (instead
of an SSP-A), apply these overrides:

- Skip all pre-fill heuristics (Sections 3.1 - 3.4). Every change pre-fills
  as `Default`.
- Skip applicability drift (Section 5).
- Skip the E8 evidence-lineage corroboration (Section 7) — there's no
  SSP-A to corroborate against. Still emit the CCM-side E8 view.
- Label the baseline as "previous-quarter CCM (baseline)" not "SSP-A".

## 10. Things this methodology does not do

- **Semantic diff of modified control text.** A single-word change and a
  rewrite both show up as "Modified". Let the reviewer eyeball the diff.
- **Automated re-scoping decisions.** Pre-fills are suggestions; they never
  constitute a scoping decision.
- **SSP-A round-trip with styling.** In the Claude Project workflow, the
  output is a Markdown register + optional xlsx export. It does not
  preserve the baseline SSP-A's formatting or formulae.
- **Independent MLn assignment.** Whatever the CCM says about ML1/ML2/ML3
  is what the register says. This methodology doesn't second-guess ASD's
  E8 mapping.

---

*See also: PRIORITY_FRAMEWORK.md (what to do with the register after it's
built), BURNDOWN_PLAYBOOK.md (when to do each of those things),
INDUSTRY_SIGNALS.md (what external context to layer on),
OUTPUT_TEMPLATE.md (the exact output structure).*
