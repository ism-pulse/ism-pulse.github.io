/**
 * IRAP Pulse — integration tests.
 *
 * Exercises the normalise → delta → drift pipeline with realistic multi-row
 * fixture data. No third-party XLSX parser is used — fixtures are plain arrays
 * passed directly to normaliseAOA, keeping the devDependency surface clean.
 *
 * All 6 change scenarios are covered:
 *   Unchanged | Updated (text / applicability / ML / guideline) | Rescinded | New
 *   Metadata-only (topic change) — must NOT trigger Updated
 *
 * Run manually before a release:
 *   npm run test:integration
 *
 * Unit tests (npm test) are unaffected.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { normaliseAOA } from '../../src/normalise';
import { computeDelta, computeApplicabilityDrift } from '../../src/delta';

// ---- Column layout ----------------------------------------------------------

const CCM_HEADER = [
  'Identifier', 'Description', 'Guideline', 'Topic', 'Revision', 'Updated',
  'NC', 'OS', 'P', 'S', 'TS', 'ML1', 'ML2', 'ML3',
  'Provider Responsibility', 'Section / Function',
];

const SSPA_HEADER = [
  'Identifier', 'Description', 'Guideline', 'Topic', 'Revision', 'Updated',
  'NC', 'OS', 'P', 'S', 'TS', 'ML1', 'ML2', 'ML3',
  'Provider Responsibility', 'Section / Function',
  'Implementation Status', 'Assessment Responsibility',
];

// ---- Q1 CCM (baseline, 7 controls) ------------------------------------------
//      id          desc                    gl       topic       rev  updated      NC     OS     P      S      TS     ML1    ML2    ML3    prov         fn
const CCM_Q1: any[][] = [
  ['ISM-0001', 'Unchanged control',    'GL-1', 'Topic A',  '1', 'Jan 2024', 'Yes', 'Yes', 'No',  'No', 'No', 'Yes', 'No',  'No',  'Customer', 'Govern'],
  ['ISM-0002', 'Old description',      'GL-2', 'Topic B',  '1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No',  'No',  'Customer', 'Protect'],
  ['ISM-0003', 'Applicability test',   'GL-3', 'Topic C',  '1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No',  'No',  'Customer', 'Govern'],
  ['ISM-0004', 'ML level test',        'GL-4', 'Topic D',  '1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'Yes', 'No',  'No',  'Customer', 'Govern'],
  ['ISM-0005', 'To be rescinded',      'GL-5', 'Topic E',  '1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No',  'No',  'Customer', 'Govern'],
  ['ISM-0007', 'Guideline will change','GL-7', 'Topic G',  '1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No',  'No',  'Customer', 'Govern'],
  ['ISM-0008', 'Metadata only change', 'GL-8', 'Old Topic','1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No',  'No',  'Customer', 'Govern'],
];

// ---- Q2 CCM (current, 7 controls — 0005 removed, 0006 added) ----------------
const CCM_Q2: any[][] = [
  ['ISM-0001', 'Unchanged control',    'GL-1',  'Topic A',  '1', 'Apr 2024', 'Yes', 'Yes', 'No',  'No', 'No', 'Yes', 'No',  'No',  'Customer', 'Govern'],  // unchanged
  ['ISM-0002', 'New description',      'GL-2',  'Topic B',  '2', 'Apr 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No',  'No',  'Customer', 'Protect'], // desc changed
  ['ISM-0003', 'Applicability test',   'GL-3',  'Topic C',  '1', 'Apr 2024', 'Yes', 'No',  'Yes', 'No', 'No', 'No',  'No',  'No',  'Customer', 'Govern'],  // P added
  ['ISM-0004', 'ML level test',        'GL-4',  'Topic D',  '1', 'Apr 2024', 'Yes', 'No',  'No',  'No', 'No', 'Yes', 'Yes', 'No',  'Customer', 'Govern'],  // ML2 added
  // ISM-0005 intentionally absent (rescinded)
  ['ISM-0006', 'Brand new control',    'GL-6',  'Topic F',  '1', 'Apr 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No',  'No',  'Customer', 'Govern'],  // new
  ['ISM-0007', 'Guideline will change','NEW-GL', 'Topic G', '2', 'Apr 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No',  'No',  'Customer', 'Govern'],  // guideline changed
  ['ISM-0008', 'Metadata only change', 'GL-8',  'New Topic','1', 'Apr 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No',  'No',  'Customer', 'Govern'],  // topic only — NOT Updated
];

// ---- SSP-A (Q1 baseline + Implementation Status + Assessment Responsibility) -
const SSPA: any[][] = [
  ['ISM-0001', 'Unchanged control',    'GL-1', 'Topic A',  '1', 'Jan 2024', 'Yes', 'Yes', 'No',  'No', 'No', 'Yes', 'No', 'No', 'Customer', 'Govern',  'Implemented', 'Customer'],
  ['ISM-0002', 'Old description',      'GL-2', 'Topic B',  '1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No', 'No', 'Customer', 'Protect', 'Implemented', 'Customer'],
  ['ISM-0003', 'Applicability test',   'GL-3', 'Topic C',  '1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No', 'No', 'Customer', 'Govern',  'Implemented', 'Customer'],
  ['ISM-0004', 'ML level test',        'GL-4', 'Topic D',  '1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'Yes', 'No', 'No', 'Customer', 'Govern',  'Implemented', 'Customer'],
  ['ISM-0005', 'To be rescinded',      'GL-5', 'Topic E',  '1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No', 'No', 'Customer', 'Govern',  'Implemented', 'Customer'],
  ['ISM-0007', 'Guideline will change','GL-7', 'Topic G',  '1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No', 'No', 'Customer', 'Govern',  'Implemented', 'Customer'],
  ['ISM-0008', 'Metadata only change', 'GL-8', 'Old Topic','1', 'Jan 2024', 'Yes', 'No',  'No',  'No', 'No', 'No',  'No', 'No', 'Customer', 'Govern',  'Implemented', 'Customer'],
];

// ---- Helper -----------------------------------------------------------------
// Converts a header + data rows directly to normalised row objects.
// No XLSX library needed — exercises normaliseAOA's header scanning and
// column canonicalisation with realistic multi-column, multi-row data.
function makeRows(header: string[], data: any[][]): any[] {
  return normaliseAOA([header, ...data]);
}

// ---- Suite 1: CCM-vs-CCM delta (Q1 baseline → Q2 current) ------------------

describe('Integration: CCM delta (Q1 baseline → Q2 current)', () => {
  let q1Rows: any[];
  let q2Rows: any[];

  beforeAll(() => {
    q1Rows = makeRows(CCM_HEADER, CCM_Q1);
    q2Rows = makeRows(CCM_HEADER, CCM_Q2);
  });

  it('parses Q1 into 7 rows', () => expect(q1Rows).toHaveLength(7));
  it('parses Q2 into 7 rows', () => expect(q2Rows).toHaveLength(7));

  it('produces 6 delta items: 1 Rescinded, 4 Updated, 1 New', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows: q1Rows }]);
    expect(delta).toHaveLength(6);
    expect(delta.filter(d => d.changeType === 'Rescinded')).toHaveLength(1);
    expect(delta.filter(d => d.changeType === 'Updated')).toHaveLength(4);
    expect(delta.filter(d => d.changeType === 'New')).toHaveLength(1);
  });

  it('ISM-0005 → Rescinded', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows: q1Rows }]);
    expect(delta.find(d => d.id === 'ISM-0005')?.changeType).toBe('Rescinded');
  });

  it('ISM-0002 → Updated (textChanged)', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows: q1Rows }]);
    const r = delta.find(d => d.id === 'ISM-0002');
    expect(r?.changeType).toBe('Updated');
    expect(r?.subFlags.textChanged).toBe(true);
  });

  it('ISM-0003 → Updated (applChanged)', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows: q1Rows }]);
    const r = delta.find(d => d.id === 'ISM-0003');
    expect(r?.changeType).toBe('Updated');
    expect(r?.subFlags.applChanged).toBe(true);
  });

  it('ISM-0004 → Updated (mlChanged)', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows: q1Rows }]);
    const r = delta.find(d => d.id === 'ISM-0004');
    expect(r?.changeType).toBe('Updated');
    expect(r?.subFlags.mlChanged).toBe(true);
  });

  it('ISM-0007 → Updated (glChanged)', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows: q1Rows }]);
    const r = delta.find(d => d.id === 'ISM-0007');
    expect(r?.changeType).toBe('Updated');
    expect(r?.subFlags.glChanged).toBe(true);
  });

  it('ISM-0006 → New', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows: q1Rows }]);
    expect(delta.find(d => d.id === 'ISM-0006')?.changeType).toBe('New');
  });

  it('ISM-0001 → not in delta (unchanged)', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows: q1Rows }]);
    expect(delta.find(d => d.id === 'ISM-0001')).toBeUndefined();
  });

  it('ISM-0008 → not in delta (topic change is metadata, not a trigger field)', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows: q1Rows }]);
    expect(delta.find(d => d.id === 'ISM-0008')).toBeUndefined();
  });

  it('output order: all Rescinded before Updated, all Updated before New', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows: q1Rows }]);
    const types = delta.map(d => d.changeType);
    expect(types.lastIndexOf('Rescinded')).toBeLessThan(types.indexOf('Updated'));
    expect(types.lastIndexOf('Updated')).toBeLessThan(types.indexOf('New'));
  });
});

// ---- Suite 2: SSP-A update (SSP-A baseline → Q2 CCM) ------------------------

describe('Integration: SSP-A update (SSP-A baseline → Q2 CCM)', () => {
  let q2Rows:   any[];
  let sspaRows: any[];

  beforeAll(() => {
    q2Rows   = makeRows(CCM_HEADER,  CCM_Q2);
    sspaRows = makeRows(SSPA_HEADER, SSPA);
  });

  it('parses SSP-A into 7 rows with Implementation Status present', () => {
    expect(sspaRows).toHaveLength(7);
    expect(sspaRows[0]['Implementation Status']).toBe('Implemented');
  });

  it('scoping (Implementation Status + provider) attached to Updated delta items', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows }]);
    const upd = delta.find(d => d.id === 'ISM-0002');
    expect(upd?.scoping.status).toBe('Implemented');
    expect(upd?.scoping.prov).toBe('Customer');
  });

  it('produces same change counts as CCM-vs-CCM', () => {
    const delta = computeDelta([{ kind: 'control', ccmRows: q2Rows, sspaRows }]);
    expect(delta.filter(d => d.changeType === 'Rescinded')).toHaveLength(1);
    expect(delta.filter(d => d.changeType === 'Updated')).toHaveLength(4);
    expect(delta.filter(d => d.changeType === 'New')).toHaveLength(1);
  });

  it('applicability drift: ISM-0003 flagged (SSP-A has NC only, Q2 CCM adds P)', () => {
    const result = computeApplicabilityDrift([{ kind: 'control', ccmRows: q2Rows, sspaRows }]);
    expect(result.count).toBe(1);
    expect(result.items[0].id).toBe('ISM-0003');
  });

  it('applicability drift: ISM-0001 not flagged (NC+OS unchanged)', () => {
    const result = computeApplicabilityDrift([{ kind: 'control', ccmRows: q2Rows, sspaRows }]);
    expect(result.items.find((i: any) => i.id === 'ISM-0001')).toBeUndefined();
  });
});
