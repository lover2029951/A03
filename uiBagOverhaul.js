// js/uiBagOverhaul.js (v8)
// ⭐ 「🛡️ 裝備行囊 & 工藝」→ 彈窗化（雙頁面：行囊 / 通貨倉庫）
//
// 【v8 改動】
//   ① 移除所有原生 title 屬性 → 不再出現白色方框提示
//   ② 「工藝台」→「🗃️ 通貨倉庫」按鈕；點擊把彈窗切換到 PoE 通貨倉庫頁面
//      · 關閉/返回 → 回到行囊頁面（不關彈窗）
//      · 通貨格 100% 仿 POE：格子式、顯示數量、hover 顯示說明、點擊直接作用於目標裝備
//      · 左側十部位可點選作為「改造目標」，並即時預覽詞綴
//   ③ 移除彈窗底部的「💎 工藝打造台」收納區
//   ④ 裝備對比改為「兩個裝備詳細視窗」
//      · 右：滑鼠目標裝備｜左：當前角色同部位已裝備｜中間：戰力差異徽章
//   ⑤ 原版節點寄放於隱藏 #bagov-hold → 切頁/重整都不會消失（根治 v6 問題）
//
// Console：
//   HY.BagOverhaul.open() / close() / toggle()
//   HY.BagOverhaul.stash(true|false)   // 切換到通貨倉庫 / 回行囊
//   HY.BagOverhaul.status() / diag() / orig() / probe()
//   HY.BagOverhaul.chars() / switchTo('角色名或id') / sectTable()
//   HY.BagOverhaul.bestGear() / batchPurge('lowRarity') / compare(uid)
//
// ⚠️ 載入順序：uiEquipMarket.js 之後、main.js 之前
window.HY = window.HY || {};

