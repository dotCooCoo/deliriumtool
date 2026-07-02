/**
 * shared/a11y.js — user-configurable accessibility options shared by both tools:
 * text size, high contrast, and reduce motion. These complement the WCAG 2.1 AA
 * conformance the tools already meet — the baseline behind the ADA / Section 508
 * (US), EN 301 549 / the European Accessibility Act (EU), AODA (Canada), the UK
 * PSBAR, and Australia's DDA. Preferences persist in localStorage and apply to the
 * <html> element via data attributes, so the strict CSP holds (no inline styles)
 * and the stylesheet does the rest.
 */
const KEY = 'deliriumtool:a11y';
const NS = 'http://www.w3.org/2000/svg';

function load() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    return {
      text: ['default', 'large', 'xl'].includes(o.text) ? o.text : 'default',
      contrast: o.contrast === 'high' ? 'high' : 'normal',
      motion: o.motion === 'reduce' ? 'reduce' : 'auto',
    };
  } catch {
    return { text: 'default', contrast: 'normal', motion: 'auto' };
  }
}

function save(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable (private mode / quota) — non-fatal */
  }
}

function apply(p) {
  const r = document.documentElement;
  r.dataset.text = p.text;
  r.dataset.contrast = p.contrast;
  r.dataset.motion = p.motion;
}

const prefs = load();
apply(prefs); // take effect as soon as the bundle loads

function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  if (props)
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, String(v));
    }
  for (const kid of kids) if (kid != null) n.append(kid);
  return n;
}

function icon(id) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'fa');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#fa-${id}`);
  svg.append(use);
  return svg;
}

/** Build the accessibility control + panel and mount it in the header. */
export function initA11y() {
  // Join the header's action cluster where one exists (keeps the button on
  // the controls row instead of wrapping onto an orphan line of its own).
  const mount =
    document.querySelector('.app-header-actions') || document.querySelector('.app-header-inner');
  if (!mount || mount.querySelector('.a11y-wrap')) return;

  const panelId = 'a11y-panel';
  const btn = el(
    'button',
    {
      type: 'button',
      class: 'a11y-btn',
      'aria-haspopup': 'true',
      'aria-expanded': 'false',
      'aria-controls': panelId,
    },
    icon('universal-access'),
    el('span', { class: 'a11y-btn-label', text: 'Accessibility' }),
  );

  const panel = el('div', {
    id: panelId,
    class: 'a11y-panel',
    role: 'group',
    'aria-label': 'Accessibility options',
    hidden: 'hidden',
  });

  const sizeGroup = el('div', { class: 'a11y-seg', role: 'radiogroup', 'aria-label': 'Text size' });
  [
    ['default', 'Default text size'],
    ['large', 'Large text'],
    ['xl', 'Largest text'],
  ].forEach(([val, label]) => {
    sizeGroup.append(
      el(
        'button',
        {
          type: 'button',
          class: `a11y-seg-opt a11y-A-${val}`,
          role: 'radio',
          'data-a11y-text': val,
          'aria-checked': String(prefs.text === val),
          'aria-label': label,
          title: label,
        },
        'A',
      ),
    );
  });
  sizeGroup.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-a11y-text]');
    if (!opt) return;
    prefs.text = opt.dataset.a11yText;
    apply(prefs);
    save(prefs);
    sizeGroup
      .querySelectorAll('[data-a11y-text]')
      .forEach((o) => o.setAttribute('aria-checked', String(o.dataset.a11yText === prefs.text)));
  });

  const toggle = (key, onVal, offVal, label) => {
    const id = `a11y-${key}`;
    const input = el('input', { type: 'checkbox', id });
    if (prefs[key] === onVal) input.checked = true;
    input.addEventListener('change', () => {
      prefs[key] = input.checked ? onVal : offVal;
      apply(prefs);
      save(prefs);
    });
    return el('label', { class: 'a11y-toggle', for: id }, input, el('span', { text: label }));
  };

  panel.append(
    el('span', { class: 'a11y-heading', text: 'Text size' }),
    sizeGroup,
    toggle('contrast', 'high', 'normal', 'High contrast'),
    toggle('motion', 'reduce', 'auto', 'Reduce motion'),
  );

  const wrap = el('div', { class: 'a11y-wrap' }, btn, panel);

  const setOpen = (open) => {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', () => setOpen(panel.hidden));
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      btn.focus();
    }
  });

  mount.append(wrap);
}
