/**
 * IRAP Pulse — identifier / header normalisation and row parsing.
 *
 * normaliseAOA() is the testable core of normaliseRows(): it accepts a raw
 * array-of-arrays (AOA) so unit tests can exercise it without XLSX.
 * normaliseRows() is the production wrapper that calls XLSX first.
 */

import {
  COLUMN_ALIASES, HEADER_SCAN_ROWS, UNICODE_HYPHENS,
  MONTH_ABBR, FUNCTION_PREFIX,
} from './constants';

// ---- Identifier normalisation -----------------------------------------------
// ISM-1234 / ISM 1234 / ism-1234 / ISM‑1234 (non-breaking hyphen) → ISM-1234.
// Principle IDs: GOV 1 / GOV-1 / gov-1 → GOV-1.
export function normaliseIdentifier(s: any): string {
  return String(s == null ? '' : s)
    .replace(UNICODE_HYPHENS, '-')
    .replace(/\b(ISM)\s+(\d{1,5})\b/gi, '$1-$2')
    .replace(/\b(GOV|IDE|IDN|IDF|PRO|DET|RES|REC)\s+(\d{1,3})\b/gi, '$1-$2')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// ---- Header canonicalisation ------------------------------------------------
// Maps a raw column header string to the canonical name used throughout the tool.
export function canonicaliseHeader(raw: any): string {
  if (raw == null) return '';
  let h = String(raw).replace(/\s+/g, ' ').trim();

  if (h.length > 256) h = h.slice(0, 256);

  // Reject HTML/script injection — return raw so they never silently match.
  if (/<[a-z\/!]/i.test(h) || /javascript:/i.test(h)) return h;

  // Strip trailing org-specific qualifiers before alias lookup.
  const stripped = h
    .replace(/\s*[\(\[][^\)\]]{1,100}[\)\]]\s*$/, '')
    .replace(/\s*[-–—]\s*[A-Za-z0-9][A-Za-z0-9\s]{0,60}$/, '')
    .trim();

  for (const [canonical, patterns] of COLUMN_ALIASES) {
    if (patterns.some(p => p.test(stripped) || p.test(h))) return canonical;
  }
  return h;
}

// ---- Row parsing — AOA core (testable) --------------------------------------
// Accepts a raw array-of-arrays (output of XLSX.utils.sheet_to_json with header:1).
// Separated from normaliseRows() so unit tests can call it without XLSX.
export function normaliseAOA(aoa: any[][], orgName?: string): any[] {
  // Find the header row — first row containing 'Identifier' (or alias).
  let hdrRow = 0;
  for (let i = 0; i < Math.min(aoa.length, HEADER_SCAN_ROWS); i++) {
    const row = aoa[i] || [];
    const hasId = row.some(c => {
      const h = String(c == null ? '' : c).replace(/\s+/g, ' ').trim();
      return canonicaliseHeader(h) === 'Identifier';
    });
    if (hasId) { hdrRow = i; break; }
  }

  const rawHeaders = aoa[hdrRow] || [];
  const headers = rawHeaders.map((h: any) => canonicaliseHeader(h));

  // Multi-party SSP-As: resolve duplicate column names using parent-group scoring.
  const parentRow = hdrRow > 0 ? (aoa[hdrRow - 1] || []) : [];
  const getParentGroup = (col: number): string => {
    for (let c = col; c >= 0; c--) {
      const v = String(parentRow[c] || '').trim();
      if (v) return v.toLowerCase();
    }
    return '';
  };
  const orgLc = (orgName || '').toLowerCase();

  const scoreCol = (col: number, anchorGroup: string): number => {
    let s = 0;
    const raw = String(rawHeaders[col] || '').toLowerCase();
    const grp = getParentGroup(col);
    if (anchorGroup && grp === anchorGroup) s += 10;
    if (orgLc && (raw.includes(orgLc) || grp.includes(orgLc))) s += 5;
    return s;
  };

  const pickBest = (canonical: string, anchorGroup: string): number => {
    const candidates = headers.map((h: string, i: number) => h === canonical ? i : -1).filter((i: number) => i >= 0);
    if (!candidates.length) return -1;
    if (candidates.length === 1) return candidates[0];
    return candidates.reduce((best: number, col: number) =>
      scoreCol(col, anchorGroup) > scoreCol(best, anchorGroup) ? col : best
    );
  };

  const isCol  = pickBest('Implementation Status', '');
  const isGrp  = isCol >= 0 ? getParentGroup(isCol) : '';
  const prCol  = pickBest('Provider Responsibility', isGrp);

  const GROUPED_BEST = new Map<string, number>([
    ['Implementation Status',  isCol],
    ['Provider Responsibility', prCol],
  ]);

  const rows: any[] = [];
  for (let i = hdrRow + 1; i < aoa.length; i++) {
    const src = aoa[i] || [];
    // Null-prototype so a hostile column header (e.g. "__proto__", "constructor")
    // cannot pollute or shadow via the `h in out` check below.
    const out: any = Object.create(null);
    headers.forEach((h: string, c: number) => {
      if (!h) return;
      if (GROUPED_BEST.has(h)) {
        if (GROUPED_BEST.get(h) === c) out[h] = src[c] == null ? null : src[c];
      } else if (!(h in out)) {
        out[h] = src[c] == null ? null : src[c];
      } else if (orgLc && String(rawHeaders[c] || '').toLowerCase().includes(orgLc)) {
        out[h] = src[c] == null ? null : src[c];
      }
    });
    if (out['Identifier']) {
      out['Identifier'] = normaliseIdentifier(out['Identifier']);
      rows.push(out);
    }
  }
  return rows;
}

