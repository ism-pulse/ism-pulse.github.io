/**
 * IRAP Pulse — lossless .xlsx editing (ZIP/XML surgery).
 *
 * Every spreadsheet export in this tool edits the ORIGINAL workbook bytes at the
 * ZIP/XML level instead of round-tripping through the xlsx writer. The writer
 * silently drops dropdown data validations, conditional formatting, frozen
 * panes, autofilter and styles, and inflates a 200 KB file to several MB — which
 * is what made the browser run out of memory. Editing in place preserves
 * everything the workbook ships with and keeps output roughly the same size as
 * the input, so memory stays flat.
 *
 * Two modes:
 *   1. editXlsxCells   — rewrite a handful of cell VALUES in place (Create SSP-A,
 *                        Create CCM). Every other byte is preserved.
 *   2. rebuildSheet    — rebuild one sheet's <sheetData> from a new array-of-
 *                        arrays while REUSING the original per-cell style indices,
 *                        for exports that reorder / add rows (Update SSP-A). All
 *                        other workbook parts (dropdowns, panes, other sheets) are
 *                        preserved; dimension / autofilter / dataValidation ranges
 *                        are re-stretched to the new row count.
 *
 * fflate is the only dependency and is vendored + bundled (no CDN).
 */

import { unzipSync, zipSync, strFromU8, strToU8 } from './vendor/fflate.js';

