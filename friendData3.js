// js/friendData3.js (v1)
// ⭐ 好友系統 v3：資料層（名人好友／世界王／洞府家園／拍賣行／仇敵）
// ⚠️ 載入順序：friendData2.js 之後、所有 friendXxxSystem.js 之前
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendData3] 找不到 HY.Data.TOWN'); return; }
  var F = T.FRIEND = T.FRIEND || {};

  F.CONFIG3 = {
    /* ── 名人好友 ── */
    CELEB_SLOTS: 8,                 // 基礎好友名額
    CELEB_SLOTS_PER_TOWN_LV: 2,     // 每級小鎮 +2
    CELEB_SLOTS_MAX: 40,
    CELEB_COST_RATE: 0.055,         // 結交費 = maxSpend × tier.mul × 此值
    CELEB_COST_MIN: 800,
    CELEB_VISITOR_DISCOUNT: 0.30,   // 正在小鎮作客的名人，結交費打折
    CELEB_LV_BY_TIER: [0, 6, 16, 32, 52, 78],
    CELEB_LV_JITTER: 0.40,          // id 雜湊造成 ±40% 抖動
    CELEB_START_FAVOR: 20,

    /* ── 社會階層 → 好友加成（依 society 套用）── */
    SOCIETY_FRIEND_BONUS: {
      wulin:    { atkPct: 0.05, expMul: 0.03, desc: '武林宗師：攻擊與歷練成長更快。' },
      science:  { spMul: 0.12, learnDiscount: 0.10, desc: '科學巨擘：武學點數與學招折扣。' },
      royal:    { goldMul: 0.12, order: 1, desc: '帝王將相：帶回的紋銀更多。' },
      literati: { expMul: 0.07, favorGain: 0.15, desc: '文人雅士：歷練快，交情也升得快。' },
      modern:   { dropMul: 0.14, goldMul: 0.06, desc: '現代風雲：戰利品掉率更高。' }
    },

    /* ── 社會階層 → 戰鬥定位 ── */
    SOCIETY_ROLE: { wulin: 'dps', royal: 'tank', science: 'heal', literati: 'heal', modern: 'agi' },
    WULIN_HEAVY: ['dugu_qiuqiu', 'saodiseng', 'dongfang_bubai', 'zhang_sanfeng', 'guanyu', 'zhaoyun', 'caocao'],

    /* ── 洞府家園 ── */
    HOME_MAX_LV: 10,
    HOME_EXP_BASE: 120,             // 升到 Lv.N 需要 HOME_EXP_BASE × N²
    HOME_EXP_PER_MAT: 14,
    HOME_DECOR_COST: 1500,          // 每次裝修基礎花費
    HOME_DECOR_EXP: 40,
    HOME_VISIT_CD: 15,              // 同一位洞府的拜訪冷卻（期）
    HOME_VISIT_GOLD: 260,           // 拜訪禮金 = 此值 × 洞府等級 × tier.mul
    HOME_VISIT_FAVOR: 4,
    HOME_MAT_CHANCE: 0.22,          // 每期每位好友替你找到建材的機率
    HOME_AUTO_GIFT: 0.06,           // 好友互相送建材的機率
    HOME_EXP_BONUS_PER_LV: 0.02,    // 洞府每級 → 好友成長 +2%
    HOME_STAT_PER_LV: 0.012,        // 洞府每級 → 好友攻防血 +1.2%
    HOME_BUFF_TICKS: 20,            // 拜訪後的「洞府靈氣」持續期數
    HOME_BUFF_MUL: 0.15,            // 靈氣期間全好友成長 +15%

    /* ── 世界王 ── */
    WB_INTERVAL: 60,                // 每 N 期出現一頭世界王
    WB_RAID_MIN: 8,                 // 最少 8 人才能集結
    WB_RAID_MAX: 20,
    WB_HP_BASE: 0.85,               // Boss HP = 隊伍總戰力 × 此值 × (1 + tier×0.12)
    WB_DPS: 0.075,                  // 每期傷害 = 隊伍總戰力 × 此值 × 默契
    WB_RETAL: 0.16,                 // 每期被反擊負傷的機率（每階段 +0.06）
    WB_ENRAGE: 26,                  // 超過此期數 Boss 逃脫（失敗）
    WB_MERC_POWER: 1.0,             // 名人訪客助拳的戰力係數
    WB_WARN: 6,                     // 失敗後幾期內 Boss 會打劫小鎮

    /* ── 拍賣行 ── */
    AUCTION_SLOTS: 5,               // 同時代售上限
    AUCTION_TICKS: [6, 14],         // 售出所需期數
    AUCTION_COMMISSION: 0.20,       // 基礎抽成
    AUCTION_FAVOR_DISCOUNT: 0.12,   // 好感滿 → 抽成 -12%
    AUCTION_STALL_CHANCE: 0.15,     // 流標機率（好友等級不足時提高）
    AUCTION_PRICE_POWER: 0.55,      // 售價 = 裝備戰力 × 此值 + reqLv × 40
    AUCTION_EXP_MUL: 0.05,          // 好友代售得經驗
    AUCTION_LIST_MAX: 4,            // 好友掛售的件數上限

    /* ── 仇敵 ── */
    HOSTILE_CHANCE: 0.05,           // 好感歸零後每期叛變機率
    HOSTILE_DISMISS_CHANCE: 0.35,   // 主動斷交時結仇的機率
    HOSTILE_POWER_MUL: 1.25,        // 仇敵戰力加成
    HOSTILE_RAID_CD: [20, 45],      // 打劫間隔
    HOSTILE_RAID_LOSS: 0.06,        // 打劫損失 = 你的銀兩 × 此值（上限）
    HOSTILE_RAID_MAX: 40000,
    HOSTILE_RECRUIT_COST: 3000,     // 招降基礎花費
    HOSTILE_RECRUIT_FAVOR: 30,      // 招降後好感
    HOSTILE_MAX: 12,
    HOSTILE_TITLE: 't_hostile'
  };

  /* ══════════ 洞府風格 ══════════ */
  F.HOME_STYLES = [
    { id: 'bamboo', name: '竹林幽居', icon: '🎋', bonus: { expMul: 0.06 },           desc: '清幽宜人，修煉事半功倍。' },
    { id: 'stone',  name: '石室洞天', icon: '🪨', bonus: { defPct: 0.04 },           desc: '磐石為壁，內息沉穩，防禦見長。' },
    { id: 'garden', name: '藥圃山莊', icon: '🌿', bonus: { hpPct: 0.05 },            desc: '遍植靈藥，氣血自生。' },
    { id: 'tomb',   name: '劍塚',     icon: '⚔️', bonus: { atkPct: 0.05 },           desc: '藏劍於塚，殺意內斂。' },
    { id: 'library',name: '藏書樓',   icon: '📚', bonus: { spMul: 0.12 },            desc: '典籍盈架，武學點數源源不絕。' }
  ];

  /* ══════════ 建材 ══════════ */
  F.HOME_MATERIALS = [
    { id: 'wood',  name: '木材', icon: '🪵', weight: 40, value: 1 },
    { id: 'stone', name: '石材', icon: '🧱', weight: 30, value: 1 },
    { id: 'iron',  name: '鐵料', icon: '⛓️', weight: 20, value: 2 },
    { id: 'jade',  name: '靈玉', icon: '💠', weight: 10, value: 5 }
  ];

  /* ══════════ 世界王（以名人為原型）══════════ */
  F.WORLD_BOSSES = [
    { id: 'wb_sword',  celebId: 'dugu_qiuqiu',    name: '劍魔・獨孤求敗', icon: '⚔️', title: '縱橫江湖三十餘載', tier: 3,
      hpMul: 0.85, gold: 42000,  dropMul: 1.6, lines: ['求敗，求敗，誰能與我一戰？', '你的劍，太慢了。'] },
    { id: 'wb_monk',   celebId: 'saodiseng',      name: '藏經閣・掃地僧', icon: '🧹', title: '深藏不露的神僧', tier: 4,
      hpMul: 1.00, gold: 78000,  dropMul: 1.9, lines: ['阿彌陀佛，諸位施主請回。', '佛法無邊，回頭是岸。'] },
    { id: 'wb_dongfang',celebId:'dongfang_bubai', name: '日月神教・東方不敗', icon: '🧵', title: '葵花寶典大成者', tier: 4,
      hpMul: 0.92, gold: 86000,  dropMul: 2.0, lines: ['你們的招式，我早已看穿。', '天下風雲出我輩。'] },
    { id: 'wb_wudang', celebId: 'zhang_sanfeng',  name: '武當・張三丰', icon: '☯️', title: '太極宗師', tier: 5,
      hpMul: 1.15, gold: 140000, dropMul: 2.4, lines: ['太極者，無極而生。', '年輕人，慢些，再慢些。'] },
    { id: 'wb_sun',    celebId: 'sunwu',          name: '兵聖・孫武', icon: '📜', title: '兵者，詭道也', tier: 5,
      hpMul: 1.05, gold: 126000, dropMul: 2.2, lines: ['不戰而屈人之兵。', '你們已入我甕中。'] },
    { id: 'wb_ying',   celebId: 'qinshihuang',    name: '千古一帝・秦始皇', icon: '👑', title: '橫掃六合', tier: 5,
      hpMul: 1.30, gold: 180000, dropMul: 2.8, lines: ['朕即天下。', '擋我者，皆為塵土。'] },
    { id: 'wb_han',    celebId: 'hanxin',         name: '兵仙・韓信', icon: '🎖️', title: '多多益善', tier: 4,
      hpMul: 0.95, gold: 92000,  dropMul: 2.0, lines: ['兵多將廣，何懼一戰？', '此局，我已勝。'] },
    { id: 'wb_yue',    celebId: 'yuefei',         name: '武穆・岳飛', icon: '🐎', title: '精忠報國', tier: 4,
      hpMul: 1.02, gold: 88000,  dropMul: 1.9, lines: ['撼山易，撼岳家軍難。', '三十功名塵與土。'] }
  ];

  /* ══════════ 仇敵反目理由 ══════════ */
  F.HOSTILE_REASONS = [
    { id: 'h_betray', name: '心懷怨懟', icon: '🗡️', desc: '長久以來的冷落，終於化為殺意。' },
    { id: 'h_greed',  name: '見利忘義', icon: '💰', desc: '為了錢財，昔日情分一筆勾銷。' },
    { id: 'h_rival',  name: '門派之爭', icon: '⛩️', desc: '各為其主，立場終究無法兩全。' },
    { id: 'h_insult', name: '受辱結仇', icon: '🔥', desc: '那句話，他一直記在心裡。' },
    { id: 'h_envy',   name: '嫉妒生恨', icon: '🌑', desc: '憑什麼站在高處的是你？' }
  ];

  console.log('[friendData3] ✓ 已載入（洞府風格 ' + F.HOME_STYLES.length + '｜建材 ' + F.HOME_MATERIALS.length +
    '｜世界王 ' + F.WORLD_BOSSES.length + '｜仇敵理由 ' + F.HOSTILE_REASONS.length + '）');

  window.HY.FriendData3 = {
    version: '1.0',
    homeStyles: F.HOME_STYLES.length,
    bosses: F.WORLD_BOSSES.length
  };
})();