/**
 * Maximum number of full analyses a single user may start per UTC day.
 * Change this one number to change the limit everywhere.
 * The day boundary is UTC (resets at 05:30 IST).
 */
export const DAILY_ANALYSIS_LIMIT = 5;

/**
 * Maximum anonymous preview analyses a single client IP may start per UTC day.
 * The per-browser "one free analysis" cookie is UX; this is the abuse ceiling.
 */
export const DAILY_PREVIEW_LIMIT = 10;
