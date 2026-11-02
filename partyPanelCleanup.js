// js/partyPanelCleanup.js (v1)
// ⭐ 移除「戰鬥隊伍面板」下方的三個區塊：
//      🔥 主控心法：……
//      🤝 隨行護法：……
//      🐉 隨行靈獸：……
//
// 【手法】不修改任何原檔，用「文字定位 + MutationObserver」
//   ① 以標籤前綴比對，取得最內層節點
//   ② 往上收斂成「一列」（單一子節點包裝層一路往上）
//   ③ 三列若共用一個「只裝它們」的父容器 → 連父容器一起處理（不留空白）
//   ④ MutationObserver 監看重繪；另有輪詢當保險
//   ⑤ 預設 hide（display:none），可切換成 remove
//   ⑥ 保護清單：不會誤動好友／字體／連動等系統的彈窗
//
// Console：
//   HY.PartyPanelCleanup.scan()              // 目前命中哪些節點
//   HY.PartyPanelCleanup.hide()              // 立即處理
//   HY.PartyPanelCleanup.restore()           // 還原
//   HY.PartyPanelCleanup.marks(['🔥 主控心法'])   // 改錨點
//   HY.PartyPanelCleanup.config({ MODE:'remove', TIDY_PARENT:false })
//   HY.PartyPanelCleanup.manual('#selector') // 手動指定（自動抓不準時用）
//
// ⚠️ 載入順序：UI 層（建議 uiFriend6.js 之後、main.js 之前）
window.HY = window.HY || {};

