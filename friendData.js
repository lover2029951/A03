// js/friendData.js (v1)
// ⭐ 好友系統：資料層（性格 / 行動 / 好感 / 姓名池 / 全部可調參數）
// ⚠️ 載入順序：townData.js 之後、friendSystem.js 之前。
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendData] 找不到 HY.Data.TOWN，請確認 townData.js 已載入且排在本檔之前。'); return; }

  var F = T.FRIEND = T.FRIEND || {};

  /* ══════════════════════════════════════════════════════
     CONFIG —— 全部可調參數都在這裡
     ══════════════════════════════════════════════════════ */
  F.CONFIG = {
    // ── 名額與節奏 ──
    MAX_FRIENDS: 12,            // 好友基礎名額
    MAX_FRIENDS_PER_LV: 2,      // 每提升 1 級小鎮 +2 名額
    TICK_MS: 3000,              // 好友自動行為 1 期 = 3 秒
    OFFLINE_MAX_STEPS: 300,     // 離線最多補算幾期

    // ── 結交 / 互動 ──
    RECRUIT_COST_BASE: 1200,    // 結交基礎費用
    RECRUIT_COST_PER_LV: 80,    // 每等級追加
    GIFT_COST_BASE: 300,        // 送禮基礎費用
    GIFT_COST_PER_LV: 20,
    GIFT_FAVOR: 8,              // 每次送禮 +好感
    SPAR_FAVOR: 6,              // 切磋 +好感
    TALK_FAVOR: 4,              // 論道 +好感
    TALK_SP_COST: 2,            // 論道消耗你的武點
    FAVOR_MAX: 100,

    // ── 組隊 ──
    FOLLOW_MAX: 3,              // 同時同行上限
    PARTY_MAX: 5,               // 戰鬥隊伍硬上限（與 partySystem 一致）

    // ── 自動行為收益（皆為「自身升級所需經驗」的比例）──
    EXP_RATE:  { grind: 0.055, train: 0.090, treasure: 0.030, quest: 0.045, rest: 0, social: 0.006 },
    GOLD_RATE: { grind: 0.030, train: 0.008, treasure: 0.020, quest: 0.085, rest: 0, social: 0.008 },
    SP_RATE:   { grind: 0.060, train: 0.050, treasure: 0.030, quest: 0.055, rest: 0.010, social: 0.020 },
    DROP_RATE: { grind: 0.10,  train: 0.02,  treasure: 0.36,  quest: 0.08,  rest: 0,   social: 0 },
    HURT_RATE: { grind: 0.05,  train: 0.01,  treasure: 0.09,  quest: 0.04,  rest: 0,   social: 0 },
    KILL_RATE: { grind: 1.0,   train: 0.4,   treasure: 0.6,   quest: 0.5,   rest: 0,   social: 0 },
    HURT_TICKS: [3, 8],         // 負傷需休養期數

    // ── 自動學習消耗（好友自己的武學點數 f.sp）──
    SKILL_SP_COST: 12,          // 學一式 = reqLv × 此值 ÷ 10
    XINFA_SP_COST: 18,
    QINGGONG_SP_COST: 16,
    MERIDIAN_SP_COST: 24,
    MERIDIAN_MAX_LV: 5,
    SKILL_UP_CHANCE: 0.35,      // 每期把 1 式已學招式升 1 級的機率

    // ── 同行光環（每位同行好友，再乘好感等級 1~5）──
    FOLLOW_AURA: { atkPct: 0.03, defPct: 0.03, hpPct: 0.04 },
    FOLLOW_INCOME: 0.010,
    FOLLOW_SP: 0.008,
    FOLLOW_ORDER: 1,
    FOLLOW_APPEAL: 5,
    AURA_CAP: 0.60              // 攻/防/血 光環上限
  };

  /* ══════════════════════════════════════════════════════
     性格：決定自動行動傾向 + 潛能配點傾向（比照公會職業配點）
     ══════════════════════════════════════════════════════ */
  F.PERSONAS = [
    { id: 'grinder',  name: '武癡',   icon: '⚔️', desc: '一心只想變強，整天泡在怪物堆裡。',
      weights: { grind: 6, train: 3, treasure: 1, quest: 1, rest: 1, social: 0 },
      alloc: { con: 1, str: 2, agi: 2, int: 0 } },
    { id: 'trainer',  name: '苦修者', icon: '🧘', desc: '閉關苦修，境界提升最快。',
      weights: { grind: 2, train: 6, treasure: 1, quest: 1, rest: 1, social: 1 },
      alloc: { con: 2, str: 1, agi: 1, int: 1 } },
    { id: 'hunter',   name: '尋寶客', icon: '🎁', desc: '專挑寶物多的地方下手，戰利品最多。',
      weights: { grind: 3, train: 1, treasure: 6, quest: 1, rest: 1, social: 0 },
      alloc: { con: 1, str: 1, agi: 3, int: 0 } },
    { id: 'merchant', name: '走鏢客', icon: '📦', desc: '替人走鏢送貨，帶回的紋銀最多。',
      weights: { grind: 2, train: 1, treasure: 1, quest: 6, rest: 1, social: 1 },
      alloc: { con: 2, str: 2, agi: 1, int: 0 } },
    { id: 'scholar',  name: '隱士',   icon: '📜', desc: '淡泊名利，卻常有意外的機緣。',
      weights: { grind: 2, train: 4, treasure: 2, quest: 1, rest: 2, social: 3 },
      alloc: { con: 1, str: 0, agi: 1, int: 3 } }
  ];

  /* ══════════════════════════════════════════════════════
     自動行動（label 中的 {place} 會替換成地圖名）
     ══════════════════════════════════════════════════════ */
  F.ACTIONS = [
    { id: 'grind',    name: '刷怪練功', icon: '🗡️', ticks: [3, 6], label: '在{place}刷怪' },
    { id: 'train',    name: '閉關修行', icon: '🧘', ticks: [4, 8], label: '在鎮上閉關修行' },
    { id: 'treasure', name: '尋寶打裝', icon: '🎁', ticks: [4, 8], label: '在{place}尋寶' },
    { id: 'quest',    name: '接單走鏢', icon: '📦', ticks: [3, 7], label: '替人走鏢送貨' },
    { id: 'rest',     name: '療傷休整', icon: '💊', ticks: [2, 4], label: '在客棧療傷休整' },
    { id: 'social',   name: '鎮上走動', icon: '🍵', ticks: [2, 5], label: '在鎮上與人攀談' }
  ];

  /* ══════════════════════════════════════════════════════
     好感等級（越高 → 光環越強、自動收益越高、同行更賣力）
     ══════════════════════════════════════════════════════ */
  F.FAVOR_TIERS = [
    { lv: 1, min: 0,   name: '點頭之交', icon: '🙂', color: '#94a3b8' },
    { lv: 2, min: 25,  name: '泛泛之交', icon: '😊', color: '#7dd3fc' },
    { lv: 3, min: 50,  name: '莫逆之交', icon: '🤝', color: '#6ee7b7' },
    { lv: 4, min: 75,  name: '生死之交', icon: '💖', color: '#fbbf24' },
    { lv: 5, min: 100, name: '刎頸之交', icon: '🔥', color: '#f472b6' }
  ];

  /* ══════════════════════════════════════════════════════
     自動行為開關的預設值與顯示名稱（UI 直接讀這份）
     ══════════════════════════════════════════════════════ */
  F.AUTO_KEYS = [
    { id: 'grind',    name: '自行刷怪', icon: '🗡️', desc: '好友會自己去找怪打，累積經驗與戰利品。' },
    { id: 'level',    name: '自行練等', icon: '📈', desc: '經驗滿了自動升級（上限 Lv.300）。' },
    { id: 'point',    name: '自動點潛能', icon: '🎯', desc: '升級拿到的 5 點潛能，依性格自動配到四維。' },
    { id: 'sect',     name: '自動入門派', icon: '⛩️', desc: '等級足夠時自行拜入十五大門派。' },
    { id: 'skill',    name: '自動學技能', icon: '📖', desc: '用自己賺的武學點數學外功招式並升招。' },
    { id: 'xinfa',    name: '自動修心法', icon: '🔥', desc: '自動修習內功心法並常駐最高階。' },
    { id: 'qinggong', name: '自動修身法', icon: '🍃', desc: '自動修習輕功身法並常駐最高階。' },
    { id: 'meridian', name: '自動通經脈', icon: '🧘', desc: '自動打通奇經十四脈。' },
    { id: 'equip',    name: '自動裝備',   icon: '⚙️', desc: '打到裝備後自動比較戰力換上，舊的回背包。' },
    { id: 'loot',     name: '自動拾取',   icon: '🎁', desc: '刷怪／尋寶會掉裝備與丹藥，丹藥直接送回你的行囊。' },
    { id: 'rest',     name: '自行療傷',   icon: '💊', desc: '負傷後會自己休養，痊癒再出江湖。' }
  ];

  /* ══════════════════════════════════════════════════════
     沒有公會系統（townGuildSystem.js 未載入）時的職業後備
     ══════════════════════════════════════════════════════ */
  F.ROLES_FALLBACK = {
    swordsman: { name: '劍客', icon: '🗡️', base: { con: 10, str: 12, agi: 12, int: 8 }, alloc: { con: 1, str: 2, agi: 2, int: 0 } },
    blade:     { name: '刀客', icon: '⚔️', base: { con: 12, str: 14, agi: 8,  int: 7 }, alloc: { con: 2, str: 3, agi: 0, int: 0 } },
    archer:    { name: '弓弩手', icon: '🏹', base: { con: 9, str: 12, agi: 14, int: 8 }, alloc: { con: 0, str: 2, agi: 3, int: 0 } },
    healer:    { name: '醫者', icon: '🌿', base: { con: 12, str: 8, agi: 9,  int: 14 }, alloc: { con: 2, str: 0, agi: 0, int: 3 } },
    sorcerer:  { name: '術士', icon: '🔮', base: { con: 10, str: 8, agi: 9,  int: 16 }, alloc: { con: 1, str: 0, agi: 0, int: 4 } },
    ranger:    { name: '遊俠', icon: '🧭', base: { con: 11, str: 11, agi: 11, int: 11 }, alloc: { con: 1, str: 1, agi: 1, int: 2 } }
  };

  /* ══════════════════════════════════════════════════════
     姓名池 / 頭像池（小鎮鎮民不足時，從江湖名人與此池抽樣）
     ══════════════════════════════════════════════════════ */
  F.NAMES = [
    '慕容飛雪', '獨孤求醉', '柳隨風', '花弄影', '秦少游', '陸小鳳', '葉孤城', '司空摘星',
    '任我行', '向問天', '曲洋', '劉正風', '傅紅雪', '卓東來', '白玉京', '燕南天',
    '沈浪', '王憐花', '李尋歡', '阿飛', '蘇蓉蓉', '宋甜兒', '鐵心蘭', '水靈光',
    '喬峰', '段譽', '虛竹', '鳩摩智', '王語嫣', '阿朱', '阿紫', '木婉清',
    '郭靖', '黃蓉', '楊過', '小龍女', '令狐沖', '任盈盈', '岳靈珊', '田伯光'
  ];
  F.ICONS = ['🧑', '👩', '🧔', '👨‍🦱', '🧑‍🦰', '👩‍🦱', '🧓', '👲', '🥷', '🧝', '🧑‍🎤', '👨‍🎓'];

  console.log('[friendData] ✓ 已載入（性格 ' + F.PERSONAS.length + '｜行動 ' + F.ACTIONS.length + '｜好感 ' + F.FAVOR_TIERS.length + ' 階）');
})();