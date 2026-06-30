/**
 * Ambient declarations for CDN-loaded globals.
 *
 * These libraries are loaded in template.html via CDN <script> tags before the
 * compiled bundle runs, so they are available as window globals at runtime.
 * TypeScript needs to know they exist; esbuild will leave the identifiers as-is
 * in the IIFE output (no import statements required).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const XLSX:             any;   // xlsx-js-style v1.2.0
declare const pdfjsLib:         any;   // pdf.js v3.11.174
declare const Chart:            any;   // Chart.js v4.4.4
declare const ChartDataLabels: any;   // chartjs-plugin-datalabels v2.2.0

// Extend Window so window.pdfjsLib / window.Chart etc. are valid.
interface Window {
  pdfjsLib:        any;
  Chart:           any;
  ChartDataLabels: any;
}