// ---- tiny XML + column helpers --------------------------------------------
export function escapeXmlText(s: any): string {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function unescapeXmlAttr(s: any): string {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
// 1-based column number → letters (1→A, 26→Z, 27→AA).
export function colLettersFromNum(n: number): string {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
// letters → 1-based column number (A→1).
export function colNumFromLetters(l: string): number {
  let n = 0;
  for (const c of String(l)) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

// ---- workbook part resolution ---------------------------------------------
// Resolve the worksheet XML path (e.g. "xl/worksheets/sheet3.xml") for a sheet
// name by walking workbook.xml → workbook.xml.rels. Returns null if not found.
export function findWorksheetXmlPath(files: Record<string, Uint8Array>, sheetName: string): string | null {
  const wbXml = files['xl/workbook.xml'] ? strFromU8(files['xl/workbook.xml']) : '';
  if (!wbXml) return null;
  let rid: string | null = null;
  const sheetRe = /<sheet\b[^>]*?>/g;
  let m: RegExpExecArray | null;
  while ((m = sheetRe.exec(wbXml))) {
    const tag = m[0];
    const nameM = tag.match(/\bname="([^"]*)"/);
    const ridM = tag.match(/r:id="([^"]*)"/);
    if (nameM && ridM && unescapeXmlAttr(nameM[1]) === sheetName) { rid = ridM[1]; break; }
  }
  if (!rid) return null;

  const relsXml = files['xl/_rels/workbook.xml.rels'] ? strFromU8(files['xl/_rels/workbook.xml.rels']) : '';
  const relRe = new RegExp('<Relationship\\b[^>]*?Id="' + rid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*?>');
  const rm = relsXml.match(relRe);
  if (!rm) return null;
  const tgtM = rm[0].match(/Target="([^"]*)"/);
  if (!tgtM) return null;

  let target = unescapeXmlAttr(tgtM[1]);
  if (target.startsWith('/')) target = target.replace(/^\//, '');
  else if (!target.startsWith('xl/')) target = 'xl/' + target;
  target = target.replace(/\/[^/]+\/\.\.\//g, '/');
  return files[target] ? target : null;
}

// ---- mode 1: value-only cell edits ----------------------------------------
// Rewrite the value of each <c> whose ref is in editMap. Each target cell keeps
// its existing style (s attribute) and is switched to an inline string so the
// shared-strings table is never touched. Cells not in the map are untouched.
//
// Implemented as a single linear pass using indexOf only — the cursor never
// moves backwards, so a malformed or unterminated cell tag cannot trigger the
// quadratic backtracking a regex would. Cell content text is always XML-escaped
// in a real worksheet, so a literal "<c" only ever begins a cell element.
export function applyCellValueEdits(xml: string, editMap: Map<string, string>): string {
  let out = '';
  let i = 0;
  const n = xml.length;
  while (i < n) {
    const open = xml.indexOf('<c', i);
    if (open < 0) { out += xml.slice(i); break; }
    const after = xml.charCodeAt(open + 2);
    // Only '<c ', '<c>' or '<c/' start a cell element (not '<col', '<cellStyle'…).
    if (after !== 32 && after !== 62 && after !== 47) { out += xml.slice(i, open + 2); i = open + 2; continue; }
    const gt = xml.indexOf('>', open);
    if (gt < 0) { out += xml.slice(i); break; }
    let cellEnd: number;
    if (xml.charCodeAt(gt - 1) === 47) cellEnd = gt + 1;            // self-closing <c .../>
    else { const close = xml.indexOf('</c>', gt); if (close < 0) { out += xml.slice(i); break; } cellEnd = close + 4; }

    out += xml.slice(i, open);                                      // text before this cell
    const openTag = xml.slice(open, gt + 1);
    const rM = openTag.match(/ r="([A-Z]+[0-9]+)"/);
    const ref = rM ? rM[1] : null;
    if (ref && editMap.has(ref)) {
      const sM = openTag.match(/ s="(\d+)"/);
      const sAttr = sM ? ` s="${sM[1]}"` : '';
      out += `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXmlText(editMap.get(ref))}</t></is></c>`;
    } else {
      out += xml.slice(open, cellEnd);
    }
    i = cellEnd;
  }
  return out;
}

// Unzip → rewrite cell values on one sheet → re-zip. Returns the new bytes, or
// null if the sheet/worksheet part can't be located. Throws if the workbook
// fails the decompression-bomb / size preflight.
export function editXlsxCells(buf: ArrayBuffer, sheetName: string, editMap: Map<string, string>): Uint8Array | null {
  assertXlsxSafe(buf);
  const files = unzipSync(new Uint8Array(buf));
  const path = findWorksheetXmlPath(files, sheetName);
  if (!path) return null;
  const xml = strFromU8(files[path]);
  assertWorksheetWithinCaps(xml);
  files[path] = strToU8(applyCellValueEdits(xml, editMap));
  return zipSync(files, { level: 6 });
}

// ---- size caps + decompression-bomb preflight -----------------------------
// fflate allocates exactly the declared uncompressed size per ZIP entry, so
// bounding the declared sizes (read from the central directory without
// inflating) bounds memory use and rejects a decompression bomb up front.
export const XLSX_CAPS = {
  maxEntries:       2048,                 // ZIP parts
  maxWorksheets:    128,                   // worksheet parts (a real CCM/SSP-A has 2–4)
  maxEntryBytes:    64 * 1024 * 1024,     // single uncompressed part
  maxTotalBytes:    96 * 1024 * 1024,     // all parts uncompressed
  maxSheetXmlBytes: 64 * 1024 * 1024,     // one worksheet's XML
  maxCells:         4_000_000,            // cells in one worksheet
};

const WORKSHEET_RE = /^xl\/worksheets\/sheet[^/]*\.xml$/i;

export interface PreflightResult { ok: boolean; reason?: string; totalUncompressed: number; entries: number; }

// Inspect declared uncompressed sizes WITHOUT inflating (fflate's filter skips
// decompression when it returns false), so a bomb never allocates memory.
export function preflightXlsx(buf: ArrayBuffer): PreflightResult {
  let entries = 0, worksheets = 0, total = 0, over = false;
  try {
    unzipSync(new Uint8Array(buf), { filter: (f: any) => {
      entries++;
      if (WORKSHEET_RE.test(f.name)) worksheets++;
      const sz = f.originalSize || 0;
      total += sz;
      if (sz > XLSX_CAPS.maxEntryBytes) over = true;
      return false;
    } });
  } catch {
    return { ok: false, reason: 'The file is not a readable .xlsx (ZIP) container.', totalUncompressed: 0, entries: 0 };
  }
  if (entries > XLSX_CAPS.maxEntries)        return { ok: false, reason: `The workbook has too many internal parts (${entries}).`, totalUncompressed: total, entries };
  if (worksheets > XLSX_CAPS.maxWorksheets)  return { ok: false, reason: `The workbook has too many worksheets (${worksheets}). A standard CCM or SSP-A has only a few.`, totalUncompressed: total, entries };
  if (over)                                  return { ok: false, reason: 'A part of the workbook is too large when uncompressed — the file may be malformed or hostile.', totalUncompressed: total, entries };
  if (total > XLSX_CAPS.maxTotalBytes)       return { ok: false, reason: `The workbook expands to about ${Math.round(total / 1048576)} MB uncompressed, over the safe limit.`, totalUncompressed: total, entries };
  return { ok: true, totalUncompressed: total, entries };
}

// Throwing wrapper used by the edit/rebuild entry points.
export function assertXlsxSafe(buf: ArrayBuffer): void {
  const pf = preflightXlsx(buf);
  if (!pf.ok) throw new Error(pf.reason || 'The workbook failed the safety preflight.');
}

// Guard a single worksheet's XML: byte size and cell count (linear scan).
export function assertWorksheetWithinCaps(xml: string): void {
  if (xml.length > XLSX_CAPS.maxSheetXmlBytes) throw new Error('The worksheet is too large to process safely.');
  let count = 0, idx = 0;
  while ((idx = xml.indexOf('<c', idx)) >= 0) {
    const a = xml.charCodeAt(idx + 2);
    if (a === 32 || a === 62 || a === 47) { if (++count > XLSX_CAPS.maxCells) throw new Error('The worksheet has too many cells to process safely.'); }
    idx += 2;
  }
}

// ---- mode 2: rebuild one sheet's data, reusing original styles -------------

// Parse a worksheet's <sheetData> into a per-row map of column-number → style
// index, so a rebuilt sheet can reuse the original cell formatting. Single
// linear pass (indexOf only) — no backtracking, safe on malformed input.
function parseRowStyles(xml: string): Map<number, Record<number, string>> {
  const out = new Map<number, Record<number, string>>();
  const sdStart = xml.indexOf('<sheetData');
  if (sdStart < 0) return out;
  const sdGt = xml.indexOf('>', sdStart);
  if (sdGt < 0) return out;
  const sdEnd = xml.indexOf('</sheetData>', sdGt);
  const body = xml.slice(sdGt + 1, sdEnd < 0 ? xml.length : sdEnd);
  const n = body.length;
  let i = 0;
  while (i < n) {
    const rowOpen = body.indexOf('<row', i);
    if (rowOpen < 0) break;
    const rowGt = body.indexOf('>', rowOpen);
    if (rowGt < 0) break;
    const rowTag = body.slice(rowOpen, rowGt + 1);
    const rNumM = rowTag.match(/ r="(\d+)"/);
    let rowEnd: number, inner: string;
    if (body.charCodeAt(rowGt - 1) === 47) { rowEnd = rowGt + 1; inner = ''; }
    else { const close = body.indexOf('</row>', rowGt); if (close < 0) break; inner = body.slice(rowGt + 1, close); rowEnd = close + 6; }
    if (rNumM) {
      const cells: Record<number, string> = {};
      const m = inner.length;
      let j = 0;
      while (j < m) {
        const cOpen = inner.indexOf('<c', j);
        if (cOpen < 0) break;
        const ca = inner.charCodeAt(cOpen + 2);
        if (ca !== 32 && ca !== 62 && ca !== 47) { j = cOpen + 2; continue; }
        const cGt = inner.indexOf('>', cOpen);
        if (cGt < 0) break;
        const cTag = inner.slice(cOpen, cGt + 1);
        const refM = cTag.match(/ r="([A-Z]+)\d+"/);
        const sM = cTag.match(/ s="(\d+)"/);
        if (refM) cells[colNumFromLetters(refM[1])] = sM ? sM[1] : '';
        if (inner.charCodeAt(cGt - 1) === 47) j = cGt + 1;
        else { const cc = inner.indexOf('</c>', cGt); j = cc < 0 ? m : cc + 4; }
      }
      out.set(+rNumM[1], cells);
    }
    i = rowEnd;
  }
  return out;
}

export interface RebuildPlan {
  finalHeaders: any[];                 // header row values (incl. any appended columns)
  finalRows: any[][];                  // data rows (each already padded to finalHeaders length)
  sourceExcelRows: (number | null)[];  // per data row: original Excel row to copy styles from, or null (new row)
  headerExcelRow: number;              // original Excel row (1-based) that held the header — for header styles
}

// Build the XML for one cell, reusing a style index and emitting numbers as
// numeric cells and everything else as inline strings.
function emitCell(colNum: number, rowNum: number, value: any, sIdx: string | undefined): string {
  const ref = colLettersFromNum(colNum) + rowNum;
  const sAttr = sIdx ? ` s="${sIdx}"` : '';
  if (value == null || value === '') return `<c r="${ref}"${sAttr}/>`;
  if (typeof value === 'number' && isFinite(value)) return `<c r="${ref}"${sAttr}><v>${value}</v></c>`;
  return `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXmlText(value)}</t></is></c>`;
}

// Rebuild one sheet's <sheetData> from plan.finalHeaders + finalRows, reusing
// the original per-cell style indices, then re-stretch dimension / autofilter /
// dataValidation ranges to the new last row. Returns the new worksheet XML.
export function rebuildWorksheetXml(xml: string, plan: RebuildPlan): string {
  const rowStyles = parseRowStyles(xml);
  const headerStyles = rowStyles.get(plan.headerExcelRow) || {};
  // Template row for new rows / appended columns: first existing source row, else header.
  const firstSrc = plan.sourceExcelRows.find(n => n != null) as number | undefined;
  const templateStyles = (firstSrc != null ? rowStyles.get(firstSrc) : null) || headerStyles || {};
  const nCols = plan.finalHeaders.length;
  // Defensive guard: refuse to emit a grid so large it would exhaust memory.
  // This catches workbooks whose used range is wildly inflated (a stray far-right
  // cell can push the column count into the thousands). The caller should trim
  // the header width; this is the backstop.
  const cellsToEmit = nCols * (plan.finalRows.length + 1);
  if (cellsToEmit > 3_000_000) {
    throw new Error(`The worksheet would rebuild to ${nCols} columns × ${plan.finalRows.length + 1} rows (${cellsToEmit} cells), which is too large. The source file's used range looks inflated — open it in Excel, delete unused far-right columns, save, and try again.`);
  }
  const origLastCol = Math.max(0, ...Object.keys(headerStyles).map(Number));

  const styleFor = (rowMap: Record<number, string> | undefined, colNum: number): string | undefined => {
    if (rowMap && rowMap[colNum] != null) return rowMap[colNum];
    // appended columns (beyond the original) or missing cell → template's nearest style
    if (templateStyles[colNum] != null) return templateStyles[colNum];
    if (origLastCol && templateStyles[origLastCol] != null) return templateStyles[origLastCol];
    return undefined;
  };

  const lines: string[] = [];
  // header row → output Excel row 1
  {
    let cells = '';
    for (let c = 0; c < nCols; c++) cells += emitCell(c + 1, 1, plan.finalHeaders[c], styleFor(headerStyles, c + 1));
    lines.push(`<row r="1" spans="1:${nCols}">${cells}</row>`);
  }
  // data rows → Excel rows 2..N
  for (let i = 0; i < plan.finalRows.length; i++) {
    const excelRow = i + 2;
    const src = plan.sourceExcelRows[i];
    const srcMap = src != null ? rowStyles.get(src) : undefined;
    const vals = plan.finalRows[i] || [];
    let cells = '';
    for (let c = 0; c < nCols; c++) cells += emitCell(c + 1, excelRow, vals[c], styleFor(srcMap, c + 1));
    lines.push(`<row r="${excelRow}" spans="1:${nCols}">${cells}</row>`);
  }

  const lastRow = plan.finalRows.length + 1;
  const lastColLetters = colLettersFromNum(nCols);
  const newSheetData = `<sheetData>${lines.join('')}</sheetData>`;

  let out = xml.replace(/<sheetData\b[^>]*>[\s\S]*?<\/sheetData>/, () => newSheetData);

  // dimension
  out = out.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:${lastColLetters}${lastRow}"/>`);
  // autofilter (keep only if it existed) — stretch to the full new range
  out = out.replace(/<autoFilter ref="[^"]*"/, `<autoFilter ref="A1:${lastColLetters}${lastRow}"`);
  // data validations — rebuild each sqref to span its original columns over rows 2..lastRow.
  // Character classes are length-bounded ({0,N}) so a malformed tag cannot cause
  // quadratic backtracking on untrusted input.
  out = out.replace(/<dataValidation\b[^>]{0,8192}?\bsqref="([^"]{0,32768})"/g, (full, sq) => {
    const cols = new Set<number>();
    sq.split(/\s+/).forEach((part: string) => {
      part.split(':').forEach(ref => { const cm = ref.match(/^([A-Z]+)\d+$/); if (cm) cols.add(colNumFromLetters(cm[1])); });
    });
    if (!cols.size) return full;
    const min = Math.min(...cols), max = Math.max(...cols);
    const newSq = `${colLettersFromNum(min)}2:${colLettersFromNum(max)}${lastRow}`;
    return full.replace(/\bsqref="[^"]*"/, `sqref="${newSq}"`);
  });
  // Drop merged cells: the rebuilt sheet has no banner/merged regions, and a
  // mergeCells range pointing at rows that no longer exist makes Excel prompt to
  // repair the file.
  out = out.replace(/<mergeCells\b[\s\S]{0,4194304}?<\/mergeCells>/g, '');
  out = out.replace(/<mergeCell\b[^>]{0,4096}\/>/g, '');

  return out;
}

// Unzip → rebuild one sheet → re-zip. Returns new bytes, or null if not found.
export function rebuildSheetInXlsx(buf: ArrayBuffer, sheetName: string, plan: RebuildPlan): Uint8Array | null {
  assertXlsxSafe(buf);
  const files = unzipSync(new Uint8Array(buf));
  const path = findWorksheetXmlPath(files, sheetName);
  if (!path) return null;
  const xml = strFromU8(files[path]);
  assertWorksheetWithinCaps(xml);
  files[path] = strToU8(rebuildWorksheetXml(xml, plan));
  return zipSync(files, { level: 6 });
}

// ---- mode 3: multi-sheet Update orchestration -----------------------------
// Rename a worksheet in workbook.xml (used so the exported baseline carries the
// new quarter in its sheet name for next-quarter re-detection).
function renameSheetInWorkbook(files: Record<string, Uint8Array>, oldName: string, newName: string): void {
  if (!files['xl/workbook.xml'] || oldName === newName) return;
  let xml = strFromU8(files['xl/workbook.xml']);
  const escNew = newName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  xml = xml.replace(/<sheet\b[^>]*?>/g, tag => {
    const nameM = tag.match(/\bname="([^"]*)"/);
    if (nameM && unescapeXmlAttr(nameM[1]) === oldName) return tag.replace(/\bname="[^"]*"/, `name="${escNew}"`);
    return tag;
  });
  files['xl/workbook.xml'] = strToU8(xml);
}

