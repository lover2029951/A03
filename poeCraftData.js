// js/poeCraftData.js  (v45)
// PoE 10 大通貨 / 前綴池 / 後綴池 / 瓦爾腐化詞綴
//
// v45 修正：
//   ⭐ 新增「8 種元素攻擊前綴」與「8 種元素防禦後綴」（程式化生成）
//   ⭐ 移除舊 flat_elematk / suffix_elemdef 通用單一元素詞綴
//   ⭐ flat_mp 前綴維持 v39 的 ÷6 政策
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    // ═══════ 1. 💎 PoE 十大經典通貨 ═══════
    Data.CURRENCIES = {
        orb_transmute: {
            id: 'orb_transmute', name: '蛻變石', tierLabel: '普通通貨', color: '#60a5fa', dropWeight: 100,
            desc: '將一件【普通(白裝)】升級為【魔法(藍裝)】，隨機賦予 1~2 條詞綴（最多1前1後）。'
        },
        orb_aug: {
            id: 'orb_aug', name: '增幅石', tierLabel: '普通通貨', color: '#60a5fa', dropWeight: 85,
            desc: '為詞綴未滿（僅1條詞綴）的【魔法(藍裝)】新增 1 條隨機前綴或後綴。'
        },
        orb_alt: {
            id: 'orb_alt', name: '改造石', tierLabel: '常用通貨', color: '#38bdf8', dropWeight: 75,
            desc: '重新隨機骰出一件【魔法(藍裝)】的詞綴（1~2 條詞綴，最多1前1後）。'
        },
        orb_scour: {
            id: 'orb_scour', name: '重鑄石', tierLabel: '進階通貨', color: '#cbd5e1', dropWeight: 45,
            desc: '移除裝備上的所有前綴與後綴，將【魔法/稀有裝備】洗白還原為【普通(白裝)】。'
        },
        orb_regal: {
            id: 'orb_regal', name: '富豪石', tierLabel: '稀有通貨', color: '#fbbf24', dropWeight: 28,
            desc: '將一件【魔法(藍裝)】升級為【稀有(黃裝)】，保留原有詞綴並額外新增 1 條新詞綴！'
        },
        orb_alch: {
            id: 'orb_alch', name: '點金石', tierLabel: '稀有通貨', color: '#fbbf24', dropWeight: 25,
            desc: '將一件【普通(白裝)】直接升級為【稀有(黃裝)】，隨機生成 4~6 條詞綴（最多3前3後）！'
        },
        orb_chaos: {
            id: 'orb_chaos', name: '混沌石 (C)', tierLabel: '高階通貨', color: '#f59e0b', dropWeight: 16,
            desc: '重新隨機骰出一件【稀有(黃裝)】的所有前後綴（隨機 4~6 條詞綴，最多3前3後）！'
        },
        orb_vaal: {
            id: 'orb_vaal', name: '瓦爾寶珠', tierLabel: '腐化通貨', color: '#dc2626', dropWeight: 10,
            desc: '不可預測地腐化一件裝備使其【已汙染】：機率獲得超強瓦爾基底詞綴，或全詞綴突變！'
        },
        orb_divine: {
            id: 'orb_divine', name: '神聖石 (Div)', tierLabel: '傳奇通貨', color: '#f43f5e', dropWeight: 3,
            desc: '【極度稀有】不改變裝備現有詞綴種類與階級(Tier)，將所有詞綴數值在該 Tier 範圍內重新隨機骰出！'
        },
        orb_exalt: {
            id: 'orb_exalt', name: '崇高石 (Ex)', tierLabel: '傳奇通貨', color: '#f97316', dropWeight: 2,
            desc: '【極度稀有】為詞綴未滿 6 條的【稀有(黃裝)】新增 1 條隨機前綴或後綴（最多3前3後）！'
        }
    };

    // ═══════ 2. 🗡️ PoE 裝備前綴庫（基礎 5 組）═══════
    Data.POE_PREFIXES = [
        {
            groupId: 'flat_atk', statKey: 'atk', label: '外功基礎攻擊', unit: '',
            tiers: [
                { tier: 5, tName: 'T5 磨利的', min: 8,   max: 18 },
                { tier: 4, tName: 'T4 鋒銳的', min: 22,  max: 45 },
                { tier: 3, tName: 'T3 削鐵的', min: 55,  max: 110 },
                { tier: 2, tName: 'T2 殘酷的', min: 130, max: 260 },
                { tier: 1, tName: 'T1 獨裁者的', min: 300, max: 600 }
            ]
        },
        {
            groupId: 'pct_atk_flat', statKey: 'atk', label: '宗師霸氣攻擊', unit: '',
            tiers: [
                { tier: 5, tName: 'T5 侍從的', min: 12,  max: 25 },
                { tier: 4, tName: 'T4 騎士的', min: 35,  max: 70 },
                { tier: 3, tName: 'T3 暴君的', min: 85,  max: 165 },
                { tier: 2, tName: 'T2 征服者的', min: 200, max: 380 },
                { tier: 1, tName: 'T1 帝王的', min: 450, max: 850 }
            ]
        },
        {
            groupId: 'flat_hp', statKey: 'maxHp', label: '最大氣血上限', unit: '',
            tiers: [
                { tier: 5, tName: 'T5 健康的', min: 50,   max: 110 },
                { tier: 4, tName: 'T4 健壯的', min: 140,  max: 280 },
                { tier: 3, tName: 'T3 強健的', min: 350,  max: 700 },
                { tier: 2, tName: 'T2 巨人的', min: 850,  max: 1600 },
                { tier: 1, tName: 'T1 不朽之體的', min: 2000, max: 4000 }
            ]
        },
        {
            groupId: 'flat_def', statKey: 'def', label: '護體罡氣防禦', unit: '',
            tiers: [
                { tier: 5, tName: 'T5 堅固的', min: 8,   max: 18 },
                { tier: 4, tName: 'T4 強化的', min: 24,  max: 48 },
                { tier: 3, tName: 'T3 鋼鐵的', min: 60,  max: 120 },
                { tier: 2, tName: 'T2 壁壘的', min: 150, max: 290 },
                { tier: 1, tName: 'T1 金剛不壞的', min: 340, max: 680 }
            ]
        },
        {
            groupId: 'flat_mp', statKey: 'maxMp', label: '丹田最大內力', unit: '',
            tiers: [
                { tier: 5, tName: 'T5 蔚藍的', min: 5,   max: 11 },
                { tier: 4, tName: 'T4 湛藍的', min: 13,  max: 27 },
                { tier: 3, tName: 'T3 深海的', min: 33,  max: 67 },
                { tier: 2, tName: 'T2 浩瀚的', min: 80,  max: 150 },
                { tier: 1, tName: 'T1 無量真元的', min: 183, max: 367 }
            ]
        }
    ];

    // ═══════ 3. 🎯 PoE 裝備後綴庫（基礎 5 組）═══════
    Data.POE_SUFFIXES = [
        {
            groupId: 'suffix_hit', statKey: 'hit', label: '精準命中率', unit: '%',
            tiers: [
                { tier: 5, tName: 'T5 穩健之', min: 2,  max: 4 },
                { tier: 4, tName: 'T4 精準之', min: 5,  max: 8 },
                { tier: 3, tName: 'T3 狙擊之', min: 9,  max: 13 },
                { tier: 2, tName: 'T2 鷹眼之', min: 14, max: 19 },
                { tier: 1, tName: 'T1 天眼必中之', min: 20, max: 28 }
            ]
        },
        {
            groupId: 'suffix_eva', statKey: 'eva', label: '輕功閃避率', unit: '%',
            tiers: [
                { tier: 5, tName: 'T5 靈巧之', min: 1,  max: 3 },
                { tier: 4, tName: 'T4 迷蹤之', min: 4,  max: 6 },
                { tier: 3, tName: 'T3 幻影之', min: 7,  max: 10 },
                { tier: 2, tName: 'T2 流雲之', min: 11, max: 15 },
                { tier: 1, tName: 'T1 虛空無影之', min: 16, max: 22 }
            ]
        },
        {
            groupId: 'suffix_crit', statKey: 'crit', label: '會心爆擊率', unit: '%',
            tiers: [
                { tier: 5, tName: 'T5 穿刺之', min: 1,  max: 3 },
                { tier: 4, tName: 'T4 撕裂之', min: 4,  max: 6 },
                { tier: 3, tName: 'T3 致命之', min: 7,  max: 10 },
                { tier: 2, tName: 'T2 毀滅之', min: 11, max: 15 },
                { tier: 1, tName: 'T1 破天誅仙之', min: 16, max: 22 }
            ]
        },
        {
            groupId: 'suffix_critres', statKey: 'critRes', label: '暴擊抵抗', unit: '%',
            tiers: [
                { tier: 5, tName: 'T5 堅韌之', min: 2,  max: 4 },
                { tier: 4, tName: 'T4 磐石之', min: 5,  max: 8 },
                { tier: 3, tName: 'T3 鎮嶽之', min: 9,  max: 13 },
                { tier: 2, tName: 'T2 不動之', min: 14, max: 19 },
                { tier: 1, tName: 'T1 萬劫不壞之', min: 20, max: 28 }
            ]
        },
        {
            groupId: 'suffix_hybrid_combat', statKey: 'atk', label: '後綴殺伐內勁 (攻擊)', unit: '',
            tiers: [
                { tier: 5, tName: 'T5 鬥士之', min: 10,  max: 22 },
                { tier: 4, tName: 'T4 狂戰之', min: 28,  max: 55 },
                { tier: 3, tName: 'T3 猛將之', min: 70,  max: 140 },
                { tier: 2, tName: 'T2 武神之', min: 160, max: 320 },
                { tier: 1, tName: 'T1 破碎無雙之', min: 360, max: 720 }
            ]
        }
    ];

    // ═══════ 4. 🎨 程式化生成「8 種元素攻擊前綴 + 8 種元素防禦後綴」═══════
    var elems = Data.ELEMENTS || {};
    var atkTiers = Data.ELEMENT_ATK_TIERS || [];
    var defTiers = Data.ELEMENT_DEF_TIERS || [];
    var atkPrefixes = [];
    var defSuffixes = [];

    Object.keys(elems).forEach(function (key) {
        var m = elems[key];

        // 元素攻擊（前綴）
        atkPrefixes.push({
            groupId: 'elAtk_' + key,
            statKey: 'elAtk_' + key,
            elementKey: key,
            label: m.name + '元素攻擊',
            unit: '',
            tiers: atkTiers.map(function (t) {
                return {
                    tier: t.tier,
                    tName: t.tName.replace('元素之', m.name + '元素之'),
                    min: t.min, max: t.max
                };
            })
        });

        // 元素防禦（後綴）
        defSuffixes.push({
            groupId: 'elDef_' + key,
            statKey: 'elDef_' + key,
            elementKey: key,
            label: m.name + '元素防禦',
            unit: '',
            tiers: defTiers.map(function (t) {
                return {
                    tier: t.tier,
                    tName: t.tName.replace('元素之', m.name + '元素之'),
                    min: t.min, max: t.max
                };
            })
        });
    });

    Data.POE_PREFIXES = Data.POE_PREFIXES.concat(atkPrefixes);
    Data.POE_SUFFIXES = Data.POE_SUFFIXES.concat(defSuffixes);

    // 供 UI 篩選 / 統計使用
    Data.POE_ELEMENT_ATK_GROUPS = atkPrefixes.map(function (p) { return p.groupId; });
    Data.POE_ELEMENT_DEF_GROUPS = defSuffixes.map(function (s) { return s.groupId; });

    // ═══════ 5. 🩸 瓦爾寶珠腐化專屬固定詞綴池 ═══════
    Data.VAAL_IMPLICITS = [
        { statKey: 'crit',      val: 12,   text: '🩸 瓦爾腐化基底：會心爆擊率 +12%' },
        { statKey: 'hit',       val: 18,   text: '🩸 瓦爾腐化基底：精準命中率 +18%' },
        { statKey: 'critRes',   val: 18,   text: '🩸 瓦爾腐化基底：暴擊抵抗 +18%' },
        { statKey: 'eva',       val: 12,   text: '🩸 瓦爾腐化基底：輕功閃避率 +12%' },
        { statKey: 'atk',       val: 350,  text: '🩸 瓦爾腐化基底：天魔腐化攻擊 +350' },
        { statKey: 'maxHp',     val: 1500, text: '🩸 瓦爾腐化基底：不死血氣上限 +1500' }
    ];

    // ═══════ 6. 稀有裝備隨機生成的 PoE 雙字頭銜庫 ═══════
    Data.POE_RARE_NAME_PREFIX = ['天魔', '破碎', '龍魂', '驚雁', '覆雨', '混沌', '太虛', '劫火', '星辰', '無上'];
    Data.POE_RARE_NAME_SUFFIX = ['狂嘯', '救贖', '裁決', '壁壘', '榮耀', '災厄', '神罰', '聖痕', '霸業', '輪迴'];
})();