/**
 * IRAP Pulse — Create CCM pure logic.
 *
 * Column detection and Not Applicable edit computation for the ASD Cloud
 * Controls Matrix Controls sheet. Pure functions with no DOM, XLSX or fflate
 * dependencies — fully unit-testable in Node.js, mirroring the delta.ts pattern.
 *
 * The CCM Controls sheet carries a Provider side (Provider Responsibility /
 * Implementation Status / Comments) and a Consumer side (Consumer Responsibility
 * / Consumer Implementation Required / Consumer Configuration Required /
 * Comments). When a control is excluded by classification or scope, both sides
 * are marked: Responsibility columns get a plain "None"; the status columns get
 * "Not Applicable" (a permitted value in each column's dropdown list); and both
 * Comments columns get the justification text.
 */

import { canonicaliseHeader } from './normalise';

// Maximum rows to probe when searching for the header row.
const HEADER_SCAN = 20;

const lowRaw = (h: any): string => String(h == null ? '' : h).replace(/\s+/g, ' ').trim().toLowerCase();

// Normalise a guideline name for use as a state key: lowercase, collapse whitespace.
export function normGuidelineNameCCM(s: any): string {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
}

// 0-based column index → Excel column letters (0 → A, 25 → Z, 26 → AA).
export function colLetters(n: number): string {
  let s = '';
  n++;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

export interface CCMColumns {
  hdrIdx: number;
  dataStartIdx: number;
  identColIdx: number;
  glColIdx: number;
  classColIdx: number;
  respColIdx: number;
  implColIdx: number;
  consRespColIdx: number;
  consImplColIdx: number;
  consConfColIdx: number;
  commentCols: number[];
}

// Locate the header row and every column the CCM marker needs. Handles a
// single-row header (the ASD CCM) and a two-row header (some variant templates).
export function detectCCMColumns(aoa: any[], classCol: string): CCMColumns {
  let hdrIdx = 0;
  for (let i = 0; i < Math.min(aoa.length, HEADER_SCAN); i++) {
    if ((aoa[i] || []).some((c: any) => canonicaliseHeader(c) === 'Identifier')) { hdrIdx = i; break; }
  }

  const cols: CCMColumns = {
    hdrIdx, dataStartIdx: hdrIdx + 1,
    identColIdx: -1, glColIdx: -1, classColIdx: -1, respColIdx: -1, implColIdx: -1,
    consRespColIdx: -1, consImplColIdx: -1, consConfColIdx: -1, commentCols: [],
  };

  const scan = (row: any[]) => {
    (row || []).forEach((h: any, i: number) => {
      const raw   = String(h == null ? '' : h).trim();
      const canon = canonicaliseHeader(h);
      const low   = lowRaw(h);
      if (cols.classColIdx < 0 && canon === classCol)                          cols.classColIdx = i;
      if (cols.glColIdx < 0 && (canon === 'Guideline' || canon === 'Section')) cols.glColIdx    = i;
      if (cols.identColIdx < 0 && canon === 'Identifier')                      cols.identColIdx = i;
      if (cols.respColIdx < 0 && canon === 'Provider Responsibility')          cols.respColIdx  = i;
      if (cols.implColIdx < 0 && (raw === 'Implementation' || canon === 'Implementation Status')) cols.implColIdx = i;
      if (cols.consRespColIdx < 0 && low === 'consumer responsibility')           cols.consRespColIdx = i;
      if (cols.consImplColIdx < 0 && low === 'consumer implementation required')  cols.consImplColIdx = i;
      if (cols.consConfColIdx < 0 && low === 'consumer configuration required')   cols.consConfColIdx = i;
      if (low === 'comments' && !cols.commentCols.includes(i))                    cols.commentCols.push(i);
    });
  };

  scan(aoa[hdrIdx] || []);
  if ((cols.classColIdx < 0 || cols.implColIdx < 0 || cols.commentCols.length === 0) && hdrIdx + 1 < aoa.length) {
    scan(aoa[hdrIdx + 1] || []);
    if (cols.classColIdx >= 0) cols.dataStartIdx = hdrIdx + 2;
  }

  return cols;
}

export interface CCMEdit { ref: string; value: string; }

export interface CCMEditResult {
  edits: CCMEdit[];
  naCount: number;
  total: number;
  cols: CCMColumns;
  error?: string;
}

export interface CCMGuidelineState { checked: boolean; justification?: string; }

// Compute the list of cell edits (Excel A1 refs → new string value) for every
// control excluded by classification or by an unticked Guideline. Pure: it does
// not touch a workbook, only an array-of-arrays of the Controls sheet.
export function computeCCMEdits(aoa: any[], opts: {
  classCol: string;
  classDisplay: string;
  guidelineStates: Record<string, CCMGuidelineState>;
}): CCMEditResult {
  const { classCol, classDisplay, guidelineStates } = opts;
  const cols = detectCCMColumns(aoa, classCol);
  const result: CCMEditResult = { edits: [], naCount: 0, total: 0, cols };

  if (cols.implColIdx < 0 || cols.commentCols.length === 0) {
    result.error = 'Could not find Implementation or Comments columns in the Controls sheet.';
    return result;
  }
  if (cols.classColIdx < 0) {
    result.error = `Could not find the ${classCol} applicability column in the Controls sheet. Classification-based Not Applicable decisions cannot be applied.`;
    return result;
  }
  if (cols.glColIdx < 0) {
    result.error = 'Could not find a Guideline or Section column in the Controls sheet. Scope exclusions from the checklist cannot be applied.';
    return result;
  }

  const provComment = cols.commentCols[0];
  const consComment = cols.commentCols.length > 1 ? cols.commentCols[1] : -1;

  for (let rowIdx = cols.dataStartIdx; rowIdx < aoa.length; rowIdx++) {
    const row = aoa[rowIdx] || [];
    if (!row.some((c: any) => c != null)) continue;
    if (cols.identColIdx >= 0 && !row[cols.identColIdx]) continue;
    result.total++;

    const guidelineName = cols.glColIdx >= 0 ? String(row[cols.glColIdx] || '').trim() : '';
    const isClassNA = String(row[cols.classColIdx] || '').trim().toLowerCase() === 'no';
    const gState    = guidelineStates[normGuidelineNameCCM(guidelineName)];
    const isGlOOS   = !!gState && !gState.checked;

    if (!isClassNA && !isGlOOS) continue;
    result.naCount++;

    let commentValue: string;
    if (isClassNA) {
      commentValue = `This control is not applicable to the system classified as ${classDisplay}.`;
    } else {
      const std    = `This system does not implement ${guidelineName}. This control is not applicable to the assessed system's architecture and operating environment.`;
      const custom = (gState && gState.justification) ? gState.justification : '';
      commentValue = (!custom || custom.includes(std)) ? (custom || std) : std + ' ' + custom;
    }

    const excelRow = rowIdx + 1;
    const push = (colIdx: number, value: string) => {
      if (colIdx >= 0) result.edits.push({ ref: colLetters(colIdx) + excelRow, value });
    };
    // Provider side — Responsibility is free text → "None"; status uses a
    // dropdown-permitted "Not Applicable".
    push(cols.respColIdx, 'None');
    push(cols.implColIdx, 'Not Applicable');
    push(provComment, commentValue);
    // Consumer side
    push(cols.consRespColIdx, 'None');
    push(cols.consImplColIdx, 'Not Applicable');
    push(cols.consConfColIdx, 'Not Applicable');
    push(consComment, commentValue);
  }

  return result;
}
