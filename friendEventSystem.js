// js/friendEventSystem.js (v1)
// ⭐ 好友系統 v2：事件層（比武大會／互助任務／江湖求救／好友來訪／名宿退隱／專屬對話）
// ⚠️ 載入順序：friendPartySystem.js 之後、friendSocialSystem.js 之前
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendEventSystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendEventSystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var C2 = F.CONFIG2 || {};

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid(p) { return (p || 'ev') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function tmpl(s, m) { return String(s || '').replace(/\{(\w+)\}/g, function (_, k) { return (m && m[k] !== undefined) ? m[k] : ''; }); }
  function TICKS() { try { return num(window.HY.game.townSys.friendState().ticks, 0); } catch (e) { return 0; } }

  /* ══════════════════════════════════════════════════════
     比武大會
     ══════════════════════════════════════════════════════ */
  proto.fr2TourneyDefault = function () {
    return { nextAt: 0, last: null, history: [], bets: [], wins: {}, auto: true };
  };
  proto.fr2TourneyState = function () {
    var S = this.friendState();
    if (!S.tournament || typeof S.tournament !== 'object') S.tournament = this.fr2TourneyDefault();
    var X = S.tournament, d = this.fr2TourneyDefault(), k;
    for (k in d) { if (X[k] === undefined) X[k] = d[k]; }
    if (!Array.isArray(X.history)) X.history = [];
    if (!Array.isArray(X.bets)) X.bets = [];
    if (!X.wins || typeof X.wins !== 'object') X.wins = {};
    return X;
  };

  proto.fr2TourneyEligible = function () {
    var self = this;
    return this.friendAll().filter(function (f) {
      return !f.retired && f.status !== 'injured' && num(f.currentHp, 1) > 0;
    }).sort(function (a, b) { return self.fr2TourneyScore(b) - self.fr2TourneyScore(a); });
  };

  proto.fr2TourneyScore = function (f) {
    return this.friendPower(f) * (1 + num(f.lv, 1) * 0.002);
  };

  /** 賠率：排名越前越低 */
  proto.fr2TourneyOdds = function (f) {
    var list = this.fr2TourneyEligible();
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === f.id) { idx = i; break; }
    if (idx < 0) return num(C2.TOURNEY_ODDS_MAX, 8);
    var pct = list.length > 1 ? idx / (list.length - 1) : 0;
    return Math.round(clamp(num(C2.TOURNEY_ODDS_MIN, 1.2) + pct * (num(C2.TOURNEY_ODDS_MAX, 8) - num(C2.TOURNEY_ODDS_MIN, 1.2)), 1.2, 8) * 100) / 100;
  };

  proto.fr2TourneyBet = function (targetId, amount) {
    var X = this.fr2TourneyState();
    var f = this.friendById(targetId);
    if (!f) return false;
    if (f.retired || f.status === 'injured') { this.log('⚠️ 【' + f.name + '】狀態不佳，無法押注。', 'system'); return false; }
    var amt = Math.floor(num(amount, 0));
    if (amt < num(C2.TOURNEY_BET_MIN, 200)) { this.log('⚠️ 最低押注 ' + num(C2.TOURNEY_BET_MIN, 200) + ' 兩。', 'system'); return false; }
    if (amt > num(C2.TOURNEY_BET_MAX, 20000)) amt = num(C2.TOURNEY_BET_MAX, 20000);
    if (num(this.charSys.rootState.gold, 0) < amt) { this.log('⚠️ 銀兩不足。', 'system'); return false; }
    this.charSys.rootState.gold -= amt;
    var odds = this.fr2TourneyOdds(f);
    X.bets.push({ id: uid('bet'), targetId: targetId, targetName: f.name, amount: amt, odds: odds, settled: false, win: false, payout: 0 });
    this.friendLog('🎲 你押注【' + f.name + '】' + amt.toLocaleString() + ' 兩（賠率 ' + odds + ' 倍），等待下一場比武大會。', 'wealth');
    return true;
  };

  proto.fr2TourneyStart = function () {
    var X = this.fr2TourneyState();
    var S = this.friendState();
    var self = this;
    var list = this.fr2TourneyEligible();
    if (list.length < num(C2.TOURNEY_MIN, 4)) return null;

    var size = Math.min(num(C2.TOURNEY_SIZE, 8), list.length);
    var seeds = list.slice(0, size);

    // 淘汰賽模擬
    var rounds = [], cur = seeds.map(function (f) { return { f: f, id: f.id }; });
    var r = 1;
    while (cur.length > 1) {
      var next = [], rl = { round: r, matches: [] };
      for (var i = 0; i < cur.length; i += 2) {
        if (i + 1 >= cur.length) { next.push(cur[i]); rl.matches.push({ a: cur[i].f.name, b: '（輪空）', win: cur[i].f.name }); continue; }
        var a = cur[i].f, b = cur[i + 1].f;
        var sa = this.fr2TourneyScore(a) * (0.82 + Math.random() * 0.36);
        var sb = this.fr2TourneyScore(b) * (0.82 + Math.random() * 0.36);
        var w = sa >= sb ? a : b, l = sa >= sb ? b : a;
        rl.matches.push({ a: a.name, b: b.name, win: w.name, scoreA: Math.round(sa), scoreB: Math.round(sb) });
        next.push({ f: w, id: w.id });
      }
      rounds.push(rl);
      cur = next; r += 1;
    }
    var champ = cur.length ? cur[0].f : null;
    if (!champ) return null;

    // 冠軍獎勵
    var gold = num(C2.TOURNEY_CHAMP_GOLD, 8000);
    champ.favor = Math.min(100, num(champ.favor, 0) + 10);
    champ.tourneyWins = num(champ.tourneyWins, 0) + 1;
    X.wins[champ.id] = num(X.wins[champ.id], 0) + 1;
    this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) + Math.round(gold * 0.25);
    if (typeof this.fr2GrantTitle === 'function') this.fr2GrantTitle(champ, 't_champ');
    var runner = rounds.length ? null : null;

    // 結算押注
    var payoutTotal = 0;
    X.bets.forEach(function (b) {
      if (b.settled) return;
      b.settled = true;
      if (b.targetId === champ.id) {
        b.win = true;
        b.payout = Math.round(b.amount * b.odds);
        payoutTotal += b.payout;
      }
    });
    if (payoutTotal > 0) {
      this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) + payoutTotal;
      this.friendLog('🎉 押注中獎！共得 ' + payoutTotal.toLocaleString() + ' 兩紋銀。', 'wealth');
    } else {
      var lost = X.bets.filter(function (b) { return !b.win; });
      if (lost.length) this.friendLog('😢 押注落空，共損失 ' + lost.reduce(function (s, b) { return s + b.amount; }, 0).toLocaleString() + ' 兩。', 'system');
    }
    X.bets = X.bets.slice(-10);

    var result = {
      id: uid('tny'), champId: champ.id, champName: champ.name, champIcon: champ.icon,
      champLv: num(champ.lv, 1), rounds: rounds, entrants: seeds.map(function (f) { return f.name; }),
      at: Date.now(), tick: num(S.ticks, 0), payout: payoutTotal
    };
    X.last = result;
    X.history.unshift(result);
    X.history = X.history.slice(0, 12);
    this.friendLog('🎪 比武大會落幕！本屆盟主：【' + champ.name + '】（Lv.' + num(champ.lv, 1) +
      '，戰力 ' + this.friendPower(champ).toLocaleString() + '），獎金 ' + gold.toLocaleString() + ' 兩。', 'gain');

    if (typeof this.fr2MailPush === 'function') {
      this.fr2MailPush({
        tpl: 'm_season', name: '比武大會',
        body: '本屆比武大會由【' + champ.name + '】奪魁。這份彩金，請你收下。',
        attach: [{ kind: 'gold', amount: Math.round(gold * 0.15) }]
      });
    }
    return result;
  };

  proto.fr2TourneyTick = function () {
    var X = this.fr2TourneyState();
    var S = this.friendState();
    if (!X.auto) return;
    var iv = num(C2.TOURNEY_INTERVAL, 40);
    if (!X.nextAt) X.nextAt = num(S.ticks, 0) + iv;
    if (num(S.ticks, 0) < X.nextAt) return;
    X.nextAt = num(S.ticks, 0) + iv;
    this.fr2TourneyStart();
  };

  /* ══════════════════════════════════════════════════════
     互助任務
     ══════════════════════════════════════════════════════ */
  proto.fr2QuestDefault = function () { return { list: [], done: 0, nextAt: 0, auto: true }; };
  proto.fr2QuestState = function () {
    var S = this.friendState();
    if (!S.quests || typeof S.quests !== 'object') S.quests = this.fr2QuestDefault();
    var Q = S.quests, d = this.fr2QuestDefault(), k;
    for (k in d) { if (Q[k] === undefined) Q[k] = d[k]; }
    if (!Array.isArray(Q.list)) Q.list = [];
    return Q;
  };

  proto.fr2QuestSpawn = function () {
    var Q = this.fr2QuestState();
    var S = this.friendState();
    var self = this;
    var max = num(C2.QUEST_MAX, 3);
    if (Q.list.length >= max) return null;
    var pool = this.friendAll().filter(function (f) { return !f.retired; });
    if (!pool.length) return null;
    var f = pick(pool);
    var tpl = pick(F.QUEST_TEMPLATES || []);
    if (!tpl) return null;
    var dur = rndInt(num(C2.QUEST_DURATION[0], 4), num(C2.QUEST_DURATION[1], 10));
    var q = {
      id: uid('q'), friendId: f.id, friendName: f.name, friendIcon: f.icon,
      tplId: tpl.id, type: tpl.type, icon: tpl.icon,
      title: tmpl(tpl.title, { name: f.name }), desc: tpl.desc,
      duration: dur, left: dur, assigned: null, assignedName: null, status: 'open',
      reward: {
        gold: Math.round(num(tpl.gold, 600) * num(C2.QUEST_GOLD_MUL, 1) * (1 + this.fr2TownLv() * 0.03)),
        favor: num(tpl.favor, num(C2.QUEST_FAVOR, 6)),
        expMul: num(tpl.expMul, num(C2.QUEST_EXP_MUL, 0.25))
      },
      at: Date.now()
    };
    Q.list.push(q);
    this.friendLog('🎯 【' + f.name + '】發布求助：' + q.title + '（' + q.type + '）', 'time');
    return q;
  };

  proto.fr2QuestTick = function () {
    var Q = this.fr2QuestState();
    var S = this.friendState();
    if (!Q.auto) return;
    var iv = num(C2.QUEST_INTERVAL, 10);
    if (!Q.nextAt) Q.nextAt = num(S.ticks, 0) + iv;
    if (num(S.ticks, 0) < Q.nextAt) return;
    Q.nextAt = num(S.ticks, 0) + iv;
    this.fr2QuestSpawn();
  };

  proto.fr2QuestAssign = function (questId, who) {
    var Q = this.fr2QuestState();
    var self = this;
    var q = null;
    Q.list.forEach(function (x) { if (x.id === questId) q = x; });
    if (!q || q.status !== 'open') return false;
    if (who === 'self') {
      q.assigned = 'self'; q.assignedName = '你';
    } else {
      var f = this.friendById(who);
      if (!f) return false;
      if (f.retired || f.status === 'injured') { this.log('⚠️ 【' + f.name + '】無法前往。', 'system'); return false; }
      if (num(f.questBusy, 0) > 0 || this.fr2ExpRunOf(f.id) || f.following) { this.log('⚠️ 【' + f.name + '】正在忙。', 'system'); return false; }
      f.questBusy = q.duration;
      f.questId = q.id;
      q.assigned = f.id; q.assignedName = f.name;
    }
    q.status = 'doing';
    this.friendLog('📤 已派『' + q.assignedName + '』前往處理：' + q.title, 'time');
    return true;
  };

  /** 由 fr2BusyStep 在好友辦事完成時呼叫 */
  proto.fr2QuestComplete = function (f) {
    var Q = this.fr2QuestState();
    var q = null;
    Q.list.forEach(function (x) { if (x.id === f.questId && x.status === 'doing') q = x; });
    if (!q) return false;
    return this.fr2QuestResolve(q);
  };

  proto.fr2QuestResolve = function (q) {
    var Q = this.fr2QuestState();
    var self = this;
    var owner = this.friendById(q.friendId);
    var ok = true;
    q.status = ok ? 'done' : 'failed';
    var gold = num(q.reward.gold, 600);
    this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) + gold;
    if (owner) {
      owner.favor = Math.min(100, num(owner.favor, 0) + num(q.reward.favor, 6));
      this.friendGainExp(owner, Math.round(num(owner.maxExp, 100) * num(q.reward.expMul, 0.25)));
    }
    // 派去的好友也得經驗
    if (q.assigned && q.assigned !== 'self') {
      var runner = this.friendById(q.assigned);
      if (runner) { this.friendGainExp(runner, Math.round(num(runner.maxExp, 100) * num(q.reward.expMul, 0.25) * 0.6)); runner.questId = null; }
    }
    Q.done = num(Q.done, 0) + 1;
    this.friendLog('✅ 互助任務完成：' + q.title + '，得紋銀 ' + gold.toLocaleString() + ' 兩、' +
      (owner ? '【' + owner.name + '】好感 +' + num(q.reward.favor, 6) : ''), 'gain');
    if (typeof this.fr2MailPush === 'function' && owner) {
      this.fr2MailPush({ tpl: 'm_thanks', name: owner.name, body: '多謝你出手相助，此事我記下了。', attach: [] });
    }
    Q.list = Q.list.filter(function (x) { return x.id !== q.id; });
    return true;
  };

  /* ══════════════════════════════════════════════════════
     江湖求救
     ══════════════════════════════════════════════════════ */
  proto.fr2RescueDefault = function () { return { active: [], done: 0, failed: 0 }; };
  proto.fr2RescueState = function () {
    var S = this.friendState();
    if (!S.rescue || typeof S.rescue !== 'object') S.rescue = this.fr2RescueDefault();
    var R = S.rescue, d = this.fr2RescueDefault(), k;
    for (k in d) { if (R[k] === undefined) R[k] = d[k]; }
    if (!Array.isArray(R.active)) R.active = [];
    return R;
  };

  proto.fr2RescueTick = function () {
    var R = this.fr2RescueState();
    var S = this.friendState();
    var self = this;
    var chance = num(C2.RESCUE_CHANCE, 0.01);
    var win = num(C2.RESCUE_WINDOW, 10);

    // 生成
    this.friendAll().forEach(function (f) {
      if (f.retired || f.following) return;
      var dup = false;
      R.active.forEach(function (r) { if (r.friendId === f.id) dup = true; });
      if (dup) return;
      if (Math.random() >= chance) return;
      var tpl = pick(F.RESCUE_TEMPLATES || []);
      if (!tpl) return;
      R.active.push({
        id: uid('res'), friendId: f.id, friendName: f.name, friendIcon: f.icon, friendLv: num(f.lv, 1),
        tplId: tpl.id, name: tpl.name, icon: tpl.icon,
        desc: tmpl(tpl.desc, { place: f.place || '江湖' }),
        left: win, at: Date.now()
      });
      self.friendLog('🚨 緊急！【' + f.name + '】' + tpl.name + '：' + tmpl(tpl.desc, { place: f.place || '江湖' }), 'system');
    });

    // 倒數
    R.active.slice().forEach(function (r) {
      r.left = num(r.left, 0) - 1;
      if (r.left <= 0) {
        var f = self.friendById(r.friendId);
        if (f) {
          f.status = 'injured';
          f.injuredLeft = Math.max(num(f.injuredLeft, 0), rndInt(5, 10));
          f.favor = Math.max(0, num(f.favor, 0) + num(C2.RESCUE_FAIL_FAVOR, -14));
          // 掉落一件裝備
          var slots = ['mainhand', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring_left', 'ring_right'];
          var lost = null;
          for (var i = 0; i < slots.length; i++) {
            if (f.equipment && f.equipment[slots[i]]) { lost = slots[i]; break; }
          }
          if (lost) f.equipment[lost] = null;
        }
        self.friendLog('💔 你沒能及時馳援，【' + r.friendName + '】' + r.name + '，重傷而歸、好感大減。', 'system');
        R.failed = num(R.failed, 0) + 1;
        R.active = R.active.filter(function (x) { return x.id !== r.id; });
      }
    });
    void S;
  };

  proto.fr2RescueResolve = function (rescueId, mode) {
    var R = this.fr2RescueState();
    var self = this;
    var r = null;
    R.active.forEach(function (x) { if (x.id === rescueId) r = x; });
    if (!r) return false;
    var f = this.friendById(r.friendId);
    if (!f) { R.active = R.active.filter(function (x) { return x.id !== rescueId; }); return false; }

    var chance = 0.62;
    if (mode === 'self') {
      var myPow = 0, fp = this.friendPower(f);
      try { myPow = num(this.charSys.getDerivedStatsForChar(this.charSys.state).powerScore, 0); } catch (e) { /* 忽略 */ }
      chance += num(C2.RESCUE_SELF_BONUS, 0.10) + clamp((myPow - fp) / Math.max(1, fp) * 0.15, -0.2, 0.2);
    } else {
      var helper = this.friendById(mode);
      if (!helper || helper.retired || helper.status === 'injured') { this.log('⚠️ 無法派此人前往。', 'system'); return false; }
      chance += num(C2.RESCUE_FRIEND_BONUS, 0.06) + clamp((this.friendPower(helper) - this.friendPower(f)) / Math.max(1, this.friendPower(f)) * 0.12, -0.2, 0.2);
      helper.favor = Math.min(100, num(helper.favor, 0) + 3);
      this.friendGainExp(helper, Math.round(num(helper.maxExp, 100) * 0.12));
    }
    var ok = Math.random() < clamp(chance, 0.15, 0.96);

    if (ok) {
      var gold = Math.round(num(C2.RESCUE_WIN_GOLD, 2500) * (1 + num(f.lv, 1) * 0.02));
      this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) + gold;
      f.favor = Math.min(100, num(f.favor, 0) + num(C2.RESCUE_WIN_FAVOR, 15));
      f.rescues = num(f.rescues, 0) + 1;
      f.currentHp = this.friendDerived(f).maxHp;
      this.friendLog('🛡️ 馳援成功！【' + f.name + '】脫險，感激涕零（好感 +' + num(C2.RESCUE_WIN_FAVOR, 15) +
        '），謝禮 ' + gold.toLocaleString() + ' 兩。', 'gain');
      if (typeof this.fr2GrantTitle === 'function') this.fr2GrantTitle(f, 't_rescue');
      if (typeof this.fr2MailPush === 'function') {
        this.fr2MailPush({ tpl: 'm_thanks', name: f.name, body: '若非你及時趕到，我今日便交待在那裡了。此恩必報。', attach: [{ kind: 'gold', amount: Math.round(gold * 0.2) }] });
      }
    } else {
      f.status = 'injured';
      f.injuredLeft = Math.max(num(f.injuredLeft, 0), rndInt(4, 9));
      f.favor = Math.max(0, num(f.favor, 0) - 4);
      this.friendLog('⚠️ 馳援失敗！【' + f.name + '】仍受重傷，但至少保住性命（好感 -4）。', 'system');
    }
    R.active = R.active.filter(function (x) { return x.id !== rescueId; });
    if (ok) R.done = num(R.done, 0) + 1;
    void self;
    return true;
  };

  /* ══════════════════════════════════════════════════════
     好友來訪
     ══════════════════════════════════════════════════════ */
  proto.fr2VisitDefault = function () { return { active: [], total: 0, nextAt: 0 }; };
  proto.fr2VisitState = function () {
    var S = this.friendState();
    if (!S.visits || typeof S.visits !== 'object') S.visits = this.fr2VisitDefault();
    var V = S.visits, d = this.fr2VisitDefault(), k;
    for (k in d) { if (V[k] === undefined) V[k] = d[k]; }
    if (!Array.isArray(V.active)) V.active = [];
    return V;
  };

  proto.fr2VisitTick = function () {
    var V = this.fr2VisitState();
    var self = this;
    // 到期移除
    V.active.slice().forEach(function (v) {
      v.left = num(v.left, 0) - 1;
      if (v.left <= 0) {
        V.active = V.active.filter(function (x) { return x.id !== v.id; });
      }
    });
    if (V.active.length >= 3) return;
    this.friendAll().forEach(function (f) {
      if (f.retired) return;
      var dup = false;
      V.active.forEach(function (v) { if (v.friendId === f.id) dup = true; });
      if (dup) return;
      if (Math.random() >= num(C2.VISIT_CHANCE, 0.018)) return;
      var tpl = pick(F.VISIT_TEMPLATES || []);
      if (!tpl) return;
      var gift = Math.round((300 + num(f.lv, 1) * 60) * (1 + self.fr2TownLv() * 0.05));
      self.charSys.rootState.gold = num(self.charSys.rootState.gold, 0) + gift;
      f.favor = Math.min(100, num(f.favor, 0) + 2);
      V.active.push({
        id: uid('vis'), friendId: f.id, friendName: f.name, friendIcon: f.icon,
        tplId: tpl.id, name: tpl.name, icon: tpl.icon, desc: tpl.desc,
        left: num(C2.VISIT_TICKS, 8), gift: gift, appeal: num(C2.VISIT_APPEAL, 8), income: num(C2.VISIT_INCOME, 0.02)
      });
      V.total = num(V.total, 0) + 1;
      self.friendLog('🏡 【' + f.name + '】' + tpl.name + '：' + tpl.desc + '（留禮 ' + gift.toLocaleString() + ' 兩）', 'wealth');
    });
  };

  /* ══════════════════════════════════════════════════════
     名宿退隱
     ══════════════════════════════════════════════════════ */
  proto.fr2RetireDefault = function () { return { list: [], count: 0 }; };
  proto.fr2RetireState = function () {
    var S = this.friendState();
    if (!S.retired || typeof S.retired !== 'object') S.retired = this.fr2RetireDefault();
    var R = S.retired, d = this.fr2RetireDefault(), k;
    for (k in d) { if (R[k] === undefined) R[k] = d[k]; }
    if (!Array.isArray(R.list)) R.list = [];
    return R;
  };

  proto.fr2RetireTick = function () {
    if (!C2.RETIRE_ENABLED) return;
    var self = this;
    var S = this.friendState();
    var lvCap = num(C2.RETIRE_AT_LV, 150), tickCap = num(C2.RETIRE_AT_TICKS, 1200);
    this.friendAll().slice().forEach(function (f) {
      if (f.retired || f.following) return;
      var byLv = num(f.lv, 1) >= lvCap;
      var byTick = num(f.activeTicks, 0) >= tickCap;
      if (!byLv && !byTick) return;
      if (S.list.length >= self.friendSlots() + 3) return;   // 名額滿則暫緩
      self.fr2Retire(f);
    });
  };

  proto.fr2Retire = function (f) {
    var R = this.fr2RetireState();
    var S = this.friendState();
    var self = this;
    if (!f || f.retired) return false;

    f.retired = true;
    f.retiredAt = Date.now();
    f.retireTitle = pick(F.RETIRE_TITLES || ['名宿']);
    f.status = 'retired';
    f.actionText = '已退隱，在鎮上頤養天年（仍提供名宿加成）';
    if (typeof this.fr2GrantTitle === 'function') this.fr2GrantTitle(f, 't_retire');

    R.list.push({
      id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), title: f.retireTitle,
      power: this.friendPower(f), sect: f.sect, at: Date.now(),
      stats: { kills: Math.round(num(f.kills, 0)), clears: num(f.clears, 0), drops: num(f.drops, 0) }
    });
    R.count = num(R.count, 0) + 1;

    // 收弟子：繼承部分功力
    var inh = clamp(num(C2.RETIRE_INHERIT, 0.5), 0.1, 0.9);
    var lv = Math.max(1, Math.round(num(f.lv, 1) * inh));
    var disciple = this.friendMake({ id: 'disc_' + f.id, name: f.name + '之徒', icon: '🧑‍🎓', lv: lv }, { lv: lv });
    disciple.masterId = f.id;
    disciple.persona = f.persona;
    disciple.role = f.role;
    ['con', 'str', 'agi', 'int'].forEach(function (k) {
      disciple.stats[k] = Math.round(num(f.stats[k], 10) * inh);
    });
    disciple.favor = Math.min(100, Math.round(num(f.favor, 0) * 0.6));
    disciple.inheritedFrom = f.name;
    disciple.isDisciple = true;
    var d = this.friendDerived(disciple);
    disciple.currentHp = d.maxHp; disciple.currentMp = d.maxMp;
    S.list.push(disciple);
    S.stats.recruited += 1;

    // 傳功：師傅的一件裝備給弟子
    var slots = ['mainhand', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring_left', 'ring_right'];
    for (var i = 0; i < slots.length; i++) {
      if (f.equipment && f.equipment[slots[i]]) {
        disciple.bag.push(f.equipment[slots[i]]);
        f.equipment[slots[i]] = null;
        break;
      }
    }
    if (typeof this.fr2BondMake === 'function' && Math.random() < 0.6) {
      this.fr2BondMake('master', f.id, disciple.id, true);
    }

    this.friendLog('🏮 【' + f.name + '】功成身退，受封「' + f.retireTitle + '」，並收【' + disciple.name +
      '】（Lv.' + lv + '）為徒，薪火相傳。', 'system');
    if (typeof this.fr2MailPush === 'function') {
      this.fr2MailPush({
        tpl: 'm_greet', name: f.name,
        body: '老朽年事已高，欲退隱山林。這點家當留給你，江湖就交給年輕人了。',
        attach: [{ kind: 'gold', amount: 3000 + num(f.lv, 1) * 100 }]
      });
    }
    void self;
    return true;
  };

  /** 名宿被動加成（小鎮收入） */
  proto.fr2LegacyMul = function () {
    var R = this.fr2RetireState();
    return 1 + num(R.list.length, 0) * num(C2.RETIRE_LEGACY_BONUS, 0.02);
  };

  var _getGlobalMul2 = proto.getGlobalMul;
  proto.getGlobalMul = function () {
    var m = _getGlobalMul2.call(this);
    var v = 1;
    try { v = this.fr2LegacyMul(); } catch (e) { /* 忽略 */ }
    return m * v;
  };

  /* ══════════════════════════════════════════════════════
     專屬對話
     ══════════════════════════════════════════════════════ */
  proto.fr2ChatTick = function () {
    var S = this.friendState();
    var iv = num(C2.CHAT_INTERVAL, 4);
    if (!S.chatAt || num(S.ticks, 0) >= S.chatAt) {
      S.chatAt = num(S.ticks, 0) + iv;
      var self = this;
      this.friendAll().forEach(function (f) { f.chatLine = self.fr2ChatLine(f); });
    }
  };

  proto.fr2ChatLine = function (f) {
    var L = F.LINES || {};
    var key;
    if (f.retired) key = 'retired';
    else if (f.status === 'injured') key = 'injured';
    else if (f.following) key = 'following';
    else if (f.status === 'expedition') key = 'expedition';
    else if (num(f.favor, 0) >= 75) key = 'highFavor';
    else if (num(f.favor, 0) < 25) key = 'lowFavor';
    else key = f.status || 'social';
    var pool = L[key] || L.social || ['……'];
    return pick(pool);
  };

  window.HY.FriendEvent = { version: '1.0', quests: (F.QUEST_TEMPLATES || []).length, rescues: (F.RESCUE_TEMPLATES || []).length };
  console.log('[friendEvent] ✓ 已載入（比武大會／互助任務／求救／來訪／退隱／對話）');
})();