// js/gameConfigApply2.js  (v3.3 · 4/5)
// ═══════════════════════════════════════════════════════════════════════
//  套用器 B：收益／掉落／屬性／幫會
//  + 公開 API：reapply / resetToDefaults / report / getDefaults
// ═══════════════════════════════════════════════════════════════════════

window.HY = window.HY || {};

(function () {
    var CFG = window.HY && window.HY.GameConfig;
    if (!CFG) {
        console.error('[GameConfig 4/5] ✗ 找不到 HY.GameConfig');
        return;
    }
    if (CFG.__apply2Loaded) return;
    CFG.__apply2Loaded = true;

    CFG.__appliers = CFG.__appliers || [];

    // ═══════════════════════════════════════════════════════════════
    //  ① 收益倍率（包裝 gainRewards）
    // ═══════════════════════════════════════════════════════════════
    CFG.__appliers.push(function _applyRewardMultipliers() {
        var game = window.HY.game;
        if (!game || !game.charSys) return;
        var cs = game.charSys;
        if (cs.__cfgPatched) return;
        cs.__cfgPatched = true;

        if (typeof CFG.growth.rewardRate === 'number') cs.rewardRate = CFG.growth.rewardRate;
        if (typeof CFG.growth.maxLevel === 'number') cs.MAX_LEVEL = CFG.growth.maxLevel;

        var origGain = cs.gainRewards.bind(cs);
        cs.gainRewards = function (exp, sp, gold) {
            // ⚡ 每次呼叫重新讀取（即時生效）
            if (typeof CFG.growth.rewardRate === 'number') cs.rewardRate = CFG.growth.rewardRate;
            if (typeof CFG.growth.maxLevel === 'number') cs.MAX_LEVEL = CFG.growth.maxLevel;

            var m = CFG.multipliers;
            var c = CFG.combat;

            var expAdj  = (exp  || 0) * (5  / Math.max(1, c.rewardExpDivisor  || 5));
            var spAdj   = (sp   || 0) * (10 / Math.max(1, c.rewardSpDivisor   || 10));
            var goldAdj = (gold || 0) * (10 / Math.max(1, c.rewardGoldDivisor || 10));

            expAdj  *= (typeof m.expGain  === 'number' ? m.expGain  : 1);
            spAdj   *= (typeof m.spGain   === 'number' ? m.spGain   : 1);
            goldAdj *= (typeof m.goldGain === 'number' ? m.goldGain : 1);

            return origGain(Math.max(1, Math.floor(expAdj)),
                            Math.max(1, Math.floor(spAdj)),
                            Math.max(1, Math.floor(goldAdj)));
        };
    });

    // ═══════════════════════════════════════════════════════════════
    //  ② 掉落倍率（包裝 rollEquipmentDrop / rollCurrencyDrop）
    // ═══════════════════════════════════════════════════════════════
    CFG.__appliers.push(function _applyDropMultipliers() {
        var game = window.HY.game;
        if (!game || !game.poeSys) return;
        var poe = game.poeSys;
        if (poe.__cfgPatched) return;
        poe.__cfgPatched = true;

        function wrap(origFn, getMult) {
            return function (enemy) {
                var mult = getMult();   // ⚡ 每次呼叫重新讀取
                if (!mult || mult === 1) return origFn(enemy);

                if (mult < 1) {
                    if (Math.random() > mult) return null;
                    return origFn(enemy);
                }

                var n = Math.floor(mult);
                if (Math.random() < (mult - n)) n += 1;
                var last = null;
                for (var i = 0; i < n; i++) {
                    var r = origFn(enemy);
                    if (r) last = r;
                }
                return last;
            };
        }

        var origEq = poe.rollEquipmentDropByEnemy.bind(poe);
        poe.rollEquipmentDropByEnemy = wrap(origEq, function () {
            return CFG.multipliers.equipDropRate;
        });

        var origCur = poe.rollCurrencyDropByEnemy.bind(poe);
        poe.rollCurrencyDropByEnemy = wrap(origCur, function () {
            return CFG.multipliers.currencyDropRate;
        });
    });

    // ═══════════════════════════════════════════════════════════════
    //  ③ 玩家 / 敵人屬性倍率
    // ═══════════════════════════════════════════════════════════════
    CFG.__appliers.push(function _applySpeedAndStatMultipliers() {
        var game = window.HY.game;
        if (!game) return;

        var m = CFG.multipliers;

        // 玩家屬性（包裝 getDerivedStatsForChar）
        if (game.charSys && !game.charSys.__cfgStatPatched) {
            game.charSys.__cfgStatPatched = true;
            var cs = game.charSys;
            var origDerived = cs.getDerivedStatsForChar.bind(cs);

            cs.getDerivedStatsForChar = function (charObj) {
                var d = origDerived(charObj);
                if (!d) return d;

                if (m.playerAtk     !== 1) d.atk     = Math.max(1, Math.floor(d.atk * m.playerAtk));
                if (m.playerDef     !== 1) d.def     = Math.max(0, Math.floor(d.def * m.playerDef));
                if (m.playerMaxHp   !== 1) d.maxHp   = Math.max(1, Math.floor(d.maxHp * m.playerMaxHp));
                if (m.playerMaxMp   !== 1) d.maxMp   = Math.max(1, Math.floor(d.maxMp * m.playerMaxMp));
                if (m.playerAtkSpd  !== 1) d.atkSpd  = Math.max(1, Math.floor((d.atkSpd || 100) * m.playerAtkSpd));
                if (m.playerCrit    !== 1) d.crit    = Math.min(CFG.growth.critCap, Math.floor(d.crit * m.playerCrit));
                if (m.playerCritRes !== 1) d.critRes = Math.floor(d.critRes * m.playerCritRes);

                // ⭐ 屬性被倍率改動後，戰力需重算
                if (typeof cs.getPowerScore === 'function') {
                    d.powerScore = cs.getPowerScore({
                        atk: d.atk, def: d.def, maxHp: d.maxHp, maxMp: d.maxMp,
                        hit: d.hit, eva: d.eva, crit: d.crit, critRes: d.critRes
                    });
                }
                return d;
            };
        }

        // 敵人攻速（包裝 dexSys.getEnemyAtkSpd）
        if (game.dexSys && !game.dexSys.__cfgPatched) {
            game.dexSys.__cfgPatched = true;
            var dex = game.dexSys;
            var origEnemySpd = dex.getEnemyAtkSpd.bind(dex);
            dex.getEnemyAtkSpd = function (enemy) {
                var spd = origEnemySpd(enemy);
                if (m.enemyAtkSpd !== 1) spd = Math.max(1, Math.floor(spd * m.enemyAtkSpd));
                return spd;
            };
        }

        // 敵人屬性（包裝 combatSys.startBattle，在插件跑完後套用）
        if (game.combatSys && !game.combatSys.__cfgEnemyPatched) {
            game.combatSys.__cfgEnemyPatched = true;
            var combat = game.combatSys;
            var origStart = combat.startBattle.bind(combat);
            combat.startBattle = function (enemyTemplate) {
                origStart(enemyTemplate);

                (combat.enemies || []).forEach(function (e) {
                    if (m.enemyAtk     !== 1) e.atk     = Math.max(1, Math.floor(e.atk * m.enemyAtk));
                    if (m.enemyDef     !== 1) e.def     = Math.max(0, Math.floor(e.def * m.enemyDef));
                    if (m.enemyMaxHp   !== 1) {
                        var oldMax = e.maxHp;
                        e.maxHp = Math.max(10, Math.floor(e.maxHp * m.enemyMaxHp));
                        if (e.currentHp > 0 && oldMax > 0) {
                            e.currentHp = Math.min(e.maxHp, Math.floor(e.currentHp * (e.maxHp / oldMax)));
                        } else {
                            e.currentHp = e.maxHp;
                        }
                    }
                    if (m.enemyCrit    !== 1) e.crit    = Math.floor((e.crit || 5) * m.enemyCrit);
                    if (m.enemyCritRes !== 1) e.critRes = Math.floor((e.critRes || 0) * m.enemyCritRes);
                });
            };
        }
    });

    // ═══════════════════════════════════════════════════════════════
    //  ④ 幫會 config
    // ═══════════════════════════════════════════════════════════════
    CFG.__appliers.push(function _applyGuildConfig() {
        var game = window.HY.game;
        if (!game) return;

        if (game.guildCore) {
            if (typeof CFG.guild.baseGuildExp === 'number') game.guildCore.BASE_GUILD_EXP = CFG.guild.baseGuildExp;
            if (typeof CFG.guild.recruitFirstCost === 'number') game.guildCore.RECRUIT_FIRST_COST = CFG.guild.recruitFirstCost;
            if (typeof CFG.guild.recruitStep === 'number') game.guildCore.RECRUIT_STEP = CFG.guild.recruitStep;
        }
        if (game.guildBuilding && typeof CFG.guild.buildingUpgradePow === 'number') {
            game.guildBuilding.__cfgPow = CFG.guild.buildingUpgradePow;
        }
    });

    // ═══════════════════════════════════════════════════════════════
    //  公開 API
    // ═══════════════════════════════════════════════════════════════

    // ── Console 用：印出目前設定 ──
    CFG.report = function () {
        console.log('%c═══ 目前遊戲設定 (' + CFG.version + ') ═══', 'color:#fbbf24; font-weight:bold; font-size:13px;');
        console.log('⚡ 速度：', CFG.speed.global + '×' + (CFG.speed.enabled ? '' : '（已停用）'));
        console.log('💰 收益：', CFG.multipliers.expGain + '× 經驗 / ' + CFG.multipliers.spGain + '× 武點 / ' + CFG.multipliers.goldGain + '× 紋銀');
        console.log('🎁 掉落：', CFG.multipliers.equipDropRate + '× 裝備 / ' + CFG.multipliers.currencyDropRate + '× 通貨');
        console.log('⚔️ 戰鬥：獎勵除數 ' + CFG.combat.rewardExpDivisor + '/' + CFG.combat.rewardSpDivisor + '/' + CFG.combat.rewardGoldDivisor +
                    '，服藥冷卻 ' + CFG.combat.pillCooldownMs + 'ms');
        console.log('📈 成長：Lv 上限 ' + CFG.growth.maxLevel + '，折算率 ' + CFG.growth.rewardRate);
        console.log('🌈 元素：剋制 ' + CFG.element.counterMult + '× / 被剋 ' + CFG.element.resistedMult + '× / 基礎補償 ' + CFG.element.flatAtkMult + '×');
        console.log('🏆 戰力：倍率 ' + CFG.power.scale + '，攻擊權重 ' + CFG.power.atkWeight + '，面板顯示 ' + CFG.power.showInBattlePanel);
        console.log('🏯 幫會：事件成本 ' + CFG.guild.guildEventCost + '，自動事件 ' + Math.round(CFG.guild.autoEventChance * 100) + '%');
        console.log('🎒 行囊上限：', CFG.loot.maxBagSize);
        return CFG;
    };

    // ⚡ 重新套用全部設定（由 gameConfigBoot.js 提供 applyAll）
    CFG.reapply = function () {
        if (typeof CFG.__applyAll === 'function') {
            CFG.__applyAll(true);
            console.log('%c[GameConfig] 🔄 已重新套用設定', 'color:#4ade80;');
        } else {
            console.warn('[GameConfig] ⚠️ applyAll 尚未就緒（gameConfigBoot.js 未載入？）');
        }
        return true;
    };

    // ⚡ 還原全部預設值並重套
    CFG.resetToDefaults = function () {
        var D = CFG.__defaults;
        if (!D) return false;
        CFG.SECTION_KEYS.forEach(function (sec) {
            if (CFG[sec] && D[sec]) CFG.__deepAssignInPlace(CFG[sec], D[sec]);
        });
        if (typeof CFG.__applyAll === 'function') CFG.__applyAll(true);
        console.log('%c[GameConfig] ↩️ 已還原全部預設值', 'color:#fbbf24;');
        return true;
    };

    CFG.getDefaults = function () { return CFG.__defaults; };

    console.log('[GameConfig 4/5] ✓ 套用器 B 已註冊 + API 就緒（共 ' + CFG.__appliers.length + ' 個套用器）');
})();