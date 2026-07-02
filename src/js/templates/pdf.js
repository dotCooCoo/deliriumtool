/**
 * templates/pdf.js — "Save as PDF" captures the on-screen sheets themselves.
 *
 * The preview DOM is the print artifact, so the PDF embeds a high-resolution
 * raster of each sheet (rendered by the browser's own engine via an SVG
 * foreignObject, so it is pixel-identical to the print output) and overlays
 * interactive form fields at positions measured from the live elements:
 * checkboxes over every check square, one radio group per sheet over the RASS
 * circles, and text fields over the write-in blanks. One layout engine — the
 * sheet and the PDF cannot drift apart. Everything runs in the browser; no
 * data leaves the device.
 */
import {
  jsPDF,
  AcroFormCheckBox,
  AcroFormTextField,
  AcroFormRadioButton,
  AcroFormAppearance,
} from 'jspdf';
import { TEMPLATES } from './data/content.js';

// ~288 dpi — crisp for lamination-quality printing, moderate file size.
const RASTER_SCALE = 3;

/** Every same-origin CSS rule, so the captured clone styles itself. */
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

/**
 * Render one sheet element to a PNG data URL at print resolution. The clone
 * is wrapped in a container carrying the preview's classes (type scale and
 * font family are set there) plus the page's icon sprite so `use` references
 * resolve inside the image document.
 */
async function rasterizeSheet(sheet, wrapClass) {
  const w = sheet.offsetWidth;
  const h = sheet.offsetHeight;
  const clone = sheet.cloneNode(true);
  clone.style.transform = 'none';
  const holder = document.createElement('div');
  holder.className = wrapClass;
  holder.appendChild(clone);
  const sprite = document.querySelector('svg.sprite');
  const spriteXml = sprite ? new XMLSerializer().serializeToString(sprite) : '';
  const bodyXml = new XMLSerializer().serializeToString(holder);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml">` +
    `<style><![CDATA[${collectCss()}]]></style>` +
    `${spriteXml}${bodyXml}</div></foreignObject></svg>`;
  // A data: URL, not a blob: — Chromium taints canvases drawn from blob-URL
  // SVGs that contain a foreignObject, which would block export.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('sheet capture failed'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = w * RASTER_SCALE;
  canvas.height = h * RASTER_SCALE;
  const ctx = canvas.getContext('2d');
  // JPEG on a white background — jsPDF stores PNG canvases as raw pixel
  // streams (tens of MB); the flat-color sheets compress cleanly as JPEG.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(RASTER_SCALE, RASTER_SCALE);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Overlay interactive fields on the current page at the positions the live
 * sheet actually renders them (ratios of the sheet's box, so the preview
 * zoom cancels out). Returns the running field sequence.
 */
function addFields(doc, sheet, pageW, pageH, seq) {
  const s = sheet.getBoundingClientRect();
  const rel = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: ((r.left - s.left) / s.width) * pageW,
      y: ((r.top - s.top) / s.height) * pageH,
      w: (r.width / s.width) * pageW,
      h: (r.height / s.height) * pageH,
    };
  };

  // Check squares — independent checkboxes. An explicit font size keeps the
  // check glyph inside the box (jsPDF's auto size draws it far outside).
  for (const el of sheet.querySelectorAll('.sh-box, .sh-med-box')) {
    const b = rel(el);
    try {
      const cb = new AcroFormCheckBox();
      cb.fieldName = `chk_${++seq}`;
      cb.Rect = [b.x, b.y, b.w, b.h];
      cb.fontSize = Math.max(4, Math.min(b.w, b.h) * 0.85);
      cb.value = 'Off';
      cb.appearanceState = 'Off';
      cb.showWhenPrinted = true;
      doc.addField(cb);
    } catch {
      /* AcroForm unavailable — the printed square still works with a pen */
    }
  }

  // RASS circles — the levels are mutually exclusive, so one radio group per
  // sheet: picking a level marks it with a dot and clears the others.
  const circles = [...sheet.querySelectorAll('.sh-rass-box')];
  if (circles.length) {
    try {
      const group = new AcroFormRadioButton();
      group.fieldName = `rass_${++seq}`;
      group.value = '';
      doc.addField(group);
      circles.forEach((el, i) => {
        const b = rel(el);
        const opt = group.createOption(`r${i}`);
        opt.Rect = [b.x, b.y, b.w, b.h];
        opt.AS = '/Off';
      });
      group.setAppearance(AcroFormAppearance.RadioButton.Circle);
    } catch {
      /* non-fatal */
    }
  }

  // Write-in blanks — text fields sized to the underline, tall enough to type.
  for (const el of sheet.querySelectorAll('.sh-blank')) {
    const b = rel(el);
    if (b.w < 8) continue;
    const fh = Math.max(b.h, 10);
    try {
      const tf = new AcroFormTextField();
      tf.fieldName = `txt_${++seq}`;
      tf.Rect = [b.x, b.y + b.h - fh, b.w, fh];
      tf.fontSize = Math.min(9, fh * 0.7);
      tf.showWhenPrinted = true;
      doc.addField(tf);
    } catch {
      /* non-fatal */
    }
  }
  return seq;
}

/** Capture both sheets into a fillable PDF and save it. */
export async function downloadPdf(state) {
  const sheets = [...document.querySelectorAll('#sheets .sheet')];
  if (!sheets.length) return;
  const t = TEMPLATES.find((x) => x.id === state.template) || TEMPLATES[0];
  const orientation = t.orientation;
  const wrapClass = document.getElementById('sheets').className;
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let seq = 0;
  for (let i = 0; i < sheets.length; i++) {
    if (i > 0) doc.addPage('letter', orientation);
    const png = await rasterizeSheet(sheets[i], wrapClass);
    doc.addImage(png, 'JPEG', 0, 0, pageW, pageH);
    seq = addFields(doc, sheets[i], pageW, pageH, seq);
  }
  doc.setProperties({
    title: t.name,
    subject: 'Bedside delirium reference sheet — reference aid only',
    keywords: 'delirium, CAM-ICU, RASS, ABCDEF, ICU, reference aid',
  });
  // Revision/date ride along in the filename for version tracking — readable
  // segments joined by underscores (e.g. _Rev-B_2026-07-01).
  const slug = (v) =>
    v
      .trim()
      .replace(/[^A-Za-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
  const suffix = [state.docRev, state.docDate]
    .map((v) => slug(v || ''))
    .filter(Boolean)
    .join('_');
  const fname =
    {
      rounding: 'icu-delirium-rounding-tool',
      spa: 'spa-delirium-quick-reference',
      'peds-cards': 'peds-delirium-card-set',
      'peds-workflow': 'picu-delirium-workflow',
    }[state.template] || 'delirium-template';
  doc.save(`${fname}${suffix ? `_${suffix}` : ''}.pdf`);
}
