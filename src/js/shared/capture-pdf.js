/**
 * shared/capture-pdf.js — save a DOM node as a single-page PDF, using the
 * same capture technique as the template designer: the node is rendered by
 * the browser's own engine through an SVG foreignObject (pixel-identical to
 * the screen), rasterized to a white-backed JPEG, and embedded full-bleed.
 * Everything runs locally; a data: URL is used because Chromium taints
 * canvases drawn from blob-URL SVGs containing a foreignObject.
 */
import { jsPDF } from 'jspdf';

const RASTER_SCALE = 3; // ~288 dpi

function collectCss() {
  let css = '';
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) css += rule.cssText + '\n';
    } catch {
      /* cross-origin stylesheet — none are used */
    }
  }
  return css;
}

async function rasterizeNode(node) {
  const w = node.offsetWidth;
  const h = node.offsetHeight;
  const clone = node.cloneNode(true);
  clone.style.transform = 'none';
  const holder = document.createElement('div');
  holder.className = document.body.className || '';
  holder.appendChild(clone);
  const bodyXml = new XMLSerializer().serializeToString(holder);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml">` +
    `<style><![CDATA[${collectCss()}]]></style>` +
    `${bodyXml}</div></foreignObject></svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('capture failed'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = w * RASTER_SCALE;
  canvas.height = h * RASTER_SCALE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(RASTER_SCALE, RASTER_SCALE);
  ctx.drawImage(img, 0, 0);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), w, h };
}

/**
 * Capture a node and save it as a letter-portrait PDF, scaled to the page
 * width and top-aligned (a bedside summary is shorter than a page).
 */
export async function captureNodeToPdf(node, { filename, title, subject }) {
  const { dataUrl, w, h } = await rasterizeNode(node);
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const drawW = pageW - margin * 2;
  const drawH = Math.min((h / w) * drawW, pageH - margin * 2);
  doc.addImage(dataUrl, 'JPEG', margin, margin, drawW, drawH);
  if (title || subject) doc.setProperties({ title: title || '', subject: subject || '' });
  doc.save(filename);
}
