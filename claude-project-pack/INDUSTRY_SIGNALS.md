# Industry signals — what's the sector doing with this quarter's ISM refresh

This document tells Claude what external context to pull in alongside the
raw register. The aim is to give the operator a short "what are other
people saying about this refresh" brief at the top of each review, so they
are not reading the register in a vacuum.

Claude researches these signals fresh each quarter using web search. The
rules are: dated sources, direct links, short paraphrases, no fabrication.
If a source can't be found, skip it — don't guess.

**Sources are limited to the public record — government, regulator,
auditor, legislator, and the hyperscalers' own assurance publications.**
Private consultancy commentary and individual practitioner opinion are
deliberately excluded. They're often useful, but citing them here would
put this project on the side of specific private organisations, which it
will not do.

## When to pull signals

Do a signals search **after** the register is computed but **before**
priority is assigned. That way priority inference can reference specific
current advisories ("ACSC flagged MFA bypass actor activity this quarter,
which tilts identity-change priorities up").

Do **not** pull signals if the operator asks for a "quick register only"
review. Respect the shortcut.

## The four sources to consult every quarter

### 1. ASD / ACSC publications

**What to look for.** ACSC Alerts, Advisories, and Critical Vulnerability
Advisories issued during the review quarter; any "ISM update" companion
blog post; any webinar announcements. Look also at the ASD's Annual Cyber
Threat Report if the quarter crosses a publication window.

**Where.**

- <https://www.cyber.gov.au/about-us/view-all-content/alerts-and-advisories>
- <https://www.cyber.gov.au/about-us/view-all-content/news-and-media/news>
- The Information Security Manual landing page for the quarter in question
  at <https://www.cyber.gov.au>.

**How to use.** ACSC advisories that name specific TTPs or vulnerabilities
are direct input to the priority tilts. If ACSC called out MFA bypass this
quarter, treat identity controls as P0-heavy even if the matrix would say
P1.

**Caveat.** ACSC language is deliberately measured. "Monitor" does not mean
"act this week". Read carefully.

### 2. Hyperscaler IRAP assessment updates

**What to look for.** If the product uses Microsoft Azure, Google Cloud
Platform, or AWS, check the hyperscaler's latest IRAP PROTECTED or IRAP
OFFICIAL: SENSITIVE assessment documentation. A new assessment usually
lags the ISM refresh by one or two quarters, but the provider's own
changelog between assessments is published.

**Where.**

- Microsoft: <https://learn.microsoft.com/en-us/compliance/regulatory/offering-irap-australia>
- Google Cloud: <https://cloud.google.com/security/compliance/irap>
- AWS: <https://aws.amazon.com/compliance/irap/>

**How to use.** If the hyperscaler hasn't yet updated against the current
quarter's ISM, call that out clearly — it means the product is relying on
an older assurance assertion and may need to note the delta in its own
SSP-A.

**Caveat.** Hyperscaler IRAP documentation is sometimes months behind the
current ISM. That's normal. The delta is what matters — not the latest
date. These are *self-published* assurance artefacts; they are included
because they are material to any customer's SSP-A, not as an endorsement
of the provider.

### 3. Peer agencies and sector intelligence

**What to look for.** Publicly disclosed cyber incidents in the AU
government or its suppliers during the quarter; findings from the
Auditor-General (ANAO) or state equivalents; PSPF protocol updates; PSPF /
ISM alignment statements.

**Where.**

- ANAO audit reports: <https://www.anao.gov.au/work/audits-and-reports>
- Office of the Australian Information Commissioner (OAIC) data-breach
  reports.
- State auditor-general offices (NSW AO, Victorian AO, etc.).
- State cyber agencies' quarterly updates if the product serves state
  government.

**How to use.** ANAO and state AG audit findings are the clearest signal
of what ASD expects in practice. If ANAO slammed multiple agencies for
poor logging retention in the quarter, logging-related ISM changes are
unusually hot. Tilt priority accordingly.

**Caveat.** Audit findings are lagging indicators. The incident they
respond to may be two quarters old. Note the lag when citing.

### 4. Adjacent standards and alignment shifts

**What to look for.** Changes to the PSPF that reference the ISM;
alignments / divergences between the ISM and ISO/IEC 27001, NIST SP
800-53, the SOCI Act's risk-management program obligations, and the new
Cyber Security Act 2024 (Cth) or successor legislation. Any legislated
obligation that now requires specific ISM controls as evidence.

**Where.**

- AGD PSPF page: <https://www.ag.gov.au/protective-security>
- Department of Home Affairs critical infrastructure page (SOCI Act).
- Standards Australia and ISO publication feeds for the quarter.

**How to use.** If the PSPF has cross-referenced a specific ISM control as
its evidence baseline, that control jumps to P0 territory for any system
serving a federal agency subject to PSPF.

**Caveat.** Legislation moves slowly. Check actual commencement dates,
not announcement dates.

## What to emit in the output

Under a heading **"Industry signals this quarter"**, produce:

1. Three to five bullet findings, each with:
   - Source name and publication date.
   - One-sentence paraphrase of the finding.
   - A direct hyperlink.
   - One-line note on how it tilts the product's priorities (or
     "no tilt").
2. A "no signal found" note for any of the four categories where nothing
   relevant surfaced. Do not leave a category silently absent.
3. The date of the search, so the operator knows when the signals were
   current.

## What this section is NOT

- **Not a news digest.** If a finding doesn't tilt a priority, don't
  include it. The goal is decision-support, not awareness.
- **Not a recommendation.** Paraphrase the finding; don't prescribe action
  beyond "consider as tilt input".
- **Not a channel for private commentary.** Consultancy briefings,
  practitioner blogs, LinkedIn commentary, vendor whitepapers and
  analyst notes do not belong here, even when they are insightful. The
  operator can weigh those inputs themselves outside this workflow.
- **Not a substitute for the operator's own advisory feed.** The operator
  may have subscriptions and internal intelligence Claude doesn't see.
  Invite them to add it as input ("anything from your internal SOC this
  quarter that should tilt priorities?").
- **Not retrospective.** Signals from before the review quarter shouldn't
  enter here unless they're still materially active (an open ACSC advisory,
  an unresolved incident).

## If web search is unavailable

If the Claude session doesn't have web access, say so clearly at the top
of the output:

> **Industry signals skipped.** Web search is unavailable in this
> session. The register and priority inference do not include this
> quarter's external context. Re-run with web access or supply a
> signals brief as an input.

Do not fabricate signals. Do not pull signals from training data unless
explicitly asked — your training data will be older than the review
quarter.

## Caveats on interpretation

- Public-record signals are a **leading indicator**, not a conclusion.
  ACSC advising caution on a TTP is not the same as ASD mandating a
  control change.
- Correlation is not causation. A control change coinciding with an
  incident doesn't mean the change was triggered by the incident.
- Keep it short. A long signals section competes with the register for
  the reviewer's attention. Five bullets, not twenty.

---

*See also: PRIORITY_FRAMEWORK.md §3 tilts that this section feeds into;
METHODOLOGY.md for the delta that priority is assigned to;
OUTPUT_TEMPLATE.md for where these signals appear in the output.*
