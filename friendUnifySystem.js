// js/friendUnifySystem.js (v1)
// ⭐ 好友系統：統一資源層
//    ① 材料單一池（洞府建材 ＋ 倉庫材料 → friends.materials）
//    ② 裝備共享池（好友倉庫 = 唯一共享池，行囊/拍賣/贈裝/心願/鍛造 全互通）
//    ③ 資源集中 API（frUniGold / frUniSp / frUniMat / frUniItem …）
//    ④ 統一標籤、統一統計、統一訊息
//
// 【核心手法】不修改既有檔案，只用「覆寫 + 物件共用」：
//    fr3HomeState().mats 與 fr4State().warehouse.mats 都指向同一個物件
//    → friendHomeSystem / friendExtraSystem 的既有讀寫程式碼完全不用改
//
// ⚠️ 載入順序：friendRankSystem.js 之後（需在全部好友系統就緒後才覆寫）
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendUnify] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendUnify] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ══════════════════════════════════════════════════════
     CONFIG
     ══════════════════════════════════════════════════════ */
  F.CONFIG_UNI = {
    WARE_IDX_OFFSET: 1000,      // 索引編碼：>= 1000 代表好友倉庫
    HOME_VALUE_MUL: 1.0,        // 材料 → 洞府裝修價值倍率
    WISH_MAT_FROM_HOME: true,   // 允許用洞府建材滿足心願
    AUCTION_FROM_WARE: true,    // 允許委託倉庫裝備
    GIVE_FROM_WARE: true,       // 允許贈送倉庫裝備
    FORGE_FROM_WARE: true,      // 允許鍛造倉庫裝備
    UNIFY_LOG: true             // 統一訊息通道
  };

  /* ══════════════════════════════════════════════════════
     ★ 統一材料表（9 種，全部可用於洞府）
     ══════════════════════════════════════════════════════ */
  F.MATERIALS = [
    { id: 'wood',  name: '木材', icon: '🪵', value: 14, home: true, weight: 22, src: '伐木／打工' },
    { id: 'stone', name: '石材', icon: '🧱', value: 14, home: true, weight: 20, src: '挖礦' },
    { id: 'iron',  name: '鐵料', icon: '⛓️', value: 26, home: true, weight: 14, src: '挖礦' },
    { id: 'jade',  name: '靈玉', icon: '💠', value: 70, home: true, weight: 5,  src: '挖礦（稀有）' },
    { id: 'herb',  name: '草藥', icon: '🌿', value: 12, home: true, weight: 18, src: '採藥' },
    { id: 'ore',   name: '礦石', icon: '🪨', value: 18, home: true, weight: 12, src: '挖礦' },
    { id: 'silk',  name: '蠶絲', icon: '🧵', value: 20, home: true, weight: 9,  src: '採藥／狩獵' },
    { id: 'pelt',  name: '獸皮', icon: '🐾', value: 16, home: true, weight: 9,  src: '伐木／狩獵' },
    { id: 'fish',  name: '魚鮮', icon: '🐟', value: 10, home: true, weight: 9,  src: '垂釣' }
  ];
  var MATS = F.MATERIALS;

  proto.frUniMatDef = function (id) {
    for (var i = 0; i < MATS.length; i++) if (MATS[i].id === id) return MATS[i];
    return { id: id, name: id, icon: '📦', value: 10, home: true, weight: 1 };
  };
  proto.frUniMatLabel = function (id) { var m = this.frUniMatDef(id); return m.icon + m.name; };

  /* ══════════════════════════════════════════════════════
     ★ 單一材料池
     ══════════════════════════════════════════════════════ */
  proto.frUniMats = function () {
    var S = this.friendState();
    if (!S.materials || typeof S.materials !== 'object') S.materials = {};
    var st = S.materials;
    for (var i = 0; i < MATS.length; i++) {
      if (typeof st[MATS[i].id] !== 'number' || !isFinite(st[MATS[i].id])) st[MATS[i].id] = 0;
    }
    return st;
  };

  proto.frUniAdd = function (id, n) {
    if (!id) return 0;
    var st = this.frUniMats();
    st[id] = num(st[id], 0) + num(n, 1);
    return st[id];
  };

  proto.frUniTake = function (id, n) {
    var st = this.frUniMats();
    var have = num(st[id], 0);
    var take = Math.min(have, Math.max(0, num(n, 0)));
    if (take <= 0) return 0;
    st[id] = have - take;
    return take;
  };

  proto.frUniMatTotal = function () {
    var st = this.frUniMats(), s = 0;
    Object.keys(st).forEach(function (k) { s += num(st[k], 0); });
    return s;
  };

  /* ══════════════════════════════════════════════════════
     ★★ 關鍵：讓兩個系統的 .mats 指向同一個物件 ★★
     ══════════════════════════════════════════════════════ */

  /* 洞府：fr3HomeState().mats → 單一池 */
  var _fr3HomeState = proto.fr3HomeState;
  if (typeof _fr3HomeState === 'function') {
    proto.fr3HomeState = function () {
      var H = _fr3HomeState.call(this);
      H.mats = this.frUniMats();          // ← 物件共用
      return H;
    };
  }

  /* 倉庫：fr4State().warehouse.mats → 單一池 */
  var _fr4State = proto.fr4State;
  if (typeof _fr4State === 'function') {
    proto.fr4State = function () {
      var E = _fr4State.call(this);
      if (!E.warehouse || typeof E.warehouse !== 'object') E.warehouse = { mats: {}, items: [] };
      E.warehouse.mats = this.frUniMats();   // ← 物件共用
      if (!Array.isArray(E.warehouse.items)) E.warehouse.items = [];
      return E;
    };
  }

  /* 材料定義統一（洞府 / 倉庫都讀同一張表） */
  var _fr3MatDef = proto.fr3MatDef;
  proto.fr3MatDef = function (id) { return this.frUniMatDef(id); };
  proto.fr3MatLabel = function (id) { return this.frUniMatLabel(id); };

  var _fr4Mat = proto.fr4Mat;
  proto.fr4Mat = function (id) { return this.frUniMatDef(id); };
  proto.fr4MatLabel = function (id) { return this.frUniMatLabel(id); };

  /* 洞府隨機材料：改讀統一表（全部可用於洞府） */
  var _fr3HomeRollMat = proto.fr3HomeRollMat;
  proto.fr3HomeRollMat = function () {
    var pool = MATS.filter(function (m) { return m.home !== false; });
    if (!pool.length) return MATS[0] || null;
    var total = 0, i;
    for (i = 0; i < pool.length; i++) total += num(pool[i].weight, 1);
    var r = Math.random() * total, acc = 0;
    for (i = 0; i < pool.length; i++) { acc += num(pool[i].weight, 1); if (r <= acc) return pool[i]; }
    return pool[0];
  };

  /* ══════════════════════════════════════════════════════
     ★ 裝備共享池（好友倉庫 = 唯一共享池）
     ══════════════════════════════════════════════════════ */
  proto.frUniItems = function () {
    var E = this.fr4State();
    if (!Array.isArray(E.warehouse.items)) E.warehouse.items = [];
    return E.warehouse.items;
  };

  proto.frUniPush = function (item) {
    if (!item) return false;
    var E = this.fr4State();
    var cap = num((F.CONFIG4 || {}).WAREHOUSE_CAP, 40);
    if (this.frUniItems().length >= cap) return false;
    E.warehouse.items.push(item);
    return true;
  };

  proto.frUniIsWareIdx = function (idx) {
    return num(idx, 0) >= num(F.CONFIG_UNI.WARE_IDX_OFFSET, 1000);
  };
  proto.frUniDecode = function (idx) {
    var i = num(idx, 0);
    var off = num(F.CONFIG_UNI.WARE_IDX_OFFSET, 1000);
    if (i >= off) return { src: 'ware', i: i - off };
    return { src: 'bag', i: i };
  };
  proto.frUniEncode = function (src, i) {
    return src === 'ware' ? (num(F.CONFIG_UNI.WARE_IDX_OFFSET, 1000) + num(i, 0)) : num(i, 0);
  };

  /** 取得來源陣列 */
  proto.frUniSrcArr = function (src) {
    if (src === 'ware') return this.frUniItems();
    var root = this.charSys.rootState;
    if (!Array.isArray(root.equipBag)) root.equipBag = [];
    return root.equipBag;
  };

  /** 從來源取出（移除）一件 */
  proto.frUniPull = function (src, i) {
    var arr = this.frUniSrcArr(src);
    var idx = num(i, -1);
    if (idx < 0 || idx >= arr.length) return null;
    return arr.splice(idx, 1)[0] || null;
  };

  /** 放回玩家行囊（倉庫優先，滿了才進行囊） */
  proto.frUniStore = function (item, preferWare) {
    if (!item) return false;
    if (preferWare !== false && this.frUniPush(item)) return true;
    if (typeof this.fr2PushToPlayerBag === 'function' && this.fr2PushToPlayerBag(item)) return true;
    return this.frUniPush(item);
  };

  /* ══════════════════════════════════════════════════════
     ★ 資源集中 API
     ══════════════════════════════════════════════════════ */
  proto.frUniGold = function () { return num(this.charSys.rootState.gold, 0); };
  proto.frUniAddGold = function (n) {
    var v = Math.round(num(n, 0));
    this.charSys.rootState.gold = Math.max(0, this.frUniGold() + v);
    return this.frUniGold();
  };
  proto.frUniSp = function () { return num(this.charSys.rootState.sp, 0); };
  proto.frUniAddSp = function (n) {
    var v = Math.round(num(n, 0));
    this.charSys.rootState.sp = Math.max(0, this.frUniSp() + v);
    return this.frUniSp();
  };

  /* 統一物品標籤／戰力（單一入口） */
  proto.frUniItemLabel = function (item) {
    if (typeof this.friendItemLabel === 'function') return this.friendItemLabel(item);
    return item && item.name ? item.name : '未知裝備';
  };
  proto.frUniItemPower = function (item) {
    if (typeof this.friendItemPower === 'function') return this.friendItemPower(item);
    return 0;
  };

  /* 統一訊息 */
  proto.frUniLog = function (msg, type) {
    if (!num(F.CONFIG_UNI.UNIFY_LOG, 1)) return;
    this.friendLog(msg, type || 'time');
  };

  /* ══════════════════════════════════════════════════════
     ★ 覆寫：拍賣行委託來源（行囊 ＋ 倉庫）
     ══════════════════════════════════════════════════════ */
  var _fr3AucPlayerBag = proto.fr3AucPlayerBag;
  proto.fr3AucPlayerBag = function () {
    var self = this;
    var out = [];
    if (typeof _fr3AucPlayerBag === 'function') {
      try { out = _fr3AucPlayerBag.call(this) || []; } catch (e) { out = []; }
    }
    if (!num(F.CONFIG_UNI.AUCTION_FROM_WARE, 1)) return out;
    var items = this.frUniItems();
    items.forEach(function (it, i) {
      if (!it || typeof it !== 'object') return;
      if (!self.friendItemSlot(it)) return;
      out.push({
        idx: self.frUniEncode('ware', i),
        name: self.frUniItemLabel(it),
        reqLv: num(it.reqLv, 1),
        power: self.frUniItemPower(it),
        fromWare: true
      });
    });
    return out;
  };

  var _fr3AucConsign = proto.fr3AucConsign;
  proto.fr3AucConsign = function (bagIdx, fid) {
    var dec = this.frUniDecode(bagIdx);
    if (dec.src !== 'ware') return _fr3AucConsign.call(this, bagIdx, fid);
    // 倉庫來源：先取出，再走原本流程（塞回行囊末尾 → 用行囊索引委託）
    var item = this.frUniPull('ware', dec.i);
    if (!item) { this.log('⚠️ 倉庫中找不到該裝備。', 'system'); return false; }
    var root = this.charSys.rootState;
    if (!Array.isArray(root.equipBag)) root.equipBag = [];
    root.equipBag.push(item);
    var newIdx = root.equipBag.length - 1;
    var ok = _fr3AucConsign.call(this, newIdx, fid);
    if (!ok) {   // 失敗則退回倉庫
      var back = this.frUniPull('bag', newIdx);
      if (back) this.frUniPush(back);
    }
    return ok;
  };

  /* ══════════════════════════════════════════════════════
     ★ 覆寫：贈裝給好友（行囊 ＋ 倉庫）
     ══════════════════════════════════════════════════════ */
  var _friendPlayerEquipables = proto.friendPlayerEquipables;
  proto.friendPlayerEquipables = function () {
    var self = this;
    var out = [];
    if (typeof _friendPlayerEquipables === 'function') {
      try { out = _friendPlayerEquipables.call(this) || []; } catch (e) { out = []; }
    }
    if (!num(F.CONFIG_UNI.GIVE_FROM_WARE, 1)) return out;
    this.frUniItems().forEach(function (it, i) {
      if (!it || typeof it !== 'object') return;
      if (!self.friendItemSlot(it)) return;
      out.push({
        idx: self.frUniEncode('ware', i),
        name: self.frUniItemLabel(it),
        reqLv: num(it.reqLv, 1),
        power: self.frUniItemPower(it),
        fromWare: true
      });
    });
    return out;
  };

  var _friendGiveEquip = proto.friendGiveEquip;
  proto.friendGiveEquip = function (id, bagIdx) {
    var dec = this.frUniDecode(bagIdx);
    if (dec.src !== 'ware') return _friendGiveEquip.call(this, id, bagIdx);
    var f = this.friendById(id);
    if (!f) return false;
    var item = this.frUniPull('ware', dec.i);
    if (!item) { this.log('⚠️ 倉庫中找不到該裝備。', 'system'); return false; }
    f.bag.push(item);
    this.frUniLog('🎽 你將【' + this.frUniItemLabel(item) + '】（自好友倉庫）贈予【' + f.name + '】。', 'loot');
    if (typeof this.friendAutoEquipOne === 'function') this.friendAutoEquipOne(f);
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ★ 覆寫：鍛造來源（行囊 ＋ 倉庫）
     ══════════════════════════════════════════════════════ */
  var _fr4ForgeBag = proto.fr4ForgeBag;
  proto.fr4ForgeBag = function () {
    var self = this;
    var out = [];
    if (typeof _fr4ForgeBag === 'function') {
      try { out = _fr4ForgeBag.call(this) || []; } catch (e) { out = []; }
    }
    if (!num(F.CONFIG_UNI.FORGE_FROM_WARE, 1)) return out;
    var maxLv = num((F.CONFIG4 || {}).FORGE_MAX_LV, 10);
    this.frUniItems().forEach(function (it, i) {
      if (!it || typeof it !== 'object') return;
      if (!self.friendItemSlot(it)) return;
      var lv = num(it._forgeLv, 0);
      if (lv >= maxLv) return;
      out.push({
        idx: self.frUniEncode('ware', i),
        name: self.frUniItemLabel(it),
        reqLv: num(it.reqLv, 1),
        power: self.frUniItemPower(it),
        forgeLv: lv,
        fromWare: true
      });
    });
    return out;
  };

  var _fr4Forge = proto.fr4Forge;
  proto.fr4Forge = function (bagIdx, fid) {
    var dec = this.frUniDecode(bagIdx);
    if (dec.src !== 'ware') return _fr4Forge.call(this, bagIdx, fid);
    // 倉庫來源：暫時搬到行囊尾端，鍛造後放回倉庫
    var item = this.frUniPull('ware', dec.i);
    if (!item) { this.log('⚠️ 倉庫中找不到該裝備。', 'system'); return false; }
    var root = this.charSys.rootState;
    if (!Array.isArray(root.equipBag)) root.equipBag = [];
    root.equipBag.push(item);
    var newIdx = root.equipBag.length - 1;
    var ok = _fr4Forge.call(this, newIdx, fid);
    var back = this.frUniPull('bag', newIdx);
    if (back) this.frUniPush(back);       // 不論成敗都放回倉庫
    return ok;
  };

  /* ══════════════════════════════════════════════════════
     ★ 覆寫：心願（材料／裝備 皆可用統一池）
     ══════════════════════════════════════════════════════ */
  var _fr4WishFulfill = proto.fr4WishFulfill;
  proto.fr4WishFulfill = function (wishId, opt) {
    opt = opt || {};
    if (opt.idx !== undefined) {
      var dec = this.frUniDecode(opt.idx);
      if (dec.src === 'ware') {
        var item = this.frUniPull('ware', dec.i);
        if (!item) { this.log('⚠️ 倉庫中找不到該裝備。', 'system'); return false; }
        var root = this.charSys.rootState;
        if (!Array.isArray(root.equipBag)) root.equipBag = [];
        root.equipBag.push(item);
        var newIdx = root.equipBag.length - 1;
        var ok = _fr4WishFulfill.call(this, wishId, { idx: newIdx });
        if (!ok) { var b = this.frUniPull('bag', newIdx); if (b) this.frUniPush(b); }
        return ok;
      }
    }
    // 材料分支：因為 mats 已同池，原邏輯自動生效（洞府建材也能滿足心願）
    return _fr4WishFulfill.call(this, wishId, opt);
  };

  /* ══════════════════════════════════════════════════════
     ★ 覆寫：倉庫取出 → 優先放回行囊（維持原語意）
     ══════════════════════════════════════════════════════ */
  var _fr4WareTake = proto.fr4WareTake;
  proto.fr4WareTake = function (idx) {
    var i = (typeof idx === 'number') ? idx : parseInt(idx, 10);
    var it = this.frUniItems()[i];
    if (!it) return false;
    if (typeof this.fr2PushToPlayerBag === 'function' && !this.fr2PushToPlayerBag(it)) {
      this.log('🎒 行囊已滿，無法取出。', 'system');
      return false;
    }
    this.frUniItems().splice(i, 1);
    this.frUniLog('📦 你從好友倉庫取出【' + this.frUniItemLabel(it) + '】。', 'loot');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ★ 覆寫：報告（材料欄位改用統一表）
     ══════════════════════════════════════════════════════ */
  var _fr3HomeReport = proto.fr3HomeReport;
  if (typeof _fr3HomeReport === 'function') {
    proto.fr3HomeReport = function () {
      var r = _fr3HomeReport.call(this);
      var st = this.frUniMats();
      r.mats = MATS.map(function (m) {
        return { id: m.id, name: m.name, icon: m.icon, count: num(st[m.id], 0), value: m.value, home: true, src: m.src };
      });
      r.unified = true;
      return r;
    };
  }

  var _fr4WareReport = proto.fr4WareReport;
  if (typeof _fr4WareReport === 'function') {
    proto.fr4WareReport = function () {
      var r = _fr4WareReport.call(this);
      var st = this.frUniMats();
      r.mats = MATS.map(function (m) {
        return { id: m.id, name: m.name, icon: m.icon, count: num(st[m.id], 0), value: m.value, home: true, src: m.src };
      });
      r.unified = true;
      return r;
    };
  }

  /* ══════════════════════════════════════════════════════
     ★ 統一統計（彙總所有好友子系統）
     ══════════════════════════════════════════════════════ */
  proto.frUniStats = function () {
    var self = this;
    var S = this.friendState();
    function safeGet(path, d) {
      try {
        var o = self, parts = path.split('.'), i;
        for (i = 0; i < parts.length; i++) {
          if (typeof o[parts[i]] === 'function') o = o[parts[i]]();
          else if (o && o[parts[i]] !== undefined) o = o[parts[i]];
          else return d;
        }
        return o === undefined ? d : o;
      } catch (e) { return d; }
    }

    var gold = 0, sp = 0, kills = 0, drops = 0, levelUps = 0, equips = 0, skills = 0, sectJoins = 0, points = 0;
    var totalPower = 0, followers = 0, retired = 0, hostiles = 0, clears = 0;

    this.friendAll().forEach(function (f) {
      totalPower += self.friendPower(f);
      kills += num(f.kills, 0);
      drops += num(f.drops, 0);
      levelUps += num(f.levelUps, 0);
      equips += num(f.equips, 0);
      skills += num(f.skillsLearned, 0);
      sectJoins += num(f.sectJoins, 0);
      points += num(f.pointsSpent, 0);
      if (f.following) followers += 1;
      if (f.retired) retired += 1;
    });

    try { clears = num(this.fr2ExpState().clears, 0); } catch (e) { /* 忽略 */ }
    try { hostiles = this.fr3HosState().list.length; } catch (e) { /* 忽略 */ }

    var matTotal = this.frUniMatTotal();
    var wareCount = this.frUniItems().length;

    return {
      gold: this.frUniGold(), sp: this.frUniSp(),
      friends: this.friendAll().length, slots: this.friendSlots(),
      followers: followers, retired: retired, hostiles: hostiles,
      totalPower: totalPower, avgPower: this.friendAll().length ? Math.round(totalPower / this.friendAll().length) : 0,
      materials: matTotal, materialKinds: MATS.filter(function (m) { return num(self.frUniMats()[m.id], 0) > 0; }).length,
      wareItems: wareCount,
      combat: { kills: Math.round(kills), drops: drops, levelUps: levelUps, equips: equips, skills: skills, sectJoins: sectJoins, points: points, clears: clears },
      subsystem: {
        exp: safeGet('fr2ExpState.clears', 0),
        tourney: safeGet('fr2TourneyState.history.length', 0),
        quest: safeGet('fr2QuestState.done', 0),
        rescue: safeGet('fr2RescueState.done', 0),
        visit: safeGet('fr2VisitState.total', 0),
        retire: safeGet('fr3RetireState.count', 0),
        bond: safeGet('fr2BondState.list.length', 0),
        mail: safeGet('fr2MailState.sent', 0),
        wbKill: safeGet('fr3WbState.kills', 0),
        hosDefeat: safeGet('fr3HosState.defeated', 0),
        homeGift: safeGet('fr3HomeState.totalGifted', 0),
        aucSold: safeGet('fr3AucState.sold', 0),
        taught: safeGet('fr4State.stats.taught', 0),
        workDone: safeGet('fr4State.stats.workDone', 0),
        forged: safeGet('fr4State.stats.forged', 0),
        pills: safeGet('fr4State.stats.pills', 0),
        guardBlocked: safeGet('fr4State.stats.guardBlocked', 0),
        wishesDone: safeGet('fr4State.stats.wishesDone', 0),
        dailies: safeGet('fr4State.stats.dailies', 0)
      },
      ticks: num(S.ticks, 0)
    };
  };

  /* ══════════════════════════════════════════════════════
     ★ 遷移：把舊的兩個池子合併
     ══════════════════════════════════════════════════════ */
  proto.frUniMigrate = function () {
    var S = this.friendState();
    var store = this.frUniMats();
    var moved = 0;

    // 舊：friends.home.mats
    if (S.home && S.home.mats && typeof S.home.mats === 'object') {
      Object.keys(S.home.mats).forEach(function (k) {
        var v = num(S.home.mats[k], 0);
        if (v > 0) { store[k] = num(store[k], 0) + v; moved += v; }
        S.home.mats[k] = 0;
      });
    }
    // 舊：friends.extra.warehouse.mats
    if (S.extra && S.extra.warehouse && S.extra.warehouse.mats && typeof S.extra.warehouse.mats === 'object') {
      Object.keys(S.extra.warehouse.mats).forEach(function (k) {
        var v = num(S.extra.warehouse.mats[k], 0);
        if (v > 0) { store[k] = num(store[k], 0) + v; moved += v; }
        S.extra.warehouse.mats[k] = 0;
      });
    }
    // 補齊缺項
    MATS.forEach(function (m) { if (typeof store[m.id] !== 'number') store[m.id] = 0; });

    if (moved > 0) {
      this.frUniLog('🔗 已將洞府建材與倉庫材料合併為單一材料池（共 ' + moved + ' 份）。', 'system');
    }
    return moved;
  };

  /* ══════════════════════════════════════════════════════
     ★ 報告
     ══════════════════════════════════════════════════════ */
  proto.frUniReport = function () {
    var self = this;
    var st = this.frUniMats();
    return {
      mats: MATS.map(function (m) {
        return { id: m.id, name: m.name, icon: m.icon, count: num(st[m.id], 0), value: m.value, src: m.src, home: true };
      }),
      matTotal: this.frUniMatTotal(),
      items: this.frUniItems().map(function (it, i) {
        return {
          idx: self.frUniEncode('ware', i), name: self.frUniItemLabel(it),
          power: self.frUniItemPower(it), reqLv: num(it.reqLv, 1),
          forgeLv: num(it._forgeLv, 0), fromWare: true
        };
      }),
      gold: this.frUniGold(), sp: this.frUniSp(),
      stats: this.frUniStats(),
      flags: F.CONFIG_UNI,
      sources: {
        auction: !!num(F.CONFIG_UNI.AUCTION_FROM_WARE, 1),
        give: !!num(F.CONFIG_UNI.GIVE_FROM_WARE, 1),
        forge: !!num(F.CONFIG_UNI.FORGE_FROM_WARE, 1),
        wishMatFromHome: !!num(F.CONFIG_UNI.WISH_MAT_FROM_HOME, 1)
      }
    };
  };

  /* ══════════════════════════════════════════════════════
     ★ 整合進 friendReport
     ══════════════════════════════════════════════════════ */
  var _friendReport = proto.friendReport;
  proto.friendReport = function () {
    var r = _friendReport.call(this);
    try { r.uni = this.frUniReport(); } catch (e) { r.uni = null; }
    return r;
  };

  /* ══════════════════════════════════════════════════════
     ★ 啟動
     ══════════════════════════════════════════════════════ */
  proto.frUniBootOnce = function () {
    if (this._frUniBooted) return;
    this._frUniBooted = true;
    try { this.frUniMigrate(); } catch (e) { console.error('[friendUnify] 遷移失敗：', e); }
    try { this.frUniMats(); this.frUniItems(); } catch (e) { /* 忽略 */ }
    console.log('[friendUnify] ✓ 統一資源層已啟動（材料 ' + MATS.length + ' 種單一池｜裝備共享池｜資源 API）');
  };

  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.frUniBootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  window.HY.FriendUnify = {
    version: '1.0',
    materials: MATS.length,
    offset: num(F.CONFIG_UNI.WARE_IDX_OFFSET, 1000),
    config: F.CONFIG_UNI
  };
  console.log('[friendUnify] ✓ 已載入（材料單一池 + 裝備共享池 + 資源統一）');
})();