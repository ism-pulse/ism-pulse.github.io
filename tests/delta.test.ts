import { describe, it, expect } from 'vitest';
import { computeDelta, crossValidate, findPossibleRescissionPairs, computeApplicabilityDrift, isLikelySSPA } from '../src/delta';

// ---- Helpers ----------------------------------------------------------------
const makeControl = (id: string, overrides: Record<string, any> = {}) => ({
  Identifier: id,
  Description: 'Default description',
  Guideline: 'Default guideline',
  Applicability: '',
  ML1: 'No', ML2: 'No', ML3: 'No',
  Topic: 'Default topic',
  Revision: '1',
  Section: '',
  Function: '',
  ...overrides,
});

// ---- isLikelySSPA -----------------------------------------------------------
describe('isLikelySSPA', () => {
  it('returns true when rows have Implementation Status', () => {
    expect(isLikelySSPA([{ 'Implementation Status': 'Implemented' }])).toBe(true);
  });

  it('returns true when rows have Provider Responsibility', () => {
    expect(isLikelySSPA([{ 'Provider Responsibility': 'Customer' }])).toBe(true);
  });

  it('returns false for plain CCM rows', () => {
    expect(isLikelySSPA([makeControl('ISM-0001')])).toBe(false);
    expect(isLikelySSPA([])).toBe(false);
  });
});

// ---- computeDelta -----------------------------------------------------------
describe('computeDelta', () => {
  it('classifies a new control (in CCM, not in baseline)', () => {
    const ccmRows  = [makeControl('ISM-0001')];
    const sspaRows: any[] = [];
    const delta = computeDelta([{ kind: 'control', ccmRows, sspaRows }]);
    expect(delta).toHaveLength(1);
    expect(delta[0].changeType).toBe('New');
    expect(delta[0].id).toBe('ISM-0001');
  });

  it('classifies a rescinded control (in baseline, not in CCM)', () => {
    const ccmRows: any[] = [];
    const sspaRows = [makeControl('ISM-0001')];
    const delta = computeDelta([{ kind: 'control', ccmRows, sspaRows }]);
    expect(delta).toHaveLength(1);
    expect(delta[0].changeType).toBe('Rescinded');
    expect(delta[0].id).toBe('ISM-0001');
  });

  it('classifies an updated control when description changes', () => {
    const old = makeControl('ISM-0001', { Description: 'Old text' });
    const cur = makeControl('ISM-0001', { Description: 'New text' });
    const delta = computeDelta([{ kind: 'control', ccmRows: [cur], sspaRows: [old] }]);
    expect(delta).toHaveLength(1);
    expect(delta[0].changeType).toBe('Updated');
    expect(delta[0].subFlags.textChanged).toBe(true);
  });

  it('classifies an updated control when guideline changes', () => {
    const old = makeControl('ISM-0001', { Guideline: 'Old guideline' });
    const cur = makeControl('ISM-0001', { Guideline: 'New guideline' });
    const delta = computeDelta([{ kind: 'control', ccmRows: [cur], sspaRows: [old] }]);
    expect(delta[0].changeType).toBe('Updated');
    expect(delta[0].subFlags.glChanged).toBe(true);
  });

  it('classifies an updated control when ML levels change', () => {
    const old = makeControl('ISM-0001', { ML1: 'No', ML2: 'No', ML3: 'No' });
    const cur = makeControl('ISM-0001', { ML1: 'Yes', ML2: 'No', ML3: 'No' });
    const delta = computeDelta([{ kind: 'control', ccmRows: [cur], sspaRows: [old] }]);
    expect(delta[0].changeType).toBe('Updated');
    expect(delta[0].subFlags.mlChanged).toBe(true);
  });

  it('classifies an updated control when applicability changes', () => {
    const old = makeControl('ISM-0001', { NC: 'Yes' });
    const cur = makeControl('ISM-0001', { NC: 'Yes', P: 'Yes' });
    const delta = computeDelta([{ kind: 'control', ccmRows: [cur], sspaRows: [old] }]);
    expect(delta[0].changeType).toBe('Updated');
    expect(delta[0].subFlags.applChanged).toBe(true);
  });

  it('emits no delta when nothing changes', () => {
    const row = makeControl('ISM-0001');
    const delta = computeDelta([{ kind: 'control', ccmRows: [row], sspaRows: [row] }]);
    expect(delta).toHaveLength(0);
  });

  it('is case- and whitespace-insensitive for description comparison', () => {
    const old = makeControl('ISM-0001', { Description: '  Hello World  ' });
    const cur = makeControl('ISM-0001', { Description: 'hello world' });
    const delta = computeDelta([{ kind: 'control', ccmRows: [cur], sspaRows: [old] }]);
    expect(delta).toHaveLength(0);
  });

  it('handles multiple groups (controls + principles)', () => {
    const ctrl  = makeControl('ISM-0001');
    const princ = { ...makeControl('GOV-1'), kind: 'principle' };
    const delta = computeDelta([
      { kind: 'control',   ccmRows: [ctrl],  sspaRows: [] },
      { kind: 'principle', ccmRows: [princ], sspaRows: [] },
    ]);
    expect(delta.filter(d => d.kind === 'control')).toHaveLength(1);
    expect(delta.filter(d => d.kind === 'principle')).toHaveLength(1);
  });

  it('sorts output: Rescinded → Updated → New, then by ID', () => {
    const rows = [
      makeControl('ISM-0003', { Description: 'changed' }),
      makeControl('ISM-0001'),
    ];
    const baseline = [
      makeControl('ISM-0003', { Description: 'original' }),
      makeControl('ISM-0002'),
    ];
    const delta = computeDelta([{ kind: 'control', ccmRows: rows, sspaRows: baseline }]);
    const types = delta.map(d => d.changeType);
    const rescIdx   = types.indexOf('Rescinded');
    const updIdx    = types.indexOf('Updated');
    const newIdx    = types.indexOf('New');
    if (rescIdx >= 0 && updIdx >= 0)  expect(rescIdx).toBeLessThan(updIdx);
    if (updIdx  >= 0 && newIdx  >= 0) expect(updIdx).toBeLessThan(newIdx);
  });
});