// ---- Worksheet → array-of-arrays (requires XLSX global) ---------------------
// Hard ceiling on the parsed grid. A real ISM CCM is ~1100 rows × ~25 columns
// (~27k cells); anything beyond this is corruption or abuse, so we refuse rather
// than freeze. Generous enough to never reject a legitimate file.
export const MAX_SHEET_CELLS = 2_000_000;

// Convert a worksheet to an AOA, clamping BOTH the row and column extent to the
// last row/column that actually holds a VALUE. Workbooks frequently carry a
// hugely inflated used range (e.g. "A1:XEL1048576") from empty-but-formatted
// stray cells far to the right or bottom; left as-is, sheet_to_json pads every
// row out to that range, which can mean tens of millions of cells and a multi
// second freeze. Clamping to the real data extent makes it instant with
// identical content, and an explicit ceiling guards against genuinely huge input.
export function sheetToAOA(sheet: any): any[][] {
  if (!sheet || !sheet['!ref']) return [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  let maxC = range.s.c;
  let maxR = range.s.r;
  for (const k in sheet) {
    if (k.charCodeAt(0) === 33) continue;          // skip '!ref', '!cols', …
    const cell = sheet[k];
    if (cell && cell.v != null && cell.v !== '') {
      const a = XLSX.utils.decode_cell(k);
      if (a.c > maxC) maxC = a.c;
      if (a.r > maxR) maxR = a.r;
    }
  }
  const clamped = maxC < range.e.c || maxR < range.e.r;
  if (clamped) { range.e.c = maxC; range.e.r = maxR; }

  const nRows = range.e.r - range.s.r + 1;
  const nCols = range.e.c - range.s.c + 1;
  if (nRows * nCols > MAX_SHEET_CELLS) {
    throw new Error(`This worksheet is too large to process (${nRows} rows × ${nCols} columns). A standard ISM CCM is around 1100 rows. Open the file in Excel, remove stray data or formatting outside the table, save, and try again.`);
  }

  const opts: any = { header: 1, defval: null };
  if (clamped) opts.range = XLSX.utils.encode_range(range);
  return XLSX.utils.sheet_to_json(sheet, opts) as any[][];
}

// ---- Row parsing — production wrapper (requires XLSX global) ----------------
export function normaliseRows(sheet: any, orgName?: string): any[] {
  return normaliseAOA(sheetToAOA(sheet), orgName);
}

// ---- Quarter label helpers --------------------------------------------------
export function quarterFromSheetName(sheetName: string): string {
  const s = sheetName || '';
  let m = /(?:Controls|Principles)\s*-\s*(\w+)\s*(\d{4})/i.exec(s);
  if (m) {
    const month = MONTH_ABBR[m[1].toLowerCase()] || m[1].slice(0, 3);
    return `${month}-${m[2].slice(-2)}`;
  }
  m = /\b(January|February|March|April|May|June|July|August|September|October|November|December)[\s\-,]*(20\d{2})\b/i.exec(s);
  if (m) {
    const month = MONTH_ABBR[m[1].toLowerCase()] || m[1].slice(0, 3);
    return `${month}-${m[2].slice(-2)}`;
  }
  m = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\-]?(20\d{2})\b/i.exec(s);
  if (m) {
    const abbr = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    return `${abbr}-${m[2].slice(-2)}`;
  }
  return '';
}

export function quarterLong(q: string): string {
  const m = /^(\w{3})-(\d{2})$/.exec(q || '');
  if (!m) return q;
  const monthFull = Object.keys(MONTH_ABBR).find(k => MONTH_ABBR[k] === m[1]);
  return (monthFull ? monthFull.charAt(0).toUpperCase() + monthFull.slice(1) : m[1]) + ' 20' + m[2];
}

// ---- Principle function helpers ---------------------------------------------
export function functionFromId(id: any): string | null {
  if (!id) return null;
  const m = String(id).toUpperCase().match(/^([A-Z]{2,4})[-\s]/);
  if (!m) return null;
  return FUNCTION_PREFIX[m[1]] || null;
}
