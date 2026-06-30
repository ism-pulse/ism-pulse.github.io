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
│   ├── vendor/fflate.js    ← vendored fflate@0.8.2 (bundled; lossless .xlsx ZIP edit)
│   └── globals.d.ts        ← ambient CDN globals (XLSX, pdfjsLib, Chart)
├── tests/                  ← vitest unit tests (105 tests across 5 files)
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
npm test                   # 105 unit tests — run after any logic change
npm run test:integration   # 17 integration tests — run before a release
npm run typecheck          # tsc type check without emitting
node build.mjs             # compile → dist/index.html (~355 KB)
```

### Build pipeline notes

- esbuild compiles `src/main.ts` + logic modules (incl. `ccm.ts`) and vendored `fflate` into a single IIFE bundle
- Create CCM export is lossless: it edits the original .xlsx at the ZIP/XML level (rewrites only target cell values in the Controls sheet) so dropdowns, conditional formatting, panes, autofilter, column widths and styles are preserved; Info/Principles sheets are never touched
- `build.mjs` injects the bundle into `template.html` to produce `dist/index.html`
- TypeScript uses `strict: false`; DOM code uses `as any` casts liberally; pure logic modules are properly typed
- CDN globals (XLSX, pdfjsLib, Chart, ChartDataLabels) declared in `src/globals.d.ts`
- Pure logic functions use `normaliseAOA` (XLSX-free) for testability; production wrappers call XLSX first
- No devDependency vulnerabilities — `xlsx` was intentionally excluded; integration tests use `normaliseAOA` directly
