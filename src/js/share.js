/**
 * share.js — de-identified, serverless sharing via the URL fragment.
 *
 * Only the CONFIGURATION is shared: the chosen pathway, the Setup-tab protocol
 * settings, and the medication selection. Patient assessment values and all
 * free-text are deliberately excluded, so a shared link can never carry PHI.
 * Nothing is sent to a server — the payload rides in the URL hash, and the
 * site's Referrer-Policy: no-referrer keeps it out of referrer headers.
 */

import { buildHashUrl, readHashPayload } from './shared/share-codec.js';
export { toBase64Url, fromBase64Url, copyText } from './shared/share-codec.js';

/** Build a shareable URL carrying only the de-identified configuration. */
export function buildShareUrl({ pathway, settings, meds }) {
  const payload = { v: 1, pathway: pathway || null, settings: settings || {}, meds: meds || null };
  return buildHashUrl('cfg', payload);
}

/** Read a shared configuration from the current URL hash, or null if none/invalid. */
export function readShareUrl() {
  return readHashPayload('cfg');
}

/** Copy text to the clipboard; resolves true on success. */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
