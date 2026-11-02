// js/combatAtbSystem.js  (v52)
// ATB 集氣條戰鬥節奏
//
// v52 修正：
//   ⭐【移除】靈敏 (dex) → 開場集氣改看「身法 (agi)」
//      （角色初始 agi = 10，與原 dex = 10 完全等值）
//   ⭐ 其他 ATB 邏輯不變
window.HY = window.HY || {};

(function () {
    function _cfgCombat() {
        var G = window.HY && window.HY.GameConfig;
        return (G && G.combat) ? G.combat : {};
    }
    function _num(v, d) {
        return (typeof v === 'number' && !isNaN(v)) ? v : d;
    }

    class CombatAtbSystem {
        constructor(app) {
            this.app = app;
            this.combat = app.combatSys;
            this.dexSys = app.dexSys;
            this.atbTimer = null;

            var C = _cfgCombat();
            this.TICK_MS          = _num(C.atbTickMs, 100);
            this.PLAYER_GAIN_COEF = _num(C.atbPlayerGainCoef, 0.055);
            this.ENEMY_GAIN_COEF  = _num(C.atbEnemyGainCoef, 0.052);
            this.PLAYER_INIT_MAX  = _num(C.atbPlayerInitMax, 35);
            this.PLAYER_INIT_AGI  = _num(C.atbPlayerInitDexCoef, 0.25);   // 沿用原係數名
            this.ENEMY_INIT_MAX   = _num(C.atbEnemyInitMax, 30);
            this.ENEMY_INIT_BASE  = _num(C.atbEnemyInitBase, 10);
            this.ENEMY_INIT_RAND  = _num(C.atbEnemyInitRand, 15);

            this.pillState = {};

            this.hookCombatCore();
            this.startGlobalAtbTicker();
        }

        // ⭐ 從 GameConfig 重讀 ATB 參數（作弊面板呼叫）
        refreshFromConfig() {
            var C = _cfgCombat();
            this.PLAYER_GAIN_COEF = _num(C.atbPlayerGainCoef, this.PLAYER_GAIN_COEF);
            this.ENEMY_GAIN_COEF  = _num(C.atbEnemyGainCoef,  this.ENEMY_GAIN_COEF);
            this.PLAYER_INIT_MAX  = _num(C.atbPlayerInitMax,  this.PLAYER_INIT_MAX);
            this.PLAYER_INIT_AGI  = _num(C.atbPlayerInitDexCoef, this.PLAYER_INIT_AGI);
            this.ENEMY_INIT_MAX   = _num(C.atbEnemyInitMax,   this.ENEMY_INIT_MAX);
            this.ENEMY_INIT_BASE  = _num(C.atbEnemyInitBase,  this.ENEMY_INIT_BASE);
            this.ENEMY_INIT_RAND  = _num(C.atbEnemyInitRand,  this.ENEMY_INIT_RAND);

            var newTick = _num(C.atbTickMs, 100);
            if (newTick !== this.TICK_MS) {
                this.TICK_MS = newTick;
                this.startGlobalAtbTicker();
            }
        }

        hookCombatCore() {
            var combat = this.combat;
            var self = this;

            combat.autoTactics.startAutoLoop = function () {};
            combat.autoTactics.stopAutoLoop = function () {};

            var origStartBattle = combat.startBattle.bind(combat);
            combat.startBattle = function (enemyTemplate) {
                origStartBattle(enemyTemplate);
                self.pillState = {};
                if (combat.autoTactics) combat.autoTactics._pillCooldown = {};
                self.initBattleAtbBars();
                if (window.HY.uiDexAtb) window.HY.uiDexAtb.updateArenaBarsDOM();
            };

            // useSkill 支援第二參數 healTarget（手動點招時可略）
            combat.useSkill = function (leaderSkillId, healTarget) {
                combat.syncCurrentEnemyPointer();
                if (!combat.currentEnemy) return;

                var activeChar = combat.charSys.state;
                if (activeChar.currentHp <= 0) {
                    combat.log('⚠️ 當前主控角色已重傷倒地，無法出招！', 'combat');
                    return;
                }
                if ((activeChar.atb || 0) < 100) {
                    combat.log('⏳ 【' + activeChar.name + '】出招集氣中 (' + Math.floor(activeChar.atb || 0) + '%)，需集氣滿 100% 方可出招！', 'combat');
                    return;
                }

                activeChar.atb = 0;
                self.executeUnitFullAtbTurn(activeChar, true, leaderSkillId, healTarget || null);
            };
        }

        getDexSys() {
            if (!this.dexSys) this.dexSys = (window.HY.game && window.HY.game.dexSys) || null;
            return this.dexSys;
        }

        // ⭐ v52：開場集氣改看身法 (agi)
        initBattleAtbBars() {
            var partyMembers = this.app.partySys.getPartyMembers();
            var self = this;

            partyMembers.forEach(function (m) {
                var d = self.app.charSys.getDerivedStatsForChar(m);
                m.atkSpd = d.atkSpd || 100;
                var agi = (m.stats && typeof m.stats.agi === 'number') ? m.stats.agi : 10;
                m.atb = Math.min(self.PLAYER_INIT_MAX, Math.floor(10 + agi * self.PLAYER_INIT_AGI));
            });

            (this.combat.enemies || []).forEach(function (e) {
                var dex = self.getDexSys();
                e.atkSpd = dex ? dex.getEnemyAtkSpd(e) : 100;
                e.atb = Math.min(self.ENEMY_INIT_MAX,
                    Math.floor(self.ENEMY_INIT_BASE + Math.random() * self.ENEMY_INIT_RAND));
            });
        }

        startGlobalAtbTicker() {
            var self = this;
            if (this.atbTimer) clearInterval(this.atbTimer);
            this.atbTimer = setInterval(function () { self.tickAtbStep(); }, this.TICK_MS);
        }

        tickAtbStep() {
            var combat = this.combat;
            combat.syncCurrentEnemyPointer();
            if (!combat.currentEnemy) return;

            var partyMembers = this.app.partySys.getPartyMembers();
            var activeChar = this.app.charSys.state;
            var self = this;

            if (combat.isAutoBattle) {
                combat.autoTactics.processAutoPills(partyMembers);
            }

            // 1. 我方集氣
            for (var i = 0; i < partyMembers.length; i++) {
                if (!combat.currentEnemy) break;
                var m = partyMembers[i];
                if (m.currentHp <= 0) { m.atb = 0; continue; }

                var d = self.app.charSys.getDerivedStatsForChar(m);
                m.atkSpd = d.atkSpd || 100;

                var gain = m.atkSpd * self.PLAYER_GAIN_COEF;
                m.atb = Math.min(100, (m.atb || 0) + gain);

                if (m.atb >= 100 && combat.currentEnemy) {
                    var isLeader = (m.id === activeChar.id);
                    if (!isLeader || combat.isAutoBattle) {
                        m.atb = 0;
                        var support = combat.autoTactics.pickSupportAction(m, partyMembers);
                        if (support) {
                            self.executeUnitFullAtbTurn(m, isLeader, support.skillId, support.target);
                        } else {
                            var chosenSkill = combat.autoTactics.pickTacticalSkillForChar(m, isLeader);
                            self.executeUnitFullAtbTurn(m, isLeader, chosenSkill, null);
                        }
                    }
                }
            }

            if (!combat.currentEnemy) return;

            // 2. 敵方集氣
            var aliveEnemies = (combat.enemies || []).filter(function (e) { return e && e.currentHp > 0; });
            for (var j = 0; j < aliveEnemies.length; j++) {
                if (!combat.currentEnemy) break;
                var e = aliveEnemies[j];
                var dex = self.getDexSys();
                e.atkSpd = dex ? dex.getEnemyAtkSpd(e) : 100;
                var eGain = e.atkSpd * self.ENEMY_GAIN_COEF;
                e.atb = Math.min(100, (e.atb || 0) + eGain);

                if (e.atb >= 100 && e.currentHp > 0) {
                    e.atb = 0;
                    self.executeEnemyFullAtbTurn(e, partyMembers);
                }
            }

            if (window.HY.uiDexAtb) window.HY.uiDexAtb.updateArenaBarsDOM();
        }

        executeUnitFullAtbTurn(member, isLeader, skillId, healTarget) {
            var combat = this.combat;
            var partyMembers = this.app.partySys.getPartyMembers();

            combat._turnCounter = (combat._turnCounter || 0) + 1;

            combat.playerTurn.performCharAttack(member, skillId, isLeader, partyMembers, false, healTarget || null);
            combat.syncCurrentEnemyPointer();

            if (!combat.currentEnemy) { combat.handleVictory(); return; }

            if (isLeader) {
                var leaderStats = this.app.charSys.getDerivedStatsForChar(member);

                combat.playerTurn.companionTurn(leaderStats, partyMembers);
                combat.syncCurrentEnemyPointer();
                if (!combat.currentEnemy) { combat.handleVictory(); return; }

                combat.playerTurn.petTurn(leaderStats, partyMembers);
                combat.syncCurrentEnemyPointer();
                if (!combat.currentEnemy) { combat.handleVictory(); return; }
            }

            if (window.HY.uiDexAtb) window.HY.uiDexAtb.updateArenaBarsDOM();
        }

        executeEnemyFullAtbTurn(enemy, partyMembers) {
            var combat = this.combat;
            var affixSys = this.app.affixSys;

            combat._turnCounter = (combat._turnCounter || 0) + 1;

            combat.enemyTurn.executeSingleEnemyAction(enemy, partyMembers, null);
            combat.syncCurrentEnemyPointer();
            if (!combat.currentEnemy) { combat.handleVictory(); return; }

            if (affixSys && enemy.currentHp > 0) {
                var extraAf = affixSys.hasProperty(enemy, 'extraAction');
                if (extraAf) {
                    combat.enemyTurn.executeSingleEnemyAction(enemy, partyMembers, extraAf);
                    combat.syncCurrentEnemyPointer();
                    if (!combat.currentEnemy) { combat.handleVictory(); return; }
                }
            }

            if (affixSys && enemy.currentHp > 0) affixSys.onEnemyTurnEnd(enemy);

            var stillAlive = partyMembers.filter(function (m) { return m.currentHp > 0; });
            if (stillAlive.length === 0) { combat.handleDefeat(); return; }

            if (window.HY.uiDexAtb) window.HY.uiDexAtb.updateArenaBarsDOM();
        }

        checkAutoPills(partyMembers) {
            this.combat.autoTactics.processAutoPills(partyMembers);
        }
    }

    window.HY.CombatAtbSystem = CombatAtbSystem;
})();