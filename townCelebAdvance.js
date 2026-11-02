// js/townCelebAdvance.js (v1)
// ⭐ 名人深造與社交 —— 讓虛擬人物「比照玩家角色」的完整功能 + 讓世界有活力
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ 對照 characterSystem v52 的功能清單，本檔讓名人擁有：                  │
// │   lv / exp / maxExp  ✅        四維 stats + 潛能    ✅                │
// │   十部位裝備         ✅        門派 sect + 入門絕學  ✅                │
// │   外功 / 心法 / 輕功 ✅        十四經脈              ✅                │
// │   靈根 / 精通 / 天命 / 祝福 ✅ 氣血 / 內力          ✅                │
// │   統一戰力公式       ✅        （同一把尺 getPowerScore）             │
// └──────────────────────────────────────────────────────────────────────┘
//
// ① 📊 名人等級與四維   依身價推導等級，依社群配點（比照玩家公式）
// ② 🧘 名人修行         每期獲得經驗 → 真的會升級（約 200 期 1 級）
// ③ ⚔️ 切磋             玩家角色 vs 名人，依戰力比判定勝負，雙方得經驗
// ④ 📖 指點             名人傳功給玩家角色（消耗好感）
// ⑤ 🗣️ 論道             文人／科學家可與玩家論道，換取武點
// ⑥ 🏛️ 加入公會         定居名人可成為公會冒險者 → 繼承「全部」玩家功能
// ⑦ 🌏 名人日常         依小鎮建築決定名人活動，寫入「動態流」不洗版公告
// ⑧ 🤝 同門相聚         同社群 2 位以上在鎮上 → 觸發聚會事件
// ⑨ 📢 公告板 + 🌏 動態流  重要事件 vs 日常瑣事 分開記錄
//
// ⚠️ 載入順序：townCelebSystem.js 之後、uiTown.js 之前。
//    完全複用既有系統，不新增資源池、不改動主遊戲平衡。
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[townCelebAdv] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[townCelebAdv] 找不到 HY.TownSystem'); return; }
  if (!proto.celebEnsure) { console.error('[townCelebAdv] 請先載入 townCelebSystem.js'); return; }

  var CONFIG = {
    // ── 等級曲線（由身價上限推導，maxExp 公式與玩家相同）──
    LV_BASE: 15,          // 身價 1200 → Lv.15
    LV_REF_SPEND: 1200,
    LV_EXP: 0.874,        // 30000 → Lv.250
    MAX_LV: 300,

    // ── 修行 ──
    CULTIVATE_RATE: 0.005,       // 每期獲得自身升級經驗的比例（約 200 期升 1 級）
    SETTLED_MUL: 1.6,            // 定居者加快
    GUILD_MUL: 1.3,              // 入公會後更快

    // ── 互動 ──
    SPAR_FAVOR: 6,
    SPAR_CD: 8,
    SPAR_CHAR_EXP: 0.05,
    SPAR_CHAR_EXP_LOSE: 0.022,
    SPAR_CELEB_EXP: 0.04,
    GUIDE_FAVOR_MIN: 40,
    GUIDE_COST_FAVOR: 25,
    GUIDE_CHAR_EXP: 0.055,
    DISCOURSE_FAVOR_MIN: 30,
    DISCOURSE_COST_FAVOR: 15,
    DISCOURSE_SP: 3,

    // ── 日常 ──
    DAILY_CHANCE: 0.38,

    // ── 同門相聚 ──
    CIRCLE_CHANCE: 0.20,
    CIRCLE_CD: 60,

    // ── 入公會 ──
    GUILD_COST: 3000,

    // ── 記錄 ──
    LOG_MAX: 60,          // 公告板（重要事件）
    FEED_MAX: 30          // 動態流（日常瑣事）
  };
  T.CELEBADV = T.CELEBADV || {};
  T.CELEBADV.CONFIG = CONFIG;

  /* ══════════════════════════════════════════════════════
     社群 → 四維配點（比照玩家「每級 5 點潛能」）
     ══════════════════════════════════════════════════════ */
  var SOC_BASE = {
    wulin:    { con: 12, str: 14, agi: 13, int: 7 },
    science:  { con: 10, str: 7,  agi: 9,  int: 16 },
    royal:    { con: 13, str: 13, agi: 10, int: 9 },
    literati: { con: 10, str: 7,  agi: 10, int: 15 },
    modern:   { con: 11, str: 11, agi: 12, int: 11 },
    none:     { con: 11, str: 11, agi: 11, int: 11 }
  };
  var SOC_ALLOC = {
    wulin:    { con: 1, str: 2, agi: 2, int: 0 },
    science:  { con: 1, str: 0, agi: 0, int: 4 },
    royal:    { con: 2, str: 2, agi: 1, int: 0 },
    literati: { con: 1, str: 0, agi: 1, int: 3 },
    modern:   { con: 1, str: 1, agi: 1, int: 2 },
    none:     { con: 1, str: 1, agi: 1, int: 2 }
  };
  var SOC_SECT = { wulin: 'shaolin', science: 'wudang', royal: 'mingjiao', literati: 'tangmen', modern: 'emei' };
  T.CELEBADV.SOC_BASE = SOC_BASE;
  T.CELEBADV.SOC_ALLOC = SOC_ALLOC;

  /* ══════════════════════════════════════════════════════
     名人日常活動（依小鎮建築解鎖）
     ══════════════════════════════════════════════════════ */
  var DAILIES = [
    { id: 'tea',     name: '品茗論道', icon: '🍵', build: 'teahouse',   gain: { prosperity: 9  }, text: '在茶館與鎮民閒談，氣氛融洽。' },
    { id: 'lecture', name: '開壇講學', icon: '📖', build: 'academy',    gain: { roleExp: 0.010, sp: 1 }, text: '在書院開講，四方學子受益。' },
    { id: 'spar',    name: '演武比試', icon: '🥋', build: 'dojo',       gain: { prosperity: 6, order: 1 }, text: '在演武場與人切磋，圍觀者叫好。' },
    { id: 'herb',    name: '採藥製丹', icon: '🌿', build: 'apothecary', gain: { item: 'pill_hp' }, text: '在藥鋪指點藥理，順手製了幾帖藥。' },
    { id: 'drink',   name: '把酒言歡', icon: '🍶', build: 'tavern',     gain: { gold: 70 }, text: '在酒樓開懷暢飲。' },
    { id: 'show',    name: '街頭獻藝', icon: '🎭', build: 'market',     gain: { prosperity: 16 }, text: '在市集引起大批圍觀。' },
    { id: 'buy',     name: '慷慨解囊', icon: '💰', build: null,          gain: { gold: 140 }, text: '隨手買了不少鎮上的貨物。' },
    { id: 'pray',    name: '上香祈福', icon: '⛩️', build: 'temple',     gain: { prosperity: 11, order: 1 }, text: '到寺廟上香，為小鎮祈福。' },
    { id: 'walk',    name: '踏青賞景', icon: '🌲', build: 'garden',     gain: { prosperity: 12 }, text: '在花園漫步，心情舒暢。' },
    { id: 'ride',    name: '策馬奔馳', icon: '🐎', build: 'stable',     gain: { prosperity: 8, order: 1 }, text: '騎馬繞鎮一圈，英姿颯爽。' }
  ];
  T.CELEBADV.DAILIES = DAILIES;

  /* ══════════════════════════════════════════════════════
     工具
     ══════════════════════════════════════════════════════ */
  function maxExpFor(lv) { return Math.floor(100 * Math.pow(lv, 1.85) + lv * 120); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  T.CELEBADV.maxExpFor = maxExpFor;

  /* ══════════════════════════════════════════════════════
     ① 名人等級 / 四維 / 門派（比照玩家公式）
     ══════════════════════════════════════════════════════ */
  /** 名人等級 = 依身價推導的基礎等級 + 修行精進次數（比照玩家升級） */
  proto.celebLevel = function (c) {
    if (typeof c === 'string') c = this.celebById(c);
    if (!c) return 1;
    var s = Math.max(100, num(c.maxSpend, CONFIG.LV_REF_SPEND));
    var base = Math.round(CONFIG.LV_BASE * Math.pow(s / CONFIG.LV_REF_SPEND, CONFIG.LV_EXP));
    var grow = 0;
    if (c.id) {
      var A = this.celebAdvOf(c.id);
      grow = num((A && A.stat) ? A.stat.levelUps : 0, 0);
    }
    return Math.max(1, Math.min(CONFIG.MAX_LV, base + grow));
  };

  proto.celebStats4 = function (c) {
    if (typeof c === 'string') c = this.celebById(c);
    if (!c) return { con: 10, str: 10, agi: 10, int: 10 };
    var soc = c.society || 'none';
    var base = SOC_BASE[soc] || SOC_BASE.none;
    var alloc = SOC_ALLOC[soc] || SOC_ALLOC.none;
    var lv = this.celebLevel(c);
    var pool = (lv - 1) * 5;
    var total = (alloc.con + alloc.str + alloc.agi + alloc.int) || 5;
    var acc = { con: 0, str: 0, agi: 0, int: 0 };
    var used = 0;
    ['con', 'str', 'agi', 'int'].forEach(function (k) {
      var v = Math.floor(pool * alloc[k] / total);
      acc[k] = v; used += v;
    });
    var maxK = 'con';
    ['con', 'str', 'agi', 'int'].forEach(function (k) { if (alloc[k] > alloc[maxK]) maxK = k; });
    acc[maxK] += (pool - used);
    return {
      con: base.con + acc.con, str: base.str + acc.str,
      agi: base.agi + acc.agi, int: base.int + acc.int
    };
  };

  proto.celebSectOf = function (c) {
    if (typeof c === 'string') c = this.celebById(c);
    if (!c) return null;
    if (c.sect) return c.sect;
    var want = SOC_SECT[c.society];
    if (!want) return null;
    var Data = window.HY.Data || {};
    var sect = Data.SECTS && Data.SECTS[want];
    if (!sect) return null;
    if (this.celebLevel(c) < num(sect.reqLv, 10)) return null;
    return want;
  };

  proto.celebSectLabel = function (c) {
    var id = this.celebSectOf(c);
    if (!id) return '無門無派';
    if (typeof this.guildSectName === 'function') return this.guildSectName(id);
    var Data = window.HY.Data || {};
    return (Data.SECTS && Data.SECTS[id] && Data.SECTS[id].name) || id;
  };

  /** 名人的「偽角色物件」—— 直接餵給 charSys.getDerivedStatsForChar（與玩家同一套） */
  proto.celebAsChar = function (c) {
    if (typeof c === 'string') c = this.celebById(c);
    if (!c) return null;
    var A = this.celebAdvOf(c.id);
    var equip = {};
    if (this.guildSlots) {
      this.guildSlots().forEach(function (s) { equip[s] = (A.equipment && A.equipment[s]) || null; });
    }
    return {
      id: 'celeb_' + c.id,
      name: c.name,
      lv: this.celebLevel(c),
      exp: num(A.exp, 0),
      maxExp: maxExpFor(this.celebLevel(c)),
      freePoints: 0,
      stats: this.celebStats4(c),
      sect: this.celebSectOf(c),
      equipment: equip,
      meridians: {},
      xinfa: {}, activeXinfa: null,
      qinggong: {}, activeQinggong: null,
      skills: {}, guildBlessings: {},
      destinySkills: {}, activeBuffs: {}, sectFeature: {}, _battle: {},
      spiritRoot: null, spiritRootLv: 1
    };
  };

  proto.celebDerived = function (c) {
    var ch = this.celebAsChar(c);
    if (!ch) {
      return { maxHp: 200, maxMp: 100, atk: 10, def: 5, hit: 90, eva: 5, crit: 5, critRes: 0, critDmg: 165, dmgReduce: 0, atkSpd: 100, powerScore: 1 };
    }
    var cs = this.charSys;
    if (cs && typeof cs.getDerivedStatsForChar === 'function') {
      try { return cs.getDerivedStatsForChar(ch); } catch (e) { /* 落入後備 */ }
    }
    var s = ch.stats, lv = ch.lv;
    return {
      maxHp: 100 + s.con * 15 + (lv - 1) * 35,
      maxMp: 50 + s.int * 8 + (lv - 1) * 15,
      atk: Math.floor(s.str * 2.5 + s.int + lv * 4),
      def: Math.floor(s.con * 1.5 + s.agi * 0.6 + lv * 2),
      hit: 90, eva: 5, crit: 5, critRes: 0, critDmg: 165, dmgReduce: 0, atkSpd: 100, powerScore: 100
    };
  };

  proto.celebPower = function (c) {
    var d = this.celebDerived(c);
    return num(d.powerScore, 1);
  };

  /* ══════════════════════════════════════════════════════
     狀態（掛在 town.celebs 底下，與 townCelebSystem 共用）
     ══════════════════════════════════════════════════════ */
  proto.celebAdvDefault = function () {
    return {
      exp: 0, equipment: {}, guildJoined: false, joinedTick: 0,
      stat: { spar: 0, win: 0, lose: 0, guide: 0, discourse: 0, dailies: 0, levelUps: 0 }
    };
  };

  proto.celebAdvEnsure = function () {
    var C = this.celebEnsure();
    if (!C.adv || typeof C.adv !== 'object') C.adv = {};
    if (!Array.isArray(C.vault)) C.vault = [];
    if (!Array.isArray(C.log)) C.log = [];
    if (!Array.isArray(C.feed)) C.feed = [];
    if (!C.circle || typeof C.circle !== 'object') C.circle = {};
    if (!C.advStat || typeof C.advStat !== 'object') {
      C.advStat = { spar: 0, win: 0, lose: 0, guide: 0, discourse: 0, dailies: 0, levelUps: 0, guildJoined: 0, circle: 0, cd: {} };
    }
    if (!C.advStat.cd || typeof C.advStat.cd !== 'object') C.advStat.cd = {};
    return C;
  };

  proto.celebAdvOf = function (id) {
    if (!id) return this.celebAdvDefault();
    var C = this.celebAdvEnsure();
    if (!C.adv[id] || typeof C.adv[id] !== 'object') C.adv[id] = this.celebAdvDefault();
    var A = C.adv[id], d = this.celebAdvDefault(), k;
    for (k in d) { if (Object.prototype.hasOwnProperty.call(d, k) && A[k] === undefined) A[k] = d[k]; }
    if (!A.equipment || typeof A.equipment !== 'object') A.equipment = {};
    if (this.guildSlots) {
      this.guildSlots().forEach(function (s) { if (A.equipment[s] === undefined) A.equipment[s] = null; });
    }
    if (!A.stat || typeof A.stat !== 'object') A.stat = d.stat;
    for (k in d.stat) { if (A.stat[k] === undefined) A.stat[k] = 0; }
    return A;
  };

  /** 名人是否在鎮上（來訪中或已定居） */
  proto.celebPresent = function (id) {
    return !!this.celebVisitor(id) || this.celebIsSettled(id);
  };

  /* ══════════════════════════════════════════════════════
     ⑨ 公告板（重要事件）＋ 動態流（日常瑣事）
     ══════════════════════════════════════════════════════ */
  proto.celebBoard = function (msg, icon, type) {
    var C = this.celebAdvEnsure();
    C.log.unshift({ t: Date.now(), tick: this.celebTickNow(), icon: icon || '📢', msg: msg, type: type || 'info' });
    if (C.log.length > CONFIG.LOG_MAX) C.log.length = CONFIG.LOG_MAX;
    return C.log[0];
  };

  proto.celebBoardList = function (n) {
    var C = this.celebAdvEnsure();
    return C.log.slice(0, num(n, 40));
  };

  proto.celebBoardClear = function () {
    var C = this.celebAdvEnsure();
    C.log = [];
    this.requestRender();
    return true;
  };

  /** ⭐ 名人動態流：日常活動寫這裡，避免洗牌公告板 */
  proto.celebFeed = function (msg, icon, id) {
    var C = this.celebAdvEnsure();
    if (!Array.isArray(C.feed)) C.feed = [];
    C.feed.unshift({ t: Date.now(), tick: this.celebTickNow(), icon: icon || '🌏', msg: msg, id: id || null });
    if (C.feed.length > CONFIG.FEED_MAX) C.feed.length = CONFIG.FEED_MAX;
    return C.feed[0];
  };

  proto.celebFeedList = function (n) {
    var C = this.celebAdvEnsure();
    return (C.feed || []).slice(0, num(n, 20));
  };

  proto.celebFeedClear = function () {
    var C = this.celebAdvEnsure();
    C.feed = [];
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ② 名人修行（每期獲得經驗 → 真的會升級）
     ══════════════════════════════════════════════════════ */
  proto.celebCultivateRate = function (id) {
    var A = this.celebAdvOf(id);
    var mul = 1;
    if (this.celebIsSettled(id)) mul *= CONFIG.SETTLED_MUL;
    if (A.guildJoined) mul *= CONFIG.GUILD_MUL;
    return CONFIG.CULTIVATE_RATE * mul;
  };

  proto.celebCultivateGain = function (id) {
    var c = this.celebById(id);
    if (!c) return 0;
    if (this.celebLevel(c) >= CONFIG.MAX_LV) return 0;
    return Math.max(1, Math.round(maxExpFor(this.celebLevel(c)) * this.celebCultivateRate(id)));
  };

  proto.celebCultivateAll = function () {
    var C = this.celebAdvEnsure();
    var self = this;
    var leveled = [];
    var ids = [];
    C.visitors.forEach(function (v) { ids.push(v.id); });
    C.settled.forEach(function (s) { ids.push(s.id); });

    ids.forEach(function (id) {
      var c = self.celebById(id);
      if (!c) return;
      var A = self.celebAdvOf(id);
      if (self.celebLevel(c) >= CONFIG.MAX_LV) { A.exp = 0; return; }
      var gain = self.celebCultivateGain(id);
      if (gain <= 0) return;
      A.exp = num(A.exp, 0) + gain;

      // ⭐ 比照玩家：每滿一輪 maxExp 就升 1 級（levelUps 會回饋到 celebLevel）
      var need = maxExpFor(self.celebLevel(c));
      var ups = 0;
      var guard = 0;
      while (A.exp >= need && self.celebLevel(c) < CONFIG.MAX_LV && guard < 12) {
        guard += 1;
        A.exp -= need;
        A.stat.levelUps += 1;
        C.advStat.levelUps += 1;
        ups += 1;
        need = maxExpFor(self.celebLevel(c));
      }
      if (ups > 0) {
        leveled.push({ id: id, name: c.name, icon: c.icon, n: A.stat.levelUps, lv: self.celebLevel(c), ups: ups });
      }
    });

    leveled.forEach(function (x) {
      self.celebBoard('【' + x.name + '】潛修有成，境界突破至 Lv.' + x.lv +
        '（累計精進 ' + x.n + ' 次）。', x.icon, 'grow');
    });
    return leveled.length;
  };

  /** 修行帶來的額外小鎮加成（魅力） */
  proto.celebGrowthBonus = function (id) {
    var A = this.celebAdvOf(id);
    var n = num(A.stat.levelUps, 0);
    return { appealPer: 1.5 * n, powerPct: Math.min(0.6, n * 0.02) };
  };

  /* ══════════════════════════════════════════════════════
     ③ 切磋（玩家角色 vs 名人）
     ══════════════════════════════════════════════════════ */
  proto.celebSparKey = function (celebId, charId) { return celebId + '|' + charId; };

  proto.celebSparCd = function (celebId, charId) {
    var C = this.celebAdvEnsure();
    var until = num(C.advStat.cd[this.celebSparKey(celebId, charId)], 0);
    return Math.max(0, until - this.celebTickNow());
  };

  proto.celebRoleList = function () {
    var root = this.charSys.rootState;
    return (root && Array.isArray(root.roster)) ? root.roster : [];
  };

  proto.celebRoleById = function (charId) {
    var out = null;
    this.celebRoleList().forEach(function (x) { if (x.id === charId) out = x; });
    return out;
  };

  proto.celebCanSpar = function (celebId, charId) {
    var c = this.celebById(celebId);
    if (!c) return { ok: false, msg: '無此名人' };
    if (!this.celebPresent(celebId)) return { ok: false, msg: '該名人不在小鎮' };
    var char = this.celebRoleById(charId);
    if (!char) return { ok: false, msg: '找不到該角色' };
    var cd = this.celebSparCd(celebId, charId);
    if (cd > 0) return { ok: false, msg: '【' + char.name + '】剛與他切磋過（還需 ' + cd + ' 期）' };
    return { ok: true, celeb: c, char: char };
  };

  proto.celebSpar = function (celebId, charId) {
    var chk = this.celebCanSpar(celebId, charId);
    if (!chk.ok) { this.log('⚠️ 無法切磋：' + chk.msg, 'system'); return false; }
    var c = chk.celeb, char = chk.char;
    var C = this.celebAdvEnsure();
    var MAXL = num(this.charSys.MAX_LEVEL, 300);

    var pd = this.charSys.getDerivedStatsForChar(char);
    var cd2 = this.celebDerived(c);
    var pPow = num(pd.powerScore, 1);
    var cPow = num(cd2.powerScore, 1);
    var win = Math.random() < (pPow / (pPow + cPow));

    var charGain = Math.round(num(char.maxExp, 100) * (win ? CONFIG.SPAR_CHAR_EXP : CONFIG.SPAR_CHAR_EXP_LOSE));
    var roleUps = 0;
    if (char.lv < MAXL) {
      char.exp = num(char.exp, 0) + charGain;
      var guard = 0;
      while (char.exp >= char.maxExp && char.lv < MAXL && guard < 20) {
        guard += 1;
        char.exp -= char.maxExp;
        char.lv += 1;
        char.freePoints = num(char.freePoints, 0) + 5;
        char.maxExp = maxExpFor(char.lv);
        roleUps += 1;
      }
      var nd = this.charSys.getDerivedStatsForChar(char);
      char.currentHp = nd.maxHp; char.currentMp = nd.maxMp;
    }

    var A = this.celebAdvOf(celebId);
    A.exp = num(A.exp, 0) + Math.round(maxExpFor(this.celebLevel(c)) * CONFIG.SPAR_CELEB_EXP);

    var v = this.celebVisitor(celebId);
    if (v) {
      var favMax = num((T.CELEB && T.CELEB.CONFIG) ? T.CELEB.CONFIG.FAVOR_MAX : 100, 100);
      v.favor = Math.min(favMax, num(v.favor, 0) + CONFIG.SPAR_FAVOR + (win ? 0 : 2));
    }

    A.stat.spar += 1;
    A.stat[win ? 'win' : 'lose'] += 1;
    C.advStat.spar += 1;
    C.advStat[win ? 'win' : 'lose'] += 1;
    C.advStat.cd[this.celebSparKey(celebId, charId)] = this.celebTickNow() + CONFIG.SPAR_CD;

    var line = win
      ? '⚔️ 【' + char.name + '】擊敗了【' + c.name + '】！' + (roleUps > 0 ? ' 突破至 Lv.' + char.lv + '！' : '')
      : '⚔️ 【' + char.name + '】不敵【' + c.name + '】，但獲益良多。';
    this.celebBoard(line + '（經驗 +' + charGain.toLocaleString() + '）', '⚔️', 'spar');
    this.log(line, 'system');
    this.requestRender();
    return { win: win, exp: charGain, roleUps: roleUps, pPow: pPow, cPow: cPow };
  };

  /* ══════════════════════════════════════════════════════
     ④ 指點（名人 → 玩家角色）
     ══════════════════════════════════════════════════════ */
  proto.celebCanGuide = function (celebId, charId) {
    var c = this.celebById(celebId);
    if (!c) return { ok: false, msg: '無此名人' };
    var v = this.celebVisitor(celebId);
    if (!v) {
      return { ok: false, msg: this.celebIsSettled(celebId) ? '已定居名人不必再指點（可請他加入公會）' : '該名人不在小鎮' };
    }
    var char = this.celebRoleById(charId);
    if (!char) return { ok: false, msg: '找不到該角色' };
    if (num(v.favor, 0) < CONFIG.GUIDE_FAVOR_MIN) {
      return { ok: false, msg: '好感不足（需 ' + CONFIG.GUIDE_FAVOR_MIN + '，目前 ' + v.favor + '）' };
    }
    if (char.lv >= num(this.charSys.MAX_LEVEL, 300)) return { ok: false, msg: '角色已達等級上限' };
    return { ok: true, celeb: c, char: char, visitor: v, cost: CONFIG.GUIDE_COST_FAVOR };
  };

  proto.celebGuide = function (celebId, charId) {
    var chk = this.celebCanGuide(celebId, charId);
    if (!chk.ok) { this.log('⚠️ 無法指點：' + chk.msg, 'system'); return false; }
    var c = chk.celeb, char = chk.char, v = chk.visitor;
    var C = this.celebAdvEnsure();
    var MAXL = num(this.charSys.MAX_LEVEL, 300);

    var tier = c.tier ? c.tier.lv : 1;
    var lvRatio = Math.min(3.0, this.celebLevel(c) / Math.max(1, char.lv));
    var gain = Math.round(num(char.maxExp, 100) * CONFIG.GUIDE_CHAR_EXP * (1 + (tier - 1) * 0.18) * Math.min(1.6, lvRatio));

    var ups = 0;
    char.exp = num(char.exp, 0) + gain;
    var guard = 0;
    while (char.exp >= char.maxExp && char.lv < MAXL && guard < 20) {
      guard += 1;
      char.exp -= char.maxExp;
      char.lv += 1;
      char.freePoints = num(char.freePoints, 0) + 5;
      char.maxExp = maxExpFor(char.lv);
      ups += 1;
    }
    var nd = this.charSys.getDerivedStatsForChar(char);
    char.currentHp = nd.maxHp; char.currentMp = nd.maxMp;

    v.favor = Math.max(0, num(v.favor, 0) - CONFIG.GUIDE_COST_FAVOR);
    var A = this.celebAdvOf(celebId);
    A.stat.guide += 1;
    C.advStat.guide += 1;

    this.celebBoard('【' + c.name + '】指點了【' + char.name + '】' +
      (ups > 0 ? '，後者突破至 Lv.' + char.lv + '！' : '，獲經驗 +' + gain.toLocaleString() + '。'), '📖', 'guide');
    this.log('📖 【' + c.name + '】指點【' + char.name + '】，經驗 +' + gain.toLocaleString() +
      '（好感 -' + CONFIG.GUIDE_COST_FAVOR + '）', 'gain');
    this.requestRender();
    return { exp: gain, ups: ups };
  };

  /* ══════════════════════════════════════════════════════
     ⑤ 論道（文人／科學家 → 玩家武點）
     ══════════════════════════════════════════════════════ */
  proto.celebCanDiscourse = function (celebId) {
    var c = this.celebById(celebId);
    if (!c) return { ok: false, msg: '無此名人' };
    if (c.society !== 'literati' && c.society !== 'science') {
      return { ok: false, msg: '只有【文人雅士】與【科學巨擘】可論道' };
    }
    var v = this.celebVisitor(celebId);
    if (!v) return { ok: false, msg: this.celebIsSettled(celebId) ? '已定居名人無法論道' : '該名人不在小鎮' };
    if (num(v.favor, 0) < CONFIG.DISCOURSE_FAVOR_MIN) {
      return { ok: false, msg: '好感不足（需 ' + CONFIG.DISCOURSE_FAVOR_MIN + '，目前 ' + v.favor + '）' };
    }
    return { ok: true, celeb: c, visitor: v, cost: CONFIG.DISCOURSE_COST_FAVOR };
  };

  proto.celebDiscourse = function (celebId) {
    var chk = this.celebCanDiscourse(celebId);
    if (!chk.ok) { this.log('⚠️ 無法論道：' + chk.msg, 'system'); return false; }
    var c = chk.celeb, v = chk.visitor;
    var C = this.celebAdvEnsure();
    var tier = c.tier ? c.tier.lv : 1;
    var sp = Math.round(CONFIG.DISCOURSE_SP * tier * (c.society === 'science' ? 1.2 : 1));
    this.charSys.rootState.sp += sp;
    v.favor = Math.max(0, num(v.favor, 0) - CONFIG.DISCOURSE_COST_FAVOR);
    var A = this.celebAdvOf(celebId);
    A.stat.discourse += 1;
    C.advStat.discourse += 1;
    this.celebBoard('你與【' + c.name + '】論道兼答，武學點數 +' + sp + '。', '🗣️', 'discourse');
    this.log('🗣️ 與【' + c.name + '】論道，武點 +' + sp + '（好感 -' + CONFIG.DISCOURSE_COST_FAVOR + '）', 'gain');
    this.requestRender();
    return sp;
  };

  /* ══════════════════════════════════════════════════════
     ⑥ 加入公會（繼承玩家的全部功能）
     ══════════════════════════════════════════════════════ */
  proto.celebResidentId = function (celebId) { return 'celebres_' + celebId; };

  proto.celebAsResident = function (celebId) {
    var c = this.celebById(celebId);
    if (!c) return null;
    return { id: this.celebResidentId(celebId), name: c.name, lv: this.celebLevel(c), x: 0, y: 0, isCeleb: true, celebId: celebId };
  };

  /** 定居名人自動成為小鎮居民（讓公會流程能認得他） */
  proto.celebSyncResident = function (celebId) {
    var t = this.ensureState();
    if (!Array.isArray(t.residents)) t.residents = [];
    var rid = this.celebResidentId(celebId);
    var found = null;
    t.residents.forEach(function (p) { if (p.id === rid) found = p; });
    var nr = this.celebAsResident(celebId);
    if (!nr) return null;
    if (found) { found.name = nr.name; found.lv = nr.lv; return found; }
    t.residents.push(nr);
    return nr;
  };

  proto.celebGuildMember = function (celebId) {
    var list = (typeof this.guildAdventurers === 'function') ? this.guildAdventurers() : [];
    for (var i = 0; i < list.length; i++) if (list[i].celebId === celebId) return list[i];
    return null;
  };

  proto.celebCanJoinGuild = function (celebId) {
    var c = this.celebById(celebId);
    if (!c) return { ok: false, msg: '無此名人' };
    if (!this.isGuildFounded || !this.isGuildFounded()) return { ok: false, msg: '尚未興建「冒險者公會」' };
    if (!this.celebIsSettled(celebId)) return { ok: false, msg: '需先定居小鎮（送禮把好感拉到 100）' };
    if (this.celebGuildMember(celebId)) return { ok: false, msg: '已是公會成員' };
    var max = (typeof this.guildMaxAdventurers === 'function') ? this.guildMaxAdventurers() : 99;
    var cur = (typeof this.guildAdventurers === 'function') ? this.guildAdventurers().length : 0;
    if (cur >= max) return { ok: false, msg: '公會名額已滿（' + cur + '/' + max + '）' };
    var cost = CONFIG.GUILD_COST;
    if (this.charSys.rootState.gold < cost) return { ok: false, msg: '銀兩不足（需 ' + cost + ' 兩）' };
    return { ok: true, cost: cost, celeb: c };
  };

  proto.celebJoinGuild = function (celebId) {
    var chk = this.celebCanJoinGuild(celebId);
    if (!chk.ok) { this.log('⚠️ 無法加入公會：' + chk.msg, 'system'); return false; }
    var c = chk.celeb, C = this.celebAdvEnsure();

    this.celebSyncResident(celebId);
    var res = this.celebAsResident(celebId);
    this.charSys.rootState.gold -= chk.cost;

    var adv = null;
    if (typeof this.guildCreateAdventurer === 'function') {
      adv = this.guildCreateAdventurer({ id: res.id, name: c.name, lv: res.lv, x: 0, y: 0 }, {});
    }
    if (!adv) { this.log('⚠️ 建立冒險者失敗（公會系統未就緒）', 'system'); return false; }

    adv.celebId = celebId;
    adv.isCeleb = true;
    adv.icon = c.icon;
    adv.socIcon = c.socIcon;
    adv.socName = c.socName;
    adv.tierLv = c.tier ? c.tier.lv : 1;

    var A = this.celebAdvOf(celebId);
    if (this.guildSlots) {
      this.guildSlots().forEach(function (s) {
        if (!adv.equipment[s]) adv.equipment[s] = A.equipment[s] || null;
      });
    }
    if (typeof this.guildClampVitals === 'function') this.guildClampVitals(adv);

    var g = (typeof this.guildState === 'function') ? this.guildState() : null;
    if (g && Array.isArray(g.adventurers)) g.adventurers.push(adv);

    A.guildJoined = true;
    A.joinedTick = this.celebTickNow();
    C.advStat.guildJoined += 1;

    this.celebBoard('【' + c.name + '】正式加入冒險者公會，成為小鎮的守護者！', '🏛️', 'guild');
    this.log('🏛️ 【' + c.name + '】加入公會（花費 ' + chk.cost + ' 兩）。他可被派遣任務、穿裝備、習武學、覺醒靈根 —— 與你的角色完全相同。', 'gain');
    if (typeof this.guildLog === 'function') {
      this.guildLog('⭐ 名人【' + c.name + '】（' + (c.title || '') + '）加入公會！', 'time');
    }
    if (typeof this.guildAutoEquip === 'function') {
      try { this.guildAutoEquip(adv.id); } catch (e) { /* 忽略 */ }
    }
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     ⑦ 名人日常（依小鎮建築決定活動，寫入動態流）
     ══════════════════════════════════════════════════════ */
  proto.celebAvailableDailies = function () {
    var self = this;
    return DAILIES.filter(function (d) {
      if (!d.build) return true;
      return (typeof self.hasBuilding === 'function') ? !!self.hasBuilding(d.build) : false;
    });
  };

  proto.celebDailyTick = function () {
    var C = this.celebAdvEnsure();
    var t = this.ensureState();
    var self = this;
    if (!t.founded) return 0;
    var pool = this.celebAvailableDailies();
    if (!pool.length) return 0;

    var ids = [];
    C.visitors.forEach(function (v) { ids.push(v.id); });
    C.settled.forEach(function (s) { ids.push(s.id); });

    var done = 0;
    ids.forEach(function (id) {
      if (Math.random() > CONFIG.DAILY_CHANCE) return;
      var c = self.celebById(id);
      if (!c) return;
      var d = pick(pool);
      var g = d.gain || {};
      var notes = [];
      if (g.prosperity) { t.prosperity += g.prosperity; notes.push('繁榮 +' + g.prosperity); }
      if (g.gold) {
        self.charSys.rootState.gold += g.gold;
        notes.push('銀兩 +' + g.gold);
        if (C.stats) C.stats.totalGold = num(C.stats.totalGold, 0) + g.gold;
      }
      if (g.sp) { self.charSys.rootState.sp += g.sp; notes.push('武點 +' + g.sp); }
      if (g.roleExp) {
        var MAXL = num(self.charSys.MAX_LEVEL, 300);
        var ups = 0;
        self.celebRoleList().forEach(function (ch) {
          if (ch.lv >= MAXL) return;
          ch.exp = num(ch.exp, 0) + Math.round(num(ch.maxExp, 100) * g.roleExp);
          var guard = 0;
          while (ch.exp >= ch.maxExp && ch.lv < MAXL && guard < 10) {
            guard += 1;
            ch.exp -= ch.maxExp;
            ch.lv += 1;
            ch.freePoints = num(ch.freePoints, 0) + 5;
            ch.maxExp = maxExpFor(ch.lv);
            ups += 1;
          }
          var nd = self.charSys.getDerivedStatsForChar(ch);
          ch.currentHp = nd.maxHp; ch.currentMp = nd.maxMp;
        });
        notes.push('全體角色經驗 +' + (Math.round(g.roleExp * 1000) / 10) + '%');
      }
      if (g.item) {
        if (self.invSys && typeof self.invSys.addItem === 'function') self.invSys.addItem(g.item, 1);
        var nm = ((window.HY.Data.ITEMS || {})[g.item] || {}).name || g.item;
        notes.push('獲得 ' + nm);
      }
      if (g.order) {
        var cur = (C._orderBuff && C._orderBuff.remain > 0) ? num(C._orderBuff.n, 0) : 0;
        C._orderBuff = { tick: self.celebTickNow(), remain: 6, n: cur + g.order };
        notes.push('治安 +' + g.order + '（暫時）');
      }
      var A = self.celebAdvOf(id);
      A.stat.dailies += 1;
      C.advStat.dailies += 1;
      done += 1;
      // ⭐ 日常寫入「動態流」，不洗牌公告板
      self.celebFeed('【' + c.name + '】' + d.icon + d.name + '：' + d.text +
        (notes.length ? '（' + notes.join('、') + '）' : ''), d.icon, id);
    });

    if (C._orderBuff && C._orderBuff.remain > 0) {
      C._orderBuff.remain -= 1;
      if (C._orderBuff.remain <= 0) C._orderBuff = null;
    }
    return done;
  };

  /* ══════════════════════════════════════════════════════
     ⑧ 同門相聚（同社群 2 位以上在鎮上 → 觸發聚會）
     ══════════════════════════════════════════════════════ */
  proto.celebCircleTick = function () {
    var C = this.celebAdvEnsure();
    var t = this.ensureState();
    if (!t.founded) return 0;
    var self = this;
    var tick = this.celebTickNow();

    var bySoc = {};
    function tally(id) {
      var c = self.celebById(id);
      if (!c || !c.society) return;
      if (!bySoc[c.society]) bySoc[c.society] = [];
      bySoc[c.society].push(c);
    }
    C.visitors.forEach(function (v) { tally(v.id); });
    C.settled.forEach(function (s) { tally(s.id); });

    var fired = 0;
    Object.keys(bySoc).forEach(function (sid) {
      var list = bySoc[sid];
      if (list.length < 2) return;
      if (num(C.circle[sid], 0) > tick) return;
      if (Math.random() > CONFIG.CIRCLE_CHANCE) return;

      var soc = null;
      (T.CELEB.SOCIETIES || []).forEach(function (s) { if (s.id === sid) soc = s; });
      var gain = 25 + list.length * 15;
      t.prosperity += gain;
      C.circle[sid] = tick + CONFIG.CIRCLE_CD;
      C.advStat.circle += 1;
      fired += 1;

      var names = list.slice(0, 4).map(function (x) { return x.name; }).join('、');
      self.celebBoard('🤝 【' + (soc ? soc.name : sid) + '】同門相聚！' + names +
        (list.length > 4 ? ' 等 ' + list.length + ' 位' : '') + ' 齊聚小鎮，盛況空前（繁榮 +' + gain + '）。',
        (soc ? soc.icon : '🤝'), 'circle');
      self.log('🤝 同門相聚：' + (soc ? soc.name : sid) + ' ' + list.length + ' 位（繁榮 +' + gain + '）', 'gain');
    });
    if (fired > 0) this.requestRender();
    return fired;
  };

  /* ══════════════════════════════════════════════════════
     掛載 tick
     ══════════════════════════════════════════════════════ */
  var _tick = proto.tick;
  proto.tick = function () {
    var r = _tick.call(this);
    if (!r) return r;
    try {
      this.celebCultivateAll();
      this.celebDailyTick();
      this.celebCircleTick();
      this.celebSyncAllResidents();
    } catch (e) { console.error('[townCelebAdv] tick 錯誤：', e); }
    return r;
  };

  /** 定居名人一律同步為鎮民；已加入公會者，等級跟著名人修行一起成長 */
  proto.celebSyncAllResidents = function () {
    var self = this;
    this.celebInnerSettled().forEach(function (id) {
      self.celebSyncResident(id);
      var gm = self.celebGuildMember(id);
      if (!gm) return;
      var c = self.celebById(id);
      if (!c) return;
      var want = self.celebLevel(c);
      if (num(gm.lv, 1) < want) {
        gm.lv = want;
        gm.maxExp = maxExpFor(want);
        if (typeof self.guildClampVitals === 'function') self.guildClampVitals(gm);
      }
    });
  };

  proto.celebInnerSettled = function () {
    var C = this.celebEnsure();
    return C.settled.map(function (s) { return s.id; });
  };

  /* ══════════════════════════════════════════════════════
     治安：名人日常（暫時 buff）
     ══════════════════════════════════════════════════════ */
  var _order = proto.getTotalOrder;
  proto.getTotalOrder = function () {
    var o = _order.call(this);
    var C = this.celebAdvEnsure();
    if (C._orderBuff && C._orderBuff.remain > 0) o += num(C._orderBuff.n, 0);
    return o;
  };

  /* ══════════════════════════════════════════════════════
     完整報告（供 UI）
     ══════════════════════════════════════════════════════ */
  proto.celebAdvReport = function (celebId) {
    var c = this.celebById(celebId);
    if (!c) return null;
    var A = this.celebAdvOf(celebId);
    var d = this.celebDerived(c);
    var lv = this.celebLevel(c);
    var st = this.celebStats4(c);
    var maxE = maxExpFor(lv);
    var gm = this.celebGuildMember(celebId);
    var sectId = this.celebSectOf(c);

    return {
      id: c.id, name: c.name, icon: c.icon, title: c.title,
      tier: c.tier, society: c.society, socName: c.socName, socIcon: c.socIcon,
      lv: lv, exp: num(A.exp, 0), maxExp: maxE,
      expPct: maxE > 0 ? Math.min(100, Math.floor(num(A.exp, 0) / maxE * 100)) : 0,
      stats: st, derived: d, power: num(d.powerScore, 1),
      sect: sectId, sectName: this.celebSectLabel(c),
      present: this.celebPresent(celebId),
      isVisitor: !!this.celebVisitor(celebId),
      isSettled: this.celebIsSettled(celebId),
      guild: { joined: !!gm, member: gm, can: this.celebCanJoinGuild(celebId), cost: CONFIG.GUILD_COST },
      growth: this.celebGrowthBonus(celebId),
      cultivate: this.celebCultivateGain(celebId),
      cultivateRate: this.celebCultivateRate(celebId),
      equipment: A.equipment,
      stat: A.stat
    };
  };

  proto.celebAdvStats = function () {
    var C = this.celebAdvEnsure();
    var s = C.advStat;
    return {
      spar: num(s.spar, 0), win: num(s.win, 0), lose: num(s.lose, 0),
      guide: num(s.guide, 0), discourse: num(s.discourse, 0),
      dailies: num(s.dailies, 0), levelUps: num(s.levelUps, 0),
      guildJoined: num(s.guildJoined, 0), circle: num(s.circle, 0),
      board: C.log.length, feed: (C.feed || []).length
    };
  };

  proto.celebAdvDebug = function () {
    var s = this.celebAdvStats();
    return {
      切磋: s.spar + '（勝 ' + s.win + ' / 敗 ' + s.lose + '）',
      指點: s.guide, 論道: s.discourse,
      日常活動: s.dailies, 修行升級: s.levelUps,
      加入公會的名人: s.guildJoined, 同門相聚: s.circle,
      公告筆數: s.board, 動態筆數: s.feed
    };
  };

  /* ══════════════════════════════════════════════════════
     對外匯出
     ══════════════════════════════════════════════════════ */
  window.HY.TownCelebAdv = {
    version: '1.0',
    config: CONFIG,
    dailies: DAILIES.length,
    societies: Object.keys(SOC_BASE).length
  };
})();