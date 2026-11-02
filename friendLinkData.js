// js/friendLinkData.js (v1)
// ⭐ 好友系統 v6：跨系統連動資料層
//    定義 20 個外部系統的連動參數 + 後備資料（外部資料缺失時仍可運作）
// ⚠️ 載入順序：friendData4.js 之後
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendLinkData] 找不到 HY.Data.TOWN'); return; }
  var F = T.FRIEND = T.FRIEND || {};

  /* ══════════════════════════════════════════════════════
     CONFIG6 —— 全部連動參數
     ══════════════════════════════════════════════════════ */
  F.CONFIG6 = {
    /* ── 陣法 ── */
    FORMATION_ENABLE: true,
    FORMATION_LEARN_CHANCE: 0.06,
    FORMATION_MAX_LV: 5,
    FORMATION_TEAM_MUL: 0.55,      // 隊伍陣法加成折半（已另有默契加成）
    FORMATION_LV_UP_CHANCE: 0.10,

    /* ── 靈根 ── */
    SPIRIT_ENABLE: true,
    SPIRIT_STAT_PER_LV: 0.012,     // 每級 → 四維 +1.2%
    SPIRIT_GROWTH_PER_LV: 0.020,   // 每級 → 成長 +2%
    SPIRIT_LV_UP_CHANCE: 0.045,
    SPIRIT_MAX_LV: 10,

    /* ── 五行 ── */
    ELEMENT_ENABLE: true,
    ELEMENT_ADV: 0.15,             // 剋制 +15%
    ELEMENT_DIS: -0.08,            // 被剋 -8%

    /* ── 寵物 ── */
    PET_ENABLE: true,
    PET_MAX: 1,
    PET_POWER_MUL: 0.18,           // 寵物貢獻 = 好友戰力 × 此值
    PET_LV_UP_CHANCE: 0.05,
    PET_MAX_LV: 10,

    /* ── 同伴 ── */
    COMPANION_ENABLE: true,
    COMPANION_MAX: 3,
    COMPANION_POWER_MUL: 0.12,
    COMPANION_FAVOR_MIN: 60,

    /* ── 詞綴 ── */
    AFFIX_ENABLE: true,
    AFFIX_CHANCE: 0.28,
    AFFIX_STAT_MUL: 0.14,          // 每層詞綴 → 怪物強度 +14%
    AFFIX_LOOT_MUL: 0.35,          // 每層詞綴 → 掉寶 +35%
    AFFIX_MAX: 3,

    /* ── 公會 ── */
    GUILD_ENABLE: true,
    GUILD_GUEST_MAX: 8,
    GUILD_CONTRIB_PER_TICK: 1,
    GUILD_BUILDING_MUL: 0.50,      // 建築加成折半套用於好友

    /* ── 門派特色 ── */
    SECT_FEATURE_ENABLE: true,
    SECT_FEATURE_MUL: 0.70,

    /* ── 黑市 ── */
    MARKET_ENABLE: true,
    MARKET_LIST_MAX: 6,
    MARKET_REFRESH: 12,
    MARKET_MARKUP: 1.25,
    MARKET_STALL: 0.18,

    /* ── 工藝 ── */
    CRAFT_ENABLE: true,
    CRAFT_TICKS: [5, 12],
    CRAFT_MAX: 2,
    CRAFT_COST_MAT: 6,             // 每次代工消耗材料數
    CRAFT_SUCCESS: 0.72,

    /* ── 打撈遠征 ── */
    SALVAGE_ENABLE: true,
    SALVAGE_MIN: 3,
    SALVAGE_MAX: 6,
    SALVAGE_TICKS: [10, 22],
    SALVAGE_GOLD: 1.0,

    /* ── 精通 ── */
    MASTERY_ENABLE: true,
    MASTERY_UP_CHANCE: 0.08,
    MASTERY_MAX_LV: 10,

    /* ── ATB / 速度 ── */
    ATB_ENABLE: true,
    ATB_BASE: 100,

    /* ── 敵方陣法 ── */
    ENEMY_FORMATION_ENABLE: true,
    ENEMY_FORMATION_CHANCE: 0.35,
    ENEMY_FORMATION_MUL: 0.20,

    /* ── 時光旅行 ── */
    TIMETRAVEL_ENABLE: true,
    TIMETRAVEL_TICKS: [15, 30],
    TIMETRAVEL_GOLD_MUL: 1.4,

    /* ── 賭博 ── */
    GAMBLE_ENABLE: true,
    GAMBLE_MIN: 500,
    GAMBLE_MAX: 50000,
    GAMBLE_HOUSE_EDGE: 0.08,

    /* ── 名冊 ── */
    ROSTER_ENABLE: true,
    ROSTER_COST: 5000,

    /* ── 離線 ── */
    OFFLINE_ENABLE: true,
    OFFLINE_CAP_TICKS: 500,
    OFFLINE_SHARE: 0.60,           // 離線期效率

    /* ── 等級經驗 ── */
    LEVELSYNC_ENABLE: true
  };

  /* ══════════════════════════════════════════════════════
     後備資料（外部資料缺失時使用）
     ══════════════════════════════════════════════════════ */

  /* ── 陣法後備 ── */
  F.FALLBACK_FORMATIONS = [
    { id: 'fm_heaven', name: '天罡北斗陣', icon: '☯️', atkPct: 0.06, defPct: 0.06, hpPct: 0.04, desc: '七星定位，攻守兼備。' },
    { id: 'fm_earth',  name: '地煞玄龜陣', icon: '🐢', atkPct: 0.02, defPct: 0.10, hpPct: 0.08, desc: '玄武鎮守，堅不可破。' },
    { id: 'fm_fire',   name: '烈焰焚天陣', icon: '🔥', atkPct: 0.12, defPct: 0.00, hpPct: 0.02, desc: '焚盡一切，唯攻而已。' },
    { id: 'fm_water',  name: '寒江瀲灩陣', icon: '💧', atkPct: 0.04, defPct: 0.07, hpPct: 0.06, desc: '綿密如網，以柔克剛。' },
    { id: 'fm_wind',   name: '疾風迅雷陣', icon: '🍃', atkPct: 0.08, defPct: 0.03, hpPct: 0.02, atbMul: 0.10, desc: '迅捷無倫，先發制人。' },
    { id: 'fm_mountain', name: '不動如山陣', icon: '⛰️', atkPct: 0.00, defPct: 0.12, hpPct: 0.12, desc: '穩如山嶽，寸步不讓。' },
    { id: 'fm_cloud',  name: '雲海縹緲陣', icon: '☁️', atkPct: 0.05, defPct: 0.05, hpPct: 0.05, evaAdd: 6, desc: '身影縹緲，難以捉摸。' },
    { id: 'fm_blood',  name: '血戰八方陣', icon: '🩸', atkPct: 0.14, defPct: -0.04, hpPct: 0.06, desc: '以血換命，破釜沉舟。' }
  ];

  /* ── 五行後備（含相剋）── */
  F.FALLBACK_ELEMENTS = [
    { id: 'metal', name: '金', icon: '⚪', color: '#cbd5e1', beats: 'wood' },
    { id: 'wood',  name: '木', icon: '🟢', color: '#6ee7b7', beats: 'earth' },
    { id: 'earth', name: '土', icon: '🟤', color: '#d6b98c', beats: 'water' },
    { id: 'water', name: '水', icon: '🔵', color: '#7dd3fc', beats: 'fire' },
    { id: 'fire',  name: '火', icon: '🔴', color: '#fca5a5', beats: 'metal' }
  ];

  /* ── 靈根後備 ── */
  F.FALLBACK_SPIRIT_ROOTS = [
    { id: 'sr_single', name: '單靈根', icon: '💎', statMul: 0.06, growthMul: 0.10, weight: 4, desc: '天資卓絕，萬中無一。' },
    { id: 'sr_double', name: '雙靈根', icon: '💠', statMul: 0.04, growthMul: 0.06, weight: 12, desc: '資質上乘。' },
    { id: 'sr_triple', name: '三靈根', icon: '🔷', statMul: 0.025, growthMul: 0.04, weight: 22, desc: '中上之資。' },
    { id: 'sr_quad',   name: '四靈根', icon: '🔹', statMul: 0.015, growthMul: 0.02, weight: 32, desc: '尋常資質。' },
    { id: 'sr_penta',  name: '五行靈根', icon: '🌀', statMul: 0.008, growthMul: 0.01, weight: 30, desc: '雜而不純，然勤能補拙。' }
  ];

  /* ── 詞綴後備 ── */
  F.FALLBACK_AFFIXES = [
    { id: 'af_tough',  name: '堅韌', icon: '🛡️', kind: 'def', mul: 0.20, desc: '氣血與防禦大幅提升。' },
    { id: 'af_might',  name: '狂暴', icon: '💪', kind: 'atk', mul: 0.22, desc: '攻擊力大幅提升。' },
    { id: 'af_swift',  name: '迅捷', icon: '💨', kind: 'atb', mul: 0.18, desc: '出手速度加快。' },
    { id: 'af_regen',  name: '再生', icon: '💚', kind: 'regen', mul: 0.12, desc: '每回合回復氣血。' },
    { id: 'af_shield', name: '護盾', icon: '🔰', kind: 'shield', mul: 0.15, desc: '開場獲得護盾。' },
    { id: 'af_curse',  name: '詛咒', icon: '☠️', kind: 'curse', mul: 0.10, desc: '攻擊附帶減益。' },
    { id: 'af_ele',    name: '元素', icon: '🌈', kind: 'ele', mul: 0.14, desc: '攻擊附帶五行傷害。' },
    { id: 'af_lifesteal', name: '吸血', icon: '🧛', kind: 'ls', mul: 0.10, desc: '造成傷害時回復氣血。' }
  ];

  /* ── 同伴職責後備 ── */
  F.COMPANION_ROLES = [
    { id: 'guard',  name: '護衛', icon: '🛡️', bonus: { defPct: 0.05, hpPct: 0.05 }, desc: '提升防禦與氣血。' },
    { id: 'advisor',name: '軍師', icon: '📜', bonus: { atkPct: 0.04, critAdd: 3 }, desc: '提升攻擊與爆擊。' },
    { id: 'healer', name: '醫者', icon: '🌿', bonus: { hpPct: 0.08 }, desc: '提升氣血上限。' },
    { id: 'scout',  name: '斥候', icon: '🧭', bonus: { evaAdd: 6, atbMul: 0.08 }, desc: '提升閃避與速度。' },
    { id: 'smith',  name: '匠師', icon: '🔨', bonus: { dropMul: 0.10 }, desc: '提升戰利品。' },
    { id: 'merchant',name:'商賈', icon: '💰', bonus: { goldMul: 0.12 }, desc: '提升紋銀收益。' }
  ];

  /* ══════════════════════════════════════════════════════
     連動系統註冊表（供稽核與 UI 使用）
     ══════════════════════════════════════════════════════ */
  F.LINK_SYSTEMS = [
    { id: 'formation', name: '陣法',      icon: '☯️', cfg: 'FORMATION_ENABLE',   ext: ['HY.Data.XIANXIA_FORMATIONS', 'HY.game.formationSys'], desc: '好友可學陣法，出團／世界王／戰鬥套用。' },
    { id: 'spirit',    name: '靈根',      icon: '💎', cfg: 'SPIRIT_ENABLE',      ext: ['HY.Data.SPIRIT_ROOTS', 'HY.game.spiritRootSys'],     desc: '好友有靈根，影響成長與四維。' },
    { id: 'element',   name: '五行',      icon: '🌀', cfg: 'ELEMENT_ENABLE',     ext: ['HY.Data.ELEMENTS', 'HY.game.elementSys'],            desc: '五行相剋影響傷害。' },
    { id: 'pet',       name: '寵物',      icon: '🐾', cfg: 'PET_ENABLE',         ext: ['HY.Data.PETS', 'HY.game.petSys'],                    desc: '好友可帶寵物。' },
    { id: 'companion', name: '同伴',      icon: '👥', cfg: 'COMPANION_ENABLE',   ext: ['HY.Data.COMPANIONS', 'HY.game.companionSys'],        desc: '好友可派為同伴。' },
    { id: 'affix',     name: '怪物詞綴',  icon: '🧬', cfg: 'AFFIX_ENABLE',       ext: ['HY.Data.MONSTER_AFFIXES', 'HY.game.affixSys'],       desc: '副本怪帶詞綴。' },
    { id: 'guild',     name: '冒險者公會', icon: '🏛️', cfg: 'GUILD_ENABLE',       ext: ['HY.game.guildCoreSys', 'HY.Data.GUILD_BUILDINGS'],   desc: '好友可當公會賓客。' },
    { id: 'sect',      name: '門派特色',  icon: '⛩️', cfg: 'SECT_FEATURE_ENABLE', ext: ['HY.game.sectFeatureSys', 'HY.Data.SECTS'],          desc: '好友門派特色生效。' },
    { id: 'market',    name: '黑市',      icon: '🕶️', cfg: 'MARKET_ENABLE',      ext: ['HY.game.blackMarketSys'],                            desc: '好友掛售／掃貨。' },
    { id: 'craft',     name: '工藝',      icon: '⚒️', cfg: 'CRAFT_ENABLE',       ext: ['HY.game.poeSys', 'HY.Data.CURRENCIES'],              desc: '好友代工改造。' },
    { id: 'salvage',   name: '打撈遠征',  icon: '🌊', cfg: 'SALVAGE_ENABLE',     ext: ['HY.game.salvageSys'],                                desc: '好友組隊打撈。' },
    { id: 'mastery',   name: '精通',      icon: '🎯', cfg: 'MASTERY_ENABLE',     ext: ['HY.Data.MASTERY'],                                   desc: '好友精通成長。' },
    { id: 'atb',       name: '戰鬥速度',  icon: '⏱️', cfg: 'ATB_ENABLE',         ext: ['HY.game.dexSys', 'HY.game.atbSys'],                  desc: '好友有 ATB 速度。' },
    { id: 'enemyfm',   name: '敵方陣法',  icon: '🔺', cfg: 'ENEMY_FORMATION_ENABLE', ext: ['HY.game.enemyFormationSys'],                     desc: '敵方陣法需破解。' },
    { id: 'timetravel',name: '時光旅行',  icon: '⏳', cfg: 'TIMETRAVEL_ENABLE',  ext: ['HY.game.timeTravelSys'],                             desc: '好友隨行時光旅行。' },
    { id: 'gamble',    name: '賭局',      icon: '🎲', cfg: 'GAMBLE_ENABLE',      ext: ['HY.game.gambleSys'],                                 desc: '好友可押注。' },
    { id: 'lottery',   name: '大樂透',    icon: '🎰', cfg: 'LEVELSYNC_ENABLE',   ext: ['HY.game.lotterySys', 'HY.Data.LOTTERY_CELEBS'],      desc: '樂透可抽出好友。' },
    { id: 'roster',    name: '角色名冊',  icon: '📋', cfg: 'ROSTER_ENABLE',      ext: ['HY.game.rosterSys'],                                 desc: '好友 ↔ 名冊互轉。' },
    { id: 'offline',   name: '離線掛機',  icon: '🌙', cfg: 'OFFLINE_ENABLE',     ext: ['HY.game.offlineSys'],                                desc: '統一離線結算。' },
    { id: 'level',     name: '等級經驗',  icon: '📈', cfg: 'LEVELSYNC_ENABLE',   ext: ['HY.game.levelExpSys'],                               desc: '用遊戲真實經驗曲線。' }
  ];

  console.log('[friendLinkData] ✓ 已載入（連動系統 ' + F.LINK_SYSTEMS.length + ' 項｜陣法後備 ' +
    F.FALLBACK_FORMATIONS.length + '｜五行 ' + F.FALLBACK_ELEMENTS.length + '｜靈根 ' +
    F.FALLBACK_SPIRIT_ROOTS.length + '｜詞綴 ' + F.FALLBACK_AFFIXES.length + '）');

  window.HY.FriendLinkData = { version: '1.0', systems: F.LINK_SYSTEMS.length };
})();