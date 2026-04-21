# Quick Start — set up the ISM Quarterly Review Claude Project

This guide walks you through creating the Claude Project from the knowledge
pack in 10 minutes, running your first review, and handling follow-ups.

If you already have a working Project and just want to run a review, skip to
§3 (Run your first review).

## 1. What you get — and do you need it?

### Two tiers

This repository ships two complementary tools:

- **The HTML tool** (`ISM Quarterly Review Tool.html` in the parent folder) —
  the standalone, auditable, deterministic computation. No AI. No account.
  Same input always produces the same register. Handles delta, pre-fills,
  drift, pair detection, and Essential Eight evidence lineage. This is the
  primary deliverable and is fully functional on its own.
- **The Claude Project** (this folder) — an **inference layer** that runs on
  top. Adds priority, industry context, and a burndown plan. Optional. Only
  useful if your team uses Claude.

### Do you need the Project?

Skip it if you don't use Claude, you need strict determinism (same output
every run), or you're running air-gapped. The HTML tool alone will get you
through a quarterly review.

Use it if you want:

1. **Priority inference** — P0/P1/P2/P3 with an audited justification line
   per item (see `PRIORITY_FRAMEWORK.md`).
2. **Industry signals** — live web-searched public-record context from
   ACSC, hyperscaler IRAP assessments, ANAO / OAIC findings, and PSPF /
   Cyber Security Act / SOCI updates. Private consultancy and
   practitioner commentary are deliberately excluded
   (see `INDUSTRY_SIGNALS.md`).
3. **Burndown** — every P0 / P1 placed on a 12-week cadence with an
   expected state for today (see `BURNDOWN_PLAYBOOK.md`).
4. **Conversational follow-up** — "re-scope ISM-0123 as N/A", "summarise
   for leadership", "produce a Jira CSV", all without rerunning the
   review.

### The short version

The HTML tool is the computation. The Project is the judgement layer on
top. They are additive. Teams that don't adopt Claude keep a complete,
working tool; teams that do get an inference layer for free.

Output is rendered as a single Markdown artifact you can paste into
Confluence, Word, email or your own SSP-A workflow.

## 2. One-time setup (≈ 10 min)

### 2.1 Requirements

- A Claude.ai account with Projects enabled (Pro / Team / Enterprise).
- Your product's baseline SSP-A (`.xlsx`) — the version you signed at the end
  of last quarter.
- The ASD / ACSC Cloud Controls Matrix (`.xlsx`) for the current quarter.
- A short paragraph describing the product (name, information classification,
  hosting, key components).
- **Strongly recommended**: a **posture brief** filled from
  `POSTURE_BRIEF_TEMPLATE.md` — Essential Eight actuals, open IRAP findings,
  top open risks, known weaknesses, platform-vs-product evidence split,
  last pen-test, in-flight uplift. Without this, the priority inference is
  abstract (see §3.2 below).
- The ISM Changes PDF for the same quarter (required) — provides the
  cross-validation signal and the ASD-authored rescission rationale in the
  register.

If your SSP-A is protected by Microsoft Purview / AIP / MIP / DRM, save an
unprotected working copy first. Encrypted workbooks cannot be read inside the
Project.

### 2.2 Create the Project

1. In Claude.ai, open **Projects** from the sidebar.
2. Click **Create Project**.
3. Name it "ISM Quarterly Review" (or whatever makes sense for your org).
4. Set a short description, e.g. "Per-quarter ASD ISM delta review, scoping
   pre-fill, priority inference, and burndown against the product's SSP-A."

### 2.3 Paste the custom instructions

1. In the Project, open **Custom instructions**.
2. Open `PROJECT_INSTRUCTIONS.md` from this pack.
3. Copy the content from the top of the file (starting at the first heading)
   to the bottom.
4. Paste it into the Custom instructions field. Save.

### 2.4 Upload the knowledge files

From the **Project knowledge** panel, upload every one of these files:

- `METHODOLOGY.md` — deterministic rules for parsing, delta, pre-fills,
  drift, pair detection, E8 lineage.
- `PRIORITY_FRAMEWORK.md` — P0 / P1 / P2 / P3 rules, the six tilt
  domains, and the posture-grounded adjustments (§5).
- `INDUSTRY_SIGNALS.md` — the four public-record sources Claude searches
  each quarter.
- `BURNDOWN_PLAYBOOK.md` — 12-week cadence, seven states, slippage
  handling.
- `OUTPUT_TEMPLATE.md` — the exact output structure Claude produces.
- `POSTURE_BRIEF_TEMPLATE.md` — the structured brief you fill in each
  quarter so Claude can ground priority against your product's actual
  security state, not just classification.
