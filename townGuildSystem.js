// js/townGuildSystem.js (v1)
// ⭐ 我的小鎮：冒險者公會（Adventurer's Guild）
//
// ① 新建築：冒險者公會 / 委託榜 / 練功場 / 公會鍛造坊（分類：公會 ⚔️）
// ② 鎮民（虛擬人物）註冊為「冒險者」，擁有完整角色面板
// ③ 冒險者比照玩家角色：等級／經驗／四維（體魄力道身法內息）／十部位裝備／
//    門派（沿用真實 15 門派）／潛能點／氣血內力／戰力（真經脈）
//    ★ 直接呼叫 charSys.getDerivedStatsForChar()，與玩家同一套公式，非另寫一套
// ④ 公會倉庫：玩家存入裝備 → 冒險者依「等級需求 + 戰力比較」自動配裝
// ⑤ 任務派遣：守護小鎮／探險／採集，歷時完成並帶回獎勵
// ⑥ 治安：守護類任務進行中提升治安，盜匪事件改判為退敵成功
// ⑦ 公會等級／聲望：完成任務累積，解鎖更多成員與倉庫格數
// ⑧ 委託榜：隨機高報酬委託
// ⑨ 公會鍛造坊：花銀兩強化裝備（+10 上限，每級 +8% 戰力）
// ⑩ 練功場：花銀兩換取冒險者經驗
// ⑪ 傷病與療養
// ⑫ 公會日誌
//
// ⚠️ 載入順序：townSystem.js 之後、uiTown.js 之前。
//    所有可調參數集中在下方 CONFIG。

