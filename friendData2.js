// js/friendData2.js (v1)
// ⭐ 好友系統 v2：資料層（出團副本／排行榜／羈絆／稱號／任務／書信／對話／比武大會）
// ⚠️ 載入順序：friendData.js 之後、所有 friendXxxSystem.js 之前
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendData2] 找不到 HY.Data.TOWN'); return; }
  var F = T.FRIEND = T.FRIEND || {};

  /* ══════════════════════════════════════════════════════
     CONFIG2 —— v2 全部可調參數
     ══════════════════════════════════════════════════════ */
  F.CONFIG2 = {
    // ── 出團遠征 ──
    EXP_TEAM_MIN: 3,
    EXP_TEAM_MAX: 5,
    EXP_MAX_ACTIVE: 2,          // 同時最多幾團在跑
    EXP_AUTO_INTERVAL: 12,      // 每 N 期嘗試自動組隊出團
    EXP_REWARD_EXP: 0.10,       // 每層給「自身升級所需經驗」的比例（再乘副本係數）
    EXP_REWARD_GOLD: 1.0,
    EXP_SYNERGY_MAX: 1.45,
    EXP_SYNERGY_MIN: 0.70,
    EXP_FAVOR_GAIN: 3,
    EXP_CHEM_GAIN: 8,
    EXP_DROP_CHANCE: 0.50,      // 每層每位成員掉裝機率
    EXP_LOOT_TO_PLAYER: 0.35,   // 每層有機率直接把戰利品送回玩家行囊
    EXP_INJURY_TICKS: [3, 7],
    EXP_BOX_GOLD_MUL: 1.0,

    // ── 合擊技 ──
    COMBO_SP_COST: 30,
    COMBO_COOLDOWN: 30,         // 冷卻幾期
    COMBO_TICKS: 8,             // 持續幾期

    // ── 比武大會 ──
    TOURNEY_INTERVAL: 40,
    TOURNEY_SIZE: 8,
    TOURNEY_MIN: 4,
    TOURNEY_CHAMP_GOLD: 8000,
    TOURNEY_RUNNER_GOLD: 3000,
    TOURNEY_BET_MIN: 200,
    TOURNEY_BET_MAX: 20000,
    TOURNEY_ODDS_MIN: 1.2,
    TOURNEY_ODDS_MAX: 8.0,

    // ── 互助任務 ──
    QUEST_INTERVAL: 10,
    QUEST_MAX: 3,
    QUEST_DURATION: [4, 10],
    QUEST_GOLD_MUL: 1.0,
    QUEST_FAVOR: 6,
    QUEST_EXP_MUL: 0.25,

    // ── 江湖求救 ──
    RESCUE_CHANCE: 0.010,       // 每期每位好友的機率
    RESCUE_WINDOW: 10,          // 幾期內要處理
    RESCUE_WIN_FAVOR: 15,
    RESCUE_FAIL_FAVOR: -14,
    RESCUE_WIN_GOLD: 2500,
    RESCUE_SELF_BONUS: 0.10,    // 親自前往的成功率加成
    RESCUE_FRIEND_BONUS: 0.06,  // 派好友前往的成功率加成

    // ── 書信 ──
    MAIL_MAX: 40,
    MAIL_INTERVAL: 18,
    MAIL_GIFT_CHANCE: 0.55,
    MAIL_REPLY_FAVOR: 3,

    // ── 羈絆 ──
    BOND_AUTO_CHANCE: 0.045,    // 好友之間自動結交的機率
    BOND_MAX_PER_FRIEND: 4,
    BOND_LV_MAX: 5,
    BOND_LV_UP_CHANCE: 0.10,
    BOND_LV_UP_FAVOR: 2,
    BOND_BREAK_FAVOR: -20,
    BOND_MUTUAL_FAVOR: 45,      // 自動結交門檻

    // ── 稱號 ──
    TITLE_INTERVAL: 5,
    TITLE_BONUS_CAP: 0.60,

    // ── 來訪 ──
    VISIT_CHANCE: 0.018,
    VISIT_TICKS: 8,
    VISIT_APPEAL: 8,
    VISIT_INCOME: 0.02,

    // ── 名宿退隱 ──
    RETIRE_ENABLED: true,
    RETIRE_AT_LV: 150,
    RETIRE_AT_TICKS: 1200,
    RETIRE_INHERIT: 0.50,       // 弟子繼承比例
    RETIRE_LEGACY_BONUS: 0.02,  // 每位名宿給小鎮的被動加成

    // ── 排行榜 / 賽季 ──
    RANK_INCLUDE_CELEB: false,  // 是否把江湖名人也拉進榜
    RANK_CELEB_TOP: 15,
    RANK_SNAPSHOT_INTERVAL: 10,
    SEASON_TICKS: 200,
    SEASON_TOP_GOLD: [20000, 10000, 5000],
    SEASON_TITLE: 't_season',

    // ── 對話 ──
    CHAT_INTERVAL: 4
  };

  /* ══════════════════════════════════════════════════════
     副本：難度以 reqLv 判定（不依賴絕對戰力數值，避免版本改動走鐘）
     ══════════════════════════════════════════════════════ */
  F.DUNGEONS = [
    { id: 'dz_road',   name: '官道劫匪',   icon: '🛤️', reqLv: 1,   stages: 3, tier: 1, boss: '獨眼狼王',   place: '揚州城郊外',
      mobs: ['山賊', '匪兵', '野狼'],       gold: 500,   expMul: 1.00, dropMul: 0.9 },
    { id: 'dz_bandit', name: '黑風寨',     icon: '🏯', reqLv: 10,  stages: 4, tier: 2, boss: '黑風寨主',   place: '黑風山',
      mobs: ['黑風嘍囉', '弩手', '寨中悍匪'], gold: 1200,  expMul: 1.15, dropMul: 1.0 },
    { id: 'dz_cave',   name: '幽冥洞窟',   icon: '🕳️', reqLv: 25,  stages: 4, tier: 3, boss: '幽冥老祖',   place: '幽冥谷',
      mobs: ['遊魂', '鬼卒', '陰煞'],        gold: 2600,  expMul: 1.30, dropMul: 1.1 },
    { id: 'dz_tomb',   name: '古墓祕境',   icon: '⚰️', reqLv: 40,  stages: 5, tier: 4, boss: '古墓守靈人', place: '終南山',
      mobs: ['屍傀', '玉蜂', '墓道傀儡'],    gold: 5200,  expMul: 1.45, dropMul: 1.2 },
    { id: 'dz_cliff',  name: '斷崖絕谷',   icon: '⛰️', reqLv: 60,  stages: 5, tier: 5, boss: '絕谷刀魔',   place: '斷崖絕谷',
      mobs: ['刀奴', '崖上悍客', '刀傀'],    gold: 9800,  expMul: 1.60, dropMul: 1.3 },
    { id: 'dz_desert', name: '塞外荒漠',   icon: '🏜️', reqLv: 80,  stages: 6, tier: 6, boss: '沙盜首領',   place: '塞外草原',
      mobs: ['沙盜', '駱駝騎兵', '沙蟲'],    gold: 18000, expMul: 1.75, dropMul: 1.4 },
    { id: 'dz_ice',    name: '寒冰祕宮',   icon: '❄️', reqLv: 100, stages: 6, tier: 7, boss: '冰魄宮主',   place: '極北冰原',
      mobs: ['冰魔', '寒鐵衛', '霜魂'],      gold: 33000, expMul: 1.90, dropMul: 1.5 },
    { id: 'dz_abyss',  name: '無間深淵',   icon: '🔥', reqLv: 140, stages: 7, tier: 8, boss: '無間魔尊',   place: '無間深淵',
      mobs: ['魔卒', '血修', '深淵使徒'],    gold: 62000, expMul: 2.10, dropMul: 1.7 },
    { id: 'dz_sky',    name: '九天劍塚',   icon: '⚔️', reqLv: 180, stages: 8, tier: 9, boss: '劍塚主人',   place: '九天之上',
      mobs: ['劍奴', '劍塚守衛', '萬劍殘魂'], gold: 120000, expMul: 2.35, dropMul: 2.0 }
  ];

  /* ══════════════════════════════════════════════════════
     遭遇事件文字
     ══════════════════════════════════════════════════════ */
  F.EXP_EVENTS = {
    mob:   ['遭遇{mob}×{n}', '一群{mob}擋住去路', '{mob}自暗處殺出'],
    elite: ['遇上精英{mob}', '{mob}首領率眾而來', '一隊精銳{mob}結陣以待'],
    boss:  ['最終頭目【{boss}】現身！'],
    trap:  ['誤觸機關，毒箭四射', '腳下石磚崩陷'],
    chest: ['暗處發現一只寶箱'],
    aid:   ['路遇同道仗義相助']
  };
  F.ROLE_ACT = {
    tank: ['挺身格擋', '以體魄硬撼', '穩住陣腳'],
    heal: ['施術療傷', '以內息續命', '運功護住眾人'],
    dps:  ['一刀斬落首級', '掌力貫敵', '正面硬撼'],
    agi:  ['身法如風繞後', '劍走偏鋒', '搶先一擊']
  };

  /* ══════════════════════════════════════════════════════
     排行榜
     ══════════════════════════════════════════════════════ */
  F.RANK_BOARDS = [
    { id: 'power',  name: '戰力榜', icon: '⚔️', key: 'power',  desc: '綜合攻擊、防禦、氣血與裝備的總戰力。' },
    { id: 'level',  name: '等級榜', icon: '📈', key: 'lv',     desc: '修為境界的高低。' },
    { id: 'kill',   name: '擊殺榜', icon: '🗡️', key: 'kills',  desc: '累計斬殺江湖惡徒的數量。' },
    { id: 'wealth', name: '財富榜', icon: '💰', key: 'goldEarned', desc: '帶回小鎮的紋銀總額。' },
    { id: 'clear',  name: '出團榜', icon: '🏰', key: 'clears', desc: '成功打通副本的次數。' },
    { id: 'favor',  name: '情義榜', icon: '💞', key: 'favor',  desc: '與你的交情深淺。' },
    { id: 'fame',   name: '威望榜', icon: '🎖️', key: 'fame',   desc: '綜合等級、戰力、功績與稱號的江湖名望。' }
  ];

  /* ══════════════════════════════════════════════════════
     羈絆
     ══════════════════════════════════════════════════════ */
  F.BOND_TYPES = [
    { id: 'sworn',  name: '結拜', icon: '🩸', minFavor: 75,  maxPer: 3, self: true,
      color: '#fbbf24', desc: '歃血為盟，義同生死。全隊攻防提升。',
      bonus: { atkPct: 0.03, defPct: 0.03, hpPct: 0.02, perLv: 0.01 } },
    { id: 'master', name: '師徒', icon: '📜', minFavor: 50,  maxPer: 2, self: true,
      color: '#a78bfa', desc: '傳功授業，薪火相傳。徒弟修煉加速，師傅得名望。',
      bonus: { atkPct: 0.02, defPct: 0.02, hpPct: 0.03, perLv: 0.012 } },
    { id: 'lover',  name: '道侶', icon: '💞', minFavor: 100, maxPer: 1, self: true,
      color: '#f472b6', desc: '雙修同行，心意相通。全屬性大幅提升。',
      bonus: { atkPct: 0.05, defPct: 0.05, hpPct: 0.06, perLv: 0.018 } }
  ];

  /* ══════════════════════════════════════════════════════
     稱號（cond 任一達成即授予；bonus 加總有上限）
     ══════════════════════════════════════════════════════ */
  F.TITLES = [
    { id: 't_newbie',  name: '初出茅廬', icon: '🌱', rank: 1, cond: { lv: 1 },     bonus: { fame: 20 },  desc: '剛踏入江湖。' },
    { id: 't_sword',   name: '劍術好手', icon: '🗡️', rank: 1, cond: { kills: 50 }, bonus: { atkPct: 0.02, fame: 60 }, desc: '斬殺五十名惡徒。' },
    { id: 't_slayer',  name: '斬妖除魔', icon: '⚔️', rank: 2, cond: { kills: 300 }, bonus: { atkPct: 0.04, fame: 200 }, desc: '斬殺三百名惡徒。' },
    { id: 't_swordS',  name: '劍聖',     icon: '🏹', rank: 3, cond: { kills: 1000 }, bonus: { atkPct: 0.07, fame: 600 }, desc: '斬殺千名惡徒，劍法通神。' },
    { id: 't_rich',    name: '小有積蓄', icon: '💰', rank: 1, cond: { goldEarned: 20000 },  bonus: { fame: 80 }, desc: '帶回兩萬兩紋銀。' },
    { id: 't_richS',   name: '富甲一方', icon: '💎', rank: 3, cond: { goldEarned: 500000 }, bonus: { fame: 700 }, desc: '帶回五十萬兩紋銀。' },
    { id: 't_loot',    name: '尋寶高手', icon: '🎁', rank: 2, cond: { drops: 100 }, bonus: { atkPct: 0.02, fame: 220 }, desc: '拾得百件戰利品。' },
    { id: 't_gear',    name: '全身神裝', icon: '⚙️', rank: 3, cond: { equips: 80 }, bonus: { defPct: 0.06, fame: 500 }, desc: '自行換裝八十件。' },
    { id: 't_dz',      name: '副本常客', icon: '🏰', rank: 2, cond: { clears: 10 }, bonus: { hpPct: 0.03, fame: 300 }, desc: '通關副本十次。' },
    { id: 't_dzS',     name: '遠征統帥', icon: '🎖️', rank: 3, cond: { clears: 60 }, bonus: { atkPct: 0.05, defPct: 0.05, fame: 900 }, desc: '通關副本六十次。' },
    { id: 't_sect',    name: '名門正派', icon: '⛩️', rank: 1, cond: { sectJoins: 1 }, bonus: { fame: 90 }, desc: '拜入名門。' },
    { id: 't_bond',    name: '廣結善緣', icon: '🤝', rank: 2, cond: { bondCount: 2 }, bonus: { hpPct: 0.03, fame: 260 }, desc: '結下兩段羈絆。' },
    { id: 't_lover',   name: '神仙眷侶', icon: '💞', rank: 3, cond: { hasBond: 'lover' }, bonus: { atkPct: 0.04, hpPct: 0.04, fame: 620 }, desc: '結為道侶。' },
    { id: 't_champ',   name: '武林盟主', icon: '👑', rank: 3, cond: { tourneyWins: 1 }, bonus: { atkPct: 0.08, defPct: 0.05, fame: 1000 }, desc: '奪得比武大會冠軍。' },
    { id: 't_vet',     name: '江湖老手', icon: '🧓', rank: 2, cond: { activeTicks: 300 }, bonus: { defPct: 0.03, fame: 240 }, desc: '行走江湖三百期。' },
    { id: 't_master',  name: '一代宗師', icon: '📖', rank: 3, cond: { skillsLearned: 12 }, bonus: { atkPct: 0.05, hpPct: 0.03, fame: 640 }, desc: '自學十二式絕學。' },
    { id: 't_meridian',name: '通玄之體', icon: '🧘', rank: 3, cond: { meridianCount: 14 }, bonus: { hpPct: 0.07, defPct: 0.03, fame: 720 }, desc: '奇經十四脈盡通。' },
    { id: 't_rescue',  name: '義薄雲天', icon: '🛡️', rank: 3, cond: { rescues: 3 }, bonus: { defPct: 0.05, hpPct: 0.04, fame: 580 }, desc: '三度出手救人於危難。' },
    { id: 't_season',  name: '賽季魁首', icon: '🏅', rank: 3, cond: {}, bonus: { fame: 1500 }, desc: '賽季結算第一名（僅授予）。' },
    { id: 't_retire',  name: '名宿',     icon: '🏮', rank: 3, cond: {}, bonus: { fame: 800 }, desc: '功成身退（僅授予）。' }
  ];

  /* ══════════════════════════════════════════════════════
     合擊技（依羈絆解鎖，一次性全隊大絕）
     ══════════════════════════════════════════════════════ */
  F.COMBOS = [
    { id: 'c_sworn',  name: '義結金蘭', icon: '🩸', bond: 'sworn',  need: 1,
      atkPct: 0.18, defPct: 0.18, hpPct: 0.10, ticks: 8, sp: 30, desc: '結拜手足齊心，全隊攻防大增。' },
    { id: 'c_lover',  name: '雙劍合璧', icon: '💞', bond: 'lover',  need: 1,
      atkPct: 0.28, defPct: 0.12, hpPct: 0.14, ticks: 8, sp: 30, desc: '道侶心意相通，攻勢凌厲。' },
    { id: 'c_master', name: '薪火相傳', icon: '📜', bond: 'master', need: 1,
      atkPct: 0.14, defPct: 0.20, hpPct: 0.18, ticks: 8, sp: 30, desc: '師徒合力，防禦與氣血大增。' },
    { id: 'c_tri',    name: '五虎斷門', icon: '🔥', bond: null,     need: 3,
      atkPct: 0.34, defPct: 0.20, hpPct: 0.18, ticks: 10, sp: 45, desc: '三名以上好友同行，合擊之勢無可阻擋。' }
  ];

  /* ══════════════════════════════════════════════════════
     互助任務
     ══════════════════════════════════════════════════════ */
  F.QUEST_TEMPLATES = [
    { id: 'q_herb',   type: '尋藥', icon: '🌿', title: '{name}託你尋一味藥',
      desc: '閉關走火，急需「千年靈芝」調息。', gold: 800,  favor: 6, expMul: 0.22 },
    { id: 'q_letter', type: '送信', icon: '✉️', title: '{name}託你送一封書信',
      desc: '有一封要緊書信，須親手交到同道手上。', gold: 500,  favor: 4, expMul: 0.16 },
    { id: 'q_guard',  type: '護送', icon: '🛡️', title: '{name}請你護送一程',
      desc: '押送一批貨物，路上多山賊。', gold: 2200, favor: 8, expMul: 0.30 },
    { id: 'q_fight',  type: '助拳', icon: '⚔️', title: '{name}請你助拳一場',
      desc: '與人相約比武，需人壯聲勢。', gold: 1600, favor: 7, expMul: 0.34 },
    { id: 'q_find',   type: '尋人', icon: '🔍', title: '{name}託你尋訪一人',
      desc: '失散多年的舊識，聽說在附近落腳。', gold: 1100, favor: 5, expMul: 0.26 },
    { id: 'q_build',  type: '修屋', icon: '🔨', title: '{name}請你幫忙修葺居所',
      desc: '屋頂被風雨掀了，一個人忙不過來。', gold: 700,  favor: 4, expMul: 0.18 },
    { id: 'q_mine',   type: '採礦', icon: '⛏️', title: '{name}邀你同去採礦',
      desc: '山中發現一條礦脈，需要人手。', gold: 1900, favor: 6, expMul: 0.28 }
  ];

  /* ══════════════════════════════════════════════════════
     求救事件
     ══════════════════════════════════════════════════════ */
  F.RESCUE_TEMPLATES = [
    { id: 'r_siege', name: '遭人圍攻', icon: '🗡️', desc: '在{place}遭仇家埋伏圍攻，形勢危急！' },
    { id: 'r_poison', name: '身中奇毒', icon: '☠️', desc: '在{place}中了奇毒，內息紊亂！' },
    { id: 'r_trap',  name: '陷入陣法', icon: '🌀', desc: '誤入{place}的古陣，走不出來！' },
    { id: 'r_beast', name: '遇上凶獸', icon: '🐉', desc: '在{place}撞上凶獸，招架不住！' },
    { id: 'r_debt',  name: '被扣為質', icon: '⛓️', desc: '在{place}被人扣住，索要贖金！' }
  ];

  /* ══════════════════════════════════════════════════════
     來訪
     ══════════════════════════════════════════════════════ */
  F.VISIT_TEMPLATES = [
    { id: 'v_wine',  name: '帶酒來訪', icon: '🍶', desc: '提了兩罈好酒上門。' },
    { id: 'v_tea',   name: '品茶論道', icon: '🍵', desc: '坐了一下午，與鎮民論道。' },
    { id: 'v_trade', name: '順道販貨', icon: '🛒', desc: '順路帶了些貨物來賣。' },
    { id: 'v_help',  name: '幫忙修繕', icon: '🔨', desc: '挽起袖子幫鎮民修屋。' },
    { id: 'v_teach', name: '指點後輩', icon: '📖', desc: '在鎮上指點年輕人武藝。' }
  ];

  /* ══════════════════════════════════════════════════════
     退隱稱號
     ══════════════════════════════════════════════════════ */
  F.RETIRE_TITLES = ['一代宗師', '劍道宗師', '隱世高人', '江湖名宿', '武林耆宿', '世外高人'];

  /* ══════════════════════════════════════════════════════
     書信模板
     ══════════════════════════════════════════════════════ */
  F.MAIL_TEMPLATES = [
    { id: 'm_greet',  subject: '{name}的問候',    body: '別來無恙？近來江湖多事，你也要保重。附上薄禮，不成敬意。' },
    { id: 'm_lvup',   subject: '{name}報喜',      body: '托你的福，我近日又有突破。這點心意，權當謝禮。' },
    { id: 'm_loot',   subject: '{name}寄來戰利品', body: '打怪時多撿了一件，想來你合用，便寄來了。' },
    { id: 'm_thanks', subject: '{name}拜謝',      body: '日前蒙你出手相救，此恩銘記於心。' },
    { id: 'm_invite', subject: '{name}邀你同行',  body: '下回遠征，可願與我同隊？' },
    { id: 'm_report', subject: '{name}的行蹤',    body: '近來我在江湖上走了幾趟，一切安好，勿念。' },
    { id: 'm_season', subject: '賽季結算',        body: '本季江湖論武已畢，這是屬於你的那份。' }
  ];

  /* ══════════════════════════════════════════════════════
     專屬對話（依情境抽樣）
     ══════════════════════════════════════════════════════ */
  F.LINES = {
    grind:    ['再讓我多打兩隻。', '這批雜魚太嫩了。', '殺到手都酸了。', '這一帶的怪，我熟。'],
    train:    ['別吵，我在緊要關頭。', '這一關卡了很久。', '再給我三天，必有所成。', '內息總算順了。'],
    treasure: ['這地方藏著好東西。', '尋寶比打架有意思。', '又挖到一件。', '別聲張，好東西要低調。'],
    quest:    ['這趟鏢不能誤。', '走鏢雖苦，銀兩實在。', '路上小心些。', '貨到付款，天經地義。'],
    rest:     ['讓我歇一歇。', '這傷不礙事。', '酒錢記你帳上。', '養好了再出去。'],
    social:   ['鎮上的茶不錯。', '聽了些江湖傳聞。', '與人攀談，總有收穫。', '這裡熱鬧。'],
    injured:  ['……讓我靜一靜。', '痛。', '這仇我記下了。', '下回不犯這錯。'],
    following:['你說打誰？', '我跟著你。', '別拖後腿就行。', '你我聯手，誰人能擋？'],
    lowFavor: ['我們還沒那麼熟。', '有事說事。', '……嗯。'],
    highFavor:['你的事就是我的事。', '但憑吩咐。', '這輩子認你這個朋友。', '有難同當。'],
    expedition:['出發！', '這副本我熟門熟路。', '跟上，別掉隊。', '今日必破此關。'],
    retired:  ['老了，讓年輕人去吧。', '江湖是你們的了。', '茶涼了，也該歇了。']
  };

  console.log('[friendData2] ✓ 已載入（副本 ' + F.DUNGEONS.length + '｜榜單 ' + F.RANK_BOARDS.length +
    '｜羈絆 ' + F.BOND_TYPES.length + '｜稱號 ' + F.TITLES.length + '｜合擊 ' + F.COMBOS.length + '）');

  window.HY.FriendData2 = {
    version: '1.0',
    dungeons: F.DUNGEONS.length,
    boards: F.RANK_BOARDS.length,
    bonds: F.BOND_TYPES.length,
    titles: F.TITLES.length
  };
})();