/**
 * IRAP Pulse — applicability and Essential Eight maturity level helpers.
 *
 * Pure functions: no DOM, no CDN globals, no side effects.
 * Fully unit-testable in Node.js.
 */

import { CLASS_COLS } from './constants';

// ---- Raw applicability string -----------------------------------------------
// Returns the raw applicability representation for a row:
//   - per-column booleans if any NC/OS/P/S/TS column is 'Yes'
//   - free-text 'Applicability' cell otherwise
export function applicabilityRaw(row: any): string {
  const codes: string[] = [];
  CLASS_COLS.forEach(([code]) => {
    if (String(row[code] || '').trim().toLowerCase() === 'yes') codes.push(code);
  });
  if (codes.length) return codes.join(', ');
  return String(row['Applicability'] || '').trim();
}

// Returns applicabilityRaw or '-' if empty.
export function applicability(row: any): string {
  return applicabilityRaw(row) || '-';
}

// ---- Classification code normalisation --------------------------------------
// Maps any raw classification token to a canonical short code or null.
export function toClassificationCode(raw: any): string | null {
  const t = String(raw || '').toUpperCase().replace(/[:\-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return ({
    'NC': 'NC', 'NOT CLASSIFIED': 'NC',
    'ALL': 'NC',
    'O': 'OS', 'OS': 'OS',
    'OFFICIAL': 'OS',
    'OFFICIAL SENSITIVE': 'OS',
    'P': 'P', 'PROTECTED': 'P',
    'S': 'S', 'SECRET': 'S',
    'TS': 'TS', 'TOP SECRET': 'TS',
  } as Record<string, string>)[t] || null;
}

// ---- Parsed applicability ---------------------------------------------------
// Parses a row's applicability spec into:
//   coverage  — Set of canonical short codes ('NC', 'OS', 'P', 'S', 'TS')
//   residual  — free-text fragments that did not resolve to a code
//
// Two rows are applicability-equivalent when both coverage sets AND residual
// strings are equal — regardless of whether the data came from per-column
// booleans or free-text.
export function parseApplicability(row: any): { coverage: Set<string>; residual: string } {
  const coverage = new Set<string>();
  const residuals: string[] = [];

  // Per-column booleans (preferred)
  CLASS_COLS.forEach(([code]) => {
    if (String(row[code] || '').trim().toLowerCase() === 'yes') coverage.add(code);
  });

  // Free-text Applicability column
  const s = String(row['Applicability'] || '').trim();
  if (s) {
    s.split(/[,;]/).forEach(p => {
      const fragment = p.trim();
      if (!fragment) return;
      const code = toClassificationCode(fragment);
      if (code) {
        coverage.add(code);
      } else {
        residuals.push(fragment.toLowerCase().replace(/\s+/g, ' '));
      }
    });
  }
  return { coverage, residual: residuals.join(', ') };
}

// Backward-compat: returns only the canonical coverage Set.
export function applicabilityTokens(row: any): Set<string> {
  return parseApplicability(row).coverage;
}

// Returns { covered: bool, coverageList: string }.
// An empty applicability spec is treated as covered.
export function controlCoversClassification(row: any, systemClassification: string): { covered: boolean; coverageList: string } {
  const { coverage } = parseApplicability(row);
  if (coverage.size === 0) return { covered: true, coverageList: '' };
  const code = toClassificationCode(systemClassification);
  if (!code) return { covered: true, coverageList: applicabilityRaw(row) };
  return { covered: coverage.has(code), coverageList: applicabilityRaw(row) };
}

// ---- Essential Eight maturity levels ----------------------------------------
export function mlLevels(row: any): string {
  const m: string[] = [];
  ['ML1', 'ML2', 'ML3'].forEach(level => {
    const v = row[level] || row[`Essential 8 ${level}`];
    if (String(v || '').trim().toLowerCase() === 'yes') m.push(level);
  });
  return m.join(', ') || '-';
}

// Verbose variant for xlsx export — never returns '-'.
export function mlLevelsVerbose(row: any): string {
  const m: string[] = [];
  ['ML1', 'ML2', 'ML3'].forEach(level => {
    const v = row[level] || row[`Essential 8 ${level}`];
    if (String(v || '').trim().toLowerCase() === 'yes') m.push(level);
  });
  return m.length ? m.join(', ') : 'None';
}
