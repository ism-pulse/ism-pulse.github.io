# Security policy — IRAP Pulse

## Reporting a vulnerability

If you find a security issue — for example a way for a malicious file to execute code in the user's browser, or a way for the tool to leak data off the client — please report it privately rather than opening a public GitHub issue.

Contact: LinkedIn DM to <https://www.linkedin.com/in/gauravvikash/>

We will acknowledge within a few days, work on a fix, and credit you in the release notes unless you prefer to stay anonymous.

Please do not attach real SSP-As, CCMs or customer data to your report. Redact identifiers and wording, or reproduce the issue using sample data.

---

## Security posture of the current release

**Static analysis.** The full TypeScript source (`src/*.ts`, `template.html`, vendored `src/vendor/fflate.js`) was reviewed for memory-exhaustion, denial-of-service and client-side injection vectors prior to release. All findings were remediated. See [SAST-REPORT.md](SAST-REPORT.md) for the full report and remediation status.

**Upload cap.** Uploads are capped at 5 MB (`MAX_XLSX_MB`), enforced before any parsing, with the limit displayed next to every upload control.

**Decompression bomb protection.** A ZIP preflight (`preflightXlsx`) reads each entry's declared uncompressed size without inflating and rejects the file if the part count, any single entry, or the total uncompressed size exceeds safe ceilings (1024 parts / 64 MB per part / 96 MB total). Every upload routes through `readWorkbookSafe`, which runs the preflight before parsing. The lossless export functions also preflight before inflating. Verified: a 200 KB file declaring 200 MB is rejected with zero memory growth.

**Linear XML parsing.** Worksheet XML in the lossless export path is parsed with single-pass `indexOf` scanners, not backtracking regular expressions. The previously quadratic cell-matcher that could hang the browser tab on a crafted file was replaced in this release. Structural regexes that remain are length-bounded.

**Content Security Policy.** A strict CSP meta tag is injected at build time. The inline application bundle is allowed by a SHA-256 hash computed and embedded by `build.mjs`. Injected inline scripts are blocked. `object-src 'none'`, `base-uri 'none'` and `form-action 'none'` are set. Smoke-test the page under CSP after every build.

**Subresource Integrity.** All four CDN JavaScript libraries are loaded with SHA-384 SRI hashes pinned to exact versions. The browser will refuse to execute any library if the CDN serves a modified file. The pdf.js worker is loaded as a Web Worker rather than a script tag, so browser-native SRI does not apply; the tool fetches it, verifies its SHA-384 hash in JavaScript before use, and rejects any mismatch.

**Bundled file integrity.** On every page load the tool computes SHA-256 hashes of the three bundled ASD data files and compares them against expected values embedded in the HTML at release time. A mismatch is displayed visibly in the interface.

**PDF parsing limits.** `parsePDFFromBuffer` parses pages sequentially, caps page count at 100, caps extracted text at 5 M characters with early exit, and calls `page.cleanup()` and `pdf.destroy()` after each page.

**Fetch budget.** Bundled and archive downloads use `fetchArrayBufferCapped`, which checks `Content-Length` and streams with a running 25 MB budget, aborting before an oversized response can buffer.

**DOM injection.** Dynamic content is set via `createElement` + `textContent` rather than `innerHTML` where possible. Where `innerHTML` is used, user-derived strings pass through `escapeHtml()` (escapes `& < > " '`). No `eval()`, `new Function()` or string-form timer callbacks are present.

**No server component.** The distributable is a single HTML file. There is no backend, no authentication surface, no database, and no session state stored outside the browser tab.

**Data handling.** Files uploaded by the user are parsed in-browser and are not transmitted anywhere. Closing or reloading the tab discards all state.

| Check | Result |
| --- | --- |
| `fetch()` calls | Limited to the three bundled ASD data files (relative paths) and the four CDN library loads on startup. No other outbound calls |
| `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource` | Zero occurrences |
| `eval()`, `new Function()`, string-form `setTimeout`/`setInterval` | Zero occurrences |
| `innerHTML` assignments | All occurrences reviewed; user-derived strings pass through `escapeHtml()` |
| External URLs | Limited to the four SRI-pinned CDN script tags, the pdf.js worker (hash-verified in JS), and static outbound links to cyber.gov.au, cybernion.com.au and the author's LinkedIn profile |

---

## Responsible use

You are responsible for handling uploaded files in line with your organisation's data-classification, data-sovereignty and record-keeping obligations. The tool is client-side and does not transmit data, but the files remain on your device — ensure that device is authorised for the classification of material being processed.

Do not process SECRET or TOP SECRET material on a device that is not accredited for that classification.
