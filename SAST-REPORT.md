# IRAP Pulse — Static Application Security Review

Scope: the full client-side tool (`src/*.ts`, `template.html`, vendored `src/vendor/fflate.js`) with particular attention to memory-exhaustion and denial-of-service vectors. Method: static code review plus targeted dynamic confirmation of suspected memory and regex blow-ups in an isolated Node sandbox.

Date: 30 June 2026. Reviewer: automated SAST pass.

> Remediation status (30 June 2026): all findings below, plus three additional findings raised in a separate Codex review, have been fixed. The upload cap is now 5 MB and is shown next to every upload control. See "Remediation applied" at the end. Verified with `npm run typecheck`, 113 unit tests, 17 integration tests, `node build.mjs`, and dynamic checks confirming the decompression bomb is rejected and the previously quadratic parser is now linear.

## Threat model

The tool is a static, client-side page with no backend and no data egress. The realistic attacker is a **malicious or malformed `.xlsx` / `.pdf`** that an assessor opens, for example a tampered Cloud Controls Matrix or SSP-A circulated by a third party. The relevant question for almost every finding is therefore: can a crafted input file crash, hang or subvert the browser tab. Server-side classes (SQLi, SSRF, auth) do not apply.

## Severity summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Decompression bomb in `.xlsx` unzip exhausts memory | Medium | Fixed |
| 2 | Quadratic-time regex parsing of untrusted worksheet XML hangs the tab | Medium | Fixed |
| 3 | No Content-Security-Policy (defence-in-depth only) | Low | Fixed |
| 4 | Report exporters still use the heavy xlsx writer | Low | Mitigated (bounded by 5 MB cap + preflight) |
| 5 | Quadratic sentence-split regex in PDF parsing | Low | Fixed |
| 6 | Object maps keyed by file-derived strings | Informational | Fixed |
| C1 | PDF parsing can blow browser memory (Codex) | High | Fixed |
| C2 | XLSX guards cap compressed size only, not expanded size (Codex) | High | Fixed |
| C3 | Bundled/archive fetches buffer before size enforcement (Codex) | Medium | Fixed |

No High or Critical issues were found. The cross-site-scripting surface, which is the usual high-risk area for a tool that renders untrusted file content into the DOM, is well controlled (see Positive controls).

---

## Finding 1 — Decompression bomb exhausts browser memory (Medium)

Every file-editing export now unzips the uploaded workbook in memory. `unzipSync` inflates every entry fully with no cap on the decompressed size.

Evidence: `src/xlsxsurgery.ts:98` (`editXlsxCells`) and `src/xlsxsurgery.ts:220` (`buildUpdatedXlsx`) both call `unzipSync(new Uint8Array(buf))`. The legacy reader `XLSX.read(..., { cellStyles: true })` decompresses without a cap as well. The only gate is the **compressed** size (`MAX_XLSX_BYTES = 50 MB`, `src/main.ts:407`), which does not bound the decompressed size.

Confirmed dynamically: a crafted **0.2 MB** zip (well under the 50 MB gate) decompressed to **250 MB** in a single entry, pushing process RSS from 54 MB to 307 MB. A more aggressive bomb, or one with many entries, trivially reaches multiple GB and crashes a browser tab. Compression ratios above 1000x are easy to achieve with repeated bytes.

Impact: opening a malicious workbook and clicking any export (Create SSP-A, Create CCM, Update baseline) can spike memory until the tab becomes unresponsive or is killed by the browser. This is the same class of failure the recent refactor set out to remove, reachable here through a hostile file rather than the writer.

Remediation: cap the decompressed size before inflating. fflate exposes each entry's `originalSize` through the streaming `unzip(..., { filter })` callback **before** decompression, so a guard is cheap and was confirmed working in testing. Suggested control: reject the file if any single entry, or the sum of all entries, exceeds a sane ceiling (for example 150 MB), with a clear user message. Apply the same ceiling on the `XLSX.read` paths that parse uploads.

## Finding 2 — Quadratic regex on untrusted worksheet XML hangs the tab (Medium)

The lossless surgery parses the uploaded worksheet XML with backtracking regular expressions rather than a real parser.

Evidence: `src/xlsxsurgery.ts:86` cell matcher `/<c r="([A-Z]+[0-9]+)"([^>]*?)(\/>|>[\s\S]*?<\/c>)/g` used by `applyCellValueEdits`; and `src/xlsxsurgery.ts:113`/`:121` row and cell matchers in `parseRowStyles`. When the closing delimiter is absent, the non-greedy scan re-runs at many start positions.

