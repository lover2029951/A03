// js/uiTownCelebAdvance.js (v1)
// ⭐ 名人深造 UI —— 擴充「🌟 名人」視窗，新增 3 個子分頁
//
//   ① 📊 名人檔案    等級／經驗／四維／戰力／門派（比照玩家角色面板）
//   ② 🤝 互動        切磋／指點／論道（與玩家角色來往）
//   ③ 🌍 世界動態    公告板 + 動態流 + 日常圖鑑 + 統計
//
// ⚠️ 載入順序：uiTownCeleb.js 之後、uiTownOverlays.js 之後、main.js 之前。
//    樣式由本檔自行注入（#town-celebadv-style），style.css 無須修改。
window.HY = window.HY || {};

(function () {
  var proto = window.HY.UITown && window.HY.UITown.prototype;
  if (!proto) { console.error('[uiTownCelebAdv] 找不到 HY.UITown'); return; }
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[uiTownCelebAdv] 找不到 HY.Data.TOWN'); return; }
  if (!T.CELEBADV) { console.error('[uiTownCelebAdv] 請先載入 townCelebAdvance.js'); return; }
  if (!proto.renderCelebPanel) { console.error('[uiTownCelebAdv] 請先載入 uiTownCeleb.js'); return; }

  var ADV = T.CELEBADV;
  var MY_SUBS = [
    { id: 'profile',  label: '📊 名人檔案' },
    { id: 'interact', label: '🤝 互動' },
    { id: 'world',    label: '🌍 世界動態' }
  ];
  var MY_MAP = {};
  MY_SUBS.forEach(function (s) { MY_MAP[s.id] = s; });

  /* ══════════ 樣式注入 ══════════ */
  function injectStyles() {
    if (document.getElementById('town-celebadv-style')) return;
    var css = `
/* ══════════ 🌟 名人深造 / 社交 ══════════ */
.ca-picks { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; }
.ca-pick {
  background:#0f1720; color:#94a3b8; border:1px solid #2e3b4e;
  padding:3px 10px; border-radius:12px; cursor:pointer; font-size:0.74rem;
}
.ca-pick:hover { border-color:#c89d54; color:#e2e8f0; }
.ca-pick.on { background:rgba(251,191,36,.16); border-color:#fbbf24; color:#fbbf24; font-weight:bold; }
.ca-pick .pw { color:#00e5ff; font-size:0.7rem; }

.ca-hero { background:linear-gradient(90deg,#1b2432,#2a2136); border:1px solid #c89d54; border-radius:6px; padding:9px 12px; margin-bottom:9px; }
.ca-hero h3 { color:#c89d54; font-size:0.95rem; margin:0 0 6px; }
.ca-rows { display:flex; gap:13px; flex-wrap:wrap; font-size:0.79rem; margin-bottom:3px; }
.ca-rows b { color:#e2e8f0; }
.ca-bar { height:6px; background:#0d1219; border:1px solid #334155; border-radius:3px; overflow:hidden; margin:4px 0; }
.ca-bar > div { height:100%; background:linear-gradient(90deg,#b78a3f,#fbbf24); }
.ca-bar.g > div { background:linear-gradient(90deg,#10b981,#6ee7b7); }

.ca-block { background:#131b26; border:1px solid #2e3b4e; border-radius:6px; padding:9px 11px; margin-bottom:8px; }
.ca-btitle { font-size:0.85rem; font-weight:bold; color:#c89d54; margin-bottom:6px; }
.ca-cols { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
@media (max-width:940px){ .ca-cols { grid-template-columns:1fr; } }
.ca-hint { font-size:0.74rem; color:#94a3b8; line-height:1.55; }
.ca-note { font-size:0.73rem; color:#6ee7b7; line-height:1.5; }
.ca-warn { font-size:0.74rem; color:#fca5a5; line-height:1.5; }

.ca-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:6px; }
.ca-stat { background:#121822; border:1px solid #2e3b4e; border-radius:5px; padding:6px 8px; }
.ca-slabel { font-size:0.7rem; color:#94a3b8; }
.ca-sval { font-size:0.9rem; font-weight:bold; color:#e2e8f0; }

.ca-tags { display:flex; gap:5px; flex-wrap:wrap; }
.ca-tag { font-size:0.67rem; padding:1px 7px; border-radius:9px; border:1px solid #2e3b4e; color:#94a3b8; background:#0f1720; }
.ca-tag.gold { border-color:#fbbf24; color:#fbbf24; }
.ca-tag.cyan { border-color:#00e5ff; color:#7dd3fc; }
.ca-tag.violet { border-color:#a78bfa; color:#c4b5fd; }
.ca-tag.green { border-color:#10b981; color:#6ee7b7; }
.ca-tag.red { border-color:#ef4444; color:#fca5a5; }

.ca-act { display:flex; gap:7px; flex-wrap:wrap; align-items:center; }
.ca-actbox { background:#121822; border:1px solid #2e3b4e; border-radius:6px; padding:9px 11px; margin-bottom:7px; }
.ca-acthead { display:flex; justify-content:space-between; align-items:baseline; gap:8px; margin-bottom:4px; }
.ca-actname { font-size:0.85rem; font-weight:bold; }

.ca-feed { display:flex; flex-direction:column; gap:4px; max-height:250px; overflow-y:auto; }
.ca-feedline { font-size:0.75rem; line-height:1.5; border-left:2px solid #2e3b4e; padding-left:7px; color:#cbd5e1; }
.ca-feedline.grow { border-color:#fbbf24; }
.ca-feedline.spar { border-color:#ef4444; }
.ca-feedline.guide { border-color:#38bdf8; }
.ca-feedline.discourse { border-color:#a78bfa; }
.ca-feedline.circle { border-color:#34d399; }
.ca-feedline.guild { border-color:#fbbf24; }
.ca-feedt { color:#64748b; font-size:0.68rem; margin-right:5px; }
.ca-empty { font-size:0.79rem; color:#94a3b8; line-height:1.6; padding:8px 0; }
`;
    var st = document.createElement('style');
    st.id = 'town-celebadv-style';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* ══════════ 工具 ══════════ */
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function esc(s) { return String(s === undefined || s === null ? '' : s); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

  /* ══════════ 掛載：注入樣式 + UI 狀態 ══════════ */
  var _buildDom = proto._buildDom;
  proto._buildDom = function () {
    _buildDom.call(this);
    injectStyles();
    this.capSel = this.capSel || null;
    this.capChar = this.capChar || null;
    this.capShowAll = this.capShowAll || false;
  };

  /* ══════════ 捕捉 uiTownCeleb 原有的子分頁（避免硬編碼）══════════ */
  proto.capCaptureSubs = function (panel) {
    if (!panel || !panel.querySelectorAll) return;
    var list = panel.querySelectorAll('.tc-sub');
    if (!list.length) return;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var id = list[i].getAttribute ? list[i].getAttribute('data-tc-sub') : null;
      if (!id || MY_MAP[id]) continue;
      out.push({ id: id, label: (list[i].textContent || '').replace(/（\d+）$/, '') });
    }
    if (out.length) this._capOrigSubs = out;
  };

  /** 在既有子分頁列後面，追加本檔的 3 個分頁 */
  proto.capAppendTabs = function (panel) {
    if (!panel || !panel.querySelector) return;
    var subs = panel.querySelector('.tc-subs');
    if (!subs || !subs.appendChild) return;
    var self = this;
    MY_SUBS.forEach(function (s) {
      var b = document.createElement('span');
      b.className = 'tc-sub' + (self.celebSub === s.id ? ' on' : '');
      b.setAttribute('data-cap-sub', s.id);
      b.textContent = s.label;
      b.addEventListener('click', function (e) {
        e.preventDefault();
        self.capSetSub(s.id);
      });
      subs.appendChild(b);
    });
  };

  proto.capSetSub = function (id) {
    this.celebSub = id;
    this.renderCelebPanel();
  };

  /* ══════════ 掛載 renderCelebPanel ══════════ */
  var _rcp = proto.renderCelebPanel;
  proto.renderCelebPanel = function () {
    var panel = this.el && this.el.panels ? this.el.panels.celeb : null;

    // 不是我的分頁 → 走原流程，再追加我的分頁按鈕
    if (!MY_MAP[this.celebSub]) {
      _rcp.call(this);
      this.capCaptureSubs(panel);
      this.capAppendTabs(panel);
      return;
    }

    // 我的分頁 → 自行渲染（沿用原有的 header + 子分頁列）
    if (!panel) return;
    var TS = this.town;
    if (!TS || !TS.celebReport) { panel.innerHTML = '<div class="ca-empty">名人系統未載入。</div>'; return; }

    var rep;
    try { rep = TS.celebReport(); }
    catch (e) { panel.innerHTML = '<div class="ca-empty">讀取失敗：' + esc(e.message) + '</div>'; return; }

    var self = this;
    var html = this.tcHeaderHtml(rep);
    html += '<div class="tc-subs">';
    (this._capOrigSubs || []).forEach(function (s) {
      html += '<span class="tc-sub" data-tc-sub="' + s.id + '">' + esc(s.label) + '</span>';
    });
    MY_SUBS.forEach(function (s) {
      html += '<span class="tc-sub' + (self.celebSub === s.id ? ' on' : '') + '" data-cap-sub="' + s.id + '">' + s.label + '</span>';
    });
    html += '</div>';

    var sub = this.celebSub;
    if (sub === 'profile') html += this.capProfileHtml(rep);
    else if (sub === 'interact') html += this.capInteractHtml(rep);
    else html += this.capWorldHtml(rep);

    panel.innerHTML = html;
    this.tcBind(panel);
    this.capBind(panel);
  };

  /* ══════════ 事件綁定（我的分頁）══════════ */
  proto.capBind = function (panel) {
    var self = this;
    var TS = this.town;

    function one(sel, fn) {
      panel.querySelectorAll(sel).forEach(function (el) {
        el.addEventListener('click', function (e) { e.preventDefault(); fn(el, e); });
      });
    }
    function refresh() { self.renderCelebPanel(); }

    one('[data-cap-sub]', function (el) { self.capSetSub(el.getAttribute('data-cap-sub')); });

    one('[data-cap-celeb]', function (el) {
      var id = el.getAttribute('data-cap-celeb');
      self.capSel = (self.capSel === id) ? null : id;
      refresh();
    });
    one('[data-cap-char]', function (el) {
      var id = el.getAttribute('data-cap-char');
      self.capChar = (self.capChar === id) ? null : id;
      refresh();
    });
    one('[data-cap-all]', function () { self.capShowAll = !self.capShowAll; refresh(); });

    one('[data-cap-spar]', function (el) {
      var p = el.getAttribute('data-cap-spar').split('|');
      var r = TS.celebSpar(p[0], p[1]);
      if (r) window.alert(r.win ? '切磋勝利！經驗 +' + r.exp : '惜敗，但經驗 +' + r.exp);
      refresh();
    });
    one('[data-cap-guide]', function (el) {
      var p = el.getAttribute('data-cap-guide').split('|');
      var r = TS.celebGuide(p[0], p[1]);
      if (r) window.alert('指點完成！經驗 +' + r.exp + (r.ups > 0 ? '，突破 ' + r.ups + ' 級！' : ''));
      refresh();
    });
    one('[data-cap-discourse]', function (el) {
      var id = el.getAttribute('data-cap-discourse');
      var sp = TS.celebDiscourse(id);
      if (sp) window.alert('論道完成！武點 +' + sp);
      refresh();
    });
    one('[data-cap-join]', function (el) {
      var id = el.getAttribute('data-cap-join');
      var c = TS.celebById(id);
      if (!window.confirm('確定讓【' + (c ? c.name : id) + '】加入冒險者公會？\n\n' +
        '加入後他可被派遣任務、穿十部位裝備、習武學／心法／輕功、覺醒靈根、參悟天命 —— ' +
        '與你的角色完全相同。\n費用 ' + ADV.CONFIG.GUILD_COST + ' 兩。')) return;
      if (TS.celebJoinGuild(id)) { self.celebSub = 'profile'; refresh(); }
    });
    one('[data-cap-boardclear]', function () {
      if (window.confirm('確定清空公告板？')) { TS.celebBoardClear(); refresh(); }
    });
    one('[data-cap-feedclear]', function () {
      if (window.confirm('確定清空動態流？')) { TS.celebFeedClear(); refresh(); }
    });
  };

  /* ══════════ 名人選人列 ══════════ */
  proto.capPickHtml = function (rep) {
    var self = this;
    var pool = [];
    rep.visitors.forEach(function (v) { pool.push({ id: v.id, name: v.name, icon: v.icon, lv: v.lv, tag: '🎪' }); });
    var seen = {};
    pool.forEach(function (p) { seen[p.id] = 1; });
    rep.settled.forEach(function (s) {
      if (seen[s.id]) return;
      pool.push({ id: s.id, name: s.name, icon: s.icon, lv: self.capLevelOf(s.id), tag: '🏡' });
    });
    if (this.capShowAll) {
      rep.codex.forEach(function (c) {
        if (seen[c.id] || !c.seen) return;
        pool.push({ id: c.id, name: c.name, icon: c.icon, lv: self.capLevelOf(c.id), tag: '📖' });
      });
    }
    if (!pool.length) return '<div class="ca-empty">目前沒有名人在小鎮。<br>請先到「🎪 來訪中」等名人造訪，或到「📖 名人圖鑑」主動邀請。</div>';

    var html = '<div class="ca-picks">';
    pool.forEach(function (p) {
      html += '<span class="ca-pick' + (self.capSel === p.id ? ' on' : '') + '" data-cap-celeb="' + p.id + '">' +
        p.tag + ' ' + esc(p.name) + ' <span class="pw">Lv.' + p.lv + '</span></span>';
    });
    html += '<span class="ca-pick" data-cap-all="1">' + (this.capShowAll ? '🔽 只看在鎮上' : '🔼 顯示圖鑑名人') + '</span>';
    html += '</div>';
    return html;
  };

  proto.capLevelOf = function (id) {
    var TS = this.town;
    try { var c = TS.celebById(id); return c ? TS.celebLevel(c) : 1; } catch (e) { return 1; }
  };

  proto.capPickCharHtml = function () {
    var self = this;
    var list = this.town.celebRoleList ? this.town.celebRoleList() : [];
    if (!list.length) return '<div class="ca-empty">沒有可互動的角色。</div>';
    var html = '<div class="ca-picks">';
    list.forEach(function (c) {
      var d = null;
      try { d = self.town.charSys.getDerivedStatsForChar(c); } catch (e) { d = null; }
      html += '<span class="ca-pick' + (self.capChar === c.id ? ' on' : '') + '" data-cap-char="' + c.id + '">' +
        '👤 ' + esc(c.name) + ' <span class="pw">Lv.' + c.lv + '　⚔️' + (d ? fmt(d.powerScore) : '?') + '</span></span>';
    });
    html += '</div>';
    return html;
  };

  /* ══════════ 📊 名人檔案 ══════════ */
  proto.capProfileHtml = function (rep) {
    var TS = this.town;
    var html = '';
    html += '<div class="ca-block"><div class="ca-btitle">📊 名人檔案　<span class="muted">與你的角色使用同一套公式</span></div>';
    html += '<div class="ca-hint">名人的<b>等級</b>由身價推導，並隨<b>修行</b>逐步提升；' +
      '<b>四維</b>依社群配點、<b>戰力</b>走 <code>charSys.getDerivedStatsForChar()</code>（與玩家完全相同）。</div></div>';
    html += this.capPickHtml(rep);

    var id = this.capSel;
    if (!id) {
      html += '<div class="ca-empty">👆 請先點選上方一位名人。</div>';
      return html;
    }
    var rp = null;
    try { rp = TS.celebAdvReport(id); } catch (e) { rp = null; }
    if (!rp) { html += '<div class="ca-empty">讀取失敗。</div>'; return html; }

    var d = rp.derived, st = rp.stats;
    html += '<div class="ca-hero">';
    html += '<div class="ca-rows"><span class="ca-actname">' + rp.icon + ' ' + esc(rp.name) +
      '</span><span class="muted">' + esc(rp.title) + '</span></div>';
    html += '<div class="ca-tags">' +
      '<span class="ca-tag gold">' + (rp.tier ? rp.tier.icon + ' ' + rp.tier.name : '') + '</span>' +
      '<span class="ca-tag violet">' + esc(rp.socIcon) + ' ' + esc(rp.socName) + '</span>' +
      '<span class="ca-tag cyan">' + esc(rp.sectName) + '</span>' +
      (rp.isVisitor ? '<span class="ca-tag green">🎪 來訪中</span>' : '') +
      (rp.isSettled ? '<span class="ca-tag green">🏡 已定居</span>' : '') +
      (rp.guild.joined ? '<span class="ca-tag gold">🏛️ 公會成員</span>' : '') +
      '</div>';
    html += '<div class="ca-rows" style="margin-top:6px">' +
      '<span>Lv.<b class="gold-color">' + rp.lv + '</b></span>' +
      '<span>⚔️ 戰力 <b class="sci-color">' + fmt(rp.power) + '</b></span>' +
      '<span>❤️ ' + fmt(d.maxHp) + '</span>' +
      '<span>💧 ' + fmt(d.maxMp) + '</span>' +
      '<span>修行 <b class="sci-color">+' + fmt(rp.cultivate) + '</b>/期</span></div>';
    html += '<div class="ca-hint">經驗 ' + fmt(rp.exp) + ' / ' + fmt(rp.maxExp) + '</div>';
    html += '<div class="ca-bar"><div style="width:' + rp.expPct + '%"></div></div>';
    html += '</div>';

    html += '<div class="ca-cols">';
    html += '<div class="ca-block"><div class="ca-btitle">🎯 四維（依社群配點）</div><div class="ca-grid">';
    [['con', '體魄'], ['str', '力道'], ['agi', '身法'], ['int', '內息']].forEach(function (p) {
      html += '<div class="ca-stat"><div class="ca-slabel">' + p[1] + '</div><div class="ca-sval">' + st[p[0]] + '</div></div>';
    });
    html += '</div>';
    var sum = st.con + st.str + st.agi + st.int;
    var bb = ADV.SOC_BASE[rp.society || 'none'] || ADV.SOC_BASE.none;
    html += '<div class="ca-hint" style="margin-top:5px">四維總和 <b>' + sum + '</b>（基礎 ' +
      (bb.con + bb.str + bb.agi + bb.int) + ' ＋ 每級 5 點 × ' + (rp.lv - 1) + ' 級）</div>';
    html += '</div>';

    html += '<div class="ca-block"><div class="ca-btitle">⚔️ 衍生屬性（玩家同一套公式）</div><div class="ca-grid">';
    [['atk', '攻擊'], ['def', '防禦'], ['hit', '命中'], ['eva', '閃避'], ['crit', '爆擊'], ['critRes', '暴抗']].forEach(function (p) {
      html += '<div class="ca-stat"><div class="ca-slabel">' + p[1] + '</div><div class="ca-sval">' + fmt(d[p[0]]) + '</div></div>';
    });
    html += '</div>';
    html += '<div class="ca-hint" style="margin-top:5px">減傷 ' + ((d.dmgReduce || 0) * 100).toFixed(1) +
      '%　爆傷 ' + (d.critDmg || 150) + '%　攻速 ' + (d.atkSpd || 100) + '%</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="ca-cols">';
    html += '<div class="ca-block"><div class="ca-btitle">🏛️ 冒險者公會</div>';
    if (rp.guild.joined) {
      var gm = rp.guild.member;
      html += '<div class="ca-note">✅ 已加入公會' + (gm ? '（Lv.' + gm.lv + '，' + (gm.status || 'idle') + '）' : '') + '</div>';
      html += '<div class="ca-hint">他可被派遣任務、穿十部位裝備、習武學／心法／輕功、覺醒靈根、參悟天命、洗點與接受傳功 —— 與你的角色完全相同。<br>' +
        '到【⚔️ 冒險者公會】視窗的「🎓 深造」分頁即可操作。</div>';
    } else {
      var ck = rp.guild.can;
      html += '<div class="ca-hint">' + (ck.ok ? '可邀請他加入公會，之後即擁有與玩家角色完全相同的功能。' : esc(ck.msg)) + '</div>';
      html += '<div class="ca-act" style="margin-top:6px"><button class="mini-btn" data-cap-join="' + rp.id + '" ' +
        (ck.ok ? '' : 'disabled') + '>' + (ck.ok ? '🏛️ 加入公會（' + fmt(rp.guild.cost) + ' 兩）' : '無法加入') + '</button></div>';
    }
    html += '</div>';

    html += '<div class="ca-block"><div class="ca-btitle">🧘 修行與往來</div>';
    html += '<div class="ca-rows"><span>修行速率 <b>' + (rp.cultivateRate * 100).toFixed(2) + '%</b>/期</span>' +
      '<span>精進 <b class="gold-color">' + num(rp.stat.levelUps, 0) + '</b> 次</span></div>';
    html += '<div class="ca-rows">' +
      '<span>切磋 <b>' + num(rp.stat.spar, 0) + '</b>（勝 ' + num(rp.stat.win, 0) + '）</span>' +
      '<span>指點 <b>' + num(rp.stat.guide, 0) + '</b></span>' +
      '<span>論道 <b>' + num(rp.stat.discourse, 0) + '</b></span>' +
      '<span>日常 <b>' + num(rp.stat.dailies, 0) + '</b></span></div>';
    html += '<div class="ca-hint">定居後修行加快 ×' + ADV.CONFIG.SETTLED_MUL + '，加入公會再 ×' + ADV.CONFIG.GUILD_MUL + '。</div>';
    html += '</div>';
    html += '</div>';

    return html;
  };

  /* ══════════ 🤝 互動 ══════════ */
  proto.capInteractHtml = function (rep) {
    var TS = this.town;
    var html = '';

    html += '<div class="ca-block"><div class="ca-btitle">🤝 與名人來往</div>';
    html += '<div class="ca-hint">選一位 <b>名人</b> 與一位 <b>你的角色</b>，即可：<br>' +
      '⚔️ <b>切磋</b> — 依雙方戰力判定勝負，角色獲得經驗（冷卻 ' + ADV.CONFIG.SPAR_CD + ' 期）<br>' +
      '📖 <b>指點</b> — 名人傳功給你的角色（好感 ≥ ' + ADV.CONFIG.GUIDE_FAVOR_MIN + '，消耗 ' + ADV.CONFIG.GUIDE_COST_FAVOR + ' 好感）<br>' +
      '🗣️ <b>論道</b> — 只有文人／科學家可論道，換取武點（好感 ≥ ' + ADV.CONFIG.DISCOURSE_FAVOR_MIN + '，消耗 ' + ADV.CONFIG.DISCOURSE_COST_FAVOR + ' 好感）</div></div>';

    html += this.capPickHtml(rep);
    var cid = this.capSel;
    if (!cid) { html += '<div class="ca-empty">👆 請先點選一位名人。</div>'; return html; }

    var c = null;
    try { c = TS.celebById(cid); } catch (e) { c = null; }
    if (!c) { html += '<div class="ca-empty">找不到該名人。</div>'; return html; }

    var isPresent = TS.celebPresent(cid);
    html += '<div class="ca-hero"><div class="ca-rows"><span class="ca-actname">' + c.icon + ' ' + esc(c.name) + '</span>' +
      '<span class="muted">' + esc(c.title) + '</span></div>';
    html += '<div class="ca-tags"><span class="ca-tag gold">Lv.' + TS.celebLevel(c) + '</span>' +
      '<span class="ca-tag cyan">⚔️ 戰力 ' + fmt(TS.celebPower(c)) + '</span>' +
      (isPresent ? '<span class="ca-tag green">在鎮上</span>' : '<span class="ca-tag red">不在鎮上</span>') +
      '</div></div>';

    if (!isPresent) {
      html += '<div class="ca-warn">⚠️ 該名人不在小鎮，無法互動。請等他造訪，或到「📖 名人圖鑑」主動邀請。</div>';
      return html;
    }

    html += '<div class="ca-block"><div class="ca-btitle">👤 選擇你的角色</div>';
    html += this.capPickCharHtml();
    html += '</div>';

    var chid = this.capChar;
    if (!chid) { html += '<div class="ca-empty">👆 請再點選一位你的角色。</div>'; return html; }

    html += '<div class="ca-actbox"><div class="ca-acthead"><span class="ca-actname">⚔️ 切磋</span></div>';
    var ck1 = null;
    try { ck1 = TS.celebCanSpar(cid, chid); } catch (e) { ck1 = { ok: false, msg: '讀取失敗' }; }
    if (ck1.ok) {
      var pd = TS.charSys.getDerivedStatsForChar(ck1.char);
      var pP = num(pd.powerScore, 1), cP = TS.celebPower(c);
      var chance = pP / (pP + cP);
      html += '<div class="ca-rows"><span>你的角色 <b>' + esc(ck1.char.name) + ' Lv.' + ck1.char.lv + '</b>　⚔️ ' + fmt(pP) + '</span>' +
        '<span>勝率約 <b class="' + (chance >= 0.5 ? 'sci-color' : 'gold-color') + '">' + pct(chance) + '</b></span></div>';
      html += '<div class="ca-bar g"><div style="width:' + Math.round(chance * 100) + '%"></div></div>';
      html += '<div class="ca-act" style="margin-top:6px"><button class="mini-btn" data-cap-spar="' + cid + '|' + chid + '">' +
        '⚔️ 開始切磋</button><span class="muted">勝方得經驗 ' + pct(ADV.CONFIG.SPAR_CHAR_EXP) + '／敗方 ' + pct(ADV.CONFIG.SPAR_CHAR_EXP_LOSE) + '</span></div>';
    } else {
      html += '<div class="ca-warn">' + esc(ck1.msg) + '</div>';
    }
    html += '</div>';

    html += '<div class="ca-actbox"><div class="ca-acthead"><span class="ca-actname">📖 指點</span></div>';
    var ck2 = null;
    try { ck2 = TS.celebCanGuide(cid, chid); } catch (e) { ck2 = { ok: false, msg: '讀取失敗' }; }
    if (ck2.ok) {
      var tier = c.tier ? c.tier.lv : 1;
      html += '<div class="ca-hint">名人的等級與星級越高，指點效果越好（此位 ★' + tier + ' Lv.' + TS.celebLevel(c) + '）。</div>';
      html += '<div class="ca-act" style="margin-top:6px"><button class="mini-btn" data-cap-guide="' + cid + '|' + chid + '">' +
        '📖 請他指點（好感 -' + ADV.CONFIG.GUIDE_COST_FAVOR + '）</button></div>';
    } else {
      html += '<div class="ca-warn">' + esc(ck2.msg) + '</div>';
    }
    html += '</div>';

    html += '<div class="ca-actbox"><div class="ca-acthead"><span class="ca-actname">🗣️ 論道</span></div>';
    var ck3 = null;
    try { ck3 = TS.celebCanDiscourse(cid); } catch (e) { ck3 = { ok: false, msg: '讀取失敗' }; }
    if (ck3.ok) {
      html += '<div class="ca-hint">與他論道兼答，可獲得武學點數（依星級，科學家再 ×1.2）。</div>';
      html += '<div class="ca-act" style="margin-top:6px"><button class="mini-btn" data-cap-discourse="' + cid + '">' +
        '🗣️ 開始論道（好感 -' + ADV.CONFIG.DISCOURSE_COST_FAVOR + '）</button></div>';
    } else {
      html += '<div class="ca-warn">' + esc(ck3.msg) + '</div>';
    }
    html += '</div>';

    return html;
  };

  /* ══════════ 🌍 世界動態 ══════════ */
  proto.capWorldHtml = function (rep) {
    var TS = this.town;
    var st = null;
    try { st = TS.celebAdvStats(); } catch (e) { st = null; }
    var html = '';

    html += '<div class="ca-hero"><h3>🌍 小鎮世界動態</h3>';
    if (st) {
      html += '<div class="ca-rows">' +
        '<span>⚔️ 切磋 <b>' + st.spar + '</b>（勝 <b>' + st.win + '</b> / 敗 <b>' + st.lose + '</b>）</span>' +
        '<span>📖 指點 <b>' + st.guide + '</b></span>' +
        '<span>🗣️ 論道 <b>' + st.discourse + '</b></span>' +
        '<span>🧘 修行升級 <b class="gold-color">' + st.levelUps + '</b></span></div>';
      html += '<div class="ca-rows">' +
        '<span>🌏 日常活動 <b>' + st.dailies + '</b></span>' +
        '<span>🤝 同門相聚 <b>' + st.circle + '</b></span>' +
        '<span>🏛️ 名人入會 <b>' + st.guildJoined + '</b></span>' +
        '<span>📢 公告 <b>' + st.board + '</b> / 🌏 動態 <b>' + st.feed + '</b></span></div>';
    }
    html += '</div>';

    html += '<div class="ca-cols">';

    html += '<div class="ca-block"><div class="ca-btitle">📢 公告板　<span class="muted">重要事件</span>' +
      '<button class="mini-btn" style="float:right" data-cap-boardclear="1">清空</button></div>';
    var board = [];
    try { board = TS.celebBoardList(40); } catch (e) { board = []; }
    if (!board.length) html += '<div class="ca-empty">尚無公告。名人互動、修行升級、加入公會時會出現在此。</div>';
    else {
      html += '<div class="ca-feed">';
      board.forEach(function (l) {
        var d = new Date(l.t);
        var ts = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        html += '<div class="ca-feedline ' + esc(l.type) + '"><span class="ca-feedt">' + ts + '</span>' + esc(l.msg) + '</div>';
      });
      html += '</div>';
    }
    html += '</div>';

    html += '<div class="ca-block"><div class="ca-btitle">🌏 動態流　<span class="muted">日常瑣事</span>' +
      '<button class="mini-btn" style="float:right" data-cap-feedclear="1">清空</button></div>';
    var feed = [];
    try { feed = TS.celebFeedList(30); } catch (e) { feed = []; }
    if (!feed.length) html += '<div class="ca-empty">尚無動態。名人造訪小鎮後會開始出現日常活動。</div>';
    else {
      html += '<div class="ca-feed">';
      feed.forEach(function (l) {
        var d = new Date(l.t);
        var ts = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        html += '<div class="ca-feedline"><span class="ca-feedt">' + ts + '</span>' + esc(l.msg) + '</div>';
      });
      html += '</div>';
    }
    html += '</div>';

    html += '</div>';

    html += '<div class="ca-block"><div class="ca-btitle">📖 日常活動圖鑑（依小鎮建築解鎖）</div>';
    var avail = [];
    try { avail = TS.celebAvailableDailies(); } catch (e) { avail = []; }
    var availIds = {};
    avail.forEach(function (d) { availIds[d.id] = 1; });
    html += '<div class="ca-grid">';
    (ADV.DAILIES || []).forEach(function (d) {
      var on = !!availIds[d.id];
      var g = d.gain || {};
      var eff = [];
      if (g.prosperity) eff.push('繁榮 +' + g.prosperity);
      if (g.gold) eff.push('銀兩 +' + g.gold);
      if (g.sp) eff.push('武點 +' + g.sp);
      if (g.roleExp) eff.push('全體經驗 +' + (g.roleExp * 100).toFixed(1) + '%');
      if (g.item) eff.push('獲得丹藥');
      if (g.order) eff.push('治安 +' + g.order);
      html += '<div class="ca-stat" style="' + (on ? '' : 'opacity:.45') + '">' +
        '<div class="ca-slabel">' + d.icon + ' ' + esc(d.name) + (on ? '' : '（需建築）') + '</div>' +
        '<div class="ca-sval" style="font-size:0.76rem">' + esc(eff.join('　')) + '</div></div>';
    });
    html += '</div>';
    html += '<div class="ca-hint" style="margin-top:6px">名人每期有 ' + pct(ADV.CONFIG.DAILY_CHANCE) +
      ' 機率進行一項日常活動；需要對應建築才會解鎖（無建築限制者隨時可做）。</div>';
    html += '</div>';

    html += '<div class="ca-block"><div class="ca-btitle">👥 各社群在鎮名人</div>';
    var socList = [];
    try { socList = TS.celebReport().societies; } catch (e) { socList = []; }
    if (!socList.length) html += '<div class="ca-empty">無資料。</div>';
    else {
      var bySoc = {};
      rep.visitors.concat(rep.settled).forEach(function (x) {
        if (!x.society) return;
        if (!bySoc[x.society]) bySoc[x.society] = [];
        bySoc[x.society].push(x.icon + x.name);
      });
      socList.forEach(function (s) {
        var arr = bySoc[s.id] || [];
        html += '<div class="ca-rows"><span>' + s.icon + ' <b>' + s.name + '</b> <span class="muted">' +
          arr.length + ' 位</span></span><span class="muted">' + (arr.length ? esc(arr.join('、')) : '（無）') + '</span></div>';
      });
      html += '<div class="ca-hint" style="margin-top:5px">同社群 2 位以上同時在鎮上時，每期有 ' + pct(ADV.CONFIG.CIRCLE_CHANCE) +
        ' 機率觸發【同門相聚】（繁榮 +25～）。</div>';
    }
    html += '</div>';

    return html;
  };

  /* ══════════ 對外匯出 ══════════ */
  window.HY.UITownCelebAdv = {
    version: '1.0',
    subs: MY_SUBS.map(function (s) { return s.id; })
  };
})();