// ---- crossValidate ----------------------------------------------------------
describe('crossValidate', () => {
  it('returns null when pdfText is empty', () => {
    const delta = [{ id: 'ISM-0001', changeType: 'New' }];
    expect(crossValidate(delta, '')).toBeNull();
    expect(crossValidate(delta, null as any)).toBeNull();
  });

  it('categorises IDs into matched / onlyInDelta / onlyInPdf', () => {
    const delta  = [{ id: 'ISM-0001' }, { id: 'ISM-0002' }];
    const pdfText = 'Changes include ISM-0001 and ISM-0003.';
    const result = crossValidate(delta, pdfText);
    expect(result.matched).toContain('ISM-0001');
    expect(result.onlyInDelta).toContain('ISM-0002');
    expect(result.onlyInPdf).toContain('ISM-0003');
  });
});

// ---- findPossibleRescissionPairs --------------------------------------------
describe('findPossibleRescissionPairs', () => {
  it('returns null when there are no rescinded items', () => {
    const delta = [{ id: 'ISM-0001', changeType: 'New', topic: 'Patch management', newText: 'New control', oldText: '', kind: 'control', section: '' }];
    expect(findPossibleRescissionPairs(delta)).toBeNull();
  });

  it('surfaces high-similarity Rescinded+New pairs', () => {
    const rescinded = {
      id: 'ISM-0001', changeType: 'Rescinded', kind: 'control',
      topic: 'Patch management for operating systems and applications',
      oldText: 'Organisations apply patches to operating systems within 48 hours of release.',
      newText: '(rescinded)', section: '',
    };
    const newCtrl = {
      id: 'ISM-0002', changeType: 'New', kind: 'control',
      topic: 'Patch management for operating systems',
      oldText: '(not in baseline file)',
      newText: 'Organisations apply operating system patches within 48 hours of release.',
      section: '',
    };
    const unrelated = {
      id: 'ISM-0003', changeType: 'New', kind: 'control',
      topic: 'Physical access controls',
      oldText: '(not in baseline file)',
      newText: 'Physical access must be restricted with biometric controls.',
      section: '',
    };
    const result = findPossibleRescissionPairs([rescinded, newCtrl, unrelated]);
    expect(result).not.toBeNull();
    const pair = result!.items.find(p => p.rescindedId === 'ISM-0001' && p.newId === 'ISM-0002');
    expect(pair).toBeDefined();
    expect(pair!.score).toBeGreaterThan(0.3);
  });

  it('does not pair items of different kinds', () => {
    const rescinded = {
      id: 'GOV-1', changeType: 'Rescinded', kind: 'principle',
      topic: 'Govern cyber security', oldText: 'Principle text.', newText: '(rescinded)', section: '',
    };
    const newCtrl = {
      id: 'ISM-0001', changeType: 'New', kind: 'control',
      topic: 'Govern cyber security', oldText: '(not in baseline file)',
      newText: 'Principle text.', section: '',
    };
    const result = findPossibleRescissionPairs([rescinded, newCtrl]);
    const crossPair = result?.items.find(p => p.rescindedId === 'GOV-1' && p.newId === 'ISM-0001');
    expect(crossPair).toBeUndefined();
  });
});

