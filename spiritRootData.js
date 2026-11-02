// js/spiritRootData.js  (v48)
// 八大靈根（金、木、水、火、土、冰、雷、風）
//
// v48 修正（收尾整理）：
//   ⭐ 新增 triggerChance 欄位（各靈根神通觸發機率，與 triggerDesc 同源）
//   ⭐ 新增 defenseTriggerChance（土靈根受擊觸發【戊土不動壁壘】用）
//   ⭐ 修正文案：移除與實作不符的倍率數字（1.35倍/1.55倍）與
//      土靈根「減免 15% 承受傷害」（實作為回復 4% 氣血 + 反震）
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    var Data = window.HY.Data;

    if (!Data) {
        console.error('[spiritRootData] window.HY.Data 不存在，載入中止');
        return;
    }

    var ROOTS = {
        // ⚙️ 金靈根
        metal: {
            id: 'metal', elementKey: 'metal',
            name: '金靈根', shortName: '金', icon: '⚙️', color: '#fbbf24',
            counters: 'wood', generates: 'water',
            passiveDesc: '每級靈根提升：金元素攻擊 +35、金元素抗性 +20、基礎攻擊 +25、會心爆擊 +1%',
            triggerName: '庚金破甲劍氣',
            triggerChance: 0.28,
            triggerDesc: '攻擊時有 28% 機率觸發【庚金破甲劍氣】，無視目標防禦追加額外金元素攻擊傷害！',
            passiveBonus: { elAtk: { metal: 35 }, elDef: { metal: 20 }, atk: 25, crit: 1 }
        },
        // 🌿 木靈根
        wood: {
            id: 'wood', elementKey: 'wood',
            name: '木靈根', shortName: '木', icon: '🌿', color: '#4ade80',
            counters: 'earth', generates: 'fire',
            passiveDesc: '每級靈根提升：木元素攻擊 +28、木元素抗性 +24、土元素抗性 +10、最大氣血 +280、暴擊抵抗 +1.5%',
            triggerName: '乙木青帝生機',
            triggerChance: 0.30,
            triggerDesc: '出招時有 30% 機率觸發【乙木青帝生機】，為我方全體隊員回復 6% 最大氣血！',
            passiveBonus: { elAtk: { wood: 28 }, elDef: { wood: 24, earth: 10 }, maxHp: 280, critRes: 1.5 }
        },
        // 💧 水靈根
        water: {
            id: 'water', elementKey: 'water',
            name: '水靈根', shortName: '水', icon: '💧', color: '#38bdf8',
            counters: 'fire', generates: 'wood',
            passiveDesc: '每級靈根提升：水元素攻擊 +30、水元素抗性 +24、最大內力 +25、輕功閃避 +1%',
            triggerName: '壬水玄冥潮汐',
            triggerChance: 0.30,
            triggerDesc: '出招時有 30% 機率觸發【壬水玄冥潮汐】，為自身回補 6% 最大氣血與 10% 最大內力！',
            passiveBonus: { elAtk: { water: 30 }, elDef: { water: 24 }, maxMp: 25, eva: 1 }
        },
        // 🔥 火靈根
        fire: {
            id: 'fire', elementKey: 'fire',
            name: '火靈根', shortName: '火', icon: '🔥', color: '#ef4444',
            counters: 'ice', generates: 'earth',
            passiveDesc: '每級靈根提升：火元素攻擊 +42、火元素抗性 +20、基礎攻擊 +30、會心爆擊 +1%',
            triggerName: '丙火焚天爆炎',
            triggerChance: 0.28,
            triggerDesc: '攻擊時有 28% 機率觸發【丙火焚天爆炎】，引燃目標追加額外火元素爆炸傷害！',
            passiveBonus: { elAtk: { fire: 42 }, elDef: { fire: 20 }, atk: 30, crit: 1 }
        },
        // 🪨 土靈根
        earth: {
            id: 'earth', elementKey: 'earth',
            name: '土靈根', shortName: '土', icon: '🪨', color: '#d97706',
            counters: 'water', generates: 'metal',
            passiveDesc: '每級靈根提升：土元素攻擊 +26、土元素抗性 +40、護體防禦 +35、最大氣血 +200、暴擊抵抗 +2%',
            triggerName: '戊土不動壁壘',
            triggerChance: 0.30,
            defenseTriggerChance: 0.35,
            triggerDesc: '出招時有 30% 機率凝結大地護盾回復 8% 氣血；受擊時另有 35% 機率觸發【戊土不動壁壘】，回復 4% 氣血並以土元素地脈震波反擊敵人！',
            passiveBonus: { elAtk: { earth: 26 }, elDef: { earth: 40 }, def: 35, maxHp: 200, critRes: 2 }
        },
        // ❄️ 冰靈根
        ice: {
            id: 'ice', elementKey: 'ice',
            name: '冰靈根', shortName: '冰', icon: '❄️', color: '#67e8f9',
            counters: 'wind', generates: 'water',
            passiveDesc: '每級靈根提升：冰元素攻擊 +32、冰元素抗性 +24、精準命中 +1.5%、暴擊抵抗 +1%',
            triggerName: '極寒萬里冰封',
            triggerChance: 0.28,
            triggerDesc: '攻擊時有 28% 機率觸發【極寒萬里冰封】，使目標【⚡出招集氣條倒退 -15%】！',
            passiveBonus: { elAtk: { ice: 32 }, elDef: { ice: 24 }, hit: 1.5, critRes: 1 }
        },
        // ⚡ 雷靈根
        lightning: {
            id: 'lightning', elementKey: 'lightning',
            name: '雷靈根', shortName: '雷', icon: '⚡', color: '#c084fc',
            counters: 'metal', generates: 'fire',
            passiveDesc: '每級靈根提升：雷元素攻擊 +40、雷元素抗性 +18、精準命中 +2%、會心爆擊 +1.5%、出手攻速 +0.7',
            triggerName: '九霄紫雷連鎖',
            triggerChance: 0.28,
            triggerDesc: '攻擊時有 28% 機率觸發【九霄紫雷連鎖】，對敵方全體造成雷元素連鎖傷害！',
            passiveBonus: { elAtk: { lightning: 40 }, elDef: { lightning: 18 }, hit: 2, crit: 1.5, atkSpd: 0.7 }
        },
        // 🌪️ 風靈根
        wind: {
            id: 'wind', elementKey: 'wind',
            name: '風靈根', shortName: '風', icon: '🌪️', color: '#2dd4bf',
            counters: 'lightning', generates: 'lightning',
            passiveDesc: '每級靈根提升：風元素攻擊 +30、風元素抗性 +20、出手攻擊速度 +1.3、輕功閃避 +1.5%',
            triggerName: '太虛御風神行',
            triggerChance: 0.30,
            triggerDesc: '出招時有 30% 機率觸發【太虛御風神行】，使自身【⚡出招集氣條瞬間 +10%】！',
            passiveBonus: { elAtk: { wind: 30 }, elDef: { wind: 20 }, atkSpd: 1.3, eva: 1.5 }
        }
    };

    Data.SPIRIT_ROOTS = ROOTS;

    Data.SPIRIT_ROOT_BALANCE = {
        elAtkRange: '26 ~ 42',
        elDefRange: '18 ~ 40',
        counterMult: 1.35,
        resistedMult: 0.80,
        triggerChanceRange: '0.28 ~ 0.30'
    };

    if (window.HY.Data && window.HY.Data.SPIRIT_ROOTS && Object.keys(window.HY.Data.SPIRIT_ROOTS).length === 8) {
        console.log('[spiritRootData] ✓ 八大靈根已載入（' + Object.keys(Data.SPIRIT_ROOTS).length + ' 種｜觸發機率資料驅動）');
    } else {
        console.error('[spiritRootData] ✗ 載入異常：SPIRIT_ROOTS 未正確賦值');
    }
})();