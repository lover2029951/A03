// js/townCelebSystem.js (v1)
// ⭐ 我的小鎮：名人遊歷系統（融合大樂透的 360 位虛擬人物）
//
// ┌──────────────────────────────────────────────────────────────────┐
// │ 資料來源：Data.LOTTERY_CELEBS (60) + _V2 (150) + _V3 (150) = 360 │
// │ 這些名人在樂透系統中是「每期隨機購買彩券的虛擬人物」               │
// │ 本檔把他們做成「會來小鎮遊歷、消費、結交、定居」的榮譽訪客        │
// └──────────────────────────────────────────────────────────────────┘
//
// ① 名人來訪      每期機率來訪，停留 8~16 期，在地圖上走動
// ② 消費帶動小鎮  每期按 spend 上限 × SPEND_RATE 消費 → 銀兩 + 繁榮
// ③ 送禮結交      花銀兩送禮提升好感度（0 → 100）
// ④ 定居          好感滿 → 可定居，提供永久加成
// ⑤ 社群加成      武林→治安／科學→武點／帝王→繁榮／文人→武點／現代→收入
// ⑥ 五星分級      依 spend 上限自動分 ★ ~ ★★★★★
// ⑦ 名人圖鑑      360 位收集進度
// ⑧ 樂透聯動      在樂透買過票的名人 → 來訪機率 ×1.3
//
// ⚠️ 載入順序：townGuildAdvance.js 之後、uiTown.js 之前。
//    所有狀態收在 rootState.town.celebs。不修改樂透系統（只讀取）。
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[townCeleb] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[townCeleb] 找不到 HY.TownSystem'); return; }

  /* ══════════════════════════════════════════════════════
     CONFIG
     ══════════════════════════════════════════════════════ */
  var CONFIG = {
    // ── 來訪 ──
    VISIT_CHANCE: 0.30,        // 每期觸發「有名人來訪」的機率
    VISIT_COUNT: [1, 2],       // 每次來訪人數
    STAY_TICKS: [8, 16],       // 停留期數範圍
    MAX_VISITORS: 8,           // 同時停留上限
    COOLDOWN_TICKS: 40,        // 同一位名人來訪後冷卻期數

    // ── 消費 ──
    SPEND_RATE: 0.06,          // 每期消費 = spend上限 × 此值
    PROSPER_RATE: 0.05,        // 繁榮度 = 消費 × 此值（另加基本值）
    PROSPER_BASE: 2,           // 每期基本繁榮

    // ── 送禮 ──
    FAVOR_MAX: 100,            // 好感度上限
    GIFT_FAVOR: 10,            // 每次送禮 + 好感
    GIFT_COST_BASE: 400,       // 送禮基礎花費（× 星級）
    GIFT_LIMIT_PER_VISIT: 8,   // 同一次來訪最多送幾次

    // ── 定居 ──
    SETTLE_FAVOR: 100,         // 定居所需好感
    SETTLE_COST_BASE: 2000,    // 定居費用（× 星級）
    SETTLE_INCOME: 0.015,      // 每位定居名人 → 收入 +1.5%（× 星級係數）
    SETTLE_APPEAL: 12,         // 每位定居名人 → 魅力 +12（× 星級係數）
    SETTLE_PROSPER: 40,        // 定居當下立刻獲得繁榮

    // ── 樂透聯動 ──
    LOTTERY_BONUS: 0.30,       // 在樂透買過票 → 來訪機率 ×(1+此值)
    LOTTERY_CHECK: true,       // 是否讀取樂透狀態

    // ── 其他 ──
    MAP_SHOW: true             // 是否在地圖上顯示名人 avatar
  };
  T.CELEB = T.CELEB || {};
  T.CELEB.CONFIG = CONFIG;

  /* ══════════════════════════════════════════════════════
     社群分類（依 id 歸類，用於加成與 UI 篩選）
     ══════════════════════════════════════════════════════ */
  var SOCIETIES = [
    { id: 'wulin',  name: '武林宗師', icon: '⚔️', color: '#f43f5e',
      desc: '每一位都是傳說中的高手，光他們往那一站，宵小就不敢近小鎮半步。',
      bonus: { order: 1 } },
    { id: 'science', name: '科學巨擘', icon: '🔬', color: '#38bdf8',
      desc: '他們帶來的知識，讓小鎮學堂與工坊的效率突飛猛進。',
      bonus: { spMul: 0.08, learnDiscount: 0.03 } },
    { id: 'royal',  name: '帝王將相', icon: '👑', color: '#fbbf24',
      desc: '帝王之氣薰染全鎮，商旅聞風而來，地價水漲船高。',
      bonus: { prosperityMul: 0.10, landMul: 0.05 } },
    { id: 'literati', name: '文人雅士', icon: '📚', color: '#a78bfa',
      desc: '文氣匯聚，鎮上孩童讀書聲朗朗，武學悟性也跟著提升。',
      bonus: { spMul: 0.10, appeal: 6 } },
    { id: 'modern', name: '現代風雲', icon: '🎬', color: '#34d399',
      desc: '他們一句話就能帶動風潮，小鎮的生意跟著熱絡起來。',
      bonus: { incomeMul: 0.05, appeal: 8 } }
  ];
  var SOC_MAP = {};
  SOCIETIES.forEach(function (s) { SOC_MAP[s.id] = s; });
  T.CELEB.SOCIETIES = SOCIETIES;

  // 社群 → 名人 id 清單
  var SOC_IDS = {
    wulin: ['zhang_sanfeng','huang_yaoshi','hong_qigong','dugu_qiuqiu','dongfang_bubai','saodiseng','wuyazi',
      'wangchongyang','ouyangfeng','yidengdashi','zhoubotong','huangrong','guojing','yangguo','xiaolongnv',
      'zhangwuji','linghuchong','renwoxing','fengqingyang','qiaofeng','duanyu','xuzhu','murongfu','jiumozhi',
      'lixunhuan','chuliuxiang','luxiaofeng','huamanlou','ximencuixue','yegucheng','afei','fuhongxue',
      'liannichang','zhuoyihang','lishengnan','jinshiyi','zhangdanfeng','yunlei','tiezhongtang','shenlang',
      'wanglianhua','xiaoqiushui','wangxiaoshi','sumengzhen','baichoufei','guanqi','difeijing','leisun',
      'tangzhan','zhugezhengwo','yuanshisanxian','qishaoshang','guxizhao','xihonglei',
      'jinyong','gulong','liangyusheng','guanyu','zhaoyun','caocao','zhugeliang','baiqi','wuqi','sunwu'],

    science: ['einstein','newton','tesla','edison','curie','turing','hawking','darwin','galileo','archimedes',
      'feynman','bohr','copernicus','kepler','hooke','pasteur','faraday','maxwell','mendel','lavoisier',
      'dalton','lamarck','zhangheng','zuchongzhi','huatuo','lishizhen','sunsimiao','zhangzhongjing',
      'shenkuo','guoshoujing','bisheng','luban','mozi'],

    royal: ['napoleon','qinshihuang','wuzetian','genghis','zhenghe','liubang','xiangyu','hanxin',
      'zhangliang','xiaohe','hanwudi','weiqing','huoqubing','liguang','zhangqian','simaqian','banchao','cailun',
      'lishimin','lijing','weizheng','direnjie','guoziyi','anlushan','zhaokuangyin','yuefei','hanshizhong',
      'wentianxiang','hubilie','subutai','yelvabaoji','wanyanaguda','zhuyuanzhang','liubowen','changyuchun',
      'xuda','zhenggong','kangxi','yongzheng','qianlong','jixiaolan','hesen','zengguofan','lihongzhang',
      'zuozongtang','fanli','wuzixu','lianpo','linxiangru','quyuan','jingke','shangyang','lisi','mengtian',
      'chensheng','wangjian','leyi',
      'alexander','caesar','augustus','markantony','hannibal','spartacus','cleopatra','trajan','constantine',
      'charlemagne','williamconq','lionheart','joanofarc','saladin','batu','timur','suleiman','elizabeth1',
      'henry8','louis14','peter1','catherine2','washington','lincoln','jefferson','franklin_bf','hamilton',
      'wellington','nelson','bismarck','garibaldi','churchill','roosevelt','degaulle','gandhi','mandela','mlk',
      'lenin','trotsky','stalin','sunzhongshan','chiangkaishek','maozedong','zhouenlai','dengxiaoping',
      'meiji','itohirobumi','togo','yamamoto','macarthur'],

    literati: ['wangwei','baijuyi','hanyu','liuzongyuan','ouyangxiu','wanganshi','simaguang','liqingzhao',
      'xinqiji','luyou','guanhanqing','luoguanzhong','shinaian','wuchengen','caoxueqin','wudaozi','yanzhenqing',
      'liugongquan','zhangzeduan','tangbohu','zhenbanqiao','qibaishi','zhangdaqian','xubeihong','meilanfang',
      'xuxiake','huangdaopo','zhuangzi','mengzi','xunzi','hanfei','zhuxi','wangyangming','guyanwu','huangzongxi',
      'caoyuanpei','gongzizhen',
      'shakespeare','davinci','van_gogh','picasso','michelangelo','beethoven','mozart','libai','dufu','sushi',
      'wangxizhi','tolstoy','hemingway','confucius','laozi','socrates','aristotle','plato','kant','nietzsche',
      'hugo','balzac','dickens','dostoevsky','kafka','joyce','proust','woolf','marquez','borges','tagore',
      'kawabata','mishima','murakami','dazai',
      'freud','jung','marx','engels','adamsmith','keynes','weber','durkheim','rousseau','voltaire','montesquieu',
      'locke','hobbes','descartes','bacon_f','hegel','schopenhauer','heidegger','sartre','camus','wittgenstein',
      'russell','popper','foucault','derrida'],

    modern: ['musk','gates','jobs','bezos','buffett','jordan','messi','beckham','federer','tyson',
      'jackma','pony_ma','lijiashang','guotaiming','zhangzhongmou','jensenhuang','susu','kaifulee',
      'robinli','leijun','zuckerberg','larrypage','sergeybrin','obama','trump','merkel','putin','zelensky',
      'armstrong','gagarin','goodall','attenborough','inamori','matsushita','toyota',
      'ali_boxing','brucelee','jackiechan','stephenchow','jaychou','tengli','jackycheung','andylau',
      'zhangguorong','anitamui','beatles','elvis','michaeljackson','madonna','ladygaga','taylorswift',
      'beyonce','eminem','bobdylan','johnlennon','monroe','hepburn','chaplin','spielberg','nolan']
  };
  // 建立 id → 社群 反查表
  var ID2SOC = {};
  Object.keys(SOC_IDS).forEach(function (sid) {
    SOC_IDS[sid].forEach(function (cid) { if (!ID2SOC[cid]) ID2SOC[cid] = sid; });
  });
  T.CELEB.ID2SOC = ID2SOC;

  /* ══════════════════════════════════════════════════════
     五星身價分級（依 spend 上限自動判定）
     ══════════════════════════════════════════════════════ */
  var TIERS = [
    { lv: 1, name: '見習',   icon: '★',         max: 2000,     mul: 1.0 },
    { lv: 2, name: '小有名氣', icon: '★★',      max: 5000,     mul: 1.4 },
    { lv: 3, name: '知名',   icon: '★★★',      max: 10000,    mul: 1.9 },
    { lv: 4, name: '顯赫',   icon: '★★★★',     max: 18000,    mul: 2.6 },
    { lv: 5, name: '傳奇',   icon: '★★★★★',    max: Infinity, mul: 3.6 }
  ];
  T.CELEB.TIERS = TIERS;

  function tierOf(maxSpend) {
    for (var i = 0; i < TIERS.length; i++) { if (maxSpend <= TIERS[i].max) return TIERS[i]; }
    return TIERS[TIERS.length - 1];
  }

  /* ══════════════════════════════════════════════════════
     工具
     ══════════════════════════════════════════════════════ */
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function nowMs() { return Date.now(); }
  T.CELEB.rndInt = rndInt;
  T.CELEB.pick = pick;

  /* ══════════════════════════════════════════════════════
     名人資料 enrich（合併三批 + 補上社群/星級）
     ══════════════════════════════════════════════════════ */
  var _celebCache = null;

  proto.celebAll = function () {
    if (_celebCache) return _celebCache;
    var D = window.HY.Data || {};
    var raw = [];
    if (Array.isArray(D.LOTTERY_CELEBS)) raw = raw.concat(D.LOTTERY_CELEBS);
    if (Array.isArray(D.LOTTERY_CELEBS_V2)) raw = raw.concat(D.LOTTERY_CELEBS_V2);
    if (Array.isArray(D.LOTTERY_CELEBS_V3)) raw = raw.concat(D.LOTTERY_CELEBS_V3);

    var out = raw.map(function (c) {
      if (!c || !c.id) return null;
      var lo = (c.spend && c.spend[0]) ? c.spend[0] : 100;
      var hi = (c.spend && c.spend[1]) ? c.spend[1] : 1000;
      var tier = tierOf(hi);
      var socId = ID2SOC[c.id] || null;
      return {
        id: c.id,
        name: c.name || c.id,
        icon: c.icon || '👤',
        title: c.title || '',
        spend: [lo, hi],
        maxSpend: hi,
        tier: tier,
        society: socId,
        socName: socId ? (SOC_MAP[socId] ? SOC_MAP[socId].name : socId) : '江湖散人',
        socIcon: socId ? (SOC_MAP[socId] ? SOC_MAP[socId].icon : '👤') : '👤'
      };
    }).filter(Boolean);

    var seen = {};
    out = out.filter(function (c) { if (seen[c.id]) return false; seen[c.id] = 1; return true; });
    _celebCache = out;
    return out;
  };

  proto.celebById = function (id) {
    if (!id) return null;
    var l = this.celebAll();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  };

  proto.celebCount = function () { return this.celebAll().length; };

  /* ══════════════════════════════════════════════════════
     狀態（存在 rootState.town.celebs）
     ══════════════════════════════════════════════════════ */
  proto.celebDefaultState = function () {
    return {
      visitors: [],    // [{ id, arriveTick, stayLeft, left, favor, gifts, spent }]
      settled: [],     // [{ id, tick, favor }]
      discovered: [],  // 圖鑑：見過面的名人 id
      cooldown: {},    // { id: 到期期數 }
      stats: { visits: 0, gifts: 0, settled: 0, totalSpend: 0, totalProsper: 0, totalGold: 0, invited: 0 }
    };
  };

  proto.celebEnsure = function () {
    var t = this.ensureState();
    if (!t.celebs || typeof t.celebs !== 'object') t.celebs = this.celebDefaultState();
    var C = t.celebs, d = this.celebDefaultState(), k;
    for (k in d) { if (Object.prototype.hasOwnProperty.call(d, k) && C[k] === undefined) C[k] = d[k]; }
    ['visitors', 'settled', 'discovered'].forEach(function (x) { if (!Array.isArray(C[x])) C[x] = []; });
    if (!C.cooldown || typeof C.cooldown !== 'object') C.cooldown = {};
    if (!C.stats || typeof C.stats !== 'object') C.stats = d.stats;
    for (k in d.stats) { if (C.stats[k] === undefined) C.stats[k] = 0; }

    // 清理：資料中不存在的 id（防止資料檔更新後殘留）
    var valid = {};
    this.celebAll().forEach(function (c) { valid[c.id] = 1; });
    C.visitors = C.visitors.filter(function (v) { return valid[v.id]; });
    C.settled = C.settled.filter(function (s) { return valid[s.id]; });
    C.discovered = C.discovered.filter(function (x) { return valid[x]; });

    return C;
  };

  proto.celebLog = function (msg, type) {
    var t = this.ensureState();
    this.log('[名人] ' + msg, type || 'time');
  };

  /* ══════════════════════════════════════════════════════
     樂透聯動：讀取「在樂透買過票」的名人
     ══════════════════════════════════════════════════════ */
  proto.celebLotteryIds = function () {
    if (!CONFIG.LOTTERY_CHECK) return [];
    try {
      var g = window.HY.game;
      var sys = g && g.lotterySys;
      if (!sys || typeof sys.getState !== 'function') return [];
      var L = sys.getState();
      return Array.isArray(L && L.npcBoughtIds) ? L.npcBoughtIds : [];
    } catch (e) { return []; }
  };

  proto.celebLotteryProgress = function () {
    var ids = this.celebLotteryIds();
    return { bought: ids.length, total: this.celebCount() };
  };

  /* ══════════════════════════════════════════════════════
     ⭐ 加成聚合（社群 + 星級）
     只計「已定居」的名人（來訪中的只算消費，不給永久加成）
     ══════════════════════════════════════════════════════ */
  proto.celebBonus = function () {
    var C = this.celebEnsure();
    // ⭐ 簽章快取：getStats / getGlobalMul / getTotalOrder 都會呼叫本函式
    var sig = C.settled.map(function (s) { return s.id; }).join(',');
    if (this._celebBonusCache && this._celebBonusSig === sig) return this._celebBonusCache;
    var out = {
      order: 0, spMul: 0, incomeMul: 0, prosperityMul: 0, landMul: 0,
      appeal: 0, learnDiscount: 0, list: [], bySoc: {}
    };

    SOCIETIES.forEach(function (s) { out.bySoc[s.id] = { count: 0, bonus: s.bonus }; });

    C.settled.forEach(function (s) {
      var c = this.celebById(s.id);
      if (!c) return;
      var mul = num(c.tier && c.tier.mul, 1);
      if (c.society && SOC_MAP[c.society]) {
        var b = SOC_MAP[c.society].bonus || {};
        Object.keys(b).forEach(function (k) {
          if (typeof b[k] !== 'number') return;
          out[k] = num(out[k], 0) + b[k] * mul;
        });
        out.bySoc[c.society].count += 1;
      }
      // 定居基本加成
      out.incomeMul += CONFIG.SETTLE_INCOME * mul;
      out.appeal += CONFIG.SETTLE_APPEAL * mul;
      // 星級越高，收入加碼
      out.incomeMul += (c.tier.lv - 1) * 0.004;
      out.list.push({ id: c.id, name: c.name, icon: c.icon, tier: c.tier, society: c.society });
    }, this);

    this._celebBonusCache = out;
    this._celebBonusSig = sig;
    return out;
  };

  /* ══════════════════════════════════════════════════════
     來訪
     ══════════════════════════════════════════════════════ */
  proto.celebVisitors = function () { return this.celebEnsure().visitors; };
  proto.celebSettled = function () { return this.celebEnsure().settled; };

  proto.celebVisitor = function (id) {
    var l = this.celebVisitors();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  };

  proto.celebIsSettled = function (id) {
    return this.celebSettled().some(function (s) { return s.id === id; });
  };

  proto.celebTickNow = function () {
    var t = this.ensureState();
    return num(t.stats && t.stats.ticks, 0);
  };

  /** 可來訪的候選名人（排除已在場、已定居、冷卻中） */
  proto.celebCandidates = function () {
    var C = this.celebEnsure();
    var tick = this.celebTickNow();
    var onStage = {};
    C.visitors.forEach(function (v) { onStage[v.id] = 1; });
    C.settled.forEach(function (s) { onStage[s.id] = 1; });

    return this.celebAll().filter(function (c) {
      if (onStage[c.id]) return false;
      var cd = num(C.cooldown[c.id], 0);
      if (cd > tick) return false;
      return true;
    });
  };

  /** 觸發一次來訪（每期由 celebTick 判定） */
  proto.celebTryVisit = function () {
    var C = this.celebEnsure();
    if (C.visitors.length >= CONFIG.MAX_VISITORS) return 0;

    // 來訪機率：基礎 + 樂透聯動
    var chance = CONFIG.VISIT_CHANCE;
    var lotIds = this.celebLotteryIds();
    var lotBonus = lotIds.length > 0 ? CONFIG.LOTTERY_BONUS : 0;

    if (Math.random() > chance) return 0;

    var pool = this.celebCandidates();
    if (!pool.length) return 0;

    // ⭐ 樂透買過票的名人 → 權重提高（累積權重法，精確且不展開陣列）
    var ws = pool.map(function (c) {
      var w = 1;
      if (lotBonus > 0 && lotIds.indexOf(c.id) !== -1) w += lotBonus * 3;
      return { c: c, w: w };
    });
    function drawOne() {
      var total = 0, i;
      for (i = 0; i < ws.length; i++) total += ws[i].w;
      if (total <= 0) return pool.length ? pick(pool) : null;
      var r = Math.random() * total, acc = 0;
      for (i = 0; i < ws.length; i++) {
        acc += ws[i].w;
        if (r <= acc) return ws[i].c;
      }
      return ws.length ? ws[ws.length - 1].c : null;
    }

    var want = rndInt(CONFIG.VISIT_COUNT[0], CONFIG.VISIT_COUNT[1]);
    want = Math.min(want, CONFIG.MAX_VISITORS - C.visitors.length, pool.length);

    var added = 0;
    var used = {};
    var ticks = rndInt(CONFIG.STAY_TICKS[0], CONFIG.STAY_TICKS[1]);

    for (var i = 0; i < want; i++) {
      var c = drawOne();
      if (!c || used[c.id]) continue;
      used[c.id] = 1;
      C.visitors.push({
        id: c.id,
        arriveTick: this.celebTickNow(),
        stayLeft: ticks,
        stayTotal: ticks,
        favor: 0,
        gifts: 0,
        spent: 0,
        x: Math.floor(Math.random() * (this.def.GRID_W || 12)),
        y: Math.floor(Math.random() * (this.def.GRID_H || 9))
      });
      if (C.discovered.indexOf(c.id) === -1) C.discovered.push(c.id);
      added += 1;
      C.stats.visits += 1;
    }

    if (added > 0) {
      this.celebLog('🌟 有 ' + added + ' 位名人造訪小鎮，將停留 ' + ticks + ' 期。', 'time');
    }
    return added;
  };

  /** 主動邀請（花銀兩，立即來訪） */
  proto.celebInviteCost = function (id) {
    var c = this.celebById(id);
    if (!c) return 0;
    return Math.max(200, Math.round(c.maxSpend * 0.15 * c.tier.mul));
  };

  proto.celebCanInvite = function (id) {
    var C = this.celebEnsure();
    var c = this.celebById(id);
    if (!c) return { ok: false, msg: '無此名人' };
    if (this.celebVisitor(id)) return { ok: false, msg: '正在小鎮作客' };
    if (this.celebIsSettled(id)) return { ok: false, msg: '已定居小鎮' };
    if (C.visitors.length >= CONFIG.MAX_VISITORS) return { ok: false, msg: '小鎮訪客已滿（' + C.visitors.length + '/' + CONFIG.MAX_VISITORS + '）' };
    var cost = this.celebInviteCost(id);
    if (this.charSys.rootState.gold < cost) return { ok: false, msg: '銀兩不足（需 ' + cost + ' 兩）' };
    return { ok: true, cost: cost, celeb: c };
  };

  proto.celebInvite = function (id) {
    var chk = this.celebCanInvite(id);
    if (!chk.ok) { this.log('⚠️ 無法邀請：' + chk.msg, 'system'); return false; }
    var C = this.celebEnsure();
    this.charSys.rootState.gold -= chk.cost;
    var ticks = rndInt(CONFIG.STAY_TICKS[0], CONFIG.STAY_TICKS[1]);
    C.visitors.push({
      id: id, arriveTick: this.celebTickNow(), stayLeft: ticks, stayTotal: ticks,
      favor: 0, gifts: 0, spent: 0,
      x: Math.floor(Math.random() * (this.def.GRID_W || 12)),
      y: Math.floor(Math.random() * (this.def.GRID_H || 9))
    });
    if (C.discovered.indexOf(id) === -1) C.discovered.push(id);
    C.stats.visits += 1;
    C.stats.invited += 1;
    this.celebLog('📨 你以 ' + chk.cost + ' 兩邀請【' + chk.celeb.name + '】造訪小鎮（停留 ' + ticks + ' 期）。', 'wealth');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     送禮結交
     ══════════════════════════════════════════════════════ */
  proto.celebGiftCost = function (id) {
    var c = this.celebById(id);
    if (!c) return 0;
    return Math.max(100, Math.round(CONFIG.GIFT_COST_BASE * c.tier.mul));
  };

  proto.celebCanGift = function (id) {
    var v = this.celebVisitor(id);
    if (!v) return { ok: false, msg: '該名人不在小鎮' };
    var c = this.celebById(id);
    if (!c) return { ok: false, msg: '無此名人' };
    if (v.gifts >= CONFIG.GIFT_LIMIT_PER_VISIT) return { ok: false, msg: '本次來訪已送禮 ' + v.gifts + ' 次（上限 ' + CONFIG.GIFT_LIMIT_PER_VISIT + '）' };
    if (v.favor >= CONFIG.FAVOR_MAX) return { ok: false, msg: '好感度已滿' };
    var cost = this.celebGiftCost(id);
    if (this.charSys.rootState.gold < cost) return { ok: false, msg: '銀兩不足（需 ' + cost + ' 兩）' };
    return { ok: true, cost: cost, celeb: c, visitor: v };
  };

  proto.celebGift = function (id) {
    var chk = this.celebCanGift(id);
    if (!chk.ok) { this.log('⚠️ 無法送禮：' + chk.msg, 'system'); return false; }
    var C = this.celebEnsure();
    this.charSys.rootState.gold -= chk.cost;
    chk.visitor.gifts += 1;
    var add = Math.round(CONFIG.GIFT_FAVOR * (1 + (chk.celeb.tier.lv - 1) * 0.05));
    chk.visitor.favor = Math.min(CONFIG.FAVOR_MAX, chk.visitor.favor + add);
    C.stats.gifts += 1;
    this.celebLog('🎁 你送禮給【' + chk.celeb.name + '】（花費 ' + chk.cost + ' 兩），好感 +' + add +
      '（目前 ' + chk.visitor.favor + '/' + CONFIG.FAVOR_MAX + '）。', 'wealth');
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     定居
     ══════════════════════════════════════════════════════ */
  proto.celebSettleCost = function (id) {
    var c = this.celebById(id);
    if (!c) return 0;
    return Math.round(CONFIG.SETTLE_COST_BASE * c.tier.mul);
  };

  proto.celebCanSettle = function (id) {
    var v = this.celebVisitor(id);
    if (!v) return { ok: false, msg: '該名人不在小鎮' };
    var c = this.celebById(id);
    if (!c) return { ok: false, msg: '無此名人' };
    if (v.favor < CONFIG.SETTLE_FAVOR) {
      return { ok: false, msg: '好感度不足（需 ' + CONFIG.SETTLE_FAVOR + '，目前 ' + v.favor + '）' };
    }
    var cost = this.celebSettleCost(id);
    if (this.charSys.rootState.gold < cost) return { ok: false, msg: '銀兩不足（需 ' + cost + ' 兩）' };
    return { ok: true, cost: cost, celeb: c, visitor: v };
  };

  proto.celebSettle = function (id) {
    var chk = this.celebCanSettle(id);
    if (!chk.ok) { this.log('⚠️ 無法定居：' + chk.msg, 'system'); return false; }
    var C = this.celebEnsure(), t = this.ensureState();
    this.charSys.rootState.gold -= chk.cost;
    C.visitors = C.visitors.filter(function (v) { return v.id !== id; });
    C.settled.push({ id: id, tick: this.celebTickNow(), favor: chk.visitor.favor });
    C.stats.settled += 1;
    t.prosperity += CONFIG.SETTLE_PROSPER * chk.celeb.tier.mul;
    this.celebLog('🏡 【' + chk.celeb.name + '】（' + chk.celeb.title + '）正式定居小鎮！' +
      '花費 ' + chk.cost + ' 兩，繁榮 +' + Math.round(CONFIG.SETTLE_PROSPER * chk.celeb.tier.mul) + '。', 'wealth');
    this.guildClampVitals && this.requestRender();
    this.requestRender();
    return true;
  };

  /* ══════════════════════════════════════════════════════
     消費 + 停留推進（每期）
     ══════════════════════════════════════════════════════ */
  proto.celebVisitorSpend = function (v) {
    var c = this.celebById(v.id);
    if (!c) return 0;
    return Math.max(1, Math.round(c.maxSpend * CONFIG.SPEND_RATE));
  };

  proto.celebTick = function () {
    var t = this.ensureState();
    if (!t.founded) return;          // 尚未開鎮 → 名人系統不運作
    var C = this.celebEnsure();

    var tick = this.celebTickNow();
    var goldGain = 0, prosperGain = 0;
    var leaving = [];

    C.visitors.forEach(function (v) {
      var c = this.celebById(v.id);
      if (!c) return;
      var spend = this.celebVisitorSpend(v);
      v.spent = num(v.spent, 0) + spend;
      goldGain += spend;
      prosperGain += Math.max(CONFIG.PROSPER_BASE, Math.round(spend * CONFIG.PROSPER_RATE));
      v.stayLeft = num(v.stayLeft, 0) - 1;
      // 走動
      if (CONFIG.MAP_SHOW) {
        v.x = Math.floor(Math.random() * (this.def.GRID_W || 12));
        v.y = Math.floor(Math.random() * (this.def.GRID_H || 9));
      }
      if (v.stayLeft <= 0) leaving.push(v);
    }, this);

    if (goldGain > 0) {
      this.charSys.rootState.gold += goldGain;
      t.prosperity += prosperGain;
      C.stats.totalGold += goldGain;
      C.stats.totalProsper += prosperGain;
      C.stats.totalSpend += goldGain;
    }

    // 離開處理
    if (leaving.length) {
      var names = leaving.map(function (v) { var c = this.celebById(v.id); return c ? c.name : v.id; }, this);
      C.visitors = C.visitors.filter(function (v) { return leaving.indexOf(v) === -1; });
      leaving.forEach(function (v) {
        C.cooldown[v.id] = tick + CONFIG.COOLDOWN_TICKS;
        // 好感度高但未定居 → 有機會下次再來（縮短冷卻）
        if (num(v.favor, 0) >= 50) C.cooldown[v.id] = tick + Math.floor(CONFIG.COOLDOWN_TICKS / 2);
      });
      if (C.visitors.length === 0) {
        this.celebLog('👋 ' + names.join('、') + ' 結束遊歷，告別小鎮。', 'time');
      }
    }

    return { gold: goldGain, prosper: prosperGain, left: leaving.length };
  };

  /* ══════════════════════════════════════════════════════
     覆寫 guildDerived 前的加成掛載（與其他系統一致的包裝法）
     ══════════════════════════════════════════════════════ */
  var _getGlobalMul = proto.getGlobalMul;
  proto.getGlobalMul = function () {
    var m = _getGlobalMul.call(this);
    var b = this.celebBonus();
    return m * (1 + num(b.incomeMul, 0));
  };

  var _getTotalOrder = proto.getTotalOrder;
  proto.getTotalOrder = function () {
    var o = _getTotalOrder.call(this);
    var b = this.celebBonus();
    return o + Math.floor(num(b.order, 0));
  };

  var _getSpPerTick = proto.getSpPerTick;
  proto.getSpPerTick = function () {
    var sp = _getSpPerTick.call(this);
    var b = this.celebBonus();
    return sp * (1 + num(b.spMul, 0));
  };

  var _getResearchBonus = proto.getResearchBonus;
  proto.getResearchBonus = function (key, dflt) {
    var v = _getResearchBonus.call(this, key, dflt);
    var b = this.celebBonus();
    if (key === 'incomeMul') return num(v, 0) + num(b.incomeMul, 0);
    if (key === 'prosperityMul') return num(v, 0) + num(b.prosperityMul, 0);
    if (key === 'landMul') return num(v, 0) + num(b.landMul, 0);
    return v;
  };

  /* ══════════════════════════════════════════════════════
     掛載 tick：名人消費與來訪
     ══════════════════════════════════════════════════════ */
  var _tick = proto.tick;
  proto.tick = function () {
    var r = _tick.call(this);
    if (!r) return r;
    try {
      this.celebTick();
      this.celebTryVisit();
    } catch (e) { console.error('[townCeleb] tick 錯誤：', e); }
    return r;
  };

  /* ══════════════════════════════════════════════════════
     統計（供 UI）
     ══════════════════════════════════════════════════════ */
  proto.celebStats = function () {
    var C = this.celebEnsure();
    // ⭐ 簽章快取：getStats() 會被 UI 每幀呼叫，避免重複計算
    var tick = num((this._t && this._t.stats) ? this._t.stats.ticks : 0, 0);
    var sig = C.visitors.length + ':' + C.settled.length + ':' + C.discovered.length + ':' + tick;
    if (this._celebStatsCache && this._celebStatsSig === sig) return this._celebStatsCache;
    var b = this.celebBonus();
    var lp = this.celebLotteryProgress();
    var bySoc = {};
    C.settled.forEach(function (s) {
      var c = this.celebById(s.id);
      if (!c) return;
      var k = c.society || 'none';
      bySoc[k] = num(bySoc[k], 0) + 1;
    }, this);
    var out = {
      total: this.celebCount(),
      discovered: C.discovered.length,
      visitors: C.visitors.length,
      maxVisitors: CONFIG.MAX_VISITORS,
      settled: C.settled.length,
      bonus: b,
      bySoc: bySoc,
      lottery: lp,
      stats: C.stats
    };
    this._celebStatsCache = out;
    this._celebStatsSig = sig;
    return out;
  };

  var _getStats = proto.getStats;
  proto.getStats = function () {
    var s = _getStats.call(this);
    s.celeb = this.celebStats();
    s.celebBonusTotal = this.celebBonus();
    return s;
  };

  /* ══════════════════════════════════════════════════════
     完整報告（供 UI 一次取得）
     ══════════════════════════════════════════════════════ */
  proto.celebReport = function () {
    var self = this;
    var C = this.celebEnsure();
    var b = this.celebBonus();

    // 來訪中（含詳細資料）
    var visitors = C.visitors.map(function (v) {
      var c = self.celebById(v.id);
      if (!c) return null;
      return {
        id: c.id, name: c.name, icon: c.icon, title: c.title,
        tier: c.tier, society: c.society, socName: c.socName, socIcon: c.socIcon,
        stayLeft: num(v.stayLeft, 0), stayTotal: num(v.stayTotal, 1),
        favor: num(v.favor, 0), favorMax: CONFIG.FAVOR_MAX,
        gifts: num(v.gifts, 0), giftLimit: CONFIG.GIFT_LIMIT_PER_VISIT,
        spent: num(v.spent, 0),
        spendPerTick: self.celebVisitorSpend(v),
        giftCost: self.celebGiftCost(c.id),
        settleCost: self.celebSettleCost(c.id),
        canGift: self.celebCanGift(c.id),
        canSettle: self.celebCanSettle(c.id)
      };
    }).filter(Boolean);

    // 已定居
    var settled = C.settled.map(function (s) {
      var c = self.celebById(s.id);
      if (!c) return null;
      return {
        id: c.id, name: c.name, icon: c.icon, title: c.title,
        tier: c.tier, society: c.society, socName: c.socName, socIcon: c.socIcon,
        settleTick: num(s.tick, 0),
        socBonus: (c.society && SOC_MAP[c.society]) ? SOC_MAP[c.society].bonus : {},
        socDesc: (c.society && SOC_MAP[c.society]) ? SOC_MAP[c.society].desc : ''
      };
    }).filter(Boolean);

    // 圖鑑（全部 360 位，標記狀態）
    var discovered = {};
    C.discovered.forEach(function (id) { discovered[id] = 1; });
    var settledIds = {};
    C.settled.forEach(function (s) { settledIds[s.id] = 1; });
    var visitIds = {};
    C.visitors.forEach(function (v) { visitIds[v.id] = 1; });

    var codex = this.celebAll().map(function (c) {
      return {
        id: c.id, name: c.name, icon: c.icon, title: c.title,
        tier: c.tier, society: c.society, socName: c.socName, socIcon: c.socIcon,
        maxSpend: c.maxSpend, spend: c.spend,
        seen: !!discovered[c.id],
        isVisitor: !!visitIds[c.id],
        isSettled: !!settledIds[c.id],
        canInvite: self.celebCanInvite(c.id),
        inviteCost: self.celebInviteCost(c.id)
      };
    });

    return {
      visitors: visitors,
      settled: settled,
      codex: codex,
      bonus: b,
      societies: SOCIETIES,
      tiers: TIERS,
      config: CONFIG,
      stats: this.celebStats(),
      lottery: this.celebLotteryProgress()
    };
  };

  /* ══════════════════════════════════════════════════════
     Console 便利指令
     ══════════════════════════════════════════════════════ */
  proto.celebDebug = function () {
    var s = this.celebStats();
    return {
      名人總數: s.total,
      已解鎖圖鑑: s.discovered,
      來訪中: s.visitors + '/' + s.maxVisitors,
      已定居: s.settled,
      樂透已購名人: s.lottery.bought + '/' + s.lottery.total,
      累計消費: s.stats.totalSpend,
      定居加成: {
        收入: (s.bonus.incomeMul * 100).toFixed(1) + '%',
        武點: (s.bonus.spMul * 100).toFixed(1) + '%',
        繁榮成長: (s.bonus.prosperityMul * 100).toFixed(1) + '%',
        地價: (s.bonus.landMul * 100).toFixed(1) + '%',
        治安: s.bonus.order,
        魅力: Math.round(s.bonus.appeal)
      }
    };
  };

  /* ══════════════════════════════════════════════════════
     事件補充（名人相關）
     ══════════════════════════════════════════════════════ */
  T.EVENTS = T.EVENTS.concat([
    { name: '名人題匾', icon: '🖌️', text: '一位名人為小鎮題了匾額，牌樓下擠滿了看熱鬧的人。', gain: { prosperity: 180 } },
    { name: '名人講學', icon: '🎓', text: '名人在鎮上開講，四方學子聞風而來。',           gain: { prosperity: 150 } },
    { name: '追星人潮', icon: '📸', text: '聽聞名人造訪，大批民眾湧入小鎮。',               gain: { goldMul: 1.6, prosperity: 120 } },
    { name: '名人獻策', icon: '📜', text: '名人向鎮長獻上一策，小鎮受益匪淺。',             gain: { prosperity: 200 } },
    { name: '舊友來訪', icon: '🤝', text: '定居名人引來舊友，小鎮貴客盈門。',               gain: { goldMul: 1.4, prosperity: 100 } }
  ]);

  /* ══════════════════════════════════════════════════════
     對外匯出
     ══════════════════════════════════════════════════════ */
  window.HY.TownCeleb = {
    version: '1.0',
    config: CONFIG,
    societies: SOCIETIES.length,
    tiers: TIERS.length
  };
})();