window.HY = window.HY || {};
(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[townGuild] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[townGuild] 找不到 HY.TownSystem'); return; }

  /* ══════════════════════════════════════════════════════
     CONFIG —— 全部可調參數
     ══════════════════════════════════════════════════════ */
  var CONFIG = {
    NAME: '冒險者公會',
    MAX_ADV_BASE: 3,          // 公會 Lv.1 可容納的冒險者數
    MAX_ADV_PER_LV: 3,        // 每提升 1 級公會 +3 名額
    STORAGE_BASE: 16,         // 倉庫格數（基礎）
    STORAGE_PER_LV: 12,       // 每提升 1 級公會 +12 格
    MISSION_SLOTS_BASE: 1,    // 同時可進行的任務數
    MISSION_SLOTS_PER_LV: 2,  // 每 2 級 +1
    LV_REP: [0, 60, 180, 420, 900, 1800, 3400, 6000, 10000, 16000, 25000],
    INJURY_CHANCE: 0.16,      // 任務失敗時受傷機率
    INJURY_TICKS: [8, 18],    // 受傷需休養的期數
    HEAL_COST_PER_HP: 0.02,   // 療養：每點氣血消耗銀兩
    TRAIN_COST: 300,          // 練功場每次訓練費用
    TRAIN_EXP: 0.30,          // 訓練可得經驗（＝自身 maxExp × 此值）
    TRAIN_YARD_DISCOUNT: 0.30,// 有練功場時的訓練折扣
    FORGE_COST_MUL: 2.2,      // 強化費用＝裝備物價 × 此值 × 目前強化等級
    FORGE_POWER_STEP: 0.08,   // 每次強化 +8% 戰力
    FORGE_MAX_LV: 10,         // 強化上限
    AUTO_EQUIP: true          // 是否自動配裝
  };
  T.GUILD = T.GUILD || {};
  T.GUILD.CONFIG = CONFIG;
  T.GUILD.NAME = CONFIG.NAME;

  /* ══════════════════════════════════════════════════════
     分類（新增「公會」大類）
     ══════════════════════════════════════════════════════ */
  T.CATS = T.CATS || {};
  T.CATS.guild = { name: '公會', icon: '⚔️', order: 11 };

  /* ══════════════════════════════════════════════════════
     新建築
     ══════════════════════════════════════════════════════ */
  var NEW_TYPES = {
    adventurerGuild: { name: '冒險者公會', icon: '⚔️', cat: 'guild', cost: 2000, income: 35, appeal: 14, land: 110, research: 'guildCharter',
      desc: '冒險者們的家。鎮民在此註冊登記，出鎮守、探險、採集之任務。' },
    commissionBoard: { name: '委託榜', icon: '📋', cat: 'guild', cost: 1200, income: 20, appeal: 8, land: 70, research: 'guildArmory',
      desc: '四方懸賞張貼於此，報酬豐厚，唯有實力的公會才接得下。' },
    drillYard:       { name: '練功場', icon: '🥋', cat: 'guild', cost: 1500, income: 15, appeal: 10, land: 80, research: 'guildDrill',
      desc: '冒險者在此對練操演，訓練費用大幅降低。' },
    forgeHall:       { name: '公會鍛造坊', icon: '🔨', cat: 'guild', cost: 3500, income: 40, appeal: 9, land: 120, research: 'guildForge',
      desc: '專為公會成員打造與強化兵器的所在。' }
  };
  Object.keys(NEW_TYPES).forEach(function (k) { if (!T.TYPES[k]) T.TYPES[k] = NEW_TYPES[k]; });

  /* ══════════════════════════════════════════════════════
     新研究（解鎖公會建築與強化）
     ══════════════════════════════════════════════════════ */
  T.RESEARCH = T.RESEARCH.concat([
    { id: 'guildCharter', name: '公會章程', icon: '📜', cost: 3000,  desc: '解鎖【冒險者公會】，公會成員上限 +2。', unlock: ['adventurerGuild'], bonus: { guildSlots: 2 } },
    { id: 'guildArmory',  name: '兵器武庫', icon: '🗄️', cost: 4000,  desc: '解鎖【委託榜】，公會倉庫 +12 格。',     unlock: ['commissionBoard'], bonus: { guildStorage: 12 } },
    { id: 'guildDrill',   name: '操演之法', icon: '🎯', cost: 6000,  desc: '解鎖【練功場】，任務成功率 +8%、冒險者經驗 +15%。', unlock: ['drillYard'], bonus: { guildSuccess: 0.08, guildExpMul: 0.15 } },
    { id: 'guildForge',   name: '鍛造技藝', icon: '🔨', cost: 8000,  desc: '解鎖【公會鍛造坊】，強化費用 -20%。',     unlock: ['forgeHall'], bonus: { guildForgeCost: -0.20 } },
    { id: 'guildHall',    name: '公會大殿', icon: '🏛️', cost: 12000, desc: '公會成員上限 +4，任務欄位 +1。',          bonus: { guildSlots: 4, guildMissionSlot: 1 } },
    { id: 'guildLegend',  name: '英靈殿',   icon: '🏆', cost: 20000, desc: '任務獎勵 +25%，公會聲望成長 +30%。',      bonus: { guildRewardMul: 0.25, guildRepMul: 0.30 } }
  ]);

  /* ══════════════════════════════════════════════════════
     職業（決定四維配點走向）
     alloc 總和必須為 5（比照玩家每級 5 點潛能）
     ══════════════════════════════════════════════════════ */
  T.GUILD.ROLES = {
    swordsman: { name: '劍客', icon: '🗡️', desc: '以劍入道，攻守均衡。',
      base: { con: 10, str: 12, agi: 12, int: 8 },  alloc: { con: 1, str: 2, agi: 2, int: 0 } },
    blade:     { name: '刀客', icon: '⚔️', desc: '刀走剛猛，力大身沉。',
      base: { con: 12, str: 14, agi: 8,  int: 7 },  alloc: { con: 2, str: 3, agi: 0, int: 0 } },
    boxer:     { name: '拳師', icon: '👊', desc: '外家拳腳，體魄驚人。',
      base: { con: 14, str: 12, agi: 9,  int: 7 },  alloc: { con: 3, str: 2, agi: 0, int: 0 } },
    spearman:  { name: '槍豪', icon: '🔱', desc: '槍出如龍，一寸長一寸強。',
      base: { con: 11, str: 14, agi: 10, int: 7 },  alloc: { con: 1, str: 3, agi: 1, int: 0 } },
    archer:    { name: '弓弩手', icon: '🏹', desc: '百步穿楊，身法靈動。',
      base: { con: 9,  str: 12, agi: 14, int: 8 },  alloc: { con: 0, str: 2, agi: 3, int: 0 } },
    assassin:  { name: '刺客', icon: '🗡', desc: '一擊必殺，來去如風。',
      base: { con: 8,  str: 12, agi: 16, int: 8 },  alloc: { con: 0, str: 1, agi: 4, int: 0 } },
    healer:    { name: '醫者', icon: '🌿', desc: '懸壺濟世，內息綿長。',
      base: { con: 12, str: 8,  agi: 9,  int: 14 }, alloc: { con: 2, str: 0, agi: 0, int: 3 } },
    sorcerer:  { name: '術士', icon: '🔮', desc: '內力浩瀚，術法通玄。',
      base: { con: 10, str: 8,  agi: 9,  int: 16 }, alloc: { con: 1, str: 0, agi: 0, int: 4 } },
    ranger:    { name: '遊俠', icon: '🧭', desc: '四方遊歷，樣樣通曉。',
      base: { con: 11, str: 11, agi: 11, int: 11 }, alloc: { con: 1, str: 1, agi: 1, int: 2 } }
  };
  T.GUILD.ROLE_ORDER = ['swordsman', 'blade', 'boxer', 'spearman', 'archer', 'assassin', 'healer', 'sorcerer', 'ranger'];

  /* ══════════════════════════════════════════════════════
     任務模板
     type: guard 守護 / explore 探險 / gather 採集
     n: [最少人數, 最多人數]　ticks: [最短, 最長]（營運期）
     need: 每人建議戰力　exp/gold/sp: 每位成員的基礎獎勵
     order: 任務進行中提供的治安值
     loot: 完成後有機率帶回的物品
     ══════════════════════════════════════════════════════ */
  T.GUILD.MISSIONS = [
    { id: 'patrol',    name: '巡守鎮郊', icon: '🛡️', type: 'guard',   n: [1, 3], ticks: [6, 10],  need: 1600, exp: 180,  gold: 120,  sp: 1,  order: 2, desc: '於鎮郊來回巡邏，驅逐宵小。' },
    { id: 'escort',    name: '押送鏢貨', icon: '📦', type: 'guard',   n: [2, 3], ticks: [10, 16], need: 2600, exp: 420,  gold: 400,  sp: 3,  order: 3, desc: '護送鏢車穿越險道，不容有失。' },
    { id: 'nightWatch',name: '夜巡城防', icon: '🏮', type: 'guard',   n: [2, 4], ticks: [8, 14],  need: 2200, exp: 300,  gold: 240,  sp: 2,  order: 4, desc: '夜間巡城，嚴防盜匪趁虛而入。' },
    { id: 'scout',     name: '近郊探查', icon: '🧭', type: 'explore', n: [1, 2], ticks: [8, 14],  need: 1800, exp: 520,  gold: 260,  sp: 4,  loot: { chance: 0.25, kind: 'consumable' }, desc: '探查近郊地形與妖物動向。' },
    { id: 'hunt',      name: '獵捕凶獸', icon: '🐺', type: 'explore', n: [2, 3], ticks: [12, 20], need: 2800, exp: 900,  gold: 600,  sp: 8,  loot: { chance: 0.35, kind: 'consumable' }, desc: '追獵為禍一方的凶獸。' },
    { id: 'ruins',     name: '祕境探索', icon: '🗺️', type: 'explore', n: [2, 4], ticks: [16, 26], need: 3400, exp: 1400, gold: 900,  sp: 12, loot: { chance: 0.50, kind: 'equip' }, desc: '深入上古祕境，尋寶獵奇。' },
    { id: 'bounty',    name: '懸賞緝凶', icon: '💰', type: 'explore', n: [3, 4], ticks: [18, 30], need: 4200, exp: 2600, gold: 2200, sp: 22, loot: { chance: 0.70, kind: 'equip' }, desc: '追緝官府懸賞的江洋大盜。' },
    { id: 'secretRealm',name:'洞天探險', icon: '🌀', type: 'explore', n: [3, 4], ticks: [24, 40], need: 5600, exp: 4200, gold: 3600, sp: 40, loot: { chance: 0.90, kind: 'equip', num: [1, 2] }, desc: '探索洞天福地，機緣千載難逢。' },
    { id: 'gatherHerb',name: '藥圃採集', icon: '🌿', type: 'gather',  n: [1, 3], ticks: [6, 10],  need: 1400, exp: 220,  gold: 80,   sp: 2,  loot: { chance: 0.80, kind: 'consumable', num: [1, 3] }, desc: '採集山間藥草，充實小鎮藥鋪。' },
    { id: 'wood',      name: '伐木取材', icon: '🪓', type: 'gather',  n: [1, 3], ticks: [6, 10],  need: 1400, exp: 180,  gold: 100,  sp: 1,  loot: { chance: 0.50, kind: 'consumable' }, desc: '砍伐木材，供鎮上營建之用。' },
    { id: 'fish',      name: '江上捕撈', icon: '🎣', type: 'gather',  n: [1, 2], ticks: [6, 12],  need: 1500, exp: 200,  gold: 160,  sp: 2,  loot: { chance: 0.60, kind: 'consumable' }, desc: '江上捕魚，兼可休憩。' },
    { id: 'mine',      name: '礦脈開採', icon: '⛏️', type: 'gather',  n: [2, 3], ticks: [10, 18], need: 2400, exp: 420,  gold: 300,  sp: 5,  loot: { chance: 0.60, kind: 'equip' }, desc: '開採礦脈，或能掘出前人遺落的裝備。' }
  ];

  /* ══════════════════════════════════════════════════════
     委託榜（隨機產生）
     ══════════════════════════════════════════════════════ */
  T.GUILD.CONTRACT_TEMPLATES = [
    { tpl: '為{name}尋回失竊的家傳寶物',   icon: '🔍', type: 'explore', mul: 1.6 },
    { tpl: '護送{name}安全返鄉',           icon: '🐎', type: 'guard',   mul: 1.3 },
    { tpl: '替{name}剷除盤據山道的匪徒',   icon: '🗡️', type: 'guard',   mul: 1.8 },
    { tpl: '為{name}採集罕見藥材',         icon: '🌿', type: 'gather',  mul: 1.4 },
    { tpl: '探查{name}所言之詭異洞窟',     icon: '🕳️', type: 'explore', mul: 2.0 },
    { tpl: '代{name}押運一批機密貨物',     icon: '📦', type: 'guard',   mul: 1.5 },
    { tpl: '{name}請求援手，圍剿妖獸',     icon: '🐲', type: 'explore', mul: 2.2 },
    { tpl: '為{name}尋訪名師下落',         icon: '🧙', type: 'explore', mul: 1.7 }
  ];
  T.GUILD.CONTRACT_NAMES = ['揚州鹽商', '洛陽鏢頭', '江南藥商', '關中豪紳', '蜀中茶商', '塞外馬販', '京師捕快', '無名隱士', '鎮上耆老', '書院山長'];

  /* ══════════════════════════════════════════════════════
     鎮民姓名補充
     ══════════════════════════════════════════════════════ */
  T.NPC_NAMES = T.NPC_NAMES.concat([
    '周鐵山', '柳月娥', '陸青雲', '程素心', '孟長風', '夏語冰', '楚寒江', '衛無涯',
    '范天行', '杜若蘭', '安小樓', '竇一虎', '費無極', '龔嘯天', '鍾離雪'
  ]);

  /* ══════════════════════════════════════════════════════
     工具函式
     ══════════════════════════════════════════════════════ */
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function uid(prefix) { return (prefix || 'g') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function maxExpFor(lv) { return Math.floor(100 * Math.pow(lv, 1.85) + lv * 120); }

  /* ══════════════════════════════════════════════════════
     裝備：部位、戰力、可用性
     ══════════════════════════════════════════════════════ */

  /** 取得十部位 key 清單（優先沿用 equipSys.SLOTS，保證與玩家一致） */
  proto.guildSlots = function () {
    var es = window.HY.game && window.HY.game.equipSys;
    if (es && es.SLOTS) return Object.keys(es.SLOTS);
    return ['mainhand', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring_left', 'ring_right'];
  };

  proto.guildSlotName = function (key) {
    var es = window.HY.game && window.HY.game.equipSys;
    if (es && es.SLOTS && es.SLOTS[key]) return es.SLOTS[key].name + ' ' + es.SLOTS[key].icon;
    return key;
  };

  /** 裝備的原始加成（沿用玩家同一套 poeSys 計算，含詞綴） */
  proto.guildItemBonus = function (item) {
    if (!item || typeof item !== 'object') return null;
    var poe = window.HY.game && window.HY.game.poeSys;
    if (poe && typeof poe.getItemTotalBonus === 'function') {
      try { return poe.getItemTotalBonus(item); } catch (e) { /* 忽略 */ }
    }
    return null;
  };

  /** 裝備戰力（沿用 charSys.getPowerScore，與玩家同一把尺） */
  proto.guildItemPower = function (item) {
    if (!item || typeof item !== 'object') return 0;
    var b = this.guildItemBonus(item);
    var cs = this.charSys;
    var p = 0;
    if (b && cs && typeof cs.getPowerScore === 'function') {
      p = cs.getPowerScore(b);
    } else if (typeof item.price === 'number') {
      p = item.price * 2;
    }
    // 鍛造強化：每次 +FORGE_POWER_STEP，以乘法疊加
    var flv = num(item._forgeLv, 0);
    if (flv > 0) p = p * Math.pow(1 + CONFIG.FORGE_POWER_STEP, flv);
    return Math.round(p);
  };

  /** 裝備部位；戒指類回傳 'ring' 表示左右手皆可 */
  proto.guildItemSlot = function (item) {
    if (!item) return null;
    var s = item.slotType || item.slot;
    if (!s) return null;
    if (s === 'ring') return 'ring';
    return this.guildSlots().indexOf(s) !== -1 ? s : null;
  };

  /** 該裝備能否由該冒險者使用（等級需求） */
  proto.guildCanUse = function (adv, item) {
    if (!adv || !item) return false;
    if (!this.guildItemSlot(item)) return false;
    return num(item.reqLv, 1) <= num(adv.lv, 1);
  };

  proto.guildItemLabel = function (item) {
    if (!item) return '（空）';
    var flv = num(item._forgeLv, 0);
    return (item.rareTitle || '') + (item.name || '未知裝備') + (flv > 0 ? ' +' + flv : '');
  };

  /* ══════════════════════════════════════════════════════
     門派
     ══════════════════════════════════════════════════════ */
  proto.guildSectList = function () {
    var S = (window.HY.Data && window.HY.Data.SECTS) || {};
    return Object.keys(S).map(function (k) { return S[k]; });
  };

  proto.guildSect = function (id) {
    var S = (window.HY.Data && window.HY.Data.SECTS) || {};
    return id ? (S[id] || null) : null;
  };

  proto.guildSectName = function (id) {
    var s = this.guildSect(id);
    return s ? s.name : '無門無派';
  };

  /** 冒險者可入門派的最低等級（沿用真實門派 reqLv，通常 10） */
  proto.guildSectReqLv = function () {
    var list = this.guildSectList();
    var min = 999;
    list.forEach(function (s) { if (num(s.reqLv, 10) < min) min = num(s.reqLv, 10); });
    return min === 999 ? 10 : min;
  };

  /* ══════════════════════════════════════════════════════
     公會狀態（存在 rootState.town.guild）
     ══════════════════════════════════════════════════════ */
  proto.guildDefaultState = function () {
    return {
      adventurers: [],   // 冒險者（完整角色面板）
      storage: [],       // 公會倉庫（裝備實例陣列）
      missions: [],      // 進行中的任務
      contracts: [],     // 委託榜
      contractRefresh: 0,
      reputation: 0,     // 公會聲望
      autoEquip: CONFIG.AUTO_EQUIP,
      log: [],           // 公會日誌
      stats: { missions: 0, succeeded: 0, failed: 0, loot: 0, levelUps: 0, equipped: 0, forged: 0, trained: 0, injured: 0, contracts: 0 }
    };
  };

  proto.guildState = function () {
    var t = this.ensureState();
    if (!t.guild || typeof t.guild !== 'object') t.guild = this.guildDefaultState();
    var g = t.guild;
    var d = this.guildDefaultState();
    var k;
    for (k in d) { if (Object.prototype.hasOwnProperty.call(d, k) && g[k] === undefined) g[k] = d[k]; }
    ['adventurers', 'storage', 'missions', 'contracts', 'log'].forEach(function (x) { if (!Array.isArray(g[x])) g[x] = []; });
    if (!g.stats || typeof g.stats !== 'object') g.stats = d.stats;
    for (k in d.stats) { if (g.stats[k] === undefined) g.stats[k] = 0; }

    // 清理：來源鎮民已不存在的冒險者
    var alive = {};
    (t.residents || []).forEach(function (p) { alive[p.id] = true; });
    g.adventurers = g.adventurers.filter(function (a) { return alive[a.npcId]; });
    return g;
  };

  proto.guildLog = function (msg, type) {
    var g = this.guildState();
    g.log.unshift({ t: Date.now(), msg: msg, type: type || 'guild' });
    if (g.log.length > 120) g.log.pop();
    this.log('[公會] ' + msg, type || 'time');
  };

  /* ══════════════════════════════════════════════════════
     公會建築 / 等級
     ══════════════════════════════════════════════════════ */
  proto.guildBuilding = function () {
    var t = this.ensureState();
    for (var i = 0; i < t.buildings.length; i++) {
      if (t.buildings[i].type === 'adventurerGuild') return t.buildings[i];
    }
    return null;
  };

  proto.isGuildFounded = function () { return !!this.guildBuilding(); };

  proto.hasBuilding = function (typeId) {
    var t = this.ensureState();
    for (var i = 0; i < t.buildings.length; i++) {
      if (t.buildings[i].type === typeId) return true;
    }
    return false;
  };

  /** 公會等級（依聲望） */
  proto.guildLevel = function () {
    var g = this.guildState();
    var lv = 1;
    for (var i = 0; i < CONFIG.LV_REP.length; i++) {
      if (g.reputation >= CONFIG.LV_REP[i]) lv = i + 1;
    }
    return Math.min(lv, CONFIG.LV_REP.length);
  };

  proto.guildLevelInfo = function () {
    var lv = this.guildLevel();
    var g = this.guildState();
    var next = CONFIG.LV_REP[lv] !== undefined ? CONFIG.LV_REP[lv] : null;
    var prev = CONFIG.LV_REP[lv - 1] || 0;
    var titles = ['新立公會', '小有名氣', '聲名鵲起', '四方來投', '一方雄會', '名動江湖', '天下聞名', '傳奇公會', '武林聖地', '不朽傳說', '萬世流芳'];
    return {
      lv: lv,
      rep: g.reputation,
      nextRep: next,
      progress: next ? Math.max(0, Math.min(100, Math.floor((g.reputation - prev) / Math.max(1, next - prev) * 100))) : 100,
      title: titles[Math.min(lv - 1, titles.length - 1)]
    };
  };

  proto.guildMaxAdventurers = function () {
    return CONFIG.MAX_ADV_BASE + (this.guildLevel() - 1) * CONFIG.MAX_ADV_PER_LV + this.getResearchBonus('guildSlots', 0);
  };

  proto.guildStorageCap = function () {
    var base = CONFIG.STORAGE_BASE + (this.guildLevel() - 1) * CONFIG.STORAGE_PER_LV + this.getResearchBonus('guildStorage', 0);
    if (this.hasBuilding('commissionBoard')) base += 8;
    if (this.hasBuilding('forgeHall')) base += 8;
    return base;
  };

  proto.guildMissionSlots = function () {
    return CONFIG.MISSION_SLOTS_BASE + Math.floor(this.guildLevel() / 2) * CONFIG.MISSION_SLOTS_PER_LV + this.getResearchBonus('guildMissionSlot', 0);
  };

  proto.guildExpMul = function () { return 1 + this.getResearchBonus('guildExpMul', 0); };
  proto.guildSuccessBonus = function () {
    var b = this.getResearchBonus('guildSuccess', 0);
    if (this.hasBuilding('drillYard')) b += 0.06;
    return b;
  };
  proto.guildRewardMul = function () {
    var b = 1 + this.getResearchBonus('guildRewardMul', 0);
    if (this.hasBuilding('commissionBoard')) b += 0.05;
    return b;
  };
  proto.guildRepMul = function () { return 1 + this.getResearchBonus('guildRepMul', 0); };

  /** 公會提供的治安值（進行中的守護任務） */
  proto.guildOrderBonus = function () {
    var o = 0;
    this.guildState().missions.forEach(function (m) { if (m.type === 'guard') o += num(m.order, 0); });
    return o;
  };

  /** 公會提供的小幅收入加成（聲望/2000，上限 10%） */
  proto.guildIncomeBonus = function () {
    return Math.min(0.10, this.guildState().reputation / 2000);
  };

  /* ══════════════════════════════════════════════════════
     冒險者建立 / 註冊
     ══════════════════════════════════════════════════════ */
  proto.guildCreateAdventurer = function (npc, opts) {
    opts = opts || {};
    var roleId = opts.role || pick(T.GUILD.ROLE_ORDER);
    var role = T.GUILD.ROLES[roleId] || T.GUILD.ROLES.ranger;
    var lv = Math.max(1, num(opts.lv, num(npc.lv, 1)));

    // 依職業比例自動分配「每級 5 點潛能」
    var alloc = role.alloc;
    var total = (alloc.con + alloc.str + alloc.agi + alloc.int) || 5;
    var pool = (lv - 1) * 5;
    var acc = { con: 0, str: 0, agi: 0, int: 0 };
    var used = 0;
    ['con', 'str', 'agi', 'int'].forEach(function (k) {
      var v = Math.floor(pool * (alloc[k] / total));
      acc[k] = v; used += v;
    });
    var maxK = 'con';
    ['con', 'str', 'agi', 'int'].forEach(function (k) { if (alloc[k] > alloc[maxK]) maxK = k; });
    acc[maxK] += (pool - used);

    var adv = {
      id: uid('adv'),
      npcId: npc.id,
      name: npc.name,
      lv: lv,
      exp: 0,
      maxExp: maxExpFor(lv),
      freePoints: 0,
      role: roleId,
      sect: null,
      stats: { con: role.base.con + acc.con, str: role.base.str + acc.str, agi: role.base.agi + acc.agi, int: role.base.int + acc.int },
      currentHp: 1, currentMp: 1,
      equipment: {},
      meridians: {},
      xinfa: {}, activeXinfa: null,
      qinggong: {}, activeQinggong: null,
      skills: { basic_punch: 1 },
      guildBlessings: {}, activeBlessing: null,
      destinySkills: {}, activeBuffs: {},
      sectFeature: {}, _battle: {},
      spiritRoot: null, spiritRootLv: 1,
      // 公會專屬
      status: 'idle',        // idle | guard | explore | gather | injured
      missionEnd: 0,
      missionId: null,
      injuredUntil: 0,
      totalMissions: 0,
      joined: Date.now(),
      x: npc.x, y: npc.y
    };

    // 十部位初始化
    var self = this;
    this.guildSlots().forEach(function (s) { adv.equipment[s] = null; });

    // 門派：達到門派最低等級即有一定機率拜入
    var req = this.guildSectReqLv();
    if (lv >= req) {
      var pool2 = this.guildSectList();
      if (pool2.length && Math.random() < 0.72) {
        var s2 = pick(pool2);
        adv.sect = s2.id;
        if (s2.signatureSkill) adv.skills[s2.signatureSkill] = 1;
      }
    }

    // 經脈：高等冒險者略有修為
    var MD = (window.HY.Data && window.HY.Data.MERIDIANS) || null;
    if (MD && MD.length && lv >= 20) {
      var mCount = Math.min(MD.length, Math.floor(lv / 45) + 1);
      var mLv = Math.min(5, Math.floor(lv / 60) + 1);
      for (var i = 0; i < mCount; i++) {
        var m = pick(MD);
        if (m && m.id) adv.meridians[m.id] = Math.max(num(adv.meridians[m.id], 0), mLv);
      }
    }

    var d = this.guildDerived(adv);
    adv.currentHp = d.maxHp; adv.currentMp = d.maxMp;
    return adv;
  };

  /** 用玩家同一套公式計算冒險者衍生屬性 */
  proto.guildDerived = function (adv) {
    var cs = this.charSys;
    if (cs && typeof cs.getDerivedStatsForChar === 'function') {
      try { return cs.getDerivedStatsForChar(adv); } catch (e) { /* 落入後備 */ }
    }
    // 後備（理論上不會用到）
    var s = adv.stats || { con: 10, str: 10, agi: 10, int: 10 };
    var lv = adv.lv || 1;
    return {
      maxHp: 100 + s.con * 15 + (lv - 1) * 35, maxMp: 50 + s.int * 8 + (lv - 1) * 15,
      atk: Math.floor(s.str * 2.5 + s.int * 1.0 + lv * 4),
      def: Math.floor(s.con * 1.5 + s.agi * 0.6 + lv * 2),
      hit: 90, eva: 5, crit: 5, critRes: 0, critDmg: 165, dmgReduce: 0, atkSpd: 100, powerScore: 100
    };
  };

  proto.guildPower = function (adv) {
    var d = this.guildDerived(adv);
    return num(d.powerScore, 0);
  };

  proto.guildClampVitals = function (adv) {
    var d = this.guildDerived(adv);
    adv.currentHp = Math.min(d.maxHp, Math.max(0, num(adv.currentHp, d.maxHp)));
    adv.currentMp = Math.min(d.maxMp, Math.max(0, num(adv.currentMp, d.maxMp)));
    return d;
  };

  proto.guildAdventurers = function () { return this.guildState().adventurers; };

  proto.guildAdventurer = function (id) {
    var list = this.guildAdventurers();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };

  proto.guildAdventurerByNpc = function (npcId) {
    var list = this.guildAdventurers();
    for (var i = 0; i < list.length; i++) if (list[i].npcId === npcId) return list[i];
    return null;
  };

  /** 可註冊的鎮民（尚未成為冒險者者） */
  proto.guildRecruitable = function () {
    var t = this.ensureState();
    var self = this;
    return (t.residents || []).filter(function (p) { return !self.guildAdventurerByNpc(p.id); });
  };

  proto.guildCanRecruit = function (npcId) {
    if (!this.isGuildFounded()) return { ok: false, msg: '尚未興建【冒險者公會】' };
    var g = this.guildState();
    if (g.adventurers.length >= this.guildMaxAdventurers()) {
      return { ok: false, msg: '公會名額已滿（' + g.adventurers.length + '/' + this.guildMaxAdventurers() + '）' };
    }
    if (!npcId) return { ok: true };
    var t = this.ensureState();
    var npc = null;
    (t.residents || []).forEach(function (p) { if (p.id === npcId) npc = p; });
    if (!npc) return { ok: false, msg: '找不到該鎮民' };
    if (this.guildAdventurerByNpc(npcId)) return { ok: false, msg: '已是公會成員' };
    return { ok: true, npc: npc };
  };

  proto.guildRecruit = function (npcId) {
    var chk = this.guildCanRecruit(npcId);
    if (!chk.ok) { this.log('⚠️ 無法入會：' + chk.msg, 'system'); return false; }
    var g = this.guildState();
    var adv = this.guildCreateAdventurer(chk.npc, {});
    g.adventurers.push(adv);
    var role = T.GUILD.ROLES[adv.role];
    this.guildLog('📜 鎮民【' + adv.name + '】註冊成為冒險者，職為【' + role.name + '】' +
      (adv.sect ? '，師承【' + this.guildSectName(adv.sect) + '】' : '') + '。', 'time');
    if (g.autoEquip) this.guildAutoEquip(adv.id);
    this.requestRender();
    return true;
  };

  /** 一次招募所有可招募鎮民 */
  proto.guildRecruitAll = function () {
    var list = this.guildRecruitable().slice();
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      if (this.guildCanRecruit().ok) { if (this.guildRecruit(list[i].id)) n += 1; }
    }
    return n;
  };

  proto.guildDismiss = function (advId) {
    var g = this.guildState();
    var adv = this.guildAdventurer(advId);
    if (!adv) return false;
    if (adv.status !== 'idle' && adv.status !== 'injured') {
      this.log('⚠️ 任務中的冒險者無法退會。', 'system');
      return false;
    }
    // 裝備退回倉庫
    var slots = this.guildSlots();
    var self = this;
    slots.forEach(function (s) {
      if (adv.equipment[s]) {
        if (g.storage.length < self.guildStorageCap()) g.storage.push(adv.equipment[s]);
        adv.equipment[s] = null;
      }
    });
    g.adventurers = g.adventurers.filter(function (a) { return a.id !== advId; });
    this.guildLog('👋 【' + adv.name + '】退出公會，裝備已歸還倉庫。', 'time');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     公會倉庫 & 自動配裝
     ══════════════════════════════════════════════════════ */
  proto.guildStorage = function () { return this.guildState().storage; };

  /** 玩家身上可存入公會的裝備清單（來自 equipBag 與主角穿戴中） */
  proto.guildPlayerEquipables = function () {
    var out = [], self = this;
    var root = this.charSys.rootState;
    (root.equipBag || []).forEach(function (it, i) {
      if (!it || typeof it !== 'object') return;
      var sl = self.guildItemSlot(it);
      if (!sl) return;
      out.push({ kind: 'bag', key: it.uid !== undefined ? it.uid : i, item: it, name: self.guildItemLabel(it),
        slot: sl, slotName: self.guildSlotName(sl === 'ring' ? 'ring_left' : sl),
        power: self.guildItemPower(it), reqLv: num(it.reqLv, 1) });
    });
    var st = this.charSys.state;
    if (st && st.equipment) {
      this.guildSlots().forEach(function (s) {
        var it = st.equipment[s];
        if (!it || typeof it !== 'object') return;
        out.push({ kind: 'worn', key: s, item: it, name: self.guildItemLabel(it),
          slot: self.guildItemSlot(it), slotName: self.guildSlotName(s),
          power: self.guildItemPower(it), reqLv: num(it.reqLv, 1) });
      });
    }
    return out;
  };

  proto.guildCanDeposit = function () {
    if (!this.isGuildFounded()) return { ok: false, msg: '尚未興建【冒險者公會】' };
    var g = this.guildState(), cap = this.guildStorageCap();
    if (g.storage.length >= cap) return { ok: false, msg: '公會倉庫已滿（' + g.storage.length + '/' + cap + '）' };
    return { ok: true };
  };

  /** 把玩家的一件裝備存入公會倉庫 */
  proto.guildDeposit = function (kind, key) {
    var chk = this.guildCanDeposit();
    if (!chk.ok) { this.log('⚠️ 無法存入：' + chk.msg, 'system'); return false; }
    var g = this.guildState(), root = this.charSys.rootState, item = null;
    if (kind === 'bag') {
      var bag = root.equipBag || [];
      var idx = -1;
      for (var i = 0; i < bag.length; i++) { if (bag[i] && (bag[i].uid === key || i === key)) { idx = i; break; } }
      if (idx < 0) return false;
      item = bag[idx]; bag.splice(idx, 1);
    } else if (kind === 'worn') {
      var st = this.charSys.state;
      if (!st || !st.equipment || !st.equipment[key]) return false;
      item = st.equipment[key]; st.equipment[key] = null;
      if (this.charSys.clampVitals) this.charSys.clampVitals();
    } else return false;

    g.storage.push(item);
    this.guildLog('📥 存入【' + this.guildItemLabel(item) + '】至公會倉庫。', 'wealth');
    if (g.autoEquip) this.guildAutoEquip();
    this.requestRender();
    return true;
  };

  /** 存入所有「行囊中的裝備」（不碰穿戴中的） */
  proto.guildDepositAllBag = function () {
    var root = this.charSys.rootState, self = this, moved = 0;
    var keys = (root.equipBag || []).filter(function (it) { return it && self.guildItemSlot(it); })
      .map(function (it) { return it.uid; });
    keys.forEach(function (u) { if (self.guildCanDeposit().ok && self.guildDeposit('bag', u)) moved += 1; });
    return moved;
  };

  proto.guildWithdraw = function (index) {
    var g = this.guildState();
    if (index < 0 || index >= g.storage.length) return false;
    var item = g.storage[index], root = this.charSys.rootState;
    var maxSize = 60;
    var es = window.HY.game && window.HY.game.equipSys;
    if (es && typeof es.getMaxBagSize === 'function') { try { maxSize = es.getMaxBagSize(); } catch (e) { /* 忽略 */ } }
    if ((root.equipBag || []).length >= maxSize) { this.log('🎒 裝備行囊已滿（' + maxSize + '），無法取回。', 'system'); return false; }
    g.storage.splice(index, 1);
    if (!Array.isArray(root.equipBag)) root.equipBag = [];
    root.equipBag.push(item);
    this.guildLog('📤 自公會倉庫取回【' + this.guildItemLabel(item) + '】。', 'wealth');
    this.requestRender();
    return true;
  };

  /** 賣掉倉庫中一件裝備 */
  proto.guildSellStorage = function (index) {
    var g = this.guildState();
    if (index < 0 || index >= g.storage.length) return false;
    var item = g.storage[index];
    var price = Math.max(10, Math.floor(num(item.price, 50) * 0.5));
    var es = window.HY.game && window.HY.game.equipSys;
    if (es && typeof es.getSellPrice === 'function') { try { price = es.getSellPrice(item); } catch (e) { /* 忽略 */ } }
    g.storage.splice(index, 1);
    this.charSys.rootState.gold += price;
    this.guildLog('💰 公會賣出【' + this.guildItemLabel(item) + '】，得 ' + price + ' 兩。', 'wealth');
    this.requestRender();
    return true;
  };

  /** 一鍵賣掉倉庫中所有「沒有任何冒險者能提升戰力」的裝備 */
  proto.guildSellJunk = function () {
    var g = this.guildState(), self = this;
    var before = g.storage.length, totalGold = 0, keep = [];
    g.storage.forEach(function (it) {
      var useful = false;
      g.adventurers.forEach(function (adv) {
        if (useful || !self.guildCanUse(adv, it)) return;
        var slot = self.guildItemSlot(it);
        var cands = (slot === 'ring') ? ['ring_left', 'ring_right'] : [slot];
        cands.forEach(function (s) { if (self.guildItemPower(it) > self.guildItemPower(adv.equipment[s]) + 1) useful = true; });
      });
      if (useful) { keep.push(it); return; }
      var price = Math.max(10, Math.floor(num(it.price, 50) * 0.5));
      var es = window.HY.game && window.HY.game.equipSys;
      if (es && typeof es.getSellPrice === 'function') { try { price = es.getSellPrice(it); } catch (e) { /* 忽略 */ } }
      totalGold += price;
    });
    g.storage = keep;
    this.charSys.rootState.gold += totalGold;
    var n = before - keep.length;
    if (n > 0) this.guildLog('🧹 清理了 ' + n + ' 件無用裝備，得 ' + totalGold + ' 兩。', 'wealth');
    else this.log('倉庫中沒有可直接變賣的無用裝備。', 'system');
    this.requestRender();
    return n;
  };

  /** 對一位冒險者做自動配裝，回傳換裝件數 */
  proto.guildAutoEquipOne = function (adv) {
    var g = this.guildState();
    var slots = this.guildSlots();
    var swaps = 0;

    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var bestPow = this.guildItemPower(adv.equipment[slot] || null), bestIdx = -1;
      for (var j = 0; j < g.storage.length; j++) {
        var it = g.storage[j];
        if (!this.guildCanUse(adv, it)) continue;
        var is = this.guildItemSlot(it);
        var fits = (is === slot) || (is === 'ring' && (slot === 'ring_left' || slot === 'ring_right'));
        if (!fits) continue;
        var p = this.guildItemPower(it);
        if (p > bestPow + 1) { bestPow = p; bestIdx = j; }
      }
      if (bestIdx >= 0) {
        var old = adv.equipment[slot];
        adv.equipment[slot] = g.storage[bestIdx];
        g.storage.splice(bestIdx, 1);
        if (old) g.storage.push(old);
        swaps += 1;
        if (g.stats) g.stats.equipped += 1;
      }
    }
    if (swaps > 0) this.guildClampVitals(adv);
    return swaps;
  };

  proto.guildAutoEquip = function (advId) {
    if (!this.isGuildFounded()) return 0;
    var g = this.guildState();
    if (!g.autoEquip) return 0;
    var self = this, total = 0;
    var list = advId ? [this.guildAdventurer(advId)].filter(Boolean) : g.adventurers.slice();
    list.forEach(function (adv) { total += self.guildAutoEquipOne(adv); });
    if (total > 0) this.guildLog('⚙️ 自動配裝完成，共換上 ' + total + ' 件裝備。', 'loot');
    return total;
  };

  proto.guildToggleAutoEquip = function () {
    var g = this.guildState();
    g.autoEquip = !g.autoEquip;
    this.log(g.autoEquip ? '⚙️ 公會自動配裝：開啟' : '⚙️ 公會自動配裝：關閉', 'system');
    if (g.autoEquip) this.guildAutoEquip();
    this.requestRender();
    return g.autoEquip;
  };

  /** 手動替換某位冒險者的某部位（從倉庫挑最強） */
  proto.guildEquipBest = function (advId, slotKey) {
    var adv = this.guildAdventurer(advId);
    if (!adv) return false;
    var g = this.guildState();
    var bestPow = this.guildItemPower(adv.equipment[slotKey]), bestIdx = -1;
    for (var j = 0; j < g.storage.length; j++) {
      var it = g.storage[j];
      if (!this.guildCanUse(adv, it)) continue;
      var is = this.guildItemSlot(it);
      if (!(is === slotKey || (is === 'ring' && (slotKey === 'ring_left' || slotKey === 'ring_right')))) continue;
      var p = this.guildItemPower(it);
      if (p > bestPow + 1) { bestPow = p; bestIdx = j; }
    }
    if (bestIdx < 0) return false;
    var old = adv.equipment[slotKey];
    adv.equipment[slotKey] = g.storage[bestIdx];
    g.storage.splice(bestIdx, 1);
    if (old) g.storage.push(old);
    this.guildLog('🎽 【' + adv.name + '】裝上【' + this.guildItemLabel(adv.equipment[slotKey]) + '】。', 'loot');
    this.guildClampVitals(adv);
    this.requestRender();
    return true;
  };

  proto.guildUnequip = function (advId, slotKey) {
    var adv = this.guildAdventurer(advId), g = this.guildState();
    if (!adv || !adv.equipment[slotKey]) return false;
    if (g.storage.length >= this.guildStorageCap()) { this.log('⚠️ 公會倉庫已滿，無法卸下裝備。', 'system'); return false; }
    g.storage.push(adv.equipment[slotKey]);
    adv.equipment[slotKey] = null;
    this.guildClampVitals(adv);
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     裝備資源產生（任務掉落 / 委託獎勵）
     優先沿用玩家既有的裝備資料，找不到時退回消耗品
     ══════════════════════════════════════════════════════ */
  proto.guildRandomEquip = function (forLv) {
    var poe = window.HY.game && window.HY.game.poeSys;
    if (poe) {
      var lv = num(forLv, 10);
      var cand = ['rollItem', 'generateItem', 'createItem', 'makeItem', 'rollEquipment', 'randomEquip'];
      for (var i = 0; i < cand.length; i++) {
        if (typeof poe[cand[i]] === 'function') {
          try { var r = poe[cand[i]](lv); if (r && typeof r === 'object' && (r.slotType || r.slot)) return r; } catch (e) { /* 換下一個 */ }
        }
      }
    }
    // 次選：複製玩家行囊中的一件（複製，不竊取）
    var bag = (this.charSys.rootState.equipBag) || [];
    var valid = bag.filter(function (it) { return it && typeof it === 'object' && (it.slotType || it.slot); });
    if (valid.length) {
      var one = valid[Math.floor(Math.random() * valid.length)];
      try {
        var copy = JSON.parse(JSON.stringify(one));
        copy.uid = uid('eq');
        delete copy._forgeLv;
        return copy;
      } catch (e) { return null; }
    }
    return null;
  };

  /** 隨機消耗品（優先真實藥品，找不到就給武點補償） */
  proto.guildRandomConsumable = function () {
    var items = (window.HY.Data && window.HY.Data.ITEMS) || {};
    var pool = [];
    Object.keys(items).forEach(function (id) {
      var it = items[id];
      if (it && (it.type === 'consumable' || it.type === 'pill')) pool.push(id);
    });
    if (!pool.length && items.pill_hp) pool.push('pill_hp');
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  };

  proto.guildGrantItem = function (kind) {
    var root = this.charSys.rootState, g = this.guildState();
    if (kind === 'equip') {
      var eq = this.guildRandomEquip(0);
      if (eq) {
        if (g.storage.length < this.guildStorageCap()) {
          g.storage.push(eq);
          if (g.stats) g.stats.loot += 1;
          return '取得裝備【' + this.guildItemLabel(eq) + '】（已放入公會倉庫）';
        }
        var price = Math.max(10, Math.floor(num(eq.price, 50) * 0.5));
        root.gold += price;
        return '取得裝備但倉庫已滿，折算 ' + price + ' 兩';
      }
      root.sp += 5;
      return '獲得武點 +5';
    }
    var cid = this.guildRandomConsumable();
    if (cid) {
      if (this.invSys && typeof this.invSys.addItem === 'function') this.invSys.addItem(cid, 1);
      else { root.inventory = root.inventory || {}; root.inventory[cid] = (root.inventory[cid] || 0) + 1; }
      var nm = ((window.HY.Data.ITEMS || {})[cid] || {}).name || cid;
      if (g.stats) g.stats.loot += 1;
      return '採得【' + nm + '】×1（已送入行囊）';
    }
    root.sp += 2;
    return '獲得武點 +2';
  };

  /* ══════════════════════════════════════════════════════
     任務派遣
     ══════════════════════════════════════════════════════ */
  proto.guildMissionList = function () { return T.GUILD.MISSIONS; };

  proto.guildMissionById = function (id) {
    var list = T.GUILD.MISSIONS;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };

  proto.guildIdleAdventurers = function () {
    return this.guildAdventurers().filter(function (a) { return a.status === 'idle'; });
  };

  proto.guildMissionActive = function () { return this.guildState().missions; };

  proto.guildCanDispatch = function (missionId, advIds) {
    if (!this.isGuildFounded()) return { ok: false, msg: '尚未興建【冒險者公會】' };
    var m = this.guildMissionById(missionId);
    if (!m) return { ok: false, msg: '無此任務' };
    var g = this.guildState();
    if (g.missions.length >= this.guildMissionSlots()) {
      return { ok: false, msg: '任務欄位已滿（' + g.missions.length + '/' + this.guildMissionSlots() + '）' };
    }
    advIds = advIds || [];
    if (advIds.length < m.n[0]) return { ok: false, msg: '至少需要 ' + m.n[0] + ' 名冒險者' };
    if (advIds.length > m.n[1]) return { ok: false, msg: '最多只能派 ' + m.n[1] + ' 名' };
    for (var i = 0; i < advIds.length; i++) {
      var a = this.guildAdventurer(advIds[i]);
      if (!a) return { ok: false, msg: '找不到冒險者' };
      if (a.status !== 'idle') return { ok: false, msg: '【' + a.name + '】正在執行其他任務或養傷' };
    }
    return { ok: true, m: m };
  };

  /** 預估成功率（needOverride 用於委託的自訂難度） */
  proto.guildEstimate = function (missionId, advIds, needOverride) {
    var m = this.guildMissionById(missionId);
    if (!m) return { rate: 0, power: 0, avg: 0, need: 0 };
    var self = this, total = 0, n = 0;
    (advIds || []).forEach(function (id) {
      var a = self.guildAdventurer(id);
      if (a) { total += self.guildPower(a); n += 1; }
    });
    var avg = n > 0 ? total / n : 0;
    var need = num(needOverride, m.need);
    var ratio = need > 0 ? avg / need : 1;
    // ratio 1.0 → 成功率 0.78；ratio 1.5 → 上限 0.97；ratio 0.5 → 約 0.39
    var rate = Math.min(0.97, Math.max(0.05, 0.78 * Math.pow(ratio, 0.85)));
    rate = Math.min(0.99, rate + this.guildSuccessBonus());
    return { rate: rate, power: total, avg: Math.round(avg), need: need };
  };

  proto.guildDispatch = function (missionId, advIds) {
    var chk = this.guildCanDispatch(missionId, advIds);
    if (!chk.ok) { this.log('⚠️ 無法派遣：' + chk.msg, 'system'); return false; }
    var m = chk.m, g = this.guildState(), t = this.ensureState(), self = this;
    var ticks = rndInt(m.ticks[0], m.ticks[1]);
    var est = this.guildEstimate(missionId, advIds);
    var task = {
      id: uid('ms'), missionId: m.id, name: m.name, icon: m.icon, type: m.type,
      order: num(m.order, 0), advIds: advIds.slice(),
      startTick: num(t.stats && t.stats.ticks, 0),
      remain: ticks, totalTicks: ticks, est: est.rate,
      reward: { exp: m.exp, gold: m.gold, sp: m.sp, loot: m.loot || null }
    };
    advIds.forEach(function (id) {
      var a = self.guildAdventurer(id);
      if (a) { a.status = m.type; a.missionId = task.id; a.missionEnd = ticks; }
    });
    g.missions.push(task);
    this.guildLog('🚩 派遣【' + m.icon + ' ' + m.name + '】，' + advIds.length + ' 人，預計 ' + ticks + ' 期（成功率約 ' + Math.round(est.rate * 100) + '%）。', 'time');
    this.requestRender();
    return true;
  };

  proto.guildRecall = function (taskId) {
    var g = this.guildState(), task = null, self = this;
    g.missions.forEach(function (x) { if (x.id === taskId) task = x; });
    if (!task) return false;
    task.advIds.forEach(function (id) {
      var a = self.guildAdventurer(id);
      if (a) { a.status = 'idle'; a.missionId = null; a.missionEnd = 0; }
    });
    g.missions = g.missions.filter(function (x) { return x.id !== taskId; });
    this.guildLog('↩️ 召回【' + task.name + '】的冒險者，任務中止。', 'time');
    this.requestRender();
    return true;
  };

  /** 每期推進：傷病恢復、狀態校正、任務倒數、結算 */
  proto.guildTick = function () {
    if (!this.isGuildFounded()) return;
    var g = this.guildState(), t = this.ensureState(), self = this;

    // 傷病恢復
    g.adventurers.forEach(function (a) {
      if (a.status === 'injured') {
        a.injuredUntil = num(a.injuredUntil, 0) - 1;
        if (a.injuredUntil <= 0) {
          a.status = 'idle';
          var d = self.guildDerived(a);
          a.currentHp = d.maxHp; a.currentMp = d.maxMp;
        }
      }
    });

    // ⭐ 防禦性校正：冒險者狀態與任務清單不同步時（例如存檔異常），歸零為待命
    var activeIds = {};
    g.missions.forEach(function (m) { activeIds[m.id] = true; });
    g.adventurers.forEach(function (a) {
      if (a.status === 'idle' || a.status === 'injured') return;
      if (!a.missionId || !activeIds[a.missionId]) { a.status = 'idle'; a.missionId = null; a.missionEnd = 0; }
    });

    // 任務推進
    var done = [];
    g.missions.forEach(function (task) {
      task.remain = num(task.remain, 0) - 1;
      task.advIds.forEach(function (id) {
        var a = self.guildAdventurer(id);
        if (a) a.missionEnd = task.remain;
      });
      if (task.remain <= 0) done.push(task);
    });
    done.forEach(function (task) { self.guildResolveTask(task); });

    // 公會提供的小幅繁榮（聲望越高越多）
    var prosper = Math.floor(g.reputation / 400);
    if (prosper > 0) t.prosperity += prosper;
  };

  /** 結算單一任務 */
  proto.guildResolveTask = function (task) {
    var g = this.guildState(), self = this, root = this.charSys.rootState;
    var members = task.advIds.map(function (id) { return self.guildAdventurer(id); }).filter(Boolean);
    if (!members.length) { g.missions = g.missions.filter(function (x) { return x.id !== task.id; }); return; }

    var rate = (task.est !== undefined) ? task.est : 0.7;
    var success = Math.random() < rate;
    var rewardMul = this.guildRewardMul() * this.guildExpMul();
    var lines = [];
    var maxLv = num(this.charSys.MAX_LEVEL, 300);

    // ── 經驗（失敗也給 45%） ──
    members.forEach(function (a) {
      if (a.lv >= maxLv) { a.exp = 0; a.totalMissions = num(a.totalMissions, 0) + 1; return; }
      // ⭐ 經驗＝「自身升級所需經驗」的百分比（上限 35%），使節奏可預期、不隨等級膨脹
      var frac = Math.min(0.35, num(task.reward.exp, 100) / 2500);
      var exp = Math.round(a.maxExp * frac * (success ? 1 : 0.45) * rewardMul);
      a.exp += exp;
      a.totalMissions = num(a.totalMissions, 0) + 1;
      var ups = 0;
      while (a.exp >= a.maxExp && a.lv < maxLv) {
        a.exp -= a.maxExp;
        a.lv += 1;
        a.maxExp = maxExpFor(a.lv);
        ups += 1;
        // 依職業自動配點
        var role = T.GUILD.ROLES[a.role];
        var alloc = role ? role.alloc : { con: 1, str: 1, agi: 1, int: 1 };
        var totalA = (alloc.con + alloc.str + alloc.agi + alloc.int) || 4;
        var left = 5, used = 0;
        ['con', 'str', 'agi', 'int'].forEach(function (k) {
          var v = Math.floor(5 * (alloc[k] / totalA));
          a.stats[k] = num(a.stats[k], 10) + v; used += v;
        });
        var maxK = 'con';
        ['con', 'str', 'agi', 'int'].forEach(function (k) { if (alloc[k] > alloc[maxK]) maxK = k; });
        a.stats[maxK] = num(a.stats[maxK], 10) + (left - used);
        if (g.stats) g.stats.levelUps += 1;
      }
      var d = self.guildDerived(a);
      a.currentHp = d.maxHp; a.currentMp = d.maxMp;
      if (ups > 0) lines.push('🎉【' + a.name + '】突破至 Lv.' + a.lv + '（+' + (ups * 5) + ' 潛能已自動配點）');
    });

    // ── 銀兩 / 武點 ──
    var gold = 0, sp = 0;
    if (success) {
      gold = Math.round(num(task.reward.gold, 100) * rewardMul * (1 + members.length * 0.15));
      sp = Math.round(num(task.reward.sp, 1) * rewardMul);
      root.gold += gold; root.sp += sp;
    } else {
      gold = Math.round(num(task.reward.gold, 100) * 0.2);
      root.gold += gold;
    }

    // ── 掉落 ──
    var lootMsg = null;
    if (success && task.reward.loot && Math.random() < num(task.reward.loot.chance, 0.5)) {
      var L = task.reward.loot;
      var cnt = rndInt((L.num && L.num[0]) || 1, (L.num && L.num[1]) || 1);
      var msgs = [];
      for (var i = 0; i < cnt; i++) { var m2 = this.guildGrantItem(L.kind); if (m2) msgs.push(m2); }
      if (msgs.length) lootMsg = msgs.join('；');
    }

    // ── 傷病（失敗時） ──
    if (!success && Math.random() < CONFIG.INJURY_CHANCE) {
      var victim = members[Math.floor(Math.random() * members.length)];
      var ticks = rndInt(CONFIG.INJURY_TICKS[0], CONFIG.INJURY_TICKS[1]);
      victim.status = 'injured';
      victim.injuredUntil = ticks;
      victim.currentHp = Math.max(1, Math.floor(this.guildDerived(victim).maxHp * 0.25));
      if (g.stats) g.stats.injured += 1;
      lines.push('🤕【' + victim.name + '】受傷，需休養 ' + ticks + ' 期');
    }

    // ── 恢復成員狀態 ──
    members.forEach(function (a) {
      if (a.status !== 'injured') {
        a.status = 'idle';
        var d = self.guildDerived(a);
        a.currentHp = d.maxHp; a.currentMp = d.maxMp;
      }
      a.missionId = null; a.missionEnd = 0;
    });

    // ── 聲望 ──
    var rep = Math.round(6 * (success ? 1 : 0.4) * this.guildRepMul() * (1 + members.length * 0.1));
    g.reputation += (success ? Math.max(2, rep) : 1);

    if (g.stats) {
      g.stats.missions += 1;
      if (success) g.stats.succeeded += 1; else g.stats.failed += 1;
    }

    // ── 移除任務 ──
    g.missions = g.missions.filter(function (x) { return x.id !== task.id; });

    this.guildLog((success ? '✅' : '❌') + ' 【' + task.name + '】' + (success ? '圓滿完成' : '未能達成，眾人倉皇退回') +
      '　（' + members.length + ' 人）　💰+' + gold + ' 兩' + (sp > 0 ? '　📖+' + sp + ' 武點' : ''), success ? 'wealth' : 'system');
    if (lootMsg) this.guildLog('　🎁 ' + lootMsg, 'loot');
    lines.forEach(function (l) { self.guildLog('　' + l, 'time'); });

    // 自動配裝（任務可能帶回裝備）
    if (g.autoEquip) this.guildAutoEquip();
    this.requestRender();
  };

  /* ══════════════════════════════════════════════════════
     委託榜
     ══════════════════════════════════════════════════════ */
  proto.guildCanUseContracts = function () { return this.hasBuilding('commissionBoard'); };

  proto.guildRefreshContracts = function (force) {
    var g = this.guildState();
    if (!this.guildCanUseContracts()) return false;
    var t = this.ensureState();
    var tick = num(t.stats && t.stats.ticks, 0);
    if (!force && g.contracts.length > 0 && tick - num(g.contractRefresh, 0) < 60) return false;

    var lv = this.guildLevel();
    var n = Math.min(6, 3 + Math.floor(lv / 2));
    g.contracts = [];
    for (var i = 0; i < n; i++) {
      var tpl = pick(T.GUILD.CONTRACT_TEMPLATES);
      var who = pick(T.GUILD.CONTRACT_NAMES);
      var pool = T.GUILD.MISSIONS.filter(function (m) { return m.type === tpl.type; });
      var base = pool.length ? pick(pool) : T.GUILD.MISSIONS[0];
      var mul = num(tpl.mul, 1.5) * (0.85 + Math.random() * 0.5);
      g.contracts.push({
        id: uid('ct'),
        title: tpl.tpl.replace('{name}', who),
        icon: tpl.icon,
        templateId: base.id,
        type: tpl.type,
        n: base.n,
        ticks: base.ticks,
        need: Math.round(base.need * mul),
        reward: {
          exp: Math.round(base.exp * mul * 1.5),
          gold: Math.round(base.gold * mul * 2.0),
          sp: Math.round(base.sp * mul * 1.8),
          loot: base.loot || null
        },
        desc: base.desc,
        order: num(base.order, 0),
        expire: tick + 120
      });
    }
    g.contractRefresh = tick;
    g.stats.contracts = num(g.stats.contracts, 0) + n;
    this.guildLog('📋 委託榜更新，共 ' + n + ' 件新委託。', 'time');
    this.requestRender();
    return true;
  };

  proto.guildAcceptContract = function (contractId, advIds) {
    var g = this.guildState(), c = null, self = this;
    g.contracts.forEach(function (x) { if (x.id === contractId) c = x; });
    if (!c) return { ok: false, msg: '委託已不存在' };
    if (g.missions.length >= this.guildMissionSlots()) return { ok: false, msg: '任務欄位已滿' };
    advIds = advIds || [];
    if (advIds.length < c.n[0]) return { ok: false, msg: '至少需要 ' + c.n[0] + ' 名' };
    if (advIds.length > c.n[1]) return { ok: false, msg: '最多 ' + c.n[1] + ' 名' };
    for (var i = 0; i < advIds.length; i++) {
      var a = this.guildAdventurer(advIds[i]);
      if (!a || a.status !== 'idle') return { ok: false, msg: '有成員無法出勤' };
    }

    var total = 0;
    advIds.forEach(function (id) { var a2 = self.guildAdventurer(id); if (a2) total += self.guildPower(a2); });
    var avg = advIds.length ? total / advIds.length : 0;
    var ratio = c.need > 0 ? avg / c.need : 1;
    var rate = Math.min(0.99, Math.max(0.05, 0.78 * Math.pow(ratio, 0.85)) + this.guildSuccessBonus());

    var ticks = rndInt(c.ticks[0], c.ticks[1]);
    var t = this.ensureState();
    var task = {
      id: uid('ms'), missionId: null, contractId: c.id,
      name: c.title, icon: c.icon, type: c.type, order: c.order,
      advIds: advIds.slice(), startTick: num(t.stats && t.stats.ticks, 0),
      remain: ticks, totalTicks: ticks, est: rate,
      reward: c.reward, isContract: true
    };
    advIds.forEach(function (id) {
      var a3 = self.guildAdventurer(id);
      if (a3) { a3.status = c.type; a3.missionId = task.id; a3.missionEnd = ticks; }
    });
    g.missions.push(task);
    g.contracts = g.contracts.filter(function (x) { return x.id !== contractId; });
    this.guildLog('📜 接下委託『' + c.title + '』，' + advIds.length + ' 人前往，約 ' + ticks + ' 期。', 'time');
    this.requestRender();
    return { ok: true };
  };

  proto.guildDeclineContract = function (contractId) {
    var g = this.guildState(), before = g.contracts.length;
    g.contracts = g.contracts.filter(function (x) { return x.id !== contractId; });
    if (g.contracts.length !== before) { this.requestRender(); return true; }
    return false;
  };

  /* ══════════════════════════════════════════════════════
     鍛造強化 / 訓練 / 療養
     ══════════════════════════════════════════════════════ */
  proto.guildCanForge = function () { return this.hasBuilding('forgeHall'); };

  proto.guildForgeCost = function (item) {
    var flv = num(item && item._forgeLv, 0);
    var mul = 1 - this.getResearchBonus('guildForgeCost', 0);
    return Math.max(50, Math.floor(num(item && item.price, 100) * CONFIG.FORGE_COST_MUL * (flv + 1) * mul));
  };

  /** 強化某位冒險者身上的裝備 */
  proto.guildForge = function (advId, slotKey) {
    if (!this.guildCanForge()) { this.log('⚠️ 需先興建【公會鍛造坊】。', 'system'); return false; }
    var adv = this.guildAdventurer(advId);
    if (!adv) return false;
    var item = adv.equipment[slotKey];
    if (!item) return false;
    var flv = num(item._forgeLv, 0);
    if (flv >= CONFIG.FORGE_MAX_LV) { this.log('⚠️ 已達強化上限 +' + CONFIG.FORGE_MAX_LV + '。', 'system'); return false; }
    var cost = this.guildForgeCost(item);
    if (this.charSys.rootState.gold < cost) { this.log('⚠️ 銀兩不足（需 ' + cost + ' 兩）。', 'system'); return false; }
    this.charSys.rootState.gold -= cost;
    item._forgeLv = flv + 1;
    var g = this.guildState();
    if (g.stats) g.stats.forged += 1;
    this.guildClampVitals(adv);
    this.guildLog('🔨 將【' + this.guildItemLabel(item) + '】強化至 +' + item._forgeLv + '，花費 ' + cost + ' 兩。', 'wealth');
    this.requestRender();
    return true;
  };

  proto.guildTrainCost = function (adv) {
    var base = CONFIG.TRAIN_COST * (1 + num(adv && adv.lv, 1) * 0.06);
    if (this.hasBuilding('drillYard')) base *= (1 - CONFIG.TRAIN_YARD_DISCOUNT);
    return Math.max(50, Math.floor(base));
  };

  /** 練功場訓練：花銀兩換經驗 */
  proto.guildTrain = function (advId) {
    var adv = this.guildAdventurer(advId);
    if (!adv) return false;
    if (adv.status === 'injured') { this.log('⚠️ 【' + adv.name + '】正在養傷，無法訓練。', 'system'); return false; }
    var maxLv = num(this.charSys.MAX_LEVEL, 300);
    if (adv.lv >= maxLv) { this.log('⚠️ 已達等級上限。', 'system'); return false; }
    var cost = this.guildTrainCost(adv);
    if (this.charSys.rootState.gold < cost) { this.log('⚠️ 銀兩不足（需 ' + cost + ' 兩）。', 'system'); return false; }
    this.charSys.rootState.gold -= cost;
    var g = this.guildState();
    var exp = Math.round(adv.maxExp * CONFIG.TRAIN_EXP * this.guildExpMul());
    adv.exp += exp;
    var ups = 0;
    while (adv.exp >= adv.maxExp && adv.lv < maxLv) {
      adv.exp -= adv.maxExp; adv.lv += 1; adv.maxExp = maxExpFor(adv.lv); ups += 1;
      var role = T.GUILD.ROLES[adv.role];
      var alloc = role ? role.alloc : { con: 1, str: 1, agi: 1, int: 1 };
      var totalA = (alloc.con + alloc.str + alloc.agi + alloc.int) || 4;
      var used = 0;
      ['con', 'str', 'agi', 'int'].forEach(function (k) {
        var v = Math.floor(5 * (alloc[k] / totalA));
        adv.stats[k] = num(adv.stats[k], 10) + v; used += v;
      });
      var maxK = 'con';
      ['con', 'str', 'agi', 'int'].forEach(function (k) { if (alloc[k] > alloc[maxK]) maxK = k; });
      adv.stats[maxK] = num(adv.stats[maxK], 10) + (5 - used);
      if (g.stats) g.stats.levelUps += 1;
    }
    var d = this.guildDerived(adv);
    adv.currentHp = d.maxHp; adv.currentMp = d.maxMp;
    if (g.stats) g.stats.trained += 1;
    this.guildLog('🎯 【' + adv.name + '】於練功場苦修，獲得 ' + exp.toLocaleString() + ' 經驗（花費 ' + cost + ' 兩）' +
      (ups > 0 ? '，突破至 Lv.' + adv.lv + '！' : '。'), 'time');
    this.requestRender();
    return true;
  };

  proto.guildHealCost = function (adv) {
    var d = this.guildDerived(adv);
    var missing = Math.max(0, d.maxHp - num(adv.currentHp, d.maxHp));
    var base = Math.max(20, Math.floor(missing * CONFIG.HEAL_COST_PER_HP));
    if (adv.status === 'injured') base += 200;
    return base;
  };

  proto.guildHeal = function (advId) {
    var adv = this.guildAdventurer(advId);
    if (!adv) return false;
    var cost = this.guildHealCost(adv);
    if (this.charSys.rootState.gold < cost) { this.log('⚠️ 銀兩不足（需 ' + cost + ' 兩）。', 'system'); return false; }
    this.charSys.rootState.gold -= cost;
    var d = this.guildDerived(adv);
    adv.currentHp = d.maxHp; adv.currentMp = d.maxMp;
    var was = adv.status === 'injured';
    if (was) { adv.status = 'idle'; adv.injuredUntil = 0; }
    this.guildLog('💊 【' + adv.name + '】' + (was ? '傷勢痊癒，' : '') + '氣血內力全滿（花費 ' + cost + ' 兩）。', 'time');
    this.requestRender();
    return true;
  };

  proto.guildHealAll = function () {
    var g = this.guildState(), self = this, n = 0;
    g.adventurers.slice().forEach(function (a) {
      var d = self.guildDerived(a);
      if (a.status === 'injured' || num(a.currentHp, d.maxHp) < d.maxHp) {
        var c = self.guildHealCost(a);
        if (self.charSys.rootState.gold >= c && self.guildHeal(a.id)) n += 1;
      }
    });
    return n;
  };

  /* ══════════════════════════════════════════════════════
     統計 / 排行
     ══════════════════════════════════════════════════════ */
  proto.guildRanking = function () {
    var self = this;
    return this.guildAdventurers().map(function (a) {
      return { adv: a, power: self.guildPower(a) };
    }).sort(function (x, y) { return y.power - x.power; });
  };

  proto.guildStats = function () {
    var g = this.guildState(), self = this;
    var byStatus = { idle: 0, guard: 0, explore: 0, gather: 0, injured: 0 };
    var totalPower = 0, lvSum = 0;
    g.adventurers.forEach(function (a) {
      byStatus[a.status] = num(byStatus[a.status], 0) + 1;
      totalPower += self.guildPower(a);
      lvSum += num(a.lv, 1);
    });
    var n = g.adventurers.length;
    return {
      founded: this.isGuildFounded(),
      level: this.guildLevelInfo(),
      adventurers: n,
      maxAdventurers: this.guildMaxAdventurers(),
      storage: g.storage.length,
      storageCap: this.guildStorageCap(),
      missions: g.missions.length,
      missionSlots: this.guildMissionSlots(),
      byStatus: byStatus,
      totalPower: totalPower,
      avgPower: n > 0 ? Math.round(totalPower / n) : 0,
      avgLv: n > 0 ? Math.round(lvSum / n) : 0,
      order: this.guildOrderBonus(),
      incomeBonus: this.guildIncomeBonus(),
      expMul: this.guildExpMul(),
      successBonus: this.guildSuccessBonus(),
      rewardMul: this.guildRewardMul(),
      autoEquip: g.autoEquip,
      reputation: g.reputation,
      stats: g.stats,
      canContracts: this.guildCanUseContracts(),
      canForge: this.guildCanForge(),
      hasDrillYard: this.hasBuilding('drillYard'),
      contracts: g.contracts.length
    };
  };

  /* ══════════════════════════════════════════════════════
     掛載：tick / getTotalOrder / getGlobalMul / getStats
     ══════════════════════════════════════════════════════ */
  var _guildTick = proto.tick;
  proto.tick = function () {
    var r = _guildTick.call(this);
    if (r) {
      try { this.guildTick(); } catch (e) { console.error('[townGuild] guildTick 錯誤：', e); }
    }
    return r;
  };

  var _guildOrder = proto.getTotalOrder;
  proto.getTotalOrder = function () {
    return _guildOrder.call(this) + this.guildOrderBonus();
  };

  var _guildGlobalMul = proto.getGlobalMul;
  proto.getGlobalMul = function () {
    return _guildGlobalMul.call(this) * (1 + this.guildIncomeBonus());
  };

  var _guildStats = proto.getStats;
  proto.getStats = function () {
    var s = _guildStats.call(this);
    s.guild = this.guildStats();
    return s;
  };

  /* ══════════════════════════════════════════════════════
     事件補充（公會相關）
     ══════════════════════════════════════════════════════ */
  T.EVENTS = T.EVENTS.concat([
    { name: '公會揚名',   icon: '🏆', text: '公會的義舉傳遍四方，慕名而來者絡繹不絕。',   gain: { prosperity: 170 } },
    { name: '新手入會',   icon: '📜', text: '幾名少年慕名投奔公會，願隨前輩行走江湖。', gain: { prosperity: 100 } },
    { name: '鏢局致謝',   icon: '🎁', text: '鏢局送來謝禮，感謝公會出手相助。',         gain: { goldMul: 1.5, prosperity: 80 } },
    { name: '官府褒獎',   icon: '🏅', text: '官府嘉獎公會緝盜有功，賞銀若干。',           gain: { goldMul: 1.7, prosperity: 120 } },
    { name: '同道切磋',   icon: '🥋', text: '鄰鎮公會派員切磋，雙方獲益良多。',           gain: { prosperity: 140 } }
  ]);

  /* ══════════════════════════════════════════════════════
     對外匯出
     ══════════════════════════════════════════════════════ */
  window.HY.TownGuild = {
    version: '1.0',
    config: CONFIG,
    roles: Object.keys(T.GUILD.ROLES).length,
    missions: T.GUILD.MISSIONS.length,
    buildings: Object.keys(NEW_TYPES).length,
    research: 6
  };
})();