# Validation — IRAP Pulse

**By [Cybernion](https://cybernion.com.au/)**

This document describes how IRAP Pulse has been validated, what the published fixtures cover, and how to re-run the validation. It exists because any tool that generates scoping decisions for a regulator-facing artefact deserves an explicit statement of what it has been tested against and what a reviewer still needs to confirm by eye.

Nothing here is a substitute for IRAP-assessor judgement.

---

## 1. Scope

IRAP Pulse operates on four workflows. Validation covers all four.

**Tab 1 — Create SSP-A**

- Loads a blank ASD SSP-A template (bundled or uploaded)
- Applies classification-based Not Applicable decisions from the ISM applicability column
- Applies scope-based Not Applicable decisions for each unticked Guideline
- Writes a consistent justification string to the Comments column
- Preserves all other columns and sheets without modification

**Tab 2 — Create CCM**

- Loads the bundled ASD CCM or an uploaded CCM
- Applies classification-based and scope-based Not Applicable decisions losslessly
- Preserves dropdowns, conditional formatting, panes, autofilter and styles from the source workbook
- Does not modify the Info, Principles or any non-Controls sheet

**Tab 3 — Update SSP-A or CCM**

- Parses both the CCM and the baseline SSP-A, even when banner rows, merged cells or extra columns differ by quarter
- Computes a correct `{New, Modified, Rescinded}` delta with no false positives and no false negatives
- Applies guideline-level and row-level pre-fill heuristics only when the baseline SSP-A evidence supports it
- Cross-validates the delta against the ISM Changes PDF and flags genuine divergences
- Exports a Change Register, Updated Baseline and Stakeholder Note whose contents are consistent with each other

**Tab 4 — ISM Version Compare**

- Accepts two CCM or SSP-A workbooks and renders comparative charts via Chart.js
- Validates that uploaded files can be parsed before rendering

---

## 2. Automated test suite

### 2.1 Unit tests (113 tests)

```bash
npm test
```

Covers the pure-logic modules in `src/`: delta computation (`delta.ts`), normalisation (`normalise.ts`), applicability parsing (`applicability.ts`), CCM lossless editing (`ccm.ts`), PDF extraction (`pdf.ts`), and the lossless surgery functions (`xlsxsurgery.ts`). Tests use `normaliseAOA` directly (no CDN dependency) and run in a Node environment via vitest.

All 113 tests must pass before any release.

### 2.2 Integration tests (17 tests)

```bash
npm run test:integration
```

End-to-end tests against real ASD file fixtures. These are run manually before a release. They cover multi-quarter delta regression, lossless export round-trips, and column-detection across CCM versions.

### 2.3 Startup self-test (embedded)

Every page load runs `runStartupSelfTest()` against an embedded fixture:

| Fixture | Expected outcome |
| --- | --- |
| 2 New (ISM-0003, PRO-02), 2 Modified (ISM-0002, PRO-01), 1 Rescinded (ISM-9999) | Delta = 2 New / 2 Modified / 1 Rescinded. Self-test pill in header turns green on pass, red on fail. |

A red pill means the delta engine is no longer producing the expected shape — most commonly because ASD has renamed a CCM column since the last release. Do not trust output produced after a failing self-test.

### 2.4 Bundled file integrity

On every page load the tool computes SHA-256 hashes of the three bundled ASD data files and compares them against values embedded in the HTML at release time. A "Verified" status confirms the files are byte-for-byte identical to those tested at release. A mismatch is flagged visibly.

---

## 3. Quarter-over-quarter regression

Tab 3 is tested against the last four publicly available CCM quarters using a de-identified synthetic SSP-A derived from the previous quarter's CCM with plausible scoping decisions applied. This allows anyone to reproduce the regression without needing access to a real product's SOA.

Results from the last four quarters:

- **Controls.** `{New, Modified, Rescinded}` set matched the hand-produced set by identifier in all four quarters. Three discrepancies surfaced during initial validation:
  - A Modified control whose only textual change was whitespace normalisation. The tool correctly reported Unchanged; the hand reviewer had flagged it in error. **Resolution:** tool confirmed correct.
  - A Rescinded control re-issued under a new identifier. The tool flagged old as Rescinded and new as New; the hand reviewer had linked them. **Resolution:** added the possible rescission + re-issue detector as a soft hint.
  - A Modified control where only the applicability classification changed (not the description text). Omitted from the delta correctly; hand reviewer surfaced it as a scoping concern. **Resolution:** added the applicability-drift check as a separate HINT.
- **Principles.** Zero discrepancies across all four quarters.

---

## 4. Heuristic checks

Three features are explicitly heuristic and should be treated as reviewer prompts, not conclusions.

**Guideline-level pre-fill.** A Guideline is treated as fully out of scope only when every control under it in the baseline SSP-A is marked Not Applicable. Pre-fills are flagged as suggestions in the Change Register.

**Row-level pre-fill.** A control is pre-filled Not Applicable only when that specific control is already Not Applicable in the baseline.

**Applicability-drift check.** Compares the baseline SSP-A applicability column to the current CCM applicability column for controls whose description text has not changed. A drift is flagged as a HINT — not every drift is a real problem.

**Possible rescission + re-issue detector.** For every Rescinded item, computes a Jaccard-similarity score against every New item of the same kind. Pairs above the threshold are surfaced as soft hints. The tool does not auto-link pairs — a mis-pair is worse than a missed one.

---

## 5. Export assurance

**Change Register (.xlsx)** — tested in Excel and LibreOffice Calc. No "Removed Feature: Named range" warnings. Per-kind tabs, E8 snapshot and Methodology tab all populated.

**Updated Baseline (.xlsx)** — lossless via `buildUpdatedXlsx` in `src/xlsxsurgery.ts`. The review sheet's row data is rebuilt reusing original per-row styles. Dropdowns, panes, autofilter, column widths and all other sheets are preserved. New rows inserted, rescinded rows removed, modified rows flagged. The Pivot tab is dropped (documented in the Methodology tab). Opens in Excel with no repair prompt.

**Create SSP-A (.xlsx)** — lossless via `editXlsxCells`. Not Applicable status and justification written to correct columns. Applicability columns, Principles sheet and all non-Controls sheets preserved. Opens in Excel with no repair prompt and no loss of dropdowns or styles.

**Create CCM (.xlsx)** — lossless via `editXlsxCells`. Same assurance as Create SSP-A. Existing freeze panes, autofilter, conditional formatting and the Info / Principles tabs are unchanged. Output is roughly the same size as the input.

---

## 6. Reproducing the validation

```bash
# Run the full automated test suite
npm test
npm run test:integration

# Confirm the startup self-test pill is green
open dist/index.html

# SHA-256 hashes of bundled files (compare against BUNDLED_FILE_HASHES in src/constants.ts)
sha256sum ccm-current.xlsx ism-changes-current.pdf sspa-template-current.xlsx
```

To regression-test against the last four public CCM quarters, download the CCM and ISM Changes PDF for each quarter from https://www.cyber.gov.au and upload to Tab 3. The expected delta for each quarter is the ASD-published count for that quarter's refresh, adjusted for your system's classification and scope.

---

## 7. Known validation gaps

- The regression set uses a synthetic SSP-A, not a real product's SOA. The tool's behaviour against a production SSP-A with hundreds of custom scoping notes is well understood from operational use but not publishable here.
- Principles-only deltas are lightly tested — public CCMs rarely move Principles. The startup self-test includes a Principle in each change bucket to exercise the Function-prefix grouping code.
- PDF text extraction is pdf.js-based and occasionally drops a glyph on unusual PDF producers. The rescission-reason extractor's whitespace-normalisation pass handles most cases.
- Tab 4 (ISM Version Compare) chart output is validated visually; there is no automated assertion on chart data points.

---

## 8. Reporting a validation issue

If the tool produces a register that disagrees with your hand review, open a GitHub issue with:

1. The CCM quarter and baseline SSP-A quarter
2. The identifier(s) in dispute
3. What the tool produced and what you expected

Do not attach real SSP-As, CCMs or extracts — redact identifiers and wording first.
