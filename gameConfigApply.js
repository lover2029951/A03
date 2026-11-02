// js/gameConfigApply.js  (v3.3 · 3/5)
// ═══════════════════════════════════════════════════════════════════════
//  套用器 A：元素／詞綴／掉落政策／武學／靈根／陣法／群俠靈獸
//
//  ⚠️ 所有套用器會 push 進 CFG.__appliers，由 gameConfigBoot.js 統一執行。
// ═══════════════════════════════════════════════════════════════════════

window.HY = window.HY || {};

(function () {
    var CFG = window.HY && window.HY.GameConfig;
    if (!CFG) {
        console.error('[GameConfig 3/5] ✗ 找不到 HY.GameConfig');
        return;
    }
    if (CFG.__applyLoaded) return;
    CFG.__applyLoaded = true;

    CFG.__appliers = CFG.__appliers || [];

    // ═══════════════════════════════════════════════════════════════
    //  原值捕捉（讓乘法型套用器可重複執行而不累積）
    // ═══════════════════════════════════════════════════════════════

    function collectNestedRefs(rootObj) {
        var out = [];
        (function walk(o) {
            if (!o || typeof o !== 'object') return;
            Object.keys(o).forEach(function (k) {
                var v = o[k];
                if (typeof v === 'number') {
                    out.push({ obj: o, key: k, val: v });
                } else if (v && typeof v === 'object') {
                    walk(v);
                }
            });
        })(rootObj);
        return out;
    }

    function captureOrigRefs() {
        if (CFG.__origRefs) return;
        var D = window.HY.Data;
        if (!D) return;

        var refs = {
            arts: [], xinfa: [], qinggong: [], mastery: [],
            meridians: [], roots: [], formations: [], companions: [], pets: []
        };

        Object.values(D.MARTIAL_ARTS || {}).forEach(function (a) {
            ['baseMult','armorPen','critBonus','healRatio','mpRestore','hitBonus'].forEach(function (k) {
                if (typeof a[k] === 'number') refs.arts.push({ obj: a, key: k, val: a[k] });
            });
        });
        Object.values(D.XINFA || {}).forEach(function (x) {
            if (x.passivePerLv) refs.xinfa = refs.xinfa.concat(collectNestedRefs(x.passivePerLv));
        });
        (D.QINGGONG || []).forEach(function (q) {
            if (q.bonus) refs.qinggong = refs.qinggong.concat(collectNestedRefs(q.bonus));
        });
        (D.MASTERY || []).forEach(function (ms) {
            if (ms.bonus) refs.mastery = refs.mastery.concat(collectNestedRefs(ms.bonus));
        });
        (D.MERIDIANS || []).forEach(function (m) {
            if (m.bonus) refs.meridians = refs.meridians.concat(collectNestedRefs(m.bonus));
        });
        Object.values(D.SPIRIT_ROOTS || {}).forEach(function (r) {
            if (r.passiveBonus) refs.roots = refs.roots.concat(collectNestedRefs(r.passiveBonus));
        });
        (D.XIANXIA_FORMATIONS || []).forEach(function (f) {
            if (f.bonus) refs.formations = refs.formations.concat(collectNestedRefs(f.bonus));
        });
        Object.values(D.COMPANIONS || {}).forEach(function (c) {
            if (c.passive) refs.companions = refs.companions.concat(collectNestedRefs(c.passive));
        });
        Object.values(D.PETS || {}).forEach(function (p) {
            if (p.bonus) refs.pets = refs.pets.concat(collectNestedRefs(p.bonus));
        });

        CFG.__origRefs = refs;
    }

    function restoreRefs(list) {
        list.forEach(function (r) { r.obj[r.key] = r.val; });
    }

    function scaleRefs(list, mult) {
        if (mult === 1) { restoreRefs(list); return; }
        list.forEach(function (r) {
            r.obj[r.key] = Math.round(r.val * mult * 1000) / 1000;
        });
    }

    CFG.__captureOrigRefs = captureOrigRefs;

    // ═══════════════════════════════════════════════════════════════
    //  ① 元素規則（覆寫 Data.ELEMENT_RULES）
    // ═══════════════════════════════════════════════════════════════
    CFG.__appliers.push(function _applyElementRules() {
        var D = window.HY.Data;
        if (!D || !D.ELEMENT_RULES) return;
        Object.keys(CFG.element).forEach(function (k) {
            if (typeof CFG.element[k] === 'number') D.ELEMENT_RULES[k] = CFG.element[k];
        });
    });

    // ═══════════════════════════════════════════════════════════════
    //  ② 稀有度階級（覆寫 Data.RARITY_TIERS）
    // ═══════════════════════════════════════════════════════════════
    CFG.__appliers.push(function _applyAffixTiers() {
        var D = window.HY.Data;
        if (!D || !D.RARITY_TIERS) return;
        ['normal', 'magic', 'rare'].forEach(function (k) {
            var src = CFG.affix.rarity[k];
            var dst = D.RARITY_TIERS[k];
            if (!src || !dst) return;
            if (typeof src.statMult === 'number') dst.statMult = src.statMult;
            if (typeof src.rewardMult === 'number') dst.rewardMult = src.rewardMult;
        });
    });

    // ═══════════════════════════════════════════════════════════════
    //  ③ 詞綴觸發率（只支援降低；提高需改 affixSystem.js）
    // ═══════════════════════════════════════════════════════════════
    CFG.__appliers.push(function _applyAffixChance() {
        var game = window.HY.game;
        if (!game || !game.affixSys) return;
        if (game.affixSys.__cfgPatched) return;
        game.affixSys.__cfgPatched = true;

        var orig = game.affixSys.applyRandomAffixes.bind(game.affixSys);
        game.affixSys.applyRandomAffixes = function (enemy) {
            var target = CFG.affix.triggerChancePct;
            var D = window.HY.Data;
            if (target >= 35) return orig(enemy);

            if (Math.random() * 100 >= target) {
                var tier = D.RARITY_TIERS.normal;
                enemy.rarity = tier.id;
                enemy.rarityName = tier.name;
                enemy.rarityColor = tier.color;
                enemy.affixes = [];
                enemy.lootMult = tier.rewardMult || 1.0;
                enemy.currentHp = enemy.maxHp;
                return enemy;
            }
            return orig(enemy);
        };
    });

    // ═══════════════════════════════════════════════════════════════
    //  ④ 掉落政策（覆寫 Data.LOOT_POLICY）
    // ═══════════════════════════════════════════════════════════════
    CFG.__appliers.push(function _applyLootPolicy() {
        var D = window.HY.Data;
        if (!D) return;
        if (!D.LOOT_POLICY) D.LOOT_POLICY = {};
        D.LOOT_POLICY.combatDropsPills = !!CFG.loot.combatDropsPills;
        D.LOOT_POLICY.guildBuildingsDropPills = !!CFG.loot.guildBuildingsDropPills;
        D.LOOT_POLICY.expeditionDropsPills = !!CFG.loot.expeditionDropsPills;
    });

    // ═══════════════════════════════════════════════════════════════
    //  ⑤ 乘法型套用器（記錄原值 → 還原 → 重乘）
    // ═══════════════════════════════════════════════════════════════

    CFG.__appliers.push(function _applyMartialBonusMult() {
        var R = CFG.__origRefs;
        if (!R) return;
        var mult = CFG.martial.allBonusMult;
        restoreRefs(R.arts);
        restoreRefs(R.xinfa);
        restoreRefs(R.qinggong);
        restoreRefs(R.mastery);
        restoreRefs(R.meridians);
        if (mult !== 1) {
            scaleRefs(R.arts, mult);
            scaleRefs(R.xinfa, mult);
            scaleRefs(R.qinggong, mult);
            scaleRefs(R.mastery, mult);
            scaleRefs(R.meridians, mult);
        }
    });

    CFG.__appliers.push(function _applySpiritRootMult() {
        var R = CFG.__origRefs;
        if (!R) return;
        var mult = CFG.spiritRoot.rootBonusMult;
        restoreRefs(R.roots);
        if (mult !== 1) scaleRefs(R.roots, mult);
    });

    CFG.__appliers.push(function _applyFormationMult() {
        var R = CFG.__origRefs;
        if (!R) return;
        var mult = CFG.formation.bonusMult;
        restoreRefs(R.formations);
        if (mult !== 1) scaleRefs(R.formations, mult);
    });

    CFG.__appliers.push(function _applyCompanionPetMult() {
        var R = CFG.__origRefs;
        if (!R) return;
        var mult = CFG.companionPet.allBonusMult;
        restoreRefs(R.companions);
        restoreRefs(R.pets);
        if (mult !== 1) {
            scaleRefs(R.companions, mult);
            scaleRefs(R.pets, mult);
        }
    });

    console.log('[GameConfig 3/5] ✓ 套用器 A 已註冊（目前 ' + CFG.__appliers.length + ' 個）');
})();