/**
 * shared/share-codec.js — the serverless URL-fragment sharing mechanics used
 * by every tool: UTF-8-safe base64url encode/decode of a JSON payload riding
 * in the hash (never sent to a server; Referrer-Policy: no-referrer keeps it
 * out of referrer headers), plus a clipboard helper. Each tool keeps its own
 * hash parameter and payload shape.
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

/** Build a share URL for the current page with `#<param>=<payload>`. */
export function buildHashUrl(param, payload) {
  return `${location.origin}${location.pathname}#${param}=${toBase64Url(JSON.stringify(payload))}`;
}

/** Read `#<param>=…` from the current URL; null if absent or invalid. */
export function readHashPayload(param) {
  const m = new RegExp(`[#&]${param}=([^&]+)`).exec(location.hash);
  if (!m) return null;
  try {
    const obj = JSON.parse(fromBase64Url(m[1]));
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}

/** Copy text to the clipboard; resolves true on success. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
