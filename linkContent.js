// js/linkContent.js (v1)
// ⭐ 全系統自建內容（正本，不再是後備）
//    20 個系統的完整資料 + 互相關聯標記（synergy / tags）
//    任何項目都有 tags，供匯流排做交叉比對
//
// ⚠️ 載入順序：linkBus.js 之後、所有系統檔之前
window.HY = window.HY || {};

(function () {
  if (!window.HY.Link) { console.error('[linkContent] 找不到 HY.Link'); return; }

  var C = window.HY.LinkContent = window.HY.LinkContent || {};
  C.version = '1.0';

  /* ══════════════════════════════════════════════════════
     標籤體系（全遊戲共用，讓任何內容都能互相關聯）
     ══════════════════════════════════════════════════════ */
  C.TAGS = {
    // 屬性
    atk: '攻擊', def: '防禦', hp: '氣血', spd: '速度', crit: '爆擊', eva: '閃避',
    // 成長
    exp: '歷練', gold: '財富', drop: '戰利品', sp: '武學', fame: '名望',
    // 五行
    metal: '金', wood: '木', earth: '土', water: '水', fire: '火',
    // 場合
    battle: '戰鬥', expedition: '遠征', worldboss: '世界王', town: '小鎮',
    // 稀有度
    common: '常見', rare: '稀有', epic: '史詩', legend: '傳說',
    // 取得途徑
    drop_equip: '掉寶', craft: '工藝', market: '市集', quest: '任務'
  };

  /* ══════════════════════════════════════════════════════
     ① 陣法（8 種，含五行歸屬與互斥）
     ══════════════════════════════════════════════════════ */
  C.FORMATIONS = [
    { id: 'fm_heaven', name: '天罡北斗陣', icon: '☯️', tier: 2, reqLv: 1, element: 'metal',
      bonus: { atkPct: 0.06, defPct: 0.06, hpPct: 0.04 },
      tags: ['atk', 'def', 'hp', 'metal'],
      synergy: { with: ['spirit'], mul: 1.15, note: '與靈根相輔，加成提升 15%' },
      desc: '七星定位，攻守兼備。' },
    { id: 'fm_earth', name: '地煞玄龜陣', icon: '🐢', tier: 2, reqLv: 10, element: 'earth',
      bonus: { atkPct: 0.02, defPct: 0.10, hpPct: 0.08 },
      tags: ['def', 'hp', 'earth'],
      synergy: { with: ['pet'], mul: 1.10, note: '與寵物同陣，防禦再增' },
      desc: '玄武鎮守，堅不可破。' },
    { id: 'fm_fire', name: '烈焰焚天陣', icon: '🔥', tier: 3, reqLv: 20, element: 'fire',
      bonus: { atkPct: 0.12, defPct: 0.00, hpPct: 0.02 },
      tags: ['atk', 'fire'],
      synergy: { with: ['element'], mul: 1.20, note: '火屬性好友在陣中攻擊大幅提升' },
      desc: '焚盡一切，唯攻而已。' },
    { id: 'fm_water', name: '寒江瀲灩陣', icon: '💧', tier: 2, reqLv: 12, element: 'water',
      bonus: { atkPct: 0.04, defPct: 0.07, hpPct: 0.06, spMul: 0.06 },
      tags: ['def', 'hp', 'sp', 'water'],
      synergy: { with: ['mastery'], mul: 1.12, note: '精通成長加快' },
      desc: '綿密如網，以柔克剛。' },
    { id: 'fm_wind', name: '疾風迅雷陣', icon: '🍃', tier: 3, reqLv: 18, element: 'wood',
      bonus: { atkPct: 0.08, defPct: 0.03, hpPct: 0.02, atbMul: 0.12 },
      tags: ['atk', 'spd', 'wood'],
      synergy: { with: ['atb'], mul: 1.18, note: '速度加成疊加' },
      desc: '迅捷無倫，先發制人。' },
    { id: 'fm_mountain', name: '不動如山陣', icon: '⛰️', tier: 3, reqLv: 25, element: 'earth',
      bonus: { atkPct: 0.00, defPct: 0.14, hpPct: 0.14 },
      tags: ['def', 'hp', 'earth'],
      synergy: { with: ['guild'], mul: 1.10, note: '公會賓客防禦再增' },
      desc: '穩如山嶽，寸步不讓。' },
    { id: 'fm_cloud', name: '雲海縹緲陣', icon: '☁️', tier: 3, reqLv: 30, element: 'water',
      bonus: { atkPct: 0.05, defPct: 0.05, hpPct: 0.05, evaAdd: 6 },
      tags: ['eva', 'water'],
      synergy: { with: ['affix'], mul: 1.12, note: '對抗詞綴怪物更穩' },
      desc: '身影縹緲，難以捉摸。' },
    { id: 'fm_blood', name: '血戰八方陣', icon: '🩸', tier: 4, reqLv: 40, element: 'fire',
      bonus: { atkPct: 0.16, defPct: -0.04, hpPct: 0.06, critAdd: 4 },
      tags: ['atk', 'crit', 'fire'],
      synergy: { with: ['companion'], mul: 1.15, note: '有同伴時攻擊再增' },
      desc: '以血換命，破釜沉舟。' },
    { id: 'fm_dragon', name: '盤龍九霄陣', icon: '🐉', tier: 5, reqLv: 60, element: 'metal',
      bonus: { atkPct: 0.14, defPct: 0.10, hpPct: 0.10, atbMul: 0.08, critAdd: 3 },
      tags: ['atk', 'def', 'hp', 'spd', 'metal', 'legend'],
      synergy: { with: ['spirit', 'mastery'], mul: 1.25, note: '靈根與精通兼備時大放異彩' },
      desc: '九霄龍吟，萬法歸一。' },
    { id: 'fm_void', name: '太虛無相陣', icon: '🌌', tier: 5, reqLv: 80, element: 'water',
      bonus: { atkPct: 0.10, defPct: 0.10, hpPct: 0.12, evaAdd: 10, atbMul: 0.06 },
      tags: ['def', 'eva', 'spd', 'water', 'legend'],
      synergy: { with: ['element', 'affix'], mul: 1.20, note: '五行與詞綴對抗皆強化' },
      desc: '無相無形，萬法不侵。' }
  ];

  /* ══════════════════════════════════════════════════════
     ② 五行（含相剋 + 場所影響）
     ══════════════════════════════════════════════════════ */
  C.ELEMENTS = [
    { id: 'metal', name: '金', icon: '⚪', color: '#cbd5e1', beats: 'wood', losesTo: 'fire',
      tags: ['metal'], terrain: { 荒漠: 1.08, 礦山: 1.12, 森林: 0.94 },
      desc: '剛銳之氣，剋木。' },
    { id: 'wood', name: '木', icon: '🟢', color: '#6ee7b7', beats: 'earth', losesTo: 'metal',
      tags: ['wood'], terrain: { 森林: 1.12, 草原: 1.08, 荒漠: 0.94 },
      desc: '生生不息，剋土。' },
    { id: 'earth', name: '土', icon: '🟤', color: '#d6b98c', beats: 'water', losesTo: 'wood',
      tags: ['earth'], terrain: { 山嶺: 1.12, 荒漠: 1.08, 水域: 0.94 },
      desc: '厚德載物，剋水。' },
    { id: 'water', name: '水', icon: '🔵', color: '#7dd3fc', beats: 'fire', losesTo: 'earth',
      tags: ['water'], terrain: { 水域: 1.12, 冰原: 1.10, 山嶺: 0.94 },
      desc: '柔能克剛，剋火。' },
    { id: 'fire', name: '火', icon: '🔴', color: '#fca5a5', beats: 'metal', losesTo: 'water',
      tags: ['fire'], terrain: { 火山: 1.14, 荒漠: 1.08, 水域: 0.90 },
      desc: '焚盡萬物，剋金。' }
  ];

  /* ══════════════════════════════════════════════════════
     ③ 靈根（6 種，含隱藏雙修）
     ══════════════════════════════════════════════════════ */
  C.SPIRIT_ROOTS = [
    { id: 'sr_single', name: '單靈根', icon: '💎', weight: 3, statMul: 0.070, growthMul: 0.14,
      tags: ['rare'], desc: '天資卓絕，萬中無一。' },
    { id: 'sr_double', name: '雙靈根', icon: '💠', weight: 10, statMul: 0.045, growthMul: 0.08,
      tags: ['rare'], desc: '資質上乘，修行順遂。' },
    { id: 'sr_triple', name: '三靈根', icon: '🔷', weight: 22, statMul: 0.028, growthMul: 0.05,
      tags: ['common'], desc: '中上之資。' },
    { id: 'sr_quad',   name: '四靈根', icon: '🔹', weight: 30, statMul: 0.018, growthMul: 0.03,
      tags: ['common'], desc: '尋常資質。' },
    { id: 'sr_penta',  name: '五行靈根', icon: '🌀', weight: 28, statMul: 0.010, growthMul: 0.015,
      tags: ['common'], synergy: { with: ['element'], mul: 1.20, note: '五行兼備，五行加成提升' },
      desc: '雜而不純，然五行圓融。' },
    { id: 'sr_chaos',  name: '混沌靈根', icon: '🌌', weight: 2, statMul: 0.090, growthMul: 0.20,
      tags: ['legend'], synergy: { with: ['formation'], mul: 1.30, note: '與陣法共鳴，加成大幅提升' },
      desc: '傳說之資，百年難遇。' },
    { id: 'sr_void',   name: '虛靈根', icon: '👻', weight: 5, statMul: 0.055, growthMul: 0.11,
      tags: ['epic'], synergy: { with: ['mastery'], mul: 1.15, note: '精通習得加快' },
      desc: '若有若無，難以捉摸。' }
  ];

  /* ══════════════════════════════════════════════════════
     ④ 寵物（12 種，含五行、技能、進化）
     ══════════════════════════════════════════════════════ */
  C.PETS = [
    { id: 'pet_wolf',   name: '雪狼',   icon: '🐺', element: 'water', tier: 1, maxLv: 10,
      bonus: { atkPct: 0.04, atbMul: 0.04 }, tags: ['atk', 'spd', 'water'],
      evolveTo: 'pet_frostwolf', evolveLv: 8, skill: { name: '撕咬', mul: 1.15 },
      desc: '北地雪狼，迅捷兇猛。' },
    { id: 'pet_frostwolf', name: '霜牙狼王', icon: '🐺', element: 'water', tier: 3, maxLv: 15,
      bonus: { atkPct: 0.10, atbMul: 0.08, critAdd: 3 }, tags: ['atk', 'spd', 'crit', 'water', 'epic'],
      skill: { name: '霜牙噬', mul: 1.45 }, desc: '雪狼之王者，爪下無生。' },
    { id: 'pet_fox',    name: '火狐',   icon: '🦊', element: 'fire', tier: 1, maxLv: 10,
      bonus: { atkPct: 0.05, critAdd: 2 }, tags: ['atk', 'crit', 'fire'],
      evolveTo: 'pet_ninefox', evolveLv: 8, skill: { name: '狐火', mul: 1.20 },
      desc: '尾燃靈火，狡黠靈動。' },
    { id: 'pet_ninefox', name: '九尾天狐', icon: '🦊', element: 'fire', tier: 4, maxLv: 15,
      bonus: { atkPct: 0.13, critAdd: 6, spMul: 0.08 }, tags: ['atk', 'crit', 'sp', 'fire', 'legend'],
      skill: { name: '九尾焚天', mul: 1.60 }, desc: '九尾齊現，魅惑眾生。' },
    { id: 'pet_turtle', name: '玄龜',   icon: '🐢', element: 'earth', tier: 2, maxLv: 12,
      bonus: { defPct: 0.08, hpPct: 0.08 }, tags: ['def', 'hp', 'earth'],
      evolveTo: 'pet_dragonturtle', evolveLv: 10, skill: { name: '龜甲', mul: 0.85 },
      desc: '背負玄甲，堅不可摧。' },
    { id: 'pet_dragonturtle', name: '龍龜', icon: '🐢', element: 'earth', tier: 4, maxLv: 15,
      bonus: { defPct: 0.16, hpPct: 0.16 }, tags: ['def', 'hp', 'earth', 'epic'],
      skill: { name: '龍甲壁', mul: 0.70 }, desc: '龜龍合體，萬法不侵。' },
    { id: 'pet_crane',  name: '仙鶴',   icon: '🕊️', element: 'wood', tier: 2, maxLv: 12,
      bonus: { hpPct: 0.06, spMul: 0.10 }, tags: ['hp', 'sp', 'wood'],
      skill: { name: '鶴唳', mul: 1.10 }, desc: '羽翼輕靈，助人修行。' },
    { id: 'pet_tiger',  name: '白虎',   icon: '🐯', element: 'metal', tier: 3, maxLv: 14,
      bonus: { atkPct: 0.11, defPct: 0.04 }, tags: ['atk', 'def', 'metal', 'rare'],
      evolveTo: 'pet_whiteking', evolveLv: 12, skill: { name: '虎嘯', mul: 1.40 },
      desc: '西方神獸，殺伐果決。' },
    { id: 'pet_whiteking', name: '白虎戰神', icon: '🐯', element: 'metal', tier: 5, maxLv: 18,
      bonus: { atkPct: 0.18, defPct: 0.10, critAdd: 5 }, tags: ['atk', 'def', 'crit', 'metal', 'legend'],
      skill: { name: '白虎天罡', mul: 1.80 }, desc: '殺神降世，擋者披靡。' },
    { id: 'pet_crow',   name: '墨鴉',   icon: '🐦‍⬛', element: 'water', tier: 1, maxLv: 10,
      bonus: { dropMul: 0.08, goldMul: 0.06 }, tags: ['drop', 'gold', 'water'],
      skill: { name: '啄目', mul: 1.05 }, desc: '喜啄珍寶，尋寶好手。' },
    { id: 'pet_qilin',  name: '麒麟',   icon: '🦌', element: 'wood', tier: 5, maxLv: 18,
      bonus: { atkPct: 0.10, defPct: 0.10, hpPct: 0.10, expMul: 0.10 },
      tags: ['atk', 'def', 'hp', 'exp', 'wood', 'legend'],
      skill: { name: '祥瑞', mul: 1.25 }, desc: '祥瑞之獸，所至皆吉。' },
    { id: 'pet_dragon', name: '青龍',   icon: '🐉', element: 'wood', tier: 5, maxLv: 20,
      bonus: { atkPct: 0.16, hpPct: 0.12, atbMul: 0.10, spMul: 0.10 },
      tags: ['atk', 'hp', 'spd', 'sp', 'wood', 'legend'],
      synergy: { with: ['formation'], mul: 1.20, note: '與陣法共鳴' },
      skill: { name: '龍騰', mul: 1.75 }, desc: '東方神獸，呼風喚雨。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑤ 同伴職責（8 種）
     ══════════════════════════════════════════════════════ */
  C.COMPANION_ROLES = [
    { id: 'guard',    name: '護衛', icon: '🛡️', favorMin: 50, bonus: { defPct: 0.06, hpPct: 0.06 }, tags: ['def', 'hp'], desc: '提升防禦與氣血。' },
    { id: 'advisor',  name: '軍師', icon: '📜', favorMin: 60, bonus: { atkPct: 0.05, critAdd: 3 }, tags: ['atk', 'crit'], desc: '提升攻擊與爆擊。' },
    { id: 'healer',   name: '醫者', icon: '🌿', favorMin: 55, bonus: { hpPct: 0.10, healMul: 0.15 }, tags: ['hp'], desc: '提升氣血與治療效果。' },
    { id: 'scout',    name: '斥候', icon: '🧭', favorMin: 50, bonus: { evaAdd: 8, atbMul: 0.10 }, tags: ['eva', 'spd'], desc: '提升閃避與速度。' },
    { id: 'smith',    name: '匠師', icon: '🔨', favorMin: 65, bonus: { dropMul: 0.12, forgeMul: 0.15 }, tags: ['drop', 'craft'], desc: '提升戰利品與鍛造成功率。' },
    { id: 'merchant', name: '商賈', icon: '💰', favorMin: 60, bonus: { goldMul: 0.14 }, tags: ['gold'], desc: '提升紋銀收益。' },
    { id: 'scholar',  name: '文士', icon: '📚', favorMin: 70, bonus: { spMul: 0.15, expMul: 0.08 }, tags: ['sp', 'exp'], desc: '提升武學點數與歷練。' },
    { id: 'swordsage',name: '劍聖', icon: '🗡️', favorMin: 85, bonus: { atkPct: 0.10, critAdd: 5, critDmgAdd: 12 }, tags: ['atk', 'crit', 'epic'], desc: '大幅提升攻擊與爆擊傷害。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑥ 怪物詞綴（14 種，含互斥與反制）
     ══════════════════════════════════════════════════════ */
  C.AFFIXES = [
    { id: 'af_tough',   name: '堅韌', icon: '🛡️', kind: 'def',  mul: 0.20, counter: 'pierce',
      tags: ['def'], desc: '氣血與防禦大幅提升。' },
    { id: 'af_might',   name: '狂暴', icon: '💪', kind: 'atk',  mul: 0.22, counter: 'shield',
      tags: ['atk'], desc: '攻擊力大幅提升。' },
    { id: 'af_swift',   name: '迅捷', icon: '💨', kind: 'atb',  mul: 0.18, counter: 'slow',
      tags: ['spd'], desc: '出手速度加快。' },
    { id: 'af_regen',   name: '再生', icon: '💚', kind: 'regen', mul: 0.12, counter: 'burst',
      tags: ['hp'], desc: '每回合回復氣血。' },
    { id: 'af_shield',  name: '護盾', icon: '🔰', kind: 'shield', mul: 0.15, counter: 'pierce',
      tags: ['def'], desc: '開場獲得護盾。' },
    { id: 'af_curse',   name: '詛咒', icon: '☠️', kind: 'curse', mul: 0.10, counter: 'cleanse',
      tags: ['atk'], desc: '攻擊附帶減益。' },
    { id: 'af_ele',     name: '元素', icon: '🌈', kind: 'ele',   mul: 0.14, counter: 'resist',
      tags: ['atk'], desc: '攻擊附帶五行傷害。' },
    { id: 'af_lifesteal', name: '吸血', icon: '🧛', kind: 'ls', mul: 0.10, counter: 'burst',
      tags: ['hp'], desc: '造成傷害時回復氣血。' },
    { id: 'af_reflect', name: '反傷', icon: '🪞', kind: 'reflect', mul: 0.12, counter: 'heal',
      tags: ['def'], desc: '反彈部分傷害。' },
    { id: 'af_summon',  name: '召喚', icon: '🌀', kind: 'summon', mul: 0.15, counter: 'aoe',
      tags: ['summon'], desc: '戰鬥中召喚援軍。' },
    { id: 'af_thorns',  name: '荊棘', icon: '🌵', kind: 'thorns', mul: 0.08, counter: 'heal',
      tags: ['def'], desc: '近戰攻擊者受傷。' },
    { id: 'af_frenzy',  name: '狂亂', icon: '😵', kind: 'frenzy', mul: 0.16, counter: 'slow',
      tags: ['atk'], desc: '氣血越低攻擊越強。' },
    { id: 'af_ward',    name: '結界', icon: '🔮', kind: 'ward', mul: 0.18, counter: 'dispel',
      tags: ['def'], desc: '免疫部分負面效果。' },
    { id: 'af_venom',   name: '劇毒', icon: '🐍', kind: 'venom', mul: 0.11, counter: 'cleanse',
      tags: ['atk'], desc: '攻擊附帶持續傷害。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑦ 精通（16 種，分三系）
     ══════════════════════════════════════════════════════ */
  C.MASTERY = [
    { id: 'mk_atk1', name: '剛勁',   icon: '💪', tree: 'atk',  maxLv: 10, perLv: { atkPct: 0.008 }, tags: ['atk'], desc: '攻擊精通。' },
    { id: 'mk_atk2', name: '破甲',   icon: '🪓', tree: 'atk',  maxLv: 10, perLv: { pierce: 0.010 }, req: 'mk_atk1', reqLv: 3, tags: ['atk'], desc: '無視部分防禦。' },
    { id: 'mk_atk3', name: '致命',   icon: '🎯', tree: 'atk',  maxLv: 10, perLv: { critAdd: 0.6 }, req: 'mk_atk1', reqLv: 5, tags: ['crit'], desc: '爆擊率提升。' },
    { id: 'mk_atk4', name: '狂戰',   icon: '🔥', tree: 'atk',  maxLv: 5,  perLv: { critDmgAdd: 4 }, req: 'mk_atk3', reqLv: 5, tags: ['crit', 'epic'], desc: '爆擊傷害提升。' },
    { id: 'mk_def1', name: '鐵骨',   icon: '🦴', tree: 'def',  maxLv: 10, perLv: { defPct: 0.008 }, tags: ['def'], desc: '防禦精通。' },
    { id: 'mk_def2', name: '磐石',   icon: '🪨', tree: 'def',  maxLv: 10, perLv: { hpPct: 0.010 }, req: 'mk_def1', reqLv: 3, tags: ['hp'], desc: '氣血精通。' },
    { id: 'mk_def3', name: '格擋',   icon: '🛡️', tree: 'def',  maxLv: 10, perLv: { blockAdd: 0.8 }, req: 'mk_def1', reqLv: 5, tags: ['def'], desc: '格擋率提升。' },
    { id: 'mk_def4', name: '不屈',   icon: '⚔️', tree: 'def',  maxLv: 5,  perLv: { dmgReduce: 0.010 }, req: 'mk_def3', reqLv: 5, tags: ['def', 'epic'], desc: '傷害減免。' },
    { id: 'mk_spd1', name: '身法',   icon: '🍃', tree: 'spd',  maxLv: 10, perLv: { evaAdd: 0.8 }, tags: ['eva'], desc: '閃避精通。' },
    { id: 'mk_spd2', name: '疾行',   icon: '💨', tree: 'spd',  maxLv: 10, perLv: { atbMul: 0.008 }, req: 'mk_spd1', reqLv: 3, tags: ['spd'], desc: '速度精通。' },
    { id: 'mk_spd3', name: '連擊',   icon: '⚡', tree: 'spd',  maxLv: 10, perLv: { multiAdd: 0.006 }, req: 'mk_spd2', reqLv: 5, tags: ['spd'], desc: '連擊率提升。' },
    { id: 'mk_spd4', name: '殘影',   icon: '👤', tree: 'spd',  maxLv: 5,  perLv: { evaAdd: 1.6 }, req: 'mk_spd3', reqLv: 5, tags: ['eva', 'epic'], desc: '閃避大幅提升。' },
    { id: 'mk_life1', name: '養生',  icon: '🌿', tree: 'life', maxLv: 10, perLv: { expMul: 0.010 }, tags: ['exp'], desc: '歷練成長。' },
    { id: 'mk_life2', name: '聚財',  icon: '💰', tree: 'life', maxLv: 10, perLv: { goldMul: 0.012 }, req: 'mk_life1', reqLv: 3, tags: ['gold'], desc: '財富收益。' },
    { id: 'mk_life3', name: '拾遺',  icon: '🎁', tree: 'life', maxLv: 10, perLv: { dropMul: 0.010 }, req: 'mk_life1', reqLv: 3, tags: ['drop'], desc: '戰利品提升。' },
    { id: 'mk_life4', name: '悟道',  icon: '📖', tree: 'life', maxLv: 5,  perLv: { spMul: 0.020 }, req: 'mk_life2', reqLv: 5, tags: ['sp', 'epic'], desc: '武學點數提升。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑧ 公會建築（10 種，好友可享）
     ══════════════════════════════════════════════════════ */
  C.GUILD_BUILDINGS = [
    { id: 'gb_hall',   name: '議事大廳', icon: '🏛️', maxLv: 10, perLv: { guildExp: 5 },   tags: ['town'], desc: '提升公會經驗產出。' },
    { id: 'gb_armory', name: '兵器坊',   icon: '⚔️', maxLv: 10, perLv: { atkPct: 0.006 },  tags: ['atk'], desc: '提升成員攻擊。' },
    { id: 'gb_guard',  name: '護衛營',   icon: '🛡️', maxLv: 10, perLv: { defPct: 0.006 },  tags: ['def'], desc: '提升成員防禦。' },
    { id: 'gb_infirm', name: '醫館',     icon: '⛑️', maxLv: 10, perLv: { hpPct: 0.007 },   tags: ['hp'], desc: '提升成員氣血。' },
    { id: 'gb_lib',    name: '藏經閣',   icon: '📚', maxLv: 10, perLv: { spMul: 0.008 },   tags: ['sp'], desc: '提升武學點數。' },
    { id: 'gb_vault',  name: '金庫',     icon: '💰', maxLv: 10, perLv: { goldMul: 0.010 }, tags: ['gold'], desc: '提升紋銀收益。' },
    { id: 'gb_stable', name: '馬廄',     icon: '🐎', maxLv: 10, perLv: { atbMul: 0.006 },  tags: ['spd'], desc: '提升出手速度。' },
    { id: 'gb_tower',  name: '觀星塔',   icon: '🔭', maxLv: 10, perLv: { dropMul: 0.008 }, tags: ['drop'], desc: '提升戰利品。' },
    { id: 'gb_garden', name: '藥圃',     icon: '🌿', maxLv: 10, perLv: { expMul: 0.007 },  tags: ['exp'], desc: '提升歷練成長。' },
    { id: 'gb_forge',  name: '鍛造爐',   icon: '🔨', maxLv: 10, perLv: { forgeMul: 0.010 }, tags: ['craft'], desc: '提升鍛造成功率。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑨ 打撈海域（8 種，含五行與產出）
     ══════════════════════════════════════════════════════ */
  C.SALVAGE_ZONES = [
    { id: 'sz_shallow', name: '近海淺灘', icon: '🏖️', reqLv: 1,  element: 'water', dur: [8, 14],
      gold: [400, 1600],    mats: ['fish', 'silk'],           dropMul: 0.9,  tags: ['common'],
      desc: '風平浪靜，適合新手。' },
    { id: 'sz_reef',    name: '珊瑚暗礁', icon: '🪸', reqLv: 15, element: 'water', dur: [10, 18],
      gold: [1200, 4200],   mats: ['fish', 'jade', 'silk'],   dropMul: 1.0,  tags: ['common'],
      desc: '礁石密佈，暗藏珍寶。' },
    { id: 'sz_wreck',   name: '沉船遺骸', icon: '🚢', reqLv: 30, element: 'metal', dur: [12, 20],
      gold: [2800, 8600],   mats: ['iron', 'jade', 'ore'],    dropMul: 1.2,  tags: ['rare'],
      desc: '商船沉沒之處，鐵器遍布。' },
    { id: 'sz_abyss',   name: '深海裂谷', icon: '🌊', reqLv: 45, element: 'water', dur: [14, 24],
      gold: [5200, 15000],  mats: ['jade', 'ore', 'herb'],    dropMul: 1.4,  tags: ['rare'],
      desc: '深不見底，巨獸出沒。' },
    { id: 'sz_ice',     name: '極北冰海', icon: '🧊', reqLv: 60, element: 'water', dur: [16, 26],
      gold: [9000, 26000],  mats: ['jade', 'iron', 'herb'],   dropMul: 1.6,  tags: ['epic'],
      desc: '萬年寒冰之下，封印著上古之物。' },
    { id: 'sz_fire',    name: '熔岩海溝', icon: '🌋', reqLv: 75, element: 'fire', dur: [18, 28],
      gold: [16000, 42000], mats: ['ore', 'jade', 'iron'],    dropMul: 1.8,  tags: ['epic'],
      desc: '岩漿翻湧，火屬剋星。' },
    { id: 'sz_sky',     name: '雲海浮島', icon: '☁️', reqLv: 90, element: 'wood', dur: [20, 30],
      gold: [26000, 68000], mats: ['herb', 'silk', 'jade'],   dropMul: 2.0,  tags: ['legend'],
      desc: '雲端之上的失落文明。' },
    { id: 'sz_void',    name: '虛空裂隙', icon: '🌌', reqLv: 110, element: 'metal', dur: [22, 34],
      gold: [42000, 120000], mats: ['jade', 'ore', 'iron'],   dropMul: 2.4,  tags: ['legend'],
      desc: '空間破碎之地，無所不有。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑩ 時光時代（6 種，含產出傾向）
     ══════════════════════════════════════════════════════ */
  C.TT_ERAS = [
    { id: 'era_ancient', name: '上古洪荒', icon: '🦕', reqLv: 1,  dur: [12, 22],
      gold: [2000, 8000],  dropMul: 1.2, tags: ['common'], desc: '蠻荒之地，遍地機緣。' },
    { id: 'era_warring', name: '戰國爭雄', icon: '⚔️', reqLv: 20, dur: [14, 24],
      gold: [5000, 18000], dropMul: 1.4, tags: ['common'], desc: '諸侯征戰，兵甲如山。' },
    { id: 'era_prosper', name: '盛唐氣象', icon: '🏯', reqLv: 40, dur: [16, 26],
      gold: [12000, 38000], dropMul: 1.6, tags: ['rare'], desc: '萬國來朝，富甲天下。' },
    { id: 'era_immortal',name: '仙魔大戰', icon: '🔮', reqLv: 60, dur: [18, 28],
      gold: [26000, 72000], dropMul: 1.9, tags: ['epic'], desc: '仙魔交鋒，天地失色。' },
    { id: 'era_future',  name: '未來紀元', icon: '🤖', reqLv: 85, dur: [20, 30],
      gold: [52000, 140000], dropMul: 2.2, tags: ['legend'], desc: '科技昌明，異寶紛呈。' },
    { id: 'era_chaos',   name: '混沌初開', icon: '🌌', reqLv: 110, dur: [24, 36],
      gold: [96000, 260000], dropMul: 2.6, tags: ['legend'], desc: '天地未分，萬物之源。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑪ 賭局玩法（6 種）
     ══════════════════════════════════════════════════════ */
  C.GAMBLE_GAMES = [
    { id: 'gm_dice',  name: '擲骰',   icon: '🎲', min: 500,   max: 10000,  edge: 0.08, winChance: 0.46, tags: ['common'], desc: '比點數大小，最單純的玩法。' },
    { id: 'gm_coin',  name: '猜銅錢', icon: '🪙', min: 200,   max: 5000,   edge: 0.06, winChance: 0.48, tags: ['common'], desc: '猜正反，賠率 1.9。' },
    { id: 'gm_poker', name: '牌九',   icon: '🀄', min: 1000,  max: 30000,  edge: 0.10, winChance: 0.44, tags: ['rare'], desc: '看牌技，賠率 2.2。' },
    { id: 'gm_arena', name: '鬥雞',   icon: '🐓', min: 2000,  max: 50000,  edge: 0.12, winChance: 0.42, tags: ['rare'], desc: '押注鬥雞，賠率 2.4。' },
    { id: 'gm_duel',  name: '生死鬥', icon: '⚔️', min: 5000,  max: 100000, edge: 0.14, winChance: 0.40, tags: ['epic'], desc: '押注好友生死鬥，賠率 2.6。' },
    { id: 'gm_heaven',name: '天機盤', icon: '🌀', min: 10000, max: 200000, edge: 0.16, winChance: 0.38, tags: ['legend'], desc: '卜算天機，賠率 2.8。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑫ 離線掛機模式（6 種）
     ══════════════════════════════════════════════════════ */
  C.OFFLINE_MODES = [
    { id: 'om_grind',  name: '掛機刷怪', icon: '🗡️', eff: 0.55, tags: ['exp', 'drop'],
      out: { expMul: 1.0, goldMul: 0.6, dropMul: 0.7 }, desc: '離線時持續刷怪。' },
    { id: 'om_train',  name: '閉關修煉', icon: '🧘', eff: 0.50, tags: ['exp', 'sp'],
      out: { expMul: 1.3, spMul: 0.9, goldMul: 0.1 }, desc: '專注修行，經驗最多。' },
    { id: 'om_quest',  name: '接單走鏢', icon: '📦', eff: 0.60, tags: ['gold'],
      out: { expMul: 0.6, goldMul: 1.6, dropMul: 0.3 }, desc: '專注賺錢。' },
    { id: 'om_gather', name: '採集材料', icon: '⛏️', eff: 0.65, tags: ['drop', 'craft'],
      out: { expMul: 0.4, goldMul: 0.5, dropMul: 1.2, matMul: 1.5 }, desc: '專注採集材料。' },
    { id: 'om_guard',  name: '守衛小鎮', icon: '🛡️', eff: 0.45, tags: ['town'],
      out: { expMul: 0.5, goldMul: 0.8, orderMul: 1.0 }, desc: '提升小鎮治安。' },
    { id: 'om_balance',name: '均衡發展', icon: '⚖️', eff: 0.58, tags: ['exp', 'gold', 'drop'],
      out: { expMul: 0.9, goldMul: 0.9, dropMul: 0.9, spMul: 0.7 }, desc: '各方面均衡產出。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑬ ATB 速度公式參數
     ══════════════════════════════════════════════════════ */
  C.ATB = {
    BASE: 100,
    PER_AGI: 0.85,          // 每點身法
    PER_LV: 0.12,           // 每級
    PER_DEX: 0.60,          // 每點敏捷（若外部有）
    MAX_MUL: 3.0,
    MIN_MUL: 0.3,
    // 五行速度修正
    ELEMENT_MOD: { metal: 0.02, wood: 0.05, earth: -0.03, water: 0.01, fire: 0.03 },
    // 場合修正
    SCOPE_MOD: { expedition: 0.03, worldboss: -0.02, town: 0.00 }
  };

  /* ══════════════════════════════════════════════════════
     ⑭ 等級經驗曲線（可被外部覆寫）
     ══════════════════════════════════════════════════════ */
  C.LEVEL = {
    MAX: 300,
    A: 100, B: 1.85, C: 120,
    // 分段加成（高階更陡）
    SEGMENTS: [
      { to: 50,  mul: 1.00 },
      { to: 100, mul: 1.15 },
      { to: 200, mul: 1.35 },
      { to: 300, mul: 1.60 }
    ]
  };

  /* ══════════════════════════════════════════════════════
     ⑮ 敵方陣法（8 種，含破解法）
     ══════════════════════════════════════════════════════ */
  C.ENEMY_FORMATIONS = [
    { id: 'ef_snake',   name: '長蛇陣',   icon: '🐍', mul: 0.14, counter: 'aoe',      tags: ['common'], desc: '一線排開，怕範圍攻擊。' },
    { id: 'ef_wing',    name: '雁行陣',   icon: '🦆', mul: 0.16, counter: 'focus',    tags: ['common'], desc: '兩翼包抄，怕集中火力。' },
    { id: 'ef_square',  name: '方圓陣',   icon: '🔲', mul: 0.18, counter: 'pierce',   tags: ['rare'], desc: '四面固守，怕破甲。' },
    { id: 'ef_ring',    name: '圓環陣',   icon: '⭕', mul: 0.20, counter: 'burst',    tags: ['rare'], desc: '環環相扣，怕爆發。' },
    { id: 'ef_star',    name: '七星陣',   icon: '✨', mul: 0.22, counter: 'dispel',   tags: ['epic'], desc: '星光護體，怕驅散。' },
    { id: 'ef_chaos',   name: '混元陣',   icon: '🌀', mul: 0.26, counter: 'element',  tags: ['epic'], desc: '五行混雜，怕相剋。' },
    { id: 'ef_heaven',  name: '誅仙陣',   icon: '⚔️', mul: 0.30, counter: 'speed',    tags: ['legend'], desc: '殺氣沖天，怕速度壓制。' },
    { id: 'ef_void',    name: '虛空鎖陣', icon: '🌌', mul: 0.34, counter: 'all',      tags: ['legend'], desc: '空間封鎖，需全面實力。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑯ 名冊職能（8 種，決定好友轉名冊後的角色）
     ══════════════════════════════════════════════════════ */
  C.ROSTER_ROLES = [
    { id: 'rr_dps',    name: '主攻',   icon: '⚔️', bonus: { atkPct: 0.10 }, tags: ['atk'], desc: '專職輸出。' },
    { id: 'rr_tank',   name: '主坦',   icon: '🛡️', bonus: { defPct: 0.10, hpPct: 0.10 }, tags: ['def', 'hp'], desc: '專職承傷。' },
    { id: 'rr_support',name: '輔助',   icon: '🌿', bonus: { healMul: 0.20 }, tags: ['hp'], desc: '專職治療。' },
    { id: 'rr_control',name: '控制',   icon: '🌀', bonus: { ctrlAdd: 0.12 }, tags: ['ctrl'], desc: '專職控制。' },
    { id: 'rr_hybrid', name: '全能',   icon: '⚖️', bonus: { atkPct: 0.05, defPct: 0.05, hpPct: 0.05 }, tags: ['atk', 'def', 'hp'], desc: '各項均衡。' },
    { id: 'rr_scout',  name: '偵查',   icon: '🧭', bonus: { evaAdd: 8, atbMul: 0.10 }, tags: ['eva', 'spd'], desc: '高閃避高速。' },
    { id: 'rr_gather', name: '採集',   icon: '⛏️', bonus: { dropMul: 0.15, matMul: 0.20 }, tags: ['drop'], desc: '提升採集。' },
    { id: 'rr_merchant',name: '經商',  icon: '💰', bonus: { goldMul: 0.18 }, tags: ['gold'], desc: '提升收益。' }
  ];

  /* ══════════════════════════════════════════════════════
     ⑰ 交叉關聯表（系統 ↔ 系統）
     ══════════════════════════════════════════════════════ */
  C.SYNERGY_MAP = {
    formation:  ['spirit', 'element', 'pet', 'mastery', 'guild', 'affix'],
    spirit:     ['formation', 'mastery', 'element', 'exp'],
    element:    ['formation', 'affix', 'salvage', 'spirit'],
    pet:        ['formation', 'companion', 'exp', 'drop'],
    companion:  ['pet', 'formation', 'atk', 'gold'],
    affix:      ['element', 'formation', 'drop', 'mastery'],
    guild:      ['formation', 'town', 'gold', 'sp'],
    sect:       ['mastery', 'formation', 'sp'],
    market:     ['craft', 'drop', 'gold', 'ware'],
    craft:      ['market', 'affix', 'drop', 'smith'],
    salvage:    ['element', 'drop', 'gold', 'exp'],
    mastery:    ['spirit', 'formation', 'affix', 'sp'],
    atb:        ['formation', 'mastery', 'spd'],
    enemyfm:    ['affix', 'formation', 'element'],
    timetravel: ['salvage', 'exp', 'gold', 'drop'],
    gamble:     ['gold', 'companion', 'fame'],
    lottery:    ['friend', 'gold', 'fame'],
    roster:     ['friend', 'party', 'char'],
    offline:    ['exp', 'gold', 'drop', 'town'],
    level:      ['exp', 'offline', 'mastery']
  };

  /* ══════════════════════════════════════════════════════
     查詢 API
     ══════════════════════════════════════════════════════ */
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function byTag(list, tag) {
    return list.filter(function (x) { return (x.tags || []).indexOf(tag) !== -1; });
  }
  function roll(list, lv, field) {
    var pool = list.filter(function (x) { return num(x.reqLv, 0) <= num(lv, 0); });
    if (!pool.length) pool = list.slice();
    var tot = 0, i;
    for (i = 0; i < pool.length; i++) tot += num(pool[i].weight, 10);
    var r = Math.random() * tot, acc = 0;
    for (i = 0; i < pool.length; i++) { acc += num(pool[i].weight, 10); if (r <= acc) return pool[i]; }
    return pool[0] || null;
  }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }

  C.get = byId;
  C.tagged = byTag;
  C.roll = roll;
  C.synergyOf = function (id) { return C.SYNERGY_MAP[id] || []; };

  console.log('[LinkContent] ✓ 已載入（陣法 ' + C.FORMATIONS.length + '｜五行 ' + C.ELEMENTS.length +
    '｜靈根 ' + C.SPIRIT_ROOTS.length + '｜寵物 ' + C.PETS.length + '｜同伴 ' + C.COMPANION_ROLES.length +
    '｜詞綴 ' + C.AFFIXES.length + '｜精通 ' + C.MASTERY.length + '｜建築 ' + C.GUILD_BUILDINGS.length +
    '｜海域 ' + C.SALVAGE_ZONES.length + '｜時代 ' + C.TT_ERAS.length + '｜賭局 ' + C.GAMBLE_GAMES.length +
    '｜離線 ' + C.OFFLINE_MODES.length + '｜敵陣 ' + C.ENEMY_FORMATIONS.length + '｜名冊職能 ' + C.ROSTER_ROLES.length + '）');
})();