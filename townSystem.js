// js/townSystem.js (v2)
// ⭐ 我的小鎮：核心系統（建造／升級／組合／研究／居民／定居／職務／收益結算）
// v2 新增：【虛擬人物定居】角色住進小鎮、擔任職務、鎮上修行
// 與主遊戲關聯：銀兩(rootState.gold)、武點(rootState.sp)、行囊(rootState.inventory)
//              角色(rootState.roster)、群俠(rootState.companions)、靈獸(rootState.pets)
window.HY = window.HY || {};

(function () {
  function nowMs() { return Date.now(); }

  class TownSystem {
    constructor(charSys, inventorySys, logger, requestRender) {
      this.charSys = charSys;
      this.invSys = inventorySys;
      this.logger = logger;
      this.requestRender = (typeof requestRender === 'function') ? requestRender : function () {};
      this._prodAcc = {};
      this._spAcc = 0;
      this._comboCache = [];
      this.isRunning = false;   // 小鎮畫面是否開啟中
    }

    get def() { return (window.HY.Data && window.HY.Data.TOWN) || null; }
    get MAX_LV() { return (this.charSys && this.charSys.MAX_LEVEL) || 300; }

    log(msg, type) {
      if (this.logger && typeof this.logger.add === 'function') {
        this.logger.add(msg, type || 'system');
      }
    }

    /* ══════════ 狀態 ══════════ */
    getDefaultState() {
      return {
        founded: false,
        buildings: [],
        residents: [],
        research: [],
        prosperity: 0,
        totalIncome: 0,
        lastTick: 0,
        logs: [],
        settlers: [],   // ⭐ v2：定居的角色 [{ charId, post, buildingIdx, exp, joined }]
        guests: [],     // ⭐ v2：客居的群俠 [compId]
        guardians: [],  // ⭐ v2：鎮守的靈獸 [petId]
        stats: { built: 0, upgraded: 0, demolished: 0, ticks: 0, events: 0, pills: 0, levelUps: 0 }
      };
    }

    ensureState() {
      var root = this.charSys.rootState;
      if (!root.town || typeof root.town !== 'object') root.town = this.getDefaultState();
      var t = root.town;
      var d = this.getDefaultState();
      var k;
      for (k in d) { if (Object.prototype.hasOwnProperty.call(d, k) && t[k] === undefined) t[k] = d[k]; }
      if (!Array.isArray(t.buildings)) t.buildings = [];
      if (!Array.isArray(t.residents)) t.residents = [];
      if (!Array.isArray(t.research)) t.research = [];
      if (!Array.isArray(t.logs)) t.logs = [];
      if (!Array.isArray(t.settlers)) t.settlers = [];
      if (!Array.isArray(t.guests)) t.guests = [];
      if (!Array.isArray(t.guardians)) t.guardians = [];
      if (!t.stats || typeof t.stats !== 'object') t.stats = d.stats;
      for (k in d.stats) { if (t.stats[k] === undefined) t.stats[k] = 0; }

      // ⭐ v2 存檔遷移：把舊版 building.staffId 轉為 settlers 記錄
      t.buildings.forEach(function (b) {
        if (!b.staffId) return;
        var found = false;
        t.settlers.forEach(function (s) { if (s.charId === b.staffId) found = true; });
        if (!found) {
          t.settlers.push({ charId: b.staffId, post: 'shopkeeper', buildingIdx: b.idx, exp: 0, joined: nowMs(), x: b.idx % 12, y: Math.floor(b.idx / 12) });
        }
      });

      // 清理：已不存在的角色
      var roster = (this.charSys.rootState.roster || []).map(function (c) { return c.id; });
      t.settlers = t.settlers.filter(function (s) { return roster.indexOf(s.charId) !== -1; });
      return t;
    }

    /* ══════════ 等級／額度 ══════════ */
    getLevelInfo() {
      var D = this.def, t = this.ensureState();
      var info = D.LEVELS[0];
      for (var i = 0; i < D.LEVELS.length; i++) {
        if (t.prosperity >= D.LEVELS[i].needProsperity) info = D.LEVELS[i];
      }
      return info;
    }

    getCellsUnlocked() {
      var D = this.def;
      var cells = this.getLevelInfo().cells || 30;
      cells += this.getResearchBonus('cellBonus', 0);
      return Math.max(30, Math.min(D.GRID_W * D.GRID_H, cells));
    }

    getBuildingCap() { return this.getLevelInfo().maxBuildings || 14; }

    getResidentCap() {
      var D = this.def, t = this.ensureState();
      var cap = this.getLevelInfo().maxResidents || 4;
      cap += this.getResearchBonus('popBonus', 0);
      t.buildings.forEach(function (b) {
        var def = D.TYPES[b.type];
        if (def && def.pop) cap += def.pop * b.lv;
      });
      return cap;
    }

    /* ══════════ ⭐ 床位（角色定居容量） ══════════ */
    getBedsTotal() {
      var D = this.def, t = this.ensureState();
      var beds = 0;
      t.buildings.forEach(function (b) {
        var def = D.TYPES[b.type];
        if (def && def.cat === 'home') beds += (def.pop || D.BEDS_PER_HOUSE) * b.lv;
      });
      return beds;
    }

    getBedsUsed() { return this.ensureState().settlers.length; }
    getBedsFree() { return Math.max(0, this.getBedsTotal() - this.getBedsUsed()); }

    /* ══════════ ⭐ 定居 ══════════ */
    getCharById(charId) {
      var roster = this.charSys.rootState.roster || [];
      for (var i = 0; i < roster.length; i++) if (roster[i].id === charId) return roster[i];
      return null;
    }

    getCharPower(c) {
      try {
        if (this.charSys && typeof this.charSys.getDerivedStatsForChar === 'function') {
          var d = this.charSys.getDerivedStatsForChar(c);
          return (d && d.powerScore) || 0;
        }
      } catch (e) { /* 忽略 */ }
      return 0;
    }

    getSettlers() { return this.ensureState().settlers; }

    getSettler(charId) {
      var t = this.ensureState();
      for (var i = 0; i < t.settlers.length; i++) {
        if (t.settlers[i].charId === charId) return t.settlers[i];
      }
      return null;
    }

    isSettled(charId) { return !!this.getSettler(charId); }

    canSettle(charId) {
      var D = this.def, t = this.ensureState();
      var c = this.getCharById(charId);
      if (!c) return { ok: false, msg: '找不到該角色' };
      if (!t.founded) return { ok: false, msg: '尚未開鎮' };
      if (this.isSettled(charId)) return { ok: false, msg: '已定居小鎮' };
      if (c.lv < (D.SETTLE_MIN_LV || 1)) return { ok: false, msg: '等級不足 Lv.' + D.SETTLE_MIN_LV };
      if (this.getBedsFree() <= 0) {
        return { ok: false, msg: '沒有空床位（需再蓋【民宅】，每棟 +' + D.BEDS_PER_HOUSE + ' 床）' };
      }
      return { ok: true };
    }

    settleCharacter(charId) {
      var chk = this.canSettle(charId);
      if (!chk.ok) { this.log('⚠️ 無法定居：' + chk.msg, 'system'); return false; }
      var t = this.ensureState();
      t.settlers.push({ charId: charId, post: 'idle', buildingIdx: -1, exp: 0, joined: nowMs(),
        x: Math.floor(Math.random() * this.def.GRID_W), y: Math.floor(Math.random() * this.def.GRID_H) });
      var c = this.getCharById(charId);
      this.log('🏠 【' + (c ? c.name : '角色') + '】在【我的小鎮】安了家，開始於鎮上潛修（剩餘床位 ' + this.getBedsFree() + '／' + this.getBedsTotal() + '）。', 'time');
      this.requestRender();
      return true;
    }

    unsettleCharacter(charId) {
      var t = this.ensureState();
      var s = this.getSettler(charId);
      if (!s) return false;
      // 清掉掌櫃
      if (s.post === 'shopkeeper' && s.buildingIdx >= 0) {
        var b = this.getBuildingAt(s.buildingIdx);
        if (b && b.staffId === charId) b.staffId = null;
      }
      t.settlers = t.settlers.filter(function (x) { return x.charId !== charId; });
      var c = this.getCharById(charId);
      this.log('🎒 【' + (c ? c.name : '角色') + '】離開了小鎮，重新踏上江湖路。', 'time');
      this.requestRender();
      return true;
    }

    /* ══════════ ⭐ 職務 ══════════ */
    getPostCount(postId) {
      var t = this.ensureState();
      var n = 0;
      t.settlers.forEach(function (s) { if (s.post === postId) n += 1; });
      return n;
    }

    canSetPost(charId, postId, buildingIdx) {
      var D = this.def;
      var p = D.POSTS[postId];
      if (!p) return { ok: false, msg: '無此職務' };
      var s = this.getSettler(charId);
      if (!s) return { ok: false, msg: '尚未定居小鎮' };
      if (s.post === postId) return { ok: false, msg: '已是此職務' };
      if (p.cap > 0 && this.getPostCount(postId) >= p.cap) {
        return { ok: false, msg: '【' + p.name + '】僅限 ' + p.cap + ' 人' };
      }
      if (postId === 'shopkeeper') {
        var idx = (typeof buildingIdx === 'number') ? buildingIdx : -1;
        if (idx < 0) return { ok: false, msg: '請先在小鎮地圖點選一棟建築，再指派為掌櫃' };
        var b = this.getBuildingAt(idx);
        if (!b) return { ok: false, msg: '該格沒有建築' };
        if (b.staffId && b.staffId !== charId) {
          var other = this.getCharById(b.staffId);
          return { ok: false, msg: '該建築已有掌櫃【' + (other ? other.name : '他人') + '】' };
        }
      }
      return { ok: true };
    }

    setPost(charId, postId, buildingIdx) {
      var bidx = (typeof buildingIdx === 'number') ? buildingIdx : -1;
      var chk = this.canSetPost(charId, postId, bidx);
      if (!chk.ok) { this.log('⚠️ 無法指派職務：' + chk.msg, 'system'); return false; }

      var D = this.def;
      var s = this.getSettler(charId);
      var c = this.getCharById(charId);
      var name = c ? c.name : '角色';

      // 先卸下舊的掌櫃職務
      if (s.post === 'shopkeeper' && s.buildingIdx >= 0) {
        var oldB = this.getBuildingAt(s.buildingIdx);
        if (oldB && oldB.staffId === charId) oldB.staffId = null;
      }

      s.post = postId;
      s.buildingIdx = (postId === 'shopkeeper') ? bidx : -1;

      if (postId === 'shopkeeper') {
        var b = this.getBuildingAt(bidx);
        if (b) {
          b.staffId = charId;
          this.log('🏪 【' + name + '】出任 ' + this.cellLabel(bidx) + ' 的【' + D.TYPES[b.type].name + '】掌櫃。', 'wealth');
        }
      } else {
        var pdef = D.POSTS[postId];
        this.log(pdef.icon + ' 【' + name + '】出任小鎮【' + pdef.name + '】。' + pdef.desc, 'time');
      }
      this.requestRender();
      return true;
    }

    getPostBonus() {
      var D = this.def, t = this.ensureState();
      var out = { incomeMul: 0, spMul: 0, prosperityMul: 0, order: 0 };
      t.settlers.forEach(function (s) {
        var p = D.POSTS[s.post];
        if (!p) return;
        out.incomeMul += (p.incomeMul || 0);
        out.spMul += (p.spMul || 0);
        out.prosperityMul += (p.prosperityMul || 0);
        out.order += (p.order || 0);
      });
      return out;
    }

    /* ══════════ ⭐ 群俠客居 / 靈獸鎮守 ══════════ */
    getGuestTier(reqLv) {
      var tiers = this.def.GUEST_TIERS;
      var out = tiers[0];
      for (var i = 0; i < tiers.length; i++) if ((reqLv || 0) >= tiers[i].min) out = tiers[i];
      return out;
    }

    getGuests() { return this.ensureState().guests; }

    toggleGuest(compId) {
      var t = this.ensureState();
      var Data = window.HY.Data || {};
      var comp = Data.COMPANIONS && Data.COMPANIONS[compId];
      if (!comp) return false;
      var at = t.guests.indexOf(compId);
      if (at === -1) {
        t.guests.push(compId);
        this.log('👥 群俠【' + comp.name + '】應邀蒞臨小鎮作客，全鎮聲威大振。', 'time');
      } else {
        t.guests.splice(at, 1);
        this.log('👋 群俠【' + comp.name + '】辭別小鎮，繼續雲遊去了。', 'time');
      }
      this.requestRender();
      return true;
    }

    getGuardians() { return this.ensureState().guardians; }

    toggleGuardian(petId) {
      var t = this.ensureState();
      var Data = window.HY.Data || {};
      var pet = Data.PETS && Data.PETS[petId];
      if (!pet) return false;
      var at = t.guardians.indexOf(petId);
      if (at === -1) {
        t.guardians.push(petId);
        this.log('🐾 靈獸【' + pet.name + '】開始鎮守小鎮，宵小不敢近。', 'time');
      } else {
        t.guardians.splice(at, 1);
        this.log('🐾 靈獸【' + pet.name + '】解除鎮守，返回你身邊。', 'time');
      }
      this.requestRender();
      return true;
    }

    getGuestList() {
      var self = this;
      var Data = window.HY.Data || {};
      var owned = this.charSys.rootState.companions || {};
      var list = [];
      Object.keys(owned).forEach(function (id) {
        var comp = Data.COMPANIONS && Data.COMPANIONS[id];
        if (!comp) return;
        var tier = self.getGuestTier(comp.reqLv);
        list.push({
          id: id, name: comp.name, title: comp.title, lv: owned[id] || 1,
          reqLv: comp.reqLv, tier: tier, here: self.getGuests().indexOf(id) !== -1
        });
      });
      return list;
    }

    getGuardianList() {
      var self = this;
      var Data = window.HY.Data || {};
      var owned = this.charSys.rootState.pets || {};
      var list = [];
      Object.keys(owned).forEach(function (id) {
        var pet = Data.PETS && Data.PETS[id];
        if (!pet) return;
        list.push({
          id: id, name: pet.name, species: pet.species, reqLv: pet.reqLv,
          here: self.getGuardians().indexOf(id) !== -1
        });
      });
      return list;
    }

    getVisitorBonus() {
      var D = this.def, t = this.ensureState();
      var Data = window.HY.Data || {};
      var out = { appeal: 0, incomeMul: 0, order: 0, guests: t.guests.length, guardians: t.guardians.length };
      t.guests.forEach(function (id) {
        var comp = Data.COMPANIONS && Data.COMPANIONS[id];
        if (!comp) return;
        var tier = (function (reqLv) {
          var ts = D.GUEST_TIERS, o = ts[0];
          for (var i = 0; i < ts.length; i++) if ((reqLv || 0) >= ts[i].min) o = ts[i];
          return o;
        })(comp.reqLv);
        out.appeal += tier.appeal;
        out.incomeMul += tier.incomeMul;
      });
      t.guardians.forEach(function (id) {
        var pet = Data.PETS && Data.PETS[id];
        if (!pet) return;
        out.appeal += D.GUARDIAN.appeal;
        out.incomeMul += D.GUARDIAN.incomeMul;
        out.order += D.GUARDIAN.order;
      });
      return out;
    }

    getTotalOrder() {
      return this.getPostBonus().order + this.getVisitorBonus().order;
    }

    /* ══════════ 研究 ══════════ */
    hasResearch(id) { return this.ensureState().research.indexOf(id) !== -1; }

    getResearchBonus(key, dflt) {
      var D = this.def, t = this.ensureState();
      var sum = 0, found = false;
      D.RESEARCH.forEach(function (r) {
        if (t.research.indexOf(r.id) === -1) return;
        if (r.bonus && typeof r.bonus[key] === 'number') { sum += r.bonus[key]; found = true; }
      });
      return found ? sum : dflt;
    }

    getGlobalMul() {
      var t = this.ensureState();
      var mul = 1 + this.getResearchBonus('incomeMul', 0);
      var consume = 0;
      t.residents.forEach(function (p) { consume += (p.lv || 1) * 0.004; });
      var pb = this.getPostBonus();
      var vb = this.getVisitorBonus();
      return mul * (1 + consume) * (1 + pb.incomeMul) * (1 + vb.incomeMul);
    }

    isTypeUnlocked(typeId) {
      var D = this.def, t = this.ensureState();
      var def = D.TYPES[typeId];
      if (!def) return false;
      if (!def.research) return true;
      return t.research.indexOf(def.research) !== -1;
    }

    getUnlockedTypes() {
      var self = this, D = this.def;
      return Object.keys(D.TYPES).filter(function (id) { return self.isTypeUnlocked(id); });
    }

    researchCost(r) {
      return Math.max(1, Math.floor(r.cost * (1 - this.getResearchBonus('researchCostMul', 0))));
    }

    canResearch(id) {
      var D = this.def, t = this.ensureState();
      var r = null;
      D.RESEARCH.forEach(function (x) { if (x.id === id) r = x; });
      if (!r) return { ok: false, msg: '無此研究' };
      if (t.research.indexOf(id) !== -1) return { ok: false, msg: '已完成' };
      var cost = this.researchCost(r);
      if (this.charSys.rootState.gold < cost) return { ok: false, msg: '銀兩不足（需 ' + cost + ' 兩）' };
      return { ok: true, r: r, cost: cost };
    }

    doResearch(id) {
      var chk = this.canResearch(id);
      if (!chk.ok) { this.log('⚠️ 無法研究：' + chk.msg, 'system'); return false; }
      var t = this.ensureState();
      this.charSys.rootState.gold -= chk.cost;
      t.research.push(id);
      this.log('🔬 完成研究【' + chk.r.name + '】，花費 ' + chk.cost + ' 兩。' + chk.r.desc, 'wealth');
      this.requestRender();
      return true;
    }

    /* ══════════ 網格 ══════════ */
    getBuildingAt(idx) {
      var t = this.ensureState();
      for (var i = 0; i < t.buildings.length; i++) {
        if (t.buildings[i].idx === idx) return t.buildings[i];
      }
      return null;
    }

    cellLabel(idx) {
      var W = this.def.GRID_W;
      return '(' + (Math.floor(idx / W) + 1) + ',' + ((idx % W) + 1) + ')';
    }

    /* ══════════ 組合 ══════════ */
    getActiveCombos() {
      var D = this.def, t = this.ensureState();
      var W = D.GRID_W;
      var map = {};
      t.buildings.forEach(function (b) { map[b.idx] = b; });
      var used = {};
      var list = [];
      D.COMBOS.forEach(function (c) {
        t.buildings.forEach(function (b) {
          if (b.type !== c.a) return;
          var row = Math.floor(b.idx / W);
          [b.idx - 1, b.idx + 1, b.idx - W, b.idx + W].forEach(function (n) {
            if (n < 0 || n >= W * D.GRID_H) return;
            if (Math.abs(n - b.idx) === 1 && Math.floor(n / W) !== row) return;
            var other = map[n];
            if (!other || other.type !== c.b) return;
            var key = (b.idx < n ? b.idx + '>' + n : n + '>' + b.idx) + '|' + c.a + '|' + c.b;
            if (used[key]) return;
            used[key] = true;
            list.push({ name: c.name, icon: c.icon, mul: c.mul, cells: [b.idx, n] });
          });
        });
      });
      return list;
    }

    getComboMulFor(idx, combos) {
      var mul = 1;
      (combos || []).forEach(function (c) { if (c.cells.indexOf(idx) !== -1) mul *= c.mul; });
      return mul;
    }

    /* ══════════ 掌櫃（相容舊 API） ══════════ */
    getStaffOf(idx) {
      var b = this.getBuildingAt(idx);
      if (!b || !b.staffId) return null;
      return this.getCharById(b.staffId);
    }

    getStaffAssignment(charId) {
      var s = this.getSettler(charId);
      if (s && s.post === 'shopkeeper' && s.buildingIdx >= 0) return s.buildingIdx;
      return -1;
    }

    getShopkeeperMulFor(idx) {
      var b = this.getBuildingAt(idx);
      var D = this.def;
      if (!b || !b.staffId) return 1;
      var c = this.getCharById(b.staffId);
      if (!c) return 1;
      var def = D.TYPES[b.type];
      var add = Math.min(0.5, (c.lv || 1) / 300 * 0.5) + (def && def.cat === 'shop' ? 0.05 : 0);
      return 1 + add;
    }

    // 舊 API：指派掌櫃（會自動定居）
    assignStaff(idx, charId) {
      var b = this.getBuildingAt(idx);
      if (!b) return false;
      if (!this.isSettled(charId)) {
        if (!this.settleCharacter(charId)) return false;
      }
      return this.setPost(charId, 'shopkeeper', idx);
    }

    unassignStaff(idx) {
      var b = this.getBuildingAt(idx);
      if (!b || !b.staffId) return false;
      var s = this.getSettler(b.staffId);
      if (s) { s.post = 'idle'; s.buildingIdx = -1; }
      b.staffId = null;
      this.requestRender();
      return true;
    }

    /* ══════════ 建造／升級／拆除 ══════════ */
    canBuild(idx, typeId) {
      var D = this.def, t = this.ensureState();
      var def = D.TYPES[typeId];
      if (!def) return { ok: false, msg: '未知建築' };
      if (idx < 0 || idx >= D.GRID_W * D.GRID_H) return { ok: false, msg: '超出地圖範圍' };
      if (idx >= this.getCellsUnlocked()) return { ok: false, msg: '此地尚未開墾' };
      if (this.getBuildingAt(idx)) return { ok: false, msg: '此格已有建築' };
      if (t.buildings.length >= this.getBuildingCap()) return { ok: false, msg: '建築數量已達上限（' + this.getBuildingCap() + '）' };
      if (!this.isTypeUnlocked(typeId)) return { ok: false, msg: '尚未研究解鎖' };
      if (this.charSys.rootState.gold < def.cost) return { ok: false, msg: '銀兩不足（需 ' + def.cost + ' 兩）' };
      return { ok: true, def: def };
    }

    build(idx, typeId) {
      var chk = this.canBuild(idx, typeId);
      if (!chk.ok) { this.log('⚠️ 無法建造：' + chk.msg, 'system'); return false; }
      var t = this.ensureState();
      this.charSys.rootState.gold -= chk.def.cost;
      t.buildings.push({ idx: idx, type: typeId, lv: 1, staffId: null, born: nowMs() });
      t.stats.built += 1;
      this.log('🏗️ 於 ' + this.cellLabel(idx) + ' 動土建造【' + chk.def.name + '】，花費 ' + chk.def.cost + ' 兩紋銀。', 'wealth');
      this.requestRender();
      return true;
    }

    upgradeCost(b) {
      var D = this.def, def = D.TYPES[b.type];
      if (!def) return 0;
      return Math.floor(def.cost * Math.pow(D.UPGRADE_MUL, b.lv));
    }

    canUpgrade(idx) {
      var D = this.def, b = this.getBuildingAt(idx);
      if (!b) return { ok: false, msg: '此格沒有建築' };
      if (b.lv >= D.MAX_LV) return { ok: false, msg: '已達最高等級 Lv.' + D.MAX_LV };
      var cost = this.upgradeCost(b);
      if (this.charSys.rootState.gold < cost) return { ok: false, msg: '銀兩不足（需 ' + cost + ' 兩）' };
      return { ok: true, cost: cost };
    }

    upgrade(idx) {
      var chk = this.canUpgrade(idx);
      if (!chk.ok) { this.log('⚠️ 無法升級：' + chk.msg, 'system'); return false; }
      var b = this.getBuildingAt(idx);
      this.charSys.rootState.gold -= chk.cost;
      b.lv += 1;
      this.ensureState().stats.upgraded += 1;
      this.log('🔨 【' + this.def.TYPES[b.type].name + '】' + this.cellLabel(idx) + ' 升級至 Lv.' + b.lv + '，花費 ' + chk.cost + ' 兩。', 'wealth');
      this.requestRender();
      return true;
    }

    investedIn(b) {
      var D = this.def, def = D.TYPES[b.type];
      var total = 0;
      for (var i = 0; i < b.lv; i++) total += Math.floor(def.cost * Math.pow(D.UPGRADE_MUL, i));
      return total;
    }

    demolish(idx) {
      var t = this.ensureState();
      var b = this.getBuildingAt(idx);
      if (!b) return false;
      var refund = Math.floor(this.investedIn(b) * this.def.DEMOLISH_REFUND);
      // 卸下掌櫃
      if (b.staffId) {
        var s = this.getSettler(b.staffId);
        if (s && s.post === 'shopkeeper' && s.buildingIdx === idx) { s.post = 'idle'; s.buildingIdx = -1; }
      }
      t.buildings = t.buildings.filter(function (x) { return x.idx !== idx; });
      this.charSys.rootState.gold += refund;
      t.stats.demolished += 1;
      this.log('🧨 拆除了 ' + this.cellLabel(idx) + ' 的【' + this.def.TYPES[b.type].name + '】，回收 ' + refund + ' 兩。', 'wealth');
      this.requestRender();
      return true;
    }

    /* ══════════ 收益計算 ══════════ */
    // 每期實際武點產出（含教習加成與 SP_ACCRUAL 速率，可能為小數）
    getSpPerTick() {
      var D = this.def, t = this.ensureState();
      var sp = 0;
      t.buildings.forEach(function (b) {
        var def = D.TYPES[b.type];
        if (def && def.produceSp) sp += def.produceSp * b.lv;
      });
      var rate = (typeof D.SP_ACCRUAL === 'number') ? D.SP_ACCRUAL : 0.05;
      var postSp = this.getPostBonus().spMul;
      return sp * (1 + this.getResearchBonus('spMul', 0)) * (1 + postSp) * rate;
    }

    compute() {
      var D = this.def, t = this.ensureState();
      var combos = this.getActiveCombos();
      this._comboCache = combos;
      var gMul = this.getGlobalMul();
      var roster = this.charSys.rootState.roster || [];
      var self = this;
      var vb = this.getVisitorBonus();
      var income = 0, appeal = 0, staffSum = 0, staffCount = 0;

      t.buildings.forEach(function (b) {
        var def = D.TYPES[b.type];
        if (!def) return;
        var comboMul = self.getComboMulFor(b.idx, combos);
        var sMul = 1;
        if (b.staffId) {
          for (var i = 0; i < roster.length; i++) {
            if (roster[i].id === b.staffId) {
              var add = Math.min(0.5, (roster[i].lv || 1) / 300 * 0.5) + (def.cat === 'shop' ? 0.05 : 0);
              sMul += add;
              staffSum += sMul;
              staffCount += 1;
              break;
            }
          }
        }
        income += (def.income || 0) * b.lv * comboMul * sMul;
        appeal += (def.appeal || 0) * b.lv * comboMul * sMul;
      });

      income = income * gMul;
      appeal = (appeal * gMul + vb.appeal) * (1 + this.getResearchBonus('appealMul', 0));

      return {
        combos: combos,
        gMul: gMul,
        staffMul: staffCount > 0 ? (staffSum / staffCount) : 1,
        visitor: vb,
        income: Math.floor(income),
        appeal: Math.floor(appeal),
        sp: this.getSpPerTick()
      };
    }

    /* ══════════ 結算 ══════════ */
    tick() {
      var t = this.ensureState();
      if (!t.founded) return null;

      var snap = this.compute();
      var gold = snap.income;

      this.charSys.rootState.gold += gold;
      // 武點：累加器處理小數速率，每期不足 1 點時累積到滿 1 點才發放
      this._spAcc += snap.sp;
      var spGain = Math.floor(this._spAcc);
      this._spAcc -= spGain;
      if (spGain > 0) this.charSys.rootState.sp += spGain;

      t.totalIncome += gold;
      var baseProsper = Math.floor(gold / 10) + Math.floor(snap.appeal / 12);
      var prosperMul = 1 + this.getPostBonus().prosperityMul;
      t.prosperity += Math.floor(baseProsper * prosperMul);
      t.stats.ticks += 1;
      t.lastTick = nowMs();

      this._produceItems(t);
      this._trySpawnResident(t, snap);
      this._cultivate(t);
      this._checkLevelUp(t);
      if (Math.random() < 0.04) this._randomEvent(t, snap);

      return { gold: gold, sp: spGain, snap: snap };
    }

    _produceItems(t) {
      var D = this.def, self = this;
      var Data = window.HY.Data || {};
      if (!Data.ITEMS) return;
      t.buildings.forEach(function (b) {
        var def = D.TYPES[b.type];
        if (!def || !def.produce) return;
        var key = b.idx + ':' + def.produce;
        self._prodAcc[key] = (self._prodAcc[key] || 0) + 1;
        var need = Math.max(2, 8 - b.lv);
        if (self._prodAcc[key] < need) return;
        self._prodAcc[key] = 0;
        if (!Data.ITEMS[def.produce]) return;
        if (self.invSys && typeof self.invSys.addItem === 'function') {
          self.invSys.addItem(def.produce, 1);
          self.log('🏘️ 【' + def.name + '】產出【' + Data.ITEMS[def.produce].name + '】x1，已送入行囊。', 'loot');
        }
      });
    }

    _trySpawnResident(t, snap) {
      if (t.residents.length >= this.getResidentCap()) return;
      var chance = Math.min(0.5, snap.appeal / 500 + 0.02);
      if (Math.random() > chance) return;
      var pool = this.def.NPC_NAMES;
      var used = {};
      t.residents.forEach(function (p) { used[p.name] = true; });
      var name = pool[Math.floor(Math.random() * pool.length)];
      var tries = 0;
      while (used[name] && tries < 20) { name = pool[Math.floor(Math.random() * pool.length)]; tries++; }
      var lv = 1 + Math.floor(Math.random() * 4);
      t.residents.push({
        id: 'res' + nowMs() + Math.floor(Math.random() * 10000),
        name: name, lv: lv,
        x: Math.random() * (this.def.GRID_W - 1), y: Math.random() * (this.def.GRID_H - 1)
      });
      this.log('👥 新鎮民【' + name + ' Lv.' + lv + '】遷入小鎮！', 'time');
    }

    /* ══════════ ⭐ 角色修行 ══════════ */
    getCultivateRate() {
      var D = this.def, t = this.ensureState();
      var townLv = this.getLevelInfo().lv;
      return D.CULTIVATE_RATE
        * (1 + (townLv - 1) * D.CULTIVATE_TOWN_BONUS)
        * (1 + t.buildings.length * D.CULTIVATE_BUILD_BONUS);
    }

    // 單一角色每期可獲得的經驗（純函式，供 UI 預覽）
    getCultivateExpGain(c) {
      if (!c || c.lv >= this.MAX_LV) return 0;
      return Math.max(1, Math.round((c.maxExp || 100) * this.getCultivateRate()));
    }

    _cultivate(t) {
      var self = this;
      var maxLv = this.MAX_LV;
      t.settlers.forEach(function (s) {
        var c = self.getCharById(s.charId);
        if (!c) return;
        if (c.lv >= maxLv) { c.exp = 0; return; }
        var add = self.getCultivateExpGain(c);
        c.exp = (c.exp || 0) + add;
        s.exp = (s.exp || 0) + add;

        while (c.exp >= c.maxExp && c.lv < maxLv) {
          c.exp -= c.maxExp;
          c.lv += 1;
          c.freePoints = (c.freePoints || 0) + 5;
          c.maxExp = Math.floor(100 * Math.pow(c.lv, 1.85) + c.lv * 120);
          try {
            if (typeof self.charSys.getDerivedStatsForChar === 'function') {
              var d = self.charSys.getDerivedStatsForChar(c);
              c.currentHp = d.maxHp;
              c.currentMp = d.maxMp;
            }
          } catch (e) { /* 忽略 */ }
          t.stats.levelUps += 1;
          self.log('🎉 【' + c.name + '】於小鎮潛修有成，境界突破至 Lv.' + c.lv +
            '！獲得 5 點潛能，氣血內力全滿。', 'system');
        }
      });
    }

    _checkLevelUp(t) {
      var info = this.getLevelInfo();
      if (t._lastLevel && info.lv > t._lastLevel) {
        this.log('🎉 小鎮升級！【' + info.icon + ' ' + info.name + '】—— ' + info.desc +
          '（可用土地 ' + info.cells + ' 格／上限 ' + info.maxBuildings + ' 棟）', 'time');
      }
      t._lastLevel = info.lv;
    }

    _randomEvent(t, snap) {
      var D = this.def;
      var ev = D.EVENTS[Math.floor(Math.random() * D.EVENTS.length)];
      var order = this.getTotalOrder();

      // ⭐ 治安值 > 0 → 盜匪事件被擋下
      if (ev.negatedByGuard && order > 0) {
        ev = D.GUARD_COUNTER;
        t.stats.events += 1;
        this.log(ev.icon + ' 【' + ev.name + '】' + ev.text +
          '（治安 ' + order + '，繁榮 +' + ev.gain.prosperity + '）', 'time');
        t.prosperity += ev.gain.prosperity;
        return;
      }

      var g = ev.gain || {};
      var gold = 0;
      if (g.goldMul) gold = Math.floor(snap.income * g.goldMul);
      if (gold > 0) { this.charSys.rootState.gold += gold; t.totalIncome += gold; }
      if (g.prosperity) t.prosperity = Math.max(0, t.prosperity + g.prosperity);
      t.stats.events += 1;
      this.log(ev.icon + ' 【' + ev.name + '】' + ev.text +
        (gold > 0 ? '（進帳 ' + gold + ' 兩）' : '') +
        (g.prosperity ? '（繁榮 ' + (g.prosperity > 0 ? '+' : '') + g.prosperity + '）' : ''), 'time');
    }

    /* ══════════ 開鎮 / 離線補算 ══════════ */
    foundTown() {
      var t = this.ensureState();
      if (t.founded) return false;
      if (this.charSys.rootState.gold < this.def.FOUND_COST) {
        this.log('⚠️ 開鎮需 ' + this.def.FOUND_COST + ' 兩紋銀，目前不足。', 'system');
        return false;
      }
      this.charSys.rootState.gold -= this.def.FOUND_COST;
      t.founded = true;
      var W = this.def.GRID_W;
      t.buildings.push({ idx: W * 1 + 1, type: 'house', lv: 1, staffId: null, born: nowMs() });
      t.buildings.push({ idx: W * 1 + 2, type: 'farm', lv: 1, staffId: null, born: nowMs() });
      t.buildings.push({ idx: W * 2 + 1, type: 'well', lv: 1, staffId: null, born: nowMs() });
      t.lastTick = nowMs();
      this.log('🏘️ 你在荒野上立起了第一塊界碑——【我的小鎮】正式開鎮！贈送民宅、農田、水井各一（民宅提供 ' + this.getBedsTotal() + ' 個床位）。', 'time');
      this.requestRender();
      return true;
    }

    onOpen() {
      var t = this.ensureState();
      this.isRunning = true;
      if (!t.founded) return;
      var now = nowMs();
      if (t.lastTick > 0) {
        var ticks = Math.floor((now - t.lastTick) / this.def.TICK_MS);
        if (ticks > 1) {
          var capped = Math.min(this.def.OFFLINE_CAP_TICKS, ticks);
          var snap = this.compute();
          var gold = Math.floor(snap.income * capped * 0.5);
          var sp = Math.floor(snap.sp * capped * 0.5);
          if (gold > 0) this.charSys.rootState.gold += gold;
          if (sp > 0) this.charSys.rootState.sp += sp;
          if (gold > 0 || sp > 0) {
            this.log('🌙 你離開的期間，鎮民自治營運了 ' + capped + ' 個週期，帶回 ' + gold + ' 兩紋銀' +
              (sp > 0 ? '、' + sp + ' 武點' : '') + '。', 'wealth');
          }
          t.lastTick = now;
        }
      }
    }

    onClose() {
      this.isRunning = false;
      this.ensureState().lastTick = nowMs();
    }

    /* ══════════ 道具關聯 ══════════ */
    supplyItem(itemId) {
      var inv = this.charSys.rootState.inventory || {};
      if (!inv[itemId] || inv[itemId] <= 0) return false;
      var Data = window.HY.Data || {};
      var item = Data.ITEMS && Data.ITEMS[itemId];
      if (!item) return false;
      inv[itemId] -= 1;
      if (inv[itemId] <= 0) delete inv[itemId];
      var gain = Math.max(40, Math.floor((item.price || 20) * 1.2));
      var t = this.ensureState();
      t.prosperity += gain;
      t.stats.pills += 1;
      this.log('🎁 你將【' + item.name + '】分送鎮民，小鎮繁榮度 +' + gain + '！', 'wealth');
      this.requestRender();
      return true;
    }

    getTownBonus() {
      var t = this.ensureState();
      var lv = this.getLevelInfo().lv;
      return {
        townLevel: lv,
        prosperity: t.prosperity,
        expMul: 1 + (lv - 1) * 0.03,
        goldMul: 1 + this.getResearchBonus('incomeMul', 0)
      };
    }

    getStats() {
      var t = this.ensureState();
      var snap = this.compute();
      var pb = this.getPostBonus();
      var vb = this.getVisitorBonus();
      return {
        level: this.getLevelInfo(),
        gold: this.charSys.rootState.gold,
        population: t.residents.length,
        popCap: this.getResidentCap(),
        bedsUsed: this.getBedsUsed(),
        bedsTotal: this.getBedsTotal(),
        buildings: t.buildings.length,
        buildingCap: this.getBuildingCap(),
        cellsUnlocked: this.getCellsUnlocked(),
        prosperity: t.prosperity,
        income: snap.income,
        sp: snap.sp,
        appeal: snap.appeal,
        combos: snap.combos,
        staffMul: snap.staffMul,
        gMul: snap.gMul,
        postBonus: pb,
        visitorBonus: vb,
        order: this.getTotalOrder(),
        cultivateRate: this.getCultivateRate(),
        totalIncome: t.totalIncome,
        stats: t.stats
      };
    }
  }

  window.HY.TownSystem = TownSystem;
})();