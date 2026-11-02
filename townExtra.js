// js/townExtra.js (v1)
// ⭐ 我的小鎮：內容擴充包（額外 JS）
//
// 參考開羅遊戲機制擴充（《Venture Towns》《大江戶物語》《夢想小鎮》）：
//   ① 三件套組合：3 棟建築彼此距離 3 格內即成立（原作 Combo 的核心）
//   ② 綠化／道路的「環境加成」：相鄰即生效的 mini combo（原作 Plants / Roads）
//   ③ 地價（Land Price）：反映小鎮價值密度，帶動繁榮成長與年度評鑑
//   ④ 年度評鑑稱號（Rank）
//   ⑤ 節慶開催：花銀兩換繁榮＋期間加成
//   ⑥ 四季加成
//   ⑦ 銀兩收入倍率 INCOME_SCALE（總開關）
//
// ⚠️ 本檔必須排在 townSystem.js 之後、main.js 之前載入。
//    它會註冊新資料到 HY.Data.TOWN，並在 HY.TownSystem.prototype 上疊加功能。
//    所有可調參數集中在下方 CONFIG，其他檔案不需更動。
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[townExtra] 找不到 HY.Data.TOWN，請確認 townData.js 已載入且排在本檔之前。'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[townExtra] 找不到 HY.TownSystem，請確認 townSystem.js 已載入且排在本檔之前。'); return; }

  /* ══════════════════════════════════════════════════════
     CONFIG —— 全部可調參數都在這裡
     ══════════════════════════════════════════════════════ */
  var CONFIG = {
    // 小鎮每期銀兩收入倍率。0.01 = 降低 100 倍（預設）
    INCOME_SCALE: 0.01,
    // 建造／升級／研究造價倍率。1 = 維持原樣
    // （銀兩變緊，小鎮成為金錢的去處；若想讓小鎮內部經濟比例完全不變，兩者都設 0.01）
    COST_SCALE: 1,
    // 地價 ÷ 此值 = 每期額外獲得的繁榮度（地價是開羅系列的核心數值）
    LAND_DIV: 300,
    // 三件套：任兩棟的曼哈頓距離上限（格）
    TRIPLE_RANGE: 3,
    // 環境加成倍率
    GREENERY_MUL: 1.04,
    ROAD_MUL: 1.03,
    // 組合掃描快取（大幅降低運算量，建議開啟）
    COMBO_CACHE: true
  };

  T.INCOME_SCALE = CONFIG.INCOME_SCALE;
  T.COST_SCALE = CONFIG.COST_SCALE;

  /* ══════════════════════════════════════════════════════
     ① 分類（讓 UI 動態產生分類，並新增 4 個大類）
     ══════════════════════════════════════════════════════ */
  T.CATS = T.CATS || {
    infra:   { name: '基建', icon: '🧱', order: 1 },
    home:    { name: '居住', icon: '🏠', order: 2 },
    prod:    { name: '生產', icon: '🌾', order: 3 },
    shop:    { name: '商業', icon: '🛒', order: 4 },
    edu:     { name: '教化', icon: '📖', order: 5 },
    special: { name: '特殊', icon: '✨', order: 6 }
  };
  T.CATS.nature   = { name: '山水', icon: '🌿', order: 7 };
  T.CATS.culture  = { name: '文教', icon: '🏮', order: 8 };
  T.CATS.trade    = { name: '商貿', icon: '🧾', order: 9 };
  T.CATS.landmark = { name: '名勝', icon: '🏯', order: 10 };

  /* ══════════════════════════════════════════════════════
     ② 新建築（山水／文教／商貿／名勝）
     land: 地價基數（未填則用 appeal*3 + income）
     ══════════════════════════════════════════════════════ */
  var NEW_TYPES = {
    /* ── 山水（綠化）：本身幾乎不賺錢，但能大幅拉抬周邊土地價值 ── */
    woods:   { name: '樹林',   icon: '🌲', cat: 'nature', cost: 60,   income: 0,  appeal: 6,  land: 26, desc: '林木蓊鬱。周邊建築地價大增，居民愛在此散步。' },
    pond:    { name: '池塘',   icon: '💧', cat: 'nature', cost: 70,   income: 1,  appeal: 6,  land: 28, desc: '一池碧水映著天光，洗去鎮民一身風塵。' },
    garden:  { name: '花園',   icon: '🌷', cat: 'nature', cost: 180,  income: 3,  appeal: 9,  land: 48, desc: '四時花卉不絕，是鎮上最受歡迎的去處。' },
    bamboo:  { name: '竹林',   icon: '🎋', cat: 'nature', cost: 90,   income: 0,  appeal: 6,  land: 30, desc: '風過竹林，聲如細雨，最宜靜心。' },
    maple:   { name: '楓林',   icon: '🍁', cat: 'nature', cost: 110,  income: 0,  appeal: 7,  land: 34, desc: '秋來滿山紅遍，遊人如織。' },
    rockery: { name: '假山',   icon: '🪨', cat: 'nature', cost: 200,  income: 2,  appeal: 8,  land: 52, desc: '疊石成峰，咫尺山林。' },
    lake:    { name: '湖泊',   icon: '🏞️', cat: 'nature', cost: 260,  income: 5,  appeal: 12, land: 88, research: 'landscape', desc: '煙波浩渺，舟楫往來，小鎮的門面。' },
    hill:    { name: '山丘',   icon: '⛰️', cat: 'nature', cost: 300,  income: 6,  appeal: 13, land: 96, research: 'landscape', desc: '登高望遠，可覽全鎮風光。' },

    /* ── 文教 ── */
    theatre:  { name: '戲台',   icon: '🎭', cat: 'culture', cost: 700,  income: 30, appeal: 11, land: 62, produceSp: 2, desc: '鑼鼓一響，万人空巷。戲班子在此演盡悲歡。' },
    bookshop: { name: '書肆',   icon: '📚', cat: 'culture', cost: 520,  income: 26, appeal: 7,  land: 54, desc: '琳瑯滿目的武學秘笈與奇聞軼事。' },
    music:    { name: '琴館',   icon: '🎻', cat: 'culture', cost: 620,  income: 24, appeal: 9,  land: 58, desc: '高山流水，知音難尋。琴聲能平心靜氣。' },
    chess:    { name: '棋院',   icon: '♟️', cat: 'culture', cost: 580,  income: 20, appeal: 8,  land: 56, desc: '黑白之間較量天下大勢。' },
    lantern:  { name: '燈樓',   icon: '🏮', cat: 'culture', cost: 440,  income: 18, appeal: 10, land: 50, desc: '夜夜燈火通明，為夜歸人指路。' },
    school:   { name: '學堂',   icon: '🏫', cat: 'culture', cost: 900,  income: 22, appeal: 12, land: 70, produceSp: 5, research: 'education', desc: '蒙童朗朗讀書聲，是小鎮最動聽的聲音。' },

    /* ── 商貿 ── */
    warehouse: { name: '貨棧',    icon: '📦', cat: 'trade', cost: 800,  income: 44,  appeal: 6,  land: 60, desc: '堆滿南來北往的貨物，進出如流水。' },
    salt:      { name: '鹽行',    icon: '🧂', cat: 'trade', cost: 950,  income: 55,  appeal: 5,  land: 66, research: 'tradeRoute', desc: '鹽鐵之利，自古便是巨富之源。' },
    silk:      { name: '絲行',    icon: '🧵', cat: 'trade', cost: 1100, income: 62,  appeal: 6,  land: 72, research: 'tradeRoute', desc: '湖絲蜀錦，一匹千金。' },
    teaTrade:  { name: '茶行',    icon: '🍃', cat: 'trade', cost: 1000, income: 58,  appeal: 7,  land: 70, research: 'tradeRoute', desc: '茶馬古道上的樞紐，香氣遠播。' },
    post:      { name: '驛站',    icon: '🐎', cat: 'trade', cost: 1300, income: 48,  appeal: 9,  land: 78, research: 'postRoad', desc: '八百里加急由此換馬，消息靈通。' },
    maritime:  { name: '市舶司',  icon: '⚓', cat: 'trade', cost: 3500, income: 150, appeal: 16, land: 160, research: 'seaborne', desc: '海舶雲集，異域珍寶盡入小鎮。' },

    /* ── 名勝 ── */
    stele:       { name: '石碑',    icon: '🪧', cat: 'landmark', cost: 900,  income: 10,  appeal: 12, land: 74, desc: '刻著開鎮先賢之名，後人憑弔。' },
    stonebridge: { name: '石橋',    icon: '🌉', cat: 'landmark', cost: 1200, income: 30,  appeal: 14, land: 92, research: 'engineering', desc: '一橋飛架，兩岸從此相通。' },
    gate:        { name: '城樓',    icon: '🏯', cat: 'landmark', cost: 2800, income: 70,  appeal: 18, land: 150, research: 'cityGreat', desc: '巍峨城門，凡入此門者皆為小鎮之客。' },
    martialTemple:{ name: '武廟',   icon: '⛩️', cat: 'landmark', cost: 3000, income: 60,  appeal: 18, land: 145, produceSp: 8, research: 'wushu', desc: '供奉武聖，習武之人必來上香。' },
    observatory: { name: '觀星台',  icon: '🔭', cat: 'landmark', cost: 4200, income: 90,  appeal: 20, land: 190, produceSp: 12, research: 'astronomy', desc: '夜觀天象，推演時運，鎮上高人雲集。' },
    kairoMonument:{ name: '開羅碑', icon: '🗿', cat: 'landmark', cost: 8000, income: 200, appeal: 30, land: 320, research: 'kairoLegend', desc: '傳說中來自異界的方碑，凡立此碑者，小鎮終將名動天下。' }
  };
  Object.keys(NEW_TYPES).forEach(function (k) {
    if (!T.TYPES[k]) T.TYPES[k] = NEW_TYPES[k];
  });

  /* ══════════════════════════════════════════════════════
     ③ 新研究（解鎖新建築＋新的全域加成鍵）
     新增 bonus 鍵：landMul / prosperityMul / cultivateMul / festivalCostMul
     getResearchBonus(key) 是通用函式，這些鍵會被覆寫層讀取。
     ══════════════════════════════════════════════════════ */
  T.RESEARCH = T.RESEARCH.concat([
    { id: 'landscape',    name: '園林造景', icon: '🌿', cost: 1800,  desc: '解鎖【湖泊】【山丘】，全鎮魅力 +8%。', unlock: ['lake', 'hill'], bonus: { appealMul: 0.08 } },
    { id: 'festivalTech', name: '祭典籌辦', icon: '🎊', cost: 2600,  desc: '節慶開催費用 -25%，繁榮成長 +10%。', bonus: { festivalCostMul: -0.25, prosperityMul: 0.10 } },
    { id: 'education',    name: '庠序之教', icon: '🏫', cost: 3200,  desc: '解鎖【學堂】，武學點數 +25%，修行速度 +15%。', unlock: ['school'], bonus: { spMul: 0.25, cultivateMul: 0.15 } },
    { id: 'tradeRoute',   name: '商路開拓', icon: '🧾', cost: 4500,  desc: '解鎖【鹽行】【絲行】【茶行】，全鎮收入 +10%，地價 +10%。', unlock: ['salt', 'silk', 'teaTrade'], bonus: { incomeMul: 0.10, landMul: 0.10 } },
    { id: 'postRoad',     name: '驛傳制度', icon: '🐎', cost: 5500,  desc: '解鎖【驛站】，繁榮成長 +15%，地價 +10%。', unlock: ['post'], bonus: { prosperityMul: 0.15, landMul: 0.10 } },
    { id: 'engineering',  name: '匠作營造', icon: '🌉', cost: 6000,  desc: '解鎖【石橋】，可用土地 +12 格，地價 +10%。', unlock: ['stonebridge'], bonus: { cellBonus: 12, landMul: 0.10 } },
    { id: 'astronomy',    name: '觀星測候', icon: '🔭', cost: 7000,  desc: '解鎖【觀星台】，武學點數 +35%，修行速度 +20%。', unlock: ['observatory'], bonus: { spMul: 0.35, cultivateMul: 0.20 } },
    { id: 'seaborne',     name: '海舶通商', icon: '⚓', cost: 9000,  desc: '解鎖【市舶司】，全鎮收入 +15%，地價 +15%。', unlock: ['maritime'], bonus: { incomeMul: 0.15, landMul: 0.15 } },
    { id: 'cityGreat',    name: '城郭大興', icon: '🏯', cost: 10000, desc: '解鎖【城樓】，可用土地 +16 格，全鎮魅力 +10%。', unlock: ['gate'], bonus: { cellBonus: 16, appealMul: 0.10 } },
    { id: 'kairoLegend',  name: '開羅傳說', icon: '🗿', cost: 15000, desc: '解鎖【開羅碑】，全鎮收入 +25%，繁榮成長 +25%。', unlock: ['kairoMonument'], bonus: { incomeMul: 0.25, prosperityMul: 0.25 } }
  ]);

  /* ══════════════════════════════════════════════════════
     ④ 新隨機事件
     ══════════════════════════════════════════════════════ */
  T.EVENTS = T.EVENTS.concat([
    { name: '廟會遊行',   icon: '🎏', text: '鑼鼓喧天，神轎繞境，全鎮老少夾道爭睹。',           gain: { prosperity: 110 } },
    { name: '武館收徒',   icon: '🥋', text: '武館開門收徒，少年們踴躍報名，武風大盛。',         gain: { prosperity: 95 } },
    { name: '商幫聚會',   icon: '🧾', text: '各地商幫齊聚議事，一擲千金。',                     gain: { goldMul: 1.6, prosperity: 60 } },
    { name: '書院放榜',   icon: '📜', text: '學堂放榜，中第者披紅遊街，小鎮與有榮焉。',         gain: { prosperity: 140 } },
    { name: '花燈夜遊',   icon: '🏮', text: '滿城花燈，遊人提燈夜行，笑語不絕。',               gain: { prosperity: 130 } },
    { name: '江上競渡',   icon: '🚣', text: '龍舟競渡，兩岸吶喊震天。',                         gain: { goldMul: 1.3, prosperity: 150 } },
    { name: '客商雲集',   icon: '🐫', text: '異域商隊絡繹於途，貨棧為之塞滿。',                 gain: { goldMul: 1.8 } },
    { name: '名醫過境',   icon: '🏥', text: '神醫路過小鎮，順手義診三日，鎮民趨之若鶩。',       gain: { prosperity: 120 } },
    { name: '鏢隊歸來',   icon: '🛡️', text: '走鏢的漢子們平安歸來，酒樓通宵達旦。',             gain: { goldMul: 1.4, prosperity: 70 } },
    { name: '隱士來訪',   icon: '🧘', text: '一位隱士泛舟而至，與鎮上高手論道三日。',           gain: { prosperity: 180 } },
    { name: '旱魃為虐',   icon: '🌵', text: '連月無雨，井水漸枯，鎮民愁眉不展。',               gain: { prosperity: -60 } },
    { name: '疫病流行',   icon: '🤒', text: '時疫橫行，醫館裡擠滿了人。',                       gain: { prosperity: -80 } }
  ]);

  /* ══════════════════════════════════════════════════════
     ⑤ 主組合（兩棟相鄰）—— 延續武俠主題
     ══════════════════════════════════════════════════════ */
  var MAIN_COMBOS = [
    { a: 'theatre',   b: 'tavern',      name: '好戲配好酒', icon: '🎭', mul: 1.25 },
    { a: 'theatre',   b: 'lantern',     name: '燈火映戲台', icon: '🏮', mul: 1.20 },
    { a: 'bookshop',  b: 'academy',     name: '翰墨書香',   icon: '📚', mul: 1.25 },
    { a: 'bookshop',  b: 'library',     name: '萬卷藏珍',   icon: '📜', mul: 1.30 },
    { a: 'music',     b: 'teahouse',    name: '琴韻茶香',   icon: '🎻', mul: 1.22 },
    { a: 'music',     b: 'lantern',     name: '燈下鳴琴',   icon: '🏮', mul: 1.18 },
    { a: 'chess',     b: 'dojo',        name: '以棋會武',   icon: '♟️', mul: 1.22 },
    { a: 'chess',     b: 'academy',     name: '弈理通玄',   icon: '📖', mul: 1.20 },
    { a: 'school',    b: 'academy',     name: '庠序連璧',   icon: '🏫', mul: 1.30 },
    { a: 'school',    b: 'house',       name: '耕讀傳家',   icon: '🏠', mul: 1.12 },
    { a: 'lantern',   b: 'inn',         name: '燈火宿客',   icon: '🏨', mul: 1.20 },
    { a: 'warehouse', b: 'escort',      name: '鏢護貨棧',   icon: '🛡️', mul: 1.30 },
    { a: 'warehouse', b: 'stable',      name: '貨通四方',   icon: '🐎', mul: 1.25 },
    { a: 'warehouse', b: 'market',      name: '市貨兩旺',   icon: '🏪', mul: 1.32 },
    { a: 'salt',      b: 'pawnshop',    name: '鹽利歸庫',   icon: '💰', mul: 1.28 },
    { a: 'silk',      b: 'cloth',       name: '綾羅滿市',   icon: '🧵', mul: 1.30 },
    { a: 'silk',      b: 'hotspring',   name: '錦衣溫泉',   icon: '♨️', mul: 1.28 },
    { a: 'teaTrade',  b: 'apothecary',  name: '藥茶同源',   icon: '🌿', mul: 1.25 },
    { a: 'teaTrade',  b: 'teahouse',    name: '茶香十里的', icon: '🍵', mul: 1.28 },
    { a: 'post',      b: 'inn',         name: '驛館通衢',   icon: '🏨', mul: 1.30 },
    { a: 'post',      b: 'gate',        name: '關津要道',   icon: '🏯', mul: 1.35 },
    { a: 'maritime',  b: 'market',      name: '市舶通商',   icon: '⚓', mul: 1.45 },
    { a: 'maritime',  b: 'warehouse',   name: '舶來雲集',   icon: '📦', mul: 1.40 },
    { a: 'stonebridge', b: 'market',    name: '橋頭市集',   icon: '🌉', mul: 1.28 },
    { a: 'stonebridge', b: 'lake',      name: '長橋臥波',   icon: '🏞️', mul: 1.30 },
    { a: 'gate',      b: 'yamen',       name: '城防森嚴',   icon: '🏛️', mul: 1.32 },
    { a: 'gate',      b: 'escort',      name: '城門鏢行',   icon: '🛡️', mul: 1.28 },
    { a: 'martialTemple', b: 'dojo',    name: '武廟演武',   icon: '⛩️', mul: 1.40 },
    { a: 'martialTemple', b: 'arena',   name: '武聖擂臺',   icon: '⚔️', mul: 1.40 },
    { a: 'observatory', b: 'library',   name: '觀星證道',   icon: '🔭', mul: 1.45 },
    { a: 'observatory', b: 'academy',   name: '天文格物',   icon: '📖', mul: 1.35 },
    { a: 'stele',     b: 'gate',        name: '碑銘城門',   icon: '🪧', mul: 1.25 },
    { a: 'kairoMonument', b: 'gate',    name: '開羅屏障',   icon: '🗿', mul: 1.60 },
    { a: 'kairoMonument', b: 'market',  name: '神碑商都',   icon: '🗿', mul: 1.60 },
    { a: 'lake',      b: 'inn',         name: '湖景客棧',   icon: '🏞️', mul: 1.30 },
    { a: 'hill',      b: 'temple',      name: '山寺鐘鳴',   icon: '⛰️', mul: 1.32 },
    { a: 'maple',     b: 'theatre',     name: '楓紅戲臺',   icon: '🍁', mul: 1.20 },
    { a: 'bamboo',    b: 'music',       name: '竹風琴聲',   icon: '🎋', mul: 1.22 },
    { a: 'rockery',   b: 'garden',      name: '園中疊翠',   icon: '🪨', mul: 1.25 },
    { a: 'pond',      b: 'garden',      name: '水映花影',   icon: '💧', mul: 1.20 }
  ];
  T.COMBOS = T.COMBOS.concat(MAIN_COMBOS);

  /* ══════════════════════════════════════════════════════
     ⑥ 環境加成（mini combo）：綠化／道路相鄰即生效
        以程式生成，避免手寫上百條。
        mini: true → UI 會歸類到「🌿 環境加成」而不用佔滿組合圖鑑。
     ══════════════════════════════════════════════════════ */
  var GREENERY = ['woods', 'pond', 'garden', 'bamboo', 'maple', 'lake', 'hill'];
  var GREENERY_TARGETS = ['house', 'farm', 'inn', 'teahouse', 'tavern', 'apothecary', 'clinic',
    'academy', 'dojo', 'hotspring', 'arena', 'market', 'school', 'bookshop', 'library'];
  var ROAD_TARGETS = ['teahouse', 'inn', 'cloth', 'smithy', 'apothecary', 'tavern', 'pawnshop',
    'bank', 'escort', 'market', 'warehouse', 'salt', 'silk', 'teaTrade', 'theatre', 'bookshop',
    'music', 'chess', 'lantern', 'school', 'post', 'maritime'];

  var MINI_COMBOS = [];
  GREENERY.forEach(function (plant) {
    GREENERY_TARGETS.forEach(function (target) {
      MINI_COMBOS.push({
        a: target, b: plant, name: '綠意盎然', icon: '🌿',
        mul: CONFIG.GREENERY_MUL, mini: true
      });
    });
  });
  ROAD_TARGETS.forEach(function (target) {
    MINI_COMBOS.push({
      a: target, b: 'road', name: '街道連通', icon: '⬜',
      mul: CONFIG.ROAD_MUL, mini: true
    });
  });
  T.COMBOS = T.COMBOS.concat(MINI_COMBOS);

  /* ══════════════════════════════════════════════════════
     ⑦ 三件套組合（原作 Combo 核心）：3 棟彼此距離 range 格內
        - 效果比兩棟組合更強（1.50 ~ 2.20）
        - 可與兩棟組合／環境加成疊乘
     ══════════════════════════════════════════════════════ */
  T.TRIPLES = [
    { a: 'teahouse', b: 'academy', c: 'library',   name: '文風鼎盛', icon: '📖', mul: 1.60 },
    { a: 'inn', b: 'tavern', c: 'hotspring',        name: '溫泉名宿', icon: '♨️', mul: 1.55 },
    { a: 'smithy', b: 'dojo', c: 'arena',           name: '兵甲爭鋒', icon: '⚔️', mul: 1.58 },
    { a: 'apothecary', b: 'clinic', c: 'temple',    name: '杏林香火', icon: '🏥', mul: 1.50 },
    { a: 'bank', b: 'pawnshop', c: 'market',        name: '財通三市', icon: '🏦', mul: 1.65 },
    { a: 'garden', b: 'pond', c: 'rockery',         name: '園林三絕', icon: '🌷', mul: 1.55 },
    { a: 'woods', b: 'bamboo', c: 'maple',          name: '三重林蔭', icon: '🌲', mul: 1.50 },
    { a: 'lake', b: 'stonebridge', c: 'hill',       name: '江山如畫', icon: '🏞️', mul: 1.75 },
    { a: 'theatre', b: 'music', c: 'chess',         name: '琴棋書畫', icon: '🎭', mul: 1.60 },
    { a: 'school', b: 'bookshop', c: 'library',     name: '書香門第', icon: '🏫', mul: 1.65 },
    { a: 'warehouse', b: 'escort', c: 'stable',     name: '貨通四海', icon: '📦', mul: 1.70 },
    { a: 'salt', b: 'silk', c: 'teaTrade',          name: '三大商行', icon: '🧾', mul: 1.80 },
    { a: 'maritime', b: 'warehouse', c: 'market',   name: '海市雲集', icon: '⚓', mul: 1.90 },
    { a: 'gate', b: 'yamen', c: 'escort',           name: '金城湯池', icon: '🏯', mul: 1.70 },
    { a: 'martialTemple', b: 'dojo', c: 'arena',    name: '止戈為武', icon: '⛩️', mul: 1.85 },
    { a: 'observatory', b: 'library', c: 'academy', name: '天人合一', icon: '🔭', mul: 1.90 },
    { a: 'kairoMonument', b: 'gate', c: 'market',   name: '開羅之城', icon: '🗿', mul: 2.20 }
  ];

  /* ══════════════════════════════════════════════════════
     ⑧ 節慶（花銀兩 → 繁榮＋期間加成）
        duration 單位＝營運期（每期 TICK_MS）
     ══════════════════════════════════════════════════════ */
  T.FESTIVALS = [
    { id: 'lanternFest', name: '元宵燈會', icon: '🏮', cost: 500,  prosperity: 300,  duration: 15, appeal: 10, landMul: 0.10, desc: '滿城花燈，遊人如織。期間地價 +10%。' },
    { id: 'dragonBoat',  name: '端午競渡', icon: '🚣', cost: 800,  prosperity: 450,  duration: 15, appeal: 8,  incomeMul: 0.10, desc: '龍舟競渡，兩岸歡騰。期間收入 +10%。' },
    { id: 'midAutumn',   name: '中秋賞月', icon: '🌕', cost: 600,  prosperity: 380,  duration: 20, appeal: 12, landMul: 0.12, desc: '月滿西樓，闔鎮同歡。期間地價 +12%。' },
    { id: 'doubleNinth', name: '重陽登高', icon: '🍂', cost: 700,  prosperity: 400,  duration: 20, appeal: 10, landMul: 0.10, prosperityMul: 0.15, desc: '登高望遠，寓意長久。期間繁榮成長 +15%。' },
    { id: 'templeFair',  name: '廟會大典', icon: '🎏', cost: 1200, prosperity: 700,  duration: 25, appeal: 16, landMul: 0.15, incomeMul: 0.12, desc: '神轎繞境，萬人空巷。期間地價 +15%、收入 +12%。' },
    { id: 'wulinMeet',   name: '武林大會', icon: '⚔️', cost: 2000, prosperity: 1200, duration: 25, appeal: 18, incomeMul: 0.20, spMul: 0.30, desc: '天下英雄齊聚。期間收入 +20%（武點另計）。' },
    { id: 'merchantsMeet', name: '萬商雲集', icon: '🧾', cost: 2500, prosperity: 1500, duration: 30, appeal: 20, incomeMul: 0.25, landMul: 0.20, desc: '海內商幫齊至。期間收入 +25%、地價 +20%。' },
    { id: 'kairoFest',   name: '開羅祭典', icon: '🗿', cost: 5000, prosperity: 3000, duration: 40, appeal: 30, incomeMul: 0.30, landMul: 0.30, prosperityMul: 0.30, desc: '傳說中的異界祭典。期間全項加成，繁榮成長 +30%。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑨ 四季加成（依真實月分）
     ══════════════════════════════════════════════════════ */
  T.SEASONS = [
    { id: 'spring', name: '春', icon: '🌸', months: [3, 4, 5],  desc: '萬物萌發', prosperityMul: 0.15, appeal: 10, cultivateMul: 0.10,   incomeMul: 0 },
    { id: 'summer', name: '夏', icon: '☀️', months: [6, 7, 8],  desc: '商旅正盛', incomeMul: 0.10,     appeal: 0,  cultivateMul: 0,      prosperityMul: 0 },
    { id: 'autumn', name: '秋', icon: '🍁', months: [9, 10, 11], desc: '五穀豐登', incomeMul: 0.15,     appeal: 5,  cultivateMul: 0,      prosperityMul: 0.10, spMul: 0 },
    { id: 'winter', name: '冬', icon: '❄️', months: [12, 1, 2], desc: '閉門潛修', cultivateMul: 0.20,  appeal: 0,  incomeMul: 0,         prosperityMul: 0 }
  ];

  /* ══════════════════════════════════════════════════════
     ⑩ 年度評鑑稱號（依「地價 + 繁榮度」評分）
     ══════════════════════════════════════════════════════ */
  T.RANKS = [
    { score: 0,     name: '無名之地', icon: '🪹', desc: '地圖上找不到的名字。' },
    { score: 600,   name: '邊陲小邑', icon: '🛖', desc: '總算有了人煙。' },
    { score: 2500,  name: '商賈雲集', icon: '🏘️', desc: '南來北往者漸多。' },
    { score: 8000,  name: '一方勝地', icon: '🏙️', desc: '鄰縣之人皆聞其名。' },
    { score: 22000, name: '名揚四海', icon: '🌆', desc: '江湖上無人不知。' },
    { score: 55000, name: '天下名城', icon: '🌃', desc: '與京城齊名的存在。' },
    { score: 120000, name: '傳說之城', icon: '🏯', desc: '後世將為此城立傳。' },
    { score: 260000, name: '開羅之城', icon: '🗿', desc: '傳說中來自異界的小鎮，永恆不滅。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑪ 追加鎮民姓名池
     ══════════════════════════════════════════════════════ */
  T.NPC_NAMES = T.NPC_NAMES.concat([
    '馬千里', '白雲飛', '紀嫣然', '獨孤鳴', '歐陽烈', '殷素素', '公孫玉', '上官虹',
    '尉遲豹', '東方朔', '慕容雪', '司徒空', '夏侯瑾', '皇甫端', '令狐沖', '任我行',
    '岳靈珊', '曲非煙', '平一指', '藍鳳凰', '祖千秋', '向問天', '風清揚', '江南七',
    '柯鎮惡', '朱聰兒', '韓小瑩', '張阿生', '全金發', '南希仁', '焦木大', '枯榮僧',
    '段延慶', '葉二娘', '岳老三', '雲中鶴', '鐘萬仇', '秦紅棉', '阮星竹', '王語嫣'
  ]);

  /* ══════════════════════════════════════════════════════
     ⑫ 造價倍率（COST_SCALE）—— 直接改資料，零邏輯負擔
     ══════════════════════════════════════════════════════ */
  if (CONFIG.COST_SCALE !== 1) {
    Object.keys(T.TYPES).forEach(function (k) {
      var d = T.TYPES[k];
      if (typeof d.cost === 'number') d.cost = Math.max(1, Math.round(d.cost * CONFIG.COST_SCALE));
    });
    T.RESEARCH.forEach(function (r) {
      if (typeof r.cost === 'number') r.cost = Math.max(1, Math.round(r.cost * CONFIG.COST_SCALE));
    });
  }

  /* ══════════════════════════════════════════════════════════
     ▼▼▼ 以下為覆寫層：在 HY.TownSystem.prototype 上疊加功能 ▼▼▼
     原則：只「新增方法」或「包裝既有方法」，不破壞原本行為。
     ══════════════════════════════════════════════════════════ */
  var now = function () { return Date.now(); };

  /* ── A. 狀態補齊（buffs / 統計） ── */
  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    if (!Array.isArray(t.buffs)) t.buffs = [];
    if (t.stats) {
      if (t.stats.festivals === undefined) t.stats.festivals = 0;
      if (t.stats.triples === undefined) t.stats.triples = 0;
    }
    return t;
  };

  /* ── B. 銀兩收入倍率 ── */
  proto.getIncomeScale = function () {
    var s = this.def && this.def.INCOME_SCALE;
    return (typeof s === 'number' && s > 0) ? s : 1;
  };

  /* ── C. 四季 ── */
  proto.getActiveSeason = function () {
    var S = (this.def && this.def.SEASONS) || [];
    var m = new Date().getMonth() + 1;
    for (var i = 0; i < S.length; i++) {
      if ((S[i].months || []).indexOf(m) !== -1) return S[i];
    }
    return null;
  };

  /* ── D. 節慶期間加成（buffs） ── */
  proto.getBuffBonus = function () {
    var t = this.ensureState();
    var out = { incomeMul: 0, landMul: 0, appeal: 0, prosperityMul: 0, spMul: 0, list: [] };
    (t.buffs || []).forEach(function (b) {
      if ((b.remain || 0) <= 0) return;
      out.incomeMul += b.incomeMul || 0;
      out.landMul += b.landMul || 0;
      out.appeal += b.appeal || 0;
      out.prosperityMul += b.prosperityMul || 0;
      out.spMul += b.spMul || 0;
      out.list.push(b);
    });
    return out;
  };

  /* ── E. 全鎮收入倍率：併入節慶與四季（compute 與 UI 預估共用，保持同步） ── */
  var _getGlobalMul = proto.getGlobalMul;
  proto.getGlobalMul = function () {
    var m = _getGlobalMul.call(this);
    var buff = this.getBuffBonus();
    var season = this.getActiveSeason();
    var extra = buff.incomeMul + ((season && season.incomeMul) || 0);
    return m * (1 + extra);
  };

  /* ── F. 武點：併入節慶 spMul ── */
  var _getSpPerTick = proto.getSpPerTick;
  proto.getSpPerTick = function () {
    var sp = _getSpPerTick.call(this);
    var buff = this.getBuffBonus();
    var season = this.getActiveSeason();
    var extra = buff.spMul + ((season && season.spMul) || 0);
    return sp * (1 + extra);
  };

  /* ── G. 修行速度：併入四季與研究 cultivateMul ── */
  var _getCultivateRate = proto.getCultivateRate;
  proto.getCultivateRate = function () {
    var r = _getCultivateRate.call(this);
    var season = this.getActiveSeason();
    return r
      * (1 + this.getResearchBonus('cultivateMul', 0))
      * (1 + ((season && season.cultivateMul) || 0));
  };

  /* ── H. 組合掃描：加入三件套 + 快取 ── */
  proto._scanTriples = function () {
    var D = this.def, t = this.ensureState();
    var defs = (D.TRIPLES || []);
    if (!defs.length) return [];
    var W = D.GRID_W;
    var byType = {};
    t.buildings.forEach(function (b) {
      if (!byType[b.type]) byType[b.type] = [];
      byType[b.type].push(b);
    });
    var lim = CONFIG.TRIPLE_RANGE;
    function dist(x, y) {
      return Math.abs((x % W) - (y % W)) + Math.abs(Math.floor(x / W) - Math.floor(y / W));
    }
    var out = [], seen = {};
    defs.forEach(function (d) {
      var L1 = byType[d.a], L2 = byType[d.b], L3 = byType[d.c];
      if (!L1 || !L2 || !L3) return;
      for (var i = 0; i < L1.length; i++) {
        for (var j = 0; j < L2.length; j++) {
          if (L1[i].idx === L2[j].idx) continue;
          if (dist(L1[i].idx, L2[j].idx) > lim) continue;
          for (var k = 0; k < L3.length; k++) {
            if (L3[k].idx === L1[i].idx || L3[k].idx === L2[j].idx) continue;
            if (dist(L1[i].idx, L3[k].idx) > lim) continue;
            if (dist(L2[j].idx, L3[k].idx) > lim) continue;
            var key = d.name + '|' + [L1[i].idx, L2[j].idx, L3[k].idx].sort(function (p, q) { return p - q; }).join('>');
            if (seen[key]) continue;
            seen[key] = 1;
            out.push({ name: d.name, icon: d.icon, mul: d.mul, cells: [L1[i].idx, L2[j].idx, L3[k].idx], triple: true });
          }
        }
      }
    });
    return out;
  };

  var _getActiveCombos = proto.getActiveCombos;
  proto.getActiveCombos = function () {
    var t = this.ensureState();
    var sig = '';
    if (CONFIG.COMBO_CACHE) {
      sig = t.buildings.map(function (b) { return b.idx + ':' + b.type + ':' + b.lv; }).join(',');
      if (this._comboSig === sig && this._comboMemo) return this._comboMemo;
    }
    var all = _getActiveCombos.call(this).concat(this._scanTriples());
    if (CONFIG.COMBO_CACHE) { this._comboSig = sig; this._comboMemo = all; }
    return all;
  };

  proto.getActiveMain    = function () { return this.getActiveCombos().filter(function (c) { return !c.mini && !c.triple; }); };
  proto.getActiveMini    = function () { return this.getActiveCombos().filter(function (c) { return !!c.mini; }); };
  proto.getActiveTriples = function () { return this.getActiveCombos().filter(function (c) { return !!c.triple; }); };

  /* ── I. 地價（Land Price）── */
  proto.getLandPrice = function () {
    var D = this.def, t = this.ensureState();
    var combos = this.getActiveCombos();
    var base = 0;
    t.buildings.forEach(function (b) {
      var def = D.TYPES[b.type];
      if (!def) return;
      var unit = (typeof def.land === 'number') ? def.land : ((def.appeal || 0) * 3 + (def.income || 0));
      base += unit * b.lv;
    });
    var comboBonus = 0;
    combos.forEach(function (c) { comboBonus += (c.mul - 1); });
    var buff = this.getBuffBonus();
    var land = base * (1 + comboBonus);
    land *= (1 + this.getResearchBonus('landMul', 0));
    land *= (1 + buff.landMul);
    return Math.floor(land);
  };

  /* ── J. 年度評鑑稱號 ── */
  proto.getTownRank = function () {
    var t = this.ensureState();
    var D = this.def;
    var score = this.getLandPrice() + t.prosperity;
    var list = D.RANKS || [];
    var r = list[0] || { score: 0, name: '—', icon: '❔', desc: '' };
    for (var i = 0; i < list.length; i++) if (score >= list[i].score) r = list[i];
    var next = null;
    for (var j = 0; j < list.length; j++) { if (list[j].score > score) { next = list[j]; break; } }
    return { rank: r, next: next, score: score };
  };

  /* ── K. 節慶開催 ── */
  proto.festivalCost = function (f) {
    var m = 1 - this.getResearchBonus('festivalCostMul', 0);
    return Math.max(1, Math.floor((f.cost || 0) * m));
  };

  proto.canHoldFestival = function (id) {
    var D = this.def, t = this.ensureState();
    var f = null;
    (D.FESTIVALS || []).forEach(function (x) { if (x.id === id) f = x; });
    if (!f) return { ok: false, msg: '無此節慶' };
    if (!t.founded) return { ok: false, msg: '尚未開鎮' };
    var cost = this.festivalCost(f);
    if (this.charSys.rootState.gold < cost) return { ok: false, msg: '銀兩不足（需 ' + cost + ' 兩）' };
    var running = (t.buffs || []).filter(function (b) { return b.id === id && (b.remain || 0) > 0; });
    if (running.length) return { ok: false, msg: '同一節慶正在舉辦中' };
    return { ok: true, f: f, cost: cost };
  };

  proto.holdFestival = function (id) {
    var chk = this.canHoldFestival(id);
    if (!chk.ok) { this.log('⚠️ 無法舉辦節慶：' + chk.msg, 'system'); return false; }
    var t = this.ensureState();
    var f = chk.f;
    this.charSys.rootState.gold -= chk.cost;
    t.prosperity += (f.prosperity || 0);
    if (t.stats) t.stats.festivals += 1;
    if ((f.duration || 0) > 0) {
      t.buffs.push({
        id: f.id, name: f.name, icon: f.icon, remain: f.duration,
        incomeMul: f.incomeMul || 0, landMul: f.landMul || 0,
        appeal: f.appeal || 0, prosperityMul: f.prosperityMul || 0, spMul: f.spMul || 0
      });
    }
    this.log('🎊 小鎮舉辦【' + f.icon + ' ' + f.name + '】！花費 ' + chk.cost + ' 兩，繁榮 +' + (f.prosperity || 0) +
      ((f.duration || 0) > 0 ? '，期間加成 ' + f.duration + ' 期。' : '。'), 'time');
    this.requestRender();
    return true;
  };

  /* ── L. compute：拆分「平衡基準收入」與「實際入帳收入」 ── */
  var _compute = proto.compute;
  proto.compute = function () {
    var r = _compute.call(this);
    var buff = this.getBuffBonus();
    var season = this.getActiveSeason();
    var appAdd = buff.appeal + ((season && season.appeal) || 0);
    if (appAdd) r.appeal = Math.floor(r.appeal + appAdd);
    r.incomeRaw = r.income;                          // 未縮放：繁榮成長／事件用
    r.income = r.incomeRaw * this.getIncomeScale();  // 實際入帳：可為小數，由 tick 累加取整
    r.buff = buff;
    r.season = season;
    return r;
  };

  /* ── M. tick：銀兩小數累加；繁榮用未縮放基準；節慶倒數 ── */
  proto.tick = function () {
    var t = this.ensureState();
    if (!t.founded) return null;

    var snap = this.compute();
    var raw = snap.incomeRaw;

    // 銀兩：小數累加器（避免 INCOME_SCALE 讓早期收入永遠為 0）
    this._goldAcc = (this._goldAcc || 0) + snap.income;
    var gold = Math.floor(this._goldAcc);
    this._goldAcc -= gold;
    if (gold > 0) this.charSys.rootState.gold += gold;

    // 武點：同樣用累加器
    this._spAcc = (this._spAcc || 0) + snap.sp;
    var spGain = Math.floor(this._spAcc);
    this._spAcc -= spGain;
    if (spGain > 0) this.charSys.rootState.sp += spGain;

    t.totalIncome += gold;

    // 繁榮度：以「未縮放的平衡基準 + 地價」計算，確保成長節奏不受 INCOME_SCALE 影響
    var buff = this.getBuffBonus();
    var season = this.getActiveSeason();
    var landProsper = Math.floor(this.getLandPrice() / CONFIG.LAND_DIV);
    var baseProsper = Math.floor(raw / 10) + Math.floor(snap.appeal / 12) + landProsper;
    var prosperMul = 1
      + this.getPostBonus().prosperityMul
      + this.getResearchBonus('prosperityMul', 0)
      + buff.prosperityMul
      + ((season && season.prosperityMul) || 0);
    t.prosperity += Math.floor(baseProsper * prosperMul);

    t.stats.ticks += 1;
    t.lastTick = now();

    // 節慶倒數
    if (t.buffs.length) {
      t.buffs.forEach(function (b) { b.remain = (b.remain || 0) - 1; });
      var before = t.buffs.length;
      t.buffs = t.buffs.filter(function (b) { return (b.remain || 0) > 0; });
      if (t.buffs.length < before) this.log('🎐 節慶落幕，小鎮恢復日常。', 'time');
    }

    this._produceItems(t);
    this._trySpawnResident(t, snap);
    this._cultivate(t);
    this._checkLevelUp(t);
    if (Math.random() < 0.04) this._randomEvent(t, snap);

    return { gold: gold, sp: spGain, snap: snap, raw: raw };
  };

  /* ── N. getStats：補上新欄位 ── */
  var _getStats = proto.getStats;
  proto.getStats = function () {
    var s = _getStats.call(this);
    var snap = this.compute();
    s.income = snap.income;
    s.incomeRaw = snap.incomeRaw;
    s.landPrice = this.getLandPrice();
    s.rankInfo = this.getTownRank();
    s.buff = this.getBuffBonus();
    s.season = this.getActiveSeason();
    s.triples = this.getActiveTriples();
    s.miniCount = this.getActiveMini().length;
    s.mainCount = this.getActiveMain().length;
    s.incomeScale = this.getIncomeScale();
    return s;
  };

  window.HY.TownExtra = {
    version: '1.0',
    config: CONFIG,
    types: Object.keys(NEW_TYPES).length,
    combos: MAIN_COMBOS.length + MINI_COMBOS.length,
    triples: T.TRIPLES.length,
    research: 10,
    events: 12,
    festivals: T.FESTIVALS.length
  };
})();