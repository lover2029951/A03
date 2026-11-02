// js/uiTown.js (v2.3)
// ⭐ 我的小鎮：全螢幕 UI（格狀城鎮／建造／研究／定居／職務／節慶／地價評鑑）
//
// v2.3 調整：📜 小鎮日誌不再顯示逐期紀錄（週期 #N：+X 兩、+Y 武點）
//            → 由檔頭開關 SHOW_TICK_LOG 控制（預設 false；設 true 可恢復）
// v2.2 新增：
//   ⭐ 左右兩側欄位可點擊開合（整欄收合 + 區段收合，狀態自動記憶）
//   ⭐ 下方面板高度加倍（CSS 變數 --town-bottom-h）
//   ⭐ 新增底部分頁：🎊 節慶
//   ⭐ 分類由 HY.Data.TOWN.CATS 動態產生（支援擴充包的山水／文教／商貿／名勝）
//   ⭐ 頂列加入 地價、年度評鑑稱號、四季
//   ⭐ 支援 INCOME_SCALE：收入以「實際入帳值」顯示（可為小數）
// v2.1 修正：地圖頭像類別 town-char → town-avatar（解除與列表列撞名）
// 入口按鈕由本檔自行注入 top-bar，無須修改 index.html
window.HY = window.HY || {};

