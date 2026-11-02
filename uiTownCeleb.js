// js/uiTownCeleb.js (v1)
// ⭐ 名人遊歷 UI —— 擴充「我的小鎮」分頁，新增「🌟 名人」分頁
//
// 4 個子分頁：
//   ① 🎪 來訪中　② 🏛️ 名人堂　③ 📖 名人圖鑑　④ 📊 統計
//
// ⚠️ 載入順序：uiTownGuildAdvance.js 之後、main.js 之前。
//    樣式由本檔自行注入（#town-celeb-style），style.css 無須修改。
window.HY = window.HY || {};

(function () {
  var proto = window.HY.UITown && window.HY.UITown.prototype;
  if (!proto) { console.error('[uiTownCeleb] 找不到 HY.UITown，請確認 uiTown.js 已載入。'); return; }
  var TC = window.HY.TownCeleb;
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!TC || !T) { console.error('[uiTownCeleb] 找不到 HY.TownCeleb / HY.Data.TOWN，請確認 townCelebSystem.js 已載入。'); return; }

  var ADV = T.CELEB || {};
  var SUBS = [
    { id: 'visit',   label: '🎪 來訪中' },
    { id: 'hall',    label: '🏛️ 名人堂' },
    { id: 'codex',   label: '📖 名人圖鑑' },
    { id: 'stat',    label: '📊 統計' }
  ];

  /* ══════════ 樣式注入 ══════════ */
  function injectStyles() {
    if (document.getElementById('town-celeb-style')) return;
    var css = `
/* ══════════ 🌟 名人遊歷 ══════════ */
.tc-subs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; padding-bottom:8px; border-bottom:1px dashed #2e3b4e; }
.tc-sub {
  background:#0f1720; color:#94a3b8; border:1px solid #2e3b4e;
  padding:5px 13px; border-radius:14px; cursor:pointer; font-size:0.79rem;
}
.tc-sub:hover { border-color:#c89d54; color:#e2e8f0; }
.tc-sub.on { color:#fbbf24; border-color:#fbbf24; background:rgba(251,191,36,.12); font-weight:bold; }

.tc-hero { background:linear-gradient(90deg,#1b2432,#2a2136); border:1px solid #c89d54; border-radius:6px; padding:9px 12px; margin-bottom:10px; }
.tc-hero h3 { color:#c89d54; font-size:0.95rem; margin:0 0 6px; }
.tc-rows { display:flex; gap:13px; flex-wrap:wrap; font-size:0.79rem; margin-bottom:3px; }
.tc-rows b { color:#e2e8f0; }
.tc-bar { height:6px; background:#0d1219; border:1px solid #334155; border-radius:3px; overflow:hidden; margin:4px 0; }
.tc-bar > div { height:100%; background:linear-gradient(90deg,#b78a3f,#fbbf24); }
.tc-bar.soc > div { background:linear-gradient(90deg,#00e5ff,#7dd3fc); }

.tc-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(258px,1fr)); gap:9px; }
.tc-card {
  background:#131b26; border:1px solid #2e3b4e; border-radius:6px;
  padding:9px 10px; display:flex; flex-direction:column; gap:6px;
}
.tc-card:hover { border-color:#c89d54; }
.tc-card.settled { border-color:#10b981; background:#131f1a; }
.tc-chead { display:flex; justify-content:space-between; align-items:baseline; gap:6px; }
.tc-cname { font-size:0.86rem; font-weight:bold; }
.tc-cmeta { font-size:0.72rem; color:#94a3b8; white-space:nowrap; }
.tc-tags { display:flex; gap:5px; flex-wrap:wrap; }
.tc-tag { font-size:0.67rem; padding:1px 7px; border-radius:9px; border:1px solid #2e3b4e; color:#94a3b8; background:#0f1720; }
.tc-tag.tier { border-color:#fbbf24; color:#fbbf24; }
.tc-tag.soc { border-color:#a78bfa; color:#c4b5fd; }
.tc-tag.ok { border-color:#10b981; color:#6ee7b7; }
.tc-tag.warn { border-color:#f59e0b; color:#fcd34d; }
.tc-tag.dim { opacity:.5; }
.tc-cbtn { display:flex; gap:5px; flex-wrap:wrap; }
.tc-note { font-size:0.71rem; color:#7dd3fc; line-height:1.4; }
.tc-dimtext { font-size:0.71rem; color:#94a3b8; line-height:1.5; }

/* 圖鑑小格 */
.tc-codex { display:grid; grid-template-columns:repeat(auto-fill, minmax(96px,1fr)); gap:5px; max-height:340px; overflow-y:auto; }
.tc-cx {
  background:#0d1219; border:1px solid #2e3b4e; border-top:3px solid #334155;
  border-radius:5px; padding:5px 3px; text-align:center; cursor:pointer;
  display:flex; flex-direction:column; align-items:center; gap:1px; min-height:74px; justify-content:center;
  overflow:hidden;
}
.tc-cx:hover { border-color:#c89d54; }
.tc-cx.seen { border-top-color:#38bdf8; background:#101a24; }
.tc-cx.settled { border-color:#10b981; border-top-color:#10b981; background:#131f1a; }
.tc-cx.visitor { border-top-color:#fbbf24; background:#1a1d17; }
.tc-cx .ci { font-size:1.1rem; line-height:1.1; }
.tc-cx .cn { font-size:0.66rem; color:#e2e8f0; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tc-cx .ct { font-size:0.6rem; color:#64748b; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tc-cx .cl { font-size:0.58rem; color:#fbbf24; }
.tc-cx.locked .ci { opacity:.3; }
.tc-cx.locked .cn { color:#475569; }

.tc-filters { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; }
.tc-chip { background:#0f1720; border:1px solid #2e3b4e; border-radius:12px; padding:3px 10px; font-size:0.72rem; cursor:pointer; color:#94a3b8; }
.tc-chip:hover { border-color:#c89d54; }
.tc-chip.on { background:rgba(251,191,36,.16); border-color:#fbbf24; color:#fbbf24; font-weight:bold; }

.tc-empty { font-size:0.79rem; color:#94a3b8; line-height:1.6; padding:8px 0; }
.tc-block { background:#131b26; border:1px solid #2e3b4e; border-radius:6px; padding:9px 11px; margin-bottom:8px; }
.tc-btitle { font-size:0.85rem; font-weight:bold; color:#c89d54; margin-bottom:6px; }
.tc-cols { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
@media (max-width:940px) { .tc-cols { grid-template-columns:1fr; } }
`;
    var st = document.createElement('style');
    st.id = 'town-celeb-style';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* ══════════ 工具 ══════════ */
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }

  /* ══════════ 掛載：DOM + UI 狀態 ══════════ */
  var _buildDom = proto._buildDom;
  proto._buildDom = function () {
    _buildDom.call(this);
    injectStyles();
    this.celebSub = this.celebSub || 'visit';
    this.celebFilter = this.celebFilter || 'all';
    this.celebSoc = this.celebSoc || 'all';

    var root = this.el.root;
    if (!root) return;
    var self = this;

    // ① 分頁按鈕（插在「⚔️ 冒險者公會」之前，若找不到就 append）
    var tabs = root.querySelector('.town-tabs');
    if (tabs && !tabs.querySelector('[data-ttab="celeb"]')) {
      var btn = document.createElement('button');
      btn.className = 'town-tab-btn';
      btn.setAttribute('data-ttab', 'celeb');
      btn.textContent = '🌟 名人';
      btn.addEventListener('click', function () { self.switchTab('celeb'); });
      var guildBtn = tabs.querySelector('[data-ttab="guild"]');
      if (guildBtn) tabs.insertBefore(btn, guildBtn);
      else tabs.appendChild(btn);
    }

    // ② 面板
    var bottom = root.querySelector('.town-bottom');
    if (bottom && !root.querySelector('#town-panel-celeb')) {
      var panel = document.createElement('div');
      panel.id = 'town-panel-celeb';
      panel.className = 'town-tabpanel hidden';
      bottom.appendChild(panel);
      this.el.panels.celeb = panel;
    }
  };

  /* ══════════ 掛載：renderBottom 分派 ══════════ */
  var _renderBottom = proto.renderBottom;
  proto.renderBottom = function () {
    if (this.tab === 'celeb') { this.renderCelebPanel(); return; }
    _renderBottom.call(this);
  };

  /* ══════════ UI 狀態操作 ══════════ */
  proto.tcSetSub = function (id) { this.celebSub = id; this.renderCelebPanel(); };
  proto.tcSetFilter = function (f) { this.celebFilter = f; this.renderCelebPanel(); };
  proto.tcSetSoc = function (s) { this.celebSoc = s; this.renderCelebPanel(); };

  /* ══════════ 主面板 ══════════ */
  proto.renderCelebPanel = function () {
    var panel = this.el.panels && this.el.panels.celeb;
    if (!panel) return;
    var TS = this.town;
    if (!TS || !TS.celebReport) { panel.innerHTML = '<div class="tc-empty">名人系統未載入。</div>'; return; }

    var rep;
    try { rep = TS.celebReport(); }
    catch (e) { panel.innerHTML = '<div class="tc-empty">讀取失敗：' + e.message + '</div>'; return; }

    var html = this.tcHeaderHtml(rep);
    html += '<div class="tc-subs">';
    SUBS.forEach(function (s) {
      html += '<span class="tc-sub' + (this.celebSub === s.id ? ' on' : '') + '" data-tc-sub="' + s.id + '">' + s.label +
        (s.id === 'visit' && rep.visitors.length ? '（' + rep.visitors.length + '）' : '') +
        (s.id === 'hall' && rep.settled.length ? '（' + rep.settled.length + '）' : '') +
        '</span>';
    }, this);
    html += '</div>';

    var sub = this.celebSub || 'visit';
    if (sub === 'visit') html += this.tcVisitHtml(rep);
    else if (sub === 'hall') html += this.tcHallHtml(rep);
    else if (sub === 'codex') html += this.tcCodexHtml(rep);
    else html += this.tcStatHtml(rep);

    panel.innerHTML = html;
    this.tcBind(panel);
  };

  /* ══════════ 頂部資訊 ══════════ */
  proto.tcHeaderHtml = function (rep) {
    var s = rep.stats, b = rep.bonus;
    var codexPct = s.total > 0 ? Math.floor(s.discovered / s.total * 100) : 0;
    var html = '<div class="tc-hero">';
    html += '<h3>🌟 名人遊歷　<span class="muted">世界名人造訪小鎮，消費、結交、定居</span></h3>';
    html += '<div class="tc-rows">' +
      '<span>📖 圖鑑 <b class="gold-color">' + s.discovered + '</b>/<b>' + s.total + '</b></span>' +
      '<span>🎪 來訪中 <b class="sci-color">' + s.visitors + '</b>/<b>' + s.maxVisitors + '</b></span>' +
      '<span>🏛️ 已定居 <b class="gold-color">' + s.settled + '</b></span>' +
      '<span>🎟️ 樂透已購 <b>' + s.lottery.bought + '</b>/<b>' + s.lottery.total + '</b></span>' +
      '<span>💰 累計消費 <b class="gold-color">' + fmt(s.stats.totalSpend) + '</b> 兩</span>' +
      '</div>';
    html += '<div class="tc-bar"><div style="width:' + codexPct + '%"></div></div>';
    html += '<div class="tc-rows"><span class="muted">圖鑑完成度 ' + codexPct + '%' +
      (s.settled > 0 ? '　｜　定居加成：收入 +' + pct(b.incomeMul) + '　武點 +' + pct(b.spMul) +
        '　繁榮 +' + pct(b.prosperityMul) + '　治安 +' + Math.floor(b.order) + '　魅力 +' + Math.round(b.appeal) : '') +
      '</span></div>';
    html += '</div>';
    return html;
  };

  /* ══════════ ① 來訪中 ══════════ */
  proto.tcVisitHtml = function (rep) {
    var TS = this.town;
    var list = rep.visitors;
    var html = '';

    if (!list.length) {
      html += '<div class="tc-empty">目前沒有名人來訪。<br>' +
        '名人會隨機造訪（每期 ' + pct(rep.config.VISIT_CHANCE) + ' 機率），也可以到 <b>📖 名人圖鑑</b> 主動邀請。<br>' +
        '<span class="muted">💡 在樂透買過票的名人，來訪機率更高（他們「聽過這座小鎮」）。</span></div>';
    } else {
      html += '<div class="tc-grid">';
      list.forEach(function (v) {
        var stayPct = v.stayTotal > 0 ? Math.floor((1 - v.stayLeft / v.stayTotal) * 100) : 0;
        var favPct = Math.floor(v.favor / v.favorMax * 100);
        html += '<div class="tc-card">';
        html += '<div class="tc-chead"><span class="tc-cname">' + v.icon + ' ' + v.name + '</span>' +
          '<span class="tc-cmeta">' + v.title + '</span></div>';
        html += '<div class="tc-tags">' +
          '<span class="tc-tag tier">' + v.tier.icon + ' ' + v.tier.name + '</span>' +
          '<span class="tc-tag soc">' + v.socIcon + ' ' + v.socName + '</span>' +
          '<span class="tc-tag">停留 ' + v.stayLeft + ' 期</span>' +
          '</div>';
        html += '<div class="tc-dimtext">停留進度</div><div class="tc-bar"><div style="width:' + stayPct + '%"></div></div>';
        html += '<div class="tc-dimtext">好感 <b class="gold-color">' + v.favor + '</b> / ' + v.favorMax +
          '（送禮 ' + v.gifts + '/' + v.giftLimit + '）</div>';
        html += '<div class="tc-bar soc"><div style="width:' + favPct + '%"></div></div>';
        html += '<div class="tc-note">💵 每期消費 <b>' + fmt(v.spendPerTick) + '</b> 兩　｜　已消費 <b>' + fmt(v.spent) + '</b> 兩</div>';
        html += '<div class="tc-cbtn">';
        html += '<button class="mini-btn" data-tc-gift="' + v.id + '" ' + (v.canGift.ok ? '' : 'disabled') + '>' +
          (v.canGift.ok ? '🎁 送禮（' + fmt(v.giftCost) + ' 兩，好感 +' + (10 + (v.tier.lv - 1)) + '）' : '無法送禮：' + v.canGift.msg) + '</button>';
        html += '<button class="mini-btn" data-tc-settle="' + v.id + '" ' + (v.canSettle.ok ? '' : 'disabled') + '>' +
          (v.canSettle.ok ? '🏡 定居（' + fmt(v.settleCost) + ' 兩）' : '無法定居：' + v.canSettle.msg) + '</button>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    return html;
  };

  /* ══════════ ② 名人堂（已定居） ══════════ */
  proto.tcHallHtml = function (rep) {
    var list = rep.settled;
    var b = rep.bonus;
    var html = '';

    if (!list.length) {
      html += '<div class="tc-empty">尚無名人定居。<br>' +
        '把來訪名人的<b>好感度</b>提升到 100（送禮結交），即可邀他<b>定居</b>成為榮譽鎮民，提供永久加成。</div>';
      return html;
    }

    // 社群彙總
    html += '<div class="tc-block"><div class="tc-btitle">🏛️ 社群彙總</div>';
    html += '<div class="tc-rows">';
    rep.societies.forEach(function (s) {
      var n = b.bySoc[s.id] ? b.bySoc[s.id].count : 0;
      if (n <= 0) return;
      var desc = [];
      var bn = s.bonus || {};
      if (bn.order) desc.push('治安 +' + bn.order);
      if (bn.spMul) desc.push('武點 +' + pct(bn.spMul));
      if (bn.incomeMul) desc.push('收入 +' + pct(bn.incomeMul));
      if (bn.prosperityMul) desc.push('繁榮 +' + pct(bn.prosperityMul));
      if (bn.landMul) desc.push('地價 +' + pct(bn.landMul));
      if (bn.appeal) desc.push('魅力 +' + bn.appeal);
      if (bn.learnDiscount) desc.push('學費 -' + pct(bn.learnDiscount));
      html += '<span>' + s.icon + ' ' + s.name + ' <b class="gold-color">' + n + '</b> 位' +
        (desc.length ? ' <span class="muted">（每位 ' + desc.join('、') + '）</span>' : '') + '</span>';
    });
    html += '</div></div>';

    html += '<div class="tc-grid">';
    list.forEach(function (s) {
      html += '<div class="tc-card settled">';
      html += '<div class="tc-chead"><span class="tc-cname">' + s.icon + ' ' + s.name + '</span>' +
        '<span class="tc-cmeta">' + s.title + '</span></div>';
      html += '<div class="tc-tags">' +
        '<span class="tc-tag tier">' + s.tier.icon + ' ' + s.tier.name + '</span>' +
        '<span class="tc-tag soc">' + s.socIcon + ' ' + s.socName + '</span>' +
        '<span class="tc-tag ok">已定居</span></div>';
      if (s.socDesc) html += '<div class="tc-dimtext">' + s.socDesc + '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  };

  /* ══════════ ③ 名人圖鑑 ══════════ */
  proto.tcCodexHtml = function (rep) {
    var self = this;
    var all = rep.codex;
    var f = this.celebFilter || 'all';
    var soc = this.celebSoc || 'all';

    // 篩選
    var list = all.filter(function (c) {
      if (f === 'seen' && !c.seen) return false;
      if (f === 'unseen' && c.seen) return false;
      if (f === 'settled' && !c.isSettled) return false;
      if (f === 'visitor' && !c.isVisitor) return false;
      if (soc !== 'all') {
        if (soc === 'none') { if (c.society) return false; }
        else if (c.society !== soc) return false;
      }
      return true;
    });

    var html = '';

    // 篩選列
    html += '<div class="tc-filters">';
    [['all', '全部 ' + all.length], ['unseen', '未見過 ' + all.filter(function (c) { return !c.seen; }).length],
     ['seen', '已解鎖 ' + all.filter(function (c) { return c.seen; }).length],
     ['visitor', '來訪中'], ['settled', '已定居']].forEach(function (p) {
      html += '<span class="tc-chip' + (f === p[0] ? ' on' : '') + '" data-tc-filter="' + p[0] + '">' + p[1] + '</span>';
    });
    html += '</div>';

    // 社群篩選
    html += '<div class="tc-filters">';
    html += '<span class="tc-chip' + (soc === 'all' ? ' on' : '') + '" data-tc-soc="all">🌐 全部社群</span>';
    rep.societies.forEach(function (s) {
      var n = all.filter(function (c) { return c.society === s.id; }).length;
      html += '<span class="tc-chip' + (soc === s.id ? ' on' : '') + '" data-tc-soc="' + s.id + '">' + s.icon + ' ' + s.name + ' ' + n + '</span>';
    });
    var noneN = all.filter(function (c) { return !c.society; }).length;
    if (noneN) html += '<span class="tc-chip' + (soc === 'none' ? ' on' : '') + '" data-tc-soc="none">👤 其他 ' + noneN + '</span>';
    html += '</div>';

    html += '<div class="tc-dimtext" style="margin-bottom:6px">共 <b>' + list.length + '</b> 位　' +
      '<span class="muted">（點擊方格可看詳情 / 主動邀請）</span></div>';

    if (!list.length) {
      html += '<div class="tc-empty">沒有符合條件的人物。</div>';
      return html;
    }

    html += '<div class="tc-codex">';
    list.forEach(function (c) {
      var cls = 'tc-cx';
      if (c.isSettled) cls += ' settled';
      else if (c.isVisitor) cls += ' visitor';
      else if (c.seen) cls += ' seen';
      else cls += ' locked';
      var tip = c.seen
        ? (c.icon + ' ' + c.name + '（' + c.title + '）｜' + c.tier.icon + c.tier.name + '｜' + c.socName + '｜身價 ' + c.spend[0] + '~' + c.maxSpend)
        : '？？？（尚未見過）';
      html += '<div class="' + cls + '" data-tc-info="' + c.id + '" title="' + tip + '">' +
        '<span class="ci">' + (c.seen ? c.icon : '❔') + '</span>' +
        '<span class="cn">' + (c.seen ? c.name : '？？？') + '</span>' +
        '<span class="ct">' + (c.seen ? c.title : '未解鎖') + '</span>' +
        '<span class="cl">' + (c.isSettled ? '🏡' : (c.isVisitor ? '🎪' : (c.seen ? c.tier.icon : ''))) + '</span>' +
        '</div>';
    });
    html += '</div>';

    // 選中人物詳情
    if (this.celebSel) {
      var c = null;
      all.forEach(function (x) { if (x.id === self.celebSel) c = x; });
      if (c) {
        html += '<div class="tc-block" style="margin-top:8px">';
        html += '<div class="tc-btitle">' + (c.seen ? c.icon + ' ' + c.name : '❔ 未解鎖') +
          (c.seen ? '　<span class="muted">' + c.title + '</span>' : '') + '</div>';
        if (!c.seen) {
          html += '<div class="tc-dimtext">你還沒有見過這位名人。名人來訪、或你在樂透看過他買票，就會解鎖圖鑑。</div>';
        } else {
          html += '<div class="tc-tags">' +
            '<span class="tc-tag tier">' + c.tier.icon + ' ' + c.tier.name + '</span>' +
            '<span class="tc-tag soc">' + c.socIcon + ' ' + c.socName + '</span>' +
            '<span class="tc-tag">身價 ' + fmt(c.spend[0]) + '~' + fmt(c.maxSpend) + ' 兩</span>' +
            (c.isSettled ? '<span class="tc-tag ok">🏡 已定居</span>' : '') +
            (c.isVisitor ? '<span class="tc-tag warn">🎪 正在小鎮</span>' : '') +
            '</div>';
          html += '<div class="tc-cbtn" style="margin-top:7px">';
          if (c.canInvite.ok) {
            html += '<button class="mini-btn" data-tc-invite="' + c.id + '">📨 邀請來訪（' + fmt(c.inviteCost) + ' 兩）</button>';
          } else {
            html += '<span class="tc-dimtext">' + c.canInvite.msg + '</span>';
          }
          html += '</div>';
        }
        html += '</div>';
      }
    }

    return html;
  };

  /* ══════════ ④ 統計 ══════════ */
  proto.tcStatHtml = function (rep) {
    var b = rep.bonus, s = rep.stats, cfg = rep.config;
    var html = '';

    html += '<div class="tc-cols">';

    // 左：收集 + 消費
    html += '<div class="tc-block"><div class="tc-btitle">📖 收集進度</div>';
    html += '<div class="tc-rows">' +
      '<span>圖鑑 <b class="gold-color">' + s.discovered + '</b> / <b>' + s.total + '</b></span>' +
      '<span>定居 <b class="gold-color">' + s.settled + '</b> 位</span>' +
      '<span>來訪 <b>' + s.visitors + '</b> / ' + s.maxVisitors + '</span></div>';
    html += '<div class="tc-bar"><div style="width:' + (s.total ? Math.floor(s.discovered / s.total * 100) : 0) + '%"></div></div>';
    html += '<div class="tc-rows" style="margin-top:6px">' +
      '<span>🎟️ 樂透已購名人 <b>' + s.lottery.bought + '</b> / ' + s.lottery.total + '</span></div>';
    html += '<div class="tc-dimtext">在樂透買過票的名人 → 來訪機率 ×' + (1 + cfg.LOTTERY_BONUS).toFixed(2) + '（他們聽說過小鎮）</div>';
    html += '</div>';

    // 右：經濟
    html += '<div class="tc-block"><div class="tc-btitle">💰 經濟貢獻</div>';
    html += '<div class="tc-rows">' +
      '<span>累計消費 <b class="gold-color">' + fmt(s.stats.totalSpend) + '</b> 兩</span>' +
      '<span>帶動繁榮 <b class="sci-color">' + fmt(s.stats.totalProsper) + '</b></span></div>';
    html += '<div class="tc-rows">' +
      '<span>來訪次數 <b>' + s.stats.visits + '</b></span>' +
      '<span>主動邀請 <b>' + s.stats.invited + '</b></span>' +
      '<span>送禮 <b>' + s.stats.gifts + '</b></span>' +
      '<span>定居 <b>' + s.stats.settled + '</b></span></div>';
    html += '<div class="tc-dimtext">每位來訪名人每期消費 = 身價上限 × ' + pct(cfg.SPEND_RATE) + '，全額轉為小鎮銀兩。</div>';
    html += '</div>';

    html += '</div>';

    // 加成總表
    html += '<div class="tc-block"><div class="tc-btitle">✨ 定居加成總表（' + s.settled + ' 位）</div>';
    var rows = [
      ['💵 全鎮收入', '+' + pct(b.incomeMul)],
      ['📖 武點產出', '+' + pct(b.spMul)],
      ['✨ 繁榮成長', '+' + pct(b.prosperityMul)],
      ['🏞️ 地價', '+' + pct(b.landMul)],
      ['🛡️ 治安', '+' + Math.floor(b.order)],
      ['🧲 魅力', '+' + Math.round(b.appeal)]
    ];
    html += '<div class="tc-rows">';
    rows.forEach(function (r) {
      html += '<span>' + r[0] + ' <b class="gold-color">' + r[1] + '</b></span>';
    });
    html += '</div>';
    if (s.settled === 0) html += '<div class="tc-dimtext">尚無名人定居，因此沒有加成。先到「🎪 來訪中」送禮結交吧。</div>';
    html += '</div>';

    // 玩法說明
    html += '<div class="tc-block"><div class="tc-btitle">📘 玩法說明</div>';
    html += '<div class="tc-dimtext">' +
      '① 名人會隨機造訪小鎮（每期 ' + pct(cfg.VISIT_CHANCE) + ' 機率），停留 ' + cfg.STAY_TICKS[0] + '~' + cfg.STAY_TICKS[1] + ' 期。<br>' +
      '② 停留期間每期消費，全額轉為小鎮<b>銀兩</b>與<b>繁榮度</b>。<br>' +
      '③ 花銀兩<b>送禮</b>可提升好感（每次 +' + cfg.GIFT_FAVOR + '，上限 ' + cfg.FAVOR_MAX + '）。<br>' +
      '④ 好感滿 <b>' + cfg.SETTLE_FAVOR + '</b> 後可花銀兩請他<b>定居</b>，提供永久加成。<br>' +
      '⑤ 加成依<b>社群身分</b>給不同效果：⚔️武林→治安、🔬科學→武點、👑帝王→繁榮、📚文人→武點、🎬現代→收入。<br>' +
      '⑥ 名人<b>星級</b>越高（身價越高），加成倍率越大（×1.0 ~ ×' + rep.tiers[rep.tiers.length - 1].mul.toFixed(1) + '）。<br>' +
      '⑦ 到 <b>📖 名人圖鑑</b> 可主動花銀兩<b>邀請</b>特定名人來訪。' +
      '</div></div>';

    return html;
  };

  /* ══════════ 事件綁定 ══════════ */
  proto.tcBind = function (panel) {
    var self = this;
    var TS = this.town;

    function one(sel, fn) {
      panel.querySelectorAll(sel).forEach(function (el) {
        el.addEventListener('click', function (e) { e.preventDefault(); fn(el, e); });
      });
    }
    function refresh() { self.renderCelebPanel(); }

    /* 子分頁 / 篩選 */
    one('[data-tc-sub]', function (el) { self.tcSetSub(el.getAttribute('data-tc-sub')); });
    one('[data-tc-filter]', function (el) { self.tcSetFilter(el.getAttribute('data-tc-filter')); });
    one('[data-tc-soc]', function (el) { self.tcSetSoc(el.getAttribute('data-tc-soc')); });

    /* 圖鑑：點方格看詳情 */
    one('[data-tc-info]', function (el) {
      var id = el.getAttribute('data-tc-info');
      self.celebSel = (self.celebSel === id) ? null : id;
      refresh();
    });

    /* 送禮 */
    one('[data-tc-gift]', function (el) {
      var id = el.getAttribute('data-tc-gift');
      if (TS.celebGift(id)) refresh();
    });

    /* 定居 */
    one('[data-tc-settle]', function (el) {
      var id = el.getAttribute('data-tc-settle');
      var c = TS.celebById(id);
      var cost = TS.celebSettleCost(id);
      if (!confirm('確定邀請【' + (c ? c.name : id) + '】定居小鎮？\n費用 ' + cost + ' 兩，定居後提供永久加成。')) return;
      if (TS.celebSettle(id)) { self.celebSub = 'hall'; refresh(); }
    });

    /* 邀請 */
    one('[data-tc-invite]', function (el) {
      var id = el.getAttribute('data-tc-invite');
      var c = TS.celebById(id);
      var cost = TS.celebInviteCost(id);
      if (!confirm('確定以 ' + cost + ' 兩邀請【' + (c ? c.name : id) + '】造訪小鎮？')) return;
      if (TS.celebInvite(id)) { self.celebSub = 'visit'; refresh(); }
    });
  };

  window.HY.UITownCeleb = {
    version: '1.0',
    subs: SUBS.length
  };
})();