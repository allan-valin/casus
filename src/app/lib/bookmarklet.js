/*
 * "Send to Casus" bookmarklet (Allan, 2026-10-19: browse a site such as NHK News Web Easy, see paragraphs outlined,
 * click one and add it to the Casus text box). A page cannot frame or read most news sites, so the bookmark runs on
 * the site instead: it outlines the paragraph under the pointer, a click opens a small menu, and "Add to Casus"
 * sends the paragraph's text (furigana left out) to the tab named casus as #append=… (PassagePicker adds it at the
 * bottom). Escape, or the bookmark again, switches it off.
 *
 * install() must stay self-contained: its source text becomes the bookmark.
 */
export function install(doc, win, casusUrl, labels = { add: 'Add to Casus', cancel: 'Cancel' }) {
  if (win.__casusPick) { win.__casusPick(); return; }
  const BLOCK = 'p,li,h1,h2,h3,h4,h5,h6,blockquote,dd,dt,td,th,figcaption,pre,div';
  const style = doc.createElement('style');
  style.textContent = '.casus-pick{outline:3px solid #e67e22!important;outline-offset:2px;cursor:pointer!important}'
    + '.casus-menu{position:fixed;z-index:2147483647;background:#fff;color:#222;border:1px solid #888;border-radius:8px;'
    + 'box-shadow:0 4px 16px rgba(0,0,0,.25);padding:6px;font:15px system-ui,sans-serif;display:flex;gap:6px}'
    + '.casus-menu button{font:inherit;padding:6px 12px;border:1px solid #bbb;border-radius:6px;background:#f6f6f6;cursor:pointer}'
    + '.casus-menu button[data-act=add]{background:#e67e22;color:#fff;border-color:#e67e22}';
  doc.head.appendChild(style);
  let current = null;
  let menu = null;
  const textOf = (el) => {
    const copy = el.cloneNode(true);
    for (const r of copy.querySelectorAll('rt,rp,script,style')) r.remove();
    return copy.textContent.replace(/\s+/g, ' ').trim();
  };
  // the nearest block with its own text: a div only when it holds no other blocks
  const blockOf = (node) => {
    for (let el = node; el && el !== doc.body; el = el.parentElement) {
      if (!el.matches || !el.matches(BLOCK)) continue;
      if (el.tagName === 'DIV' && el.querySelector('p,li,div,blockquote,h1,h2,h3,table')) continue;
      if (textOf(el).length >= 2) return el;
    }
    return null;
  };
  const mark = (el) => { if (current) current.classList.remove('casus-pick'); current = el; if (el) el.classList.add('casus-pick'); };
  const closeMenu = () => { if (menu) menu.remove(); menu = null; };
  const over = (e) => { if (!menu) mark(blockOf(e.target)); };
  const click = (e) => {
    if (menu && menu.contains(e.target)) return;
    const el = blockOf(e.target);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    mark(el);
    closeMenu();
    menu = doc.createElement('div');
    menu.className = 'casus-menu';
    menu.style.left = `${Math.max(4, Math.min(e.clientX, (win.innerWidth || 800) - 220))}px`;
    menu.style.top = `${Math.max(4, e.clientY + 8)}px`;
    const add = doc.createElement('button');
    add.dataset.act = 'add';
    add.textContent = labels.add;
    add.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const text = textOf(el);
      win.open(`${casusUrl}#append=${encodeURIComponent(text)}&from=${encodeURIComponent(win.location.hostname)}`, 'casus');
      el.style.outlineColor = '#2e8b57';
      closeMenu();
    };
    const cancel = doc.createElement('button');
    cancel.dataset.act = 'cancel';
    cancel.textContent = labels.cancel;
    cancel.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); closeMenu(); };
    menu.append(add, cancel);
    doc.body.appendChild(menu);
  };
  const key = (e) => { if (e.key === 'Escape') off(); };
  function off() {
    doc.removeEventListener('mouseover', over, true);
    doc.removeEventListener('click', click, true);
    doc.removeEventListener('keydown', key, true);
    mark(null);
    closeMenu();
    style.remove();
    delete win.__casusPick;
  }
  doc.addEventListener('mouseover', over, true);
  doc.addEventListener('click', click, true);
  doc.addEventListener('keydown', key, true);
  win.__casusPick = off;
}

/** the bookmark itself: install()'s own source, called with this language's Casus page */
export function bookmarkletHref(casusUrl, labels = { add: 'Add to Casus', cancel: 'Cancel' }) {
  return `javascript:(${install.toString()})(document,window,${JSON.stringify(casusUrl)},${JSON.stringify(labels)});void 0`;
}
