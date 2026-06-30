/**
 * IRAP Pulse — shared constants.
 *
 * Pure data: no imports, no side effects, no DOM or CDN dependencies.
 * Every other module imports from here rather than re-declaring locally.
 */

// ---- Column aliases ---------------------------------------------------------
// Maps organisation-specific or variant column names to the canonical names
// the rest of the tool uses. First matching pattern wins.
export const COLUMN_ALIASES: [string, RegExp[]][] = [
  ['Identifier',            [/^identifier$/i, /^control[\s_-]*id$/i, /^ism[\s_-]*id$/i, /^id$/i]],
  ['Description',           [/^description$/i, /^control[\s_-]*(description|text|statement|requirement)$/i,
                              /^security[\s_-]*control$/i, /^requirement(s)?$/i, /^control$/i,
                              /^guideline[\s_-]*text$/i, /^detail(s)?$/i]],
  ['Guideline',             [/^guideline(s)?$/i, /^guideline[\s_-]*group$/i, /^category$/i]],
  ['Topic',                 [/^topic$/i, /^subject$/i, /^control[\s_-]*topic$/i]],
  ['Revision',              [/^revision$/i, /^rev(ision)?[\s_-]*no(\.)?$/i, /^version$/i, /^rev$/i]],
  ['Updated',               [/^updated?$/i, /^last[\s_-]*updated?$/i, /^quarter$/i, /^effective[\s_-]*date$/i]],
  ['Implementation Status', [/^implementation[\s_-]*status$/i, /^impl\.?[\s_-]*status$/i,
                              /^compliance[\s_-]*status$/i, /^assessment[\s_-]*status$/i]],
  ['Provider Responsibility',[/^provider[\s_-]*responsibility$/i, /^provider[\s_-]*resp\.?$/i,
                              /^applicability[\s_-]*scope$/i]],
  // "Responsibility" alone (without "Provider") is a reviewer-managed column
  // in many SSP-A templates. Canonicalising it separately prevents
  // updateReviewSheet from silently overwriting it.
  ['Assessment Responsibility',[/^responsibility$/i, /^implementation[\s_-]*responsibility$/i]],
  // "Section / Function" combined column: Function is listed before Section so
  // "Section / Function" canonicalises to 'Function'.
  ['Function',              [/^function$/i, /^cyber[\s_-]*function$/i, /^principle[\s_-]*function$/i,
                              /^section\s*\/\s*function$/i]],
  ['Section',               [/^section$/i, /^sub[\s_-]*guideline$/i]],
  // Classification applicability columns. Short codes AND full label forms.
  // 'All' was used in older ASD CCM versions instead of 'NC'.
  ['NC',  [/^nc$/i, /^all$/i, /^not[\s_-]*classified$/i]],
  // 'O' was used in older ASD CCM versions for what is now 'OS'.
  ['OS',  [/^o$/i, /^os$/i, /^official[\s:_-]*sensitive$/i, /^official[\s_-]+sensitive$/i]],
  ['P',   [/^p$/i, /^protected$/i]],
  ['S',   [/^s$/i, /^secret$/i]],
  ['TS',  [/^ts$/i, /^top[\s_-]*secret$/i]],
];

// Maximum rows to probe when searching for a header row.
export const HEADER_SCAN_ROWS = 20;

// ---- Updated-detection policy -----------------------------------------------
// Single source of truth: any change in a TRIGGER field → Updated row.
// Changes in METADATA_ONLY fields refresh the baseline silently.
export const UPDATED_TRIGGER_FIELDS: Record<string, boolean> = {
  description:   true,
  guideline:     true,
  applicability: true,
  maturity:      true,
  // updatedDate intentionally absent — date-only changes are metadata, not substantive.
};

// Documentation-only: every field treated as metadata-only.
export const UPDATED_METADATA_ONLY_FIELDS: string[] = [
  'Topic',
  'Section',
  'Function',
  'Revision',
  'Updated',
  'Provider Responsibility',
];

// ---- Identifier normalisation -----------------------------------------------
// Unicode hyphen variants that normaliseIdentifier collapses to ASCII '-'.
export const UNICODE_HYPHENS = /[­‐-―−﹘﹣－−]/g;

// ---- Quarter helpers --------------------------------------------------------
export const MONTH_ABBR: Record<string, string> = {
  january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr',
  may: 'May', june: 'Jun', july: 'Jul', august: 'Aug',
  september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec',
};

// ---- Applicability ----------------------------------------------------------
// ASD CCM uses per-classification boolean columns OR a free-text 'Applicability' cell.
export const CLASS_COLS: [string, string][] = [
  ['NC', 'NOT CLASSIFIED'],
  ['OS', 'OFFICIAL: SENSITIVE'],
  ['P',  'PROTECTED'],
  ['S',  'SECRET'],
  ['TS', 'TOP SECRET'],
];

// ---- Rescission text helpers ------------------------------------------------
export const RESCISSION_VERBS = /\b(merged|rescind|remov|withdraw|consolidat|replac|deprecat|subsum|supersed|combined|incorporat|retir|delet)/i;

export const COMMON_SHORT_WORDS = /^(of|to|in|on|an|at|by|is|it|or|we|as|be|he|no|so|us|my|am|do|go|if|me|up|a|i|the|and|for|but|you|are|was|not|our|her|his|its|all|any|can|may|one|two|per|via)$/i;

// ---- Applicability drift ----------------------------------------------------
// Known ASD classification column renames across CCM releases.
export const APPL_TOKEN_RENAMES: Record<string, string> = {
  'all': 'nc',
  'not classified': 'nc',
};

// ---- Principle function mapping ---------------------------------------------
export const FUNCTION_PREFIX: Record<string, string> = {
  GOV: 'GOVERN',
  IDE: 'IDENTIFY', IDN: 'IDENTIFY', IDF: 'IDENTIFY',
  PRO: 'PROTECT',
  DET: 'DETECT',
  RES: 'RESPOND',
  REC: 'RECOVER',
};

export const FUNCTION_ORDER: string[] = ['GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER'];

// ---- Bundled file URLs and integrity hashes ---------------------------------
export const CCM_URL     = './ccm-current.xlsx';
export const PDF_URL     = './ism-changes-current.pdf';

// Expected SHA-256 hashes of the bundled data files for this release.
// Update whenever the bundled files are replaced for a new quarter.
// Generate with: sha256sum ccm-current.xlsx ism-changes-current.pdf sspa-template-current.xlsx
export const BUNDLED_FILE_HASHES: Record<string, string> = {
  'ccm-current.xlsx':           '324e89a3077f4aee9bef632f2a77c778941947ec75e41d439cd24318e0e3d93e',
  'ism-changes-current.pdf':    '4780b0c27a1faf766f3e117a11bfc2800deb409228ea7f2903cb60f5379ee4b9',
  'sspa-template-current.xlsx': 'd85eb4ca2a0d581ec9c93bed7242495b638db5736d2715b511e85dab8b128e57',
};
