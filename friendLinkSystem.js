// js/friendLinkSystem.js (v1)
// ⭐ 好友系統 v6：跨系統連動核心
//    20 個外部系統的連動實作 + 稽核 + 每期推進
//
// 【設計原則】
//   ① 每個連動都可獨立開關（CONFIG6.*_ENABLE），外部系統缺失時自動降級
//   ② 加成統一由 fr6BonusOf(f) 聚合，再經 friendDerived 包裝注入
//   ③ 每期推進掛在 fr2TickOnce 之後（與 v3/v4 同一條鏈）
//
// ⚠️ 載入順序：friendUnifySystem.js 之後、friendRankSystem.js 之前
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendLinkSystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendLinkSystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var C6 = F.CONFIG6 || {};

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid(p) { return (p || 'f6') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function hash(s) {
    var h = 2166136261, i; s = String(s || '');
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  function G() { return window.HY.game || {}; }
  function enabled(k) { return !!num(C6[k], 0); }
  function ticks() { try { return num(proto.friendState.call(this).ticks, 0); } catch (e) { return 0; } }

  /* ══════════════════════════════════════════════════════
     外部資料讀取（含後備）
     ══════════════════════════════════════════════════════ */
  function asList(x) {
    if (!x) return [];
    if (Array.isArray(x)) return x.filter(Boolean);
    if (typeof x === 'object') {
      return Object.keys(x).map(function (k) {
        var v = x[k];
        if (v && typeof v === 'object') { if (!v.id) v.id = k; return v; }
        return null;
      }).filter(Boolean);
    }
    return [];
  }
  function normBonus(o) {
    o = o || {};
    var b = o.bonus || o;
    return {
      atkPct: num(b.atkPct, num(b.atk, 0) / 100),
      defPct: num(b.defPct, num(b.def, 0) / 100),
      hpPct:  num(b.hpPct,  num(b.hp, 0) / 100),
      spMul:  num(b.spMul, 0),
      expMul: num(b.expMul, 0),
      goldMul:num(b.goldMul, 0),
      dropMul:num(b.dropMul, 0),
      atbMul: num(b.atbMul, num(b.spdMul, 0)),
      critAdd:num(b.critAdd, 0),
      evaAdd: num(b.evaAdd, 0)
    };
  }

  proto.fr6Formations = function () {
    var ext = asList(window.HY.Data && window.HY.Data.XIANXIA_FORMATIONS);
    if (ext.length) return ext;
    return F.FALLBACK_FORMATIONS || [];
  };
  proto.fr6Elements = function () {
    var ext = asList(window.HY.Data && window.HY.Data.ELEMENTS);
    if (ext.length) return ext;
    return F.FALLBACK_ELEMENTS || [];
  };
  proto.fr6SpiritRoots = function () {
    var ext = asList(window.HY.Data && window.HY.Data.SPIRIT_ROOTS);
    if (ext.length) return ext;
    return F.FALLBACK_SPIRIT_ROOTS || [];
  };
  proto.fr6AffixDefs = function () {
    var ext = asList(window.HY.Data && window.HY.Data.MONSTER_AFFIXES);
    if (ext.length) return ext;
    return F.FALLBACK_AFFIXES || [];
  };
  proto.fr6Pets = function () { return asList(window.HY.Data && window.HY.Data.PETS); };
  proto.fr6CompanionDefs = function () { return asList(window.HY.Data && window.HY.Data.COMPANIONS); };
  proto.fr6MasteryDefs = function () { return asList(window.HY.Data && window.HY.Data.MASTERY); };
  proto.fr6Currencies = function () { return asList(window.HY.Data && window.HY.Data.CURRENCIES); };
  proto.fr6GuildBuildings = function () { return asList(window.HY.Data && window.HY.Data.GUILD_BUILDINGS); };

  proto.fr6Def = function (list, id) {
    var L = this[list] ? this[list]() : [];
    for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    return null;
  };

  /* ══════════════════════════════════════════════════════
     狀態
     ══════════════════════════════════════════════════════ */
  proto.fr6Default = function () {
    return {
      guildGuests: [], market: [], nextMarket: 0, crafts: [], salvages: [],
      tt: null, ttHistory: [], gamble: [], roster: [],
      stats: {
        formations: 0, spiritUps: 0, pets: 0, companions: 0, affixes: 0,
        guildJoins: 0, guildContrib: 0, marketSold: 0, marketBought: 0, marketGold: 0,
        crafts: 0, craftFail: 0, salvages: 0, salvageGold: 0,
        masteryUps: 0, ttRuns: 0, ttGold: 0, gambles: 0, gambleNet: 0,
        rosterTo: 0, rosterFrom: 0, offlineSyncs: 0
      },
      log: []
    };
  };
  proto.fr6State = function () {
    var S = this.friendState();
    if (!S.link || typeof S.link !== 'object') S.link = this.fr6Default();
    var L = S.link, d = this.fr6Default(), k;
    for (k in d) { if (L[k] === undefined) L[k] = d[k]; }
    ['guildGuests', 'market', 'crafts', 'salvages', 'ttHistory', 'gamble', 'roster', 'log'].forEach(function (kk) {
      if (!Array.isArray(L[kk])) L[kk] = [];
    });
    if (!L.stats || typeof L.stats !== 'object') L.stats = d.stats;
    for (k in d.stats) { if (L.stats[k] === undefined) L.stats[k] = 0; }
    return L;
  };
  proto.fr6Log = function (msg, type) {
    var L = this.fr6State();
    L.log.unshift({ t: Date.now(), msg: msg, type: type || 'link' });
    if (L.log.length > 90) L.log.pop();
    this.friendLog('🔗 ' + msg, type || 'time');
  };

  /* ══════════════════════════════════════════════════════
     好友連動欄位初始化 / 變更標記
     ══════════════════════════════════════════════════════ */
  proto.fr6Init = function (f) {
    if (!f) return f;
    if (f.formation === undefined) f.formation = null;
    if (f.formationLv === undefined) f.formationLv = 0;
    if (f.element === undefined) f.element = null;
    if (f.spiritRoot === undefined) f.spiritRoot = null;
    if (f.spiritLv === undefined) f.spiritLv = 0;
    if (f.pet === undefined) f.pet = null;                 // { id, lv }
    if (f.companionRole === undefined) f.companionRole = null;
    if (f.mastery === undefined || typeof f.mastery !== 'object') f.mastery = {};
    if (f.affixResist === undefined) f.affixResist = 0;
    if (f.ttBonus === undefined) f.ttBonus = 0;
    return f;
  };

  proto.fr6Touch = function (f) {
    if (!f) return;
    f.__fr6v = num(f.__fr6v, 0) + 1;
    f.__fr6cache = null;
  };

  /* ══════════════════════════════════════════════════════
     加成聚合（單一來源）
     ══════════════════════════════════════════════════════ */
  proto.fr6BonusOf = function (f) {
    var out = {
      atkPct: 0, defPct: 0, hpPct: 0, expMul: 0, spMul: 0, goldMul: 0, dropMul: 0,
      atbMul: 0, critAdd: 0, evaAdd: 0, sources: []
    };
    if (!f) return out;
    this.fr6Init(f);
    var self = this;

    function add(src, name, icon, b) {
      out.atkPct += num(b.atkPct, 0);
      out.defPct += num(b.defPct, 0);
      out.hpPct += num(b.hpPct, 0);
      out.expMul += num(b.expMul, 0);
      out.spMul += num(b.spMul, 0);
      out.goldMul += num(b.goldMul, 0);
      out.dropMul += num(b.dropMul, 0);
      out.atbMul += num(b.atbMul, 0);
      out.critAdd += num(b.critAdd, 0);
      out.evaAdd += num(b.evaAdd, 0);
      out.sources.push({ src: src, name: name, icon: icon, bonus: b });
    }

    /* ① 陣法 */
    if (enabled('FORMATION_ENABLE') && f.formation) {
      var fm = self.fr6Def('fr6Formations', f.formation);
      if (fm) {
        var fb = normBonus(fm);
        var lvMul = 1 + Math.max(0, num(f.formationLv, 1) - 1) * 0.15;
        Object.keys(fb).forEach(function (k) { fb[k] = fb[k] * lvMul; });
        add('formation', fm.name, fm.icon || '☯️', fb);
      }
    }

    /* ② 靈根 */
    if (enabled('SPIRIT_ENABLE') && f.spiritRoot) {
      var sr = self.fr6Def('fr6SpiritRoots', f.spiritRoot);
      if (sr) {
        var sl = num(f.spiritLv, 0);
        var sb = normBonus(sr);
        var sm = num(sr.statMul, 0.02);
        add('spirit', sr.name + ' Lv.' + sl, sr.icon || '💎', {
          atkPct: sb.atkPct + sl * num(C6.SPIRIT_STAT_PER_LV, 0.012) + sm,
          defPct: sb.defPct + sl * num(C6.SPIRIT_STAT_PER_LV, 0.012) + sm,
          hpPct:  sb.hpPct  + sl * num(C6.SPIRIT_STAT_PER_LV, 0.012) + sm,
          expMul: sb.expMul + sl * num(C6.SPIRIT_GROWTH_PER_LV, 0.02) + num(sr.growthMul, 0)
        });
      }
    }

    /* ③ 寵物 */
    if (enabled('PET_ENABLE') && f.pet && f.pet.id) {
      var pet = self.fr6Def('fr6Pets', f.pet.id) || { name: f.pet.name || f.pet.id, icon: '🐾' };
      var pb = normBonus(pet);
      var plv = num(f.pet.lv, 1);
      add('pet', (pet.name || f.pet.id) + ' Lv.' + plv, pet.icon || '🐾', {
        atkPct: pb.atkPct + plv * 0.010,
        defPct: pb.defPct + plv * 0.008,
        hpPct:  pb.hpPct  + plv * 0.010,
        dropMul: pb.dropMul
      });
    }

    /* ④ 同伴職責 */
    if (enabled('COMPANION_ENABLE') && f.companionRole) {
      var cr = null;
      (F.COMPANION_ROLES || []).forEach(function (x) { if (x.id === f.companionRole) cr = x; });
      if (cr) add('companion', cr.name, cr.icon, normBonus(cr));
    }

    /* ⑤ 門派特色 */
    if (enabled('SECT_FEATURE_ENABLE') && f.sect) {
      var SECTS = (window.HY.Data && window.HY.Data.SECTS) || {};
      var sec = SECTS[f.sect] || null;
      if (sec) {
        var sb2 = normBonus(sec.feature || sec);
        var m = num(C6.SECT_FEATURE_MUL, 0.7);
        Object.keys(sb2).forEach(function (k) { sb2[k] = sb2[k] * m; });
        add('sect', sec.name + '·門派特色', sec.icon || '⛩️', sb2);
      }
    }

    /* ⑥ 公會建築（賓客身份） */
    if (enabled('GUILD_ENABLE')) {
      var L = self.fr6State();
      if (L.guildGuests.indexOf(f.id) !== -1) {
        var gb = self.fr6GuildBonus();
        add('guild', '公會賓客', '🏛️', gb);
      }
    }

    /* ⑦ 精通 */
    if (enabled('MASTERY_ENABLE')) {
      var mk = Object.keys(f.mastery || {});
      if (mk.length) {
        var tot = 0;
        mk.forEach(function (k) { tot += num(f.mastery[k], 0); });
        add('mastery', '精通 ' + mk.length + ' 項', '🎯', {
          atkPct: tot * 0.006, defPct: tot * 0.005, hpPct: tot * 0.005
        });
      }
    }

    /* ⑧ 時光旅行加成（暫時性） */
    if (num(f.ttBonus, 0) > 0) {
      add('timetravel', '時光迴響', '⏳', { atkPct: num(f.ttBonus, 0), expMul: num(f.ttBonus, 0) * 0.5 });
    }

    /* 上限 */
    var cap = 1.5;
    out.atkPct = Math.min(cap, out.atkPct);
    out.defPct = Math.min(cap, out.defPct);
    out.hpPct = Math.min(cap, out.hpPct);
    return out;
  };

  /* 公會建築加成（給好友用，折半） */
  proto.fr6GuildBonus = function () {
    var out = { atkPct: 0, defPct: 0, hpPct: 0, goldMul: 0 };
    var g = G().guildCoreSys;
    if (!g) return out;
    var mul = num(C6.GUILD_BUILDING_MUL, 0.5);
    try {
      if (typeof g.getTotalBuildingBonus === 'function') {
        var b = g.getTotalBuildingBonus() || {};
        out.atkPct = num(b.atkPct, num(b.atk, 0) / 100) * mul;
        out.defPct = num(b.defPct, num(b.def, 0) / 100) * mul;
        out.hpPct = num(b.hpPct, num(b.hp, 0) / 100) * mul;
        out.goldMul = num(b.goldMul, 0) * mul;
      }
    } catch (e) { /* 忽略 */ }
    return out;
  };

  /* ══════════════════════════════════════════════════════
     ① 陣法
     ══════════════════════════════════════════════════════ */
  proto.fr6FormationList = function () { return this.fr6Formations(); };
  proto.fr6SetFormation = function (fid, fmId) {
    var f = this.friendById(fid);
    if (!f) return false;
    this.fr6Init(f);
    if (!fmId) { f.formation = null; f.formationLv = 0; this.fr6Touch(f); this.requestRender(); return true; }
    var fm = this.fr6Def('fr6Formations', fmId);
    if (!fm) { this.log('⚠️ 找不到該陣法。', 'system'); return false; }
    if (num(f.lv, 1) < num(fm.reqLv, 1)) { this.log('⚠️ 【' + f.name + '】等級不足（需 Lv.' + num(fm.reqLv, 1) + '）。', 'system'); return false; }
    f.formation = fmId;
    if (!f.formationLv) f.formationLv = 1;
    this.fr6Touch(f);
    this.fr6State().stats.formations += 1;
    this.fr6Log('【' + f.name + '】修習陣法【' + (fm.icon || '☯️') + (fm.name || fmId) + '】Lv.' + f.formationLv, 'gain');
    this.requestRender();
    return true;
  };
  proto.fr6FormationLearn = function (f) {
    if (!enabled('FORMATION_ENABLE') || !f) return false;
    this.fr6Init(f);
    if (f.formation) return false;
    if (Math.random() >= num(C6.FORMATION_LEARN_CHANCE, 0.06)) return false;
    var L = this.fr6Formations().filter(function (x) { return num(f.lv, 1) >= num(x.reqLv, 1); });
    if (!L.length) return false;
    var fm = pick(L);
    f.formation = fm.id;
    f.formationLv = 1;
    this.fr6Touch(f);
    this.fr6State().stats.formations += 1;
    this.fr6Log('【' + f.name + '】自行領悟陣法【' + (fm.icon || '☯️') + (fm.name || fm.id) + '】', 'gain');
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ② 靈根
     ══════════════════════════════════════════════════════ */
  proto.fr6RollSpiritRoot = function (f) {
    var L = this.fr6SpiritRoots();
    if (!L.length) return null;
    var tot = 0, i;
    for (i = 0; i < L.length; i++) tot += num(L[i].weight, 10);
    var r = Math.random() * tot, acc = 0;
    for (i = 0; i < L.length; i++) { acc += num(L[i].weight, 10); if (r <= acc) return L[i]; }
    return L[0];
  };
  proto.fr6SpiritUp = function (f) {
    if (!enabled('SPIRIT_ENABLE') || !f) return false;
    this.fr6Init(f);
    if (num(f.spiritLv, 0) >= num(C6.SPIRIT_MAX_LV, 10)) return false;
    if (Math.random() >= num(C6.SPIRIT_LV_UP_CHANCE, 0.045)) return false;
    f.spiritLv = num(f.spiritLv, 0) + 1;
    this.fr6Touch(f);
    this.fr6State().stats.spiritUps += 1;
    this.fr6Log('【' + f.name + '】靈根淬鍊至 Lv.' + f.spiritLv, 'gain');
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ③ 五行
     ══════════════════════════════════════════════════════ */
  proto.fr6ElementOf = function (f) { this.fr6Init(f); return f.element; };
  proto.fr6ElementMul = function (aId, bId) {
    if (!enabled('ELEMENT_ENABLE')) return 1;
    if (!aId || !bId) return 1;
    var L = this.fr6Elements(), a = null, b = null, i;
    for (i = 0; i < L.length; i++) {
      if (L[i].id === aId || L[i].name === aId) a = L[i];
      if (L[i].id === bId || L[i].name === bId) b = L[i];
    }
    if (!a || !b) return 1;
    var beats = a.beats || a.counters || a.strongVs;
    if (beats === b.id || beats === b.name) return 1 + num(C6.ELEMENT_ADV, 0.15);
    var bb = b.beats || b.counters || b.strongVs;
    if (bb === a.id || bb === a.name) return 1 + num(C6.ELEMENT_DIS, -0.08);
    return 1;
  };
  proto.fr6TeamElementMul = function (members, enemyElement) {
    if (!enabled('ELEMENT_ENABLE') || !enemyElement) return 1;
    if (!members || !members.length) return 1;
    var s = 0, n = 0;
    members.forEach(function (f) {
      if (!f) return;
      var e = f.element;
      if (!e) return;
      s += this.fr6ElementMul(e, enemyElement);
      n += 1;
    }, this);
    if (!n) return 1;
    return clamp(1 + (s / n - 1) * 0.7, 0.85, 1.25);
  };

  /* ══════════════════════════════════════════════════════
     ④ 寵物
     ══════════════════════════════════════════════════════ */
  proto.fr6PetList = function () { return this.fr6Pets(); };
  proto.fr6SetPet = function (fid, petId) {
    var f = this.friendById(fid);
    if (!f) return false;
    this.fr6Init(f);
    if (!petId) { f.pet = null; this.fr6Touch(f); this.requestRender(); return true; }
    var pet = this.fr6Def('fr6Pets', petId);
    if (!pet) { this.log('⚠️ 找不到該寵物。', 'system'); return false; }
    f.pet = { id: petId, lv: 1, name: pet.name, icon: pet.icon };
    this.fr6Touch(f);
    this.fr6State().stats.pets += 1;
    this.fr6Log('【' + f.name + '】獲得寵物【' + (pet.icon || '🐾') + (pet.name || petId) + '】', 'gain');
    this.requestRender();
    return true;
  };
  proto.fr6PetRoll = function (f) {
    if (!enabled('PET_ENABLE') || !f) return false;
    this.fr6Init(f);
    if (f.pet) {
      if (num(f.pet.lv, 1) < num(C6.PET_MAX_LV, 10) && Math.random() < num(C6.PET_LV_UP_CHANCE, 0.05)) {
        f.pet.lv = num(f.pet.lv, 1) + 1;
        this.fr6Touch(f);
        this.fr6Log('【' + f.name + '】的寵物升至 Lv.' + f.pet.lv, 'gain');
        return true;
      }
      return false;
    }
    var L = this.fr6Pets();
    if (!L.length) return false;
    if (Math.random() >= 0.03) return false;
    var pet = pick(L);
    f.pet = { id: pet.id, lv: 1, name: pet.name, icon: pet.icon };
    this.fr6Touch(f);
    this.fr6State().stats.pets += 1;
    this.fr6Log('【' + f.name + '】收服寵物【' + (pet.icon || '🐾') + (pet.name || pet.id) + '】', 'gain');
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ⑤ 同伴
     ══════════════════════════════════════════════════════ */
  proto.fr6CompanionRoles = function () { return F.COMPANION_ROLES || []; };
  proto.fr6SetCompanionRole = function (fid, roleId) {
    var f = this.friendById(fid);
    if (!f) return false;
    this.fr6Init(f);
    if (!roleId) { f.companionRole = null; this.fr6Touch(f); this.requestRender(); return true; }
    var min = num(C6.COMPANION_FAVOR_MIN, 60);
    if (num(f.favor, 0) < min) { this.log('⚠️ 好感不足（需 ' + min + '）。', 'system'); return false; }
    var roles = this.fr6CompanionRoles(), ok = false;
    roles.forEach(function (r) { if (r.id === roleId) ok = true; });
    if (!ok) return false;
    f.companionRole = roleId;
    this.fr6Touch(f);
    this.fr6State().stats.companions = this.friendAll().filter(function (x) { return x.companionRole; }).length;
    this.fr6Log('【' + f.name + '】出任同伴', 'gain');
    this.requestRender();
    return true;
  };
  proto.fr6Companions = function () {
    return this.friendAll().filter(function (f) { return f.companionRole && !f.retired; });
  };

  /* ══════════════════════════════════════════════════════
     ⑥ 怪物詞綴
     ══════════════════════════════════════════════════════ */
  proto.fr6RollAffixes = function (tier) {
    if (!enabled('AFFIX_ENABLE')) return [];
    var defs = this.fr6AffixDefs();
    if (!defs.length) return [];
    var n = 0;
    var maxA = num(C6.AFFIX_MAX, 3);
    for (var i = 0; i < maxA; i++) {
      if (Math.random() < num(C6.AFFIX_CHANCE, 0.28)) n += 1;
    }
    if (n <= 0) return [];
    n = Math.min(n, maxA);
    var out = [], used = {};
    for (var j = 0; j < n; j++) {
      var d = pick(defs);
      if (!d || used[d.id]) { j -= 1; if (j < -5) break; continue; }
      used[d.id] = 1;
      out.push({ id: d.id, name: d.name, icon: d.icon || '🧬', kind: d.kind, mul: num(d.mul, 0.14) });
    }
    void tier;
    return out;
  };
  proto.fr6AffixStatMul = function (affixes) {
    if (!affixes || !affixes.length) return 1;
    return 1 + affixes.length * num(C6.AFFIX_STAT_MUL, 0.14);
  };
  proto.fr6AffixLootMul = function (affixes) {
    if (!affixes || !affixes.length) return 1;
    return 1 + affixes.length * num(C6.AFFIX_LOOT_MUL, 0.35);
  };

  /* ══════════════════════════════════════════════════════
     ⑦ 公會賓客
     ══════════════════════════════════════════════════════ */
  proto.fr6GuildGuests = function () { return this.fr6State().guildGuests; };
  proto.fr6GuildJoin = function (fid) {
    var L = this.fr6State();
    var f = this.friendById(fid);
    if (!f) return false;
    if (f.retired) { this.log('⚠️ 【' + f.name + '】已退隱。', 'system'); return false; }
    if (L.guildGuests.indexOf(fid) !== -1) { this.log('⚠️ 【' + f.name + '】已是公會賓客。', 'system'); return false; }
    if (L.guildGuests.length >= num(C6.GUILD_GUEST_MAX, 8)) { this.log('⚠️ 公會賓客已滿（' + num(C6.GUILD_GUEST_MAX, 8) + '）。', 'system'); return false; }
    L.guildGuests.push(fid);
    f.guildGuest = true;
    this.fr6Touch(f);
    L.stats.guildJoins += 1;
    this.fr6Log('【' + f.name + '】受邀成為公會賓客（享建築加成）。', 'gain');
    this.requestRender();
    return true;
  };
  proto.fr6GuildLeave = function (fid) {
    var L = this.fr6State();
    var f = this.friendById(fid);
    var i = L.guildGuests.indexOf(fid);
    if (i === -1) return false;
    L.guildGuests.splice(i, 1);
    if (f) { f.guildGuest = false; this.fr6Touch(f); }
    this.requestRender();
    return true;
  };
  proto.fr6GuildContribute = function () {
    var L = this.fr6State();
    var g = G().guildCoreSys;
    var n = L.guildGuests.length * num(C6.GUILD_CONTRIB_PER_TICK, 1);
    if (!n) return 0;
    try {
      if (g && typeof g.addContribution === 'function') g.addContribution(n);
      else if (g && typeof g.addExp === 'function') g.addExp(n);
      else { var root = this.charSys.rootState; root.guildExp = num(root.guildExp, 0) + n; }
    } catch (e) { /* 忽略 */ }
    L.stats.guildContrib += n;
    return n;
  };

  /* ══════════════════════════════════════════════════════
     ⑧ 黑市
     ══════════════════════════════════════════════════════ */
  proto.fr6MarketRefresh = function (force) {
    var L = this.fr6State();
    var now = ticks.call(this);
    if (!force && num(L.nextMarket, 0) > now) return 0;
    L.nextMarket = now + num(C6.MARKET_REFRESH, 12);
    L.market = [];
    var self = this;
    var pool = this.friendAll().filter(function (f) { return !f.retired && (f.bag || []).length > 0; });
    var max = num(C6.MARKET_LIST_MAX, 6);
    for (var i = 0; i < max && pool.length; i++) {
      var f = pick(pool);
      if (!f || !f.bag.length) continue;
      var idx = rndInt(0, f.bag.length - 1);
      var it = f.bag[idx];
      if (!it) continue;
      f.bag.splice(idx, 1);
      var price = Math.round(self.friendItemPower(it) * 0.55 * num(C6.MARKET_MARKUP, 1.25) + num(it.reqLv, 1) * 40);
      L.market.push({
        id: uid('mk'), item: it, name: self.friendItemLabel(it),
        sellerId: f.id, sellerName: f.name, sellerIcon: f.icon,
        price: price, power: self.friendItemPower(it), reqLv: num(it.reqLv, 1),
        left: rndInt(10, 24)
      });
    }
    return L.market.length;
  };
  proto.fr6MarketList = function () { return this.fr6State().market; };
  proto.fr6MarketBuy = function (id) {
    var L = this.fr6State();
    var m = null;
    L.market.forEach(function (x) { if (x.id === id) m = x; });
    if (!m) return false;
    if (this.frUniGold() < num(m.price, 0)) { this.log('⚠️ 銀兩不足（需 ' + num(m.price, 0).toLocaleString() + '）。', 'system'); return false; }
    if (!this.frUniStore(m.item)) { this.log('🎒 行囊與倉庫皆已滿。', 'system'); return false; }
    this.frUniAddGold(-num(m.price, 0));
    L.market = L.market.filter(function (x) { return x.id !== id; });
    L.stats.marketBought += 1;
    var f = this.friendById(m.sellerId);
    if (f) { f.favor = Math.min(100, num(f.favor, 0) + 3); this.friendGainExp(f, Math.round(num(f.maxExp, 100) * 0.03)); }
    this.fr6Log('向【' + m.sellerName + '】購入【' + m.name + '】（' + num(m.price, 0).toLocaleString() + ' 兩）', 'wealth');
    this.requestRender();
    return true;
  };
  proto.fr6MarketSell = function (wareIdx) {
    var L = this.fr6State();
    var items = this.frUniItems();
    var i = num(wareIdx, -1);
    var it = items[i];
    if (!it) return false;
    var price = Math.round(this.friendItemPower(it) * 0.62 + num(it.reqLv, 1) * 30);
    if (Math.random() < num(C6.MARKET_STALL, 0.18)) {
      this.fr6Log('黑市收購失敗：【' + this.friendItemLabel(it) + '】無人問津。', 'system');
      return false;
    }
    items.splice(i, 1);
    this.frUniAddGold(price);
    L.stats.marketSold += 1;
    L.stats.marketGold += price;
    this.fr6Log('黑市售出【' + this.friendItemLabel(it) + '】，得 ' + price.toLocaleString() + ' 兩。', 'wealth');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ⑨ 工藝代工
     ══════════════════════════════════════════════════════ */
  proto.fr6CraftAssign = function (fid, wareIdx) {
    var L = this.fr6State();
    var f = this.friendById(fid);
    if (!f || f.retired) return false;
    if (this.fr6Busy(fid)) { this.log('⚠️ 【' + f.name + '】已在忙。', 'system'); return false; }
    if (L.crafts.length >= num(C6.CRAFT_MAX, 2)) { this.log('⚠️ 同時最多 ' + num(C6.CRAFT_MAX, 2) + ' 件代工。', 'system'); return false; }
    var need = num(C6.CRAFT_COST_MAT, 6);
    var st = this.frUniMats();
    var mid = null;
    Object.keys(st).forEach(function (k) { if (!mid && num(st[k], 0) >= need) mid = k; });
    if (!mid) { this.log('⚠️ 材料不足（需任一種 ' + need + ' 份）。', 'system'); return false; }
    var items = this.frUniItems();
    var it = items[num(wareIdx, -1)];
    if (!it) { this.log('⚠️ 找不到該裝備。', 'system'); return false; }
    st[mid] = num(st[mid], 0) - need;
    items.splice(num(wareIdx, -1), 1);
    var dur = rndInt(num(C6.CRAFT_TICKS[0], 5), num(C6.CRAFT_TICKS[1], 12));
    L.crafts.push({
      id: uid('cf'), fid: fid, name: f.name, icon: f.icon, item: it,
      mat: mid, left: dur, total: dur, at: Date.now()
    });
    this.fr6Log('【' + f.name + '】開始代工【' + this.friendItemLabel(it) + '】（約 ' + dur + ' 期）', 'time');
    this.requestRender();
    return true;
  };
  proto.fr6CraftTick = function () {
    var L = this.fr6State(), self = this;
    L.crafts.slice().forEach(function (c) {
      c.left = num(c.left, 0) - 1;
      if (c.left > 0) return;
      var ok = Math.random() < num(C6.CRAFT_SUCCESS, 0.72);
      var f = self.friendById(c.fid);
      if (ok) {
        var add = rndInt(1, 2);
        c.item._forgeLv = num(c.item._forgeLv, 0) + add;
        L.stats.crafts += 1;
        if (f) { f.favor = Math.min(100, num(f.favor, 0) + 3); self.friendGainExp(f, Math.round(num(f.maxExp, 100) * 0.12)); }
        self.fr6Log('【' + c.name + '】代工成功：【' + self.friendItemLabel(c.item) + '】+' + add, 'loot');
      } else {
        L.stats.craftFail += 1;
        self.fr6Log('【' + c.name + '】代工失敗：【' + self.friendItemLabel(c.item) + '】維持原狀。', 'system');
      }
      self.frUniStore(c.item);
      L.crafts = L.crafts.filter(function (x) { return x.id !== c.id; });
    });
  };

  /* ══════════════════════════════════════════════════════
     ⑩ 打撈遠征
     ══════════════════════════════════════════════════════ */
  proto.fr6SalvageStart = function (ids) {
    var L = this.fr6State(), self = this;
    if (L.salvages.length >= 1) { this.log('⚠️ 已有打撈隊在作業。', 'system'); return false; }
    var members = (ids && ids.length ? ids : this.fr2ExpIdleFriends().map(function (f) { return f.id; }))
      .filter(function (id) { return self.friendById(id); })
      .slice(0, num(C6.SALVAGE_MAX, 6));
    if (members.length < num(C6.SALVAGE_MIN, 3)) { this.log('⚠️ 打撈需 ' + num(C6.SALVAGE_MIN, 3) + ' 人以上。', 'system'); return false; }
    var dur = rndInt(num(C6.SALVAGE_TICKS[0], 10), num(C6.SALVAGE_TICKS[1], 22));
    L.salvages.push({ id: uid('sv'), members: members, left: dur, total: dur, at: Date.now(), gains: { gold: 0, items: 0 } });
    var names = members.map(function (id) { var f = self.friendById(id); return f ? f.name : '?'; }).join('、');
    this.fr6Log('🌊 打撈遠征隊成軍（' + members.length + ' 人）：' + names + '，約 ' + dur + ' 期。', 'gain');
    return true;
  };
  proto.fr6SalvageTick = function () {
    var L = this.fr6State(), self = this;
    L.salvages.slice().forEach(function (s) {
      s.left = num(s.left, 0) - 1;
      if (s.left > 0) return;
      var pow = 0, members = [];
      s.members.forEach(function (id) {
        var f = self.friendById(id);
        if (!f) return;
        members.push(f);
        pow += self.friendPower(f);
      });
      var gold = Math.round(pow * 0.05 * num(C6.SALVAGE_GOLD, 1));
      self.frUniAddGold(gold);
      var items = 0;
      members.forEach(function (f) {
        if (Math.random() < 0.45) {
          var eq = self.friendRollEquip(num(f.lv, 1));
          if (eq) { f.bag.push(eq); f.drops = num(f.drops, 0) + 1; items += 1; }
        }
        f.favor = Math.min(100, num(f.favor, 0) + 3);
        self.friendGainExp(f, Math.round(num(f.maxExp, 100) * 0.18));
      });
      var box = self.friendRollEquip(Math.max(1, self.fr2PlayerLv()));
      if (box && self.frUniStore(box)) items += 1;
      L.stats.salvages += 1;
      L.stats.salvageGold += gold;
      self.fr6Log('🌊 打撈完成：' + members.length + ' 人帶回紋銀 ' + gold.toLocaleString() + ' 兩、戰利品 ' + items + ' 件。', 'loot');
      L.salvages = L.salvages.filter(function (x) { return x.id !== s.id; });
    });
  };

  /* ══════════════════════════════════════════════════════
     ⑪ 精通
     ══════════════════════════════════════════════════════ */
  proto.fr6MasteryUp = function (f) {
    if (!enabled('MASTERY_ENABLE') || !f) return false;
    this.fr6Init(f);
    var defs = this.fr6MasteryDefs();
    var pool = defs.length ? defs : [{ id: 'mk_atk', name: '攻擊精通' }, { id: 'mk_def', name: '防禦精通' }, { id: 'mk_hp', name: '氣血精通' }];
    if (Math.random() >= num(C6.MASTERY_UP_CHANCE, 0.08)) return false;
    var d = pick(pool);
    if (!d) return false;
    var cur = num(f.mastery[d.id], 0);
    if (cur >= num(C6.MASTERY_MAX_LV, 10)) return false;
    f.mastery[d.id] = cur + 1;
    this.fr6Touch(f);
    this.fr6State().stats.masteryUps += 1;
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ⑫ ATB 戰鬥速度
     ══════════════════════════════════════════════════════ */
  proto.fr6AtbOf = function (f) {
    if (!enabled('ATB_ENABLE')) return num(C6.ATB_BASE, 100);
    var base = num(C6.ATB_BASE, 100);
    try {
      var d = G().dexSys;
      if (d && typeof d.getAtbSpeed === 'function') {
        var v = d.getAtbSpeed(f);
        if (num(v, 0) > 0) base = num(v, 0);
      }
    } catch (e) { /* 忽略 */ }
    var b = this.fr6BonusOf(f);
    return Math.round(base * (1 + num(b.atbMul, 0)));
  };

  /* ══════════════════════════════════════════════════════
     ⑬ 敵方陣法
     ══════════════════════════════════════════════════════ */
  proto.fr6EnemyFormationRoll = function () {
    if (!enabled('ENEMY_FORMATION_ENABLE')) return null;
    if (Math.random() >= num(C6.ENEMY_FORMATION_CHANCE, 0.35)) return null;
    var L = this.fr6Formations();
    if (!L.length) return null;
    var fm = pick(L);
    return { id: fm.id, name: fm.name, icon: fm.icon || '🔺', mul: num(C6.ENEMY_FORMATION_MUL, 0.20) };
  };
  proto.fr6EnemyFormationMul = function (ef) {
    if (!ef) return 1;
    return 1 + num(ef.mul, 0.2);
  };

  /* ══════════════════════════════════════════════════════
     ⑭ 時光旅行
     ══════════════════════════════════════════════════════ */
  proto.fr6TtStart = function (ids) {
    var L = this.fr6State(), self = this;
    if (L.tt) { this.log('⚠️ 時光旅行進行中。', 'system'); return false; }
    var members = (ids && ids.length ? ids : this.friendFollowers().map(function (f) { return f.id; }))
      .filter(function (id) { return self.friendById(id); });
    if (!members.length) { this.log('⚠️ 需至少一位好友隨行。', 'system'); return false; }
    var dur = rndInt(num(C6.TIMETRAVEL_TICKS[0], 15), num(C6.TIMETRAVEL_TICKS[1], 30));
    L.tt = { id: uid('tt'), members: members, left: dur, total: dur, at: Date.now(), gold: 0, items: 0 };
    this.fr6Log('⏳ 時光旅行啟動（' + members.length + ' 人隨行），約 ' + dur + ' 期。', 'gain');
    return true;
  };
  proto.fr6TtTick = function () {
    var L = this.fr6State(), self = this;
    if (!L.tt) return;
    var t = L.tt;
    t.left = num(t.left, 0) - 1;
    if (t.left > 0) return;
    var pow = 0, members = [];
    t.members.forEach(function (id) {
      var f = self.friendById(id);
      if (!f) return;
      members.push(f); pow += self.friendPower(f);
    });
    var gold = Math.round(pow * 0.06 * num(C6.TIMETRAVEL_GOLD_MUL, 1.4));
    self.frUniAddGold(gold);
    var items = 0;
    members.forEach(function (f) {
      f.ttBonus = 0.06;
      f.favor = Math.min(100, num(f.favor, 0) + 5);
      self.friendGainExp(f, Math.round(num(f.maxExp, 100) * 0.30));
      self.fr6Touch(f);
      var eq = self.friendRollEquip(num(f.lv, 1) + 5);
      if (eq) { f.bag.push(eq); items += 1; }
    });
    L.stats.ttRuns += 1;
    L.stats.ttGold += gold;
    L.ttHistory.unshift({ at: Date.now(), members: members.map(function (f) { return f.name; }), gold: gold, items: items });
    L.ttHistory = L.ttHistory.slice(0, 10);
    L.tt = null;
    self.fr6Log('⏳ 時光旅行歸來：帶回紋銀 ' + gold.toLocaleString() + ' 兩、戰利品 ' + items + ' 件（好友獲時光迴響加成）。', 'loot');
  };

  /* ══════════════════════════════════════════════════════
     ⑮ 賭局
     ══════════════════════════════════════════════════════ */
  proto.fr6GambleBet = function (fid, amount, pickHigh) {
    var L = this.fr6State();
    var f = this.friendById(fid);
    if (!f) return false;
    var amt = clamp(Math.round(num(amount, 0)), num(C6.GAMBLE_MIN, 500), num(C6.GAMBLE_MAX, 50000));
    if (this.frUniGold() < amt) { this.log('⚠️ 銀兩不足。', 'system'); return false; }
    this.frUniAddGold(-amt);
    var odds = clamp(1.6 + (num(f.lv, 1) / 100) * 0.5, 1.4, 2.4);
    L.gamble.push({
      id: uid('gb'), fid: fid, name: f.name, icon: f.icon,
      amount: amt, odds: odds, pickHigh: !!pickHigh, settled: false, win: false, payout: 0, at: Date.now()
    });
    this.fr6Log('🎲 你與【' + f.name + '】對賭 ' + amt.toLocaleString() + ' 兩（賠率 ' + odds.toFixed(2) + '）。', 'wealth');
    this.requestRender();
    return true;
  };
  proto.fr6GambleResolve = function () {
    var L = this.fr6State(), self = this;
    var pend = L.gamble.filter(function (g) { return !g.settled; });
    if (!pend.length) { this.log('🎲 沒有待結算的賭局。', 'system'); return 0; }
    var net = 0;
    pend.forEach(function (g) {
      g.settled = true;
      var edge = num(C6.GAMBLE_HOUSE_EDGE, 0.08);
      var winChance = clamp(0.5 - edge, 0.2, 0.8);
      var ok = Math.random() < winChance;
      g.win = ok;
      if (ok) {
        g.payout = Math.round(g.amount * g.odds);
        self.frUniAddGold(g.payout);
        net += (g.payout - g.amount);
      } else {
        net -= g.amount;
      }
      var f = self.friendById(g.fid);
      if (f) f.favor = Math.min(100, num(f.favor, 0) + (ok ? 1 : 2));
    });
    L.stats.gambles += pend.length;
    L.stats.gambleNet += net;
    this.fr6Log('🎲 賭局結算：' + (net >= 0 ? '淨賺 ' : '淨賠 ') + Math.abs(net).toLocaleString() + ' 兩。', net >= 0 ? 'gain' : 'system');
    L.gamble = L.gamble.slice(-12);
    this.requestRender();
    return net;
  };

  /* ══════════════════════════════════════════════════════
     ⑯ 名冊互轉
     ══════════════════════════════════════════════════════ */
  proto.fr6ToRoster = function (fid) {
    var f = this.friendById(fid);
    if (!f) return false;
    if (f.retired) { this.log('⚠️ 【' + f.name + '】已退隱。', 'system'); return false; }
    var cost = num(C6.ROSTER_COST, 5000);
    if (this.frUniGold() < cost) { this.log('⚠️ 需 ' + cost.toLocaleString() + ' 兩。', 'system'); return false; }
    var rs = G().rosterSys;
    if (!rs) { this.log('⚠️ 名冊系統未載入。', 'system'); return false; }
    try {
      var root = this.charSys.rootState;
      if (!Array.isArray(root.roster)) root.roster = [];
      var c = JSON.parse(JSON.stringify(f));
      c.id = 'ros_' + uid('r');
      c.fromFriend = f.name;
      c.following = false;
      c.friendId = f.id;
      if (typeof rs.addCharacter === 'function') rs.addCharacter(c);
      else root.roster.push(c);
      this.frUniAddGold(-cost);
      var L = this.fr6State();
      L.roster.push({ id: c.id, from: f.name, at: Date.now() });
      L.stats.rosterTo += 1;
      this.fr6Log('📋 【' + f.name + '】已轉入角色名冊（花費 ' + cost.toLocaleString() + ' 兩）。', 'gain');
      this.requestRender();
      return true;
    } catch (e) {
      console.error('[friendLink] 轉入名冊失敗：', e);
      this.log('⚠️ 轉入名冊失敗。', 'system');
      return false;
    }
  };
  proto.fr6FromRoster = function (charId) {
    var root = this.charSys.rootState;
    var roster = Array.isArray(root.roster) ? root.roster : [];
    var c = null, idx = -1;
    roster.forEach(function (x, i) { if (x.id === charId) { c = x; idx = i; } });
    if (!c) return false;
    if (this.friendAll().length >= this.friendSlots()) { this.log('⚠️ 好友名額已滿。', 'system'); return false; }
    var f = this.friendMake({ id: 'from_' + c.id, name: c.name, icon: c.icon || '🧑', lv: num(c.lv, 1) }, { lv: num(c.lv, 1) });
    if (!f) return false;
    try {
      ['stats', 'skills', 'xinfa', 'qinggong', 'meridians', 'equipment'].forEach(function (k) {
        if (c[k]) f[k] = JSON.parse(JSON.stringify(c[k]));
      });
    } catch (e) { /* 忽略 */ }
    f.fromRoster = true;
    this.fr6Init(f);
    var d = this.friendDerived(f);
    f.currentHp = d.maxHp; f.currentMp = d.maxMp;
    roster.splice(idx, 1);
    this.friendState().list.push(f);
    var L = this.fr6State();
    L.stats.rosterFrom += 1;
    this.fr6Log('📋 【' + f.name + '】從名冊轉為好友。', 'gain');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ⑰ 離線掛機同步
     ══════════════════════════════════════════════════════ */
  proto.fr6OfflineSync = function () {
    if (!enabled('OFFLINE_ENABLE')) return 0;
    var os = G().offlineSys;
    if (!os) return 0;
    var L = this.fr6State();
    try {
      var info = (typeof os.getState === 'function') ? os.getState() : null;
      if (!info) return 0;
      var away = num(info.awayTicks, num(info.offlineMs, 0) / 3000);
      if (away < 1) return 0;
      var cap = num(C6.OFFLINE_CAP_TICKS, 500);
      var share = num(C6.OFFLINE_SHARE, 0.6);
      var n = Math.min(Math.floor(away * share), cap);
      if (n < 1) return 0;
      this._friendQuiet = true;
      for (var i = 0; i < n; i++) this.fr2TickOnce();
      this._friendQuiet = false;
      L.stats.offlineSyncs += 1;
      this.fr6Log('🌙 與離線掛機系統同步：好友補算 ' + n + ' 期。', 'time');
      return n;
    } catch (e) {
      return 0;
    }
  };

  /* ══════════════════════════════════════════════════════
     ⑱ 等級經驗曲線同步
     ══════════════════════════════════════════════════════ */
  proto.fr6MaxExpFor = function (lv) {
    if (!enabled('LEVELSYNC_ENABLE')) return null;
    var ls = G().levelExpSys;
    if (!ls) return null;
    try {
      if (typeof ls.getMaxExp === 'function') {
        var v = ls.getMaxExp(lv);
        if (num(v, 0) > 0) return Math.round(num(v, 0));
      }
      if (typeof ls.maxExpFor === 'function') {
        var v2 = ls.maxExpFor(lv);
        if (num(v2, 0) > 0) return Math.round(num(v2, 0));
      }
      if (typeof ls.getExpNeed === 'function') {
        var v3 = ls.getExpNeed(lv);
        if (num(v3, 0) > 0) return Math.round(num(v3, 0));
      }
    } catch (e) { /* 忽略 */ }
    return null;
  };

  /* ══════════════════════════════════════════════════════
     忙碌判定（供工藝等使用）
     ══════════════════════════════════════════════════════ */
  proto.fr6Busy = function (fid) {
    var L = this.fr6State();
    var i;
    for (i = 0; i < L.crafts.length; i++) if (L.crafts[i].fid === fid) return true;
    for (i = 0; i < L.salvages.length; i++) if (L.salvages[i].members.indexOf(fid) !== -1) return true;
    if (L.tt && L.tt.members.indexOf(fid) !== -1) return true;
    return false;
  };

  /* ══════════════════════════════════════════════════════
     每期推進
     ══════════════════════════════════════════════════════ */
  proto.fr6Tick = function () {
    var L = this.fr6State();
    var self = this;
    var now = num(this.friendState().ticks, 0);

    /* 黑市刷新 */
    try { if (L.market.length < 2) this.fr6MarketRefresh(false); } catch (e) { /* 忽略 */ }

    /* 每期：好友自行領悟 */
    this.friendAll().forEach(function (f) {
      if (f.retired) return;
      try { self.fr6FormationLearn(f); } catch (e) { /* 忽略 */ }
      try { self.fr6SpiritUp(f); } catch (e) { /* 忽略 */ }
      try { self.fr6PetRoll(f); } catch (e) { /* 忽略 */ }
      try { self.fr6MasteryUp(f); } catch (e) { /* 忽略 */ }
      if (num(f.ttBonus, 0) > 0 && now % 10 === 0) { f.ttBonus = 0; self.fr6Touch(f); }
    });

    /* 公會貢獻 */
    try { this.fr6GuildContribute(); } catch (e) { /* 忽略 */ }

    /* 進行中的作業 */
    try { this.fr6CraftTick(); } catch (e) { console.error('[friendLink] 工藝 tick 失敗：', e); }
    try { this.fr6SalvageTick(); } catch (e) { console.error('[friendLink] 打撈 tick 失敗：', e); }
    try { this.fr6TtTick(); } catch (e) { console.error('[friendLink] 時光旅行 tick 失敗：', e); }

    /* 賭局自動結算（每 8 期） */
    if (now % 8 === 0) { try { this.fr6GambleResolve(); } catch (e) { /* 忽略 */ } }

    /* 陣法升級 */
    this.friendAll().forEach(function (f) {
      if (!f.formation || num(f.formationLv, 1) >= num(C6.FORMATION_MAX_LV, 5)) return;
      if (Math.random() >= num(C6.FORMATION_LV_UP_CHANCE, 0.10)) return;
      f.formationLv = num(f.formationLv, 1) + 1;
      self.fr6Touch(f);
      self.fr6Log('【' + f.name + '】陣法精進至 Lv.' + f.formationLv, 'gain');
    });
  };

  /* ══════════════════════════════════════════════════════
     稽核（偵測外部系統）
     ══════════════════════════════════════════════════════ */
  proto.fr6Audit = function () {
    var g = G();
    var self = this;
    function path(p) {
      try {
        var parts = p.split('.'), o = window;
        for (var i = 0; i < parts.length; i++) {
          if (o === undefined || o === null) return undefined;
          o = o[parts[i]];
        }
        return o;
      } catch (e) { return undefined; }
    }
    return (F.LINK_SYSTEMS || []).map(function (s) {
      var found = [];
      (s.ext || []).forEach(function (p) {
        var v = path(p);
        if (v !== undefined && v !== null) {
          if (Array.isArray(v)) { if (v.length) found.push(p + ' (' + v.length + ')'); }
          else if (typeof v === 'object') found.push(p);
          else found.push(p);
        }
      });
      var cfgOn = num(C6[s.cfg], 0) > 0;
      return {
        id: s.id, name: s.name, icon: s.icon, desc: s.desc,
        enabled: cfgOn,
        detected: found.length > 0,
        sources: found,
        missing: (s.ext || []).filter(function (p) { return found.indexOf(p) === -1; })
      };
    }).map(function (x) {
      x.status = !x.enabled ? 'off' : (x.detected ? 'linked' : 'fallback');
      return x;
    });
  };

  /* ══════════════════════════════════════════════════════
     報告
     ══════════════════════════════════════════════════════ */
  proto.fr6Report = function () {
    var self = this;
    var L = this.fr6State();
    var g = G();
    var now = num(this.friendState().ticks, 0);
    function safe(fn, d) { try { return fn(); } catch (e) { return d; } }

    var formations = this.fr6Formations().map(function (fm) {
      return { id: fm.id, name: fm.name, icon: fm.icon || '☯️', reqLv: num(fm.reqLv, 1), bonus: normBonus(fm), desc: fm.desc || '' };
    });
    var elements = this.fr6Elements().map(function (el) {
      return { id: el.id, name: el.name, icon: el.icon || '🌀', beats: el.beats || el.counters || '' };
    });
    var spiritRoots = this.fr6SpiritRoots().map(function (sr) {
      return { id: sr.id, name: sr.name, icon: sr.icon || '💎', weight: num(sr.weight, 10), desc: sr.desc || '' };
    });
    var affixDefs = this.fr6AffixDefs().map(function (a) {
      return { id: a.id, name: a.name, icon: a.icon || '🧬', kind: a.kind || '', mul: num(a.mul, 0.14), desc: a.desc || '' };
    });
    var pets = this.fr6Pets().map(function (p) { return { id: p.id, name: p.name, icon: p.icon || '🐾' }; });

    var list = this.friendAll().map(function (f) {
      self.fr6Init(f);
      var b = self.fr6BonusOf(f);
      return {
        id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1),
        formation: f.formation, formationLv: num(f.formationLv, 0),
        element: f.element, spiritRoot: f.spiritRoot, spiritLv: num(f.spiritLv, 0),
        pet: f.pet, companionRole: f.companionRole,
        masteryCount: Object.keys(f.mastery || {}).length,
        affixResist: num(f.affixResist, 0),
        guildGuest: L.guildGuests.indexOf(f.id) !== -1,
        atb: self.fr6AtbOf(f),
        bonus: { atkPct: b.atkPct, defPct: b.defPct, hpPct: b.hpPct, expMul: b.expMul, atbMul: b.atbMul },
        sources: b.sources
      };
    });

    return {
      audit: this.fr6Audit(),
      list: list,
      formations: formations, elements: elements, spiritRoots: spiritRoots,
      affixDefs: affixDefs, pets: pets,
      companionRoles: this.fr6CompanionRoles(),
      guild: {
        guests: L.guildGuests.map(function (id) {
          var f = self.friendById(id);
          return f ? { id: id, name: f.name, icon: f.icon, lv: num(f.lv, 1) } : null;
        }).filter(Boolean),
        max: num(C6.GUILD_GUEST_MAX, 8),
        bonus: this.fr6GuildBonus(),
        contrib: num(L.stats.guildContrib, 0)
      },
      market: L.market.map(function (m) {
        return { id: m.id, name: m.name, sellerId: m.sellerId, sellerName: m.sellerName, sellerIcon: m.sellerIcon,
          price: num(m.price, 0), power: num(m.power, 0), reqLv: num(m.reqLv, 1), left: num(m.left, 0),
          canAfford: self.frUniGold() >= num(m.price, 0) };
      }),
      marketNext: Math.max(0, num(L.nextMarket, 0) - now),
      sellables: safe(function () {
        return self.frUniItems().map(function (it, i) {
          return { idx: i, name: self.frUniItemLabel(it), power: self.frUniItemPower(it), reqLv: num(it.reqLv, 1) };
        }).slice(0, 12);
      }, []),
      crafts: L.crafts.map(function (c) {
        return { id: c.id, name: c.name, icon: c.icon, itemName: self.frUniItemLabel(c.item),
          left: num(c.left, 0), total: num(c.total, 1),
          pct: Math.round((1 - num(c.left, 0) / Math.max(1, num(c.total, 1))) * 100) };
      }),
      craftMax: num(C6.CRAFT_MAX, 2), craftMat: num(C6.CRAFT_COST_MAT, 6),
      salvages: L.salvages.map(function (s) {
        return { id: s.id, count: s.members.length, left: num(s.left, 0), total: num(s.total, 1),
          pct: Math.round((1 - num(s.left, 0) / Math.max(1, num(s.total, 1))) * 100),
          names: s.members.map(function (id) { var f = self.friendById(id); return f ? f.name : '?'; }) };
      }),
      salvageMin: num(C6.SALVAGE_MIN, 3), salvageMax: num(C6.SALVAGE_MAX, 6),
      tt: L.tt ? { left: num(L.tt.left, 0), total: num(L.tt.total, 1),
        pct: Math.round((1 - num(L.tt.left, 0) / Math.max(1, num(L.tt.total, 1))) * 100),
        names: L.tt.members.map(function (id) { var f = self.friendById(id); return f ? f.name : '?'; }) } : null,
      ttHistory: L.ttHistory.slice(0, 6),
      gamble: L.gamble.map(function (g2) {
        return { id: g2.id, name: g2.name, icon: g2.icon, amount: num(g2.amount, 0), odds: num(g2.odds, 1.5),
          settled: !!g2.settled, win: !!g2.win, payout: num(g2.payout, 0) };
      }),
      gambleMin: num(C6.GAMBLE_MIN, 500), gambleMax: num(C6.GAMBLE_MAX, 50000),
      roster: {
        entries: L.roster.slice(-10),
        chars: safe(function () {
          var root = self.charSys.rootState;
          return (Array.isArray(root.roster) ? root.roster : []).map(function (c) {
            return { id: c.id, name: c.name, icon: c.icon || '🧑', lv: num(c.lv, 1) };
          });
        }, []),
        cost: num(C6.ROSTER_COST, 5000)
      },
      offline: {
        enabled: enabled('OFFLINE_ENABLE'),
        system: !!g.offlineSys,
        syncs: num(L.stats.offlineSyncs, 0),
        cap: num(C6.OFFLINE_CAP_TICKS, 500)
      },
      level: { enabled: enabled('LEVELSYNC_ENABLE'), system: !!g.levelExpSys },
      stats: L.stats,
      log: L.log.slice(0, 40),
      config: C6
    };
  };

  /* ══════════════════════════════════════════════════════
     掛載：friendDerived 注入加成
     ══════════════════════════════════════════════════════ */
  var _friendDerived = proto.friendDerived;
  proto.friendDerived = function (f) {
    var base = _friendDerived.call(this, f);
    if (!f || !f.id) return base;
    try {
      this.fr6Init(f);
      var v = num(f.__fr6v, 0);
      var cache = f.__fr6cache;
      if (cache && cache.v === v) return cache.d;

      var b = this.fr6BonusOf(f);
      var d = base;
      if (d.atk) d.atk = Math.floor(d.atk * (1 + num(b.atkPct, 0)));
      if (d.def) d.def = Math.floor(d.def * (1 + num(b.defPct, 0)));
      if (d.maxHp) d.maxHp = Math.floor(d.maxHp * (1 + num(b.hpPct, 0)));
      if (b.critAdd) d.crit = num(d.crit, 0) + b.critAdd;
      if (b.evaAdd) d.eva = num(d.eva, 0) + b.evaAdd;
      if (d.atbSpeed !== undefined || b.atbMul) d.atbSpeed = Math.round(num(d.atbSpeed, num(C6.ATB_BASE, 100)) * (1 + num(b.atbMul, 0)));
      try {
        if (typeof this.charSys.getPowerScore === 'function') d.powerScore = this.charSys.getPowerScore(d);
      } catch (e) { /* 忽略 */ }
      f.__fr6cache = { v: v, d: d };
      return d;
    } catch (e) {
      return base;
    }
  };

  /* ══════════════════════════════════════════════════════
     掛載：friendExpMul（靈根成長）
     ══════════════════════════════════════════════════════ */
  var _friendExpMul = proto.friendExpMul;
  proto.friendExpMul = function (f) {
    var m = _friendExpMul.call(this, f);
    try {
      var b = this.fr6BonusOf(f);
      m *= (1 + num(b.expMul, 0));
    } catch (e) { /* 忽略 */ }
    return m;
  };

  /* ══════════════════════════════════════════════════════
     掛載：friendMake（初始化連動欄位 + 靈根/五行）
     ══════════════════════════════════════════════════════ */
  var _friendMake = proto.friendMake;
  proto.friendMake = function (npc, opts) {
    var f = _friendMake.call(this, npc, opts);
    if (!f) return f;
    try {
      this.fr6Init(f);
      // 靈根
      var sr = this.fr6RollSpiritRoot(f);
      if (sr) { f.spiritRoot = sr.id; f.spiritLv = 1; }
      // 五行（依 id 雜湊，保證穩定）
      var els = this.fr6Elements();
      if (els.length) {
        var h = hash(f.id);
        var el = els[h % els.length];
        f.element = el.id;
      }
    } catch (e) { /* 忽略 */ }
    return f;
  };

  /* ══════════════════════════════════════════════════════
     掛載：出團成功率／默契（陣法＋五行＋敵方陣法）
     ══════════════════════════════════════════════════════ */
  var _fr2ExpSynergy = proto.fr2ExpSynergy;
  if (typeof _fr2ExpSynergy === 'function') {
    proto.fr2ExpSynergy = function (run) {
      var s = _fr2ExpSynergy.call(this, run);
      try {
        var team = this.fr2ExpTeam(run);
        // 陣法（隊長）
        var lead = team.members[0];
        if (lead && lead.formation) {
          var fb = normBonus(this.fr6Def('fr6Formations', lead.formation) || {});
          var lvMul = 1 + Math.max(0, num(lead.formationLv, 1) - 1) * 0.12;
          s += (num(fb.atkPct, 0) + num(fb.defPct, 0)) * num(C6.FORMATION_TEAM_MUL, 0.55) * lvMul;
        }
        // 五行（敵方為副本代表元素）
        var dz = this.fr2Dungeon(run.dzId);
        if (dz && dz.element) {
          s *= this.fr6TeamElementMul(team.members, dz.element);
        }
      } catch (e) { /* 忽略 */ }
      return clamp(s, 0.6, 1.9);
    };
  }

  var _fr2ExpProb = proto.fr2ExpProb;
  if (typeof _fr2ExpProb === 'function') {
    proto.fr2ExpProb = function (run, isBoss) {
      var p = _fr2ExpProb.call(this, run, isBoss);
      try {
        // 敵方陣法
        var ef = run.__fr6ef;
        if (!ef && num(C6.ENEMY_FORMATION_ENABLE, 1)) {
          ef = this.fr6EnemyFormationRoll();
          run.__fr6ef = ef;
        }
        if (ef) p = p / this.fr6EnemyFormationMul(ef);
        // 詞綴（存在於 run 上）
        if (run.__fr6af && run.__fr6af.length) p = p / this.fr6AffixStatMul(run.__fr6af);
      } catch (e) { /* 忽略 */ }
      return clamp(p, 0.02, 0.97);
    };
  }

  /* 出團：注入詞綴與陣法（在派團時） */
  var _fr2ExpDispatch = proto.fr2ExpDispatch;
  if (typeof _fr2ExpDispatch === 'function') {
    proto.fr2ExpDispatch = function (dzId, ids, includePlayer) {
      var ok = _fr2ExpDispatch.call(this, dzId, ids, includePlayer);
      if (!ok) return ok;
      try {
        var L = this.fr2ExpState();
        var run = L.runs[L.runs.length - 1];
        if (run) {
          run.__fr6af = this.fr6RollAffixes(this.fr2Dungeon(run.dzId) ? this.fr2Dungeon(run.dzId).tier : 1);
          run.__fr6ef = this.fr6EnemyFormationRoll();
          if (run.__fr6af.length) {
            this.fr6State().stats.affixes += run.__fr6af.length;
            this.fr6Log('【' + this.fr2Dungeon(run.dzId).name + '】的怪物帶有詞綴：' +
              run.__fr6af.map(function (a) { return a.icon + a.name; }).join('、') +
              (run.__fr6ef ? '，並佈下【' + run.__fr6ef.name + '】' : ''), 'system');
          }
        }
      } catch (e) { /* 忽略 */ }
      return ok;
    };
  }

  /* 出團：詞綴掉寶加成（在結算層，包裝 friendRollLoot 不適合，改在 fr2ExpAdvance 後補） */
  var _fr2ExpAdvance = proto.fr2ExpAdvance;
  if (typeof _fr2ExpAdvance === 'function') {
    proto.fr2ExpAdvance = function (run, dz) {
      var before = num(run.gains && run.gains.drops, 0);
      var r = _fr2ExpAdvance.call(this, run, dz);
      try {
        var after = num(run.gains && run.gains.drops, 0);
        if (after > before && run.__fr6af && run.__fr6af.length) {
          var extra = Math.round((after - before) * (this.fr6AffixLootMul(run.__fr6af) - 1));
          for (var i = 0; i < extra; i++) {
            var eq = this.friendRollEquip(Math.max(1, this.fr2PlayerLv()));
            if (eq) { this.frUniStore(eq); run.gains.drops += 1; }
          }
        }
      } catch (e) { /* 忽略 */ }
      return r;
    };
  }

  /* ══════════════════════════════════════════════════════
     掛載：世界王默契（陣法＋五行）
     ══════════════════════════════════════════════════════ */
  var _fr3WbSynergy = proto.fr3WbSynergy;
  if (typeof _fr3WbSynergy === 'function') {
    proto.fr3WbSynergy = function (a) {
      var s = _fr3WbSynergy.call(this, a);
      try {
        var self = this;
        var lead = null;
        (a.members || []).forEach(function (id) { if (!lead) lead = self.friendById(id); });
        if (lead && lead.formation) {
          var fb = normBonus(this.fr6Def('fr6Formations', lead.formation) || {});
          s += (num(fb.atkPct, 0) + num(fb.defPct, 0)) * num(C6.FORMATION_TEAM_MUL, 0.55);
        }
        if (a.__fr6el) {
          var members = (a.members || []).map(function (id) { return self.friendById(id); }).filter(Boolean);
          s *= this.fr6TeamElementMul(members, a.__fr6el);
        }
      } catch (e) { /* 忽略 */ }
      return clamp(s, 0.6, 2.0);
    };
  }

  var _fr3WbRally = proto.fr3WbRally;
  if (typeof _fr3WbRally === 'function') {
    proto.fr3WbRally = function (friendIds, mercIds, includePlayer) {
      var ok = _fr3WbRally.call(this, friendIds, mercIds, includePlayer);
      if (!ok) return ok;
      try {
        var a = this.fr3WbActive();
        if (a) {
          var els = this.fr6Elements();
          if (els.length) a.__fr6el = els[hash(a.bossId || a.name) % els.length].id;
          a.__fr6af = this.fr6RollAffixes(num(a.tier, 1));
        }
      } catch (e) { /* 忽略 */ }
      return ok;
    };
  }

  /* ══════════════════════════════════════════════════════
     掛載：friendGainExp 用真實曲線
     ══════════════════════════════════════════════════════ */
  var _friendGainExp = proto.friendGainExp;
  proto.friendGainExp = function (f, exp) {
    if (f && enabled('LEVELSYNC_ENABLE')) {
      try {
        var v = this.fr6MaxExpFor(num(f.lv, 1));
        if (v && num(f.maxExp, 0) !== v) f.maxExp = v;
      } catch (e) { /* 忽略 */ }
    }
    return _friendGainExp.call(this, f, exp);
  };

  /* ══════════════════════════════════════════════════════
     掛載：tick 鏈
     ══════════════════════════════════════════════════════ */
  var _fr2TickOnce = proto.fr2TickOnce;
  if (typeof _fr2TickOnce === 'function') {
    proto.fr2TickOnce = function () {
      var r = _fr2TickOnce.apply(this, arguments);
      try { this.fr6Tick(); } catch (e) { console.error('[friendLink] fr6Tick 失敗：', e); }
      return r;
    };
  } else {
    var _friendTick = proto.friendTick;
    proto.friendTick = function () {
      var before = 0;
      try { before = num(this.friendState().ticks, 0); } catch (e) { /* 忽略 */ }
      var r = _friendTick.apply(this, arguments);
      var after = before;
      try { after = num(this.friendState().ticks, 0); } catch (e) { /* 忽略 */ }
      if (after > before) { try { this.fr6Tick(); } catch (e) { console.error('[friendLink] fr6Tick 失敗：', e); } }
      return r;
    };
  }

  /* ══════════════════════════════════════════════════════
     整合進 friendReport
     ══════════════════════════════════════════════════════ */
  var _friendReport = proto.friendReport;
  proto.friendReport = function () {
    var r = _friendReport.call(this);
    try { r.v6 = this.fr6Report(); } catch (e) { r.v6 = null; console.error('[friendLink] 報告失敗：', e); }
    return r;
  };

  /* ══════════════════════════════════════════════════════
     啟動 + 遷移
     ══════════════════════════════════════════════════════ */
  proto.fr6Migrate = function () {
    var self = this, n = 0;
    this.friendAll().forEach(function (f) {
      self.fr6Init(f);
      if (!f.spiritRoot) {
        var sr = self.fr6RollSpiritRoot(f);
        if (sr) { f.spiritRoot = sr.id; f.spiritLv = 1; n += 1; }
      }
      if (!f.element) {
        var els = self.fr6Elements();
        if (els.length) { f.element = els[hash(f.id) % els.length].id; n += 1; }
      }
      self.fr6Touch(f);
    });
    return n;
  };

  proto.fr6BootOnce = function () {
    if (this._fr6Booted) return;
    this._fr6Booted = true;
    try { this.fr6Migrate(); } catch (e) { console.error('[friendLink] 遷移失敗：', e); }
    try { this.fr6State(); } catch (e) { /* 忽略 */ }
    console.log('[friendLink] ✓ 跨系統連動已啟動（' + (F.LINK_SYSTEMS || []).length + ' 項）');
  };

  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.fr6BootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  window.HY.FriendLink = { version: '1.0', systems: (F.LINK_SYSTEMS || []).length };
  console.log('[friendLink] ✓ 已載入（陣法／靈根／五行／寵物／同伴／詞綴／公會／門派／黑市／工藝／打撈／精通／ATB／敵陣／時光／賭局／名冊／離線／等級）');
})();