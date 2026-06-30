import { describe, it, expect } from 'vitest';
import {
  colLettersFromNum, colNumFromLetters, escapeXmlText,
  applyCellValueEdits, rebuildWorksheetXml,
} from '../src/xlsxsurgery';

describe('column helpers', () => {
  it('round-trips column index and letters', () => {
    expect(colLettersFromNum(1)).toBe('A');
    expect(colLettersFromNum(26)).toBe('Z');
    expect(colLettersFromNum(27)).toBe('AA');
    expect(colNumFromLetters('A')).toBe(1);
    expect(colNumFromLetters('Z')).toBe(26);
    expect(colNumFromLetters('AA')).toBe(27);
  });
});

describe('escapeXmlText', () => {
  it('escapes XML metacharacters', () => {
    expect(escapeXmlText('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });
});

describe('applyCellValueEdits', () => {
  const xml = '<sheetData>' +
    '<row r="1"><c r="A1" s="3" t="s"><v>0</v></c><c r="B1" s="4"/></row>' +
    '<row r="2"><c r="A2" s="3" t="s"><v>5</v></c><c r="B2" s="4"/></row>' +
    '</sheetData>';

  it('rewrites only targeted cells, preserving the style index', () => {
    const out = applyCellValueEdits(xml, new Map([['A2', 'Not Applicable'], ['B2', 'None']]));
    expect(out).toContain('<c r="A2" s="3" t="inlineStr"><is><t xml:space="preserve">Not Applicable</t></is></c>');
    expect(out).toContain('<c r="B2" s="4" t="inlineStr"><is><t xml:space="preserve">None</t></is></c>');
    // untouched cells stay exactly as they were
    expect(out).toContain('<c r="A1" s="3" t="s"><v>0</v></c>');
    expect(out).toContain('<c r="B1" s="4"/>');
  });

  it('escapes values written into cells', () => {
    const out = applyCellValueEdits(xml, new Map([['A1', 'x < y & z']]));
    expect(out).toContain('<t xml:space="preserve">x &lt; y &amp; z</t>');
  });
});

describe('rebuildWorksheetXml', () => {
  // A tiny worksheet: header row 1 (A1 s=1, B1 s=1), two data rows, a dropdown on
  // column B, a frozen pane, an autofilter, a dimension and a merged banner.
  const xml =
    '<worksheet><dimension ref="A1:B3"/>' +
    '<sheetViews><sheetView><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews>' +
    '<mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells>' +
    '<sheetData>' +
    '<row r="1"><c r="A1" s="1" t="inlineStr"><is><t>Identifier</t></is></c><c r="B1" s="1" t="inlineStr"><is><t>Status</t></is></c></row>' +
    '<row r="2"><c r="A2" s="7" t="inlineStr"><is><t>ISM-1</t></is></c><c r="B2" s="9" t="inlineStr"><is><t>Not Assessed</t></is></c></row>' +
    '<row r="3"><c r="A3" s="7" t="inlineStr"><is><t>ISM-2</t></is></c><c r="B3" s="9" t="inlineStr"><is><t>Not Assessed</t></is></c></row>' +
    '</sheetData>' +
    '<autoFilter ref="A1:B3"/>' +
    '<dataValidations count="1"><dataValidation type="list" sqref="B2:B3"><formula1>"Not Assessed,Not Applicable"</formula1></dataValidation></dataValidations>' +
    '</worksheet>';

  // Reorder (swap the two data rows), add one new row, append a "Change Status" column.
  const plan = {
    finalHeaders: ['Identifier', 'Status', 'Change Status'],
    finalRows: [
      ['ISM-2', 'Not Assessed', 'No Change'],
      ['ISM-1', 'Not Applicable', 'Updated'],
      ['ISM-9', 'Not Assessed', 'New'],
    ],
    sourceExcelRows: [3, 2, null],
    headerExcelRow: 1,
  };
  const out = rebuildWorksheetXml(xml, plan);

  it('reuses original style indices per source row', () => {
    // ISM-2 came from original row 3 (A s=7, B s=9); now at output row 2
    expect(out).toContain('<c r="A2" s="7" t="inlineStr"><is><t xml:space="preserve">ISM-2</t></is></c>');
    expect(out).toContain('<c r="B2" s="9" t="inlineStr"><is><t xml:space="preserve">Not Assessed</t></is></c>');
    // header keeps its style (s=1)
    expect(out).toContain('<c r="A1" s="1"');
  });

  it('writes the appended column using a template style', () => {
    expect(out).toContain('>Change Status</t></is></c>');
    expect(out).toContain('>New</t></is></c>');
  });

  it('stretches dimension, autofilter and dropdown ranges to the new row count', () => {
    expect(out).toContain('<dimension ref="A1:C4"/>');     // 3 cols, 4 rows
    expect(out).toContain('<autoFilter ref="A1:C4"');
    expect(out).toContain('sqref="B2:B4"');                // dropdown stretched, same column
    expect(out).toContain('<formula1>"Not Assessed,Not Applicable"</formula1>'); // dropdown list preserved
  });

  it('preserves the frozen pane and drops the stale merged banner', () => {
    expect(out).toContain('state="frozen"');
    expect(out).not.toContain('mergeCell');
  });

  it('refuses to rebuild an absurdly wide grid instead of exhausting memory', () => {
    // 16366 columns (a real inflated "A1:XEL…" used range) × ~300 rows > 3M cells.
    const wide = {
      finalHeaders: new Array(16366).fill('H'),
      finalRows: Array.from({ length: 300 }, () => ['x']),
      sourceExcelRows: new Array(300).fill(2),
      headerExcelRow: 1,
    };
    expect(() => rebuildWorksheetXml(xml, wide)).toThrow(/too large|inflated/i);
  });
});