(function () {
  var CELL = 44;
  var GAP = 4;
  var LS_KEY = 'hy_town_ui_collapse_v1';
  // ⭐ 是否在「📜 小鎮日誌」顯示逐期紀錄（週期 #N：+X 兩…）。設 false 即不再顯示。
  var SHOW_TICK_LOG = false;

  class UITown {
    constructor(app) {
      this.app = app;
      this.town = app.townSys || null;
      this.selectedIdx = -1;
      this.tab = 'build';
      this.isOpen = false;
      this._timer = null;
      this.recent = [];
      this.el = {};
      this.col = { left: false, right: false };   // 整欄收合
      this.sec = {};                              // 區段收合
      this._loadCollapse();
      this._injectStyles();
      this._buildDom();
      this._injectEntryButton();
      this._hideDeployBadge();
      this._applyCollapse();
    }

    /* ══════════ 收合狀態 ══════════ */
    _loadCollapse() {
      try {
        var raw = window.localStorage && window.localStorage.getItem(LS_KEY);
        if (!raw) return;
        var o = JSON.parse(raw);
        if (o && o.col) this.col = { left: !!o.col.left, right: !!o.col.right };
        if (o && o.sec) this.sec = o.sec;
      } catch (e) { /* 忽略 */ }
    }

    _saveCollapse() {
      try { window.localStorage.setItem(LS_KEY, JSON.stringify({ col: this.col, sec: this.sec })); }
      catch (e) { /* 忽略 */ }
    }

    _toggleCol(which) { this.col[which] = !this.col[which]; this._applyCollapse(); this._saveCollapse(); }
    _toggleSec(key) { this.sec[key] = !this.sec[key]; this._applyCollapse(); this._saveCollapse(); }

    _applyCollapse() {
      var root = this.el.root;
      if (!root) return;
      var self = this;
      ['left', 'right'].forEach(function (k) {
        var col = root.querySelector('#town-col-' + k);
        if (col) col.classList.toggle('collapsed', !!self.col[k]);
        var head = root.querySelector('.town-colhead[data-col="' + k + '"]');
        if (head) {
          var arrow = head.querySelector('.colh-toggle');
          if (arrow) arrow.textContent = self.col[k] ? '⟩' : '⟨';
        }
      });
      root.querySelectorAll('.town-sec').forEach(function (s) {
        s.classList.toggle('collapsed', !!self.sec[s.getAttribute('data-sec')]);
      });
    }

    _expandAll() {
      this.col.left = false; this.col.right = false;
      this.sec = {};
      this._applyCollapse(); this._saveCollapse();
    }

    /* ══════════ ⭐ 樣式注入（讓 style.css 無須修改） ══════════ */
    _injectStyles() {
      if (document.getElementById('town-injected-style')) return;
      var css = `
/* ══════════════════════════════════════════════════════════════
   ⭐ 我的小鎮 UI v2.2（由 uiTown.js 注入，會覆蓋 style.css 中的舊 town 樣式）
   ══════════════════════════════════════════════════════════════ */

/* 依需求移除最上方「🚩 上陣人數：N人 (遭遇N敵)」的顯示 */
#party-size-badge { display: none !important; }

.town-screen {
  --town-bottom-h: 500px;      /* ⭐ 下方面板高度（原 250px，加倍） */
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9000;
  display: flex; flex-direction: column;
  gap: 8px; padding: 10px;
  background: radial-gradient(1200px 700px at 50% -10%, #1d2a3d 0%, #0f141c 60%);
  overflow: hidden;
}
.town-screen.hidden { display: none !important; }

.town-topbar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  background: linear-gradient(90deg, #1b2432, #2a2136);
  border: 1px solid #c89d54; border-radius: 6px;
  padding: 8px 14px;
}
.town-title { font-size: 1.08rem; font-weight: bold; color: #c89d54; }
.town-res { display: flex; gap: 13px; flex-wrap: wrap; font-size: 0.84rem; }
.town-res b { color: #e2e8f0; }
.town-topbtns { margin-left: auto; display: flex; gap: 8px; }
.town-buffwrap { display: inline-flex; gap: 5px; flex-wrap: wrap; }
.town-chip {
  display: inline-block; font-size: 0.72rem; padding: 1px 7px; border-radius: 10px;
  border: 1px solid #2e3b4e; background: #121822; color: #94a3b8;
}
.town-chip.buff { border-color: #10b981; color: #6ee7b7; }

/* ── 三欄 ── */
.town-body { display: flex; gap: 8px; flex: 1 1 auto; min-height: 0; }
.town-col { overflow-y: auto; min-height: 0; overflow-x: hidden; }
.town-left  { width: 336px; flex: 0 0 336px; }
.town-right { width: 320px; flex: 0 0 320px; }
.town-center { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: center; }

/* ⭐ 整欄收合 */
.town-col.collapsed { width: 172px !important; flex: 0 0 172px !important; }
.town-col.collapsed .town-colbody { display: none; }
.town-colhead {
  display: flex; justify-content: space-between; align-items: center; gap: 6px;
  background: linear-gradient(90deg, #1b2432, #232c3d);
  border: 1px solid #c89d54; border-radius: 5px;
  padding: 6px 9px; margin-bottom: 8px;
  cursor: pointer; user-select: none;
  font-size: 0.82rem; font-weight: bold; color: #c89d54;
}
.town-colhead:hover { background: linear-gradient(90deg, #232c3d, #2c3a4f); }
.colh-toggle { font-size: 0.9rem; color: #94a3b8; }

/* ⭐ 區段收合 */
.town-sec { margin-bottom: 8px; }
.town-sechead {
  display: flex; justify-content: space-between; align-items: center; gap: 6px;
  background: #121822; border: 1px solid #2e3b4e; border-radius: 4px;
  padding: 5px 8px; cursor: pointer; user-select: none;
  font-size: 0.8rem; font-weight: bold; color: #00e5ff;
}
.town-sechead:hover { border-color: #00e5ff; background: #18202c; }
.sec-caret { transition: transform .18s; font-size: 0.75rem; color: #94a3b8; }
.town-sec.collapsed .sec-caret { transform: rotate(-90deg); }
.town-sec.collapsed .town-secbody { display: none; }
.town-secbody { margin-top: 6px; }

/* ── 地圖 ── */
.town-grid-wrap { position: relative; overflow: auto; max-width: 100%; }
.town-grid { display: grid; gap: 4px; }
.town-dots, .town-chars { position: absolute; top: 0; left: 0; pointer-events: none; }

.town-cell {
  width: 44px; height: 44px; position: relative;
  display: flex; align-items: center; justify-content: center;
  background: #121822; border: 1px solid #2e3b4e; border-radius: 6px;
  font-size: 1.15rem; cursor: pointer; transition: transform .15s, border-color .15s;
}
.town-cell:hover { transform: translateY(-2px); border-color: #c89d54; }
.town-cell.locked { background: #0b0f16; border-style: dashed; opacity: .45; cursor: not-allowed; }
.town-cell.locked:hover { transform: none; }
.town-cell.built { background: #1b2432; box-shadow: inset 0 0 12px rgba(0,229,255,.08); }
.town-cell.combo { border-color: #00e5ff; box-shadow: 0 0 9px rgba(0,229,255,.45); }
.town-cell.sel { outline: 2px solid #c89d54; outline-offset: 1px; }
.tc-icon { line-height: 1; }
.tc-lv { position: absolute; right: 3px; bottom: 1px; font-size: 0.55rem; color: #c89d54; }
.tc-staff { position: absolute; left: 2px; top: 0; font-size: 0.6rem; }
.tc-combo { position: absolute; right: 1px; top: 0; font-size: 0.6rem; }
.tc-lock { font-size: 0.8rem; opacity: .6; }

.town-dot {
  position: absolute; top: 0; left: 0; width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.95rem; opacity: .85;
  transition: transform 1.6s ease; will-change: transform;
}

/* ── ⭐ 定居角色頭像（地圖上走動）── */
.town-avatar {
  position: absolute; top: 0; left: 0; width: 44px; height: 44px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-size: 0.92rem; line-height: 1;
  border-radius: 8px;
  background: rgba(251,191,36,.18);
  border: 1px solid #fbbf24;
  box-shadow: 0 0 10px rgba(251,191,36,.5);
  transition: transform 1.6s ease; will-change: transform;
  pointer-events: none; z-index: 3;
}
.town-avatar.is-shop { background: rgba(0,229,255,.2); border-color: #00e5ff; box-shadow: 0 0 10px rgba(0,229,255,.6); }
.tc-face { font-size: 0.95rem; }
.tc-name { font-size: 0.5rem; color: #fff; margin-top: 1px; max-width: 42px; overflow: hidden; white-space: nowrap; }
.tc-post { position: absolute; right: -2px; top: -6px; font-size: 0.6rem; }

/* ── ⭐ 下方面板（高度加倍） ── */
.town-bottom {
  height: clamp(320px, var(--town-bottom-h), 64vh);
  overflow-y: auto;
}
.town-tabs { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.town-tab-btn {
  background: #121822; color: #94a3b8; border: 1px solid #2e3b4e;
  padding: 7px 15px; border-radius: 4px; cursor: pointer; font-size: 0.86rem;
}
.town-tab-btn:hover { border-color: #c89d54; color: #e2e8f0; }
.town-tab-btn.active { color: #c89d54; border-color: #c89d54; background: #283649; font-weight: bold; }
.town-tabpanel { padding-bottom: 6px; }

/* ── 通用列 ── */
.town-list { display: flex; flex-direction: column; gap: 5px; }
.town-row {
  display: flex; justify-content: space-between; align-items: center; gap: 6px;
  background: #121822; border: 1px solid #2e3b4e; border-radius: 4px;
  padding: 4px 8px; font-size: 0.79rem;
}
.town-row.is-here { border-color: #10b981; }
.town-row.triple { border-color: #a78bfa; }
.town-empty { font-size: 0.78rem; color: #94a3b8; line-height: 1.55; }
.muted { color: #94a3b8; font-size: 0.75rem; }
.sci-color { color: #00e5ff; }
.gold-color { color: #fbbf24; }
.mini-btn {
  background: #2b394a; color: #c89d54; border: 1px solid #c89d54;
  border-radius: 3px; padding: 2px 7px; font-size: 0.72rem; cursor: pointer;
}
.mini-btn:hover:not(:disabled) { background: #3a4a5e; }
.mini-btn:disabled { opacity: .35; cursor: not-allowed; }
.mini-btn.wide { width: 100%; padding: 5px 7px; font-size: 0.76rem; }
.danger-mini { border-color: #ef4444; color: #fca5a5; margin-top: 4px; }

/* ── ⭐ 角色定居卡 ── */
.town-bedbar {
  font-size: 0.76rem; color: #94a3b8;
  background: #121822; border: 1px solid #2e3b4e; border-radius: 4px;
  padding: 4px 8px; margin-bottom: 6px;
}
.town-charcard {
  background: #131b26; border: 1px solid #2e3b4e; border-radius: 6px;
  padding: 7px 8px; margin-bottom: 7px;
}
.town-charcard.settled { border-color: #fbbf24; background: #1a1d17; box-shadow: inset 0 0 14px rgba(251,191,36,.08); }
.tcc-head { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.tcc-name { font-size: 0.84rem; font-weight: bold; }
.tcc-meta { font-size: 0.72rem; color: #94a3b8; white-space: nowrap; }
.tcc-body { margin-top: 5px; display: flex; flex-direction: column; gap: 4px; }
.tcc-line { display: flex; justify-content: space-between; align-items: center; gap: 6px; font-size: 0.74rem; }
.tcc-bar { height: 6px; background: #0d1219; border: 1px solid #334155; border-radius: 3px; overflow: hidden; }
.tcc-bar > div { height: 100%; background: linear-gradient(90deg, #00e5ff, #7dd3fc); }
.tcc-posts { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 2px; }
.post-btn {
  background: #1b2432; color: #94a3b8; border: 1px solid #2e3b4e;
  border-radius: 4px; padding: 4px 5px; font-size: 0.71rem; cursor: pointer;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.post-btn:hover:not(:disabled) { border-color: #c89d54; color: #e2e8f0; }
.post-btn.cur { background: rgba(251,191,36,.2); border-color: #fbbf24; color: #fbbf24; font-weight: bold; }
.post-btn:disabled { opacity: .3; cursor: not-allowed; }

/* ── 鎮民 chip ── */
.folk-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.folk-chip {
  background: #121822; border: 1px solid #2e3b4e; border-radius: 12px;
  padding: 3px 10px; font-size: 0.76rem;
}

/* ── 建造卡 ── */
.town-buildhead { font-size: 0.88rem; margin-bottom: 10px; color: #e2e8f0; }
.tb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(186px, 1fr)); gap: 9px; }
.tb-cat { grid-column: 1 / -1; color: #00e5ff; font-size: 0.84rem; font-weight: bold; margin-top: 8px; border-bottom: 1px dashed #2e3b4e; padding-bottom: 3px; }
.tb-card {
  display: flex; flex-direction: column; gap: 3px; text-align: left;
  background: #121822; border: 1px solid #2e3b4e; border-radius: 6px;
  padding: 8px; cursor: pointer; color: #e2e8f0;
}
.tb-card:hover { border-color: #c89d54; }
.tb-card.poor { opacity: .45; }
.tbc-icon { font-size: 1.15rem; }
.tbc-name { font-weight: bold; font-size: 0.86rem; }
.tbc-cost { font-size: 0.78rem; }
.tbc-tag { font-size: 0.7rem; color: #00e5ff; }
.tbc-desc { font-size: 0.72rem; color: #94a3b8; line-height: 1.35; }

.town-buildbox { display: flex; flex-direction: column; gap: 8px; }
.tb-head { display: flex; gap: 10px; align-items: center; }
.tb-icon { font-size: 1.6rem; }
.tb-stats {
  display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.8rem;
  background: #121822; padding: 6px 10px; border-radius: 4px;
}
.tb-combos { font-size: 0.78rem; color: #00e5ff; }
.tb-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* ── ⭐ 節慶 ── */
.fest-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 9px; }
.fest-card {
  background: #121822; border: 1px solid #2e3b4e; border-radius: 6px;
  padding: 9px; display: flex; flex-direction: column; gap: 6px;
}
.fest-card:hover { border-color: #c89d54; }
.fest-card.poor { opacity: .5; }
.fest-head { display: flex; gap: 9px; align-items: flex-start; }
.fest-icon { font-size: 1.7rem; }
.fest-stats { display: flex; flex-wrap: wrap; gap: 10px; font-size: 0.78rem; }
.fest-eff { font-size: 0.75rem; color: #00e5ff; line-height: 1.45; }
.fest-running {
  background: rgba(16,185,129,.08); border: 1px solid #10b981;
  border-radius: 5px; padding: 7px 9px; margin-bottom: 10px; font-size: 0.8rem;
}

/* ── 研究 / 組合 / 三件套 / 環境加成 ── */
.town-rsch {
  background: #121822; border: 1px solid #2e3b4e; border-radius: 5px;
  padding: 6px 8px; margin-bottom: 6px; font-size: 0.78rem;
}
.town-rsch.done { border-color: #10b981; opacity: .72; }
.tr-head { display: flex; justify-content: space-between; gap: 8px; font-size: 0.8rem; }
.tr-desc { font-size: 0.73rem; color: #94a3b8; line-height: 1.4; margin: 2px 0; }
.tr-unlock { font-size: 0.72rem; color: #00e5ff; }
.town-combolist { display: flex; flex-wrap: wrap; gap: 5px; }
.combo-chip {
  font-size: 0.7rem; background: #1b2432; border: 1px solid #2e3b4e;
  border-radius: 10px; padding: 2px 8px; color: #94a3b8;
}
.combo-chip.triple { border-color: #a78bfa; color: #c4b5fd; }
.mini-block {
  background: #121822; border: 1px solid #2e3b4e; border-radius: 5px;
  padding: 6px 8px; margin-top: 6px; font-size: 0.74rem;
}
.mini-head { font-weight: bold; color: #6ee7b7; margin-bottom: 3px; }
.mini-line { color: #94a3b8; line-height: 1.5; }
.mini-line b { color: #e2e8f0; }

/* ── 提示 / 開鎮 ── */
.town-hint { font-size: 0.76rem; color: #94a3b8; margin-top: 8px; text-align: center; }
.town-hero { text-align: center; padding: 12px; }
.town-hero h3 { color: #c89d54; font-size: 1.05rem; }
.town-hero p { font-size: 0.84rem; color: #94a3b8; line-height: 1.65; margin: 7px 0; }
.town-hero-icon { font-size: 2.6rem; }

/* ── 鎮務總覽 ── */
.town-info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(215px, 1fr)); gap: 9px; }
.ti-card { background: #121822; border: 1px solid #2e3b4e; border-radius: 5px; padding: 8px 10px; }
.ti-label { font-size: 0.72rem; color: #94a3b8; }
.ti-val { font-size: 0.93rem; font-weight: bold; }
.ti-bar { height: 6px; background: #0d1219; border: 1px solid #334155; border-radius: 3px; overflow: hidden; margin: 5px 0; }
.ti-bar > div { height: 100%; background: linear-gradient(90deg, #b78a3f, #fbbf24); }
.town-earn-note { margin-top: 10px; font-size: 0.75rem; color: #10b981; line-height: 1.55; }

/* ── 日誌建築格 ── */
.log-buildgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 5px; }

/* ── RWD ── */
@media (max-width: 1400px) {
  .town-left { width: 300px; flex: 0 0 300px; }
  .town-right { width: 286px; flex: 0 0 286px; }
}
@media (max-width: 1240px) {
  .town-col.collapsed { width: 150px !important; flex: 0 0 150px !important; }
  .tcc-posts { grid-template-columns: 1fr; }
}
@media (max-width: 1150px) {
  .town-screen { --town-bottom-h: 380px; }
  .town-body { flex-direction: column; }
  .town-left, .town-right { width: 100%; flex: 0 0 auto; max-height: 240px; }
  .town-col.collapsed { width: 100% !important; flex: 0 0 auto !important; }
  .tcc-posts { grid-template-columns: 1fr 1fr 1fr; }
}
@media (max-width: 820px) {
  .town-title { font-size: 0.95rem; }
  .town-res { font-size: 0.76rem; gap: 9px; }
  .tcc-posts { grid-template-columns: 1fr 1fr; }
}
`;
      var st = document.createElement('style');
      st.id = 'town-injected-style';
      st.appendChild(document.createTextNode(css));
      document.head.appendChild(st);
    }

    /* ══════════ DOM ══════════ */
    _sec(key, title, bodyId) {
      return '<div class="town-sec" data-sec="' + key + '">' +
        '<div class="town-sechead"><span>' + title + '</span><span class="sec-caret">▾</span></div>' +
        '<div class="town-secbody"><div id="' + bodyId + '" class="town-list"></div></div></div>';
    }

    _buildDom() {
      var root = document.createElement('div');
      root.id = 'town-screen';
      root.className = 'town-screen hidden';

      var leftHtml =
        '<div class="town-colhead" data-col="left">' +
          '<span class="colh-label">👤 角色與訪客</span>' +
          '<span class="colh-toggle">⟨</span>' +
        '</div>' +
        '<div class="town-colbody">' +
          this._sec('roster', '👤 我的角色（定居小鎮）', 'town-roster') +
          this._sec('guests', '🧭 群俠客居', 'town-guests') +
          this._sec('guardians', '🐾 靈獸鎮守', 'town-guardians') +
        '</div>';

      var rightHtml =
        '<div class="town-colhead" data-col="right">' +
          '<span class="colh-label">🔬 研究與組合</span>' +
          '<span class="colh-toggle">⟨</span>' +
        '</div>' +
        '<div class="town-colbody">' +
          this._sec('research', '🔬 研究', 'town-research') +
          this._sec('combos', '🔗 生效組合', 'town-combos') +
          this._sec('triples', '🎯 三件套組合', 'town-triples') +
          this._sec('mini', '🌿 環境加成（綠化／道路）', 'town-minis') +
        '</div>';

      root.innerHTML =
        '<div class="town-topbar">' +
          '<div class="town-title">🏘️ 我的小鎮 <span id="town-lv-name"></span></div>' +
          '<div class="town-res" id="town-res"></div>' +
          '<div class="town-topbtns">' +
            '<button id="town-expand-all" class="sys-btn">↔️ 全部展開</button>' +
            '<button id="town-inject-gold" class="sys-btn">💎 銀兩總額</button>' +
            '<button id="town-close" class="sys-btn danger">↩️ 返回江湖</button>' +
          '</div>' +
        '</div>' +
        '<div class="town-body">' +
          '<div class="town-col town-left panel" id="town-col-left">' + leftHtml + '</div>' +
          '<div class="town-col town-center panel">' +
            '<div class="town-grid-wrap">' +
              '<div id="town-grid" class="town-grid"></div>' +
              '<div id="town-dots" class="town-dots"></div>' +
              '<div id="town-chars" class="town-chars"></div>' +
            '</div>' +
            '<div id="town-hint" class="town-hint"></div>' +
          '</div>' +
          '<div class="town-col town-right panel" id="town-col-right">' + rightHtml + '</div>' +
        '</div>' +
        '<div class="town-bottom panel">' +
          '<div class="town-tabs">' +
            '<button class="town-tab-btn active" data-ttab="build">🏗️ 建造與營運</button>' +
            '<button class="town-tab-btn" data-ttab="festival">🎊 節慶</button>' +
            '<button class="town-tab-btn" data-ttab="info">📋 鎮務總覽</button>' +
            '<button class="town-tab-btn" data-ttab="folk">👥 鎮民</button>' +
            '<button class="town-tab-btn" data-ttab="supply">🎁 分送物資</button>' +
            '<button class="town-tab-btn" data-ttab="log">📜 小鎮日誌</button>' +
          '</div>' +
          '<div id="town-panel-build" class="town-tabpanel"></div>' +
          '<div id="town-panel-festival" class="town-tabpanel hidden"></div>' +
          '<div id="town-panel-info" class="town-tabpanel hidden"></div>' +
          '<div id="town-panel-folk" class="town-tabpanel hidden"></div>' +
          '<div id="town-panel-supply" class="town-tabpanel hidden"></div>' +
          '<div id="town-panel-log" class="town-tabpanel hidden"></div>' +
        '</div>';
      document.body.appendChild(root);

      this.el.root = root;
      this.el.lvName = root.querySelector('#town-lv-name');
      this.el.res = root.querySelector('#town-res');
      this.el.grid = root.querySelector('#town-grid');
      this.el.dots = root.querySelector('#town-dots');
      this.el.chars = root.querySelector('#town-chars');
      this.el.hint = root.querySelector('#town-hint');
      this.el.roster = root.querySelector('#town-roster');
      this.el.guests = root.querySelector('#town-guests');
      this.el.guardians = root.querySelector('#town-guardians');
      this.el.research = root.querySelector('#town-research');
      this.el.combos = root.querySelector('#town-combos');
      this.el.triples = root.querySelector('#town-triples');
      this.el.minis = root.querySelector('#town-minis');
      this.el.panels = {
        build: root.querySelector('#town-panel-build'),
        festival: root.querySelector('#town-panel-festival'),
        info: root.querySelector('#town-panel-info'),
        folk: root.querySelector('#town-panel-folk'),
        supply: root.querySelector('#town-panel-supply'),
        log: root.querySelector('#town-panel-log')
      };

      var self = this;

      root.querySelector('#town-close').addEventListener('click', function () { self.close(); });
      root.querySelector('#town-inject-gold').addEventListener('click', function () { self.injectGold(); });
      root.querySelector('#town-expand-all').addEventListener('click', function () { self._expandAll(); });

      // 整欄開合
      root.querySelectorAll('.town-colhead').forEach(function (h) {
        h.addEventListener('click', function () { self._toggleCol(h.getAttribute('data-col')); });
      });
      // 區段開合（事件委派，重繪後仍有效）
      root.addEventListener('click', function (e) {
        var head = e.target.closest ? e.target.closest('.town-sechead') : null;
        if (!head) return;
        var sec = head.parentNode;
        if (sec && sec.getAttribute) self._toggleSec(sec.getAttribute('data-sec'));
      });

      this.el.grid.addEventListener('click', function (e) {
        var c = e.target.closest ? e.target.closest('.town-cell') : null;
        if (!c) return;
        var idx = parseInt(c.getAttribute('data-idx'), 10);
        if (isNaN(idx)) return;
        self.selectCell(idx);
      });

      root.querySelectorAll('.town-tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { self.switchTab(btn.getAttribute('data-ttab')); });
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && self.isOpen) self.close();
      });
    }

    switchTab(name) {
      this.tab = name;
      var root = this.el.root, self = this;
      root.querySelectorAll('.town-tab-btn').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-ttab') === name);
      });
      Object.keys(this.el.panels).forEach(function (k) {
        self.el.panels[k].classList.toggle('hidden', k !== name);
      });
      this.renderBottom();
    }

    _injectEntryButton() {
      if (document.getElementById('btn-open-town')) return;
      var ctrl = document.querySelector('.system-controls') || document.getElementById('top-bar');
      if (!ctrl) return;
      var self = this;
      var btn = document.createElement('button');
      btn.id = 'btn-open-town';
      btn.className = 'sys-btn';
      btn.style.borderColor = '#fbbf24';
      btn.style.color = '#fbbf24';
      btn.style.fontWeight = 'bold';
      btn.textContent = '🏘️ 我的小鎮';
      btn.addEventListener('click', function () { self.open(); });
      ctrl.prepend(btn);
    }

    // 依需求移除最上方「🚩 上陣人數：N人 (遭遇N敵)」的顯示
    _hideDeployBadge() {
      var byId = document.getElementById('party-size-badge');
      if (byId) byId.style.display = 'none';
      var bar = document.getElementById('top-bar');
      if (!bar) return;
      var nodes = bar.querySelectorAll('span, div, b, label, p, small');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (el.children.length > 0) continue;
        if (el.querySelector && el.querySelector('button')) continue;
        var txt = (el.textContent || '').trim();
        if (txt.length > 0 && txt.length < 60 && txt.indexOf('上陣人數') !== -1) el.style.display = 'none';
      }
    }

    /* ══════════ 開關 ══════════ */
    open() {
      if (!this.town) return;
      this.town.ensureState();
      // ⭐ 進入小鎮 → 停止自動戰鬥
      var c = this.app.combatSys;
      if (c && c.isAutoBattle && typeof c.toggleAutoBattle === 'function') {
        c.toggleAutoBattle();
        this.app.logger.add('🏘️ 你走進【我的小鎮】，時空探索的自動戰鬥已停止。', 'time');
      }
      this._hideDeployBadge();
      this.isOpen = true;
      this.el.root.classList.remove('hidden');
      this._applyCollapse();
      this.town.onOpen();
      this.render();
      this._startTimer();
    }

    close() {
      this.isOpen = false;
      this._stopTimer();
      if (this.town) this.town.onClose();
      this.el.root.classList.add('hidden');
      this.app.renderAll();
    }

    _startTimer() {
      var self = this;
      this._stopTimer();
      this._timer = setInterval(function () {
        var r = self.town.tick();
        if (r && SHOW_TICK_LOG) {
          self.recent.unshift('週期 #' + self.town.ensureState().stats.ticks +
            '：+' + self._fmtIncome(r.gold) + ' 兩' + (r.sp > 0 ? '、+' + r.sp + ' 武點' : ''));
          if (self.recent.length > 60) self.recent.pop();
        }
        self._stepAvatars();
        self.render();
      }, this.town.def.TICK_MS);
    }

    _stopTimer() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }

    /* ══════════ 工具 ══════════ */
    // 收入可能因 INCOME_SCALE 變成小數，這裡統一顯示格式
    _fmtIncome(v) {
      v = Number(v) || 0;
      if (v === 0) return '0';
      if (Math.abs(v) < 10) return v.toFixed(2).replace(/\.?0+$/, '');
      return Math.round(v).toLocaleString();
    }

    // 分類清單（由資料動態產生，支援擴充包）
    _catOrder() {
      var D = this.town.def, cats = D.CATS || {};
      var ids = Object.keys(cats);
      if (ids.length) {
        return ids.map(function (k) { return { id: k, name: cats[k].name, icon: cats[k].icon, order: cats[k].order || 99 }; })
                  .sort(function (a, b) { return a.order - b.order; });
      }
      // 後備：直接從 TYPES 推導實際存在的分類（若 townExtra.js 未載入）
      var seen = {};
      Object.keys(D.TYPES).forEach(function (id) {
        var c = D.TYPES[id].cat;
        if (c && !seen[c]) seen[c] = true;
      });
      return Object.keys(seen).map(function (c, i) { return { id: c, name: c, icon: '🏗️', order: i }; });
    }

    _stepAvatars() {
      var D = this.town.def, t = this.town.ensureState();
      var spots = t.buildings;
      t.residents.forEach(function (p) {
        var target;
        if (spots.length > 0) {
          var b = spots[Math.floor(Math.random() * spots.length)];
          target = { x: b.idx % D.GRID_W, y: Math.floor(b.idx / D.GRID_W) };
        } else {
          target = { x: Math.floor(Math.random() * D.GRID_W), y: Math.floor(Math.random() * D.GRID_H) };
        }
        p.x = target.x; p.y = target.y;
      });
      t.settlers.forEach(function (s) {
        if (s.post === 'shopkeeper' && s.buildingIdx >= 0) {
          s.x = s.buildingIdx % D.GRID_W; s.y = Math.floor(s.buildingIdx / D.GRID_W); return;
        }
        if (spots.length > 0) {
          var b2 = spots[Math.floor(Math.random() * spots.length)];
          s.x = b2.idx % D.GRID_W; s.y = Math.floor(b2.idx / D.GRID_W);
        } else {
          s.x = Math.floor(Math.random() * D.GRID_W); s.y = Math.floor(Math.random() * D.GRID_H);
        }
      });
    }

    /* ══════════ 渲染 ══════════ */
    renderTownTab() {
      this._hideDeployBadge();
      if (this.isOpen) this.render();
    }

    render() {
      if (!this.town) return;
      this._hideDeployBadge();
      this.renderHeader();
      this.renderGrid();
      this.renderAvatars();
      this.renderRoster();
      this.renderGuests();
      this.renderGuardians();
      this.renderResearch();
      this.renderCombos();
      this.renderTriples();
      this.renderMinis();
      this.renderBottom();
    }

    renderHeader() {
      var s = this.town.getStats();
      var L = s.level;
      var rk = s.rankInfo || { rank: { icon: '❔', name: '—' }, score: 0 };
      var sea = s.season;
      var buffs = (s.buff && s.buff.list) || [];
      this.el.lvName.textContent = L.icon + ' ' + L.name + '（Lv.' + L.lv + '）';

      var buffChips = buffs.map(function (b) {
        return '<span class="town-chip buff">' + b.icon + ' ' + b.name + ' <b>' + b.remain + '</b>期</span>';
      }).join('');

      this.el.res.innerHTML =
        '<span>🪙 <b class="gold-color">' + s.gold.toLocaleString() + '</b> 兩</span>' +
        '<span>💵 收入 <b class="gold-color">+' + this._fmtIncome(s.income) + '</b>/期</span>' +
        '<span>🏞️ 地價 <b class="sci-color">' + (s.landPrice || 0).toLocaleString() + '</b></span>' +
        '<span>✨ 繁榮 <b>' + s.prosperity.toLocaleString() + '</b></span>' +
        '<span>📖 武點 <b class="sci-color">+' + (s.sp < 10 ? s.sp.toFixed(2).replace(/\.?0+$/, '') : s.sp.toFixed(1)) + '</b>/期</span>' +
        '<span>🛏️ <b>' + s.bedsUsed + '</b>/<b>' + s.bedsTotal + '</b> 床</span>' +
        '<span>👥 <b>' + s.population + '</b>/<b>' + s.popCap + '</b></span>' +
        '<span>🛡️ 治安 <b class="' + (s.order > 0 ? 'sci-color' : '') + '">' + s.order + '</b></span>' +
        '<span>🏠 <b>' + s.buildings + '</b>/<b>' + s.buildingCap + '</b> 棟</span>' +
        '<span>🧱 <b>' + s.cellsUnlocked + '</b> 格</span>' +
        '<span>🏅 ' + rk.rank.icon + ' <b class="gold-color">' + rk.rank.name + '</b></span>' +
        (sea ? '<span>' + sea.icon + ' <b>' + sea.name + '</b>·' + sea.desc + '</span>' : '') +
        (buffs.length ? '<span class="town-buffwrap">🎊 ' + buffChips + '</span>' : '');
    }

    renderGrid() {
      var D = this.town.def;
      var W = D.GRID_W, H = D.GRID_H;
      var unlocked = this.town.getCellsUnlocked();
      var self = this;
      var comboCells = {};
      this.town.getActiveCombos().forEach(function (c) {
        c.cells.forEach(function (i) { comboCells[i] = c.triple ? '🎯' : (c.mini ? '🌿' : c.icon); });
      });
      this.el.grid.style.gridTemplateColumns = 'repeat(' + W + ', ' + CELL + 'px)';
      var html = '';
      for (var i = 0; i < W * H; i++) {
        var b = self.town.getBuildingAt(i);
        var locked = i >= unlocked;
        var cls = 'town-cell';
        if (locked) cls += ' locked';
        if (b) cls += ' built';
        if (comboCells[i]) cls += ' combo';
        if (this.selectedIdx === i) cls += ' sel';
        var inner = '';
        if (b) {
          var def = D.TYPES[b.type];
          var staff = self.town.getStaffOf(i);
          inner = '<span class="tc-icon">' + def.icon + '</span>' +
                  '<span class="tc-lv">' + b.lv + '</span>' +
                  (staff ? '<span class="tc-staff">👤</span>' : '') +
                  (comboCells[i] ? '<span class="tc-combo">' + comboCells[i] + '</span>' : '');
        } else if (locked) {
          inner = '<span class="tc-lock">🔒</span>';
        }
        html += '<div class="' + cls + '" data-idx="' + i + '" title="' +
                (locked ? '尚未開墾' : (b ? D.TYPES[b.type].name + ' Lv.' + b.lv : '空地 ' + self.town.cellLabel(i))) +
                '">' + inner + '</div>';
      }
      this.el.grid.innerHTML = html;
    }

    renderAvatars() {
      var t = this.town.ensureState();
      var D = this.town.def;
      var self = this;
      var stepX = CELL + GAP;
      this.el.dots.innerHTML = t.residents.map(function (p) {
        var x = (p.x || 0) * stepX, y = (p.y || 0) * stepX;
        var face = p.lv >= 4 ? '👑' : (p.lv >= 3 ? '🧑‍🌾' : '🧍');
        return '<div class="town-dot" style="transform:translate(' + x + 'px,' + y + 'px)" title="' +
               p.name + ' Lv.' + p.lv + '（鎮民）">' + face + '</div>';
      }).join('');
      this.el.chars.innerHTML = t.settlers.map(function (s) {
        var c = self.town.getCharById(s.charId);
        if (!c) return '';
        var x = (s.x || 0) * stepX, y = (s.y || 0) * stepX;
        var post = D.POSTS[s.post] || D.POSTS.idle;
        var isShop = s.post === 'shopkeeper';
        return '<div class="town-avatar' + (isShop ? ' is-shop' : '') + '" ' +
               'style="transform:translate(' + x + 'px,' + y + 'px)" ' +
               'title="' + c.name + ' Lv.' + c.lv + '（' + post.name + '）">' +
               '<span class="tc-face">👤</span><span class="tc-name">' + c.name.substring(0, 4) + '</span>' +
               '<span class="tc-post">' + post.icon + '</span></div>';
      }).join('');
    }

    selectCell(idx) {
      var unlocked = this.town.getCellsUnlocked();
      if (idx >= unlocked) {
        this.el.hint.textContent = '🔒 此地尚未開墾 —— 提升【繁榮度】升級小鎮，或研究【城牆擴建】【匠作營造】【城郭大興】可擴張土地。';
        return;
      }
      this.selectedIdx = idx;
      this.switchTab('build');
      this.renderGrid();
      this.renderRoster();
    }

    /* ══════════ ⭐ 角色定居與職務 ══════════ */
    renderRoster() {
      var self = this;
      var T = this.town;
      var t = T.ensureState();
      var D = T.def;
      var roster = T.charSys.rootState.roster || [];

      if (roster.length === 0) {
        this.el.roster.innerHTML = '<div class="town-empty">尚無角色。請先在「👥 角色 & 組隊」建立角色再回小鎮定居。</div>';
        return;
      }
      if (!t.founded) {
        this.el.roster.innerHTML = '<div class="town-empty">尚未開鎮。先於下方【🏗️ 建造與營運】開墾小鎮，才能讓角色定居。</div>';
        return;
      }

      var freeBeds = T.getBedsFree();
      var html = '<div class="town-bedbar">🛏️ 床位 <b class="gold-color">' + T.getBedsUsed() + '</b> / <b>' + T.getBedsTotal() + '</b>' +
        (freeBeds > 0 ? '　<span class="sci-color">空 ' + freeBeds + ' 床</span>'
                      : '　<span class="muted">已滿（蓋【民宅】＋3）</span>') + '</div>';

      roster.forEach(function (c) {
        var s = T.getSettler(c.id);
        var power = T.getCharPower ? T.getCharPower(c) : 0;
        var expPct = c.maxExp ? Math.floor((c.exp || 0) / c.maxExp * 100) : 0;

        html += '<div class="town-charcard' + (s ? ' settled' : '') + '">';
        html += '<div class="tcc-head"><span class="tcc-name">👤 ' + c.name + '</span>' +
                '<span class="tcc-meta">Lv.<b>' + c.lv + '</b></span></div>';

        if (!s) {
          var canS = T.canSettle(c.id);
          html += '<div class="tcc-body">' +
            '<div class="tcc-line muted">🚶 雲遊江湖中，尚未在小鎮安家。</div>' +
            '<button class="mini-btn wide" data-settle="' + c.id + '" ' + (canS.ok ? '' : 'disabled') + '>' +
            (canS.ok ? '🏠 定居小鎮（佔 1 床位）' : '🏠 無法定居：' + canS.msg) + '</button></div></div>';
          return;
        }

        var rate = T.getCultivateExpGain(c);
        var postDef = D.POSTS[s.post] || D.POSTS.idle;
        var where;
        if (s.post === 'shopkeeper' && s.buildingIdx >= 0) {
          var bb = T.getBuildingAt(s.buildingIdx);
          where = '<span class="sci-color">掌理 ' + T.cellLabel(s.buildingIdx) +
                  (bb ? '（' + D.TYPES[bb.type].name + '）' : '') + '</span>';
        } else {
          where = '<span class="muted">' + postDef.desc + '</span>';
        }

        html += '<div class="tcc-body">';
        html += '<div class="tcc-line">修行 <span class="muted">' + (c.exp || 0).toLocaleString() +
                ' / ' + (c.maxExp || 0).toLocaleString() + '</span><b class="sci-color">+' + rate.toLocaleString() + '/期</b></div>';
        html += '<div class="tcc-bar"><div style="width:' + Math.min(100, expPct) + '%"></div></div>';
        html += '<div class="tcc-line">職務：<b class="gold-color">' + postDef.icon + ' ' + postDef.name + '</b></div>';
        html += '<div class="tcc-line">' + where + '</div>';
        html += '<div class="tcc-posts">';
        ['idle', 'shopkeeper', 'mayor', 'teacher', 'commerce', 'guard'].forEach(function (pid) {
          var p = D.POSTS[pid];
          if (!p) return;
          var cur = s.post === pid;
          var dis = cur;
          var tip = p.desc;
          if (pid === 'shopkeeper') {
            if (self.selectedIdx < 0) { dis = true; tip = '請先在小鎮地圖點選一棟空閒建築'; }
            else {
              var tb = T.getBuildingAt(self.selectedIdx);
              if (!tb) { dis = true; tip = '該格沒有建築'; }
              else if (tb.staffId && tb.staffId !== c.id) { dis = true; tip = '該建築已有掌櫃'; }
              else { dis = false; tip = '出任 ' + T.cellLabel(self.selectedIdx) + ' 的掌櫃'; }
            }
          } else if (p.cap > 0) {
            var used = T.getPostCount(pid);
            if (!cur && used >= p.cap) { dis = true; tip = p.name + ' 已滿（' + used + '/' + p.cap + '）'; }
          }
          html += '<button class="post-btn' + (cur ? ' cur' : '') + '" data-post="' + pid + '" data-char2="' + c.id + '"' +
                  (dis ? ' disabled' : '') + ' title="' + tip + '">' + p.icon + ' ' + p.name + '</button>';
        });
        html += '</div>';
        html += '<button class="mini-btn danger-mini" data-unsettle="' + c.id + '">🎒 離開小鎮</button>';
        html += '</div></div>';
      });

      this.el.roster.innerHTML = html;
      this.el.roster.querySelectorAll('[data-settle]').forEach(function (el) {
        el.addEventListener('click', function () { if (T.settleCharacter(el.getAttribute('data-settle'))) self.render(); });
      });
      this.el.roster.querySelectorAll('[data-unsettle]').forEach(function (el) {
        el.addEventListener('click', function () { if (T.unsettleCharacter(el.getAttribute('data-unsettle'))) self.render(); });
      });
      this.el.roster.querySelectorAll('[data-post]').forEach(function (el) {
        el.addEventListener('click', function () {
          var pid = el.getAttribute('data-post');
          var cid = el.getAttribute('data-char2');
          var bidx = (pid === 'shopkeeper') ? self.selectedIdx : -1;
          if (T.setPost(cid, pid, bidx)) self.render();
        });
      });
    }

    /* ══════════ ⭐ 群俠客居 ══════════ */
    renderGuests() {
      var self = this, T = this.town;
      var list = T.getGuestList ? T.getGuestList() : [];
      if (!list.length) {
        this.el.guests.innerHTML = '<div class="town-empty">尚無已招募的群俠。於「🧑‍🤝‍🧑 群俠」以銀兩結交後，即可邀其客居小鎮。</div>';
        return;
      }
      var here = list.filter(function (x) { return x.here; }).length;
      var html = '<div class="town-bedbar">👥 客居 <b>' + here + '</b> / <b>' + list.length + '</b>　' +
                 '<span class="muted">每位依身份提供聲威與收益</span></div>';
      html += list.map(function (g) {
        return '<div class="town-row' + (g.here ? ' is-here' : '') + '">' +
          '<span><b>' + g.name + '</b> <span class="muted">Lv.' + g.lv + '</span>' +
          '<div class="muted">' + g.tier.name + '｜魅力 +' + g.tier.appeal + '，收入 +' + Math.round(g.tier.incomeMul * 100) + '%</div></span>' +
          '<button class="mini-btn" data-guest="' + g.id + '">' + (g.here ? '已入住' : '邀請') + '</button></div>';
      }).join('');
      this.el.guests.innerHTML = html;
      this.el.guests.querySelectorAll('[data-guest]').forEach(function (el) {
        el.addEventListener('click', function () { T.toggleGuest(el.getAttribute('data-guest')); self.render(); });
      });
    }

    /* ══════════ ⭐ 靈獸鎮守 ══════════ */
    renderGuardians() {
      var self = this, T = this.town, D = T.def;
      var list = T.getGuardianList ? T.getGuardianList() : [];
      if (!list.length) {
        this.el.guardians.innerHTML = '<div class="town-empty">尚無靈獸。於「🐾 靈獸」領養後，即可派其鎮守小鎮。</div>';
        return;
      }
      var here = list.filter(function (x) { return x.here; }).length;
      var html = '<div class="town-bedbar">🐾 鎮守 <b>' + here + '</b> / <b>' + list.length + '</b>　' +
                 '<span class="muted">治安 +' + D.GUARDIAN.order + '，魅力 +' + D.GUARDIAN.appeal + '</span></div>';
      html += list.map(function (g) {
        return '<div class="town-row' + (g.here ? ' is-here' : '') + '">' +
          '<span><b>' + g.name + '</b><div class="muted">' + g.species + '</div></span>' +
          '<button class="mini-btn" data-guard="' + g.id + '">' + (g.here ? '已鎮守' : '鎮守') + '</button></div>';
      }).join('');
      this.el.guardians.innerHTML = html;
      this.el.guardians.querySelectorAll('[data-guard]').forEach(function (el) {
        el.addEventListener('click', function () { T.toggleGuardian(el.getAttribute('data-guard')); self.render(); });
      });
    }

    /* ══════════ 分頁路由 ══════════ */
    renderBottom() {
      if (this.tab === 'build') this.renderBuildPanel();
      else if (this.tab === 'festival') this.renderFestivalPanel();
      else if (this.tab === 'info') this.renderInfoPanel();
      else if (this.tab === 'folk') this.renderFolkPanel();
      else if (this.tab === 'supply') this.renderSupplyPanel();
      else this.renderLogPanel();
    }

    /* ══════════ 建造 ══════════ */
    renderBuildPanel() {
      var self = this;
      var T = this.town, D = T.def, t = T.ensureState();

      if (!t.founded) {
        this.el.panels.build.innerHTML =
          '<div class="town-hero">' +
            '<div class="town-hero-icon">🏘️</div>' +
            '<h3>開墾你的小鎮</h3>' +
            '<p>在這片荒野上立起第一塊界碑，開始經營屬於你的江湖城鎮。' +
            '小鎮能產出<b class="sci-color">武學點數</b>與<b>丹藥</b>、讓<b>你的角色定居修行</b>、' +
            '並透過<b>組合</b>與<b>地價</b>不斷提升評鑑地位。</p>' +
            '<p class="muted">開鎮費用：' + D.FOUND_COST + ' 兩（贈送民宅、農田、水井各一，民宅提供 ' + D.BEDS_PER_HOUSE + ' 床位）</p>' +
            '<button id="btn-found-town" class="btn-primary">🚩 開鎮</button>' +
          '</div>';
        var fb = this.el.panels.build.querySelector('#btn-found-town');
        if (fb) fb.addEventListener('click', function () { if (self.town.foundTown()) self.render(); });
        this.el.hint.textContent = '尚未開鎮。';
        return;
      }

      var idx = this.selectedIdx;
      if (idx < 0) {
        this.el.panels.build.innerHTML = '<div class="town-empty">👆 點選中央小鎮地圖的任一格，即可建造、升級、拆除建築，或指派角色進駐。</div>';
        this.el.hint.textContent = '提示：兩棟相鄰＝組合；三棟相距 3 格內＝三件套；綠化與道路貼著建築＝環境加成。';
        return;
      }

      var b = T.getBuildingAt(idx);
      var label = '格位 ' + T.cellLabel(idx) + '（第 ' + (Math.floor(idx / D.GRID_W) + 1) + ' 排）';

      if (b) {
        var def = D.TYPES[b.type];
        var staff = T.getStaffOf(idx);
        var combos = T.getActiveCombos();
        var comboMul = T.getComboMulFor(idx, combos);
        var upChk = T.canUpgrade(idx);
        var gMul = T.getGlobalMul();
        var staffMul = T.getShopkeeperMulFor ? T.getShopkeeperMulFor(idx) : 1;
        var scale = T.getIncomeScale ? T.getIncomeScale() : 1;
        var est = (def.income || 0) * b.lv * comboMul * staffMul * gMul * scale;
        var related = combos.filter(function (c) { return c.cells.indexOf(idx) !== -1; });

        this.el.panels.build.innerHTML =
          '<div class="town-buildbox">' +
            '<div class="tb-head"><span class="tb-icon">' + def.icon + '</span>' +
              '<div><b>' + def.name + '</b> <span class="muted">Lv.' + b.lv + ' / ' + D.MAX_LV + '</span>' +
              '<div class="muted">' + label + ' ｜ ' + def.desc + '</div></div></div>' +
            '<div class="tb-stats">' +
              '<span>💵 收入 <b class="gold-color">' + this._fmtIncome(est) + '</b>/期</span>' +
              '<span>🏞️ 地價 <b class="sci-color">' + ((def.land || ((def.appeal || 0) * 3 + (def.income || 0))) * b.lv).toLocaleString() + '</b></span>' +
              '<span>🧲 魅力 <b>' + Math.floor((def.appeal || 0) * b.lv) + '</b></span>' +
              (def.pop ? '<span>🛏️ 床位 <b class="sci-color">+' + (def.pop * b.lv) + '</b></span>' : '') +
              (def.produceSp ? '<span>📖 武點潛能 <b class="sci-color">' + (def.produceSp * b.lv) + '</b></span>' : '') +
              (def.produce ? '<span>🎁 產出 <b>' + (((window.HY.Data.ITEMS || {})[def.produce] || {}).name || def.produce) + '</b></span>' : '') +
              (comboMul > 1 ? '<span>🔗 組合總倍率 ×<b class="sci-color">' + comboMul.toFixed(2) + '</b></span>' : '') +
              '<span>👤 掌櫃 <b>' + (staff ? staff.name + '（Lv.' + staff.lv + '，×' + staffMul.toFixed(2) + '）' : '無') + '</b></span>' +
            '</div>' +
            (related.length ? '<div class="tb-combos">' + related.map(function (c) {
              return (c.triple ? '🎯' : (c.mini ? '🌿' : c.icon)) + (c.name || '') + ' ×' + c.mul; }).join('　') + '</div>' : '') +
            '<div class="tb-actions">' +
              '<button id="tb-up" class="btn-primary" ' + (upChk.ok ? '' : 'disabled') + '>' +
                (b.lv >= D.MAX_LV ? '已滿級' : '🔨 升級 Lv.' + (b.lv + 1) + '（' + (upChk.cost || 0) + ' 兩）') + '</button>' +
              '<button id="tb-dem" class="action-btn" style="border-color:#ef4444;color:#fca5a5">🧨 拆除</button>' +
              (staff ? '<button id="tb-unstaff" class="action-btn">🚪 卸任掌櫃</button>' : '') +
            '</div>' +
            (staff ? '' : '<div class="tb-combos">💡 到左欄【我的角色】點「🏪 掌櫃」，即可指派角色進駐此處。</div>') +
          '</div>';

        var up = this.el.panels.build.querySelector('#tb-up');
        if (up) up.addEventListener('click', function () { if (T.upgrade(idx)) self.render(); });
        var dm = this.el.panels.build.querySelector('#tb-dem');
        if (dm) dm.addEventListener('click', function () {
          if (confirm('確定拆除 ' + T.cellLabel(idx) + ' 的【' + def.name + '】？可回收約 ' +
            Math.floor(T.investedIn(b) * D.DEMOLISH_REFUND) + ' 兩。')) {
            if (T.demolish(idx)) { self.selectedIdx = -1; self.render(); }
          }
        });
        var un = this.el.panels.build.querySelector('#tb-unstaff');
        if (un) un.addEventListener('click', function () { T.unassignStaff(idx); self.render(); });

        this.el.hint.textContent = '此格已選取 —— 左欄【我的角色】的「🏪 掌櫃」按鈕現在可指派到此處。';
        return;
      }

      // 空地 → 建造清單（分類由資料動態產生）
      var gold = T.charSys.rootState.gold;
      var types = T.getUnlockedTypes();
      var cats = this._catOrder();
      var cards = '';
      cats.forEach(function (cat) {
        var inCat = types.filter(function (id) { return D.TYPES[id].cat === cat.id; });
        if (!inCat.length) return;
        cards += '<div class="tb-cat">' + cat.icon + ' ' + cat.name + '（' + inCat.length + '）</div>';
        inCat.forEach(function (id) {
          var def = D.TYPES[id];
          var afford = gold >= def.cost;
          cards += '<button class="tb-card ' + (afford ? '' : 'poor') + '" data-type="' + id + '">' +
            '<span class="tbc-icon">' + def.icon + '</span>' +
            '<span class="tbc-name">' + def.name + '</span>' +
            '<span class="tbc-cost ' + (afford ? 'gold-color' : '') + '">' + def.cost + ' 兩</span>' +
            (def.pop ? '<span class="tbc-tag">🛏️ +' + def.pop + ' 床位</span>' : '') +
            (def.produceSp ? '<span class="tbc-tag">📖 +' + def.produceSp + ' 武點</span>' : '') +
            (def.land ? '<span class="tbc-tag">🏞️ 地價 ' + def.land + '</span>' : '') +
            '<span class="tbc-desc">' + def.desc + '</span>' +
            '</button>';
        });
      });

      this.el.panels.build.innerHTML =
        '<div class="town-buildhead">🏗️ 於 <b>' + label + '</b> 建造（' + t.buildings.length + '/' + T.getBuildingCap() + ' 棟）' +
        '　<span class="muted">已解鎖 ' + types.length + ' / ' + Object.keys(D.TYPES).length + ' 種</span></div>' +
        '<div class="tb-grid">' + cards + '</div>';

      this.el.panels.build.querySelectorAll('.tb-card').forEach(function (el) {
        el.addEventListener('click', function () {
          if (T.build(idx, el.getAttribute('data-type'))) self.render();
        });
      });
      this.el.hint.textContent = '灰色＝銀兩不足。建造後可花銀兩升級（最高 Lv.' + D.MAX_LV + '）。';
    }

    /* ══════════ ⭐ 節慶 ══════════ */
    renderFestivalPanel() {
      var self = this, T = this.town, D = T.def, t = T.ensureState();
      var list = D.FESTIVALS || [];

      if (!t.founded) {
        this.el.panels.festival.innerHTML = '<div class="town-empty">尚未開鎮，無法舉辦節慶。</div>';
        return;
      }
      if (!list.length) {
        this.el.panels.festival.innerHTML = '<div class="town-empty">此版本沒有節慶資料（請確認 townExtra.js 已載入）。</div>';
        return;
      }

      var buffs = T.getBuffBonus();
      var head = '<div class="town-buildhead">🎊 節慶開催 —— 花費銀兩，立即換取繁榮度與期間加成' +
        '<span class="muted">（期間以「營運期」計，每期 ' + (D.TICK_MS / 1000) + ' 秒）</span></div>';

      if (buffs.list.length) {
        head += '<div class="fest-running">🎐 進行中：' + buffs.list.map(function (b) {
          return '<span class="town-chip buff">' + b.icon + ' ' + b.name + '（剩 ' + b.remain + ' 期）</span>';
        }).join(' ') + '<div class="muted">期間合計：收入 +' + Math.round(buffs.incomeMul * 100) + '%　地價 +' + Math.round(buffs.landMul * 100) +
        '%　魅力 +' + buffs.appeal + '　繁榮成長 +' + Math.round(buffs.prosperityMul * 100) + '%</div></div>';
      }

      var cards = list.map(function (f) {
        var chk = T.canHoldFestival(f.id);
        var cost = T.festivalCost ? T.festivalCost(f) : f.cost;
        var eff = [];
        if (f.incomeMul) eff.push('收入 +' + Math.round(f.incomeMul * 100) + '%');
        if (f.landMul) eff.push('地價 +' + Math.round(f.landMul * 100) + '%');
        if (f.appeal) eff.push('魅力 +' + f.appeal);
        if (f.prosperityMul) eff.push('繁榮成長 +' + Math.round(f.prosperityMul * 100) + '%');
        if (f.spMul) eff.push('武點 +' + Math.round(f.spMul * 100) + '%');
        return '<div class="fest-card' + (chk.ok ? '' : ' poor') + '">' +
          '<div class="fest-head"><span class="fest-icon">' + f.icon + '</span>' +
            '<div><b>' + f.name + '</b><div class="muted">' + f.desc + '</div></div></div>' +
          '<div class="fest-stats">' +
            '<span>💵 <b class="gold-color">' + cost + ' 兩</b></span>' +
            '<span>✨ 繁榮 <b class="sci-color">+' + f.prosperity + '</b></span>' +
            (f.duration ? '<span>⏳ <b>' + f.duration + '</b> 期</span>' : '') +
          '</div>' +
          (eff.length ? '<div class="fest-eff">' + eff.join('　') + '</div>' : '') +
          '<button class="mini-btn wide" data-fest="' + f.id + '" ' + (chk.ok ? '' : 'disabled') + '>' +
            (chk.ok ? '🎊 舉辦' : '無法舉辦：' + chk.msg) + '</button>' +
          '</div>';
      }).join('');

      this.el.panels.festival.innerHTML = head + '<div class="fest-grid">' + cards + '</div>';
      this.el.panels.festival.querySelectorAll('[data-fest]').forEach(function (el) {
        el.addEventListener('click', function () {
          if (T.holdFestival(el.getAttribute('data-fest'))) self.render();
        });
      });
    }

    /* ══════════ 鎮民 ══════════ */
    renderFolkPanel() {
      var T = this.town, t = T.ensureState();
      var html = '<div class="town-bedbar">👥 鎮民 <b>' + t.residents.length + '</b> / <b>' + T.getResidentCap() + '</b>　' +
                 '<span class="muted">魅力越高，遷入越快；每位鎮民提供收入加成</span></div>';
      html += t.residents.length === 0
        ? '<div class="town-empty">尚無鎮民。多蓋【民宅】並提升魅力（水井、寺廟、花園、客棧）可吸引居民遷入。</div>'
        : '<div class="folk-grid">' + t.residents.map(function (p) {
            return '<div class="folk-chip">' + (p.lv >= 4 ? '👑' : (p.lv >= 3 ? '🧑‍🌾' : '🧍')) +
                   ' ' + p.name + ' <span class="muted">Lv.' + p.lv + '（收入 +' + ((p.lv || 1) * 0.4).toFixed(1) + '%）</span></div>';
          }).join('') + '</div>';
      this.el.panels.folk.innerHTML = html;
    }

    /* ══════════ 分送物資 ══════════ */
    renderSupplyPanel() {
      var self = this, T = this.town;
      var inv = T.charSys.rootState.inventory || {};
      var Data = window.HY.Data || {};
      var items = [];
      Object.keys(inv).forEach(function (id) {
        var it = Data.ITEMS && Data.ITEMS[id];
        if (!it || it.type !== 'consumable') return;
        items.push({ id: id, name: it.name, count: inv[id], price: it.price || 0 });
      });
      var html = '<div class="town-buildhead">🎁 將行囊中的丹藥分送鎮民，換取小鎮繁榮度（＝物價 ×1.2，最低 40）</div>';
      if (!items.length) {
        html += '<div class="town-empty">行囊中沒有可贈送的丹藥。藥鋪、黑市或戰鬥掉落都會補充。</div>';
      } else {
        html += '<div class="tb-grid">' + items.map(function (it) {
          var gain = Math.max(40, Math.floor(it.price * 1.2));
          return '<button class="tb-card" data-supply="' + it.id + '">' +
            '<span class="tbc-icon">🎁</span>' +
            '<span class="tbc-name">' + it.name + ' ×' + it.count + '</span>' +
            '<span class="tbc-cost gold-color">繁榮 +' + gain + '</span>' +
            '<span class="tbc-desc">送出 1 個，小鎮繁榮度立即提升。</span></button>';
        }).join('') + '</div>';
      }
      this.el.panels.supply.innerHTML = html;
      this.el.panels.supply.querySelectorAll('[data-supply]').forEach(function (el) {
        el.addEventListener('click', function () { if (T.supplyItem(el.getAttribute('data-supply'))) self.render(); });
      });
    }

    /* ══════════ 研究 ══════════ */
    renderResearch() {
      var self = this, T = this.town, D = T.def;
      var done = 0;
      this.el.research.innerHTML = D.RESEARCH.map(function (r) {
        var ok = T.hasResearch(r.id);
        if (ok) done += 1;
        var chk = T.canResearch(r.id);
        var cost = T.researchCost(r);
        var unlocks = (r.unlock || []).map(function (t) {
          var d = D.TYPES[t];
          return d ? d.icon + d.name : t;
        }).join('、');
        return '<div class="town-rsch ' + (ok ? 'done' : '') + '">' +
          '<div class="tr-head">' + r.icon + ' <b>' + r.name + '</b>' +
          '<span class="muted">' + (ok ? '✅ 已完成' : cost + ' 兩') + '</span></div>' +
          '<div class="tr-desc">' + r.desc + '</div>' +
          (unlocks ? '<div class="tr-unlock">解鎖：' + unlocks + '</div>' : '') +
          (ok ? '' : '<button class="mini-btn" data-rsch="' + r.id + '" ' + (chk.ok ? '' : 'disabled') + '>研究</button>') +
          '</div>';
      }).join('');
      this.el.research.querySelectorAll('[data-rsch]').forEach(function (el) {
        el.addEventListener('click', function () { if (T.doResearch(el.getAttribute('data-rsch'))) self.render(); });
      });
      this._setSecTitle('research', '🔬 研究（' + done + '/' + D.RESEARCH.length + '）');
    }

    /* ══════════ 主組合（兩棟相鄰） ══════════ */
    renderCombos() {
      var T = this.town, D = T.def;
      var active = T.getActiveMain ? T.getActiveMain() : [];
      var html = '';
      if (!active.length) {
        html += '<div class="town-empty">尚未湊出組合。試試【客棧】貼【酒樓】、【藥鋪】貼【醫館】、【茶館】貼【書院】。</div>';
      } else {
        html += active.map(function (c) {
          return '<div class="town-row"><span>' + c.icon + ' ' + c.name + '</span>' +
                 '<span class="sci-color">×' + c.mul.toFixed(2) + '</span></div>';
        }).join('');
      }
      var mainDefs = (D.COMBOS || []).filter(function (c) { return !c.mini; });
      html += '<div class="tr-head" style="margin-top:8px">📖 組合圖鑑（' + mainDefs.length + ' 組）</div>';
      html += '<div class="town-combolist">' + mainDefs.map(function (c) {
        var a = D.TYPES[c.a], b = D.TYPES[c.b];
        if (!a || !b) return '';
        return '<span class="combo-chip">' + c.icon + ' ' + a.name + '＋' + b.name + ' ×' + c.mul.toFixed(2) + '</span>';
      }).join('') + '</div>';
      this.el.combos.innerHTML = html;
      this._setSecTitle('combos', '🔗 生效組合（' + active.length + '/' + mainDefs.length + '）');
    }

    /* ══════════ 三件套組合 ══════════ */
    renderTriples() {
      var T = this.town, D = T.def;
      var defs = D.TRIPLES || [];
      var active = T.getActiveTriples ? T.getActiveTriples() : [];
      var range = (window.HY.TownExtra && window.HY.TownExtra.config && window.HY.TownExtra.config.TRIPLE_RANGE) || 3;
      var html = '<div class="town-empty">規則：三棟建築<b>任兩棟相距 ' + range + ' 格內</b>（曼哈頓距離）即成立，倍率比兩棟組合更高。</div>';
      if (!defs.length) {
        html = '<div class="town-empty">此版本沒有三件套資料（請確認 townExtra.js 已載入）。</div>';
      } else if (!active.length) {
        html += '<div class="town-empty muted">目前尚未湊出任何三件套。</div>';
      } else {
        html += active.map(function (c) {
          return '<div class="town-row triple"><span>🎯 ' + c.name + '</span>' +
                 '<span class="sci-color">×' + c.mul.toFixed(2) + '</span></div>';
        }).join('');
      }
      if (defs.length) {
        html += '<div class="tr-head" style="margin-top:8px">📖 三件套圖鑑（' + defs.length + ' 組）</div>';
        html += '<div class="town-combolist">' + defs.map(function (c) {
          var a = D.TYPES[c.a], b = D.TYPES[c.b], d = D.TYPES[c.c];
          if (!a || !b || !d) return '';
          return '<span class="combo-chip triple">' + c.icon + ' ' + a.name + '＋' + b.name + '＋' + d.name +
                 ' ×' + c.mul.toFixed(2) + '</span>';
        }).join('') + '</div>';
      }
      this.el.triples.innerHTML = html;
      this._setSecTitle('triples', '🎯 三件套組合（' + active.length + '/' + defs.length + '）');
    }

    /* ══════════ 環境加成（mini combo） ══════════ */
    renderMinis() {
      var T = this.town, D = T.def;
      var active = T.getActiveMini ? T.getActiveMini() : [];
      // 把 mini 組合依名稱分組，列出「受益建築 × 來源」
      var groups = {};
      (D.COMBOS || []).forEach(function (c) {
        if (!c.mini) return;
        var g = groups[c.name] || (groups[c.name] = { icon: c.icon, mul: c.mul, sources: {}, targets: {} });
        var sd = D.TYPES[c.b], td = D.TYPES[c.a];
        if (sd) g.sources[sd.name] = sd.icon;
        if (td) g.targets[td.name] = td.icon;
      });
      var html = '<div class="town-empty">綠化建築與道路<b>貼著</b>其他建築即生效，可與組合／三件套疊乘。</div>';
      if (active.length) {
        var byName = {};
        active.forEach(function (c) { byName[c.name] = (byName[c.name] || 0) + 1; });
        html += '<div class="town-row"><span>生效中</span><span class="sci-color">' +
          Object.keys(byName).map(function (n) { return n + ' ×' + byName[n]; }).join('　') + '</span></div>';
      } else {
        html += '<div class="town-empty muted">目前沒有任何環境加成生效。</div>';
      }
      html += '<div class="tr-head" style="margin-top:8px">📖 環境加成圖鑑</div>';
      Object.keys(groups).forEach(function (name) {
        var g = groups[name];
        html += '<div class="mini-block">' +
          '<div class="mini-head">' + g.icon + ' ' + name + '　<span class="sci-color">每組 ×' + g.mul.toFixed(2) + '</span></div>' +
          '<div class="mini-line"><b>來源：</b>' + Object.keys(g.sources).map(function (k) { return g.sources[k] + k; }).join('、') + '</div>' +
          '<div class="mini-line"><b>受益：</b>' + Object.keys(g.targets).map(function (k) { return g.targets[k] + k; }).join('、') + '</div>' +
          '</div>';
      });
      this.el.minis.innerHTML = html;
      this._setSecTitle('mini', '🌿 環境加成（生效 ' + active.length + ' 組）');
    }

    _setSecTitle(key, text) {
      var root = this.el.root;
      if (!root) return;
      var sec = root.querySelector('.town-sec[data-sec="' + key + '"]');
      if (!sec) return;
      var sp = sec.querySelector('.town-sechead span');
      if (sp) sp.textContent = text;
    }

    /* ══════════ 鎮務總覽 ══════════ */
    renderInfoPanel() {
      var T = this.town;
      var s = T.getStats();
      var st = s.stats;
      var D = T.def;
      var pb = s.postBonus, vb = s.visitorBonus;
      var rk = s.rankInfo || { rank: { icon: '❔', name: '—', desc: '' }, next: null, score: 0 };
      var sea = s.season;
      var buff = s.buff || { list: [], incomeMul: 0, landMul: 0, prosperityMul: 0, appeal: 0 };

      var next = null;
      D.LEVELS.forEach(function (L) { if (L.lv === s.level.lv + 1) next = L; });
      var progress = next
        ? Math.max(0, Math.min(100, Math.floor((s.prosperity - s.level.needProsperity) /
            Math.max(1, next.needProsperity - s.level.needProsperity) * 100)))
        : 100;
      var rankProg = rk.next
        ? Math.max(0, Math.min(100, Math.floor((rk.score - rk.rank.score) /
            Math.max(1, rk.next.score - rk.rank.score) * 100)))
        : 100;

      var postRows = '';
      ['mayor', 'teacher', 'commerce', 'guard'].forEach(function (pid) {
        var p = D.POSTS[pid];
        if (!p) return;
        var used = T.getPostCount(pid);
        var occupant = null;
        T.getSettlers().forEach(function (s2) {
          if (s2.post === pid) { var c = T.getCharById(s2.charId); if (c) occupant = c.name; }
        });
        postRows += '<div class="town-row"><span>' + p.icon + ' ' + p.name +
          ' <span class="muted">' + used + '/' + p.cap + '</span></span>' +
          '<span class="' + (occupant ? 'sci-color' : 'muted') + '">' + (occupant || '空缺') + '</span></div>';
      });

      var catCount = {};
      T.ensureState().buildings.forEach(function (b) {
        var d = D.TYPES[b.type];
        if (!d) return;
        catCount[d.cat] = (catCount[d.cat] || 0) + 1;
      });
      var catLine = Object.keys(catCount).map(function (k) {
        var c = (D.CATS && D.CATS[k]) || { name: k, icon: '' };
        return c.icon + c.name + ' ' + catCount[k];
      }).join('　');

      this.el.panels.info.innerHTML =
        '<div class="town-info-grid">' +
          '<div class="ti-card"><div class="ti-label">小鎮等級</div><div class="ti-val">' + s.level.icon + ' ' + s.level.name + '</div>' +
            '<div class="ti-bar"><div style="width:' + progress + '%"></div></div>' +
            (next ? '<div class="muted">距【' + next.name + '】還需 ' + Math.max(0, next.needProsperity - s.prosperity).toLocaleString() + '</div>'
                  : '<div class="muted">已達最高等級</div>') + '</div>' +
          '<div class="ti-card"><div class="ti-label">年度評鑑</div><div class="ti-val gold-color">' + rk.rank.icon + ' ' + rk.rank.name + '</div>' +
            '<div class="ti-bar"><div style="width:' + rankProg + '%"></div></div>' +
            (rk.next ? '<div class="muted">距【' + rk.next.name + '】還需 ' + Math.max(0, rk.next.score - rk.score).toLocaleString() + ' 分</div>'
                     : '<div class="muted">已達最高評價</div>') +
            '<div class="muted">評分 ＝ 地價 + 繁榮度 ＝ ' + rk.score.toLocaleString() + '</div></div>' +
          '<div class="ti-card"><div class="ti-label">地價（Land Price）</div><div class="ti-val sci-color">' + (s.landPrice || 0).toLocaleString() + '</div>' +
            '<div class="muted">每期提供繁榮 +' + Math.floor((s.landPrice || 0) / ((window.HY.TownExtra && window.HY.TownExtra.config.LAND_DIV) || 300)) + '</div></div>' +
          '<div class="ti-card"><div class="ti-label">每期收益</div><div class="ti-val gold-color">+' + this._fmtIncome(s.income) + ' 兩</div>' +
            '<div class="muted">武點 +' + s.sp.toFixed(2) + '／期　（每期 ' + (D.TICK_MS / 1000) + ' 秒）</div>' +
            '<div class="muted">收入倍率 ×' + (s.incomeScale !== undefined ? s.incomeScale : 1) + '（未縮放基準 ' + (s.incomeRaw || 0).toLocaleString() + '）</div></div>' +
          '<div class="ti-card"><div class="ti-label">四季</div><div class="ti-val">' + (sea ? sea.icon + ' ' + sea.name + '·' + sea.desc : '—') + '</div>' +
            '<div class="muted">' + (sea ? '繁榮 +' + Math.round((sea.prosperityMul || 0) * 100) + '%　收入 +' + Math.round((sea.incomeMul || 0) * 100) +
              '%　魅力 +' + (sea.appeal || 0) + '　修行 +' + Math.round((sea.cultivateMul || 0) * 100) + '%' : '') + '</div></div>' +
          '<div class="ti-card"><div class="ti-label">節慶期間加成</div><div class="ti-val">' + (buff.list.length ? buff.list.length + ' 場進行中' : '無') + '</div>' +
            '<div class="muted">收入 +' + Math.round(buff.incomeMul * 100) + '%　地價 +' + Math.round(buff.landMul * 100) +
            '%　繁榮成長 +' + Math.round(buff.prosperityMul * 100) + '%　魅力 +' + (buff.appeal || 0) + '</div></div>' +
          '<div class="ti-card"><div class="ti-label">組合狀況</div><div class="ti-val">組合 ' + (s.mainCount || 0) + '　三件套 ' + (s.triples ? s.triples.length : 0) + '</div>' +
            '<div class="muted">環境加成 ' + (s.miniCount || 0) + ' 組</div></div>' +
          '<div class="ti-card"><div class="ti-label">定居狀況</div><div class="ti-val">🛏️ ' + s.bedsUsed + '／' + s.bedsTotal + ' 床</div>' +
            '<div class="muted">👥 鎮民 ' + s.population + '／' + s.popCap + '　🧭 客居 ' + vb.guests + '　🐾 鎮守 ' + vb.guardians + '</div></div>' +
          '<div class="ti-card"><div class="ti-label">角色修行</div><div class="ti-val sci-color">' + (s.cultivateRate * 100).toFixed(3) + '% ／期</div>' +
            '<div class="muted">定居角色每期獲得自身升級所需經驗的 ' + (s.cultivateRate * 100).toFixed(3) + '%</div></div>' +
          '<div class="ti-card"><div class="ti-label">職務加成</div><div class="ti-val">收入 +' + Math.round(pb.incomeMul * 100) + '%</div>' +
            '<div class="muted">武點 +' + Math.round(pb.spMul * 100) + '%　繁榮成長 +' + Math.round(pb.prosperityMul * 100) + '%　治安 ' + s.order + '</div></div>' +
          '<div class="ti-card"><div class="ti-label">訪客加成</div><div class="ti-val">聲威 +' + vb.appeal + '</div>' +
            '<div class="muted">收入 +' + Math.round(vb.incomeMul * 100) + '%</div></div>' +
          '<div class="ti-card"><div class="ti-label">全鎮倍率</div><div class="ti-val sci-color">收入 ×' + s.gMul.toFixed(3) + '</div>' +
            '<div class="muted">掌櫃平均加成 ×' + s.staffMul.toFixed(3) + '</div></div>' +
          '<div class="ti-card"><div class="ti-label">營運統計</div><div class="ti-val">建築 ' + s.buildings + '／' + s.buildingCap + '</div>' +
            '<div class="muted">' + catLine + '</div>' +
            '<div class="muted">建造 ' + st.built + '｜升級 ' + st.upgraded + '｜拆除 ' + st.demolished + '｜營運 ' + st.ticks +
            ' 期｜事件 ' + st.events + '｜節慶 ' + (st.festivals || 0) + '｜分送 ' + st.pills + '｜角色升級 ' + st.levelUps + '</div></div>' +
          '<div class="ti-card"><div class="ti-label">累計產出</div><div class="ti-val">' + s.totalIncome.toLocaleString() + ' 兩</div></div>' +
        '</div>' +
        '<div class="tr-head" style="margin:10px 0 6px">🏛️ 鎮務職位</div>' +
        '<div class="town-list">' + postRows + '</div>' +
        '<div class="town-earn-note">💰 小鎮的銀兩、武點、丹藥直接進入主遊戲存檔（同一份 localStorage）；' +
        '定居角色在小鎮修行的經驗也直接寫入 exp／lv，與戰鬥升級同一套公式。' +
        '　收入倍率目前為 ×' + (s.incomeScale !== undefined ? s.incomeScale : 1) +
        '（可在 js/townExtra.js 的 CONFIG.INCOME_SCALE 調整）。</div>';
    }

    /* ══════════ 小鎮日誌 ══════════ */
    renderLogPanel() {
      var T = this.town, t = T.ensureState(), D = T.def;
      var html = '';

      // ⭐ 依需求：不再顯示「週期 #N：+X 兩、+Y 武點」的逐期紀錄
      //    若要恢復，把本檔上方的 SHOW_TICK_LOG 改成 true 即可。
      if (SHOW_TICK_LOG) {
        html += '<div class="tr-head">📈 近期營運</div>';
        html += this.recent.length
          ? this.recent.map(function (r) { return '<div class="town-row"><span>' + r + '</span></div>'; }).join('')
          : '<div class="town-empty">尚未開始營運。</div>';
      }

      html += '<div class="tr-head"' + (SHOW_TICK_LOG ? ' style="margin-top:10px"' : '') + '>👤 定居角色</div>';
      if (!t.settlers.length) {
        html += '<div class="town-empty">尚無角色定居。於左欄【我的角色】點「🏠 定居小鎮」。</div>';
      } else {
        html += t.settlers.map(function (s) {
          var c = T.getCharById(s.charId);
          var p = D.POSTS[s.post] || D.POSTS.idle;
          return '<div class="town-row"><span>👤 ' + (c ? c.name : s.charId) + ' Lv.' + (c ? c.lv : '?') +
                 ' <span class="muted">' + p.icon + p.name + '</span></span>' +
                 '<span class="muted">修行累計 ' + (s.exp || 0).toLocaleString() + '</span></div>';
        }).join('');
      }

      html += '<div class="tr-head" style="margin-top:10px">🗺️ 目前建築（' + t.buildings.length + '）</div>';
      if (!t.buildings.length) {
        html += '<div class="town-empty">尚無建築。</div>';
      } else {
        html += '<div class="log-buildgrid">' + t.buildings.slice().sort(function (a, b) { return a.idx - b.idx; }).map(function (b) {
          var def = D.TYPES[b.type];
          if (!def) return '';
          var st2 = T.getStaffOf(b.idx);
          return '<div class="town-row"><span>' + def.icon + ' ' + def.name + ' Lv.' + b.lv +
                 ' <span class="muted">@' + T.cellLabel(b.idx) + '</span></span>' +
                 '<span class="muted">' + (st2 ? '👤' + st2.name : '—') + '</span></div>';
        }).join('') + '</div>';
      }
      this.el.panels.log.innerHTML = html;
    }

    /* ══════════ 銀兩總額 ══════════ */
    injectGold() {
      var T = this.town;
      var g = T.charSys.rootState.gold;
      this.app.logger.add('💡 小鎮與江湖共用同一銀兩池：目前持有 ' + g.toLocaleString() +
        ' 兩。探索、典當或小鎮營運都會即時反映。', 'wealth');
      this.el.hint.textContent = '目前銀兩：' + g.toLocaleString() + ' 兩（與主遊戲共用，無需轉帳）。';
      this.renderHeader();
    }
  }

  window.HY.UITown = UITown;
})();