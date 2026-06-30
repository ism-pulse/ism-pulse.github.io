import { describe, it, expect } from 'vitest';
import {
  applicabilityRaw,
  applicability,
  toClassificationCode,
  parseApplicability,
  applicabilityTokens,
  controlCoversClassification,
  mlLevels,
  mlLevelsVerbose,
} from '../src/applicability';

// ---- toClassificationCode ---------------------------------------------------
describe('toClassificationCode', () => {
  it('maps canonical short codes', () => {
    expect(toClassificationCode('NC')).toBe('NC');
    expect(toClassificationCode('OS')).toBe('OS');
    expect(toClassificationCode('P')).toBe('P');
    expect(toClassificationCode('S')).toBe('S');
    expect(toClassificationCode('TS')).toBe('TS');
  });

  it('maps full label forms case-insensitively', () => {
    expect(toClassificationCode('Not Classified')).toBe('NC');
    expect(toClassificationCode('Official: Sensitive')).toBe('OS');
    expect(toClassificationCode('Official Sensitive')).toBe('OS');
    expect(toClassificationCode('Protected')).toBe('P');
    expect(toClassificationCode('Secret')).toBe('S');
    expect(toClassificationCode('Top Secret')).toBe('TS');
  });

  it('maps legacy "All" to NC', () => {
    expect(toClassificationCode('All')).toBe('NC');
    expect(toClassificationCode('ALL')).toBe('NC');
  });

  it('maps legacy "O" (Official) to OS', () => {
    expect(toClassificationCode('O')).toBe('OS');
    expect(toClassificationCode('Official')).toBe('OS');
  });

  it('returns null for unknown tokens', () => {
    expect(toClassificationCode('Unknown')).toBeNull();
    expect(toClassificationCode('')).toBeNull();
    expect(toClassificationCode(null)).toBeNull();
  });
});

// ---- applicabilityRaw -------------------------------------------------------
describe('applicabilityRaw', () => {
  it('returns comma-joined codes when per-column booleans are set', () => {
    const row = { NC: 'Yes', OS: 'Yes', P: 'No', S: '', TS: null };
    expect(applicabilityRaw(row)).toBe('NC, OS');
  });

  it('falls back to free-text Applicability field', () => {
    const row = { Applicability: 'Protected, Secret' };
    expect(applicabilityRaw(row)).toBe('Protected, Secret');
  });

  it('prefers per-column booleans over free-text', () => {
    const row = { NC: 'Yes', Applicability: 'Protected' };
    expect(applicabilityRaw(row)).toBe('NC');
  });

  it('returns empty string when nothing is set', () => {
    expect(applicabilityRaw({})).toBe('');
  });
});

// ---- applicability ----------------------------------------------------------
describe('applicability', () => {
  it('returns "-" when nothing is set', () => {
    expect(applicability({})).toBe('-');
  });

  it('returns the raw value otherwise', () => {
    expect(applicability({ NC: 'Yes' })).toBe('NC');
    expect(applicability({ Applicability: 'Protected' })).toBe('Protected');
  });
});

// ---- parseApplicability -----------------------------------------------------
describe('parseApplicability', () => {
  it('parses per-column booleans into coverage set', () => {
    const row = { NC: 'Yes', P: 'Yes', OS: 'No', S: null };
    const { coverage, residual } = parseApplicability(row);
    expect(coverage).toContain('NC');
    expect(coverage).toContain('P');
    expect(coverage).not.toContain('OS');
    expect(residual).toBe('');
  });

  it('parses free-text Applicability into coverage set', () => {
    const row = { Applicability: 'Protected, Secret' };
    const { coverage, residual } = parseApplicability(row);
    expect(coverage).toContain('P');
    expect(coverage).toContain('S');
    expect(residual).toBe('');
  });

  it('puts unrecognised tokens in residual', () => {
    const row = { Applicability: 'Protected, For official use only' };
    const { coverage, residual } = parseApplicability(row);
    expect(coverage).toContain('P');
    expect(residual).toBe('for official use only');
  });

  it('returns empty coverage and residual for empty row', () => {
    const { coverage, residual } = parseApplicability({});
    expect(coverage.size).toBe(0);
    expect(residual).toBe('');
  });

  it('combines per-column and free-text sources', () => {
    // Per-column NC + free-text "Protected" → both in coverage
    const row = { NC: 'Yes', Applicability: 'Protected' };
    const { coverage } = parseApplicability(row);
    expect(coverage).toContain('NC');
    expect(coverage).toContain('P');
  });

  it('two rows with the same applicability are equivalent', () => {
    const a = parseApplicability({ NC: 'Yes', P: 'Yes' });
    const b = parseApplicability({ Applicability: 'Not Classified, Protected' });
    const aCodes = [...a.coverage].sort().join(',');
    const bCodes = [...b.coverage].sort().join(',');
    expect(aCodes).toBe(bCodes);
    expect(a.residual).toBe(b.residual);
  });
});

// ---- applicabilityTokens ----------------------------------------------------
describe('applicabilityTokens', () => {
  it('returns Set of canonical codes', () => {
    const tokens = applicabilityTokens({ P: 'Yes', S: 'Yes' });
    expect(tokens).toContain('P');
    expect(tokens).toContain('S');
    expect(tokens.size).toBe(2);
  });
});

// ---- controlCoversClassification -------------------------------------------
describe('controlCoversClassification', () => {
  it('returns covered=true when empty applicability (applies to all)', () => {
    const { covered } = controlCoversClassification({}, 'PROTECTED');
    expect(covered).toBe(true);
  });

  it('returns covered=true when classification is in coverage', () => {
    const { covered } = controlCoversClassification({ P: 'Yes', S: 'Yes' }, 'PROTECTED');
    expect(covered).toBe(true);
  });

  it('returns covered=false when classification is not in coverage', () => {
    const { covered } = controlCoversClassification({ NC: 'Yes' }, 'PROTECTED');
    expect(covered).toBe(false);
  });

  it('returns covered=true for unknown system classification', () => {
    const { covered } = controlCoversClassification({ NC: 'Yes' }, 'some unknown classification');
    expect(covered).toBe(true);
  });
});

// ---- mlLevels ---------------------------------------------------------------
describe('mlLevels', () => {
  it('returns comma-joined ML levels that are set to Yes', () => {
    const row = { ML1: 'Yes', ML2: 'No', ML3: 'Yes' };
    expect(mlLevels(row)).toBe('ML1, ML3');
  });

  it('returns "-" when no levels are set', () => {
    expect(mlLevels({})).toBe('-');
    expect(mlLevels({ ML1: 'No', ML2: 'No', ML3: 'No' })).toBe('-');
  });

  it('handles "Essential 8 MLx" column names', () => {
    const row = { 'Essential 8 ML1': 'Yes', 'Essential 8 ML2': 'Yes' };
    expect(mlLevels(row)).toBe('ML1, ML2');
  });
});

// ---- mlLevelsVerbose --------------------------------------------------------
describe('mlLevelsVerbose', () => {
  it('returns "None" instead of "-" when no levels are set', () => {
    expect(mlLevelsVerbose({})).toBe('None');
  });

  it('returns levels otherwise', () => {
    expect(mlLevelsVerbose({ ML1: 'Yes', ML2: 'Yes', ML3: 'Yes' })).toBe('ML1, ML2, ML3');
  });
});
