/**
 * shared/files.js — local JSON file export/import shared by every tool.
 * Everything stays on the device: export is a Blob download, import is a
 * file picker + FileReader. Callers validate the parsed shape themselves.
 */

/** Download an object as pretty-printed JSON. */
export function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

/**
 * Pick a JSON file and parse it. Resolves null when the picker is dismissed,
 * `{ __error: 'parse' }` when the file is not valid JSON, else the parsed value.
 */
export function pickJSON() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return resolve(null);
      const r = new FileReader();
      r.onload = () => {
        try {
          resolve(JSON.parse(r.result));
        } catch {
          resolve({ __error: 'parse' });
        }
      };
      r.readAsText(f);
    };
    inp.click();
  });
}