- `PROJECT_INSTRUCTIONS.md` — upload this too, so Claude can refer to its
  own instructions if the reviewer asks "why are you doing X?".

You do not need to upload the Word/HTML version of the standalone tool — the
Project reproduces its logic from `METHODOLOGY.md`.

### 2.5 Sanity check

Open a new chat in the Project and send:

> Show me the list of knowledge files you have and, in one line each, what
> each file is for.

Claude should list all six files with one-sentence summaries. If any file is
missing from the list, re-upload it.

## 3. Run your first review

### 3.0 Before you upload — five assumptions the tool makes

The delta, pre-fills and Essential Eight snapshot rest on a handful of
assumptions. If any are untrue for your product the output will still look
plausible but won't be trustworthy. The two most common pitfalls:

- **SSP-A must be a complete baseline** — every ISM control in force when the
  SSP-A was last finalised, including Not-Applicable rows. If your organisation
  has deleted Not-Applicable rows instead of marking them NA, they will
  reappear in the current CCM with no baseline match and the tool will report
  them as **New** when they aren't genuinely new.
- **Identifiers are stable across quarters.** A rename from ASD is surfaced as
  one Rescinded + one New item; the possible-pair detector flags likely
  matches as hints but does not auto-link them.

Full assumptions table with detection hooks is in [`METHODOLOGY.md`](METHODOLOGY.md)
§0. Skim it before your first review — it'll save you hunting for the cause
if a quarter's delta looks larger than expected.

### 3.1 Start the chat

Open a new chat inside the Project and attach:

- The baseline SSP-A (`.xlsx`).
- The current-quarter CCM (`.xlsx`).
- The current-quarter ISM Changes PDF.

Type a message like:

> Please run the quarterly review for **<product name>**, classification
> **PROTECTED**, hosted on **<Azure / GCP / AWS / on-prem>**. Short product
> overview:
>
> <one to three sentences describing the product — what it does, architecture,
> who uses it>.
>
> Current-posture brief (filled from `POSTURE_BRIEF_TEMPLATE.md`):
>
> <paste the filled template here — or, if you've kept it as a separate file,
> upload it as a knowledge file named `posture-<product>-<quarter>.md` before
> starting the chat and say so in the message>
>
> Follow the Project workflow exactly. Produce the full output per
> `OUTPUT_TEMPLATE.md`.

**If you don't have the posture brief ready**, start anyway — Claude will
run the review with abstract priorities (marked as such) and offer to
re-run once you supply a brief. A review with abstract priorities is still
more useful than a review never done.

Claude will:

1. Parse the two workbooks and (if supplied) the PDF.
2. Compute the delta (New / Modified / Rescinded).
3. Apply pre-fill heuristics and flag every pre-fill as a suggestion.
4. Detect applicability drift and rescission + re-issue pairs.
5. Build the Essential Eight evidence-lineage view.
6. Web-search for this quarter's industry signals.
7. Assign P0 / P1 / P2 / P3 per `PRIORITY_FRAMEWORK.md`.
8. Plot P0 / P1 items on the 12-week burndown.
9. Produce a single Markdown artifact covering every section of
   `OUTPUT_TEMPLATE.md`.

### 3.2 Expected output shape

The artifact will contain (in order):

1. Header and inputs.
2. Change counts (Controls / Principles × New / Modified / Rescinded).
3. Priority summary table.
4. P0 list (with one-line justifications).
5. P1 list (with one-line justifications).
6. P2 / P3 counts (details on request).
7. Register tables by kind and change type.
8. Applicability drift hints.
9. Possible rescission + re-issue pairs.
10. Essential Eight evidence lineage.
11. Industry signals this quarter.
12. Burndown plot.
13. Leadership summary (prose).
14. Reviewer caveat.

## 4. Common follow-ups

Once the first output lands, you will typically want to iterate. The Project
supports these follow-up patterns:

- **"Re-scope ISM-0123 as Not Applicable — it's handled by the identity
  platform, not us."** Claude records the override in the audit trail, rebuilds
  priority and burndown around it, and shows the diff from the previous
  answer.
- **"Why is ISM-0456 P0?"** Claude restates the specific
  `PRIORITY_FRAMEWORK.md` rule that triggered and the evidence from the
  change.
- **"Summarise for leadership (one page)."** Claude produces a one-page prose
  summary — product, counts, top three P0s, top two industry signals,
  burndown health.
- **"Generate the xlsx register."** Claude produces an xlsx with the same
  columns the standalone HTML tool uses.
