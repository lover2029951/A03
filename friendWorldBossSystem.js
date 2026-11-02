// js/friendWorldBossSystem.js (v1)
// ⭐ 好友系統 v3：世界王（跨好友團隊大型活動，需 8 人以上）
//    • Boss HP 依「集結隊伍總戰力」縮放 → 不受戰力數值通膨影響
//    • 好友不足 8 人時，可用「正在小鎮作客的名人」當助拳
//    • 3 階段、反擊負傷、貢獻排行、MVP 稱號、討伐失敗會打劫小鎮
// ⚠️ 載入順序：friendHomeSystem.js 之後、friendRankSystem.js 之前
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendWorldBossSystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendWorldBossSystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var C3 = F.CONFIG3 || {};
  var BOSSES = F.WORLD_BOSSES || [];

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function uid(p) { return (p || 'wb') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function hash(s) { var h = 2166136261, i; s = String(s || ''); for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }

  /* ══════════ 狀態 ══════════ */
  proto.fr3WbDefault = function () {
    return {
      active: null, history: [], nextAt: 0, auto: true,
      kills: 0, fails: 0, totalDamage: 0, pendingRaid: 0,
      mvp: {}, stats: { gold: 0, drops: 0, injured: 0 }
    };
  };
  proto.fr3WbState = function () {
    var S = this.friendState();
    if (!S.worldboss || typeof S.worldboss !== 'object') S.worldboss = this.fr3WbDefault();
    var W = S.worldboss, d = this.fr3WbDefault(), k;
    for (k in d) { if (W[k] === undefined) W[k] = d[k]; }
    if (!Array.isArray(W.history)) W.history = [];
    if (!W.mvp || typeof W.mvp !== 'object') W.mvp = {};
    if (!W.stats || typeof W.stats !== 'object') W.stats = d.stats;
    for (k in d.stats) { if (W.stats[k] === undefined) W.stats[k] = 0; }
    return W;
  };

  proto.fr3WbDef = function (id) {
    for (var i = 0; i < BOSSES.length; i++) if (BOSSES[i].id === id) return BOSSES[i];
    return null;
  };

  /* ══════════ 出場名人化（用真實 celeb 的 name/icon/title） ══════════ */
  proto.fr3WbResolve = function (b) {
    var out = {
      id: b.id, name: b.name, icon: b.icon, title: b.title, tier: b.tier,
      hpMul: num(b.hpMul, 1), gold: num(b.gold, 40000), dropMul: num(b.dropMul, 1.5),
      lines: b.lines || [], celebId: b.celebId || null, celebName: null, celebTitle: null
    };
    if (b.celebId && typeof this.celebById === 'function') {
      var c = this.celebById(b.celebId);
      if (c) {
        out.celebName = c.name;
        out.celebTitle = c.title;
        out.icon = c.icon || out.icon;
        out.name = (b.name || c.name);
        out.title = (c.title || b.title);
      }
    }
    return out;
  };

  /* ══════════ 可用戰力：好友 + 名人訪客助拳 ══════════ */
  proto.fr3WbFriendRaiders = function () {
    var self = this;
    return this.friendAll().filter(function (f) {
      return !f.retired && f.status !== 'injured' && num(f.currentHp, 1) > 0 && num(f.questBusy, 0) <= 0;
    }).map(function (f) {
      return { id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), kind: 'friend',
        power: self.friendPower(f), socIcon: f.socIcon, socName: f.socName, tier: f.tier, following: !!f.following };
    }).sort(function (a, b) { return b.power - a.power; });
  };

  /** 名人訪客助拳（人數不足時補齊） */
  proto.fr3WbMercs = function () {
    if (typeof this.celebVisitors !== 'function') return [];
    var self = this;
    var used = {};
    this.fr3WbFriendRaiders().forEach(function (r) { used[r.id] = 1; });
    return this.celebVisitors().map(function (v) {
      var c = (typeof self.celebById === 'function') ? self.celebById(v.id) : null;
      if (!c || used[c.id]) return null;
      var lv = self.fr3CelebLv ? self.fr3CelebLv(c) : 30;
      var power = Math.round((800 + lv * 260) * num(c.tier && c.tier.mul, 1) * num(C3.WB_MERC_POWER, 1));
      return {
        id: 'merc_' + c.id, name: c.name, icon: c.icon, lv: lv, kind: 'merc', _merc: true,
        power: power, socIcon: c.socIcon, socName: c.socName, tier: c.tier, favor: num(v.favor, 0)
      };
    }).filter(Boolean).sort(function (a, b) { return b.power - a.power; });
  };

  proto.fr3WbRaiderPower = function (x) {
    if (!x) return 0;
    if (x._merc) return num(x.power, 0);
    return this.friendPower(this.friendById(x.id)) || num(x.power, 0);
  };

  /* ══════════ 出現 ══════════ */
  proto.fr3WbSpawn = function (forceId) {
    var W = this.fr3WbState();
    if (W.active) return null;
    var b = null;
    if (forceId) b = this.fr3WbDef(forceId);
    if (!b) {
      // 依好友實力挑「剛好有挑戰性」的 Boss
      var bestLv = 0;
      this.friendAll().forEach(function (f) { bestLv = Math.max(bestLv, num(f.lv, 1)); });
      var pool = BOSSES.filter(function (x) { return num(x.tier, 1) <= Math.max(1, Math.ceil(bestLv / 25)); });
      if (!pool.length) pool = [BOSSES[0]];
      b = pick(pool);
    }
    if (!b) return null;
    var def = this.fr3WbResolve(b);
    W.active = {
      id: uid('boss'), bossId: def.id, name: def.name, icon: def.icon, title: def.title,
      celebName: def.celebName, tier: num(def.tier, 1), lines: def.lines,
      hp: 0, maxHp: 0, phase: 1, turns: 0,
      members: [], mercs: [], includePlayer: false,
      damage: {}, log: [], status: 'gathering', spawnedTick: num(this.friendState().ticks, 0)
    };
    this.friendLog('🌍 世界王【' + def.icon + ' ' + def.name + '】（' + def.title + '）降臨江湖！' +
      '需集結 ' + num(C3.WB_RAID_MIN, 8) + ' 人以上討伐。', 'system');
    this.requestRender();
    return W.active;
  };

  proto.fr3WbActive = function () { return this.fr3WbState().active; };

  /* ══════════ 集結 ══════════ */
  proto.fr3WbRally = function (friendIds, mercIds, includePlayer) {
    var W = this.fr3WbState();
    if (!W.active) { this.log('⚠️ 目前沒有世界王。', 'system'); return false; }
    if (W.active.status === 'fighting') { this.log('⚠️ 討伐已開始，無法變更隊伍。', 'system'); return false; }

    var self = this;
    var friends = (friendIds || []).map(function (id) { return self.friendById(id); }).filter(Boolean);
    var mercs = (mercIds || []).map(function (mid) {
      return self.fr3WbMercs().filter(function (m) { return m.id === mid; })[0];
    }).filter(Boolean);

    var total = friends.length + mercs.length + (includePlayer ? 1 : 0);
    if (total < num(C3.WB_RAID_MIN, 8)) {
      this.log('⚠️ 集結人數不足（' + total + '/' + num(C3.WB_RAID_MIN, 8) + '）。可邀名人訪客當助拳。', 'system');
      return false;
    }
    if (total > num(C3.WB_RAID_MAX, 20)) {
      friends = friends.slice(0, num(C3.WB_RAID_MAX, 20));
      total = friends.length + mercs.length + (includePlayer ? 1 : 0);
    }

    var a = W.active;
    a.members = friends.map(function (f) { return f.id; });
    a.mercs = mercs.map(function (m) { return m.id; });
    a.includePlayer = !!includePlayer;

    // 依隊伍戰力縮放 Boss HP（與戰力數值尺度無關）
    var pow = 0;
    friends.forEach(function (f) { pow += self.friendPower(f); });
    mercs.forEach(function (m) { pow += num(m.power, 0); });
    if (includePlayer) { try { pow += num(self.charSys.getDerivedStatsForChar(self.charSys.state).powerScore, 0); } catch (e) { /* 忽略 */ } }
    if (pow <= 0) { this.log('⚠️ 隊伍戰力為 0，無法討伐。', 'system'); return false; }

    a.teamPower = pow;
    a.maxHp = Math.round(pow * num(C3.WB_HP_BASE, 0.85) * (1 + num(a.tier, 1) * 0.12) * num(this.fr3WbDef(a.bossId) && this.fr3WbDef(a.bossId).hpMul, 1));
    a.hp = a.maxHp;
    a.phase = 1;
    a.turns = 0;
    a.damage = {};
    a.status = 'fighting';
    a.log = [];
    a.startedAt = Date.now();

    var names = friends.map(function (f) { return f.icon + f.name; }).concat(mercs.map(function (m) { return m.icon + m.name + '(助拳)'; }));
    if (includePlayer) names.unshift('🧑‍🎤你');
    a.log.push({ t: 'start', text: '集結 ' + total + ' 人（總戰力 ' + pow.toLocaleString() + '）討伐【' + a.name + '】，' +
      '其氣血 ' + a.maxHp.toLocaleString() + '。' });
    this.friendLog('🌍 世界王討伐開始！集結 ' + total + ' 人（總戰力 ' + pow.toLocaleString() + '）：' + names.join('、'), 'gain');
    this.requestRender();
    return true;
  };

  proto.fr3WbSynergy = function (a) {
    var self = this;
    var kinds = {}, tierSum = 0, n = 0;
    a.members.forEach(function (id) {
      var f = self.friendById(id);
      if (!f) return;
      kinds[f.society || 'none'] = 1;
      tierSum += num(f.tier && f.tier.lv, 1); n += 1;
    });
    var s = 1;
    s += Math.min(0.18, Object.keys(kinds).length * 0.045);
    if (n) s += Math.min(0.12, Math.max(0, (tierSum / n) - 1) * 0.03);
    if (a.includePlayer) s += 0.05;
    return Math.max(0.7, Math.min(1.6, s));
  };

  /* ══════════ 每期戰鬥 ══════════ */
  proto.fr3WbTick = function () {
    var W = this.fr3WbState();
    var S = this.friendState();
    if (!W.active) {
      // 自動生成
      if (!W.auto) return;
      var iv = num(C3.WB_INTERVAL, 60);
      if (!W.nextAt) W.nextAt = num(S.ticks, 0) + iv;
      if (num(S.ticks, 0) >= W.nextAt) { W.nextAt = num(S.ticks, 0) + iv; this.fr3WbSpawn(null); }
      // 失敗後打劫
      if (num(W.pendingRaid, 0) > 0) {
        W.pendingRaid -= 1;
        if (W.pendingRaid <= 0) {
          var loss = Math.round(num(this.charSys.rootState.gold, 0) * 0.05);
          this.charSys.rootState.gold = Math.max(0, num(this.charSys.rootState.gold, 0) - loss);
          this.friendLog('💀 世界王趁虛而入，洗劫小鎮 ' + loss.toLocaleString() + ' 兩紋銀。', 'system');
        }
      }
      return;
    }

    var a = W.active;
    if (a.status !== 'fighting') return;

    var self = this;
    a.turns = num(a.turns, 0) + 1;

    // 階段推進
    var newPhase = a.turns <= 8 ? 1 : (a.turns <= 17 ? 2 : 3);
    if (newPhase !== a.phase) {
      a.phase = newPhase;
      a.log.push({ t: 'phase', text: '⚡ 【' + a.name + '】進入第 ' + a.phase + ' 階段！' + (a.lines && a.lines.length ? '「' + pick(a.lines) + '」' : '') });
    }

    // 我方輸出
    var pow = 0;
    var alive = [];
    a.members.forEach(function (id) {
      var f = self.friendById(id);
      if (!f) return;
      if (f.status === 'injured') return;
      pow += self.friendPower(f);
      alive.push({ id: id, kind: 'friend' });
    });
    a.mercs.forEach(function (mid) {
      var m = self.fr3WbMercs().filter(function (x) { return x.id === mid; })[0];
      if (!m) return;
      pow += num(m.power, 0);
      alive.push({ id: mid, kind: 'merc', power: m.power });
    });
    if (a.includePlayer) {
      try { pow += num(this.charSys.getDerivedStatsForChar(this.charSys.state).powerScore, 0); } catch (e) { /* 忽略 */ }
    }

    var syn = this.fr3WbSynergy(a);
    var dmg = Math.round(pow * num(C3.WB_DPS, 0.075) * syn * (1 + (a.phase - 1) * 0.05));
    a.hp = Math.max(0, num(a.hp, 0) - dmg);
    W.totalDamage = num(W.totalDamage, 0) + dmg;

    // 貢獻分配（依戰力比例）
    var totalPow = 0;
    alive.forEach(function (x) {
      var p = x.kind === 'merc' ? num(x.power, 0) : self.friendPower(self.friendById(x.id));
      x._p = p; totalPow += p;
    });
    if (totalPow > 0) {
      alive.forEach(function (x) {
        var share = Math.round(dmg * (x._p / totalPow));
        a.damage[x.id] = num(a.damage[x.id], 0) + share;
        if (x.kind === 'friend') {
          var f = self.friendById(x.id);
          if (f) f.wbDamage = num(f.wbDamage, 0) + share;
        }
      });
    }

    // Boss 反擊
    var retal = num(C3.WB_RETAL, 0.16) + (a.phase - 1) * 0.06;
    var hurtList = [];
    var friendAlive = alive.filter(function (x) { return x.kind === 'friend'; });
    if (friendAlive.length && Math.random() < retal) {
      var victim = friendAlive[Math.floor(Math.random() * friendAlive.length)];
      var vf = this.friendById(victim.id);
      if (vf) {
        vf.status = 'injured';
        vf.injuredLeft = Math.max(num(vf.injuredLeft, 0), rndInt(3, 8));
        hurtList.push(vf.name);
        W.stats.injured += 1;
      }
    }

    a.log.push({
      t: 'turn',
      text: '第 ' + a.turns + ' 期（階段 ' + a.phase + '）：造成傷害 ' + dmg.toLocaleString() +
        '（默契 ' + Math.round(syn * 100) + '%），剩餘氣血 ' + a.hp.toLocaleString() +
        (hurtList.length ? '　💥 ' + hurtList.join('、') + ' 負傷退下' : '')
    });
    if (a.log.length > 60) a.log.shift();

    // 判定
    if (a.hp <= 0) { this.fr3WbFinish(true); return; }
    if (a.turns >= num(C3.WB_ENRAGE, 26)) { this.fr3WbFinish(false); return; }
  };

  /* ══════════ 結算 ══════════ */
  proto.fr3WbFinish = function (ok) {
    var W = this.fr3WbState();
    var a = W.active;
    if (!a) return false;
    var def = this.fr3WbDef(a.bossId);
    var self = this;
    a.status = ok ? 'done' : 'failed';

    var rank = Object.keys(a.damage).map(function (id) {
      var nm = '?', ic = '👤';
      if (id.indexOf('merc_') === 0) {
        var m = self.fr3WbMercs().filter(function (x) { return x.id === id; })[0];
        if (m) { nm = m.name; ic = m.icon; }
      } else {
        var f = self.friendById(id);
        if (f) { nm = f.name; ic = f.icon; }
      }
      return { id: id, name: nm, icon: ic, damage: num(a.damage[id], 0) };
    }).sort(function (x, y) { return y.damage - x.damage; });

    if (ok) {
      W.kills = num(W.kills, 0) + 1;
      var gold = Math.round(num(def && def.gold, 40000) * (1 + num(this.fr2TownLv ? this.fr2TownLv() : 1, 1) * 0.05));
      this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) + gold;
      W.stats.gold += gold;

      var drops = 0;
      a.members.forEach(function (id) {
        var f = self.friendById(id);
        if (!f) return;
        f.favor = Math.min(100, num(f.favor, 0) + 6);
        f.wbKills = num(f.wbKills, 0) + 1;
        self.friendGainExp(f, Math.round(num(f.maxExp, 100) * 0.35));
        var rolls = 1 + (Math.random() < 0.5 ? 1 : 0);
        for (var i = 0; i < rolls; i++) {
          var eq = self.friendRollEquip(num(f.lv, 1));
          if (eq) { f.bag.push(eq); f.drops = num(f.drops, 0) + 1; drops += 1; self.friendAutoEquipOne(f); }
        }
      });
      // 玩家戰利品
      var boxCount = 2 + Math.round(num(a.tier, 1) / 2);
      for (var b = 0; b < boxCount; b++) {
        var box = this.friendRollEquip(Math.max(this.fr2PlayerLv ? this.fr2PlayerLv() : 1, num(a.tier, 1) * 20));
        if (box && this.fr2PushToPlayerBag(box)) drops += 1;
      }
      W.stats.drops += drops;

      if (rank.length) {
        W.mvp[rank[0].id] = num(W.mvp[rank[0].id], 0) + 1;
        var mvpf = this.friendById(rank[0].id);
        if (mvpf) {
          mvpf.favor = Math.min(100, num(mvpf.favor, 0) + 10);
          mvpf.wbMvp = num(mvpf.wbMvp, 0) + 1;
          if (typeof this.fr2GrantTitle === 'function') this.fr2GrantTitle(mvpf, 't_swordS');
        }
      }

      a.log.push({ t: 'end', text: '🏆 討伐成功！得紋銀 ' + gold.toLocaleString() + ' 兩、戰利品 ' + drops + ' 件。MVP：' + (rank[0] ? rank[0].icon + rank[0].name : '—') });
      this.friendLog('🏆 世界王【' + a.name + '】討伐成功！歷時 ' + a.turns + ' 期，得紋銀 ' + gold.toLocaleString() +
        ' 兩、戰利品 ' + drops + ' 件，MVP：【' + (rank[0] ? rank[0].name : '—') + '】', 'loot');
      if (typeof this.fr2MailPush === 'function') {
        this.fr2MailPush({ tpl: 'm_loot', name: '討伐隊', body: '世界王已伏誅，這是分給你的一份。', attach: [{ kind: 'gold', amount: Math.round(gold * 0.12) }] });
      }
    } else {
      W.fails = num(W.fails, 0) + 1;
      a.members.forEach(function (id) {
        var f = self.friendById(id);
        if (!f) return;
        f.status = 'injured';
        f.injuredLeft = Math.max(num(f.injuredLeft, 0), rndInt(4, 10));
        f.favor = Math.max(0, num(f.favor, 0) - 3);
      });
      W.pendingRaid = num(C3.WB_WARN, 6);
      a.log.push({ t: 'end', text: '💀 討伐失敗！【' + a.name + '】突圍而去，' + num(C3.WB_WARN, 6) + ' 期內將洗劫小鎮。' });
      this.friendLog('💀 世界王【' + a.name + '】討伐失敗，全隊負傷。' + num(C3.WB_WARN, 6) + ' 期內它會來犯！', 'system');
    }

    var summary = {
      id: a.id, bossId: a.bossId, name: a.name, icon: a.icon, title: a.title, tier: a.tier,
      ok: ok, turns: a.turns, maxHp: a.maxHp, damage: num(a.maxHp, 0) - num(a.hp, 0),
      teamPower: num(a.teamPower, 0), teamSize: (a.members || []).length + (a.mercs || []).length + (a.includePlayer ? 1 : 0),
      includePlayer: !!a.includePlayer, rank: rank, log: a.log.slice(-12), at: Date.now()
    };
    W.history.unshift(summary);
    W.history = W.history.slice(0, 12);
    W.active = null;
    W.nextAt = num(this.friendState().ticks, 0) + num(C3.WB_INTERVAL, 60);
    this.requestRender();
    return true;
  };

  proto.fr3WbAbort = function () {
    var W = this.fr3WbState();
    if (!W.active) return false;
    this.friendLog('🛑 你放棄了世界王討伐。', 'system');
    W.active = null;
    W.nextAt = num(this.friendState().ticks, 0) + num(C3.WB_INTERVAL, 60);
    return true;
  };

  proto.fr3WbRaidNow = function () { return this.fr3WbSpawn(null); };

  /* ══════════ 啟動 ══════════ */
  proto.fr3WbBootOnce = function () {
    if (this._fr3WbBooted) return;
    this._fr3WbBooted = true;
    try { this.fr3WbState(); } catch (e) { /* 忽略 */ }
    console.log('[friendWorldBoss] ✓ 世界王系統已啟動（Boss 池 ' + BOSSES.length + ' 頭）');
  };

  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.fr3WbBootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  /* ══════════ 報告 ══════════ */
  proto.fr3WbReport = function () {
    var W = this.fr3WbState();
    var S = this.friendState();
    var self = this;
    var ticks = num(S.ticks, 0);

    var active = null;
    if (W.active) {
      var a = W.active;
      var rank = Object.keys(a.damage).map(function (id) {
        var nm = '?', ic = '👤';
        if (id.indexOf('merc_') === 0) {
          var m = self.fr3WbMercs().filter(function (x) { return x.id === id; })[0];
          if (m) { nm = m.name; ic = m.icon; }
        } else { var f = self.friendById(id); if (f) { nm = f.name; ic = f.icon; } }
        return { id: id, name: nm, icon: ic, damage: num(a.damage[id], 0) };
      }).sort(function (x, y) { return y.damage - x.damage; });
      active = {
        id: a.id, bossId: a.bossId, name: a.name, icon: a.icon, title: a.title, tier: a.tier,
        status: a.status, phase: a.phase, turns: a.turns,
        hp: num(a.hp, 0), maxHp: num(a.maxHp, 0),
        hpPct: Math.round(num(a.hp, 0) / Math.max(1, num(a.maxHp, 1)) * 100),
        teamPower: num(a.teamPower, 0),
        synergy: Math.round(self.fr3WbSynergy(a) * 100),
        enrage: num(C3.WB_ENRAGE, 26),
        members: (a.members || []).map(function (id) {
          var f = self.friendById(id);
          return f ? { id: id, name: f.name, icon: f.icon, lv: num(f.lv, 1), power: self.friendPower(f),
            socIcon: f.socIcon, socName: f.socName, injured: f.status === 'injured',
            damage: num(a.damage[id], 0) } : null;
        }).filter(Boolean),
        mercs: (a.mercs || []).map(function (mid) {
          var m = self.fr3WbMercs().filter(function (x) { return x.id === mid; })[0];
          return m ? { id: m.id, name: m.name, icon: m.icon, lv: m.lv, power: m.power, damage: num(a.damage[mid], 0) } : null;
        }).filter(Boolean),
        includePlayer: !!a.includePlayer,
        rank: rank,
        log: (a.log || []).slice(-14)
      };
    }

    return {
      active: active,
      canSpawn: !W.active,
      nextIn: W.active ? 0 : Math.max(0, num(W.nextAt, 0) - ticks),
      interval: num(C3.WB_INTERVAL, 60),
      auto: !!W.auto,
      pendingRaid: num(W.pendingRaid, 0),
      raidMin: num(C3.WB_RAID_MIN, 8), raidMax: num(C3.WB_RAID_MAX, 20),
      friends: this.fr3WbFriendRaiders(),
      mercs: this.fr3WbMercs(),
      history: W.history.slice(0, 8),
      stats: { kills: num(W.kills, 0), fails: num(W.fails, 0), totalDamage: num(W.totalDamage, 0),
        gold: W.stats.gold, drops: W.stats.drops, injured: W.stats.injured },
      mvp: W.mvp,
      bosses: BOSSES.map(function (b) { var r = self.fr3WbResolve(b); return { id: r.id, name: r.name, icon: r.icon, title: r.title, tier: r.tier }; })
    };
  };

  window.HY.FriendWorldBoss = { version: '1.0', bosses: BOSSES.length };
  console.log('[friendWorldBoss] ✓ 已載入（世界王討伐）');
})();