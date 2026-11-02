// js/combatCore.js  (v44)
// 戰鬥主控：開戰、出招調度、勝敗結算
//
// v44 修正（收尾整理）：
//   ⭐ 移除 _isConsumableDrop：它是 no-op（裝備與通貨都不帶 type:'consumable'），
//      真正防止「戰鬥掉丹藥」的是掉落管線本身（只從 POE_BASES / POE_UNIQUES / CURRENCIES 抽）。
//   ⭐ _allowCombatPillDrop 保留（供未來的擴充掉落來源使用）
window.HY = window.HY || {};

(function () {
    var ENEMY_CRITRES_SCALE = 0.4;

    class CombatCore {
        constructor(charSys, martialSys, inventorySys, arg4, arg5, arg6) {
            this.charSys = charSys;
            this.martialSys = martialSys;
            this.inventorySys = inventorySys;

            if (arg4 && typeof arg4.add === 'function') {
                this.companionSys = null;
                this.logger = arg4;
                this.onUpdateUI = arg5 || function () {};
            } else {
                this.companionSys = arg4;
                this.logger = arg5;
                this.onUpdateUI = arg6 || function () {};
            }

            this.currentEnemy = null;
            this.enemies = [];
            this.lastEnemyTemplate = null;
            this._enemySeq = 0;
            this._turnCounter = 0;

            this.autoTactics = new window.HY.CombatAutoTactics(this);
            this.playerTurn  = new window.HY.CombatPlayerTurn(this);
            this.enemyTurn   = new window.HY.CombatEnemyTurn(this);

            this.plugins = [];
        }

        get isAutoBattle() { return this.autoTactics.isAutoBattle; }
        set isAutoBattle(v) { this.autoTactics.isAutoBattle = v; }
        get autoRepeat() { return this.autoTactics.autoRepeat; }
        set autoRepeat(v) { this.autoTactics.autoRepeat = v; }
        get autoConfig() { return this.autoTactics.autoConfig; }
        set autoConfig(v) { this.autoTactics.autoConfig = v; }

        // 戰鬥是否允許掉落丹藥（預設：不允許）
        //   實際管線（poeSys.rollEquipmentDropByEnemy / rollCurrencyDropByEnemy）
        //   只從 POE_BASES / POE_UNIQUES / CURRENCIES 抽取，本就不會產生消耗品。
        //   保留此旗標供未來的擴充掉落來源使用。
        _allowCombatPillDrop() {
            var Data = window.HY.Data;
            var pol = Data && Data.LOOT_POLICY;
            if (pol && typeof pol.combatDropsPills === 'boolean') return pol.combatDropsPills;
            return false;
        }

        registerPlugin(pluginObj) {
            if (pluginObj && this.plugins.indexOf(pluginObj) === -1) {
                this.plugins.push(pluginObj);
            }
        }

        runPluginHooks(hookName, payload) {
            var self = this;
            this.plugins.forEach(function (p) {
                if (p && typeof p[hookName] === 'function') {
                    try { p[hookName](self, payload); } catch (e) { console.error('[plugin]', hookName, e); }
                }
            });
        }

        log(msg, type) {
            if (this.logger && typeof this.logger.add === 'function') {
                this.logger.add(msg, type || 'combat');
            }
        }

        getCharBlessingLv(charObj, blessingId) {
            var gSB = window.HY.game && window.HY.game.guildSkillBeast;
            return gSB ? gSB.getActiveBlessingLv(charObj, blessingId) : 0;
        }

        getCharDestinyLv(charObj, destinyId) {
            var gSB = window.HY.game && window.HY.game.guildSkillBeast;
            return gSB ? gSB.getDestinySkillLv(charObj, destinyId) : 0;
        }

        toggleAutoBattle(forceState) { this.autoTactics.toggleAutoBattle(forceState); }
        stopAutoLoop() { this.autoTactics.stopAutoLoop(); }
        clearRepeatTimeout() { this.autoTactics.clearRepeatTimeout(); }

        syncCurrentEnemyPointer() {
            var alive = (this.enemies || []).filter(function (e) { return e && e.currentHp > 0; });
            this.currentEnemy = alive.length > 0 ? alive[0] : null;
        }

        clearBattleState() {
            this.stopAutoLoop();
            this.clearRepeatTimeout();
            this.enemies = [];
            this.currentEnemy = null;
            this.lastEnemyTemplate = null;
            this._turnCounter = 0;
        }

        startBattle(enemyTemplate) {
            if (!enemyTemplate) return;
            this.clearRepeatTimeout();
            this.lastEnemyTemplate = enemyTemplate;
            this._turnCounter = 0;

            var partySys = window.HY.game && window.HY.game.partySys;
            var affixSys = window.HY.game && window.HY.game.affixSys;
            var partyMembers = partySys ? partySys.getPartyMembers() : [this.charSys.state];
            var count = Math.max(1, Math.min(5, partyMembers.length));

            var self = this;
            partyMembers.forEach(function (m) {
                self.martialSys.purgeInvalidSectSkills(m);
                if (m.currentHp <= 0) {
                    var d = self.charSys.getDerivedStatsForChar(m);
                    m.currentHp = Math.floor(d.maxHp * 0.3);
                }
            });

            this.enemies = [];
            var suffixes = ['甲', '乙', '丙', '丁', '戊'];

            for (var i = 0; i < count; i++) {
                this._enemySeq += 1;
                var eName = count > 1 ? (enemyTemplate.name + '・' + suffixes[i]) : enemyTemplate.name;
                var lvTpl = enemyTemplate.lv || 1;

                var rawCritRes = (typeof enemyTemplate.critRes === 'number')
                    ? enemyTemplate.critRes
                    : Math.floor(lvTpl * 0.5);

                var rawEnemy = Object.assign({}, enemyTemplate, {
                    uid: 'enemy_' + Date.now() + '_' + this._enemySeq,
                    name: eName,
                    currentHp: enemyTemplate.hp,
                    maxHp: enemyTemplate.hp,
                    hit: enemyTemplate.hit || (88 + lvTpl),
                    eva: enemyTemplate.eva || Math.floor(lvTpl * 0.4),
                    crit: enemyTemplate.crit || Math.min(60, 5 + Math.floor(lvTpl * 0.3)),
                    critRes: Math.floor(rawCritRes * ENEMY_CRITRES_SCALE),
                    atb: 0,
                    affixes: [],
                    _sect: {}
                });

                if (affixSys) {
                    affixSys.applyRandomAffixes(rawEnemy);
                }

                if (typeof rawEnemy.maxMp !== 'number' || rawEnemy.maxMp <= 0) {
                    rawEnemy.maxMp = Math.floor(80 + lvTpl * 25 + (rawEnemy.atk || 20) * 0.15);
                }
                if (typeof rawEnemy.currentMp !== 'number') {
                    rawEnemy.currentMp = rawEnemy.maxMp;
                }

                this.enemies.push(rawEnemy);
            }

            this.syncCurrentEnemyPointer();
            var factionTag = enemyTemplate.faction ? '【' + enemyTemplate.faction + '】' : '';
            this.log('⚔️ 【' + count + 'v' + count + ' 遭遇戰】迎戰 ' + count + ' 名' + factionTag + '【Lv.' + enemyTemplate.lv + ' ' + enemyTemplate.name + '】！', 'combat');

            this.enemies.forEach(function (e) {
                if (e.affixes && e.affixes.length > 0) {
                    var afNames = e.affixes.map(function (a) {
                        return '「[' + (a.category || '宿敵') + '] ' + a.name + '」';
                    }).join('、');
                    self.log('👹 遭遇 [' + e.rarityName + '] 強敵【' + e.name + '】附帶 PoE 詞綴：' + afNames + '！', 'time');
                }
            });

            this.runPluginHooks('onBattleStart', { enemies: this.enemies, partyMembers: partyMembers });

            if (this.isAutoBattle) {
                this.autoTactics.startAutoLoop();
            }
            this.onUpdateUI();
        }

        useSkill(leaderSkillId) {
            this.syncCurrentEnemyPointer();
            if (!this.currentEnemy) return;

            var partySys = window.HY.game && window.HY.game.partySys;
            var partyMembers = partySys ? partySys.getPartyMembers() : [this.charSys.state];
            var activeChar = this.charSys.state;
            var self = this;

            this._turnCounter += 1;

            if (activeChar.currentHp > 0) {
                this.playerTurn.performCharAttack(activeChar, leaderSkillId, true, partyMembers, false);
            }

            partyMembers.forEach(function (member) {
                if (member.id === activeChar.id) return;
                if (member.currentHp <= 0 || !self.currentEnemy) return;
                var allySkill = self.autoTactics.pickTacticalSkillForChar(member, false);
                self.playerTurn.performCharAttack(member, allySkill, false, partyMembers, false);
            });

            if (!this.currentEnemy) { this.handleVictory(); return; }

            var leaderStats = this.charSys.getDerivedStatsForChar(activeChar);

            this.playerTurn.companionTurn(leaderStats, partyMembers);
            this.syncCurrentEnemyPointer();
            if (!this.currentEnemy) { this.handleVictory(); return; }

            this.playerTurn.petTurn(leaderStats, partyMembers);
            this.syncCurrentEnemyPointer();
            if (!this.currentEnemy) { this.handleVictory(); return; }

            this.enemyTurn.enemiesTurn(partyMembers);
            this.onUpdateUI();
        }

        handleVictory() {
            if (!this.enemies || this.enemies.length === 0) return;
            this.stopAutoLoop();

            var defeatedList = this.enemies.slice();
            this.enemies = [];
            this.currentEnemy = null;

            var count = Math.max(1, defeatedList.length);
            var totalExp = 0, totalSp = 0, totalGold = 0;

            defeatedList.forEach(function (e) {
                if (!e) return;
                totalExp += (e.exp || 0);
                totalSp += (e.sp || 0);
                totalGold += (e.gold || 0);
            });

            var finalExp  = Math.max(1, Math.floor(totalExp / 5));
            var finalSp   = Math.max(1, Math.floor(totalSp / 10));
            var finalGold = Math.max(1, Math.floor(totalGold / 10));

            var tplName = (this.lastEnemyTemplate && this.lastEnemyTemplate.name)
                ? this.lastEnemyTemplate.name
                : ((defeatedList[0] && defeatedList[0].name) || '強敵');

            this.log('🏆 戰鬥大捷！我方小隊成功殲滅了全數 ' + count + ' 名【' + tplName + '】！', 'combat');
            this.charSys.gainRewards(finalExp, finalSp, finalGold);

            var poeSys = window.HY.game && window.HY.game.poeSys;
            var self = this;
            var rLabelMap = { normal: '⚪白裝', magic: '🔵藍裝', rare: '🟡黃裝', unique: '🟠傳奇暗金' };

            if (poeSys) {
                defeatedList.forEach(function (e) {
                    if (!e) return;

                    var droppedEquip = poeSys.rollEquipmentDropByEnemy(e);
                    if (droppedEquip) {
                        var rTag = rLabelMap[droppedEquip.rarity] || '裝備';
                        self.log('🗡️ 掉落裝備：【[' + rTag + '] ' + (droppedEquip.rareTitle || '') + droppedEquip.name + ' (Lv.' + droppedEquip.reqLv + ')】x1', 'loot');
                    }

                    var droppedOrb = poeSys.rollCurrencyDropByEnemy(e);
                    if (droppedOrb) {
                        self.log('💎 掉落通貨：【' + droppedOrb.name + '】x1', 'loot');
                    }
                });
            }

            this.runPluginHooks('onVictory', { defeatedEnemies: defeatedList });
            this.onUpdateUI();
            this.autoTactics.scheduleAutoRepeat();
        }

        handleDefeat() {
            this.stopAutoLoop();
            this.clearRepeatTimeout();
            if (this.isAutoBattle) {
                this.isAutoBattle = false;
                this.log('⚠️ 因小隊全滅，自動戰鬥已安全停止。', 'time');
            }
            this.log('💀 小隊重傷不支，馬博士緊急啟動時空傳送將全隊救回實驗室療傷...', 'combat');
            this.charSys.restoreAllPartyVitals(0.5);
            this.runPluginHooks('onDefeat', {});
            this.enemies = [];
            this.currentEnemy = null;
            this.onUpdateUI();
        }

        flee() {
            this.clearBattleState();
            this.log('🏃 你啟動腕錶上的群體時空躍遷裝置，帶領小隊脫離了戰鬥。', 'time');
            this.onUpdateUI();
        }
    }

    window.HY.CombatCore = CombatCore;
    window.HY.CombatSystem = CombatCore;
})();