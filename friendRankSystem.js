// js/friendRankSystem.js (v1)
// ⭐ 好友系統 v2：排行榜（7 大榜）／威望／賽季結算 ＋ friendReport 整合
// ⚠️ 載入順序：friendSocialSystem.js 之後（最後一支系統檔）
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendRankSystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendRankSystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var C2 = F.CONFIG2 || {};
  var BOARDS = F.RANK_BOARDS || [];

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function uid(p) { return (p || 'rk') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  /* ══════════ 狀態 ══════════ */
  proto.fr2RankDefault = function () {
    return {
      snap: {}, lastAt: 0, season: 1, seasonStart: 0,
      seasonHistory: [], seasonPoints: {}, lastSettle: null
    };
  };
  proto.fr2RankState = function () {
    var S = this.friendState();
    if (!S.rank || typeof S.rank !== 'object') S.rank = this.fr2RankDefault();
    var R = S.rank, d = this.fr2RankDefault(), k;
    for (k in d) { if (R[k] === undefined) R[k] = d[k]; }
    if (!R.snap || typeof R.snap !== 'object') R.snap = {};
    if (!Array.isArray(R.seasonHistory)) R.seasonHistory = [];
    if (!R.seasonPoints || typeof R.seasonPoints !== 'object') R.seasonPoints = {};
    return R;
  };

  /* ══════════ 威望 ══════════ */
  proto.fr2Fame = function (f) {
    if (!f) return 0;
    var tb = (typeof this.fr2TitleBonusOf === 'function') ? this.fr2TitleBonusOf(f) : { fame: 0 };
    var power = this.friendPower(f);
    var kills = num(f.kills, 0);
    var clears = num(f.clears, 0);
    var drops = num(f.drops, 0);
    var bonds = (typeof this.fr2BondCountOf === 'function') ? this.fr2BondCountOf(f.id) : 0;
    var tourney = num(f.tourneyWins, 0);
    var rescues = num(f.rescues, 0);
    var score =
      num(f.lv, 1) * 12 +
      power / 100 +
      kills * 0.6 +
      clears * 90 +
      drops * 2.5 +
      bonds * 60 +
      tourney * 800 +
      rescues * 260 +
      num(f.favor, 0) * 4 +
      num(tb.fame, 0);
    if (f.retired) score *= 0.9;
    return Math.round(score);
  };

  proto.fr2PlayerFame = function () {
    var p = 0, lv = 1;
    try { lv = this.fr2PlayerLv(); p = num(this.charSys.getDerivedStatsForChar(this.charSys.state).powerScore, 0); } catch (e) { /* 忽略 */ }
    var clears = 0;
    try { clears = num(this.fr2ExpState().clears, 0); } catch (e) { /* 忽略 */ }
    var S = this.friendState();
    var bonds = (typeof this.fr2BondList === 'function') ? this.fr2BondList().filter(function (b) { return b.a === 'player' || b.b === 'player'; }).length : 0;
    return Math.round(lv * 12 + p / 100 + clears * 90 + bonds * 60 + num(S.stats.gold, 0) / 500);
  };

  /* ══════════ 單一榜單 ══════════ */
  proto.fr2RankRow = function (f) {
    return {
      id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1),
      power: this.friendPower(f),
      kills: Math.round(num(f.kills, 0)),
      goldEarned: num(f.goldEarned, 0),
      clears: num(f.clears, 0),
      favor: num(f.favor, 0),
      fame: this.fr2Fame(f),
      retired: !!f.retired,
      isPlayer: false
    };
  };

  proto.fr2RankPlayerRow = function () {
    var lv = 1, power = 0;
    try { lv = this.fr2PlayerLv(); power = num(this.charSys.getDerivedStatsForChar(this.charSys.state).powerScore, 0); } catch (e) { /* 忽略 */ }
    var clears = 0;
    try { clears = num(this.fr2ExpState().clears, 0); } catch (e) { /* 忽略 */ }
    var favorSum = 0;
    this.friendAll().forEach(function (f) { favorSum += num(f.favor, 0); });
    return {
      id: 'player', name: '你', icon: '🧑‍🎤', lv: lv, power: power,
      kills: 0, goldEarned: num(this.friendState().stats.gold, 0),
      clears: clears, favor: this.friendAll().length ? Math.round(favorSum / this.friendAll().length) : 0,
      fame: this.fr2PlayerFame(), retired: false, isPlayer: true
    };
  };

  proto.fr2RankCompute = function (boardId) {
    var board = null;
    for (var i = 0; i < BOARDS.length; i++) if (BOARDS[i].id === boardId) board = BOARDS[i];
    if (!board) return [];
    var self = this;
    var rows = this.friendAll().map(function (f) { return self.fr2RankRow(f); });
    rows.push(this.fr2RankPlayerRow());

    // 選配：把江湖名人也拉進榜（只取前 N 名）
    if (C2.RANK_INCLUDE_CELEB && typeof this.celebAll === 'function') {
      try {
        var all = this.celebAll() || [];
        all.slice(0, num(C2.RANK_CELEB_TOP, 15)).forEach(function (c, idx) {
          var lv = 60 + Math.round(idx * 3);
          rows.push({
            id: 'celeb_' + c.id, name: c.name, icon: c.icon || '🧭', lv: lv,
            power: 0, kills: 0, goldEarned: 0, clears: 0, favor: 0,
            fame: Math.round(lv * 12 + 4000 - idx * 60), retired: false, isPlayer: false, isCeleb: true
          });
        });
      } catch (e) { /* 忽略 */ }
    }

    var key = board.key;
    rows.sort(function (a, b) { return num(b[key], 0) - num(a[key], 0); });
    var snap = this.fr2RankState().snap[boardId] || {};
    rows.forEach(function (r, i) {
      r.rank = i + 1;
      var prev = snap[r.id];
      r.prevRank = (typeof prev === 'number') ? prev : null;
      r.delta = (typeof prev === 'number') ? (prev - (i + 1)) : 0;
    });
    return rows;
  };

  proto.fr2RankAll = function () {
    var self = this;
    var out = {};
    BOARDS.forEach(function (b) { out[b.id] = self.fr2RankCompute(b.id).slice(0, 30); });
    return out;
  };

  proto.fr2RankSnapshot = function () {
    var R = this.fr2RankState();
    var self = this;
    BOARDS.forEach(function (b) {
      var rows = self.fr2RankCompute(b.id);
      var s = {};
      rows.forEach(function (r) { s[r.id] = r.rank; });
      R.snap[b.id] = s;
    });
    R.lastAt = Date.now();
  };

  proto.fr2RankTick = function () {
    var R = this.fr2RankState();
    var S = this.friendState();
    var iv = num(C2.RANK_SNAPSHOT_INTERVAL, 10);
    if (!R.lastAt || num(S.ticks, 0) % iv === 0) {
      try { this.fr2RankSnapshot(); } catch (e) { /* 忽略 */ }
    }
    // 賽季
    var siv = num(C2.SEASON_TICKS, 200);
    if (!R.seasonStart) R.seasonStart = num(S.ticks, 0);
    if (num(S.ticks, 0) - num(R.seasonStart, 0) >= siv) this.fr2SeasonSettle();
  };

  /* ══════════ 賽季結算 ══════════ */
  proto.fr2SeasonSettle = function () {
    var R = this.fr2RankState();
    var S = this.friendState();
    var self = this;
    var rows = this.fr2RankCompute('fame');
    var top = rows.filter(function (r) { return !r.isPlayer; }).slice(0, 3);
    var golds = C2.SEASON_TOP_GOLD || [20000, 10000, 5000];

    top.forEach(function (r, i) {
      var f = self.friendById(r.id);
      var g = num(golds[i], 5000);
      if (f) {
        f.seasonWins = num(f.seasonWins, 0) + (i === 0 ? 1 : 0);
        f.favor = Math.min(100, num(f.favor, 0) + (3 - i));
        if (i === 0 && typeof self.fr2GrantTitle === 'function') self.fr2GrantTitle(f, num(C2.SEASON_TITLE, 't_season') === 't_season' ? 't_season' : 't_season');
      }
      self.charSys.rootState.gold = num(self.charSys.rootState.gold, 0) + Math.round(g * 0.3);
      if (typeof self.fr2MailPush === 'function') {
        self.fr2MailPush({
          from: r.id, tpl: 'm_season',
          body: '本季江湖論武結算，' + (i === 0 ? '【' + r.name + '】榮登魁首' : '【' + r.name + '】名列第 ' + (i + 1)) + '，這是分紅。',
          attach: [{ kind: 'gold', amount: g }]
        });
      }
    });

    var result = {
      id: uid('sea'), season: num(R.season, 1),
      top: top.map(function (r, i) { return { rank: i + 1, name: r.name, icon: r.icon, lv: r.lv, fame: r.fame, gold: num(golds[i], 5000) }; }),
      at: Date.now(), ticks: num(S.ticks, 0)
    };
    R.seasonHistory.unshift(result);
    R.seasonHistory = R.seasonHistory.slice(0, 10);
    R.lastSettle = result;
    R.season = num(R.season, 1) + 1;
    R.seasonStart = num(S.ticks, 0);
    R.snap = {};
    this.fr2RankSnapshot();

    this.friendLog('🏅 第 ' + result.season + ' 賽季結算完畢！魁首：【' +
      (result.top[0] ? result.top[0].name : '從缺') + '】，獎勵已發放至書信。', 'gain');
    return result;
  };

  /* ══════════ 報告 ══════════ */
  proto.fr2RankReport = function () {
    var R = this.fr2RankState();
    var S = this.friendState();
    var self = this;
    var boards = BOARDS.map(function (b) {
      return { id: b.id, name: b.name, icon: b.icon, desc: b.desc, key: b.key, rows: self.fr2RankCompute(b.id).slice(0, 20) };
    });
    var fameRows = this.fr2RankCompute('fame');
    var myRank = 0;
    fameRows.forEach(function (r) { if (r.isPlayer) myRank = r.rank; });
    return {
      boards: boards,
      myRank: myRank,
      myFame: this.fr2PlayerFame(),
      total: fameRows.length,
      season: num(R.season, 1),
      seasonTicks: num(S.ticks, 0) - num(R.seasonStart, 0),
      seasonTotal: num(C2.SEASON_TICKS, 200),
      seasonLeft: Math.max(0, num(C2.SEASON_TICKS, 200) - (num(S.ticks, 0) - num(R.seasonStart, 0))),
      history: R.seasonHistory.slice(0, 6),
      lastSettle: R.lastSettle,
      boardsMeta: BOARDS
    };
  };

  /* ══════════════════════════════════════════════════════
     friendReport 整合（v2 全部報告掛到 rep.v2）
     ══════════════════════════════════════════════════════ */
  var _friendReport = proto.friendReport;
  proto.friendReport = function () {
    var r = _friendReport.call(this);
    var self = this;
    function safe(fn) { try { return fn.call(self); } catch (e) { console.error('[friendRank] 報告失敗：', e); return null; } }
    r.v2 = {
      exp: safe(proto.fr2ExpReport),
      tourney: safe(function () {
        var X = self.fr2TourneyState();
        return {
          last: X.last, history: X.history.slice(0, 8), bets: X.bets.slice(-6),
          nextAt: num(X.nextAt, 0), now: num(self.friendState().ticks, 0),
          auto: !!X.auto, interval: num(C2.TOURNEY_INTERVAL, 40),
          eligible: self.fr2TourneyEligible().map(function (f) {
            return { id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), power: self.friendPower(f), odds: self.fr2TourneyOdds(f), wins: num(X.wins[f.id], 0) };
          }),
          wins: X.wins,
          minBet: num(C2.TOURNEY_BET_MIN, 200), maxBet: num(C2.TOURNEY_BET_MAX, 20000)
        };
      }),
      quest: safe(function () {
        var Q = self.fr2QuestState();
        return {
          list: Q.list.map(function (q) {
            return {
              id: q.id, friendId: q.friendId, friendName: q.friendName, friendIcon: q.friendIcon,
              type: q.type, icon: q.icon, title: q.title, desc: q.desc,
              duration: q.duration, left: num(q.left, 0), status: q.status,
              assigned: q.assigned, assignedName: q.assignedName, reward: q.reward
            };
          }),
          done: num(Q.done, 0), auto: !!Q.auto,
          helpers: self.fr2ExpIdleFriends().map(function (f) {
            return { id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), role: self.fr2RoleName(self.fr2RoleOf(f)) };
          })
        };
      }),
      rescue: safe(function () {
        var R = self.fr2RescueState();
        return {
          active: R.active.map(function (r) {
            return {
              id: r.id, friendId: r.friendId, friendName: r.friendName, friendIcon: r.friendIcon,
              friendLv: r.friendLv, name: r.name, icon: r.icon, desc: r.desc, left: num(r.left, 0),
              rescuers: self.fr2ExpIdleFriends().map(function (f) { return { id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1) }; })
            };
          }),
          done: num(R.done, 0), failed: num(R.failed, 0), window: num(C2.RESCUE_WINDOW, 10)
        };
      }),
      visit: safe(function () {
        var V = self.fr2VisitState();
        return { active: V.active.map(function (v) {
          return { id: v.id, friendName: v.friendName, friendIcon: v.friendIcon, name: v.name, icon: v.icon, desc: v.desc, left: num(v.left, 0), gift: v.gift };
        }), total: num(V.total, 0) };
      }),
      retire: safe(function () {
        var R = self.fr2RetireState();
        return { list: R.list.slice(-20).reverse(), count: num(R.count, 0), enabled: !!C2.RETIRE_ENABLED, legacyMul: self.fr2LegacyMul() };
      }),
      bond: safe(proto.fr2BondReport),
      title: safe(proto.fr2TitleReport),
      mail: safe(proto.fr2MailReport),
      rank: safe(proto.fr2RankReport),
      chat: safe(function () {
        return self.friendAll().map(function (f) {
          return { id: f.id, name: f.name, icon: f.icon, line: f.chatLine || '', status: f.status, retired: !!f.retired };
        });
      })
    };
    return r;
  };

  /* ══════════ 啟動 ══════════ */
  proto.fr2RankBootOnce = function () {
    if (this._fr2RankBooted) return;
    this._fr2RankBooted = true;
    try { this.fr2RankSnapshot(); } catch (e) { /* 忽略 */ }
    console.log('[friendRank] ✓ 排行榜／賽季系統已啟動');
  };

  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.fr2RankBootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  window.HY.FriendRank = { version: '1.0', boards: BOARDS.length };
  console.log('[friendRank] ✓ 已載入（排行榜 + 賽季）');
})();