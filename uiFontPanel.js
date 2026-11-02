// js/uiFontPanel.js (v4.1)
// ⭐ 遊戲字體調整面板：🔠 字體標籤（掛在「📱 畫面智慧適應」旁）+ 字體調整彈窗
//
// 【v4.1 改動】移除標籤閃動動畫（fontTabPulse）與掃光（font-shine），保留框線顏色 + 靜態微光
// 【v4 修正】標籤延遲顯示（Observer 改掛 documentElement + 掃 addedNodes + setTimeout 快退輪詢）
// 【v3】標籤安裝脫離 FontSys；【v2】錨點評分制 + 位置自動校正
//
// Console：
//   HY.UIFont.open() / close() / install() / move()
//   HY.UIFont.anchors() / where() / timing() / trace()
//
// ⚠️ 載入順序：fontSystem.js 之後、main.js 之前
window.HY = window.HY || {};

(function () {
  var TAB_ID = 'font-main-tab';
  var MASK_ID = 'font-mask';
  var MODAL_ID = 'font-modal';
  var STYLE_ID = 'font-panel-style';

  /* ══════════════════════════════════════════════════════
     ★ 立刻註冊 global
     ══════════════════════════════════════════════════════ */
  window.HY.UIFont = {
    version: '4.1',
    tabId: TAB_ID,
    modalId: MODAL_ID,
    ready: false,
    install: function () { return ensureTab(true); },
    move: function () { return ensureTab(true); },
    open: function () { return openModal(); },
    close: function () { return closeModal(); },
    toggle: function () { return _open ? closeModal() : openModal(); },
    setTabSelector: function (sel) { tabContainerSel = sel; return sel; },
    anchors: function () { return listAnchors(); },
    where: function () { return whereIsTab(); },
    timing: function () { return timingInfo(); },
    trace: function () { return TRACE.slice(0, 60); },
    deps: function () {
      return {
        FontSys: !!window.HY.FontSys,
        UIFriend3: !!(window.HY.UIFriend3 && window.HY.UIFriend3.ready),
        game: !!(window.HY.game && window.HY.game.townSys)
      };
    }
  };

  /* ══════════════════════════════════════════════════════
     常數
     ══════════════════════════════════════════════════════ */
  var ANCHOR_KEYS = [
    '畫面智慧適應', '智慧適應', '畫面適應', '智能適應', '自適應', '適應',
    '智慧', '佈局', '布局', '縮放', '顯示設定', '畫面', '顯示'
  ];
  var QUICK_KEYS = ['畫面智慧適應', '智慧適應', '畫面適應', '智能適應', '自適應', '適應', '智慧'];

  var CONTAINER_SELS = [
    '#main-tabs', '.main-tabs', '#tabs', '.tabs', '#tab-bar', '.tab-bar',
    '.top-tabs', '.nav-tabs', '.app-tabs', '.ui-tabs', '.tabbar', '.tab-bar-wrap',
    '.main-nav', '.nav', '.toolbar', '.topbar', 'header', '.header', '#app-header'
  ];

  var TAB_WORDS = ['角色', '隊伍', '好友', '戰鬥', '行囊', '裝備', '小鎮', '畫面', '適應', '智慧',
    '設定', '武學', '門派', '寵物', '同伴', '公會', '名人', '訊息', '記錄', '陣法', '探索',
    '大樂透', '商店', '拍賣', '洞府', '世界王', '仇敵', '排行榜', '羈絆', '稱號', '書信', '任務', '比武'];

  /* ══════════════════════════════════════════════════════
     狀態
     ══════════════════════════════════════════════════════ */
  var tabContainerSel = null;
  var _open = false;
  var els = null;

  var _bootAt = now();
  var _installedAt = 0;
  var _lastLogKey = '';
  var _mo = null;
  var _settled = false;
  var _lastFullScan = 0;
  var _fastStop = false;
  var _checkPending = false;
  var TRACE = [];

  function now() {
    return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
  }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function esc(s) { return String(s == null ? '' : s); }
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ''); }
  function FS() { return window.HY.FontSys; }
  function trace(msg) {
    var t = Math.round(now() - _bootAt);
    TRACE.unshift({ t: t, msg: msg });
    if (TRACE.length > 80) TRACE.pop();
  }

  /* ══════════════════════════════════════════════════════
     樣式（v4.1：已停用閃動，保留框線 + 靜態微光）
     ══════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return true;
    var host = document.head || document.documentElement;
    if (!host) return false;
    var css = `
/* ══ 🔠 字體標籤（框線 + 靜態微光；v4.1 已移除閃動）══ */
#${TAB_ID} {
  position: relative !important;
  overflow: hidden !important;
  font-weight: 800 !important;
  letter-spacing: .5px !important;
  color: #fde68a !important;
  border: 2px solid #fbbf24 !important;
  border-radius: 7px !important;
  background: linear-gradient(180deg, rgba(251,191,36,.30), rgba(217,119,6,.10)) !important;
  text-shadow: 0 0 6px rgba(253,230,138,.95), 0 0 13px rgba(251,191,36,.60) !important;
  animation: none !important;                                     /* v4.1：不再閃動 */
  box-shadow: 0 0 9px rgba(251,191,36,.40), inset 0 0 7px rgba(251,191,36,.14) !important;  /* v4.1：靜態微光 */
  transition: transform .15s ease, filter .15s ease !important;
  z-index: 20 !important;
}
#${TAB_ID}:hover { transform: translateY(-2px) scale(1.05) !important; filter: brightness(1.55) !important; }
#${TAB_ID}.font-open {
  color: #fff !important; border-color: #fff !important;
  background: rgba(251,191,36,.52) !important;
  box-shadow: 0 0 16px rgba(251,191,36,.80), inset 0 0 11px rgba(255,255,255,.28) !important;
}
/* v4.1：掃光元素停用 */
#${TAB_ID} .font-shine {
  display: none !important;
}

