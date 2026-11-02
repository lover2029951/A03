// js/uiFriend5.js (v1.1)
// ⭐ 好友系統 v5（補強層）
//    ① 書信：新增「🗑️ 一鍵清空信箱（先自動領附件）」與「💣 強制清空」
//    ② 好友面板「子分頁徽章」：把主標籤的紅圈白字提示帶進面板內，
//       直接標在對應的分頁按鈕上 → 不必再逐頁翻找
//    ③ 主標籤徽章與面板內徽章共用同一份計數（frBadges），確保數字一致
//
// 【v1.1 改動】移除徽章閃動動畫（frB2Pulse），保留紅／藍底色 + 靜態微光
//
// 【實作手法】完全不修改 uiFriend.js ~ uiFriend4.js：
//    • 系統方法：直接掛到 HY.TownSystem.prototype（fr2MailPurge / frBadges）
//    • 書信按鈕：包裝 renderFriendPanel，渲染完成後「注入 DOM」
//    • 子分頁徽章：包裝 renderFriendPanel，渲染完後裝飾 .fr-subs [data-frsub]
//
// ⚠️ 載入順序：uiFriend4.js 之後、main.js 之前
window.HY = window.HY || {};

(function () {
  var TP = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!TP) { console.error('[uiFriend5] 找不到 HY.TownSystem'); return; }
  var proto = window.HY.UITown && window.HY.UITown.prototype;
  if (!proto) { console.error('[uiFriend5] 找不到 HY.UITown（uiFriend.js 是否已載入？）'); return; }

  var STYLE_ID = 'friend-style5';

  window.HY.UIFriend5 = {
    version: '1.1',
    ready: false,
    badges: function () { var t = T(); return t && t.frBadges ? t.frBadges(true) : {}; },
    purge: function (force) { var t = T(); return t && t.fr2MailPurge ? t.fr2MailPurge(!!force) : 0; }
  };

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function esc(s) { return String(s == null ? '' : s); }
  function T() { return window.HY.game && window.HY.game.townSys; }

  /* ══════════════════════════════════════════════════════
     樣式（v1.1：徽章已停用閃動）
     ══════════════════════════════════════════════════════ */
  function injectStyles5() {
    if (document.getElementById(STYLE_ID)) return;
    var host = document.head || document.documentElement;
    if (!host) return;
    var css = `
/* ══ 子分頁徽章（紅圈白字 / 資訊藍；v1.1 已移除閃動）══ */
.fr-subs .fr-sub { position: relative; }
.fr-subs .fr-sub .fr-b2 {
  display: inline-block; margin-left: 5px;
  background: #ef4444; color: #fff; border: 1px solid #fecaca;
  border-radius: 9px; font-size: .64rem; padding: 0 5px; min-width: 15px;
  text-align: center; line-height: 15px; font-weight: bold;
  vertical-align: 1px;
  animation: none;                                       /* v1.1：不再脈動 */
  box-shadow: 0 0 5px rgba(239,68,68,.55);               /* v1.1：靜態微光 */
}
.fr-subs .fr-sub .fr-b2.info {
  background: #0ea5e9; border-color: #bae6fd;
  box-shadow: 0 0 5px rgba(14,165,233,.55);
}
.fr-subs .fr-sub[data-frb="urgent"] {
  border-color: #ef4444 !important;
  color: #fecaca !important;
  background: rgba(239,68,68,.14) !important;
}
.fr-subs .fr-sub[data-frb="urgent"].on {
  border-color: #ef4444 !important;
  background: rgba(239,68,68,.30) !important;
  color: #fff !important;
}
/* 主標籤徽章沿用 uiFriend3 的 .fr3-badge，這裡只補強對比 */
#fr3-main-tab .fr3-badge { border: 1px solid #fecaca; }
/* 書信工具列 */
.fr2-btn.r5 { border-color: #ef4444; color: #fca5a5; }
`;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.appendChild(document.createTextNode(css));
    host.appendChild(st);
  }

  /* ══════════════════════════════════════════════════════
     ① 系統方法：清空信箱
     ══════════════════════════════════════════════════════ */
  TP.fr2MailPurge = function (force) {
    var M = this.fr2MailState();
    var self = this;
    if (!M.list.length) { this.log('✉️ 信箱本來就是空的。', 'system'); return 0; }

    var claimed = 0, claimedItems = 0;
    if (!force) {
      // 先自動領取所有附件（行囊滿的會失敗，該封信會保留）
      M.list.slice().forEach(function (m) {
        if (m.attach && m.attach.length) {
          try {
            var has = m.attach.length;
            if (self.fr2MailClaim(m.id)) { claimed += 1; claimedItems += has; }
          } catch (e) { /* 忽略 */ }
        }
      });
    }

    var before = M.list.length;
    if (force) M.list = [];
    else M.list = M.list.filter(function (m) { return m.attach && m.attach.length; });
    var n = before - M.list.length;
    var kept = M.list.length;

    M.purged = num(M.purged, 0) + n;
    this.fr2MailState();  // 確保狀態同步

    this.friendLog('🗑️ 已清空信箱：刪除 ' + n + ' 封信' +
      (claimed ? '（自動領取附件 ' + claimed + ' 封／' + claimedItems + ' 件）' : '') +
      (kept ? '，因行囊已滿保留 ' + kept + ' 封未領附件信件' : '') + '。', 'system');
    this.requestRender();
    return n;
  };

  /* ══════════════════════════════════════════════════════
     ② 系統方法：徽章計數（單一來源）
     ══════════════════════════════════════════════════════ */
  TP.frBadges = function (force) {
    var nowMs = Date.now();
    if (!force && this._frBadgeCache && (nowMs - num(this._frBadgeAt, 0)) < 600) return this._frBadgeCache;

    var self = this;
    var b = {};
    function set(id, n, kind) {
      var v = Math.round(num(n, 0));
      if (v > 0) b[id] = { n: v, kind: kind || 'info' };
    }
    function safe(fn) { try { return fn(); } catch (e) { return null; } }

    // 同行
    safe(function () { set('team', self.friendFollowers().length, 'info'); });

    // 書信
    safe(function () { set('mail', self.fr2MailUnread(), 'urgent'); });

    // 求救 + 互助任務（合併計在「互助任務」分頁）
    safe(function () {
      var r = self.fr2RescueState().active.length;
      var q = self.fr2QuestState().list.length;
      set('quest', r + q, 'urgent');
    });

    // 世界王
    safe(function () { if (self.fr3WbActive && self.fr3WbActive()) set('wb', 1, 'urgent'); });

    // 仇敵打劫迫近
    safe(function () {
      var n = self.fr3HosState().list.filter(function (x) { return num(x.raidLeft, 0) > 0; }).length;
      set('hostile', n, 'urgent');
    });

    // 拍賣行代售中
    safe(function () { set('auction', self.fr3AucState().consign.length, 'info'); });

    // 心願
    safe(function () { set('wish', self.fr4State().wishes.length, 'urgent'); });

    // 出團進行中
    safe(function () { set('exp', self.fr2ExpState().runs.length, 'info'); });

    // 可授業招式
    safe(function () {
      if (typeof self.fr4Teachable !== 'function') return;
      var n = 0;
      self.friendAll().forEach(function (f) { n += self.fr4Teachable(f).length; });
      set('teach', n, 'info');
    });

    // 好友倉庫裝備
    safe(function () { set('ware', self.fr4State().warehouse.items.length, 'info'); });

    // 洞府可拜訪
    safe(function () {
      if (typeof self.fr3HomeCanVisit !== 'function') return;
      var n = 0;
      self.friendAll().forEach(function (f) { if (self.fr3HomeCanVisit(f.id).ok) n += 1; });
      set('home', n, 'info');
    });

    // 名人圖鑑可結交名額
    safe(function () {
      var free = self.friendSlots() - self.friendAll().length;
      set('codex', free, 'info');
    });

    // 好友名單：可同行但未同行的人數
    safe(function () {
      if (typeof self.friendCanFollow !== 'function') return;
      var n = 0;
      self.friendAll().forEach(function (f) {
        if (f.following || f.retired) return;
        if (self.friendCanFollow(f.id).ok) n += 1;
      });
      set('roster', n, 'info');
    });

    this._frBadgeCache = b;
    this._frBadgeAt = nowMs;
    return b;
  };

  /* ══════════════════════════════════════════════════════
     ③ UI：子分頁徽章裝飾
     ══════════════════════════════════════════════════════ */
  function decorateSubs(panel, ui) {
    if (!panel) return;
    var t = ui && ui.town ? ui.town : T();
    if (!t || typeof t.frBadges !== 'function') return;

    var badges = {};
    try { badges = t.frBadges(false) || {}; } catch (e) { badges = {}; }

    var list;
    try { list = panel.querySelectorAll('.fr-subs [data-frsub]'); } catch (e) { return; }
    if (!list || !list.length) return;

    Array.prototype.forEach.call(list, function (btn) {
      var id = btn.getAttribute('data-frsub');
      var info = badges[id];
      var old = btn.querySelector('.fr-b2');
      if (!info || !info.n) {
        if (old && old.parentNode) old.parentNode.removeChild(old);
        btn.removeAttribute('data-frb');
        return;
      }
      var txt = info.n > 99 ? '99+' : String(info.n);
      if (!old) {
        old = document.createElement('span');
        old.className = 'fr-b2';
        btn.appendChild(old);
      }
      var cls = 'fr-b2 ' + (info.kind === 'urgent' ? '' : 'info');
      if (old.className !== cls) old.className = cls;
      if (old.textContent !== txt) old.textContent = txt;
      btn.setAttribute('data-frb', info.kind || 'info');
      btn.title = (btn.title ? btn.title + '　' : '') + '待處理 ' + info.n + ' 項';
    });
  }

  /* ══════════════════════════════════════════════════════
     ④ UI：書信工具列注入「清空」按鈕
     ══════════════════════════════════════════════════════ */
  function injectMailBtns(panel, ui) {
    if (!panel) return;
    if (panel.querySelector('[data-fr5="mailPurge"]')) return;

    var bars;
    try { bars = panel.querySelectorAll('.fr-btns'); } catch (e) { return; }
    var target = null;
    Array.prototype.forEach.call(bars, function (bar) {
      if (bar.querySelector('[data-fr2="mailClear"]') || bar.querySelector('[data-fr2="mailAll"]')) target = bar;
    });
    if (!target) return;

    var M = null;
    try { M = ui.town.fr2MailState(); } catch (e) { M = null; }
    var total = M && M.list ? M.list.length : 0;

    var b1 = document.createElement('button');
    b1.className = 'fr2-btn r r5';
    b1.setAttribute('data-fr5', 'mailPurge');
    b1.textContent = '🗑️ 清空信箱（自動領附件）' + (total ? '（' + total + '）' : '');
    b1.title = '會先自動領取所有附件，行囊滿的信件會保留，再刪除其餘信件。';
    target.appendChild(b1);

    var b2 = document.createElement('button');
    b2.className = 'fr2-btn r r5';
    b2.setAttribute('data-fr5', 'mailPurgeForce');
    b2.textContent = '💣 強制清空';
    b2.title = '直接刪除所有信件，未領取的附件將永久消失。';
    target.appendChild(b2);
  }

  /* ══════════════════════════════════════════════════════
     ⑤ UI：事件委派
     ══════════════════════════════════════════════════════ */
  function bindPanel(panel, ui) {
    if (!panel || panel._fr5Bound) return;
    panel._fr5Bound = true;

    panel.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-fr5]') : null;
      if (!el) return;
      var act = el.getAttribute('data-fr5');
      var t = ui.town || T();
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();

      if (act === 'mailPurge') {
        var M = null;
        try { M = t.fr2MailState(); } catch (err) { M = null; }
        if (!M || !M.list.length) { alert('信箱是空的。'); return; }
        if (!confirm('確定清空信箱？（共 ' + M.list.length + ' 封）\n\n會先自動領取所有附件；' +
          '若行囊已滿導致領取失敗，該封信會保留，不會遺失物品。')) return;
        t.fr2MailPurge(false);
        ui.renderFriendPanel();

      } else if (act === 'mailPurgeForce') {
        if (!confirm('⚠️ 強制清空會直接刪除所有信件，\n未領取的附件將永久消失！\n\n確定要這麼做嗎？')) return;
        if (!confirm('再次確認：真的要強制清空整個信箱嗎？')) return;
        t.fr2MailPurge(true);
        ui.renderFriendPanel();
      }
    }, false);
  }

  /* ══════════════════════════════════════════════════════
     ⑥ 包裝 renderFriendPanel（渲染後裝飾 + 注入）
     ══════════════════════════════════════════════════════ */
  var _render = proto.renderFriendPanel;
  proto.renderFriendPanel = function () {
    _render.call(this);
    var panel = this.el && this.el.panels && this.el.panels.friend;
    if (!panel) return;
    try { injectStyles5(); } catch (e) { /* 忽略 */ }
    try { decorateSubs(panel, this); } catch (e) { console.error('[uiFriend5] 徽章裝飾失敗：', e); }
    try { if (this.frSub === 'mail') injectMailBtns(panel, this); } catch (e) { console.error('[uiFriend5] 書信按鈕注入失敗：', e); }
    try { bindPanel(panel, this); } catch (e) { /* 忽略 */ }
  };

  /* ══════════════════════════════════════════════════════
     ⑦ 主標籤徽章：改用 frBadges 總和（與面板內一致）
     ══════════════════════════════════════════════════════ */
  var _updateBadge = proto._frUpdateBadge;
  proto._frUpdateBadge = function () {
    try { _updateBadge.call(this); } catch (e) { /* 忽略 */ }
    try {
      var root = this.el && this.el.root;
      if (!root || !root.querySelectorAll) return;
      var btn = null;
      root.querySelectorAll('.town-tab-btn').forEach(function (b) {
        if (b.getAttribute('data-ttab') === 'friend') btn = b;
      });
      if (!btn) return;
      var t = this.town || T();
      if (!t || typeof t.frBadges !== 'function') return;
      var bd = t.frBadges(false);
      var total = 0, urgent = 0;
      Object.keys(bd).forEach(function (k) {
        total += bd[k].n;
        if (bd[k].kind === 'urgent') urgent += bd[k].n;
      });
      var badge = btn.querySelector('.fr-badge');
      if (total > 0) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'fr-badge'; btn.appendChild(badge); }
        if (badge.textContent !== String(total)) badge.textContent = String(total);
        badge.style.background = urgent > 0 ? '#ef4444' : '#0ea5e9';
      } else if (badge && badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    } catch (e) { /* 忽略 */ }
  };

  /* ══════════════════════════════════════════════════════
     ⑧ 啟動
     ══════════════════════════════════════════════════════ */
  function bootOnce() {
    if (TP.__fr5Booted) return;
    TP.__fr5Booted = true;
    try { injectStyles5(); } catch (e) { /* 忽略 */ }
    console.log('[uiFriend5] ✓ 已啟動（書信一鍵清空 + 子分頁徽章；徽章已停用閃動）');
  }

  var _ensureState = TP.ensureState;
  TP.ensureState = function () {
    var t = _ensureState.call(this);
    try { bootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  // 若 ensureState 早已被呼叫過，補跑一次
  if (T()) { try { bootOnce(); } catch (e) { /* 忽略 */ } }
  var _watch = setInterval(function () {
    if (T()) { clearInterval(_watch); try { bootOnce(); } catch (e) { /* 忽略 */ } }
  }, 500);
  setTimeout(function () { clearInterval(_watch); }, 30000);

  window.HY.UIFriend5.ready = true;
  console.log('[uiFriend5] ✓ 已載入（書信清空 + 面板內徽章；已停用閃動）');
})();