(function () {
  var CFG = {
    INTERCEPT_TAB: true,
    TAB_SEL: '.tab-btn[data-tab="tab-inventory"]',
    TAB_ID: 'tab-inventory',
    FLOAT_BUTTON: false,
    FLOAT_TEXT: '🎒 大修',

    MOVE_CRAFT: true,
    MOVE_BAG: true,
    CRAFT_ID: 'poe-craft-bench',
    BAG_FILTER_SEL: '.inv-filter-bar',
    BAG_LIST_ID: 'inventory-list',

    COMPARE: true,          // 雙視窗對比
    GRID_COLS: 6,
    ORB_COLS: 10,           // 通貨倉庫每列格數
    TOOLTIP_DELAY: 70,
    VERBOSE: true,

    PREF_KEY: 'hy_bagov_pref_v8',
    LOCK_KEY: 'hy_bagov_lock_v8'
  };

  /* ══════════════════════════════════════════════════════
     品質
     ══════════════════════════════════════════════════════ */
  var RARITY = {
    normal: { key: 'normal', name: '普通白裝', short: '普通', color: '#e2e8f0', glow: 'rgba(226,232,240,.35)', star: 1 },
    magic:  { key: 'magic',  name: '魔法藍裝', short: '魔法', color: '#60a5fa', glow: 'rgba(96,165,250,.55)',  star: 2 },
    rare:   { key: 'rare',   name: '稀有黃裝', short: '稀有', color: '#fbbf24', glow: 'rgba(251,191,36,.60)',  star: 3 },
    unique: { key: 'unique', name: '傳奇暗金', short: '傳奇', color: '#f97316', glow: 'rgba(249,115,22,.70)',  star: 4 }
  };
  var RARITY_ORDER = ['unique', 'rare', 'magic', 'normal'];
  function rarityOf(it) {
    return RARITY[String((it && it.rarity) || 'normal').toLowerCase()] || RARITY.normal;
  }

  /* ══════════════════════════════════════════════════════
     工具
     ══════════════════════════════════════════════════════ */
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function fmt(n) { return Math.floor(num(n, 0)).toLocaleString(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function APP() { return window.HY.game || {}; }
  function CS() { return safe(function () { return APP().charSys; }, null); }
  function safe(fn, d) { try { var v = fn(); return (v === undefined || v === null) ? d : v; } catch (e) { return d; } }
  function log() { if (!CFG.VERBOSE) return; try { console.log.apply(console, ['[BagOverhaul]'].concat([].slice.call(arguments))); } catch (e) {} }
  function warn() { try { console.warn.apply(console, ['[BagOverhaul]'].concat([].slice.call(arguments))); } catch (e) {} }
  function inDoc(n) { try { return !!(n && (document.body || document.documentElement).contains(n)); } catch (e) { return false; } }

  /* ══════════════════════════════════════════════════════
     門派名稱
     ══════════════════════════════════════════════════════ */
  function sectDB() {
    return safe(function () { return (window.HY.Data && window.HY.Data.SECTS) || {}; }, {}) || {};
  }
  function sectIdOf(m) {
    if (!m) return '';
    var v = m.sect;
    if (v && typeof v === 'object') { if (v.id) return String(v.id); if (v.name) return String(v.name); return ''; }
    if (typeof v === 'string' && v) return v;
    var alt = ['sectId', 'sectName', 'sectLabel', 'sectKey', 'menpai', 'school'];
    for (var i = 0; i < alt.length; i++) {
      var a = m[alt[i]];
      if (typeof a === 'string' && a) return a;
      if (a && typeof a === 'object' && (a.id || a.name)) return String(a.id || a.name);
    }
    return '';
  }
  function sectNameOf(m) {
    var id = sectIdOf(m);
    if (!id) return '無門無派';
    if (id === 'none' || id === '0' || id === '無') return '無門無派';
    var DB = sectDB();
    if (DB[id] && DB[id].name) return String(DB[id].name);
    var lower = id.toLowerCase(), keys = Object.keys(DB);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === lower && DB[keys[i]].name) return String(DB[keys[i]].name);
    }
    for (var j = 0; j < keys.length; j++) {
      var s = DB[keys[j]];
      if (s && s.name === id) return id;
    }
    if (m && m.sect && typeof m.sect === 'object' && m.sect.name) return String(m.sect.name);
    return id;
  }

  /* ══════════════════════════════════════════════════════
     部位
     ══════════════════════════════════════════════════════ */
  var SLOT_ORDER = ['mainhand', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring_left', 'ring_right'];
  var FALLBACK_SLOTS = {
    mainhand: { id: 'mainhand', name: '主手武器', icon: '🗡️' },
    offhand: { id: 'offhand', name: '副手/盾牌', icon: '🛡️' },
    helmet: { id: 'helmet', name: '頭部護具', icon: '🪖' },
    body: { id: 'body', name: '胸甲戰衣', icon: '🥋' },
    gloves: { id: 'gloves', name: '手套護手', icon: '🧤' },
    boots: { id: 'boots', name: '戰靴履具', icon: '🥾' },
    belt: { id: 'belt', name: '腰帶束甲', icon: '🎗️' },
    amulet: { id: 'amulet', name: '護身符項鍊', icon: '📿' },
    ring_left: { id: 'ring_left', name: '左手戒指', icon: '💍' },
    ring_right: { id: 'ring_right', name: '右手戒指', icon: '💍' }
  };
  function slotDefs() {
    var es = safe(function () { return APP().equipSys; }, null);
    var S = (es && es.SLOTS) ? es.SLOTS : FALLBACK_SLOTS;
    return SLOT_ORDER.filter(function (id) { return !!S[id]; }).map(function (id) {
      return { id: id, name: S[id].name || id, icon: S[id].icon || '◻' };
    });
  }
  function slotNameOf(st) {
    if (st === 'ring') return '戒指';
    var defs = slotDefs(), n = st;
    defs.forEach(function (s) { if (s.id === st) n = s.name; });
    return n || '未知';
  }
  function itemIcon(it) {
    var st = String((it && it.slotType) || '');
    if (st === 'ring') return '💍';
    var es = safe(function () { return APP().equipSys; }, null);
    if (es && es.SLOTS && es.SLOTS[st] && es.SLOTS[st].icon) return es.SLOTS[st].icon;
    return (FALLBACK_SLOTS[st] && FALLBACK_SLOTS[st].icon) || '◻';
  }

  /* ══════════════════════════════════════════════════════
     存取器
     ══════════════════════════════════════════════════════ */
  var ACC = {};
  function resetAccessors() {
    ACC.bag = function () {
      var cs = CS();
      if (!cs || !cs.rootState) return [];
      if (!Array.isArray(cs.rootState.equipBag)) cs.rootState.equipBag = [];
      return cs.rootState.equipBag;
    };
    ACC.equipped = function (charObj) {
      var c = charObj || activeChar();
      if (!c) return {};
      if (!c.equipment) c.equipment = {};
      return c.equipment;
    };
    ACC.equip = function (item, targetSlot) {
      if (!item || !item.uid) return false;
      var es = safe(function () { return APP().equipSys; }, null);
      if (!es || typeof es.equipInstance !== 'function') return false;
      var ring = (targetSlot === 'ring_left' || targetSlot === 'ring_right') ? targetSlot : undefined;
      return !!safe(function () { return es.equipInstance(item.uid, ring); }, false);
    };
    ACC.unequip = function (slotId) {
      var es = safe(function () { return APP().equipSys; }, null);
      if (!es || typeof es.unequip !== 'function') return false;
      return !!safe(function () { return es.unequip(slotId); }, false);
    };
    ACC.sell = function (item) {
      if (!item || !item.uid) return false;
      var es = safe(function () { return APP().equipSys; }, null);
      if (!es || typeof es.sellEquipInstance !== 'function') return false;
      return !!safe(function () { return es.sellEquipInstance(item.uid); }, false);
    };
    ACC.sellAll = function () {
      var es = safe(function () { return APP().equipSys; }, null);
      if (!es || typeof es.sellAllBagEquips !== 'function') return false;
      return !!safe(function () { return es.sellAllBagEquips(); }, false);
    };
    ACC.salvage = ACC.salvage || null;
    ACC.itemBonus = function (item) {
      if (!item) return {};
      var poe = safe(function () { return APP().poeSys; }, null);
      if (poe && typeof poe.getItemTotalBonus === 'function') {
        var b = safe(function () { return poe.getItemTotalBonus(item); }, null);
        if (b && typeof b === 'object') return b;
      }
      return (item.baseStats && typeof item.baseStats === 'object') ? item.baseStats : {};
    };
    ACC.itemPower = function (item) {
      if (!item) return 0;
      var b = ACC.itemBonus(item);
      var cs = CS();
      if (cs && typeof cs.getPowerScore === 'function') {
        var v = safe(function () { return cs.getPowerScore(b); }, null);
        if (typeof v === 'number' && isFinite(v)) return Math.round(v);
      }
      return Math.round(
        num(b.atk, 0) * 3 + num(b.def, 0) * 2 + num(b.maxHp, 0) * 0.5 +
        num(b.maxMp, 0) * 0.3 + num(b.hit, 0) * 2 + num(b.eva, 0) * 2 +
        num(b.crit, 0) * 3 + num(b.critRes, 0) * 2
      );
    };
    ACC.maxBag = function () {
      var es = safe(function () { return APP().equipSys; }, null);
      if (es && typeof es.getMaxBagSize === 'function') {
        var v = safe(function () { return es.getMaxBagSize(); }, null);
        if (typeof v === 'number' && v > 0) return v;
      }
      return 60;
    };
    ACC.myLevel = function () { var a = activeChar(); return num(a && a.lv, 1); };
  }
  resetAccessors();

  function formatBonus(b) {
    var es = safe(function () { return APP().equipSys; }, null);
    if (es && typeof es.formatBonusText === 'function') {
      return safe(function () { return es.formatBonusText(b); }, '無特殊加成');
    }
    if (!b) return '無特殊加成';
    var arr = [];
    if (b.atk) arr.push('攻擊+' + b.atk);
    if (b.def) arr.push('防禦+' + b.def);
    if (b.maxHp) arr.push('氣血+' + b.maxHp);
    if (b.maxMp) arr.push('內力+' + b.maxMp);
    if (b.hit) arr.push('命中+' + b.hit + '%');
    if (b.eva) arr.push('閃避+' + b.eva + '%');
    if (b.crit) arr.push('爆擊+' + b.crit + '%');
    if (b.critRes) arr.push('暴抗+' + b.critRes + '%');
    return arr.join('、') || '基礎白板';
  }
  function sellPrice(it) {
    var es = safe(function () { return APP().equipSys; }, null);
    if (es && typeof es.getSellPrice === 'function') {
      var v = safe(function () { return es.getSellPrice(it); }, null);
      if (typeof v === 'number' && v > 0) return v;
    }
    var mult = it && it.rarity === 'unique' ? 3 : (it && it.rarity === 'rare' ? 2 : (it && it.rarity === 'magic' ? 1.4 : 1));
    return Math.max(10, Math.floor(num(it && it.price, 50) * 0.5 * mult));
  }

  /* ══════════════════════════════════════════════════════
     角色
     ══════════════════════════════════════════════════════ */
  function rosterList() {
    var cs = CS();
    var r = safe(function () { return cs.rootState.roster; }, null);
    if (Array.isArray(r) && r.length) return r;
    var st = safe(function () { return cs.state; }, null);
    return st ? [st] : [];
  }
  function activeChar() {
    var cs = CS();
    if (!cs) return null;
    var st = safe(function () { return cs.state; }, null);
    if (st) return st;
    var r = rosterList();
    return r.length ? r[0] : null;
  }
  function charId(m) { return m ? String(m.id || m.uid || m.name || '') : ''; }
  function isActive(m) {
    var a = activeChar();
    if (!a || !m) return false;
    if (a === m) return true;
    return !!charId(m) && charId(m) === charId(a);
  }
  function charEquipPower(m) {
    var e = ACC.equipped(m), s = 0;
    Object.keys(e).forEach(function (k) { if (e[k]) s += ACC.itemPower(e[k]); });
    return s;
  }
  function charDerived(m) {
    var cs = CS();
    if (cs && typeof cs.getDerivedStatsForChar === 'function') {
      return safe(function () { return cs.getDerivedStatsForChar(m); }, {}) || {};
    }
    if (isActive(m) && cs && typeof cs.getDerivedStats === 'function') {
      return safe(function () { return cs.getDerivedStats(); }, {}) || {};
    }
    return {};
  }
  function switchCharacter(m) {
    if (!m) return false;
    if (isActive(m)) return true;
    var cs = CS();
    if (!cs) return false;
    var id = charId(m);
    var fnNames = ['switchTo', 'switchCharacter', 'setActive', 'selectCharacter',
                   'activateCharacter', 'setCurrent', 'changeCharacter', 'controlCharacter'];
    var targets = [cs, safe(function () { return APP().rosterSys; }, null), APP()];
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t) continue;
      for (var j = 0; j < fnNames.length; j++) {
        if (typeof t[fnNames[j]] !== 'function') continue;
        try { t[fnNames[j]](id); } catch (e) {}
        if (isActive(m)) return true;
        try { t[fnNames[j]](m); } catch (e2) {}
        if (isActive(m)) return true;
      }
    }
    try {
      var root = cs.rootState;
      var roster = safe(function () { return root.roster; }, null);
      if (Array.isArray(roster)) {
        var idx = -1;
        roster.forEach(function (x, k) { if (x === m || (charId(x) && charId(x) === id)) idx = k; });
        if (idx >= 0) {
          ['currentCharIndex', 'activeCharIndex', 'curCharIndex', 'currentIndex'].forEach(function (k) {
            if (root[k] !== undefined) root[k] = idx;
          });
          cs.state = m;
        }
      }
    } catch (e) {}
    if (isActive(m)) return true;
    var sels = ['#sidebar-roster-switcher button', '#roster-party-list button',
                '#sidebar-roster-switcher [data-char-id]', '#roster-party-list [data-char-id]'];
    var ok = false;
    for (var s = 0; s < sels.length && !ok; s++) {
      var btns;
      try { btns = document.querySelectorAll(sels[s]); } catch (e) { continue; }
      for (var b = 0; b < btns.length; b++) {
        var el = btns[b];
        var cid = el.getAttribute && (el.getAttribute('data-char-id') || el.getAttribute('data-id'));
        var txt = String(el.textContent || '');
        var hit = (cid && cid === id) || (m.name && txt.indexOf(m.name) !== -1);
        if (!hit) continue;
        try { el.click(); } catch (e2) { continue; }
        if (isActive(m)) { ok = true; break; }
      }
    }
    return ok;
  }
  function afterSwitch() {
    var a = APP();
    if (typeof a.renderAll === 'function') safe(function () { a.renderAll(); });
    refreshOriginals();
    if (_open) renderModal();
  }

  /* ══════════════════════════════════════════════════════
     鎖定 / 偏好
     ══════════════════════════════════════════════════════ */
  function uidOf(it) { return String((it && it.uid) || ''); }
  function lkey(it) { return uidOf(it) + '|' + String((it && it.name) || '') + '|' + num(it && it.reqLv, 0); }

  var _locked = {};
  function loadLocked() { try { _locked = JSON.parse(localStorage.getItem(CFG.LOCK_KEY) || '{}') || {}; } catch (e) { _locked = {}; } }
  function saveLocked() { try { localStorage.setItem(CFG.LOCK_KEY, JSON.stringify(_locked)); } catch (e) {} }
  function isLocked(it) { return !!_locked[lkey(it)]; }
  function setLocked(it, v) { var k = lkey(it); if (v) _locked[k] = 1; else delete _locked[k]; saveLocked(); }

  var _pref = {
    cat: 'all', q: '', rarity: '', slot: '', lvMin: '', lvMax: '',
    sort: 'power', asc: false, onlyUsable: false, hideEquipped: false
  };
  function loadPref() {
    try {
      var p = JSON.parse(localStorage.getItem(CFG.PREF_KEY) || 'null');
      if (p) Object.keys(p).forEach(function (k) { if (_pref[k] !== undefined) _pref[k] = p[k]; });
    } catch (e) {}
  }
  function savePref() { try { localStorage.setItem(CFG.PREF_KEY, JSON.stringify(_pref)); } catch (e) {} }
  loadPref(); loadLocked();

  /* ══════════════════════════════════════════════════════
     狀態
     ══════════════════════════════════════════════════════ */
  var _open = false, _els = null;
  var _page = 'bag';                 // 'bag' | 'stash'
  var _selUid = null;
  var _checked = {};
  var _iwEl = { a: null, b: null, badge: null };   // 雙視窗對比
  var _ttTimer = null;
  var _ctxEl = null, _ctxCloser = null;
  var _floatBtn = null;
  var _savedFilter = null;
  var _entryLog = { intercept: false, float: false, craftMoved: false, bagMoved: false };
  var _orig = { craft: null, bagList: null, bagFilter: null };

  /* ══════════════════════════════════════════════════════
     樣式
     ══════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('bagov-style')) return;
    var host = document.head || document.documentElement;
    if (!host) return;
    var css = `
.bagov-mask{position:fixed;inset:0;z-index:9600;background:rgba(2,6,12,.82);
 -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);
 display:flex;align-items:center;justify-content:center;padding:12px;}
.bagov-mask.hidden{display:none!important;}
.bagov{width:min(96vw,1320px);height:min(93vh,920px);display:flex;flex-direction:column;
 background:#0f141c;border:2px solid #34d399;border-radius:10px;
 box-shadow:0 26px 76px rgba(0,0,0,.85),inset 0 0 0 1px rgba(52,211,153,.22);
 overflow:hidden;animation:bagovIn .16s ease-out;}
@keyframes bagovIn{from{opacity:0;transform:scale(.97) translateY(8px)}to{opacity:1;transform:none}}
.bagov.wide{width:98vw!important;height:96vh!important;}
.bagov-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;
 background:linear-gradient(90deg,#132018,#16302a);border-bottom:2px solid #34d399;flex:0 0 auto;}
.bagov-head.gold{background:linear-gradient(90deg,#241d10,#2a2415);border-bottom-color:#fbbf24;}
.bagov-title{font-size:1.08rem;font-weight:bold;color:#6ee7b7;}
.bagov-head.gold .bagov-title{color:#fde68a;}
.bagov-sub{font-size:.72rem;color:#94a3b8;}
.bagov-headbtns{margin-left:auto;display:flex;gap:7px;flex-wrap:wrap;}
.bagov-btn{background:#22303d;color:#6ee7b7;border:1px solid #34d399;border-radius:5px;
 padding:4px 11px;font-size:.77rem;cursor:pointer;white-space:nowrap;}
.bagov-btn:hover{background:#2f3f50;}
.bagov-btn.r{border-color:#ef4444;color:#fca5a5;}
.bagov-btn.y{border-color:#fbbf24;color:#fcd34d;}

.bagov-body{flex:1 1 auto;display:flex;min-height:0;overflow:hidden;}

.bagov-left{width:296px;flex:0 0 296px;border-right:1px solid #23303e;
 overflow-y:auto;overflow-x:hidden;padding:10px;background:#0d1319;
 display:flex;flex-direction:column;gap:8px;box-sizing:border-box;}
.bagov-eqtitle{font-size:.79rem;color:#7dd3fc;font-weight:bold;flex:0 0 auto;}
.bagov-eq{display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:0 0 auto;}
.bagov-slot{background:#121a22;border:2px solid #2e3b4e;border-radius:6px;
 padding:5px 7px;display:flex;align-items:center;gap:7px;
 cursor:pointer;min-height:48px;overflow:hidden;box-sizing:border-box;
 transition:border-color .12s,transform .12s;}
.bagov-slot:hover{border-color:#34d399;transform:translateY(-1px);}
.bagov-slot.empty{border-style:dashed;opacity:.5;}
.bagov-slot.target{border-color:#00e5ff!important;box-shadow:0 0 12px rgba(0,229,255,.75);}
.bagov-slot .ic{font-size:1.15rem;line-height:1;flex:0 0 22px;width:22px;text-align:center;
 display:flex;align-items:center;justify-content:center;}
.bagov-slot .tx{display:flex;flex-direction:column;justify-content:center;gap:2px;
 min-width:0;flex:1 1 auto;overflow:hidden;}
.bagov-slot .sn{display:block;width:100%;font-size:.6rem;color:#64748b;line-height:1.1;
 white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.bagov-slot .si{display:block;width:100%;font-size:.7rem;font-weight:bold;line-height:1.2;
 white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

.bagov-sum{background:#121a22;border:1px solid #2e3b4e;border-radius:6px;padding:8px 9px;flex:0 0 auto;}
.bagov-sum h4{margin:0 0 5px;font-size:.78rem;color:#6ee7b7;}
.bagov-kv{display:flex;justify-content:space-between;gap:8px;font-size:.74rem;
 padding:2px 0;border-bottom:1px solid #1a2330;align-items:baseline;}
.bagov-kv:last-child{border-bottom:none;}
.bagov-kv span:first-child{color:#94a3b8;flex:0 0 auto;white-space:nowrap;}
.bagov-kv span:last-child{color:#e2e8f0;font-weight:bold;text-align:right;
 min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

.bagov-right{flex:1 1 auto;min-width:0;overflow-y:auto;overflow-x:hidden;
 padding:10px 12px;display:flex;flex-direction:column;gap:9px;box-sizing:border-box;}

.bagov-charbar{background:linear-gradient(90deg,#132018,#0f1a24);border:1px solid #34d399;
 border-radius:7px;padding:8px 10px;flex:0 0 auto;}
.bagov-charbar .cb-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;}
.bagov-charbar .cb-title{font-size:.85rem;font-weight:bold;color:#6ee7b7;}
.bagov-charbar .cb-note{font-size:.7rem;color:#94a3b8;}
.bagov-charbar .cb-list{display:flex;gap:6px;flex-wrap:wrap;}
.bagov-char{display:flex;align-items:center;gap:6px;background:#121a22;border:2px solid #2e3b4e;
 border-radius:7px;padding:5px 10px;cursor:pointer;max-width:100%;
 transition:border-color .12s,transform .12s;}
.bagov-char:hover{border-color:#34d399;transform:translateY(-1px);}
.bagov-char.on{border-color:#10b981;background:rgba(16,185,129,.16);}
.bagov-char .ci{font-size:1.05rem;flex:0 0 auto;}
.bagov-char .cinfo{display:flex;flex-direction:column;gap:1px;min-width:0;overflow:hidden;}
.bagov-char .cn{font-size:.78rem;font-weight:bold;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.bagov-char .cm{font-size:.65rem;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.bagov-char .cp{font-size:.66rem;color:#f43f5e;font-weight:bold;white-space:nowrap;}

.bagov-tools{background:#121a22;border:1px solid #2e3b4e;border-radius:7px;
 padding:8px 10px;display:flex;gap:7px;flex-wrap:wrap;align-items:center;flex:0 0 auto;}
.bagov-tools .tb-inp{background:#0b1219;color:#e2e8f0;border:1px solid #2e3b4e;
 border-radius:5px;padding:4px 9px;font-size:.78rem;outline:none;box-sizing:border-box;}
.bagov-tools .tb-inp:focus{border-color:#34d399;}
.bagov-tools .tb-inp.sm{width:58px;}
.bagov-tools .tb-sel{background:#0b1219;color:#cbd5e1;border:1px solid #2e3b4e;
 border-radius:5px;padding:4px 7px;font-size:.77rem;cursor:pointer;outline:none;}
.bagov-tools .tb-btn{background:#22303d;color:#6ee7b7;border:1px solid #34d399;
 border-radius:5px;padding:4px 11px;font-size:.76rem;cursor:pointer;white-space:nowrap;}
.bagov-tools .tb-btn:hover{background:#2f3f50;}
.bagov-tools .tb-btn:disabled{opacity:.35;cursor:not-allowed;}
.bagov-tools .tb-btn.y{border-color:#fbbf24;color:#fcd34d;}
.bagov-tools .tb-btn.gold{border-color:#fbbf24;color:#fde68a;
 background:linear-gradient(180deg,rgba(251,191,36,.2),rgba(251,191,36,.04));font-weight:bold;}
.bagov-tools .tb-cap{font-size:.75rem;color:#94a3b8;margin-left:auto;white-space:nowrap;}
.bagov-tools .tb-cap b{color:#6ee7b7;}
.bagov-tools .tb-cap.warn b{color:#fbbf24;}
.bagov-tools .tb-cap.full b{color:#ef4444;}

.bagov-cats{display:flex;gap:5px;flex-wrap:wrap;flex:0 0 auto;}
.bagov-cat{background:#121a22;color:#94a3b8;border:1px solid #2e3b4e;border-radius:14px;
 padding:3px 11px;font-size:.75rem;cursor:pointer;}
.bagov-cat:hover{border-color:#34d399;color:#e2e8f0;}
.bagov-cat.on{color:#6ee7b7;border-color:#34d399;background:rgba(52,211,153,.14);font-weight:bold;}

.bagov-grid{display:grid;gap:6px;}
.bagov-cell{position:relative;aspect-ratio:1/1;border-radius:6px;background:#121a22;
 border:2px solid #2e3b4e;cursor:pointer;overflow:hidden;
 display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px;
 transition:transform .1s,box-shadow .12s,border-color .12s;box-sizing:border-box;}
.bagov-cell:hover{transform:translateY(-2px) scale(1.04);z-index:3;}
.bagov-cell.checked{box-shadow:inset 0 0 0 2px #fbbf24;}
.bagov-cell.sel{outline:2px solid #fff;outline-offset:-2px;}
.bagov-cell .cu{position:absolute;left:0;right:0;top:0;height:3px;}
.bagov-cell .ci{font-size:1.22rem;line-height:1.1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6));}
.bagov-cell .cn{font-size:.57rem;line-height:1.15;text-align:center;max-width:100%;
 overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px;}
.bagov-cell .cl{position:absolute;left:2px;bottom:1px;font-size:.54rem;color:#fbbf24;font-weight:bold;}
.bagov-cell .cf{position:absolute;right:2px;top:1px;font-size:.54rem;color:#fbbf24;font-weight:bold;}
.bagov-cell .ck{position:absolute;left:2px;top:1px;font-size:.6rem;}
.bagov-cell .cc{position:absolute;right:2px;bottom:1px;font-size:.51rem;color:#67e8f9;}
.bagov-cell .cx{position:absolute;left:1px;bottom:1px;font-size:.5rem;color:#dc2626;font-weight:bold;}
.bagov-cell .ce{position:absolute;left:2px;top:1px;font-size:.58rem;color:#34d399;font-weight:bold;}
.bagov-cell.craftcell{box-shadow:0 0 12px rgba(0,229,255,.9),inset 0 0 8px rgba(0,229,255,.25);}
.bagov-empty{color:#64748b;font-size:.82rem;text-align:center;padding:30px 10px;}

/* ══ 道具欄收納 ══ */
.bagov-fold{border:1px solid #2e3b4e;border-radius:7px;background:#0c1219;
 flex:0 0 auto;overflow:hidden;}
.bagov-fold > summary{cursor:pointer;list-style:none;padding:8px 12px;font-size:.84rem;
 font-weight:bold;color:#fbbf24;background:linear-gradient(90deg,#141b23,#18202c);
 display:flex;align-items:center;gap:8px;user-select:none;}
.bagov-fold > summary::-webkit-details-marker{display:none;}
.bagov-fold > summary::before{content:'▸';color:#64748b;transition:transform .15s;}
.bagov-fold[open] > summary::before{transform:rotate(90deg);}
.bagov-fold > summary:hover{color:#fcd34d;}
.bagov-fold .fold-body{padding:10px 11px;border-top:1px solid #2e3b4e;}
.bagov-fold .fold-note{margin-left:auto;font-size:.7rem;color:#64748b;font-weight:normal;}
.bagov-fold .inv-filter-bar{margin-bottom:8px!important;}

/* ══ ★ 通貨倉庫（PoE 風）══ */
.bagov-stash-top{background:linear-gradient(90deg,#241d10,#1c2432);border:1px solid #fbbf24;
 border-radius:7px;padding:9px 12px;flex:0 0 auto;}
.bagov-stash-top .st-head{display:flex;align-items:center;gap:9px;flex-wrap:wrap;}
.bagov-stash-top .st-title{font-size:.9rem;font-weight:bold;color:#fde68a;}
.bagov-stash-top .st-note{font-size:.71rem;color:#94a3b8;}
.bagov-stash-top .st-tgt{margin-left:auto;font-size:.76rem;color:#7dd3fc;}
.bagov-stash-top .st-tgt b{color:#6ee7b7;}
.bagov-tabsbar{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px;}
.bagov-stab{background:#121a22;color:#94a3b8;border:1px solid #2e3b4e;border-radius:5px 5px 0 0;
 padding:4px 14px;font-size:.76rem;cursor:pointer;border-bottom:none;}
.bagov-stab.on{color:#fde68a;border-color:#fbbf24;background:rgba(251,191,36,.12);font-weight:bold;}

.bagov-sgrid{background:#0c1117;border:1px solid #3a3320;border-radius:0 6px 6px 6px;
 padding:10px;flex:0 0 auto;}
.bagov-sgrid .sg-label{font-size:.72rem;color:#94a3b8;margin-bottom:7px;display:flex;
 align-items:center;gap:8px;flex-wrap:wrap;}
.bagov-sgrid .sg-cells{display:grid;gap:6px;}
.bagov-orb{position:relative;aspect-ratio:1/1;background:#131a22;border:1px solid #3a4453;
 border-radius:5px;cursor:pointer;display:flex;flex-direction:column;align-items:center;
 justify-content:center;gap:1px;padding:2px;box-sizing:border-box;
 transition:transform .1s,border-color .12s,box-shadow .12s;}
.bagov-orb:hover:not(.off){transform:translateY(-2px) scale(1.05);z-index:3;}
.bagov-orb .oi{font-size:1.35rem;line-height:1;}
.bagov-orb .on{font-size:.56rem;color:#cbd5e1;text-align:center;max-width:100%;
 overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.bagov-orb .oc{position:absolute;right:2px;bottom:1px;font-size:.58rem;font-weight:bold;
 color:#fff;text-shadow:0 1px 3px #000;}
.bagov-orb .ot{position:absolute;left:2px;top:1px;font-size:.5rem;color:#64748b;}
.bagov-orb.off{opacity:.34;cursor:not-allowed;filter:grayscale(.75);}
.bagov-orb.empty{background:#0e141b;border-style:dashed;cursor:default;}
.bagov-orb.vaal{border-color:#dc2626;box-shadow:0 0 8px rgba(220,38,38,.5);}

.bagov-tgtbox{background:#121a22;border:1px solid #00e5ff;border-radius:7px;padding:9px 11px;
 flex:0 0 auto;}
.bagov-tgtbox .tb-h{font-size:.8rem;font-weight:bold;color:#67e8f9;margin-bottom:6px;
 display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.bagov-tgtbox .tb-h .tb-n{font-size:.7rem;color:#94a3b8;font-weight:normal;margin-left:auto;}
.bagov-tgtbox .tb-empty{font-size:.76rem;color:#64748b;line-height:1.6;}
.bagov-mods{font-size:.75rem;line-height:1.6;}
.bagov-mods .m-base{color:#cbd5e1;}
.bagov-mods .m-imp{color:#34d399;font-weight:bold;}
.bagov-mods .m-pf{color:#38bdf8;}
.bagov-mods .m-sf{color:#a78bfa;}
.bagov-mods .m-uq{color:#f97316;font-weight:bold;}
.bagov-mods .m-corr{color:#dc2626;font-weight:bold;}
.bagov-mods .m-none{color:#64748b;}

.bagov-foot{padding:7px 14px;font-size:.73rem;color:#94a3b8;background:#121a22;
 border-top:1px solid #23303e;display:flex;gap:12px;flex-wrap:wrap;align-items:center;flex:0 0 auto;}
.bagov-foot b{color:#e2e8f0;}

/* ══ ★ 雙裝備視窗 ══ */
.bagov-iw{position:fixed;z-index:9900;width:308px;max-width:46vw;pointer-events:none;
 background:rgba(8,12,17,.985);border:2px solid #334155;border-radius:7px;
 box-shadow:0 16px 46px rgba(0,0,0,.92);padding:10px 12px;font-size:.76rem;
 color:#cbd5e1;line-height:1.55;}
.bagov-iw.hover{border-color:#34d399;}
.bagov-iw.equipped{border-color:#64748b;opacity:.97;}
.bagov-iw .iwtag{font-size:.63rem;padding:1px 7px;border-radius:8px;display:inline-block;
 margin-bottom:5px;font-weight:bold;}
.bagov-iw.hover .iwtag{background:rgba(52,211,153,.18);border:1px solid #34d399;color:#6ee7b7;}
.bagov-iw.equipped .iwtag{background:rgba(100,116,139,.18);border:1px solid #475569;color:#94a3b8;}
.bagov-iw .th{font-size:.94rem;font-weight:bold;margin-bottom:2px;}
.bagov-iw .ts{font-size:.68rem;color:#64748b;margin-bottom:6px;}
.bagov-iw .tsec{margin-top:6px;padding-top:6px;border-top:1px dashed #26313d;}
.bagov-iw .tline{display:flex;justify-content:space-between;gap:8px;font-size:.73rem;}
.bagov-iw .tline .k{color:#94a3b8;}
.bagov-iw .tline .v{color:#e2e8f0;font-weight:bold;text-align:right;max-width:62%;}
.bagov-iw .imp{color:#34d399;font-weight:bold;padding:3px 0;font-size:.75rem;}
.bagov-iw .pf{color:#38bdf8;font-size:.74rem;}
.bagov-iw .sf{color:#a78bfa;font-size:.74rem;}
.bagov-iw .uq{color:#f97316;font-weight:bold;font-size:.75rem;}
.bagov-iw .dim{color:#64748b;font-size:.72rem;}
.bagov-iw .corr{color:#dc2626;font-weight:bold;}
.bagov-iw .lore{color:#64748b;font-style:italic;font-size:.71rem;margin-top:5px;}

.bagov-diff{position:fixed;z-index:9902;pointer-events:none;font-size:.73rem;font-weight:bold;
 padding:3px 11px;border-radius:11px;border:1px solid #fbbf24;
 background:rgba(8,12,17,.97);box-shadow:0 6px 20px rgba(0,0,0,.8);white-space:nowrap;}
.bagov-diff.up{border-color:#4ade80;color:#4ade80;}
.bagov-diff.dn{border-color:#f87171;color:#f87171;}
.bagov-diff.eq{border-color:#64748b;color:#94a3b8;}

.bagov-ctx{position:fixed;z-index:9950;min-width:172px;background:#0d141b;
 border:1px solid #34d399;border-radius:6px;box-shadow:0 12px 34px rgba(0,0,0,.88);
 padding:4px;font-size:.78rem;}
.bagov-ctx button{display:block;width:100%;text-align:left;background:transparent;
 border:none;color:#cbd5e1;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:.78rem;}
.bagov-ctx button:hover:not(:disabled){background:#1b2733;color:#6ee7b7;}
.bagov-ctx button:disabled{opacity:.4;cursor:not-allowed;}
.bagov-ctx button.danger:hover:not(:disabled){background:#3b1517;color:#fca5a5;}
.bagov-ctx .sep{height:1px;background:#23303e;margin:3px 2px;}

.tab-btn.bagov-modal-open{box-shadow:0 0 10px rgba(52,211,153,.6)!important;
 border-color:#34d399!important;color:#6ee7b7!important;}

#bagov-float{position:fixed;z-index:9550;right:16px;bottom:16px;
 display:flex;align-items:center;gap:6px;
 background:linear-gradient(180deg,#16302a,#0f231e);
 color:#a7f3d0;border:2px solid #34d399;border-radius:24px;
 padding:9px 16px;font-size:.85rem;font-weight:800;cursor:pointer;
 box-shadow:0 6px 24px rgba(0,0,0,.55);}
#bagov-float .fb{display:inline-block;background:#ef4444;color:#fff;border-radius:9px;
 font-size:.66rem;padding:0 6px;min-width:17px;text-align:center;line-height:17px;font-weight:bold;}

#bagov-hold{display:none!important;}

@media (max-width:1000px){
  .bagov-left{width:250px;flex-basis:250px;}
  .bagov-slot{min-height:44px;padding:4px 6px;}
  .bagov-slot .si{font-size:.66rem;}
  .bagov-iw{width:268px;}
}
@media (max-width:820px){
  .bagov-left{width:214px;flex-basis:214px;}
  .bagov-slot .sn{display:none;}
  .bagov-slot{min-height:38px;}
  .bagov-iw{width:min(46vw,240px);font-size:.72rem;}
}
`;
    var st = document.createElement('style');
    st.id = 'bagov-style';
    st.appendChild(document.createTextNode(css));
    host.appendChild(st);
  }

  /* ══════════════════════════════════════════════════════
     查詢
     ══════════════════════════════════════════════════════ */
  var CATS = [
    { id: 'all',     name: '全部',   f: function () { return true; } },
    { id: 'weapon',  name: '武器',   f: function (it) { var s = String(it.slotType || ''); return s === 'mainhand' || s === 'offhand'; } },
    { id: 'armor',   name: '防具',   f: function (it) { var s = String(it.slotType || ''); return ['helmet','body','gloves','boots','belt'].indexOf(s) !== -1; } },
    { id: 'jewel',   name: '飾品',   f: function (it) { var s = String(it.slotType || ''); return s === 'amulet' || s === 'ring'; } },
    { id: 'unique',  name: '傳奇',   f: function (it) { return rarityOf(it).key === 'unique'; } },
    { id: 'corrupt', name: '已汙染', f: function (it) { return !!it.corrupted; } }
  ];

  function bagAll() { return (ACC.bag() || []).filter(function (x) { return x && typeof x === 'object'; }); }
  function findInBag(uid) {
    var b = ACC.bag();
    for (var i = 0; i < b.length; i++) if (b[i] && b[i].uid === uid) return b[i];
    return null;
  }
  function findEquipped(uid) {
    var e = ACC.equipped() || {}, hit = null;
    Object.keys(e).forEach(function (k) { if (e[k] && uidOf(e[k]) === uid) hit = e[k]; });
    return hit;
  }
  function findAny(uid) { return findInBag(uid) || findEquipped(uid); }
  function equippedUidMap() {
    var m = {}, eq = ACC.equipped() || {};
    Object.keys(eq).forEach(function (k) { if (eq[k] && eq[k].uid) m[String(eq[k].uid)] = k; });
    return m;
  }
  function craftTargetUid() {
    return safe(function () {
      var p = APP().poeSys;
      return p && p.selectedTargetUid ? String(p.selectedTargetUid) : null;
    }, null);
  }
  function craftTargetItem() {
    var u = craftTargetUid();
    return u ? findAny(u) : null;
  }

  function sortVal(it, k) {
    if (k === 'power') return ACC.itemPower(it);
    if (k === 'rarity') return rarityOf(it).star;
    if (k === 'lv') return num(it.reqLv, 1);
    if (k === 'price') return sellPrice(it);
    if (k === 'slot') return String(it.slotType || 'zz');
    return 0;
  }

  function matchFilter(it) {
    var cat = null;
    CATS.forEach(function (c) { if (c.id === _pref.cat) cat = c; });
    if (cat && !cat.f(it)) return false;
    if (_pref.rarity && rarityOf(it).key !== _pref.rarity) return false;
    if (_pref.slot) {
      var st = String(it.slotType || '');
      if (_pref.slot === 'ring') { if (st !== 'ring') return false; }
      else if (st !== _pref.slot) return false;
    }
    var lv = num(it.reqLv, 1);
    if (_pref.lvMin !== '' && lv < num(_pref.lvMin, 0)) return false;
    if (_pref.lvMax !== '' && lv > num(_pref.lvMax, 9999)) return false;
    if (_pref.onlyUsable && lv > ACC.myLevel()) return false;
    if (_pref.hideEquipped && equippedUidMap()[uidOf(it)]) return false;
    if (_pref.q) {
      var q = String(_pref.q).trim().toLowerCase();
      var hay = [it.name, it.rareTitle, it.implicit && it.implicit.text]
        .concat((it.prefixes || []).map(function (p) { return (p.label || '') + ' ' + (p.tName || ''); }))
        .concat((it.suffixes || []).map(function (s) { return (s.label || '') + ' ' + (s.tName || ''); }))
        .concat((it.uniqueMods || []).map(function (u) { return u.text || ''; }))
        .join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }
  function filteredSorted() {
    var list = bagAll().filter(matchFilter);
    var k = _pref.sort, asc = _pref.asc;
    list.sort(function (a, b) {
      if (k === 'name') return String(a.name || '').localeCompare(String(b.name || '')) * (asc ? 1 : -1);
      var va = sortVal(a, k), vb = sortVal(b, k);
      if (va === vb) { va = num(a.reqLv, 1); vb = num(b.reqLv, 1); }
      return (va - vb) * (asc ? 1 : -1);
    });
    return list;
  }

  /* ══════════════════════════════════════════════════════
     對比對象
     ══════════════════════════════════════════════════════ */
  function compareTarget(item) {
    if (!item) return null;
    var st = String(item.slotType || '');
    var eq = ACC.equipped() || {};
    if (st === 'ring') {
      var list = [eq.ring_left, eq.ring_right].filter(Boolean);
      if (!list.length) return null;
      if (list.length === 1) return list[0];
      var w = list[0];
      list.forEach(function (x) { if (ACC.itemPower(x) < ACC.itemPower(w)) w = x; });
      return w;
    }
    if (!st) return null;
    return eq[st] || null;
  }

  /* ══════════════════════════════════════════════════════
     ★ 裝備詳細視窗 HTML（給雙視窗用）
     ══════════════════════════════════════════════════════ */
  function itemDetailHtml(it) {
    if (!it) return '<div class="dim">（無）</div>';
    var r = rarityOf(it), fl = num(it._forgeLv, 0);
    var reqLv = num(it.reqLv, 1), canUse = ACC.myLevel() >= reqLv;
    var h = '';
    h += '<div class="th" style="color:' + r.color + '">[' + r.name + '] ' +
      esc(String(it.rareTitle || '') + String(it.name || '未知')) + (fl > 0 ? ' +' + fl : '') + '</div>';
    h += '<div class="ts">需求 Lv.' + reqLv + (canUse ? '' : ' <span class="corr">（等級不足）</span>') +
      ' · ' + esc(slotNameOf(String(it.slotType || ''))) +
      (it.corrupted ? ' · <span class="corr">[已汙染]</span>' : '') +
      (isLocked(it) ? ' · 🔒' : '') + '</div>';

    if (it.baseStats && typeof it.baseStats === 'object' && Object.keys(it.baseStats).length) {
      h += '<div class="tline"><span class="k">固有基底</span><span class="v">' + esc(formatBonus(it.baseStats)) + '</span></div>';
    }
    if (it.implicit && it.implicit.text) h += '<div class="imp">✨ ' + esc(it.implicit.text) + '</div>';

    var uq = it.uniqueMods || [], pf = it.prefixes || [], sf = it.suffixes || [];
    if (uq.length || pf.length || sf.length) {
      h += '<div class="tsec">';
      uq.forEach(function (u) { h += '<div class="uq">' + esc(u.text || '') + '</div>'; });
      pf.forEach(function (p) {
        h += '<div class="pf">🔹 [' + esc(p.tName || '') + '] ' + esc(p.label || '') +
          ' <b>+' + p.val + esc(p.unit || '') + '</b> <span class="dim">(' + p.min + '~' + p.max + ')</span></div>';
      });
      sf.forEach(function (s) {
        h += '<div class="sf">🔸 [' + esc(s.tName || '') + '] ' + esc(s.label || '') +
          ' <b>+' + s.val + esc(s.unit || '') + '</b> <span class="dim">(' + s.min + '~' + s.max + ')</span></div>';
      });
      h += '</div>';
    } else if (!it.implicit) {
      h += '<div class="tsec"><div class="dim">白裝無隨機詞綴 — 可用蛻變石／點金石打造</div></div>';
    }
    if (it.rarity === 'unique') {
      h += '<div class="tsec"><div class="uq" style="font-size:.72rem">🟠 傳奇暗金：僅【瓦爾寶珠】可作用</div></div>';
    }
    h += '<div class="tsec">' +
      '<div class="tline"><span class="k">裝備總效</span><span class="v">' + esc(formatBonus(ACC.itemBonus(it))) + '</span></div>' +
      '<div class="tline"><span class="k">戰力評分</span><span class="v">' + fmt(ACC.itemPower(it)) + '</span></div>' +
      '<div class="tline"><span class="k">典當價</span><span class="v" style="color:#fcd34d">' + fmt(sellPrice(it)) + ' 兩</span></div>' +
      '</div>';
    if (it.desc) h += '<div class="lore">' + esc(it.desc) + '</div>';
    return h;
  }

  /* ══════════════════════════════════════════════════════
     ★ 雙裝備視窗
     ══════════════════════════════════════════════════════ */
  function ensureIW(k) {
    if (_iwEl[k] && _iwEl[k].parentNode) return _iwEl[k];
    var el = document.createElement('div');
    el.className = 'bagov-iw';
    el.style.display = 'none';
    document.body.appendChild(el);
    _iwEl[k] = el;
    return el;
  }
  function ensureBadge() {
    if (_iwEl.badge && _iwEl.badge.parentNode) return _iwEl.badge;
    var el = document.createElement('div');
    el.className = 'bagov-diff';
    el.style.display = 'none';
    document.body.appendChild(el);
    _iwEl.badge = el;
    return el;
  }
  function placeEl(el, x, y) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var left = x, top = y;
    if (left + r.width > vw - 8) left = Math.max(8, vw - r.width - 8);
    if (left < 8) left = 8;
    if (top + r.height > vh - 8) top = Math.max(8, vh - r.height - 8);
    if (top < 8) top = 8;
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
  }

  /** 顯示雙視窗：右＝滑鼠目標、左＝已裝備 */
  function showPair(item, x, y) {
    var A = ensureIW('a'), B = ensureIW('b'), badge = ensureBadge();
    var old = compareTarget(item);

    /* 右視窗：滑鼠目標 */
    A.className = 'bagov-iw hover';
    A.innerHTML = '<span class="iwtag">🆕 滑鼠目標</span>' + itemDetailHtml(item);
    A.style.display = 'block';

    /* 左視窗：當前角色同部位 */
    if (old) {
      B.className = 'bagov-iw equipped';
      B.innerHTML = '<span class="iwtag">✅ 已裝備（' + esc(slotNameOf(String(old.slotType || ''))) + '）</span>' + itemDetailHtml(old);
      B.style.display = 'block';
    } else {
      B.style.display = 'none';
    }

    /* 定位：A 在游標右側，B 在 A 左側 */
    placeEl(A, x + 18, y + 14);
    var ar = A.getBoundingClientRect();
    if (old) {
      var br = B.getBoundingClientRect();
      var bx = ar.left - br.width - 10;
      if (bx < 8) bx = Math.min(window.innerWidth - br.width - 8, ar.right + 10);
      placeEl(B, bx, ar.top);
    }

    /* 差異徽章（置於 A 上方） */
    if (CFG.COMPARE) {
      var pa = ACC.itemPower(item);
      var pb = old ? ACC.itemPower(old) : 0;
      var d = pa - pb;
      var cls = !old ? 'up' : (Math.abs(d) < 1 ? 'eq' : (d > 0 ? 'up' : 'dn'));
      badge.className = 'bagov-diff ' + cls;
      badge.textContent = !old
        ? ('⚖️ 該部位未裝備　戰力 ' + fmt(pa))
        : (Math.abs(d) < 1 ? ('⚖️ 戰力相當 ' + fmt(pa))
          : ('⚖️ 戰力 ' + (d > 0 ? '▲ +' : '▼ −') + fmt(Math.abs(d)) + '（' + fmt(pa) + ' vs ' + fmt(pb) + '）'));
      badge.style.display = 'block';
      var ar2 = A.getBoundingClientRect();
      placeEl(badge, ar2.left, ar2.top - 26);
    } else {
      badge.style.display = 'none';
    }
  }
  function hidePair() {
    if (_ttTimer) { clearTimeout(_ttTimer); _ttTimer = null; }
    ['a', 'b', 'badge'].forEach(function (k) { if (_iwEl[k]) _iwEl[k].style.display = 'none'; });
  }
  function placePair(x, y) {
    if (!_iwEl.a || _iwEl.a.style.display !== 'block') return;
    placeEl(_iwEl.a, x + 18, y + 14);
    var ar = _iwEl.a.getBoundingClientRect();
    if (_iwEl.b && _iwEl.b.style.display === 'block') {
      var br = _iwEl.b.getBoundingClientRect();
      var bx = ar.left - br.width - 10;
      if (bx < 8) bx = Math.min(window.innerWidth - br.width - 8, ar.right + 10);
      placeEl(_iwEl.b, bx, ar.top);
    }
    if (_iwEl.badge && _iwEl.badge.style.display === 'block') placeEl(_iwEl.badge, ar.left, ar.top - 26);
  }

  /* ══════════════════════════════════════════════════════
     右鍵選單
     ══════════════════════════════════════════════════════ */
  function hideCtx() {
    if (_ctxCloser) { document.removeEventListener('mousedown', _ctxCloser, true); _ctxCloser = null; }
    if (_ctxEl && _ctxEl.parentNode) _ctxEl.parentNode.removeChild(_ctxEl);
    _ctxEl = null;
  }
  function openMenu(x, y, items) {
    hideCtx();
    var el = document.createElement('div');
    el.className = 'bagov-ctx';
    items.forEach(function (b) {
      if (b.sep) { var d = document.createElement('div'); d.className = 'sep'; el.appendChild(d); return; }
      var btn = document.createElement('button');
      btn.textContent = b.t;
      if (b.dis) btn.disabled = true;
      if (b.danger) btn.className = 'danger';
      if (!b.dis) btn.addEventListener('click', function () { hideCtx(); try { b.fn(); } catch (e) { warn(e); } });
      el.appendChild(btn);
    });
    document.body.appendChild(el);
    var r = el.getBoundingClientRect();
    el.style.left = Math.max(8, Math.min(x, window.innerWidth - r.width - 8)) + 'px';
    el.style.top = Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) + 'px';
    _ctxEl = el;
    _ctxCloser = function (ev) { if (el.contains && el.contains(ev.target)) return; hideCtx(); };
    setTimeout(function () { document.addEventListener('mousedown', _ctxCloser, true); }, 0);
  }

  function itemMenu(x, y, it) {
    var st = String(it.slotType || '');
    var locked = isLocked(it);
    var enough = num(it.reqLv, 1) <= ACC.myLevel();
    var eqMap = equippedUidMap();
    var items = [];
    if (enough && st === 'ring') {
      items.push({ t: '💍 穿左戒', dis: !!eqMap[uidOf(it)], fn: function () { doEquip(it, 'ring_left'); } });
      items.push({ t: '💍 穿右戒', dis: !!eqMap[uidOf(it)], fn: function () { doEquip(it, 'ring_right'); } });
    } else if (st) {
      items.push({
        t: eqMap[uidOf(it)] ? '✅ 已裝備' : (enough ? itemIcon(it) + ' 穿戴' : '🔒 需 Lv.' + num(it.reqLv, 1)),
        dis: !enough || !!eqMap[uidOf(it)],
        fn: function () { doEquip(it, null); }
      });
    }
    items.push({ t: '🗃️ 送去通貨倉庫改造', fn: function () { selectCraft(it, true); } });
    items.push({ t: '🎯 選為改造目標', fn: function () { selectCraft(it, false); } });
    items.push({ t: locked ? '🔓 解除鎖定' : '🔒 鎖定', fn: function () { setLocked(it, !locked); renderModal(); } });
    items.push({ sep: true });
    items.push({ t: '💰 典當（' + fmt(sellPrice(it)) + ' 兩）', danger: true, dis: locked, fn: function () { doSell(it); } });
    if (ACC.salvage) items.push({ t: '🔨 分解', danger: true, dis: locked, fn: function () { doSalvage(it); } });
    items.push({ sep: true });
    items.push({
      t: _checked[lkey(it)] ? '☐ 取消勾選' : '☑ 加入勾選',
      fn: function () {
        if (_checked[lkey(it)]) delete _checked[lkey(it)]; else _checked[lkey(it)] = 1;
        renderModal();
      }
    });
    openMenu(x, y, items);
  }

  function slotMenu(x, y, slotId) {
    var it = (ACC.equipped() || {})[slotId];
    if (!it) return;
    openMenu(x, y, [
      { t: '🗃️ 送去通貨倉庫改造', fn: function () { selectCraft(it, true); } },
      { t: '🔄 卸下', dis: !ACC.unequip, fn: function () { doUnequip(slotId); } },
      { sep: true },
      {
        t: '💰 卸下並典當（' + fmt(sellPrice(it)) + ' 兩）', danger: true, dis: !ACC.sell || !ACC.unequip,
        fn: function () {
          if (ACC.unequip(slotId)) { var now = findInBag(uidOf(it)); if (now) doSell(now); renderModal(); }
        }
      }
    ]);
  }

  /* ══════════════════════════════════════════════════════
     動作
     ══════════════════════════════════════════════════════ */
  function toast(msg, kind) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:50%;bottom:78px;transform:translateX(-50%);z-index:9999;' +
      'background:rgba(9,14,20,.96);border:1px solid ' + (kind === 'err' ? '#ef4444' : '#34d399') + ';' +
      'color:' + (kind === 'err' ? '#fca5a5' : '#6ee7b7') + ';padding:8px 16px;border-radius:6px;' +
      'font-size:.82rem;box-shadow:0 10px 30px rgba(0,0,0,.7);pointer-events:none;';
    el.textContent = msg;
    if (document.body) document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1700);
  }

  function afterChange() {
    var a = APP();
    if (typeof a.renderAll === 'function') safe(function () { a.renderAll(); });
    refreshOriginals();
    if (_open) renderModal();
    updateFloatBadge();
  }

  function selectCraft(it, gotoStash) {
    var poe = safe(function () { return APP().poeSys; }, null);
    if (!poe || !it) return;
    poe.selectedTargetUid = it.uid;
    toast('改造目標：' + String(it.name || ''));
    if (gotoStash) { _page = 'stash'; renderModal(); }
    else { renderModal(); }
  }

  function findEquipUI() {
    var g = APP();
    var keys = ['uiEquipMarket', 'uiEquip', 'equipUI', 'uiMarket', 'uiEquipMarketSys'];
    for (var i = 0; i < keys.length; i++) {
      var v = g[keys[i]];
      if (v && typeof v.renderInventoryTab === 'function') return v;
    }
    var ks = Object.keys(g);
    for (var j = 0; j < ks.length; j++) {
      var o = g[ks[j]];
      if (o && typeof o === 'object' && typeof o.renderInventoryTab === 'function') return o;
    }
    return null;
  }

  function refreshCraft() {
    var ui = findEquipUI();
    if (!ui) return false;
    try { ui.renderInventoryTab(); return true; }
    catch (e) { warn('刷新失敗：', e); return false; }
  }

  function doEquip(it, targetSlot) {
    if (!ACC.equip(it, targetSlot || null)) { toast('裝備失敗（等級不足或行囊已滿）', 'err'); return false; }
    toast('已裝備：' + String(it.name || ''));
    afterChange();
    return true;
  }
  function doUnequip(slotId) {
    if (!ACC.unequip(slotId)) { toast('卸下失敗（行囊已滿）', 'err'); return false; }
    toast('已卸下');
    afterChange();
    return true;
  }
  function doSell(it) {
    if (isLocked(it)) { toast('已鎖定，無法典當', 'err'); return false; }
    var p = sellPrice(it);
    if (!ACC.sell(it)) { toast('典當失敗', 'err'); return false; }
    toast('已典當：' + String(it.name || '') + '（+' + fmt(p) + ' 兩）');
    afterChange();
    return true;
  }
  function doSalvage(it) {
    if (!ACC.salvage) { toast('本作未提供分解功能', 'err'); return false; }
    if (isLocked(it)) { toast('已鎖定，無法分解', 'err'); return false; }
    if (!ACC.salvage(it)) { toast('分解失敗', 'err'); return false; }
    toast('已分解：' + String(it.name || ''));
    afterChange();
    return true;
  }

  function bestGear() {
    var myLv = ACC.myLevel(), n = 0, used = {};
    slotDefs().forEach(function (s) {
      var bag = ACC.bag(), eq = ACC.equipped() || {};
      var cur = eq[s.id], bestP = cur ? ACC.itemPower(cur) : 0, best = null;
      bag.forEach(function (it) {
        if (!it || !it.uid || used[it.uid]) return;
        if (num(it.reqLv, 1) > myLv) return;
        if (isLocked(it)) return;
        var st = String(it.slotType || '');
        if (st === 'ring') { if (s.id !== 'ring_left' && s.id !== 'ring_right') return; }
        else if (st !== s.id) return;
        var p = ACC.itemPower(it);
        if (p > bestP) { bestP = p; best = it; }
      });
      if (best && ACC.equip(best, s.id)) { used[best.uid] = 1; n += 1; }
    });
    toast(n > 0 ? ('已自動換裝 ' + n + ' 件') : '沒有更好的裝備了', n > 0 ? '' : 'err');
    afterChange();
    return n;
  }

  function pickTargets(mode) {
    var list = bagAll(), out = [];
    if (mode === 'lowRarity') {
      list.forEach(function (it) {
        var k = rarityOf(it).key;
        if ((k === 'normal' || k === 'magic') && !isLocked(it)) out.push(it);
      });
    } else if (mode === 'lowPower') {
      var eq = ACC.equipped() || {};
      list.forEach(function (it) {
        if (isLocked(it)) return;
        var st = String(it.slotType || '');
        var cur = (st === 'ring') ? (eq.ring_left || eq.ring_right || null) : (st ? (eq[st] || null) : null);
        var cp = cur ? ACC.itemPower(cur) : 0;
        if (cp > 0 && ACC.itemPower(it) < cp * 0.7) out.push(it);
      });
    } else if (mode === 'dupe') {
      var best = {};
      list.forEach(function (it) {
        var k = String(it.name || '') + '|' + num(it.reqLv, 0);
        var p = ACC.itemPower(it);
        if (!best[k] || p > best[k].p) best[k] = { p: p, it: it };
      });
      var kept = {};
      list.forEach(function (it) {
        var k = String(it.name || '') + '|' + num(it.reqLv, 0);
        if (!kept[k]) { kept[k] = 1; if (best[k] && best[k].it === it) return; }
        if (isLocked(it)) return;
        out.push(it);
      });
    } else if (mode === 'checked') {
      list.forEach(function (it) { if (_checked[lkey(it)] && !isLocked(it)) out.push(it); });
    } else if (mode === 'unlockedAll') {
      list.forEach(function (it) { if (!isLocked(it)) out.push(it); });
    }
    return out;
  }

  function batchPurge(mode) {
    var targets = pickTargets(mode);
    var LABEL = {
      lowRarity: '低品質（普通／魔法）', lowPower: '低戰力（低於現有 70%）',
      dupe: '重複（同名同等級）', checked: '已勾選', unlockedAll: '全部未鎖定'
    };
    if (!targets.length) { toast('沒有符合條件的裝備', 'err'); return 0; }
    var name = LABEL[mode] || mode;
    if (!window.confirm('確定要典當 ' + targets.length + ' 件「' + name + '」裝備？\n（已鎖定會自動跳過，此動作無法復原）')) return 0;
    var fn = ACC.salvage || ACC.sell;
    if (!fn) { toast('未接上典當函式', 'err'); return 0; }
    var n = 0, gold = 0;
    targets.forEach(function (it) {
      var p = sellPrice(it);
      try { if (fn(it) !== false) { n += 1; gold += p; } } catch (e) {}
    });
    _checked = {};
    toast('已處理 ' + n + ' 件' + (gold ? '，共 +' + fmt(gold) + ' 兩' : ''));
    afterChange();
    return n;
  }

  /* ══════════════════════════════════════════════════════
     ★ 通貨倉庫（PoE 風）
     ══════════════════════════════════════════════════════ */
  function currencyDB() {
    return safe(function () { return (window.HY.Data && window.HY.Data.CURRENCIES) || {}; }, {}) || {};
  }
  function wallet() {
    return safe(function () { return APP().charSys.rootState.currencies; }, {}) || {};
  }
  function orbIcon(orb) {
    if (orb && orb.icon) return orb.icon;
    var n = String((orb && orb.name) || '') + String((orb && orb.id) || '');
    if (/蛻變|transmut/i.test(n)) return '🔵';
    if (/增幅|augment/i.test(n)) return '🟦';
    if (/點金|alch/i.test(n)) return '🟡';
    if (/混沌|chaos/i.test(n)) return '🟠';
    if (/富豪|regal/i.test(n)) return '🟣';
    if (/崇高|exalt/i.test(n)) return '🟨';
    if (/神聖|divine/i.test(n)) return '⚪';
    if (/無效|annul/i.test(n)) return '⚫';
    if (/瓦爾|vaal/i.test(n)) return '🩸';
    if (/改造|alteration/i.test(n)) return '🔷';
    if (/鏈結|fusing/i.test(n)) return '🔗';
    if (/重鑄|scour|chaos/i.test(n)) return '🌀';
    return '💠';
  }
  function orbBlocked(orb, tgt) {
    if (!orb) return { off: true, why: '未知通貨' };
    if (!tgt) return { off: true, why: '請先選擇改造目標' };
    if (tgt.corrupted) return { off: true, why: '此裝備已汙染，無法再改造' };
    var cnt = num(wallet()[orb.id], 0);
    if (cnt <= 0) return { off: true, why: '數量不足（0）' };
    if (tgt.rarity === 'unique' && orb.id !== 'orb_vaal') return { off: true, why: '傳奇暗金僅【瓦爾寶珠】可作用' };
    return { off: false, why: '' };
  }

  function itemModsHtml(it) {
    if (!it) return '';
    var h = '<div class="bagov-mods">';
    h += '<div class="m-base">固有基底：' + esc(formatBonus(it.baseStats)) + '</div>';
    if (it.implicit && it.implicit.text) h += '<div class="m-imp">✨ ' + esc(it.implicit.text) + '</div>';
    var uq = it.uniqueMods || [], pf = it.prefixes || [], sf = it.suffixes || [];
    uq.forEach(function (u) { h += '<div class="m-uq">' + esc(u.text || '') + '</div>'; });
    pf.forEach(function (p) {
      h += '<div class="m-pf">🔹 [前綴 ' + esc(p.tName || '') + '] ' + esc(p.label || '') +
        ' <b>+' + p.val + esc(p.unit || '') + '</b> <span style="color:#64748b">(' + p.min + '~' + p.max + ')</span></div>';
    });
    sf.forEach(function (s) {
      h += '<div class="m-sf">🔸 [後綴 ' + esc(s.tName || '') + '] ' + esc(s.label || '') +
        ' <b>+' + s.val + esc(s.unit || '') + '</b> <span style="color:#64748b">(' + s.min + '~' + s.max + ')</span></div>';
    });
    if (!uq.length && !pf.length && !sf.length && !it.implicit) {
      h += '<div class="m-none">（白裝無隨機詞綴）</div>';
    }
    if (it.corrupted) h += '<div class="m-corr">【已汙染 Corrupted】</div>';
    h += '</div>';
    return h;
  }

  function stashGridHtml() {
    var D = currencyDB();
    var ids = Object.keys(D);
    var tgt = craftTargetItem();
    var w = wallet();
    var n = num(CFG.ORB_COLS, 10);
    var cells = ids.length ? ids : [];

    var h = '<div class="bagov-sgrid">';
    h += '<div class="sg-label">🗃️ 通貨格（點擊通貨 → 直接作用於上方改造目標）' +
      '<span style="margin-left:auto;color:#64748b">共 ' + cells.length + ' 種</span></div>';
    h += '<div class="sg-cells" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">';

    if (!cells.length) {
      h += '<div class="bagov-empty" style="grid-column:1/-1">HY.Data.CURRENCIES 為空 — 通貨資料未載入。</div>';
    } else {
      cells.forEach(function (id) {
        var orb = D[id];
        var bl = orbBlocked(orb, tgt);
        var cnt = num(w[id], 0);
        var cls = 'bagov-orb';
        if (bl.off) cls += ' off';
        if (id === 'orb_vaal') cls += ' vaal';
        h += '<button class="' + cls + '" data-orb="' + esc(id) + '"' + (bl.off ? ' disabled' : '') + '>' +
          '<span class="ot">' + esc(String(orb.tierLabel || '').slice(0, 4)) + '</span>' +
          '<span class="oi">' + orbIcon(orb) + '</span>' +
          '<span class="on">' + esc(String(orb.name || id).slice(0, 5)) + '</span>' +
          '<span class="oc">' + cnt + '</span>' +
          '</button>';
      });
      /* 補空格，維持 PoE 格狀感 */
      var rem = cells.length % n;
      if (rem !== 0) {
        for (var i = 0; i < n - rem; i++) h += '<div class="bagov-orb empty"></div>';
      }
    }
    h += '</div></div>';
    return h;
  }

  function stashTargetHtml() {
    var tgt = craftTargetItem();
    var h = '<div class="bagov-tgtbox">';
    if (!tgt) {
      h += '<div class="tb-h">🎯 改造目標 <span class="tb-n">未選擇</span></div>' +
        '<div class="tb-empty">請點擊左側「十部位」中任一件<b>已裝備</b>的裝備，或先在行囊頁對裝備按右鍵選「🗃️ 送去通貨倉庫改造」。</div>';
      h += '</div>';
      return h;
    }
    var r = rarityOf(tgt);
    h += '<div class="tb-h">🎯 改造目標：<span style="color:' + r.color + '">' +
      esc(String(tgt.rareTitle || '') + String(tgt.name || '')) + '</span>' +
      '<span class="tb-n">[' + r.short + '] Lv.' + num(tgt.reqLv, 1) + '　戰力 ' + fmt(ACC.itemPower(tgt)) +
      (tgt.corrupted ? '　<span class="m-corr">[已汙染]</span>' : '') + '</span></div>';
    h += itemModsHtml(tgt);
    h += '</div>';
    return h;
  }

  function applyOrb(orbId) {
    var poe = safe(function () { return APP().poeSys; }, null);
    if (!poe) { toast('工藝系統未載入', 'err'); return; }
    var tgt = craftTargetItem();
    if (!tgt) { toast('請先選擇改造目標', 'err'); return; }
    var D = currencyDB(), orb = D[orbId];
    var bl = orbBlocked(orb, tgt);
    if (bl.off) { toast(bl.why, 'err'); return; }
    if (typeof poe.applyCurrencyToSelected !== 'function') { toast('此通貨無法使用', 'err'); return; }
    var ok = false;
    try { ok = poe.applyCurrencyToSelected(orbId); } catch (e) { warn(e); }
    if (!ok) { toast('使用失敗', 'err'); return; }
    toast('已使用【' + ((orb && orb.name) || orbId) + '】於【' + String(tgt.name || '') + '】');
    afterChange();
  }

  /* ══════════════════════════════════════════════════════
     原版節點：快取 / 寄放 / 掛載
     ══════════════════════════════════════════════════════ */
  function ensureHold() {
    var hold = document.getElementById('bagov-hold');
    if (!hold && document.body) {
      hold = document.createElement('div');
      hold.id = 'bagov-hold';
      document.body.appendChild(hold);
    }
    return hold;
  }
  function captureOriginals() {
    ensureHold();
    if (!_orig.craft) {
      var c = document.getElementById(CFG.CRAFT_ID);
      if (c) { _orig.craft = c; if (c.__bagovHome === undefined) c.__bagovHome = c.parentNode; }
    }
    if (!_orig.bagList) {
      var l = document.getElementById(CFG.BAG_LIST_ID);
      if (l) { _orig.bagList = l; if (l.__bagovHome === undefined) l.__bagovHome = l.parentNode; }
    }
    if (!_orig.bagFilter) {
      var f = document.querySelector(CFG.BAG_FILTER_SEL);
      if (f) { _orig.bagFilter = f; if (f.__bagovHome === undefined) f.__bagovHome = f.parentNode; }
    }
    return !!(_orig.craft || _orig.bagList);
  }
  function refreshOriginals() {
    var c = document.getElementById(CFG.CRAFT_ID);
    if (c && c !== _orig.craft) {
      if (_orig.craft && _orig.craft.parentNode) { try { _orig.craft.parentNode.removeChild(_orig.craft); } catch (e) {} }
      _orig.craft = c;
      if (c.__bagovHome === undefined) c.__bagovHome = c.parentNode;
    }
    var l = document.getElementById(CFG.BAG_LIST_ID);
    if (l && l !== _orig.bagList) {
      if (_orig.bagList && _orig.bagList.parentNode) { try { _orig.bagList.parentNode.removeChild(_orig.bagList); } catch (e) {} }
      _orig.bagList = l;
      if (l.__bagovHome === undefined) l.__bagovHome = l.parentNode;
    }
    var f = document.querySelector(CFG.BAG_FILTER_SEL);
    if (f && f !== _orig.bagFilter) {
      if (_orig.bagFilter && _orig.bagFilter.parentNode) { try { _orig.bagFilter.parentNode.removeChild(_orig.bagFilter); } catch (e) {} }
      _orig.bagFilter = f;
      if (f.__bagovHome === undefined) f.__bagovHome = f.parentNode;
    }
  }
  function parkOriginals() {
    var hold = ensureHold();
    if (!hold) return;
    [_orig.craft, _orig.bagFilter, _orig.bagList].forEach(function (n) {
      if (!n || hold.contains(n)) return;
      try { hold.appendChild(n); } catch (e) {}
    });
  }
  function mountBagOriginals() {
    var bh = document.getElementById('bagov-baghost');
    var ok = false;
    if (!bh) return false;
    if (_orig.bagFilter) {
      if (!bh.contains(_orig.bagFilter)) { try { bh.appendChild(_orig.bagFilter); } catch (e) {} }
      ok = true;
    }
    if (_orig.bagList) {
      if (!bh.contains(_orig.bagList)) { try { bh.appendChild(_orig.bagList); } catch (e) {} }
      ok = true;
    }
    _entryLog.bagMoved = ok;
    return ok;
  }
  function unmountOriginals() { parkOriginals(); }

  /* ══════════════════════════════════════════════════════
     渲染：行囊頁
     ══════════════════════════════════════════════════════ */
  function kv(k, v) { return '<div class="bagov-kv"><span>' + esc(k) + '</span><span>' + esc(v) + '</span></div>'; }

  function slotHtml(s, it, isTarget) {
    var r = it ? rarityOf(it) : null;
    var style = it ? 'border-color:' + r.color + ';box-shadow:0 0 7px ' + r.glow + ';' : '';
    var itemName = it ? String(it.name || '') : '（空）';
    return '<div class="bagov-slot' + (it ? '' : ' empty') + (isTarget ? ' target' : '') + '" data-slot="' + esc(s.id) + '"' +
      ' style="' + style + '">' +
      '<span class="ic">' + (it ? itemIcon(it) : s.icon) + '</span>' +
      '<span class="tx">' +
        '<span class="sn">' + esc(s.name) + '</span>' +
        '<span class="si" style="color:' + (it ? r.color : '#475569') + '">' +
          esc(itemName.length > 14 ? itemName.slice(0, 13) + '…' : itemName) +
        '</span>' +
      '</span></div>';
  }

  function charBarHtml() {
    var list = rosterList();
    var h = '<div class="cb-head">' +
      '<span class="cb-title">👥 角色切換</span>' +
      '<span class="cb-note">每角色獨立裝備　·　行囊為全隊共用　·　點角色即切換並更新下方裝備欄</span>' +
      '<span style="margin-left:auto"></span>' +
      '<button class="tb-btn" id="bagov-char-refresh">🔄 更新</button>' +
      '</div><div class="cb-list">';
    if (!list.length) {
      h += '<span class="cb-note">（讀不到角色名冊 rootState.roster）</span>';
    } else {
      list.forEach(function (m) {
        var r = isActive(m);
        var eq = ACC.equipped(m), cnt = 0;
        Object.keys(eq).forEach(function (k) { if (eq[k]) cnt += 1; });
        var sect = sectNameOf(m);
        var nm = String(m.name || '無名');
        h += '<div class="bagov-char' + (r ? ' on' : '') + '" data-bagov-char="' + esc(charId(m)) + '">' +
          '<span class="ci">🧑</span>' +
          '<span class="cinfo">' +
            '<span class="cn">' + esc(nm.length > 10 ? nm.slice(0, 9) + '…' : nm) + '</span>' +
            '<span class="cm">Lv.' + num(m.lv, 1) + '　' + esc(sect.length > 8 ? sect.slice(0, 7) + '…' : sect) +
              '　裝備 ' + cnt + '/10</span>' +
            '<span class="cp">⚔️ ' + fmt(charEquipPower(m)) + '</span>' +
          '</span></div>';
      });
    }
    h += '</div>';
    return h;
  }

  function toolbarHtml() {
    var all = bagAll(), cap = ACC.maxBag(), used = all.length;
    var capCls = used >= cap ? 'full' : (used >= cap * 0.85 ? 'warn' : '');
    var shown = filteredSorted().length;
    var lockedN = 0;
    all.forEach(function (it) { if (isLocked(it)) lockedN += 1; });

    var rarOpts = '<option value="">全部品質</option>';
    RARITY_ORDER.forEach(function (k) {
      rarOpts += '<option value="' + k + '"' + (_pref.rarity === k ? ' selected' : '') + '>' + RARITY[k].name + '</option>';
    });
    var slotOpts = '<option value="">全部部位</option>';
    slotDefs().forEach(function (s) {
      slotOpts += '<option value="' + s.id + '"' + (_pref.slot === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>';
    });
    slotOpts += '<option value="ring"' + (_pref.slot === 'ring' ? ' selected' : '') + '>戒指（不分左右）</option>';
    var sortOpts = [['power', '戰力'], ['rarity', '品質'], ['lv', '等級'], ['slot', '部位'], ['price', '典當價']]
      .map(function (x) { return '<option value="' + x[0] + '"' + (_pref.sort === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; })
      .join('');

    return '' +
      '<input class="tb-inp" id="bagov-q" placeholder="🔍 搜尋名稱／詞綴…" value="' + esc(_pref.q) + '" style="width:164px">' +
      '<select class="tb-sel" id="bagov-rarity">' + rarOpts + '</select>' +
      '<select class="tb-sel" id="bagov-slot">' + slotOpts + '</select>' +
      '<input class="tb-inp sm" id="bagov-lvmin" placeholder="Lv低" value="' + esc(_pref.lvMin) + '">' +
      '<input class="tb-inp sm" id="bagov-lvmax" placeholder="Lv高" value="' + esc(_pref.lvMax) + '">' +
      '<select class="tb-sel" id="bagov-sort">' + sortOpts + '</select>' +
      '<button class="tb-btn" id="bagov-asc">' + (_pref.asc ? '↑' : '↓') + '</button>' +
      '<label class="cb-note" style="display:flex;align-items:center;gap:4px">' +
      '<input type="checkbox" id="bagov-usable"' + (_pref.onlyUsable ? ' checked' : '') + '> 只看可裝備</label>' +
      '<label class="cb-note" style="display:flex;align-items:center;gap:4px">' +
      '<input type="checkbox" id="bagov-hideeq"' + (_pref.hideEquipped ? ' checked' : '') + '> 隱藏已裝備</label>' +
      '<button class="tb-btn y" id="bagov-best">⚡ 一鍵最佳裝備</button>' +
      '<button class="tb-btn y" id="bagov-purge">🧹 批次典當</button>' +
      '<button class="tb-btn gold" id="bagov-stash">🗃️ 通貨倉庫</button>' +
      '<span class="tb-cap ' + capCls + '">📦 <b>' + used + '/' + cap + '</b>　顯示 <b>' + shown +
      '</b>　🔒 <b>' + lockedN + '</b>　☑ <b>' + Object.keys(_checked).length + '</b></span>';
  }

  function catsHtml() {
    var h = '<div class="bagov-cats">';
    CATS.forEach(function (c) {
      var n = bagAll().filter(function (it) { return c.f(it); }).length;
      h += '<button class="bagov-cat' + (_pref.cat === c.id ? ' on' : '') + '" data-bagov-cat="' + c.id + '">' +
        c.name + '（' + n + '）</button>';
    });
    h += '</div>';
    return h;
  }

  function renderBag() {
    var eq = ACC.equipped() || {};
    var all = bagAll();
    var list = filteredSorted();
    var used = all.length;
    var eqMap = equippedUidMap();
    var ctUid = craftTargetUid();

    var left = '<div class="bagov-eqtitle">🛡️ 當前角色裝備（十部位）</div><div class="bagov-eq">';
    slotDefs().forEach(function (s) {
      var it = eq[s.id];
      left += slotHtml(s, it, !!(it && ctUid && uidOf(it) === ctUid));
    });
    left += '</div>';

    var ac = activeChar();
    var st = charDerived(ac);
    left += '<div class="bagov-sum"><h4>📊 當前角色</h4>' +
      kv('名稱', String((ac && ac.name) || '—')) +
      kv('等級', 'Lv.' + ACC.myLevel()) +
      kv('門派', sectNameOf(ac)) +
      kv('裝備戰力', fmt(charEquipPower(ac))) +
      kv('綜合戰力', fmt(num(st.powerScore, 0))) +
      kv('攻擊', fmt(num(st.atk, 0))) +
      kv('防禦', fmt(num(st.def, 0))) +
      kv('氣血', fmt(num(st.maxHp, 0))) +
      '</div>';

    var byR = { normal: 0, magic: 0, rare: 0, unique: 0 };
    all.forEach(function (it) { byR[rarityOf(it).key] += 1; });
    left += '<div class="bagov-sum"><h4>🎒 品質統計</h4>';
    RARITY_ORDER.forEach(function (k) {
      var r = RARITY[k];
      left += '<div class="bagov-kv"><span style="color:' + r.color + '">' + r.short + '</span><span>' + num(byR[k], 0) + '</span></div>';
    });
    left += '</div>';

    var ctName = '—';
    if (ctUid) { var ci = findAny(ctUid); if (ci) ctName = String(ci.name || ''); }
    left += '<div class="bagov-sum"><h4>🗃️ 改造目標</h4>' +
      '<div class="bagov-kv"><span>當前選中</span><span>' + esc(ctName) + '</span></div></div>';

    var right = '';
    right += '<div class="bagov-charbar">' + charBarHtml() + '</div>';
    right += '<div class="bagov-tools">' + toolbarHtml() + '</div>';
    right += catsHtml();

    if (!list.length) {
      right += '<div class="bagov-empty">沒有符合條件的裝備。<br>試著清空搜尋／篩選，或切到「全部」。</div>';
    } else {
      right += '<div class="bagov-grid" style="grid-template-columns:repeat(' + CFG.GRID_COLS + ',minmax(0,1fr))">';
      list.forEach(function (it) {
        var r = rarityOf(it), fl = num(it._forgeLv, 0), u = uidOf(it);
        var isEq = !!eqMap[u];
        var isCt = (ctUid && u === ctUid);
        var cls = 'bagov-cell';
        if (_checked[lkey(it)]) cls += ' checked';
        if (_selUid && u === _selUid) cls += ' sel';
        if (isEq) cls += ' eqcell';
        if (isCt) cls += ' craftcell';
        right += '<div class="' + cls + '" data-uid="' + esc(u) + '"' +
          ' style="border-color:' + (isCt ? '#00e5ff' : r.color) + ';box-shadow:0 0 ' + (r.star * 2) + 'px ' +
          (isCt ? 'rgba(0,229,255,.9)' : r.glow) + '">' +
          '<div class="cu" style="background:' + r.color + '"></div>' +
          (isEq ? '<div class="ce">E</div>' : (isLocked(it) ? '<div class="ck">🔒</div>' : '')) +
          (isCt ? '<div class="cg">🎯</div>' : '') +
          (fl > 0 ? '<div class="cf">+' + fl + '</div>' : '') +
          '<div class="ci">' + itemIcon(it) + '</div>' +
          '<div class="cn" style="color:' + r.color + '">' + esc(String(it.name || '?').slice(0, 6)) + '</div>' +
          '<div class="cl">Lv' + num(it.reqLv, 1) + '</div>' +
          (it.corrupted ? '<div class="cx">C</div>' : '') +
          '<div class="cc">' + fmt(ACC.itemPower(it)) + '</div>' +
          '</div>';
      });
      var rem = list.length % CFG.GRID_COLS;
      if (rem !== 0) {
        for (var i = 0; i < CFG.GRID_COLS - rem; i++) {
          right += '<div class="bagov-cell" style="pointer-events:none;opacity:.22"></div>';
        }
      }
      right += '</div>';
    }

    right += '<details class="bagov-fold" id="bagov-fold-bag">' +
      '<summary>📦 道具欄・丹藥奇物<span class="fold-note">支援批量典當</span></summary>' +
      '<div class="fold-body" id="bagov-baghost"></div></details>';

    _els.head.className = 'bagov-head';
    _els.head.innerHTML = '<span class="bagov-title">🛡️ 裝備行囊</span>' +
      '<span class="bagov-sub">角色切換 · 懸停對比（雙視窗）· 一鍵換裝 · 批次典當</span>' +
      '<span class="bagov-headbtns">' +
      '<button class="bagov-btn gold" id="bagov-stash2">🗃️ 通貨倉庫</button>' +
      '<button class="bagov-btn" id="bagov-refresh">🔄 重新整理</button>' +
      '<button class="bagov-btn" id="bagov-wide">⛶ 切換尺寸</button>' +
      '<button class="bagov-btn r" id="bagov-close">✕ 關閉</button></span>';

    _els.body.innerHTML =
      '<div class="bagov-left">' + left + '</div>' +
      '<div class="bagov-right">' + right + '</div>';

    renderFoot(list.length, used, 'bag');

    refreshOriginals();
    parkOriginals();          /* 先把原版節點安置好（避免被 innerHTML 連根拔起） */
    mountBagOriginals();
    refreshCraft();

    bindHead();
    bindBag();
  }

  /* ══════════════════════════════════════════════════════
     渲染：通貨倉庫頁
     ══════════════════════════════════════════════════════ */
  function renderStash() {
    var eq = ACC.equipped() || {};
    var ctUid = craftTargetUid();
    var tgt = craftTargetItem();

    /* 左欄：十部位（可點選為目標） */
    var left = '<div class="bagov-eqtitle">🎯 選擇改造目標（點擊已裝備的項目）</div><div class="bagov-eq">';
    slotDefs().forEach(function (s) {
      var it = eq[s.id];
      left += slotHtml(s, it, !!(it && ctUid && uidOf(it) === ctUid));
    });
    left += '</div>';

    left += stashTargetHtml();

    var all = bagAll();
    left += '<div class="bagov-sum"><h4>🎒 行囊可改造（點擊送來改造）</h4>';
    if (!all.length) {
      left += '<div class="bagov-dim" style="font-size:.74rem;color:#64748b">行囊沒有裝備。</div>';
    } else {
      all.slice(0, 6).forEach(function (it) {
        var r = rarityOf(it);
        var isCt = (ctUid && uidOf(it) === ctUid);
        left += '<div class="bagov-kv" style="cursor:pointer" data-bagov-pick="' + esc(uidOf(it)) + '">' +
          '<span style="color:' + r.color + ';overflow:hidden;text-overflow:ellipsis">' +
            esc(String(it.name || '').slice(0, 10)) + (isCt ? ' 🎯' : '') + '</span>' +
          '<span style="color:#fcd34d">' + fmt(ACC.itemPower(it)) + '</span></div>';
      });
    }
    left += '</div>';

    /* 右欄：通貨格 */
    var right = '';
    right += '<div class="bagov-stash-top">' +
      '<div class="st-head">' +
      '<span class="st-title">🗃️ 通貨倉庫</span>' +
      '<span class="st-note">100% 仿 POE：點擊通貨即作用於當前改造目標</span>' +
      '<span class="st-tgt">目標：<b>' + esc(tgt ? String(tgt.name || '') : '未選擇') + '</b></span>' +
      '</div>' +
      '<div class="bagov-tabsbar">' +
      '<button class="bagov-stab on">💠 通貨</button>' +
      '<button class="bagov-stab" id="bagov-back">← 返回行囊</button>' +
      '</div></div>';

    right += stashGridHtml();

    _els.head.className = 'bagov-head gold';
    _els.head.innerHTML = '<span class="bagov-title">🗃️ 通貨倉庫</span>' +
      '<span class="bagov-sub">點擊通貨 → 直接改造目標裝備</span>' +
      '<span class="bagov-headbtns">' +
      '<button class="bagov-btn" id="bagov-back2">← 返回行囊</button>' +
      '<button class="bagov-btn" id="bagov-refresh">🔄 重新整理</button>' +
      '<button class="bagov-btn" id="bagov-wide">⛶ 切換尺寸</button>' +
      '<button class="bagov-btn r" id="bagov-close">✕ 關閉</button></span>';

    _els.body.innerHTML =
      '<div class="bagov-left">' + left + '</div>' +
      '<div class="bagov-right">' + right + '</div>';

    renderFoot(0, bagAll().length, 'stash');

    refreshOriginals();
    parkOriginals();          /* 通貨倉庫頁不需要原版節點，全部寄放 */

    bindHead();
    bindStash();
  }

  /* ══════════════════════════════════════════════════════
     底部
     ══════════════════════════════════════════════════════ */
  function renderFoot(shown, used, page) {
    if (!_els || !_els.foot) return;
    var ctUid = craftTargetUid();
    var tgt = craftTargetItem();
    if (page === 'stash') {
      _els.foot.innerHTML =
        '<span>🗃️ 通貨倉庫</span>' +
        '<span>目標：<b>' + esc(tgt ? String(tgt.name || '') : '未選擇') + '</b></span>' +
        '<span>行囊 <b>' + used + '</b> 件</span>' +
        '<span style="margin-left:auto;color:#64748b">點通貨即使用　Esc 返回行囊　Alt+B 關閉</span>';
      return;
    }
    var lockedN = 0;
    bagAll().forEach(function (it) { if (isLocked(it)) lockedN += 1; });
    _els.foot.innerHTML =
      '<span>顯示 <b>' + shown + '</b> / ' + used + ' 件</span>' +
      '<span>🔒 已鎖定 <b>' + lockedN + '</b></span>' +
      '<span>☑ 已勾選 <b>' + Object.keys(_checked).length + '</b></span>' +
      (ctUid ? '<span>🗃️ 改造目標已選</span>' : '') +
      '<span style="margin-left:auto;color:#64748b">' +
      '懸停看詳情＋雙視窗對比　右鍵開選單　雙擊裝備　Shift+點擊勾選　Esc 關閉</span>';
  }

  /* ══════════════════════════════════════════════════════
     事件綁定
     ══════════════════════════════════════════════════════ */
  function on(id, ev, fn) {
    var el = document.getElementById(id);
    if (el && !el.__bagovBound) { el.__bagovBound = true; el.addEventListener(ev, fn); }
  }

  function bindHead() {
    on('bagov-close', 'click', function () {
      if (_page === 'stash') { _page = 'bag'; renderModal(); return; }
      close();
    });
    on('bagov-back', 'click', function () { _page = 'bag'; renderModal(); });
    on('bagov-back2', 'click', function () { _page = 'bag'; renderModal(); });
    on('bagov-stash', 'click', function () { _page = 'stash'; renderModal(); });
    on('bagov-stash2', 'click', function () { _page = 'stash'; renderModal(); });
    on('bagov-wide', 'click', function () { _els.modal.classList.toggle('wide'); });
    on('bagov-refresh', 'click', function () {
      refreshOriginals();
      renderModal();
      toast('已重新整理');
    });
  }

  function bindBag() {
    if (!_els || !_els.body) return;

    _els.body.querySelectorAll('[data-bagov-char]').forEach(function (el) {
      if (el.__bagovBound) return;
      el.__bagovBound = true;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var id = el.getAttribute('data-bagov-char');
        var target = null;
        rosterList().forEach(function (m) { if (charId(m) === id) target = m; });
        if (!target) return;
        if (isActive(target)) { toast('已是當前操控角色'); return; }
        if (switchCharacter(target)) { toast('已切換：' + (target.name || '')); afterSwitch(); }
        else toast('切換失敗，請點左側角色欄的切換鈕', 'err');
      });
    });

    _els.body.querySelectorAll('[data-bagov-cat]').forEach(function (el) {
      if (el.__bagovBound) return;
      el.__bagovBound = true;
      el.addEventListener('click', function () {
        _pref.cat = el.getAttribute('data-bagov-cat');
        savePref(); renderModal();
      });
    });

    on('bagov-char-refresh', 'click', function () { renderModal(); toast('已更新'); });
    on('bagov-q', 'input', function () {
      _pref.q = this.value; savePref();
      var pos = this.selectionStart;
      renderModal();
      var e2 = document.getElementById('bagov-q');
      if (e2) { e2.focus(); try { e2.setSelectionRange(pos, pos); } catch (x) {} }
    });
    on('bagov-rarity', 'change', function () { _pref.rarity = this.value; savePref(); renderModal(); });
    on('bagov-slot', 'change', function () { _pref.slot = this.value; savePref(); renderModal(); });
    on('bagov-lvmin', 'input', function () { _pref.lvMin = this.value; savePref(); renderModal(); });
    on('bagov-lvmax', 'input', function () { _pref.lvMax = this.value; savePref(); renderModal(); });
    on('bagov-sort', 'change', function () { _pref.sort = this.value; savePref(); renderModal(); });
    on('bagov-asc', 'click', function () { _pref.asc = !_pref.asc; savePref(); renderModal(); });
    on('bagov-usable', 'change', function () { _pref.onlyUsable = this.checked; savePref(); renderModal(); });
    on('bagov-hideeq', 'change', function () { _pref.hideEquipped = this.checked; savePref(); renderModal(); });
    on('bagov-best', 'click', bestGear);
    on('bagov-purge', 'click', function (e) {
      var r = e.target.getBoundingClientRect();
      openMenu(Math.max(8, r.left - 60), r.bottom + 6, [
        { t: '💰 典當：低品質（普通／魔法）', danger: true, fn: function () { batchPurge('lowRarity'); } },
        { t: '💰 典當：低戰力（低於現有 70%）', danger: true, fn: function () { batchPurge('lowPower'); } },
        { t: '💰 典當：重複（同名同等級）', danger: true, fn: function () { batchPurge('dupe'); } },
        { sep: true },
        { t: '💰 典當：已勾選（' + Object.keys(_checked).length + '）', danger: true, dis: !Object.keys(_checked).length, fn: function () { batchPurge('checked'); } },
        { t: '💰 典當：全部未鎖定', danger: true, fn: function () { batchPurge('unlockedAll'); } },
        { sep: true },
        { t: '🧹 一鍵典當所有未穿戴裝備', danger: true, fn: function () {
          if (ACC.sellAll() !== false) { toast('已一鍵典當全部未穿戴裝備'); afterChange(); } else toast('失敗', 'err');
        } },
        { t: '☐ 清空勾選', fn: function () { _checked = {}; renderModal(); } }
      ]);
    });

    /* 裝備欄 */
    _els.body.querySelectorAll('[data-slot]').forEach(function (el) {
      var sid = el.getAttribute('data-slot');
      var it = (ACC.equipped() || {})[sid];
      if (!it) return;
      el.addEventListener('mouseenter', function (e) {
        var x = e.clientX, y = e.clientY;
        if (_ttTimer) clearTimeout(_ttTimer);
        _ttTimer = setTimeout(function () { showPair(it, x, y); }, CFG.TOOLTIP_DELAY);
      });
      el.addEventListener('mousemove', function (e) { placePair(e.clientX, e.clientY); });
      el.addEventListener('mouseleave', hidePair);
      el.addEventListener('contextmenu', function (e) { e.preventDefault(); hidePair(); slotMenu(e.clientX, e.clientY, sid); });
      el.addEventListener('click', function () { _selUid = uidOf(it); renderModal(); });
    });

    /* 網格 */
    _els.body.querySelectorAll('[data-uid]').forEach(function (el) {
      var uid = el.getAttribute('data-uid');
      if (!findInBag(uid)) return;

      el.addEventListener('mouseenter', function (e) {
        var x = e.clientX, y = e.clientY;
        if (_ttTimer) clearTimeout(_ttTimer);
        _ttTimer = setTimeout(function () {
          var c = findInBag(uid);
          if (c) showPair(c, x, y);
        }, CFG.TOOLTIP_DELAY);
      });
      el.addEventListener('mousemove', function (e) { placePair(e.clientX, e.clientY); });
      el.addEventListener('mouseleave', hidePair);

      el.addEventListener('dblclick', function (e) {
        e.preventDefault();
        var c = findInBag(uid);
        if (!c) return;
        if (equippedUidMap()[uid]) { toast('此件已裝備', 'err'); return; }
        if (num(c.reqLv, 1) > ACC.myLevel()) { toast('等級不足', 'err'); return; }
        doEquip(c, null);
      });

      el.addEventListener('contextmenu', function (e) {
        e.preventDefault(); hidePair();
        var c = findInBag(uid);
        if (c) itemMenu(e.clientX, e.clientY, c);
      });

      el.addEventListener('click', function (e) {
        var c = findInBag(uid);
        if (!c) return;
        if (e.shiftKey) {
          if (_checked[lkey(c)]) delete _checked[lkey(c)]; else _checked[lkey(c)] = 1;
          renderModal(); return;
        }
        _selUid = uid; renderModal();
      });
    });
  }

  function bindStash() {
    if (!_els || !_els.body) return;

    /* 十部位：點擊選為目標 */
    _els.body.querySelectorAll('[data-slot]').forEach(function (el) {
      var sid = el.getAttribute('data-slot');
      var it = (ACC.equipped() || {})[sid];
      el.addEventListener('click', function () {
        if (!it) { toast('此部位沒有裝備', 'err'); return; }
        selectCraft(it, false);
      });
      if (it) {
        el.addEventListener('mouseenter', function (e) {
          var x = e.clientX, y = e.clientY;
          if (_ttTimer) clearTimeout(_ttTimer);
          _ttTimer = setTimeout(function () { showPair(it, x, y); }, CFG.TOOLTIP_DELAY);
        });
        el.addEventListener('mousemove', function (e) { placePair(e.clientX, e.clientY); });
        el.addEventListener('mouseleave', hidePair);
      }
    });

    /* 行囊快速挑選 */
    _els.body.querySelectorAll('[data-bagov-pick]').forEach(function (el) {
      el.addEventListener('click', function () {
        var it = findAny(el.getAttribute('data-bagov-pick'));
        if (it) selectCraft(it, false);
      });
      el.addEventListener('mouseenter', function (e) {
        var it = findAny(el.getAttribute('data-bagov-pick'));
        if (!it) return;
        var x = e.clientX, y = e.clientY;
        if (_ttTimer) clearTimeout(_ttTimer);
        _ttTimer = setTimeout(function () { showPair(it, x, y); }, CFG.TOOLTIP_DELAY);
      });
      el.addEventListener('mousemove', function (e) { placePair(e.clientX, e.clientY); });
      el.addEventListener('mouseleave', hidePair);
    });

    /* 通貨格 */
    var grid = _els.body.querySelector('.bagov-sgrid');
    if (grid && !grid.__bagovOrbBound) {
      grid.__bagovOrbBound = true;
      grid.addEventListener('click', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-orb]') : null;
        if (!el || el.disabled) return;
        applyOrb(el.getAttribute('data-orb'));
      });
      /* 通貨 hover 顯示說明 */
      grid.addEventListener('mouseover', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-orb]') : null;
        if (!el) return;
        var D = currencyDB(), orb = D[el.getAttribute('data-orb')];
        if (!orb) return;
        var tgt = craftTargetItem();
        var bl = orbBlocked(orb, tgt);
        var A = ensureIW('a'), B = ensureIW('b'), badge = ensureBadge();
        A.className = 'bagov-iw hover';
        A.innerHTML = '<span class="iwtag">💠 通貨</span>' +
          '<div class="th" style="color:' + esc(orb.color || '#e2e8f0') + '">' + orbIcon(orb) + ' ' + esc(orb.name || '') + '</div>' +
          '<div class="ts">持有數量：' + num(wallet()[orb.id], 0) + (orb.tierLabel ? '　·　' + esc(orb.tierLabel) : '') + '</div>' +
          (orb.desc ? '<div class="dim">' + esc(orb.desc) + '</div>' : '') +
          (bl.off ? '<div class="tsec"><div class="corr">🚫 ' + esc(bl.why) + '</div></div>'
                  : '<div class="tsec"><div style="color:#6ee7b7">✅ 點擊即作用於：' + esc(String((tgt && tgt.name) || '')) + '</div></div>');
        A.style.display = 'block';
        B.style.display = 'none';
        badge.style.display = 'none';
        placeEl(A, e.clientX + 18, e.clientY + 14);
      });
      grid.addEventListener('mousemove', function (e) {
        if (_iwEl.a && _iwEl.a.style.display === 'block') placeEl(_iwEl.a, e.clientX + 18, e.clientY + 14);
      });
      grid.addEventListener('mouseout', function (e) {
        var to = e.relatedTarget;
        if (to && to.closest && to.closest('[data-orb]')) return;
        hidePair();
      });
    }
  }

  /* ══════════════════════════════════════════════════════
     開 / 關
     ══════════════════════════════════════════════════════ */
  function build() {
    if (_els) return _els;
    if (!document.body) return null;
    injectCSS();
    ensureHold();

    var mask = document.createElement('div');
    mask.className = 'bagov-mask hidden';
    var modal = document.createElement('div');
    modal.className = 'bagov';
    var head = document.createElement('div');
    head.className = 'bagov-head';
    var body = document.createElement('div');
    body.className = 'bagov-body';
    var foot = document.createElement('div');
    foot.className = 'bagov-foot';

    modal.appendChild(head); modal.appendChild(body); modal.appendChild(foot);
    mask.appendChild(modal);
    document.body.appendChild(mask);

    _els = { mask: mask, modal: modal, head: head, body: body, foot: foot };

    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });

    if (!window.__bagovKeyBound) {
      window.__bagovKeyBound = true;
      document.addEventListener('keydown', function (e) {
        if (!_open) return;
        if (e.key === 'Escape') {
          if (_ctxEl) { hideCtx(); return; }
          if (_page === 'stash') { _page = 'bag'; renderModal(); return; }
          close();
        }
      });
      document.addEventListener('scroll', hidePair, true);
    }
    return _els;
  }

  function markTabBtn(on) {
    var btn = document.querySelector(CFG.TAB_SEL);
    if (!btn) return;
    if (on) btn.classList.add('bagov-modal-open');
    else btn.classList.remove('bagov-modal-open');
  }

  function open() {
    if (!document.body) { warn('document.body 未就緒'); return false; }
    var e = build();
    if (!e) return false;

    captureOriginals();

    if (CFG.MOVE_BAG) {
      var inv = safe(function () { return APP().inventorySys; }, null);
      if (inv) {
        if (_savedFilter === null) _savedFilter = inv.filterType || 'all';
        inv.filterType = 'consumable';
      }
    }

    _page = 'bag';
    e.mask.classList.remove('hidden');
    _open = true;
    renderModal();
    markTabBtn(true);
    if (_floatBtn) _floatBtn.style.display = 'none';
    return true;
  }

  function close() {
    if (!_els) return false;
    _els.mask.classList.add('hidden');
    _els.modal.classList.remove('wide');
    hidePair(); hideCtx();

    if (_open) unmountOriginals();

    _open = false;
    _page = 'bag';
    markTabBtn(false);

    if (_savedFilter !== null) {
      var inv = safe(function () { return APP().inventorySys; }, null);
      if (inv) inv.filterType = _savedFilter;
      _savedFilter = null;
      safe(function () { if (typeof APP().renderAll === 'function') APP().renderAll(); });
    }
    updateFloatBadge();
    return true;
  }
  function toggle() { return _open ? close() : open(); }

  function renderModal() {
    if (!_els) return;
    hidePair();
    if (_page === 'stash') renderStash();
    else renderBag();
  }

  /* ══════════════════════════════════════════════════════
     分頁攔截
     ══════════════════════════════════════════════════════ */
  function installIntercept() {
    if (!CFG.INTERCEPT_TAB) return false;
    var nav = document.getElementById('tab-nav');
    if (!nav) return false;

    if (!nav.__bagovIntercept) {
      nav.__bagovIntercept = true;
      nav.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var btn = t.closest(CFG.TAB_SEL);
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        try { e.stopImmediatePropagation(); } catch (e2) {}
        open();
      }, true);
      log('已攔截「裝備行囊 & 工藝」分頁 → 改開彈窗');
    }

    var btn = document.querySelector(CFG.TAB_SEL);
    if (btn && !btn.__bagovBound) {
      btn.__bagovBound = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        open();
      }, true);
    }

    _entryLog.intercept = true;
    return true;
  }

  /* ══════════════════════════════════════════════════════
     浮動按鈕
     ══════════════════════════════════════════════════════ */
  function updateFloatBadge() {
    if (!_floatBtn || !_floatBtn.parentNode) return;
    var used = ACC.bag().length, cap = ACC.maxBag();
    _floatBtn.innerHTML = '<span>' + CFG.FLOAT_TEXT + '</span>' +
      (used >= cap * 0.9 ? '<span class="fb">' + used + '/' + cap + '</span>' : '');
  }
  function installFloat() {
    if (!CFG.FLOAT_BUTTON) return false;
    if (_floatBtn && _floatBtn.parentNode) { _entryLog.float = true; return true; }
    if (!document.body) return false;
    var b = document.createElement('button');
    b.id = 'bagov-float';
    b.type = 'button';
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggle(); });
    document.body.appendChild(b);
    _floatBtn = b;
    updateFloatBadge();
    _entryLog.float = true;
    return true;
  }
  function removeFloat() {
    if (_floatBtn && _floatBtn.parentNode) { _floatBtn.parentNode.removeChild(_floatBtn); _floatBtn = null; }
    _entryLog.float = false;
  }

  /* ══════════════════════════════════════════════════════
     對外 API
     ══════════════════════════════════════════════════════ */
  window.HY.BagOverhaul = {
    version: '8.0',
    ready: false,
    open: open, close: close, toggle: toggle,
    stash: function (v) {
      if (!_open) open();
      _page = (v === false) ? 'bag' : 'stash';
      renderModal();
      return _page;
    },
    page: function () { return _page; },
    install: function () { var a = installIntercept(); var b = installFloat(); return { intercept: a, float: b }; },
    refresh: function () { renderModal(); return true; },
    bestGear: bestGear,
    batchPurge: batchPurge,
    goto: function () { return open(); },

    orig: function () {
      var out = {
        craft: { cached: !!_orig.craft, inDoc: inDoc(_orig.craft), childCount: _orig.craft ? _orig.craft.children.length : 0,
          parent: _orig.craft && _orig.craft.parentNode ? (_orig.craft.parentNode.id || _orig.craft.parentNode.className || _orig.craft.parentNode.tagName) : null },
        bagList: { cached: !!_orig.bagList, inDoc: inDoc(_orig.bagList), childCount: _orig.bagList ? _orig.bagList.children.length : 0 },
        bagFilter: { cached: !!_orig.bagFilter, inDoc: inDoc(_orig.bagFilter) },
        hold: !!document.getElementById('bagov-hold'),
        hosts: { bagHost: !!document.getElementById('bagov-baghost') }
      };
      console.log('%c=== 原版節點狀態 ===', 'color:#34d399;font-weight:bold');
      console.table({
        工藝台快取: out.craft.cached, 工藝台在文件內: out.craft.inDoc, 工藝台子節點: out.craft.childCount,
        道具欄快取: out.bagList.cached, 道具欄在文件內: out.bagList.inDoc, 道具欄子節點: out.bagList.childCount,
        寄放區: out.hold, 行囊收納格: out.hosts.bagHost
      });
      return out;
    },

    compare: function (uidOrIdx) {
      var it = null;
      if (typeof uidOrIdx === 'number') it = bagAll()[uidOrIdx];
      else it = findInBag(String(uidOrIdx));
      if (!it) { warn('找不到裝備：' + uidOrIdx); return null; }
      var old = compareTarget(it);
      console.log('%c=== 裝備對比 ===', 'color:#34d399;font-weight:bold');
      console.log('滑鼠目標：', it.name, '｜戰力', ACC.itemPower(it));
      console.log('已裝備：', old ? (old.name + '｜戰力 ' + ACC.itemPower(old)) : '（無）');
      return { item: it, target: old, diff: ACC.itemPower(it) - (old ? ACC.itemPower(old) : 0) };
    },
    currencies: function () {
      var D = currencyDB(), w = wallet(), out = [];
      Object.keys(D).forEach(function (id) {
        out.push({ id: id, name: D[id].name, count: num(w[id], 0), tierLabel: D[id].tierLabel || '' });
      });
      console.log('%c=== 通貨倉庫 ===', 'color:#fbbf24;font-weight:bold');
      console.table(out);
      return out;
    },

    sectName: function (v) {
      if (v && typeof v === 'object') return sectNameOf(v);
      return sectNameOf({ sect: v });
    },
    sectTable: function () {
      var DB = sectDB(), out = [];
      Object.keys(DB).forEach(function (k) { out.push({ id: k, name: (DB[k] && DB[k].name) || '（無 name）' }); });
      console.log('%c=== 門派對照表 ===', 'color:#34d399;font-weight:bold');
      console.table(out);
      return out;
    },
    chars: function () {
      return rosterList().map(function (m) {
        var eq = ACC.equipped(m), cnt = 0;
        Object.keys(eq).forEach(function (k) { if (eq[k]) cnt += 1; });
        return { id: charId(m), name: m.name, lv: num(m.lv, 1), sectRaw: m.sect, sect: sectNameOf(m),
          equipCount: cnt, equipPower: charEquipPower(m), active: isActive(m) };
      });
    },
    switchTo: function (idOrName) {
      var t = null;
      rosterList().forEach(function (m) { if (charId(m) === String(idOrName) || m.name === String(idOrName)) t = m; });
      if (!t) { toast('找不到角色：' + idOrName, 'err'); return false; }
      if (switchCharacter(t)) { toast('已切換：' + (t.name || '')); afterSwitch(); return true; }
      toast('切換失敗', 'err');
      return false;
    },
    showFloat: function (v) {
      CFG.FLOAT_BUTTON = (v !== false);
      if (CFG.FLOAT_BUTTON) installFloat(); else removeFloat();
      return CFG.FLOAT_BUTTON;
    },
    status: function () {
      var es = safe(function () { return APP().equipSys; }, null);
      return {
        version: '8.0',
        ready: window.HY.BagOverhaul.ready,
        intercept: _entryLog.intercept,
        tabBtnFound: !!document.querySelector(CFG.TAB_SEL),
        modalOpen: _open,
        page: _page,
        floatBtn: !!(_floatBtn && _floatBtn.parentNode),
        origNodes: { craftInDoc: inDoc(_orig.craft), bagListInDoc: inDoc(_orig.bagList), bagFilterInDoc: inDoc(_orig.bagFilter) },
        bag: ACC.bag().length, maxBag: ACC.maxBag(),
        chars: rosterList().length,
        activeChar: (activeChar() && activeChar().name) || null,
        activeSect: sectNameOf(activeChar()),
        currencyKinds: Object.keys(currencyDB()).length,
        craftTarget: (craftTargetItem() && craftTargetItem().name) || null,
        compare: CFG.COMPARE,
        myLevel: ACC.myLevel(),
        hasEquip: !!(es && typeof es.equipInstance === 'function'),
        hasSell: !!(es && typeof es.sellEquipInstance === 'function'),
        hasApplyCurrency: !!(safe(function () { return APP().poeSys; }, null) &&
          typeof safe(function () { return APP().poeSys.applyCurrencyToSelected; }, null) === 'function'),
        checked: Object.keys(_checked).length,
        lockCount: Object.keys(_locked).length
      };
    },
    diag: function () {
      var out = window.HY.BagOverhaul.status();
      out.orig = window.HY.BagOverhaul.orig();
      console.log('%c=== BagOverhaul v8 診斷 ===', 'color:#34d399;font-weight:bold');
      console.log('狀態：', out);
      return out;
    },
    probe: function () {
      var b = bagAll();
      var out = {
        bag: b.length,
        rarityValues: (function () { var m = {}; b.forEach(function (it) { var r = String(it.rarity || '?'); m[r] = num(m[r], 0) + 1; }); return m; })(),
        chars: window.HY.BagOverhaul.chars(),
        currencies: Object.keys(currencyDB()),
        wallet: JSON.parse(JSON.stringify(wallet())),
        compareEnabled: CFG.COMPARE
      };
      console.log('%c=== BagOverhaul 探測 ===', 'color:#34d399;font-weight:bold');
      console.table(out);
      if (b.length) console.log('樣本裝備：', b[0], '｜對比對象：', compareTarget(b[0]));
      return out;
    },
    config: function (o) { if (o) Object.keys(o).forEach(function (k) { CFG[k] = o[k]; }); return CFG; },
    setAccessor: function (o) {
      if (!o) return false;
      Object.keys(o).forEach(function (k) { if (k in ACC && typeof o[k] === 'function') ACC[k] = o[k]; });
      if (_open) renderModal();
      return true;
    },
    resetAccessor: function () { resetAccessors(); if (_open) renderModal(); return true; }
  };

  /* ══════════════════════════════════════════════════════
     啟動
     ══════════════════════════════════════════════════════ */
  function boot() {
    if (window.HY.BagOverhaul.ready) return true;
    if (!document.body) return false;
    injectCSS();
    ensureHold();
    installIntercept();
    installFloat();
    window.HY.BagOverhaul.ready = true;
    console.log('[BagOverhaul] ✓ v8 已載入｜行囊 ' + ACC.bag().length + ' 件｜角色 ' +
      rosterList().length + ' 位｜當前：' + ((activeChar() && activeChar().name) || '—') +
      '（' + sectNameOf(activeChar()) + '）｜通貨 ' + Object.keys(currencyDB()).length + ' 種');
    return true;
  }

  function tick() {
    if (!window.HY.BagOverhaul.ready) boot();
    else if (!document.querySelector(CFG.TAB_SEL) || !(function () {
      var n = document.getElementById('tab-nav');
      return n && n.__bagovIntercept;
    })()) installIntercept();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(tick, 240);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(tick, 240); });
  window.addEventListener('load', function () { setTimeout(tick, 700); });

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    tick();
    var ok = window.HY.BagOverhaul.ready && _entryLog.intercept;
    if ((ok && tries > 4) || tries >= 60) clearInterval(timer);
  }, 500);

  if (!window.__bagovHotkey) {
    window.__bagovHotkey = true;
    document.addEventListener('keydown', function (e) {
      if (!e.altKey) return;
      if (e.key !== 'b' && e.key !== 'B') return;
      e.preventDefault();
      window.HY.BagOverhaul.toggle();
    });
  }
})();
