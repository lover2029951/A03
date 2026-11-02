// js/linkSystems.js (v1)
// ⭐ 20 個系統的自建實作 + 全部向匯流排註冊
//    每個系統都是「native 正本」，外部系統存在時自動升級為 hybrid（取其數值）
//    全部透過 HY.Link.effect() 貢獻效果，透過 HY.Link.hook() 掛事件
//
// ⚠️ 載入順序：linkContent.js 之後、townSystem.js 之前
window.HY = window.HY || {};

(function () {
  if (!window.HY.Link) { console.error('[linkSystems] 找不到 HY.Link'); return; }
  var L = window.HY.Link;
  var C = window.HY.LinkContent;
  if (!C) { console.error('[linkSystems] 找不到 HY.LinkContent'); return; }

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hash(s) {
    var h = 2166136261, i; s = String(s || '');
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  function G() { return window.HY.game || {}; }
  function sysRoot() {
    try {
      var t = G().townSys;
      if (t && t.charSys && t.charSys.rootState) return t.charSys.rootState;
    } catch (e) { /* 忽略 */ }
    return null;
  }

  /* ══════════════════════════════════════════════════════
     共用：把 C.XXX 的資料建成查表
     ══════════════════════════════════════════════════════ */
  var T = {};
  ['FORMATIONS','ELEMENTS','SPIRIT_ROOTS','PETS','COMPANION_ROLES','AFFIXES','MASTERY',
   'GUILD_BUILDINGS','SALVAGE_ZONES','TT_ERAS','GAMBLE_GAMES','OFFLINE_MODES',
   'ENEMY_FORMATIONS','ROSTER_ROLES'].forEach(function (k) {
    T[k] = {};
    (C[k] || []).forEach(function (x) { T[k][x.id] = x; });
  });

  /* ══════════════════════════════════════════════════════
     註冊：全部 20 個系統（native 正本）
     ══════════════════════════════════════════════════════ */
  var REG = [
    { id:'formation', name:'陣法',     icon:'☯️', desc:'好友可學陣法，出團／世界王／戰鬥套用。' },
    { id:'spirit',    name:'靈根',     icon:'💎', desc:'好友有靈根，影響成長與四維。' },
    { id:'element',   name:'五行',     icon:'🌀', desc:'五行相剋影響傷害，場所亦有關聯。' },
    { id:'pet',       name:'寵物',     icon:'🐾', desc:'好友可收服、培養、進化寵物。' },
    { id:'companion', name:'同伴',     icon:'👥', desc:'好友可派為同伴，提供被動加成。' },
    { id:'affix',     name:'怪物詞綴', icon:'🧬', desc:'副本怪帶詞綴，有反制關係。' },
    { id:'guild',     name:'公會',     icon:'🏛️', desc:'好友可當公會賓客，享建築加成。' },
    { id:'sect',      name:'門派特色', icon:'⛩️', desc:'好友門派特色生效。' },
    { id:'market',    name:'黑市',     icon:'🕶️', desc:'好友掛售／掃貨。' },
    { id:'craft',     name:'工藝',     icon:'⚒️', desc:'好友代工改造。' },
    { id:'salvage',   name:'打撈遠征', icon:'🌊', desc:'好友組隊打撈海域。' },
    { id:'mastery',   name:'精通',     icon:'🎯', desc:'好友精通成長（三系）。' },
    { id:'atb',       name:'戰鬥速度', icon:'⏱️', desc:'好友有 ATB 速度。' },
    { id:'enemyfm',   name:'敵方陣法', icon:'🔺', desc:'敵方陣法需破解。' },
    { id:'timetravel',name:'時光旅行', icon:'⏳', desc:'好友隨行穿越時代。' },
    { id:'gamble',    name:'賭局',     icon:'🎲', desc:'與好友對賭（六種玩法）。' },
    { id:'lottery',   name:'大樂透',   icon:'🎰', desc:'樂透可抽出好友。' },
    { id:'roster',    name:'角色名冊', icon:'📋', desc:'好友 ↔ 名冊互轉。' },
    { id:'offline',   name:'離線掛機', icon:'🌙', desc:'好友離線持續行動（六種模式）。' },
    { id:'level',     name:'等級經驗', icon:'📈', desc:'好友升級曲線。' }
  ];
  REG.forEach(function (r) {
    L.register({
      id: r.id, name: r.name, icon: r.icon, desc: r.desc,
      caps: ['effect', 'hook', 'data'],
      obj: {
        list: function () { return C[r.id.toUpperCase()] || C[(r.id === 'enemyfm' ? 'ENEMY_FORMATIONS' : r.id.toUpperCase() + 'S')] || []; },
        get: function (id) { return T[r.id.toUpperCase()] ? T[r.id.toUpperCase()][id] : null; }
      },
      source: 'native'
    });
  });

  /* ══════════════════════════════════════════════════════
     效果貢獻（全部走匯流排，條件式）
     ══════════════════════════════════════════════════════ */

  /* 陣法 */
  L.effect({
    sys: 'formation', scope: 'friend', target: 'atkPct', label: '陣法·攻',
    cond: function (c) { return c.formation; },
    value: 0.05, tags: ['atk'],
    // 動態值：由 collect 前的 prepare 決定（見下方 prepareCtx）
  });
  L.effect({ sys: 'formation', scope: 'friend', target: 'defPct', label: '陣法·防', cond: function (c) { return c.formation; }, value: 0.05, tags: ['def'] });
  L.effect({ sys: 'formation', scope: 'friend', target: 'hpPct',  label: '陣法·血', cond: function (c) { return c.formation; }, value: 0.04, tags: ['hp'] });

  /* 靈根 */
  L.effect({ sys: 'spirit', scope: 'friend', target: 'expMul', label: '靈根·成長', cond: function (c) { return c.spiritRoot; }, value: 0.06, tags: ['exp'] });
  L.effect({ sys: 'spirit', scope: 'friend', target: 'atkPct', label: '靈根·攻', cond: function (c) { return c.spiritRoot; }, value: 0.02, tags: ['atk'] });

  /* 寵物 */
  L.effect({ sys: 'pet', scope: 'friend', target: 'atkPct', label: '寵物·攻', cond: function (c) { return c.pet; }, value: 0.04, tags: ['atk'] });
  L.effect({ sys: 'pet', scope: 'friend', target: 'dropMul', label: '寵物·寶', cond: function (c) { return c.pet && c.petDrop; }, value: 0.06, tags: ['drop'] });

  /* 同伴 */
  L.effect({ sys: 'companion', scope: 'friend', target: 'atkPct', label: '同伴·攻', cond: function (c) { return c.companionRole; }, value: 0.04, tags: ['atk'] });
  L.effect({ sys: 'companion', scope: 'friend', target: 'defPct', label: '同伴·防', cond: function (c) { return c.companionRole; }, value: 0.04, tags: ['def'] });

  /* 公會賓客 */
  L.effect({ sys: 'guild', scope: 'friend', target: 'atkPct', label: '公會·攻', cond: function (c) { return c.guildGuest; }, value: 0.03, tags: ['atk'] });
  L.effect({ sys: 'guild', scope: 'friend', target: 'goldMul', label: '公會·財', cond: function (c) { return c.guildGuest; }, value: 0.05, tags: ['gold'] });

  /* 精通 */
  L.effect({ sys: 'mastery', scope: 'friend', target: 'atkPct', label: '精通·攻', cond: function (c) { return num(c.masteryTotal, 0) > 0; }, value: 0.02, tags: ['atk'] });

  /* ATB */
  L.effect({ sys: 'atb', scope: 'friend', target: 'atbMul', label: '速度', cond: function (c) { return true; }, value: 0.02, tags: ['spd'] });

  /* 門派特色 */
  L.effect({ sys: 'sect', scope: 'friend', target: 'spMul', label: '門派·武學', cond: function (c) { return c.sect; }, value: 0.06, tags: ['sp'] });

  /* 時光迴響 */
  L.effect({ sys: 'timetravel', scope: 'friend', target: 'expMul', label: '時光迴響', cond: function (c) { return num(c.ttBonus, 0) > 0; }, value: 0.08, tags: ['exp'] });

  /* 離線模式 */
  L.effect({ sys: 'offline', scope: 'town', target: 'incomeMul', label: '離線模式', cond: function (c) { return c.offlineMode; }, value: 0.05, tags: ['town'] });

  /* 等級同步（提升好友經驗效率） */
  L.effect({ sys: 'level', scope: 'friend', target: 'expMul', label: '經驗曲線', cond: function () { return true; }, value: 0.02, tags: ['exp'] });

  /* ══════════════════════════════════════════════════════
     情境準備（把好友的資料展開成 cond 看得懂的 ctx）
     ══════════════════════════════════════════════════════ */
  function ctxOfFriend(f) {
    if (!f) return {};
    var mt = 0;
    if (f.mastery && typeof f.mastery === 'object') {
      Object.keys(f.mastery).forEach(function (k) { mt += num(f.mastery[k], 0); });
    }
    var petDef = f.pet ? T.PETS[f.pet.id] : null;
    return {
      id: f.id, name: f.name, lv: num(f.lv, 1),
      formation: f.formation || null,
      formationLv: num(f.formationLv, 0),
      spiritRoot: f.spiritRoot || null,
      spiritLv: num(f.spiritLv, 0),
      element: f.element || null,
      pet: f.pet || null,
      petDrop: petDef ? (petDef.tags || []).indexOf('drop') !== -1 : false,
      companionRole: f.companionRole || null,
      masteryTotal: mt,
      guildGuest: !!f.guildGuest,
      sect: f.sect || null,
      ttBonus: num(f.ttBonus, 0),
      favor: num(f.favor, 0),
      offlineMode: f.offlineMode || null
    };
  }
  window.HY.LinkCtxOf = ctxOfFriend;

  /* ══════════════════════════════════════════════════════
     對外工具（好友系統 / 其他系統可直接呼叫）
     ══════════════════════════════════════════════════════ */
  window.HY.LinkAPI = {
    version: '1.0',
    ctxOfFriend: ctxOfFriend,
    tables: T,

    /* ── 陣法 ── */
    formations: function () { return C.FORMATIONS; },
    rollFormation: function (lv) { return C.roll(C.FORMATIONS, lv); },
    formationBonus: function (id, lv) {
      var fm = T.FORMATIONS[id];
      if (!fm) return null;
      var m = 1 + Math.max(0, num(lv, 1) - 1) * 0.15;
      var out = {};
      Object.keys(fm.bonus || {}).forEach(function (k) { out[k] = num(fm.bonus[k], 0) * m; });
      return out;
    },

    /* ── 五行 ── */
    elements: function () { return C.ELEMENTS; },
    elementMul: function (a, b, terrain) {
      var A = T.ELEMENTS[a], B = T.ELEMENTS[b];
      if (!A || !B) return 1;
      var m = 1;
      if (A.beats === b) m = 1.15;
      else if (B.beats === a) m = 0.92;
      if (terrain && A.terrain && A.terrain[terrain]) m *= A.terrain[terrain];
      return m;
    },

    /* ── 靈根 ── */
    spiritRoots: function () { return C.SPIRIT_ROOTS; },
    rollSpiritRoot: function () { return C.roll(C.SPIRIT_ROOTS, 1); },
    spiritBonus: function (id, lv) {
      var sr = T.SPIRIT_ROOTS[id];
      if (!sr) return null;
      var l = num(lv, 1);
      return {
        statMul: num(sr.statMul, 0.02) + l * 0.012,
        growthMul: num(sr.growthMul, 0.03) + l * 0.020
      };
    },

    /* ── 寵物 ── */
    pets: function () { return C.PETS; },
    petGet: function (id) { return T.PETS[id] || null; },
    petBonus: function (petId, lv) {
      var p = T.PETS[petId];
      if (!p) return null;
      var l = num(lv, 1);
      var out = {};
      Object.keys(p.bonus || {}).forEach(function (k) { out[k] = num(p.bonus[k], 0); });
      out.atkPct = num(out.atkPct, 0) + l * 0.010;
      out.defPct = num(out.defPct, 0) + l * 0.008;
      out.hpPct = num(out.hpPct, 0) + l * 0.010;
      return out;
    },
    petEvolveCheck: function (petId, lv) {
      var p = T.PETS[petId];
      if (!p || !p.evolveTo) return null;
      if (num(lv, 1) < num(p.evolveLv, 99)) return null;
      return T.PETS[p.evolveTo] || null;
    },

    /* ── 同伴 ── */
    companionRoles: function () { return C.COMPANION_ROLES; },
    companionBonus: function (roleId) {
      var r = T.COMPANION_ROLES[roleId];
      return r ? r.bonus : null;
    },

    /* ── 詞綴 ── */
    affixes: function () { return C.AFFIXES; },
    rollAffixes: function (tier, n) {
      var max = num(n, 3);
      var cnt = 0;
      for (var i = 0; i < max; i++) if (Math.random() < 0.30 + num(tier, 1) * 0.03) cnt += 1;
      if (cnt <= 0) return [];
      var pool = C.AFFIXES.slice(), out = [];
      for (var j = 0; j < cnt && pool.length; j++) {
        var idx = Math.floor(Math.random() * pool.length);
        out.push(pool[idx]);
        pool.splice(idx, 1);
      }
      return out;
    },
    affixStatMul: function (affixes) { return 1 + (affixes || []).length * 0.14; },
    affixLootMul: function (affixes) { return 1 + (affixes || []).length * 0.35; },

    /* ── 精通 ── */
    mastery: function () { return C.MASTERY; },
    masteryTrees: function () {
      var m = {};
      C.MASTERY.forEach(function (x) { (m[x.tree] = m[x.tree] || []).push(x); });
      return m;
    },
    masteryCanLearn: function (f, id) {
      var d = T.MASTERY[id];
      if (!d) return { ok: false, msg: '無此精通' };
      if (num(f.mastery && f.mastery[id], 0) >= num(d.maxLv, 10)) return { ok: false, msg: '已滿級' };
      if (d.req) {
        var have = num(f.mastery && f.mastery[d.req], 0);
        if (have < num(d.reqLv, 1)) return { ok: false, msg: '需先修滿「' + (T.MASTERY[d.req] ? T.MASTERY[d.req].name : d.req) + '」Lv.' + d.reqLv };
      }
      return { ok: true };
    },

    /* ── 公會建築 ── */
    guildBuildings: function () { return C.GUILD_BUILDINGS; },
    guildBuildingBonus: function (levels, mul) {
      var out = { atkPct:0, defPct:0, hpPct:0, spMul:0, goldMul:0, atbMul:0, dropMul:0, expMul:0, forgeMul:0 };
      var m = num(mul, 0.5);
      Object.keys(levels || {}).forEach(function (bid) {
        var b = T.GUILD_BUILDINGS[bid];
        if (!b) return;
        var lv = num(levels[bid], 0);
        Object.keys(b.perLv || {}).forEach(function (k) {
          out[k] = num(out[k], 0) + num(b.perLv[k], 0) * lv * m;
        });
      });
      return out;
    },

    /* ── 打撈 ── */
    salvageZones: function () { return C.SALVAGE_ZONES; },
    salvagePick: function (lv) {
      var pool = C.SALVAGE_ZONES.filter(function (z) { return num(z.reqLv, 1) <= num(lv, 1); });
      if (!pool.length) pool = [C.SALVAGE_ZONES[0]];
      return pool[pool.length - 1];
    },

    /* ── 時光 ── */
    ttEras: function () { return C.TT_ERAS; },
    ttPick: function (lv) {
      var pool = C.TT_ERAS.filter(function (z) { return num(z.reqLv, 1) <= num(lv, 1); });
      if (!pool.length) pool = [C.TT_ERAS[0]];
      return pool[pool.length - 1];
    },

    /* ── 賭局 ── */
    gambleGames: function () { return C.GAMBLE_GAMES; },
    gambleResolve: function (gameId, amount) {
      var g = T.GAMBLE_GAMES[gameId] || C.GAMBLE_GAMES[0];
      var win = Math.random() < num(g.winChance, 0.45);
      var odds = 1 / Math.max(0.1, num(g.winChance, 0.45) + num(g.edge, 0.1));
      return { win: win, odds: odds, payout: win ? Math.round(num(amount, 0) * odds) : 0, game: g };
    },

    /* ── 離線 ── */
    offlineModes: function () { return C.OFFLINE_MODES; },
    offlineMode: function (id) { return T.OFFLINE_MODES[id] || C.OFFLINE_MODES[0]; },
    offlineCalc: function (modeId, ticks, power) {
      var m = T.OFFLINE_MODES[modeId] || C.OFFLINE_MODES[5];
      var t = num(ticks, 0), p = num(power, 100);
      var eff = num(m.eff, 0.58);
      return {
        mode: m,
        exp: Math.round(p * 0.02 * t * eff * num(m.out && m.out.expMul, 1)),
        gold: Math.round(p * 0.01 * t * eff * num(m.out && m.out.goldMul, 1)),
        drops: Math.round(t * eff * num(m.out && m.out.dropMul, 1) * 0.05),
        sp: Math.round(t * eff * num(m.out && m.out.spMul, 0.5) * 2)
      };
    },

    /* ── 敵方陣法 ── */
    enemyFormations: function () { return C.ENEMY_FORMATIONS; },
    enemyRoll: function (lv) { return C.roll(C.ENEMY_FORMATIONS, lv); },

    /* ── ATB ── */
    atbCalc: function (stats, lv, element, scope) {
      var A = C.ATB;
      var agi = num(stats && stats.agi, 10);
      var dex = num(stats && stats.dex, 0);
      var v = num(A.BASE, 100)
        + agi * num(A.PER_AGI, 0.85)
        + num(lv, 1) * num(A.PER_LV, 0.12)
        + dex * num(A.PER_DEX, 0.6);
      if (element && A.ELEMENT_MOD[element] !== undefined) v *= (1 + A.ELEMENT_MOD[element]);
      if (scope && A.SCOPE_MOD[scope] !== undefined) v *= (1 + A.SCOPE_MOD[scope]);
      return Math.round(clamp(v, num(A.BASE, 100) * num(A.MIN_MUL, 0.3), num(A.BASE, 100) * num(A.MAX_MUL, 3)));
    },

    /* ── 等級經驗 ── */
    maxExpFor: function (lv) {
      var l = Math.max(1, num(lv, 1));
      var base = num(C.LEVEL.A, 100) * Math.pow(l, num(C.LEVEL.B, 1.85)) + l * num(C.LEVEL.C, 120);
      var mul = 1;
      (C.LEVEL.SEGMENTS || []).forEach(function (s) { if (l <= num(s.to, 999)) mul = Math.min(mul, num(s.mul, 1)); });
      if (mul === 1) {
        var last = C.LEVEL.SEGMENTS[C.LEVEL.SEGMENTS.length - 1];
        mul = last ? num(last.mul, 1) : 1;
      }
      return Math.round(base * mul);
    },

    /* ── 名冊職能 ── */
    rosterRoles: function () { return C.ROSTER_ROLES; },
    rosterRoleBonus: function (id) {
      var r = T.ROSTER_ROLES[id];
      return r ? r.bonus : null;
    },

    /* ── 交叉關聯查詢 ── */
    synergyOf: function (id) { return C.synergyOf(id); },
    synergyNote: function (a, b) {
      var list = C.synergyOf(a);
      return list.indexOf(b) !== -1;
    },

    /* ── 聚合（給好友系統呼叫） ── */
    collectFriend: function (f, extra) {
      var ctx = ctxOfFriend(f);
      if (extra) Object.keys(extra).forEach(function (k) { ctx[k] = extra[k]; });
      return L.collect('friend', ctx);
    },
    collectPlayer: function (ctx) { return L.collect('player', ctx || {}); },
    collectTown: function (ctx) { return L.collect('town', ctx || {}); },
    collectAll: function (ctx) { return L.collect('*', ctx || {}); }
  };

  /* ══════════════════════════════════════════════════════
     鉤子實作：讓所有系統互相咬合
     ══════════════════════════════════════════════════════ */

  /* 每期：離線模式推進 + 精通自然成長 + 寵物進化檢查 */
  L.hook('onTick', function (dt) {
    var t = G().townSys;
    if (!t || !t.friendAll) return;
    var list = t.friendAll();
    list.forEach(function (f) {
      // 精通自然成長
      if (Math.random() < 0.05) {
        var pool = C.MASTERY.filter(function (m) { return window.HY.LinkAPI.masteryCanLearn(f, m.id).ok; });
        if (pool.length) {
          var m = pick(pool);
          f.mastery = f.mastery || {};
          f.mastery[m.id] = num(f.mastery[m.id], 0) + 1;
          if (t.fr6Touch) t.fr6Touch(f);
        }
      }
      // 寵物進化
      if (f.pet) {
        var ev = window.HY.LinkAPI.petEvolveCheck(f.pet.id, f.pet.lv);
        if (ev) {
          f.pet.id = ev.id; f.pet.name = ev.name; f.pet.icon = ev.icon;
          if (t.friendLog) t.friendLog('🐾 【' + f.name + '】的寵物進化為【' + ev.name + '】！', 'gain');
          if (t.fr6Touch) t.fr6Touch(f);
        }
      }
    });
  }, 10, 'mastery');

  /* 戰鬥開始：敵方陣法 + 詞綴 */
  L.hook('onBattleStart', function (ctx) {
    if (!ctx) return;
    ctx.enemyFormation = window.HY.LinkAPI.enemyRoll(num(ctx.enemyLv, 30));
    ctx.affixes = window.HY.LinkAPI.rollAffixes(num(ctx.tier, 1), 3);
    ctx.enemyMul = window.HY.LinkAPI.affixStatMul(ctx.affixes)
      * (1 + num(ctx.enemyFormation && ctx.enemyFormation.mul, 0));
    return ctx;
  }, 5, 'enemyfm');

  /* 掉落：詞綴加成 */
  L.hook('onLoot', function (ctx) {
    if (!ctx || !ctx.affixes) return ctx;
    ctx.lootMul = num(ctx.lootMul, 1) * window.HY.LinkAPI.affixLootMul(ctx.affixes);
    return ctx;
  }, 5, 'affix');

  /* 升級：精通獎勵 */
  L.hook('onLevelUp', function (ctx) {
    if (!ctx || !ctx.friend) return;
    var f = ctx.friend;
    if (Math.random() < 0.25) {
      var pool = C.MASTERY.filter(function (m) { return window.HY.LinkAPI.masteryCanLearn(f, m.id).ok; });
      if (pool.length) {
        var m = pick(pool);
        f.mastery = f.mastery || {};
        f.mastery[m.id] = num(f.mastery[m.id], 0) + 1;
      }
    }
  }, 3, 'mastery');

  /* 城鎮升級：公會建築同步 */
  L.hook('onTownUp', function (ctx) {
    var t = G().townSys;
    if (!t) return;
    var root = sysRoot();
    if (!root) return;
    root.guildBuildings = root.guildBuildings || {};
    // 城鎮升級時隨機升一棟建築
    var b = pick(C.GUILD_BUILDINGS);
    root.guildBuildings[b.id] = Math.min(num(b.maxLv, 10), num(root.guildBuildings[b.id], 0) + 1);
    if (t.friendLog) t.friendLog('🏛️ 公會【' + b.name + '】升至 Lv.' + root.guildBuildings[b.id], 'gain');
    void ctx;
  }, 2, 'guild');

  /* ══════════════════════════════════════════════════════
     自動探索 + 稽核
     ══════════════════════════════════════════════════════ */
  L.discover(false);

  console.log('[LinkSystems] ✓ 已註冊 ' + REG.length + ' 個系統（全部 native 正本）｜效果 ' +
    Object.keys(L.effectsOf('formation')).length + '+ ｜鉤子 ' + L.hookCount() + ' 個');
})();