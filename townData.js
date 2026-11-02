// js/townData.js (v2)
// ⭐ 我的小鎮：開羅風格城鎮經營 —— 建築／組合／研究／事件／居民／職務資料
// v2 新增：【虛擬人物定居】職務表 POSTS、修行速率、群俠客居、靈獸鎮守
// 全部設定集中在本檔，調整數值不必動邏輯。
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
  var TOWN = {
    version: '2.0',
    TICK_MS: 4000,           // 每個營運週期（毫秒）
    GRID_W: 12,              // 小鎮地圖寬（格）
    GRID_H: 9,               // 小鎮地圖高（格）
    MAX_LV: 5,               // 單一建築最高等級
    OFFLINE_CAP_TICKS: 40,   // 離開小鎮後最多補算幾個週期
    SP_ACCRUAL: 0.05,        // 武點產出速率（1 = 全額）
    FOUND_COST: 500,         // 開鎮費用（兩）
    DEMOLISH_REFUND: 0.4,    // 拆除退還比例
    UPGRADE_MUL: 1.75,       // 升級費用倍率

    // ══════════ ⭐ 虛擬人物定居 ══════════
    BEDS_PER_HOUSE: 3,          // 每棟民宅提供床位（與主遊戲 house.pop 一致）
    CULTIVATE_RATE: 0.003,      // 定居角色每期獲得 maxExp 的比例（0.003 ≈ 330 期升一級）
    CULTIVATE_TOWN_BONUS: 0.12, // 每提升 1 級小鎮，修行速度 +12%
    CULTIVATE_BUILD_BONUS: 0.01,// 每棟建築 +1% 修行速度
    SETTLE_MIN_LV: 1,           // 定居最低等級

    // ── 職務表 ──
    // cap: 0 = 不限數量；order: 治安值（可抵禦盜匪）
    POSTS: {
      idle:       { name: '潛修',     icon: '🧘', cap: 0, order: 0, incomeMul: 0,    spMul: 0,    prosperityMul: 0,    desc: '於小鎮潛心靜修，每期獲得修行經驗，不參與鎮務。' },
      shopkeeper: { name: '掌櫃',     icon: '🏪', cap: 0, order: 0, incomeMul: 0,    spMul: 0,    prosperityMul: 0,    desc: '進駐一棟建築打理生意，該棟收入依角色等級提升（商業建築再 +5%）。' },
      mayor:      { name: '鎮長',     icon: '🏛️', cap: 1, order: 1, incomeMul: 0.06, spMul: 0,    prosperityMul: 0.20, desc: '統領全鎮政務：繁榮度成長 +20%、全鎮收入 +6%、治安 +1。' },
      teacher:    { name: '教習',     icon: '📖', cap: 1, order: 0, incomeMul: 0,    spMul: 0.25, prosperityMul: 0.05, desc: '開壇授武：全鎮武點產出 +25%、繁榮度成長 +5%。' },
      commerce:   { name: '商務總管', icon: '🧭', cap: 1, order: 0, incomeMul: 0.10, spMul: 0,    prosperityMul: 0.05, desc: '掌理商路往來：全鎮收入 +10%、繁榮度成長 +5%。' },
      guard:      { name: '巡守',     icon: '🛡️', cap: 2, order: 1, incomeMul: 0.05, spMul: 0,    prosperityMul: 0,    desc: '巡防緝盜：全鎮收入 +5%、治安 +1（盜匪事件轉為治安事件）。' }
    },

    // ── 群俠客居分級（依該群俠 reqLv 判定）──
    GUEST_TIERS: [
      { min: 0,   name: '尋常俠客', appeal: 6,  incomeMul: 0.01 },
      { min: 30,  name: '一方高手', appeal: 12, incomeMul: 0.02 },
      { min: 120, name: '絕世宗師', appeal: 20, incomeMul: 0.03 },
      { min: 230, name: '神仙中人', appeal: 32, incomeMul: 0.05 }
    ],

    // ── 靈獸鎮守加成（每隻）──
    GUARDIAN: { order: 1, appeal: 10, incomeMul: 0.02 },

    // ── 小鎮等級 ──
    LEVELS: [
      { lv: 1, name: '荒野小村',   icon: '🏕️', needProsperity: 0,     cells: 30,  maxBuildings: 14,  maxResidents: 4,  desc: '幾戶人家依山傍水而居。' },
      { lv: 2, name: '邊陲集鎮',   icon: '🏘️', needProsperity: 600,   cells: 48,  maxBuildings: 24,  maxResidents: 8,  desc: '商旅漸多，已有市集雛形。' },
      { lv: 3, name: '通商大鎮',   icon: '🏙️', needProsperity: 2200,  cells: 66,  maxBuildings: 34,  maxResidents: 14, desc: '南來北往，錢莊鏢局林立。' },
      { lv: 4, name: '一方名城',   icon: '🌆', needProsperity: 6000,  cells: 84,  maxBuildings: 46,  maxResidents: 22, desc: '聲名遠播，名士雲集。' },
      { lv: 5, name: '繁華都會',   icon: '🌃', needProsperity: 15000, cells: 99,  maxBuildings: 60,  maxResidents: 32, desc: '燈火終夜不熄，天下財貨匯聚。' },
      { lv: 6, name: '天下第一城', icon: '🏯', needProsperity: 36000, cells: 120, maxBuildings: 90,  maxResidents: 48, desc: '傳說中的不夜之城。' }
    ],

    // ── 建築種類 ──
    TYPES: {
      road:       { name: '石板路',  icon: '⬜', cat: 'infra',   cost: 20,   income: 0,   appeal: 1,  desc: '鋪設街巷，讓鎮民走得更遠，組合更容易湊成。' },
      farm:       { name: '農田',    icon: '🌾', cat: 'prod',    cost: 100,  income: 5,   appeal: 1,  desc: '生產糧食，穩定民心。' },
      house:      { name: '民宅',    icon: '🏠', cat: 'home',    cost: 140,  income: 6,   appeal: 2,  pop: 3, desc: '供人居住：每棟提供 3 個床位，是角色定居與鎮民遷入的根本。' },
      well:       { name: '水井',    icon: '⛲', cat: 'infra',   cost: 90,   income: 3,   appeal: 5,  desc: '方圓數里的中心，吸引人潮聚集。' },
      teahouse:   { name: '茶館',    icon: '🍵', cat: 'shop',    cost: 240,  income: 16,  appeal: 5,  desc: '說書人講古，茶香四溢。' },
      inn:        { name: '客棧',    icon: '🏨', cat: 'shop',    cost: 320,  income: 22,  appeal: 6,  desc: '江湖人士落腳之處，酒酣耳熱最是熱鬧。' },
      cloth:      { name: '布莊',    icon: '🧵', cat: 'shop',    cost: 280,  income: 18,  appeal: 4,  desc: '絲綢錦緞，姑娘們的最愛。' },
      smithy:     { name: '鐵匠鋪',  icon: '⚒️', cat: 'shop',    cost: 380,  income: 24,  appeal: 4,  desc: '打造神兵利器，火光沖天。' },
      apothecary: { name: '藥鋪',    icon: '🌿', cat: 'shop',    cost: 340,  income: 20,  appeal: 5,  produce: 'pill_hp', desc: '懸壺濟世，會定期產出行軍散送入你的行囊。' },
      tavern:     { name: '酒樓',    icon: '🍶', cat: 'shop',    cost: 440,  income: 30,  appeal: 7,  desc: '美酒佳餚，一擲千金。' },
      clinic:     { name: '醫館',    icon: '🏥', cat: 'infra',   cost: 460,  income: 14,  appeal: 8,  desc: '名醫坐鎮，鎮民安康。' },
      stable:     { name: '馬廄',    icon: '🐎', cat: 'infra',   cost: 520,  income: 22,  appeal: 5,  desc: '良駒如雲，商隊絡繹不絕。' },
      pawnshop:   { name: '當鋪',    icon: '💰', cat: 'shop',    cost: 520,  income: 34,  appeal: 5,  desc: '應急週轉，利潤驚人。' },
      academy:    { name: '書院',    icon: '📖', cat: 'edu',     cost: 600,  income: 14,  appeal: 9,  produceSp: 2, desc: '教化一方，每週期產出武學點數。' },
      escort:     { name: '鏢局',    icon: '🛡️', cat: 'shop',    cost: 700,  income: 40,  appeal: 6,  research: 'commerce', desc: '走鏢護院，武人聚集。' },
      dojo:       { name: '演武場',  icon: '🥋', cat: 'edu',     cost: 800,  income: 20,  appeal: 10, produceSp: 5, research: 'wushu', desc: '比武切磋，武學點數大增。' },
      bank:       { name: '錢莊',    icon: '🏦', cat: 'shop',    cost: 900,  income: 60,  appeal: 8,  research: 'commerce', desc: '匯通天下，日進斗金。' },
      temple:     { name: '寺廟',    icon: '⛩️', cat: 'infra',   cost: 1000, income: 28,  appeal: 12, research: 'faith', desc: '香火鼎盛，四方信徒朝拜。' },
      yamen:      { name: '衙門',    icon: '🏛️', cat: 'infra',   cost: 1200, income: 26,  appeal: 10, research: 'wall', desc: '維持治安，吸引名門望族。' },
      hotspring:  { name: '溫泉',    icon: '♨️', cat: 'special', cost: 1600, income: 70,  appeal: 16, research: 'resort', desc: '仙湯名泉，達官貴人趨之若鶩。' },
      arena:      { name: '擂台',    icon: '⚔️', cat: 'special', cost: 2200, income: 90,  appeal: 15, research: 'wushu', desc: '天下英雄爭鋒之地。' },
      library:    { name: '藏經閣',  icon: '📜', cat: 'special', cost: 2600, income: 80,  appeal: 14, produceSp: 9, research: 'wushu', desc: '萬卷武學秘笈盡藏於此。' },
      market:     { name: '集市',    icon: '🏪', cat: 'special', cost: 3000, income: 120, appeal: 20, research: 'market', desc: '全鎮財貨流通中樞，收入巨增。' }
    },

    // ── 相鄰組合（上下左右相鄰即成立，收入倍率相乘）──
    COMBOS: [
      { a: 'inn',        b: 'tavern',     name: '酒客盈門', icon: '🍶', mul: 1.25 },
      { a: 'inn',        b: 'stable',     name: '車馬喧闐', icon: '🐎', mul: 1.20 },
      { a: 'inn',        b: 'hotspring',  name: '溫泉客棧', icon: '♨️', mul: 1.35 },
      { a: 'teahouse',   b: 'academy',    name: '書聲茶香', icon: '📖', mul: 1.20 },
      { a: 'teahouse',   b: 'cloth',      name: '綾羅茶香', icon: '🧵', mul: 1.15 },
      { a: 'smithy',     b: 'dojo',       name: '兵甲鏗鏘', icon: '⚔️', mul: 1.25 },
      { a: 'apothecary', b: 'clinic',     name: '杏林春滿', icon: '🏥', mul: 1.25 },
      { a: 'bank',       b: 'pawnshop',   name: '財源廣進', icon: '💰', mul: 1.30 },
      { a: 'bank',       b: 'market',     name: '市通四海', icon: '🏪', mul: 1.35 },
      { a: 'temple',     b: 'well',       name: '香火不息', icon: '⛲', mul: 1.20 },
      { a: 'arena',      b: 'dojo',       name: '比武大會', icon: '🥋', mul: 1.30 },
      { a: 'library',    b: 'academy',    name: '文風鼎盛', icon: '📜', mul: 1.30 },
      { a: 'escort',     b: 'stable',     name: '鏢行天下', icon: '🛡️', mul: 1.25 },
      { a: 'escort',     b: 'yamen',      name: '安居樂業', icon: '🏛️', mul: 1.20 },
      { a: 'farm',       b: 'well',       name: '風調雨順', icon: '🌾', mul: 1.15 },
      { a: 'house',      b: 'farm',       name: '田園人家', icon: '🏠', mul: 1.10 },
      { a: 'house',      b: 'house',      name: '里坊比鄰', icon: '🏘️', mul: 1.08 },
      { a: 'house',      b: 'academy',    name: '耕讀傳家', icon: '🏠', mul: 1.12 },
      { a: 'house',      b: 'dojo',       name: '朝夕演武', icon: '🥋', mul: 1.12 }
    ],

    // ── 研究 ──
    RESEARCH: [
      { id: 'carpentry',  name: '木工技法', icon: '🪚', cost: 600,   desc: '全鎮收入 +6%。',                        bonus: { incomeMul: 0.06 } },
      { id: 'commerce',   name: '商道學',   icon: '💹', cost: 1500,  desc: '解鎖【鏢局】【錢莊】，全鎮收入 +6%。',   unlock: ['escort', 'bank'], bonus: { incomeMul: 0.06 } },
      { id: 'wushu',      name: '武學研究', icon: '🥋', cost: 2500,  desc: '解鎖【演武場】【擂台】【藏經閣】，武學點數 +30%。', unlock: ['dojo', 'arena', 'library'], bonus: { spMul: 0.30 } },
      { id: 'faith',      name: '迎神賽會', icon: '🙏', cost: 3000,  desc: '解鎖【寺廟】，全鎮魅力 +10%。',          unlock: ['temple'], bonus: { appealMul: 0.10 } },
      { id: 'resort',     name: '溫泉開發', icon: '♨️', cost: 5000,  desc: '解鎖【溫泉】，全鎮收入 +8%。',           unlock: ['hotspring'], bonus: { incomeMul: 0.08 } },
      { id: 'wall',       name: '城牆擴建', icon: '🧱', cost: 6000,  desc: '解鎖【衙門】，可用土地 +12 格。',        unlock: ['yamen'], bonus: { cellBonus: 12 } },
      { id: 'market',     name: '市集推廣', icon: '🏪', cost: 8000,  desc: '解鎖【集市】，全鎮收入 +12%。',          unlock: ['market'], bonus: { incomeMul: 0.12 } },
      { id: 'guildhall',  name: '同業公會', icon: '🏛️', cost: 12000, desc: '全鎮收入 +15%。',                       bonus: { incomeMul: 0.15 } },
      { id: 'secretbook', name: '天機秘卷', icon: '📜', cost: 20000, desc: '全鎮收入 +20%，人口上限 +8。',           bonus: { incomeMul: 0.20, popBonus: 8 } }
    ],

    // ── 隨機事件（每週期 4% 機率觸發）──
    EVENTS: [
      { name: '江湖賣藝',   icon: '🎭', text: '一名賣藝人在市集表演，圍觀者眾。',           gain: { prosperity: 60 } },
      { name: '商隊過境',   icon: '🐫', text: '西域商隊路過小鎮，帶來不少生意。',           gain: { goldMul: 1.5 } },
      { name: '義診施藥',   icon: '🏥', text: '大夫於醫館義診，鎮民感念。',                 gain: { prosperity: 80 } },
      { name: '武林大會',   icon: '⚔️', text: '各路英雄齊聚小鎮比武，門票收入可觀。',       gain: { goldMul: 2.0, prosperity: 120 } },
      { name: '天降甘霖',   icon: '🌧️', text: '久旱逢甘霖，農田豐收。',                     gain: { prosperity: 50 } },
      { name: '名人題字',   icon: '🖌️', text: '一位名士為小鎮題字，聲名遠播。',             gain: { prosperity: 150 } },
      { name: '燈會慶典',   icon: '🏮', text: '上元燈會，萬人空巷。',                       gain: { goldMul: 1.2, prosperity: 200 } },
      { name: '弟子比試',   icon: '🥋', text: '鎮上弟子齊聚廣場切磋，武風大盛。',           gain: { prosperity: 90 } },
      { name: '同道來訪',   icon: '👥', text: '幾位江湖同道慕名而來，與小鎮高手論武。',     gain: { prosperity: 130 } },
      { name: '盜匪滋擾',   icon: '🗡️', text: '盜匪夜襲，居民人心惶惶。',                   gain: { prosperity: -40 }, negatedByGuard: true }
    ],

    // 治安值 > 0 時，盜匪事件被巡守／靈獸擋下，改為此結果
    GUARD_COUNTER: {
      name: '巡守退敵', icon: '🛡️',
      text: '宵小窺伺小鎮，被巡守與靈獸及時驅離，鎮民拍手稱快。',
      gain: { prosperity: 50 }
    },

    // ── 鎮民姓名池 ──
    NPC_NAMES: [
      '王鐵牛', '李三娘', '張小七', '陳阿水', '林守義', '黃大山', '趙一鳴', '孫翠娘',
      '周萬財', '吳阿福', '鄭老六', '許阿珠', '何有德', '呂小虎', '施文娘', '謝阿勇',
      '曹二娘', '石三郎', '朱大興', '秦阿妹', '尤伯溫', '潘金福', '馬長風', '苗青娘',
      '范仁義', '彭阿火', '董半仙', '袁小鳳', '傅老實', '蘇婉兒', '柳無霜', '耿天雄',
      '花鐵幹', '洛小蝶', '燕十三', '鐵心蘭', '花伴月', '龍嘯雲', '慕蓉秋', '雷震天'
    ]
  };

  window.HY.Data.TOWN = TOWN;
})();