// Remove worksheets whose name matches `re` (e.g. a stale Pivot tab): drop the
// <sheet> entry, its relationship, the part file and its content-type override.
function removeSheetsByRegex(files: Record<string, Uint8Array>, re: RegExp): void {
  if (!files['xl/workbook.xml']) return;
  let wbXml = strFromU8(files['xl/workbook.xml']);
  const relsXml0 = files['xl/_rels/workbook.xml.rels'] ? strFromU8(files['xl/_rels/workbook.xml.rels']) : '';
  let relsXml = relsXml0;
  let ctXml = files['[Content_Types].xml'] ? strFromU8(files['[Content_Types].xml']) : '';

  const toRemovePaths: string[] = [];
  wbXml = wbXml.replace(/<sheet\b[^>]*?\/?>/g, tag => {
    const nameM = tag.match(/\bname="([^"]*)"/);
    const ridM = tag.match(/r:id="([^"]*)"/);
    if (!nameM || !re.test(unescapeXmlAttr(nameM[1]))) return tag;
    if (ridM && relsXml0) {
      const relRe = new RegExp('<Relationship\\b[^>]*?Id="' + ridM[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*?>');
      const rm = relsXml0.match(relRe);
      if (rm) {
        const tgtM = rm[0].match(/Target="([^"]*)"/);
        if (tgtM) {
          let target = unescapeXmlAttr(tgtM[1]);
          target = target.startsWith('/') ? target.replace(/^\//, '') : 'xl/' + target;
          toRemovePaths.push(target.replace(/\/[^/]+\/\.\.\//g, '/'));
        }
        relsXml = relsXml.replace(relRe, '');
      }
    }
    return ''; // drop the <sheet> entry
  });

  files['xl/workbook.xml'] = strToU8(wbXml);
  if (relsXml0) files['xl/_rels/workbook.xml.rels'] = strToU8(relsXml);
  toRemovePaths.forEach(p => {
    delete files[p];
    if (ctXml) {
      const pn = '/' + p;
      ctXml = ctXml.replace(new RegExp('<Override\\b[^>]*?PartName="' + pn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*?/>'), '');
    }
  });
  if (ctXml) files['[Content_Types].xml'] = strToU8(ctXml);
}

// Remove any <definedNames> block from workbook.xml. Print areas and pivot
// source ranges become invalid once a review sheet is rebuilt or renamed and
// would otherwise trigger an Excel "repaired records" prompt on open.
function clearDefinedNames(files: Record<string, Uint8Array>): void {
  if (!files['xl/workbook.xml']) return;
  let xml = strFromU8(files['xl/workbook.xml']);
  xml = xml.replace(/<definedNames\b[\s\S]*?<\/definedNames>/g, '');
  files['xl/workbook.xml'] = strToU8(xml);
}

// Append a brand-new plain worksheet built from an array-of-arrays (header +
// rows). Used only when the baseline lacks a review sheet that the CCM has;
// the sheet is created with default styling (no styles to preserve).
function addWorksheet(files: Record<string, Uint8Array>, sheetName: string, aoa: any[][]): void {
  // pick a free worksheet part index
  let maxN = 0;
  Object.keys(files).forEach(k => { const m = k.match(/^xl\/worksheets\/sheet(\d+)\.xml$/); if (m) maxN = Math.max(maxN, +m[1]); });
  const partName = `xl/worksheets/sheet${maxN + 1}.xml`;

  // build sheetData
  const nCols = aoa.reduce((m, r) => Math.max(m, (r || []).length), 1);
  const rowsXml = aoa.map((r, ri) => {
    let cells = '';
    for (let c = 0; c < (r || []).length; c++) cells += emitCell(c + 1, ri + 1, r[c], undefined);
    return `<row r="${ri + 1}" spans="1:${nCols}">${cells}</row>`;
  }).join('');
  const wsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${colLettersFromNum(nCols)}${Math.max(1, aoa.length)}"/><sheetData>${rowsXml}</sheetData></worksheet>`;
  files[partName] = strToU8(wsXml);

  // workbook.xml: new sheetId + r:id
  let wbXml = strFromU8(files['xl/workbook.xml']);
  let maxSheetId = 0;
  (wbXml.match(/sheetId="(\d+)"/g) || []).forEach(s => { const v = +s.replace(/\D/g, ''); maxSheetId = Math.max(maxSheetId, v); });
  let relsXml = strFromU8(files['xl/_rels/workbook.xml.rels']);
  let maxRid = 0;
  (relsXml.match(/Id="rId(\d+)"/g) || []).forEach(s => { const v = +s.replace(/\D/g, ''); maxRid = Math.max(maxRid, v); });
  const newRid = `rId${maxRid + 1}`;
  const escName = sheetName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  wbXml = wbXml.replace(/<\/sheets>/, `<sheet name="${escName}" sheetId="${maxSheetId + 1}" r:id="${newRid}"/></sheets>`);
  files['xl/workbook.xml'] = strToU8(wbXml);

  relsXml = relsXml.replace(/<\/Relationships>/,
    `<Relationship Id="${newRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${maxN + 1}.xml"/></Relationships>`);
  files['xl/_rels/workbook.xml.rels'] = strToU8(relsXml);

  // content types
  let ctXml = strFromU8(files['[Content_Types].xml']);
  ctXml = ctXml.replace(/<\/Types>/,
    `<Override PartName="/${partName}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
  files['[Content_Types].xml'] = strToU8(ctXml);
}

export interface SheetRebuild { originalName: string; newName: string; plan: RebuildPlan; }
export interface SheetAdd { name: string; aoa: any[][]; }

// Orchestrate a lossless Update export: rebuild existing review sheets in place
// (reusing styles, preserving dropdowns/panes/other sheets), add any missing
// review sheets, drop sheets matching dropSheetRe (e.g. a stale Pivot), clear
// defined names, then re-zip. One unzip/zip for the whole operation.
export function buildUpdatedXlsx(buf: ArrayBuffer, opts: {
  rebuilds: SheetRebuild[];
  adds?: SheetAdd[];
  dropSheetRe?: RegExp;
  clearNames?: boolean;
}): Uint8Array {
  assertXlsxSafe(buf);
  const files = unzipSync(new Uint8Array(buf));

  (opts.rebuilds || []).forEach(rb => {
    const path = findWorksheetXmlPath(files, rb.originalName);
    if (!path) return;
    const xml = strFromU8(files[path]);
    assertWorksheetWithinCaps(xml);
    files[path] = strToU8(rebuildWorksheetXml(xml, rb.plan));
    if (rb.newName && rb.newName !== rb.originalName) renameSheetInWorkbook(files, rb.originalName, rb.newName);
  });

  (opts.adds || []).forEach(a => addWorksheet(files, a.name, a.aoa));
  if (opts.dropSheetRe) removeSheetsByRegex(files, opts.dropSheetRe);
  if (opts.clearNames) clearDefinedNames(files);

  return zipSync(files, { level: 6 });
}

// Re-export the raw fflate primitives for callers that need multi-step edits.
export { unzipSync, zipSync, strFromU8, strToU8 };
