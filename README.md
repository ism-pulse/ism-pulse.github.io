# ISM Quarterly Review Tool

**Author:** [Gaurav Vikash](https://www.linkedin.com/in/gauravvikash/) · **Licence:** Apache 2.0

A single-file, browser-based tool that turns the quarterly Australian
Government **Information Security Manual (ISM)** refresh from a multi-day
manual grind into a structured, auditable review. You upload your baseline
Statement of Applicability Annex (SSP-A) and the current-quarter ASD Cloud
Controls Matrix (CCM) and the tool computes the delta, groups it by Guideline
/ Function, pre-fills the obvious scoping decisions from your own SSP-A,
flags cross-validation inconsistencies, and produces a full set of reviewer
artefacts (register, updated SSP-A, leadership summary) ready to circulate.

Everything runs in your browser. No data is uploaded, no backend, no
accounts, no tracking.

## Who this is for

- Australian government agencies and their cloud service providers running
  quarterly ISM impact assessments.
- IRAP assessors and implementors who want a fast, repeatable first-pass
  delta before diving into evidence review.
- Security and compliance teams maintaining a product SSP-A against the ISM
  who have done this review by hand and would rather not.

## What it does

### 1. Ingests three ASD/ACSC artefacts

- **Baseline SSP-A** (`.xlsx`) — your previous-quarter Statement of
  Applicability Annex, or (in CCM-vs-CCM mode) a prior-quarter CCM.
- **Current-quarter CCM** (`.xlsx`) — the ASD Cloud Controls Matrix for the
  quarter you're reviewing.
- **ISM Changes PDF** (required) — ASD's quarterly companion that narrates
  new, modified and rescinded controls. Used for cross-validation and to
  extract the ASD-authored rescission rationale.

### 2. Computes the delta

For both **Controls** and **Principles** (each handled on its own tab):

- **New** — CCM rows with `Revision = 0` whose `Updated` quarter is the
  target.
- **Modified** — CCM rows with `Revision > 0` whose `Updated` quarter is the
  target.
- **Rescinded** — items present in the baseline but missing from the current
  CCM. When a Changes PDF is supplied, the ASD-authored rescission rationale
  is extracted and attached to each rescinded row.

### 3. Cross-validates against the Changes PDF

- Flags identifiers that appear in one source but not the other.
- Scores the PDF for ASD/ACSC brand language so mis-uploaded files are
  rejected with a clear warning.
- Surfaces an **applicability-drift** check: controls whose classification
  applicability in the baseline SSP-A differs from the current CCM, even
  though the control text is unchanged (a common quiet source of staleness).

### 4. Pre-fills scoping decisions from your own SSP-A

Two mechanical rules, both transparently documented in the Methodology tab:

- **Guideline-level out-of-scope.** If every control under a Guideline in
  your baseline is marked Not Applicable, the whole Guideline is treated as
  out of scope, and any new or modified control added under it this quarter
  is pre-filled accordingly.
- **Row-level out-of-scope.** If a specific control is already Not Applicable
  in your SSP-A, the modification is pre-filled No / No Action.

Pre-fills are clearly flagged as suggestions. The reviewer is responsible for
reading each changed control and confirming or overriding every pre-fill
before the register is shared.

### 5. Produces three exports — pick the one that fits the audience

| Export | Format | For |
| --- | --- | --- |
| Change Register | `.xlsx` | The primary auditable artefact. Summary tab (product details, delta counts, reviewer conclusion placeholder), one tab per kind (Controls, Principles) with full context and editable triage fields, an Essential Eight coverage snapshot, and a Methodology tab. |
| Updated SSP-A | `.xlsx` | Your baseline SSP-A rewritten against the current quarter — new rows inserted, rescinded rows removed, modified rows pre-flagged for review. Non-standard sheets pass through untouched; Info / Pivot tabs are dropped (the tool explains why in the Methodology tab). |
| Word summary | `.docx` | A leadership-ready, one-to-two-page change summary — product header, Controls + Principles stats, per-kind change lists, and applicability-drift table. |

The tool does not persist session state. Inline edits live in browser memory
only, so export the Change Register (or Updated SSP-A / Word summary) before
closing the tab.

### 6. Runs an interactive review dashboard

- Stats cards grouped for Controls and Principles with prominent totals.
- Interactive filter, search and collapse-all for every change.
- Inline triage (In scope, Triage, Recommended action, Owner / Notes) that
  feeds straight into the Change Register and Word summary exports.
- "Quarterly themes and cross-validation notes" panel with the top Guidelines
  (for Controls) and top Functions (for Principles) by change volume, plus a
  running list of cross-validation warnings.
- Keyboard-friendly navigation, skip-links, ARIA labels for screen readers
  and a high-visibility focus ring throughout.

### 7. Comparison modes

- **SSP-A vs CCM** (default) — baseline is your product's SSP-A. Pre-fills
  and the Updated SSP-A export are active.
- **CCM vs CCM** — baseline is a prior-quarter CCM. Useful for a raw
  quarter-over-quarter diff without applying any product scoping. The
  Updated SSP-A export is hidden; applicability-drift checks are skipped
  (neither side is an SSP-A).

## Two tiers — the HTML tool and the optional Claude Project

This repository ships two complementary layers. Pick the one that matches
your team's tooling and workflow — or use both.

### Tier 1 — the HTML tool (this file)

The HTML tool is the **standalone, auditable, deterministic computation
layer**. It is the right fit when you need:

- **No AI dependency.** Everything is deterministic JavaScript the reviewer
  can inspect, line by line, before trusting the output.
- **No account, no subscription, no data egress.** One HTML file, a browser,
  your files. Air-gappable with three library swaps.
- **Identical output for identical input.** The register you produce today
  will match the register you produce from the same files next month.
- **A portable artefact** a team can share and run without onboarding,
  licensing, or procurement.

The HTML tool is the primary deliverable and is intended to remain fully
functional as a standalone product. Most quarterly reviews can be completed
end-to-end in the HTML tool alone.

### Tier 2 — the Claude Project (optional inference layer)

On top of the same computation, the `claude-project-pack/` folder in this
repository defines a **Claude Project** that adds three things the HTML
tool fundamentally cannot do:

- **Priority inference.** Every in-scope change is placed in P0 / P1 / P2 /
  P3 with a one-line justification referencing the product's classification,
  Essential Eight maturity claim, and (when supplied) current security
  posture.
- **Live industry context.** The Project web-searches this quarter's
  public-record signals — ACSC advisories, hyperscaler IRAP assessment
  updates, ANAO / OAIC findings, PSPF / Cyber Security Act / SOCI
  updates — and weaves them into the priority call as "tilts". Private
  consultancy and practitioner commentary are out of scope by design.
- **12-week burndown.** Each P0 / P1 item is plotted on a quarterly cadence
  with expected states and slippage flags, turning the register into a dated
  plan rather than a flat list.

The Project also supports **conversational follow-up** — "re-scope ISM-0123
as N/A", "summarise for leadership", "produce a Jira CSV" — which the HTML
tool, being static, cannot.

### When to use which

| If … | Use |
| --- | --- |
| Your team does not use Claude | Tier 1 (HTML) only |
| You need an auditable, fully deterministic artefact | Tier 1 (HTML) only |
| You are running an air-gapped review | Tier 1 (HTML) with local libraries |
| You want prioritisation, industry context, or a burndown | Tier 2 (Project) on top of Tier 1 |
| You are preparing leadership summaries, Jira backlogs, or stakeholder notes | Tier 2 (Project) |
| You are a solo reviewer and want a second opinion on prioritisation | Tier 2 (Project), fed the HTML tool's register as input |

The Project is **additive, not a replacement**. Teams that never adopt
Claude keep a complete, working tool. Teams that do adopt Claude get an
inference layer on top without losing the deterministic computation
underneath.

Setup for the Project is documented in
[`claude-project-pack/QUICK_START.md`](claude-project-pack/QUICK_START.md).

## How to use

### Option A — run it from your desktop

1. Download `index.html` from this repo.
2. Scan all the files with your organisation's standard tools.
3. Double-click it. It opens in your default browser.
4. Fill in Product name, Information Classification and a short Product
   overview. (All three are validated so the register is always
   attributable.)
5. Upload your **previous-quarter SSP-A** (`.xlsx`).
6. Upload the **current-quarter CCM** (`.xlsx`) from
   <https://www.cyber.gov.au>.
7. Upload the **ISM Changes PDF** for the same quarter from
   <https://www.cyber.gov.au>. This enables cross-validation of the delta
   and extracts the ASD-authored rescission rationale.
8. Click **Compute delta**. Review the result in the interactive dashboard.
   Edit In scope, Triage, Recommended action and Owner / Notes inline.
9. Use the **Download outputs** buttons to export the Change Register
   (`.xlsx`), the Updated SSP-A (`.xlsx`) and / or the Word summary (`.docx`)
   before you close the tab — the tool does not persist session state.

### Option B — try it with the sample data

Fastest way to see the tool end-to-end without needing your own SSP-A.
Download both files from the `samples/` folder and feed them in:

- SSP-A: `samples/sample-sspa-mar-2026.xlsx` (March 2026 baseline)
- CCM: `samples/sample-ccm-jun-2026.xlsx` (June 2026 current quarter)

You should see a small five-control delta (2 New, 2 Modified, 1 Rescinded).
None of the identifiers, wording or guidelines in the samples are real —
they're invented for demonstration.

## What's in the repo

```
.
├── index.html                       # The tool itself (open in a browser)
├── ism-pulse-demo-animation.html    # A quick animated demo of the tool
├── README.md                        # This file
├── VALIDATION.md                    # Validation pack — fixtures, regression harness, known gaps
├── LICENSE                          # Apache 2.0 — full licence text
├── NOTICE                           # Apache 2.0 — attribution notice (must be retained in redistributions)
└── samples/
    ├── sample-ccm-jun-2026.xlsx     # Fictitious CCM for demo
    └── sample-sspa-mar-2026.xlsx    # Fictitious SSP-A for demo
```

## Validation

The tool ships with a **startup self-test** that runs a known-good fixture
through `computeDelta` on every page load and reports the result in the
page header. A green pill means the parser agrees with the expected
2 New / 2 Modified / 1 Rescinded count; a red pill means ASD has likely
shifted the CCM schema and the output should not be trusted until the
parser is updated.

For a full description of the test fixtures, the hand-reviewed register
comparison across the last four CCM quarters, heuristic-check caveats, and
instructions for reproducing the validation end to end, see
[VALIDATION.md](VALIDATION.md).

## Privacy

The tool is a single HTML file. When you open it, three JavaScript libraries
load from public CDNs: `xlsx-js-style` for spreadsheet read/write, `pdf.js`
for the Changes PDF, and `docx.js` for the Word summary export.
After that, every file you upload is parsed in-browser only. Nothing is sent
to any server. Closing or reloading the tab discards all of it.

For a completely air-gapped deployment, download the HTML once from a machine
with internet access, save it alongside local copies of its three library
files, and swap the `<script src="https://…">` URLs for local paths before
moving to the isolated environment.

## Assumptions the tool makes about your inputs

The delta and pre-fills rest on a few assumptions about how your SSP-A and the
CCM are structured. If any are untrue for your product the output will still
look plausible but won't be trustworthy — worth a glance before you upload.

| Assumption | What goes wrong if it's untrue |
| --- | --- |
| Your SSP-A lists every ISM control in force when it was last finalised, including rows marked `Not Applicable`. | If Not-Applicable rows were deleted instead of marked NA, they reappear in the current CCM and get counted as New. |
| Control identifiers are stable across quarters unless ASD rescinds and re-issues. | A rename surfaces as one Rescinded + one New item. Likely pairs are flagged as hints but not auto-linked. |
| Material updates to a control change its description text (not just its applicability labels). | Applicability-only changes aren't flagged as Modified. The applicability-drift HINT catches them separately. |
| Your previous-quarter scoping is still valid. | Pre-fills come straight from the baseline SSP-A. After an architectural change, pre-filled Not-Applicable decisions may be stale. |
| Essential Eight maturity lives in the CCM's `ML1` / `ML2` / `ML3` columns. | If ASD restructures those columns the E8 snapshot populates as empty. The startup self-test catches gross drift. |

## Known limitations

- **Column layout assumptions.** The tool expects the CCM and SSP-A column
  headers in use at the time of publication (Identifier, Revision, Updated,
  Guideline, Topic, Provider Responsibility, Implementation Status, etc.).
  If ASD restructures the CCM, spot-check a few rows the first time you run
  the tool against a new quarter and tweak the code if needed.
- **Sheet name convention.** Quarter detection reads the workbook's sheet
  name (e.g. `Controls - March 2026`). If your SSP-A renames that sheet, the
  baseline-quarter label will be blank.
- **Rescission + re-issue.** Occasionally ASD retires one ISM identifier and
  reintroduces the same requirement under a new one. The tool flags the old
  ID as Rescinded and the new ID as New but does not connect the pair — the
  reviewer must spot these manually.
- **Pre-fill heuristics are typical-case.** Unusual SSP-A structures
  (multi-tenant, hybrid, federal-vs-state splits) may need pre-fills
  overridden more often. Sanity-check at least one guideline you expect to
  be in scope before trusting the register.
- **Sensitivity labels (MIP / AIP) and DRM.** Real-world SSP-As are often
  protected with Microsoft Purview / Azure Information Protection labels,
  Microsoft Information Protection encryption, or third-party DRM. The tool
  can only parse an unprotected `.xlsx` — if the file is labelled or
  encrypted, the browser's `FileReader` returns ciphertext and the parse
  fails. **Before uploading**, open the SSP-A in Excel, remove the
  sensitivity label (or downgrade to an unprotected equivalent), save a
  fresh copy, and feed *that* copy to the tool. Re-apply the label on your
  original after the review. Because processing is entirely client-side, the
  unlabelled copy never leaves your machine.
- **Password-protected or macro-enabled workbooks.** Password-protected
  `.xlsx`, `.xlsm` and `.xlsb` files are not supported — remove the password
  or convert to a plain `.xlsx` before uploading.

## Contributing

Pull requests and issues welcome. Please do **not** upload real SSP-As, CCMs
or extracts from them — this project is for the code only. If you need to
demonstrate a parsing bug, strip identifiers and wording first, or work from
the `samples/` files.

## Author

Built and maintained by **Gaurav Vikash** —
[LinkedIn](https://www.linkedin.com/in/gauravvikash/).

If the tool helps you, feedback and connection requests are welcome. For
bug reports, feature requests and pull requests, please use the GitHub
issue tracker so the conversation is visible to other users.

## Licence

Released under the **Apache Licence 2.0** — see [LICENSE](LICENSE) for the
full text. You are free to use, copy, modify and redistribute the tool,
including for commercial purposes, **provided you**:

1. Retain the copyright notice, the full licence text, and the accompanying
   [NOTICE](NOTICE) file in any redistribution (Source or Object form).
2. State in any modified file that you have changed it.
3. Do not use the author's name, trademarks or service marks to endorse or
   promote your derivative work (Apache 2.0 §6).

The licence also grants an explicit patent licence from the author, and
terminates that patent licence if you initiate patent litigation against
the project (Apache 2.0 §3). See [NOTICE](NOTICE) for the attribution text
that must travel with every redistribution.

## Disclaimer and limitation of liability

This tool is provided on an **"as is"** and **"as available"** basis,
without warranty of any kind, express or implied. Without limiting the
foregoing, the author disclaims all warranties of merchantability, fitness
for a particular purpose, title, accuracy, completeness, non-infringement,
and freedom from defects or malicious code.

Reasonable efforts have been made to ensure that the HTML file and its
supporting artefacts are free from malware, but the author makes **no
guarantee** to that effect. You are responsible for scanning the files with
your own security tools before use, verifying their integrity, and running
them inside your own trust boundary.

The output of this tool — including delta detection, pre-filled scoping,
heuristic classifications, cross-validation flags and drafted communications
— is a **decision-support aid, not professional, legal, compliance,
assurance or IRAP advice**. You remain solely responsible for reviewing each
change, confirming or overriding every pre-fill, and ensuring the final
artefacts meet your organisation's assurance, accreditation, record-keeping
and data-handling obligations.

To the maximum extent permitted by law, **in no event shall the author be
liable** for any direct, indirect, incidental, special, consequential,
exemplary or punitive damages, or for any loss of profit, revenue, data,
goodwill, assurance status or business interruption, arising out of or in
connection with your use of, reliance on, or inability to use this tool,
even if advised of the possibility of such damages. Use of this tool
constitutes acceptance of these terms.

### Responsible use

You are responsible for handling the files you upload in line with your
organisation's data-classification, data-sovereignty and record-keeping
obligations. The tool is client-side and does not transmit data to a server,
but the files remain on your device; you must ensure that device is
authorised for the classification of the material being processed.

## Third-party components

The tool loads three open-source JavaScript libraries from public CDNs. Each
retains its own copyright and licence terms:

- [`xlsx-js-style`](https://github.com/gitbrent/xlsx-js-style) — spreadsheet
  read/write with styling (Apache 2.0).
- [`pdf.js`](https://github.com/mozilla/pdf.js) — PDF text extraction for
  the Changes PDF (Apache 2.0).
- [`docx.js`](https://github.com/dolanmiu/docx) — Word document generation
  for the `.docx` summary export (MIT).

## Not affiliated with ASD, ACSC or the Australian Government

"ISM", "Cloud Controls Matrix", "Essential Eight", "IRAP" and related terms
refer to work published by the Australian Signals Directorate / Australian
Cyber Security Centre. This tool is an independent utility that reads those
documents. It is **not endorsed by, affiliated with, or sponsored by** ASD,
ACSC or the Australian Government.
