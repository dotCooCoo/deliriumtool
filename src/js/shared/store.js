/**
 * shared/store.js — the localStorage persistence mechanics every tool uses:
 * a debounced autosave, a synchronous flush for pagehide (so a quick reload
 * never loses the last edit), and guarded load/clear. Each tool supplies its
 * own storage key and (optionally) a serialize transform; storage failures
 * (private mode / quota) are always non-fatal.
 */
export function makeStore(key, serialize = (state) => state) {
  let timer = null;
  const write = (state) => {
    try {
      localStorage.setItem(key, JSON.stringify(serialize(state)));
    } catch {
      /* storage unavailable — non-fatal */
    }
  };
  return {
    autosave(state) {
      clearTimeout(timer);
      timer = setTimeout(() => write(state), 400);
    },
    flushSave(state) {
      clearTimeout(timer);
      write(state);
    },
    loadSaved() {
      try {
        return JSON.parse(localStorage.getItem(key) || 'null');
      } catch {
        return null;
      }
    },
    clearSaved() {
      try {
        localStorage.removeItem(key);
      } catch {
        /* non-fatal */
      }
    },
  };
}
