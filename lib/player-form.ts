/** Same rule as the players.handle check in supabase/schema.sql. */
export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;
export const HANDLE_MAX = 30;
export const QUOTE_MAX = 280;

/** Lower-cased handle, or null if it isn't 1–30 of a–z, 0–9 and inner hyphens. */
export function readHandle(value: unknown): string | null {
  const handle = String(value ?? '').trim().toLowerCase();
  return HANDLE_PATTERN.test(handle) ? handle : null;
}

/**
 * Quote as stored: trimmed and NFC-normalised (Burmese input methods can emit the same text
 * in different code point orders). Empty means no quote; undefined means it's too long.
 */
export function readQuote(value: unknown): string | null | undefined {
  const quote = String(value ?? '').normalize('NFC').trim();
  if (!quote) return null;
  return [...quote].length <= QUOTE_MAX ? quote : undefined;
}
