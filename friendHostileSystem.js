// js/friendHostileSystem.js (v1)
// ⭐ 好友系統 v3：叛變／仇敵
//    • 好感歸零 → 每期機率反目成仇
//    • 主動斷交 → 有機率結仇
//    • 仇敵會定期打劫小鎮（可派好友迎擊）
//    • 可挑戰：戰勝後「招降」（花錢拉回好友）或「誅殺」（奪其裝備）
// ⚠️ 載入順序：friendCelebSystem.js 之後
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendHostileSystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendHostileSystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var C3 = F.CONFIG3 || {};
  var REASONS = F.HOSTILE_REASONS || [];

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function uid(p) { return (p || 'hos') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  /* ══════════ 狀態 ══════════ */
  proto.fr3HosDefault = function () {
    return { list: [], defeated: 0, recruited: 0, killed: 0, raids: 0, repelled: 0, totalLost: 0, totalLoot: 0, log: [] };
  };
  proto.fr3HosState = function () {
    var S = this.friendState();
    if (!S.hostiles || typeof S.hostiles !== 'object') S.hostiles = this.fr3HosDefault();
    var H = S.hostiles, d = this.fr3HosDefault(), k;
    for (k in d) { if (H[k] === undefined) H[k] = d[k]; }
    if (!Array.isArray(H.list)) H.list = [];
    if (!Array.isArray(H.log)) H.log = [];
    return H;
  };

  proto.fr3HosLog = function (msg, type) {
    var H = this.fr3HosState();
    H.log.unshift({ t: Date.now(), msg: msg, type: type || 'hostile' });
    if (H.log.length > 80) H.log.pop();
    this.friendLog('😈 ' + msg, type || 'system');
  };

  proto.fr3HosById = function (id) {
    var L = this.fr3HosState().list;
    for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    return null;
  };

  /* ══════════ 反目 ══════════ */
  proto.fr3HostileFromFriend = function (f, reasonId) {
    if (!f) return false;
    var H = this.fr3HosState();
    var S = this.friendState();
    if (H.list.length >= num(C3.HOSTILE_MAX, 12)) return false;

    var reason = null;
    REASONS.forEach(function (r) { if (r.id === reasonId) reason = r; });
    if (!reason) reason = pick(REASONS.length ? REASONS : [{ id: 'h_betray', name: '心懷怨懟', icon: '🗡️', desc: '' }]);

    var mul = num(C3.HOSTILE_POWER_MUL, 1.25);
    // 從好友名單移除
    S.list = S.list.filter(function (x) { return x.id !== f.id; });
    if (f.following) f.following = false;

    var h = {
      id: uid('hos'), celebId: f.celebId || f.npcId || null,
      name: f.name, icon: f.icon, title: f.title || '', tier: f.tier || null,
      society: f.society || null, socName: f.socName || '', socIcon: f.socIcon || '👤',
      lv: Math.round(num(f.lv, 1) * (1 + (mul - 1) * 0.5)),
      power: Math.round(this.friendPower(f) * mul),
      stats: f.stats, role: f.role, sect: f.sect,
      equipment: f.equipment || {}, bag: f.bag || [], skills: f.skills || {},
      reason: reason.id, reasonName: reason.name, reasonIcon: reason.icon, reasonDesc: reason.desc,
      favor: num(f.favor, 0),
      since: Date.now(), sinceTick: num(S.ticks, 0),
      defeatedCount: 0, raidAt: num(S.ticks, 0) + rndInt(num(C3.HOSTILE_RAID_CD[0], 20), num(C3.HOSTILE_RAID_CD[1], 45)),
      raidLeft: 0, resolved: false, stolen: 0
    };
    H.list.push(h);
    this.fr3HosLog('【' + h.name + '】與你反目成仇（' + h.reasonIcon + h.reasonName + '）！' +
      ' Lv.' + h.lv + '｜戰力 ' + h.power.toLocaleString() + '　' + reason.desc, 'system');
    this.requestRender();
    return true;
  };

  /** 每期：好感歸零的好友可能叛變 */
  proto.fr3HosTick = function () {
    var S = this.friendState();
    var self = this;
    var chance = num(C3.HOSTILE_CHANCE, 0.05);

    this.friendAll().slice().forEach(function (f) {
      if (f.retired) return;
      if (num(f.favor, 0) > 0) return;
      if (Math.random() >= chance) return;
      self.fr3HostileFromFriend(f, null);
    });

    // 打劫倒數
    var H = this.fr3HosState();
    H.list.forEach(function (h) {
      if (h.resolved) return;
      if (h.raidLeft > 0) {
        h.raidLeft = num(h.raidLeft, 0) - 1;
        if (h.raidLeft <= 0) self.fr3HosRaidExecute(h);
        return;
      }
      if (num(S.ticks, 0) >= num(h.raidAt, 0)) {
        h.raidLeft = num(C3.WB_WARN, 6);
        self.fr3HosLog('🚨 【' + h.name + '】率眾逼近小鎮，' + h.raidLeft + ' 期後動手！可派人迎擊。', 'system');
      }
    });
  };

  /* ══════════ 打劫 ══════════ */
  proto.fr3HosRaidExecute = function (h) {
    var H = this.fr3HosState();
    var root = this.charSys.rootState;
    var gold = num(root.gold, 0);
    var loss = Math.min(num(C3.HOSTILE_RAID_MAX, 40000), Math.round(gold * num(C3.HOSTILE_RAID_LOSS, 0.06)));
    loss = Math.max(200, loss);
    root.gold = Math.max(0, gold - loss);
    h.stolen = num(h.stolen, 0) + loss;
    h.resolved = true;
    h.raidAt = num(this.friendState().ticks, 0) + rndInt(num(C3.HOSTILE_RAID_CD[0], 20), num(C3.HOSTILE_RAID_CD[1], 45));
    h.raidLeft = 0;
    H.raids = num(H.raids, 0) + 1;
    H.totalLost = num(H.totalLost, 0) + loss;
    try { this.ensureState().prosperity = Math.max(0, num(this.ensureState().prosperity, 0) - 30); } catch (e) { /* 忽略 */ }
    this.fr3HosLog('💀 【' + h.name + '】洗劫了小鎮，損失 ' + loss.toLocaleString() + ' 兩紋銀！', 'system');
    return loss;
  };

  proto.fr3HosRepel = function (hId, helperIds) {
    var h = this.fr3HosById(hId);
    if (!h) return false;
    if (num(h.raidLeft, 0) <= 0) { this.log('⚠️ 目前沒有迫近的打劫。', 'system'); return false; }
    var self = this;
    var helpers = (helperIds || []).map(function (id) { return self.friendById(id); }).filter(Boolean);
    if (!helpers.length) { this.log('⚠️ 至少要派一位好友迎擊。', 'system'); return false; }

    var myPow = 0;
    try { myPow = num(this.charSys.getDerivedStatsForChar(this.charSys.state).powerScore, 0); } catch (e) { /* 忽略 */ }
    var teamPow = myPow + helpers.reduce(function (s, f) { return s + self.friendPower(f); }, 0);
    var chance = Math.max(0.1, Math.min(0.95, teamPow / Math.max(1, h.power) * 0.55));

    helpers.forEach(function (f) { f.favor = Math.min(100, num(f.favor, 0) + 2); });

    if (Math.random() < chance) {
      h.raidLeft = 0;
      h.resolved = true;
      h.raidAt = num(this.friendState().ticks, 0) + rndInt(num(C3.HOSTILE_RAID_CD[0], 20), num(C3.HOSTILE_RAID_CD[1], 45));
      var H = this.fr3HosState();
      H.repelled = num(H.repelled, 0) + 1;
      this.fr3HosLog('🛡️ 迎擊成功！【' + h.name + '】被擊退，小鎮無恙（勝率 ' + Math.round(chance * 100) + '%）。', 'gain');
      return true;
    }
    var d = this.fr3HosRaidExecute(h);
    void d;
    this.fr3HosLog('⚠️ 迎擊失敗！【' + h.name + '】仍得手（勝率 ' + Math.round(chance * 100) + '%）。', 'system');
    return false;
  };

  /* ══════════ 挑戰 ══════════ */
  proto.fr3HosFightChance = function (h) {
    var myPow = 0;
    try { myPow = num(this.charSys.getDerivedStatsForChar(this.charSys.state).powerScore, 0); } catch (e) { /* 忽略 */ }
    var followers = this.friendFollowers();
    var self = this;
    var aid = followers.reduce(function (s, f) { return s + self.friendPower(f); }, 0) * 0.35;
    return Math.max(0.05, Math.min(0.95, (myPow + aid) / Math.max(1, num(h.power, 1)) * 0.6));
  };

  proto.fr3HosFight = function (hId) {
    var h = this.fr3HosById(hId);
    if (!h) return false;
    var chance = this.fr3HosFightChance(h);
    var ok = Math.random() < chance;
    var H = this.fr3HosState();
    var self = this;

    if (ok) {
      h.defeatedCount = num(h.defeatedCount, 0) + 1;
      h.defeated = true;
      H.defeated = num(H.defeated, 0) + 1;
      // 奪其裝備
      var slots = ['mainhand', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring_left', 'ring_right'];
      var got = 0;
      slots.forEach(function (s) {
        if (h.equipment && h.equipment[s]) { if (self.fr2PushToPlayerBag(h.equipment[s])) { h.equipment[s] = null; got += 1; } }
      });
      H.totalLoot = num(H.totalLoot, 0) + got;
      h.favor = Math.min(0, num(h.favor, 0));
      this.fr3HosLog('⚔️ 你擊敗了【' + h.name + '】！（勝率 ' + Math.round(chance * 100) + '%）' +
        (got ? ' 奪得裝備 ' + got + ' 件。' : '') + '　可選擇「招降」或「誅殺」。', 'gain');
      if (typeof this.fr2MailPush === 'function') {
        this.fr2MailPush({ tpl: 'm_report', name: h.name, body: '聽聞你擊敗了【' + h.name + '】，江湖上都在傳。' , attach: [] });
      }
    } else {
      var root = this.charSys.rootState;
      var loss = Math.round(num(root.gold, 0) * 0.02);
      root.gold = Math.max(0, num(root.gold, 0) - loss);
      H.totalLost = num(H.totalLost, 0) + loss;
      var followers = this.friendFollowers();
      if (followers.length) {
        var v = followers[Math.floor(Math.random() * followers.length)];
        v.status = 'injured';
        v.injuredLeft = Math.max(num(v.injuredLeft, 0), rndInt(3, 7));
      }
      this.fr3HosLog('💢 挑戰失敗！【' + h.name + '】技高一籌，你損失 ' + loss.toLocaleString() + ' 兩，同行好友負傷。', 'system');
    }
    this.requestRender();
    return ok;
  };

  proto.fr3HosRecruit = function (hId) {
    var h = this.fr3HosById(hId);
    if (!h) return false;
    if (!h.defeated) { this.log('⚠️ 必須先擊敗【' + h.name + '】才能招降。', 'system'); return false; }
    var cost = Math.round(num(C3.HOSTILE_RECRUIT_COST, 3000) * (1 + num(h.lv, 1) * 0.02));
    if (num(this.charSys.rootState.gold, 0) < cost) { this.log('⚠️ 招降需 ' + cost.toLocaleString() + ' 兩。', 'system'); return false; }
    if (this.friendAll().length >= this.friendSlots()) { this.log('⚠️ 好友名額已滿，無法招降。', 'system'); return false; }

    this.charSys.rootState.gold -= cost;
    var H = this.fr3HosState();
    var S = this.friendState();

    var f = this.friendMake({ id: h.celebId || h.id, name: h.name, icon: h.icon, lv: h.lv }, { lv: h.lv, role: h.role });
    if (!f) return false;
    f.celebId = h.celebId; f.title = h.title; f.tier = h.tier;
    f.society = h.society; f.socName = h.socName; f.socIcon = h.socIcon;
    f.favor = num(C3.HOSTILE_RECRUIT_FAVOR, 30);
    f.stats = h.stats || f.stats;
    f.equipment = h.equipment || f.equipment;
    f.bag = h.bag || [];
    f.skills = h.skills || f.skills;
    f.formerHostile = true;
    var st = (F.HOME_STYLES || [])[0];
    f.home = { lv: 1, exp: 0, decor: 0, style: st ? st.id : 'bamboo', styleName: st ? st.name : '竹林幽居', styleIcon: st ? st.icon : '🎋', mats: {}, lastVisit: -999, givers: 0 };
    var d = this.friendDerived(f);
    f.currentHp = d.maxHp; f.currentMp = d.maxMp;

    S.list.push(f);
    H.list = H.list.filter(function (x) { return x.id !== hId; });
    H.recruited = num(H.recruited, 0) + 1;
    this.fr3HosLog('🕊️ 【' + h.name + '】被你折服，重回好友之列（好感 ' + f.favor + '，花費 ' + cost.toLocaleString() + ' 兩）。', 'gain');
    this.requestRender();
    return true;
  };

  proto.fr3HosKill = function (hId) {
    var h = this.fr3HosById(hId);
    if (!h) return false;
    if (!h.defeated) { this.log('⚠️ 必須先擊敗【' + h.name + '】。', 'system'); return false; }
    var H = this.fr3HosState();
    var self = this;
    var gold = Math.round(num(h.maxSpend, 5000) * 0.3) + num(h.lv, 1) * 300;
    this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) + gold;
    var got = 0;
    (h.bag || []).forEach(function (it) { if (it && self.fr2PushToPlayerBag(it)) got += 1; });
    H.list = H.list.filter(function (x) { return x.id !== hId; });
    H.killed = num(H.killed, 0) + 1;
    H.totalLoot = num(H.totalLoot, 0) + got;
    this.fr3HosLog('🗡️ 你誅殺了【' + h.name + '】，得紋銀 ' + gold.toLocaleString() + ' 兩' +
      (got ? '、遺物 ' + got + ' 件' : '') + '。江湖上少了一個禍害。', 'wealth');
    this.requestRender();
    return true;
  };

  /* ══════════ 覆寫斷交：有機率直接結仇 ══════════ */
  var _friendDismiss = proto.friendDismiss;
  proto.friendDismiss = function (id) {
    var f = this.friendById(id);
    if (!f) return false;
    var willHate = (num(f.favor, 0) <= 40) && (Math.random() < num(C3.HOSTILE_DISMISS_CHANCE, 0.35));
    if (!willHate) return _friendDismiss.call(this, id);

    // 裝備先收回，再反目
    var root = this.charSys.rootState;
    if (!Array.isArray(root.equipBag)) root.equipBag = [];
    var slots = ['mainhand', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring_left', 'ring_right'];
    slots.forEach(function (s) { if (f.equipment && f.equipment[s]) { root.equipBag.push(f.equipment[s]); f.equipment[s] = null; } });
    var ok = this.fr3HostileFromFriend(f, null);
    if (ok) this.fr3HosLog('💔 你與【' + f.name + '】斷了交情 —— 他記恨在心，成了你的仇敵。', 'system');
    return ok || _friendDismiss.call(this, id);
  };

  /* ══════════ 迎擊候選（UI 用） ══════════ */
  proto.fr3HosHelpers = function () {
    var self = this;
    return this.friendAll().filter(function (f) {
      return !f.retired && f.status !== 'injured' && num(f.currentHp, 1) > 0;
    }).map(function (f) {
      return { id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), power: self.friendPower(f), following: !!f.following };
    }).sort(function (a, b) { return b.power - a.power; });
  };

  /* ══════════ 啟動 ══════════ */
  proto.fr3HosBootOnce = function () {
    if (this._fr3HosBooted) return;
    this._fr3HosBooted = true;
    try { this.fr3HosState(); } catch (e) { /* 忽略 */ }
    console.log('[friendHostile] ✓ 叛變／仇敵系統已啟動');
  };

  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.fr3HosBootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  /* ══════════ 報告 ══════════ */
  proto.fr3HosReport = function () {
    var H = this.fr3HosState();
    var S = this.friendState();
    var self = this;
    var ticks = num(S.ticks, 0);
    var myPow = 0;
    try { myPow = num(this.charSys.getDerivedStatsForChar(this.charSys.state).powerScore, 0); } catch (e) { /* 忽略 */ }

    return {
      list: H.list.map(function (h) {
        return {
          id: h.id, name: h.name, icon: h.icon, title: h.title, tier: h.tier,
          socName: h.socName, socIcon: h.socIcon, lv: num(h.lv, 1), power: num(h.power, 0),
          reasonName: h.reasonName, reasonIcon: h.reasonIcon, reasonDesc: h.reasonDesc,
          defeated: !!h.defeated, defeatedCount: num(h.defeatedCount, 0),
          raidLeft: num(h.raidLeft, 0), raidIn: Math.max(0, num(h.raidAt, 0) - ticks),
          stolen: num(h.stolen, 0),
          winChance: Math.round(self.fr3HosFightChance(h) * 100),
          recruitCost: Math.round(num(C3.HOSTILE_RECRUIT_COST, 3000) * (1 + num(h.lv, 1) * 0.02)),
          killGold: Math.round(num(h.maxSpend, 5000) * 0.3) + num(h.lv, 1) * 300,
          bagCount: (h.bag || []).length,
          equipCount: (function () { var n = 0; var e = h.equipment || {}; Object.keys(e).forEach(function (k) { if (e[k]) n += 1; }); return n; })()
        };
      }),
      stats: {
        count: H.list.length, defeated: num(H.defeated, 0), recruited: num(H.recruited, 0),
        killed: num(H.killed, 0), raids: num(H.raids, 0), repelled: num(H.repelled, 0),
        totalLost: num(H.totalLost, 0), totalLoot: num(H.totalLoot, 0)
      },
      log: H.log.slice(0, 40),
      helpers: this.fr3HosHelpers(),
      myPower: myPow,
      riskFriends: S.list.filter(function (f) { return num(f.favor, 0) <= 20 && !f.retired; })
        .map(function (f) { return { id: f.id, name: f.name, icon: f.icon, favor: num(f.favor, 0) }; }),
      maxHostile: num(C3.HOSTILE_MAX, 12)
    };
  };

  window.HY.FriendHostile = { version: '1.0' };
  console.log('[friendHostile] ✓ 已載入（叛變／仇敵／打劫／招降）');
})();