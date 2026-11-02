// js/elementData.js  (v47)
// 金木水火土冰風雷 八大元素系統核心資料
//
// v47 修正：
//   ⭐ 術語統一：元素「防禦」→ 元素「抗性」
//   ⭐ 新增 atkLabel / resLabel 供 UI 直接取用
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    // ══════ 相剋環（依序相剋）══════
    // 金→木→土→水→火→冰→風→雷→金
    Data.ELEMENT_RING = ['metal', 'wood', 'earth', 'water', 'fire', 'ice', 'wind', 'lightning'];

    // ══════ 八大元素定義 ══════
    Data.ELEMENTS = {
        metal: {
            id: 'metal', name: '金', fullName: '金元素', shortName: '金',
            icon: '⚙️', color: '#fbbf24',
            counters: 'wood', generates: 'water',
            atkLabel: '金元素攻擊', resLabel: '金元素抗性',
            atkDesc: '庚金銳氣', resDesc: '金剛不壞'
        },
        wood: {
            id: 'wood', name: '木', fullName: '木元素', shortName: '木',
            icon: '🌿', color: '#4ade80',
            counters: 'earth', generates: 'fire',
            atkLabel: '木元素攻擊', resLabel: '木元素抗性',
            atkDesc: '乙木纏繞', resDesc: '青木護體'
        },
        water: {
            id: 'water', name: '水', fullName: '水元素', shortName: '水',
            icon: '💧', color: '#38bdf8',
            counters: 'fire', generates: 'wood',
            atkLabel: '水元素攻擊', resLabel: '水元素抗性',
            atkDesc: '壬水寒潮', resDesc: '玄水化勁'
        },
        fire: {
            id: 'fire', name: '火', fullName: '火元素', shortName: '火',
            icon: '🔥', color: '#ef4444',
            counters: 'ice', generates: 'earth',
            atkLabel: '火元素攻擊', resLabel: '火元素抗性',
            atkDesc: '丙火焚天', resDesc: '離火護身'
        },
        earth: {
            id: 'earth', name: '土', fullName: '土元素', shortName: '土',
            icon: '🪨', color: '#d97706',
            counters: 'water', generates: 'metal',
            atkLabel: '土元素攻擊', resLabel: '土元素抗性',
            atkDesc: '戊土厚壓', resDesc: '厚土壁壘'
        },
        ice: {
            id: 'ice', name: '冰', fullName: '冰元素', shortName: '冰',
            icon: '❄️', color: '#67e8f9',
            counters: 'wind', generates: 'water',
            atkLabel: '冰元素攻擊', resLabel: '冰元素抗性',
            atkDesc: '極寒冰封', resDesc: '冰晶鎧甲'
        },
        wind: {
            id: 'wind', name: '風', fullName: '風元素', shortName: '風',
            icon: '🌪️', color: '#2dd4bf',
            counters: 'lightning', generates: 'lightning',
            atkLabel: '風元素攻擊', resLabel: '風元素抗性',
            atkDesc: '罡風裂空', resDesc: '御風卸力'
        },
        lightning: {
            id: 'lightning', name: '雷', fullName: '雷元素', shortName: '雷',
            icon: '⚡', color: '#c084fc',
            counters: 'metal', generates: 'fire',
            atkLabel: '雷元素攻擊', resLabel: '雷元素抗性',
            atkDesc: '九霄紫雷', resDesc: '雷罡護體'
        }
    };

    Data.ELEMENT_KEYS = Data.ELEMENT_RING.slice();

    // ══════ 元素戰鬥規則（可調）══════
    Data.ELEMENT_RULES = {
        counterMult: 1.35,
        resistedMult: 0.80,
        neutralMult: 1.00,
        defFactor: 0.65,
        minElemDamage: 1,
        enemyElemAtkRatio: 0.10,
        enemyElemDefRatio: 0.06,
        maxElemDamagePctOfMaxHp: 0.25
    };

    // ══════ 元素攻擊 / 抗性的平衡基準（T5→T1）══════
    Data.ELEMENT_ATK_TIERS = [
        { tier: 5, tName: 'T5 蘊元素之', min: 6,   max: 12 },
        { tier: 4, tName: 'T4 聚元素之', min: 16,  max: 32 },
        { tier: 3, tName: 'T3 顯元素之', min: 40,  max: 80 },
        { tier: 2, tName: 'T2 天象元素之', min: 90,  max: 180 },
        { tier: 1, tName: 'T1 法則元素之', min: 200, max: 400 }
    ];

    Data.ELEMENT_DEF_TIERS = [
        { tier: 5, tName: 'T5 避元素之', min: 5,   max: 11 },
        { tier: 4, tName: 'T4 禦元素之', min: 14,  max: 28 },
        { tier: 3, tName: 'T3 鎮元素之', min: 35,  max: 70 },
        { tier: 2, tName: 'T2 破妄元素之', min: 85,  max: 165 },
        { tier: 1, tName: 'T1 萬法不侵元素之', min: 190, max: 380 }
    ];

    // ══════ 統一術語表（供 UI 使用）══════
    Data.ELEMENT_TERMS = {
        atkSuffix: '攻',
        resSuffix: '抗',
        atkTitle: '八元素攻擊',
        resTitle: '八元素抗性',
        counterText: '剋制 +35%',
        resistedText: '被剋 -20%'
    };
})();