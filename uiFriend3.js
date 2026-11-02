// js/uiFriend3.js (v5.1)
// ⭐ 好友系統 v3 UI：標籤搬家 + 世界王／洞府／拍賣行／仇敵
//
// 【v5.1 改動】移除標籤閃動動畫（fr3TabPulse）與掃光（fr3-shine），保留框線顏色 + 靜態微光
// 【v5 修正】frBind 改為事件委派（解決「統計設定之後 11 個分頁點擊無反應」）
// 【v4 修正】tick 橋接鎖定 HY.TownSystem.prototype
// 【v3 修正】HY.UIFriend3 檔頭立刻註冊；依賴未就緒改為延遲重試
//
// ⚠️ 載入順序：uiFriend2.js 之後、main.js 之前
window.HY = window.HY || {};

(function () {
  /* ══════════════════════════════════════════════════════
     常數
     ══════════════════════════════════════════════════════ */
  var V3_SUBS = [
    { id: 'wb',      label: '🌍 世界王' },
    { id: 'home',    label: '🏠 洞府家園' },
    { id: 'auction', label: '🏛️ 拍賣行' },
    { id: 'hostile', label: '😈 仇敵' }
  ];
  var V3_IDS = V3_SUBS.map(function (s) { return s.id; });

  var TAB_ID = 'fr3-main-tab';
  var MASK_ID = 'fr3-mask';
  var MODAL_ID = 'fr3-modal';
  var HOLDER_ID = 'fr3-panel-holder';

  var CFG = {
    TAB_IN_TOWN: false,
    AUTO_INSTALL_MS: 1500,
    RETRY_MS: 250,
    RETRY_MAX: 80
  };

  /* ══════════════════════════════════════════════════════
     ★★★ 立刻註冊 global（必須在任何 return 之前）★★★
     ══════════════════════════════════════════════════════ */
  window.HY.UIFriend3 = {
    version: '5.1',
    ready: false,
    subs: V3_SUBS.length,
    tabId: TAB_ID,
    modalId: MODAL_ID,
    config: CFG,
    install: function () { return tryInit(true); },
    setTabSelector: function (sel) { tabContainerSel = sel; return sel; },
    open: function () { var c = getCtl(); return c ? c.openFriendModal() : false; },
    close: function () { var c = getCtl(); return c ? c.closeFriendModal() : false; },
    ctl: function () { return getCtl(); },
    tickBridge: function () { return installTickBridge(false); },
    tickNow: function () { return runV3Ticks(window.HY.game && window.HY.game.townSys); },
    deps: function () { return depStatus(); },
    redraw: function () { var c = getCtl(); if (c && c._frOpen) c.renderFriendPanel(); return true; },
    /** 診斷用：列出目前面板上所有子分頁按鈕與其是否可點 */
    auditSubs: function () {
      var c = getCtl();
      var panel = c && c.el && c.el.panels && c.el.panels.friend;
      if (!panel) return 'panel not ready';
      var out = [];
      panel.querySelectorAll('[data-frsub]').forEach(function (b) {
        out.push(b.getAttribute('data-frsub') + (b.classList.contains('on') ? ' (active)' : ''));
      });
      return { delegated: !!panel._frDelegated, count: out.length, subs: out };
    }
  };

  /* ══════════════════════════════════════════════════════
     模組狀態
     ══════════════════════════════════════════════════════ */
  var proto = null;
  var inited = false;
  var tries = 0;
  var retryTimer = null;
  var _v3Timer = null;
  var tabContainerSel = null;
  var _ctl = null;

  /* ══════════════════════════════════════════════════════
     工具
     ══════════════════════════════════════════════════════ */
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function esc(s) { return String(s == null ? '' : s); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function ago(t) {
    if (!t) return '';
    var d = new Date(t);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
  }
  function townProto() { return (window.HY.TownSystem && window.HY.TownSystem.prototype) || null; }

  /* ══════════════════════════════════════════════════════
     依賴診斷
     ══════════════════════════════════════════════════════ */
  function fnExists(name) {
    var P = townProto();
    return !!(P && typeof P[name] === 'function');
  }

  function depStatus() {
    var T = window.HY.Data && window.HY.Data.TOWN;
    var F = T && T.FRIEND;
    var out = {
      UITown:        !!(window.HY.UITown && window.HY.UITown.prototype),
      TownSystem:    !!townProto(),
      FriendData3:   !!window.HY.FriendData3,
      TOWN_FRIEND:   !!F,
      CONFIG3:       !!(F && F.CONFIG3),
      friendReport:  fnExists('friendReport'),
      friendTick:    fnExists('friendTick'),
      fr2TickOnce:   fnExists('fr2TickOnce'),
      fr3HosTick:    fnExists('fr3HosTick'),
      fr3WbTick:     fnExists('fr3WbTick'),
      fr3HomeTick:   fnExists('fr3HomeTick'),
      fr3AucTick:    fnExists('fr3AucTick'),
      FriendCeleb:   fnExists('fr3CelebLv'),
      FriendHostile: fnExists('fr3HosReport'),
      FriendWorldBoss: fnExists('fr3WbReport'),
      FriendHome:    fnExists('fr3HomeReport'),
      FriendAuction: fnExists('fr3AucReport'),
      tickBridged:   !!(townProto() && townProto().__fr3TickBridged),
      game:          !!(window.HY.game && window.HY.game.townSys)
    };
    out.ok = out.UITown && out.CONFIG3 && out.friendReport;
    return out;
  }

  /* ══════════════════════════════════════════════════════
     樣式（v5.1：已停用閃動，保留框線 + 靜態微光）
     ══════════════════════════════════════════════════════ */
  function injectStyles3() {
    if (document.getElementById('friend-style3')) return;

    try { if (window.HY.UIFriend && typeof window.HY.UIFriend.injectStyles === 'function') window.HY.UIFriend.injectStyles(); } catch (e) { /* 忽略 */ }
    try { if (window.HY.UIFriend2 && typeof window.HY.UIFriend2.injectStyles2 === 'function') window.HY.UIFriend2.injectStyles2(); } catch (e) { /* 忽略 */ }

    var css = `
/* ══════════ 🤝 好友標籤（框線 + 靜態微光；v5.1 已移除閃動）══════════ */
#${TAB_ID} {
  position: relative !important;
  overflow: hidden !important;
  font-weight: 800 !important;
  letter-spacing: .5px !important;
  color: #d1fae5 !important;
  border: 2px solid #34d399 !important;
  border-radius: 7px !important;
  background: linear-gradient(180deg, rgba(52,211,153,.32), rgba(16,185,129,.10)) !important;
  text-shadow: 0 0 6px rgba(110,231,183,.95), 0 0 13px rgba(52,211,153,.65) !important;
  animation: none !important;                                     /* v5.1：不再閃動 */
  box-shadow: 0 0 9px rgba(52,211,153,.40), inset 0 0 7px rgba(52,211,153,.14) !important;  /* v5.1：靜態微光 */
  transition: transform .15s ease, filter .15s ease !important;
  z-index: 20 !important;
}
#${TAB_ID}:hover {
  transform: translateY(-2px) scale(1.05) !important;
  filter: brightness(1.55) !important;
}
#${TAB_ID}.fr3-open {
  color: #ffffff !important;
  border-color: #ffffff !important;
  background: rgba(52,211,153,.52) !important;
  box-shadow: 0 0 16px rgba(52,211,153,.80), inset 0 0 11px rgba(255,255,255,.28) !important;
}
/* v5.1：掃光元素停用 */
#${TAB_ID} .fr3-shine {
  display: none !important;
}
#${TAB_ID} .fr3-badge {
  display:inline-block; margin-left:5px; background:#ef4444; color:#fff;
  border-radius:9px; font-size:.66rem; padding:0 5px; min-width:16px;
  text-align:center; line-height:16px; font-weight:bold; vertical-align:1px;
  position: relative; z-index: 2;
}

/* ══════════ v3 卡片 ══════════ */
.fr3-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:10px; }
.fr3-card { background:#131b26; border:1px solid #2e3b4e; border-radius:6px; padding:9px 10px; display:flex; flex-direction:column; gap:6px; }
.fr3-card:hover { border-color:#34d399; }
.fr3-card.boss { border-color:#ef4444; background:#1d1214; }
.fr3-card.raid { border-color:#fbbf24; background:#1c1a10; }
.fr3-card.ok { border-color:#10b981; }
.fr3-card.merc { border-color:#a78bfa; background:#171325; }
.fr3-head { display:flex; justify-content:space-between; align-items:baseline; gap:6px; }
.fr3-name { font-size:.88rem; font-weight:bold; }
.fr3-meta { font-size:.72rem; color:#94a3b8; white-space:nowrap; }
.fr3-chips { display:flex; gap:5px; flex-wrap:wrap; align-items:center; }
.fr3-chip { font-size:.68rem; padding:1px 7px; border-radius:9px; border:1px solid #2e3b4e; color:#94a3b8; background:#0f1720; }
.fr3-chip.g { border-color:#10b981; color:#6ee7b7; }
.fr3-chip.b { border-color:#00e5ff; color:#67e8f9; }
.fr3-chip.r { border-color:#ef4444; color:#fca5a5; }
.fr3-chip.y { border-color:#fbbf24; color:#fcd34d; }
.fr3-chip.p { border-color:#f472b6; color:#f9a8d4; }
.fr3-chip.v { border-color:#a78bfa; color:#c4b5fd; }
.fr3-chip.n { border-color:#c98a4b; color:#e7c08a; }
.fr3-bar { height:7px; background:#0d1219; border:1px solid #334155; border-radius:3px; overflow:hidden; }
.fr3-bar > div { height:100%; background:linear-gradient(90deg,#0f766e,#34d399); }
.fr3-bar.boss > div { background:linear-gradient(90deg,#7f1d1d,#ef4444); }
.fr3-bar.y > div { background:linear-gradient(90deg,#b78a3f,#fbbf24); }
.fr3-bar.v > div { background:linear-gradient(90deg,#5b21b6,#a78bfa); }
.fr3-dim { font-size:.71rem; color:#94a3b8; line-height:1.5; }
.fr3-note { font-size:.72rem; color:#7dd3fc; line-height:1.5; }
.fr3-row { display:flex; justify-content:space-between; align-items:center; gap:8px; background:#121822; border:1px solid #2e3b4e; border-radius:4px; padding:5px 8px; font-size:.77rem; margin-bottom:4px; }
.fr3-row:hover { border-color:#c89d54; }
.fr3-row.me { border-color:#fbbf24; background:#1c1a10; }
.fr3-btn { background:#2b394a; color:#6ee7b7; border:1px solid #34d399; border-radius:3px; padding:2px 8px; font-size:.72rem; cursor:pointer; }
.fr3-btn:hover { background:#3a4a5e; }
.fr3-btn:disabled { opacity:.35; cursor:not-allowed; }
.fr3-btn.r { border-color:#ef4444; color:#fca5a5; }
.fr3-btn.y { border-color:#fbbf24; color:#fcd34d; }
.fr3-btn.v { border-color:#a78bfa; color:#c4b5fd; }
.fr3-log { font-size:.75rem; line-height:1.5; border-left:2px solid #2e3b4e; padding-left:7px; color:#cbd5e1; margin-bottom:3px; }
.fr3-log.ok { border-color:#10b981; } .fr3-log.no { border-color:#ef4444; } .fr3-log.w { border-color:#fbbf24; }
.fr3-logs { display:flex; flex-direction:column; gap:3px; max-height:260px; overflow-y:auto; }
.fr3-medal { width:22px; text-align:center; color:#94a3b8; font-weight:bold; }
.fr3-two { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
@media (max-width:940px){ .fr3-two { grid-template-columns:1fr; } }
.fr3-fallback .fr-mask { position:fixed; inset:0; z-index:9600; background:rgba(2,6,12,.72); display:flex; align-items:center; justify-content:center; padding:16px; }
.fr3-fallback .fr-mask.hidden { display:none !important; }
.fr3-fallback .fr-modal { width:66.67vw; height:66.67vh; min-width:680px; min-height:460px; max-width:96vw; max-height:92vh; display:flex; flex-direction:column; background:#0f141c; border:2px solid #34d399; border-radius:10px; overflow:hidden; }
.fr3-fallback .fr-modal.full { width:96vw; height:92vh; }
.fr3-fallback .fr-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 14px; background:linear-gradient(90deg,#1b2432,#16302a); border-bottom:1px solid #34d399; }
.fr3-fallback .fr-title { font-size:1.08rem; font-weight:bold; color:#6ee7b7; }
.fr3-fallback .fr-sub { font-size:.74rem; color:#94a3b8; }
.fr3-fallback .fr-headbtns { margin-left:auto; display:flex; gap:8px; }
.fr3-fallback .fr-body { flex:1 1 auto; overflow-y:auto; padding:12px 14px; }
.fr3-fallback .fr-foot { padding:7px 14px; font-size:.74rem; color:#94a3b8; background:#131b26; border-top:1px solid #2e3b4e; }
.fr3-fallback .fr-subs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; padding-bottom:8px; border-bottom:1px dashed #2e3b4e; }
.fr3-fallback .fr-sub { background:#0f1720; color:#94a3b8; border:1px solid #2e3b4e; padding:5px 13px; border-radius:14px; cursor:pointer; font-size:.79rem; }
.fr3-fallback .fr-sub.on { color:#34d399; border-color:#34d399; background:rgba(52,211,153,.12); font-weight:bold; }
.fr3-fallback .fr-block { background:#131b26; border:1px solid #2e3b4e; border-radius:6px; padding:9px 11px; margin-bottom:8px; }
.fr3-fallback .fr-btitle { font-size:.85rem; font-weight:bold; color:#6ee7b7; margin-bottom:6px; }
.fr3-fallback .fr-hero { background:linear-gradient(90deg,#1b2432,#16302a); border:1px solid #34d399; border-radius:6px; padding:9px 12px; margin-bottom:10px; }
.fr3-fallback .fr-hero h3 { color:#6ee7b7; font-size:.95rem; margin:0 0 6px; }
.fr3-fallback .fr-rows { display:flex; gap:13px; flex-wrap:wrap; font-size:.79rem; margin-bottom:3px; }
.fr3-fallback .fr-rows b { color:#e2e8f0; }
.fr3-fallback .fr-empty { font-size:.79rem; color:#94a3b8; line-height:1.6; padding:8px 0; }
.fr3-fallback .fr-btns { display:flex; gap:5px; flex-wrap:wrap; }
.fr3-fallback .fr-dim { font-size:.71rem; color:#94a3b8; line-height:1.5; }
.fr3-fallback .fr-note { font-size:.71rem; color:#7dd3fc; line-height:1.45; }
`;
    var st = document.createElement('style');
    st.id = 'friend-style3';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);

    if (!document.getElementById('friend-style')) document.documentElement.classList.add('fr3-fallback');
    else document.documentElement.classList.remove('fr3-fallback');
  }

  /* ══════════════════════════════════════════════════════
     v3 tick 橋接（鎖定 TownSystem.prototype）
     ══════════════════════════════════════════════════════ */
  function runV3Ticks(t) {
    if (!t) return false;
    if (t.__fr3Ticking) return false;
    t.__fr3Ticking = true;
    try {
      try { if (typeof t.fr3HosTick === 'function') t.fr3HosTick(); }
      catch (e) { console.error('[uiFriend3] 仇敵 tick 失敗：', e); }
      try { if (typeof t.fr3WbTick === 'function') t.fr3WbTick(); }
      catch (e) { console.error('[uiFriend3] 世界王 tick 失敗：', e); }
      try { if (typeof t.fr3HomeTick === 'function') t.fr3HomeTick(); }
      catch (e) { console.error('[uiFriend3] 洞府 tick 失敗：', e); }
      try { if (typeof t.fr3AucTick === 'function') t.fr3AucTick(); }
      catch (e) { console.error('[uiFriend3] 拍賣行 tick 失敗：', e); }
    } finally {
      t.__fr3Ticking = false;
    }
    return true;
  }

  function startV3FallbackTimer() {
    if (_v3Timer) return;
    var ms = 3000;
    try { ms = num(window.HY.Data.TOWN.FRIEND.CONFIG.TICK_MS, 3000); } catch (e) { /* 忽略 */ }
    ms = Math.max(1000, ms);

    _v3Timer = setInterval(function () {
      if (installTickBridge(true)) {
        clearInterval(_v3Timer);
        _v3Timer = null;
        console.log('[uiFriend3] ✓ v3 事件橋接已補上，停用後備計時器');
        return;
      }
      var t = window.HY.game && window.HY.game.townSys;
      if (t) runV3Ticks(t);
    }, ms);

    console.log('[uiFriend3] ⏱ 已啟用後備計時器（每 ' + (ms / 1000) + ' 秒推進 v3 事件）');
  }

  function installTickBridge(quiet) {
    var TP = townProto();
    if (!TP) {
      if (!quiet) console.warn('[uiFriend3] ⚠️ 找不到 HY.TownSystem.prototype，無法橋接 v3 事件');
      return false;
    }
    if (TP.__fr3TickBridged) return true;

    var wrapped = false;

    if (typeof TP.fr2TickOnce === 'function') {
      var origOnce = TP.fr2TickOnce;
      TP.fr2TickOnce = function () {
        var r = origOnce.apply(this, arguments);
        runV3Ticks(this);
        return r;
      };
      wrapped = true;
      if (!quiet) console.log('[uiFriend3] ✓ v3 事件已接入 fr2TickOnce（TownSystem.prototype）');
    }

    if (!wrapped && typeof TP.friendTick === 'function') {
      var origTick = TP.friendTick;
      TP.friendTick = function () {
        var before = 0;
        try { before = num(this.friendState().ticks, 0); } catch (e) { /* 忽略 */ }
        var r = origTick.apply(this, arguments);
        var after = before;
        try { after = num(this.friendState().ticks, 0); } catch (e) { /* 忽略 */ }
        if (after > before) runV3Ticks(this);
        return r;
      };
      wrapped = true;
      if (!quiet) console.log('[uiFriend3] ✓ v3 事件已接入 friendTick（後備路徑）');
    }

    if (!wrapped) {
      if (!quiet) {
        console.warn('[uiFriend3] ⚠️ fr2TickOnce 與 friendTick 都不存在 —— 可能 friendPartySystem.js / friendSystem.js 未載入。');
        console.warn('[uiFriend3] 缺少的依賴：', depStatus());
      }
      return false;
    }

    TP.__fr3TickBridged = true;
    return true;
  }

  /* ══════════════════════════════════════════════════════
     ① 標籤搬家
     ══════════════════════════════════════════════════════ */
  function findTabAnchor() {
    var containers = [];
    if (tabContainerSel) {
      var one = document.querySelector(tabContainerSel);
      if (one) containers.push(one);
    }
    ['#main-tabs', '.main-tabs', '#tabs', '.tabs', '#tab-bar', '.tab-bar', '.top-tabs', '.nav-tabs',
     '.app-tabs', '.ui-tabs', 'header', '.header', '#app-header', '.main-nav', '.nav'].forEach(function (s) {
      var el = document.querySelector(s);
      if (el && containers.indexOf(el) === -1) containers.push(el);
    });
    containers.push(document.body);

    for (var i = 0; i < containers.length; i++) {
      var c = containers[i];
      var btns = c.querySelectorAll('button, .tab, .tab-btn, .nav-item, a[data-tab], [data-tab]');
      for (var j = 0; j < btns.length; j++) {
        var b = btns[j];
        if (b.id === TAB_ID) continue;
        var t = (b.textContent || '').replace(/\s+/g, '');
        if (t.indexOf('角色') !== -1 && (t.indexOf('隊伍') !== -1 || t.indexOf('陣法') !== -1 || t.length <= 8)) return b;
      }
    }
    var all = document.body.querySelectorAll('button, .tab, .tab-btn, a, li, div');
    for (var k = 0; k < all.length; k++) {
      var e = all[k];
      if (e.id === TAB_ID) continue;
      if (e.children.length > 3) continue;
      var tx = (e.textContent || '').replace(/\s+/g, '');
      if (tx.indexOf('角色') !== -1 && tx.length <= 12) return e;
    }
    return null;
  }

  function installTab() {
    if (document.getElementById(TAB_ID)) return true;
    var anchor = findTabAnchor();
    if (!anchor || !anchor.parentNode) return false;

    var btn = anchor.cloneNode(true);
    btn.id = TAB_ID;

    // 移除所有 tab 相關屬性，避免原生委派把它當成「角色&隊伍」
    ['data-tab', 'data-tabid', 'data-target', 'data-view', 'data-page', 'href'].forEach(function (a) {
      btn.removeAttribute(a);
    });
    btn.querySelectorAll('[data-tab],[data-tabid],[data-target],[data-view],[data-page]').forEach(function (n) {
      ['data-tab', 'data-tabid', 'data-target', 'data-view', 'data-page'].forEach(function (a) { n.removeAttribute(a); });
    });
    // 移除「已選中」類別，避免看起來像當前分頁
    ['active', 'on', 'selected', 'current', 'is-active', 'tab-active'].forEach(function (c) {
      btn.classList.remove(c);
    });

    btn.textContent = '🤝 好友';
    btn.title = '江湖好友（名人好友・世界王・洞府・拍賣行・仇敵）';

    // v5.1：不再建立掃光元素（保留程式碼位置以便日後還原，實際不 append）
    // var shine = document.createElement('span');
    // shine.className = 'fr3-shine';
    // btn.appendChild(shine);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var ctl = getCtl();
      if (!ctl) { console.warn('[uiFriend3] 好友系統尚未就緒'); return; }
      if (ctl._frOpen) ctl.closeFriendModal();
      else ctl.openFriendModal();
      updateTabBadge();
    }, true);

    anchor.parentNode.insertBefore(btn, anchor.nextSibling);

    var parent = btn.parentNode;
    if (parent && !parent.__fr3CloseBound) {
      parent.__fr3CloseBound = true;
      parent.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('#' + TAB_ID)) return;
        var ctl = getCtl();
        if (ctl && ctl._frOpen) ctl.closeFriendModal(true);
      }, false);
    }
    console.log('[uiFriend3] ✓ 「🤝 好友」標籤已插入到「' + (anchor.textContent || '').replace(/\s+/g, '') + '」旁邊');
    return true;
  }

  function removeTownTab() {
    if (CFG.TAB_IN_TOWN) return;
    document.querySelectorAll('.town-tab-btn[data-ttab="friend"]').forEach(function (b) {
      if (b.parentNode) b.parentNode.removeChild(b);
    });
  }

  function updateTabBadge() {
    var btn = document.getElementById(TAB_ID);
    if (!btn) return;
    var ctl = getCtl();
    var n = 0, tip = [];
    if (ctl && ctl.town) {
      var TS = ctl.town;
      try { var f = TS.friendFollowers().length; n += f; if (f) tip.push('同行 ' + f); } catch (e) { /* 忽略 */ }
      try { var m = TS.fr2MailUnread(); n += m; if (m) tip.push('待領信 ' + m); } catch (e) { /* 忽略 */ }
      try { var r = TS.fr2RescueState().active.length; n += r * 2; if (r) tip.push('求救 ' + r); } catch (e) { /* 忽略 */ }
      try { if (TS.fr3WbActive && TS.fr3WbActive()) { n += 3; tip.push('世界王'); } } catch (e) { /* 忽略 */ }
      try { var hr = TS.fr3HosState().list.filter(function (x) { return num(x.raidLeft, 0) > 0; }).length; n += hr * 2; if (hr) tip.push('打劫迫近 ' + hr); } catch (e) { /* 忽略 */ }
      try { var au = TS.fr3AucState().consign.length; if (au) tip.push('代售中 ' + au); } catch (e) { /* 忽略 */ }
    }
    var badge = btn.querySelector('.fr3-badge');
    if (n > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'fr3-badge'; btn.appendChild(badge); }
      if (badge.textContent !== String(n)) badge.textContent = String(n);
    } else if (badge && badge.parentNode) badge.parentNode.removeChild(badge);

    btn.classList.toggle('fr3-open', !!(ctl && ctl._frOpen));
    btn.title = tip.length ? ('江湖好友 —— ' + tip.join('｜')) : '江湖好友';
  }

  /* ══════════════════════════════════════════════════════
     ② 獨立 modal controller
     ══════════════════════════════════════════════════════ */
  function buildModalDom() {
    var mask = document.createElement('div');
    mask.id = MASK_ID;
    mask.className = 'fr-mask hidden';
    var modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'fr-modal';

    var head = document.createElement('div'); head.className = 'fr-head';
    var title = document.createElement('span'); title.className = 'fr-title'; title.textContent = '🤝 江湖好友';
    var sub = document.createElement('span'); sub.className = 'fr-sub';
    sub.textContent = '名人好友 · 世界王 · 洞府家園 · 拍賣行 · 仇敵';
    var btns = document.createElement('span'); btns.className = 'fr-headbtns';
    var bR = document.createElement('button'); bR.className = 'sys-btn'; bR.textContent = '🔄 重新整理';
    var bF = document.createElement('button'); bF.className = 'sys-btn'; bF.textContent = '⛶ 全螢幕';
    var bC = document.createElement('button'); bC.className = 'sys-btn danger'; bC.textContent = '✕ 關閉';
    btns.appendChild(bR); btns.appendChild(bF); btns.appendChild(bC);
    head.appendChild(title); head.appendChild(sub); head.appendChild(btns);

    var body = document.createElement('div'); body.className = 'fr-body';
    var foot = document.createElement('div'); foot.className = 'fr-foot';
    var hint = document.createElement('span'); hint.className = 'fr-note';
    hint.textContent = '好友會自己刷怪、練等、打裝備、入門派、學技能、點潛能、組隊出團；開啟「同行」即加入你的戰鬥隊伍。';
    var foot2 = document.createElement('span'); foot2.className = 'fr-dim';
    foot2.textContent = '按 Esc 或點視窗外的暗色區域可關閉';
    foot.appendChild(hint); foot.appendChild(foot2);

    modal.appendChild(head); modal.appendChild(body); modal.appendChild(foot);
    mask.appendChild(modal);
    document.body.appendChild(mask);

    return { mask: mask, modal: modal, body: body, title: title, sub: sub, hint: hint, btnRefresh: bR, btnFull: bF, btnClose: bC };
  }

  function getCtl() {
    if (!proto) return null;
    if (_ctl) {
      var t0 = window.HY.game && window.HY.game.townSys;
      if (t0) _ctl.town = t0;
      return _ctl;
    }
    var TS = window.HY.game && window.HY.game.townSys;
    if (!TS) return null;
    if (!document.body) return null;

    injectStyles3();

    var holder = document.getElementById(HOLDER_ID);
    if (!holder) {
      holder = document.createElement('div');
      holder.id = HOLDER_ID;
      holder.style.display = 'none';
      document.body.appendChild(holder);
    }
    var panel = document.getElementById('town-panel-friend');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'town-panel-friend';
      panel.className = 'town-tabpanel';
      holder.appendChild(panel);
    }
    panel._frHome = holder;

    var ctl = Object.create(proto);
    ctl.town = TS;
    ctl.el = { panels: { friend: panel }, root: null };
    ctl.frSub = 'roster';
    ctl.frSel = null;
    ctl.fr2Board = 'fame';
    ctl._frEls = buildModalDom();
    ctl._frOpen = false;

    ctl._frEls.mask.addEventListener('click', function (e) { if (e.target === ctl._frEls.mask) ctl.closeFriendModal(); });
    ctl._frEls.btnRefresh.addEventListener('click', function () { ctl.renderFriendPanel(); });
    ctl._frEls.btnFull.addEventListener('click', function () { ctl._frEls.modal.classList.toggle('full'); });
    ctl._frEls.btnClose.addEventListener('click', function () { ctl.closeFriendModal(); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ctl._frOpen) ctl.closeFriendModal();
    });

    _ctl = ctl;
    console.log('[uiFriend3] ✓ 好友視窗（獨立 controller）已建立');
    return ctl;
  }

  /* ══════════════════════════════════════════════════════
     ③ 分頁列
     ══════════════════════════════════════════════════════ */
  function patchSubBar(panel, active) {
    if (!panel) return;
    var bar = panel.querySelector('.fr-subs');
    if (!bar) return;
    if (bar.getAttribute('data-fr3full') === '1') {
      bar.querySelectorAll('[data-frsub]').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-frsub') === active);
      });
      return;
    }
    bar.setAttribute('data-fr3full', '1');
    V3_SUBS.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'fr-sub' + (s.id === active ? ' on' : '');
      b.setAttribute('data-frsub', s.id);
      b.textContent = s.label;
      bar.appendChild(b);
    });
  }

  function subBarFull(active) {
    var subs = [
      { id: 'roster', label: '👥 好友名單' }, { id: 'team', label: '🚩 組隊同行' },
      { id: 'feed', label: '📡 好友動態' }, { id: 'social', label: '💬 互動' },
      { id: 'codex', label: '📖 名人圖鑑' }, { id: 'stat', label: '📊 統計與設定' },
      { id: 'exp', label: '🏰 出團遠征' }, { id: 'rank', label: '🏆 排行榜' },
      { id: 'bond', label: '💞 羈絆關係' }, { id: 'title', label: '🎖️ 稱號成就' },
      { id: 'mail', label: '✉️ 書信' }, { id: 'quest', label: '🎯 互助任務' },
      { id: 'tourney', label: '🎪 比武大會' }
    ].concat(V3_SUBS);
    var html = '<div class="fr-subs">';
    subs.forEach(function (s) {
      html += '<button class="fr-sub' + (s.id === active ? ' on' : '') + '" data-frsub="' + s.id + '">' + s.label + '</button>';
    });
    return html + '</div>';
  }

  /* ══════════════════════════════════════════════════════
     ④ 掛載到 UITown.prototype
     ══════════════════════════════════════════════════════ */
  function patchProto() {
    if (proto.__fr3Patched) return;
    proto.__fr3Patched = true;

    /* ─────────────────────────────────────────────────
       ★ v5 核心修正：把 frBind 改寫為「事件委派」
       原本 uiFriend.js 的 frBind 是逐元素綁定，只綁當下存在的按鈕；
       v2(7) + v3(4) 的分頁按鈕是在 frBind 之後才 append → 沒有監聽。
       改為委派後，任何時候 append 的 [data-frsub] 都會生效。
       ───────────────────────────────────────────────── */
    proto.frBind = function (panel) {
      if (!panel || panel._frDelegated) return;
      panel._frDelegated = true;
      var self = this;
      var TS = this.town;
      function refresh() { self.renderFriendPanel(); }

      panel.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var el, p;

        // ── 子分頁（v1 + v2 + v3 全部走這裡）──
        el = t.closest('[data-frsub]');
        if (el) { e.preventDefault(); self.frSetSub(el.getAttribute('data-frsub')); return; }

        // ── 好友卡片展開 ──
        el = t.closest('[data-frsel]');
        if (el) { e.preventDefault(); self.frSelect(el.getAttribute('data-frsel')); return; }

        // ── 同行 ──
        el = t.closest('[data-frfollow]');
        if (el) { e.preventDefault(); if (TS.friendFollow(el.getAttribute('data-frfollow'))) refresh(); return; }

        el = t.closest('[data-frfollowall]');
        if (el) {
          e.preventDefault();
          var n = TS.friendFollowAll();
          if (n === 0) alert('沒有可同行的好友（名額已滿或好友正在養傷）。');
          refresh(); return;
        }

        el = t.closest('[data-frunfollow]');
        if (el) { e.preventDefault(); TS.friendUnfollowAll(); refresh(); return; }

        // ── 互動 ──
        el = t.closest('[data-frgift]');
        if (el) { e.preventDefault(); if (TS.friendGift(el.getAttribute('data-frgift'))) refresh(); return; }

        el = t.closest('[data-frspar]');
        if (el) { e.preventDefault(); if (TS.friendSpar(el.getAttribute('data-frspar'))) refresh(); return; }

        el = t.closest('[data-frtalk]');
        if (el) { e.preventDefault(); if (TS.friendTalk(el.getAttribute('data-frtalk'))) refresh(); return; }

        // ── 裝備 ──
        el = t.closest('[data-frgive]');
        if (el) {
          e.preventDefault();
          p = el.getAttribute('data-frgive').split('|');
          if (TS.friendGiveEquip(p[0], parseInt(p[1], 10))) refresh();
          return;
        }

        el = t.closest('[data-frtake]');
        if (el) {
          e.preventDefault();
          p = el.getAttribute('data-frtake').split('|');
          if (TS.friendTakeLoot(p[0], parseInt(p[1], 10))) refresh();
          return;
        }

        // ── 斷交 ──
        el = t.closest('[data-frdismiss]');
        if (el) {
          e.preventDefault();
          var id = el.getAttribute('data-frdismiss');
          var f = TS.friendById(id);
          if (!f) return;
          var warn = (num(f.favor, 0) <= 40)
            ? '\n\n⚠️ 此人好感偏低，斷交可能導致他記恨在心、成為你的仇敵！'
            : '';
          if (confirm('確定與【' + f.name + '】斷交？\n他身上的裝備與背包物品會全部回到你的行囊。' + warn)) {
            if (TS.friendDismiss(id)) { self.frSel = null; refresh(); }
          }
          return;
        }

        // ── 結交 ──
        el = t.closest('[data-frrecruit]');
        if (el) {
          e.preventDefault();
          p = el.getAttribute('data-frrecruit').split('|');
          var cand = { id: p[0], name: p[1], lv: parseInt(p[2], 10) };
          var cost = TS.friendRecruitCost(cand);
          if (!confirm('確定花 ' + cost.toLocaleString() + ' 兩與【' + cand.name + '】結為好友？')) return;
          if (TS.friendRecruit(cand)) { self.frSub = 'roster'; refresh(); }
          return;
        }

        // ── 自動行為開關 ──
        el = t.closest('[data-frautoall]');
        if (el) { e.preventDefault(); TS.friendToggleAutoAll(el.getAttribute('data-frautoall') === '1'); refresh(); return; }

        el = t.closest('[data-frauto]');
        if (el) { e.preventDefault(); TS.friendToggleAuto(el.getAttribute('data-frauto')); refresh(); return; }
      });
    };

    /* ── 主渲染 ── */
    var _renderFriendPanel = proto.renderFriendPanel;
    proto.renderFriendPanel = function () {
      if (V3_IDS.indexOf(this.frSub) !== -1) { this.fr3RenderPanel(); return; }
      _renderFriendPanel.call(this);
      var panel = this.el && this.el.panels && this.el.panels.friend;
      if (panel) { try { injectStyles3(); patchSubBar(panel, this.frSub); this.fr3Bind(panel); } catch (e) { /* 忽略 */ } }
    };

    proto.fr3RenderPanel = function () {
      var panel = this.el && this.el.panels && this.el.panels.friend;
      if (!panel) return;
      var TS = this.town;
      if (!TS) { panel.innerHTML = '<div class="fr-empty">好友系統未載入。</div>'; return; }
      injectStyles3();

      var rep = null;
      try { rep = TS.friendReport ? TS.friendReport() : null; } catch (e) { rep = null; }

      var html = '';
      try { if (rep) html += this.frHeaderHtml(rep); } catch (e) { /* 忽略 */ }
      html += subBarFull(this.frSub);

      var sub = this.frSub;
      try {
        if (sub === 'wb') html += this.fr3WbHtml(rep);
        else if (sub === 'home') html += this.fr3HomeHtml(rep);
        else if (sub === 'auction') html += this.fr3AucHtml(rep);
        else if (sub === 'hostile') html += this.fr3HosHtml(rep);
        else html += '<div class="fr-empty">未知分頁。</div>';
      } catch (e) {
        html += '<div class="fr-empty">渲染失敗：' + esc(e.message) + '</div>';
        console.error('[uiFriend3] 渲染失敗：', e);
      }

      panel.innerHTML = html;
      try { if (this.frBind) this.frBind(panel); } catch (e) { /* 忽略 */ }
      this.fr3Bind(panel);
    };

    /* ── 🌍 世界王 ── */
    proto.fr3WbHtml = function (rep) {
      var TS = this.town;
      if (!TS.fr3WbReport) return '<div class="fr-empty">世界王系統未載入。</div>';
      var W = TS.fr3WbReport();
      var html = '';

      if (W.pendingRaid > 0) {
        html += '<div class="fr3-card raid" style="margin-bottom:8px">' +
          '<div class="fr3-head"><span class="fr3-name">💀 世界王餘威未消</span><span class="fr3-meta">剩 ' + W.pendingRaid + ' 期</span></div>' +
          '<div class="fr3-bar y"><div style="width:' + Math.round(W.pendingRaid / 6 * 100) + '%"></div></div>' +
          '<div class="fr3-note">上次討伐失敗，它將在倒數結束時洗劫小鎮（損失約 5% 紋銀）。再次集結討伐可化解。</div></div>';
      }

      if (W.active) {
        var a = W.active;
        html += '<div class="fr3-card boss"><div class="fr3-head">' +
          '<span class="fr3-name">' + a.icon + ' ' + esc(a.name) + '</span>' +
          '<span class="fr3-meta">階段 ' + a.phase + '／第 ' + a.turns + '/' + a.enrage + ' 期</span></div>';
        html += '<div class="fr3-dim">' + esc(a.title || '') + '</div>';
        html += '<div class="fr3-bar boss"><div style="width:' + a.hpPct + '%"></div></div>';
        html += '<div class="fr3-dim">氣血 ' + fmt(a.hp) + ' / ' + fmt(a.maxHp) + '（' + a.hpPct + '%）</div>';
        html += '<div class="fr3-chips">' +
          '<span class="fr3-chip r">隊伍戰力 ' + fmt(a.teamPower) + '</span>' +
          '<span class="fr3-chip y">默契 ' + a.synergy + '%</span>' +
          '<span class="fr3-chip b">' + a.rank.length + ' 人上榜</span>' +
          (a.includePlayer ? '<span class="fr3-chip g">你親自出戰</span>' : '') +
          '</div>';
        html += '<div class="fr3-dim">出戰：' + a.members.map(function (m) {
          return m.icon + m.name + (m.injured ? '(傷)' : '');
        }).concat(a.mercs.map(function (m) { return m.icon + m.name + '(助拳)'; })).join('、') + '</div>';

        if (a.rank.length) {
          html += '<div class="fr3-dim">貢獻排行：</div>';
          a.rank.slice(0, 6).forEach(function (r, i) {
            var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
            html += '<div class="fr3-row"><span><span class="fr3-medal">' + medal + '</span>' + r.icon + ' ' + esc(r.name) + '</span>' +
              '<span><b>' + fmt(r.damage) + '</b></span></div>';
          });
        }
        html += '<div class="fr3-dim" style="margin-top:4px">戰況：</div><div class="fr3-logs">';
        (a.log || []).slice(-8).forEach(function (l) {
          var cls = l.t === 'end' ? 'ok' : (l.t === 'phase' ? 'w' : '');
          html += '<div class="fr3-log ' + cls + '">' + esc(l.text) + '</div>';
        });
        html += '</div>';
        html += '<div class="fr-btns" style="margin-top:6px">' +
          '<button class="fr3-btn r" data-fr3="wbAbort">🛑 放棄討伐</button></div></div>';
      } else {
        html += '<div class="fr-block"><div class="fr-btitle">🌍 世界王討伐</div>' +
          '<div class="fr-rows">' +
          '<span>下一頭 <b>' + W.nextIn + '</b> 期後</span>' +
          '<span>人數需求 <b>' + W.raidMin + '~' + W.raidMax + '</b> 人</span>' +
          '<span>累計討伐 <b>' + W.stats.kills + '</b> 成功／' + W.stats.fails + ' 失敗</span>' +
          '<span>討伐總傷 <b>' + fmt(W.stats.totalDamage) + '</b></span>' +
          '</div>' +
          '<div class="fr3-dim">世界王氣血會依<b>集結隊伍總戰力</b>自動縮放，所以永遠是一場勢均力敵的硬仗。' +
          '好友不足 ' + W.raidMin + ' 人時，可邀<b>正在小鎮作客的名人</b>當助拳補齊。</div>' +
          '<div class="fr-btns" style="margin-top:6px">' +
          '<button class="fr3-btn" data-fr3="wbSpawn">⚡ 立刻召喚世界王</button>' +
          '<button class="fr3-btn y" data-fr3="wbAuto" data-fr3v="' + (W.auto ? '0' : '1') + '">🤖 自動出現：' + (W.auto ? '開' : '關') + '</button>' +
          '</div></div>';

        if ((W.friends.length + W.mercs.length) >= 1) {
          html += '<div class="fr-block"><div class="fr-btitle">🚩 集結隊伍（可出戰 ' + (W.friends.length + W.mercs.length) + ' 人）</div>';
          html += '<div class="fr3-dim">勾選要出戰的好友（建議 ' + W.raidMin + ' 人以上）。</div>';
          html += '<div class="fr3-grid">';
          W.friends.slice(0, 24).forEach(function (f) {
            html += '<label class="fr3-card" style="cursor:pointer"><div class="fr3-head">' +
              '<span class="fr3-name"><input type="checkbox" data-fr3pick="friend" value="' + f.id + '"' + (f.following ? ' checked' : '') + '> ' + f.icon + ' ' + esc(f.name) + '</span>' +
              '<span class="fr3-meta">Lv.' + f.lv + '</span></div>' +
              '<div class="fr3-chips"><span class="fr3-chip r">戰力 ' + fmt(f.power) + '</span>' +
              '<span class="fr3-chip v">' + (f.socIcon || '') + esc(f.socName || '') + '</span>' +
              (f.tier ? '<span class="fr3-chip y">' + (f.tier.icon || '★') + '</span>' : '') +
              (f.following ? '<span class="fr3-chip g">同行中</span>' : '') +
              '</div></label>';
          });
          W.mercs.slice(0, 12).forEach(function (m) {
            html += '<label class="fr3-card merc" style="cursor:pointer"><div class="fr3-head">' +
              '<span class="fr3-name"><input type="checkbox" data-fr3pick="merc" value="' + m.id + '"> ' + m.icon + ' ' + esc(m.name) + '</span>' +
              '<span class="fr3-meta">Lv.' + m.lv + '</span></div>' +
              '<div class="fr3-chips"><span class="fr3-chip r">戰力 ' + fmt(m.power) + '</span>' +
              '<span class="fr3-chip v">名人訪客・助拳</span>' +
              '<span class="fr3-chip">好感 ' + m.favor + '</span></div></label>';
          });
          html += '</div>';
          html += '<div class="fr-btns" style="margin-top:6px">' +
            '<label class="fr3-chip" style="cursor:pointer"><input type="checkbox" id="fr3-wb-self"> 🧑‍🎤 我也參戰</label>' +
            '<button class="fr3-btn" data-fr3="wbRallyAll">🚩 一鍵集結（好友全上）</button>' +
            '<button class="fr3-btn y" data-fr3="wbRally">⚔️ 開始討伐</button>' +
            '</div>';
          html += '</div>';
        } else {
          html += '<div class="fr-empty">目前沒有可出戰的好友。先到「📖 名人圖鑑」結交名人，或等名人來小鎮作客。</div>';
        }
      }

      if (W.history.length) {
        html += '<div class="fr-block"><div class="fr-btitle">📜 討伐紀錄</div>';
        W.history.forEach(function (h) {
          html += '<div class="fr3-row"><span>' + (h.ok ? '🏆' : '💀') + ' ' + h.icon + ' <b>' + esc(h.name) + '</b>' +
            '　' + h.teamSize + ' 人　' + h.turns + ' 期</span>' +
            '<span>' + (h.ok ? '討伐成功' : '失敗') + '　傷害 ' + fmt(h.damage) + '　' + ago(h.at) + '</span></div>';
          if (h.rank && h.rank.length) {
            html += '<div class="fr3-dim" style="margin:-2px 0 5px 6px">MVP：' + h.rank[0].icon + h.rank[0].name +
              '（' + fmt(h.rank[0].damage) + '）' + (h.rank[1] ? '　次：' + h.rank[1].name : '') + '</div>';
          }
        });
        html += '</div>';
      }

      html += '<div class="fr-block"><div class="fr-btitle">📖 世界王圖鑑</div>';
      W.bosses.forEach(function (b) {
        html += '<div class="fr3-row"><span>' + b.icon + ' <b>' + esc(b.name) + '</b>　<span class="fr3-dim">' + esc(b.title) + '</span></span>' +
          '<span>T' + b.tier + '</span></div>';
      });
      html += '</div>';
      void rep;
      return html;
    };

    /* ── 🏠 洞府家園 ── */
    proto.fr3HomeHtml = function (rep) {
      var TS = this.town;
      if (!TS.fr3HomeReport) return '<div class="fr-empty">洞府系統未載入。</div>';
      var H = TS.fr3HomeReport();

      var html = '<div class="fr-block"><div class="fr-btitle">🏠 好友洞府</div>' +
        '<div class="fr-rows">' +
        '<span>洞府平均 <b>Lv.' + H.stats.avgLv + '</b></span>' +
        '<span>已滿級 <b>' + H.stats.maxed + '</b> 處</span>' +
        '<span>累計贈送 <b>' + fmt(H.stats.totalGifted) + '</b> 建材</span>' +
        '<span>累計拜訪 <b>' + fmt(H.stats.totalVisit) + '</b> 次</span>' +
        '</div>';
      if (H.buffLeft > 0) {
        html += '<div class="fr3-chip g">✨ 洞府靈氣運轉中：剩 ' + H.buffLeft + '/' + H.buffTicks +
          ' 期（全好友成長 +' + pct(H.buffMul) + '）</div>';
      }
      html += '<div class="fr3-dim">洞府等級給好友成長 +2%／級、攻防血 +1.2%／級；風格再給額外加成。' +
        '拜訪可拿禮金並啟動「洞府靈氣」。好友之間也會互相送建材。</div></div>';

      html += '<div class="fr-block"><div class="fr-btitle">🧱 我的建材庫存</div><div class="fr3-chips">';
      H.mats.forEach(function (m) {
        html += '<span class="fr3-chip ' + (m.count > 0 ? 'n' : '') + '">' + m.icon + ' ' + m.name + ' × ' + fmt(m.count) + '</span>';
      });
      html += '</div><div class="fr3-dim">好友在外行走時會替你撿回建材，可轉贈給其他好友的洞府。</div></div>';

      html += '<div class="fr3-grid">';
      H.list.forEach(function (x) {
        html += '<div class="fr3-card' + (x.maxLv ? ' ok' : '') + '">';
        html += '<div class="fr3-head"><span class="fr3-name">' + x.styleIcon + ' ' + esc(x.name) + ' 的洞府</span>' +
          '<span class="fr3-meta">Lv.' + x.homeLv + '/' + H.maxLv + '</span></div>';
        html += '<div class="fr3-chips">' +
          '<span class="fr3-chip y">' + esc(x.styleName) + '</span>' +
          '<span class="fr3-chip">好友 Lv.' + x.lv + '</span>' +
          (x.tier ? '<span class="fr3-chip p">' + (x.tier.icon || '★') + '</span>' : '') +
          '<span class="fr3-chip v">' + (x.socIcon || '') + esc(x.socName || '') + '</span>' +
          '<span class="fr3-chip n">裝飾 ' + x.decor + '</span>' +
          '</div>';
        html += '<div class="fr3-bar"><div style="width:' + x.pct + '%"></div></div>';
        html += '<div class="fr3-dim">裝修進度 ' + fmt(x.homeExp) + ' / ' + fmt(x.homeNeed) + '（' + x.pct + '%）' +
          '　成長 +' + pct(x.expBonus) + '　受贈 ' + x.givers + ' 次</div>';
        var sb = x.styleBonus || {};
        var bl = [];
        if (sb.atkPct) bl.push('攻+' + pct(sb.atkPct));
        if (sb.defPct) bl.push('防+' + pct(sb.defPct));
        if (sb.hpPct) bl.push('血+' + pct(sb.hpPct));
        if (sb.expMul) bl.push('成長+' + pct(sb.expMul));
        if (sb.spMul) bl.push('武點+' + pct(sb.spMul));
        if (bl.length) html += '<div class="fr3-chips"><span class="fr3-chip g">風格加成：' + bl.join('、') + '</span></div>';

        html += '<div class="fr3-chips">';
        H.mats.forEach(function (m) {
          if (m.count <= 0) return;
          html += '<button class="fr3-btn" data-fr3="homeGive" data-fr3v="' + x.id + '|' + m.id + '|1">送 ' + m.icon + '×1</button>';
        });
        html += '</div>';
        html += '<div class="fr-btns">' +
          (x.canVisit.ok
            ? '<button class="fr3-btn y" data-fr3="homeVisit" data-fr3v="' + x.id + '">🏡 拜訪</button>'
            : '<button class="fr3-btn" disabled title="' + esc(x.canVisit.msg) + '">🏡 ' + esc(x.canVisit.msg) + '</button>') +
          '<button class="fr3-btn" data-fr3="homeDecor" data-fr3v="' + x.id + '">🎨 裝修（' + fmt(x.decorCost) + ' 兩）</button>' +
          '</div></div>';
      });
      html += '</div>';

      html += '<div class="fr-block"><div class="fr-btitle">🏯 洞府風格</div>';
      H.styles.forEach(function (s) {
        var b = s.bonus || {}, bl = [];
        Object.keys(b).forEach(function (k) {
          var v = b[k];
          var nm = ({ atkPct: '攻擊', defPct: '防禦', hpPct: '氣血', expMul: '成長', spMul: '武點' })[k] || k;
          bl.push(nm + ' +' + pct(v));
        });
        html += '<div class="fr3-row"><span>' + s.icon + ' <b>' + esc(s.name) + '</b>　<span class="fr3-dim">' + esc(s.desc) + '</span></span>' +
          '<span class="fr3-chip g">' + bl.join('、') + '</span></div>';
      });
      html += '</div>';
      void rep;
      return html;
    };

    /* ── 🏛️ 拍賣行 ── */
    proto.fr3AucHtml = function (rep) {
      var TS = this.town;
      if (!TS.fr3AucReport) return '<div class="fr-empty">拍賣行未載入。</div>';
      var A = TS.fr3AucReport();

      var html = '<div class="fr-block"><div class="fr-btitle">🏛️ 好友委託拍賣行</div>' +
        '<div class="fr-rows">' +
        '<span>我的銀兩 <b>' + fmt(A.myGold) + '</b></span>' +
        '<span>代售中 <b>' + A.consign.length + '/' + A.slots + '</b></span>' +
        '<span>已售出 <b>' + A.stats.sold + '</b> 件</span>' +
        '<span>實收 <b>' + fmt(A.stats.goldEarned) + '</b> 兩</span>' +
        '<span>抽成支出 <b>' + fmt(A.stats.commissionPaid) + '</b> 兩</span>' +
        '</div>' +
        '<div class="fr3-dim">把行囊裡的裝備委託好友代售。好感越高抽成越低（基礎 ' + pct(A.baseRate) + '，最高可減 ' +
        pct(0.12) + '）；名人星級與「現代／帝王」階層能賣到更好的價錢。' +
        '好友等級低於裝備需求時容易流標。</div></div>';

      html += '<div class="fr-block"><div class="fr-btitle">📦 代售中</div>';
      if (!A.consign.length) html += '<div class="fr3-dim">目前沒有代售品。</div>';
      A.consign.forEach(function (c) {
        html += '<div class="fr3-card" style="margin-bottom:6px">' +
          '<div class="fr3-head"><span class="fr3-name">' + esc(c.itemName) + '</span>' +
          '<span class="fr3-meta">剩 ' + c.left + '/' + c.total + ' 期</span></div>' +
          '<div class="fr3-bar y"><div style="width:' + c.pct + '%"></div></div>' +
          '<div class="fr3-chips">' +
          '<span class="fr3-chip y">定價 ' + fmt(c.price) + '</span>' +
          '<span class="fr3-chip r">抽成 ' + pct(c.rate) + '（' + fmt(c.commission) + '）</span>' +
          '<span class="fr3-chip g">實得 ' + fmt(c.net) + '</span>' +
          '<span class="fr3-chip">' + c.sellerIcon + esc(c.sellerName) + '</span>' +
          '</div>' +
          '<div class="fr-btns"><button class="fr3-btn r" data-fr3="aucCancel" data-fr3v="' + c.id + '">↩️ 取回</button></div></div>';
      });
      html += '</div>';

      html += '<div class="fr-block"><div class="fr-btitle">📤 我要委託（行囊裝備）</div>';
      if (!A.bag.length) {
        html += '<div class="fr3-dim">你的行囊裡沒有可委託的裝備。</div>';
      } else {
        A.bag.slice(0, 10).forEach(function (b) {
          html += '<div class="fr3-row"><span>' + esc(b.name) + '　<span class="fr3-dim">Lv.' + b.reqLv + '　戰力 ' + fmt(b.power) + '</span></span>' +
            '<span class="fr3-chips">' +
            A.sellers.slice(0, 4).map(function (s) {
              return '<button class="fr3-btn" data-fr3="aucConsign" data-fr3v="' + b.idx + '|' + s.id + '">委託 ' + s.icon + esc(s.name) + '（' + pct(s.rate) + '）</button>';
            }).join('') +
            '</span></div>';
        });
      }
      html += '</div>';

      html += '<div class="fr-block"><div class="fr-btitle">🛒 好友掛售中</div>' +
        '<div class="fr-btns" style="margin-bottom:6px"><button class="fr3-btn" data-fr3="aucRefresh">🔄 刷新貨架</button></div>';
      if (!A.listings.length) html += '<div class="fr3-dim">目前沒有好友掛售的商品。</div>';
      A.listings.forEach(function (l) {
        html += '<div class="fr3-row"><span>' + l.sellerIcon + ' <b>' + esc(l.sellerName) + '</b> 售 ' + esc(l.itemName) +
          '　<span class="fr3-dim">Lv.' + l.reqLv + '　戰力 ' + fmt(l.power) + '　剩 ' + l.left + ' 期</span></span>' +
          '<span><span class="fr3-chip y">' + fmt(l.price) + ' 兩</span> ' +
          (l.canAfford
            ? '<button class="fr3-btn" data-fr3="aucBuy" data-fr3v="' + l.id + '">🛒 買下</button>'
            : '<button class="fr3-btn" disabled>銀兩不足</button>') +
          '</span></div>';
      });
      html += '</div>';

      html += '<div class="fr-block"><div class="fr-btitle">🧾 代售人（抽成由低到高）</div>';
      A.sellers.forEach(function (s) {
        html += '<div class="fr3-row"><span>' + s.icon + ' <b>' + esc(s.name) + '</b>　<span class="fr3-dim">Lv.' + s.lv +
          '　' + (s.socIcon || '') + esc(s.socName || '') + (s.tier ? '　' + (s.tier.icon || '★') : '') + '</span></span>' +
          '<span><span class="fr3-chip ' + (s.rate < 0.12 ? 'g' : 'y') + '">抽成 ' + pct(s.rate) + '</span> ' +
          '<span class="fr3-chip">已售 ' + s.sold + '</span></span></div>';
      });
      html += '</div>';
      void rep;
      return html;
    };

    /* ── 😈 仇敵 ── */
    proto.fr3HosHtml = function (rep) {
      var TS = this.town;
      if (!TS.fr3HosReport) return '<div class="fr-empty">仇敵系統未載入。</div>';
      var H = TS.fr3HosReport();

      var html = '<div class="fr-block"><div class="fr-btitle">😈 仇敵</div>' +
        '<div class="fr-rows">' +
        '<span>仇敵 <b>' + H.stats.count + '/' + H.maxHostile + '</b></span>' +
        '<span>擊敗 <b>' + H.stats.defeated + '</b> 次</span>' +
        '<span>招降 <b>' + H.stats.recruited + '</b> 人</span>' +
        '<span>誅殺 <b>' + H.stats.killed + '</b> 人</span>' +
        '<span>被打劫 <b>' + H.stats.raids + '</b> 次</span>' +
        '<span>累計損失 <b>' + fmt(H.stats.totalLost) + '</b> 兩</span>' +
        '</div>' +
        '<div class="fr3-dim">好友好感歸零後，每期有機率反目成仇（主動斷交也有機率結仇）。' +
        '仇敵戰力會比原好友時期更強，並會定期率眾打劫小鎮。<br>' +
        '戰勝後可「招降」把他們拉回好友之列，或「誅殺」奪取全部遺物。</div></div>';

      if (H.riskFriends.length) {
        html += '<div class="fr3-card raid" style="margin-bottom:8px">' +
          '<div class="fr3-head"><span class="fr3-name">⚠️ 關係緊張的好友</span><span class="fr3-meta">' + H.riskFriends.length + ' 人</span></div>' +
          '<div class="fr3-dim">' + H.riskFriends.map(function (f) { return f.icon + f.name + '（好感 ' + f.favor + '）'; }).join('、') +
          '<br>建議送禮或完成互助任務提升好感，否則他們隨時可能反目。</div></div>';
      }

      if (!H.list.length) {
        html += '<div class="fr-empty">目前沒有仇敵。江湖路遠，能不得罪人就別得罪。</div>';
      } else {
        html += '<div class="fr3-grid">';
        H.list.forEach(function (h) {
          html += '<div class="fr3-card' + (num(h.raidLeft, 0) > 0 ? ' raid' : ' boss') + '">';
          html += '<div class="fr3-head"><span class="fr3-name">' + h.icon + ' ' + esc(h.name) + '</span>' +
            '<span class="fr3-meta">Lv.' + h.lv + '</span></div>';
          html += '<div class="fr3-dim">' + esc(h.title || '') + '</div>';
          html += '<div class="fr3-chips">' +
            '<span class="fr3-chip r">戰力 ' + fmt(h.power) + '</span>' +
            '<span class="fr3-chip y">' + h.reasonIcon + esc(h.reasonName) + '</span>' +
            (h.tier ? '<span class="fr3-chip p">' + (h.tier.icon || '★') + '</span>' : '') +
            '<span class="fr3-chip v">' + (h.socIcon || '') + esc(h.socName || '') + '</span>' +
            '<span class="fr3-chip">裝備 ' + h.equipCount + '　遺物 ' + h.bagCount + '</span>' +
            (h.defeated ? '<span class="fr3-chip g">已擊敗 ×' + h.defeatedCount + '</span>' : '') +
            '</div>';
          html += '<div class="fr3-dim">' + esc(h.reasonDesc) + '</div>';

          if (num(h.raidLeft, 0) > 0) {
            html += '<div class="fr3-bar y"><div style="width:' + Math.round(h.raidLeft / 6 * 100) + '%"></div></div>';
            html += '<div class="fr3-note">🚨 ' + h.raidLeft + ' 期後打劫小鎮！</div>';
            html += '<div class="fr3-chips">';
            H.helpers.slice(0, 4).forEach(function (p) {
              html += '<button class="fr3-btn y" data-fr3="hosRepel" data-fr3v="' + h.id + '|' + p.id + '">派 ' + p.icon + esc(p.name) + ' 迎擊</button>';
            });
            html += '</div>';
          } else {
            html += '<div class="fr3-dim">下次打劫：' + h.raidIn + ' 期後</div>';
          }

          html += '<div class="fr3-chips"><span class="fr3-chip ' + (h.winChance >= 60 ? 'g' : (h.winChance >= 35 ? 'y' : 'r')) + '">戰勝機率 ' + h.winChance + '%</span>' +
            '<span class="fr3-chip">被劫 ' + fmt(h.stolen) + ' 兩</span></div>';

          html += '<div class="fr-btns">' +
            '<button class="fr3-btn r" data-fr3="hosFight" data-fr3v="' + h.id + '">⚔️ 挑戰</button>' +
            (h.defeated ? '<button class="fr3-btn" data-fr3="hosRecruit" data-fr3v="' + h.id + '">🕊️ 招降（' + fmt(h.recruitCost) + ' 兩）</button>' : '') +
            (h.defeated ? '<button class="fr3-btn r" data-fr3="hosKill" data-fr3v="' + h.id + '">🗡️ 誅殺（+' + fmt(h.killGold) + ' 兩）</button>' : '') +
            '</div></div>';
        });
        html += '</div>';
      }

      html += '<div class="fr-block"><div class="fr-btitle">📜 恩怨紀錄</div>';
      if (!H.log.length) html += '<div class="fr3-dim">尚無紀錄。</div>';
      else {
        html += '<div class="fr3-logs">';
        H.log.forEach(function (l) {
          var cls = l.type === 'gain' ? 'ok' : (l.type === 'wealth' ? 'w' : 'no');
          html += '<div class="fr3-log ' + cls + '"><span style="color:#64748b;font-size:.68rem;margin-right:5px">' +
            ago(l.t) + '</span>' + esc(l.msg) + '</div>';
        });
        html += '</div>';
      }
      html += '</div>';
      void rep;
      return html;
    };

    /* ── 事件委派（v3 專屬動作）── */
    var ACT = {
      wbSpawn: function () { this.town.fr3WbSpawn(null); this.renderFriendPanel(); },
      wbAuto: function (v) { var W = this.town.fr3WbState(); W.auto = (v === '1'); this.renderFriendPanel(); },
      wbAbort: function () { this.town.fr3WbAbort(); this.renderFriendPanel(); },
      wbRally: function () {
        var panel = this.el.panels.friend;
        var friends = [], mercs = [];
        panel.querySelectorAll('[data-fr3pick="friend"]:checked').forEach(function (c) { friends.push(c.value); });
        panel.querySelectorAll('[data-fr3pick="merc"]:checked').forEach(function (c) { mercs.push(c.value); });
        var self = panel.querySelector('#fr3-wb-self');
        if (this.town.fr3WbRally(friends, mercs, !!(self && self.checked))) this.renderFriendPanel();
      },
      wbRallyAll: function () {
        var panel = this.el.panels.friend;
        panel.querySelectorAll('[data-fr3pick="friend"]').forEach(function (c) { c.checked = true; });
        panel.querySelectorAll('[data-fr3pick="merc"]').forEach(function (c) { c.checked = true; });
        var self = panel.querySelector('#fr3-wb-self');
        if (self) self.checked = true;
        this.renderFriendPanel();
      },
      homeGive: function (v) {
        var p = String(v).split('|');
        if (this.town.fr3HomeGive(p[0], p[1], parseInt(p[2], 10) || 1)) this.renderFriendPanel();
      },
      homeVisit: function (v) { if (this.town.fr3HomeVisit(v)) this.renderFriendPanel(); },
      homeDecor: function (v) { if (this.town.fr3HomeDecorate(v)) this.renderFriendPanel(); },
      aucConsign: function (v) {
        var p = String(v).split('|');
        if (this.town.fr3AucConsign(parseInt(p[0], 10), p[1])) this.renderFriendPanel();
      },
      aucCancel: function (v) { if (this.town.fr3AucCancel(v)) this.renderFriendPanel(); },
      aucBuy: function (v) { if (this.town.fr3AucBuy(v)) this.renderFriendPanel(); },
      aucRefresh: function () { this.town.fr3AucRefresh(); this.renderFriendPanel(); },
      hosFight: function (v) { this.town.fr3HosFight(v); this.renderFriendPanel(); },
      hosRecruit: function (v) { if (this.town.fr3HosRecruit(v)) this.renderFriendPanel(); },
      hosKill: function (v) {
        if (!confirm('確定誅殺？此人將永久從江湖消失，但你可奪取他全部遺物。')) return;
        if (this.town.fr3HosKill(v)) this.renderFriendPanel();
      },
      hosRepel: function (v) {
        var p = String(v).split('|');
        if (this.town.fr3HosRepel(p[0], [p[1]])) this.renderFriendPanel();
      }
    };

    proto.fr3Bind = function (panel) {
      if (!panel || panel._fr3Bound) return;
      panel._fr3Bound = true;

      // 保險：若 frBind 尚未委派（理論上不會），補上子分頁委派
      if (!panel._frDelegated) {
        var self0 = this;
        panel._frDelegated = true;
        panel.addEventListener('click', function (e) {
          var t = e.target;
          if (!t || !t.closest) return;
          var el = t.closest('[data-frsub]');
          if (!el) return;
          e.preventDefault();
          self0.frSetSub(el.getAttribute('data-frsub'));
        });
      }

      var self = this;
      panel.addEventListener('click', function (e) {
        var el = (e.target && e.target.closest) ? e.target.closest('[data-fr3]') : null;
        if (!el) return;
        var fn = ACT[el.getAttribute('data-fr3')];
        if (!fn) return;
        e.preventDefault();
        try { fn.call(self, el.getAttribute('data-fr3v') || '', el); }
        catch (err) { console.error('[uiFriend3] 動作失敗：', err); }
      });
    };
  }

  /* ══════════════════════════════════════════════════════
     ⑤ 初始化
     ══════════════════════════════════════════════════════ */
  function boot() {
    injectStyles3();
    installTickBridge(false);
    var ok = installTab();
    removeTownTab();
    updateTabBadge();

    if (!window.__fr3TabTimer) {
      window.__fr3TabTimer = setInterval(function () {
        if (!document.getElementById('friend-style3')) injectStyles3();
        if (!document.getElementById(TAB_ID)) installTab();
        removeTownTab();
        updateTabBadge();
      }, num(CFG.AUTO_INSTALL_MS, 1500));
    }

    if (!ok) {
      console.warn('[uiFriend3] ⚠️ 未能自動定位主介面分頁列。請在 Console 執行：' +
        "HY.UIFriend3.setTabSelector('#你的分頁容器') 然後 HY.UIFriend3.install()");
    }
  }

  function tryInit(force) {
    if (inited) {
      if (force) { injectStyles3(); installTab(); updateTabBadge(); }
      return true;
    }
    var d = depStatus();
    if (!d.ok) {
      if (force) console.warn('[uiFriend3] 依賴尚未就緒，缺少：', d);
      return false;
    }

    proto = window.HY.UITown.prototype;
    inited = true;
    window.HY.UIFriend3.ready = true;
    window.HY.UIFriend3.proto = proto;

    try { patchProto(); } catch (e) { console.error('[uiFriend3] 掛載 UITown.prototype 失敗：', e); }

    var bridged = false;
    try { bridged = installTickBridge(false); } catch (e) { console.error('[uiFriend3] tick 橋接失敗：', e); }
    if (!bridged) {
      try { startV3FallbackTimer(); } catch (e) { console.error('[uiFriend3] 後備計時器啟動失敗：', e); }
    }

    try { boot(); } catch (e) { console.error('[uiFriend3] 啟動失敗：', e); }

    console.log('[uiFriend3] ✓ 已就緒（標籤搬家 + 子分頁委派 + 世界王／洞府／拍賣行／仇敵）');
    return true;
  }

  /* ══════════════════════════════════════════════════════
     ⑥ 重試排程
     ══════════════════════════════════════════════════════ */
  function scheduleInit() {
    if (tryInit(false)) return;

    if (retryTimer) return;
    retryTimer = setInterval(function () {
      tries += 1;
      if (tryInit(false) || tries >= num(CFG.RETRY_MAX, 80)) {
        clearInterval(retryTimer);
        retryTimer = null;
        if (!inited) {
          console.error('[uiFriend3] ✗ 依賴逾時，仍未就緒。缺少：', depStatus());
          console.error('[uiFriend3] 請檢查 loadOrder.js 是否已加入 friendData3.js 與 friendSystem.js 之後的 5 支 v3 系統檔。');
        }
      }
    }, num(CFG.RETRY_MS, 250));

    function once() { setTimeout(function () { tryInit(false); }, 600); }
    if (document.readyState === 'complete' || document.readyState === 'interactive') once();
    else window.addEventListener('load', once);
  }

  scheduleInit();

  var bootWatch = setInterval(function () {
    if (window.HY.game && window.HY.game.townSys) {
      clearInterval(bootWatch);
      tryInit(false);
      setTimeout(function () {
        tryInit(false);
        installTickBridge(true);
        updateTabBadge();
      }, 800);
    }
  }, 500);
  setTimeout(function () { clearInterval(bootWatch); }, 30000);
})();