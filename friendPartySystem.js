// js/friendPartySystem.js (v1)
// ⭐ 好友自行組隊出團（副本遠征）＋ 合擊技 ＋ v2 主 tick 驅動
// ⚠️ 載入順序：friendSystem.js 之後、friendEventSystem.js 之前
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendPartySystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendPartySystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var C2 = F.CONFIG2 || {};
  var DZ = F.DUNGEONS || [];
  var EV = F.EXP_EVENTS || {};

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid(p) { return (p || 'run') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function tmpl(s, m) { return String(s || '').replace(/\{(\w+)\}/g, function (_, k) { return (m && m[k] !== undefined) ? m[k] : ''; }); }

  /* ══════════ 狀態 ══════════ */
  proto.fr2ExpDefaultState = function () {
    return { runs: [], history: [], clears: 0, fails: 0, auto: true, nextAuto: 0, combos: {}, comboReady: 0 };
  };
  proto.fr2ExpState = function () {
    var S = this.friendState();
    if (!S.expeditions || typeof S.expeditions !== 'object') S.expeditions = this.fr2ExpDefaultState();
    var E = S.expeditions, d = this.fr2ExpDefaultState(), k;
    for (k in d) { if (E[k] === undefined) E[k] = d[k]; }
    if (!Array.isArray(E.runs)) E.runs = [];
    if (!Array.isArray(E.history)) E.history = [];
    if (!E.combos || typeof E.combos !== 'object') E.combos = {};
    return E;
  };

  /* ══════════ 基本查詢 ══════════ */
  proto.fr2Dungeon = function (id) {
    for (var i = 0; i < DZ.length; i++) if (DZ[i].id === id) return DZ[i];
    return null;
  };
  proto.fr2TownLv = function () {
    try { return num(this.getLevelInfo().lv, 1); } catch (e) { return 1; }
  };
  proto.fr2PlayerLv = function () {
    try { return num(this.charSys.state.lv, 1); } catch (e) { return 1; }
  };
  proto.fr2BestFriendLv = function () {
    var m = 0;
    this.friendAll().forEach(function (f) { m = Math.max(m, num(f.lv, 1)); });
    return m;
  };
  proto.fr2DungeonAvail = function () {
    var best = this.fr2BestFriendLv(), self = this;
    return DZ.map(function (d) {
      return { d: d, unlocked: best >= num(d.reqLv, 1), reqLv: d.reqLv };
    });
  };

  /** 角色定位：坦 / 補 / 輸出 / 敏 */
  proto.fr2RoleOf = function (f) {
    var s = (f && f.stats) || { con: 10, str: 10, agi: 10, int: 10 };
    var con = num(s.con, 10), str = num(s.str, 10), agi = num(s.agi, 10), int = num(s.int, 10);
    var top = Math.max(con, str, agi, int);
    if (top === con) return 'tank';
    if (top === int) return 'heal';
    if (top === str) return 'dps';
    return 'agi';
  };
  proto.fr2RoleName = function (r) {
    return ({ tank: '🛡️ 坦', heal: '🌿 補', dps: '⚔️ 輸出', agi: '🍃 敏' })[r] || '🧭 遊';
  };

  /* ══════════ 隊伍計算 ══════════ */
  proto.fr2ExpTeam = function (run) {
    var self = this;
    var members = (run.members || []).map(function (id) { return self.friendById(id); }).filter(Boolean);
    var lvSum = 0, pow = 0, roles = {};
    members.forEach(function (f) {
      lvSum += num(f.lv, 1);
      pow += self.friendPower(f);
      var r = self.fr2RoleOf(f);
      roles[r] = (roles[r] || 0) + 1;
    });
    var n = members.length;
    var avgLv = n ? Math.round(lvSum / n) : 0;
    if (run.includePlayer) {
      avgLv = Math.round((lvSum + this.fr2PlayerLv()) / (n + 1));
    }
    return { members: members, count: n + (run.includePlayer ? 1 : 0), avgLv: avgLv, totalPower: pow, roles: roles };
  };

  proto.fr2ExpSynergy = function (run) {
    var self = this;
    var team = this.fr2ExpTeam(run);
    var members = team.members;
    if (!members.length) return 0.7;
    var roles = team.roles;
    var kind = Object.keys(roles).length;
    var s = 1;
    s += kind >= 3 ? 0.14 : (kind === 2 ? 0.05 : -0.12);
    if (roles.tank) s += 0.06;
    if (roles.heal) s += 0.06;
    if (roles.agi) s += 0.03;

    var tierSum = 0;
    members.forEach(function (f) { tierSum += self.friendFavorTier(f.favor).lv; });
    s += Math.min(0.16, Math.max(0, (tierSum / members.length) - 1) * 0.035);

    s += Math.min(0.12, num(run.chem, 0) * 0.0015);

    if (typeof this.fr2BondCountIn === 'function') {
      s += Math.min(0.10, num(this.fr2BondCountIn(run.members), 0) * 0.035);
    }
    if (run.includePlayer) s += 0.06;
    return clamp(s, num(C2.EXP_SYNERGY_MIN, 0.7), num(C2.EXP_SYNERGY_MAX, 1.45));
  };

  proto.fr2ExpProb = function (run, isBoss) {
    var dz = this.fr2Dungeon(run.dzId);
    if (!dz) return 0;
    var team = this.fr2ExpTeam(run);
    var ratio = num(team.avgLv, 1) / Math.max(1, num(dz.reqLv, 1));
    var base = clamp((ratio - 0.55) / 0.75, 0.05, 0.94);
    var p = clamp(base * this.fr2ExpSynergy(run), 0.03, 0.97);
    if (isBoss) p = clamp(p * 0.82, 0.02, 0.95);
    return p;
  };

  /* ══════════ 編隊 / 派團 ══════════ */
  proto.fr2ExpRunOf = function (fid) {
    var E = this.fr2ExpState();
    for (var i = 0; i < E.runs.length; i++) {
      if (E.runs[i].status === 'running' && E.runs[i].members.indexOf(fid) !== -1) return E.runs[i];
    }
    return null;
  };

  proto.fr2ExpIdleFriends = function () {
    var self = this;
    return this.friendAll().filter(function (f) {
      if (f.following || f.retired) return false;
      if (f.status === 'injured' || num(f.currentHp, 1) <= 0) return false;
      if (num(f.questBusy, 0) > 0) return false;
      if (self.fr2ExpRunOf(f.id)) return false;
      return true;
    });
  };

  /** 自動編隊：坦 > 補 > 輸出，取戰力最高者，兼顧職業多樣 */
  proto.fr2ExpCompose = function (dzId) {
    var dz = this.fr2Dungeon(dzId);
    if (!dz) return [];
    var self = this;
    var pool = this.fr2ExpIdleFriends().filter(function (f) { return num(f.lv, 1) >= num(dz.reqLv, 1); });
    if (!pool.length) pool = this.fr2ExpIdleFriends();
    var byPower = pool.slice().sort(function (a, b) { return self.friendPower(b) - self.friendPower(a); });

    var out = [], used = {};
    ['tank', 'heal', 'dps', 'agi'].forEach(function (r) {
      if (out.length >= num(C2.EXP_TEAM_MAX, 5)) return;
      for (var i = 0; i < byPower.length; i++) {
        var f = byPower[i];
        if (used[f.id]) continue;
        if (self.fr2RoleOf(f) !== r) continue;
        used[f.id] = 1; out.push(f.id);
        break;
      }
    });
    for (var j = 0; j < byPower.length && out.length < num(C2.EXP_TEAM_MIN, 3); j++) {
      var f2 = byPower[j];
      if (used[f2.id]) continue;
      used[f2.id] = 1; out.push(f2.id);
    }
    return out;
  };

  proto.fr2ExpDispatch = function (dzId, ids, includePlayer) {
    var dz = this.fr2Dungeon(dzId);
    if (!dz) { this.log('⚠️ 找不到副本。', 'system'); return false; }
    var E = this.fr2ExpState();
    if (E.runs.length >= num(C2.EXP_MAX_ACTIVE, 2)) { this.log('⚠️ 同時最多只能有 ' + num(C2.EXP_MAX_ACTIVE, 2) + ' 支遠征隊。', 'system'); return false; }
    var members = (ids && ids.length) ? ids.slice() : this.fr2ExpCompose(dzId);
    if (members.length < num(C2.EXP_TEAM_MIN, 3)) { this.log('⚠️ 人手不足（至少需 ' + num(C2.EXP_TEAM_MIN, 3) + ' 位空閒好友）。', 'system'); return false; }
    var self = this;
    var ok = members.every(function (id) {
      var f = self.friendById(id);
      return f && !f.following && !f.retired && !self.fr2ExpRunOf(id) && num(f.questBusy, 0) <= 0;
    });
    if (!ok) { this.log('⚠️ 有成員正在同行、辦事或療傷，無法出團。', 'system'); return false; }

    var run = {
      id: uid('run'), dzId: dz.id, members: members, includePlayer: !!includePlayer,
      leadId: members[0], stage: 0, stages: num(dz.stages, 3),
      chem: 0, hurt: 0, log: [], status: 'running',
      gains: { exp: 0, gold: 0, drops: 0 }, startAt: Date.now()
    };
    E.runs.push(run);
    var names = members.map(function (id) { var f = self.friendById(id); return f ? f.name : '?'; }).join('、');
    this.friendLog('🏰 好友自行組隊【' + dz.name + '】遠征隊成軍：' + names +
      (includePlayer ? '（含你）' : '') + '，即刻出發！', 'gain');
    return true;
  };

  proto.fr2ExpCancel = function (runId) {
    var E = this.fr2ExpState();
    var n = E.runs.length;
    E.runs = E.runs.filter(function (r) { return r.id !== runId; });
    if (E.runs.length !== n) { this.friendLog('🛑 你召回了一支遠征隊。', 'time'); return true; }
    return false;
  };

  /* ══════════ 戰報文字 ══════════ */
  proto.fr2ExpStageText = function (run, dz, members, isBoss, ok) {
    var mob = pick(dz.mobs || ['山賊']);
    var head;
    if (isBoss) head = tmpl(pick(EV.boss || ['最終頭目【{boss}】現身！']), { boss: dz.boss });
    else if (Math.random() < 0.22) head = pick(EV.trap || ['誤觸機關']);
    else if (Math.random() < 0.18) head = pick(EV.chest || ['發現寶箱']);
    else head = tmpl(pick(Math.random() < 0.3 ? (EV.elite || ['精英']) : (EV.mob || ['遭遇'])),
      { mob: mob, n: rndInt(4, 12) });

    var acts = [];
    var self = this;
    var shuffle = members.slice();
    for (var i = shuffle.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = shuffle[i]; shuffle[i] = shuffle[j]; shuffle[j] = t; }
    shuffle.slice(0, 3).forEach(function (f) {
      var r = self.fr2RoleOf(f);
      acts.push('【' + f.name + '】' + pick((F.ROLE_ACT || {})[r] || ['出手']));
    });
    return '第 ' + run.stage + ' 層：' + head + ' —— ' + (acts.join('、') || '眾人合力') + (ok ? '（得手）' : '（受挫）');
  };

  /* ══════════ 推進一層 ══════════ */
  proto.fr2ExpAdvance = function (run, dz) {
    var self = this;
    run.stage += 1;
    var isBoss = run.stage >= num(dz.stages, 3);
    var p = this.fr2ExpProb(run, isBoss);
    var ok = Math.random() < p;
    var team = this.fr2ExpTeam(run);
    var members = team.members;
    run.log.push({ stage: run.stage, ok: ok, text: this.fr2ExpStageText(run, dz, members, isBoss, ok) });
    if (run.log.length > 40) run.log.shift();

    if (ok) {
      var dzF = num(dz.expMul, 1);
      members.forEach(function (f) {
        var gain = Math.round(num(f.maxExp, 100) * num(C2.EXP_REWARD_EXP, 0.10) * dzF);
        self.friendGainExp(f, gain);
        run.gains.exp += gain;
        f.favor = Math.min(100, num(f.favor, 0) + num(C2.EXP_FAVOR_GAIN, 3));
        f.clears = num(f.clears, 0) + 1;
        if (Math.random() < num(C2.EXP_DROP_CHANCE, 0.5) * num(dz.dropMul, 1)) {
          var eq = self.friendRollEquip(num(f.lv, 1));
          if (eq) { f.bag.push(eq); f.drops = num(f.drops, 0) + 1; run.gains.drops += 1; self.friendAutoEquipOne(f); }
        }
      });
      run.gains.gold += Math.round(num(dz.gold, 500) / num(dz.stages, 3) * 0.6);
      run.chem = num(run.chem, 0) + num(C2.EXP_CHEM_GAIN, 8);
      // 偶爾把戰利品直接送回玩家
      if (Math.random() < num(C2.EXP_LOOT_TO_PLAYER, 0.35)) {
        var box = this.friendRollEquip(this.fr2PlayerLv());
        if (box) { this.fr2PushToPlayerBag(box); run.gains.drops += 1; }
      }
    } else {
      run.hurt = num(run.hurt, 0) + 1;
      var victim = members.length ? pick(members) : null;
      if (victim) {
        var d = this.friendDerived(victim);
        victim.currentHp = Math.max(1, Math.floor(num(d.maxHp, 100) * 0.35));
        if (run.hurt >= 2 || isBoss) {
          victim.status = 'injured';
          victim.injuredLeft = rndInt(num(C2.EXP_INJURY_TICKS[0], 3), num(C2.EXP_INJURY_TICKS[1], 7));
          run.log.push({ stage: run.stage, ok: false, text: '　→【' + victim.name + '】負傷，被迫退下陣來。' });
        }
      }
      if (isBoss) { this.fr2ExpFinish(run, false); return; }
    }
    if (isBoss) this.fr2ExpFinish(run, true);
  };

  proto.fr2PushToPlayerBag = function (item) {
    if (!item) return false;
    var root = this.charSys.rootState;
    if (!Array.isArray(root.equipBag)) root.equipBag = [];
    var maxSize = 60;
    var es = window.HY.game && window.HY.game.equipSys;
    if (es && typeof es.getMaxBagSize === 'function') { try { maxSize = es.getMaxBagSize(); } catch (e) { /* 忽略 */ } }
    if (root.equipBag.length >= maxSize) return false;
    root.equipBag.push(item);
    return true;
  };

  proto.fr2ExpFinish = function (run, ok) {
    var dz = this.fr2Dungeon(run.dzId);
    var E = this.fr2ExpState();
    var self = this;
    run.status = ok ? 'done' : 'failed';
    var members = (run.members || []).map(function (id) { return self.friendById(id); }).filter(Boolean);

    if (ok) {
      E.clears += 1;
      var gold = Math.round(num(run.gains.gold, 0) * num(C2.EXP_BOX_GOLD_MUL, 1) * (1 + this.fr2TownLv() * 0.04));
      this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) + gold;
      run.gains.gold = gold;
      if (dz && dz.tier >= 4) {
        var box = this.friendRollEquip(Math.max(this.fr2PlayerLv(), num(dz.reqLv, 1)));
        if (box) this.fr2PushToPlayerBag(box);
      }
      this.friendLog('🏆 遠征成功！好友團隊攻破【' + (dz ? dz.name : '副本') + '】，帶回紋銀 ' + gold.toLocaleString() +
        ' 兩、戰利品 ' + run.gains.drops + ' 件。', 'loot');
      if (typeof this.fr2MailPush === 'function') {
        this.fr2MailPush({
          from: null, tpl: 'm_report', name: (dz ? dz.name : '副本'),
          body: '我等已攻破【' + (dz ? dz.name : '副本') + '】，戰利品已隨信附上。',
          attach: [{ kind: 'gold', amount: Math.round(gold * 0.1) }]
        });
      }
    } else {
      E.fails += 1;
      members.forEach(function (f) {
        f.status = 'injured';
        f.injuredLeft = Math.max(num(f.injuredLeft, 0), rndInt(num(C2.EXP_INJURY_TICKS[0], 3), num(C2.EXP_INJURY_TICKS[1], 7)));
      });
      this.friendLog('💀 遠征失敗！好友團隊在【' + (dz ? dz.name : '副本') + '】全軍覆沒，狼狽退回養傷。', 'system');
    }
    E.history.unshift(this.fr2ExpSummary(run));
    E.history = E.history.slice(0, 25);
    E.runs = E.runs.filter(function (r) { return r.status === 'running'; });
  };

  proto.fr2ExpSummary = function (run) {
    var dz = this.fr2Dungeon(run.dzId);
    var self = this;
    return {
      id: run.id, dzId: run.dzId, dzName: dz ? dz.name : '?', icon: dz ? dz.icon : '🏰',
      ok: run.status === 'done', stage: run.stage, stages: num(dz ? dz.stages : 3, 3),
      members: (run.members || []).map(function (id) { var f = self.friendById(id); return f ? f.name : '?'; }),
      includePlayer: !!run.includePlayer,
      gains: run.gains, chem: num(run.chem, 0), log: run.log.slice(), at: Date.now()
    };
  };

  /* ══════════ 每期推進 ══════════ */
  proto.fr2ExpTick = function () {
    var E = this.fr2ExpState();
    var self = this;
    E.runs.slice().forEach(function (run) {
      if (run.status !== 'running') return;
      var dz = self.fr2Dungeon(run.dzId);
      if (!dz) { run.status = 'failed'; return; }
      if (run.stage >= num(dz.stages, 3)) { self.fr2ExpFinish(run, true); return; }
      self.fr2ExpAdvance(run, dz);
    });
  };

  proto.fr2ExpAutoTick = function () {
    var E = this.fr2ExpState();
    var S = this.friendState();
    if (!E.auto) return;
    var iv = num(C2.EXP_AUTO_INTERVAL, 12);
    if (!E.nextAuto) E.nextAuto = num(S.ticks, 0) + iv;
    if (num(S.ticks, 0) < E.nextAuto) return;
    E.nextAuto = num(S.ticks, 0) + iv;
    if (E.runs.length >= num(C2.EXP_MAX_ACTIVE, 2)) return;
    if (this.fr2ExpIdleFriends().length < num(C2.EXP_TEAM_MIN, 3)) return;

    // 挑「所有成員都達標」的最高階副本
    var best = null, self = this;
    this.fr2DungeonAvail().forEach(function (x) {
      if (!x.unlocked) return;
      var pool = self.fr2ExpIdleFriends().filter(function (f) { return num(f.lv, 1) >= num(x.reqLv, 1); });
      if (pool.length < num(C2.EXP_TEAM_MIN, 3)) return;
      if (!best || x.d.reqLv > best.reqLv) best = x;
    });
    if (!best) {
      var dz0 = DZ[0];
      if (dz0) this.fr2ExpDispatch(dz0.id, null, false);
      return;
    }
    this.fr2ExpDispatch(best.d.id, null, false);
  };

  /* ══════════ 合擊技 ══════════ */
  proto.fr2ComboState = function () {
    var E = this.fr2ExpState();
    var S = this.friendState();
    var out = { active: null, readyAt: num(E.comboReady, 0), now: num(S.ticks, 0) };
    if (E.combos && E.combos.active && num(E.combos.until, 0) > num(S.ticks, 0)) out.active = E.combos.active;
    return out;
  };

  proto.fr2ComboList = function () {
    var self = this;
    var bonds = (typeof this.fr2BondList === 'function') ? this.fr2BondList() : [];
    var followers = this.friendFollowers();
    var cnt = {};
    bonds.forEach(function (b) { if (b.a !== 'player' && b.b !== 'player') cnt[b.type] = (cnt[b.type] || 0) + 1; });
    return (F.COMBOS || []).map(function (c) {
      var avail = false, why = '';
      if (!c.bond) { avail = followers.length >= num(c.need, 3); why = avail ? '' : '需 ' + c.need + ' 位好友同行'; }
      else {
        var n = (cnt[c.bond] || 0) + bonds.filter(function (b) { return b.type === c.bond && (b.a === 'player' || b.b === 'player'); }).length;
        avail = n >= num(c.need, 1); why = avail ? '' : '需先建立「' + (self.fr2BondTypeName(c.bond)) + '」羈絆';
      }
      return { def: c, avail: avail, why: why };
    });
  };

  proto.fr2BondTypeName = function (id) {
    var L = F.BOND_TYPES || [];
    for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i].name;
    return id;
  };

  proto.fr2ComboUse = function (id) {
    var self = this;
    var entry = null;
    this.fr2ComboList().forEach(function (e) { if (e.def.id === id) entry = e; });
    if (!entry) return false;
    if (!entry.avail) { this.log('⚠️ 無法施展合擊：' + entry.why, 'system'); return false; }
    var E = this.fr2ExpState();
    var S = this.friendState();
    var st = this.fr2ComboState();
    if (num(S.ticks, 0) < st.readyAt) { this.log('⚠️ 合擊冷卻中（還需 ' + (st.readyAt - num(S.ticks, 0)) + ' 期）。', 'system'); return false; }
    var cost = num(entry.def.sp, num(C2.COMBO_SP_COST, 30));
    if (num(this.charSys.rootState.sp, 0) < cost) { this.log('⚠️ 施展合擊需 ' + cost + ' 武點。', 'system'); return false; }
    this.charSys.rootState.sp -= cost;
    var ticks = num(entry.def.ticks, num(C2.COMBO_TICKS, 8));
    E.combos = { active: entry.def.id, until: num(S.ticks, 0) + ticks, atkPct: entry.def.atkPct, defPct: entry.def.defPct, hpPct: entry.def.hpPct };
    E.comboReady = num(S.ticks, 0) + num(C2.COMBO_COOLDOWN, 30);
    this.friendLog('✨ 你與好友施展合擊【' + entry.def.icon + entry.def.name + '】，全隊攻防大幅提升 ' + ticks + ' 期！', 'gain');
    return true;
  };

  /** 合擊光環：疊在 friendSystem 的同行光環之上 */
  proto.fr2InstallComboAura = function () {
    var CS = window.HY.CharacterSystem;
    if (!CS || !CS.prototype || CS.prototype.__fr2ComboWrapped) return;
    CS.prototype.__fr2ComboWrapped = true;
    var orig = CS.prototype.getDerivedStatsForChar;
    CS.prototype.getDerivedStatsForChar = function (c) {
      var d = orig.call(this, c);
      try {
        var town = window.HY.game && window.HY.game.townSys;
        if (!town || typeof town.fr2ComboState !== 'function') return d;
        var st = town.fr2ComboState();
        if (!st.active) return d;
        var E = town.fr2ExpState();
        var cb = E.combos || {};
        if (d.atk) d.atk = Math.floor(d.atk * (1 + num(cb.atkPct, 0)));
        if (d.def) d.def = Math.floor(d.def * (1 + num(cb.defPct, 0)));
        if (d.maxHp) d.maxHp = Math.floor(d.maxHp * (1 + num(cb.hpPct, 0)));
        if (typeof this.getPowerScore === 'function') d.powerScore = this.getPowerScore(d);
      } catch (e) { /* 忽略 */ }
      return d;
    };
    console.log('[friendParty] ✓ 合擊技光環已掛載');
  };

  /* ══════════ 忙碌好友改走專用分支 ══════════ */
  proto.fr2FriendBusy = function (f) {
    if (!f) return false;
    if (f.retired) return true;
    if (num(f.questBusy, 0) > 0) return true;
    if (this.fr2ExpRunOf(f.id)) return true;
    return false;
  };

  proto.fr2BusyStep = function (f) {
    if (f.retired) {
      f.status = 'retired';
      f.actionText = '已退隱，在鎮上頤養天年（仍提供名宿加成）';
      return;
    }
    if (num(f.questBusy, 0) > 0) {
      f.questBusy = num(f.questBusy, 0) - 1;
      f.status = 'questing';
      f.actionText = '替人辦事中（還需 ' + f.questBusy + ' 期）';
      if (f.questBusy <= 0 && typeof this.fr2QuestComplete === 'function') this.fr2QuestComplete(f);
      return;
    }
    var run = this.fr2ExpRunOf(f.id);
    if (run) {
      var dz = this.fr2Dungeon(run.dzId);
      f.status = 'expedition';
      f.actionText = '隨隊遠征【' + (dz ? dz.name : '副本') + '】（第 ' + run.stage + '/' + num(dz ? dz.stages : 3, 3) + ' 層）';
      return;
    }
    f.status = 'idle';
    f.actionText = this.friendActionText(f);
  };

  var _friendStep = proto.friendStep;
  proto.friendStep = function (f) {
    try { if (this.fr2FriendBusy(f)) { this.fr2BusyStep(f); return; } } catch (e) { /* 忽略 */ }
    return _friendStep.call(this, f);
  };

  /* ══════════ v2 主 tick：一期跑一輪 ══════════ */
  proto.fr2TickOnce = function () {
    var S = this.friendState();
    (S.list || []).forEach(function (f) { f.activeTicks = num(f.activeTicks, 0) + 1; });

    this.fr2ExpTick();
    this.fr2ExpAutoTick();
    if (typeof this.fr2TourneyTick === 'function') this.fr2TourneyTick();
    if (typeof this.fr2QuestTick === 'function') this.fr2QuestTick();
    if (typeof this.fr2RescueTick === 'function') this.fr2RescueTick();
    if (typeof this.fr2VisitTick === 'function') this.fr2VisitTick();
    if (typeof this.fr2MailTick === 'function') this.fr2MailTick();
    if (typeof this.fr2BondTick === 'function') this.fr2BondTick();
    if (typeof this.fr2TitleTick === 'function') this.fr2TitleTick();
    if (typeof this.fr2RetireTick === 'function') this.fr2RetireTick();
    if (typeof this.fr2RankTick === 'function') this.fr2RankTick();
    if (typeof this.fr2ChatTick === 'function') this.fr2ChatTick();
  };

  var _friendTick = proto.friendTick;
  proto.friendTick = function (force) {
    var r = _friendTick.call(this, force);
    try {
      var S = this.friendState();
      var now = num(S.ticks, 0);
      var last = num(this._fr2LastTicks, 0);
      var delta = now - last;
      if (delta > 0) {
        this._fr2LastTicks = now;
        var steps = Math.min(delta, 3);       // 單次最多補 3 期，避免卡頓
        for (var i = 0; i < steps; i++) this.fr2TickOnce();
      }
    } catch (e) { console.error('[friendParty] v2 tick 失敗：', e); }
    return r;
  };

  /* ══════════ 啟動 ══════════ */
  proto.fr2PartyBootOnce = function () {
    if (this._fr2PartyBooted) return;
    this._fr2PartyBooted = true;
    try { this.fr2InstallComboAura(); } catch (e) { console.error('[friendParty] 合擊光環失敗：', e); }
    try { this.fr2ExpState(); } catch (e) { /* 忽略 */ }
    console.log('[friendParty] ✓ 好友出團遠征系統已啟動');
  };

  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.fr2PartyBootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  /* ══════════ 報告 ══════════ */
  proto.fr2ExpReport = function () {
    var E = this.fr2ExpState();
    var self = this;
    var runs = E.runs.map(function (run) {
      var dz = self.fr2Dungeon(run.dzId);
      var team = self.fr2ExpTeam(run);
      return {
        id: run.id, dzId: run.dzId, name: dz ? dz.name : '?', icon: dz ? dz.icon : '🏰',
        stage: run.stage, stages: num(dz ? dz.stages : 3, 3),
        pct: Math.round(run.stage / Math.max(1, num(dz ? dz.stages : 3, 3)) * 100),
        prob: Math.round(self.fr2ExpProb(run, false) * 100),
        bossProb: Math.round(self.fr2ExpProb(run, true) * 100),
        synergy: Math.round(self.fr2ExpSynergy(run) * 100),
        members: team.members.map(function (f) {
          return { id: f.id, name: f.name, icon: f.icon, lv: f.lv, role: self.fr2RoleOf(f), roleName: self.fr2RoleName(self.fr2RoleOf(f)), power: self.friendPower(f) };
        }),
        includePlayer: !!run.includePlayer, chem: num(run.chem, 0),
        gains: run.gains, log: run.log.slice(-8)
      };
    });
    var avail = this.fr2DungeonAvail().map(function (x) {
      var pool = self.fr2ExpIdleFriends().filter(function (f) { return num(f.lv, 1) >= num(x.d.reqLv, 1); });
      return {
        id: x.d.id, name: x.d.name, icon: x.d.icon, reqLv: x.d.reqLv, stages: x.d.stages,
        tier: x.d.tier, boss: x.d.boss, place: x.d.place, unlocked: x.unlocked,
        ready: pool.length >= num(C2.EXP_TEAM_MIN, 3), pool: pool.length,
        gold: x.d.gold, mobs: x.d.mobs
      };
    });
    return {
      runs: runs, avail: avail, history: E.history.slice(0, 12),
      clears: num(E.clears, 0), fails: num(E.fails, 0),
      auto: !!E.auto, idle: this.fr2ExpIdleFriends().length,
      teamMin: num(C2.EXP_TEAM_MIN, 3), teamMax: num(C2.EXP_TEAM_MAX, 5),
      maxActive: num(C2.EXP_MAX_ACTIVE, 2),
      combos: this.fr2ComboList(), combo: this.fr2ComboState(),
      playerLv: this.fr2PlayerLv()
    };
  };

  window.HY.FriendParty = { version: '1.0', dungeons: DZ.length, combos: (F.COMBOS || []).length };
  console.log('[friendParty] ✓ 已載入（出團遠征 + 合擊技）');
})();