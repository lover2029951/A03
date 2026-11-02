// js/friendSystem.js (v1)
// ⭐ 江湖好友系統（核心）：虛擬人物好友 + 全自動行為 + 組隊同行
//
// 手法完全比照 townCelebSystem.js / townGuildSystem.js：
//   ① 全部掛在 HY.TownSystem.prototype 上（新增方法 + 包裝既有方法）
//   ② 狀態收在 rootState.town.friends，不動其他系統
//   ③ 好友物件直接沿用 characterSystem.createSingleCharTemplate 的欄位規格
//      → 可用 charSys.getDerivedStatsForChar()，也可直接被戰鬥系統使用
//
// ⚠️ 載入順序：townCelebAdvance.js 之後（需要 guild / celeb 的輔助函式）、uiFriend.js 之前。
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendSystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendSystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var CONFIG = F.CONFIG || {};
  var PERSONAS = F.PERSONAS || [];
  var ACTIONS = F.ACTIONS || [];
  var FAVOR_TIERS = F.FAVOR_TIERS || [{ lv: 1, min: 0, name: '點頭之交', icon: '🙂' }];

  /* ══════════════════════════════════════════════════════
     工具
     ══════════════════════════════════════════════════════ */
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function uid(p) { return (p || 'fri') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function maxExpFor(lv) { return Math.floor(100 * Math.pow(lv, 1.85) + lv * 120); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function slots10() {
    return ['mainhand', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring_left', 'ring_right'];
  }
  function meridianMap() {
    var m = {};
    var MD = (window.HY.Data && window.HY.Data.MERIDIANS) || [];
    MD.forEach(function (x) { if (x && x.id) m[x.id] = 0; });
    return m;
  }
  function roles() {
    if (T.GUILD && T.GUILD.ROLES) return T.GUILD.ROLES;
    return F.ROLES_FALLBACK || {};
  }
  function roleOrder() {
    if (T.GUILD && T.GUILD.ROLE_ORDER) return T.GUILD.ROLE_ORDER;
    return Object.keys(roles());
  }

  /* ══════════════════════════════════════════════════════
     名額
     ══════════════════════════════════════════════════════ */
  proto.friendSlots = function () {
    var lv = 1;
    try { lv = this.getLevelInfo().lv; } catch (e) { /* 尚未開鎮 */ }
    return num(CONFIG.MAX_FRIENDS, 12) + Math.max(0, lv - 1) * num(CONFIG.MAX_FRIENDS_PER_LV, 2);
  };

  /* ══════════════════════════════════════════════════════
     狀態（rootState.town.friends）
     ══════════════════════════════════════════════════════ */
  proto.friendDefaultState = function () {
    return {
      list: [],
      log: [],
      ticks: 0,
      lastTick: 0,
      auto: {
        grind: true, level: true, point: true, sect: true, skill: true,
        xinfa: true, qinggong: true, meridian: true, equip: true, loot: true, rest: true
      },
      stats: {
        recruited: 0, levelUps: 0, kills: 0, drops: 0, equips: 0, skills: 0,
        sectJoins: 0, points: 0, gold: 0, sp: 0, injured: 0,
        gifts: 0, spars: 0, talks: 0
      }
    };
  };

  proto.friendState = function () {
    var t = this.ensureState();
    if (!t.friends || typeof t.friends !== 'object') t.friends = this.friendDefaultState();
    var S = t.friends, d = this.friendDefaultState(), k;
    for (k in d) { if (Object.prototype.hasOwnProperty.call(d, k) && S[k] === undefined) S[k] = d[k]; }
    if (!Array.isArray(S.list)) S.list = [];
    if (!Array.isArray(S.log)) S.log = [];
    if (!S.auto || typeof S.auto !== 'object') S.auto = d.auto;
    for (k in d.auto) { if (S.auto[k] === undefined) S.auto[k] = d.auto[k]; }
    if (!S.stats || typeof S.stats !== 'object') S.stats = d.stats;
    for (k in d.stats) { if (S.stats[k] === undefined) S.stats[k] = 0; }
    return S;
  };

  proto.friendLog = function (msg, type) {
    var S = this.friendState();
    S.log.unshift({ t: Date.now(), msg: msg, type: type || 'friend' });
    if (S.log.length > 160) S.log.pop();
    if (!this._friendQuiet) this.log('[好友] ' + msg, type || 'time');
  };

  /* ══════════════════════════════════════════════════════
     建立好友（規格完全比照 characterSystem 的角色模板）
     ══════════════════════════════════════════════════════ */
  proto.friendMake = function (npc, opts) {
    opts = opts || {};
    var R = roles(), order = roleOrder();
    var roleId = opts.role || (order.length ? pick(order) : 'swordsman');
    var role = R[roleId] || { name: '遊俠', icon: '🧭', base: { con: 11, str: 11, agi: 11, int: 11 }, alloc: { con: 1, str: 1, agi: 1, int: 1 } };
    var lv = Math.max(1, Math.round(num(opts.lv, num(npc && npc.lv, rndInt(1, 5)))));
    var persona = PERSONAS.length ? pick(PERSONAS) : { id: 'grinder', name: '武癡', icon: '⚔️', alloc: { con: 1, str: 2, agi: 2, int: 0 } };
    var alloc = (persona && persona.alloc) || role.alloc || { con: 1, str: 1, agi: 1, int: 1 };

    // 依「每級 5 點潛能」自動配點（比照公會 guildCreateAdventurer）
    var total = (alloc.con + alloc.str + alloc.agi + alloc.int) || 5;
    var pool = (lv - 1) * 5;
    var acc = { con: 0, str: 0, agi: 0, int: 0 }, used = 0, maxK = 'con';
    ['con', 'str', 'agi', 'int'].forEach(function (k) {
      var v = Math.floor(pool * (alloc[k] / total));
      acc[k] = v; used += v;
      if (alloc[k] > alloc[maxK]) maxK = k;
    });
    acc[maxK] += (pool - used);
    var base = role.base || { con: 10, str: 10, agi: 10, int: 10 };

    var f = {
      // ── 角色規格（戰鬥／getDerivedStatsForChar 可直接吃）──
      id: uid('fri'),
      npcId: (npc && npc.id) || null,
      name: (npc && npc.name) || pick(F.NAMES || ['江湖客']),
      icon: (npc && npc.icon) || pick(F.ICONS || ['🧑']),
      lv: lv, exp: 0, maxExp: maxExpFor(lv), freePoints: 0,
      sp: Math.round(lv * 8),                 // 好友自己的武學點數（自學技能用）
      role: roleId, persona: persona.id,
      stats: { con: base.con + acc.con, str: base.str + acc.str, agi: base.agi + acc.agi, int: base.int + acc.int },
      currentHp: 1, currentMp: 1,
      sect: null, skills: { basic_punch: 1 },
      xinfa: {}, activeXinfa: null,
      qinggong: {}, activeQinggong: null,
      meridians: meridianMap(),
      equipment: {}, bag: [],
      guildBlessings: {}, activeBlessing: null, destinySkills: {}, activeBuffs: {},
      spiritRoot: null, spiritRootLv: 1, sectFeature: {}, _battle: {},
      // ── 好友專屬 ──
      favor: 0, following: false,
      status: 'idle', action: null, actionLeft: 0, actionTotal: 0,
      actionText: '剛踏入江湖，還在張望。', place: '', injuredLeft: 0,
      kills: 0, levelUps: 0, drops: 0, equips: 0, skillsLearned: 0, sectJoins: 0, pointsSpent: 0,
      goldEarned: 0, spEarned: 0,
      joined: Date.now(), lastAct: 0,
      x: Math.floor(Math.random() * 12), y: Math.floor(Math.random() * 9)
    };
    var self = this;
    slots10().forEach(function (s) { f.equipment[s] = null; });
    var d = this.friendDerived(f);
    f.currentHp = d.maxHp; f.currentMp = d.maxMp;
    return f;
  };

  /* ══════════════════════════════════════════════════════
     衍生屬性 / 戰力（沿用玩家同一套公式）
     ══════════════════════════════════════════════════════ */
  proto.friendDerived = function (f) {
    var cs = this.charSys;
    if (cs && typeof cs.getDerivedStatsForChar === 'function') {
      try { return cs.getDerivedStatsForChar(f); } catch (e) { /* 落入後備 */ }
    }
    var s = f.stats || { con: 10, str: 10, agi: 10, int: 10 }, lv = f.lv || 1;
    return {
      maxHp: 100 + s.con * 15 + (lv - 1) * 35, maxMp: 50 + s.int * 8 + (lv - 1) * 15,
      atk: Math.floor(s.str * 2.5 + s.int * 1.0 + lv * 4),
      def: Math.floor(s.con * 1.5 + s.agi * 0.6 + lv * 2),
      hit: 90, eva: 5, crit: 5, critRes: 0, critDmg: 165, dmgReduce: 0, atkSpd: 100, powerScore: 100
    };
  };
  proto.friendPower = function (f) { return num(this.friendDerived(f).powerScore, 0); };
  proto.friendClamp = function (f) {
    var d = this.friendDerived(f);
    f.currentHp = clamp(num(f.currentHp, d.maxHp), 0, d.maxHp);
    f.currentMp = clamp(num(f.currentMp, d.maxMp), 0, d.maxMp);
    return d;
  };

  proto.friendAll = function () { return this.friendState().list; };
  proto.friendById = function (id) {
    var l = this.friendAll();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  };
  proto.friendByNpc = function (npcId) {
    var l = this.friendAll();
    for (var i = 0; i < l.length; i++) if (l[i].npcId === npcId) return l[i];
    return null;
  };
  proto.friendFollowers = function () {
    return this.friendAll().filter(function (f) { return !!f.following; });
  };

  /* ══════════════════════════════════════════════════════
     裝備工具（優先沿用公會系統，保證與玩家同一把尺）
     ══════════════════════════════════════════════════════ */
  proto.friendItemSlot = function (item) {
    if (typeof this.guildItemSlot === 'function') return this.guildItemSlot(item);
    if (!item) return null;
    var s = item.slotType || item.slot;
    if (!s) return null;
    if (s === 'ring') return 'ring';
    return slots10().indexOf(s) !== -1 ? s : null;
  };

  proto.friendItemPower = function (item) {
    if (typeof this.guildItemPower === 'function') return this.guildItemPower(item);
    if (!item || typeof item !== 'object') return 0;
    var b = null;
    var poe = window.HY.game && window.HY.game.poeSys;
    if (poe && typeof poe.getItemTotalBonus === 'function') { try { b = poe.getItemTotalBonus(item); } catch (e) { /* 忽略 */ } }
    var p = (b && this.charSys && this.charSys.getPowerScore) ? this.charSys.getPowerScore(b) : num(item.price, 50) * 2;
    var flv = num(item._forgeLv, 0);
    if (flv > 0) p *= Math.pow(1.08, flv);
    return Math.round(p);
  };

  proto.friendItemLabel = function (item) {
    if (typeof this.guildItemLabel === 'function') return this.guildItemLabel(item);
    if (!item) return '（空）';
    var flv = num(item._forgeLv, 0);
    return (item.rareTitle || '') + (item.name || '未知裝備') + (flv > 0 ? ' +' + flv : '');
  };

  /* ══════════════════════════════════════════════════════
     自動配裝（比照 guildAutoEquipOne，改用好友自己的背包）
     ══════════════════════════════════════════════════════ */
  proto.friendAutoEquipOne = function (f) {
    if (!this.friendAutoOn('equip')) return 0;
    var slots = slots10();
    var swaps = 0;
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var bestPow = this.friendItemPower(f.equipment[slot]);
      var bestIdx = -1;
      for (var j = 0; j < f.bag.length; j++) {
        var it = f.bag[j];
        var is = this.friendItemSlot(it);
        if (!is) continue;
        if (!(is === slot || (is === 'ring' && (slot === 'ring_left' || slot === 'ring_right')))) continue;
        if (num(it.reqLv, 1) > num(f.lv, 1)) continue;      // 等級不足不穿
        var p = this.friendItemPower(it);
        if (p > bestPow + 1) { bestPow = p; bestIdx = j; }
      }
      if (bestIdx >= 0) {
        var old = f.equipment[slot];
        f.equipment[slot] = f.bag[bestIdx];
        f.bag.splice(bestIdx, 1);
        if (old) f.bag.push(old);
        swaps += 1;
      }
    }
    if (swaps > 0) {
      f.equips = num(f.equips, 0) + swaps;
      this.friendState().stats.equips += swaps;
      this.friendClamp(f);
      this.friendLog('⚙️ 【' + f.name + '】自行換上 ' + swaps + ' 件裝備（戰力 ' + this.friendPower(f).toLocaleString() + '）', 'loot');
    }
    return swaps;
  };

  /* ══════════════════════════════════════════════════════
     自動行為：升級 / 點潛能 / 入門派 / 學技能 / 心法 / 身法 / 經脈
     ══════════════════════════════════════════════════════ */
  proto.friendAutoOn = function (key) { return !!this.friendState().auto[key]; };

  proto.friendToggleAuto = function (key) {
    var S = this.friendState();
    S.auto[key] = !S.auto[key];
    this.log('🤖 好友自動行為【' + key + '】：' + (S.auto[key] ? '開啟' : '關閉'), 'system');
    this.requestRender();
    return S.auto[key];
  };

  proto.friendToggleAutoAll = function (v) {
    var S = this.friendState();
    var on = (typeof v === 'boolean') ? v : !(S.auto.grind && S.auto.equip && S.auto.skill);
    Object.keys(S.auto).forEach(function (k) { S.auto[k] = on; });
    this.log('🤖 好友全自動行為：' + (on ? '全部開啟' : '全部關閉'), 'system');
    this.requestRender();
    return on;
  };

  proto.friendGainExp = function (f, exp) {
    if (!this.friendAutoOn('level')) return 0;
    var maxLv = num(this.charSys.MAX_LEVEL, 300);
    if (f.lv >= maxLv) { f.exp = 0; return 0; }
    f.exp = num(f.exp, 0) + Math.max(0, Math.round(exp));
    var ups = 0;
    while (f.exp >= f.maxExp && f.lv < maxLv) {
      f.exp -= f.maxExp;
      f.lv += 1;
      f.maxExp = maxExpFor(f.lv);
      f.freePoints = num(f.freePoints, 0) + 5;
      ups += 1;
      f.levelUps = num(f.levelUps, 0) + 1;
      this.friendState().stats.levelUps += 1;
    }
    if (ups > 0) {
      var d = this.friendDerived(f);
      f.currentHp = d.maxHp; f.currentMp = d.maxMp;
      this.friendLog('🎉 【' + f.name + '】自行修煉有成，突破至 Lv.' + f.lv + '（+' + (ups * 5) + ' 潛能）', 'system');
      if (this.friendAutoOn('point')) this.friendAutoAlloc(f);
      if (this.friendAutoOn('sect')) this.friendAutoSect(f);
      if (this.friendAutoOn('skill')) this.friendAutoLearn(f);
    }
    return ups;
  };

  proto.friendAutoAlloc = function (f) {
    if (!this.friendAutoOn('point')) return 0;
    var pts = num(f.freePoints, 0);
    if (pts <= 0) return 0;
    var R = roles(), role = R[f.role] || null;
    var persona = this.friendPersona(f);
    var alloc = (persona && persona.alloc) || (role && role.alloc) || { con: 1, str: 1, agi: 1, int: 1 };
    var total = (alloc.con + alloc.str + alloc.agi + alloc.int) || 4;
    var maxK = 'con', used = 0;
    ['con', 'str', 'agi', 'int'].forEach(function (k) { if (alloc[k] > alloc[maxK]) maxK = k; });
    ['con', 'str', 'agi', 'int'].forEach(function (k) {
      var v = Math.floor(pts * (alloc[k] / total));
      if (v > 0) { f.stats[k] = num(f.stats[k], 10) + v; used += v; }
    });
    if (pts - used > 0) { f.stats[maxK] = num(f.stats[maxK], 10) + (pts - used); used = pts; }
    f.freePoints = 0;
    f.pointsSpent = num(f.pointsSpent, 0) + used;
    this.friendState().stats.points += used;
    this.friendClamp(f);
    return used;
  };

  proto.friendAutoSect = function (f) {
    if (!this.friendAutoOn('sect')) return false;
    if (f.sect) return false;
    var SECTS = (window.HY.Data && window.HY.Data.SECTS) || {};
    var list = Object.keys(SECTS).map(function (k) { return SECTS[k]; }).filter(Boolean);
    if (!list.length) return false;
    var pool = list.filter(function (s) { return num(f.lv, 1) >= num(s.reqLv, 10); });
    if (!pool.length) return false;
    if (Math.random() > 0.35) return false;         // 每期只有機率找到師門
    var s = pick(pool);
    f.sect = s.id;
    if (s.signatureSkill) f.skills[s.signatureSkill] = Math.max(1, num(f.skills[s.signatureSkill], 1));
    f.sectJoins = num(f.sectJoins, 0) + 1;
    this.friendState().stats.sectJoins += 1;
    var art = ((window.HY.Data && window.HY.Data.MARTIAL_ARTS) || {})[s.signatureSkill];
    this.friendLog('⛩️ 【' + f.name + '】自行拜入【' + s.name + '】' + (art ? '，習得入門絕學《' + art.name + '》' : ''), 'time');
    this.friendClamp(f);
    return true;
  };

  proto.friendAutoLearn = function (f) {
    if (!this.friendAutoOn('skill')) return 0;
    var arts = (window.HY.Data && window.HY.Data.MARTIAL_ARTS) || {};
    var self = this, learned = 0;
    Object.keys(arts).forEach(function (id) {
      var a = arts[id];
      if (!a || !id) return;
      if (f.skills[id]) return;
      if (a.sectReq && a.sectReq !== f.sect) return;         // 門派限制
      var reqLv = num(a.reqLv, 1);
      if (num(f.lv, 1) < reqLv) return;
      var cost = Math.max(4, Math.round(reqLv * num(CONFIG.SKILL_SP_COST, 12) / 10));
      if (num(f.sp, 0) < cost) return;
      f.sp -= cost;
      f.skills[id] = 1;
      learned += 1;
      if (learned <= 2) self.friendLog('📖 【' + f.name + '】自行習得《' + (a.name || id) + '》', 'time');
    });
    if (learned > 0) {
      f.skillsLearned = num(f.skillsLearned, 0) + learned;
      this.friendState().stats.skills += learned;
    }
    // 招式升等（讓戰力持續成長）
    if (Math.random() < num(CONFIG.SKILL_UP_CHANCE, 0.35)) {
      var ids = Object.keys(f.skills).filter(function (k) { return k !== 'basic_punch'; });
      if (ids.length) {
        var sid = pick(ids);
        var a2 = arts[sid];
        var maxSk = a2 ? num(a2.maxLv, 10) : 10;
        if (num(f.skills[sid], 1) < maxSk && num(f.sp, 0) >= 8) {
          f.sp -= 8;
          f.skills[sid] = num(f.skills[sid], 1) + 1;
        }
      }
    }
    return learned;
  };

  proto.friendAutoXinfa = function (f) {
    if (!this.friendAutoOn('xinfa')) return 0;
    var X = (window.HY.Data && window.HY.Data.XINFA) || {};
    var learned = 0;
    Object.keys(X).forEach(function (id) {
      var x = X[id];
      if (!x) return;
      if (x.sectReq && x.sectReq !== f.sect) return;
      var reqLv = num(x.reqLv, num(x.tier, 1) * 20);
      if (num(f.lv, 1) < reqLv) return;
      var cur = num(f.xinfa[id], 0);
      var maxLv = num(x.maxLv, 5);
      if (cur >= maxLv) return;
      var cost = Math.round(num(CONFIG.XINFA_SP_COST, 18) * (cur + 1));
      if (num(f.sp, 0) < cost) return;
      f.sp -= cost;
      f.xinfa[id] = cur + 1;
      learned += 1;
    });
    var bestId = null, best = -1;
    Object.keys(f.xinfa).forEach(function (id) {
      if (num(f.xinfa[id], 0) > best) { best = num(f.xinfa[id], 0); bestId = id; }
    });
    if (bestId) f.activeXinfa = bestId;
    if (learned) this.friendLog('🔥 【' + f.name + '】自行修習內功心法 ' + learned + ' 階。', 'time');
    return learned;
  };

  proto.friendAutoQinggong = function (f) {
    if (!this.friendAutoOn('qinggong')) return 0;
    var list = (window.HY.Data && window.HY.Data.QINGGONG) || [];
    var learned = 0;
    list.forEach(function (qg) {
      if (!qg || !qg.id) return;
      if (qg.sectReq && qg.sectReq !== f.sect) return;
      var reqLv = num(qg.reqLv, 30);
      if (num(f.lv, 1) < reqLv) return;
      var cur = num(f.qinggong[qg.id], 0);
      var maxLv = num(qg.maxLv, 3);
      if (cur >= maxLv) return;
      var cost = Math.round(num(CONFIG.QINGGONG_SP_COST, 16) * (cur + 1));
      if (num(f.sp, 0) < cost) return;
      f.sp -= cost;
      f.qinggong[qg.id] = cur + 1;
      learned += 1;
    });
    var bestId = null, best = -1;
    Object.keys(f.qinggong).forEach(function (id) {
      if (num(f.qinggong[id], 0) > best) { best = num(f.qinggong[id], 0); bestId = id; }
    });
    if (bestId) f.activeQinggong = bestId;
    if (learned) this.friendLog('🍃 【' + f.name + '】自行修習輕功身法。', 'time');
    return learned;
  };

  proto.friendAutoMeridian = function (f) {
    if (!this.friendAutoOn('meridian')) return 0;
    var MD = (window.HY.Data && window.HY.Data.MERIDIANS) || [];
    if (!MD.length) return 0;
    var capLv = clamp(Math.floor(num(f.lv, 1) / 45) + 1, 1, num(CONFIG.MERIDIAN_MAX_LV, 5));
    var opened = 0;
    MD.forEach(function (m) {
      if (!m || !m.id) return;
      var cur = num(f.meridians[m.id], 0);
      if (cur >= capLv) return;
      var cost = Math.round(num(CONFIG.MERIDIAN_SP_COST, 24) * (cur + 1));
      if (num(f.sp, 0) < cost) return;
      f.sp -= cost;
      f.meridians[m.id] = cur + 1;
      opened += 1;
    });
    if (opened) this.friendLog('🧘 【' + f.name + '】自行打通經脈 ' + opened + ' 處。', 'time');
    return opened;
  };

  /* ══════════════════════════════════════════════════════
     戰利品
     ══════════════════════════════════════════════════════ */
  proto.friendRollEquip = function (forLv) {
    if (typeof this.guildRandomEquip === 'function') {
      try { var r = this.guildRandomEquip(forLv); if (r) return r; } catch (e) { /* 忽略 */ }
    }
    return null;
  };

  proto.friendRollLoot = function (f) {
    // 55% 裝備 → 進好友背包 → 自動裝備；45% 丹藥 → 直接送回玩家行囊
    if (Math.random() < 0.55) {
      var eq = this.friendRollEquip(f.lv);
      if (eq) {
        f.bag.push(eq);
        f.drops = num(f.drops, 0) + 1;
        this.friendState().stats.drops += 1;
        this.friendLog('🎁 【' + f.name + '】打到了【' + this.friendItemLabel(eq) + '】', 'loot');
        if (this.friendAutoOn('equip')) this.friendAutoEquipOne(f);
        return 'equip';
      }
    }
    var cid = (typeof this.guildRandomConsumable === 'function') ? this.guildRandomConsumable() : null;
    if (cid) {
      try {
        if (this.invSys && typeof this.invSys.addItem === 'function') this.invSys.addItem(cid, 1);
        else {
          var root = this.charSys.rootState;
          root.inventory = root.inventory || {};
          root.inventory[cid] = (root.inventory[cid] || 0) + 1;
        }
        var nm = (((window.HY.Data || {}).ITEMS || {})[cid] || {}).name || cid;
        this.friendState().stats.drops += 1;
        this.friendLog('🎁 【' + f.name + '】帶回【' + nm + '】×1（已送入你的行囊）', 'loot');
        return 'consumable';
      } catch (e) { /* 忽略 */ }
    }
    return null;
  };

  /* ══════════════════════════════════════════════════════
     性格 / 行動
     ══════════════════════════════════════════════════════ */
  proto.friendPersona = function (f) {
    for (var i = 0; i < PERSONAS.length; i++) if (PERSONAS[i].id === f.persona) return PERSONAS[i];
    return PERSONAS[0] || { id: 'grinder', name: '武癡', icon: '⚔️', weights: {} };
  };

  proto.friendActionDef = function (id) {
    for (var i = 0; i < ACTIONS.length; i++) if (ACTIONS[i].id === id) return ACTIONS[i];
    return null;
  };

  proto.friendFavorTier = function (v) {
    var out = FAVOR_TIERS[0] || { lv: 1, min: 0, name: '點頭之交', icon: '🙂', color: '#94a3b8' };
    for (var i = 0; i < FAVOR_TIERS.length; i++) if (num(v, 0) >= FAVOR_TIERS[i].min) out = FAVOR_TIERS[i];
    return out;
  };

  proto.friendPlaces = function () {
    var M = (window.HY.Data && window.HY.Data.MAPS) || null;
    var out = [];
    if (M) {
      if (Array.isArray(M)) M.forEach(function (m) { if (m && m.name) out.push(m.name); });
      else Object.keys(M).forEach(function (k) { var m = M[k]; if (m && m.name) out.push(m.name); });
    }
    if (!out.length) out = ['揚州城郊外', '荒山野嶺', '古墓祕境', '斷崖絕谷', '塞外草原', '江南水鄉'];
    return out;
  };

  proto.friendExpMul = function (f) {
    var mul = 1;
    try { mul += (this.getLevelInfo().lv - 1) * 0.05; } catch (e) { /* 未開鎮 */ }
    mul += (this.friendFavorTier(f.favor).lv - 1) * 0.03;
    return mul;
  };

  proto.friendChooseAction = function (f) {
    var p = this.friendPersona(f);
    var w = p.weights || {};
    var self = this;
    var pool = [];
    ACTIONS.forEach(function (a) {
      var weight = num(w[a.id], 1);
      if (a.id === 'rest') {
        var d = self.friendDerived(f);
        if (num(f.currentHp, 0) >= d.maxHp * 0.5) weight = Math.max(0, weight - 2);
      }
      for (var i = 0; i < weight; i++) pool.push(a);
    });
    if (!pool.length) pool = ACTIONS.slice();
    var a = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    if (!a) return null;
    f.status = a.id;
    f.actionTotal = rndInt(a.ticks[0], a.ticks[1]);
    f.actionLeft = f.actionTotal;
    f.place = (a.id === 'grind' || a.id === 'treasure') ? pick(this.friendPlaces()) : '';
    return a;
  };

  proto.friendActionText = function (f) {
    if (f.status === 'injured') return '負傷休養中（還需 ' + Math.max(0, num(f.injuredLeft, 0)) + ' 期）';
    if (f.following) return '與你同行中（隨你出戰）';
    var a = this.friendActionDef(f.status);
    if (!a) return '在江湖上閒晃。';
    var t = (a.label || a.name).replace('{place}', f.place || '江湖');
    return t + '（' + Math.max(0, num(f.actionLeft, 0)) + '/' + Math.max(1, num(f.actionTotal, 1)) + ' 期）';
  };

  /* ══════════════════════════════════════════════════════
     單一好友 1 期行為
     ══════════════════════════════════════════════════════ */
  proto.friendStep = function (f) {
    var S = this.friendState();

    // ① 負傷休養
    if (f.status === 'injured') {
      f.injuredLeft = num(f.injuredLeft, 0) - 1;
      if (f.injuredLeft <= 0) {
        f.status = 'idle'; f.actionLeft = 0;
        var d0 = this.friendDerived(f);
        f.currentHp = d0.maxHp; f.currentMp = d0.maxMp;
        this.friendLog('💊 【' + f.name + '】傷勢痊癒，重新踏上江湖。', 'time');
      }
      f.actionText = this.friendActionText(f);
      return;
    }

    // ② 同行中：不出外行動，只在玩家戰鬥中出力
    if (f.following) {
      f.status = 'idle'; f.actionLeft = 0;
      f.actionText = this.friendActionText(f);
      return;
    }

    // ③ 選行動
    if (!f.status || f.status === 'idle' || num(f.actionLeft, 0) <= 0) this.friendChooseAction(f);
    var id = f.status || 'grind';

    // ④ 執行行動收益
    var expGain = Math.round(num(f.maxExp, 100) * num(CONFIG.EXP_RATE[id], 0.03) * this.friendExpMul(f));
    if (expGain > 0) this.friendGainExp(f, expGain);

    var goldGain = Math.round((10 + num(f.lv, 1) * 4) * num(CONFIG.GOLD_RATE[id], 0.02) * 5);
    if (goldGain > 0) {
      this.charSys.rootState.gold += goldGain;
      f.goldEarned = num(f.goldEarned, 0) + goldGain;
      S.stats.gold += goldGain;
    }
    var spGain = Math.round(num(CONFIG.SP_RATE[id], 0.03) * 10 + num(f.lv, 1) * 0.2);
    if (spGain > 0) {
      f.sp = num(f.sp, 0) + spGain;
      f.spEarned = num(f.spEarned, 0) + spGain;
      S.stats.sp += spGain;
    }
    if (num(CONFIG.KILL_RATE[id], 0) > 0) {
      f.kills = num(f.kills, 0) + num(CONFIG.KILL_RATE[id], 0.5);
      S.stats.kills += 1;
    }
    if (this.friendAutoOn('loot') && Math.random() < num(CONFIG.DROP_RATE[id], 0)) this.friendRollLoot(f);

    // ⑤ 負傷判定
    if (Math.random() < num(CONFIG.HURT_RATE[id], 0)) {
      f.status = 'injured';
      f.injuredLeft = rndInt(num(CONFIG.HURT_TICKS[0], 3), num(CONFIG.HURT_TICKS[1], 8));
      f.actionLeft = 0;
      f.currentHp = Math.max(1, Math.floor(this.friendDerived(f).maxHp * 0.3));
      S.stats.injured += 1;
      this.friendLog('🤕 【' + f.name + '】在' + (f.place || '江湖') + '遇上強敵負傷，需休養 ' + f.injuredLeft + ' 期。', 'system');
      f.actionText = this.friendActionText(f);
      return;
    }

    // ⑥ 自動行為（點潛能 / 入門派 / 學技能 / 心法 / 身法 / 經脈 / 配裝）
    this.friendAutoAlloc(f);
    this.friendAutoSect(f);
    this.friendAutoLearn(f);
    this.friendAutoXinfa(f);
    this.friendAutoQinggong(f);
    this.friendAutoMeridian(f);
    this.friendAutoEquipOne(f);

    // ⑦ 氣血內力回復 + 鎮上走動
    var dd = this.friendDerived(f);
    f.currentHp = dd.maxHp; f.currentMp = dd.maxMp;
    f.x = Math.floor(Math.random() * 12);
    f.y = Math.floor(Math.random() * 9);

    // ⑧ 推進
    f.actionLeft = Math.max(0, num(f.actionLeft, 0) - 1);
    f.lastAct = Date.now();
    f.actionText = this.friendActionText(f);
  };

  /* ══════════════════════════════════════════════════════
     每期結算（獨立計時器驅動，小鎮畫面關著也會跑）
     ══════════════════════════════════════════════════════ */
  proto.friendTick = function (force) {
    var S = this.friendState();
    var now = Date.now();
    var step = Math.max(1000, num(CONFIG.TICK_MS, 3000));
    if (!force && S.lastTick && (now - S.lastTick) < step * 0.8) return { steps: 0 };
    S.ticks = num(S.ticks, 0) + 1;
    S.lastTick = now;
    if (!S.list.length) return { steps: 0 };

    var self = this;
    S.list.forEach(function (f) {
      try { self.friendStep(f); }
      catch (e) { console.error('[friendSystem] 好友行為錯誤：', e); }
    });
    return { steps: S.list.length };
  };

  /** 離線補算（最多 OFFLINE_MAX_STEPS 期） */
  proto.friendOffline = function () {
    var S = this.friendState();
    if (!S.lastTick) { S.lastTick = Date.now(); return 0; }
    var step = Math.max(1000, num(CONFIG.TICK_MS, 3000));
    var n = Math.floor((Date.now() - S.lastTick) / step);
    if (n <= 1) return 0;
    n = Math.min(n, num(CONFIG.OFFLINE_MAX_STEPS, 300));
    this._friendQuiet = true;
    for (var i = 0; i < n; i++) this.friendTick(true);
    this._friendQuiet = false;
    if (S.list.length) this.friendLog('🌙 你不在的期間，好友們各自行動了 ' + n + ' 期。', 'time');
    return n;
  };

  /* ══════════════════════════════════════════════════════
     結交 / 招募
     ══════════════════════════════════════════════════════ */
  proto.friendRecruitable = function () {
    var t = this.ensureState(), self = this;
    var out = [];
    (t.residents || []).forEach(function (p) {
      if (!self.friendByNpc(p.id)) out.push({ id: p.id, name: p.name, lv: p.lv || 1, kind: 'resident', icon: '🧍' });
    });
    // 鎮民不足時，從「江湖名人」名冊抽樣，讓好友系統不依賴小鎮也能玩
    if (out.length < 3) {
      var all = (typeof this.celebAll === 'function') ? this.celebAll() : [];
      var used = {};
      this.friendAll().forEach(function (f) { used[f.name] = 1; });
      out.forEach(function (c) { used[c.name] = 1; });
      for (var i = 0; i < 8 && all.length; i++) {
        var c = all[Math.floor(Math.random() * all.length)];
        if (!c || used[c.name]) continue;
        used[c.name] = 1;
        out.push({ id: 'npc_' + c.id, name: c.name, lv: rndInt(3, 30), kind: 'wanderer', icon: c.icon || '🧭' });
      }
      // 名人系統未載入 → 用內建姓名池
      if (!all.length) {
        for (var j = 0; j < 6; j++) {
          var nm = pick(F.NAMES || ['江湖客']);
          if (used[nm]) continue;
          used[nm] = 1;
          out.push({ id: 'npc_' + nm, name: nm, lv: rndInt(3, 30), kind: 'wanderer', icon: pick(F.ICONS || ['🧑']) });
        }
      }
    }
    return out.slice(0, 12);
  };

  proto.friendRecruitCost = function (cand) {
    return Math.max(200, Math.round(num(CONFIG.RECRUIT_COST_BASE, 1200) + num(cand && cand.lv, 1) * num(CONFIG.RECRUIT_COST_PER_LV, 80)));
  };

  proto.friendCanRecruit = function (npcId) {
    var S = this.friendState();
    if (S.list.length >= this.friendSlots()) {
      return { ok: false, msg: '好友名額已滿（' + S.list.length + '/' + this.friendSlots() + '，提升小鎮等級可增加名額）' };
    }
    if (npcId && this.friendByNpc(npcId)) return { ok: false, msg: '已是你的好友' };
    return { ok: true };
  };

  proto.friendRecruit = function (cand) {
    var chk = this.friendCanRecruit(cand && cand.id);
    if (!chk.ok) { this.log('⚠️ 無法結交：' + chk.msg, 'system'); return false; }
    var cost = this.friendRecruitCost(cand);
    if (this.charSys.rootState.gold < cost) { this.log('⚠️ 結交需 ' + cost + ' 兩紋銀，目前不足。', 'system'); return false; }
    this.charSys.rootState.gold -= cost;
    var S = this.friendState();
    var f = this.friendMake(cand, {});
    S.list.push(f);
    S.stats.recruited += 1;
    this.friendLog('🤝 你與【' + f.name + '】結為好友（花費 ' + cost + ' 兩）。性格：' + this.friendPersona(f).icon + this.friendPersona(f).name, 'wealth');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     組隊同行（把好友接進 partySystem，讓好友真的上戰場）
     ══════════════════════════════════════════════════════ */
  proto.friendInstallPartyBridge = function () {
    var g = window.HY.game;
    var ps = g && g.partySys;
    if (!ps || ps.__friendBridged) return;
    ps.__friendBridged = true;
    var orig = ps.getPartyMembers;
    ps.getPartyMembers = function () {
      var base = [];
      try { base = orig.call(this) || []; } catch (e) { base = []; }
      var out = base.slice();
      try {
        var town = window.HY.game && window.HY.game.townSys;
        if (town && typeof town.friendFollowers === 'function') {
          town.friendFollowers().forEach(function (f) {
            if (!f || out.length >= 5) return;
            if (out.indexOf(f) !== -1) return;
            out.push(f);
          });
        }
      } catch (e) { /* 忽略 */ }
      return out.slice(0, 5);
    };
    console.log('[friendSystem] ✓ 好友已接入組隊系統（同行好友會直接參戰）');
  };

  proto.friendFollowMax = function () {
    var used = 0;
    try {
      var ps = window.HY.game && window.HY.game.partySys;
      if (ps) used = ps.getPartySize() - this.friendFollowers().length;
    } catch (e) { /* 忽略 */ }
    used = Math.max(0, used);
    return Math.max(0, Math.min(num(CONFIG.FOLLOW_MAX, 3), num(CONFIG.PARTY_MAX, 5) - used));
  };

  proto.friendCanFollow = function (id) {
    var f = this.friendById(id);
    if (!f) return { ok: false, msg: '找不到此好友' };
    if (f.following) return { ok: true, following: true };
    var n = this.friendFollowers().length, max = this.friendFollowMax();
    if (n >= max) return { ok: false, msg: '同行名額已滿（' + n + '/' + max + '）' };
    if (f.status === 'injured' || num(f.currentHp, 1) <= 0) return { ok: false, msg: '【' + f.name + '】負傷未癒' };
    return { ok: true };
  };

  proto.friendFollow = function (id) {
    var f = this.friendById(id);
    if (!f) return false;
    if (f.following) {
      f.following = false;
      f.actionText = this.friendActionText(f);
      this.friendLog('👋 【' + f.name + '】結束同行，回江湖去了。', 'time');
      this.requestRender();
      return true;
    }
    var chk = this.friendCanFollow(id);
    if (!chk.ok) { this.log('⚠️ 無法同行：' + chk.msg, 'system'); return false; }
    f.following = true;
    f.status = 'idle'; f.actionLeft = 0;
    f.actionText = this.friendActionText(f);
    this.friendLog('🚩 【' + f.name + '】（Lv.' + f.lv + '，戰力 ' + this.friendPower(f).toLocaleString() + '）加入你的隊伍，一同出戰！', 'gain');
    this.requestRender();
    return true;
  };

  proto.friendFollowAll = function () {
    var self = this, n = 0;
    this.friendAll().forEach(function (f) {
      if (n >= self.friendFollowMax()) return;
      if (!f.following && self.friendCanFollow(f.id).ok) { if (self.friendFollow(f.id)) n += 1; }
    });
    return n;
  };

  proto.friendUnfollowAll = function () {
    var n = 0;
    this.friendAll().forEach(function (f) { if (f.following) { f.following = false; n += 1; } });
    if (n) this.friendLog('👋 所有好友結束同行。', 'time');
    this.requestRender();
    return n;
  };

  /* ══════════════════════════════════════════════════════
     互動：送禮 / 切磋 / 論道 / 贈裝 / 取回 / 斷交
     ══════════════════════════════════════════════════════ */
  proto.friendGiftCost = function (id) {
    var f = this.friendById(id);
    return Math.max(100, Math.round(num(CONFIG.GIFT_COST_BASE, 300) + num(f && f.lv, 1) * num(CONFIG.GIFT_COST_PER_LV, 20)));
  };

  proto.friendCanGift = function (id) {
    var f = this.friendById(id);
    if (!f) return { ok: false, msg: '找不到此好友' };
    if (num(f.favor, 0) >= num(CONFIG.FAVOR_MAX, 100)) return { ok: false, msg: '好感已滿' };
    var cost = this.friendGiftCost(id);
    if (this.charSys.rootState.gold < cost) return { ok: false, msg: '銀兩不足（需 ' + cost + ' 兩）' };
    return { ok: true, cost: cost, f: f };
  };

  proto.friendGift = function (id) {
    var chk = this.friendCanGift(id);
    if (!chk.ok) { this.log('⚠️ 無法送禮：' + chk.msg, 'system'); return false; }
    this.charSys.rootState.gold -= chk.cost;
    var add = Math.round(num(CONFIG.GIFT_FAVOR, 8) * (1 + num(chk.f.lv, 1) * 0.01));
    chk.f.favor = Math.min(num(CONFIG.FAVOR_MAX, 100), num(chk.f.favor, 0) + add);
    this.friendState().stats.gifts += 1;
    this.friendLog('🎁 你送了【' + chk.f.name + '】一份厚禮（' + chk.cost + ' 兩），好感 +' + add +
      '（' + chk.f.favor + '/' + num(CONFIG.FAVOR_MAX, 100) + '）', 'wealth');
    this.requestRender();
    return true;
  };

  proto.friendSpar = function (id) {
    var f = this.friendById(id);
    if (!f) return false;
    if (f.status === 'injured') { this.log('⚠️ 【' + f.name + '】負傷未癒，無法切磋。', 'system'); return false; }
    var myPower = 0;
    try { myPower = num(this.charSys.getDerivedStatsForChar(this.charSys.state).powerScore, 0); } catch (e) { /* 忽略 */ }
    var fp = this.friendPower(f);
    f.favor = Math.min(num(CONFIG.FAVOR_MAX, 100), num(f.favor, 0) + num(CONFIG.SPAR_FAVOR, 6));
    var exp = Math.round(num(f.maxExp, 100) * 0.06);
    this.friendGainExp(f, exp);
    this.friendState().stats.spars += 1;
    this.friendLog('⚔️ 你與【' + f.name + '】切磋一場，' + (myPower >= fp ? '你略勝一籌' : '好友技高一籌') +
      '（你 ' + myPower.toLocaleString() + ' vs 好友 ' + fp.toLocaleString() + '）好感 +' + num(CONFIG.SPAR_FAVOR, 6) + '、好友經驗 +' + exp, 'time');
    this.requestRender();
    return true;
  };

  proto.friendTalk = function (id) {
    var f = this.friendById(id);
    if (!f) return false;
    var cost = num(CONFIG.TALK_SP_COST, 2);
    if (this.charSys.rootState.sp < cost) { this.log('⚠️ 論道需 ' + cost + ' 武點，目前不足。', 'system'); return false; }
    this.charSys.rootState.sp -= cost;
    var gain = Math.round(6 + num(f.lv, 1) * 1.5);
    f.sp = num(f.sp, 0) + gain;
    f.spEarned = num(f.spEarned, 0) + gain;
    f.favor = Math.min(num(CONFIG.FAVOR_MAX, 100), num(f.favor, 0) + num(CONFIG.TALK_FAVOR, 4));
    this.friendState().stats.talks += 1;
    this.friendLog('🍵 你與【' + f.name + '】論道一番（花費 ' + cost + ' 武點），好友武學點數 +' + gain +
      '、好感 +' + num(CONFIG.TALK_FAVOR, 4), 'time');
    this.requestRender();
    return true;
  };

  proto.friendPlayerEquipables = function () {
    var self = this, out = [];
    var root = this.charSys.rootState;
    (root.equipBag || []).forEach(function (it, i) {
      if (!it || typeof it !== 'object') return;
      if (!self.friendItemSlot(it)) return;
      out.push({ idx: i, name: self.friendItemLabel(it), reqLv: num(it.reqLv, 1), power: self.friendItemPower(it) });
    });
    return out;
  };

  proto.friendGiveEquip = function (id, bagIdx) {
    var f = this.friendById(id);
    if (!f) return false;
    var root = this.charSys.rootState;
    var bag = root.equipBag || [];
    var idx = (typeof bagIdx === 'number') ? bagIdx : parseInt(bagIdx, 10);
    var it = bag[idx];
    if (!it) return false;
    bag.splice(idx, 1);
    f.bag.push(it);
    this.friendLog('🎽 你將【' + this.friendItemLabel(it) + '】贈予【' + f.name + '】。', 'loot');
    this.friendAutoEquipOne(f);
    this.requestRender();
    return true;
  };

  proto.friendTakeLoot = function (id, idx) {
    var f = this.friendById(id);
    if (!f) return false;
    var it = f.bag[idx];
    if (!it) return false;
    var root = this.charSys.rootState;
    if (!Array.isArray(root.equipBag)) root.equipBag = [];
    var maxSize = 60;
    var es = window.HY.game && window.HY.game.equipSys;
    if (es && typeof es.getMaxBagSize === 'function') { try { maxSize = es.getMaxBagSize(); } catch (e) { /* 忽略 */ } }
    if (root.equipBag.length >= maxSize) { this.log('🎒 行囊已滿，無法取回。', 'system'); return false; }
    f.bag.splice(idx, 1);
    root.equipBag.push(it);
    this.requestRender();
    return true;
  };

  proto.friendDismiss = function (id) {
    var S = this.friendState();
    var f = this.friendById(id);
    if (!f) return false;
    var root = this.charSys.rootState;
    if (!Array.isArray(root.equipBag)) root.equipBag = [];
    var back = 0;
    slots10().forEach(function (s) { if (f.equipment[s]) { root.equipBag.push(f.equipment[s]); f.equipment[s] = null; back += 1; } });
    (f.bag || []).forEach(function (it) { if (it) { root.equipBag.push(it); back += 1; } });
    f.bag = [];
    S.list = S.list.filter(function (x) { return x.id !== id; });
    this.friendLog('💔 你與【' + f.name + '】斷了交情，' + back + ' 件裝備已回到你的行囊。', 'time');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     同行光環（掛到小鎮收益 + 玩家角色屬性）
     ══════════════════════════════════════════════════════ */
  proto.friendAura = function () {
    var S = this.friendState();
    var sig = S.list.map(function (f) { return (f.following ? '1' : '0') + num(f.favor, 0) + ':' + num(f.lv, 1); }).join(',');
    if (this._frAuraCache && this._frAuraSig === sig) return this._frAuraCache;

    var out = { count: 0, atkPct: 0, defPct: 0, hpPct: 0, incomeMul: 0, spMul: 0, order: 0, appeal: 0, list: [] };
    var self = this;
    S.list.forEach(function (f) {
      if (!f.following) return;
      var tier = self.friendFavorTier(f.favor);
      out.count += 1;
      out.atkPct += num(CONFIG.FOLLOW_AURA.atkPct, 0.03) * tier.lv;
      out.defPct += num(CONFIG.FOLLOW_AURA.defPct, 0.03) * tier.lv;
      out.hpPct += num(CONFIG.FOLLOW_AURA.hpPct, 0.04) * tier.lv;
      out.incomeMul += num(CONFIG.FOLLOW_INCOME, 0.01) * tier.lv;
      out.spMul += num(CONFIG.FOLLOW_SP, 0.008) * tier.lv;
      out.order += num(CONFIG.FOLLOW_ORDER, 1) * tier.lv;
      out.appeal += num(CONFIG.FOLLOW_APPEAL, 5) * tier.lv;
      out.list.push({ id: f.id, name: f.name, icon: f.icon, lv: f.lv, tier: tier });
    });
    var cap = num(CONFIG.AURA_CAP, 0.6);
    out.atkPct = Math.min(cap, out.atkPct);
    out.defPct = Math.min(cap, out.defPct);
    out.hpPct = Math.min(cap, out.hpPct);

    this._frAuraCache = out;
    this._frAuraSig = sig;
    return out;
  };

  /** 把同行光環加成到「玩家自己的角色」身上（只影響 roster 成員） */
  proto.friendInstallAura = function () {
    var CS = window.HY.CharacterSystem;
    if (!CS || !CS.prototype || CS.prototype.__friendAuraWrapped) return;
    CS.prototype.__friendAuraWrapped = true;
    var orig = CS.prototype.getDerivedStatsForChar;
    CS.prototype.getDerivedStatsForChar = function (c) {
      var d = orig.call(this, c);
      try {
        var town = window.HY.game && window.HY.game.townSys;
        if (!town || typeof town.friendAura !== 'function') return d;
        if (!c || !this.rootState || !Array.isArray(this.rootState.roster)) return d;
        if (this.rootState.roster.indexOf(c) === -1) return d;   // 只強化玩家角色
        var a = town.friendAura();
        if (!a || a.count <= 0) return d;
        if (d.atk) d.atk = Math.floor(d.atk * (1 + a.atkPct));
        if (d.def) d.def = Math.floor(d.def * (1 + a.defPct));
        if (d.maxHp) d.maxHp = Math.floor(d.maxHp * (1 + a.hpPct));
        if (typeof this.getPowerScore === 'function') d.powerScore = this.getPowerScore(d);
      } catch (e) { /* 忽略 */ }
      return d;
    };
    console.log('[friendSystem] ✓ 好友同行光環已掛載');
  };

  /* ══════════════════════════════════════════════════════
     統計 / 報告（供 UI 一次取用）
     ══════════════════════════════════════════════════════ */
  proto.friendStats = function () {
    var S = this.friendState(), self = this;
    var totalLv = 0, totalPower = 0;
    S.list.forEach(function (f) {
      totalLv += num(f.lv, 1);
      totalPower += self.friendPower(f);
    });
    return {
      total: S.list.length,
      slots: this.friendSlots(),
      followers: this.friendFollowers().length,
      followMax: this.friendFollowMax(),
      avgLv: S.list.length ? Math.round(totalLv / S.list.length) : 0,
      avgPower: S.list.length ? Math.round(totalPower / S.list.length) : 0,
      totalPower: totalPower,
      aura: this.friendAura(),
      auto: S.auto,
      stats: S.stats,
      ticks: num(S.ticks, 0)
    };
  };

  proto.friendReport = function () {
    var self = this, S = this.friendState();
    var SECTS = (window.HY.Data && window.HY.Data.SECTS) || {};
    var R = roles();

    var list = S.list.map(function (f) {
      var d = self.friendDerived(f);
      var role = R[f.role] || { name: f.role, icon: '🧭' };
      var tier = self.friendFavorTier(f.favor);
      var merOpen = Object.keys(f.meridians || {}).filter(function (k) { return num(f.meridians[k], 0) > 0; });
      return {
        id: f.id, name: f.name, icon: f.icon,
        lv: num(f.lv, 1), exp: num(f.exp, 0), maxExp: num(f.maxExp, 100),
        freePoints: num(f.freePoints, 0), sp: num(f.sp, 0),
        persona: self.friendPersona(f), role: role, roleId: f.role,
        tier: tier, favor: num(f.favor, 0), favorMax: num(CONFIG.FAVOR_MAX, 100),
        sect: f.sect, sectName: (f.sect && SECTS[f.sect]) ? SECTS[f.sect].name : '無門無派',
        following: !!f.following,
        status: f.status, actionText: self.friendActionText(f),
        actionLeft: num(f.actionLeft, 0), actionTotal: num(f.actionTotal, 0),
        injuredLeft: num(f.injuredLeft, 0),
        derived: d, power: num(d.powerScore, 0),
        equipment: f.equipment, bag: f.bag,
        skillCount: Object.keys(f.skills || {}).length,
        xinfaCount: Object.keys(f.xinfa || {}).length,
        qinggongCount: Object.keys(f.qinggong || {}).length,
        meridianCount: merOpen.length,
        attrs: f.stats,
        kills: Math.round(num(f.kills, 0)), levelUps: num(f.levelUps, 0),
        drops: num(f.drops, 0), equips: num(f.equips, 0),
        skillsLearned: num(f.skillsLearned, 0), sectJoins: num(f.sectJoins, 0),
        pointsSpent: num(f.pointsSpent, 0),
        goldEarned: num(f.goldEarned, 0), spEarned: num(f.spEarned, 0),
        canFollow: self.friendCanFollow(f.id),
        giftCost: self.friendGiftCost(f.id),
        canGift: self.friendCanGift(f.id)
      };
    });

    var cands = this.friendRecruitable().map(function (c) {
      return {
        id: c.id, name: c.name, lv: c.lv, kind: c.kind, icon: c.icon || '🧭',
        cost: self.friendRecruitCost(c), already: !!self.friendByNpc(c.id)
      };
    });

    return {
      list: list,
      stats: this.friendStats(),
      log: S.log.slice(0, 80),
      config: CONFIG,
      personas: PERSONAS,
      actions: ACTIONS,
      favorTiers: FAVOR_TIERS,
      autoKeys: F.AUTO_KEYS || [],
      candidates: cands,
      giveTargets: this.friendPlayerEquipables(),
      canRecruit: this.friendCanRecruit()
    };
  };

  /* ══════════════════════════════════════════════════════
     掛載：小鎮收益加成 + getStats
     ══════════════════════════════════════════════════════ */
  var _getGlobalMul = proto.getGlobalMul;
  proto.getGlobalMul = function () {
    var m = _getGlobalMul.call(this);
    return m * (1 + num(this.friendAura().incomeMul, 0));
  };

  var _getSpPerTick = proto.getSpPerTick;
  proto.getSpPerTick = function () {
    var sp = _getSpPerTick.call(this);
    return sp * (1 + num(this.friendAura().spMul, 0));
  };

  var _getTotalOrder = proto.getTotalOrder;
  proto.getTotalOrder = function () {
    var o = _getTotalOrder.call(this);
    return o + Math.floor(num(this.friendAura().order, 0));
  };

  var _getStats = proto.getStats;
  proto.getStats = function () {
    var s = _getStats.call(this);
    try { s.friends = this.friendStats(); } catch (e) { s.friends = null; }
    return s;
  };

  /* ══════════════════════════════════════════════════════
     啟動（獨立計時器；不依賴小鎮畫面開著）
     ══════════════════════════════════════════════════════ */
  proto.friendBootOnce = function () {
    if (this._friendBooted) return;
    this._friendBooted = true;
    try { this.friendInstallPartyBridge(); } catch (e) { console.error('[friendSystem] 組隊橋接失敗：', e); }
    try { this.friendInstallAura(); } catch (e) { console.error('[friendSystem] 光環掛載失敗：', e); }
    try { this.friendOffline(); } catch (e) { console.error('[friendSystem] 離線補算失敗：', e); }

    var self = this;
    var ms = Math.max(1000, num(CONFIG.TICK_MS, 3000));
    this._friendTimer = setInterval(function () {
      try { self.friendTick(); } catch (e) { console.error('[friendSystem] tick 失敗：', e); }
    }, ms);
    console.log('[friendSystem] ✓ 好友自動行為已啟動（每 ' + (ms / 1000) + ' 秒 1 期）');
  };

  // ensureState 被呼叫時自動啟動（並確保掛載在 tick 之前）
  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.friendBootOnce(); } catch (e) { console.error('[friendSystem] 啟動失敗：', e); }
    return t;
  };

  // 小鎮 tick 時也跑一期（內部有時間節流，不會變成兩倍速）
  var _tick = proto.tick;
  proto.tick = function () {
    var r = _tick.call(this);
    try { this.friendTick(); } catch (e) { /* 忽略 */ }
    return r;
  };

  // 保險：頁面載入後主動抓 game.townSys 啟動一次
  function boot() {
    var g = window.HY.game;
    if (!g || !g.townSys) { setTimeout(boot, 1500); return; }
    try { g.townSys.ensureState(); } catch (e) { console.error('[friendSystem] boot 失敗：', e); }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 1200);
  else window.addEventListener('load', function () { setTimeout(boot, 1200); });

  window.HY.FriendSystem = {
    version: '1.0',
    config: CONFIG,
    personas: PERSONAS.length,
    actions: ACTIONS.length,
    favorTiers: FAVOR_TIERS.length
  };
})();