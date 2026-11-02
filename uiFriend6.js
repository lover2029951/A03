// js/uiFriend6.js (v3)
// ⭐ 🔗 系統連動 —— 獨立主分頁
//    位置：插在「作弊」與「儲存進度」之間（優先插在「儲存進度」之前）
//
// Console：
//   HY.UIFriend6.open() / close() / install() / move()
//   HY.UIFriend6.where() / anchors()
//
// ⚠️ 載入順序：uiFriend5.js 之後、main.js 之前
window.HY = window.HY || {};

(function () {
  var TAB_ID = 'link-main-tab';
  var MASK_ID = 'link-modal-mask';
  var MODAL_ID = 'link-modal';
  var STYLE_ID = 'link-panel-style';

  var L = window.HY.Link;
  var C = window.HY.LinkContent;

  window.HY.UIFriend6 = {
    version: '3.0',
    ready: false,
    tabId: TAB_ID,
    modalId: MODAL_ID,
    install: function () { return installTab(); },
    move: function () { return relocate(true); },
    open: function () { return openModal(); },
    close: function () { return closeModal(); },
    toggle: function () { return _open ? closeModal() : openModal(); },
    audit: function () { return L ? L.audit() : []; },
    summary: function () { return L ? L.summary() : {}; },
    where: function () { return whereIsTab(); },
    anchors: function () { return listAnchors(); },
    setTabSelector: function (s) { tabContainerSel = s; return s; }
  };

  var AFTER_KEYS  = ['作弊', '金手指', '除錯', '開發', 'debug', 'cheat'];
  var BEFORE_KEYS = ['儲存進度', '保存進度', '儲存', '存檔', '保存', '進度', 'save'];

  var CONTAINER_SELS = [
    '#main-tabs', '.main-tabs', '#tabs', '.tabs', '#tab-bar', '.tab-bar',
    '.top-tabs', '.nav-tabs', '.app-tabs', '.ui-tabs', '.tabbar',
    '.main-nav', '.nav', '.toolbar', '.topbar', 'header', '.header', '#app-header'
  ];

  var tabContainerSel = null;
  var _open = false;
  var els = null;
  var _lastLog = '';

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function esc(s) { return String(s == null ? '' : s); }
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ''); }
  function T() { return window.HY.game && window.HY.game.townSys; }
  function ago(t) {
    if (!t) return '';
    var d = new Date(t);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var host = document.head || document.documentElement;
    if (!host) return;
    var css = `
#${TAB_ID} {
  position: relative !important; overflow: hidden !important;
  font-weight: 800 !important; letter-spacing: .5px !important;
  color: #bae6fd !important; border: 2px solid #38bdf8 !important; border-radius: 7px !important;
  background: linear-gradient(180deg, rgba(56,189,248,.30), rgba(14,116,144,.10)) !important;
  text-shadow: 0 0 6px rgba(186,230,253,.95), 0 0 13px rgba(56,189,248,.60) !important;
  animation: none !important;
  box-shadow: 0 0 9px rgba(56,189,248,.40), inset 0 0 7px rgba(56,189,248,.14) !important;
  transition: transform .15s ease, filter .15s ease !important; z-index: 20 !important;
}
#${TAB_ID}:hover { transform: translateY(-2px) scale(1.05) !important; filter: brightness(1.55) !important; }
#${TAB_ID}.link-open {
  color:#fff !important; border-color:#fff !important; background: rgba(56,189,248,.52) !important;
  box-shadow: 0 0 16px rgba(56,189,248,.85), inset 0 0 11px rgba(255,255,255,.28) !important;
}
.lk-mask { position:fixed; inset:0; z-index:9700; background:rgba(2,6,12,.74);
  -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px);
  display:flex; align-items:center; justify-content:center; padding:16px; }
.lk-mask.hidden { display:none !important; }
.lk-modal { width:min(94vw,1180px); height:min(90vh,940px); display:flex; flex-direction:column;
  background:#0f141c; border:2px solid #38bdf8; border-radius:10px;
  box-shadow:0 24px 70px rgba(0,0,0,.78), inset 0 0 0 1px rgba(56,189,248,.25);
  overflow:hidden; animation:lkIn .18s ease-out; }
@keyframes lkIn { from { opacity:0; transform:scale(.96) translateY(10px);} to { opacity:1; transform:none; } }
.lk-modal.full { width:97vw !important; height:95vh !important; }
.lk-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:11px 15px;
  background:linear-gradient(90deg,#0c1a24,#0e2430); border-bottom:1px solid #38bdf8; }
.lk-title { font-size:1.08rem; font-weight:bold; color:#7dd3fc; }
.lk-sub { font-size:.74rem; color:#94a3b8; }
.lk-headbtns { margin-left:auto; display:flex; gap:8px; }
.lk-body { flex:1 1 auto; overflow-y:auto; padding:13px 15px; }
.lk-foot { padding:8px 15px; font-size:.73rem; color:#94a3b8; background:#131b26;
  border-top:1px solid #2e3b4e; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
.lk-btn { background:#2b394a; color:#7dd3fc; border:1px solid #38bdf8;
  border-radius:4px; padding:3px 11px; font-size:.76rem; cursor:pointer; }
.lk-btn:hover { background:#3a4a5e; }
.lk-btn.r { border-color:#ef4444; color:#fca5a5; }
.lk-btn.g { border-color:#34d399; color:#6ee7b7; }
.lk-btn.y { border-color:#fbbf24; color:#fcd34d; }
.lk-btn.v { border-color:#a78bfa; color:#c4b5fd; }
.lk-btn:disabled { opacity:.35; cursor:not-allowed; }
.lk-fold { background:#131b26; border:1px solid #2e3b4e; border-radius:6px; margin-bottom:8px; overflow:hidden; }
.lk-fold > summary { cursor:pointer; list-style:none; padding:9px 11px; font-size:.85rem; font-weight:bold;
  color:#7dd3fc; background:linear-gradient(90deg,#131b26,#16222e); display:flex; align-items:center; gap:8px; user-select:none; }
.lk-fold > summary::-webkit-details-marker { display:none; }
.lk-fold > summary::before { content:'▸'; color:#64748b; font-size:.9em; transition:transform .15s; }
.lk-fold[open] > summary::before { transform:rotate(90deg); }
.lk-fold .lk-fbody { padding:9px 11px; border-top:1px solid #2e3b4e; }
.lk-count { margin-left:auto; font-size:.72rem; color:#94a3b8; font-weight:normal; }
.lk-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:10px; }
.lk-card { background:#131b26; border:1px solid #2e3b4e; border-radius:6px; padding:9px 10px;
  display:flex; flex-direction:column; gap:6px; }
.lk-card:hover { border-color:#38bdf8; }
.lk-card.ok { border-color:#10b981; }
.lk-head2 { display:flex; justify-content:space-between; align-items:baseline; gap:6px; }
.lk-name { font-size:.88rem; font-weight:bold; }
.lk-meta { font-size:.72rem; color:#94a3b8; white-space:nowrap; }
.lk-chips { display:flex; gap:5px; flex-wrap:wrap; align-items:center; }
.lk-chip { font-size:.68rem; padding:1px 7px; border-radius:9px; border:1px solid #2e3b4e; color:#94a3b8; background:#0f1720; }
.lk-chip.g { border-color:#10b981; color:#6ee7b7; }
.lk-chip.b { border-color:#38bdf8; color:#7dd3fc; }
.lk-chip.y { border-color:#fbbf24; color:#fcd34d; }
.lk-chip.p { border-color:#f472b6; color:#f9a8d4; }
.lk-chip.v { border-color:#a78bfa; color:#c4b5fd; }
.lk-chip.r { border-color:#ef4444; color:#fca5a5; }
.lk-src { font-size:.66rem; padding:1px 7px; border-radius:9px; border:1px solid #2e3b4e; color:#94a3b8; background:#0f1720; white-space:nowrap; }
.lk-src.native { border-color:#10b981; color:#6ee7b7; }
.lk-src.external { border-color:#38bdf8; color:#7dd3fc; }
.lk-src.hybrid { border-color:#a78bfa; color:#c4b5fd; }
.lk-src.off { border-color:#475569; color:#64748b; }
.lk-dim { font-size:.71rem; color:#94a3b8; line-height:1.5; }
.lk-rows { display:flex; gap:13px; flex-wrap:wrap; font-size:.79rem; margin-bottom:3px; }
.lk-rows b { color:#e2e8f0; }
.lk-row { display:flex; justify-content:space-between; align-items:center; gap:8px;
  background:#121822; border:1px solid #2e3b4e; border-radius:4px; padding:5px 8px;
  font-size:.77rem; margin-bottom:4px; }
.lk-row:hover { border-color:#c89d54; }
.lk-block { background:#131b26; border:1px solid #2e3b4e; border-radius:6px; padding:9px 11px; margin-bottom:8px; }
.lk-btitle { font-size:.85rem; font-weight:bold; color:#7dd3fc; margin-bottom:6px; }
.lk-kv { display:flex; justify-content:space-between; gap:8px; padding:2px 0; font-size:.76rem; border-bottom:1px solid #1a2330; }
.lk-kv:last-child { border-bottom:none; }
.lk-kv span:first-child { color:#94a3b8; }
.lk-kv span:last-child { color:#e2e8f0; font-weight:bold; }
.lk-cols2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
@media (max-width:1000px){ .lk-cols2 { grid-template-columns:1fr; } }
.lk-flow { display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
.lk-node { font-size:.7rem; padding:2px 8px; border-radius:9px; border:1px solid #2e3b4e; background:#0f1720; color:#94a3b8; }
.lk-node.hot { border-color:#38bdf8; color:#7dd3fc; }
.lk-arrow { color:#475569; font-size:.8rem; }
.lk-logs { display:flex; flex-direction:column; gap:3px; max-height:280px; overflow-y:auto; }
.lk-log { font-size:.75rem; line-height:1.5; border-left:2px solid #2e3b4e; padding-left:7px; color:#cbd5e1; margin-bottom:3px; }
.lk-log.ok { border-color:#10b981; }
.lk-log.no { border-color:#ef4444; }
.lk-empty { font-size:.79rem; color:#94a3b8; line-height:1.6; padding:8px 0; }
`;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.appendChild(document.createTextNode(css));
    host.appendChild(st);
  }

  /* ── 標籤定位 ── */
  function containers() {
    var out = [];
    if (tabContainerSel) {
      try { var one = document.querySelector(tabContainerSel); if (one) out.push(one); } catch (e) { /* 忽略 */ }
    }
    CONTAINER_SELS.forEach(function (s) {
      try {
        var el = document.querySelector(s);
        if (el && out.indexOf(el) === -1) out.push(el);
      } catch (e) { /* 忽略 */ }
    });
    if (document.body && out.indexOf(document.body) === -1) out.push(document.body);
    return out;
  }

  function scoreBtn(el, keys) {
    if (!el || el.nodeType !== 1) return null;
    if (el.id === TAB_ID) return null;
    var t = norm(el.textContent);
    if (!t || t.length > 16) return null;
    if (el.children && el.children.length > 3) return null;
    var best = -1;
    for (var i = 0; i < keys.length; i++) {
      if (t.indexOf(keys[i]) !== -1) { best = i; break; }
    }
    if (best < 0) return null;
    var tag = (el.tagName || '').toLowerCase();
    var s = best * 100 + t.length;
    if (tag === 'button' || tag === 'a') s -= 30;
    if (el.className && /tab|nav|menu|btn/i.test(String(el.className))) s -= 15;
    return { el: el, score: s, text: t, key: keys[best] };
  }

  function listAnchors() {
    var out = [];
    containers().forEach(function (c) {
      var all;
      try { all = c.querySelectorAll('button, a, li, .tab, .tab-btn, .nav-item, [role="tab"], [data-tab]'); }
      catch (e) { return; }
      Array.prototype.forEach.call(all, function (el) {
        var a = scoreBtn(el, AFTER_KEYS);  if (a) { a.mode = 'after'; out.push(a); }
        var b = scoreBtn(el, BEFORE_KEYS); if (b) { b.mode = 'before'; out.push(b); }
      });
    });
    out.sort(function (a, b) { return a.score - b.score; });
    return out;
  }

  function makeTabBtn(tpl) {
    var btn;
    if (tpl && tpl.cloneNode) {
      btn = tpl.cloneNode(true);
      ['data-tab', 'data-tabid', 'data-target', 'data-view', 'data-page', 'href'].forEach(function (a) { btn.removeAttribute(a); });
      try {
        btn.querySelectorAll('[data-tab],[data-tabid],[data-target],[data-view],[data-page]').forEach(function (n) {
          ['data-tab', 'data-tabid', 'data-target', 'data-view', 'data-page'].forEach(function (a) { n.removeAttribute(a); });
        });
      } catch (e) { /* 忽略 */ }
      ['active', 'on', 'selected', 'current', 'is-active', 'tab-active'].forEach(function (c) { btn.classList.remove(c); });
    } else {
      btn = document.createElement('button');
      btn.className = 'tab-btn';
    }
    btn.id = TAB_ID;
    btn.textContent = '🔗 系統連動';
    btn.title = '全系統連動總覽（原版玩法對照／系統註冊表／效果聚合／交叉關聯網）';
    btn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation(); toggleModal();
    }, true);
    return btn;
  }

  function bindSiblingClose(parent) {
    if (!parent || parent.__linkCloseBound) return;
    parent.__linkCloseBound = true;
    parent.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('#' + TAB_ID)) return;
      if (_open) closeModal(true);
    }, false);
  }

  function installTab() {
    injectStyles();
    if (!document.body) return false;
    if (document.getElementById(TAB_ID)) return true;

    var found = listAnchors();
    var target = null, mode = 'before';
    for (var i = 0; i < found.length; i++) {
      if (found[i].mode === 'before') { target = found[i]; mode = 'before'; break; }
    }
    if (!target) {
      for (var j = 0; j < found.length; j++) {
        if (found[j].mode === 'after') { target = found[j]; mode = 'after'; break; }
      }
    }
    if (!target || !target.el || !target.el.parentNode) return false;

    var anchor = target.el, parent = anchor.parentNode;
    var btn = makeTabBtn(anchor);
    try {
      if (mode === 'before') parent.insertBefore(btn, anchor);
      else parent.insertBefore(btn, anchor.nextSibling);
    } catch (e) { return false; }

    bindSiblingClose(parent);
    var key = mode + '|' + target.text;
    if (_lastLog !== key) {
      _lastLog = key;
      console.log('[uiFriend6] ✓ 「🔗 系統連動」標籤已插入到「' + target.text + '」' +
        (mode === 'before' ? '之前' : '之後') + '｜匹配「' + target.key + '」');
    }
    return true;
  }

  function relocate(force) {
    var btn = document.getElementById(TAB_ID);
    if (!btn) return installTab();
    var found = listAnchors();
    if (!found.length) return false;
    var target = null, mode = 'before';
    for (var i = 0; i < found.length; i++) {
      if (found[i].mode === 'before') { target = found[i]; mode = 'before'; break; }
    }
    if (!target) { for (var j = 0; j < found.length; j++) if (found[j].mode === 'after') { target = found[j]; mode = 'after'; break; } }
    if (!target) return false;
    var anchor = target.el, parent = anchor.parentNode;
    var okPos = mode === 'before'
      ? (btn.parentNode === parent && btn.nextElementSibling === anchor)
      : (btn.parentNode === parent && btn.previousElementSibling === anchor);
    if (okPos && !force) return true;
    try {
      if (mode === 'before') parent.insertBefore(btn, anchor);
      else parent.insertBefore(btn, anchor.nextSibling);
      return true;
    } catch (e) { return false; }
  }

  function whereIsTab() {
    var btn = document.getElementById(TAB_ID);
    if (!btn) return { exists: false };
    var prev = btn.previousElementSibling, next = btn.nextElementSibling;
    return {
      exists: true,
      parent: btn.parentNode ? (btn.parentNode.id ? '#' + btn.parentNode.id : btn.parentNode.className || btn.parentNode.tagName) : '?',
      prevText: prev ? norm(prev.textContent).slice(0, 14) : '(無)',
      nextText: next ? norm(next.textContent).slice(0, 14) : '(無)',
      siblingCount: btn.parentNode ? btn.parentNode.children.length : 0
    };
  }

  /* ── 彈窗 ── */
  function buildModal() {
    if (els) return els;
    if (!document.body) return null;

    var mask = document.createElement('div');
    mask.id = MASK_ID;
    mask.className = 'lk-mask hidden';
    var modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'lk-modal';

    var head = document.createElement('div'); head.className = 'lk-head';
    var title = document.createElement('span'); title.className = 'lk-title'; title.textContent = '🔗 系統連動';
    var sub = document.createElement('span'); sub.className = 'lk-sub'; sub.textContent = '全系統互相咬合 · 效果聚合 · 交叉關聯';
    var btns = document.createElement('span'); btns.className = 'lk-headbtns';
    var bR = document.createElement('button'); bR.className = 'lk-btn'; bR.textContent = '🔄 重新整理';
    var bF = document.createElement('button'); bF.className = 'lk-btn'; bF.textContent = '⛶ 全螢幕';
    var bC = document.createElement('button'); bC.className = 'lk-btn r'; bC.textContent = '✕ 關閉';
    btns.appendChild(bR); btns.appendChild(bF); btns.appendChild(bC);
    head.appendChild(title); head.appendChild(sub); head.appendChild(btns);

    var body = document.createElement('div'); body.className = 'lk-body';
    var foot = document.createElement('div'); foot.className = 'lk-foot';
    var hint = document.createElement('span'); hint.className = 'lk-dim';
    hint.textContent = '任何新模組只要在檔尾加 window.HY.XXX.HY_LINK = {...}，就會自動出現在此並與既有系統關聯。';
    foot.appendChild(hint);

    modal.appendChild(head); modal.appendChild(body); modal.appendChild(foot);
    mask.appendChild(modal);
    document.body.appendChild(mask);

    els = { mask: mask, modal: modal, body: body, btnR: bR, btnF: bF, btnC: bC };
    bC.addEventListener('click', function () { closeModal(); });
    bF.addEventListener('click', function () { modal.classList.toggle('full'); });
    bR.addEventListener('click', function () { render(); });
    mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && _open) closeModal(); });
    return els;
  }

  function openModal() {
    if (!L) { alert('連動匯流排（linkBus.js）尚未載入'); return false; }
    var e = buildModal();
    if (!e) return false;
    e.mask.classList.remove('hidden');
    _open = true;
    render();
    var btn = document.getElementById(TAB_ID);
    if (btn) btn.classList.add('link-open');
    return true;
  }
  function closeModal(silent) {
    if (!els) return false;
    els.mask.classList.add('hidden');
    els.modal.classList.remove('full');
    _open = false;
    var btn = document.getElementById(TAB_ID);
    if (btn) btn.classList.remove('link-open');
    void silent;
    return true;
  }
  function toggleModal() { return _open ? closeModal() : openModal(); }

  function render() {
    if (!els || !L) return;
    var html = '';
    try {
      html += summaryHtml() + bridgeHtml() + systemsHtml() + effectsHtml()
            + synergyHtml() + opsHtml() + logHtml();
    } catch (e) {
      html += '<div class="lk-empty">渲染失敗：' + esc(e.message) + '</div>';
      console.error('[uiFriend6] 渲染失敗：', e);
    }
    els.body.innerHTML = html;
    bind();
  }

  function summaryHtml() {
    var s = L.summary();
    var b = window.HY.SystemBridge ? window.HY.SystemBridge.report() : [];
    var hit = b.filter(function (x) { return x.found; }).length;
    return '<div class="lk-block"><div class="lk-btitle">🔗 全系統連動（總覽）</div>' +
      '<div class="lk-rows"><span>已註冊系統 <b>' + s.total + '</b></span>' +
      '<span>自建正本 <b>' + s.native + '</b></span>' +
      '<span>已接軌 <b>' + s.external + '</b></span>' +
      '<span>混合 <b>' + s.hybrid + '</b></span></div>' +
      '<div class="lk-rows"><span>原版系統橋接 <b>' + hit + '/' + b.length + '</b></span>' +
      '<span>效果註冊 <b>' + s.effects + '</b></span>' +
      '<span>事件鉤子 <b>' + s.hooks + '</b></span></div>' +
      '<div class="lk-dim" style="margin-top:6px">' +
      '<b>自建正本</b>：本作自帶完整實作，不依賴外部。<br>' +
      '<b>已接軌</b>：偵測到原版系統實例，取其真實數值。<br>' +
      '<b>混合</b>：自建為主、外部為輔。<br>' +
      '所有加成統一經 <code>HY.Link.collect()</code> 聚合 → 數值必定一致。</div>' +
      '<div class="lk-chips" style="margin-top:8px">' +
      '<button class="lk-btn" data-lk="discover">🔍 重新探索</button>' +
      '<button class="lk-btn g" data-lk="relink">↻ 重接原版系統</button>' +
      '<button class="lk-btn y" data-lk="dump">📋 匯出稽核</button>' +
      '<button class="lk-btn v" data-lk="testHooks">⚡ 測試鉤子</button></div></div>';
  }

  function bridgeHtml() {
    var b = window.HY.SystemBridge ? window.HY.SystemBridge.report() : [];
    if (!b.length) return '';
    var found = b.filter(function (x) { return x.found; });
    var html = '<details class="lk-fold" open><summary>🧭 原版玩法對照' +
      '<span class="lk-count">已接軌 ' + found.length + '／自建 ' + (b.length - found.length) + '</span></summary><div class="lk-fbody">' +
      '<div class="lk-dim" style="margin-bottom:6px">原版遊戲系統的接軌狀態。已接軌者取其真實數值；未偵測者以自建正本運作。</div><div class="lk-grid">';
    b.forEach(function (x) {
      var src = (L.sysInfo(x.id) || {}).source || 'native';
      html += '<div class="lk-card' + (x.found ? ' ok' : '') + '">' +
        '<div class="lk-head2"><span class="lk-name">' + x.icon + ' ' + esc(x.name) + '</span>' +
        '<span class="lk-src ' + src + '">' + (x.found ? '已接軌' : '自建正本') + '</span></div>' +
        '<div class="lk-chips"><span class="lk-chip">效果 ' + x.effects + '</span>' +
        '<span class="lk-chip">鉤子 ' + x.hooks + '</span>' +
        (x.path ? '<span class="lk-chip b">' + esc(x.path) + '</span>' : '') + '</div>';
      var mk = x.meta && Object.keys(x.meta).length ? x.meta : null;
      if (mk) {
        var parts = [];
        Object.keys(mk).forEach(function (k) { if (mk[k]) parts.push(esc(k) + ': ' + fmt(mk[k])); });
        if (parts.length) html += '<div class="lk-dim">' + parts.join('　') + '</div>';
      }
      html += '</div>';
    });
    return html + '</div></div></details>';
  }

  function systemsHtml() {
    var A = L.audit();
    var html = '<details class="lk-fold"><summary>🧩 系統註冊表<span class="lk-count">' + A.length + ' 項</span></summary><div class="lk-fbody">' +
      '<div class="lk-dim" style="margin-bottom:6px">' +
      '<span class="lk-src native">自建</span> <span class="lk-src external">已接軌</span> ' +
      '<span class="lk-src hybrid">混合</span> <span class="lk-src off">已停用</span></div><div class="lk-grid">';
    A.forEach(function (x) {
      var src = x.disabled ? 'off' : x.source;
      var label = x.disabled ? '已停用' : (x.source === 'external' ? '已接軌' : (x.source === 'hybrid' ? '混合' : '自建'));
      html += '<div class="lk-card' + (x.disabled ? '' : ' ok') + '">' +
        '<div class="lk-head2"><span class="lk-name">' + x.icon + ' ' + esc(x.name) + '</span>' +
        '<span class="lk-src ' + src + '">' + label + '</span></div>' +
        '<div class="lk-dim">' + esc(x.desc) + '</div>' +
        '<div class="lk-chips"><span class="lk-chip">效果 ' + x.effectCount + '</span>' +
        (x.hookNames.length ? '<span class="lk-chip">' + x.hookNames.join('·') + '</span>' : '') +
        (x.boundPath ? '<span class="lk-chip b">' + esc(x.boundPath) + '</span>' : '') + '</div>' +
        '<div class="lk-chips">' +
        '<button class="lk-btn' + (x.disabled ? ' g' : ' y') + '" data-lk="toggle" data-lkv="' + x.id + '">' +
        (x.disabled ? '▶️ 啟用' : '⏸️ 停用') + '</button>' +
        '<button class="lk-btn" data-lk="bind" data-lkv="' + x.id + '">🔗 綁定</button></div></div>';
    });
    return html + '</div></div></details>';
  }

  function effectsHtml() {
    var t = T();
    var list = t && t.friendAll ? t.friendAll() : [];
    if (!list.length) {
      return '<details class="lk-fold"><summary>✨ 效果聚合<span class="lk-count">尚無好友</span></summary>' +
        '<div class="lk-fbody"><div class="lk-dim">先結交好友，這裡會顯示他的所有加成來源。</div></div></details>';
    }
    var f = null;
    for (var i = 0; i < list.length; i++) if (list[i].following) { f = list[i]; break; }
    if (!f) { f = list[0]; list.forEach(function (x) { if (num(x.lv, 1) > num(f.lv, 1)) f = x; }); }
    var ctx = window.HY.LinkCtxOf ? window.HY.LinkCtxOf(f) : {};
    var res = L.collect('friend', ctx);
    var keys = Object.keys(res).filter(function (k) { return k !== 'sources'; });

    var html = '<details class="lk-fold" open><summary>✨ 效果聚合實例' +
      '<span class="lk-count">' + f.icon + ' ' + esc(f.name) + '｜來源 ' + (res.sources || []).length + '</span></summary>' +
      '<div class="lk-fbody"><div class="lk-dim" style="margin-bottom:6px">以「' + esc(f.name) +
      '」為例，所有系統經 <code>collect()</code> 聚合後的實際加成。</div><div class="lk-cols2"><div>';
    keys.forEach(function (k) {
      var v = res[k];
      html += '<div class="lk-kv"><span>' + esc(k) + '</span><span>' +
        (/Mul$/.test(k) ? pct(v) : (typeof v === 'number' ? v.toFixed(3) : esc(v))) + '</span></div>';
    });
    if (!keys.length) html += '<div class="lk-dim">（無聚合值）</div>';
    html += '</div><div>';
    (res.sources || []).forEach(function (s) {
      var s2 = L.sysInfo(s.sys) || {};
      html += '<div class="lk-row"><span>' + (s2.icon || '🧩') + ' <b>' + esc(s2.name || s.sys) + '</b>' +
        '　<span class="lk-dim">' + esc(s.label) + '</span></span>' +
        '<span>' + esc(s.target) + ' = <b>' +
        (s.mul !== null && s.mul !== undefined ? pct(s.mul) : num(s.value, 0).toFixed(3)) + '</b></span></div>';
    });
    if (!(res.sources || []).length) html += '<div class="lk-dim">（無效果觸發 — 好友尚未學陣法／養寵物／入公會…）</div>';
    return html + '</div></div><div class="lk-chips" style="margin-top:8px">' +
      '<button class="lk-btn" data-lk="collectAll">📊 全好友聚合（Console）</button></div></div></details>';
  }

  function synergyHtml() {
    var M = (C && C.SYNERGY_MAP) || {};
    var ids = Object.keys(M);
    var all = L.systems().map(function (s) { return s.id; });
    var notMapped = all.filter(function (id) { return ids.indexOf(id) === -1; });
    var html = '<details class="lk-fold"><summary>🕸️ 系統交叉關聯網<span class="lk-count">' + ids.length + ' 節點</span></summary><div class="lk-fbody">' +
      '<div class="lk-dim" style="margin-bottom:6px">每個系統與其他系統的咬合關係。未來新系統只要註冊進匯流排，就會自動出現在此網中。</div><div class="lk-grid">';
    ids.forEach(function (id) {
      var s = L.sysInfo(id) || { name: id, icon: '🧩' };
      var links = M[id] || [];
      html += '<div class="lk-card"><div class="lk-head2">' +
        '<span class="lk-name">' + (s.icon || '🧩') + ' ' + esc(s.name || id) + '</span>' +
        '<span class="lk-meta">' + links.length + ' 條</span></div><div class="lk-flow">';
      links.forEach(function (x, i) {
        var s2 = L.sysInfo(x) || { name: x, icon: '🧩' };
        if (i > 0) html += '<span class="lk-arrow">·</span>';
        html += '<span class="lk-node hot">' + (s2.icon || '') + esc(s2.name || x) + '</span>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    if (notMapped.length) {
      html += '<div class="lk-dim" style="margin-top:8px">尚未納入關聯網：' +
        notMapped.map(function (x) { var s = L.sysInfo(x) || {}; return '<span class="lk-node">' + (s.icon || '') + esc(s.name || x) + '</span>'; }).join(' ') +
        '</div><div class="lk-chips" style="margin-top:6px"><button class="lk-btn" data-lk="autoSyn">🔗 自動補關聯</button></div>';
    }
    return html + '</div></details>';
  }

  function opsHtml() {
    var t = T();
    var rep = null;
    try { rep = t && t.fr6Report ? t.fr6Report() : null; } catch (e) { rep = null; }
    if (!rep) {
      return '<details class="lk-fold"><summary>⚙️ 系統操作<span class="lk-count">未載入</span></summary>' +
        '<div class="lk-fbody"><div class="lk-dim">friendLinkSystem.js 未載入。</div></div></details>';
    }
    function fold(id, title, count, body) {
      return '<details class="lk-fold" id="lk-' + id + '"><summary>' + title +
        '<span class="lk-count">' + count + '</span></summary><div class="lk-fbody">' + body + '</div></details>';
    }
    return fold('formation', '☯️ 陣法', rep.list.filter(function (x) { return x.formation; }).length + ' 人已學', formationHtml(rep)) +
      fold('spirit', '💎 靈根', rep.spiritRoots.length + ' 種', spiritHtml(rep)) +
      fold('element', '🌀 五行', rep.elements.length + ' 行', elementHtml(rep)) +
      fold('pet', '🐾 寵物', rep.pets.length + ' 種｜' + rep.list.filter(function (x) { return x.pet; }).length + ' 人持有', petHtml(rep)) +
      fold('companion', '👥 同伴', rep.companionRoles.length + ' 職責｜' + rep.list.filter(function (x) { return x.companionRole; }).length + ' 人任職', companionHtml(rep)) +
      fold('guild', '🏛️ 公會賓客', rep.guild.guests.length + '/' + rep.guild.max, guildHtml(rep)) +
      fold('market', '🕶️ 黑市', rep.market.length + ' 掛售', marketHtml(rep)) +
      fold('craft', '⚒️ 工藝代工', rep.crafts.length + '/' + rep.craftMax, craftHtml(rep)) +
      fold('salvage', '🌊 打撈遠征', rep.salvages.length ? rep.salvages.length + ' 隊作業中' : fmt(rep.stats.salvages) + ' 次', salvageHtml(rep)) +
      fold('tt', '⏳ 時光旅行', rep.tt ? '進行中' : fmt(rep.stats.ttRuns) + ' 次', ttHtml(rep)) +
      fold('gamble', '🎲 賭局', fmt(rep.stats.gambles) + ' 局', gambleHtml(rep)) +
      fold('misc', '📋 名冊・離線・等級', '名冊 ' + fmt(rep.stats.rosterTo) + '／離線 ' + fmt(rep.stats.offlineSyncs), miscHtml(rep));
  }

  function formationHtml(R) {
    var html = '<div class="lk-dim">好友會自行領悟陣法；指派隊長陣法可提升隊伍默契（隊伍加成折半）。</div><div class="lk-grid">';
    R.formations.forEach(function (fm) {
      var b = fm.bonus || {}, bl = [];
      ['atkPct','defPct','hpPct','atbMul'].forEach(function (k) { if (b[k]) bl.push(k.replace('Pct','').replace('Mul','') + '+' + pct(b[k])); });
      if (b.critAdd) bl.push('爆+' + b.critAdd);
      if (b.evaAdd) bl.push('閃+' + b.evaAdd);
      html += '<div class="lk-card"><div class="lk-head2"><span class="lk-name">' + (fm.icon || '☯️') + ' ' + esc(fm.name) + '</span>' +
        '<span class="lk-meta">Lv.' + fm.reqLv + '</span></div><div class="lk-dim">' + esc(fm.desc || '') + '</div>' +
        '<div class="lk-chips"><span class="lk-chip g">' + (bl.join('、') || '—') + '</span></div>';
      if (R.list.length) {
        html += '<div class="lk-chips">指派：';
        R.list.slice(0, 5).forEach(function (x) {
          html += '<button class="lk-btn" data-lk="setFm" data-lkv="' + x.id + '|' + fm.id + '">' + x.icon + esc(x.name) + '</button>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    return html + '</div>';
  }
  function spiritHtml(R) {
    var html = '<div class="lk-dim">靈根等級每級 +1.2% 四維、+2% 成長。</div><div class="lk-grid">';
    R.spiritRoots.forEach(function (sr) {
      html += '<div class="lk-card"><div class="lk-head2"><span class="lk-name">' + (sr.icon || '💎') + ' ' + esc(sr.name) + '</span>' +
        '<span class="lk-meta">權重 ' + sr.weight + '</span></div><div class="lk-dim">' + esc(sr.desc || '') + '</div></div>';
    });
    html += '</div><div class="lk-dim" style="margin-top:8px">好友靈根：</div>';
    R.list.forEach(function (x) {
      var sr = null;
      R.spiritRoots.forEach(function (s) { if (s.id === x.spiritRoot) sr = s; });
      html += '<div class="lk-row"><span>' + x.icon + ' <b>' + esc(x.name) + '</b>　' +
        (sr ? (sr.icon || '💎') + esc(sr.name) : '（無）') + '</span><span>Lv.' + x.spiritLv + '</span></div>';
    });
    return html;
  }
  function elementHtml(R) {
    var html = '<div class="lk-dim">剋制 +15%、被剋 -8%。場所亦影響五行表現。</div><div class="lk-grid">';
    R.elements.forEach(function (el) {
      var beats = null;
      R.elements.forEach(function (e) { if (e.id === el.beats) beats = e; });
      html += '<div class="lk-card"><div class="lk-head2"><span class="lk-name">' + (el.icon || '🌀') + ' ' + esc(el.name) + '</span>' +
        (beats ? '<span class="lk-meta">剋 ' + (beats.icon || '') + esc(beats.name) + '</span>' : '') + '</div></div>';
    });
    html += '</div><div class="lk-dim" style="margin-top:8px">好友分佈：</div><div class="lk-chips">';
    var cnt = {};
    R.list.forEach(function (x) { cnt[x.element] = num(cnt[x.element], 0) + 1; });
    R.elements.forEach(function (el) {
      html += '<span class="lk-chip ' + (num(cnt[el.id], 0) > 0 ? 'b' : '') + '">' + (el.icon || '') + esc(el.name) + ' × ' + num(cnt[el.id], 0) + '</span>';
    });
    return html + '</div>';
  }
  function petHtml(R) {
    var html = '<div class="lk-dim">好友可收服、培養、進化寵物。</div>';
    if (!R.pets.length) return html + '<div class="lk-dim">寵物資料未載入。</div>';
    html += '<div class="lk-grid">';
    R.pets.slice(0, 12).forEach(function (p) {
      html += '<div class="lk-card"><div class="lk-head2"><span class="lk-name">' + (p.icon || '🐾') + ' ' + esc(p.name) + '</span></div>';
      if (R.list.length) {
        html += '<div class="lk-chips">指派：';
        R.list.slice(0, 4).forEach(function (x) {
          html += '<button class="lk-btn" data-lk="setPet" data-lkv="' + x.id + '|' + p.id + '">' + x.icon + esc(x.name) + '</button>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div><div class="lk-dim" style="margin-top:8px">好友寵物：</div>';
    var any = false;
    R.list.forEach(function (x) {
      if (!x.pet) return;
      any = true;
      html += '<div class="lk-row"><span>' + x.icon + ' <b>' + esc(x.name) + '</b>　🐾' + esc(x.pet.name || x.pet.id) + '</span><span>Lv.' + num(x.pet.lv, 1) + '</span></div>';
    });
    if (!any) html += '<div class="lk-dim">目前沒有好友養寵物。</div>';
    return html;
  }
  function companionHtml(R) {
    var html = '<div class="lk-dim">好感達標才能出任同伴。</div><div class="lk-grid">';
    R.companionRoles.forEach(function (c) {
      var b = c.bonus || {}, bl = [];
      Object.keys(b).forEach(function (k) { bl.push(k + '+' + (/%|Pct|Mul/.test(k) ? pct(b[k]) : b[k])); });
      html += '<div class="lk-card"><div class="lk-head2"><span class="lk-name">' + c.icon + ' ' + esc(c.name) + '</span>' +
        '<span class="lk-meta">好感 ' + num(c.favorMin, 0) + '</span></div><div class="lk-dim">' + esc(c.desc) + '</div>' +
        '<div class="lk-chips"><span class="lk-chip g">' + (bl.join('、') || '—') + '</span></div>';
      if (R.list.length) {
        html += '<div class="lk-chips">指派：';
        R.list.slice(0, 4).forEach(function (x) {
          html += '<button class="lk-btn" data-lk="setComp" data-lkv="' + x.id + '|' + c.id + '">' + x.icon + esc(x.name) + '</button>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    return html + '</div>';
  }
  function guildHtml(R) {
    var G2 = R.guild, b = G2.bonus || {};
    var html = '<div class="lk-dim">好友成為公會賓客後可享建築加成（折半），並每期為公會貢獻經驗。</div>' +
      '<div class="lk-rows"><span>賓客 <b>' + G2.guests.length + '/' + G2.max + '</b></span>' +
      '<span>貢獻 <b>' + fmt(G2.contrib) + '</b></span>' +
      '<span>加成 <b>攻+' + pct(b.atkPct) + '／防+' + pct(b.defPct) + '／血+' + pct(b.hpPct) + '</b></span></div>' +
      '<div class="lk-chips" style="margin-top:6px">';
    R.list.slice(0, 12).forEach(function (x) {
      html += '<button class="lk-btn' + (x.guildGuest ? ' g' : '') + '" data-lk="guildJoin" data-lkv="' + x.id + '">' +
        (x.guildGuest ? '✓ ' : '+ ') + x.icon + esc(x.name) + '</button>';
    });
    html += '</div>';
    if (G2.guests.length) {
      html += '<div style="margin-top:8px">';
      G2.guests.forEach(function (g) {
        html += '<div class="lk-row"><span>' + g.icon + ' <b>' + esc(g.name) + '</b> Lv.' + g.lv + '</span>' +
          '<button class="lk-btn r" data-lk="guildLeave" data-lkv="' + g.id + '">移出</button></div>';
      });
      html += '</div>';
    }
    return html;
  }
  function marketHtml(R) {
    var html = '<div class="lk-rows"><span>掛售 <b>' + R.market.length + '</b></span>' +
      '<span>下次刷新 <b>' + R.marketNext + '</b> 期</span>' +
      '<span>已買 <b>' + fmt(R.stats.marketBought) + '</b></span>' +
      '<span>已賣 <b>' + fmt(R.stats.marketSold) + '</b></span></div>' +
      '<div class="lk-chips" style="margin:6px 0"><button class="lk-btn" data-lk="marketRefresh">🔄 強制刷新</button></div>';
    if (!R.market.length) html += '<div class="lk-dim">目前沒有掛售品。</div>';
    R.market.forEach(function (m) {
      html += '<div class="lk-row"><span>' + m.sellerIcon + ' <b>' + esc(m.sellerName) + '</b> 售 ' + esc(m.name) +
        '　<span class="lk-dim">Lv.' + m.reqLv + '　戰力 ' + fmt(m.power) + '</span></span>' +
        '<span><span class="lk-chip y">' + fmt(m.price) + '</span> ' +
        (m.canAfford ? '<button class="lk-btn" data-lk="marketBuy" data-lkv="' + m.id + '">買下</button>' : '<button class="lk-btn" disabled>不足</button>') + '</span></div>';
    });
    html += '<div class="lk-dim" style="margin-top:8px">我要賣（好友倉庫）：</div>';
    R.sellables.slice(0, 8).forEach(function (s) {
      html += '<div class="lk-row"><span>' + esc(s.name) + '　<span class="lk-dim">Lv.' + s.reqLv + '</span></span>' +
        '<button class="lk-btn y" data-lk="marketSell" data-lkv="' + s.idx + '">變賣</button></div>';
    });
    return html;
  }
  function craftHtml(R) {
    var html = '<div class="lk-rows"><span>代工中 <b>' + R.crafts.length + '/' + R.craftMax + '</b></span>' +
      '<span>每次耗材 <b>' + R.craftMat + '</b></span>' +
      '<span>成功 <b>' + fmt(R.stats.crafts) + '</b>／失敗 <b>' + fmt(R.stats.craftFail) + '</b></span></div>';
    if (R.crafts.length) {
      html += '<div class="lk-grid" style="margin-top:6px">';
      R.crafts.forEach(function (c) {
        html += '<div class="lk-card"><div class="lk-head2"><span class="lk-name">' + c.icon + ' ' + esc(c.name) + '</span>' +
          '<span class="lk-meta">剩 ' + c.left + '/' + c.total + '</span></div><div class="lk-dim">' + esc(c.itemName) + '</div></div>';
      });
      html += '</div>';
    }
    if (R.sellables.length && R.list.length) {
      html += '<div class="lk-dim" style="margin-top:8px">委託代工：</div>';
      R.sellables.slice(0, 6).forEach(function (s) {
        html += '<div class="lk-row"><span>' + esc(s.name) + '</span><span class="lk-chips">';
        R.list.slice(0, 4).forEach(function (x) {
          html += '<button class="lk-btn" data-lk="craft" data-lkv="' + x.id + '|' + s.idx + '">' + x.icon + esc(x.name) + '</button>';
        });
        html += '</span></div>';
      });
    }
    return html;
  }
  function salvageHtml(R) {
    var html = '<div class="lk-rows"><span>作業中 <b>' + R.salvages.length + '</b></span>' +
      '<span>需求 <b>' + R.salvageMin + '~' + R.salvageMax + '</b> 人</span>' +
      '<span>累計 <b>' + fmt(R.stats.salvages) + '</b> 次</span></div>' +
      '<div class="lk-chips" style="margin-top:6px"><button class="lk-btn y" data-lk="salvageStart">🌊 一鍵派遣</button></div>';
    if (R.salvages.length) {
      html += '<div class="lk-grid" style="margin-top:6px">';
      R.salvages.forEach(function (s) {
        html += '<div class="lk-card"><div class="lk-head2"><span class="lk-name">🌊 ' + s.count + ' 人</span>' +
          '<span class="lk-meta">剩 ' + s.left + '/' + s.total + '</span></div><div class="lk-dim">' + s.names.join('、') + '</div></div>';
      });
      html += '</div>';
    }
    return html;
  }
  function ttHtml(R) {
    var html = '<div class="lk-rows"><span>累計 <b>' + fmt(R.stats.ttRuns) + '</b> 次</span>' +
      '<span>帶回 <b>' + fmt(R.stats.ttGold) + '</b> 兩</span></div>' +
      '<div class="lk-chips" style="margin-top:6px"><button class="lk-btn v" data-lk="ttStart"' + (R.tt ? ' disabled' : '') + '>⏳ 出發</button></div>';
    if (R.tt) {
      html += '<div class="lk-card" style="margin-top:6px"><div class="lk-head2"><span class="lk-name">⏳ 進行中</span>' +
        '<span class="lk-meta">剩 ' + R.tt.left + '/' + R.tt.total + '</span></div><div class="lk-dim">' + R.tt.names.join('、') + '</div></div>';
    }
    return html;
  }
  function gambleHtml(R) {
    var html = '<div class="lk-rows"><span>累計 <b>' + fmt(R.stats.gambles) + '</b> 局</span>' +
      '<span>淨收益 <b>' + (R.stats.gambleNet >= 0 ? '+' : '') + fmt(R.stats.gambleNet) + '</b></span></div>' +
      '<div class="lk-chips" style="margin-top:6px"><button class="lk-btn y" data-lk="gambleResolve">⚡ 立刻結算</button></div>' +
      '<div class="lk-grid" style="margin-top:6px">';
    R.list.slice(0, 8).forEach(function (x) {
      html += '<div class="lk-card"><div class="lk-head2"><span class="lk-name">' + x.icon + ' ' + esc(x.name) + '</span>' +
        '<span class="lk-meta">Lv.' + x.lv + '</span></div><div class="lk-chips">' +
        '<button class="lk-btn" data-lk="bet" data-lkv="' + x.id + '|1000">1千</button>' +
        '<button class="lk-btn" data-lk="bet" data-lkv="' + x.id + '|5000">5千</button>' +
        '<button class="lk-btn" data-lk="bet" data-lkv="' + x.id + '|20000">2萬</button></div></div>';
    });
    return html + '</div>';
  }
  function miscHtml(R) {
    var html = '<div class="lk-rows"><span>轉入名冊 <b>' + fmt(R.stats.rosterTo) + '</b></span>' +
      '<span>名冊轉回 <b>' + fmt(R.stats.rosterFrom) + '</b></span>' +
      '<span>花費 <b>' + fmt(R.roster.cost) + '</b> 兩</span></div><div class="lk-chips" style="margin-top:6px">轉入名冊：';
    R.list.slice(0, 8).forEach(function (x) {
      html += '<button class="lk-btn" data-lk="toRoster" data-lkv="' + x.id + '">📋 ' + x.icon + esc(x.name) + '</button>';
    });
    html += '</div>';
    if (R.roster.chars && R.roster.chars.length) {
      html += '<div class="lk-dim" style="margin-top:8px">名冊 → 好友：</div>';
      R.roster.chars.slice(0, 10).forEach(function (c) {
        html += '<div class="lk-row"><span>' + (c.icon || '🧑') + ' <b>' + esc(c.name) + '</b> Lv.' + c.lv + '</span>' +
          '<button class="lk-btn" data-lk="fromRoster" data-lkv="' + c.id + '">轉為好友</button></div>';
      });
    }
    html += '<div class="lk-rows" style="margin-top:10px"><span>🌙 離線連動 <b>' + (R.offline.enabled ? '啟用' : '停用') + '</b></span>' +
      '<span>已同步 <b>' + fmt(R.offline.syncs) + '</b> 次</span></div>' +
      '<div class="lk-chips" style="margin-top:6px"><button class="lk-btn" data-lk="offlineSync">🌙 立即同步離線收益</button></div>' +
      '<div class="lk-rows" style="margin-top:10px"><span>📈 等級曲線 <b>' + (R.level.enabled ? '啟用' : '停用') + '</b></span></div>';
    return html;
  }

  function logHtml() {
    var lg = L.log();
    var html = '<details class="lk-fold"><summary>📜 匯流排日誌<span class="lk-count">' + lg.length + ' 筆</span></summary><div class="lk-fbody">';
    if (!lg.length) return html + '<div class="lk-dim">尚無紀錄。</div></div></details>';
    html += '<div class="lk-logs">';
    lg.slice(0, 50).forEach(function (l) {
      var cls = l.kind === 'error' ? 'no' : (l.kind === 'discover' || l.kind === 'auto' ? 'ok' : '');
      html += '<div class="lk-log ' + cls + '"><span style="color:#64748b;font-size:.68rem;margin-right:5px">' +
        ago(l.t) + '</span>' + esc(l.msg) + '</div>';
    });
    return html + '</div></div></details>';
  }

  /* ── 事件 ── */
  var ACT = {
    discover: function () { var r = L.discover(true); alert('探索完成\n掃描：' + r.scanned + '\n新綁定：' + r.bound); render(); },
    relink: function () { var n = window.HY.SystemBridge ? window.HY.SystemBridge.relink() : 0; alert(n > 0 ? ('補接 ' + n + ' 個系統。') : '沒有新系統可接。'); render(); },
    dump: function () {
      console.log('%c=== HY.Link 稽核 ===', 'color:#7dd3fc;font-weight:bold');
      console.table(L.audit());
      if (window.HY.SystemBridge) { console.log('%c=== 原版橋接 ===', 'color:#7dd3fc;font-weight:bold'); console.table(window.HY.SystemBridge.report()); }
      alert('已輸出至 Console。');
    },
    testHooks: function () {
      var names = L.HOOK_NAMES || [];
      var out = {};
      names.forEach(function (n) { try { out[n] = L.fire(n, { test: true, tier: 1, enemyLv: 30 }).length; } catch (e) { out[n] = -1; } });
      console.log('[Link] 鉤子測試：', out);
      alert('鉤子測試完成，詳見 Console。');
    },
    collectAll: function () {
      var t = T();
      var list = t && t.friendAll ? t.friendAll() : [];
      var rows = list.map(function (f) {
        var ctx = window.HY.LinkCtxOf ? window.HY.LinkCtxOf(f) : {};
        var r = L.collect('friend', ctx);
        return { 名稱: f.name, Lv: num(f.lv, 1), atkPct: +num(r.atkPct, 0).toFixed(3),
          defPct: +num(r.defPct, 0).toFixed(3), hpPct: +num(r.hpPct, 0).toFixed(3),
          expMul: +num(r.expMul, 0).toFixed(3), 來源數: (r.sources || []).length };
      });
      console.log('%c=== 全好友聚合 ===', 'color:#7dd3fc;font-weight:bold');
      console.table(rows);
      alert('已輸出 ' + rows.length + ' 位好友至 Console。');
    },
    toggle: function (v) { L.setOff(v, !L.isOff(v)); render(); },
    bind: function (v) {
      var cur = (L.audit().filter(function (x) { return x.id === v; })[0] || {}).boundPath || '';
      var p = prompt('輸入綁定路徑（例如 HY.game.petSys）\n留空 = 清除', cur);
      if (p === null) return;
      L.setBinding(v, p.trim());
      L.discover(true);
      render();
    },
    autoSyn: function () {
      if (!C) return;
      var M = C.SYNERGY_MAP;
      var all = L.systems().map(function (s) { return s.id; });
      var added = 0;
      all.forEach(function (id) {
        if (!M[id]) { M[id] = []; added += 1; }
        var a = L.sysInfo(id);
        all.forEach(function (o) {
          if (o === id || M[id].indexOf(o) !== -1) return;
          var b = L.sysInfo(o);
          if (!a || !b) return;
          var share = (a.caps || []).filter(function (c) { return (b.caps || []).indexOf(c) !== -1; });
          if (share.length) M[id].push(o);
        });
      });
      alert('自動補關聯完成，新增 ' + added + ' 個節點。');
      render();
    },
    setFm: function (v) { var p = String(v).split('|'); if (T().fr6SetFormation(p[0], p[1])) render(); },
    setPet: function (v) { var p = String(v).split('|'); if (T().fr6SetPet(p[0], p[1])) render(); },
    setComp: function (v) { var p = String(v).split('|'); if (T().fr6SetCompanionRole(p[0], p[1])) render(); },
    guildJoin: function (v) { var t = T(); if (t.fr6GuildGuests().indexOf(v) !== -1) t.fr6GuildLeave(v); else t.fr6GuildJoin(v); render(); },
    guildLeave: function (v) { T().fr6GuildLeave(v); render(); },
    marketRefresh: function () { T().fr6MarketRefresh(true); render(); },
    marketBuy: function (v) { if (T().fr6MarketBuy(v)) render(); },
    marketSell: function (v) { T().fr6MarketSell(parseInt(v, 10)); render(); },
    craft: function (v) { var p = String(v).split('|'); if (T().fr6CraftAssign(p[0], parseInt(p[1], 10))) render(); },
    salvageStart: function () { T().fr6SalvageStart(null); render(); },
    ttStart: function () { T().fr6TtStart(null); render(); },
    bet: function (v) { var p = String(v).split('|'); if (T().fr6GambleBet(p[0], parseInt(p[1], 10))) render(); },
    gambleResolve: function () { T().fr6GambleResolve(); render(); },
    toRoster: function (v) { if (T().fr6ToRoster(v)) render(); },
    fromRoster: function (v) { if (T().fr6FromRoster(v)) render(); },
    offlineSync: function () {
      var r = window.HY.OfflineBridge ? window.HY.OfflineBridge.run() : null;
      alert(r ? ('離線結算完成：補算 ' + r.done + ' 期。') : '沒有可結算的離線收益。');
      render();
    }
  };

  function bind() {
    if (!els || els.body._lkBound) return;
    els.body._lkBound = true;
    els.body.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-lk]') : null;
      if (!el) return;
      var fn = ACT[el.getAttribute('data-lk')];
      if (!fn) return;
      e.preventDefault();
      try { fn(el.getAttribute('data-lkv') || '', el); }
      catch (err) { console.error('[uiFriend6] 動作失敗：', err); }
    });
  }

  function boot() {
    injectStyles();
    var ok = installTab();
    if (!ok) {
      console.warn('[uiFriend6] ⚠️ 未能定位分頁列。可執行：HY.UIFriend6.setTabSelector(\'#你的容器\'); HY.UIFriend6.move()');
      console.warn('[uiFriend6] 可用 HY.UIFriend6.anchors() 查看候選標籤');
    }
    if (!window.__linkTabTimer) {
      window.__linkTabTimer = setInterval(function () {
        if (!document.getElementById(STYLE_ID)) injectStyles();
        var btn = document.getElementById(TAB_ID);
        if (!btn) installTab();
        else relocate(false);
      }, 2000);
    }
    window.HY.UIFriend6.ready = true;
  }

  boot();
  console.log('[uiFriend6] ✓ 已載入（🔗 系統連動 — 獨立主分頁 v3，位置：作弊 ↔ 儲存進度）');
})();