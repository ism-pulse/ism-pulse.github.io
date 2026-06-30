# IRAP Pulse

**By [Cybernion](https://cybernion.com.au/) · Built by [Gaurav Vikash](https://www.linkedin.com/in/gauravvikash/)**

A free, single-file, browser-based tool for Australian government and enterprise security teams managing ISM compliance. Everything runs in your browser — no backend, no account, no data leaves your machine.

---

## What it does

IRAP Pulse has four tools in one:

### Tab 1 — Create SSP-A

Generates a pre-populated System Security Plan Annex (SSP-A) from a blank ASD template. Select your system classification and tick the ISM Guidelines that apply to your system. The tool writes a consistent Not Applicable status and justification into every excluded control, leaving all other controls as Not Assessed for you and your assessor to work through.

This eliminates the most tedious part of starting an SSP-A — manually marking hundreds of controls NA before the real assessment work begins.

### Tab 2 — Create CCM

Generates a scoped Cloud Controls Matrix from the current ASD CCM. Select your system classification and tick the Guidelines that apply. The tool writes Not Applicable into excluded controls losslessly, preserving every dropdown, conditional format, pane and style in the original workbook.

### Tab 3 — Update SSP-A or CCM

Computes the quarterly delta between your current SSP-A (or a prior-quarter CCM) and the latest ASD Cloud Controls Matrix. For each changed control the tool pre-fills scoping decisions it can determine mechanically from your own baseline, surfaces cross-validation inconsistencies, and produces three reviewer-ready exports.

**Outputs:**

| Export | What it contains |
| --- | --- |
| Change Register (.xlsx) | Summary, Controls, Principles, Methodology, E8 Snapshot tabs. Full context and editable triage fields for every changed control. |
| Updated Baseline (.xlsx) | Your SSP-A rewritten against the current quarter — new rows inserted, rescinded rows removed, modified rows flagged. |
| Stakeholder note | Plain-English draft for leadership or technical teams, editable before copying. |

### Tab 4 — ISM Version Compare

Side-by-side comparison of two CCM or SSP-A workbooks using Chart.js visualisations. Useful for tracking coverage drift across quarters or between system baselines without running a full update.

---

## Who this is for

- Australian government agencies and cloud service providers running quarterly ISM impact assessments
- IRAP assessors and implementors preparing or reviewing an SSP-A or CCM
- Security and compliance teams maintaining a live SSP-A against the ISM

---

## How to use

Open `index.html` in a browser. No server, no installation.

### Tab 1 — Create SSP-A

1. Enter your organisation name
2. Select **Use ASD's current SSP-A Template** (bundled) or upload your own blank ASD template
3. Select your system classification
4. Review the Guidelines list — pre-ticked Guidelines apply to most systems. Untick any that genuinely do not apply and provide a brief justification
5. Click **Download updated SSP-A (.xlsx)**

### Tab 2 — Create CCM

1. Enter your organisation name
2. Select your system classification
3. Review the Guidelines list — untick any that do not apply and provide a brief justification
4. Click **Download CCM (.xlsx)**

### Tab 3 — Update SSP-A or CCM

1. Enter organisation name, product name, classification and a short product overview
2. Upload your current SSP-A or CCM baseline (.xlsx)
3. The current-quarter CCM and ISM Changes PDF load automatically
4. Click **Update**
5. Review the dashboard — edit In Scope, Triage, Recommended Action and Owner/Notes inline
6. Export before closing the tab — the tool does not persist session state

### Tab 4 — ISM Version Compare

1. Upload two CCM or SSP-A workbooks
2. Review the charts

---

## Privacy and security

- **No data leaves your machine.** All processing is in-browser. Nothing is transmitted to any server.
- **Four JavaScript libraries** are loaded at startup from public CDNs: [xlsx-js-style v1.2.0](https://github.com/gitbrent/xlsx-js-style), [pdf.js v3.11.174](https://github.com/mozilla/pdf.js), [Chart.js v4.4.4](https://www.chartjs.org/) and [chartjs-plugin-datalabels v2.2.0](https://chartjs-plugin-datalabels.netlify.app/). All four are pinned to exact versions with SHA-384 Subresource Integrity (SRI) hashes — the browser refuses to run any library if the CDN serves a modified file. A fifth library, [fflate v0.8.2](https://github.com/101arrowz/fflate), is compiled directly into the application bundle at build time and is not loaded from any CDN.
- **Bundled file integrity.** On load, the tool computes SHA-256 hashes of the bundled CCM, ISM Changes PDF and SSP-A template and compares them against expected values embedded in the HTML at release time. A Verified result confirms the files are byte-for-byte identical to those tested at release.
- **Content Security Policy.** A strict CSP is injected at build time, including a SHA-256 hash of the inline application bundle. Injected inline scripts are blocked.
- **Upload limits and decompression bomb protection.** Uploads are capped at 5 MB. A ZIP preflight reads each entry's declared uncompressed size without inflating and rejects the file if any single part or the total exceeds safe ceilings.

See [SECURITY.md](SECURITY.md) for the full security policy and vulnerability reporting.

---

## Bundled files

Each quarterly release ships three ASD artefacts alongside the distributable:

| File | Contents |
| --- | --- |
| `ccm-current.xlsx` | Current-quarter ASD Cloud Controls Matrix |
| `ism-changes-current.pdf` | Current-quarter ISM Changes PDF |
| `sspa-template-current.xlsx` | Current blank ASD SSP-A template |

See the Release Checklist for the quarterly update procedure.

---

## Building from source

End users do not need to build anything — clone the repo and open `index.html`.

Contributors and maintainers:

```bash
pnpm install
pnpm test                  # 113 unit tests
pnpm test:integration      # 17 integration tests
pnpm typecheck             # tsc type check
node build.mjs             # compiles src/ → dist/index.html + index.html
```

The build pipeline uses TypeScript and esbuild. `dist/index.html` is the intermediate build output; `index.html` at the repo root is the committed distributable.

---

## Known limitations

- **Sensitivity labels.** SSP-As protected with Microsoft Purview / AIP labels cannot be parsed — the browser sees ciphertext. Remove the label, save a clean copy, upload that, then re-apply the label to your original.
- **Password-protected workbooks.** Not supported. Convert to a plain `.xlsx` before uploading.
- **Column layout.** The tool expects ASD's standard CCM and SSP-A column headers. If ASD restructures the CCM in a future quarter, spot-check a few rows and update the column-detection regexes in `src/constants.ts` if needed.
- **Rescission and re-issue.** When ASD retires one identifier and reintroduces the same requirement under a new one, the tool flags the old as Rescinded and the new as New. Likely pairs are hinted at in the dashboard but not auto-linked.
- **Freeze panes.** The xlsx writer does not write frozen rows. Apply manually in Excel after download (View → Freeze Top Row). The lossless exports (Create SSP-A, Create CCM, Updated Baseline) preserve existing freeze panes from the source workbook.

---

## Disclaimer

This tool is provided free of charge on an "as is" basis. The output is a decision-support aid — not professional, legal, compliance, assurance or IRAP advice. You remain solely responsible for reviewing every output, confirming every Not Applicable decision, and ensuring final artefacts meet your organisation's assurance and accreditation obligations.

See [LICENSE](LICENSE) for the full terms.

---

## Not affiliated with ASD or the Australian Government

"ISM", "Cloud Controls Matrix", "Essential Eight", "IRAP" and related terms refer to work published by the Australian Signals Directorate / ACSC. IRAP Pulse is an independent utility and is **not endorsed by, affiliated with, or sponsored by** ASD, ACSC or the Australian Government.
