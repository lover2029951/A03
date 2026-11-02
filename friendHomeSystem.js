// js/friendHomeSystem.js (v1)
// ⭐ 好友系統 v3：洞府／家園
//    • 每位名人好友都有一處洞府（5 種風格，各自提供加成）
//    • 好友替你找建材 → 你可轉贈給其他好友（互相送建材）
//    • 拜訪：得禮金＋好感＋「洞府靈氣」（全好友成長 buff）
//    • 裝修：花銀兩提升裝飾度，帶動小鎮魅力與好友成長
//    • 洞府等級 → 好友成長 +2%/級、攻防血 +1.2%/級
// ⚠️ 載入順序：friendSocialSystem.js 之後
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendHomeSystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendHomeSystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var C3 = F.CONFIG3 || {};
  var STYLES = F.HOME_STYLES || [];
  var MATS = F.HOME_MATERIALS || [];

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ══════════ 狀態 ══════════ */
  proto.fr3HomeDefault = function () {
    return { mats: { wood: 0, stone: 0, iron: 0, jade: 0 }, buffUntil: 0, totalGifted: 0, totalVisit: 0, totalDecor: 0, autoGift: 0 };
  };
  proto.fr3HomeState = function () {
    var S = this.friendState();
    if (!S.home || typeof S.home !== 'object') S.home = this.fr3HomeDefault();
    var H = S.home, d = this.fr3HomeDefault(), k;
    for (k in d) { if (H[k] === undefined) H[k] = d[k]; }
    if (!H.mats || typeof H.mats !== 'object') H.mats = d.mats;
    for (k in d.mats) { if (H.mats[k] === undefined) H.mats[k] = 0; }
    return H;
  };

  proto.fr3HomeNeedExp = function (lv) { return Math.round(num(C3.HOME_EXP_BASE, 120) * lv * lv); };

  proto.fr3MatDef = function (id) {
    for (var i = 0; i < MATS.length; i++) if (MATS[i].id === id) return MATS[i];
    return null;
  };
  proto.fr3MatLabel = function (id) {
    var m = this.fr3MatDef(id);
    return m ? (m.icon + m.name) : id;
  };

  proto.fr3HomeEnsure = function (f) {
    if (!f) return null;
    if (!f.home || typeof f.home !== 'object') {
      var st = STYLES.length ? STYLES[Math.floor(Math.random() * STYLES.length)] : { id: 'bamboo', name: '竹林幽居', icon: '🎋' };
      f.home = { lv: 1, exp: 0, decor: 0, style: st.id, styleName: st.name, styleIcon: st.icon, mats: {}, lastVisit: -999, givers: 0 };
    }
    if (!f.home.mats || typeof f.home.mats !== 'object') f.home.mats = {};
    return f.home;
  };

  /* ══════════ 建材取得 ══════════ */
  proto.fr3HomeRollMat = function () {
    var total = 0, i;
    for (i = 0; i < MATS.length; i++) total += num(MATS[i].weight, 1);
    var r = Math.random() * total, acc = 0;
    for (i = 0; i < MATS.length; i++) { acc += num(MATS[i].weight, 1); if (r <= acc) return MATS[i]; }
    return MATS[0] || null;
  };

  proto.fr3HomeGainMat = function (id, n) {
    var H = this.fr3HomeState();
    H.mats[id] = num(H.mats[id], 0) + num(n, 1);
    return H.mats[id];
  };

  /* ══════════ 每期：好友替你找建材 + 互相送建材 ══════════ */
  proto.fr3HomeTick = function () {
    var H = this.fr3HomeState();
    var S = this.friendState();
    var self = this;
    var found = [];

    // 好友替你找建材（刷怪／尋寶時順手帶回）
    this.friendAll().forEach(function (f) {
      if (f.retired) return;
      if (Math.random() >= num(C3.HOME_MAT_CHANCE, 0.22)) return;
      var m = self.fr3HomeRollMat();
      if (!m) return;
      var n = rndInt(1, 2) + (num(f.tier && f.tier.lv, 1) >= 4 ? 1 : 0);
      self.fr3HomeGainMat(m.id, n);
      found.push(m.icon + m.name + '×' + n + '（' + f.name + '）');
    });
    if (found.length) {
      this.friendLog('🧱 好友帶回建材：' + found.join('、'), 'loot');
    }

    // 好友互相送建材（慢速自動成長）
    if (Math.random() < num(C3.HOME_AUTO_GIFT, 0.06)) {
      var list = this.friendAll().filter(function (f) { return !f.retired; });
      if (list.length >= 2) {
        var a = pick(list), b = pick(list);
        if (a && b && a.id !== b.id) {
          var hb = this.fr3HomeEnsure(b);
          hb.exp = num(hb.exp, 0) + num(C3.HOME_EXP_PER_MAT, 14);
          hb.givers = num(hb.givers, 0) + 1;
          H.autoGift = num(H.autoGift, 0) + 1;
          this.fr3HomeLevelUp(b, true);
        }
      }
    }
    void S;
  };

  /* ══════════ 升級 ══════════ */
  proto.fr3HomeLevelUp = function (f, silent) {
    var h = this.fr3HomeEnsure(f);
    var ups = 0;
    var maxLv = num(C3.HOME_MAX_LV, 10);
    while (num(h.lv, 1) < maxLv && num(h.exp, 0) >= this.fr3HomeNeedExp(num(h.lv, 1) + 1)) {
      h.lv = num(h.lv, 1) + 1;
      ups += 1;
    }
    if (ups > 0) {
      var d = this.friendDerived(f);
      f.currentHp = d.maxHp;
      if (!silent) {
        this.friendLog('🏠 【' + f.name + '】的洞府【' + h.styleIcon + h.styleName + '】升到 Lv.' + h.lv +
          '（成長 +' + Math.round(h.lv * num(C3.HOME_EXP_BONUS_PER_LV, 0.02) * 100) + '%）', 'gain');
      }
    }
    return ups;
  };

  /* ══════════ 贈送建材 ══════════ */
  proto.fr3HomeGive = function (fid, matId, n) {
    var f = this.friendById(fid);
    if (!f) { this.log('⚠️ 找不到好友。', 'system'); return false; }
    var h = this.fr3HomeEnsure(f);
    if (num(h.lv, 1) >= num(C3.HOME_MAX_LV, 10)) { this.log('⚠️ 【' + f.name + '】的洞府已達最高等級。', 'system'); return false; }
    var H = this.fr3HomeState();
    var have = num(H.mats[matId], 0);
    var amount = Math.max(1, Math.min(num(n, 1), have));
    if (have <= 0) { this.log('⚠️ 你沒有' + this.fr3MatLabel(matId) + '。', 'system'); return false; }

    var def = this.fr3MatDef(matId);
    H.mats[matId] = have - amount;
    var gain = amount * num(C3.HOME_EXP_PER_MAT, 14) * num(def && def.value, 1);
    h.exp = num(h.exp, 0) + gain;
    h.givers = num(h.givers, 0) + 1;
    H.totalGifted = num(H.totalGifted, 0) + amount;
    var ups = this.fr3HomeLevelUp(f, false);

    var sb = this.fr3SocBonus(f);
    var favorGain = Math.round(2 + amount * 0.4);
    favorGain = Math.round(favorGain * (1 + num(sb.favorGain, 0)));
    f.favor = Math.min(100, num(f.favor, 0) + favorGain);

    this.friendLog('🧱 你送了【' + this.fr3MatLabel(matId) + '】×' + amount + ' 給【' + f.name + '】的洞府' +
      '（裝修進度 +' + gain + '，好感 +' + favorGain + '）' + (ups ? '，洞府升級！' : ''), 'wealth');
    this.requestRender();
    return true;
  };

  /* ══════════ 裝修 ══════════ */
  proto.fr3HomeDecorCost = function (fid) {
    var f = this.friendById(fid);
    var h = f ? this.fr3HomeEnsure(f) : { lv: 1, decor: 0 };
    return Math.round(num(C3.HOME_DECOR_COST, 1500) * (1 + num(h.lv, 1) * 0.15) * (1 + num(h.decor, 0) * 0.08));
  };

  proto.fr3HomeDecorate = function (fid) {
    var f = this.friendById(fid);
    if (!f) return false;
    var h = this.fr3HomeEnsure(f);
    var cost = this.fr3HomeDecorCost(fid);
    if (num(this.charSys.rootState.gold, 0) < cost) { this.log('⚠️ 裝修需 ' + cost.toLocaleString() + ' 兩。', 'system'); return false; }
    this.charSys.rootState.gold -= cost;
    h.decor = num(h.decor, 0) + 1;
    h.exp = num(h.exp, 0) + num(C3.HOME_DECOR_EXP, 40);
    var H = this.fr3HomeState();
    H.totalDecor = num(H.totalDecor, 0) + 1;
    try {
      var t = this.ensureState();
      t.prosperity = num(t.prosperity, 0) + 25;
    } catch (e) { /* 忽略 */ }
    var ups = this.fr3HomeLevelUp(f, false);
    this.friendLog('🎨 你為【' + f.name + '】的洞府添置陳設（花費 ' + cost.toLocaleString() +
      ' 兩，裝飾度 ' + h.decor + '，繁榮 +25）' + (ups ? '，洞府升級！' : ''), 'wealth');
    this.requestRender();
    return true;
  };

  /* ══════════ 拜訪 ══════════ */
  proto.fr3HomeVisitCd = function (fid) {
    var f = this.friendById(fid);
    if (!f) return 0;
    var h = this.fr3HomeEnsure(f);
    var now = num(this.friendState().ticks, 0);
    return Math.max(0, num(h.lastVisit, -999) + num(C3.HOME_VISIT_CD, 15) - now);
  };

  proto.fr3HomeCanVisit = function (fid) {
    var f = this.friendById(fid);
    if (!f) return { ok: false, msg: '找不到好友' };
    if (f.retired) return { ok: false, msg: '【' + f.name + '】已退隱，洞府閉門謝客' };
    var cd = this.fr3HomeVisitCd(fid);
    if (cd > 0) return { ok: false, msg: '還需 ' + cd + ' 期才能再訪' };
    return { ok: true };
  };

  proto.fr3HomeVisit = function (fid) {
    var chk = this.fr3HomeCanVisit(fid);
    if (!chk.ok) { this.log('⚠️ 無法拜訪：' + chk.msg, 'system'); return false; }
    var f = this.friendById(fid);
    var h = this.fr3HomeEnsure(f);
    var H = this.fr3HomeState();
    var now = num(this.friendState().ticks, 0);
    h.lastVisit = now;

    var mul = num(f.tier && f.tier.mul, 1);
    var gold = Math.round(num(C3.HOME_VISIT_GOLD, 260) * num(h.lv, 1) * mul);
    this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) + gold;
    var sb = this.fr3SocBonus(f);
    var favorGain = Math.round(num(C3.HOME_VISIT_FAVOR, 4) * (1 + num(sb.favorGain, 0)));
    f.favor = Math.min(100, num(f.favor, 0) + favorGain);
    H.totalVisit = num(H.totalVisit, 0) + 1;

    // 洞府靈氣：全好友成長 buff
    H.buffUntil = now + num(C3.HOME_BUFF_TICKS, 20);

    // 小機率撿到建材
    var extra = '';
    if (Math.random() < 0.35) {
      var m = this.fr3HomeRollMat();
      if (m) { this.fr3HomeGainMat(m.id, rndInt(1, 3)); extra = '，並拾得 ' + m.icon + m.name; }
    }
    var eq = '';
    if (Math.random() < 0.18) {
      var item = this.friendRollEquip(num(f.lv, 1));
      if (item && this.fr2PushToPlayerBag(item)) eq = '，獲贈 ' + this.friendItemLabel(item);
    }

    this.friendLog('🏡 你拜訪了【' + f.name + '】的洞府【' + h.styleIcon + h.styleName + '】' +
      '（禮金 ' + gold.toLocaleString() + ' 兩，好感 +' + favorGain + extra + eq + '）' +
      '　洞府靈氣啟動 ' + num(C3.HOME_BUFF_TICKS, 20) + ' 期（全好友成長 +' +
      Math.round(num(C3.HOME_BUFF_MUL, 0.15) * 100) + '%）', 'wealth');
    this.requestRender();
    return true;
  };

  /* ══════════ 洞府加成灌進戰鬥數值 ══════════ */
  proto.fr3InstallHomeBonus = function () {
    var CS = window.HY.CharacterSystem;
    if (!CS || !CS.prototype || CS.prototype.__fr3HomeBonus) return;
    CS.prototype.__fr3HomeBonus = true;
    var orig = CS.prototype.getDerivedStatsForChar;
    CS.prototype.getDerivedStatsForChar = function (c) {
      var d = orig.call(this, c);
      try {
        var town = window.HY.game && window.HY.game.townSys;
        if (!town || typeof town.fr3HomeEnsure !== 'function') return d;
        if (!c || !c.id) return d;
        if (this.rootState && Array.isArray(this.rootState.roster) && this.rootState.roster.indexOf(c) !== -1) return d;
        if (typeof town.friendById !== 'function' || !town.friendById(c.id)) return d;
        var h = c.home || {};
        var lv = num(h.lv, 1);
        var per = num(0.012, 0.012);
        var styleB = (typeof town.fr3HomeStyleBonus === 'function') ? town.fr3HomeStyleBonus(c) : {};
        var atk = lv * per + num(styleB.atkPct, 0);
        var def = lv * per + num(styleB.defPct, 0);
        var hp = lv * per + num(styleB.hpPct, 0);
        if (d.atk) d.atk = Math.floor(d.atk * (1 + atk));
        if (d.def) d.def = Math.floor(d.def * (1 + def));
        if (d.maxHp) d.maxHp = Math.floor(d.maxHp * (1 + hp));
        if (typeof this.getPowerScore === 'function') d.powerScore = this.getPowerScore(d);
      } catch (e) { /* 忽略 */ }
      return d;
    };
    console.log('[friendHome] ✓ 洞府加成已掛載（含戰鬥數值）');
  };

  /* ══════════ 小鎮繁榮加成（洞府靈氣） ══════════ */
  var _getGlobalMul = proto.getGlobalMul;
  proto.getGlobalMul = function () {
    var m = _getGlobalMul.call(this);
    var v = 1;
    try {
      var H = this.fr3HomeState();
      if (num(H.buffUntil, 0) > num(this.friendState().ticks, 0)) v = 1 + 0.05;
    } catch (e) { /* 忽略 */ }
    return m * v;
  };

  /* ══════════ 啟動 ══════════ */
  proto.fr3HomeBootOnce = function () {
    if (this._fr3HomeBooted) return;
    this._fr3HomeBooted = true;
    try { this.fr3InstallHomeBonus(); } catch (e) { console.error('[friendHome] 加成掛載失敗：', e); }
    try { this.fr3HomeState(); } catch (e) { /* 忽略 */ }
    console.log('[friendHome] ✓ 洞府／家園系統已啟動');
  };

  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.fr3HomeBootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  /* ══════════ 報告 ══════════ */
  proto.fr3HomeReport = function () {
    var H = this.fr3HomeState();
    var S = this.friendState();
    var self = this;
    var now = num(S.ticks, 0);
    var buffLeft = Math.max(0, num(H.buffUntil, 0) - now);

    var list = this.friendAll().map(function (f) {
      var h = self.fr3HomeEnsure(f);
      var need = self.fr3HomeNeedExp(num(h.lv, 1) + 1);
      var maxLv = num(h.lv, 1) >= num(C3.HOME_MAX_LV, 10);
      return {
        id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), tier: f.tier,
        socName: f.socName, socIcon: f.socIcon, favor: num(f.favor, 0),
        homeLv: num(h.lv, 1), homeExp: num(h.exp, 0), homeNeed: need,
        pct: maxLv ? 100 : Math.round(num(h.exp, 0) / Math.max(1, need) * 100),
        maxLv: maxLv, decor: num(h.decor, 0), givers: num(h.givers, 0),
        styleId: h.styleId || h.style, styleName: h.styleName, styleIcon: h.styleIcon,
        styleBonus: self.fr3HomeStyleBonus(f),
        expBonus: num(h.lv, 1) * num(C3.HOME_EXP_BONUS_PER_LV, 0.02),
        visitCd: self.fr3HomeVisitCd(f.id),
        canVisit: self.fr3HomeCanVisit(f.id),
        decorCost: self.fr3HomeDecorCost(f.id)
      };
    }).sort(function (a, b) { return b.homeLv - a.homeLv || a.name.localeCompare(b.name); });

    return {
      list: list,
      mats: (F.HOME_MATERIALS || []).map(function (m) {
        return { id: m.id, name: m.name, icon: m.icon, count: num(H.mats[m.id], 0), value: m.value };
      }),
      styles: F.HOME_STYLES || [],
      buffLeft: buffLeft,
      buffTicks: num(C3.HOME_BUFF_TICKS, 20),
      buffMul: num(C3.HOME_BUFF_MUL, 0.15),
      maxLv: num(C3.HOME_MAX_LV, 10),
      stats: {
        totalGifted: num(H.totalGifted, 0), totalVisit: num(H.totalVisit, 0),
        totalDecor: num(H.totalDecor, 0), autoGift: num(H.autoGift, 0),
        avgLv: list.length ? Math.round(list.reduce(function (s, x) { return s + x.homeLv; }, 0) / list.length * 10) / 10 : 0,
        maxed: list.filter(function (x) { return x.maxLv; }).length
      }
    };
  };

  window.HY.FriendHome = { version: '1.0', styles: STYLES.length, materials: MATS.length };
  console.log('[friendHome] ✓ 已載入（洞府／家園／建材）');
})();