Confirmed dynamically as **O(n²)**: worst-case input of repeated unclosed `<c r="A1">` tags timed 8 ms (2k cells), 35 ms (4k), 139 ms (8k), 560 ms (16k / 144 KB), each doubling roughly quadrupling the time. Extrapolated, a few-hundred-KB hostile worksheet hangs the tab for tens of seconds, and a multi-MB one for many minutes to hours, an effective freeze. The earlier ad-hoc test on a 1 MB input did not return within 45 seconds and left a runaway process.

Impact: a crafted `.xlsx` whose Controls worksheet contains malformed or unterminated cell tags freezes the browser the moment the user runs an export. This vector did not exist before the refactor, which used the xlsx tokeniser rather than regex scanning.

Remediation (in order of robustness):

- replace the regex scan with a single linear left-to-right pass (one cursor, never re-scan) for both the value-edit and the sheetData-rebuild paths, this removes the quadratic behaviour entirely and is the recommended fix
- or parse the worksheet XML with the browser-native `DOMParser`, which is linear and not backtracking-prone, then edit via the DOM
- as an interim mitigation, combine the Finding 1 size cap with a quick well-formedness check (reject a worksheet whose `<c ...>` count and `>` count are wildly mismatched) so pathological inputs never reach the regex

## Finding 3 — No Content-Security-Policy (Low)

`template.html` ships no CSP `<meta http-equiv>` (confirmed: none present). The app's XSS safety rests entirely on disciplined manual escaping. A single missed `escapeHtml` would be directly exploitable with no second layer to catch it.

Remediation: add a strict CSP. Because the compiled bundle is injected as an inline `<script>`, use a hash-based policy, for example `script-src 'self' 'sha256-<bundle hash>' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`. The build step can compute and inject the inline-script hash automatically.

## Finding 4 — Report exporters still use the heavy xlsx writer (Low)

`exportXlsx` (`src/main.ts:1377`, change register) and `exportCmpRegister` (`src/main.ts:4554`, version comparison) build brand-new workbooks with `xlsx-js-style` (`XLSX.write` at `:1919` and `:4751`). There is no source workbook to preserve here, so the lossless approach does not apply, but the writer is the same one that inflated output ~20x and is memory-heavy. Output size is bounded by the delta (the changed controls, typically a subset), so the risk is materially lower than the baseline export was.

Remediation: optional. If a single quarter ever produces a very large delta, build these reports with the same fflate-based writer from a minimal template to keep memory flat. Otherwise document the bound and leave as is.

## Finding 5 — Quadratic sentence-split regex in PDF parsing (Low)

`src/pdf.ts:94` and `:209` use `/[^.!?]+[.!?]+/g`. On text with no sentence terminators this exhibits O(n²) backtracking. It is bounded by the size of the bundled or uploaded Changes PDF text, so the practical impact is small, but a very large terminator-free PDF could be slow.

Remediation: low priority. Cap the input length, or split on terminators with a linear scan.

## Finding 6 — Object maps keyed by file-derived strings (Informational)

