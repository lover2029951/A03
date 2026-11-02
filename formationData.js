// js/formationData.js  (v52)
// 修仙十五大陣法 + 靈根需求樣式池 + 種子式隨機分配
//
// v52 修正：
//   ⭐ 每個陣法新增 effectDesc（自然語言效果描述）與 origin（典籍出處）
//      —— 考據：《封神演義》《射雕》《神雕》《八陣圖法》道教四象/八卦/九宮/北斗
//   ⭐ 平衡驗證：需求越大 → 效果越強（下品 < 中品 < 上品）
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    var Data = window.HY.Data;

    // ══════════════════════════════════════════════
    // ① 需求樣式池（依規模分三階；同階內隨機打亂配對）
    // ══════════════════════════════════════════════
    Data.FORMATION_PATTERNS = {
        tier1: [
            { id: 'pat3_a', req: { metal: 1, wood: 1, water: 1 } },
            { id: 'pat3_b', req: { fire: 1, earth: 1, ice: 1 } },
            { id: 'pat3_c', req: { lightning: 1, wind: 1, metal: 1 } },
            { id: 'pat3_d', req: { wood: 1, fire: 1, lightning: 1 } },
            { id: 'pat3_e', req: { water: 1, ice: 1, wind: 1 } },
            { id: 'pat3_f', req: { earth: 1, metal: 1, fire: 1 } },
            { id: 'pat3_g', req: { ice: 1, lightning: 1, water: 1 } },
            { id: 'pat3_h', req: { wind: 1, wood: 1, earth: 1 } }
        ],
        tier2: [
            { id: 'pat4_a', req: { ice: 2, lightning: 1, wood: 1 } },
            { id: 'pat4_b', req: { fire: 2, ice: 1, wind: 1 } },
            { id: 'pat4_c', req: { earth: 2, metal: 1, water: 1 } },
            { id: 'pat4_d', req: { wood: 2, water: 1, fire: 1 } },
            { id: 'pat4_e', req: { lightning: 2, wind: 1, ice: 1 } },
            { id: 'pat4_f', req: { wind: 2, earth: 1, metal: 1 } },
            { id: 'pat4_g', req: { water: 2, fire: 1, lightning: 1 } },
            { id: 'pat4_h', req: { metal: 2, ice: 1, wood: 1 } }
        ],
        tier3: [
            { id: 'pat5_a', req: { ice: 2, lightning: 1, wood: 1, water: 1 } },
            { id: 'pat5_b', req: { metal: 1, wood: 1, water: 1, fire: 1, earth: 1 } },
            { id: 'pat5_c', req: { fire: 2, wind: 1, ice: 1, lightning: 1 } },
            { id: 'pat5_d', req: { earth: 2, metal: 1, water: 1, wood: 1 } },
            { id: 'pat5_e', req: { lightning: 2, fire: 1, earth: 1, wind: 1 } },
            { id: 'pat5_f', req: { wind: 2, water: 1, ice: 1, metal: 1 } },
            { id: 'pat5_g', req: { wood: 2, fire: 1, lightning: 1, earth: 1 } },
            { id: 'pat5_h', req: { water: 2, ice: 1, wind: 1, metal: 1 } }
        ]
    };

    // ══════════════════════════════════════════════
    // ② 修仙十五大陣法（tier 1=下品 2=中品 3=上品）
    // ══════════════════════════════════════════════
    Data.XIANXIA_FORMATIONS = [
        // ═══════════ 下品（需求 3 靈根）═══════════
        {
            id: 'fx_taiji', tier: 1, name: '太極兩儀陣', icon: '☯️', color: '#38bdf8',
            origin: '《易》「太極生兩儀，兩儀生四象」',
            desc: '兩儀相生，剛柔互濟。',
            effectDesc: '引太極生兩儀之理，全隊攻守均衡提升，命中與閃避並進，無明顯短板。',
            bonus: { atkPct: 0.08, defPct: 0.10, hitPct: 0.06, evaPct: 0.06 }
        },
        {
            id: 'fx_wood_long', tier: 1, name: '乙木長生陣', icon: '🌿', color: '#4ade80',
            origin: '道教青帝乙木生機之說',
            desc: '青帝生機籠罩全隊，氣血內力綿長不絕。',
            effectDesc: '乙木青帝生機灌注全隊，氣血與內力上限大幅提升，木氣滋養兼增抗打之力。',
            bonus: { maxHpPct: 0.12, maxMpPct: 0.10, critResPct: 0.06, elAtkPct: { wood: 0.10 } }
        },
        {
            id: 'fx_tortoise', tier: 1, name: '玄武鎮嶽陣', icon: '🐢', color: '#d97706',
            origin: '道教四象．北方玄武「能柔能剛，養育萬物」',
            desc: '北方玄武龜蛇之形，盤遊九地，不動如山。',
            effectDesc: '玄武盤踞、穩如鎮嶽，全隊防禦與氣血大增，並直接削減承受傷害。',
            bonus: { defPct: 0.14, maxHpPct: 0.10, dmgReduceFlat: 5 }
        },
        {
            id: 'fx_metal_guard', tier: 1, name: '金罡護體陣', icon: '⚙️', color: '#fbbf24',
            origin: '道教四象．西方白虎「威攝禽獸，嘯動山川」',
            desc: '庚金罡氣覆體，出招斷金、護體如鐵。',
            effectDesc: '白虎庚金罡氣加身，出手凌厲斷金、護體如鐵，攻防並重。',
            bonus: { atkPct: 0.10, critPct: 0.06, defPct: 0.06, elAtkPct: { metal: 0.10 } }
        },
        {
            id: 'fx_flow', tier: 1, name: '流水行雲陣', icon: '💧', color: '#38bdf8',
            origin: '《道德經》「上善若水」',
            desc: '上善若水，身形如雲，來去無蹤。',
            effectDesc: '如水之行、如雲之變，全隊內力綿長、身形難以捉摸，水系抗性特強。',
            bonus: { maxMpPct: 0.14, evaPct: 0.08, critResPct: 0.06, elDefPct: { water: 0.10 } }
        },

        // ═══════════ 中品（需求 4 靈根）═══════════
        {
            id: 'fx_four_beasts', tier: 2, name: '四象誅邪陣', icon: '🐉', color: '#f43f5e',
            origin: '《禮記．曲禮》「前朱鳥而後玄武，左青龍而右白虎」',
            desc: '青龍、白虎、朱雀、玄武各據一方，誅邪破軍。',
            effectDesc: '四象神獸各守一方、合力誅邪，全隊攻勢破軍、會心威力大增。',
            bonus: { atkPct: 0.14, critPct: 0.08, hitPct: 0.08, critDmgPct: 0.10 }
        },
        {
            id: 'fx_ice_seal', tier: 2, name: '玄冰封天陣', icon: '❄️', color: '#67e8f9',
            origin: '北方至寒之氣．玄冰封鎖',
            desc: '萬里冰封鎖敵，寒氣凝鎧護身。',
            effectDesc: '極寒鎖敵、萬里冰封，同時凝結玄冰鎧甲護身，冰元素攻防俱強。',
            bonus: { defPct: 0.14, critResPct: 0.10, elAtkPct: { ice: 0.12 }, elDefPct: { ice: 0.18 } }
        },
        {
            id: 'fx_gale', tier: 2, name: '罡風萬里陣', icon: '🌪️', color: '#2dd4bf',
            origin: '八卦．巽為風．罡風疾走',
            desc: '罡風疾走、瞬息千里，敵難捉摸。',
            effectDesc: '巽風疾走，全隊出手更快更準、身形飄忽難以命中，風元素攻擊大增。',
            bonus: { evaPct: 0.14, hitPct: 0.10, atkPct: 0.10, elAtkPct: { wind: 0.10 } }
        },
        {
            id: 'fx_purgatory', tier: 2, name: '業火焚天陣', icon: '🔥', color: '#ef4444',
            origin: '道教四象．南方朱雀屬火．離火焚天',
            desc: '業火燎原、一念焚盡。',
            effectDesc: '業火燎原、一念焚盡，火元素傷害暴漲，最適合純攻伐的隊伍。',
            bonus: { atkPct: 0.16, critPct: 0.10, elAtkPct: { fire: 0.20 } }
        },
        {
            id: 'fx_earth_bear', tier: 2, name: '厚土載物陣', icon: '🪨', color: '#d97706',
            origin: '《易》坤卦「地勢坤，君子以厚德載物」',
            desc: '坤厚載物、厚德不移。',
            effectDesc: '坤厚載物、厚德不移，大地承載萬擊而不傾，防禦與減傷冠絕諸陣。',
            bonus: { defPct: 0.18, maxHpPct: 0.14, dmgReduceFlat: 6, elDefPct: { earth: 0.12 } }
        },

        // ═══════════ 上品（需求 5 靈根）═══════════
        {
            id: 'fx_big_dipper', tier: 3, name: '七星北斗陣', icon: '⭐', color: '#fbbf24',
            origin: '全真教王重陽所創「天罡北斗陣」：全真七子掌力相連，擊首則尾應',
            desc: '引北斗七星之力，斗柄指處、擊首則尾應。',
            effectDesc: '引北斗七星之力，斗柄指處鋒芒無儔；掌力相連、擊首則尾應，全隊攻勢連綿不絕。',
            bonus: { atkPct: 0.18, critPct: 0.10, critDmgPct: 0.15, hitPct: 0.10 }
        },
        {
            id: 'fx_bagua', tier: 3, name: '八卦乾坤陣', icon: '☰', color: '#a78bfa',
            origin: '《八陣圖法》八門「休生傷杜景死驚開」，道教「借煞制煞、化煞為權」',
            desc: '乾坤八卦運轉，借煞制煞、萬法不侵。',
            effectDesc: '乾坤八卦運轉，借煞制煞、化煞為權，八門生剋自成一界，萬法不侵。',
            bonus: { defPct: 0.18, critResPct: 0.12, dmgReduceFlat: 8, maxHpPct: 0.12 }
        },
        {
            id: 'fx_nine_palace', tier: 3, name: '九宮天罡陣', icon: '🎴', color: '#c084fc',
            origin: '九宮者乾坎艮震中巽離坤兌，「橫豎斜三數合之為十五，暗合天數」',
            desc: '九宮層疊、縱橫斜皆合天數。',
            effectDesc: '九宮層疊、縱橫斜皆合天數，攻守氣內俱臻化境，是攻守最均的全能陣。',
            bonus: { atkPct: 0.16, defPct: 0.16, maxHpPct: 0.12, maxMpPct: 0.12 }
        },
        {
            id: 'fx_immortal_slay', tier: 3, name: '誅仙劍陣', icon: '🗡️', color: '#f87171',
            origin: '《封神演義》截教通天教主「誅仙陣」，核心誅仙四劍列正東南西北',
            desc: '誅仙四劍分列正東南西北，四劍齊出、仙神辟易。',
            effectDesc: '誅仙四劍分列正東南西北，戮仙、陷仙、絕仙齊出，仙神辟易，金雷雙屬破甲誅心。',
            bonus: { atkPct: 0.22, critPct: 0.14, critDmgPct: 0.12, elAtkPct: { metal: 0.15, lightning: 0.15 } }
        },
        {
            id: 'fx_chaos', tier: 3, name: '混沌歸元陣', icon: '🌌', color: '#94a3b8',
            origin: '道家「混沌未分，萬象歸元」之宇宙本源',
            desc: '混沌未分、萬象歸元，五行八荒皆為我用。',
            effectDesc: '混沌未分、萬象歸元，攻守氣血俱增，八元素攻防同步提升，最適合元素混編隊伍。',
            bonus: {
                atkPct: 0.14, defPct: 0.14, maxHpPct: 0.12,
                critResPct: 0.10, elAtkAllPct: 0.12, elDefAllPct: 0.12
            }
        }
    ];

    // ══════════════════════════════════════════════
    // ③ 階級標籤
    // ══════════════════════════════════════════════
    Data.FORMATION_TIER_LABEL = {
        1: { name: '下品陣法', reqSize: 3, color: '#60a5fa' },
        2: { name: '中品陣法', reqSize: 4, color: '#a78bfa' },
        3: { name: '上品陣法', reqSize: 5, color: '#fbbf24' }
    };

    // ══════════════════════════════════════════════
    // ④ 效果欄位中文標籤
    // ══════════════════════════════════════════════
    Data.FORMATION_BONUS_LABEL = {
        atkPct: '攻擊', defPct: '防禦',
        maxHpPct: '氣血上限', maxMpPct: '內力上限',
        hitPct: '命中', evaPct: '閃避',
        critPct: '會心', critResPct: '暴抗',
        critDmgPct: '會心傷害'
    };

    // ══════════════════════════════════════════════
    // ⑤ 種子式 PRNG（mulberry32）
    // ══════════════════════════════════════════════
    Data.mulberry32 = function (a) {
        return function () {
            a |= 0;
            a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    };

    // ══════════════════════════════════════════════
    // ⑥ 依種子產生「陣法 → 需求樣式」對應表（同階內打亂）
    // ══════════════════════════════════════════════
    Data.buildFormationAssignment = function (seed) {
        var rnd = Data.mulberry32(seed || 1);
        var result = {};

        function shuffle(arr) {
            for (var i = arr.length - 1; i > 0; i--) {
                var j = Math.floor(rnd() * (i + 1));
                var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
            }
            return arr;
        }

        [1, 2, 3].forEach(function (tier) {
            var forms = Data.XIANXIA_FORMATIONS.filter(function (f) { return f.tier === tier; });
            var pats = (Data.FORMATION_PATTERNS['tier' + tier] || []).slice();
            shuffle(pats);
            forms.forEach(function (f, i) {
                result[f.id] = pats[i % pats.length];
            });
        });

        return result;
    };

    // ══════════════════════════════════════════════
    // ⑦ 多重集合包含判定
    // ══════════════════════════════════════════════
    Data.canSatisfyPattern = function (req, rootCounts) {
        if (!req) return true;
        for (var k in req) {
            if (!Object.prototype.hasOwnProperty.call(req, k)) continue;
            if ((rootCounts[k] || 0) < req[k]) return false;
        }
        return true;
    };

    Data.getMissingFromPattern = function (req, rootCounts) {
        var miss = [];
        for (var k in req) {
            if (!Object.prototype.hasOwnProperty.call(req, k)) continue;
            var need = req[k] - (rootCounts[k] || 0);
            if (need > 0) miss.push({ element: k, need: need, have: rootCounts[k] || 0 });
        }
        return miss;
    };

    // ══════════════════════════════════════════════
    // ⑧ 需求樣式轉文字（如「2冰 1雷 1木 1水」）
    // ══════════════════════════════════════════════
    Data.formatPatternReq = function (req) {
        if (!req) return '無限制';
        var D = window.HY.Data;
        var order = (D && D.ELEMENT_RING) ? D.ELEMENT_RING : Object.keys(req);
        var parts = [];
        order.forEach(function (k) {
            if (!req[k]) return;
            var m = (D.ELEMENTS && D.ELEMENTS[k]) ? D.ELEMENTS[k] : null;
            parts.push(req[k] + (m ? m.name : k));
        });
        return parts.join(' ') || '無限制';
    };

    // ══════════════════════════════════════════════
    // ⑨ 加成轉文字（供 UI／日誌共用）
    // ══════════════════════════════════════════════
    Data.formatFormationBonus = function (bonus) {
        if (!bonus) return '';
        var D = window.HY.Data;
        var out = [];

        Object.keys(D.FORMATION_BONUS_LABEL || {}).forEach(function (k) {
            if (bonus[k]) out.push(D.FORMATION_BONUS_LABEL[k] + ' +' + Math.round(bonus[k] * 100) + '%');
        });
        if (bonus.dmgReduceFlat) out.push('減傷 +' + bonus.dmgReduceFlat + '%');
        if (bonus.elAtkAllPct) out.push('全元素攻擊 +' + Math.round(bonus.elAtkAllPct * 100) + '%');
        if (bonus.elDefAllPct) out.push('全元素抗性 +' + Math.round(bonus.elDefAllPct * 100) + '%');
        if (bonus.elAtkPct) {
            Object.keys(bonus.elAtkPct).forEach(function (k) {
                var m = D.ELEMENTS && D.ELEMENTS[k];
                out.push((m ? m.icon + m.name : k) + '元素攻擊 +' + Math.round(bonus.elAtkPct[k] * 100) + '%');
            });
        }
        if (bonus.elDefPct) {
            Object.keys(bonus.elDefPct).forEach(function (k) {
                var m = D.ELEMENTS && D.ELEMENTS[k];
                out.push((m ? m.icon + m.name : k) + '元素抗性 +' + Math.round(bonus.elDefPct[k] * 100) + '%');
            });
        }
        return out.join('、');
    };
})();