(function () {
  var STYLE_ID = 'ppc-style';
  var ATTR = 'data-ppc-hidden';

  var CFG = {
    /* 要比對的標籤前綴 */
    MARKS: ['🔥 主控心法', '🤝 隨行護法', '🐉 隨行靈獸'],
    /* 比對方式：'contains' | 'startsWith' */
    MATCH: 'contains',
    /* 處理方式：'hide'（display:none）| 'remove'（真的從 DOM 移除） */
    MODE: 'hide',
    /* 三列共用父容器且只剩它們 → 連父容器一起處理 */
    TIDY_PARENT: true,
    /* 視為「一列」的文字長度上限（避免吞掉整個面板） */
    MAX_ROW_LEN: 200,
    /* 輪詢間隔（MutationObserver 之外的保險） */
    POLL_MS: 1500,
    /* 輪詢總次數上限（之後只靠 MutationObserver） */
    POLL_MAX: 200,
    VERBOSE: false
  };

  /* 保護清單：這些容器內一律不處理（我們自己的 UI） */
  var GUARD = ['#fr3-modal', '#link-modal', '#font-modal', '#friend-modal',
               '#hy-offline-mask', '#hy-offline-modal', '.of-mask', '.lk-mask',
               '.fm-mask', '.fr-mask', '#fr3-panel-holder'];

  var _rows = [];        // 已處理的「列」
  var _parents = [];      // 已處理的父容器
  var _manual = [];       // 手動指定的 selector
  var _observer = null;
  var _pollTimer = null;
  var _pollCount = 0;
  var _lastScan = null;

  function log() {
    if (!CFG.VERBOSE) return;
    try { console.log.apply(console, ['[PartyPanelCleanup]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
  }
  function norm(s) { return String(s == null ? '' : s).replace(/[\s\u00a0\u200b]+/g, ''); }
  function txt(el) { return el ? String(el.textContent || '') : ''; }

  function inGuard(el) {
    for (var i = 0; i < GUARD.length; i++) {
      try { if (el.closest && el.closest(GUARD[i])) return true; } catch (e) { /* 忽略 */ }
    }
    return false;
  }

  function hitMark(t) {
    var s = String(t || '');
    for (var i = 0; i < CFG.MARKS.length; i++) {
      var m = CFG.MARKS[i];
      if (CFG.MATCH === 'startsWith') {
        if (s.replace(/^[\s\u00a0]+/, '').indexOf(m) === 0) return m;
      } else {
        if (s.indexOf(m) !== -1) return m;
      }
    }
    return null;
  }

  /* ── 找最內層節點 ── */
  function findInnermost(mark) {
    if (!document.body) return null;
    var all;
    try { all = document.body.querySelectorAll('*'); } catch (e) { return null; }
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.nodeType !== 1) continue;
      if (el.getAttribute && el.getAttribute(ATTR)) continue;
      if (inGuard(el)) continue;
      var t = txt(el);
      if (t.indexOf(mark) === -1) continue;
      /* 有子元素也含此 mark → 不是最內層 */
      var deeper = false;
      for (var j = 0; j < el.children.length; j++) {
        if (txt(el.children[j]).indexOf(mark) !== -1) { deeper = true; break; }
      }
      if (!deeper) return el;
    }
    return null;
  }

  /* ── 往上收斂成「一列」 ── */
  function rowOf(el) {
    var cur = el;
    var marks = CFG.MARKS;
    for (var i = 0; i < 8 && cur.parentElement; i++) {
      var p = cur.parentElement;
      if (p === document.body || p === document.documentElement) break;
      if (inGuard(p)) break;
      /* 父層若含「其他」mark → 是共同容器，不要吞 */
      var pc = txt(p).replace(/\s+/g, '');
      var foreign = false;
      for (var k = 0; k < marks.length; k++) {
        if (marks[k] === hitMark(txt(cur))) continue;
        if (pc.indexOf(marks[k]) !== -1) { foreign = true; break; }
      }
      if (foreign) break;
      /* 父層文字量太大 → 是面板本體，不要吞 */
      if (norm(txt(p)).length > CFG.MAX_ROW_LEN) break;
      /* 父層只有這個孩子 → 它是單純包裝層，可繼續往上 */
      if (p.children.length === 1) { cur = p; continue; }
      /* 父層有多個孩子但文字仍短 → 這一層就是「列」 */
      cur = p;
      break;
    }
    return cur;
  }

  /* ── 判斷父容器是否「只裝這三列」 ── */
  function stripRows(s) {
    var t = String(s || '');
    for (var i = 0; i < _rows.length; i++) {
      var rt = txt(_rows[i]);
      if (rt) t = t.split(rt).join('');
    }
    return norm(t);
  }

  function findPureParent() {
    if (!_rows.length || !CFG.TIDY_PARENT) return null;
    /* 取共同祖先 */
    var a = _rows[0];
    var guardLoop = 0;
    while (a && guardLoop++ < 12) {
      var ok = true;
      for (var i = 0; i < _rows.length; i++) {
        if (!a.contains(_rows[i])) { ok = false; break; }
      }
      if (ok) break;
      a = a.parentElement;
    }
    if (!a || a === document.body || a === document.documentElement) return null;
    if (inGuard(a)) return null;
    /* 去掉三列的文字後，若只剩標點/空白 → 是純容器 */
    if (norm(a.textContent).length > CFG.MAX_ROW_LEN * 3) return null;
    var residual = stripRows(a.textContent);
    if (residual.length > 0) return null;
    return a;
  }

  /* ── 套用 ── */
  function apply(el, tag) {
    if (!el) return;
    if (el.getAttribute && el.getAttribute(ATTR)) return;
    try { el.setAttribute(ATTR, tag || '1'); } catch (e) { /* 忽略 */ }
    if (CFG.MODE === 'remove') {
      try {
        if (el.parentNode) el.parentNode.removeChild(el);
      } catch (e2) { /* 忽略 */ }
    } else {
      try { el.style.setProperty('display', 'none', 'important'); } catch (e3) { el.style.display = 'none'; }
    }
  }

  function undo(el) {
    if (!el) return;
    try { el.removeAttribute(ATTR); } catch (e) { /* 忽略 */ }
    try { el.style.removeProperty('display'); } catch (e2) { el.style.display = ''; }
  }

  /* ── 主處理 ── */
  function run() {
    if (!document.body) return { found: 0, rows: 0, parent: false };

    /* 1) 手動指定優先 */
    _manual.forEach(function (sel) {
      var els;
      try { els = document.querySelectorAll(sel); } catch (e) { return; }
      for (var i = 0; i < els.length; i++) {
        if (_rows.indexOf(els[i]) === -1) _rows.push(els[i]);
        apply(els[i], 'manual');
      }
    });

    /* 2) 自動定位 */
    var found = 0;
    for (var i = 0; i < CFG.MARKS.length; i++) {
      var mark = CFG.MARKS[i];
      var inn = findInnermost(mark);
      if (!inn) continue;
      var row = rowOf(inn);
      if (!row) continue;
      if (_rows.indexOf(row) === -1) _rows.push(row);
      apply(row, 'row');
      found += 1;
    }

    /* 3) 純容器 */
    var par = findPureParent();
    if (par && _parents.indexOf(par) === -1) {
      _parents.push(par);
      apply(par, 'parent');
    }

    _lastScan = { found: found, rows: _rows.length, parent: !!par, at: Date.now() };
    if (found > 0) log('已處理 ' + found + ' 列' + (par ? '（含父容器）' : ''));
    return _lastScan;
  }

  /* ── 排程（合併連續觸發） ── */
  var _pending = false;
  function schedule() {
    if (_pending) return;
    _pending = true;
    setTimeout(function () {
      _pending = false;
      try { run(); } catch (e) { console.error('[PartyPanelCleanup] 處理失敗：', e); }
    }, 60);
  }

  /* ── 監看 ── */
  function startObserver() {
    if (_observer || !window.MutationObserver || !document.body) return;
    try {
      _observer = new MutationObserver(function (muts) {
        /* 只要有任何節點被加入就重掃 */
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].addedNodes && muts[i].addedNodes.length) { schedule(); return; }
        }
      });
      _observer.observe(document.body, { childList: true, subtree: true });
      log('MutationObserver 已啟動');
    } catch (e) { _observer = null; }
  }

  function startPoll() {
    if (_pollTimer) return;
    _pollTimer = setInterval(function () {
      _pollCount += 1;
      run();
      if (_pollCount >= CFG.POLL_MAX) { clearInterval(_pollTimer); _pollTimer = null; }
    }, CFG.POLL_MS);
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var host = document.head || document.documentElement;
    if (!host) return;
    var css = '[' + ATTR + '] { display: none !important; }';
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.appendChild(document.createTextNode(css));
    host.appendChild(st);
  }

  /* ══════════════════════════════════════════════════════
     對外 API
     ══════════════════════════════════════════════════════ */
  window.HY.PartyPanelCleanup = {
    version: '1.0',
    ready: false,
    config: function (o) { if (o) Object.keys(o).forEach(function (k) { CFG[k] = o[k]; }); return CFG; },
    marks: function (a) {
      if (Array.isArray(a) && a.length) { CFG.MARKS = a.slice(); this.restore(); this.hide(); }
      return CFG.MARKS;
    },
    manual: function (sel) {
      if (sel) { _manual.push(String(sel)); this.hide(); }
      return _manual.slice();
    },
    scan: function () {
      var out = [];
      for (var i = 0; i < CFG.MARKS.length; i++) {
        var inn = findInnermost(CFG.MARKS[i]);
        out.push({
          mark: CFG.MARKS[i],
          found: !!inn,
          innermost: inn ? (inn.tagName + (inn.id ? '#' + inn.id : '') +
            (inn.className && typeof inn.className === 'string' ? '.' + inn.className.trim().split(/\s+/).join('.') : '')) : null,
          row: inn ? (function () {
            var r = rowOf(inn);
            return r ? (r.tagName + (r.id ? '#' + r.id : '') +
              (r.className && typeof r.className === 'string' ? '.' + r.className.trim().split(/\s+/).join('.') : '')) : null;
          })() : null,
          text: inn ? txt(inn).slice(0, 60) : null
        });
      }
      var parent = findPureParent();
      var r = {
        marks: out,
        hiddenRows: _rows.length,
        hiddenParents: _parents.length,
        pureParent: parent ? (parent.tagName + (parent.id ? '#' + parent.id : '')) : null,
        lastScan: _lastScan
      };
      console.log('%c=== PartyPanelCleanup 掃描 ===', 'color:#f472b6;font-weight:bold');
      console.table(out);
      console.log('目前在 DOM 中的命中（未隱藏前）：', out.filter(function (x) { return x.found; }));
      console.log('結果：', r);
      return r;
    },
    hide: function () { _rows = []; _parents = []; var r = run(); return r; },
    restore: function () {
      /* 還原所有已標記節點 */
      try {
        document.querySelectorAll('[' + ATTR + ']').forEach(function (el) { undo(el); });
      } catch (e) { /* 忽略 */ }
      _rows = []; _parents = [];
      var r = run();   // 立刻重掃（若還沒移除就會再次隱藏）
      return { restored: true, rescan: r };
    },
    status: function () {
      return {
        marks: CFG.MARKS.slice(),
        mode: CFG.MODE,
        hiddenRows: _rows.length,
        hiddenParents: _parents.length,
        manual: _manual.slice(),
        observer: !!_observer,
        poll: !!_pollTimer,
        lastScan: _lastScan
      };
    },
    _run: run,
    _scanTargets: function () { return { rows: _rows.slice(), parents: _parents.slice() }; }
  };

  /* ══════════════════════════════════════════════════════
     啟動
     ══════════════════════════════════════════════════════ */
  function boot() {
    injectStyle();
    try { run(); } catch (e) { console.error('[PartyPanelCleanup] 初次處理失敗：', e); }
    startObserver();
    startPoll();
    window.HY.PartyPanelCleanup.ready = true;
    console.log('[PartyPanelCleanup] ✓ 已啟動（移除「主控心法／隨行護法／隨行靈獸」三列）');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 400);
  else window.addEventListener('load', function () { setTimeout(boot, 400); });

  /* 保險：較晚才建立的面板 */
  setTimeout(function () { try { run(); } catch (e) { /* 忽略 */ } }, 1500);
  setTimeout(function () { try { run(); } catch (e) { /* 忽略 */ } }, 3500);
})();