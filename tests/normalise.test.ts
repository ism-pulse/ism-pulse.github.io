import { describe, it, expect } from 'vitest';
import {
  normaliseIdentifier,
  canonicaliseHeader,
  normaliseAOA,
  quarterFromSheetName,
  quarterLong,
  functionFromId,
} from '../src/normalise';

// ---- normaliseIdentifier ----------------------------------------------------
describe('normaliseIdentifier', () => {
  it('uppercases and normalises ISM IDs', () => {
    expect(normaliseIdentifier('ism-1234')).toBe('ISM-1234');
    expect(normaliseIdentifier('ISM 1234')).toBe('ISM-1234');
    expect(normaliseIdentifier('ISM  -  1234')).toBe('ISM-1234');
  });

  it('handles non-breaking and unicode hyphens', () => {
    // U+2011 non-breaking hyphen
    expect(normaliseIdentifier('ISM‑1234')).toBe('ISM-1234');
    // U+2013 en dash
    expect(normaliseIdentifier('ISM–1234')).toBe('ISM-1234');
  });

  it('normalises principle IDs', () => {
    expect(normaliseIdentifier('gov-1')).toBe('GOV-1');
    expect(normaliseIdentifier('GOV 1')).toBe('GOV-1');
    expect(normaliseIdentifier('pro-03')).toBe('PRO-03');
    expect(normaliseIdentifier('DET 2')).toBe('DET-2');
  });

  it('returns empty string for null/undefined', () => {
    expect(normaliseIdentifier(null)).toBe('');
    expect(normaliseIdentifier(undefined)).toBe('');
    expect(normaliseIdentifier('')).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(normaliseIdentifier('  ISM-1234  ')).toBe('ISM-1234');
  });
});

// ---- canonicaliseHeader -----------------------------------------------------
describe('canonicaliseHeader', () => {
  it('maps known aliases to canonical names', () => {
    expect(canonicaliseHeader('Description')).toBe('Description');
    expect(canonicaliseHeader('control description')).toBe('Description');
    expect(canonicaliseHeader('Control Text')).toBe('Description');
    expect(canonicaliseHeader('Identifier')).toBe('Identifier');
    expect(canonicaliseHeader('Control ID')).toBe('Identifier');
    expect(canonicaliseHeader('ISM ID')).toBe('Identifier');
    expect(canonicaliseHeader('Guideline')).toBe('Guideline');
    expect(canonicaliseHeader('Guidelines')).toBe('Guideline');
  });

  it('maps classification column aliases', () => {
    expect(canonicaliseHeader('NC')).toBe('NC');
    expect(canonicaliseHeader('Not Classified')).toBe('NC');
    expect(canonicaliseHeader('All')).toBe('NC');  // older CCM format
    expect(canonicaliseHeader('OS')).toBe('OS');
    expect(canonicaliseHeader('Official: Sensitive')).toBe('OS');
    expect(canonicaliseHeader('O')).toBe('OS');    // legacy format
    expect(canonicaliseHeader('P')).toBe('P');
    expect(canonicaliseHeader('Protected')).toBe('P');
    expect(canonicaliseHeader('S')).toBe('S');
    expect(canonicaliseHeader('Secret')).toBe('S');
    expect(canonicaliseHeader('TS')).toBe('TS');
    expect(canonicaliseHeader('Top Secret')).toBe('TS');
  });

  it('returns unknown headers unchanged', () => {
    expect(canonicaliseHeader('My Custom Column')).toBe('My Custom Column');
  });

  it('strips org-specific qualifiers before lookup', () => {
    // "(Org Name)" suffix should be stripped
    expect(canonicaliseHeader('Description (ACME)')).toBe('Description');
    expect(canonicaliseHeader('Implementation Status - My Org')).toBe('Implementation Status');
  });

  it('rejects HTML injection', () => {
    const injected = '<script>alert(1)</script>';
    expect(canonicaliseHeader(injected)).toBe(injected);
  });

  it('returns empty string for null', () => {
    expect(canonicaliseHeader(null)).toBe('');
  });
});

