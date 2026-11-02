// js/friendExtraSystem.js (v1)
// ⭐ 好友系統 v4：擴充功能層
//    授業傳功／打工採集／鍛造強化／煉丹／保鑣護衛／心願／日常互動／共同倉庫
// ⚠️ 載入順序：friendAuctionSystem.js 之後、friendRankSystem.js 之前
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendExtraSystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendExtraSystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var C4 = F.CONFIG4 || {};
  var MATS = F.WAREHOUSE_MATERIALS || [];
  var JOBS = F.WORK_JOBS || [];
  var WISH = F.WISH_TYPES || [];
  var ACTS = F.DAILY_ACTS || [];

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function rndF(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid(p) { return (p || 'f4') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function tmpl(s, m) { return String(s || '').replace(/\{(\w+)\}/g, function (_, k) { return (m && m[k] !== undefined) ? m[k] : ''; }); }

  /* ══════════════════════════════════════════════════════
     狀態
     ══════════════════════════════════════════════════════ */
  proto.fr4Default = function () {
    return {
      warehouse: { mats: {}, items: [] },
      works: [], alchemy: [], wishes: [], daily: {}, guardId: null, guardSince: 0,
      stats: {
        taught: 0, teachGold: 0, workDone: 0, matsGained: 0, forged: 0, forgeFail: 0, forgeGold: 0,
        pills: 0, guardBlocked: 0, guardHealed: 0, wishesDone: 0, wishGold: 0, dailies: 0, deposits: 0
      },
      log: [], nextWish: 0
    };
  };

  proto.fr4State = function () {
    var S = this.friendState();
    if (!S.extra || typeof S.extra !== 'object') S.extra = this.fr4Default();
    var E = S.extra, d = this.fr4Default(), k;
    for (k in d) { if (E[k] === undefined) E[k] = d[k]; }
    if (!E.warehouse || typeof E.warehouse !== 'object') E.warehouse = d.warehouse;
    if (!E.warehouse.mats || typeof E.warehouse.mats !== 'object') E.warehouse.mats = {};
    if (!Array.isArray(E.warehouse.items)) E.warehouse.items = [];
    ['works', 'alchemy', 'wishes', 'log'].forEach(function (kk) { if (!Array.isArray(E[kk])) E[kk] = []; });
    if (!E.daily || typeof E.daily !== 'object') E.daily = {};
    if (!E.stats || typeof E.stats !== 'object') E.stats = d.stats;
    for (k in d.stats) { if (E.stats[k] === undefined) E.stats[k] = 0; }
    MATS.forEach(function (m) { if (E.warehouse.mats[m.id] === undefined) E.warehouse.mats[m.id] = 0; });
    return E;
  };

  proto.fr4Log = function (msg, type) {
    var E = this.fr4State();
    E.log.unshift({ t: Date.now(), msg: msg, type: type || 'f4' });
    if (E.log.length > 90) E.log.pop();
    this.friendLog(msg, type || 'time');
  };

  proto.fr4Mat = function (id) {
    for (var i = 0; i < MATS.length; i++) if (MATS[i].id === id) return MATS[i];
    return { id: id, name: id, icon: '📦', value: 10 };
  };
  proto.fr4MatLabel = function (id) { var m = this.fr4Mat(id); return m.icon + m.name; };
  proto.fr4Job = function (id) {
    for (var i = 0; i < JOBS.length; i++) if (JOBS[i].id === id) return JOBS[i];
    return null;
  };
  proto.fr4Act = function (id) {
    for (var i = 0; i < ACTS.length; i++) if (ACTS[i].id === id) return ACTS[i];
    return null;
  };
  proto.fr4Ticks = function () { return num(this.friendState().ticks, 0); };

  /* ══════════════════════════════════════════════════════
     好友忙碌判定（與既有系統整合）
     ══════════════════════════════════════════════════════ */
  proto.fr4BusyOf = function (fid) {
    var E = this.fr4State();
    for (var i = 0; i < E.works.length; i++) if (E.works[i].fid === fid) return { kind: 'work', rec: E.works[i] };
    for (var j = 0; j < E.alchemy.length; j++) if (E.alchemy[j].fid === fid) return { kind: 'alchemy', rec: E.alchemy[j] };
    return null;
  };

  proto.fr4IdleFriends = function () {
    var self = this;
    return this.friendAll().filter(function (f) {
      if (f.retired || f.following) return false;
      if (f.status === 'injured' || num(f.currentHp, 1) <= 0) return false;
      if (num(f.questBusy, 0) > 0) return false;
      if (self.fr2ExpRunOf && self.fr2ExpRunOf(f.id)) return false;
      if (self.fr4BusyOf(f.id)) return false;
      return true;
    });
  };

  /* ══════════════════════════════════════════════════════
     ① 授業傳功
     ══════════════════════════════════════════════════════ */
  proto.fr4PlayerSkills = function () {
    var out = {};
    try {
      var st = this.charSys && this.charSys.state;
      if (st) {
        if (st.skills && typeof st.skills === 'object') Object.keys(st.skills).forEach(function (k) { out[k] = num(st.skills[k], 1); });
        if (st.martial && typeof st.martial === 'object') Object.keys(st.martial).forEach(function (k) { if (!out[k]) out[k] = 1; });
      }
    } catch (e) { /* 忽略 */ }
    return out;
  };

  proto.fr4PlayerLearn = function (id) {
    if (!id) return false;
    try {
      var st = this.charSys && this.charSys.state;
      if (!st) return false;
      if (!st.skills || typeof st.skills !== 'object') st.skills = {};
      if (st.skills[id]) { st.skills[id] = num(st.skills[id], 1) + 1; return true; }
      st.skills[id] = 1;
      try {
        var ms = window.HY.game && window.HY.game.martialSys;
        if (ms && typeof ms.refreshCaches === 'function') ms.refreshCaches();
        else if (ms && typeof ms.rebuild === 'function') ms.rebuild();
      } catch (e) { /* 忽略 */ }
      return true;
    } catch (e) { return false; }
  };

  /** 可向此好友學習的招式（好友有、你沒有／可升） */
  proto.fr4Teachable = function (f) {
    if (!f) return [];
    var arts = (window.HY.Data && window.HY.Data.MARTIAL_ARTS) || {};
    var mine = this.fr4PlayerSkills();
    var out = [];
    Object.keys(f.skills || {}).forEach(function (id) {
      if (id === 'basic_punch') return;
      var a = arts[id] || { name: id, maxLv: 10 };
      var have = num(mine[id], 0);
      var maxLv = num(a.maxLv, 10);
      if (have >= maxLv) return;
      out.push({
        id: id, name: a.name || id, icon: a.icon || '📖',
        have: have, next: have + 1, maxLv: maxLv,
        isNew: have === 0, friendLv: num(f.skills[id], 1)
      });
    });
    out.sort(function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.next - a.next; });
    return out;
  };

  proto.fr4TeachCost = function (f, artId) {
    var a = ((window.HY.Data && window.HY.Data.MARTIAL_ARTS) || {})[artId] || {};
    var reqLv = num(a.reqLv, num(f && f.lv, 1));
    return Math.round(num(C4.TEACH_GOLD_BASE, 1200) + reqLv * num(C4.TEACH_GOLD_PER_LV, 45));
  };

  proto.fr4Teach = function (fid, artId) {
    var f = this.friendById(fid);
    if (!f) { this.log('⚠️ 找不到好友。', 'system'); return false; }
    if (f.retired) { this.log('⚠️ 【' + f.name + '】已退隱，不再授業。', 'system'); return false; }
    var list = this.fr4Teachable(f), target = null;
    list.forEach(function (x) { if (x.id === artId) target = x; });
    if (!target) { this.log('⚠️ 【' + f.name + '】無法傳授此招。', 'system'); return false; }
    if (target.isNew && !num(C4.TEACH_GRANT_NEW, 1)) { this.log('⚠️ 目前設定為不可傳授新招（TEACH_GRANT_NEW=0）。', 'system'); return false; }

    var favorCost = num(C4.TEACH_FAVOR, 8);
    if (num(f.favor, 0) < favorCost) { this.log('⚠️ 好感不足（需 ' + favorCost + '，目前 ' + num(f.favor, 0) + '）。', 'system'); return false; }
    var cost = this.fr4TeachCost(f, artId);
    if (num(this.charSys.rootState.gold, 0) < cost) { this.log('⚠️ 授業需 ' + cost.toLocaleString() + ' 兩紋銀。', 'system'); return false; }

    this.charSys.rootState.gold -= cost;
    f.favor = Math.max(0, num(f.favor, 0) - favorCost);
    var ok = this.fr4PlayerLearn(artId);
    var E = this.fr4State();
    E.stats.taught += 1;
    E.stats.teachGold += cost;

    var sp = num(C4.TEACH_SP_GAIN, 15);
    try { this.charSys.rootState.sp = num(this.charSys.rootState.sp, 0) + sp; } catch (e) { /* 忽略 */ }

    this.fr4Log('🎓 【' + f.name + '】傳授你《' + target.name + '》' +
      (target.isNew ? '（初窺門徑 Lv.1）' : '（精進至 Lv.' + target.next + '）') +
      '，耗銀 ' + cost.toLocaleString() + ' 兩、好感 -' + favorCost + '、武點 +' + sp +
      (ok ? '' : '（⚠️ 寫入招式失敗，僅獲得武點）'), 'gain');
    this.requestRender();
    return ok;
  };

  /* ══════════════════════════════════════════════════════
     ② 打工採集
     ══════════════════════════════════════════════════════ */
  proto.fr4AssignWork = function (fid, jobId) {
    var E = this.fr4State();
    var f = this.friendById(fid);
    var job = this.fr4Job(jobId);
    if (!f || !job) return false;
    if (f.retired || f.following) { this.log('⚠️ 【' + f.name + '】無法外出打工。', 'system'); return false; }
    if (f.status === 'injured') { this.log('⚠️ 【' + f.name + '】負傷中。', 'system'); return false; }
    if (this.fr4BusyOf(fid)) { this.log('⚠️ 【' + f.name + '】已在忙。', 'system'); return false; }
    if (E.works.length >= num(C4.WORK_MAX_ASSIGN, 4)) { this.log('⚠️ 同時最多 ' + num(C4.WORK_MAX_ASSIGN, 4) + ' 位好友外出打工。', 'system'); return false; }

    var dur = rndInt(num(job.dur && job.dur[0], num(C4.WORK_DUR[0], 8)), num(job.dur && job.dur[1], num(C4.WORK_DUR[1], 20)));
    E.works.push({ id: uid('wk'), fid: fid, jobId: jobId, left: dur, total: dur, at: Date.now() });
    f.workJob = jobId;
    this.fr4Log('⛏️ 【' + f.name + '】外出' + job.name + '（約 ' + dur + ' 期）。', 'time');
    this.requestRender();
    return true;
  };

  proto.fr4WorkDone = function (rec) {
    var E = this.fr4State();
    var f = this.friendById(rec.fid);
    var job = this.fr4Job(rec.jobId);
    if (!job) { E.works = E.works.filter(function (x) { return x.id !== rec.id; }); return; }

    var mul = num(C4.WORK_YIELD, 1) * (1 + num(f && f.lv, 1) * 0.004);
    var got = [];
    (job.mats || []).forEach(function (mid) {
      var n = Math.max(1, Math.round(rndInt(1, 3) * mul));
      E.warehouse.mats[mid] = num(E.warehouse.mats[mid], 0) + n;
      E.stats.matsGained += n;
      got.push(this.fr4MatLabel(mid) + '×' + n);
    }, this);

    var gold = Math.round(rndF(num(job.gold[0], 100), num(job.gold[1], 400)) * num(C4.WORK_GOLD, 1) * (1 + num(f && f.lv, 1) * 0.003));
    this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) + gold;

    var inj = '';
    if (f && Math.random() < num(C4.WORK_INJURY, 0.05)) {
      f.status = 'injured';
      f.injuredLeft = Math.max(num(f.injuredLeft, 0), rndInt(2, 5));
      inj = '，但受了些傷';
    }
    if (f) { f.workJob = null; f.favor = Math.min(100, num(f.favor, 0) + 1); this.friendGainExp(f, Math.round(num(f.maxExp, 100) * 0.08)); }

    E.works = E.works.filter(function (x) { return x.id !== rec.id; });
    E.stats.workDone += 1;
    this.fr4Log('⛏️ 【' + (f ? f.name : '好友') + '】' + job.name + '歸來：' + (got.join('、') || '無收穫') +
      '、紋銀 ' + gold.toLocaleString() + ' 兩' + inj, 'loot');
  };

  proto.fr4WorkCancel = function (recId) {
    var E = this.fr4State();
    var r = null;
    E.works.forEach(function (x) { if (x.id === recId) r = x; });
    if (!r) return false;
    var f = this.friendById(r.fid);
    if (f) f.workJob = null;
    E.works = E.works.filter(function (x) { return x.id !== recId; });
    this.fr4Log('🛑 你召回了【' + (f ? f.name : '好友') + '】。', 'time');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ③ 鍛造強化
     ══════════════════════════════════════════════════════ */
  proto.fr4ForgeBag = function () {
    var root = this.charSys.rootState;
    var bag = Array.isArray(root.equipBag) ? root.equipBag : [];
    var self = this, out = [];
    bag.forEach(function (it, i) {
      if (!it || typeof it !== 'object') return;
      if (!self.friendItemSlot(it)) return;
      var lv = num(it._forgeLv, 0);
      if (lv >= num(C4.FORGE_MAX_LV, 10)) return;
      out.push({ idx: i, name: self.friendItemLabel(it), reqLv: num(it.reqLv, 1), power: self.friendItemPower(it), forgeLv: lv });
    });
    return out;
  };

  proto.fr4ForgeCost = function (item, f) {
    var lv = num(item && item._forgeLv, 0);
    return Math.round(num(C4.FORGE_COST_BASE, 900) + lv * num(C4.FORGE_COST_PER_LV, 700));
  };

  proto.fr4ForgeRate = function (item, f) {
    var lv = num(item && item._forgeLv, 0);
    var tier = num(f && f.tier && f.tier.lv, 1);
    var r = num(C4.FORGE_BASE_RATE, 0.78) - lv * 0.04
      + (tier - 1) * num(C4.FORGE_TIER_BONUS, 0.035)
      + num(f && f.lv, 1) * num(C4.FORGE_LV_BONUS, 0.0012);
    return clamp(r, 0.15, 0.97);
  };

  proto.fr4Forge = function (bagIdx, fid) {
    var f = this.friendById(fid);
    if (!f) { this.log('⚠️ 找不到好友。', 'system'); return false; }
    var tier = num(f.tier && f.tier.lv, 1);
    if (tier < num(C4.FORGE_MIN_TIER, 2)) {
      this.log('⚠️ 【' + f.name + '】僅 ' + tier + ' 星，不足以承接鍛造（需 ★★ 以上）。', 'system');
      return false;
    }
    if (f.retired) { this.log('⚠️ 【' + f.name + '】已退隱。', 'system'); return false; }

    var root = this.charSys.rootState;
    var bag = Array.isArray(root.equipBag) ? root.equipBag : [];
    var idx = (typeof bagIdx === 'number') ? bagIdx : parseInt(bagIdx, 10);
    var item = bag[idx];
    if (!item) { this.log('⚠️ 找不到該裝備。', 'system'); return false; }
    var lv = num(item._forgeLv, 0);
    if (lv >= num(C4.FORGE_MAX_LV, 10)) { this.log('⚠️ 此裝備已達強化上限。', 'system'); return false; }

    var cost = this.fr4ForgeCost(item, f);
    if (num(root.gold, 0) < cost) { this.log('⚠️ 鍛造需 ' + cost.toLocaleString() + ' 兩。', 'system'); return false; }

    root.gold = num(root.gold, 0) - cost;
    var rate = this.fr4ForgeRate(item, f);
    var ok = Math.random() < rate;
    var E = this.fr4State();
    E.stats.forgeGold += cost;
    var name = this.friendItemLabel(item);

    if (ok) {
      item._forgeLv = lv + 1;
      E.stats.forged += 1;
      f.favor = Math.min(100, num(f.favor, 0) + 2);
      this.friendGainExp(f, Math.round(num(f.maxExp, 100) * 0.10));
      this.fr4Log('🔨 【' + f.name + '】鍛造成功！【' + name + '】強化至 +' + (lv + 1) +
        '（成功率 ' + Math.round(rate * 100) + '%，耗銀 ' + cost.toLocaleString() + ' 兩）', 'gain');
    } else {
      var refund = Math.round(cost * num(C4.FORGE_FAIL_GOLD, 0.5));
      root.gold = num(root.gold, 0) + refund;
      if (num(C4.FORGE_FAIL_LOSS, 0) > 0) item._forgeLv = Math.max(0, lv - 1);
      E.stats.forgeFail += 1;
      this.fr4Log('💥 【' + f.name + '】鍛造失敗，【' + name + '】維持 +' + num(item._forgeLv, 0) +
        '（成功率 ' + Math.round(rate * 100) + '%，退還 ' + refund.toLocaleString() + ' 兩）', 'system');
    }
    this.requestRender();
    return ok;
  };

  /* ══════════════════════════════════════════════════════
     ④ 煉丹
     ══════════════════════════════════════════════════════ */
  proto.fr4AssignAlchemy = function (fid) {
    var E = this.fr4State();
    var f = this.friendById(fid);
    if (!f) return false;
    if (f.retired || f.following || f.status === 'injured') { this.log('⚠️ 【' + f.name + '】無法煉丹。', 'system'); return false; }
    if (this.fr4BusyOf(fid)) { this.log('⚠️ 【' + f.name + '】已在忙。', 'system'); return false; }
    if (E.alchemy.length >= num(C4.ALCHEMY_MAX_ASSIGN, 2)) { this.log('⚠️ 同時最多 ' + num(C4.ALCHEMY_MAX_ASSIGN, 2) + ' 位好友煉丹。', 'system'); return false; }

    var dur = rndInt(num(C4.ALCHEMY_DUR[0], 10), num(C4.ALCHEMY_DUR[1], 24));
    E.alchemy.push({ id: uid('al'), fid: fid, left: dur, total: dur, at: Date.now() });
    f.alchemy = true;
    this.fr4Log('💊 【' + f.name + '】開爐煉丹（約 ' + dur + ' 期）。', 'time');
    this.requestRender();
    return true;
  };

  proto.fr4AlchemyDone = function (rec) {
    var E = this.fr4State();
    var f = this.friendById(rec.fid);
    if (f) f.alchemy = false;
    E.alchemy = E.alchemy.filter(function (x) { return x.id !== rec.id; });
    if (!f) return;

    if (Math.random() > num(C4.ALCHEMY_RATE, 0.85)) {
      this.fr4Log('💊 【' + f.name + '】煉丹失敗，丹爐炸了。', 'system');
      return;
    }
    var cid = null;
    try { if (typeof this.guildRandomConsumable === 'function') cid = this.guildRandomConsumable(); } catch (e) { /* 忽略 */ }
    var n = rndInt(num(C4.ALCHEMY_OUT_MIN, 1), num(C4.ALCHEMY_OUT_MAX, 3));
    var label = cid || '療傷丹';
    try {
      if (cid) {
        if (this.invSys && typeof this.invSys.addItem === 'function') this.invSys.addItem(cid, n);
        else {
          var root = this.charSys.rootState;
          root.inventory = root.inventory || {};
          root.inventory[cid] = num(root.inventory[cid], 0) + n;
        }
      }
      var nm = (((window.HY.Data || {}).ITEMS || {})[cid] || {}).name;
      if (nm) label = nm;
    } catch (e) { /* 忽略 */ }

    E.stats.pills += n;
    f.favor = Math.min(100, num(f.favor, 0) + 2);
    this.friendGainExp(f, Math.round(num(f.maxExp, 100) * 0.12));
    this.fr4Log('💊 【' + f.name + '】煉丹出爐：【' + label + '】×' + n + '（已送入你的行囊）', 'loot');
  };

  proto.fr4AlchemyCancel = function (recId) {
    var E = this.fr4State();
    var r = null;
    E.alchemy.forEach(function (x) { if (x.id === recId) r = x; });
    if (!r) return false;
    var f = this.friendById(r.fid);
    if (f) f.alchemy = false;
    E.alchemy = E.alchemy.filter(function (x) { return x.id !== recId; });
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ⑤ 保鑣護衛
     ══════════════════════════════════════════════════════ */
  proto.fr4Guard = function () {
    var E = this.fr4State();
    return E.guardId ? this.friendById(E.guardId) : null;
  };

  proto.fr4SetGuard = function (fid) {
    var E = this.fr4State();
    if (!fid || E.guardId === fid) {
      var old = this.fr4Guard();
      E.guardId = null;
      if (old) old.guard = false;
      this.fr4Log('🛡️ 已解除保鑣職務。', 'time');
      this.requestRender();
      return true;
    }
    var f = this.friendById(fid);
    if (!f) return false;
    if (f.retired) { this.log('⚠️ 【' + f.name + '】已退隱，無法擔任保鑣。', 'system'); return false; }
    if (f.status === 'injured') { this.log('⚠️ 【' + f.name + '】負傷中。', 'system'); return false; }

    var prev = this.fr4Guard();
    if (prev) { prev.guard = false; prev.following = false; }
    E.guardId = fid;
    E.guardSince = this.fr4Ticks();
    f.guard = true;
    f.following = true;
    f.status = 'idle'; f.actionLeft = 0;
    this.fr4Log('🛡️ 【' + f.name + '】（Lv.' + num(f.lv, 1) + '，戰力 ' + this.friendPower(f).toLocaleString() +
      '）出任你的保鑣，常駐隨行。', 'gain');
    this.requestRender();
    return true;
  };

  /** 保鑣不佔同行名額 */
  var _friendFollowMax = proto.friendFollowMax;
  proto.friendFollowMax = function () {
    var m = _friendFollowMax.call(this);
    try {
      var E = this.fr4State();
      if (E.guardId && num(C4.GUARD_FREE_SLOT, 1)) m += 1;
    } catch (e) { /* 忽略 */ }
    return m;
  };

  /** 打劫損失減免 */
  var _fr3HosRaidExecute = proto.fr3HosRaidExecute;
  if (typeof _fr3HosRaidExecute === 'function') {
    proto.fr3HosRaidExecute = function (h) {
      var g0 = num(this.charSys.rootState.gold, 0);
      var r = _fr3HosRaidExecute.call(this, h);
      try {
        var g = this.fr4Guard();
        if (g && num(g.currentHp, 1) > 0) {
          var lost = g0 - num(this.charSys.rootState.gold, 0);
          var back = Math.round(lost * num(C4.GUARD_RAID_REDUCE, 0.45));
          if (back > 0) {
            this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) + back;
            this.fr4State().stats.guardBlocked += back;
            this.fr4Log('🛡️ 保鑣【' + g.name + '】出手攔截，追回 ' + back.toLocaleString() + ' 兩紋銀。', 'gain');
          }
        }
      } catch (e) { /* 忽略 */ }
      return r;
    };
  }

  /** 保鑣加成（只作用於玩家角色） */
  proto.fr4InstallGuardAura = function () {
    var CS = window.HY.CharacterSystem;
    if (!CS || !CS.prototype || CS.prototype.__fr4GuardAura) return;
    CS.prototype.__fr4GuardAura = true;
    var orig = CS.prototype.getDerivedStatsForChar;
    CS.prototype.getDerivedStatsForChar = function (c) {
      var d = orig.call(this, c);
      try {
        var town = window.HY.game && window.HY.game.townSys;
        if (!town || typeof town.fr4Guard !== 'function') return d;
        if (!c || !this.rootState || !Array.isArray(this.rootState.roster)) return d;
        if (this.rootState.roster.indexOf(c) === -1) return d;
        var g = town.fr4Guard();
        if (!g) return d;
        if (d.atk) d.atk = Math.floor(d.atk * (1 + num(C4.GUARD_ATK_PCT, 0.06)));
        if (d.def) d.def = Math.floor(d.def * (1 + num(C4.GUARD_DEF_PCT, 0.09)));
        if (d.maxHp) d.maxHp = Math.floor(d.maxHp * (1 + num(C4.GUARD_HP_PCT, 0.11)));
        if (typeof this.getPowerScore === 'function') d.powerScore = this.getPowerScore(d);
      } catch (e) { /* 忽略 */ }
      return d;
    };
    console.log('[friendExtra] ✓ 保鑣加成已掛載');
  };

  /* ══════════════════════════════════════════════════════
     ⑥ 心願
     ══════════════════════════════════════════════════════ */
  proto.fr4WishSpawn = function () {
    var E = this.fr4State();
    if (E.wishes.length >= num(C4.WISH_MAX, 4)) return null;
    var pool = this.friendAll().filter(function (f) { return !f.retired; });
    if (!pool.length) return null;
    var f = pick(pool);
    var dup = false;
    E.wishes.forEach(function (w) { if (w.fid === f.id) dup = true; });
    if (dup) return null;

    var tpl = pick(WISH.length ? WISH : [{ id: 'talk', name: '想與你論道', icon: '🍵', need: 'none', desc: '{name}想與你聊聊。', reward: { gold: 0.2, favor: 6, expMul: 0.14 } }]);
    var w = {
      id: uid('wish'), fid: f.id, name: f.name, icon: f.icon, typeId: tpl.id,
      title: tpl.name, typeIcon: tpl.icon, need: tpl.need,
      desc: tmpl(tpl.desc, { name: f.name }),
      amount: tpl.amount ? rndInt(tpl.amount[0], tpl.amount[1]) : 0,
      reward: tpl.reward || { gold: 0.2, favor: 6, expMul: 0.14 },
      left: num(C4.WISH_EXPIRE, 30), at: Date.now()
    };
    E.wishes.push(w);
    this.fr4Log('💌 【' + f.name + '】的心願：' + w.title + '（' + w.desc + '）', 'time');
    return w;
  };

  proto.fr4WishFulfill = function (wishId, opt) {
    var E = this.fr4State();
    var w = null;
    E.wishes.forEach(function (x) { if (x.id === wishId) w = x; });
    if (!w) return false;
    var f = this.friendById(w.fid);
    if (!f) { E.wishes = E.wishes.filter(function (x) { return x.id !== wishId; }); return false; }
    var root = this.charSys.rootState;
    var rw = w.reward || {};
    var ok = false, spent = 0, gave = '';

    if (w.need === 'gold') {
      if (num(root.gold, 0) < num(w.amount, 0)) { this.log('⚠️ 需 ' + num(w.amount, 0).toLocaleString() + ' 兩紋銀。', 'system'); return false; }
      root.gold = num(root.gold, 0) - num(w.amount, 0);
      spent = num(w.amount, 0); ok = true; gave = '紋銀 ' + spent.toLocaleString() + ' 兩';
    } else if (w.need === 'equip') {
      var idx = opt && opt.idx !== undefined ? parseInt(opt.idx, 10) : 0;
      var bag = Array.isArray(root.equipBag) ? root.equipBag : [];
      var it = bag[idx];
      if (!it) { this.log('⚠️ 行囊中沒有可贈的裝備。', 'system'); return false; }
      bag.splice(idx, 1);
      f.bag.push(it);
      try { if (typeof this.friendAutoEquipOne === 'function') this.friendAutoEquipOne(f); } catch (e) { /* 忽略 */ }
      ok = true; gave = this.friendItemLabel(it);
    } else if (w.need === 'mat') {
      var mid = opt && opt.matId ? opt.matId : null;
      if (!mid) { this.log('⚠️ 未指定材料。', 'system'); return false; }
      var have = num(E.warehouse.mats[mid], 0);
      if (have < num(w.amount, 0)) { this.log('⚠️ ' + this.fr4MatLabel(mid) + '不足（需 ' + w.amount + '，現有 ' + have + '）。', 'system'); return false; }
      E.warehouse.mats[mid] = have - num(w.amount, 0);
      var hv = Math.round(num(w.amount, 0) * this.fr4Mat(mid).value * num(C4.WAREHOUSE_HOME_VALUE, 1));
      if (typeof this.fr3HomeEnsure === 'function') {
        var h = this.fr3HomeEnsure(f);
        h.exp = num(h.exp, 0) + hv;
        h.givers = num(h.givers, 0) + 1;
        try { this.fr3HomeLevelUp(f, true); } catch (e) { /* 忽略 */ }
      }
      ok = true; gave = this.fr4MatLabel(mid) + '×' + num(w.amount, 0);
    } else if (w.need === 'spar') {
      try { if (typeof this.friendSpar === 'function') this.friendSpar(f.id); } catch (e) { /* 忽略 */ }
      ok = true; gave = '切磋一場';
    } else {
      try { if (typeof this.friendTalk === 'function') this.friendTalk(f.id); } catch (e) { /* 忽略 */ }
      ok = true; gave = '秉燭夜談';
    }

    if (!ok) return false;

    var favor = num(rw.favor, num(C4.WISH_FAVOR, 10));
    f.favor = Math.min(100, num(f.favor, 0) + favor);
    var goldBack = Math.round(spent * num(rw.gold, 0.3)) + Math.round(400 + num(f.lv, 1) * 60);
    root.gold = num(root.gold, 0) + goldBack;
    this.friendGainExp(f, Math.round(num(f.maxExp, 100) * num(rw.expMul, 0.12)));

    E.wishes = E.wishes.filter(function (x) { return x.id !== wishId; });
    E.stats.wishesDone += 1;
    E.stats.wishGold += goldBack;

    var reply = pick(F.WISH_REPLY || ['多謝。']);
    this.fr4Log('💌 你為【' + f.name + '】了卻心願（' + gave + '）：好感 +' + favor +
      '、回禮 ' + goldBack.toLocaleString() + ' 兩　「' + reply + '」', 'gain');
    if (typeof this.fr2MailPush === 'function') {
      this.fr2MailPush({ from: f.id, tpl: 'm_thanks', body: reply, attach: [] });
    }
    this.requestRender();
    return true;
  };

  proto.fr4WishDrop = function (wishId) {
    var E = this.fr4State();
    var w = null;
    E.wishes.forEach(function (x) { if (x.id === wishId) w = x; });
    if (!w) return false;
    var f = this.friendById(w.fid);
    if (f) f.favor = Math.max(0, num(f.favor, 0) - 5);
    E.wishes = E.wishes.filter(function (x) { return x.id !== wishId; });
    this.fr4Log('💔 你沒理會【' + (f ? f.name : '好友') + '】的心願，好感 -5。', 'system');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ⑦ 日常互動
     ══════════════════════════════════════════════════════ */
  proto.fr4DailyCd = function (fid) {
    var E = this.fr4State();
    var last = num((E.daily[fid] || {}).at, -9999);
    return Math.max(0, last + num(C4.DAILY_CD, 8) - this.fr4Ticks());
  };

  proto.fr4DailyDo = function (fid, actId) {
    var f = this.friendById(fid);
    var act = this.fr4Act(actId);
    if (!f || !act) return false;
    if (f.retired) { this.log('⚠️ 【' + f.name + '】已退隱。', 'system'); return false; }
    var cd = this.fr4DailyCd(fid);
    if (cd > 0) { this.log('⚠️ 還需 ' + cd + ' 期才能再與【' + f.name + '】' + act.name + '。', 'system'); return false; }

    var E = this.fr4State();
    E.daily[fid] = { at: this.fr4Ticks(), act: actId };
    var favor = num(act.favor, num(C4.DAILY_FAVOR, 3));
    f.favor = Math.min(100, num(f.favor, 0) + favor);
    this.friendGainExp(f, Math.round(num(f.maxExp, 100) * 0.05));

    var ticks = num(C4.DAILY_BUFF_TICKS, 12);
    E.buff = E.buff || {};
    E.buff[act.buff] = { until: this.fr4Ticks() + ticks, mul: num(act.mul, num(C4.DAILY_BUFF_MUL, 0.05)), name: act.buffName };
    E.stats.dailies += 1;

    this.fr4Log('🍵 你與【' + f.name + '】' + act.name + '：' + act.desc +
      '　好感 +' + favor + '，獲得「' + act.buffName + ' +' + Math.round(num(act.mul, 0.05) * 100) + '%」（' + ticks + ' 期）', 'time');
    this.requestRender();
    return true;
  };

  proto.fr4ActiveBuff = function () {
    var E = this.fr4State();
    var now = this.fr4Ticks(), out = [];
    if (!E.buff) return out;
    Object.keys(E.buff).forEach(function (k) {
      var b = E.buff[k];
      if (num(b.until, 0) > now) out.push({ key: k, name: b.name, mul: num(b.mul, 0), left: num(b.until, 0) - now });
    });
    return out;
  };

  proto.fr4BuffMul = function (key) {
    var list = this.fr4ActiveBuff();
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return 1 + list[i].mul;
    return 1;
  };

  /* ══════════════════════════════════════════════════════
     ⑧ 共同倉庫
     ══════════════════════════════════════════════════════ */
  proto.fr4WareTake = function (idx) {
    var E = this.fr4State();
    var i = (typeof idx === 'number') ? idx : parseInt(idx, 10);
    var it = E.warehouse.items[i];
    if (!it) return false;
    if (typeof this.fr2PushToPlayerBag === 'function' && !this.fr2PushToPlayerBag(it)) {
      this.log('🎒 行囊已滿，無法取出。', 'system');
      return false;
    }
    E.warehouse.items.splice(i, 1);
    this.fr4Log('📦 你從好友倉庫取出【' + this.friendItemLabel(it) + '】。', 'loot');
    this.requestRender();
    return true;
  };

  proto.fr4WareTakeAll = function () {
    var E = this.fr4State();
    var n = 0, max = num(C4.WAREHOUSE_MAX_TAKE, 20);
    var list = E.warehouse.items.slice(0, max);
    for (var i = 0; i < list.length; i++) {
      var it = E.warehouse.items[0];
      if (!it) break;
      if (typeof this.fr2PushToPlayerBag === 'function' && !this.fr2PushToPlayerBag(it)) break;
      E.warehouse.items.shift();
      n += 1;
    }
    if (n) this.fr4Log('📦 一鍵取出好友倉庫 ' + n + ' 件裝備。', 'loot');
    else this.log('🎒 沒有可取出的物品（或行囊已滿）。', 'system');
    this.requestRender();
    return n;
  };

  proto.fr4WareSell = function (idx) {
    var E = this.fr4State();
    var i = (typeof idx === 'number') ? idx : parseInt(idx, 10);
    var it = E.warehouse.items[i];
    if (!it) return false;
    var gold = Math.round(num(this.friendItemPower(it), 100) * 0.45 + num(it.reqLv, 1) * 30);
    this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) + gold;
    E.warehouse.items.splice(i, 1);
    this.fr4Log('💰 你把【' + this.friendItemLabel(it) + '】變賣得 ' + gold.toLocaleString() + ' 兩。', 'wealth');
    this.requestRender();
    return true;
  };

  /** 把倉庫材料轉贈好友洞府 */
  proto.fr4DonateHome = function (fid, matId, n) {
    var E = this.fr4State();
    var f = this.friendById(fid);
    if (!f) return false;
    if (typeof this.fr3HomeEnsure !== 'function') { this.log('⚠️ 洞府系統未載入。', 'system'); return false; }
    var amount = Math.max(1, num(n, 1));
    var have = num(E.warehouse.mats[matId], 0);
    if (have < amount) { this.log('⚠️ ' + this.fr4MatLabel(matId) + '不足。', 'system'); return false; }

    E.warehouse.mats[matId] = have - amount;
    var h = this.fr3HomeEnsure(f);
    var hv = Math.round(amount * this.fr4Mat(matId).value * num(C4.WAREHOUSE_HOME_VALUE, 1));
    h.exp = num(h.exp, 0) + hv;
    h.givers = num(h.givers, 0) + 1;
    var ups = 0;
    try { ups = this.fr3HomeLevelUp(f, false); } catch (e) { /* 忽略 */ }
    f.favor = Math.min(100, num(f.favor, 0) + Math.round(1 + amount * 0.2));
    this.fr4Log('🧱 你把 ' + this.fr4MatLabel(matId) + '×' + amount + ' 轉贈【' + f.name + '】的洞府' +
      '（裝修 +' + hv + '）' + (ups ? '，洞府升級！' : ''), 'wealth');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ⑨ 每期推進
     ══════════════════════════════════════════════════════ */
  proto.fr4Tick = function () {
    var E = this.fr4State();
    var self = this;
    var now = this.fr4Ticks();

    // 打工
    E.works.slice().forEach(function (r) {
      r.left = num(r.left, 0) - 1;
      if (r.left <= 0) { try { self.fr4WorkDone(r); } catch (e) { console.error('[friendExtra] 打工結算失敗：', e); } }
    });

    // 煉丹
    E.alchemy.slice().forEach(function (r) {
      r.left = num(r.left, 0) - 1;
      if (r.left <= 0) { try { self.fr4AlchemyDone(r); } catch (e) { console.error('[friendExtra] 煉丹結算失敗：', e); } }
    });

    // 心願
    var iv = num(C4.WISH_INTERVAL, 14);
    if (!E.nextWish) E.nextWish = now + iv;
    if (now >= E.nextWish) { E.nextWish = now + iv; try { this.fr4WishSpawn(); } catch (e) { /* 忽略 */ } }
    E.wishes.slice().forEach(function (w) {
      w.left = num(w.left, 0) - 1;
      if (w.left <= 0) {
        var f = self.friendById(w.fid);
        if (f) f.favor = Math.max(0, num(f.favor, 0) - 4);
        E.wishes = E.wishes.filter(function (x) { return x.id !== w.id; });
        self.fr4Log('⌛ 【' + w.name + '】的心願已過期，好感 -4。', 'system');
      }
    });

    // 倉庫存入（好友在外行走時順手存入）
    var idleAll = this.friendAll().filter(function (f) { return !f.retired; });
    idleAll.forEach(function (f) {
      if (Math.random() < num(C4.WAREHOUSE_MAT, 0.12)) {
        var m = pick(MATS.length ? MATS : [{ id: 'wood', value: 14 }]);
        var n = rndInt(1, 2) + (num(f.tier && f.tier.lv, 1) >= 4 ? 1 : 0);
        E.warehouse.mats[m.id] = num(E.warehouse.mats[m.id], 0) + n;
        E.stats.matsGained += n;
      }
      if (E.warehouse.items.length < num(C4.WAREHOUSE_CAP, 40) && Math.random() < num(C4.WAREHOUSE_DEPOSIT, 0.03)) {
        var eq = null;
        try { eq = self.friendRollEquip(num(f.lv, 1)); } catch (e) { /* 忽略 */ }
        if (eq) {
          E.warehouse.items.push(eq);
          E.stats.deposits += 1;
          self.fr4Log('📦 【' + f.name + '】把【' + self.friendItemLabel(eq) + '】存進好友倉庫。', 'loot');
        }
      }
    });

    // 保鑣療傷
    var g = this.fr4Guard();
    if (g) {
      var heal = num(C4.GUARD_HEAL_PER_TICK, 1);
      this.friendAll().forEach(function (f) {
        if (f.status === 'injured' && num(f.injuredLeft, 0) > 1) {
          f.injuredLeft = Math.max(1, num(f.injuredLeft, 0) - heal);
          E.stats.guardHealed += heal;
        }
      });
    }

    // 日常增益過期清理
    if (E.buff) {
      Object.keys(E.buff).forEach(function (k) { if (num(E.buff[k].until, 0) <= now) delete E.buff[k]; });
    }
  };

  /* ══════════════════════════════════════════════════════
     ⑩ 啟動 + tick 掛載
     ══════════════════════════════════════════════════════ */
  proto.fr4InstallTick = function () {
    if (proto.__fr4TickInstalled) return true;
    if (typeof proto.fr2TickOnce === 'function') {
      var orig = proto.fr2TickOnce;
      proto.fr2TickOnce = function () {
        var r = orig.apply(this, arguments);
        try { this.fr4Tick(); } catch (e) { console.error('[friendExtra] fr4Tick 失敗：', e); }
        return r;
      };
      proto.__fr4TickInstalled = 'fr2TickOnce';
    } else if (typeof proto.friendTick === 'function') {
      var origT = proto.friendTick;
      proto.friendTick = function () {
        var before = 0;
        try { before = num(this.friendState().ticks, 0); } catch (e) { /* 忽略 */ }
        var r = origT.apply(this, arguments);
        var after = before;
        try { after = num(this.friendState().ticks, 0); } catch (e) { /* 忽略 */ }
        if (after > before) { try { this.fr4Tick(); } catch (e) { console.error('[friendExtra] fr4Tick 失敗：', e); } }
        return r;
      };
      proto.__fr4TickInstalled = 'friendTick';
    } else {
      return false;
    }
    console.log('[friendExtra] ✓ v4 擴充功能已接入每期驅動（' + proto.__fr4TickInstalled + '）');
    return true;
  };

  proto.fr4BootOnce = function () {
    if (this._fr4Booted) return;
    this._fr4Booted = true;
    try { this.fr4InstallGuardAura(); } catch (e) { console.error('[friendExtra] 保鑣加成失敗：', e); }
    try { this.fr4InstallTick(); } catch (e) { console.error('[friendExtra] tick 掛載失敗：', e); }
    try { this.fr4State(); } catch (e) { /* 忽略 */ }
    console.log('[friendExtra] ✓ 好友擴充系統已啟動');
  };

  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.fr4BootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  /* ══════════════════════════════════════════════════════
     ⑪ 報告
     ══════════════════════════════════════════════════════ */
  proto.fr4TeachReport = function () {
    var self = this;
    var list = this.friendAll().filter(function (f) { return !f.retired; }).map(function (f) {
      var t = self.fr4Teachable(f);
      return {
        id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), tier: f.tier,
        socName: f.socName, socIcon: f.socIcon, favor: num(f.favor, 0),
        sect: f.sectName || (f.sect ? f.sect : '無門無派'),
        teachable: t.slice(0, 8), teachCount: t.length
      };
    }).sort(function (a, b) { return b.teachCount - a.teachCount; });
    return {
      list: list,
      favorCost: num(C4.TEACH_FAVOR, 8),
      grantNew: !!num(C4.TEACH_GRANT_NEW, 1),
      spGain: num(C4.TEACH_SP_GAIN, 15),
      mySkills: Object.keys(this.fr4PlayerSkills()).length
    };
  };

  proto.fr4WorkReport = function () {
    var E = this.fr4State();
    var self = this;
    var jobs = JOBS.map(function (j) {
      return { id: j.id, name: j.name, icon: j.icon, desc: j.desc,
        mats: (j.mats || []).map(function (m) { return self.fr4MatLabel(m); }),
        gold: j.gold, dur: j.dur || C4.WORK_DUR };
    });
    var works = E.works.map(function (r) {
      var f = self.friendById(r.fid);
      var j = self.fr4Job(r.jobId) || { name: '?', icon: '⛏️' };
      return {
        id: r.id, fid: r.fid, name: f ? f.name : '?', icon: f ? f.icon : '🧑',
        jobName: j.name, jobIcon: j.icon, left: num(r.left, 0), total: num(r.total, 1),
        pct: Math.round((1 - num(r.left, 0) / Math.max(1, num(r.total, 1))) * 100)
      };
    });
    return {
      jobs: jobs, works: works,
      maxAssign: num(C4.WORK_MAX_ASSIGN, 4),
      idle: this.fr4IdleFriends().map(function (f) {
        return { id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), tier: f.tier };
      })
    };
  };

  proto.fr4ForgeReport = function () {
    var E = this.fr4State();
    var self = this;
    var smiths = this.friendAll().filter(function (f) {
      return !f.retired && num(f.tier && f.tier.lv, 1) >= num(C4.FORGE_MIN_TIER, 2);
    }).map(function (f) {
      return {
        id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), tier: f.tier,
        socName: f.socName, socIcon: f.socIcon,
        baseRate: num(C4.FORGE_BASE_RATE, 0.78) + (num(f.tier && f.tier.lv, 1) - 1) * num(C4.FORGE_TIER_BONUS, 0.035) + num(f.lv, 1) * num(C4.FORGE_LV_BONUS, 0.0012)
      };
    }).sort(function (a, b) { return b.baseRate - a.baseRate; });
    return {
      bag: this.fr4ForgeBag(), smiths: smiths,
      maxLv: num(C4.FORGE_MAX_LV, 10), minTier: num(C4.FORGE_MIN_TIER, 2),
      costBase: num(C4.FORGE_COST_BASE, 900), costPerLv: num(C4.FORGE_COST_PER_LV, 700),
      stats: { forged: E.stats.forged, fail: E.stats.forgeFail, gold: E.stats.forgeGold },
      myGold: num(this.charSys.rootState.gold, 0)
    };
  };

  proto.fr4AlchemyReport = function () {
    var E = this.fr4State();
    var self = this;
    return {
      runs: E.alchemy.map(function (r) {
        var f = self.friendById(r.fid);
        return {
          id: r.id, fid: r.fid, name: f ? f.name : '?', icon: f ? f.icon : '🧑',
          left: num(r.left, 0), total: num(r.total, 1),
          pct: Math.round((1 - num(r.left, 0) / Math.max(1, num(r.total, 1))) * 100)
        };
      }),
      maxAssign: num(C4.ALCHEMY_MAX_ASSIGN, 2),
      rate: num(C4.ALCHEMY_RATE, 0.85),
      dur: C4.ALCHEMY_DUR,
      pills: E.stats.pills,
      idle: this.fr4IdleFriends().map(function (f) {
        return { id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), tier: f.tier };
      })
    };
  };

  proto.fr4GuardReport = function () {
    var E = this.fr4State();
    var self = this;
    var g = this.fr4Guard();
    return {
      guard: g ? {
        id: g.id, name: g.name, icon: g.icon, lv: num(g.lv, 1), tier: g.tier,
        power: this.friendPower(g), socName: g.socName, socIcon: g.socIcon,
        favor: num(g.favor, 0), since: num(E.guardSince, 0),
        injured: g.status === 'injured'
      } : null,
      bonus: { atkPct: num(C4.GUARD_ATK_PCT, 0.06), defPct: num(C4.GUARD_DEF_PCT, 0.09), hpPct: num(C4.GUARD_HP_PCT, 0.11) },
      raidReduce: num(C4.GUARD_RAID_REDUCE, 0.45),
      freeSlot: !!num(C4.GUARD_FREE_SLOT, 1),
      stats: { blocked: E.stats.guardBlocked, healed: E.stats.guardHealed },
      candidates: this.friendAll().filter(function (f) { return !f.retired; }).map(function (f) {
        return {
          id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), power: self.friendPower(f),
          tier: f.tier, socName: f.socName, socIcon: f.socIcon,
          isGuard: f.id === E.guardId, injured: f.status === 'injured'
        };
      }).sort(function (a, b) { return b.power - a.power; })
    };
  };

  proto.fr4WishReport = function () {
    var E = this.fr4State();
    var self = this;
    return {
      wishes: E.wishes.map(function (w) {
        return {
          id: w.id, fid: w.fid, name: w.name, icon: w.icon,
          title: w.title, typeIcon: w.typeIcon, need: w.need, desc: w.desc,
          amount: num(w.amount, 0), left: num(w.left, 0),
          favor: num(w.reward && w.reward.favor, 10),
          equips: (w.need === 'equip') ? self.fr4ForgeBag().slice(0, 6) : [],
          mats: (w.need === 'mat') ? MATS.map(function (m) {
            return { id: m.id, name: m.name, icon: m.icon, count: num(E.warehouse.mats[m.id], 0) };
          }) : []
        };
      }),
      stats: { done: E.stats.wishesDone, gold: E.stats.wishGold },
      myGold: num(this.charSys.rootState.gold, 0),
      interval: num(C4.WISH_INTERVAL, 14),
      max: num(C4.WISH_MAX, 4)
    };
  };

  proto.fr4DailyReport = function () {
    var self = this;
    return {
      acts: ACTS,
      buffs: this.fr4ActiveBuff(),
      cd: num(C4.DAILY_CD, 8),
      favor: num(C4.DAILY_FAVOR, 3),
      stats: { dailies: num(this.fr4State().stats.dailies, 0) },
      friends: this.friendAll().filter(function (f) { return !f.retired; }).map(function (f) {
        return {
          id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), favor: num(f.favor, 0),
          cd: self.fr4DailyCd(f.id), tier: f.tier, socName: f.socName, socIcon: f.socIcon
        };
      }).sort(function (a, b) { return a.cd - b.cd || b.favor - a.favor; })
    };
  };

  proto.fr4WareReport = function () {
    var E = this.fr4State();
    var self = this;
    return {
      mats: MATS.map(function (m) {
        return { id: m.id, name: m.name, icon: m.icon, count: num(E.warehouse.mats[m.id], 0), value: m.value };
      }),
      items: E.warehouse.items.map(function (it, i) {
        return {
          idx: i, name: self.friendItemLabel(it), power: self.friendItemPower(it),
          reqLv: num(it.reqLv, 1), forgeLv: num(it._forgeLv, 0),
          sell: Math.round(self.friendItemPower(it) * 0.45 + num(it.reqLv, 1) * 30)
        };
      }),
      cap: num(C4.WAREHOUSE_CAP, 40),
      stats: { deposits: E.stats.deposits, matsGained: E.stats.matsGained },
      donateTargets: this.friendAll().filter(function (f) { return !f.retired; }).map(function (f) {
        return { id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1) };
      }),
      log: E.log.slice(0, 30)
    };
  };

  proto.fr4Report = function () {
    var self = this;
    function safe(fn) { try { return fn.call(self); } catch (e) { console.error('[friendExtra] 報告失敗：', e); return null; } }
    return {
      teach: safe(proto.fr4TeachReport),
      work: safe(proto.fr4WorkReport),
      forge: safe(proto.fr4ForgeReport),
      alchemy: safe(proto.fr4AlchemyReport),
      guard: safe(proto.fr4GuardReport),
      wish: safe(proto.fr4WishReport),
      daily: safe(proto.fr4DailyReport),
      ware: safe(proto.fr4WareReport),
      stats: safe(function () { return self.fr4State().stats; })
    };
  };

  /* 整合進 friendReport */
  var _friendReport = proto.friendReport;
  proto.friendReport = function () {
    var r = _friendReport.call(this);
    try { r.v4 = this.fr4Report(); } catch (e) { r.v4 = null; }
    return r;
  };

  window.HY.FriendExtra = { version: '1.0', jobs: JOBS.length, wishes: WISH.length, acts: ACTS.length, mats: MATS.length };
  console.log('[friendExtra] ✓ 已載入（授業／工坊／鍛造／煉丹／保鑣／心願／日常／倉庫）');
})();