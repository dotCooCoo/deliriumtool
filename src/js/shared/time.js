/**
 * shared/time.js — timestamp formatting shared by the adult and pediatric tools.
 * formatStamp renders a readable "Jun 27, 2026, 8:30 AM" (empty → now; an
 * unparseable legacy value is returned unchanged so old logs still render).
 * fileStamp gives a filename-safe "YYYY-MM-DD_HHMM" for export filenames.
 */
const pad2 = (n) => String(n).padStart(2, '0');

export function formatStamp(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return value || '';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fileStamp(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return fileStamp(null);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

// A <input type="datetime-local"> value ("YYYY-MM-DDTHH:MM") for a date (default now).
export function localInput(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
