/**
 * IRAP Pulse — PDF text helpers.
 *
 * normalisePdfText, extractIsmIdsFromText, cleanRescissionText,
 * extractRescissionReason and friends are pure string functions testable in
 * Node.js.
 *
 * parsePDFFromBuffer is the only function here that requires the pdfjsLib CDN
 * global — it is excluded from unit tests by design.
 */

import { RESCISSION_VERBS, COMMON_SHORT_WORDS } from './constants';

// ---- PDF text normalisation -------------------------------------------------
// pdf.js text extraction often splits identifiers and numbers across whitespace.
// This normalises "ISM - 1837", "PRO - 03", "GOV-1 1" → canonical forms.
export function normalisePdfText(s: string): string {
  if (!s) return '';
  let out = s;
  out = out.replace(/\b(ISM|GOV|IDE|PRO|DET|RES|REC|[A-Z]{2,5})\s+-\s+(\d{1,5})\b/g, '$1-$2');
  out = out.replace(/\b(ISM|GOV|IDE|PRO|DET|RES|REC|[A-Z]{2,5})-\s+(\d{1,5})\b/g, '$1-$2');
  out = out.replace(/\b(ISM|GOV|IDE|PRO|DET|RES|REC|[A-Z]{2,5})\s+-(\d{1,5})\b/g, '$1-$2');
  let prev: string;
  do {
    prev = out;
    out = out.replace(/\b([A-Z]{2,5}-\d+)\s+(\d)\b/g, '$1$2');
  } while (out !== prev);
  out = out.replace(/\s+([.,;:!?)\]])/g, '$1');
  out = out.replace(/([([])\s+/g, '$1');
  out = out.replace(/\b([a-z]+)\s+-\s+([a-z]+)\b/g, '$1-$2');
  out = out.replace(/(['""])\s+([A-Za-z])/g, '$1$2');
  out = out.replace(/([A-Za-z])\s+(['""])/g, '$1$2');
  out = out.replace(/\bTh\s+e\b/g, 'The');
  return out;
}

// ---- ISM ID extraction ------------------------------------------------------
// Extracts all ISM control and principle IDs mentioned in a text block.
export function extractIsmIdsFromText(text: string): Set<string> {
  const ids = new Set<string>();
  const re = /\b(?:ISM[- ]?(\d{3,5})|(GOV|IDE|IDN|IDF|PRO|DET|RES|REC)[- ]?(\d{1,3}))\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) ids.add('ISM-' + m[1]);
    else      ids.add(m[2].toUpperCase() + '-' + m[3].padStart(2, '0'));
  }
  return ids;
}

// ---- Rescission text cleanup ------------------------------------------------
export function cleanRescissionText(s: string): string {
  if (!s) return '';
  let out = String(s).replace(/\s+/g, ' ').trim();
  out = out.replace(/^[^A-Za-z0-9'"]+/, '');

  const TWO_LETTER_WORDS = /^(on|of|to|in|is|it|as|at|or|be|by|do|go|he|if|me|my|no|so|up|us|we|an|am|ho|oh|ox|id)$/i;
  out = out.replace(/\b([a-z])\s+([a-z])\b/gi, (m, a, b) => {
    return TWO_LETTER_WORDS.test(a + b) ? a + b : m;
  });
  out = out.replace(/\b([a-z]{5,})\s+([a-z]{1,2})\b(?!\s+[a-z]{1,2}\b)/gi, (m, stem, suf) => {
    if (COMMON_SHORT_WORDS.test(suf)) return m;
    return stem + suf;
  });
  out = out.replace(/\b([a-z]{1,2})\s+([a-z]{5,})\b/gi, (m, pre, stem) => {
    if (COMMON_SHORT_WORDS.test(pre)) return m;
    return pre + stem;
  });

  const starter = out.slice(0, 200).search(/\b(The existing|This control|This principle|The control|The principle)\b/);
  if (starter > 0 && out.length - starter > 60) {
    out = out.slice(starter);
  }
  return out.trim();
}

// ---- Sentence extraction helpers --------------------------------------------
// Returns the 1–2 sentences of explanation that terminate at the '.' just
// before the bracket at bracketStart in pdfText.
export function extractReasonBeforeBracket(pdfText: string, bracketStart: number): string {
  const lookbackStart = Math.max(0, bracketStart - 1000);
  let lookback = pdfText.slice(lookbackStart, bracketStart);

  const priorBracketIdx = lookback.lastIndexOf(']');
  if (priorBracketIdx >= 0) lookback = lookback.slice(priorBracketIdx + 1);

  const headingRe = /\b(Rescinded principles|Rescinded controls|Modified principles|Modified controls|New principles|New controls|(?:Govern|Identify|Protect|Detect|Respond|Recover)\s+cyber\s+security\s+principles|Guidelines\s+for\s+[A-Za-z ]{3,40})\b/gi;
  let hMatch: RegExpExecArray | null, lastHeadingEnd = -1;
  while ((hMatch = headingRe.exec(lookback)) !== null) {
    lastHeadingEnd = hMatch.index + hMatch[0].length;
  }
  if (lastHeadingEnd > 0) lookback = lookback.slice(lastHeadingEnd);

  const flat = lookback.replace(/\s+/g, ' ').trim();
  // Bound the sentence split: the regex is O(n^2) on terminator-free text, so a
  // hostile PDF could otherwise hang it. A reason only needs the tail anyway.
  const sentences = (flat.length > 20000 ? flat.slice(0, 20000) : flat).match(/[^.!?]+[.!?]+/g) || [];
  if (!sentences.length) return cleanRescissionText(flat);
  let reason = sentences[sentences.length - 1].trim();
  if (reason.length < 60 && sentences.length >= 2) {
    reason = (sentences[sentences.length - 2] + ' ' + reason).trim();
  }
  return cleanRescissionText(reason);
}

// Returns the full sentence containing the given position in pdfText.
export function extractSentenceContaining(pdfText: string, pos: number): string {
  const lookbackStart = Math.max(0, pos - 800);
  const lookback = pdfText.slice(lookbackStart, pos);

  const terms = [...lookback.matchAll(/[.!?\]](?=\s+[A-Z])/g)];
  const backOffset = terms.length
    ? terms[terms.length - 1].index! + terms[terms.length - 1][0].length
    : 0;
  let sentStart = lookbackStart + backOffset;

  const sectionHeadRe = /(Rescinded principles|Rescinded controls|Modified principles|Modified controls|New principles|New controls|(?:Govern|Identify|Protect|Detect|Respond|Recover)\s+cyber\s+security\s+principles|Guidelines\s+for\s+[A-Za-z ]{3,40})/gi;
  const headingWindow = pdfText.slice(sentStart, pos);
  let h: RegExpExecArray | null, lastHeadingAbsEnd = -1;
  while ((h = sectionHeadRe.exec(headingWindow)) !== null) {
    lastHeadingAbsEnd = sentStart + h.index + h[0].length;
  }
  if (lastHeadingAbsEnd > sentStart) sentStart = lastHeadingAbsEnd;

  const after = pdfText.slice(pos, pos + 800);
  const bracketEnd = after.indexOf(']');
  const dotTerm = /[.!?](?=\s|$)/.exec(after);
  let sentEnd: number;
  if (bracketEnd >= 0 && bracketEnd < 500) {
    sentEnd = pos + bracketEnd + 1;
  } else if (dotTerm) {
    sentEnd = pos + dotTerm.index + 1;
  } else {
    sentEnd = pos + 400;
  }
  return cleanRescissionText(pdfText.slice(sentStart, sentEnd));
}

// ---- Rescission reason extraction -------------------------------------------
// Best-effort extractor: scans the ISM Changes PDF text for the explanation of
// why a control or principle was withdrawn.
export function extractRescissionReason(pdfText: string, id: string, topic: string): string {
  if (!pdfText || (!id && !topic)) return '';
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const candidates: Array<{ text: string; score: number; hasVerb: boolean }> = [];

  let tolerantIdRe: RegExp | null = null;
  if (id) {
    const idCore = id.replace(/^ISM[- ]?/i, '');
    const variants = new Set([id, idCore, 'ISM-' + idCore, 'ISM ' + idCore]);
    const tolerant = [...variants].map(v => esc(v).replace(/-/g, '\\s*-\\s*'));
    tolerantIdRe = new RegExp(
      '(?:^|[\\s,(\\[])(?:' + tolerant.join('|') + ')(?=[\\s,)\\]]|$)',
      'i'
    );
  }

  if (tolerantIdRe) {
    // (1) Bracketed-terminator form
    const allBracketsRe = /\[([^\]]+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = allBracketsRe.exec(pdfText)) !== null) {
      if (!tolerantIdRe.test(m[1])) continue;
      const reason = extractReasonBeforeBracket(pdfText, m.index);
      if (reason && reason.length >= 20) {
        candidates.push({ text: reason, score: 5, hasVerb: RESCISSION_VERBS.test(reason) });
      }
    }

    // (2) Parenthesised form
    if (!candidates.length) {
      const allParensRe = /\(([^()]+)\)/g;
      while ((m = allParensRe.exec(pdfText)) !== null) {
        if (!tolerantIdRe.test(m[1])) continue;
        const reason = extractSentenceContaining(pdfText, m.index);
        if (reason && reason.length >= 30) {
          candidates.push({ text: reason, score: 4, hasVerb: RESCISSION_VERBS.test(reason) });
        }
      }
    }
  }

  // (3) Topic-phrase fallback
  if (!candidates.length && topic) {
    const t = String(topic).trim();
    if (t.length >= 4) {
      const topicRe = new RegExp('(?:^|\\W)' + esc(t) + '(?=\\W|$)', 'gi');
      let m: RegExpExecArray | null;
      while ((m = topicRe.exec(pdfText)) !== null) {
        const reason = extractSentenceContaining(pdfText, m.index);
        if (reason && reason.length >= 30) {
          candidates.push({ text: reason, score: 3, hasVerb: RESCISSION_VERBS.test(reason) });
        }
      }
    }
  }

  // (4) Legacy heading form "ID: ..."
  if (!candidates.length && tolerantIdRe) {
    const headingRe = new RegExp('(?:^|\\n)\\s*(?:' +
      [id, id.replace(/^ISM[- ]?/i, ''), 'ISM-' + id.replace(/^ISM[- ]?/i, '')]
        .filter(Boolean).map(esc).join('|') +
      ')\\s*:\\s*', 'gi');
    let m: RegExpExecArray | null;
    while ((m = headingRe.exec(pdfText)) !== null) {
      const start = m.index + m[0].length;
      let slice = pdfText.slice(start, start + 500);
      const cutIdx = slice.search(/\s(ISM[- ]?\d{3,5}|[A-Z]{2,5}-\d{1,3})(?=\W|$)/);
      if (cutIdx > 30) slice = slice.slice(0, cutIdx);
      const flat = slice.replace(/\s+/g, ' ').trim();
      const sentences = flat.match(/[^.!?]+[.!?]+/g);
      const raw = (sentences && sentences.slice(0, 2).join(' ').trim()) || flat.slice(0, 280);
      const cleaned = cleanRescissionText(raw);
      if (cleaned && cleaned.length >= 20) {
        candidates.push({ text: cleaned, score: 2, hasVerb: RESCISSION_VERBS.test(cleaned) });
      }
    }
  }

  if (!candidates.length) return '';
  candidates.sort((a, b) =>
    (b.score - a.score) ||
    ((b.hasVerb ? 1 : 0) - (a.hasVerb ? 1 : 0)) ||
    (b.text.length - a.text.length)
  );
  return candidates[0].text;
}

// ---- Bundled PDF parser (requires pdfjsLib CDN global) ----------------------
// Hardened against memory blow-ups from a large or hostile PDF:
//   - pages are parsed sequentially, not all at once with Promise.all
//   - the page count is capped (MAX_PDF_PAGES)
//   - total extracted text is capped (MAX_PDF_TEXT_CHARS) and parsing stops early
//   - each page and the document are released via cleanup()/destroy()
const MAX_PDF_PAGES = 100;
const MAX_PDF_TEXT_CHARS = 5_000_000;

export async function parsePDFFromBuffer(buf: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  try {
    const total = Math.min(pdf.numPages || 0, MAX_PDF_PAGES);
    const parts: string[] = [];
    let acc = 0;
    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i);
      try {
        const content = await page.getTextContent();
        let s = content.items.map((it: any) => it.str).join(' ');
        if (acc + s.length > MAX_PDF_TEXT_CHARS) s = s.slice(0, Math.max(0, MAX_PDF_TEXT_CHARS - acc));
        parts.push(s);
        acc += s.length;
      } finally {
        if (typeof page.cleanup === 'function') { try { page.cleanup(); } catch {} }
      }
      if (acc >= MAX_PDF_TEXT_CHARS) break;
    }
    return normalisePdfText(parts.join('\n'));
  } finally {
    if (pdf && typeof pdf.destroy === 'function') { try { await pdf.destroy(); } catch {} }
  }
}
