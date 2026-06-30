import { describe, it, expect, afterEach } from 'vitest';
import { sheetToAOA, MAX_SHEET_CELLS } from '../src/normalise';

// sheetToAOA depends on the XLSX CDN global at runtime. We stub the few helpers
// it uses so the clamping and the hard cap can be tested without the library.
const colToNum = (l: string) => [...l].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);
const parseCell = (a: string) => { const m = a.match(/^([A-Z]+)(\d+)$/)!; return { c: colToNum(m[1]) - 1, r: +m[2] - 1 }; };

function installXlsxStub(sheetToJson: (sheet: any, opts: any) => any) {
  (globalThis as any).XLSX = {
    utils: {
      decode_range: (ref: string) => { const [s, e] = ref.split(':'); return { s: parseCell(s), e: parseCell(e) }; },
      decode_cell: parseCell,
      encode_range: (r: any) => `A1:${r.e.c}/${r.e.r}`,
      sheet_to_json: sheetToJson,
    },
  };
}
afterEach(() => { delete (globalThis as any).XLSX; });

describe('sheetToAOA clamping', () => {
  it('clamps an inflated COLUMN range to the last value-bearing column', () => {
    let seenRange: string | undefined;
    installXlsxStub((_s, opts) => { seenRange = opts && opts.range; return [['ok']]; });
    // Declared range is thousands of columns wide; values only reach column Y
    // (index 24), but rows are genuinely used down to row 6 (index 5).
    const sheet: any = { '!ref': 'A1:WAA6', 'Y1': { v: 'header' }, 'A6': { v: 'data' } };
    sheetToAOA(sheet);
    expect(seenRange).toBe('A1:24/5'); // clamped end column = 24, rows kept (end row 5)
  });

  it('clamps an inflated ROW range to the last value-bearing row', () => {
    let seenRange: string | undefined;
    installXlsxStub((_s, opts) => { seenRange = opts && opts.range; return [['ok']]; });
    // Declared 100000 rows; values only reach row 3, and out to column C (index 2).
    const sheet: any = { '!ref': 'A1:C100000', 'C3': { v: 'x' } };
    sheetToAOA(sheet);
    expect(seenRange).toBe('A1:2/2'); // end col 2 (kept), end row clamped to 2 (0-based row 3)
  });

  it('does not pass a range when nothing is inflated', () => {
    let calledWithRange = false;
    installXlsxStub((_s, opts) => { calledWithRange = !!(opts && opts.range); return []; });
    const sheet: any = { '!ref': 'A1:C3', 'C3': { v: 'x' } };
    sheetToAOA(sheet);
    expect(calledWithRange).toBe(false);
  });
});

describe('sheetToAOA hard cap', () => {
  it('throws instead of parsing an absurdly large grid', () => {
    installXlsxStub(() => []);
    // A real value cell far down makes the clamped grid exceed the ceiling.
    const farRow = 'A' + (MAX_SHEET_CELLS + 10);
    const sheet: any = { '!ref': `A1:${farRow}`, [farRow]: { v: 'x' } };
    expect(() => sheetToAOA(sheet)).toThrow(/too large/i);
  });

  it('returns [] for an empty / ref-less sheet', () => {
    installXlsxStub(() => [['unused']]);
    expect(sheetToAOA({})).toEqual([]);
    expect(sheetToAOA(null)).toEqual([]);
  });
});
