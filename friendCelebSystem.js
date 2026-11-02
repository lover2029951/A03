// js/friendCelebSystem.js (v1)
// ⭐ 好友系統 v3：好友＝「世界名人」（取自 celebAll()，共 360 位）
//    • 等級：由 tier（5 星身價）推導 + id 雜湊抖動（保證同一名人永遠同一等級）
//    • 定位：由 society（武林／科學／帝王／文人／現代）推導
//    • 費用：maxSpend × tier.mul（直接用真實資料，不再自創）
//    • 加成：society → 好友成長加成
// ⚠️ 載入順序：friendSystem.js 之後
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendCelebSystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendCelebSystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var C3 = F.CONFIG3 || {};
  var STYLES = F.HOME_STYLES || [];

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /** 穩定雜湊（同一 id 永遠同值 → 名人等級不會每次重載都變） */
  function hash(s) {
    var h = 2166136261, i;
    s = String(s || '');
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }

  /* ══════════════════════════════════════════════════════
     名人 → 好友規格
     ══════════════════════════════════════════════════════ */
  proto.fr3CelebLv = function (c) {
    if (!c) return 1;
    var lvArr = C3.CELEB_LV_BY_TIER || [0, 6, 16, 32, 52, 78];
    var tl = num(c.tier && c.tier.lv, 1);
    var base = num(lvArr[tl], num(lvArr[lvArr.length - 1], 40));
    var jit = num(C3.CELEB_LV_JITTER, 0.4);
    var h = hash(c.id);
    var delta = ((h % 1000) / 1000 - 0.5) * 2 * jit;      // -jit ~ +jit
    return Math.max(1, Math.round(base * (1 + delta)));
  };

  proto.fr3CelebRole = function (c) {
    if (!c) return 'ranger';
    var soc = c.society;
    var map = C3.SOCIETY_ROLE || {};
    var heavy = C3.WULIN_HEAVY || [];
    if (soc === 'wulin' && heavy.indexOf(c.id) !== -1) return 'tank';
    var r = map[soc];
    if (r === 'dps') {                                    // 武林再依 id 分輸出／敏
      return (hash(c.id) % 3 === 0) ? 'agi' : 'dps';
    }
    if (r) return r;
    var fallback = ['swordsman', 'blade', 'boxer', 'spearman', 'archer', 'assassin', 'healer', 'sorcerer', 'ranger'];
    return fallback[hash(c.id) % fallback.length];
  };

  /** 名人 → 完整好友物件（沿用 friendMake 的欄位規格，保證戰鬥可用） */
  proto.fr3MakeFromCeleb = function (c) {
    if (!c) return null;
    var lv = this.fr3CelebLv(c);
    var role = this.fr3CelebRole(c);
    var f = this.friendMake({ id: c.id, name: c.name, icon: c.icon, lv: lv }, { lv: lv, role: role });
    if (!f) return null;

    // 名人專屬欄位
    f.celebId = c.id;
    f.title = c.title || '';
    f.tier = c.tier || { lv: 1, name: '見習', icon: '★', mul: 1 };
    f.society = c.society || null;
    f.socName = c.socName || '江湖散人';
    f.socIcon = c.socIcon || '👤';
    f.spend = c.spend || [100, 1000];
    f.maxSpend = num(c.maxSpend, 1000);
    f.favor = num(C3.CELEB_START_FAVOR, 20);

    // 洞府（每人都有一處）
    var st = STYLES.length ? STYLES[hash(c.id) % STYLES.length] : { id: 'bamboo', name: '竹林幽居', icon: '🎋', bonus: {} };
    f.home = { lv: 1, exp: 0, decor: 0, style: st.id, styleName: st.name, styleIcon: st.icon, mats: {}, lastVisit: -999, givers: 0 };

    // 社會階層微調（武林→偏力／帝王→偏體／科學文人→偏內／現代→偏身）
    var adj = {
      wulin:   { str: 3, agi: 1, con: 1, int: 0 },
      royal:   { con: 4, str: 1, agi: 0, int: 1 },
      science: { int: 4, con: 1, str: 0, agi: 1 },
      literati:{ int: 3, agi: 2, con: 1, str: 0 },
      modern:  { agi: 4, str: 1, con: 0, int: 1 }
    }[f.society] || { con: 1, str: 1, agi: 1, int: 1 };
    var mult = Math.max(1, Math.round(lv / 12));
    ['con', 'str', 'agi', 'int'].forEach(function (k) {
      f.stats[k] = num(f.stats[k], 10) + adj[k] * mult;
    });
    f.tierPower = num(c.tier && c.tier.mul, 1);

    var d = this.friendDerived(f);
    f.currentHp = d.maxHp; f.currentMp = d.maxMp;
    return f;
  };

  /* ══════════════════════════════════════════════════════
     覆寫：名額 / 可結交清單 / 費用 / 結交
     ══════════════════════════════════════════════════════ */
  proto.friendSlots = function () {
    var lv = 1;
    try { lv = num(this.getLevelInfo().lv, 1); } catch (e) { /* 未開鎮 */ }
    var n = num(C3.CELEB_SLOTS, 8) + Math.max(0, lv - 1) * num(C3.CELEB_SLOTS_PER_TOWN_LV, 2);
    return Math.min(n, num(C3.CELEB_SLOTS_MAX, 40));
  };

  proto.fr3CelebTaken = function (cid) {
    var l = this.friendAll();
    for (var i = 0; i < l.length; i++) if (l[i].celebId === cid || l[i].npcId === cid) return true;
    if (typeof this.fr3HosState === 'function') {
      var H = this.fr3HosState().list;
      for (var j = 0; j < H.length; j++) if (H[j].celebId === cid) return true;
    }
    return false;
  };

  /** 可結交的名人（未成為好友、未反目） */
  proto.friendRecruitable = function () {
    if (typeof this.celebAll !== 'function') {
      console.warn('[friendCeleb] 找不到 celebAll()，請確認 townCelebSystem.js 已載入');
      return [];
    }
    var self = this;
    var visitors = {};
    try { this.celebVisitors().forEach(function (v) { visitors[v.id] = 1; }); } catch (e) { /* 忽略 */ }

    return this.celebAll()
      .filter(function (c) { return !self.fr3CelebTaken(c.id); })
      .map(function (c) {
        var lv = self.fr3CelebLv(c);
        return {
          id: c.id, name: c.name, icon: c.icon, kind: 'celeb', lv: lv,
          title: c.title, tier: c.tier, society: c.society, socName: c.socName, socIcon: c.socIcon,
          maxSpend: c.maxSpend, isVisitor: !!visitors[c.id],
          cost: self.friendRecruitCost(c),
          role: self.fr3CelebRole(c)
        };
      })
      .sort(function (a, b) { return num(b.tier && b.tier.lv, 1) - num(a.tier && a.tier.lv, 1) || a.name.localeCompare(b.name); });
  };

  proto.friendRecruitCost = function (cand) {
    if (!cand) return num(C3.CELEB_COST_MIN, 800);
    var maxSpend = num(cand.maxSpend, 0);
    var mul = num(cand.tier && cand.tier.mul, 1);
    var c = null;
    if (!maxSpend && typeof this.celebById === 'function') c = this.celebById(cand.id);
    if (c) { maxSpend = num(c.maxSpend, 1000); mul = num(c.tier && c.tier.mul, 1); }
    if (!maxSpend) maxSpend = num(cand.lv, 10) * 200;      // 後備
    var cost = Math.round(maxSpend * mul * num(C3.CELEB_COST_RATE, 0.055));
    if (cand.isVisitor) cost = Math.round(cost * (1 - num(C3.CELEB_VISITOR_DISCOUNT, 0.3)));
    return Math.max(num(C3.CELEB_COST_MIN, 800), cost);
  };

  proto.friendRecruit = function (cand) {
    if (!cand || !cand.id) return false;
    var chk = this.friendCanRecruit(cand.id);
    if (!chk.ok) { this.log('⚠️ 無法結交：' + chk.msg, 'system'); return false; }

    var c = (typeof this.celebById === 'function') ? this.celebById(cand.id) : null;
    if (!c) c = { id: cand.id, name: cand.name, icon: cand.icon, title: cand.title || '', tier: cand.tier || { lv: 1, mul: 1, icon: '★' }, society: cand.society, maxSpend: cand.maxSpend || 1000, spend: [100, 1000] };

    var cost = this.friendRecruitCost(cand);
    if (num(this.charSys.rootState.gold, 0) < cost) { this.log('⚠️ 結交需 ' + cost.toLocaleString() + ' 兩紋銀，目前不足。', 'system'); return false; }

    var f = this.fr3MakeFromCeleb(c);
    if (!f) { this.log('⚠️ 建立好友失敗。', 'system'); return false; }
    this.charSys.rootState.gold -= cost;

    var S = this.friendState();
    S.list.push(f);
    S.stats.recruited += 1;
    this.friendLog('🤝 【' + f.name + '】（' + (f.title || f.socName) + '）成為你的好友！' +
      'Lv.' + f.lv + '｜' + (f.tier.icon || '★') + ' ' + (f.tier.name || '') + '｜' + f.socIcon + ' ' + f.socName +
      '　花費 ' + cost.toLocaleString() + ' 兩' + (cand.isVisitor ? '（作客中優惠）' : ''), 'wealth');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     社會階層加成
     ══════════════════════════════════════════════════════ */
  proto.fr3SocBonus = function (f) {
    var B = C3.SOCIETY_FRIEND_BONUS || {};
    return B[(f && f.society) || ''] || {};
  };

  /** 洞府風格加成 */
  proto.fr3HomeStyleBonus = function (f) {
    var st = null;
    for (var i = 0; i < STYLES.length; i++) if (STYLES[i].id === ((f && f.home) || {}).style) st = STYLES[i];
    return (st && st.bonus) || {};
  };

  /** 好友的成長倍率（society + 洞府 + 洞府靈氣） */
  var _friendExpMul = proto.friendExpMul;
  proto.friendExpMul = function (f) {
    var m = _friendExpMul.call(this, f);
    var sb = this.fr3SocBonus(f);
    m *= (1 + num(sb.expMul, 0));

    var home = (f && f.home) || {};
    m *= (1 + num(home.lv, 1) * num(C3.HOME_EXP_BONUS_PER_LV, 0.02));
    var hb = this.fr3HomeStyleBonus(f);
    m *= (1 + num(hb.expMul, 0));

    try {
      var H = this.fr3HomeState();
      if (num(H.buffUntil, 0) > num(this.friendState().ticks, 0)) m *= (1 + num(C3.HOME_BUFF_MUL, 0.15));
    } catch (e) { /* 忽略 */ }
    return m;
  };

  /** 好友武學點數成長（科學／藏書樓） */
  proto.fr3SocSpMul = function (f) {
    var sb = this.fr3SocBonus(f);
    var hb = this.fr3HomeStyleBonus(f);
    return 1 + num(sb.spMul, 0) + num(hb.spMul, 0);
  };

  /** 好友賺錢倍率（帝王／現代） */
  proto.fr3SocGoldMul = function (f) {
    var sb = this.fr3SocBonus(f);
    return 1 + num(sb.goldMul, 0);
  };

  /** 好友掉寶倍率（現代） */
  proto.fr3SocDropMul = function (f) {
    var sb = this.fr3SocBonus(f);
    return 1 + num(sb.dropMul, 0);
  };

  /* ══════════════════════════════════════════════════════
     好友能力總表（UI 用）
     ══════════════════════════════════════════════════════ */
  proto.fr3FriendProfile = function (f) {
    var sb = this.fr3SocBonus(f);
    var hb = this.fr3HomeStyleBonus(f);
    var home = f.home || {};
    return {
      celebId: f.celebId, title: f.title, tier: f.tier,
      society: f.society, socName: f.socName, socIcon: f.socIcon,
      socDesc: sb.desc || '', socBonus: sb, homeBonus: hb,
      home: {
        lv: num(home.lv, 1), exp: num(home.exp, 0), decor: num(home.decor, 0),
        styleName: home.styleName || '—', styleIcon: home.styleIcon || '🏠',
        nextExp: this.fr3HomeNeedExp(num(home.lv, 1) + 1)
      },
      spMul: this.fr3SocSpMul(f),
      goldMul: this.fr3SocGoldMul(f),
      dropMul: this.fr3SocDropMul(f)
    };
  };

  /* ══════════════════════════════════════════════════════
     啟動 + 舊存檔補欄位
     ══════════════════════════════════════════════════════ */
  proto.fr3CelebMigrate = function () {
    var self = this;
    var S = this.friendState();
    S.list.forEach(function (f) {
      if (!f.home || typeof f.home !== 'object') {
        var st = STYLES.length ? STYLES[hash(f.id) % STYLES.length] : { id: 'bamboo', name: '竹林幽居', icon: '🎋' };
        f.home = { lv: 1, exp: 0, decor: 0, style: st.id, styleName: st.name, styleIcon: st.icon, mats: {}, lastVisit: -999, givers: 0 };
      }
      if (!f.celebId && typeof self.celebById === 'function') {
        var c = self.celebById(f.npcId) || self.celebById(f.id);
        if (c) {
          f.celebId = c.id;
          f.title = c.title || '';
          f.tier = c.tier;
          f.society = c.society;
          f.socName = c.socName;
          f.socIcon = c.socIcon;
          f.maxSpend = c.maxSpend;
          f.spend = c.spend;
        }
      }
    });
    return S.list.length;
  };

  proto.fr3CelebBootOnce = function () {
    if (this._fr3CelebBooted) return;
    this._fr3CelebBooted = true;
    try { this.fr3CelebMigrate(); } catch (e) { console.error('[friendCeleb] 遷移失敗：', e); }
    console.log('[friendCeleb] ✓ 名人好友系統已啟動（名人池 ' +
      (typeof this.celebCount === 'function' ? this.celebCount() : '?') + ' 位）');
  };

  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.fr3CelebBootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  /* ══════════ 報告 ══════════ */
  proto.fr3CelebReport = function () {
    var self = this;
    var S = this.friendState();
    var cands = this.friendRecruitable();
    var socCount = {};
    S.list.forEach(function (f) { socCount[f.society || 'none'] = num(socCount[f.society || 'none'], 0) + 1; });

    return {
      totalPool: (typeof this.celebCount === 'function') ? this.celebCount() : 0,
      taken: S.list.length,
      slots: this.friendSlots(),
      socCount: socCount,
      societies: (typeof this.celebAll === 'function')
        ? (function () {
            var m = {};
            self.celebAll().forEach(function (c) { if (c.society) m[c.society] = { name: c.socName, icon: c.socIcon }; });
            return m;
          })()
        : {},
      candidates: cands.slice(0, 60).map(function (c) {
        return {
          id: c.id, name: c.name, icon: c.icon, lv: c.lv, title: c.title,
          tier: c.tier, society: c.society, socName: c.socName, socIcon: c.socIcon,
          cost: c.cost, isVisitor: c.isVisitor, role: c.role,
          already: false
        };
      }),
      candidateTotal: cands.length
    };
  };

  window.HY.FriendCeleb = { version: '1.0', pool: 'celebAll()' };
  console.log('[friendCeleb] ✓ 已載入（好友＝世界名人）');
})();