import { describe, it, expect } from 'vitest';
import { detectCCMColumns, computeCCMEdits, colLetters, normGuidelineNameCCM } from '../src/ccm';

// A minimal mock of the ASD CCM Controls sheet header (25 columns), matching the
// real layout: classification flags (NC/OS/P/S/TS), then provider and consumer
// Responsibility / Implementation / Comments groups.
const HEADER = [
  'Guideline', 'Section', 'Topic', 'Identifier', 'Revision', 'Updated',
  'NC', 'OS', 'P', 'S', 'TS', 'ML1', 'ML2', 'ML3', 'Description',
  'Administration Environment', 'Cloud Production - Common Controls', 'Cloud Production - Service Specific',
  'Provider Responsibility', 'Implementation Status', 'Comments',
  'Consumer Responsibility', 'Consumer Implementation Required', 'Consumer Configuration Required', 'Comments',
];

// Build a data row with sane defaults; override via the patch object.
function row(patch: Record<number, any>): any[] {
  const r = new Array(25).fill(null);
  r[0] = 'Guidelines for cyber security roles'; // Guideline
  r[3] = 'ISM-0000';                             // Identifier
  r[8] = 'Yes';                                  // P (PROTECTED) applicable by default
  r[19] = 'Not Assessed';                        // Implementation Status
  r[22] = 'Not Assessed';                        // Consumer Implementation Required
  r[23] = 'Not Assessed';                        // Consumer Configuration Required
  Object.keys(patch).forEach(k => { r[Number(k)] = patch[Number(k)]; });
  return r;
}

describe('colLetters', () => {
  it('maps 0-based indices to Excel column letters', () => {
    expect(colLetters(0)).toBe('A');
    expect(colLetters(18)).toBe('S');  // Provider Responsibility
    expect(colLetters(19)).toBe('T');  // Implementation Status
    expect(colLetters(24)).toBe('Y');  // Consumer Comments
    expect(colLetters(25)).toBe('Z');
    expect(colLetters(26)).toBe('AA');
  });
});

describe('detectCCMColumns', () => {
  const cols = detectCCMColumns([HEADER], 'P');
  it('finds the header row and identity/guideline columns', () => {
    expect(cols.hdrIdx).toBe(0);
    expect(cols.dataStartIdx).toBe(1);
    expect(cols.identColIdx).toBe(3);
    expect(cols.glColIdx).toBe(0);
  });
  it('finds the chosen classification column', () => {
    expect(cols.classColIdx).toBe(8); // 'P'
    expect(detectCCMColumns([HEADER], 'OS').classColIdx).toBe(7);
  });
  it('finds provider and consumer columns and both Comments columns', () => {
    expect(cols.respColIdx).toBe(18);
    expect(cols.implColIdx).toBe(19);
    expect(cols.consRespColIdx).toBe(21);
    expect(cols.consImplColIdx).toBe(22);
    expect(cols.consConfColIdx).toBe(23);
    expect(cols.commentCols).toEqual([20, 24]);
  });
});

describe('computeCCMEdits', () => {
  const guidelineStates = {
    [normGuidelineNameCCM('Guidelines for cyber security roles')]:  { checked: true },
    [normGuidelineNameCCM('Guidelines for physical security')]:     { checked: true },
    [normGuidelineNameCCM('Guidelines for enterprise mobility')]:   { checked: false, justification: 'No mobile devices' },
  };

  // Row 2: applicable + in scope → no change.
  // Row 3: P = "No" → excluded by classification.
  // Row 4: P = "Yes" but its Guideline is unticked → excluded by scope.
  const aoa = [
    HEADER,
    row({ 0: 'Guidelines for cyber security roles', 3: 'ISM-0001', 8: 'Yes' }),
    row({ 0: 'Guidelines for physical security',    3: 'ISM-0002', 8: 'No'  }),
    row({ 0: 'Guidelines for enterprise mobility',  3: 'ISM-0003', 8: 'Yes' }),
  ];

  const res = computeCCMEdits(aoa, { classCol: 'P', classDisplay: 'PROTECTED', guidelineStates });

  it('counts every identified control and the excluded subset', () => {
    expect(res.error).toBeUndefined();
    expect(res.total).toBe(3);
    expect(res.naCount).toBe(2);
    expect(res.edits.length).toBe(14); // 2 controls × 7 cells
  });

  const byRef = (ref: string) => res.edits.find(e => e.ref === ref)?.value;

  it('leaves the applicable in-scope control untouched (row 2 / Excel row 2)', () => {
    expect(res.edits.some(e => /^[A-Z]+2$/.test(e.ref))).toBe(false);
  });

  it('marks the classification-excluded control across provider and consumer columns', () => {
    expect(byRef('S3')).toBe('None');            // Provider Responsibility
    expect(byRef('T3')).toBe('Not Applicable');  // Implementation Status
    expect(byRef('V3')).toBe('None');            // Consumer Responsibility
    expect(byRef('W3')).toBe('Not Applicable');  // Consumer Implementation Required
    expect(byRef('X3')).toBe('Not Applicable');  // Consumer Configuration Required
  });

  it('writes the same comment into both Comments columns (classification reason)', () => {
    const expected = 'This control is not applicable to the system classified as PROTECTED.';
    expect(byRef('U3')).toBe(expected);
    expect(byRef('Y3')).toBe(expected);
  });

  it('uses the scope justification for a Guideline excluded by scope', () => {
    expect(byRef('T4')).toBe('Not Applicable');
    expect(byRef('U4')).toContain('does not implement Guidelines for enterprise mobility');
    expect(byRef('U4')).toContain('No mobile devices');
    expect(byRef('Y4')).toBe(byRef('U4'));
  });
});

describe('computeCCMEdits — no exclusions', () => {
  const guidelineStates = { [normGuidelineNameCCM('Guidelines for cyber security roles')]: { checked: true } };
  const aoa = [HEADER, row({ 3: 'ISM-0100', 8: 'Yes' })];
  const res = computeCCMEdits(aoa, { classCol: 'P', classDisplay: 'PROTECTED', guidelineStates });
  it('produces no edits when nothing is excluded', () => {
    expect(res.naCount).toBe(0);
    expect(res.edits).toHaveLength(0);
  });
});

describe('computeCCMEdits — missing columns', () => {
  it('returns an error when the classification column is absent', () => {
    const noP = HEADER.filter(h => h !== 'P');
    const res = computeCCMEdits([noP, new Array(noP.length).fill(null)], { classCol: 'P', classDisplay: 'PROTECTED', guidelineStates: {} });
    expect(res.error).toMatch(/applicability column/);
  });
});
