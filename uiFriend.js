// js/uiFriend.js (v2.1)
// ⭐ 好友系統 UI：小鎮「🤝 好友」標籤 + 2/3 畫面彈出視窗
//    （v3 起標籤由 uiFriend3.js 搬到主介面「角色&隊伍」旁，本檔仍負責渲染器與彈窗邏輯）
//
// 【v2.1 改動】移除標籤閃動動畫（frTabPulse），保留框線顏色 + 靜態微光
// 【v2 改動】檔尾 HY.UIFriend 增加 injectStyles 對外暴露
//            → 讓 uiFriend3.js 在「小鎮 UI 未建構」時也能注入樣式
//
// ⚠️ 載入順序：必須排在 uiTownOverlays.js 之後、main.js 之前
window.HY = window.HY || {};

(function () {
  var proto = window.HY.UITown && window.HY.UITown.prototype;
  if (!proto) { console.error('[uiFriend] 找不到 HY.UITown，請確認 uiTown.js 已載入。'); return; }
  var FS = window.HY.FriendSystem;
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!FS || !T || !T.FRIEND) { console.error('[uiFriend] 找不到好友系統，請確認 friendData.js / friendSystem.js 已載入。'); return; }

  var MASK_ID = 'friend-modal-mask';
  var MODAL_ID = 'friend-modal';

  var SUBS = [
    { id: 'roster', label: '👥 好友名單' },
    { id: 'team',   label: '🚩 組隊同行' },
    { id: 'feed',   label: '📡 好友動態' },
    { id: 'social', label: '💬 互動' },
    { id: 'codex',  label: '📖 名人圖鑑' },
    { id: 'stat',   label: '📊 統計與設定' }
  ];

  /* ══════════ 樣式注入 ══════════ */
  function injectStyles() {
    if (document.getElementById('friend-style')) return;
    var css = `
/* ══════════ 🤝 好友標籤（框線 + 靜態微光；v2.1 已移除閃動）══════════ */
.town-tab-btn[data-ttab="friend"] {
  position: relative; font-weight: bold; font-size: .92rem; letter-spacing: .5px;
  padding: 7px 17px; border-width: 2px;
  border-color: #34d399; color: #6ee7b7;
  background: linear-gradient(180deg, rgba(52,211,153,.20), rgba(52,211,153,.04));
  animation: none;                                   /* v2.1：不再閃動 */
  box-shadow: 0 0 9px rgba(52,211,153,.35);          /* v2.1：靜態微光 */
  transition: transform .15s, filter .15s;
}
.town-tab-btn[data-ttab="friend"]::after { content: '⧉'; margin-left: 7px; font-size: .82em; opacity: .75; }
.town-tab-btn[data-ttab="friend"]:hover { transform: translateY(-2px); filter: brightness(1.3); }
.town-tab-btn[data-ttab="friend"].active {
  background: rgba(52,211,153,.3); color: #fff; border-color: #fff;
  box-shadow: 0 0 12px rgba(52,211,153,.6);
}
.fr-badge {
  display: inline-block; margin-left: 6px; background: #ef4444; color: #fff;
  border-radius: 9px; font-size: .66rem; padding: 0 6px; min-width: 17px;
  text-align: center; line-height: 17px; font-weight: bold; vertical-align: 1px;
}

/* ══════════ 彈出視窗 ══════════ */
.fr-mask {
  position: fixed; inset: 0; z-index: 9600; background: rgba(2,6,12,.72);
  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.fr-mask.hidden { display: none !important; }
.fr-modal {
  width: 66.67vw; height: 66.67vh; min-width: 680px; min-height: 460px;
  max-width: 96vw; max-height: 92vh;
  display: flex; flex-direction: column;
  background: #0f141c; border: 2px solid #34d399; border-radius: 10px;
  box-shadow: 0 24px 70px rgba(0,0,0,.75), inset 0 0 0 1px rgba(52,211,153,.25);
  overflow: hidden; animation: frIn .18s ease-out;
}
@keyframes frIn { from { opacity: 0; transform: scale(.96) translateY(10px); } to { opacity: 1; transform: none; } }
.fr-modal.full { width: 96vw; height: 92vh; }
.fr-head {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px 14px; background: linear-gradient(90deg, #1b2432, #16302a);
  border-bottom: 1px solid #34d399;
}
.fr-title { font-size: 1.08rem; font-weight: bold; color: #6ee7b7; }
.fr-sub { font-size: .74rem; color: #94a3b8; }
.fr-headbtns { margin-left: auto; display: flex; gap: 8px; }
.fr-body { flex: 1 1 auto; overflow-y: auto; padding: 12px 14px; }
.fr-foot {
  padding: 7px 14px; font-size: .74rem; color: #94a3b8; background: #131b26;
  border-top: 1px solid #2e3b4e; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
}
@media (max-width: 900px) { .fr-modal { width: 94vw; height: 88vh; min-width: 0; min-height: 0; } }

/* ══════════ 面板內容 ══════════ */
.fr-subs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #2e3b4e; }
.fr-sub {
  background: #0f1720; color: #94a3b8; border: 1px solid #2e3b4e;
  padding: 5px 13px; border-radius: 14px; cursor: pointer; font-size: .79rem;
}
.fr-sub:hover { border-color: #34d399; color: #e2e8f0; }
.fr-sub.on { color: #34d399; border-color: #34d399; background: rgba(52,211,153,.12); font-weight: bold; }

.fr-hero {
  background: linear-gradient(90deg, #1b2432, #16302a); border: 1px solid #34d399;
  border-radius: 6px; padding: 9px 12px; margin-bottom: 10px;
}
.fr-hero h3 { color: #6ee7b7; font-size: .95rem; margin: 0 0 6px; }
.fr-rows { display: flex; gap: 13px; flex-wrap: wrap; font-size: .79rem; margin-bottom: 3px; }
.fr-rows b { color: #e2e8f0; }
.fr-bar { height: 6px; background: #0d1219; border: 1px solid #334155; border-radius: 3px; overflow: hidden; margin: 4px 0; }
.fr-bar > div { height: 100%; background: linear-gradient(90deg, #0f766e, #34d399); }
.fr-bar.hp > div { background: linear-gradient(90deg, #b91c1c, #ef4444); }
.fr-bar.mp > div { background: linear-gradient(90deg, #1d4ed8, #3b82f6); }
.fr-bar.favor > div { background: linear-gradient(90deg, #b78a3f, #fbbf24); }
.fr-bar.act > div { background: linear-gradient(90deg, #00e5ff, #7dd3fc); }

.fr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 9px; }
.fr-card {
  background: #131b26; border: 1px solid #2e3b4e; border-radius: 6px;
  padding: 9px 10px; display: flex; flex-direction: column; gap: 6px;
}
.fr-card:hover { border-color: #34d399; }
.fr-card.follow { border-color: #00e5ff; background: #101a24; }
.fr-card.hurt { border-color: #ef4444; }
.fr-chead { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.fr-cname { font-size: .88rem; font-weight: bold; }
.fr-cmeta { font-size: .72rem; color: #94a3b8; white-space: nowrap; }
.fr-tags { display: flex; gap: 5px; flex-wrap: wrap; }
.fr-tag {
  font-size: .67rem; padding: 1px 7px; border-radius: 9px;
  border: 1px solid #2e3b4e; color: #94a3b8; background: #0f1720;
}
.fr-tag.ok { border-color: #10b981; color: #6ee7b7; }
.fr-tag.busy { border-color: #00e5ff; color: #67e8f9; }
.fr-tag.hurt { border-color: #ef4444; color: #fca5a5; }
.fr-tag.sect { border-color: #a78bfa; color: #c4b5fd; }
.fr-tag.role { border-color: #fbbf24; color: #fcd34d; }
.fr-tag.persona { border-color: #f472b6; color: #f9a8d4; }
.fr-slots { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
.fr-slot {
  background: #0f1720; border: 1px solid #2e3b4e; border-radius: 4px;
  padding: 3px 2px; font-size: .62rem; text-align: center; cursor: pointer;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #94a3b8; line-height: 1.3;
}
.fr-slot.filled { border-color: #10b981; color: #a7f3d0; }
.fr-slot:hover { border-color: #c89d54; color: #e2e8f0; }
.fr-attrs { display: flex; gap: 9px; flex-wrap: wrap; font-size: .72rem; color: #94a3b8; }
.fr-attrs b { color: #e2e8f0; }
.fr-btns { display: flex; gap: 5px; flex-wrap: wrap; }
.fr-note { font-size: .71rem; color: #7dd3fc; line-height: 1.45; }
.fr-dim { font-size: .71rem; color: #94a3b8; line-height: 1.5; }
.fr-empty { font-size: .79rem; color: #94a3b8; line-height: 1.6; padding: 8px 0; }
.fr-block { background: #131b26; border: 1px solid #2e3b4e; border-radius: 6px; padding: 9px 11px; margin-bottom: 8px; }
.fr-btitle { font-size: .85rem; font-weight: bold; color: #6ee7b7; margin-bottom: 6px; }
.fr-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 940px) { .fr-cols { grid-template-columns: 1fr; } }
.fr-row {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  background: #121822; border: 1px solid #2e3b4e; border-radius: 4px;
  padding: 5px 8px; font-size: .78rem;
}
.fr-row:hover { border-color: #c89d54; }
.fr-logline { font-size: .76rem; line-height: 1.5; border-left: 2px solid #2e3b4e; padding-left: 7px; color: #cbd5e1; }
.fr-logline.w { border-color: #fbbf24; }
.fr-logline.l { border-color: #10b981; }
.fr-logline.s { border-color: #ef4444; }
.fr-logline.g { border-color: #00e5ff; }
.fr-logtime { color: #64748b; font-size: .68rem; margin-right: 5px; }
.fr-logbox { display: flex; flex-direction: column; gap: 4px; max-height: 320px; overflow-y: auto; }
.fr-mini {
  background: #2b394a; color: #6ee7b7; border: 1px solid #34d399;
  border-radius: 3px; padding: 2px 7px; font-size: .72rem; cursor: pointer;
}
.fr-mini:hover { background: #3a4a5e; }
.fr-mini:disabled { opacity: .35; cursor: not-allowed; }
.fr-switch {
  cursor: pointer; font-size: .74rem; padding: 3px 9px; border-radius: 10px;
  border: 1px solid #2e3b4e; background: #0f1720; color: #94a3b8;
}
.fr-switch.on { border-color: #34d399; color: #6ee7b7; background: rgba(52,211,153,.14); font-weight: bold; }
.fr-codex { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 6px; max-height: 320px; overflow-y: auto; }
.fr-cx {
  background: #0d1219; border: 1px solid #2e3b4e; border-top: 3px solid #334155;
  border-radius: 5px; padding: 6px 4px; text-align: center; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 2px; justify-content: center;
}
.fr-cx:hover { border-color: #34d399; }
.fr-cx.friend { border-top-color: #10b981; background: #101a24; }
.fr-cx .ci { font-size: 1.1rem; }
.fr-cx .cn { font-size: .68rem; color: #e2e8f0; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr-cx .cc { font-size: .62rem; color: #fbbf24; }
`;
    var st = document.createElement('style');
    st.id = 'friend-style';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* ══════════ 工具 ══════════ */
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function esc(s) { return String(s == null ? '' : s); }

  function mkBtn(id, text, cls) {
    var b = document.createElement('button');
    b.setAttribute('id', id);
    b.className = cls || 'sys-btn';
    b.textContent = text;
    return b;
  }

  /* ══════════ 建立彈出視窗 ══════════ */
  function buildModal(ui) {
    if (ui._frEls) return;
    if (!document.body) return;

    var mask = document.createElement('div');
    mask.id = MASK_ID;
    mask.className = 'fr-mask hidden';

    var modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'fr-modal';

    var head = document.createElement('div'); head.className = 'fr-head';
    var title = document.createElement('span'); title.className = 'fr-title'; title.textContent = '🤝 江湖好友';
    var sub = document.createElement('span'); sub.className = 'fr-sub'; sub.textContent = '自動行動 · 組隊同行 · 送禮結交';
    var btns = document.createElement('span'); btns.className = 'fr-headbtns';
    var bRefresh = mkBtn('fr-refresh', '🔄 重新整理');
    var bFull = mkBtn('fr-full', '⛶ 全螢幕');
    var bClose = mkBtn('fr-close', '✕ 關閉', 'sys-btn danger');
    btns.appendChild(bRefresh); btns.appendChild(bFull); btns.appendChild(bClose);
    head.appendChild(title); head.appendChild(sub); head.appendChild(btns);

    var body = document.createElement('div'); body.className = 'fr-body';

    var foot = document.createElement('div'); foot.className = 'fr-foot';
    var hint = document.createElement('span'); hint.className = 'fr-note';
    hint.textContent = '好友會自己刷怪、練等、打裝備、拜入門派、學技能、點潛能；開啟「同行」即會加入你的戰鬥隊伍。';
    var foot2 = document.createElement('span'); foot2.className = 'fr-dim';
    foot2.textContent = '按 Esc 或點視窗外的暗色區域可關閉';
    foot.appendChild(hint); foot.appendChild(foot2);

    modal.appendChild(head); modal.appendChild(body); modal.appendChild(foot);
    mask.appendChild(modal);
    document.body.appendChild(mask);

    ui._frEls = { mask: mask, modal: modal, body: body, title: title, sub: sub, hint: hint };

    bClose.addEventListener('click', function () { ui.closeFriendModal(); });
    bFull.addEventListener('click', function () { modal.classList.toggle('full'); });
    bRefresh.addEventListener('click', function () { ui.renderFriendPanel(); });
    mask.addEventListener('click', function (e) { if (e.target === mask) ui.closeFriendModal(); });
  }

  /* ══════════ 掛載 _buildDom ══════════ */
  var _buildDom = proto._buildDom;
  proto._buildDom = function () {
    _buildDom.call(this);
    injectStyles();
    buildModal(this);

    this.frSub = this.frSub || 'roster';
    this.frSel = this.frSel || null;

    var root = this.el.root;
    if (!root) return;
    var self = this;

    // ① 標籤按鈕（插在「⚔️ 冒險者公會」之前）
    var tabs = root.querySelector('.town-tabs');
    if (tabs && !tabs.querySelector('[data-ttab="friend"]')) {
      var btn = document.createElement('button');
      btn.className = 'town-tab-btn';
      btn.setAttribute('data-ttab', 'friend');
      btn.textContent = '🤝 好友';
      btn.addEventListener('click', function () { self.switchTab('friend'); });
      var guildBtn = tabs.querySelector('[data-ttab="guild"]');
      if (guildBtn) tabs.insertBefore(btn, guildBtn);
      else tabs.appendChild(btn);
    }

    // ② 面板容器（節點會被搬進彈窗，關閉時搬回）
    var bottom = root.querySelector('.town-bottom');
    if (bottom && !root.querySelector('#town-panel-friend')) {
      var panel = document.createElement('div');
      panel.id = 'town-panel-friend';
      panel.className = 'town-tabpanel hidden';
      bottom.appendChild(panel);
      this.el.panels.friend = panel;
    }

    try { this._frUpdateBadge(); } catch (e) { /* 忽略 */ }
  };

  /* ══════════ 標籤徽章 ══════════ */
  proto._frUpdateBadge = function () {
    var root = this.el && this.el.root;
    if (!root || !root.querySelectorAll) return;
    var btn = null;
    root.querySelectorAll('.town-tab-btn').forEach(function (b) {
      if (b.getAttribute('data-ttab') === 'friend') btn = b;
    });
    if (!btn) return;
    var n = 0;
    try { n = this.town.friendFollowers().length; } catch (e) { /* 忽略 */ }
    var badge = btn.querySelector ? btn.querySelector('.fr-badge') : null;
    if (n > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'fr-badge'; btn.appendChild(badge); }
      var txt = String(n);
      if (badge.textContent !== txt) badge.textContent = txt;
      btn.setAttribute('title', '好友同行中：' + n + ' 位');
    } else if (badge && badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }
  };

  /* ══════════ 開 / 關 彈窗 ══════════ */
  proto.openFriendModal = function () {
    if (!this._frEls) return false;
    if (!this.el || !this.el.panels) return false;
    var panel = this.el.panels.friend;
    if (!panel) return false;

    if (this._ovKey && typeof this.closeTownModal === 'function') this.closeTownModal(true);

    if (!panel._frHome) panel._frHome = panel.parentNode;
    this._frEls.body.appendChild(panel);   // 節點搬移
    panel.classList.remove('hidden');

    this._frEls.mask.classList.remove('hidden');
    this._frOpen = true;
    this.renderFriendPanel();
    this._frHighlight('friend');
    return true;
  };

  proto.closeFriendModal = function (silent) {
    if (!this._frOpen) return false;
    var panel = (this.el && this.el.panels) ? this.el.panels.friend : null;
    if (panel) {
      if (panel._frHome && panel._frHome.appendChild) panel._frHome.appendChild(panel);
      panel.classList.add('hidden');
    }
    if (this._frEls) {
      if (this._frEls.body) this._frEls.body.scrollTop = 0;
      this._frEls.mask.classList.add('hidden');
      this._frEls.modal.classList.remove('full');
    }
    this._frOpen = false;
    if (!silent) this._frHighlight(this.tab || 'build');
    return true;
  };

  proto._frHighlight = function (name) {
    var root = this.el && this.el.root;
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.town-tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-ttab') === name);
    });
  };

  /* ══════════ 攔截 switchTab / render / close ══════════ */
  var _switchTab = proto.switchTab;
  proto.switchTab = function (name) {
    if (name === 'friend') { this.openFriendModal(); return; }
    if (this._frOpen) this.closeFriendModal(true);
    _switchTab.call(this, name);
  };

  var _renderBottom = proto.renderBottom;
  proto.renderBottom = function () {
    if (this.tab === 'friend') { this.renderFriendPanel(); return; }
    _renderBottom.call(this);
  };

  var _render = proto.render;
  proto.render = function () {
    _render.call(this);
    try { this._frUpdateBadge(); } catch (e) { /* 忽略 */ }
    if (this._frOpen) {
      var body = this._frEls && this._frEls.body;
      var st = body ? (body.scrollTop || 0) : 0;
      this.renderFriendPanel();
      if (body) body.scrollTop = st;
    }
  };

  var _renderTownTab = proto.renderTownTab;
  proto.renderTownTab = function () {
    _renderTownTab.call(this);
    try { this._frUpdateBadge(); } catch (e) { /* 忽略 */ }
    if (this._frOpen) this.renderFriendPanel();
  };

  var _close = proto.close;
  proto.close = function () {
    if (this._frOpen) { this.closeFriendModal(); return; }
    _close.call(this);
  };

  /* ══════════ UI 狀態操作 ══════════ */
  proto.frSetSub = function (id) { this.frSub = id; this.renderFriendPanel(); };
  proto.frSelect = function (id) { this.frSel = (this.frSel === id ? null : id); this.renderFriendPanel(); };

  /* ══════════ 主面板 ══════════ */
  proto.renderFriendPanel = function () {
    var panel = this.el.panels && this.el.panels.friend;
    if (!panel) return;
    var TS = this.town;
    if (!TS || !TS.friendReport) { panel.innerHTML = '<div class="fr-empty">好友系統未載入。</div>'; return; }

    var rep;
    try { rep = TS.friendReport(); }
    catch (e) { panel.innerHTML = '<div class="fr-empty">讀取失敗：' + esc(e.message) + '</div>'; return; }

    var html = this.frHeaderHtml(rep) + '<div class="fr-subs">';
    SUBS.forEach(function (s) {
      var n = '';
      if (s.id === 'roster' && rep.list.length) n = '（' + rep.list.length + '）';
      if (s.id === 'team' && rep.stats.followers) n = '（' + rep.stats.followers + '）';
      html += '<button class="fr-sub' + (s.id === this.frSub ? ' on' : '') + '" data-frsub="' + s.id + '">' + s.label + n + '</button>';
    }, this);
    html += '</div>';

    var sub = this.frSub || 'roster';
    if (sub === 'roster') html += this.frRosterHtml(rep);
    else if (sub === 'team') html += this.frTeamHtml(rep);
    else if (sub === 'feed') html += this.frFeedHtml(rep);
    else if (sub === 'social') html += this.frSocialHtml(rep);
    else if (sub === 'codex') html += this.frCodexHtml(rep);
    else html += this.frStatHtml(rep);

    panel.innerHTML = html;
    this.frBind(panel);
  };

  /* ══════════ 頂部資訊 ══════════ */
  proto.frHeaderHtml = function (rep) {
    var s = rep.stats, a = s.aura;
    var html = '<div class="fr-hero">';
    html += '<h3>🤝 江湖好友 —— 名人好友會自行行走江湖，也會與你並肩作戰</h3>';
    html += '<div class="fr-rows">' +
      '<span>👥 好友 <b>' + s.total + '</b> / ' + s.slots + '</span>' +
      '<span>🚩 同行 <b>' + s.followers + '</b> / ' + s.followMax + '</span>' +
      '<span>📈 平均等級 <b>Lv.' + s.avgLv + '</b></span>' +
      '<span>⚔️ 平均戰力 <b>' + fmt(s.avgPower) + '</b></span>' +
      '<span>🤖 自動期數 <b>' + fmt(s.ticks) + '</b></span>' +
      '</div>';
    if (a.count > 0) {
      html += '<div class="fr-rows"><span>✨ 同行光環：' +
        '攻擊 +' + pct(a.atkPct) + '　防禦 +' + pct(a.defPct) + '　氣血 +' + pct(a.hpPct) +
        '　小鎮收入 +' + pct(a.incomeMul) + '　武點 +' + pct(a.spMul) +
        '　治安 +' + Math.floor(a.order) + '　魅力 +' + Math.round(a.appeal) +
        '</span></div>';
      html += '<div class="fr-rows"><span class="fr-dim">同行中：' +
        a.list.map(function (x) { return x.icon + x.name + '（Lv.' + x.lv + '｜' + x.tier.name + '）'; }).join('、') +
        '</span></div>';
    } else {
      html += '<div class="fr-rows"><span class="fr-dim">目前沒有好友同行 —— 到「🚩 組隊同行」開啟，好友就會加入你的戰鬥隊伍。</span></div>';
    }
    html += '</div>';
    return html;
  };

  /* ══════════ ① 好友名單 ══════════ */
  proto.frRosterHtml = function (rep) {
    if (!rep.list.length) {
      return '<div class="fr-empty">你還沒有結交任何好友。<br>' +
        '到「📖 名人圖鑑」花銀兩結交一位世界名人，之後他就會自己行動、自己變強，' +
        '需要人手時再邀他同行即可。</div>';
    }
    var html = '<div class="fr-grid">';
    var self = this;
    rep.list.forEach(function (f) { html += self.frCardHtml(f); });
    html += '</div>';
    return html;
  };

  proto.frCardHtml = function (f) {
    var d = f.derived;
    var expPct = f.maxExp > 0 ? Math.floor((f.exp || 0) / f.maxExp * 100) : 0;
    var favPct = Math.floor((f.favor || 0) / (f.favorMax || 100) * 100);
    var actPct = f.actionTotal > 0 ? Math.round((1 - f.actionLeft / f.actionTotal) * 100) : 0;
    var isSel = this.frSel === f.id;

    var cls = 'fr-card';
    if (f.following) cls += ' follow';
    else if (f.status === 'injured') cls += ' hurt';

    var html = '<div class="' + cls + '">';
    html += '<div class="fr-chead" data-frsel="' + f.id + '" style="cursor:pointer">' +
      '<span class="fr-cname">' + f.icon + ' ' + esc(f.name) + '</span>' +
      '<span class="fr-cmeta">Lv.' + f.lv + '　⚔️ ' + fmt(f.power) + '</span>' +
      '</div>';

    // 名人身份列
    if (f.profile) {
      html += '<div class="fr-dim">' + esc(f.profile.title || '') + '</div>';
    }

    // 標籤
    html += '<div class="fr-tags">';
    if (f.profile) {
      html += '<span class="fr-tag persona">' + (f.profile.tier && f.profile.tier.icon ? f.profile.tier.icon : '★') + ' ' +
        esc((f.profile.tier && f.profile.tier.name) || '') + '</span>';
      html += '<span class="fr-tag sect">' + (f.profile.socIcon || '') + ' ' + esc(f.profile.socName || '') + '</span>';
    }
    html += '<span class="fr-tag role">' + (f.role.icon || '🧭') + ' ' + (f.role.name || f.roleId) + '</span>';
    if (f.sectName) html += '<span class="fr-tag sect">' + esc(f.sectName) + '</span>';
    if (f.following) html += '<span class="fr-tag busy">🚩 同行中</span>';
    else if (f.status === 'injured') html += '<span class="fr-tag hurt">🤕 養傷 ' + f.injuredLeft + ' 期</span>';
    else if (f.retired) html += '<span class="fr-tag">🏮 已退隱</span>';
    else html += '<span class="fr-tag ok">🏃 自由行動</span>';
    html += '</div>';

    // 好感
    html += '<div class="fr-rows"><span>' + f.tier.icon + ' ' + f.tier.name +
      '　好感 ' + f.favor + ' / ' + f.favorMax + '</span></div>';
    html += '<div class="fr-bar favor"><div style="width:' + favPct + '%"></div></div>';

    // 目前行動
    html += '<div class="fr-note">📡 目前行動：' + esc(f.actionText) + '</div>';
    if (!f.following && f.status !== 'injured' && f.actionTotal > 0) {
      html += '<div class="fr-bar act"><div style="width:' + actPct + '%"></div></div>';
    }

    // 經驗
    html += '<div class="fr-dim">經驗 ' + fmt(f.exp) + ' / ' + fmt(f.maxExp) + '　潛能未配 ' + f.freePoints +
      '　自身武點 ' + fmt(f.sp) + '</div>';
    html += '<div class="fr-bar"><div style="width:' + expPct + '%"></div></div>';

    // 四維 / 戰鬥
    html += '<div class="fr-attrs">' +
      '<span>體魄 <b>' + f.attrs.con + '</b></span>' +
      '<span>力道 <b>' + f.attrs.str + '</b></span>' +
      '<span>身法 <b>' + f.attrs.agi + '</b></span>' +
      '<span>內息 <b>' + f.attrs.int + '</b></span>' +
      '</div>';
    html += '<div class="fr-attrs">' +
      '<span>攻 <b>' + fmt(d.atk) + '</b></span>' +
      '<span>防 <b>' + fmt(d.def) + '</b></span>' +
      '<span>血 <b>' + fmt(d.maxHp) + '</b></span>' +
      '<span>命中 <b>' + fmt(d.hit) + '</b></span>' +
      '<span>閃避 <b>' + fmt(d.eva) + '</b></span>' +
      '<span>爆擊 <b>' + fmt(d.crit) + '</b></span>' +
      '</div>';

    // 十部位裝備
    html += '<div class="fr-slots">';
    var self = this;
    var es = window.HY.game && window.HY.game.equipSys;
    ['mainhand', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring_left', 'ring_right'].forEach(function (s) {
      var it = f.equipment[s];
      var icon = (es && es.SLOTS && es.SLOTS[s]) ? es.SLOTS[s].icon : '·';
      html += '<div class="fr-slot' + (it ? ' filled' : '') + '">' + icon + '<br>' +
        esc((it ? (it.name || '裝備') : '空').substring(0, 4)) + '</div>';
    });
    html += '</div>';

    // 展開詳細
    if (isSel) {
      if (f.profile) {
        html += '<div class="fr-dim">' +
          '洞府 ' + (f.profile.home.styleIcon || '🏠') + esc(f.profile.home.styleName) + ' Lv.' + f.profile.home.lv +
          '　武點 ×' + f.profile.spMul.toFixed(2) + '　紋銀 ×' + f.profile.goldMul.toFixed(2) + '　掉寶 ×' + f.profile.dropMul.toFixed(2) +
          (f.profile.socDesc ? '<br>' + esc(f.profile.socDesc) : '') +
          '</div>';
      }
      html += '<div class="fr-dim">' +
        '招式 ' + f.skillCount + ' 式　心法 ' + f.xinfaCount + ' 階　身法 ' + f.qinggongCount + ' 階　經脈 ' + f.meridianCount + ' 脈<br>' +
        '累計：擊殺 ' + f.kills + '　升級 ' + f.levelUps + ' 次　撿寶 ' + f.drops + ' 件　換裝 ' + f.equips + ' 件<br>' +
        '自行入派 ' + f.sectJoins + ' 次　自學招式 ' + f.skillsLearned + ' 式　自動配點 ' + f.pointsSpent + ' 點<br>' +
        '帶回紋銀 ' + fmt(f.goldEarned) + ' 兩　自賺武點 ' + fmt(f.spEarned) +
        '</div>';
      html += '<div class="fr-btns">' +
        (f.following
          ? '<button class="fr-mini" data-frfollow="' + f.id + '">👋 結束同行</button>'
          : (f.canFollow.ok
            ? '<button class="fr-mini" data-frfollow="' + f.id + '">🚩 邀他同行</button>'
            : '<button class="fr-mini" disabled title="' + esc(f.canFollow.msg) + '">🚩 無法同行</button>')) +
        '<button class="fr-mini" data-frspar="' + f.id + '">⚔️ 切磋</button>' +
        '<button class="fr-mini" data-frtalk="' + f.id + '">🍵 論道</button>' +
        (f.canGift.ok
          ? '<button class="fr-mini" data-frgift="' + f.id + '">🎁 送禮（' + fmt(f.giftCost) + ' 兩）</button>'
          : '<button class="fr-mini" disabled title="' + esc(f.canGift.msg) + '">🎁 無法送禮</button>') +
        '<button class="fr-mini" data-frdismiss="' + f.id + '">💔 斷交</button>' +
        '</div>';
      // 背包
      if (f.bag && f.bag.length) {
        html += '<div class="fr-dim">好友背包（' + f.bag.length + ' 件）：</div>';
        f.bag.slice(0, 6).forEach(function (it, i) {
          html += '<div class="fr-row"><span>' + esc(self.town.friendItemLabel(it)) + '　Lv.' + (it.reqLv || 1) +
            '</span><button class="fr-mini" data-frtake="' + f.id + '|' + i + '">取回</button></div>';
        });
      }
    }
    html += '</div>';
    return html;
  };

  /* ══════════ ② 組隊同行 ══════════ */
  proto.frTeamHtml = function (rep) {
    var s = rep.stats;
    var partySize = 0;
    try { partySize = (window.HY.game && window.HY.game.partySys) ? window.HY.game.partySys.getPartySize() - s.followers : 0; } catch (e) { /* 忽略 */ }
    var html = '<div class="fr-block">';
    html += '<div class="fr-btitle">🚩 出戰隊伍（同行好友會直接加入戰鬥）</div>';
    html += '<div class="fr-rows">' +
      '<span>隊伍人數（含同行） <b>' + (partySize + s.followers) + ' / 5</b></span>' +
      '<span>同行名額 <b>' + s.followers + ' / ' + s.followMax + '</b></span>' +
      '<span>全隊戰力合計 <b>' + fmt(s.totalPower) + '</b></span>' +
      '</div>';
    html += '<div class="fr-dim">戰鬥時敵方數量＝我方人數，所以「幾個好友同行就會多打幾隻怪」。<br>' +
      '同行好友在戰鬥中會依自動戰術出招、也會吃你設定的隊友用藥與輔助規則。</div>';
    html += '<div class="fr-btns" style="margin-top:6px">' +
      '<button class="fr-mini" data-frfollowall="1">🚩 一鍵全員同行</button>' +
      '<button class="fr-mini" data-frunfollow="1">👋 全部結束同行</button>' +
      '</div>';
    html += '</div>';

    if (!rep.list.length) return html + '<div class="fr-empty">還沒有好友可以組隊。</div>';

    html += '<div class="fr-grid">';
    rep.list.forEach(function (f) {
      var cls = 'fr-card' + (f.following ? ' follow' : '');
      html += '<div class="' + cls + '">';
      html += '<div class="fr-chead"><span class="fr-cname">' + f.icon + ' ' + esc(f.name) + '</span>' +
        '<span class="fr-cmeta">Lv.' + f.lv + '　⚔️ ' + fmt(f.power) + '</span></div>';
      html += '<div class="fr-tags">' + f.tier.icon + ' ' + f.tier.name +
        (f.following ? '　<span class="fr-tag busy">同行中</span>' : '') +
        (f.status === 'injured' ? '　<span class="fr-tag hurt">養傷中</span>' : '') + '</div>';
      html += '<div class="fr-dim">' + esc(f.sectName) + '　' + (f.role.icon || '') + (f.role.name || '') +
        (f.profile ? '　' + (f.profile.socIcon || '') + esc(f.profile.socName || '') : '') + '</div>';
      html += '<div class="fr-note">📡 ' + esc(f.actionText) + '</div>';
      html += '<div class="fr-btns">';
      if (f.following) html += '<button class="fr-mini" data-frfollow="' + f.id + '">👋 結束同行</button>';
      else if (f.canFollow.ok) html += '<button class="fr-mini" data-frfollow="' + f.id + '">🚩 邀他同行</button>';
      else html += '<button class="fr-mini" disabled title="' + esc(f.canFollow.msg) + '">🚩 無法同行</button>';
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  };

  /* ══════════ ③ 好友動態 ══════════ */
  proto.frFeedHtml = function (rep) {
    var html = '<div class="fr-block"><div class="fr-btitle">📡 好友目前行動一覽</div>';
    if (!rep.list.length) {
      html += '<div class="fr-empty">還沒有好友。</div></div>';
      return html;
    }
    rep.list.forEach(function (f) {
      html += '<div class="fr-row"><span>' + f.icon + ' <b>' + esc(f.name) + '</b>　Lv.' + f.lv + '　' +
        esc(f.sectName) + '</span><span>' + esc(f.actionText) + '</span></div>';
    });
    html += '</div>';

    html += '<div class="fr-block"><div class="fr-btitle">📜 好友事件紀錄</div>';
    var logs = rep.log || [];
    if (!logs.length) {
      html += '<div class="fr-empty">尚無紀錄。好友開始行動後就會出現在這裡。</div>';
    } else {
      html += '<div class="fr-logbox">';
      logs.forEach(function (l) {
        var cls = l.type === 'wealth' ? ' w' : (l.type === 'loot' ? ' l' : (l.type === 'system' ? ' s' : (l.type === 'gain' ? ' g' : '')));
        var d = new Date(l.t);
        var ts = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
        html += '<div class="fr-logline' + cls + '"><span class="fr-logtime">' + ts + '</span>' + esc(l.msg) + '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  };

  /* ══════════ ④ 互動 ══════════ */
  proto.frSocialHtml = function (rep) {
    var html = '<div class="fr-block"><div class="fr-btitle">💬 互動說明</div>' +
      '<div class="fr-dim">' +
      '🎁 送禮：花銀兩提升好感（好友等級越高越貴）。<br>' +
      '⚔️ 切磋：比戰力，勝負不影響結果，雙方都得好感與經驗。<br>' +
      '🍵 論道：花你 2 點武點，好友獲得武學點數（他會拿去自學招式／心法／經脈）＋好感。<br>' +
      '🎽 贈裝：把你行囊中的裝備送給好友，他會立刻自動比較戰力換上。<br>' +
      '好感越高 → 同行光環越強（每位同行好友 ×1~×5 倍）、好友修煉越快。' +
      '</div></div>';

    if (!rep.list.length) return html + '<div class="fr-empty">還沒有好友可以互動。</div>';

    html += '<div class="fr-cols">';
    rep.list.forEach(function (f) {
      html += '<div class="fr-card">';
      html += '<div class="fr-chead"><span class="fr-cname">' + f.icon + ' ' + esc(f.name) + '</span>' +
        '<span class="fr-cmeta">' + f.tier.icon + ' ' + f.tier.name + '</span></div>';
      html += '<div class="fr-dim">好感 ' + f.favor + ' / ' + f.favorMax + '　Lv.' + f.lv + '　⚔️ ' + fmt(f.power) + '</div>';
      html += '<div class="fr-bar favor"><div style="width:' + Math.floor(f.favor / f.favorMax * 100) + '%"></div></div>';
      html += '<div class="fr-btns">' +
        (f.canGift.ok
          ? '<button class="fr-mini" data-frgift="' + f.id + '">🎁 送禮（' + fmt(f.giftCost) + ' 兩）</button>'
          : '<button class="fr-mini" disabled title="' + esc(f.canGift.msg) + '">🎁 ' + esc(f.canGift.msg) + '</button>') +
        '<button class="fr-mini" data-frspar="' + f.id + '">⚔️ 切磋</button>' +
        '<button class="fr-mini" data-frtalk="' + f.id + '">🍵 論道（2 武點）</button>' +
        '</div>';
      // 贈裝
      var give = rep.giveTargets || [];
      if (give.length) {
        html += '<div class="fr-dim">贈送裝備（你的行囊）：</div>';
        give.slice(0, 5).forEach(function (g) {
          html += '<div class="fr-row"><span>' + esc(g.name) + '　Lv.' + g.reqLv + '　戰力 ' + fmt(g.power) +
            '</span><button class="fr-mini" data-frgive="' + f.id + '|' + g.idx + '">贈送</button></div>';
        });
      } else {
        html += '<div class="fr-dim">你的行囊裡沒有可贈送的裝備。</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  };

  /* ══════════ ⑤ 名人圖鑑 ══════════ */
  proto.frCodexHtml = function (rep) {
    var html = '<div class="fr-block"><div class="fr-btitle">📖 名人圖鑑 —— 可結交的世界名人</div>';
    html += '<div class="fr-dim">結交一位名人需要銀兩（依其名望與星級計算）；名望越高、星級越高的名人，起始實力也越強。' +
      '正在小鎮作客的名人有結交優惠。（好友名額：' + rep.stats.total + ' / ' + rep.stats.slots + '）</div>';
    if (!rep.canRecruit.ok) html += '<div class="fr-note">⚠️ ' + esc(rep.canRecruit.msg) + '</div>';
    html += '</div>';

    var list = rep.candidates || [];
    if (!list.length) return html + '<div class="fr-empty">目前沒有可結交的名人（可能都已成為好友或反目）。</div>';

    html += '<div class="fr-codex">';
    list.forEach(function (c) {
      html += '<div class="fr-cx' + (c.already ? ' friend' : '') + '" title="' + esc(c.title || '') + '">' +
        '<span class="ci">' + (c.icon || '🧭') + '</span>' +
        '<span class="cn">' + esc(c.name) + '</span>' +
        '<span class="cc">Lv.' + c.lv + '　' + fmt(c.cost) + ' 兩</span>' +
        (c.isVisitor ? '<span class="cc">作客優惠</span>' : '') +
        (c.already
          ? '<span class="cc">已是好友</span>'
          : '<button class="fr-mini" data-frrecruit="' + esc(c.id) + '|' + esc(c.name) + '|' + c.lv + '">🤝 結交</button>') +
        '</div>';
    });
    html += '</div>';
    return html;
  };

  /* ══════════ ⑥ 統計與設定 ══════════ */
  proto.frStatHtml = function (rep) {
    var s = rep.stats, st = s.stats, a = s.aura;
    var html = '<div class="fr-block"><div class="fr-btitle">🤖 名人好友自動行為開關</div>';
    html += '<div class="fr-dim">關掉之後，好友就不會做該項行為（例如關掉「自動裝備」他就只會把裝備堆在背包）。</div>';
    html += '<div class="fr-btns" style="margin:6px 0">' +
      '<button class="fr-mini" data-frautoall="1">✅ 全部開啟</button>' +
      '<button class="fr-mini" data-frautoall="0">⏸️ 全部關閉</button></div>';
    (rep.autoKeys || []).forEach(function (k) {
      var on = !!s.auto[k.id];
      html += '<div class="fr-row"><span title="' + esc(k.desc) + '">' + k.icon + ' ' + k.name +
        '　<span class="fr-dim">' + esc(k.desc) + '</span></span>' +
        '<button class="fr-switch' + (on ? ' on' : '') + '" data-frauto="' + k.id + '">' + (on ? '開啟' : '關閉') + '</button></div>';
    });
    html += '</div>';

    html += '<div class="fr-cols">';
    html += '<div class="fr-block"><div class="fr-btitle">📊 好友累計成果</div>' +
      '<div class="fr-dim">' +
      '結交好友 ' + st.recruited + ' 位<br>' +
      '自行升級 ' + st.levelUps + ' 次<br>' +
      '刷怪擊殺 ' + fmt(st.kills) + ' 隻<br>' +
      '撿到戰利品 ' + st.drops + ' 件<br>' +
      '自動換裝 ' + st.equips + ' 件<br>' +
      '自學招式 ' + st.skills + ' 式<br>' +
      '自行入派 ' + st.sectJoins + ' 次<br>' +
      '自動配點 ' + st.points + ' 點<br>' +
      '帶回紋銀 ' + fmt(st.gold) + ' 兩<br>' +
      '自賺武點 ' + fmt(st.sp) + ' 點<br>' +
      '負傷 ' + st.injured + ' 次<br>' +
      '送禮 ' + st.gifts + ' ／切磋 ' + st.spars + ' ／論道 ' + st.talks +
      '</div></div>';

    html += '<div class="fr-block"><div class="fr-btitle">✨ 同行光環總表（' + a.count + ' 位同行）</div>';
    if (a.count === 0) {
      html += '<div class="fr-empty">目前沒有好友同行，因此沒有光環。</div>';
    } else {
      var rows = [
        ['🗡️ 全隊攻擊', '+' + pct(a.atkPct)],
        ['🛡️ 全隊防禦', '+' + pct(a.defPct)],
        ['❤️ 全隊氣血', '+' + pct(a.hpPct)],
        ['💵 小鎮收入', '+' + pct(a.incomeMul)],
        ['📖 小鎮武點', '+' + pct(a.spMul)],
        ['🛡️ 小鎮治安', '+' + Math.floor(a.order)],
        ['🧲 小鎮魅力', '+' + Math.round(a.appeal)]
      ];
      rows.forEach(function (r) {
        html += '<div class="fr-row"><span>' + r[0] + '</span><span><b>' + r[1] + '</b></span></div>';
      });
    }
    html += '</div></div>';

    html += '<div class="fr-block"><div class="fr-btitle">📘 玩法說明</div><div class="fr-dim">' +
      '① 在「📖 名人圖鑑」花銀兩結交世界名人（名額隨小鎮等級提升）。<br>' +
      '② 好友會每 ' + Math.round((rep.config.TICK_MS || 3000) / 1000) + ' 秒自行行動 1 期：刷怪、閉關、尋寶、走鏢、療傷、社交。' +
      '他會自己升級、自己點潛能、自己拜入門派、自己學招式／心法／身法、自己打通經脈、自己把打到的裝備換上。<br>' +
      '③ 好友會把賺到的紋銀與丹藥帶回來給你，裝備則先進他的背包（可隨時取回）。<br>' +
      '④ 到「🚩 組隊同行」開啟同行，好友就會直接加入你的戰鬥隊伍（最多同時 5 人出戰）。<br>' +
      '⑤ 好感越高，同行光環越強、好友修煉越快；用「💬 互動」送禮／切磋／論道提升好感。<br>' +
      '⑥ 你離線時好友仍會繼續行動（最多補算 ' + (rep.config.OFFLINE_MAX_STEPS || 300) + ' 期）。' +
      '</div></div>';

    return html;
  };

  /* ══════════ 事件綁定 ══════════ */
  proto.frBind = function (panel) {
    var self = this;
    var TS = this.town;

    function one(sel, fn) {
      panel.querySelectorAll(sel).forEach(function (el) {
        el.addEventListener('click', function (e) { e.preventDefault(); fn(el, e); });
      });
    }
    function refresh() { self.renderFriendPanel(); }

    one('[data-frsub]', function (el) { self.frSetSub(el.getAttribute('data-frsub')); });
    one('[data-frsel]', function (el) { self.frSelect(el.getAttribute('data-frsel')); });

    one('[data-frfollow]', function (el) { if (TS.friendFollow(el.getAttribute('data-frfollow'))) refresh(); });
    one('[data-frfollowall]', function () {
      var n = TS.friendFollowAll();
      if (n === 0) alert('沒有可同行的好友（名額已滿或好友正在養傷）。');
      refresh();
    });
    one('[data-frunfollow]', function () { TS.friendUnfollowAll(); refresh(); });

    one('[data-frgift]', function (el) { if (TS.friendGift(el.getAttribute('data-frgift'))) refresh(); });
    one('[data-frspar]', function (el) { if (TS.friendSpar(el.getAttribute('data-frspar'))) refresh(); });
    one('[data-frtalk]', function (el) { if (TS.friendTalk(el.getAttribute('data-frtalk'))) refresh(); });

    one('[data-frgive]', function (el) {
      var p = el.getAttribute('data-frgive').split('|');
      if (TS.friendGiveEquip(p[0], parseInt(p[1], 10))) refresh();
    });
    one('[data-frtake]', function (el) {
      var p = el.getAttribute('data-frtake').split('|');
      if (TS.friendTakeLoot(p[0], parseInt(p[1], 10))) refresh();
    });
    one('[data-frdismiss]', function (el) {
      var id = el.getAttribute('data-frdismiss');
      var f = TS.friendById(id);
      if (!f) return;
      var warn = (f.favor <= 40)
        ? '\n\n⚠️ 此人好感偏低，斷交可能導致他記恨在心、成為你的仇敵！'
        : '';
      if (confirm('確定與【' + f.name + '】斷交？\n他身上的裝備與背包物品會全部回到你的行囊。' + warn)) {
        if (TS.friendDismiss(id)) { self.frSel = null; refresh(); }
      }
    });

    one('[data-frrecruit]', function (el) {
      var p = el.getAttribute('data-frrecruit').split('|');
      var cand = { id: p[0], name: p[1], lv: parseInt(p[2], 10) };
      var cost = TS.friendRecruitCost(cand);
      if (!confirm('確定花 ' + cost.toLocaleString() + ' 兩與【' + cand.name + '】結為好友？')) return;
      if (TS.friendRecruit(cand)) { self.frSub = 'roster'; refresh(); }
    });

    one('[data-frauto]', function (el) { TS.friendToggleAuto(el.getAttribute('data-frauto')); refresh(); });
    one('[data-frautoall]', function (el) {
      TS.friendToggleAutoAll(el.getAttribute('data-frautoall') === '1');
      refresh();
    });
  };

  // 【v2 改動】增加 injectStyles 對外暴露
  window.HY.UIFriend = {
    version: '2.1',
    subs: SUBS.length,
    modalId: MODAL_ID,
    maskId: MASK_ID,
    injectStyles: injectStyles,
    buildModal: buildModal
  };
  console.log('[uiFriend] ✓ 已載入（好友分頁 + 彈出視窗；標籤已停用閃動）');
})();