// ---- computeApplicabilityDrift ----------------------------------------------
describe('computeApplicabilityDrift', () => {
  it('returns empty when sspaRows are not an SSP-A (no Implementation Status)', () => {
    const ccmRows  = [makeControl('ISM-0001', { NC: 'Yes' })];
    const sspaRows = [makeControl('ISM-0001', { NC: 'Yes', P: 'Yes' })];
    // No Implementation Status → not an SSP-A → no drift computed
    const result = computeApplicabilityDrift([{ kind: 'control', ccmRows, sspaRows }]);
    expect(result.count).toBe(0);
  });

  it('detects real applicability drift in SSP-A rows', () => {
    const ccmRows  = [makeControl('ISM-0001', { NC: 'Yes', P: 'Yes' })];
    const sspaRows = [makeControl('ISM-0001', { NC: 'Yes', 'Implementation Status': 'Implemented' })];
    const result = computeApplicabilityDrift([{ kind: 'control', ccmRows, sspaRows }]);
    expect(result.count).toBe(1);
    expect(result.items[0].id).toBe('ISM-0001');
  });

  it('does not flag "All"→"NC" as drift because parseApplicability normalises both to NC', () => {
    // Both CCM NC:Yes and SSP-A Applicability:'All' normalise to token 'NC' via
    // toClassificationCode. By the time computeApplicabilityDrift compares tokens
    // they are already equal — no drift and no migration.
    const ccmRows  = [makeControl('ISM-0001', { NC: 'Yes' })];
    const sspaRows = [makeControl('ISM-0001', { Applicability: 'All', 'Implementation Status': 'Implemented' })];
    const result = computeApplicabilityDrift([{ kind: 'control', ccmRows, sspaRows }]);
    expect(result.count).toBe(0);
    expect(result.migrationCount).toBe(0);
  });

  it('ignores principle rows (kind !== control)', () => {
    const ccmRows  = [{ ...makeControl('GOV-1'), NC: 'Yes', P: 'Yes' }];
    const sspaRows = [{ ...makeControl('GOV-1'), NC: 'Yes', 'Implementation Status': 'Implemented' }];
    const result = computeApplicabilityDrift([{ kind: 'principle', ccmRows, sspaRows }]);
    expect(result.count).toBe(0);
  });
});