- **"Produce Jira backlog issues for the P0 / P1 items."** Claude produces a
  backlog-compatible CSV.
- **"I'm in week 7 of the quarter, not week 1."** Claude re-plots the
  burndown against that anchor and flags slippage.

## 5. Running a CCM-vs-CCM comparison

If you want to see what changed between two CCM quarters — no product SSP-A
involved — start the chat like this:

> Please run a CCM-vs-CCM comparison. Baseline: **<prior quarter CCM.xlsx>**.
> Current: **<current quarter CCM.xlsx>**. I don't have a product SSP-A for
> this pass; skip the pre-fills and the E8 corroboration against SSP-A.

Claude will apply the CCM-vs-CCM overrides in `METHODOLOGY.md §9`:

- No pre-fill heuristics (every change is `Default`).
- No applicability drift check.
- No SSP-A-side E8 corroboration (still shows the CCM E8 view).
- Labels the baseline as "previous-quarter CCM", not "SSP-A".

## 6. Troubleshooting

**Claude says the workbook is protected / unreadable.**
The file is labelled with Purview / AIP / MIP or encrypted with DRM. Save an
unprotected working copy and upload that. The copy stays within the chat.

**Claude says a column is missing.**
Check the header row. Both the SSP-A and CCM need at minimum: `Identifier`,
`Revision`, `Updated`, `Guideline`, `Topic`, `Description`,
`Provider Responsibility`, `Implementation Status`, and `Applicability`.
ML columns can be named either `ML1 / ML2 / ML3` or `Essential 8 ML1 / ML2 /
ML3`. If your template differs, ask Claude to read the header row you actually
have and map it.

**Claude produces too much output and hits the response limit.**
Ask for the register in chunks — "show me Rescinded and Modified now; hold
New and the drift hints for the next reply."

**The industry-signals section is missing or says "skipped".**
Web search is unavailable in this session. Either enable web search in the
Project settings or supply a short signals brief of your own as input.

**Priorities look wrong for our product.**
The framework applies org-agnostic tilts. If your product has an unusual
posture (e.g. an isolated air-gapped deployment, or a federally-mandated
SOCI carve-out), tell Claude in the opening message — it will adjust the
tilts accordingly and note the adjustment in the output.

**Two runs on the same inputs produce slightly different output text.**
Expected. The deterministic layer (delta, pre-fills, drift, pairs, E8) is
stable; the narrative layer (P0 justifications, leadership summary, industry
signals phrasing) is generative and will vary. Re-run if you want a fresh
phrasing; the register contents should not change.

## 7. What to do between quarters

- Archive the register from each quarter as a point-in-time artefact of
  record.
- At the start of each new quarter, start a fresh chat in the Project
  (don't append to the prior quarter's chat — the new review should start
  clean).
- Carry forward any P2 items from the prior quarter as the starting backlog
  for the new quarter's week 1 triage (see `BURNDOWN_PLAYBOOK.md`).
- Review the tilts in `PRIORITY_FRAMEWORK.md §3` at least once a year.
  They reflect the AU threat environment and will age.

## 8. Updating the knowledge pack

If you want to extend or localise the pack for your org:

- Keep `METHODOLOGY.md` deterministic. Any new rule should be phrased as
  "if <condition>, do <action>" — no fuzzy language.
- Extend `PRIORITY_FRAMEWORK.md §3 (tilts)` with your org-specific risks if
  any — e.g. "if the product integrates with <regulator>'s data feed, controls
  touching that integration are P0-heavy."
- Extend `INDUSTRY_SIGNALS.md` ("The four sources to consult every quarter")
  with your org's intel feeds — but keep the public-record / private-
  commentary separation intact, or the project's neutrality erodes.
- Don't edit `OUTPUT_TEMPLATE.md` lightly — downstream artefacts (your
  Confluence pages, your SSP-A import scripts) may depend on exact section
  headings.

After editing any file, re-upload it to the Project and prompt Claude with:

> I've updated the knowledge file `<name>.md`. Please acknowledge which version
> you are now using and summarise what changed.

## 9. Where to file feedback

If the Project mis-scopes a change, over- or under-weights a priority, or
mis-pairs a rescission + re-issue, tell Claude in the chat — it will own the
correction and, on request, propose a concrete edit to the relevant
knowledge file. Apply the edit in your local copy, re-upload, and carry the
improvement forward.

---

*Maintained by Gaurav Vikash — [LinkedIn](https://www.linkedin.com/in/gauravvikash/). Based on the
ISM Quarterly Review Tool. Released under the Apache Licence 2.0 — see
[LICENSE](../LICENSE) and [NOTICE](../NOTICE) for attribution requirements.*
