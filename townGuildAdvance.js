// js/townGuildAdvance.js (v1)
// ⭐ 我的小鎮：冒險者深造系統（讓虛擬人物各方面等同玩家角色）
//
//   ① 武學（外功）② 心法 ③ 輕功 ④ 靈根 ⑤ 精通 ⑥ 天命技能
//   ⑦ 幫會祝福 ⑧ 特質 ⑨ 自動用藥戰術 ⑩ 任務體力消耗
//   ⑪ 洗點與傳功 ⑫ 傭兵稱號
//
// 新建築：講武堂／洗髓池／悟道碑　新研究：武學傳授／靈根培育／悟道之法／精英栽培
//
// ⚠️ 載入順序：townGuildSystem.js 之後。所有新系統收在 adv.adv 子物件中。
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[townGuildAdv] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[townGuildAdv] 找不到 HY.TownSystem'); return; }
  if (!proto.guildAdventurers) { console.error('[townGuildAdv] 請先載入 townGuildSystem.js'); return; }

  var CONFIG = {
    SKILL_MAX: 10, ROOT_MAX: 9, MASTERY_MAX: 10, BLESS_MAX: 5, DESTINY_MAX: 5,
    LV_STEP: 0.60, OFF_FACTOR: 0.20, TRAIT_COUNT: [1, 2],
    RESPC_COST_BASE: 500, RESPC_COST_PER_LV: 30,
    TRANSFUSE_RATE: 3, TRANSFUSE_GOLD: 50,
    STAMINA_HP: 0.035, STAMINA_MP: 0.050,
    STRAIN_PENALTY: 0.05, INJURY_FROM_STRAIN: 0.05,
    DEFAULT_TACTICS: { hpThreshold: 40, mpThreshold: 30, autoHp: true, autoMp: false }
  };
  T.GUILDADV = T.GUILDADV || {};
  T.GUILDADV.CONFIG = CONFIG;

  var NEW_TYPES = {
    martialHall: { name: '講武堂', icon: '🎓', cat: 'guild', cost: 2600, income: 26, appeal: 12, land: 100, research: 'advMartial', desc: '公會傳功之所。冒險者在此習武學、修心法、練輕功。' },
    spiritPool: { name: '洗髓池', icon: '💧', cat: 'guild', cost: 3200, income: 20, appeal: 14, land: 120, research: 'advSpirit', desc: '引地脈靈氣入池，可為冒險者覺醒靈根、淬鍊經脈。' },
    daoPillar: { name: '悟道碑', icon: '🪦', cat: 'guild', cost: 4000, income: 22, appeal: 13, land: 130, research: 'advMastery', desc: '碑上刻著前人感悟，靜觀可通精通、參天命。' }
  };
  Object.keys(NEW_TYPES).forEach(function (k) { if (!T.TYPES[k]) T.TYPES[k] = NEW_TYPES[k]; });

  T.RESEARCH = T.RESEARCH.concat([
    { id: 'advMartial', name: '武學傳授', icon: '🎓', cost: 5000, desc: '解鎖【講武堂】。冒險者可習武學／心法／輕功，任務獲得武學點數 +25%。', unlock: ['martialHall'], bonus: { advSpMul: 0.25 } },
    { id: 'advSpirit', name: '靈根培育', icon: '💧', cost: 7000, desc: '解鎖【洗髓池】。可覺醒靈根，靈根加成 +20%。', unlock: ['spiritPool'], bonus: { advRootMul: 0.20 } },
    { id: 'advMastery', name: '悟道之法', icon: '🪦', cost: 9000, desc: '解鎖【悟道碑】。精通與天命效果 +25%。', unlock: ['daoPillar'], bonus: { advMasteryMul: 0.25 } },
    { id: 'advElite', name: '精英栽培', icon: '⭐', cost: 14000, desc: '冒險者任務成功率 +5%，受傷機率 -25%，任務體力消耗 -20%。', bonus: { advSuccess: 0.05, advInjury: -0.25, advStamina: -0.20 } }
  ]);

  var TRAITS = [
    { id: 'strong', name: '天生神力', icon: '💪', desc: '力道 +8%', mult: { str: 0.08 } },
    { id: 'tough', name: '筋骨奇佳', icon: '🦴', desc: '體魄 +8%', mult: { con: 0.08 } },
    { id: 'swift', name: '身輕如燕', icon: '🕊️', desc: '身法 +8%', mult: { agi: 0.08 } },
    { id: 'inner', name: '內息深厚', icon: '💧', desc: '內息 +8%', mult: { int: 0.08 } },
    { id: 'iron', name: '鐵人', icon: '🛡️', desc: '受傷機率 -30%', aux: { injury: -0.30 } },
    { id: 'gatherer', name: '採集達人', icon: '🌾', desc: '採集額外掉落 +20%', aux: { lootGather: 0.20 } },
    { id: 'hunter', name: '獵人', icon: '🏹', desc: '探險成功率 +6%', aux: { successExplore: 0.06 } },
    { id: 'watcher', name: '守夜人', icon: '🌙', desc: '守護任務治安 +1', aux: { orderPlus: 1 } },
    { id: 'lucky', name: '幸運星', icon: '🍀', desc: '掉落機率 +10%', aux: { lootAll: 0.10 } },
    { id: 'diligent', name: '苦修者', icon: '📿', desc: '任務經驗 +12%', aux: { expMul: 0.12 } },
    { id: 'social', name: '交遊廣闊', icon: '🤝', desc: '公會聲望 +10%', aux: { repMul: 0.10 } },
    { id: 'scholar', name: '過目不忘', icon: '📖', desc: '學習費用 -15%', aux: { learnCostMul: -0.15 } }
  ];
  T.GUILDADV.TRAITS = TRAITS;

  T.GUILDADV.TIERS = [
    { n: 0, name: '新兵', icon: '🔰' }, { n: 5, name: '老練', icon: '🗡️' },
    { n: 15, name: '資深', icon: '⚔️' }, { n: 30, name: '精英', icon: '🏅' },
    { n: 60, name: '王牌', icon: '👑' }, { n: 100, name: '傳說', icon: '🌟' }
  ];

  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var NUM_KEYS = ['maxHp', 'maxMp', 'atk', 'def', 'hit', 'eva', 'crit', 'critRes', 'dmgReduce', 'critDmg', 'atkSpd'];
  var AUX_KEYS = ['staminaMit', 'injury', 'expMul', 'repMul', 'speedPct', 'learnCostMul',
    'lootAll', 'lootGather', 'successGuard', 'successExplore', 'successGather', 'orderPlus'];
  var ALL_KEYS = NUM_KEYS.concat(AUX_KEYS);

  function keysAll() {
    return (typeof ALL_KEYS !== 'undefined' && ALL_KEYS) ? ALL_KEYS : NUM_KEYS.concat(AUX_KEYS);
  }
  function addBonus(target, b) {
    if (!b) return target;
    keysAll().forEach(function (k) { if (typeof b[k] === 'number') target[k] = num(target[k], 0) + b[k]; });
    return target;
  }
  function scaleBonus(b, mul) {
    var o = {};
    if (!b) return o;
    Object.keys(b).forEach(function (k) { if (typeof b[k] === 'number') o[k] = b[k] * mul; });
    return o;
  }
  function attrMul(target, m) {
    if (!m) return target;
    ['con', 'str', 'agi', 'int'].forEach(function (k) { if (typeof m[k] === 'number') target[k] = num(target[k], 0) + m[k]; });
    return target;
  }

  function normDef(def, fallbackId) {
    if (!def || typeof def !== 'object') return null;
    var d = def;
    d._id = d._id || d.id || fallbackId;
    d._name = d._name || d.name || d.title || d._id;
    d._icon = d._icon || d.icon || '📘';
    d._reqLv = (d._reqLv !== undefined) ? d._reqLv : num(d.reqLv, 1);
    d._cost = (d._cost !== undefined) ? d._cost : num(num(d.cost, num(d.price, 500)), 500);
    if (!d._bonus) {
      var b = {};
      var src = d.bonus || d.stats || d.effects || d.effect || d.attrs || null;
      if (src && typeof src === 'object') keysAll().forEach(function (k) { if (typeof src[k] === 'number') b[k] = num(b[k], 0) + src[k]; });
      NUM_KEYS.forEach(function (k) { if (typeof d[k] === 'number') b[k] = num(b[k], 0) + d[k]; });
      d._bonus = b;
    }
    return d;
  }
  function normList(src) {
    var out = [];
    if (!src) return out;
    if (Array.isArray(src)) src.forEach(function (d, i) { var n = normDef(d, 'idx' + i); if (n) out.push(n); });
    else if (typeof src === 'object') Object.keys(src).forEach(function (k) { var n = normDef(src[k], k); if (n) out.push(n); });
    return out;
  }
  function catData(kind) {
    var D = window.HY.Data || {};
    if (kind === 'arty') return D.MARTIAL_ARTS;
    if (kind === 'xinfa') return D.XINFA;
    if (kind === 'qinggong') return D.QINGGONG;
    if (kind === 'root') return D.SPIRIT_ROOTS;
    if (kind === 'mastery') return D.MASTERY;
    return null;
  }
  var _cache = {};
  function listOf(kind) {
    if (kind === 'destiny') return T.GUILDADV.DESTINY.map(function (d) { return normDef(d, d.id); });
    if (kind === 'bless') return T.GUILDADV.BLESSINGS.map(function (d) { return normDef(d, d.id); });
    if (!_cache[kind]) _cache[kind] = normList(catData(kind));
    return _cache[kind];
  }
  function findDef(kind, id) {
    var l = listOf(kind);
    for (var i = 0; i < l.length; i++) if (l[i]._id === id) return l[i];
    return null;
  }
  T.GUILDADV.listOf = listOf;
  T.GUILDADV.findDef = findDef;
  T.GUILDADV.catData = catData;
  T.GUILDADV.addBonus = addBonus;
  T.GUILDADV.scaleBonus = scaleBonus;
  T.GUILDADV.NUM_KEYS = NUM_KEYS;
  T.GUILDADV.AUX_KEYS = AUX_KEYS;
  T.GUILDADV.ALL_KEYS = keysAll();

  /* ══════════════════════════════════════════════════════
     天命技能 / 幫會祝福（內建資料，避免依賴外部檔案）
     ══════════════════════════════════════════════════════ */
  T.GUILDADV.DESTINY = [
    { id: 'dest_blade', name: '刀意通神', icon: '🗡️', reqLv: 40,  cost: 60,  bonus: { atk: 90, crit: 6 } },
    { id: 'dest_guard', name: '金鐘罩',   icon: '🛡️', reqLv: 40,  cost: 60,  bonus: { def: 80, dmgReduce: 0.05 } },
    { id: 'dest_step',  name: '踏雪無痕', icon: '💨', reqLv: 60,  cost: 100, bonus: { eva: 12, speedPct: -0.08 } },
    { id: 'dest_eye',   name: '洞若觀火', icon: '👁️', reqLv: 60,  cost: 100, bonus: { hit: 25, crit: 8 } },
    { id: 'dest_heal',  name: '生生不息', icon: '🌿', reqLv: 80,  cost: 160, bonus: { maxHp: 1200, staminaMit: 0.15 } },
    { id: 'dest_flow',  name: '內力如潮', icon: '🌊', reqLv: 80,  cost: 160, bonus: { maxMp: 600, staminaMit: 0.10 } },
    { id: 'dest_luck',  name: '福星高照', icon: '🍀', reqLv: 100, cost: 240, bonus: { lootAll: 0.15 } },
    { id: 'dest_lord',  name: '號令群雄', icon: '👑', reqLv: 140, cost: 400, bonus: { atk: 220, maxHp: 900, repMul: 0.20 } }
  ];
  T.GUILDADV.BLESSINGS = [
    { id: 'bl_gold',   name: '財神眷顧', icon: '💰', reqGuildLv: 2, sp: 30,  rep: 30,  bonus: { atk: 40, lootAll: 0.05 } },
    { id: 'bl_body',   name: '銅皮鐵骨', icon: '🏋️', reqGuildLv: 2, sp: 30,  rep: 30,  bonus: { maxHp: 800, def: 50 } },
    { id: 'bl_swift',  name: '風行術',   icon: '🌪️', reqGuildLv: 3, sp: 60,  rep: 60,  bonus: { eva: 8, speedPct: -0.10 } },
    { id: 'bl_wisdom', name: '文曲星',   icon: '📚', reqGuildLv: 3, sp: 60,  rep: 60,  bonus: { expMul: 0.15 } },
    { id: 'bl_war',    name: '戰神附體', icon: '⚔️', reqGuildLv: 5, sp: 120, rep: 140, bonus: { atk: 150, crit: 10, critDmg: 15 } },
    { id: 'bl_luck',   name: '天官賜福', icon: '🍀', reqGuildLv: 6, sp: 160, rep: 200, bonus: { lootAll: 0.20, expMul: 0.10 } }
  ];

  /* ══════════════════════════════════════════════════════
     狀態初始化
     ══════════════════════════════════════════════════════ */
  proto.advNewStates = function () {
    return {
      traits: [], mastery: {}, advSp: 0, respcCount: 0, strain: 0,
      tactics: clone(CONFIG.DEFAULT_TACTICS),
      stat: { learned: 0, upgrades: 0, pills: 0, transfused: 0, respec: 0, awaken: 0, refine: 0, blessed: 0, destiny: 0 }
    };
  };

  proto.advEnsure = function (adv) {
    if (!adv || typeof adv !== 'object') return null;
    if (!adv.adv || typeof adv.adv !== 'object') adv.adv = this.advNewStates();
    var A = adv.adv, d = this.advNewStates(), k;
    for (k in d) { if (Object.prototype.hasOwnProperty.call(d, k) && A[k] === undefined) A[k] = d[k]; }
    if (!Array.isArray(A.traits)) A.traits = [];
    ['mastery', 'tactics'].forEach(function (x) { if (!A[x] || typeof A[x] !== 'object') A[x] = clone(d[x]); });
    if (!A.stat || typeof A.stat !== 'object') A.stat = d.stat;
    for (k in d.stat) { if (A.stat[k] === undefined) A.stat[k] = 0; }
    if (!adv.skills || typeof adv.skills !== 'object') adv.skills = { basic_punch: 1 };
    if (!adv.xinfa || typeof adv.xinfa !== 'object') adv.xinfa = {};
    if (!adv.qinggong || typeof adv.qinggong !== 'object') adv.qinggong = {};
    if (!adv.destinySkills || typeof adv.destinySkills !== 'object') adv.destinySkills = {};
    if (!adv.guildBlessings || typeof adv.guildBlessings !== 'object') adv.guildBlessings = {};
    if (!adv.meridians || typeof adv.meridians !== 'object') adv.meridians = {};
    if (adv.activeXinfa === undefined) adv.activeXinfa = null;
    if (adv.activeQinggong === undefined) adv.activeQinggong = null;
    if (adv.activeBlessing === undefined) adv.activeBlessing = null;
    if (adv.spiritRoot === undefined) adv.spiritRoot = null;
    if (adv.spiritRootLv === undefined) adv.spiritRootLv = 1;
    return A;
  };

  /* ══════════════════════════════════════════════════════
     特質
     ══════════════════════════════════════════════════════ */
  proto.advTraitDefs = function (adv) {
    var A = this.advEnsure(adv);
    if (!A) return [];
    var out = [];
    (A.traits || []).forEach(function (id) {
      for (var i = 0; i < TRAITS.length; i++) if (TRAITS[i].id === id) { out.push(TRAITS[i]); return; }
    });
    return out;
  };

  proto.advAssignTraits = function (adv) {
    var A = this.advEnsure(adv);
    if (!A) return [];
    if (A.traits.length) return A.traits;
    if (Math.random() < 0.12) return A.traits;
    var n = rndInt(CONFIG.TRAIT_COUNT[0], CONFIG.TRAIT_COUNT[1]);
    var pool = TRAITS.slice(), out = [];
    for (var i = 0; i < n && pool.length; i++) {
      var k = Math.floor(Math.random() * pool.length);
      out.push(pool[k].id); pool.splice(k, 1);
    }
    A.traits = out;
    return out;
  };

  proto.advTraitAux = function (adv) {
    var o = {};
    this.advTraitDefs(adv).forEach(function (t) {
      if (t.mult) attrMul(o.__mult || (o.__mult = {}), t.mult);
      addBonus(o, t.aux);
    });
    return o;
  };

  proto.advTraitMult = function (adv) {
    var m = { con: 0, str: 0, agi: 0, int: 0 };
    this.advTraitDefs(adv).forEach(function (t) { attrMul(m, t.mult); });
    return m;
  };

  /* ══════════════════════════════════════════════════════
     學習系統：武學（外功）／心法／輕功
     ══════════════════════════════════════════════════════ */
  var KINDS = {
    arty:     { data: 'MARTIAL_ARTS', store: 'skills',   label: '武學', icon: '🥋', building: 'martialHall' },
    xinfa:    { data: 'XINFA',        store: 'xinfa',    label: '心法', icon: '📜', building: 'martialHall', single: true },
    qinggong: { data: 'QINGGONG',     store: 'qinggong', label: '輕功', icon: '💨', building: 'martialHall', single: true }
  };
  T.GUILDADV.KINDS = KINDS;

  proto.advStore = function (adv, kind) {
    var cfg = KINDS[kind];
    if (!cfg) return null;
    this.advEnsure(adv);
    return adv[cfg.store];
  };

  proto.advCheckBuilding = function (kind) {
    var cfg = KINDS[kind];
    if (cfg && cfg.building && !this.hasBuilding(cfg.building)) {
      return { ok: false, msg: '需先興建【' + (T.TYPES[cfg.building] || {}).name + '】' };
    }
    return { ok: true };
  };

  proto.advCostMul = function (adv) {
    var aux = this.advTraitAux(adv);
    return Math.max(0.3, 1 + num(aux.learnCostMul, 0));
  };

  function baseCostOf(def) { return Math.max(50, num(def._cost, 500)); }

  proto.advLearnCost = function (adv, def) {
    var b = baseCostOf(def), m = this.advCostMul(adv);
    return { gold: Math.round(b * 2 * m), sp: Math.max(2, Math.round(b / 100)) };
  };

  proto.advUpgradeCost = function (adv, def, lv) {
    var b = baseCostOf(def), m = this.advCostMul(adv);
    return { gold: Math.round(b * (lv + 1) * 0.5 * m), sp: Math.max(1, Math.round(b / 100 * (lv + 1) * 0.8)) };
  };

  proto.advCanLearn = function (kind, id, advId) {
    var adv = this.guildAdventurer(advId);
    if (!adv) return { ok: false, msg: '找不到冒險者' };
    var def = findDef(kind, id);
    if (!def) return { ok: false, msg: '無此項目' };
    var bc = this.advCheckBuilding(kind);
    if (!bc.ok) return bc;
    if (num(adv.lv, 1) < num(def._reqLv, 1)) return { ok: false, msg: '需 Lv.' + def._reqLv };
    var store = this.advStore(adv, kind);
    if (store[def._id]) return { ok: false, msg: '已習得' };
    var A = this.advEnsure(adv);
    var cost = this.advLearnCost(adv, def);
    if (A.advSp < cost.sp) return { ok: false, msg: '武學點數不足（需 ' + cost.sp + '）' };
    if (this.charSys.rootState.gold < cost.gold) return { ok: false, msg: '銀兩不足（需 ' + cost.gold + ' 兩）' };
    return { ok: true, def: def, cost: cost, adv: adv, A: A };
  };

  proto.advLearn = function (kind, id, advId) {
    var chk = this.advCanLearn(kind, id, advId);
    if (!chk.ok) { this.log('⚠️ 無法學習：' + chk.msg, 'system'); return false; }
    var adv = chk.adv, A = chk.A, def = chk.def;
    A.advSp -= chk.cost.sp;
    this.charSys.rootState.gold -= chk.cost.gold;
    this.advStore(adv, kind)[def._id] = 1;
    A.stat.learned += 1;
    if (KINDS[kind] && KINDS[kind].single) {
      var act = (kind === 'xinfa') ? 'activeXinfa' : 'activeQinggong';
      if (!adv[act]) adv[act] = def._id;
    }
    this.guildClampVitals(adv);
    this.guildLog('📖 【' + adv.name + '】習得' + KINDS[kind].label + '【' + def._name + '】，耗 ' +
      chk.cost.sp + ' 武學點數、' + chk.cost.gold + ' 兩。', 'time');
    this.requestRender();
    return true;
  };

  proto.advCanUpgrade = function (kind, id, advId) {
    var adv = this.guildAdventurer(advId);
    if (!adv) return { ok: false, msg: '找不到冒險者' };
    var def = findDef(kind, id);
    if (!def) return { ok: false, msg: '無此項目' };
    var store = this.advStore(adv, kind);
    var lv = num(store[def._id], 0);
    if (!lv) return { ok: false, msg: '尚未習得' };
    if (lv >= CONFIG.SKILL_MAX) return { ok: false, msg: '已達 Lv.' + CONFIG.SKILL_MAX };
    var A = this.advEnsure(adv);
    var cost = this.advUpgradeCost(adv, def, lv);
    if (A.advSp < cost.sp) return { ok: false, msg: '武學點數不足（需 ' + cost.sp + '）' };
    if (this.charSys.rootState.gold < cost.gold) return { ok: false, msg: '銀兩不足（需 ' + cost.gold + ' 兩）' };
    return { ok: true, def: def, cost: cost, adv: adv, A: A, lv: lv };
  };

  proto.advUpgrade = function (kind, id, advId) {
    var chk = this.advCanUpgrade(kind, id, advId);
    if (!chk.ok) { this.log('⚠️ 無法升級：' + chk.msg, 'system'); return false; }
    chk.A.advSp -= chk.cost.sp;
    this.charSys.rootState.gold -= chk.cost.gold;
    this.advStore(chk.adv, kind)[chk.def._id] = chk.lv + 1;
    chk.A.stat.upgrades += 1;
    this.guildClampVitals(chk.adv);
    this.guildLog('⬆️ 【' + chk.adv.name + '】的' + KINDS[kind].label + '【' + chk.def._name + '】升至 Lv.' +
      (chk.lv + 1) + '，耗 ' + chk.cost.sp + ' 武學點數、' + chk.cost.gold + ' 兩。', 'time');
    this.requestRender();
    return true;
  };

  proto.advSetActive = function (kind, advId, id) {
    if (kind !== 'xinfa' && kind !== 'qinggong') return false;
    var adv = this.guildAdventurer(advId);
    if (!adv) return false;
    var store = this.advStore(adv, kind);
    if (!store[id]) { this.log('⚠️ 尚未習得該' + KINDS[kind].label + '。', 'system'); return false; }
    var act = (kind === 'xinfa') ? 'activeXinfa' : 'activeQinggong';
    adv[act] = (adv[act] === id) ? null : id;
    this.guildClampVitals(adv);
    this.guildLog('🔄 【' + adv.name + '】將' + KINDS[kind].label + '【' + (findDef(kind, id) || {})._name +
      '】' + (adv[act] ? '設為生效（全額加成）' : '解除生效') + '。', 'time');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     靈根
     ══════════════════════════════════════════════════════ */
  proto.advRootList = function () { return listOf('root'); };

  proto.advAwakenCost = function (adv) {
    var m = this.advCostMul(adv);
    var lvMul = 1 + num(adv.lv, 1) * 0.02;
    return { gold: Math.round(1200 * m * lvMul), sp: Math.round(40 * lvMul) };
  };

  proto.advCanAwaken = function (advId, rootId) {
    if (!this.hasBuilding('spiritPool')) return { ok: false, msg: '需先興建【洗髓池】' };
    var adv = this.guildAdventurer(advId);
    if (!adv) return { ok: false, msg: '找不到冒險者' };
    if (adv.spiritRoot) return { ok: false, msg: '已覺醒靈根（可先以洗髓池淬鍊）' };
    var def = rootId ? findDef('root', rootId) : null;
    if (rootId && !def) return { ok: false, msg: '無此靈根' };
    var A = this.advEnsure(adv);
    var cost = this.advAwakenCost(adv);
    if (A.advSp < cost.sp) return { ok: false, msg: '武學點數不足（需 ' + cost.sp + '）' };
    if (this.charSys.rootState.gold < cost.gold) return { ok: false, msg: '銀兩不足（需 ' + cost.gold + ' 兩）' };
    return { ok: true, adv: adv, A: A, cost: cost, def: def };
  };

  proto.advAwakenRoot = function (advId, rootId) {
    var chk = this.advCanAwaken(advId, rootId);
    if (!chk.ok) { this.log('⚠️ 無法覺醒靈根：' + chk.msg, 'system'); return false; }
    var def = chk.def;
    if (!def) {
      var pool = this.advRootList();
      if (!pool.length) { this.log('⚠️ 缺少靈根資料（spiritRootData.js）。', 'system'); return false; }
      def = pick(pool);
    }
    chk.A.advSp -= chk.cost.sp;
    this.charSys.rootState.gold -= chk.cost.gold;
    chk.adv.spiritRoot = def._id;
    chk.adv.spiritRootLv = 1;
    chk.A.stat.awaken += 1;
    this.guildClampVitals(chk.adv);
    this.guildLog('✨ 【' + chk.adv.name + '】覺醒靈根【' + def._name + '】！耗 ' +
      chk.cost.sp + ' 武學點數、' + chk.cost.gold + ' 兩。', 'time');
    this.requestRender();
    return true;
  };

  proto.advRefineCost = function (adv) {
    var lv = num(adv.spiritRootLv, 1);
    var m = this.advCostMul(adv);
    return { gold: Math.round(600 * lv * m), sp: Math.round(20 * lv) };
  };

  proto.advCanRefine = function (advId) {
    if (!this.hasBuilding('spiritPool')) return { ok: false, msg: '需先興建【洗髓池】' };
    var adv = this.guildAdventurer(advId);
    if (!adv) return { ok: false, msg: '找不到冒險者' };
    if (!adv.spiritRoot) return { ok: false, msg: '尚未覺醒靈根' };
    if (num(adv.spiritRootLv, 1) >= CONFIG.ROOT_MAX) return { ok: false, msg: '已達 Lv.' + CONFIG.ROOT_MAX };
    var A = this.advEnsure(adv);
    var cost = this.advRefineCost(adv);
    if (A.advSp < cost.sp) return { ok: false, msg: '武學點數不足（需 ' + cost.sp + '）' };
    if (this.charSys.rootState.gold < cost.gold) return { ok: false, msg: '銀兩不足（需 ' + cost.gold + ' 兩）' };
    return { ok: true, adv: adv, A: A, cost: cost };
  };

  proto.advRefineRoot = function (advId) {
    var chk = this.advCanRefine(advId);
    if (!chk.ok) { this.log('⚠️ 無法淬鍊：' + chk.msg, 'system'); return false; }
    chk.A.advSp -= chk.cost.sp;
    this.charSys.rootState.gold -= chk.cost.gold;
    chk.adv.spiritRootLv = num(chk.adv.spiritRootLv, 1) + 1;
    chk.A.stat.refine += 1;
    this.guildClampVitals(chk.adv);
    this.guildLog('💧 【' + chk.adv.name + '】的靈根淬鍊至 Lv.' + chk.adv.spiritRootLv + '，耗 ' +
      chk.cost.sp + ' 武學點數、' + chk.cost.gold + ' 兩。', 'time');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     精通（悟道碑）
     ══════════════════════════════════════════════════════ */
  proto.advMasteryList = function () { return listOf('mastery'); };

  proto.advMasteryLv = function (adv, id) {
    var A = this.advEnsure(adv);
    return num(A.mastery[id], 0);
  };

  proto.advMasteryCost = function (adv, lv) {
    var m = this.advCostMul(adv);
    return { gold: Math.round(300 * (lv + 1) * m), sp: Math.round(15 * (lv + 1)) };
  };

  proto.advCanMasteryUp = function (advId, id) {
    if (!this.hasBuilding('daoPillar')) return { ok: false, msg: '需先興建【悟道碑】' };
    var adv = this.guildAdventurer(advId);
    if (!adv) return { ok: false, msg: '找不到冒險者' };
    var def = findDef('mastery', id);
    if (!def) return { ok: false, msg: '無此精通' };
    var lv = this.advMasteryLv(adv, id);
    if (lv >= CONFIG.MASTERY_MAX) return { ok: false, msg: '已達 Lv.' + CONFIG.MASTERY_MAX };
    if (num(adv.lv, 1) < num(def._reqLv, 1)) return { ok: false, msg: '需 Lv.' + def._reqLv };
    var A = this.advEnsure(adv);
    var cost = this.advMasteryCost(adv, lv);
    if (A.advSp < cost.sp) return { ok: false, msg: '武學點數不足（需 ' + cost.sp + '）' };
    if (this.charSys.rootState.gold < cost.gold) return { ok: false, msg: '銀兩不足（需 ' + cost.gold + ' 兩）' };
    return { ok: true, adv: adv, A: A, cost: cost, def: def, lv: lv };
  };

  proto.advMasteryUp = function (advId, id) {
    var chk = this.advCanMasteryUp(advId, id);
    if (!chk.ok) { this.log('⚠️ 無法提升精通：' + chk.msg, 'system'); return false; }
    chk.A.advSp -= chk.cost.sp;
    this.charSys.rootState.gold -= chk.cost.gold;
    chk.A.mastery[id] = chk.lv + 1;
    this.guildClampVitals(chk.adv);
    this.guildLog('🪦 【' + chk.adv.name + '】的【' + chk.def._name + '】精通提升至 Lv.' + (chk.lv + 1) + '。', 'time');
    this.requestRender();
    return true;
  };

  /** 任務完成時隨機累積精通經驗（免費成長） */
  proto.advMasteryGain = function (adv, times) {
    if (!this.hasBuilding('daoPillar')) return;
    var list = this.advMasteryList();
    if (!list.length) return;
    var A = this.advEnsure(adv);
    for (var i = 0; i < num(times, 1); i++) {
      if (Math.random() > 0.35) continue;
      var pool = list.filter(function (d) { return num(adv.lv, 1) >= num(d._reqLv, 1) && num(A.mastery[d._id], 0) < CONFIG.MASTERY_MAX; });
      if (!pool.length) return;
      var def = pick(pool);
      A.mastery[def._id] = num(A.mastery[def._id], 0) + 1;
    }
  };

  /* ══════════════════════════════════════════════════════
     天命技能
     ══════════════════════════════════════════════════════ */
  proto.advDestinyList = function () { return listOf('destiny'); };

  proto.advCanDestiny = function (advId, id) {
    if (!this.hasBuilding('daoPillar')) return { ok: false, msg: '需先興建【悟道碑】' };
    var adv = this.guildAdventurer(advId);
    if (!adv) return { ok: false, msg: '找不到冒險者' };
    var def = findDef('destiny', id);
    if (!def) return { ok: false, msg: '無此天命技能' };
    if (num(adv.lv, 1) < num(def._reqLv, 1)) return { ok: false, msg: '需 Lv.' + def._reqLv };
    var lv = num(adv.destinySkills[id], 0);
    if (lv >= CONFIG.DESTINY_MAX) return { ok: false, msg: '已達 Lv.' + CONFIG.DESTINY_MAX };
    var A = this.advEnsure(adv);
    var cost = { sp: Math.round(num(def._cost, 100) * (lv + 1)), gold: Math.round(num(def._cost, 100) * 10 * (lv + 1) * this.advCostMul(adv)) };
    if (A.advSp < cost.sp) return { ok: false, msg: '武學點數不足（需 ' + cost.sp + '）' };
    if (this.charSys.rootState.gold < cost.gold) return { ok: false, msg: '銀兩不足（需 ' + cost.gold + ' 兩）' };
    return { ok: true, adv: adv, A: A, cost: cost, def: def, lv: lv };
  };

  proto.advDestinyLearn = function (advId, id) {
    var chk = this.advCanDestiny(advId, id);
    if (!chk.ok) { this.log('⚠️ 無法參悟天命：' + chk.msg, 'system'); return false; }
    chk.A.advSp -= chk.cost.sp;
    this.charSys.rootState.gold -= chk.cost.gold;
    chk.adv.destinySkills[id] = chk.lv + 1;
    chk.A.stat.destiny += 1;
    this.guildClampVitals(chk.adv);
    this.guildLog('🔮 【' + chk.adv.name + '】參悟天命【' + chk.def._name + '】至 Lv.' + (chk.lv + 1) + '。', 'time');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     幫會祝福（消耗公會聲望 + 冒險者武學點數）
     ══════════════════════════════════════════════════════ */
  proto.advBlessList = function () { return listOf('bless'); };

  proto.advCanBless = function (advId, id) {
    var adv = this.guildAdventurer(advId);
    if (!adv) return { ok: false, msg: '找不到冒險者' };
    var def = findDef('bless', id);
    if (!def) return { ok: false, msg: '無此祝福' };
    var lv = num(adv.guildBlessings[id], 0);
    if (lv >= CONFIG.BLESS_MAX) return { ok: false, msg: '已達 Lv.' + CONFIG.BLESS_MAX };
    var needLv = num(def.reqGuildLv, 1);
    if (this.guildLevel() < needLv) return { ok: false, msg: '需公會 Lv.' + needLv };
    var g = this.guildState(), A = this.advEnsure(adv);
    var spCost = Math.round(num(def.sp, 30) * (lv + 1));
    var repCost = Math.round(num(def.rep, 30) * (lv + 1));
    if (A.advSp < spCost) return { ok: false, msg: '武學點數不足（需 ' + spCost + '）' };
    if (g.reputation < repCost) return { ok: false, msg: '公會聲望不足（需 ' + repCost + '）' };
    return { ok: true, adv: adv, A: A, g: g, def: def, lv: lv, spCost: spCost, repCost: repCost };
  };

  proto.advBlessUp = function (advId, id) {
    var chk = this.advCanBless(advId, id);
    if (!chk.ok) { this.log('⚠️ 無法求取祝福：' + chk.msg, 'system'); return false; }
    chk.A.advSp -= chk.spCost;
    chk.g.reputation -= chk.repCost;
    chk.adv.guildBlessings[id] = chk.lv + 1;
    if (!chk.adv.activeBlessing) chk.adv.activeBlessing = id;
    chk.A.stat.blessed += 1;
    this.guildClampVitals(chk.adv);
    this.guildLog('🙏 【' + chk.adv.name + '】獲【' + chk.def._name + '】祝福至 Lv.' + (chk.lv + 1) +
      '，耗 ' + chk.spCost + ' 武學點數、' + chk.repCost + ' 公會聲望。', 'time');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     洗點 / 手動配點 / 傳功
     ══════════════════════════════════════════════════════ */
  proto.advRoleBase = function (adv) {
    var role = T.GUILD.ROLES[adv.role];
    if (!role) return { con: 10, str: 10, agi: 10, int: 10 };
    return role.base;
  };

  proto.advAllocated = function (adv) {
    var base = this.advRoleBase(adv), s = adv.stats || {};
    var total = 0;
    ['con', 'str', 'agi', 'int'].forEach(function (k) { total += Math.max(0, num(s[k], 0) - num(base[k], 0)); });
    return total;
  };

  proto.advRespecCost = function (adv) {
    var A = this.advEnsure(adv);
    var mul = 1 + num(A.respcCount, 0);
    return Math.max(100, Math.round((CONFIG.RESPC_COST_BASE + num(adv.lv, 1) * CONFIG.RESPC_COST_PER_LV) * mul));
  };

  proto.advCanRespec = function (advId) {
    var adv = this.guildAdventurer(advId);
    if (!adv) return { ok: false, msg: '找不到冒險者' };
    if (this.advAllocated(adv) <= 0) return { ok: false, msg: '沒有已分配的潛能點' };
    var cost = this.advRespecCost(adv);
    if (this.charSys.rootState.gold < cost) return { ok: false, msg: '銀兩不足（需 ' + cost + ' 兩）' };
    return { ok: true, adv: adv, cost: cost };
  };

  proto.advRespec = function (advId) {
    var chk = this.advCanRespec(advId);
    if (!chk.ok) { this.log('⚠️ 無法洗點：' + chk.msg, 'system'); return false; }
    var adv = chk.adv, A = this.advEnsure(adv), base = this.advRoleBase(adv);
    var refund = this.advAllocated(adv);
    this.charSys.rootState.gold -= chk.cost;
    ['con', 'str', 'agi', 'int'].forEach(function (k) { adv.stats[k] = num(base[k], 10); });
    adv.freePoints = num(adv.freePoints, 0) + refund;
    A.respcCount = num(A.respcCount, 0) + 1;
    A.stat.respec += 1;
    this.guildClampVitals(adv);
    this.guildLog('♻️ 【' + adv.name + '】洗點完成，退回 ' + refund + ' 點潛能（花費 ' + chk.cost + ' 兩）。', 'wealth');
    this.requestRender();
    return true;
  };

  proto.advAllocStat = function (advId, key) {
    if (['con', 'str', 'agi', 'int'].indexOf(key) === -1) return false;
    var adv = this.guildAdventurer(advId);
    if (!adv) return false;
    if (num(adv.freePoints, 0) <= 0) { this.log('⚠️ 沒有可分配的潛能點。', 'system'); return false; }
    adv.freePoints = num(adv.freePoints, 0) - 1;
    adv.stats[key] = num(adv.stats[key], 10) + 1;
    this.guildClampVitals(adv);
    this.requestRender();
    return true;
  };

  proto.advAutoAlloc = function (advId) {
    var adv = this.guildAdventurer(advId);
    if (!adv) return 0;
    var role = T.GUILD.ROLES[adv.role];
    var alloc = (role && role.alloc) ? role.alloc : { con: 1, str: 1, agi: 1, int: 1 };
    var maxK = 'con';
    ['con', 'str', 'agi', 'int'].forEach(function (k) { if (alloc[k] > alloc[maxK]) maxK = k; });
    var totalA = (alloc.con + alloc.str + alloc.agi + alloc.int) || 4;
    var n = 0;
    while (num(adv.freePoints, 0) > 0) {
      var k2 = maxK, r = Math.random();
      if (r > 0.5) {
        var pool = ['con', 'str', 'agi', 'int'].filter(function (k) { return alloc[k] > 0; });
        if (pool.length) k2 = pick(pool);
      }
      adv.stats[k2] = num(adv.stats[k2], 10) + 1;
      adv.freePoints -= 1;
      n += 1;
    }
    if (n > 0) {
      this.guildClampVitals(adv);
      this.guildLog('🎯 【' + adv.name + '】依職業自動分配了 ' + n + ' 點潛能。', 'time');
      this.requestRender();
    }
    return n;
  };

  proto.advTransfuseCost = function (adv, points) {
    var n = Math.max(1, Math.round(num(points, 1)));
    return { gold: n * CONFIG.TRANSFUSE_GOLD, sp: n };
  };

  proto.advCanTransfuse = function (advId, points) {
    var adv = this.guildAdventurer(advId);
    if (!adv) return { ok: false, msg: '找不到冒險者' };
    var n = Math.max(1, Math.round(num(points, 1)));
    if (this.charSys.rootState.sp < n) return { ok: false, msg: '你的武學點數不足（需 ' + n + '）' };
    var cost = this.advTransfuseCost(adv, n);
    if (this.charSys.rootState.gold < cost.gold) return { ok: false, msg: '銀兩不足（需 ' + cost.gold + ' 兩）' };
    return { ok: true, adv: adv, cost: cost, n: n };
  };

  /** 傳功：消耗玩家武點與銀兩，轉為冒險者的武學點數 */
  proto.advTransfuse = function (advId, points) {
    var chk = this.advCanTransfuse(advId, points);
    if (!chk.ok) { this.log('⚠️ 無法傳功：' + chk.msg, 'system'); return false; }
    var adv = chk.adv, A = this.advEnsure(adv);
    this.charSys.rootState.sp -= chk.n;
    this.charSys.rootState.gold -= chk.cost.gold;
    var gain = chk.n * CONFIG.TRANSFUSE_RATE;
    A.advSp += gain;
    A.stat.transfused += chk.n;
    this.guildLog('🧘 你向【' + adv.name + '】傳功 ' + chk.n + ' 點，得武學點數 ' + gain +
      '（花費 ' + chk.cost.gold + ' 兩）。', 'wealth');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     傭兵稱號
     ══════════════════════════════════════════════════════ */
  proto.advTier = function (adv) {
    var n = num(adv.totalMissions, 0), list = T.GUILDADV.TIERS, t = list[0];
    for (var i = 0; i < list.length; i++) if (n >= list[i].n) t = list[i];
    return t;
  };

  /* ══════════════════════════════════════════════════════
     加成聚合（武學／心法／輕功／靈根／精通／天命／祝福／特質）
     ══════════════════════════════════════════════════════ */
  proto.advBonus = function (adv) {
    var self = this;
    var out = {};
    keysAll().forEach(function (k) { out[k] = 0; });
    out.attrMult = { con: 0, str: 0, agi: 0, int: 0 };
    out.sources = { arty: 0, xinfa: 0, qinggong: 0, root: 0, mastery: 0, destiny: 0, bless: 0, trait: 0 };
    if (!adv) return out;
    this.advEnsure(adv);

    function step(mul) { return 1 + (num(mul, 1) - 1) * CONFIG.LV_STEP; }

    // ① 武學（全部已習得的皆生效）
    listOf('arty').forEach(function (def) {
      var lv = num(adv.skills[def._id], 0);
      if (lv <= 0) return;
      addBonus(out, scaleBonus(def._bonus, step(lv)));
      out.sources.arty += 1;
    });

    // ② 心法 / ③ 輕功：生效者 100%，其餘 OFF_FACTOR
    ['xinfa', 'qinggong'].forEach(function (kind) {
      var act = (kind === 'xinfa') ? adv.activeXinfa : adv.activeQinggong;
      listOf(kind).forEach(function (def) {
        var lv = num(adv[kind][def._id], 0);
        if (lv <= 0) return;
        var mul = (def._id === act) ? 1 : CONFIG.OFF_FACTOR;
        addBonus(out, scaleBonus(def._bonus, step(lv) * mul));
        out.sources[kind] += 1;
      });
    });

    // ④ 靈根
    if (adv.spiritRoot) {
      var rdef = findDef('root', adv.spiritRoot);
      if (rdef) {
        var rlv = Math.max(1, num(adv.spiritRootLv, 1));
        var rmul = 1 + this.getResearchBonus('advRootMul', 0);
        addBonus(out, scaleBonus(rdef._bonus, step(rlv) * rmul));
        out.sources.root = 1;
      }
    }

    // ⑤ 精通
    var mMul = 1 + this.getResearchBonus('advMasteryMul', 0);
    listOf('mastery').forEach(function (def) {
      var lv = self.advMasteryLv(adv, def._id);
      if (lv <= 0) return;
      addBonus(out, scaleBonus(def._bonus, step(lv) * mMul));
      out.sources.mastery += 1;
    });

    // ⑥ 天命技能
    listOf('destiny').forEach(function (def) {
      var lv = num(adv.destinySkills[def._id], 0);
      if (lv <= 0) return;
      addBonus(out, scaleBonus(def._bonus, step(lv) * mMul));
      out.sources.destiny += 1;
    });

    // ⑦ 幫會祝福：全部已求取者皆生效
    listOf('bless').forEach(function (def) {
      var lv = num(adv.guildBlessings[def._id], 0);
      if (lv <= 0) return;
      addBonus(out, scaleBonus(def._bonus, step(lv)));
      out.sources.bless += 1;
    });

    // ⑧ 特質
    var tMult = this.advTraitMult(adv);
    ['con', 'str', 'agi', 'int'].forEach(function (k) { out.attrMult[k] = num(tMult[k], 0); });
    addBonus(out, this.advTraitAux(adv));
    out.sources.trait = this.advTraitDefs(adv).length;

    return out;
  };

  /* ══════════════════════════════════════════════════════
     覆寫 guildDerived：把新系統的加成併入「玩家同一套公式」
     ① 先以特質百分比暫時調整四維 → ② 呼叫玩家公式 → ③ 還原四維
     ④ 疊上平坦加成 → ⑤ 重算 powerScore
     ══════════════════════════════════════════════════════ */
  var _guildDerived = proto.guildDerived;
  proto.guildDerived = function (adv) {
    if (!adv) return _guildDerived.call(this, adv);
    var b = this.advBonus(adv);
    var orig = null;
    if (adv.stats) {
      orig = { con: num(adv.stats.con, 10), str: num(adv.stats.str, 10), agi: num(adv.stats.agi, 10), int: num(adv.stats.int, 10) };
      adv.stats.con = Math.max(1, Math.round(orig.con * (1 + num(b.attrMult.con, 0))));
      adv.stats.str = Math.max(1, Math.round(orig.str * (1 + num(b.attrMult.str, 0))));
      adv.stats.agi = Math.max(1, Math.round(orig.agi * (1 + num(b.attrMult.agi, 0))));
      adv.stats.int = Math.max(1, Math.round(orig.int * (1 + num(b.attrMult.int, 0))));
    }
    var d;
    try { d = _guildDerived.call(this, adv); }
    finally {
      if (orig) {
        adv.stats.con = orig.con; adv.stats.str = orig.str;
        adv.stats.agi = orig.agi; adv.stats.int = orig.int;
      }
    }
    if (!d) return d;
    NUM_KEYS.forEach(function (k) {
      if (k === 'dmgReduce') d[k] = Math.min(0.75, num(d[k], 0) + num(b[k], 0));
      else d[k] = Math.round(num(d[k], 0) + num(b[k], 0));
    });
    if (d.eva !== undefined) d.eva = Math.min(90, d.eva);
    if (d.crit !== undefined) d.crit = Math.min(95, d.crit);
    d.hit = Math.round(num(d.hit, 0));
    var cs = this.charSys;
    if (cs && typeof cs.getPowerScore === 'function') {
      try { d.powerScore = cs.getPowerScore(d); } catch (e) { /* 忽略 */ }
    }
    d.advBonus = b;
    return d;
  };

  /* ══════════════════════════════════════════════════════
     任務體力消耗 + 自動服丹
     ══════════════════════════════════════════════════════ */
  proto.advStaminaInfo = function (adv) {
    var d = this.guildDerived(adv);
    var aux = this.advTraitAux(adv);
    var mit = num(aux.staminaMit, 0) + (this.getResearchBonus('advStamina', 0) * -1) +
      num((this.advBonus(adv).staminaMit), 0);
    mit = Math.max(0, Math.min(0.75, mit));
    return {
      hpCost: Math.max(1, Math.round(num(d.maxHp, 100) * CONFIG.STAMINA_HP * (1 - mit))),
      mpCost: Math.max(1, Math.round(num(d.maxMp, 100) * CONFIG.STAMINA_MP * (1 - mit))),
      mitigation: mit
    };
  };

  proto.advPillItemId = function (adv, isMp) {
    var A = this.advEnsure(adv);
    var conf = A.tactics || {};
    var g = window.HY.game;
    var id = null;
    if (isMp) {
      id = conf.mpItemId || (g && g.combatSys && g.combatSys.autoConfig && g.combatSys.autoConfig.mpItemId) || null;
    } else {
      id = conf.hpItemId || (g && g.combatSys && g.combatSys.autoConfig && g.combatSys.autoConfig.hpItemId) || null;
    }
    if (id && this.charSys.rootState.inventory && this.charSys.rootState.inventory[id] > 0) return id;
    // 後備：從行囊中找第一個消耗品
    var inv = this.charSys.rootState.inventory || {};
    var Data = window.HY.Data || {};
    var ids = Object.keys(inv);
    for (var i = 0; i < ids.length; i++) {
      var it = Data.ITEMS && Data.ITEMS[ids[i]];
      if (!it || inv[ids[i]] <= 0) continue;
      if (it.type !== 'consumable' && it.type !== 'pill') continue;
      if (isMp) { if (String(ids[i]).indexOf('mp') !== -1) return ids[i]; }
      else { if (String(ids[i]).indexOf('hp') !== -1 || String(ids[i]).indexOf('pill') !== -1) return ids[i]; }
    }
    return null;
  };

  proto.advUsePill = function (adv, isMp) {
    var inv = this.charSys.rootState.inventory || {};
    var id = this.advPillItemId(adv, isMp);
    if (!id || !inv[id] || inv[id] <= 0) return false;
    inv[id] -= 1;
    if (inv[id] <= 0) delete inv[id];
    var d = this.guildDerived(adv), A = this.advEnsure(adv);
    if (isMp) adv.currentMp = d.maxMp;
    else adv.currentHp = d.maxHp;
    A.stat.pills += 1;
    return true;
  };

  proto.advAutoPill = function (adv) {
    var A = this.advEnsure(adv), conf = A.tactics || {};
    if (!conf.autoHp && !conf.autoMp) return false;
    var d = this.guildDerived(adv);
    var used = false;
    if (conf.autoHp) {
      var hpPct = num(d.maxHp, 1) > 0 ? num(adv.currentHp, 0) / d.maxHp * 100 : 100;
      if (hpPct < num(conf.hpThreshold, 40)) used = this.advUsePill(adv, false) || used;
    }
    if (conf.autoMp) {
      var mpPct = num(d.maxMp, 1) > 0 ? num(adv.currentMp, 0) / d.maxMp * 100 : 100;
      if (mpPct < num(conf.mpThreshold, 30)) used = this.advUsePill(adv, true) || used;
    }
    return used;
  };

  /** 每期體力消耗（在任務推進前執行） */
  proto.advStaminaTick = function () {
    if (!this.isGuildFounded()) return;
    var g = this.guildState(), self = this;
    var busy = { guard: 1, explore: 1, gather: 1 };
    g.adventurers.forEach(function (a) {
      if (!busy[a.status]) return;
      var A = self.advEnsure(a);
      var info = self.advStaminaInfo(a);
      var d = self.guildDerived(a);
      a.currentHp = num(a.currentHp, d.maxHp) - info.hpCost;
      a.currentMp = num(a.currentMp, d.maxMp) - info.mpCost;
      // ⭐ 體力下限保護：氣血見底 → 透支計數 +1；內力不得為負
      if (a.currentHp <= info.hpCost) {
        a.currentHp = 1;
        A.strain = num(A.strain, 0) + 1;
        if (A.strain === 3 || A.strain % 5 === 0) {
          self.guildLog('😰 【' + a.name + '】任務中過度透支（累計 ' + A.strain + ' 次），成功率與安危受影響。', 'system');
        }
      }
      if (a.currentMp < 0) a.currentMp = 0;
      self.advAutoPill(a);
    });
  };

  /* ══════════════════════════════════════════════════════
     成功率：併入特質、透支懲罰、研究加成
     ══════════════════════════════════════════════════════ */
  var _guildEstimate = proto.guildEstimate;
  proto.guildEstimate = function (missionId, advIds, needOverride) {
    var r = _guildEstimate.call(this, missionId, advIds, needOverride);
    var m = this.guildMissionById(missionId);
    var type = m ? m.type : 'explore';
    var self = this, bonus = 0, strainPen = 0, n = 0;
    (advIds || []).forEach(function (id) {
      var a = self.guildAdventurer(id);
      if (!a) return;
      var aux = self.advTraitAux(a);
      var A = self.advEnsure(a);
      n += 1;
      if (type === 'guard') bonus += num(aux.successGuard, 0);
      else if (type === 'gather') bonus += num(aux.successGather, 0);
      else bonus += num(aux.successExplore, 0);
      strainPen += num(A.strain, 0) * CONFIG.STRAIN_PENALTY;
    });
    if (n > 0) { bonus /= n; strainPen /= n; }
    r.rate = Math.min(0.99, Math.max(0.05, num(r.rate, 0.5) + bonus - strainPen + this.getResearchBonus('advSuccess', 0)));
    r.traitBonus = bonus;
    r.strainPen = strainPen;
    return r;
  };

  /* ══════════════════════════════════════════════════════
     治安：守夜人特質加碼
     ══════════════════════════════════════════════════════ */
  var _guildOrder = proto.guildOrderBonus;
  proto.guildOrderBonus = function () {
    var o = _guildOrder.call(this), self = this;
    this.guildState().missions.forEach(function (m) {
      if (m.type !== 'guard') return;
      (m.advIds || []).forEach(function (id) {
        var a = self.guildAdventurer(id);
        if (!a) return;
        o += num(self.advTraitAux(a).orderPlus, 0);
      });
    });
    return o;
  };

  /* ══════════════════════════════════════════════════════
     任務時間：輕功／天命／祝福可縮短
     ══════════════════════════════════════════════════════ */
  proto.advSpeedPct = function (advIds) {
    var self = this, pct = 0, n = 0;
    (advIds || []).forEach(function (id) {
      var a = self.guildAdventurer(id);
      if (!a) return;
      var b = self.advBonus(a);
      pct += num(b.speedPct, 0);
      n += 1;
    });
    return n > 0 ? (pct / n) : 0;
  };

  proto.advApplySpeed = function (task) {
    if (!task || !task.advIds) return;
    var pct = this.advSpeedPct(task.advIds);
    if (pct >= 0) return;
    var factor = Math.max(0.4, 1 + pct);
    var total = Math.max(1, Math.round(num(task.totalTicks, 1) * factor));
    var left = Math.max(1, Math.round(num(task.remain, total) * factor));
    task.totalTicks = total;
    task.remain = left;
    var self = this;
    task.advIds.forEach(function (id) {
      var a = self.guildAdventurer(id);
      if (a) a.missionEnd = left;
    });
  };

  var _dispatch = proto.guildDispatch;
  proto.guildDispatch = function (missionId, advIds) {
    var ok = _dispatch.call(this, missionId, advIds);
    if (!ok) return ok;
    var g = this.guildState();
    this.advApplySpeed(g.missions[g.missions.length - 1]);
    return ok;
  };

  var _acceptContract = proto.guildAcceptContract;
  proto.guildAcceptContract = function (contractId, advIds) {
    var r = _acceptContract.call(this, contractId, advIds);
    if (r && r.ok) {
      var g = this.guildState();
      this.advApplySpeed(g.missions[g.missions.length - 1]);
    }
    return r;
  };

  /* ══════════════════════════════════════════════════════
     掛載 guildTick：體力消耗先於任務推進
     ══════════════════════════════════════════════════════ */
  var _guildTick = proto.guildTick;
  proto.guildTick = function () {
    try { this.advStaminaTick(); } catch (e) { console.error('[townGuildAdv] advStaminaTick 錯誤：', e); }
    _guildTick.call(this);
  };

  /* ══════════════════════════════════════════════════════
     掛載 guildResolveTask：任務結算後補發冒險者武學點數、
     累積精通、套用特質（經驗／聲望／掉落／減傷）
     ══════════════════════════════════════════════════════ */
  var _resolve = proto.guildResolveTask;
  proto.guildResolveTask = function (task) {
    var self = this;
    var ids = (task && task.advIds) ? task.advIds.slice() : [];
    var baseSp = Math.max(1, Math.round(num(task && task.reward && task.reward.sp, 1) * (1 + this.getResearchBonus('advSpMul', 0))));
    var missionType = (task && task.type) ? task.type : 'explore';

    _resolve.call(this, task);

    var g = this.guildState();
    var extraLoot = [];

    ids.forEach(function (id) {
      var adv = self.guildAdventurer(id);
      if (!adv) return;
      var A = self.advEnsure(adv);
      var aux = self.advTraitAux(adv);

      // ① 冒險者武學點數
      A.advSp = num(A.advSp, 0) + baseSp;

      // ② 任務成功後重置透支計數（視為休整）
      if (adv.status === 'idle') A.strain = 0;

      // ③ 精通自然累積
      self.advMasteryGain(adv, 2);

      // ④ 受傷減免（特質「鐵人」＋研究「精英栽培」）
      if (adv.status === 'injured') {
        var reduce = Math.min(0.75, num(aux.injury, 0) * -1 + (self.getResearchBonus('advInjury', 0) * -1));
        if (reduce > 0 && Math.random() < reduce) {
          adv.status = 'idle';
          adv.injuredUntil = 0;
          var d0 = self.guildDerived(adv);
          adv.currentHp = d0.maxHp; adv.currentMp = d0.maxMp;
          extraLoot.push('🩹【' + adv.name + '】因體質強健免於重傷');
        }
      }

      // ⑤ 掉落加碼（特質「幸運星」／「採集達人」）
      var lootP = num(aux.lootAll, 0) + (missionType === 'gather' ? num(aux.lootGather, 0) : 0);
      if (lootP > 0 && Math.random() < Math.min(0.6, lootP)) {
        var kind = (missionType === 'gather' && Math.random() < 0.5) ? 'consumable' : 'equip';
        var m2 = self.guildGrantItem(kind);
        if (m2) extraLoot.push('🍀【' + adv.name + '】額外收穫：' + m2);
      }
    });

    // ⑥ 公會聲望加碼（特質「交遊廣闊」）
    var repBonus = 0;
    ids.forEach(function (id) {
      var a = self.guildAdventurer(id);
      if (!a) return;
      repBonus += num(self.advTraitAux(a).repMul, 0);
    });
    if (repBonus > 0) {
      var add = Math.max(1, Math.round(6 * repBonus * ids.length));
      g.reputation += add;
    }

    extraLoot.forEach(function (m) { self.guildLog('　' + m, 'loot'); });
  };

  /* ══════════════════════════════════════════════════════
     招募時自動指派特質（包裝 guildCreateAdventurer）
     ══════════════════════════════════════════════════════ */
  var _createAdv = proto.guildCreateAdventurer;
  proto.guildCreateAdventurer = function (npc, opts) {
    var adv = _createAdv.call(this, npc, opts);
    if (adv) {
      this.advEnsure(adv);
      this.advAssignTraits(adv);
      var A = adv.adv;
      // 給一點起始武學點數，讓新人馬上有事做
      A.advSp = num(A.advSp, 0) + 10 + Math.floor(num(adv.lv, 1) * 0.5);
    }
    return adv;
  };

  /* ══════════════════════════════════════════════════════
     完整面板資料（供 UI 一次取得所有資訊）
     ══════════════════════════════════════════════════════ */
  proto.advReport = function (advId) {
    var adv = this.guildAdventurer(advId);
    if (!adv) return null;
    var A = this.advEnsure(adv);
    var self = this;
    var d = this.guildDerived(adv);
    var b = this.advBonus(adv);
    var tier = this.advTier(adv);

    function kindsOf(kind) {
      var store = self.advStore(adv, kind);
      var act = (kind === 'xinfa') ? adv.activeXinfa : (kind === 'qinggong' ? adv.activeQinggong : null);
      return listOf(kind).map(function (def) {
        var lv = num(store[def._id], 0);
        var cost = (lv > 0) ? self.advUpgradeCost(adv, def, lv) : self.advLearnCost(adv, def);
        return {
          def: def, lv: lv, active: (act === def._id),
          can: (lv > 0) ? self.advCanUpgrade(kind, def._id, advId) : self.advCanLearn(kind, def._id, advId),
          cost: cost
        };
      });
    }

    return {
      adv: adv, tier: tier, derived: d, bonus: b, aux: this.advTraitAux(adv),
      traits: this.advTraitDefs(adv), advSp: num(A.advSp, 0), strain: num(A.strain, 0),
      stat: A.stat, tactics: A.tactics,
      allocated: this.advAllocated(adv), freePoints: num(adv.freePoints, 0),
      respecCost: this.advRespecCost(adv), canRespec: this.advCanRespec(advId),
      transfuseCost: this.advTransfuseCost(adv, 1),
      stamina: this.advStaminaInfo(adv),
      canForge: this.guildCanForge(),
      arty: kindsOf('arty'), xinfa: kindsOf('xinfa'), qinggong: kindsOf('qinggong'),
      spiritRoot: adv.spiritRoot ? findDef('root', adv.spiritRoot) : null,
      spiritRootLv: num(adv.spiritRootLv, 1),
      rootList: this.advRootList(),
      awakenCost: this.advAwakenCost(adv), canAwaken: this.advCanAwaken(advId, null),
      refineCost: this.advRefineCost(adv), canRefine: this.advCanRefine(advId),
      mastery: this.advMasteryList().map(function (def) {
        var lv = self.advMasteryLv(adv, def._id);
        return { def: def, lv: lv, cost: self.advMasteryCost(adv, lv), can: self.advCanMasteryUp(advId, def._id) };
      }),
      destiny: this.advDestinyList().map(function (def) {
        var lv = num(adv.destinySkills[def._id], 0);
        return { def: def, lv: lv, can: self.advCanDestiny(advId, def._id) };
      }),
      bless: this.advBlessList().map(function (def) {
        var lv = num(adv.guildBlessings[def._id], 0);
        return { def: def, lv: lv, can: self.advCanBless(advId, def._id) };
      })
    };
  };

  /* ══════════════════════════════════════════════════════
     掛載 getStats：帶出深造統計
     ══════════════════════════════════════════════════════ */
  var _getStats = proto.getStats;
  proto.getStats = function () {
    var s = _getStats.call(this);
    if (s.guild) s.guild.advance = this.advGlobalStats();
    return s;
  };

  proto.advGlobalStats = function () {
    var self = this;
    var out = { learned: 0, upgrades: 0, pills: 0, transfused: 0, respec: 0, awaken: 0, refine: 0, blessed: 0, destiny: 0, advSp: 0, strains: 0, traited: 0 };
    this.guildAdventurers().forEach(function (a) {
      var A = self.advEnsure(a);
      Object.keys(out).forEach(function (k) {
        if (k === 'advSp') out[k] += num(A.advSp, 0);
        else if (k === 'strains') out[k] += num(A.strain, 0);
        else if (k === 'traited') { if (A.traits.length) out[k] += 1; }
        else out[k] += num(A.stat[k], 0);
      });
    });
    return out;
  };

  /* ══════════════════════════════════════════════════════
     對外匯出
     ══════════════════════════════════════════════════════ */
  window.HY.TownGuildAdv = {
    version: '1.0',
    config: CONFIG,
    buildings: Object.keys(NEW_TYPES).length,
    research: 4,
    traits: TRAITS.length,
    destiny: T.GUILDADV.DESTINY.length,
    blessings: T.GUILDADV.BLESSINGS.length,
    tiers: T.GUILDADV.TIERS.length
  };
})();