# Validation pack — ISM Quarterly Review Tool

**Author:** [Gaurav Vikash](https://www.linkedin.com/in/gauravvikash/) · **Licence:** Apache 2.0

This document describes how the ISM Quarterly Review Tool has been validated,
what the published fixtures cover, and how you can re-run the validation end
to end on your own machine. It exists because any tool that drafts scoping
decisions for a regulator-facing artefact deserves an explicit statement of
what it has been tested against, and what a reviewer still has to check by
eye.

Nothing here is a substitute for IRAP-assessor judgement. The goal is to
make the tool's behaviour observable, reproducible, and auditable.

## 1. Scope of validation

The tool operates on three ASD/ACSC-published artefacts:

- The Cloud Controls Matrix (`.xlsx`) — current quarter.
- A prior-quarter Statement of Applicability Annex, or a prior-quarter CCM in
  CCM-vs-CCM mode (`.xlsx`).
- The ISM Changes PDF — required, used for cross-validation and
  rescission-reason extraction.

Validation therefore needs to show that the tool:

1. Parses both CCM and SSP-A sheets, even when banner rows, merged cells or
   extra columns differ by quarter.
2. Computes a correct `{New, Modified, Rescinded}` delta — no false positives
   (reporting Unchanged controls as Modified) and no false negatives (missing
   a genuinely new or rescinded control).
3. Applies its two pre-fill heuristics (guideline-level and row-level
   out-of-scope) only when the underlying SSP-A evidence supports it.
4. Cross-validates the delta against the Changes PDF and flags genuine
   divergences without flooding the reviewer with semantic noise.
5. Exports a Change Register, an Updated SSP-A, a Word summary and a JSON
   progress snapshot whose contents round-trip without data loss.
6. Detects the common edge cases — applicability drift, possible rescission
   + re-issue pairs, Essential Eight evidence gaps — and surfaces them as
   soft hints rather than silent failures.

## 2. Test fixtures

### 2.1 Hand-crafted synthetic fixtures (shipped)

| Fixture | What it covers | Expected outcome |
| --- | --- | --- |
| `samples/sample-sspa-mar-2026.xlsx` + `samples/sample-ccm-jun-2026.xlsx` | 2 New, 2 Modified, 1 Rescinded across Controls and Principles. Includes one Guideline fully out of scope (so guideline-level pre-fill fires), one Row-level out-of-scope control, and one Rescinded principle with an explicit rationale in the accompanying Changes PDF. | Delta = 2/2/1, guideline-level pre-fill on one Modified control, row-level pre-fill on one Modified control, ASD rescission rationale extracted for the rescinded principle. |
| Startup self-test fixture (embedded in the HTML) | 2 New (ISM-0003, PRO-02), 2 Modified (ISM-0002, PRO-01), 1 Rescinded (ISM-9999). | Delta = 2/2/1. Asserted on every page load; pill in the header turns green on pass, red on fail. |

### 2.2 Quarter-over-quarter regression set (reproducible)

The tool is regression-tested against the last four publicly available CCM
quarters using a stable, publicly available baseline SSP-A shape. Because
real SSP-As are product-specific and classification-sensitive, the regression
set uses a **de-identified synthetic SSP-A** derived from the previous
quarter's CCM with plausible scoping decisions applied. This lets anyone
reproduce the regression without needing access to a real product's SOA.

The regression harness lives in `work/smoke_test_v*.js` in this repo
(Node + `xlsx-js-style` + `pdf.js`). Each run:

1. Reads the tool's source HTML and pattern-checks for expected helper
   functions and behavioural hooks.
2. Reconstructs the `extractRescissionReason`, `computeDelta`,
   `findPossibleRescissionPairs` and Updated-SSP-A export logic in a Node
   sandbox and exercises them against representative fixtures.
3. Asserts the Updated SSP-A round-trips through xlsx without defined-name
   warnings in Excel.
4. Checks cross-tab consistency: the register Summary tab's overall total
   equals the sum of per-kind totals.

If any assertion fails, the exit code is non-zero and the offending check is
printed to stderr.

### 2.3 Hand-reviewed register comparison

For each of the last four CCM quarters, the tool's output has been diffed
against a hand-produced register prepared by an independent reviewer:

- **Controls.** For every quarter, the tool's `{New, Modified, Rescinded}`
  set matched the hand-produced set by identifier. Three discrepancies
  surfaced during initial validation and were traced to:
  - A Modified control whose only textual change was whitespace-normalisation
    around a punctuation character. The tool correctly reported it as
    Unchanged; the hand reviewer had flagged it by mistake. **Outcome:**
    tool confirmed correct; no code change.
  - A Rescinded control that had been re-issued under a new identifier. The
    tool flagged the old ID as Rescinded and the new ID as New; the hand
    reviewer had linked them. **Outcome:** added the `possible rescission
    + re-issue` detector (see §3.3) as a soft hint.
  - A Modified control where the CCM's applicability classification had
    changed but the description text had not. The delta omitted it; the
    hand reviewer had surfaced it as a scoping concern. **Outcome:** added
    the `applicability drift` check, which flags this case without putting
    it in the delta.
- **Principles.** Zero discrepancies across the four quarters.

## 3. Heuristic checks — what they do and what they are NOT

Three features in the tool are explicitly heuristic and should be treated as
reviewer prompts, not conclusions.

### 3.1 Guideline-level and row-level pre-fills

A Guideline is treated as fully out of scope only when **every** baseline
SSP-A control under it is marked Not Applicable. A row is pre-filled Not
Applicable only when that specific control is already Not Applicable in the
baseline. Pre-fills are flagged as suggestions; the Change Register includes
a dedicated **Pre-fill was / Reviewer set** audit trail so any override is
visible on the face of the artefact.

### 3.2 Applicability-drift check

This compares the baseline SSP-A's `Applicability` column to the current
CCM's `Applicability` column for controls whose description text has not
changed. A drift is flagged if the two differ. This is a known silent source
of staleness (the delta wouldn't otherwise surface it), and the warning is
explicitly worded as "HINT" — not every drift is a real problem (for example
ASD sometimes adds OFFICIAL: SENSITIVE to a row already covering OFFICIAL).

### 3.3 Possible rescission + re-issue pair detector

For every `Rescinded` item, the detector computes a Jaccard-similarity score
on tokenised topic + description text against every `New` item of the same
kind. Pairs above a conservative threshold (0.35 similarity, ≥ 3 shared
content words after stop-word filtering) are surfaced as soft hints on the
dashboard and in the Change Register's Summary tab. The tool does **not**
auto-link the pair, on the grounds that a mis-pair is worse than a missed
one.

## 4. Self-test on load

Every page load runs `runStartupSelfTest()` against an embedded 2 New / 2
Modified / 1 Rescinded fixture. The pill in the page header reports the
result:

| Pill | What it means |
| --- | --- |
| **Self-test: pass** (green) | Parser + delta engine agree with the fixture; CCM schema drift is unlikely to be silently miscounting changes. |
| **Self-test: FAIL** (red) | Something in `computeDelta` is no longer producing the expected shape — most commonly because ASD has renamed a CCM column since the tool was last updated. The browser console has the exact mismatch. Do **not** trust any output produced after a failing self-test. |
| **Running self-test…** (grey) | The fixture is still executing. Normally flips within a few milliseconds. |

This is the first thing an experienced reviewer should look at before using
the tool against a new quarter's CCM.

## 5. Export-format assurance

- **Change Register (`.xlsx`)** — read-back tested in Excel and LibreOffice
  Calc. No "Removed Feature: Named range" warnings (defined names are
  stripped on export). Per-kind tabs, Essential Eight snapshot, Essential
  Eight evidence-lineage tab, and Methodology tab all populated.
- **Updated SSP-A (`.xlsx`)** — Info and Pivot tabs are dropped (and the
  Methodology tab explains why); all other sheets pass through untouched.
  Verified that new rows are inserted, rescinded rows removed, and modified
  rows flagged in the existing column structure.
- **Word summary (`.docx`)** — round-trip tested through Word and LibreOffice
  Writer. Document properties carry "Gaurav Vikash — ISM Quarterly Review
  Tool" as the creator for audit traceability.

The tool does not ship a session save/resume workflow. Inline edits live in
browser memory only; reviewers must export one of the three artefacts above
before closing the tab.

## 6. Reproducing the validation

The below runs everything from a clean checkout of the repo, against the
shipped samples:

```bash
# 1. Regression harness against the latest samples
node work/smoke_test_v7.js

# 2. Load the HTML and confirm the startup self-test pill is green
open "ISM Quarterly Review Tool.html"
```

To regression-test against the last four public CCM quarters, replace the
`samples/` files with the CCM and ISM Changes PDF for each quarter
(downloadable from <https://www.cyber.gov.au>) and re-upload to the tool.
The expected delta for each quarter is the ASD-published count for that
quarter's refresh, minus any principles/controls outside your system's
information classification.

## 7. Known validation gaps

- The regression set uses a synthetic SSP-A, not a real product's SOA. The
  tool's behaviour against a production SSP-A with hundreds of custom
  scoping notes is well understood (author's day job) but not publishable
  here.
- Principles-only deltas are lightly tested — the public CCMs rarely move
  Principles. The startup self-test includes a Principle in each of the
  New and Modified buckets to exercise the Function-prefix grouping code.
- PDF text extraction is pdf.js-based and occasionally drops a glyph on
  unusual PDF producers. The rescission-reason extractor's flatten-pass
  (`/\s+/g → ' '`) normalises away most of these.

## 8. Reporting a validation issue

If the tool produces a register that disagrees with your hand review, open
an issue with:

1. The CCM quarter and baseline SSP-A quarter.
2. The identifier(s) in dispute.
3. What the tool produced and what you expected.

Please do not attach real SSP-As, CCMs or extracts — redact identifiers and
wording first, or reproduce the issue using the `samples/` files. The
project is for the code only.
