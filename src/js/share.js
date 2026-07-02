/**
 * share.js — de-identified, serverless sharing via the URL fragment.
 *
 * Only the CONFIGURATION is shared: the chosen pathway, the Setup-tab protocol
 * settings, and the medication selection. Patient assessment values and all
 * free-text are deliberately excluded, so a shared link can never carry PHI.
 * Nothing is sent to a server — the payload rides in the URL hash, and the
 * site's Referrer-Policy: no-referrer keeps it out of referrer headers.
 */

export function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(b64) {
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Build a shareable URL carrying only the de-identified configuration. */
export function buildShareUrl({ pathway, settings, meds }) {
  const payload = { v: 1, pathway: pathway || null, settings: settings || {}, meds: meds || null };
  return `${location.origin}${location.pathname}#cfg=${toBase64Url(JSON.stringify(payload))}`;
}

/** Read a shared configuration from the current URL hash, or null if none/invalid. */
export function readShareUrl() {
  const m = /[#&]cfg=([^&]+)/.exec(location.hash);
  if (!m) return null;
  try {
    const obj = JSON.parse(fromBase64Url(m[1]));
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
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
