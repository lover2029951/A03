// js/friendData4.js (v1)
// ⭐ 好友系統 v4：資料層（授業／工坊／鍛造／煉丹／保鑣／心願／日常／倉庫）
// ⚠️ 載入順序：friendData3.js 之後
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendData4] 找不到 HY.Data.TOWN'); return; }
  var F = T.FRIEND = T.FRIEND || {};

  F.CONFIG4 = {
    /* ── 授業傳功 ── */
    TEACH_FAVOR: 8,             // 每次傳授消耗好感
    TEACH_GOLD_BASE: 1200,      // 基礎銀兩
    TEACH_GOLD_PER_LV: 45,      // 每級追加
    TEACH_MAX_PER_TICK: 1,      // 每期每位好友最多傳授幾式
    TEACH_GRANT_NEW: true,      // 你沒有的招式 → 直接學會
    TEACH_SP_GAIN: 15,          // 額外獲得武學點數

    /* ── 打工 ── */
    WORK_MAX_ASSIGN: 4,         // 同時最多幾位好友在外打工
    WORK_DUR: [8, 20],          // 打工期數
    WORK_YIELD: 1.0,            // 產量倍率
    WORK_GOLD: 1.0,             // 打工帶回銀兩倍率
    WORK_INJURY: 0.05,          // 打工負傷機率

    /* ── 鍛造 ── */
    FORGE_MAX_LV: 10,
    FORGE_COST_BASE: 900,       // 強化基礎費用
    FORGE_COST_PER_LV: 700,     // 每 +1 追加
    FORGE_BASE_RATE: 0.78,      // 基礎成功率
    FORGE_TIER_BONUS: 0.035,    // 每星 +3.5%
    FORGE_LV_BONUS: 0.0012,     // 每好友等級 +0.12%
    FORGE_MIN_TIER: 2,          // 需 ★★ 以上才能接單
    FORGE_FAIL_GOLD: 0.5,       // 失敗退還比例
    FORGE_FAIL_LOSS: 0,         // 失敗是否降級（0=不降）

    /* ── 煉丹 ── */
    ALCHEMY_MAX_ASSIGN: 2,
    ALCHEMY_DUR: [10, 24],
    ALCHEMY_RATE: 0.85,
    ALCHEMY_OUT_MIN: 1,
    ALCHEMY_OUT_MAX: 3,

    /* ── 保鑣 ── */
    GUARD_ATK_PCT: 0.06,
    GUARD_DEF_PCT: 0.09,
    GUARD_HP_PCT: 0.11,
    GUARD_RAID_REDUCE: 0.45,    // 打劫損失減免
    GUARD_HEAL_PER_TICK: 1,     // 每期為負傷好友減少幾期療傷
    GUARD_FREE_SLOT: true,      // 保鑣不佔同行名額

    /* ── 心願 ── */
    WISH_INTERVAL: 14,          // 每 N 期生成
    WISH_MAX: 4,
    WISH_EXPIRE: 30,
    WISH_FAVOR: 10,
    WISH_REWARD_GOLD: 1.0,

    /* ── 日常互動 ── */
    DAILY_CD: 8,                // 同一位好友的冷卻期數
    DAILY_FAVOR: 3,
    DAILY_BUFF_TICKS: 12,
    DAILY_BUFF_MUL: 0.05,

    /* ── 倉庫 ── */
    WAREHOUSE_CAP: 40,          // 裝備格數
    WAREHOUSE_MAT_CAP: 9999,
    WAREHOUSE_DEPOSIT: 0.03,    // 好友每期存入裝備的機率
    WAREHOUSE_MAT: 0.12,        // 好友每期存入材料的機率
    WAREHOUSE_HOME_VALUE: 1.0,  // 材料轉贈洞府的價值倍率
    WAREHOUSE_MAX_TAKE: 20      // 一次最多取幾件
  };

  /* ══════════ 材料 ══════════ */
  F.WAREHOUSE_MATERIALS = [
    { id: 'wood',  name: '木材', icon: '🪵', value: 14, weight: 22 },
    { id: 'stone', name: '石材', icon: '🧱', value: 14, weight: 20 },
    { id: 'iron',  name: '鐵料', icon: '⛓️', value: 26, weight: 14 },
    { id: 'jade',  name: '靈玉', icon: '💠', value: 70, weight: 5 },
    { id: 'herb',  name: '草藥', icon: '🌿', value: 12, weight: 18 },
    { id: 'ore',   name: '礦石', icon: '🪨', value: 18, weight: 12 },
    { id: 'silk',  name: '蠶絲', icon: '🧵', value: 20, weight: 9 },
    { id: 'pelt',  name: '獸皮', icon: '🐾', value: 16, weight: 9 },
    { id: 'fish',  name: '魚鮮', icon: '🐟', value: 10, weight: 9 }
  ];

  /* ══════════ 打工 ══════════ */
  F.WORK_JOBS = [
    { id: 'herb',  name: '採藥',   icon: '🌿', mats: ['herb', 'silk'],           gold: [200, 600],  dur: [8, 16],  desc: '上山採集草藥與蠶絲。' },
    { id: 'mine',  name: '挖礦',   icon: '⛏️', mats: ['ore', 'stone', 'iron', 'jade'], gold: [260, 900], dur: [10, 20], desc: '深入礦脈，偶爾挖到靈玉。' },
    { id: 'lumber',name: '伐木',   icon: '🪵', mats: ['wood', 'pelt'],           gold: [180, 520],  dur: [8, 14],  desc: '砍伐林木，順道獵些小獸。' },
    { id: 'fish',  name: '垂釣',   icon: '🎣', mats: ['fish', 'herb'],           gold: [150, 480],  dur: [6, 12],  desc: '臨江垂釣，也摘些岸邊藥草。' },
    { id: 'hunt',  name: '狩獵',   icon: '🏹', mats: ['pelt', 'fish', 'silk'],   gold: [240, 780],  dur: [9, 18],  desc: '追蹤野獸，取其皮與鮮。' },
    { id: 'caravan', name: '跑商', icon: '🐫', mats: [],                         gold: [900, 3200], dur: [14, 26], desc: '替商隊押貨，利潤高但路遠。' }
  ];

  /* ══════════ 心願 ══════════ */
  F.WISH_TYPES = [
    { id: 'gold',   name: '求一筆銀兩',   icon: '💰', need: 'gold',  amount: [3000, 25000],
      desc: '{name}近來手頭緊，想向你借些銀兩週轉。', reward: { gold: 0.4, favor: 12, expMul: 0.10 } },
    { id: 'equip',  name: '想要一件裝備', icon: '⚔️', need: 'equip',
      desc: '{name}的兵器舊了，想討一件堪用的裝備。', reward: { gold: 0.1, favor: 16, expMul: 0.16 } },
    { id: 'mat',    name: '想討些材料',   icon: '🧱', need: 'mat',   amount: [10, 40],
      desc: '{name}正修繕洞府，缺些材料。', reward: { gold: 0.2, favor: 10, expMul: 0.12 } },
    { id: 'spar',   name: '想與你切磋',   icon: '🗡️', need: 'none',
      desc: '{name}最近鑽研出一招新式，想找人試試。', reward: { gold: 0.3, favor: 8, expMul: 0.20 } },
    { id: 'talk',   name: '想與你論道',   icon: '🍵', need: 'none',
      desc: '{name}心中有些疑惑，想與你長談一夜。', reward: { gold: 0.2, favor: 6, expMul: 0.14 } }
  ];

  /* ══════════ 日常互動 ══════════ */
  F.DAILY_ACTS = [
    { id: 'tea',    name: '品茶',   icon: '🍵', favor: 3, buff: 'spMul',    buffName: '武學點數', mul: 0.06, desc: '煮一壺清茶，閒談半晌。' },
    { id: 'wine',   name: '對飲',   icon: '🍶', favor: 4, buff: 'atkPct',   buffName: '攻擊',     mul: 0.05, desc: '痛飲一場，豪氣干雲。' },
    { id: 'flower', name: '賞花',   icon: '🌸', favor: 3, buff: 'hpPct',    buffName: '氣血',     mul: 0.06, desc: '並肩賞花，心神舒暢。' },
    { id: 'chess',  name: '下棋',   icon: '♟️', favor: 4, buff: 'defPct',   buffName: '防禦',     mul: 0.06, desc: '對弈一局，各有所悟。' },
    { id: 'music',  name: '聽曲',   icon: '🎵', favor: 3, buff: 'expMul',   buffName: '歷練成長', mul: 0.07, desc: '聽一曲清音，塵心盡洗。' },
    { id: 'sword',  name: '論劍',   icon: '⚔️', favor: 5, buff: 'dropMul',  buffName: '戰利品',   mul: 0.08, desc: '以劍論道，招式互證。' }
  ];

  /* ══════════ 心願回禮訊息 ══════════ */
  F.WISH_REPLY = [
    '這份人情，我記下了。',
    '你真是我的知己。',
    '他日必當厚報。',
    '有友如此，夫復何求。',
    '此恩銘記於心。'
  ];

  console.log('[friendData4] ✓ 已載入（材料 ' + F.WAREHOUSE_MATERIALS.length + '｜打工 ' + F.WORK_JOBS.length +
    '｜心願 ' + F.WISH_TYPES.length + '｜日常 ' + F.DAILY_ACTS.length + '）');

  window.HY.FriendData4 = {
    version: '1.0',
    materials: F.WAREHOUSE_MATERIALS.length,
    jobs: F.WORK_JOBS.length,
    wishes: F.WISH_TYPES.length,
    daily: F.DAILY_ACTS.length
  };
})();