Several lookup objects are plain `{}` keyed by values taken from the uploaded file, for example `guidelineStates[...]`, `ccmHeaderMap[...]` and `baselineById[...]` in `src/main.ts`. A key such as `__proto__` does not cause global prototype pollution here (bracket assignment sets only that object's own prototype slot, and the values are not later used as code), so impact is informational. Using `new Map()` or `Object.create(null)` would remove the ambiguity entirely. The cell edit map already uses `Map`, which is the right pattern.

---

## Positive controls (verified)

- All four CDN scripts (xlsx-js-style, pdf.js, Chart.js, chartjs-plugin-datalabels) carry SHA-384 Subresource Integrity hashes and `crossorigin`, so a tampered CDN file will not execute
- Bundled assets (CCM, SSP-A template, Changes PDF) are SHA-256 verified in the browser against pinned hashes, and the verification fails closed
- The pdf.js worker is fetched and SHA-384 verified in JavaScript before use, and PDF parsing is disabled on mismatch, again fail-closed
- Untrusted file content rendered into the DOM is consistently passed through `escapeHtml` (71 call sites), and filter dropdowns are populated with `createElement` + `textContent` rather than HTML, so the XSS surface is well contained
- The inline word-diff caps its input at 1500 characters before running the O(n*m) LCS, avoiding a CPU blow-up on long descriptions (`src/main.ts`, `wordDiffHtml`)
- Dynamic `RegExp` objects built from file or user data escape regex metacharacters first (`src/pdf.ts`, `src/xlsxsurgery.ts`)
- No runtime dependencies are shipped, `fflate` is vendored and pinned (MIT, 0.8.2), and `npm audit` reports 0 vulnerabilities
- Fully client-side, no network egress of user data, and a 50 MB upload size gate is enforced

## Recommended remediation order

1. Finding 2: make the worksheet-XML parsing linear (single-pass scanner or `DOMParser`). Highest value, removes a browser-hang reachable from a hostile file, and is a regression from the recent refactor
2. Finding 1: add a decompressed-size cap on unzip and on the xlsx reader
3. Finding 3: add a hash-based CSP via the build step
4. Findings 4, 5, 6: address opportunistically

Findings 1 and 2 are the only ones with real-world DoS impact, both require a crafted file, and both were introduced by the recent lossless-export work. They are well contained and can be fixed without touching the export logic's behaviour.

---

## Remediation applied (30 June 2026)

Uploads are now capped at **5 MB** (`MAX_XLSX_MB` in `src/main.ts`), enforced before any parsing, and the limit is shown next to every upload control (Create SSP-A, Create CCM, and the Tab 2 baseline).

- Finding 1 / Codex C2 — a ZIP preflight (`preflightXlsx` in `src/xlsxsurgery.ts`) reads each entry's declared uncompressed size **without inflating** and rejects the file if the part count, any single part, or the total uncompressed size exceeds the caps (1024 parts, 64 MB per part, 96 MB total). fflate allocates exactly the declared size per entry, so this bounds memory. Every upload now routes through `readWorkbookSafe`, which preflights before `XLSX.read`, and the surgery entry points (`editXlsxCells`, `rebuildSheetInXlsx`, `buildUpdatedXlsx`) preflight before `unzipSync`. Per-worksheet XML byte and cell-count caps are also enforced. Verified: a 200 KB file declaring 200 MB is rejected with zero memory growth
- Finding 2 — `applyCellValueEdits` and `parseRowStyles` were rewritten as single linear `indexOf` passes (no backtracking). Verified: input that previously hung now processes 1.6 M malformed cells in 3 ms. The few structural regexes in the rebuild path were additionally length-bounded
- Finding 3 — a strict `Content-Security-Policy` meta tag was added; the inline application bundle is allowed by a SHA-256 hash computed and injected at build time (`build.mjs`), so injected inline scripts are blocked. `object-src 'none'`, `base-uri 'none'`, `form-action 'none'` are set. This should be smoke-tested in a browser as part of release
- Finding 4 — left on the xlsx writer but now bounded: the report is built from the delta, which the 5 MB upload cap and the preflight keep small
- Finding 5 — the sentence-split input is capped at 20 000 characters before the O(n^2) regex
- Finding 6 — file-keyed lookup objects now use `Object.create(null)`
- Codex C1 — `parsePDFFromBuffer` now parses pages sequentially (not all at once with `Promise.all`), caps `numPages` at 100, caps extracted text at 5 M characters with early exit, and calls `page.cleanup()` and `pdf.destroy()`
- Codex C3 — bundled and archive downloads go through `fetchArrayBufferCapped`, which checks `Content-Length` and then streams with a running 25 MB budget, aborting before an oversized response can buffer

Residual: the CSP relies on `style-src 'unsafe-inline'` (inline style attributes are used throughout) and must be verified in a real browser so a bundled library that needs a blocked capability does not silently break.

### Follow-up round (30 June 2026)

A second Codex pass raised two more Low items, both fixed:

- the dead `parseXLSXWithStyles()` helper (a raw `XLSX.read` with no preflight, no call sites) was deleted, removing the future-regression risk
- the remaining file-keyed plain-object maps were converted to `Object.create(null)` (19 across `src/main.ts`, `src/delta.ts` and the `normaliseRows` row builder in `src/normalise.ts`), so a hostile column header or identifier such as `__proto__` or `constructor` cannot shadow prototype members in any aggregation or row-keyed path. As a side benefit the row builder's `header in row` duplicate-column check is now correct for any header name. A fresh sweep confirmed the only remaining `{}` map is keyed by integer column numbers (no string-key pollution surface), and every `unzipSync` / `XLSX.read` of untrusted bytes is preceded by the preflight. 113 unit + 17 integration tests still pass and the export remains lossless.
