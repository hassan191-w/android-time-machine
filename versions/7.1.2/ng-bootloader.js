/* Bootloader (fastboot) screen for the Android 7.1.2 simulator.
   Added to a modified version of Android Time Machine by szabolevi98
   (https://github.com/szabolevi98/android-time-machine), which is licensed
   under the GNU Affero General Public License v3. This file is licensed
   under the same license. Change: adds a simulated bootloader and terminal. */
(() => {
  'use strict';
  const KEY = 'ngbl-unlocked', BOOT = 'android-sim-booted-7.1.2';
  const MENU = ['Start', 'Restart bootloader', 'Recovery mode', 'Power off'];
  const st = { open: false, mode: 'bl', sel: 0, confirm: false, vol: false, swallow: false };
  let root, term, out, fab;

  const unlocked = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const setUnlocked = v => { try { v ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (e) {} };

  const css = `
.ngbl{position:absolute;inset:0;z-index:99999;background:#000;color:#fff;font:13px/1.5 Roboto,system-ui,sans-serif;padding:22px 16px;overflow:hidden}
.ngbl h3{margin:0 0 8px;font-size:18px;font-weight:500;color:#ef5350}
.ngbl .k{color:#9aa5ad}
.ngbl ul{list-style:none;margin:18px 0 0;padding:0;font-size:15px}
.ngbl li{padding:8px 10px;border-radius:4px;cursor:pointer}
.ngbl li.on{background:#1a73e8}
.ngbl.off{background:#000}
.header-actions button.ngbl-btn{width:auto;height:35px;border-radius:18px;padding:0 12px;font-size:12px;color:#8ad7e5;background:#122630;border:1px solid #63808a61;cursor:pointer}
@media(max-width:500px){.ngbl-term{position:fixed;left:8px;right:8px;bottom:8px;margin:0;height:170px;z-index:100000;max-width:none}}
.ngbl-term{direction:ltr;margin:14px auto 0;max-width:392px;background:#0b0f13;color:#d7e1ea;border-radius:10px;font:13px/1.5 "Roboto Mono",monospace;padding:10px;height:190px;display:none;flex-direction:column}
.ngbl-term.show{display:flex}
.ngbl-fab{position:fixed;right:8px;bottom:90px;z-index:100001;font:500 12px Roboto,system-ui,sans-serif;color:#8ad7e5;background:#122630;border:1px solid #63808a;border-radius:18px;padding:9px 14px;cursor:pointer}
.ngbl-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}
.ngbl-chips button{font:12px "Roboto Mono",monospace;color:#d7e1ea;background:#1b232b;border:1px solid #3a444d;border-radius:14px;padding:5px 10px;cursor:pointer}
.ngbl-term pre{flex:1;margin:0;overflow:auto;white-space:pre-wrap;font:inherit}
.ngbl-term form{display:flex;gap:6px;margin:6px 0 0}
.ngbl-term input{flex:1;min-width:0;background:none;border:0;border-bottom:1px solid #3a444d;color:inherit;font:inherit}`;

  function say(t) { out.textContent += '\n' + t; out.scrollTop = out.scrollHeight; }

  function render() {
    if (!root) return;
    if (st.mode === 'off') { root.className = 'ngbl off'; root.innerHTML = ''; return; }
    root.className = 'ngbl';
    if (st.mode === 'recovery') {
      root.innerHTML = '<h3>No command</h3><span class="k">Recovery (simulated). Press Power to reboot.</span>';
      return;
    }
    const list = st.confirm ? ['Do not unlock', 'Unlock bootloader'] : MENU;
    const head = st.confirm
      ? '<h3>Unlock bootloader?</h3><span class="k">Unlocking wipes all data. Use the volume keys to choose and Power to confirm.</span>'
      : '<h3>Fastboot mode</h3><span class="k">Product:</span> angler<br><span class="k">Lock state:</span> ' + (unlocked() ? 'unlocked' : 'locked');
    root.innerHTML = head + '<ul>' + list.map((m, i) => '<li data-i="' + i + '" class="' + (i === st.sel ? 'on' : '') + '">' + m + '</li>').join('') + '</ul>';
  }

  function open() {
    if (st.open) return;
    st.open = true; st.mode = 'bl'; st.sel = 0; st.confirm = false;
    const screen = document.getElementById('screen');
    if (!screen) return;
    root = document.createElement('div');
    root.addEventListener('click', e => {
      const li = e.target.closest('li');
      if (li) { st.sel = +li.dataset.i; render(); act(st.sel); }
    });
    screen.appendChild(root);
    term.classList.add('show');
    if (fab) fab.style.display = 'none';
    render();
  }

  function start() {
    try { sessionStorage.removeItem(BOOT); } catch (e) {}
    history.replaceState(null, '', location.pathname + location.search);
    location.reload();
  }

  function act(i) {
    if (st.confirm) {
      if (i === 1) { setUnlocked(true); say('Unlocked. User data wiped (simulated).'); }
      st.confirm = false; st.sel = 0; render(); return;
    }
    if (i === 0) start();
    else if (i === 1) { say('Restarting bootloader...'); st.sel = 0; render(); }
    else if (i === 2) { st.mode = 'recovery'; render(); }
    else { st.mode = 'off'; render(); }
  }

  function powerKey() {
    if (st.mode === 'off' || st.mode === 'recovery') start();
    else act(st.sel);
  }

  function volKey(dir) {
    if (st.mode !== 'bl') return;
    const n = st.confirm ? 2 : MENU.length;
    st.sel = (st.sel + dir + n) % n; render();
  }

  function command(line) {
    const v = line.trim();
    say('$ ' + v);
    if (!v) return;
    if (v === 'help') return say('fastboot devices\nfastboot getvar product\nfastboot flashing unlock\nfastboot flashing lock\nfastboot reboot');
    if (!v.startsWith('fastboot')) return say('command not found');
    if (!st.open || st.mode !== 'bl') return say('< waiting for any device >');
    if (v === 'fastboot devices') return say('angler-sim    fastboot');
    if (v === 'fastboot getvar product') return say('product: angler');
    if (v === 'fastboot flashing unlock') {
      if (unlocked()) return say('FAILED (already unlocked)');
      say('Confirm on the device screen...'); st.confirm = true; st.sel = 0; return render();
    }
    if (v === 'fastboot flashing lock') { setUnlocked(false); say('Locked.'); return render(); }
    if (v === 'fastboot reboot') { say('rebooting...'); return start(); }
    say('unknown command');
  }

  function build() {
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    term = document.createElement('div'); term.className = 'ngbl-term';
    const CMDS = ['fastboot devices', 'fastboot flashing unlock', 'fastboot flashing lock', 'fastboot reboot'];
    term.innerHTML = '<pre>$ help</pre><div class="ngbl-chips">' + CMDS.map(c => '<button type="button" data-c="' + c + '">' + c.replace('fastboot ', '') + '</button>').join('') + '</div><form><span>$</span><input autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="fastboot command"></form>';
    out = term.querySelector('pre');
    term.querySelector('.ngbl-chips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) command(b.dataset.c); });
    term.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const inp = term.querySelector('input'); command(inp.value); inp.value = '';
    });
    const area = document.querySelector('.device-area') || document.body;
    area.appendChild(term);
    fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'ngbl-fab'; fab.textContent = 'Bootloader';
    fab.addEventListener('click', open);
    document.body.appendChild(fab);
    const actions = document.querySelector('.header-actions');
    if (actions) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ngbl-btn'; b.textContent = 'Bootloader';
      b.addEventListener('click', open);
      actions.prepend(b);
    }
    if (location.hash === '#bootloader') open();
  }

  // Keys: the side keys on desktop, the header buttons on phones.
  // Hold volume down, then press power, to enter the bootloader.
  const keyOf = e => {
    const t = e.target;
    if (!t || !t.closest) return '';
    if (t.closest('#volume-down')) return 'down';
    if (t.closest('#volume-up')) return 'up';
    const rocker = t.closest('.volume-rocker');
    if (rocker) { const r = rocker.getBoundingClientRect(); return e.clientY - r.top > r.height / 2 ? 'down' : 'up'; }
    if (t.closest('.power-key, #power-button')) return 'power';
    return '';
  };
  document.addEventListener('pointerdown', e => {
    const k = keyOf(e);
    st.swallow = false;
    if (!k) return;
    if (k === 'down') st.vol = true;
    if (k === 'power') {
      if (st.open) { st.swallow = true; e.stopImmediatePropagation(); powerKey(); }
      else if (st.vol) { st.swallow = true; e.stopImmediatePropagation(); open(); }
    } else if (st.open) {
      st.swallow = true; e.stopImmediatePropagation(); volKey(k === 'down' ? 1 : -1);
    }
  }, true);
  document.addEventListener('click', e => {
    if (st.swallow && keyOf(e)) { e.stopImmediatePropagation(); e.preventDefault(); st.swallow = false; }
  }, true);
  ['pointerup', 'pointercancel'].forEach(n => document.addEventListener(n, () => { setTimeout(() => { st.vol = false; }, 0); }, true));

  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (st.open && !typing) {
      if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); volKey(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); volKey(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); powerKey(); }
    } else if (!st.open && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'b') {
      open();
    }
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
  window.NGBootloader = { open };
})();
