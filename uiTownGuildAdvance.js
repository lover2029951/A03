// js/uiTownGuildAdvance.js (v1)
// ⭐ 冒險者深造 UI —— 擴充「⚔️ 冒險者公會」分頁，新增「🎓 深造」子分頁
//
// 8 個區段：📊 總覽 / 🥋 武學 / 📜 心法輕功 / ✨ 靈根 /
//           🪦 精通天命 / 🙏 祝福 / ♻️ 洗點傳功 / ⚙️ 任務戰術
//
// ⚠️ 載入順序：uiTownGuild.js 之後、main.js 之前。
//    樣式由本檔自行注入（#town-guild-adv-style），style.css 無須修改。
//    任務戰術直接改寫 adv.adv.tactics（advEnsure 回傳的是活物件，不需額外 API）。
window.HY = window.HY || {};

(function () {
  var proto = window.HY.UITown && window.HY.UITown.prototype;
  if (!proto) { console.error('[uiTownGuildAdv] 找不到 HY.UITown，請確認 uiTown.js 已載入。'); return; }
  var GA = window.HY.TownGuildAdv;
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!GA || !T) { console.error('[uiTownGuildAdv] 找不到 HY.TownGuildAdv / HY.Data.TOWN，請確認 townGuildAdvance.js 已載入。'); return; }
  if (!proto.renderGuildPanel) { console.error('[uiTownGuildAdv] 請先載入 uiTownGuild.js'); return; }

  var ADV = T.GUILDADV || {};
  var SECTIONS = [
    { id: 'overview', label: '📊 總覽' },
    { id: 'arty',     label: '🥋 武學' },
    { id: 'xinfa',    label: '📜 心法輕功' },
    { id: 'root',     label: '✨ 靈根' },
    { id: 'mastery',  label: '🪦 精通天命' },
    { id: 'bless',    label: '🙏 祝福' },
    { id: 'respec',   label: '♻️ 洗點傳功' },
    { id: 'tactics',  label: '⚙️ 任務戰術' }
  ];
  var KINDS = { arty: '武學', xinfa: '心法', qinggong: '輕功' };
  var BUILD_HINT = '（請到【🏗️ 建造與營運】分頁的【⚔️ 公會】分類中建造）';

  /* ══════════ 樣式注入 ══════════ */
  function injectStyles() {
    if (document.getElementById('town-guild-adv-style')) return;
    var css = `
/* ══════════ 🎓 冒險者深造 ══════════ */
.ta-picker { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #2e3b4e; }
.ta-pick {
  background: #0f1720; color: #94a3b8; border: 1px solid #2e3b4e;
  padding: 4px 11px; border-radius: 13px; cursor: pointer; font-size: 0.76rem;
  display: inline-flex; align-items: center; gap: 5px;
}
.ta-pick:hover { border-color: #c89d54; color: #e2e8f0; }
.ta-pick.on { background: rgba(251,191,36,.16); border-color: #fbbf24; color: #fbbf24; font-weight: bold; }
.ta-pick .pow { color: #00e5ff; font-size: 0.72rem; }

.ta-secpills { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px; }
.ta-secpill {
  background: #121822; color: #94a3b8; border: 1px solid #2e3b4e;
  padding: 4px 11px; border-radius: 4px; cursor: pointer; font-size: 0.78rem;
}
.ta-secpill:hover { border-color: #c89d54; color: #e2e8f0; }
.ta-secpill.on { color: #00e5ff; border-color: #00e5ff; background: rgba(0,229,255,.10); font-weight: bold; }

.ta-hero { background: linear-gradient(90deg, #131b26, #1c2434); border: 1px solid #2e3b4e; border-radius: 6px; padding: 9px 11px; margin-bottom: 10px; }
.ta-hero.sel { border-color: #fbbf24; }
.ta-hrow { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 5px; }
.ta-hname { font-size: 0.95rem; font-weight: bold; }
.ta-hmeta { font-size: 0.74rem; color: #94a3b8; white-space: nowrap; }
.ta-rows { display: flex; gap: 13px; flex-wrap: wrap; font-size: 0.78rem; margin-bottom: 3px; }
.ta-rows b { color: #e2e8f0; }
.ta-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px; }
.ta-tag { font-size: 0.68rem; padding: 1px 7px; border-radius: 9px; border: 1px solid #2e3b4e; color: #94a3b8; background: #0f1720; }
.ta-tag.gold { border-color: #fbbf24; color: #fbbf24; }
.ta-tag.cyan { border-color: #00e5ff; color: #7dd3fc; }
.ta-tag.violet { border-color: #a78bfa; color: #c4b5fd; }
.ta-tag.green { border-color: #10b981; color: #6ee7b7; }
.ta-tag.red { border-color: #ef4444; color: #fca5a5; }

.ta-bar { height: 6px; background: #0d1219; border: 1px solid #334155; border-radius: 3px; overflow: hidden; margin: 4px 0; }
.ta-bar > div { height: 100%; background: linear-gradient(90deg, #b78a3f, #fbbf24); }

.ta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 8px; }
.ta-card {
  background: #121822; border: 1px solid #2e3b4e; border-radius: 6px;
  padding: 8px 10px; display: flex; flex-direction: column; gap: 5px;
}
.ta-card.on { border-color: #10b981; background: #131f1a; }
.ta-card.max { border-color: #fbbf24; }
.ta-chead { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.ta-cname { font-size: 0.83rem; font-weight: bold; }
.ta-clv { font-size: 0.72rem; color: #fbbf24; white-space: nowrap; }
.ta-cdesc { font-size: 0.72rem; color: #94a3b8; line-height: 1.4; }
.ta-cbonus { font-size: 0.71rem; color: #7dd3fc; line-height: 1.4; }
.ta-cbtn { display: flex; gap: 5px; flex-wrap: wrap; }

.ta-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 940px) { .ta-cols { grid-template-columns: 1fr; } }

.ta-block { background: #131b26; border: 1px solid #2e3b4e; border-radius: 6px; padding: 9px 11px; margin-bottom: 8px; }
.ta-btitle { font-size: 0.85rem; font-weight: bold; color: #c89d54; margin-bottom: 6px; }
.ta-hint { font-size: 0.74rem; color: #94a3b8; line-height: 1.55; }
.ta-warn { font-size: 0.74rem; color: #fca5a5; line-height: 1.5; }
.ta-note { font-size: 0.73rem; color: #6ee7b7; line-height: 1.5; }

.ta-field { display: flex; align-items: center; gap: 7px; margin: 5px 0; font-size: 0.77rem; }
.ta-field label { min-width: 96px; color: #94a3b8; }
.ta-field input[type=number] {
  width: 70px; background: #0f1720; border: 1px solid #2e3b4e; color: #e2e8f0;
  border-radius: 3px; padding: 3px 6px; font-size: 0.76rem;
}
.ta-field input[type=checkbox] { width: 15px; height: 15px; accent-color: #c89d54; }
.ta-field select {
  background: #0f1720; border: 1px solid #2e3b4e; color: #e2e8f0;
  border-radius: 3px; padding: 3px 6px; font-size: 0.76rem; max-width: 200px;
}

.ta-traits { display: flex; gap: 5px; flex-wrap: wrap; }
.ta-trait { background: #0f1720; border: 1px solid #a78bfa; color: #c4b5fd; border-radius: 10px; padding: 2px 9px; font-size: 0.72rem; }
.ta-trait b { color: #ddd6fe; }

.ta-empty { font-size: 0.79rem; color: #94a3b8; line-height: 1.6; padding: 8px 0; }
`;
    var st = document.createElement('style');
    st.id = 'town-guild-adv-style';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* ══════════ 工具 ══════════ */
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function bonusStr(b, keys) {
    var MAP = { atk: '攻擊', def: '防禦', maxHp: '氣血', maxMp: '內力', hit: '命中', eva: '閃避',
      crit: '爆擊', critRes: '暴抗', critDmg: '爆傷', dmgReduce: '減傷', atkSpd: '攻速',
      staminaMit: '體耗降', injury: '受傷', expMul: '經驗', repMul: '聲望', speedPct: '任務時間',
      learnCostMul: '學費', lootAll: '掉落', lootGather: '採集掉落', orderPlus: '治安',
      successGuard: '守護成功', successExplore: '探險成功', successGather: '採集成功' };
    var PCTK = { dmgReduce: 1, staminaMit: 1, injury: 1, expMul: 1, repMul: 1, speedPct: 1,
      learnCostMul: 1, lootAll: 1, lootGather: 1, successGuard: 1, successExplore: 1, successGather: 1 };
    var out = [];
    (keys || Object.keys(b || {})).forEach(function (k) {
      var v = (b || {})[k];
      if (typeof v !== 'number' || Math.abs(v) < 1e-9) return;
      var nm = MAP[k] || k;
      if (PCTK[k]) out.push(nm + ' ' + (v >= 0 ? '+' : '') + Math.round(v * 1000) / 10 + '%');
      else out.push(nm + ' ' + (v >= 0 ? '+' : '') + Math.round(v));
    });
    return out.join('　');
  }

  /* ══════════ 掛載 _buildDom：注入樣式 + UI 狀態 ══════════ */
  var _buildDom = proto._buildDom;
  proto._buildDom = function () {
    _buildDom.call(this);
    injectStyles();
    this.advSec = this.advSec || 'overview';
    this.advShowAll = this.advShowAll || {};
  };

  /* ══════════ 掛載 tgSubTabsHtml：加入「🎓 深造」按鈕 ══════════ */
  var _subs = proto.tgSubTabsHtml;
  proto.tgSubTabsHtml = function (st) {
    var html = _subs.call(this, st);
    var btn = '<button class="tg-subtab' + (this.guildTab === 'adv' ? ' active' : '') + '" data-tgsub="adv">🎓 深造</button>';
    var at = html.lastIndexOf('</div>');
    if (at === -1) return html + btn;
    return html.slice(0, at) + btn + html.slice(at);
  };

  /* ══════════ 掛載 renderGuildPanel：分派「深造」子分頁 ══════════ */
  var _renderGuildPanel = proto.renderGuildPanel;
  proto.renderGuildPanel = function () {
    var T2 = this.town;
    if (!T2 || !T2.isGuildFounded) { return _renderGuildPanel.call(this); }
    if (!T2.isGuildFounded()) { return _renderGuildPanel.call(this); }
    if (this.guildTab !== 'adv') { return _renderGuildPanel.call(this); }

    var panel = this.el.panels && this.el.panels.guild;
    if (!panel) return;
    var st = T2.guildStats();
    panel.innerHTML = this.tgHeaderHtml(st) + this.tgSubTabsHtml(st) + this.renderAdvBody(st);
    this.tgBind(panel);
    this.taBind(panel);
  };

  /* ══════════ UI 狀態 ══════════ */
  proto.taSetSec = function (id) { this.advSec = id; this.renderGuildPanel(); };
  proto.taPick = function (id) { this.guildSel = id; this.renderGuildPanel(); };
  proto.taToggleAll = function (kind) { this.advShowAll[kind] = !this.advShowAll[kind]; this.renderGuildPanel(); };

  /** 取得當前選中的冒險者（未選則回 null，由 UI 提示） */
  proto.taCurrent = function () {
    if (!this.guildSel) return null;
    return this.town.guildAdventurer(this.guildSel);
  };

  /* ══════════ 主體 ══════════ */
  proto.renderAdvBody = function (st) {
    var T2 = this.town;
    var list = T2.guildAdventurers();
    if (!list.length) {
      return '<div class="ta-empty">公會尚無成員。請先到【🏛️ 公會經營】分頁招募鎮民入會。</div>';
    }

    var self = this;
    var html = '';

    // ① 冒險者選擇列
    html += '<div class="ta-picker">';
    list.forEach(function (a) {
      var tier = T2.advTier(a);
      var on = (self.guildSel === a.id);
      html += '<span class="ta-pick' + (on ? ' on' : '') + '" data-ta-pick="' + a.id + '">' +
        tier.icon + ' ' + a.name + ' <span class="pow">Lv.' + a.lv + '　⚔️' + fmt(T2.guildPower(a)) + '</span></span>';
    });
    html += '</div>';

    var adv = this.taCurrent();
    if (!adv) {
      html += '<div class="ta-empty">👆 請先點選上方一位冒險者，即可為他安排深造。</div>';
      return html;
    }

    var rep = T2.advReport(adv.id);
    if (!rep) {
      html += '<div class="ta-empty">讀取資料失敗。</div>';
      return html;
    }

    // ② 區段切換
    html += '<div class="ta-secpills">';
    SECTIONS.forEach(function (s) {
      html += '<span class="ta-secpill' + (self.advSec === s.id ? ' on' : '') + '" data-ta-sec="' + s.id + '">' + s.label + '</span>';
    });
    html += '</div>';

    // ③ 各區段
    var sec = this.advSec || 'overview';
    if (sec === 'overview') html += this.taOverviewHtml(rep);
    else if (sec === 'arty') html += this.taArtyHtml(rep);
    else if (sec === 'xinfa') html += this.taXinfaHtml(rep);
    else if (sec === 'root') html += this.taRootHtml(rep);
    else if (sec === 'mastery') html += this.taMasteryHtml(rep);
    else if (sec === 'bless') html += this.taBlessHtml(rep);
    else if (sec === 'respec') html += this.taRespecHtml(rep);
    else html += this.taTacticsHtml(rep);

    return html;
  };

  /* ══════════ 📊 總覽 ══════════ */
  proto.taOverviewHtml = function (rep) {
    var T2 = this.town, adv = rep.adv, d = rep.derived, b = rep.bonus;
    var hpPct = d.maxHp > 0 ? Math.round(adv.currentHp / d.maxHp * 100) : 0;
    var mpPct = d.maxMp > 0 ? Math.round(adv.currentMp / d.maxMp * 100) : 0;
    var expPct = adv.maxExp > 0 ? Math.floor((adv.exp || 0) / adv.maxExp * 100) : 0;

    var html = '';
    html += '<div class="ta-hero sel">';
    html += '<div class="ta-hrow"><span class="ta-hname">' + rep.tier.icon + ' ' + adv.name +
      ' <span class="ta-tag gold">' + rep.tier.name + '</span></span>' +
      '<span class="ta-hmeta">Lv.<b class="gold-color">' + adv.lv + '</b>　⚔️<b class="sci-color">' + fmt(d.powerScore) + '</b></span></div>';

    html += '<div class="ta-rows">' +
      '<span>❤️ <b>' + fmt(adv.currentHp) + '</b>/' + fmt(d.maxHp) + '</span>' +
      '<span>💧 <b>' + fmt(adv.currentMp) + '</b>/' + fmt(d.maxMp) + '</span>' +
      '<span>經驗 <b>' + fmt(adv.exp) + '</b>/' + fmt(adv.maxExp) + '</span>' +
      '<span>任務 <b>' + fmt(adv.totalMissions) + '</b> 次</span>' +
      '<span>武學點數 <b class="sci-color">' + fmt(rep.advSp) + '</b></span>' +
      '</div>';
    html += '<div class="ta-bar"><div style="width:' + hpPct + '%"></div></div>';
    html += '<div class="ta-bar"><div style="width:' + mpPct + '%"></div></div>';
    html += '<div class="ta-bar"><div style="width:' + Math.min(100, expPct) + '%"></div></div>';

    html += '<div class="ta-tags">';
    if (rep.traits.length) {
      rep.traits.forEach(function (t) {
        html += '<span class="ta-trait" title="' + t.desc + '">' + t.icon + ' <b>' + t.name + '</b></span>';
      });
    } else html += '<span class="ta-tag">（無特質）</span>';
    html += '<span class="ta-tag cyan">' + (adv.sect ? T2.guildSectName(adv.sect) : '無門無派') + '</span>';
    if (rep.strain > 0) html += '<span class="ta-tag red">透支 ' + rep.strain + ' 次</span>';
    html += '</div>';

    html += '<div class="ta-rows" style="margin-top:6px">' +
      '<span class="muted">任務每期消耗：氣血 <b>' + rep.stamina.hpCost + '</b>、內力 <b>' + rep.stamina.mpCost + '</b>' +
      '（減免 ' + Math.round(rep.stamina.mitigation * 100) + '%）</span></div>';
    html += '</div>';

    // 四維 + 衍生屬性
    var base = T2.advRoleBase(adv);
    html += '<div class="ta-cols">';
    html += '<div class="ta-block"><div class="ta-btitle">🎯 四維（含特質乘數）</div>';
    html += '<div class="ta-hint">已分配潛能 <b>' + rep.allocated + '</b>　可用潛能 <b class="gold-color">' + rep.freePoints + '</b></div>';
    var am = b.attrMult;
    ['con:體魄', 'str:力道', 'agi:身法', 'int:內息'].forEach(function (pair) {
      var k = pair.split(':')[0], nm = pair.split(':')[1];
      var mul = Math.round((am[k] || 0) * 100);
      html += '<div class="ta-rows"><span>' + nm + ' <b>' + adv.stats[k] + '</b>' +
        (mul ? ' <span class="ta-tag violet">特質 ' + (mul >= 0 ? '+' : '') + mul + '%</span>' : '') +
        ' <span class="muted">（基礎 ' + base[k] + '）</span></span></div>';
    });
    html += '</div>';

    html += '<div class="ta-block"><div class="ta-btitle">⚔️ 衍生屬性（玩家同一套公式）</div>';
    ['atk:攻擊', 'def:防禦', 'maxHp:氣血', 'maxMp:內力', 'hit:命中', 'eva:閃避', 'crit:爆擊', 'critRes:暴抗'].forEach(function (pair) {
      var k = pair.split(':')[0], nm = pair.split(':')[1];
      html += '<div class="ta-rows"><span>' + nm + ' <b>' + fmt(d[k]) + '</b></span></div>';
    });
    html += '<div class="ta-rows"><span class="muted">減傷 ' + ((d.dmgReduce || 0) * 100).toFixed(1) + '%　爆傷 ' + (d.critDmg || 150) + '%</span></div>';
    html += '</div>';
    html += '</div>';

    // 深造加成來源
    html += '<div class="ta-block"><div class="ta-btitle">✨ 深造加成來源</div>';
    html += '<div class="ta-rows">' +
      '<span>武學 <b>' + b.sources.arty + '</b> 門</span>' +
      '<span>心法 <b>' + b.sources.xinfa + '</b> 本</span>' +
      '<span>輕功 <b>' + b.sources.qinggong + '</b> 本</span>' +
      '<span>靈根 <b>' + (b.sources.root ? '✅' : '—') + '</b></span>' +
      '<span>精通 <b>' + b.sources.mastery + '</b> 項</span>' +
      '<span>天命 <b>' + b.sources.destiny + '</b> 項</span>' +
      '<span>祝福 <b>' + b.sources.bless + '</b> 項</span>' +
      '<span>特質 <b>' + b.sources.trait + '</b> 種</span>' +
      '</div>';
    var flat = bonusStr(b, ADV.NUM_KEYS);
    var aux = bonusStr(b, ADV.AUX_KEYS);
    html += '<div class="ta-cbonus">' + (flat || '（無平坦加成）') + '</div>';
    if (aux) html += '<div class="ta-note">' + aux + '</div>';
    html += '</div>';

    return html;
  };

  /* ══════════ 🥋 武學 ══════════ */
  proto.taArtyHtml = function (rep) {
    var T2 = this.town;
    var html = '<div class="ta-block"><div class="ta-btitle">🥋 武學（外功）</div>';
    html += '<div class="ta-hint">武學<b>全部生效</b>，等級越高加成越大（每級 ×' + (1 + ADV.CONFIG.LV_STEP) + '）。' +
      '目前習得 <b>' + rep.arty.filter(function (x) { return x.lv > 0; }).length + '</b> / ' + rep.arty.length + ' 門。' +
      '　可用武學點數 <b class="sci-color">' + fmt(rep.advSp) + '</b>。</div>';
    html += '</div>';

    if (!rep.arty.length) return html + '<div class="ta-empty">缺少外功資料（externalArtsData.js）。</div>';

    // ⭐ 缺建築時明確提示（原本會被過濾掉而只顯示「沒有可學習的」）
    var bc = T2.advCheckBuilding('arty');
    if (!bc.ok) return html + '<div class="ta-warn">⚠️ ' + bc.msg + BUILD_HINT + '</div>';

    var showAll = this.advShowAll.arty;
    var list = rep.arty.filter(function (x) { return showAll || x.lv > 0 || x.can.ok; });
    if (!list.length) return html + '<div class="ta-empty">沒有可學習的武學（等級不足或已全部習得）。可用「顯示全部」查看完整清單與原因。</div>';

    html += '<div class="ta-grid">';
    list.forEach(function (x) {
      var def = x.def, lv = x.lv, can = x.can;
      var cls = 'ta-card' + (lv >= ADV.CONFIG.SKILL_MAX ? ' max' : (lv > 0 ? ' on' : ''));
      html += '<div class="' + cls + '">';
      html += '<div class="ta-chead"><span class="ta-cname">' + def._icon + ' ' + def._name + '</span>' +
        '<span class="ta-clv">' + (lv > 0 ? 'Lv.' + lv + ' / ' + ADV.CONFIG.SKILL_MAX : '未習得') + '</span></div>';
      html += '<div class="ta-cdesc">需 Lv.' + def._reqLv + '　' + bonusStr(def._bonus) + '</div>';
      if (lv > 0) {
        html += '<div class="ta-cbonus">目前：' + bonusStr(ADV.scaleBonus(def._bonus, 1 + (lv - 1) * ADV.CONFIG.LV_STEP)) + '</div>';
      }
      html += '<div class="ta-cbtn">';
      if (lv <= 0) {
        html += '<button class="mini-btn" data-ta-learn="arty|' + def._id + '" ' + (can.ok ? '' : 'disabled') + '>' +
          (can.ok ? '📖 學習（' + x.cost.gold + ' 兩 / ' + x.cost.sp + ' 點）' : '無法學習：' + can.msg) + '</button>';
      } else if (lv < ADV.CONFIG.SKILL_MAX) {
        html += '<button class="mini-btn" data-ta-up="arty|' + def._id + '" ' + (can.ok ? '' : 'disabled') + '>' +
          (can.ok ? '⬆️ 升級（' + x.cost.gold + ' 兩 / ' + x.cost.sp + ' 點）' : '無法升級：' + can.msg) + '</button>';
      } else {
        html += '<span class="ta-tag gold">已達最高級</span>';
      }
      html += '</div></div>';
    });
    html += '</div>';

    html += '<div style="margin-top:8px"><button class="mini-btn" data-ta-all="arty">' +
      (showAll ? '🔽 只顯示已習得' : '🔼 顯示全部武學（' + rep.arty.length + ' 門）') + '</button></div>';
    return html;
  };

  /* ══════════ 📜 心法 / 💨 輕功 ══════════ */
  proto.taXinfaHtml = function (rep) {
    var T2 = this.town;
    var html = '';
    html += '<div class="ta-block"><div class="ta-btitle">📜 心法　💨 輕功</div>';
    html += '<div class="ta-hint">可學<b>多本</b>，但只有<b>指定生效</b>的那一本拿全額加成，其餘只給 <b>' +
      Math.round(ADV.CONFIG.OFF_FACTOR * 100) + '%</b>。輕功生效的那本還會<b>縮短任務時間</b>。</div>';
    html += '<div class="ta-rows" style="margin-top:6px">' +
      '<span>任務時間修正 <b class="' + (rep.bonus.speedPct < 0 ? 'sci-color' : '') + '">' +
      (rep.bonus.speedPct ? (rep.bonus.speedPct * 100).toFixed(1) + '%' : '—') + '</b></span></div>';
    html += '</div>';

    var self = this;
    ['xinfa', 'qinggong'].forEach(function (kind) {
      var list = rep[kind];
      var label = KINDS[kind];
      var icon = (kind === 'xinfa') ? '📜' : '💨';
      if (!list.length) { html += '<div class="ta-empty">缺少' + label + '資料。</div>'; return; }

      // ⭐ 缺建築時明確提示
      var bc2 = T2.advCheckBuilding(kind);
      if (!bc2.ok) {
        html += '<div class="ta-block"><div class="ta-btitle">' + icon + ' ' + label + '</div>' +
          '<div class="ta-warn">⚠️ ' + bc2.msg + BUILD_HINT + '</div></div>';
        return;
      }

      var showAll = self.advShowAll[kind];
      var shown = list.filter(function (x) { return showAll || x.lv > 0 || x.can.ok; });

      html += '<div class="ta-block"><div class="ta-btitle">' + icon + ' ' + label +
        '　<span class="muted">已習得 ' + list.filter(function (x) { return x.lv > 0; }).length + ' / ' + list.length + '</span></div>';
      if (!shown.length) {
        html += '<div class="ta-empty">沒有可學習的' + label + '（等級不足或已全部習得）。</div>';
      } else {
        html += '<div class="ta-grid">';
        shown.forEach(function (x) {
          var def = x.def, lv = x.lv, can = x.can;
          var cls = 'ta-card' + (x.active ? ' on' : (lv >= ADV.CONFIG.SKILL_MAX ? ' max' : ''));
          html += '<div class="' + cls + '">';
          html += '<div class="ta-chead"><span class="ta-cname">' + def._icon + ' ' + def._name +
            (x.active ? ' <span class="ta-tag green">生效中</span>' : '') + '</span>' +
            '<span class="ta-clv">' + (lv > 0 ? 'Lv.' + lv + ' / ' + ADV.CONFIG.SKILL_MAX : '未習得') + '</span></div>';
          html += '<div class="ta-cdesc">需 Lv.' + def._reqLv + '　' + bonusStr(def._bonus) + '</div>';
          if (lv > 0) {
            var mul = x.active ? 1 : ADV.CONFIG.OFF_FACTOR;
            html += '<div class="ta-cbonus">目前：' + bonusStr(ADV.scaleBonus(def._bonus, (1 + (lv - 1) * ADV.CONFIG.LV_STEP) * mul)) + '</div>';
          }
          html += '<div class="ta-cbtn">';
          if (lv <= 0) {
            html += '<button class="mini-btn" data-ta-learn="' + kind + '|' + def._id + '" ' + (can.ok ? '' : 'disabled') + '>' +
              (can.ok ? '📖 學習（' + x.cost.gold + ' 兩 / ' + x.cost.sp + ' 點）' : '無法學習：' + can.msg) + '</button>';
          } else {
            if (lv < ADV.CONFIG.SKILL_MAX) {
              html += '<button class="mini-btn" data-ta-up="' + kind + '|' + def._id + '" ' + (can.ok ? '' : 'disabled') + '>' +
                (can.ok ? '⬆️ 升級（' + x.cost.gold + ' 兩 / ' + x.cost.sp + ' 點）' : '無法升級：' + can.msg) + '</button>';
            } else {
              html += '<span class="ta-tag gold">已滿級</span>';
            }
            html += '<button class="mini-btn" data-ta-active="' + kind + '|' + def._id + '">' +
              (x.active ? '✅ 取消生效' : '🎯 設為生效') + '</button>';
          }
          html += '</div></div>';
        });
        html += '</div>';
      }
      html += '<div style="margin-top:8px"><button class="mini-btn" data-ta-all="' + kind + '">' +
        (showAll ? '🔽 只顯示已習得' : '🔼 顯示全部（' + list.length + ' 本）') + '</button></div>';
      html += '</div>';
    });

    return html;
  };

  /* ══════════ ✨ 靈根 ══════════ */
  proto.taRootHtml = function (rep) {
    var T2 = this.town, adv = rep.adv;
    var html = '';
    html += '<div class="ta-block"><div class="ta-btitle">✨ 靈根</div>';
    html += '<div class="ta-hint">靈根提供<b>大幅加成</b>，且可用洗髓池<b>淬鍊</b>至 Lv.' + ADV.CONFIG.ROOT_MAX +
      '（研究【靈根培育】再 +20%）。每位冒險者只能覺醒<b>一種</b>靈根。</div></div>';

    // 現況
    html += '<div class="ta-block">';
    if (rep.spiritRoot) {
      html += '<div class="ta-chead"><span class="ta-cname">' + rep.spiritRoot._icon + ' ' + rep.spiritRoot._name +
        '</span><span class="ta-clv">Lv.' + rep.spiritRootLv + ' / ' + ADV.CONFIG.ROOT_MAX + '</span></div>';
      html += '<div class="ta-cbonus">目前：' + bonusStr(ADV.scaleBonus(rep.spiritRoot._bonus, 1 + (rep.spiritRootLv - 1) * ADV.CONFIG.LV_STEP)) + '</div>';
      html += '<div class="ta-cbtn" style="margin-top:6px">';
      if (rep.spiritRootLv < ADV.CONFIG.ROOT_MAX) {
        html += '<button class="mini-btn" data-ta-refine="1" ' + (rep.canRefine.ok ? '' : 'disabled') + '>' +
          (rep.canRefine.ok ? '💧 淬鍊至 Lv.' + (rep.spiritRootLv + 1) + '（' + rep.refineCost.gold + ' 兩 / ' + rep.refineCost.sp + ' 點）' : '無法淬鍊：' + rep.canRefine.msg) + '</button>';
      } else html += '<span class="ta-tag gold">已達最高級</span>';
      html += '</div>';
    } else {
      html += '<div class="ta-hint">尚未覺醒靈根。覺醒費用 <b class="gold-color">' + rep.awakenCost.gold + '</b> 兩、<b class="sci-color">' + rep.awakenCost.sp + '</b> 武學點數。</div>';
      var canA = rep.canAwaken;
      html += '<div class="ta-cbtn" style="margin-top:6px">' +
        '<button class="mini-btn" data-ta-awaken="" ' + (canA.ok ? '' : 'disabled') + '>' +
        (canA.ok ? '✨ 隨機覺醒靈根' : '無法覺醒：' + canA.msg) + '</button></div>';
    }
    html += '</div>';

    // 靈根圖鑑（未覺醒才顯示可選）
    if (!rep.spiritRoot && rep.rootList.length) {
      html += '<div class="ta-block"><div class="ta-btitle">📖 靈根圖鑑（可指定覺醒）</div><div class="ta-grid">';
      rep.rootList.forEach(function (def) {
        var can = T2.advCanAwaken(adv.id, def._id);
        html += '<div class="ta-card">';
        html += '<div class="ta-chead"><span class="ta-cname">' + def._icon + ' ' + def._name + '</span></div>';
        html += '<div class="ta-cdesc">Lv.1 提供：' + bonusStr(def._bonus) + '</div>';
        html += '<div class="ta-cbtn"><button class="mini-btn" data-ta-awaken="' + def._id + '" ' + (can.ok ? '' : 'disabled') + '>' +
          (can.ok ? '覺醒此靈根' : can.msg) + '</button></div></div>';
      });
      html += '</div></div>';
    }

    return html;
  };

  /* ══════════ 🪦 精通 / 🔮 天命 ══════════ */
  proto.taMasteryHtml = function (rep) {
    var T2 = this.town;
    var html = '';

    html += '<div class="ta-block"><div class="ta-btitle">🪦 精通</div>';
    html += '<div class="ta-hint">精通可花武學點數提升；<b>每完成任務有機率自動累積</b>（免費成長）。' +
      '研究【悟道之法】可再 +25% 效果。</div></div>';
    if (!rep.mastery.length) html += '<div class="ta-empty">缺少精通資料（masteryData.js）。</div>';
    else {
      html += '<div class="ta-grid">';
      rep.mastery.forEach(function (x) {
        var def = x.def, lv = x.lv, can = x.can;
        var cls = 'ta-card' + (lv >= ADV.CONFIG.MASTERY_MAX ? ' max' : (lv > 0 ? ' on' : ''));
        html += '<div class="' + cls + '">';
        html += '<div class="ta-chead"><span class="ta-cname">' + def._icon + ' ' + def._name + '</span>' +
          '<span class="ta-clv">' + (lv > 0 ? 'Lv.' + lv + ' / ' + ADV.CONFIG.MASTERY_MAX : 'Lv.0') + '</span></div>';
        html += '<div class="ta-cdesc">需 Lv.' + def._reqLv + '　每級：' + bonusStr(ADV.scaleBonus(def._bonus, ADV.CONFIG.LV_STEP)) + '</div>';
        if (lv > 0) html += '<div class="ta-cbonus">目前：' + bonusStr(ADV.scaleBonus(def._bonus, 1 + (lv - 1) * ADV.CONFIG.LV_STEP)) + '</div>';
        html += '<div class="ta-cbtn">';
        if (lv < ADV.CONFIG.MASTERY_MAX) {
          html += '<button class="mini-btn" data-ta-mastery="' + def._id + '" ' + (can.ok ? '' : 'disabled') + '>' +
            (can.ok ? '⬆️ 提升（' + x.cost.gold + ' 兩 / ' + x.cost.sp + ' 點）' : '無法提升：' + can.msg) + '</button>';
        } else html += '<span class="ta-tag gold">已達最高級</span>';
        html += '</div></div>';
      });
      html += '</div>';
    }

    html += '<div class="ta-block" style="margin-top:10px"><div class="ta-btitle">🔮 天命技能</div>';
    html += '<div class="ta-hint">高等冒險者於悟道碑參悟的天賦，需達指定等級與悟道碑。</div></div>';
    if (!rep.destiny.length) html += '<div class="ta-empty">尚無天命技能。</div>';
    else {
      html += '<div class="ta-grid">';
      rep.destiny.forEach(function (x) {
        var def = x.def, lv = x.lv, can = x.can;
        var cls = 'ta-card' + (lv >= ADV.CONFIG.DESTINY_MAX ? ' max' : (lv > 0 ? ' on' : ''));
        html += '<div class="' + cls + '">';
        html += '<div class="ta-chead"><span class="ta-cname">' + def._icon + ' ' + def._name + '</span>' +
          '<span class="ta-clv">' + (lv > 0 ? 'Lv.' + lv + ' / ' + ADV.CONFIG.DESTINY_MAX : '未參悟') + '</span></div>';
        html += '<div class="ta-cdesc">需 Lv.' + def._reqLv + '　每級：' + bonusStr(ADV.scaleBonus(def._bonus, ADV.CONFIG.LV_STEP)) + '</div>';
        if (lv > 0) html += '<div class="ta-cbonus">目前：' + bonusStr(ADV.scaleBonus(def._bonus, 1 + (lv - 1) * ADV.CONFIG.LV_STEP)) + '</div>';
        html += '<div class="ta-cbtn">';
        if (lv < ADV.CONFIG.DESTINY_MAX) {
          html += '<button class="mini-btn" data-ta-destiny="' + def._id + '" ' + (can.ok ? '' : 'disabled') + '>' +
            (can.ok ? '🔮 參悟至 Lv.' + (lv + 1) : '無法參悟：' + can.msg) + '</button>';
        } else html += '<span class="ta-tag gold">已達最高級</span>';
        html += '</div></div>';
      });
      html += '</div>';
    }

    return html;
  };

  /* ══════════ 🙏 幫會祝福 ══════════ */
  proto.taBlessHtml = function (rep) {
    var T2 = this.town;
    var st = T2.guildStats();
    var html = '';
    html += '<div class="ta-block"><div class="ta-btitle">🙏 幫會祝福</div>';
    html += '<div class="ta-hint">消耗<b>冒險者的武學點數</b>與<b>公會聲望</b>求取。' +
      '祝福<b>全部生效</b>，可提升至 Lv.' + ADV.CONFIG.BLESS_MAX + '。</div>';
    html += '<div class="ta-rows" style="margin-top:6px">' +
      '<span>公會等級 <b class="gold-color">Lv.' + st.level.lv + '</b>（' + st.level.title + '）</span>' +
      '<span>公會聲望 <b>' + fmt(st.reputation) + '</b></span>' +
      '<span>冒險者武學點數 <b class="sci-color">' + fmt(rep.advSp) + '</b></span></div>';
    html += '</div>';

    if (!rep.bless.length) return html + '<div class="ta-empty">尚無幫會祝福資料。</div>';

    html += '<div class="ta-grid">';
    rep.bless.forEach(function (x) {
      var def = x.def, lv = x.lv, can = x.can;
      var cls = 'ta-card' + (lv >= ADV.CONFIG.BLESS_MAX ? ' max' : (lv > 0 ? ' on' : ''));
      html += '<div class="' + cls + '">';
      html += '<div class="ta-chead"><span class="ta-cname">' + def._icon + ' ' + def._name + '</span>' +
        '<span class="ta-clv">' + (lv > 0 ? 'Lv.' + lv + ' / ' + ADV.CONFIG.BLESS_MAX : '未求取') + '</span></div>';
      html += '<div class="ta-cdesc">需公會 Lv.' + def.reqGuildLv + '　每級：' + bonusStr(ADV.scaleBonus(def._bonus, ADV.CONFIG.LV_STEP)) + '</div>';
      if (lv > 0) html += '<div class="ta-cbonus">目前：' + bonusStr(ADV.scaleBonus(def._bonus, 1 + (lv - 1) * ADV.CONFIG.LV_STEP)) + '</div>';
      html += '<div class="ta-cbtn">';
      if (lv < ADV.CONFIG.BLESS_MAX) {
        html += '<button class="mini-btn" data-ta-bless="' + def._id + '" ' + (can.ok ? '' : 'disabled') + '>' +
          (can.ok ? '🙏 求取至 Lv.' + (lv + 1) : '無法求取：' + can.msg) + '</button>';
      } else html += '<span class="ta-tag gold">已達最高級</span>';
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  };

  /* ══════════ ♻️ 洗點 / 🧘 傳功 ══════════ */
  proto.taRespecHtml = function (rep) {
    var T2 = this.town, adv = rep.adv;
    var base = T2.advRoleBase(adv);
    var role = T.GUILD.ROLES[adv.role] || {};
    var html = '';

    html += '<div class="ta-cols">';

    // 左：洗點與手動配點
    html += '<div class="ta-block"><div class="ta-btitle">♻️ 潛能重置（洗點）</div>';
    html += '<div class="ta-hint">把職業基礎以外的<b>已分配潛能</b>全部退回，重新自由分配。' +
      '費用會隨洗點次數與等級增加。</div>';
    html += '<div class="ta-rows" style="margin-top:6px">' +
      '<span>已分配 <b>' + rep.allocated + '</b> 點</span>' +
      '<span>可用 <b class="gold-color">' + rep.freePoints + '</b> 點</span>' +
      '<span>本職 <b>' + (role.icon || '') + (role.name || adv.role) + '</b></span></div>';
    html += '<div class="ta-rows">' +
      '<span>體魄 <b>' + adv.stats.con + '</b>（基礎 ' + base.con + '）</span>' +
      '<span>力道 <b>' + adv.stats.str + '</b>（基礎 ' + base.str + '）</span>' +
      '<span>身法 <b>' + adv.stats.agi + '</b>（基礎 ' + base.agi + '）</span>' +
      '<span>內息 <b>' + adv.stats.int + '</b>（基礎 ' + base.int + '）</span></div>';
    html += '<div class="ta-cbtn" style="margin-top:7px">';
    html += '<button class="mini-btn" data-ta-respec="1" ' + (rep.canRespec.ok ? '' : 'disabled') + '>' +
      (rep.canRespec.ok ? '♻️ 洗點（' + fmt(rep.respecCost) + ' 兩）' : '無法洗點：' + rep.canRespec.msg) + '</button>';
    html += '</div>';

    html += '<div class="ta-btitle" style="margin-top:10px">🎯 手動配點</div>';
    if (rep.freePoints > 0) {
      html += '<div class="ta-hint">剩餘 <b class="gold-color">' + rep.freePoints + '</b> 點可分配（每點 +1）。</div>';
      html += '<div class="ta-cbtn">';
      [['con', '體魄'], ['str', '力道'], ['agi', '身法'], ['int', '內息']].forEach(function (p) {
        html += '<button class="mini-btn" data-ta-alloc="' + p[0] + '">' + p[1] + ' +1</button>';
      });
      html += '</div>';
    } else {
      html += '<div class="ta-hint">目前沒有可用潛能點。升級或洗點後會獲得。</div>';
    }
    html += '<div class="ta-cbtn" style="margin-top:6px">' +
      '<button class="mini-btn" data-ta-autoalloc="1">🎯 依職業自動配點</button></div>';
    html += '</div>';

    // 右：傳功
    html += '<div class="ta-block"><div class="ta-btitle">🧘 傳功（玩家武點 → 冒險者）</div>';
    html += '<div class="ta-hint">把你自己的<b>武學點數</b>灌輸給冒險者，作為他學習與升級的本錢。<br>' +
      '兌換率：<b>1 點玩家武點 → ' + ADV.CONFIG.TRANSFUSE_RATE + ' 點冒險者武學點數</b>，' +
      '另收手續費 <b>' + ADV.CONFIG.TRANSFUSE_GOLD + ' 兩／點</b>。</div>';
    var mySp = T2.charSys.rootState.sp, myGold = T2.charSys.rootState.gold;
    html += '<div class="ta-rows" style="margin-top:6px">' +
      '<span>你的武學點數 <b class="sci-color">' + fmt(mySp) + '</b></span>' +
      '<span>你的銀兩 <b class="gold-color">' + fmt(myGold) + '</b></span>' +
      '<span>對方現有 <b>' + fmt(rep.advSp) + '</b></span></div>';
    html += '<div class="ta-cbtn" style="margin-top:7px">';
    [10, 50, 100].forEach(function (n) {
      var chk = T2.advCanTransfuse(adv.id, n);
      html += '<button class="mini-btn" data-ta-trans="' + n + '" ' + (chk.ok ? '' : 'disabled') + '>' +
        (chk.ok ? '傳功 ' + n + ' 點（→' + (n * ADV.CONFIG.TRANSFUSE_RATE) + ' 武學點數，' + (n * ADV.CONFIG.TRANSFUSE_GOLD) + ' 兩）' : '傳功 ' + n + ' 點（' + chk.msg + '）') + '</button>';
    });
    html += '</div>';
    html += '<div class="ta-note">💡 傳功是把你用不到的武點轉成公會的戰力，長期來看能讓公會自行運作。</div>';
    html += '</div>';

    html += '</div>';
    return html;
  };

  /* ══════════ ⚙️ 任務戰術 ══════════ */
  proto.taTacticsHtml = function (rep) {
    var T2 = this.town, adv = rep.adv;
    var tc = rep.tactics || {};
    var inv = T2.charSys.rootState.inventory || {};
    var Data = window.HY.Data || {};

    // 可選丹藥清單
    var pills = [];
    Object.keys(inv).forEach(function (id) {
      var it = Data.ITEMS && Data.ITEMS[id];
      if (!it || inv[id] <= 0) return;
      if (it.type !== 'consumable' && it.type !== 'pill') return;
      pills.push({ id: id, name: it.name, count: inv[id] });
    });

    var html = '';
    html += '<div class="ta-block"><div class="ta-btitle">⚙️ 任務自動用藥</div>';
    html += '<div class="ta-hint">冒險者出任務時每期都會消耗氣血與內力（目前：每期 <b>' + rep.stamina.hpCost + '</b> 氣血、<b>' +
      rep.stamina.mpCost + '</b> 內力）。設定門檻後，會自動從你的行囊取用丹藥補充。</div>';
    html += '</div>';

    html += '<div class="ta-cols">';
    html += '<div class="ta-block"><div class="ta-btitle">❤️ 氣血</div>';
    html += '<div class="ta-field">' +
      '<label><input type="checkbox" data-ta-tc="autoHp" ' + (tc.autoHp ? 'checked' : '') + '> 自動服用</label></div>';
    html += '<div class="ta-field"><label>觸發門檻</label>' +
      '<input type="number" data-ta-tc-num="hpThreshold" min="1" max="99" value="' + (tc.hpThreshold || 40) + '"> %</div>';
    html += '<div class="ta-field"><label>使用丹藥</label><select data-ta-tc-sel="hpItemId">';
    html += '<option value="">（自動挑選行囊中的氣血丹藥）</option>';
    pills.forEach(function (p) {
      html += '<option value="' + p.id + '"' + (tc.hpItemId === p.id ? ' selected' : '') + '>' + p.name + ' ×' + p.count + '</option>';
    });
    html += '</select></div>';
    html += '<div class="ta-hint">氣血低於門檻時，自動服用 1 顆丹藥並回滿。</div>';
    html += '</div>';

    html += '<div class="ta-block"><div class="ta-btitle">💧 內力</div>';
    html += '<div class="ta-field">' +
      '<label><input type="checkbox" data-ta-tc="autoMp" ' + (tc.autoMp ? 'checked' : '') + '> 自動服用</label></div>';
    html += '<div class="ta-field"><label>觸發門檻</label>' +
      '<input type="number" data-ta-tc-num="mpThreshold" min="1" max="99" value="' + (tc.mpThreshold || 30) + '"> %</div>';
    html += '<div class="ta-field"><label>使用丹藥</label><select data-ta-tc-sel="mpItemId">';
    html += '<option value="">（自動挑選行囊中的內力丹藥）</option>';
    pills.forEach(function (p) {
      html += '<option value="' + p.id + '"' + (tc.mpItemId === p.id ? ' selected' : '') + '>' + p.name + ' ×' + p.count + '</option>';
    });
    html += '</select></div>';
    html += '<div class="ta-hint">建議關閉，或設很低（內力通常夠用）。</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="ta-block"><div class="ta-btitle">📦 目前行囊中的丹藥</div>';
    if (!pills.length) html += '<div class="ta-warn">行囊中沒有丹藥，自動用藥不會生效。藥鋪或任務掉落會補充。</div>';
    else {
      html += '<div class="ta-tags">';
      pills.forEach(function (p) {
        html += '<span class="ta-tag cyan">' + p.name + ' ×' + p.count + '</span>';
      });
      html += '</div>';
    }
    html += '</div>';

    html += '<div class="ta-block"><div class="ta-btitle">📊 深造統計（此人）</div>';
    var s = rep.stat;
    html += '<div class="ta-rows">' +
      '<span>習得技能 <b>' + s.learned + '</b></span>' +
      '<span>技能升級 <b>' + s.upgrades + '</b></span>' +
      '<span>服用丹藥 <b>' + s.pills + '</b></span>' +
      '<span>接受傳功 <b>' + s.transfused + '</b> 點</span></div>';
    html += '<div class="ta-rows">' +
      '<span>洗點 <b>' + s.respec + '</b> 次</span>' +
      '<span>覺醒 <b>' + s.awaken + '</b></span>' +
      '<span>靈根淬鍊 <b>' + s.refine + '</b></span>' +
      '<span>求取祝福 <b>' + s.blessed + '</b></span>' +
      '<span>參悟天命 <b>' + s.destiny + '</b></span></div>';
    html += '</div>';

    return html;
  };

  /* ══════════ 事件綁定 ══════════ */
  proto.taBind = function (panel) {
    var self = this;
    var T2 = this.town;

    function one(sel, fn) {
      panel.querySelectorAll(sel).forEach(function (el) {
        el.addEventListener('click', function (e) { e.preventDefault(); fn(el, e); });
      });
    }
    /** 取當前冒險者；若無則提示 */
    function cur() {
      var a = self.taCurrent();
      if (!a) { alert('請先選擇一位冒險者。'); return null; }
      return a;
    }
    function refresh() { self.renderGuildPanel(); }

    /* ── 選人 / 切換區段 / 展開全部 ── */
    one('[data-ta-pick]', function (el) { self.taPick(el.getAttribute('data-ta-pick')); });
    one('[data-ta-sec]', function (el) { self.taSetSec(el.getAttribute('data-ta-sec')); });
    one('[data-ta-all]', function (el) { self.taToggleAll(el.getAttribute('data-ta-all')); });

    /* ── 學習 / 升級 / 設為生效 ── */
    one('[data-ta-learn]', function (el) {
      var p = el.getAttribute('data-ta-learn').split('|');
      var adv = cur(); if (!adv) return;
      if (T2.advLearn(p[0], p[1], adv.id)) refresh();
    });
    one('[data-ta-up]', function (el) {
      var p = el.getAttribute('data-ta-up').split('|');
      var adv = cur(); if (!adv) return;
      if (T2.advUpgrade(p[0], p[1], adv.id)) refresh();
    });
    one('[data-ta-active]', function (el) {
      var p = el.getAttribute('data-ta-active').split('|');
      var adv = cur(); if (!adv) return;
      if (T2.advSetActive(p[0], adv.id, p[1])) refresh();
    });

    /* ── 靈根 ── */
    one('[data-ta-awaken]', function (el) {
      var adv = cur(); if (!adv) return;
      var rid = el.getAttribute('data-ta-awaken') || null;
      var cost = T2.advAwakenCost(adv);
      var nm = '（隨機）';
      if (rid) {
        var rd = (ADV.findDef ? ADV.findDef('root', rid) : null);
        nm = '【' + (rd ? rd._name : rid) + '】';
      }
      if (!confirm('確定為【' + adv.name + '】覺醒靈根 ' + nm + '？\n費用 ' + cost.gold + ' 兩、' + cost.sp + ' 武學點數。')) return;
      if (T2.advAwakenRoot(adv.id, rid)) refresh();
    });
    one('[data-ta-refine]', function () {
      var adv = cur(); if (!adv) return;
      if (T2.advRefineRoot(adv.id)) refresh();
    });

    /* ── 精通 / 天命 / 祝福 ── */
    one('[data-ta-mastery]', function (el) {
      var adv = cur(); if (!adv) return;
      if (T2.advMasteryUp(adv.id, el.getAttribute('data-ta-mastery'))) refresh();
    });
    one('[data-ta-destiny]', function (el) {
      var adv = cur(); if (!adv) return;
      if (T2.advDestinyLearn(adv.id, el.getAttribute('data-ta-destiny'))) refresh();
    });
    one('[data-ta-bless]', function (el) {
      var adv = cur(); if (!adv) return;
      if (T2.advBlessUp(adv.id, el.getAttribute('data-ta-bless'))) refresh();
    });

    /* ── 洗點 / 配點 / 傳功 ── */
    one('[data-ta-respec]', function () {
      var adv = cur(); if (!adv) return;
      var cost = T2.advRespecCost(adv);
      if (!confirm('確定為【' + adv.name + '】洗點？\n費用 ' + cost + ' 兩，已分配潛能將全數退回。')) return;
      if (T2.advRespec(adv.id)) refresh();
    });
    one('[data-ta-alloc]', function (el) {
      var adv = cur(); if (!adv) return;
      if (T2.advAllocStat(adv.id, el.getAttribute('data-ta-alloc'))) refresh();
    });
    one('[data-ta-autoalloc]', function () {
      var adv = cur(); if (!adv) return;
      var n = T2.advAutoAlloc(adv.id);
      if (n === 0) alert('沒有可分配的潛能點。');
      refresh();
    });
    one('[data-ta-trans]', function (el) {
      var adv = cur(); if (!adv) return;
      var n = parseInt(el.getAttribute('data-ta-trans'), 10) || 10;
      if (!confirm('確定向【' + adv.name + '】傳功 ' + n + ' 點？\n將消耗你 ' + n + ' 點武學點數與 ' +
        (n * ADV.CONFIG.TRANSFUSE_GOLD) + ' 兩，對方獲得 ' + (n * ADV.CONFIG.TRANSFUSE_RATE) + ' 點武學點數。')) return;
      if (T2.advTransfuse(adv.id, n)) refresh();
    });

    /* ── 任務戰術（直接改寫 adv.adv.tactics；advEnsure 回傳的是活物件）── */
    panel.querySelectorAll('[data-ta-tc]').forEach(function (el) {
      el.addEventListener('change', function () {
        var adv = self.taCurrent(); if (!adv) return;
        var A = T2.advEnsure(adv);
        if (!A.tactics) A.tactics = {};
        A.tactics[el.getAttribute('data-ta-tc')] = !!el.checked;
        refresh();
      });
    });
    panel.querySelectorAll('[data-ta-tc-num]').forEach(function (el) {
      el.addEventListener('change', function () {
        var adv = self.taCurrent(); if (!adv) return;
        var A = T2.advEnsure(adv);
        if (!A.tactics) A.tactics = {};
        var v = parseInt(el.value, 10);
        if (isNaN(v)) { refresh(); return; }
        A.tactics[el.getAttribute('data-ta-tc-num')] = Math.max(1, Math.min(99, v));
        refresh();
      });
    });
    panel.querySelectorAll('[data-ta-tc-sel]').forEach(function (el) {
      el.addEventListener('change', function () {
        var adv = self.taCurrent(); if (!adv) return;
        var A = T2.advEnsure(adv);
        if (!A.tactics) A.tactics = {};
        A.tactics[el.getAttribute('data-ta-tc-sel')] = el.value || null;
        refresh();
      });
    });
  };

  window.HY.UITownGuildAdv = {
    version: '1.0',
    sections: SECTIONS.length
  };
})();