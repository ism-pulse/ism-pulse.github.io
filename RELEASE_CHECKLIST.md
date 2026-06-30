# IRAP Pulse — Release Checklist

Run this before every release, whether it's a quarterly CCM update or a code change.

---

## 1. Automated tests (Terminal)

```bash
npm test                  # 113 unit tests — must all pass
npm run test:integration  # 17 integration tests — must all pass
```

---

## 2. Build

```bash
node build.mjs
```

---

## 3. Browser smoke test (Chrome)

Open `dist/index.html` directly in Chrome (no server needed — smoke-test against the build output before promoting to root).

**Security smoke test**
- Open DevTools Console: the page must load with **no Content-Security-Policy violation errors** (the inline bundle is allowed by its build-time hash). If the hash is stale, rebuild
- Try to upload a file larger than 5 MB: it must be rejected with a clear message, and the "Maximum file size: 5 MB" note must be visible next to each upload control
- All four tabs render and the CDN charts/PDF parsing still work under the CSP

**Zero-delta check**
- Load `ccm-current.xlsx` as both baseline and new CCM
- Expected: change register shows 0 items

**Real delta check**
- Load any file from `ism-archive/` as baseline, `ccm-current.xlsx` as new CCM
- Expected: change register shows a non-zero mix of New / Updated / Rescinded
- Spot-check 2–3 Updated rows — confirm the flagged field (description, applicability, ML, guideline) matches what actually changed

**SSP-A / CCM update check (lossless)**
- Load an older CCM (e.g. from `ism-archive/`) or an SSP-A as baseline, `ccm-current.xlsx` as new CCM
- Expected: delta renders, scoping columns (Implementation Status, Provider Responsibility) are populated on Updated rows
- Click "Export updated baseline" and open it in Excel — confirm it opens with **no repair prompt**, the dropdown lists are still present, frozen panes / autofilter are intact, the Info tab is unchanged, and the sheet is renamed to the new quarter. Output should be roughly the same size as the upload (not many MB) — the export must never freeze the browser

**Create SSP-A check (Tab 1)**
- Enter an organisation name, pick a classification, load the bundled SSP-A template, untick a Guideline or two, then download
- Open the result in Excel — confirm Not Applicable + justification appear on the excluded controls

**Create CCM check (Tab 2)**
- Enter an organisation name, pick a classification, load the bundled CCM (`ccm-current.xlsx`), optionally untick a Guideline, then download
- Open the result in Excel and confirm, **on the Controls tab only**:
  - excluded controls show `Not Applicable` in Implementation Status, Consumer Implementation Required and Consumer Configuration Required; `None` in both Responsibility columns; and the justification in both Comments columns
  - the dropdown lists are still present on those columns (the export is a lossless edit — nothing the sheet shipped with should be lost)
  - frozen panes, autofilter, column widths and the Info / Principles tabs are unchanged

---

## 4. Quarterly CCM update (additional steps)

When updating for a new ISM quarter:

- Replace `ccm-current.xlsx`, `ism-changes-current.pdf`, `sspa-template-current.xlsx` with the new ASD files
- Archive the previous `ccm-current.xlsx` into `ism-archive/` with the quarter in the filename (e.g. `ccm-apr-2025.xlsx`)
- Update the SHA-256 hashes in `src/constants.ts` (`BUNDLED_FILE_HASHES`)
  ```bash
  sha256sum ccm-current.xlsx ism-changes-current.pdf sspa-template-current.xlsx
  ```
- Re-run steps 1–3

---

## 5. Deploy

```bash
git add index.html
git commit -m "release: <quarter> CCM update"   # or describe the change
git push origin main
```

Verify the live GitHub Pages URL loads and the zero-delta check passes against the bundled files.