// ---- normaliseAOA -----------------------------------------------------------
describe('normaliseAOA', () => {
  const makeAOA = (headers: string[], ...rows: any[][]) => [headers, ...rows];

  it('returns rows keyed by canonical header names', () => {
    const aoa = makeAOA(
      ['Identifier', 'Description', 'Guideline', 'Topic'],
      ['ISM-1234', 'Protect things', 'Data security', 'Storage'],
    );
    const rows = normaliseAOA(aoa);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Identifier']).toBe('ISM-1234');
    expect(rows[0]['Description']).toBe('Protect things');
    expect(rows[0]['Guideline']).toBe('Data security');
    expect(rows[0]['Topic']).toBe('Storage');
  });

  it('normalises identifier values', () => {
    const aoa = makeAOA(
      ['Identifier', 'Description'],
      ['ism 1234', 'Some control'],
    );
    const rows = normaliseAOA(aoa);
    expect(rows[0]['Identifier']).toBe('ISM-1234');
  });

  it('skips rows without an Identifier', () => {
    const aoa = makeAOA(
      ['Identifier', 'Description'],
      [null, 'No ID row'],
      ['ISM-0001', 'Valid row'],
    );
    const rows = normaliseAOA(aoa);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Identifier']).toBe('ISM-0001');
  });

  it('scans up to HEADER_SCAN_ROWS rows to find the header', () => {
    // Insert 3 preamble rows before the real header
    const aoa = [
      ['This is a preamble row'],
      ['Another preamble'],
      ['Yet another'],
      ['Identifier', 'Description', 'Guideline'],
      ['ISM-0001', 'First control', 'Comms'],
    ];
    const rows = normaliseAOA(aoa);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Identifier']).toBe('ISM-0001');
  });

  it('canonicalises alias headers', () => {
    const aoa = makeAOA(
      ['Control ID', 'Control Text', 'Guideline'],
      ['ISM-0042', 'Do the thing', 'Systems'],
    );
    const rows = normaliseAOA(aoa);
    expect(rows[0]['Identifier']).toBe('ISM-0042');
    expect(rows[0]['Description']).toBe('Do the thing');
  });

  it('returns empty array for empty input', () => {
    expect(normaliseAOA([])).toEqual([]);
    expect(normaliseAOA([[]])).toEqual([]);
  });
});

// ---- quarterFromSheetName ---------------------------------------------------
describe('quarterFromSheetName', () => {
  it('parses ASD-standard sheet names', () => {
    expect(quarterFromSheetName('Controls - June 2026')).toBe('Jun-26');
    expect(quarterFromSheetName('Principles - March 2025')).toBe('Mar-25');
    expect(quarterFromSheetName('Controls - December 2024')).toBe('Dec-24');
  });

  it('parses abbreviated month forms', () => {
    expect(quarterFromSheetName('Controls - Jun 2026')).toBe('Jun-26');
    expect(quarterFromSheetName('Principles - Sep 2025')).toBe('Sep-25');
  });

  it('returns empty string for unrecognised names', () => {
    expect(quarterFromSheetName('Sheet1')).toBe('');
    expect(quarterFromSheetName('')).toBe('');
    expect(quarterFromSheetName(undefined as any)).toBe('');
  });
});

// ---- quarterLong ------------------------------------------------------------
describe('quarterLong', () => {
  it('expands abbreviated quarters to full label', () => {
    expect(quarterLong('Jun-26')).toBe('June 2026');
    expect(quarterLong('Mar-25')).toBe('March 2025');
    expect(quarterLong('Dec-24')).toBe('December 2024');
  });

  it('returns input unchanged for unrecognised format', () => {
    expect(quarterLong('')).toBe('');
    expect(quarterLong('Q2 2026')).toBe('Q2 2026');
  });
});

// ---- functionFromId ---------------------------------------------------------
describe('functionFromId', () => {
  it('maps principle prefixes to function names', () => {
    expect(functionFromId('GOV-1')).toBe('GOVERN');
    expect(functionFromId('IDE-5')).toBe('IDENTIFY');
    expect(functionFromId('PRO-12')).toBe('PROTECT');
    expect(functionFromId('DET-3')).toBe('DETECT');
    expect(functionFromId('RES-7')).toBe('RESPOND');
    expect(functionFromId('REC-2')).toBe('RECOVER');
  });

  it('returns null for ISM controls and unknown prefixes', () => {
    expect(functionFromId('ISM-1234')).toBeNull();
    expect(functionFromId('XYZ-1')).toBeNull();
    expect(functionFromId('')).toBeNull();
    expect(functionFromId(null)).toBeNull();
  });
});
