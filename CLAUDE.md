## IRAP Pulse — build pipeline

TypeScript + esbuild pipeline that compiles to a single distributable `index.html`. This folder is self-contained — no dependencies on files outside it.

### Updated detection policy

An "Updated" row means ASD changed something a reviewer must re-examine: control description, guideline, applicability (per-classification flags or free-text), or Essential Eight maturity levels (ML1/ML2/ML3). These are the only trigger fields. Everything else — ASD Updated date, Topic, Section/Function, Revision, Provider Responsibility — is metadata. Metadata fields refresh silently in the exported baseline but never independently trigger an Updated classification.

### Folder layout

```
IRAP Pulse/
├── src/
│   ├── main.ts             ← application entry point (4500+ lines)
│   ├── constants.ts
│   ├── normalise.ts
│   ├── applicability.ts
│   ├── pdf.ts
│   ├── delta.ts
│   ├── ccm.ts              ← Create CCM pure logic (column detection + NA edits)
│   ├── xlsxsurgery.ts      ← lossless .xlsx editing (value edits + sheet rebuild) used by ALL edit-exports
│   ├── vendor/fflate.js    ← vendored fflate@0.8.2 (bundled; lossless .xlsx ZIP edit)
│   └── globals.d.ts        ← ambient CDN globals (XLSX, pdfjsLib, Chart)
├── tests/                  ← vitest unit tests (113 tests across 6 files)
│   └── integration/        ← integration tests (17 tests, manually triggered)
├── dist/                   ← build output
├── template.html           ← HTML shell; bundle injected before </body>
├── build.mjs               ← esbuild: src/main.ts → dist/index.html
├── ccm-current.xlsx        ← current ASD CCM baseline (bundled reference)
├── package.json
├── tsconfig.json
├── vitest.config.ts        ← unit test config (tests/*.test.ts only)
└── vitest.integration.ts   ← integration test config
```

### Build commands

```bash
npm test                   # 113 unit tests — run after any logic change
npm run test:integration   # 17 integration tests — run before a release
npm run typecheck          # tsc type check without emitting
node build.mjs             # compile → dist/index.html (~355 KB)
```

### Build pipeline notes

- esbuild compiles `src/main.ts` + logic modules (incl. `ccm.ts`, `xlsxsurgery.ts`) and vendored `fflate` into a single IIFE bundle
- ALL three edit-exports are lossless via `xlsxsurgery.ts` — they edit the original .xlsx at the ZIP/XML level instead of round-tripping the xlsx writer (which dropped dropdowns/styles and inflated files ~20x, exhausting browser memory):
  - Create SSP-A / Create CCM → value-only cell edits (`editXlsxCells`); every other byte preserved
  - Update SSP-A baseline → rebuilds the review sheet's `<sheetData>` reusing original per-row styles (`buildUpdatedXlsx`), preserves dropdowns/panes/other sheets incl. Info, drops only a stale Pivot tab, clears defined names, and re-stretches dimension/autofilter/dataValidation ranges
- The two REPORT exports (Tab 2 change register `exportXlsx`, Tab 3 comparison `exportCmpRegister`) build brand-new workbooks from the bounded delta, so there is no source to preserve; they still use the xlsx writer
- `build.mjs` injects the bundle into `template.html` to produce `dist/index.html`
- TypeScript uses `strict: false`; DOM code uses `as any` casts liberally; pure logic modules are properly typed
- CDN globals (XLSX, pdfjsLib, Chart, ChartDataLabels) declared in `src/globals.d.ts`
- Pure logic functions use `normaliseAOA` (XLSX-free) for testability; production wrappers call XLSX first
- No devDependency vulnerabilities — `xlsx` was intentionally excluded; integration tests use `normaliseAOA` directly

### Security hardening (see SAST-REPORT.md)

- Uploads capped at 5 MB (`MAX_XLSX_MB`), enforced before parsing and shown in the UI next to every upload control
- All upload parsing routes through `readWorkbookSafe`, and the surgery functions through `preflightXlsx`, which reads declared ZIP entry sizes WITHOUT inflating and rejects decompression bombs (caps: parts/per-part/total uncompressed + per-worksheet XML bytes and cell count)
- Worksheet XML parsing is linear (`indexOf` scanners in `xlsxsurgery.ts`) — no backtracking regex on untrusted input; structural regexes are length-bounded
- `parsePDFFromBuffer` parses pages sequentially, caps page count + extracted text, and calls `page.cleanup()` / `pdf.destroy()`
- Bundled/archive downloads use `fetchArrayBufferCapped` (Content-Length check + streaming budget)
- `build.mjs` injects a strict CSP with a SHA-256 hash of the inline bundle (`__BUNDLE_CSP_HASH__` placeholder); rebuild whenever the bundle changes. Smoke-test the page under CSP before release
