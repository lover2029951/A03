// js/uiTownGuild.js (v1)
// ⭐ 我的小鎮 UI：冒險者公會分頁（掛載於 HY.UITown.prototype）
//
// v1：新增「⚔️ 冒險者公會」分頁，含六個子分頁：
//   ① 👥 冒險者名冊　② 🎒 公會倉庫　③ 📜 任務派遣
//   ④ 📋 委託榜　　　⑤ 🏛️ 公會經營　⑥ 📖 公會日誌
//
// ⚠️ 載入順序：uiTown.js 之後、main.js 之前（需在 new UITown() 之前完成原型掛載）。
//    樣式由本檔自行注入（#town-guild-style），style.css 無須修改。
window.HY = window.HY || {};

(function () {
  var proto = window.HY.UITown && window.HY.UITown.prototype;
  if (!proto) { console.error('[uiTownGuild] 找不到 HY.UITown，請確認 uiTown.js 已載入且排在本檔之前。'); return; }
  var TG = window.HY.TownGuild;
  if (!TG) { console.error('[uiTownGuild] 找不到 HY.TownGuild，請確認 townGuildSystem.js 已載入。'); return; }

  var T = window.HY.Data.TOWN;

  /* ══════════ 樣式注入 ══════════ */
  function injectGuildStyles() {
    if (document.getElementById('town-guild-style')) return;
    var css = `
/* ══════════ ⚔️ 冒險者公會 ══════════ */
.tg-subtabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #2e3b4e; }
.tg-subtab {
  background: #0f1720; color: #94a3b8; border: 1px solid #2e3b4e;
  padding: 5px 12px; border-radius: 14px; cursor: pointer; font-size: 0.8rem;
}
.tg-subtab:hover { border-color: #c89d54; color: #e2e8f0; }
.tg-subtab.active { color: #fbbf24; border-color: #fbbf24; background: rgba(251,191,36,.12); font-weight: bold; }

.tg-hero { background: linear-gradient(90deg, #1b2432, #2a2136); border: 1px solid #c89d54; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; }
.tg-hero h3 { color: #c89d54; font-size: 0.98rem; margin: 0 0 6px; }
.tg-statrow { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.82rem; margin-bottom: 4px; }
.tg-bar { height: 7px; background: #0d1219; border: 1px solid #334155; border-radius: 4px; overflow: hidden; margin: 5px 0; }
.tg-bar > div { height: 100%; background: linear-gradient(90deg, #b78a3f, #fbbf24); }

.tg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 9px; }
.tg-card { background: #131b26; border: 1px solid #2e3b4e; border-radius: 6px; padding: 9px; display: flex; flex-direction: column; gap: 6px; }
.tg-card.sel { border-color: #fbbf24; box-shadow: 0 0 10px rgba(251,191,36,.25); }
.tg-card.busy { border-color: #00e5ff; }
.tg-card.hurt { border-color: #ef4444; }
.tg-chead { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.tg-cname { font-size: 0.88rem; font-weight: bold; }
.tg-cmeta { font-size: 0.72rem; color: #94a3b8; white-space: nowrap; }
.tg-tags { display: flex; gap: 5px; flex-wrap: wrap; }
.tg-tag { font-size: 0.68rem; padding: 1px 7px; border-radius: 9px; border: 1px solid #2e3b4e; color: #94a3b8; background: #0f1720; }
.tg-tag.role { border-color: #00e5ff; color: #7dd3fc; }
.tg-tag.sect { border-color: #a78bfa; color: #c4b5fd; }
.tg-tag.ok { border-color: #10b981; color: #6ee7b7; }
.tg-tag.busy { border-color: #00e5ff; color: #67e8f9; }
.tg-tag.hurt { border-color: #ef4444; color: #fca5a5; }
.tg-vitals { font-size: 0.72rem; color: #94a3b8; display: flex; justify-content: space-between; }
.tg-hp { height: 5px; background: #0d1219; border-radius: 3px; overflow: hidden; }
.tg-hp > div { height: 100%; background: linear-gradient(90deg, #b91c1c, #ef4444); }
.tg-mp { height: 5px; background: #0d1219; border-radius: 3px; overflow: hidden; }
.tg-mp > div { height: 100%; background: linear-gradient(90deg, #1d4ed8, #3b82f6); }

.tg-slots { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
.tg-slot {
  background: #0f1720; border: 1px solid #2e3b4e; border-radius: 4px;
  padding: 3px 2px; font-size: 0.62rem; text-align: center; cursor: pointer;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #94a3b8; line-height: 1.3;
}
.tg-slot:hover { border-color: #c89d54; color: #e2e8f0; }
.tg-slot.filled { border-color: #10b981; color: #a7f3d0; }
.tg-slot .tg-sicon { display: block; font-size: 0.85rem; }
.tg-attrs { display: flex; gap: 9px; flex-wrap: wrap; font-size: 0.72rem; color: #94a3b8; }
.tg-attrs b { color: #e2e8f0; }

.tg-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; background: #121822; border: 1px solid #2e3b4e; border-radius: 4px; padding: 5px 8px; font-size: 0.78rem; }
.tg-row:hover { border-color: #c89d54; }
.tg-empty { font-size: 0.78rem; color: #94a3b8; line-height: 1.6; padding: 6px 0; }
.tg-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 900px) { .tg-cols { grid-template-columns: 1fr; } }

.tg-mission { background: #121822; border: 1px solid #2e3b4e; border-radius: 6px; padding: 8px 10px; margin-bottom: 7px; }
.tg-mission.sel { border-color: #fbbf24; background: #1a1d17; }
.tg-mhead { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.tg-mname { font-size: 0.86rem; font-weight: bold; }
.tg-mstats { display: flex; gap: 11px; flex-wrap: wrap; font-size: 0.75rem; margin: 4px 0; }
.tg-mdesc { font-size: 0.73rem; color: #94a3b8; line-height: 1.45; }
.tg-chips { display: flex; gap: 5px; flex-wrap: wrap; margin: 6px 0; }
.tg-chip { background: #0f1720; border: 1px solid #2e3b4e; border-radius: 12px; padding: 2px 9px; font-size: 0.72rem; cursor: pointer; color: #94a3b8; }
.tg-chip:hover { border-color: #c89d54; }
.tg-chip.on { background: rgba(251,191,36,.18); border-color: #fbbf24; color: #fbbf24; font-weight: bold; }
.tg-chip.dis { opacity: .35; cursor: not-allowed; }
.tg-rate { font-size: 0.78rem; }
.tg-rate b { font-size: 0.9rem; }

.tg-progress { height: 5px; background: #0d1219; border-radius: 3px; overflow: hidden; margin-top: 4px; }
.tg-progress > div { height: 100%; background: linear-gradient(90deg, #00e5ff, #7dd3fc); }

.tg-logbox { display: flex; flex-direction: column; gap: 4px; max-height: 340px; overflow-y: auto; }
.tg-logline { font-size: 0.76rem; line-height: 1.5; border-left: 2px solid #2e3b4e; padding-left: 7px; color: #cbd5e1; }
.tg-logline.w { border-color: #fbbf24; }
.tg-logline.l { border-color: #10b981; }
.tg-logline.s { border-color: #ef4444; }
.tg-logtime { color: #64748b; font-size: 0.68rem; margin-right: 5px; }

.tg-rank { display: flex; justify-content: space-between; align-items: center; gap: 6px; background: #121822; border: 1px solid #2e3b4e; border-radius: 4px; padding: 4px 8px; font-size: 0.78rem; }
.tg-rank .no { color: #fbbf24; font-weight: bold; width: 22px; }
`;
    var st = document.createElement('style');
    st.id = 'town-guild-style';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* ══════════ 掛載 _buildDom ══════════ */
  var _buildDom = proto._buildDom;
  proto._buildDom = function () {
    _buildDom.call(this);
    injectGuildStyles();

    var root = this.el.root;
    if (!root) return;
    var self = this;

    // 1. 在分頁列加入公會按鈕（插在「節慶」之後）
    var tabs = root.querySelector('.town-tabs');
    if (tabs && !tabs.querySelector('[data-ttab="guild"]')) {
      var btn = document.createElement('button');
      btn.className = 'town-tab-btn';
      btn.setAttribute('data-ttab', 'guild');
      btn.textContent = '⚔️ 冒險者公會';
      btn.addEventListener('click', function () { self.switchTab('guild'); });
      var festBtn = tabs.querySelector('[data-ttab="festival"]');
      if (festBtn && festBtn.nextSibling) tabs.insertBefore(btn, festBtn.nextSibling);
      else tabs.appendChild(btn);
    }

    // 2. 建立面板
    var bottom = root.querySelector('.town-bottom');
    if (bottom && !root.querySelector('#town-panel-guild')) {
      var panel = document.createElement('div');
      panel.id = 'town-panel-guild';
      panel.className = 'town-tabpanel hidden';
      bottom.appendChild(panel);
      this.el.panels.guild = panel;
    }

    // 3. UI 狀態
    this.guildTab = this.guildTab || 'roster';
    this.guildSel = this.guildSel || null;
    this.msn = this.msn || { id: null, members: [] };
  };

  /* ══════════ 掛載 renderBottom ══════════ */
  var _renderBottom = proto.renderBottom;
  proto.renderBottom = function () {
    if (this.tab === 'guild') { this.renderGuildPanel(); return; }
    _renderBottom.call(this);
  };

  /* ══════════ 工具 ══════════ */
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }

  proto.tgSetTab = function (t) { this.guildTab = t; this.renderGuildPanel(); };
  proto.tgSelect = function (id) { this.guildSel = (this.guildSel === id ? null : id); this.renderGuildPanel(); };
  proto.tgSelectMission = function (id) {
    this.msn = { id: (this.msn.id === id ? null : id), members: [] };
    this.renderGuildPanel();
  };
  proto.tgToggleMember = function (id) {
    var m = this.msn.members;
    var i = m.indexOf(id);
    if (i === -1) m.push(id); else m.splice(i, 1);
    this.renderGuildPanel();
  };
  proto.tgAutoPick = function () {
    var T2 = this.town;
    if (!this.msn.id) return;
    var mission = T2.guildMissionById(this.msn.id);
    if (!mission) return;
    var idle = T2.guildIdleAdventurers().slice();
    idle.sort(function (a, b) { return T2.guildPower(b) - T2.guildPower(a); });
    this.msn.members = idle.slice(0, Math.min(mission.n[1], idle.length)).map(function (a) { return a.id; });
    this.renderGuildPanel();
  };
  proto.tgClearMembers = function () { this.msn.members = []; this.renderGuildPanel(); };

  proto.tgStatusTag = function (a) {
    var map = {
      idle: ['待命', 'ok'], guard: ['守護中', 'busy'],
      explore: ['探險中', 'busy'], gather: ['採集中', 'busy'], injured: ['養傷中', 'hurt']
    };
    var s = map[a.status] || ['未知', ''];
    return '<span class="tg-tag ' + s[1] + '">' + s[0] + '</span>';
  };

  /* ══════════ 公會主面板 ══════════ */
  proto.renderGuildPanel = function () {
    var panel = this.el.panels && this.el.panels.guild;
    if (!panel) return;
    var T2 = this.town;
    if (!T2 || !T2.isGuildFounded) { panel.innerHTML = '<div class="tg-empty">公會系統未載入。</div>'; return; }

    if (!T2.isGuildFounded()) {
      panel.innerHTML = this.tgNotFoundHtml();
      return;
    }

    var st = T2.guildStats();
    var head = this.tgHeaderHtml(st);
    var tabs = this.tgSubTabsHtml(st);
    var body = '';
    var t = this.guildTab || 'roster';
    if (t === 'roster') body = this.tgRosterHtml(st);
    else if (t === 'storage') body = this.tgStorageHtml(st);
    else if (t === 'missions') body = this.tgMissionsHtml(st);
    else if (t === 'contracts') body = this.tgContractsHtml(st);
    else if (t === 'manage') body = this.tgManageHtml(st);
    else body = this.tgLogHtml(st);

    panel.innerHTML = head + tabs + body;
    this.tgBind(panel);
  };

  proto.tgNotFoundHtml = function () {
    var T2 = this.town;
    var canResearch = !T2.hasResearch('guildCharter');
    var r = null;
    (T2.def.RESEARCH || []).forEach(function (x) { if (x.id === 'guildCharter') r = x; });
    return '<div class="town-hero">' +
      '<div class="town-hero-icon">⚔️</div>' +
      '<h3>冒險者公會</h3>' +
      '<p>公會是鎮上勇士們的家。在此可以讓<b>鎮民註冊成為冒險者</b>，' +
      '他們會<b>守護小鎮、出外探險、採集資源</b>，並且' +
      '<b>與你的角色一樣穿戴裝備、拜入門派、修習內功</b>。</p>' +
      '<p>把裝備放進<b>公會倉庫</b>，冒險者會自動挑選最適合自己的穿上。</p>' +
      (canResearch
        ? '<p class="muted">需先研究【📜 公會章程】（' + (r ? T2.researchCost(r) : '?') + ' 兩），再於小鎮地圖建造【⚔️ 冒險者公會】。</p>'
        : '<p class="muted">研究已完成 —— 請到【🏗️ 建造與營運】分頁，在【⚔️ 公會】分類中建造【冒險者公會】。</p>') +
      '<button class="mini-btn" data-tggoto="build">前往建造</button>' +
      '</div>';
  };

  proto.tgHeaderHtml = function (st) {
    var L = st.level;
    var T2 = this.town;
    return '<div class="tg-hero">' +
      '<h3>⚔️ 冒險者公會　<span class="muted">' + L.title + '（Lv.' + L.lv + '）</span></h3>' +
      '<div class="tg-statrow">' +
        '<span>🏅 聲望 <b class="gold-color">' + fmt(st.reputation) + '</b></span>' +
        '<span>👥 成員 <b>' + st.adventurers + '</b>/<b>' + st.maxAdventurers + '</b>（待命 ' + st.byStatus.idle + '｜出勤 ' + (st.byStatus.guard + st.byStatus.explore + st.byStatus.gather) + '｜養傷 ' + st.byStatus.injured + '）</span>' +
        '<span>🎒 倉庫 <b>' + st.storage + '</b>/<b>' + st.storageCap + '</b></span>' +
        '<span>📜 任務 <b>' + st.missions + '</b>/<b>' + st.missionSlots + '</b></span>' +
        '<span>🛡️ 治安 <b class="sci-color">+' + st.order + '</b></span>' +
        '<span>⚔️ 總戰力 <b class="sci-color">' + fmt(st.totalPower) + '</b></span>' +
      '</div>' +
      (L.nextRep ? '<div class="tg-bar"><div style="width:' + L.progress + '%"></div></div>' +
        '<div class="muted">距下一級還需 ' + fmt(Math.max(0, L.nextRep - st.reputation)) + ' 聲望</div>' : '<div class="muted">已達最高公會等級</div>') +
      '<div class="tg-statrow" style="margin-top:6px">' +
        '<span class="muted">任務成功率 +' + pct(st.successBonus) + '　經驗 ×' + st.expMul.toFixed(2) + '　獎勵 ×' + st.rewardMul.toFixed(2) + '　收入 +' + pct(st.incomeBonus) + '</span>' +
        '<span class="muted">自動配裝：<b class="' + (st.autoEquip ? 'sci-color' : '') + '">' + (st.autoEquip ? '開啟' : '關閉') + '</b></span>' +
      '</div>' +
      '</div>';
  };

  proto.tgSubTabsHtml = function (st) {
    var t = this.guildTab || 'roster';
    function b(id, label) {
      return '<button class="tg-subtab' + (t === id ? ' active' : '') + '" data-tgsub="' + id + '">' + label + '</button>';
    }
    var html = '<div class="tg-subtabs">';
    html += b('roster', '👥 冒險者名冊');
    html += b('storage', '🎒 公會倉庫');
    html += b('missions', '📜 任務派遣');
    if (st.canContracts) html += b('contracts', '📋 委託榜' + (st.contracts ? '（' + st.contracts + '）' : ''));
    html += b('manage', '🏛️ 公會經營');
    html += b('log', '📖 公會日誌');
    html += '</div>';
    return html;
  };

  /* ══════════ ① 冒險者名冊 ══════════ */
  proto.tgRosterHtml = function (st) {
    var T2 = this.town;
    var list = T2.guildAdventurers();
    if (!list.length) {
      var rec = T2.guildRecruitable().length;
      return '<div class="tg-empty">公會尚無成員。<br>' +
        (rec > 0
          ? '目前有 <b>' + rec + '</b> 位鎮民可以註冊入會 —— 請到【🏛️ 公會經營】分頁一鍵招募。'
          : '小鎮上還沒有鎮民。請多蓋【民宅】並提升魅力，待居民遷入後即可招募。') +
        '</div>';
    }
    var html = '<div class="tg-grid">';
    var self = this;
    list.forEach(function (a) {
      html += self.tgAdvCardHtml(a);
    });
    html += '</div>';
    return html;
  };

  proto.tgAdvCardHtml = function (a) {
    var T2 = this.town;
    var d = T2.guildDerived(a);
    var power = T2.guildPower(a);
    var role = TG.config ? (window.HY.Data.TOWN.GUILD.ROLES[a.role] || {}) : {};
    var sectName = T2.guildSectName(a.sect);
    var hpPct = d.maxHp > 0 ? Math.round((a.currentHp / d.maxHp) * 100) : 0;
    var mpPct = d.maxMp > 0 ? Math.round((a.currentMp / d.maxMp) * 100) : 0;
    var expPct = a.maxExp > 0 ? Math.floor((a.exp || 0) / a.maxExp * 100) : 0;
    var isSel = this.guildSel === a.id;

    var cls = 'tg-card' + (isSel ? ' sel' : '');
    if (a.status === 'injured') cls += ' hurt';
    else if (a.status !== 'idle') cls += ' busy';

    var html = '<div class="' + cls + '">';
    html += '<div class="tg-chead"><span class="tg-cname" data-tgsel="' + a.id + '">' + role.icon + ' ' + a.name + '</span>' +
            '<span class="tg-cmeta">Lv.<b class="gold-color">' + a.lv + '</b>　⚔️<b class="sci-color">' + fmt(power) + '</b></span></div>';

    html += '<div class="tg-tags">';
    html += '<span class="tg-tag role">' + (role.name || a.role) + '</span>';
    html += '<span class="tg-tag sect">' + (a.sect ? sectName : '無門無派') + '</span>';
    html += this.tgStatusTag(a);
    html += '</div>';

    // 氣血 / 內力
    html += '<div class="tg-vitals"><span>❤️ ' + fmt(a.currentHp) + ' / ' + fmt(d.maxHp) + '</span><span>💧 ' + fmt(a.currentMp) + ' / ' + fmt(d.maxMp) + '</span></div>';
    html += '<div class="tg-hp"><div style="width:' + hpPct + '%"></div></div>';
    html += '<div class="tg-mp"><div style="width:' + mpPct + '%"></div></div>';

    // 經驗
    html += '<div class="tg-vitals"><span>經驗 ' + fmt(a.exp) + ' / ' + fmt(a.maxExp) + '</span><span>任務 ' + (a.totalMissions || 0) + ' 次</span></div>';
    html += '<div class="tg-progress"><div style="width:' + Math.min(100, expPct) + '%"></div></div>';

    // 四維
    html += '<div class="tg-attrs">' +
      '<span>體魄 <b>' + a.stats.con + '</b></span>' +
      '<span>力道 <b>' + a.stats.str + '</b></span>' +
      '<span>身法 <b>' + a.stats.agi + '</b></span>' +
      '<span>內息 <b>' + a.stats.int + '</b></span>' +
      '</div>';
    html += '<div class="tg-attrs">' +
      '<span>攻 <b>' + fmt(d.atk) + '</b></span>' +
      '<span>防 <b>' + fmt(d.def) + '</b></span>' +
      '<span>命中 <b>' + fmt(d.hit) + '</b></span>' +
      '<span>閃避 <b>' + fmt(d.eva) + '</b></span>' +
      '<span>爆擊 <b>' + fmt(d.crit) + '</b></span>' +
      '<span>暴抗 <b>' + fmt(d.critRes) + '</b></span>' +
      '</div>';

    // 十部位裝備
    html += '<div class="tg-slots">';
    var self = this;
    T2.guildSlots().forEach(function (s) {
      var it = a.equipment[s];
      var nm = it ? T2.guildItemLabel(it) : '空';
      var icon = '';
      var es = window.HY.game && window.HY.game.equipSys;
      if (es && es.SLOTS && es.SLOTS[s]) icon = es.SLOTS[s].icon;
      html += '<div class="tg-slot' + (it ? ' filled' : '') + '" data-tgslot="' + a.id + '|' + s + '" title="' +
        (es && es.SLOTS && es.SLOTS[s] ? es.SLOTS[s].name : s) + '：' + nm + '">' +
        '<span class="tg-sicon">' + (icon || '·') + '</span>' + nm.substring(0, 5) + '</div>';
    });
    html += '</div>';

    // 展開：詳細 + 操作
    if (isSel) {
      html += '<div class="tg-mdesc">' +
        '修行至今共出勤 ' + (a.totalMissions || 0) + ' 次。' +
        (a.status === 'injured' ? '目前負傷，需休養 ' + Math.max(0, a.injuredUntil) + ' 期。' : '') +
        (a.status !== 'idle' && a.status !== 'injured' ? '正在執行任務，剩餘 ' + Math.max(0, a.missionEnd) + ' 期。' : '') +
        '</div>';
      html += '<div class="tg-tags">';
      html += '<button class="mini-btn" data-tgtrain="' + a.id + '">🎯 訓練（' + fmt(T2.guildTrainCost(a)) + ' 兩）</button>';
      html += '<button class="mini-btn" data-tgheal="' + a.id + '">💊 療養（' + fmt(T2.guildHealCost(a)) + ' 兩）</button>';
      html += '<button class="mini-btn" data-tgauto1="' + a.id + '">⚙️ 自動配裝</button>';
      html += '<button class="mini-btn danger-mini" data-tgdismiss="' + a.id + '">🚪 退會</button>';
      html += '</div>';

      // 強化裝備
      if (T2.guildCanForge()) {
        html += '<div class="tg-mdesc">公會鍛造坊：點選上方裝備格可強化（上限 +' + TG.config.FORGE_MAX_LV + '）。</div>';
      }
    }

    html += '</div>';
    return html;
  };

  /* ══════════ ① 冒險者名冊 ══════════ */
  proto.tgRosterHtml = function (st) {
    var T2 = this.town;
    var list = T2.guildAdventurers();
    if (!list.length) {
      var rec = T2.guildRecruitable().length;
      return '<div class="tg-empty">公會尚無成員。<br>' +
        (rec > 0
          ? '目前有 <b>' + rec + '</b> 位鎮民可以註冊入會 —— 請到【🏛️ 公會經營】分頁一鍵招募。'
          : '小鎮上還沒有鎮民。請多蓋【民宅】並提升魅力，待居民遷入後即可招募。') +
        '</div>';
    }
    var html = '<div class="tg-grid">';
    var self = this;
    list.forEach(function (a) {
      html += self.tgAdvCardHtml(a);
    });
    html += '</div>';
    return html;
  };

  proto.tgAdvCardHtml = function (a) {
    var T2 = this.town;
    var d = T2.guildDerived(a);
    var power = T2.guildPower(a);
    var role = TG.config ? (window.HY.Data.TOWN.GUILD.ROLES[a.role] || {}) : {};
    var sectName = T2.guildSectName(a.sect);
    var hpPct = d.maxHp > 0 ? Math.round((a.currentHp / d.maxHp) * 100) : 0;
    var mpPct = d.maxMp > 0 ? Math.round((a.currentMp / d.maxMp) * 100) : 0;
    var expPct = a.maxExp > 0 ? Math.floor((a.exp || 0) / a.maxExp * 100) : 0;
    var isSel = this.guildSel === a.id;

    var cls = 'tg-card' + (isSel ? ' sel' : '');
    if (a.status === 'injured') cls += ' hurt';
    else if (a.status !== 'idle') cls += ' busy';

    var html = '<div class="' + cls + '">';
    html += '<div class="tg-chead"><span class="tg-cname" data-tgsel="' + a.id + '">' + role.icon + ' ' + a.name + '</span>' +
            '<span class="tg-cmeta">Lv.<b class="gold-color">' + a.lv + '</b>　⚔️<b class="sci-color">' + fmt(power) + '</b></span></div>';

    html += '<div class="tg-tags">';
    html += '<span class="tg-tag role">' + (role.name || a.role) + '</span>';
    html += '<span class="tg-tag sect">' + (a.sect ? sectName : '無門無派') + '</span>';
    html += this.tgStatusTag(a);
    html += '</div>';

    // 氣血 / 內力
    html += '<div class="tg-vitals"><span>❤️ ' + fmt(a.currentHp) + ' / ' + fmt(d.maxHp) + '</span><span>💧 ' + fmt(a.currentMp) + ' / ' + fmt(d.maxMp) + '</span></div>';
    html += '<div class="tg-hp"><div style="width:' + hpPct + '%"></div></div>';
    html += '<div class="tg-mp"><div style="width:' + mpPct + '%"></div></div>';

    // 經驗
    html += '<div class="tg-vitals"><span>經驗 ' + fmt(a.exp) + ' / ' + fmt(a.maxExp) + '</span><span>任務 ' + (a.totalMissions || 0) + ' 次</span></div>';
    html += '<div class="tg-progress"><div style="width:' + Math.min(100, expPct) + '%"></div></div>';

    // 四維
    html += '<div class="tg-attrs">' +
      '<span>體魄 <b>' + a.stats.con + '</b></span>' +
      '<span>力道 <b>' + a.stats.str + '</b></span>' +
      '<span>身法 <b>' + a.stats.agi + '</b></span>' +
      '<span>內息 <b>' + a.stats.int + '</b></span>' +
      '</div>';
    html += '<div class="tg-attrs">' +
      '<span>攻 <b>' + fmt(d.atk) + '</b></span>' +
      '<span>防 <b>' + fmt(d.def) + '</b></span>' +
      '<span>命中 <b>' + fmt(d.hit) + '</b></span>' +
      '<span>閃避 <b>' + fmt(d.eva) + '</b></span>' +
      '<span>爆擊 <b>' + fmt(d.crit) + '</b></span>' +
      '<span>暴抗 <b>' + fmt(d.critRes) + '</b></span>' +
      '</div>';

    // 十部位裝備
    html += '<div class="tg-slots">';
    var self = this;
    T2.guildSlots().forEach(function (s) {
      var it = a.equipment[s];
      var nm = it ? T2.guildItemLabel(it) : '空';
      var icon = '';
      var es = window.HY.game && window.HY.game.equipSys;
      if (es && es.SLOTS && es.SLOTS[s]) icon = es.SLOTS[s].icon;
      html += '<div class="tg-slot' + (it ? ' filled' : '') + '" data-tgslot="' + a.id + '|' + s + '" title="' +
        (es && es.SLOTS && es.SLOTS[s] ? es.SLOTS[s].name : s) + '：' + nm + '">' +
        '<span class="tg-sicon">' + (icon || '·') + '</span>' + nm.substring(0, 5) + '</div>';
    });
    html += '</div>';

    // 展開：詳細 + 操作
    if (isSel) {
      html += '<div class="tg-mdesc">' +
        '修行至今共出勤 ' + (a.totalMissions || 0) + ' 次。' +
        (a.status === 'injured' ? '目前負傷，需休養 ' + Math.max(0, a.injuredUntil) + ' 期。' : '') +
        (a.status !== 'idle' && a.status !== 'injured' ? '正在執行任務，剩餘 ' + Math.max(0, a.missionEnd) + ' 期。' : '') +
        '</div>';
      html += '<div class="tg-tags">';
      html += '<button class="mini-btn" data-tgtrain="' + a.id + '">🎯 訓練（' + fmt(T2.guildTrainCost(a)) + ' 兩）</button>';
      html += '<button class="mini-btn" data-tgheal="' + a.id + '">💊 療養（' + fmt(T2.guildHealCost(a)) + ' 兩）</button>';
      html += '<button class="mini-btn" data-tgauto1="' + a.id + '">⚙️ 自動配裝</button>';
      html += '<button class="mini-btn danger-mini" data-tgdismiss="' + a.id + '">🚪 退會</button>';
      html += '</div>';

      // 強化裝備
      if (T2.guildCanForge()) {
        html += '<div class="tg-mdesc">公會鍛造坊：點選上方裝備格可強化（上限 +' + TG.config.FORGE_MAX_LV + '）。</div>';
      }
    }

    html += '</div>';
    return html;
  };

  /* ══════════ ② 公會倉庫 ══════════ */
  proto.tgStorageHtml = function (st) {
    var T2 = this.town;
    var html = '';
    var bag = T2.guildPlayerEquipables();
    var store = T2.guildStorage();

    html += '<div class="tg-cols">';

    // 左：玩家可存入的裝備
    html += '<div>';
    html += '<div class="tg-mhead"><span class="tg-mname">🎒 我的裝備（可存入公會）</span>';
    html += '<span><button class="mini-btn" data-tgdepall="1">📥 一鍵存入（' + bag.length + '）</button></span></div>';
    html += '<div class="tg-mdesc">包含裝備行囊中的裝備，以及主角<b>目前穿戴中</b>的裝備（存入會直接卸下）。</div>';
    if (!bag.length) {
      html += '<div class="tg-empty">沒有可存入的裝備。裝備可由戰鬥掉落、黑市或工藝取得。</div>';
    } else {
      bag.forEach(function (e, i) {
        html += '<div class="tg-row"><span>' + e.slotName + '　<b>' + e.name + '</b>' +
          ' <span class="muted">Lv.' + e.reqLv + '　戰力 ' + fmt(e.power) + '</span>' +
          (e.kind === 'worn' ? ' <span class="tg-tag hurt">穿戴中</span>' : '') + '</span>' +
          '<button class="mini-btn" data-tgdep="' + e.kind + '|' + e.key + '">存入</button></div>';
      });
    }
    html += '</div>';

    // 右：公會倉庫
    html += '<div>';
    html += '<div class="tg-mhead"><span class="tg-mname">🎒 公會倉庫（' + store.length + '/' + st.storageCap + '）</span>';
    html += '<span>' +
      '<button class="mini-btn" data-tgautoeq="1">⚙️ 自動配裝</button> ' +
      '<button class="mini-btn" data-tgtoggleauto="1">' + (st.autoEquip ? '🔁 自動配裝：開' : '⏸️ 自動配裝：關') + '</button> ' +
      '<button class="mini-btn danger-mini" data-tgselljunk="1">🧹 清理無用</button>' +
      '</span></div>';
    html += '<div class="tg-mdesc">自動配裝時，冒險者會挑走<b>等級足夠且戰力更高</b>的裝備；換下的舊裝備會回到倉庫。</div>';
    if (!store.length) {
      html += '<div class="tg-empty">公會倉庫是空的。把裝備存進來，冒險者就會自動換上。</div>';
    } else {
      store.forEach(function (it, i) {
        var sl = T2.guildItemSlot(it);
        var slName = T2.guildSlotName(sl === 'ring' ? 'ring_left' : sl) ;
        html += '<div class="tg-row"><span>' + slName + '　<b>' + T2.guildItemLabel(it) + '</b>' +
          ' <span class="muted">Lv.' + (it.reqLv || 1) + '　戰力 ' + fmt(T2.guildItemPower(it)) + '</span></span>' +
          '<span><button class="mini-btn" data-tgwd="' + i + '">取回</button> ' +
          '<button class="mini-btn danger-mini" data-tgsell="' + i + '">賣出</button></span></div>';
      });
    }
    html += '</div>';

    html += '</div>';
    return html;
  };

  /* ══════════ ③ 任務派遣 ══════════ */
  proto.tgMissionsHtml = function (st) {
    var T2 = this.town;
    var html = '';

    // 進行中
    html += '<div class="tg-mhead"><span class="tg-mname">🚩 進行中的任務（' + st.missions + '/' + st.missionSlots + '）</span></div>';
    var active = T2.guildMissionActive();
    if (!active.length) {
      html += '<div class="tg-empty">目前沒有進行中的任務。</div>';
    } else {
      active.forEach(function (task) {
        var prog = task.totalTicks > 0 ? Math.round((1 - task.remain / task.totalTicks) * 100) : 0;
        var names = task.advIds.map(function (id) { var a = T2.guildAdventurer(id); return a ? a.name : '?'; }).join('、');
        html += '<div class="tg-mission">' +
          '<div class="tg-mhead"><span class="tg-mname">' + task.icon + ' ' + task.name + '</span>' +
          '<span class="muted">剩 ' + Math.max(0, task.remain) + ' / ' + task.totalTicks + ' 期　成功率 ' + pct(task.est) + '</span></div>' +
          '<div class="tg-progress"><div style="width:' + prog + '%"></div></div>' +
          '<div class="tg-mdesc">成員：' + names + '</div>' +
          '<button class="mini-btn danger-mini" data-tgrecall="' + task.id + '">↩️ 召回</button>' +
          '</div>';
      });
    }

    // 可派遣
    html += '<div class="tg-mhead" style="margin-top:10px"><span class="tg-mname">📜 可派遣任務</span>';
    html += '<span class="muted">點任務選取 → 點成員加入 → 派遣</span></div>';

    var idle = T2.guildIdleAdventurers();
    var mission = this.msn.id ? T2.guildMissionById(this.msn.id) : null;

    // 成員選擇器（有選任務時才顯示）
    if (mission) {
      var est = T2.guildEstimate(this.msn.id, this.msn.members);
      html += '<div class="tg-mission sel">';
      html += '<div class="tg-mhead"><span class="tg-mname">👥 挑選成員（' + this.msn.members.length + '/' + mission.n[1] + '，最少 ' + mission.n[0] + '）</span>';
      html += '<span><button class="mini-btn" data-tgautopick="1">⭐ 自動挑最強</button> ';
      html += '<button class="mini-btn" data-tgclearpick="1">清空</button></span></div>';
      if (!idle.length) {
        html += '<div class="tg-empty">沒有待命的冒險者。</div>';
      } else {
        html += '<div class="tg-chips">';
        idle.forEach(function (a) {
          var on = this.msn.members.indexOf(a.id) !== -1;
          var full = !on && this.msn.members.length >= mission.n[1];
          html += '<span class="tg-chip' + (on ? ' on' : '') + (full ? ' dis' : '') + '" data-tgmember="' + a.id + '">' +
            a.name + '　Lv.' + a.lv + '　⚔️' + fmt(T2.guildPower(a)) + '</span>';
        }, this);
        html += '</div>';
      }
      html += '<div class="tg-rate">預估成功率 <b class="' + (est.rate >= 0.75 ? 'sci-color' : (est.rate >= 0.45 ? 'gold-color' : '')) + '">' + pct(est.rate) + '</b>' +
        '　平均戰力 <b>' + fmt(est.avg) + '</b> / 建議 <b>' + fmt(est.need) + '</b></div>';
      html += '<button class="mini-btn wide" data-tgdispatch="' + this.msn.id + '">🚩 派遣（' + this.msn.members.length + ' 人）</button>';
      html += '</div>';
    }

    // 任務清單
    T2.guildMissionList().forEach(function (m) {
      var sel = this.msn.id === m.id;
      html += '<div class="tg-mission' + (sel ? ' sel' : '') + '" data-tgmission="' + m.id + '">';
      html += '<div class="tg-mhead"><span class="tg-mname">' + m.icon + ' ' + m.name +
        ' <span class="tg-tag">' + (m.type === 'guard' ? '守護' : (m.type === 'explore' ? '探險' : '採集')) + '</span></span>' +
        '<span class="muted">' + m.n[0] + '~' + m.n[1] + ' 人　' + m.ticks[0] + '~' + m.ticks[1] + ' 期</span></div>';
      html += '<div class="tg-mstats">' +
        '<span>💵 <b class="gold-color">' + fmt(m.gold) + '</b> 兩／人</span>' +
        '<span>✨ <b>+' + fmt(m.exp) + '</b> 經驗／人</span>' +
        (m.sp ? '<span>📖 <b class="sci-color">+' + m.sp + '</b> 武點</span>' : '') +
        '<span>⚔️ 建議 <b>' + fmt(m.need) + '</b>／人</span>' +
        (m.order ? '<span>🛡️ 治安 <b class="sci-color">+' + m.order + '</b>（進行中）</span>' : '') +
        (m.loot ? '<span>🎁 有機率帶回' + (m.loot.kind === 'equip' ? '裝備' : '丹藥') + '</span>' : '') +
        '</div>';
      html += '<div class="tg-mdesc">' + m.desc + '</div>';
      html += '</div>';
    }, this);

    return html;
  };

  /* ══════════ ④ 委託榜 ══════════ */
  proto.tgContractsHtml = function (st) {
    var T2 = this.town;
    var g = T2.guildState();
    var html = '';
    html += '<div class="tg-mhead"><span class="tg-mname">📋 委託榜</span>';
    html += '<span><button class="mini-btn" data-tgrefreshct="1">🔄 更新委託（免費）</button></span></div>';
    html += '<div class="tg-mdesc">四方而來的委託，報酬遠高於一般任務。接取後佔用任務欄位，過期或婉拒即消失。</div>';

    var list = g.contracts || [];
    if (!list.length) {
      html += '<div class="tg-empty">目前沒有委託。點「更新委託」試試。</div>';
      return html;
    }

    var idle = T2.guildIdleAdventurers();

    // 用同一組成員選擇器（共用 msn）
    html += '<div class="tg-mission sel">';
    html += '<div class="tg-mhead"><span class="tg-mname">👥 出勤成員（' + this.msn.members.length + '）</span>';
    html += '<span><button class="mini-btn" data-tgautopick="1">⭐ 自動挑最強</button> ';
    html += '<button class="mini-btn" data-tgclearpick="1">清空</button></span></div>';
    if (!idle.length) html += '<div class="tg-empty">沒有待命的冒險者。</div>';
    else {
      html += '<div class="tg-chips">';
      idle.forEach(function (a) {
        var on = this.msn.members.indexOf(a.id) !== -1;
        html += '<span class="tg-chip' + (on ? ' on' : '') + '" data-tgmember="' + a.id + '">' +
          a.name + '　Lv.' + a.lv + '　⚔️' + fmt(T2.guildPower(a)) + '</span>';
      }, this);
      html += '</div>';
    }
    html += '</div>';

    list.forEach(function (c) {
      var est = T2.guildEstimate(c.templateId, this.msn.members, c.need);
      var enough = this.msn.members.length >= c.n[0] && this.msn.members.length <= c.n[1];
      html += '<div class="tg-mission">';
      html += '<div class="tg-mhead"><span class="tg-mname">' + c.icon + ' ' + c.title + '</span>' +
        '<span class="muted">' + c.n[0] + '~' + c.n[1] + ' 人　' + c.ticks[0] + '~' + c.ticks[1] + ' 期</span></div>';
      html += '<div class="tg-mstats">' +
        '<span>💵 <b class="gold-color">' + fmt(c.reward.gold) + '</b> 兩／人</span>' +
        '<span>✨ <b>+' + fmt(c.reward.exp) + '</b> 經驗／人</span>' +
        (c.reward.sp ? '<span>📖 <b class="sci-color">+' + c.reward.sp + '</b> 武點</span>' : '') +
        '<span>⚔️ 建議 <b>' + fmt(c.need) + '</b>／人</span>' +
        '<span class="' + (est.rate >= 0.75 ? 'sci-color' : (est.rate >= 0.45 ? 'gold-color' : '')) + '">成功率 <b>' + pct(est.rate) + '</b></span>' +
        '</div>';
      html += '<div class="tg-mdesc">' + c.desc + '</div>';
      html += '<span><button class="mini-btn" data-tgacceptct="' + c.id + '" ' + (enough ? '' : 'disabled') + '>📜 接下委託</button> ';
      html += '<button class="mini-btn danger-mini" data-tgdeclinect="' + c.id + '">婉拒</button></span>';
      html += '</div>';
    }, this);

    return html;
  };

  /* ══════════ ⑤ 公會經營 ══════════ */
  proto.tgManageHtml = function (st) {
    var T2 = this.town;
    var html = '';

    html += '<div class="tg-cols">';

    // 左：招募
    html += '<div>';
    var rec = T2.guildRecruitable();
    html += '<div class="tg-mhead"><span class="tg-mname">📜 招募鎮民入會（可招 ' + rec.length + ' 人）</span>';
    html += '<span><button class="mini-btn" data-tgrecruitall="1">👥 一鍵招募</button></span></div>';
    html += '<div class="tg-mdesc">公會成員 <b>' + st.adventurers + '/' + st.maxAdventurers + '</b>。' +
      '成員等級沿用鎮民等級，入會時依等級自動配點、有機會拜入門派。</div>';
    if (!rec.length) {
      html += '<div class="tg-empty">沒有可招募的鎮民。多蓋【民宅】並提升魅力讓居民遷入。</div>';
    } else {
      rec.forEach(function (p) {
        html += '<div class="tg-row"><span>🧍 <b>' + p.name + '</b> <span class="muted">Lv.' + p.lv + '</span></span>' +
          '<button class="mini-btn" data-tgrecruit="' + p.id + '">招募</button></div>';
      });
    }

    html += '<div class="tg-mhead" style="margin-top:12px"><span class="tg-mname">💊 全體療養</span></div>';
    html += '<div class="tg-mdesc">為所有受傷或氣血不足的成員療養，需花費銀兩。</div>';
    html += '<button class="mini-btn" data-tghealall="1">💊 全部療養</button>';
    html += '</div>';

    // 右：排行 + 統計
    html += '<div>';
    html += '<div class="tg-mhead"><span class="tg-mname">🏅 戰力排行</span></div>';
    var rank = T2.guildRanking();
    if (!rank.length) html += '<div class="tg-empty">尚無成員。</div>';
    else {
      rank.forEach(function (r, i) {
        var role = (window.HY.Data.TOWN.GUILD.ROLES[r.adv.role] || {});
        html += '<div class="tg-rank"><span class="no">' + (i + 1) + '</span>' +
          '<span>' + role.icon + ' <b>' + r.adv.name + '</b> <span class="muted">Lv.' + r.adv.lv + '　' + T2.guildSectName(r.adv.sect) + '</span></span>' +
          '<span class="sci-color"><b>' + fmt(r.power) + '</b></span></div>';
      });
    }

    html += '<div class="tg-mhead" style="margin-top:12px"><span class="tg-mname">📊 公會統計</span></div>';
    var s2 = st.stats;
    html += '<div class="tg-mdesc">' +
      '任務 <b>' + s2.missions + '</b>（成功 ' + s2.succeeded + '／失敗 ' + s2.failed + '）　' +
      '角色升級 <b>' + s2.levelUps + '</b>　換裝 <b>' + s2.equipped + '</b> 件<br>' +
      '取得戰利品 <b>' + s2.loot + '</b>　強化 <b>' + s2.forged + '</b>　訓練 <b>' + s2.trained + '</b>　受傷 <b>' + s2.injured + '</b>　委託 <b>' + s2.contracts + '</b><br>' +
      '平均等級 <b>' + st.avgLv + '</b>　平均戰力 <b>' + fmt(st.avgPower) + '</b>' +
      '</div>';

    if (st.canForge) {
      html += '<div class="tg-mdesc">🔨 公會鍛造坊已啟用：於【冒險者名冊】點選成員後，再點其裝備格即可強化。</div>';
    }
    html += '</div>';

    html += '</div>';
    return html;
  };

  /* ══════════ ⑥ 公會日誌 ══════════ */
  proto.tgLogHtml = function (st) {
    var T2 = this.town;
    var g = T2.guildState();
    var logs = g.log || [];
    if (!logs.length) return '<div class="tg-empty">公會尚無紀錄。招募成員、派遣任務後就會出現在此。</div>';
    var html = '<div class="tg-logbox">';
    logs.forEach(function (l) {
      var cls = l.type === 'wealth' ? ' w' : (l.type === 'loot' ? ' l' : (l.type === 'system' ? ' s' : ''));
      var d = new Date(l.t);
      var ts = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
      html += '<div class="tg-logline' + cls + '"><span class="tg-logtime">' + ts + '</span>' + l.msg + '</div>';
    });
    html += '</div>';
    return html;
  };

  /* ══════════ 事件綁定 ══════════ */
  proto.tgBind = function (panel) {
    var self = this;
    var T2 = this.town;

    function one(sel, fn) {
      panel.querySelectorAll(sel).forEach(function (el) { el.addEventListener('click', function (e) { e.preventDefault(); fn(el, e); }); });
    }

    // 子分頁
    one('[data-tgsub]', function (el) { self.tgSetTab(el.getAttribute('data-tgsub')); });
    // 前往建造
    one('[data-tggoto]', function (el) { self.switchTab('build'); });

    /* ── 名冊 ── */
    one('[data-tgsel]', function (el) { self.tgSelect(el.getAttribute('data-tgsel')); });
    one('[data-tgtrain]', function (el) { if (T2.guildTrain(el.getAttribute('data-tgtrain'))) self.renderGuildPanel(); });
    one('[data-tgheal]', function (el) { if (T2.guildHeal(el.getAttribute('data-tgheal'))) self.renderGuildPanel(); });
    one('[data-tgauto1]', function (el) {
      var n = T2.guildAutoEquip(el.getAttribute('data-tgauto1'));
      self.renderGuildPanel();
    });
    one('[data-tgdismiss]', function (el) {
      var id = el.getAttribute('data-tgdismiss');
      var a = T2.guildAdventurer(id);
      if (a && confirm('確定讓【' + a.name + '】退出公會？身上的裝備會退回公會倉庫。')) {
        if (T2.guildDismiss(id)) { self.guildSel = null; self.renderGuildPanel(); }
      }
    });
    // 裝備格：若有鍛造坊 → 強化；否則 → 卸下 / 自動換裝
    one('[data-tgslot]', function (el) {
      var parts = el.getAttribute('data-tgslot').split('|');
      var advId = parts[0], slot = parts[1];
      var adv = T2.guildAdventurer(advId);
      if (!adv) return;
      var it = adv.equipment[slot];
      if (it && T2.guildCanForge()) {
        var flv = it._forgeLv || 0;
        if (flv >= TG.config.FORGE_MAX_LV) { alert('已達強化上限 +' + TG.config.FORGE_MAX_LV); return; }
        var cost = T2.guildForgeCost(it);
        if (confirm('強化【' + T2.guildItemLabel(it) + '】至 +' + (flv + 1) + '？\n費用 ' + cost + ' 兩')) {
          if (T2.guildForge(advId, slot)) self.renderGuildPanel();
        }
        return;
      }
      if (it) {
        if (confirm('卸下【' + T2.guildItemLabel(it) + '】放回公會倉庫？')) {
          if (T2.guildUnequip(advId, slot)) self.renderGuildPanel();
        }
        return;
      }
      // 空格 → 從倉庫挑最強
      if (!T2.guildEquipBest(advId, slot)) alert('公會倉庫中沒有適合此部位的裝備。');
      self.renderGuildPanel();
    });

    /* ── 倉庫 ── */
    one('[data-tgdep]', function (el) {
      var p = el.getAttribute('data-tgdep').split('|');
      var kind = p[0], key = p[1];
      var numKey = /^\d+$/.test(key) ? parseInt(key, 10) : key;
      if (T2.guildDeposit(kind, numKey)) self.renderGuildPanel();
    });
    one('[data-tgdepall]', function () {
      var n = T2.guildDepositAllBag();
      if (n === 0) alert('沒有可存入的裝備，或倉庫已滿。');
      self.renderGuildPanel();
    });
    one('[data-tgwd]', function (el) { if (T2.guildWithdraw(parseInt(el.getAttribute('data-tgwd'), 10))) self.renderGuildPanel(); });
    one('[data-tgsell]', function (el) { if (T2.guildSellStorage(parseInt(el.getAttribute('data-tgsell'), 10))) self.renderGuildPanel(); });
    one('[data-tgselljunk]', function () {
      var n = T2.guildSellJunk();
      if (n === 0) alert('沒有可直接變賣的無用裝備。');
      self.renderGuildPanel();
    });
    one('[data-tgautoeq]', function () {
      var n = T2.guildAutoEquip();
      alert(n > 0 ? '自動配裝完成，共換上 ' + n + ' 件裝備。' : '所有成員都已穿上倉庫中最好的裝備。');
      self.renderGuildPanel();
    });
    one('[data-tgtoggleauto]', function () { T2.guildToggleAutoEquip(); self.renderGuildPanel(); });

    /* ── 任務 ── */
    one('[data-tgmission]', function (el) { self.tgSelectMission(el.getAttribute('data-tgmission')); });
    one('[data-tgmember]', function (el) { self.tgToggleMember(el.getAttribute('data-tgmember')); });
    one('[data-tgautopick]', function () { self.tgAutoPick(); });
    one('[data-tgclearpick]', function () { self.tgClearMembers(); });
    one('[data-tgdispatch]', function (el) {
      var mid = el.getAttribute('data-tgdispatch');
      var m = T2.guildMissionById(mid);
      if (!m) return;
      if (T2.guildDispatch(mid, self.msn.members)) { self.msn = { id: null, members: [] }; self.renderGuildPanel(); }
    });
    one('[data-tgrecall]', function (el) {
      var id = el.getAttribute('data-tgrecall');
      if (confirm('確定召回？本次任務將中止，不獲得獎勵。')) {
        if (T2.guildRecall(id)) self.renderGuildPanel();
      }
    });

    /* ── 委託 ── */
    one('[data-tgrefreshct]', function () {
      if (!T2.guildRefreshContracts(true)) alert('請先建造【委託榜】。');
      self.renderGuildPanel();
    });
    one('[data-tgacceptct]', function (el) {
      var res = T2.guildAcceptContract(el.getAttribute('data-tgacceptct'), self.msn.members);
      if (!res.ok) alert('無法接取：' + res.msg);
      else self.msn = { id: null, members: [] };
      self.renderGuildPanel();
    });
    one('[data-tgdeclinect]', function (el) { T2.guildDeclineContract(el.getAttribute('data-tgdeclinect')); self.renderGuildPanel(); });

    /* ── 經營 ── */
    one('[data-tgrecruit]', function (el) {
      if (T2.guildRecruit(el.getAttribute('data-tgrecruit'))) self.renderGuildPanel();
    });
    one('[data-tgrecruitall]', function () {
      var n = T2.guildRecruitAll();
      alert(n > 0 ? '成功招募 ' + n + ' 位鎮民入會。' : '沒有可招募的鎮民，或公會名額已滿。');
      self.renderGuildPanel();
    });
    one('[data-tghealall]', function () {
      var n = T2.guildHealAll();
      alert(n > 0 ? '為 ' + n + ' 位成員完成療養。' : '沒有需要療養的成員（或銀兩不足）。');
      self.renderGuildPanel();
    });
  };

  window.HY.UITownGuild = { version: '1.0', submounts: ['roster', 'storage', 'missions', 'contracts', 'manage', 'log'] };
})();