.fm-mask {
  position: fixed; inset: 0; z-index: 9700; background: rgba(2,6,12,.74);
  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.fm-mask.hidden { display: none !important; }
.fm-modal {
  width: min(92vw, 1000px); height: min(88vh, 900px);
  display: flex; flex-direction: column;
  background: #0f141c; border: 2px solid #fbbf24; border-radius: 10px;
  box-shadow: 0 24px 70px rgba(0,0,0,.78), inset 0 0 0 1px rgba(251,191,36,.25);
  overflow: hidden; animation: fmIn .18s ease-out;
}
@keyframes fmIn { from { opacity: 0; transform: scale(.96) translateY(10px); } to { opacity: 1; transform: none; } }
.fm-modal.full { width: 97vw !important; height: 95vh !important; }
.fm-head {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 11px 15px; background: linear-gradient(90deg, #241d10, #2a2415);
  border-bottom: 1px solid #fbbf24;
}
.fm-title { font-size: 1.06rem; font-weight: bold; color: #fde68a; }
.fm-sub { font-size: .74rem; color: #94a3b8; }
.fm-headbtns { margin-left: auto; display: flex; gap: 8px; }
.fm-body { flex: 1 1 auto; overflow-y: auto; padding: 13px 15px; }
.fm-foot {
  padding: 8px 15px; font-size: .73rem; color: #94a3b8; background: #131b26;
  border-top: 1px solid #2e3b4e; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
}
.fm-btn {
  background: #2b394a; color: #fde68a; border: 1px solid #fbbf24;
  border-radius: 4px; padding: 3px 11px; font-size: .76rem; cursor: pointer;
}
.fm-btn:hover { background: #3a4a5e; }
.fm-btn.r { border-color: #ef4444; color: #fca5a5; }
.fm-btn.g { border-color: #34d399; color: #6ee7b7; }
.fm-btn.b { border-color: #38bdf8; color: #7dd3fc; }
.fm-btn:disabled { opacity: .35; cursor: not-allowed; }
.fm-block { background: #131b26; border: 1px solid #2e3b4e; border-radius: 7px; padding: 11px 13px; margin-bottom: 10px; }
.fm-btitle { font-size: .88rem; font-weight: bold; color: #fde68a; margin-bottom: 7px; }
.fm-dim { font-size: .72rem; color: #94a3b8; line-height: 1.5; }
.fm-row {
  display: grid; grid-template-columns: 150px 1fr 200px 74px 44px 78px;
  align-items: center; gap: 9px;
  background: #121822; border: 1px solid #2e3b4e; border-radius: 5px;
  padding: 7px 9px; margin-bottom: 5px; font-size: .8rem;
}
.fm-row:hover { border-color: #c89d54; }
.fm-row.hit { border-color: #10b981; }
.fm-row.miss { border-color: #7f1d1d; }
.fm-name { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm-sel { font-size: .68rem; color: #64748b; font-family: ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fm-sel input {
  width: 100%; background: #0d1219; color: #a7f3d0; border: 1px solid #334155;
  border-radius: 3px; padding: 2px 5px; font-size: .68rem; font-family: ui-monospace, monospace;
}
.fm-range { width: 100%; accent-color: #fbbf24; cursor: pointer; }
.fm-val { font-size: .78rem; color: #fde68a; text-align: center; font-weight: bold; font-variant-numeric: tabular-nums; }
.fm-presets { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 7px; }
.fm-chip { font-size: .7rem; padding: 1px 8px; border-radius: 9px; border: 1px solid #2e3b4e; color: #94a3b8; background: #0f1720; }
.fm-chip.g { border-color: #10b981; color: #6ee7b7; }
.fm-chip.r { border-color: #ef4444; color: #fca5a5; }
.fm-chip.y { border-color: #fbbf24; color: #fcd34d; }
.fm-anchors { max-height: 220px; overflow-y: auto; }
.fm-anchor-row {
  display: flex; justify-content: space-between; gap: 8px; align-items: center;
  background: #121822; border: 1px solid #2e3b4e; border-radius: 4px;
  padding: 4px 8px; margin-bottom: 3px; font-size: .74rem;
}
.fm-anchor-row.best { border-color: #10b981; background: #101a24; }
.fm-anchor-row.cur { border-color: #fbbf24; }
.fm-anchor-txt { color: #e2e8f0; }
.fm-anchor-meta { color: #64748b; font-size: .68rem; font-family: ui-monospace, monospace; }
.fm-preview {
  background: #0d1219; border: 1px dashed #334155; border-radius: 5px;
  padding: 9px 11px; margin-top: 7px; line-height: 1.7;
}
.fm-preview .p1 { font-size: 1rem; color: #e2e8f0; }
.fm-preview .p2 { font-size: .8rem; color: #94a3b8; }
.fm-preview .p3 { font-size: .68rem; color: #64748b; }
.fm-trace { max-height: 180px; overflow-y: auto; font-family: ui-monospace, monospace; font-size: .68rem; color: #94a3b8; }
.fm-trace div { padding: 1px 0; border-bottom: 1px solid #1e293b; }
@media (max-width: 980px) { .fm-row { grid-template-columns: 1fr; gap: 6px; } }
`;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.appendChild(document.createTextNode(css));
    host.appendChild(st);
    trace('樣式注入（host=' + (document.head ? 'head' : 'documentElement') + '）');
    return true;
  }

  /* ══════════════════════════════════════════════════════
     錨點評分 / 掃描
     ══════════════════════════════════════════════════════ */
  function scoreEl(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el.id === TAB_ID) return null;
    var txt = norm(el.textContent);
    if (!txt || txt.length > 20) return null;
    if (el.children && el.children.length > 4) return null;

    var best = -1, hitKey = null;
    for (var i = 0; i < ANCHOR_KEYS.length; i++) {
      if (txt.indexOf(ANCHOR_KEYS[i]) !== -1) { best = i; hitKey = ANCHOR_KEYS[i]; break; }
    }
    if (best < 0) return null;

    var score = best * 100 + txt.length;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'button' || tag === 'a') score -= 30;
    if (el.className && /tab|nav|menu|btn/i.test(String(el.className))) score -= 15;
    return { el: el, score: score, key: hitKey, text: txt, prio: best, len: txt.length };
  }

  /** 掃單一節點（含其子孫，但只查 tab 類元素）—— 用於 addedNodes，最便宜 */
  function scanNode(node) {
    if (!node || node.nodeType !== 1) return null;
    var s = scoreEl(node);
    if (s) return s;
    var list;
    try {
      list = node.querySelectorAll ? node.querySelectorAll('button, a, li, .tab, .tab-btn, [role="tab"], [data-tab]') : null;
    } catch (e) { return null; }
    if (!list || !list.length) return null;
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var s2 = scoreEl(list[i]);
      if (s2 && (!best || s2.score < best.score)) best = s2;
    }
    return best;
  }

  /** 便宜掃描：只掃常見分頁容器的直屬子節點 */
  function cheapAnchor() {
    var best = null, i, j;
    for (i = 0; i < CONTAINER_SELS.length; i++) {
      var c;
      try { c = document.querySelector(CONTAINER_SELS[i]); } catch (e) { c = null; }
      if (!c || !c.children || c.children.length < 2 || c.children.length > 40) continue;
      for (j = 0; j < c.children.length; j++) {
        var s = scoreEl(c.children[j]);
        if (s && (!best || s.score < best.score)) best = s;
      }
    }
    return best;
  }

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

  function listAnchors() {
    var seen = [], results = [];
    containers().forEach(function (c) {
      var all;
      try { all = c.querySelectorAll('button, a, li, .tab, .tab-btn, .nav-item, [role="tab"], [data-tab]'); }
      catch (e) { return; }
      Array.prototype.forEach.call(all, function (el) {
        if (seen.indexOf(el) !== -1) return;
        seen.push(el);
        var s = scoreEl(el);
        if (s) results.push(s);
      });
    });
    results.sort(function (a, b) { return a.score - b.score; });
    return results;
  }

  function findTabAnchor() {
    var c = cheapAnchor();
    if (c) return c;
    var list = listAnchors();
    if (list.length) return list[0];
    var ft = document.getElementById('fr3-main-tab');
    if (ft) return { el: ft, score: 9999, key: '(fallback)好友', text: '🤝好友', prio: 99, len: 0, fallback: true };
    var cs = containers();
    for (var i = 0; i < cs.length; i++) {
      var bs;
      try { bs = cs[i].querySelectorAll('button, a, li'); } catch (e) { continue; }
      for (var j = 0; j < bs.length; j++) {
        var t = norm(bs[j].textContent);
        if (t.indexOf('角色') !== -1 && t.length <= 12) {
          return { el: bs[j], score: 9998, key: '(fallback)角色', text: t, prio: 98, len: t.length, fallback: true };
        }
      }
    }
    return null;
  }

  /* ══════════════════════════════════════════════════════
     分頁容器（臨時落腳處）
     ══════════════════════════════════════════════════════ */
  function looksLikeTab(el) {
    var t = norm(el.textContent);
    if (!t || t.length > 16) return false;
    for (var i = 0; i < TAB_WORDS.length; i++) if (t.indexOf(TAB_WORDS[i]) !== -1) return true;
    return false;
  }

  function findTabContainer() {
    var i, el;
    for (i = 0; i < CONTAINER_SELS.length; i++) {
      try { el = document.querySelector(CONTAINER_SELS[i]); } catch (e) { el = null; }
      if (!el) continue;
      if (el === document.body || el === document.documentElement) continue;
      if (el.children && el.children.length >= 2) return el;
    }
    if (!document.body) return null;
    var all;
    try { all = document.body.querySelectorAll('div, nav, header, ul, section'); } catch (e) { return null; }
    var best = null, bestScore = 0;
    for (i = 0; i < all.length; i++) {
      var c = all[i];
      if (c === document.body || c === document.documentElement) continue;
      var n = c.children ? c.children.length : 0;
      if (n < 3 || n > 30) continue;
      var hits = 0, short = 0;
      for (var j = 0; j < n; j++) {
        var ch = c.children[j];
        var t = norm(ch.textContent);
        if (!t) continue;
        if (t.length <= 16) short++;
        if (looksLikeTab(ch)) hits++;
      }
      if (hits < 2) continue;
      var score = hits * 10 + short;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  /* ══════════════════════════════════════════════════════
     安裝 / 校正
     ══════════════════════════════════════════════════════ */
  function quickOk() {
    var btn = document.getElementById(TAB_ID);
    if (!btn) return false;
    var p = btn.previousElementSibling;
    if (!p) return false;
    var t = norm(p.textContent);
    if (!t) return false;
    for (var i = 0; i < QUICK_KEYS.length; i++) if (t.indexOf(QUICK_KEYS[i]) !== -1) return true;
    return false;
  }

  function makeTabBtn(templateEl) {
    var btn;
    if (templateEl && templateEl.cloneNode) {
      btn = templateEl.cloneNode(true);
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
    btn.textContent = '🔠 字體';
    btn.title = '遊戲字體調整（全域 ＋ 各系統面板獨立字級）';

    // v4.1：不再建立掃光元素（保留程式碼位置以便日後還原，實際不 append）
    // var shine = document.createElement('span');
    // shine.className = 'font-shine';
    // btn.appendChild(shine);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleModal();
    }, true);
    return btn;
  }

  function bindSiblingClose(parent) {
    if (!parent || parent.__fontCloseBound) return;
    parent.__fontCloseBound = true;
    parent.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('#' + TAB_ID)) return;
      if (_open) closeModal(true);
    }, false);
  }

  function markSettled() {
    if (!_installedAt) _installedAt = now();
    if (!_settled) {
      _settled = true;
      trace('標籤就位（' + Math.round(_installedAt - _bootAt) + 'ms）');
      setTimeout(function () { try { buildModal(); } catch (e) { /* 忽略 */ } }, 300);
    }
  }

  function logInstalled(info, moved) {
    var key = (info.key || '') + '|' + (info.text || '') + '|' + (moved ? 'm' : 'n');
    if (_lastLogKey === key) return;
    _lastLogKey = key;
    var ms = Math.round(now() - _bootAt);
    if (info.fallback) {
      console.log('[uiFont] ⏱ 「🔠 字體」標籤已' + (moved ? '校正到' : '插入到') + '「' + info.text + '」（+' + ms + 'ms）');
    } else {
      console.log('[uiFont] ✓ 「🔠 字體」標籤已' + (moved ? '校正到' : '插入到') + '「' + info.text +
        '」旁邊｜匹配「' + info.key + '」（+' + ms + 'ms）');
    }
    trace('安裝：' + info.text + ' / ' + info.key + (moved ? ' / moved' : ''));
  }

  /** 直接把標籤插到指定錨點後面 */
  function installAt(info) {
    if (!info || !info.el || !info.el.parentNode) return false;
    var anchor = info.el, parent = anchor.parentNode;
    var btn = document.getElementById(TAB_ID);
    if (btn) {
      if (btn.parentNode === parent && btn.previousElementSibling === anchor) { markSettled(); return true; }
      try {
        parent.insertBefore(btn, anchor.nextSibling);
        btn.removeAttribute('data-font-provisional');
      } catch (e) { return false; }
      bindSiblingClose(parent);
      markSettled();
      logInstalled(info, true);
      return true;
    }
    var nb = makeTabBtn(anchor);
    try { parent.insertBefore(nb, anchor.nextSibling); } catch (e) { return false; }
    bindSiblingClose(parent);
    markSettled();
    logInstalled(info, false);
    return true;
  }

  /** 確保標籤存在且位置正確 → 'ok' | 'wait' */
  function ensureTab(force) {
    if (!document.documentElement) return 'wait';
    injectStyles();
    if (!force && quickOk()) { markSettled(); return 'ok'; }

    var found = cheapAnchor();
    if (!found && (force || (now() - _lastFullScan) > 250)) {
      _lastFullScan = now();
      found = findTabAnchor();
    }
    if (found) return installAt(found) ? 'ok' : 'wait';

    // 錨點還沒出現 → 臨時插到分頁列尾端
    if (!document.getElementById(TAB_ID)) {
      var cont = findTabContainer();
      if (cont) {
        var tpl = null;
        for (var i = 0; i < cont.children.length; i++) {
          var t = norm(cont.children[i].textContent);
          if (t.length > 0 && t.length <= 14) { tpl = cont.children[i]; break; }
        }
        var pb = makeTabBtn(tpl);
        pb.setAttribute('data-font-provisional', '1');
        try {
          cont.appendChild(pb);
          bindSiblingClose(cont);
          if (!_installedAt) _installedAt = now();
          logInstalled({ text: '(臨時：分頁列尾端)', key: '(provisional)', fallback: true }, false);
          return 'ok';
        } catch (e) { return 'wait'; }
      }
    }
    return 'wait';
  }

  function scheduleCheck() {
    if (_checkPending) return;
    _checkPending = true;
    var run = function () {
      _checkPending = false;
      try { ensureTab(false); } catch (e) { /* 忽略 */ }
    };
    setTimeout(run, 0);
  }

  /* ══════════════════════════════════════════════════════
     診斷
     ══════════════════════════════════════════════════════ */
  function whereIsTab() {
    var btn = document.getElementById(TAB_ID);
    if (!btn) return { exists: false };
    var prev = btn.previousElementSibling;
    var parent = btn.parentNode;
    var desc = parent
      ? ((parent.id ? '#' + parent.id : '') + (parent.className ? '.' + String(parent.className).split(/\s+/).slice(0, 2).join('.') : ''))
      : '(無父節點)';
    return {
      exists: true,
      parent: desc || (parent ? parent.tagName : '?'),
      prevText: prev ? norm(prev.textContent).slice(0, 14) : '(無)',
      nextText: btn.nextElementSibling ? norm(btn.nextElementSibling.textContent).slice(0, 14) : '(無)',
      siblingCount: parent ? parent.children.length : 0,
      provisional: btn.getAttribute('data-font-provisional') === '1',
      settled: quickOk()
    };
  }

  function timingInfo() {
    return {
      bootAt: Math.round(_bootAt),
      installedAt: _installedAt ? Math.round(_installedAt) : null,
      elapsedMs: _installedAt ? Math.round(_installedAt - _bootAt) : null,
      settled: _settled && quickOk(),
      observer: !!_mo,
      fastPoll: !_fastStop,
      ready: !!window.HY.UIFont.ready,
      state: whereIsTab()
    };
  }

  /* ══════════════════════════════════════════════════════
     監看
     ══════════════════════════════════════════════════════ */
  function startWatchers() {
    /* 1) MutationObserver 掛 documentElement（解析階段即存在）*/
    if (window.MutationObserver && !_mo) {
      try {
        _mo = new MutationObserver(function (muts) {
          // ① 最優先：直接掃 addedNodes（同一幀內命中）
          var found = null;
          for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            if (m.type !== 'childList' || !m.addedNodes || !m.addedNodes.length) continue;
            for (var j = 0; j < m.addedNodes.length; j++) {
              var s = scanNode(m.addedNodes[j]);
              if (s && (!found || s.score < found.score)) found = s;
            }
          }
          if (found && installAt(found)) { trace('Observer 命中：' + found.text); return; }
          // ② 否則排一次便宜檢查
          scheduleCheck();
        });
        _mo.observe(document.documentElement || document, { childList: true, subtree: true });
        trace('MutationObserver 已掛載 documentElement');
      } catch (e) {
        _mo = null;
        trace('MutationObserver 掛載失敗：' + e.message);
      }
    }

    /* 2) 快退輪詢（setTimeout，不受背景分頁 rAF 節流影響）*/
    (function fastPoll() {
      var delay = 12, total = 0;
      function step() {
        if (_fastStop || (_settled && quickOk())) { _fastStop = true; return; }
        try { ensureTab(false); } catch (e) { /* 忽略 */ }
        if (_settled && quickOk()) { _fastStop = true; trace('快退輪詢結束（已就位）'); return; }
        total += delay;
        if (total > 8000) { _fastStop = true; trace('快退輪詢逾時（8s）'); return; }
        delay = Math.min(150, Math.round(delay * 1.22) + 1);
        setTimeout(step, delay);
      }
      setTimeout(step, 0);
    })();

    /* 3) 慢速保險（2.5s）：主介面整批重繪時補回 */
    if (!window.__fontTabTimer) {
      window.__fontTabTimer = setInterval(function () {
        if (!document.getElementById(STYLE_ID)) injectStyles();
        ensureTab(false);
        syncTab();
      }, 2500);
    }

    /* 4) 標準事件 */
    document.addEventListener('DOMContentLoaded', function () { scheduleCheck(); });
    window.addEventListener('load', function () { scheduleCheck(); });
    document.addEventListener('readystatechange', function () { scheduleCheck(); });
    if (window.requestAnimationFrame) {
      requestAnimationFrame(function () { scheduleCheck(); });
    }
  }

  /* ══════════════════════════════════════════════════════
     彈窗
     ══════════════════════════════════════════════════════ */
  function buildModal() {
    if (els) return els;
    if (!document.body) return null;

    var mask = document.createElement('div');
    mask.id = MASK_ID;
    mask.className = 'fm-mask hidden';

    var modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'fm-modal';

    var head = document.createElement('div'); head.className = 'fm-head';
    var title = document.createElement('span'); title.className = 'fm-title'; title.textContent = '🔠 遊戲字體調整';
    var sub = document.createElement('span'); sub.className = 'fm-sub'; sub.textContent = '全域基準 ＋ 各系統面板獨立字級';
    var btns = document.createElement('span'); btns.className = 'fm-headbtns';
    var bReset = document.createElement('button'); bReset.className = 'fm-btn r'; bReset.textContent = '↩️ 全部重設';
    var bDetect = document.createElement('button'); bDetect.className = 'fm-btn b'; bDetect.textContent = '🔍 重新偵測';
    var bMove = document.createElement('button'); bMove.className = 'fm-btn g'; bMove.textContent = '📌 校正標籤位置';
    var bFull = document.createElement('button'); bFull.className = 'fm-btn'; bFull.textContent = '⛶ 全螢幕';
    var bClose = document.createElement('button'); bClose.className = 'fm-btn r'; bClose.textContent = '✕ 關閉';
    btns.appendChild(bReset); btns.appendChild(bDetect); btns.appendChild(bMove);
    btns.appendChild(bFull); btns.appendChild(bClose);
    head.appendChild(title); head.appendChild(sub); head.appendChild(btns);

    var body = document.createElement('div'); body.className = 'fm-body';

    var foot = document.createElement('div'); foot.className = 'fm-foot';
    var hint = document.createElement('span'); hint.className = 'fm-dim';
    hint.textContent = '拖動滑桿即時生效，設定自動儲存（localStorage）。全域基準影響所有 rem 介面；各系統面板各自獨立。';
    foot.appendChild(hint);

    modal.appendChild(head); modal.appendChild(body); modal.appendChild(foot);
    mask.appendChild(modal);
    document.body.appendChild(mask);

    els = { mask: mask, modal: modal, body: body, btnReset: bReset, btnDetect: bDetect, btnMove: bMove, btnFull: bFull, btnClose: bClose };

    bClose.addEventListener('click', function () { closeModal(); });
    bFull.addEventListener('click', function () { modal.classList.toggle('full'); });
    mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });
    bReset.addEventListener('click', function () {
      if (!FS()) { alert('字體系統尚未載入'); return; }
      if (!confirm('確定把所有字級重設為 100%？')) return;
      FS().resetAll(); render();
    });
    bDetect.addEventListener('click', function () { render(); });
    bMove.addEventListener('click', function () {
      var ok = ensureTab(true);
      alert(ok === 'ok' ? '已校正「🔠 字體」標籤位置。' : '找不到錨點，請用 setTabSelector 指定分頁容器後再試。');
      render();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _open) closeModal();
    });

    trace('彈窗預建完成');
    return els;
  }

  function openModal() {
    var e = buildModal();
    if (!e) return false;
    e.mask.classList.remove('hidden');
    _open = true;
    render();
    syncTab();
    if (!FS()) {
      setTimeout(function () { if (_open) render(); }, 60);
      setTimeout(function () { if (_open) render(); }, 300);
    }
    return true;
  }

  function closeModal(silent) {
    if (!els) return false;
    els.mask.classList.add('hidden');
    els.modal.classList.remove('full');
    _open = false;
    syncTab();
    void silent;
    return true;
  }

  function toggleModal() { return _open ? closeModal() : openModal(); }

  function syncTab() {
    var btn = document.getElementById(TAB_ID);
    if (btn) btn.classList.toggle('font-open', _open);
  }

  /* ══════════════════════════════════════════════════════
     渲染
     ══════════════════════════════════════════════════════ */
  function render() {
    if (!els) return;
    var fs = FS();
    if (!fs) {
      els.body.innerHTML = '<div class="fm-dim">字體系統（fontSystem.js）尚未載入，請稍候或檢查 loadOrder.js。</div>';
      return;
    }

    var cfg = fs.cfg();
    var det = fs.detect();
    var html = '';

    html += '<div class="fm-block"><div class="fm-btitle">⚡ 快速預設</div><div class="fm-presets">';
    Object.keys(fs.presets).forEach(function (k) {
      var p = fs.presets[k];
      html += '<button class="fm-btn" data-font="preset" data-fontv="' + k + '">' + p.label +
        '（全域 ' + Math.round(p.global * 100) + '%／面板 ' + Math.round(p.panel * 100) + '%）</button>';
    });
    html += '<button class="fm-btn g" data-font="apply">🔄 重新套用</button>';
    html += '</div><div class="fm-dim" style="margin-top:6px">「小／標準／大／特大」會一次套用到所有項目，之後仍可逐項微調。</div></div>';

    html += '<div class="fm-block"><div class="fm-btitle">🌐 全域基準（影響所有 rem 介面）</div>';
    html += rowHtml('global', cfg.global, det.global);
    html += '</div>';

    html += '<div class="fm-block"><div class="fm-btitle">🧩 各系統面板（獨立字級）</div>' +
      '<div class="fm-dim">面板採用 <b>zoom</b> 縮放；綠框＝選擇器命中，紅框＝未命中（請自訂選擇器）。</div>';
    fs.systems.forEach(function (s) {
      if (s.id === 'global') return;
      html += rowHtml(s.id, cfg[s.id], det[s.id], s);
    });
    html += '</div>';

    var where = whereIsTab();
    var anchors = listAnchors().slice(0, 8);
    html += '<div class="fm-block"><div class="fm-btitle">📌 標籤定位診斷</div>';
    html += '<div class="fm-dim">目前位置：' + (where.exists
      ? '父容器 <b>' + esc(where.parent) + '</b>　前一個標籤「<b>' + esc(where.prevText) + '</b>」　同層共 ' + where.siblingCount + ' 個' +
        (where.provisional ? '　<span class="fm-chip r">臨時位置</span>' : '') +
        (where.settled ? '　<span class="fm-chip g">已就位</span>' : '')
      : '<span class="fm-chip r">尚未插入</span>') + '</div>';
    var t = timingInfo();
    html += '<div class="fm-dim" style="margin-top:4px">安裝耗時：<b>' +
      (t.elapsedMs === null ? '—' : t.elapsedMs + ' ms') + '</b>　Observer：' +
      (t.observer ? '<span class="fm-chip g">啟用</span>' : '<span class="fm-chip r">未啟用</span>') +
      '　快退輪詢：' + (t.fastPoll ? '<span class="fm-chip g">進行中</span>' : '<span class="fm-chip y">已結束</span>') + '</div>';
    html += '<div class="fm-dim" style="margin-top:6px">錨點候選（依評分排序，🎯 為目標）：</div>';
    if (!anchors.length) {
      html += '<div class="fm-dim">找不到任何含「畫面／適應／智慧」等關鍵字的標籤。</div>';
    } else {
      html += '<div class="fm-anchors">';
      anchors.forEach(function (a, i) {
        var isCur = where.exists && where.prevText && a.text === where.prevText;
        html += '<div class="fm-anchor-row' + (i === 0 ? ' best' : '') + (isCur ? ' cur' : '') + '">' +
          '<span class="fm-anchor-txt">' + (i === 0 ? '🎯 ' : (i + 1) + '. ') + esc(a.text) + '</span>' +
          '<span class="fm-anchor-meta">關鍵字「' + esc(a.key) + '」　分數 ' + a.score +
          (isCur ? '　← 目前位置' : '') + '</span></div>';
      });
      html += '</div>';
    }
    html += '<div class="fm-dim" style="margin-top:6px">若目標不對：<code>HY.UIFont.setTabSelector(\'#你的分頁容器\'); HY.UIFont.move()</code></div>';
    html += '</div>';

    html += '<div class="fm-block"><div class="fm-btitle">🧭 安裝時序（最新在上）</div><div class="fm-trace">';
    if (!TRACE.length) html += '<div>（無紀錄）</div>';
    TRACE.slice(0, 20).forEach(function (x) {
      html += '<div>+' + x.t + 'ms　' + esc(x.msg) + '</div>';
    });
    html += '</div></div>';

    html += '<div class="fm-block"><div class="fm-btitle">👁️ 即時預覽</div>' +
      '<div class="fm-preview">' +
      '<div class="p1">好友名單：獨孤求敗　Lv.78　戰力 128,450</div>' +
      '<div class="p2">目前行動：在斷崖絕谷刷怪（4/6 期）</div>' +
      '<div class="p3">好感 82／100　·　洞府 Lv.7 竹林幽居</div>' +
      '</div>' +
      '<div class="fm-dim" style="margin-top:6px">預覽受「全域基準」影響；各系統面板請實際開啟該面板觀察。</div></div>';

    els.body.innerHTML = html;
    bind();
  }

  function rowHtml(id, val, detInfo, sys) {
    var s = sys;
    if (!s) { FS().systems.forEach(function (x) { if (x.id === id) s = x; }); }
    if (!s) return '';
    var v = num(val, 1);
    var pctVal = Math.round(v * 100);
    var hit = detInfo ? !!detInfo.hit : true;
    var cls = 'fm-row' + (s.mode === 'rem' ? '' : (hit ? ' hit' : ' miss'));
    var sel = FS().getSelector(id);
    var matched = detInfo && detInfo.matched && detInfo.matched.length ? detInfo.matched[0] : '';

    var html = '<div class="' + cls + '">';
    html += '<span class="fm-name">' + s.icon + ' ' + esc(s.name) + '</span>';
    if (s.mode === 'rem') {
      html += '<span class="fm-sel">html（rem 基準）</span>';
    } else {
      html += '<span class="fm-sel"><input type="text" data-fontsel="' + id + '" value="' + esc(sel) + '" placeholder="自訂選擇器，例如 #my-panel"></span>';
    }
    html += '<input class="fm-range" type="range" min="' + (FS().min * 100) + '" max="' + (FS().max * 100) + '" step="5" value="' + pctVal + '" data-fontrange="' + id + '">';
    html += '<span class="fm-val" data-fontval="' + id + '">' + pctVal + '%</span>';
    html += '<button class="fm-btn" data-font="reset" data-fontv="' + id + '" title="重設此項">↺</button>';
    if (s.mode === 'rem') html += '<span class="fm-sel"></span>';
    else {
      html += '<span class="fm-sel">' + (hit
        ? '<span class="fm-chip g">命中 ' + esc(matched || '—') + '</span>'
        : '<span class="fm-chip r">未命中</span>') + '</span>';
    }
    html += '</div>';
    if (s.desc) html += '<div class="fm-dim" style="margin:-2px 0 7px 8px">' + esc(s.desc) + '</div>';
    return html;
  }

  /* ══════════════════════════════════════════════════════
     事件
     ══════════════════════════════════════════════════════ */
  function bind() {
    if (!els || els.body._fontBound) return;
    els.body._fontBound = true;

    els.body.addEventListener('input', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var id = t.getAttribute('data-fontrange');
      if (!id || !FS()) return;
      var v = num(t.value, 100) / 100;
      FS().set(id, v);
      var lab = els.body.querySelector('[data-fontval="' + id + '"]');
      if (lab) lab.textContent = Math.round(v * 100) + '%';
    });

    els.body.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var id = t.getAttribute('data-fontsel');
      if (!id || !FS()) return;
      FS().setSelector(id, t.value.trim());
      render();
    });

    els.body.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-font]') : null;
      if (!el || !FS()) return;
      var act = el.getAttribute('data-font');
      var v = el.getAttribute('data-fontv') || '';
      e.preventDefault();
      if (act === 'preset') { FS().preset(v); render(); }
      else if (act === 'reset') { FS().reset(v); render(); }
      else if (act === 'apply') { FS().apply(); render(); }
    });
  }

  /* ══════════════════════════════════════════════════════
     啟動（★ 同步立即執行）
     ══════════════════════════════════════════════════════ */
  function boot() {
    trace('boot 開始（readyState=' + document.readyState + '，body=' + (document.body ? '有' : '無') + '）');
    injectStyles();
    window.HY.UIFont.ready = true;
    try { ensureTab(false); } catch (e) { console.error('[uiFont] 初次安裝失敗：', e); }
    startWatchers();
    trace('watchers 已啟動');
  }

  boot();

  console.log('[uiFont] ✓ 已載入（🔠 字體標籤 + 字體調整面板 v4.1；標籤已停用閃動）');
})();