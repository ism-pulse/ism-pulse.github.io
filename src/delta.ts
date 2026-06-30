/**
 * IRAP Pulse — delta computation.
 *
 * computeDelta, crossValidate, findPossibleRescissionPairs,
 * computeApplicabilityDrift, and isLikelySSPA are pure functions with no DOM
 * or CDN dependencies — fully unit-testable in Node.js.
 */

import { UPDATED_TRIGGER_FIELDS, APPL_TOKEN_RENAMES } from './constants';
import { normaliseIdentifier, functionFromId } from './normalise';
import {
  mlLevels, mlLevelsVerbose, parseApplicability,
  applicability, controlCoversClassification, applicabilityTokens,
} from './applicability';
import { extractIsmIdsFromText } from './pdf';

// ---- SSP-A detection --------------------------------------------------------
// Returns true when the row set looks like an SSP-A rather than a raw CCM.
// Applicability drift is only meaningful when comparing a scoped baseline
// (SSP-A) against the unmodified CCM — CCM-vs-CCM drift is uninformative.
export function isLikelySSPA(rows: any[]): boolean {
  return rows.some(r =>
    Object.prototype.hasOwnProperty.call(r, 'Implementation Status') ||
    Object.prototype.hasOwnProperty.call(r, 'Provider Responsibility')
  );
}

// ---- Applicability token rename normalisation --------------------------------
function applyKnownRenames(tokenSet: Set<string>): Set<string> {
  const out = new Set<string>();
  tokenSet.forEach(t => out.add(APPL_TOKEN_RENAMES[t.toLowerCase()] || t));
  return out;
}

// ---- Delta computation -------------------------------------------------------
// Computes a combined delta across one or more review groups.
// Each group is { kind, ccmRows, sspaRows }.
// Output changeType values: 'New' | 'Updated' | 'Rescinded'.
export function computeDelta(groups: any[], opts?: any): any[] {
  opts = opts || {};
  const systemClass = opts.systemClassification || '';
  const normText = (s: any) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
  const delta: any[] = [];

  groups.forEach(({ kind, ccmRows, sspaRows }) => {
    if (!ccmRows || !sspaRows) return;
    const sspaById: Record<string, any> = Object.create(null);
    sspaRows.forEach((r: any) => {
      const id = normaliseIdentifier(r['Identifier']);
      if (id) sspaById[id] = r;
    });
    const ccmIds = new Set<string>();

    ccmRows.forEach((r: any) => {
      const id = normaliseIdentifier(r['Identifier']);
      if (!id) return;
      ccmIds.add(id);
      const oldRow = sspaById[id];

      let changeType: string;
      let subFlags: any = null;

      if (!oldRow) {
        changeType = 'New';
      } else {
        const textChanged = UPDATED_TRIGGER_FIELDS.description   && normText(oldRow['Description'])     !== normText(r['Description']);
        const glChanged   = UPDATED_TRIGGER_FIELDS.guideline     && normText(oldRow['Guideline'] || '') !== normText(r['Guideline'] || '');
        const mlChanged   = UPDATED_TRIGGER_FIELDS.maturity      && mlLevels(oldRow).toLowerCase()      !== mlLevels(r).toLowerCase();
        const applChanged = UPDATED_TRIGGER_FIELDS.applicability && (() => {
          const oldAppl = parseApplicability(oldRow);
          const newAppl = parseApplicability(r);
          if (oldAppl.residual !== newAppl.residual) return true;
          if (oldAppl.coverage.size !== newAppl.coverage.size) return true;
          for (const t of oldAppl.coverage) if (!newAppl.coverage.has(t)) return true;
          return false;
        })();
        const substantiveChanged = textChanged || glChanged || mlChanged || applChanged;
        if (substantiveChanged) {
          changeType = 'Updated';
          subFlags   = { textChanged, glChanged, mlChanged, applChanged };
        } else {
          return;
        }
      }

      delta.push({
        kind, id, changeType,
        revision: r['Revision'], guideline: r['Guideline'],
        section: r['Section'] || (kind === 'control' ? (r['Function'] || '') : ''),
        topic: r['Topic'],
        functionName: kind === 'principle' ? (r['Function'] || functionFromId(id) || '') : '',
        applicability: applicability(r),
        oldApplicability: oldRow ? applicability(oldRow) : null,
        mlLevels: mlLevels(r),
        mlLevelsVerbose: mlLevelsVerbose(r),
        classCoverage: controlCoversClassification(r, systemClass),
        oldText: oldRow ? String(oldRow['Description'] || '') : '(not in baseline file)',
        newText: String(r['Description'] || ''),
        scoping: oldRow ? {
          prov: oldRow['Provider Responsibility'] || oldRow['Assessment Responsibility'] || '',
          status: oldRow['Implementation Status'] || '',
        } : { prov: '', status: '' },
        subFlags,
      });
    });

    // Rescinded: in baseline, not in CCM
    sspaRows.forEach((r: any) => {
      const id = normaliseIdentifier(r['Identifier']);
      if (!id || ccmIds.has(id)) return;
      delta.push({
        kind, id, changeType: 'Rescinded',
        revision: r['Revision'], guideline: r['Guideline'],
        section: r['Section'] || (kind === 'control' ? (r['Function'] || '') : ''),
        topic: r['Topic'],
        functionName: kind === 'principle' ? (r['Function'] || functionFromId(id) || '') : '',
        applicability: applicability(r),
        mlLevels: mlLevels(r),
        mlLevelsVerbose: mlLevelsVerbose(r),
        classCoverage: controlCoversClassification(r, systemClass),
        oldText: String(r['Description'] || ''),
        newText: '(rescinded)',
        scoping: {
          prov: r['Provider Responsibility'] || r['Assessment Responsibility'] || '',
          status: r['Implementation Status'] || '',
        },
      });
    });
  });

  const kindOrder: Record<string, number>   = { control: 0, principle: 1 };
  const changeOrder: Record<string, number> = { Rescinded: 0, Updated: 1, New: 2 };
  delta.sort((a, b) =>
    (kindOrder[a.kind]         - kindOrder[b.kind]) ||
    (changeOrder[a.changeType] - changeOrder[b.changeType]) ||
    a.id.localeCompare(b.id)
  );
  return delta;
}

