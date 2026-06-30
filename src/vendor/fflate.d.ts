/**
 * Minimal ambient types for the vendored fflate ESM build (src/vendor/fflate.js).
 * Only the synchronous functions the Create CCM tab uses are declared.
 */
export type Unzipped = Record<string, Uint8Array>;
export type Zippable = Record<string, Uint8Array>;

export function unzipSync(data: Uint8Array, opts?: any): Unzipped;
export function zipSync(data: Zippable, opts?: any): Uint8Array;
export function strFromU8(dat: Uint8Array, latin1?: boolean): string;
export function strToU8(str: string, latin1?: boolean): Uint8Array;
