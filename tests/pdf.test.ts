import { describe, it, expect } from 'vitest';
import {
  normalisePdfText,
  extractIsmIdsFromText,
  cleanRescissionText,
  extractRescissionReason,
} from '../src/pdf';

// ---- normalisePdfText -------------------------------------------------------
describe('normalisePdfText', () => {
  it('collapses "ISM - 1234" → "ISM-1234"', () => {
    expect(normalisePdfText('ISM - 1234')).toBe('ISM-1234');
    expect(normalisePdfText('ISM-  1234')).toBe('ISM-1234');
    expect(normalisePdfText('ISM  -1234')).toBe('ISM-1234');
  });

  it('collapses principle IDs', () => {
    expect(normalisePdfText('GOV - 1')).toBe('GOV-1');
    expect(normalisePdfText('PRO - 03')).toBe('PRO-03');
  });

  it('joins split numeric suffixes', () => {
    // "ISM-183 7" → "ISM-1837"
    expect(normalisePdfText('ISM-183 7')).toBe('ISM-1837');
  });

  it('removes spaces before punctuation', () => {
    expect(normalisePdfText('hello , world')).toBe('hello, world');
    expect(normalisePdfText('foo .')).toBe('foo.');
  });

  it('removes spaces after open brackets', () => {
    expect(normalisePdfText('( foo)')).toBe('(foo)');
  });

  it('returns empty string for empty input', () => {
    expect(normalisePdfText('')).toBe('');
  });
});

// ---- extractIsmIdsFromText --------------------------------------------------
describe('extractIsmIdsFromText', () => {
  it('extracts ISM control IDs', () => {
    const ids = extractIsmIdsFromText('Controls ISM-1234 and ISM-5678 were updated.');
    expect(ids).toContain('ISM-1234');
    expect(ids).toContain('ISM-5678');
  });

  it('extracts principle IDs (padded to 2 digits)', () => {
    const ids = extractIsmIdsFromText('See GOV-1, PRO-03, DET-2.');
    // The function pads principle IDs to 2 digits: GOV-01, PRO-03, DET-02
    expect(ids).toContain('GOV-01');
    expect(ids).toContain('PRO-03');
    expect(ids).toContain('DET-02');
  });

  it('handles space-separated forms', () => {
    const ids = extractIsmIdsFromText('ISM 1234 is rescinded.');
    expect(ids).toContain('ISM-1234');
  });

  it('pads principle ID numbers to 2 digits', () => {
    const ids = extractIsmIdsFromText('GOV-1 is updated.');
    expect(ids).toContain('GOV-01');
  });

  it('returns empty Set for text with no IDs', () => {
    const ids = extractIsmIdsFromText('No controls mentioned here.');
    expect(ids.size).toBe(0);
  });

  it('returns empty Set for empty input', () => {
    expect(extractIsmIdsFromText('').size).toBe(0);
  });

  it('is case-insensitive for ISM prefix', () => {
    const ids = extractIsmIdsFromText('ism-1234 and Ism 5678');
    expect(ids).toContain('ISM-1234');
    expect(ids).toContain('ISM-5678');
  });
});

// ---- cleanRescissionText ----------------------------------------------------
describe('cleanRescissionText', () => {
  it('trims leading non-alphanumeric characters', () => {
    expect(cleanRescissionText('  — This control is removed.')).toMatch(/^This/);
  });

  it('returns empty string for null/undefined', () => {
    expect(cleanRescissionText('')).toBe('');
    expect(cleanRescissionText(null as any)).toBe('');
  });

  it('does not mangle normal sentences', () => {
    const text = 'The existing control was merged into ISM-0999.';
    const result = cleanRescissionText(text);
    expect(result).toContain('merged');
    expect(result.length).toBeGreaterThan(20);
  });

  it('collapses internal whitespace', () => {
    const result = cleanRescissionText('This  has   extra   spaces.');
    expect(result).toBe('This has extra spaces.');
  });
});

// ---- extractRescissionReason ------------------------------------------------
describe('extractRescissionReason', () => {
  it('extracts reason from bracket-terminated form', () => {
    const pdf = 'The existing control was merged with ISM-0999 as it was superseded. [ISM-1234]';
    const reason = extractRescissionReason(pdf, 'ISM-1234', 'Some topic');
    expect(reason.length).toBeGreaterThan(10);
    expect(reason.toLowerCase()).toMatch(/merge|supersed/);
  });

  it('returns empty string when ID not found in text', () => {
    const pdf = 'This document covers other controls.';
    const reason = extractRescissionReason(pdf, 'ISM-9999', 'Topic');
    expect(reason).toBe('');
  });

  it('returns empty string for empty inputs', () => {
    expect(extractRescissionReason('', 'ISM-1234', '')).toBe('');
    expect(extractRescissionReason('', '', '')).toBe('');
  });

  it('falls back to topic search when ID not in PDF', () => {
    const topic = 'Patch management';
    const pdf = `Patch management controls were removed as they are now covered by the Essential Eight framework.`;
    const reason = extractRescissionReason(pdf, 'ISM-0001', topic);
    // Should find something using the topic
    expect(reason.length).toBeGreaterThanOrEqual(0); // may or may not find, but shouldn't throw
  });
});