// ---- Cross-validation -------------------------------------------------------
// Checks which IDs appear in the delta vs the Changes PDF.
export function crossValidate(delta: any[], pdfText: string): any | null {
  if (!pdfText) return null;
  const deltaIds = new Set(delta.map((d: any) => d.id));
  const pdfIds   = extractIsmIdsFromText(pdfText);
  const matched      = [...deltaIds].filter(id => pdfIds.has(id));
  const onlyInDelta  = [...deltaIds].filter(id => !pdfIds.has(id));
  const onlyInPdf    = [...pdfIds].filter(id => !deltaIds.has(id));
  return { pdfIds, matched, onlyInDelta, onlyInPdf, deltaCount: deltaIds.size };
}

// ---- Possible rescission pairs ----------------------------------------------
// Surfaces Rescinded+New pairs that may represent a rename.
export function findPossibleRescissionPairs(delta: any[]): { items: any[]; count: number } | null {
  const STOP = new Set([
    'the','and','for','with','that','this','from','into','have','has','are','was','were',
    'been','being','their','these','those','which','when','where','while','such','other',
    'must','may','can','will','shall','not','also','any','all','each','per','than','then',
    'only','they','them','some','more','most','including','used','use','using',
    'ism','control','controls','principle','principles','system','systems','information',
  ]);
  const tokenise = (s: any) => String(s || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w: string) => w.length >= 4 && !STOP.has(w));
  const setOf = (d: any): Set<string> => {
    const src = [d.topic, d.newText, d.oldText, d.section].filter(Boolean).join(' ');
    return new Set(tokenise(src));
  };
  const jaccard = (a: Set<string>, b: Set<string>): number => {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    a.forEach(x => { if (b.has(x)) inter++; });
    const union = a.size + b.size - inter;
    return union ? inter / union : 0;
  };

  const rescinded = delta.filter(d => d.changeType === 'Rescinded');
  if (!rescinded.length) return null;
  const candidates = delta.filter(d => d.changeType === 'New');
  const THRESHOLD  = 0.35;
  const MIN_OVERLAP = 3;
  const items: any[] = [];

  rescinded.forEach(r => {
    const rset = setOf(r);
    if (!rset.size) return;
    candidates.forEach(n => {
      if (n.kind !== r.kind) return;
      const nset = setOf(n);
      let inter = 0;
      rset.forEach(x => { if (nset.has(x)) inter++; });
      if (inter < MIN_OVERLAP) return;
      const score = jaccard(rset, nset);
      if (score >= THRESHOLD) {
        items.push({
          rescindedId: r.id, rescindedTopic: r.topic || '',
          newId: n.id, newTopic: n.topic || '',
          score: Math.round(score * 100) / 100,
          overlap: inter,
        });
      }
    });
  });

  items.sort((a, b) => b.score - a.score || b.overlap - a.overlap);
  return { items, count: items.length };
}

// ---- Applicability drift detection ------------------------------------------
// Compares baseline (SSP-A) applicability tokens against the current CCM.
// A mismatch means the SSP-A row may need a hand-update that the normal delta
// wouldn't surface.
export function computeApplicabilityDrift(
  groups: any[],
  opts?: any
): { items: any[]; count: number; schemaMigrations: any[]; migrationCount: number } {
  const items: any[]             = [];
  const schemaMigrations: any[]  = [];

  groups.forEach(({ kind, ccmRows, sspaRows }) => {
    if (!ccmRows || !sspaRows) return;
    if (kind !== 'control') return;
    if (!isLikelySSPA(sspaRows)) return;

    const sspaById: Record<string, any> = Object.create(null);
    sspaRows.forEach((r: any) => {
      const id = normaliseIdentifier(r['Identifier']);
      if (id) sspaById[id] = r;
    });

    ccmRows.forEach((ccmRow: any) => {
      const id = normaliseIdentifier(ccmRow['Identifier']);
      if (!id) return;
      const sspaRow = sspaById[id];
      if (!sspaRow) return;

      const ccmTokens  = applicabilityTokens(ccmRow);
      const sspaTokens = applicabilityTokens(sspaRow);
      if (!ccmTokens.size || !sspaTokens.size) return;

      const a = [...ccmTokens].sort().join('|');
      const b = [...sspaTokens].sort().join('|');
      if (a === b) return;

      const mappedSspa = applyKnownRenames(sspaTokens);
      const aMapped    = [...mappedSspa].sort().join('|');
      const entry = {
        id, kind,
        ccm: [...ccmTokens].sort().join(', '),
        sspa: [...sspaTokens].sort().join(', '),
      };
      if (aMapped === a) {
        schemaMigrations.push(entry);
      } else {
        items.push(entry);
      }
    });
  });

  items.sort((x, y) => x.id.localeCompare(y.id));
  schemaMigrations.sort((x, y) => x.id.localeCompare(y.id));
  return { items, count: items.length, schemaMigrations, migrationCount: schemaMigrations.length };
}
