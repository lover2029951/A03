// js/spiritRootSystem.js  (v3)
// 專責「八大靈根隨機分配、靈根淬鍊升級、洗髓易根、相生相剋與戰鬥觸發」
//
// v3 修正（收尾整理）：
//   ⭐ 神通觸發機率改讀各靈根的 triggerChance（資料驅動，與 triggerDesc 同源）
//   ⭐ 土靈根受擊觸發改讀 defenseTriggerChance（原本硬寫 0.35）
//   ⭐ 保留 v2 的元素體系去重（元素傷害統一由 elementSystem 產出）
window.HY = window.HY || {};

(function () {
    function fallbackTriggerChance() {
        var G = window.HY && window.HY.GameConfig;
        if (G && G.spiritRoot && typeof G.spiritRoot.triggerChance === 'number') {
            return G.spiritRoot.triggerChance;
        }
        return 0.30;
    }

    class SpiritRootSystem {
        constructor(app) {
            this.app = app;
            this.integrateIntoEquipmentAndSkills();
            this.hookCharacterAndCombat();
        }

        pickRandomRootId() {
            var Data = window.HY.Data;
            var keys = Object.keys((Data && Data.SPIRIT_ROOTS) || { metal: 1 });
            return keys[Math.floor(Math.random() * keys.length)];
        }

        ensureCharRoot(charObj) {
            if (!charObj) return;
            if (!charObj.spiritRoot) {
                charObj.spiritRoot = this.pickRandomRootId();
            }
            if (!charObj.spiritRootLv) {
                charObj.spiritRootLv = 1;
            }
        }

        ensureAllRosterRoots() {
            var root = this.app.charSys && this.app.charSys.rootState;
            if (!root || !Array.isArray(root.roster)) return;
            var self = this;
            root.roster.forEach(function (c) {
                self.ensureCharRoot(c);
            });
        }

        integrateIntoEquipmentAndSkills() {
            var Data = window.HY.Data;
            if (!Data) return;

            if (Array.isArray(Data.POE_PREFIXES)) {
                var beforeP = Data.POE_PREFIXES.length;
                Data.POE_PREFIXES = Data.POE_PREFIXES.filter(function (p) {
                    return p.groupId !== 'flat_elematk';
                });
                if (Data.POE_PREFIXES.length !== beforeP) {
                    console.log('[spiritRootSystem] 已移除重複的 flat_elematk 前綴（元素攻防統一由 elAtk_* / elDef_* 處理）');
                }
            }
            if (Array.isArray(Data.POE_SUFFIXES)) {
                var beforeS = Data.POE_SUFFIXES.length;
                Data.POE_SUFFIXES = Data.POE_SUFFIXES.filter(function (s) {
                    return s.groupId !== 'suffix_elemdef';
                });
                if (Data.POE_SUFFIXES.length !== beforeS) {
                    console.log('[spiritRootSystem] 已移除重複的 suffix_elemdef 後綴');
                }
            }
        }

        getElementCounterInfo(attackerRootId, defenderRootId) {
            var Data = window.HY.Data;
            if (!Data || !Data.SPIRIT_ROOTS || !attackerRootId || !defenderRootId) {
                return { mult: 1.0, state: 'neutral', tag: '' };
            }
            var atkRoot = Data.SPIRIT_ROOTS[attackerRootId];
            var defRoot = Data.SPIRIT_ROOTS[defenderRootId];
            if (!atkRoot || !defRoot) return { mult: 1.0, state: 'neutral', tag: '' };

            if (atkRoot.counters === defenderRootId) {
                return {
                    mult: 1.35,
                    state: 'counter',
                    tag: ' [☯️' + atkRoot.shortName + '剋' + defRoot.shortName + ' +35%!]'
                };
            }
            if (defRoot.counters === attackerRootId) {
                return {
                    mult: 0.80,
                    state: 'resisted',
                    tag: ' [🛡️遭' + defRoot.shortName + '靈根克制 -20%]'
                };
            }
            return { mult: 1.0, state: 'neutral', tag: '' };
        }

        getUpgradeRootSpCost(charObj) {
            var c = charObj || this.app.charSys.state;
            this.ensureCharRoot(c);
            var lv = c.spiritRootLv || 1;
            var G = window.HY && window.HY.GameConfig;
            var base = (G && G.spiritRoot && typeof G.spiritRoot.upgradeCostBase === 'number')
                ? G.spiritRoot.upgradeCostBase : 80;
            var pow = (G && G.spiritRoot && typeof G.spiritRoot.upgradeCostPow === 'number')
                ? G.spiritRoot.upgradeCostPow : 1.4;
            return Math.floor(base * Math.pow(pow, lv - 1));
        }

        upgradeCharSpiritRoot() {
            var c = this.app.charSys.state;
            this.ensureCharRoot(c);
            var Data = window.HY.Data;
            var rootMeta = Data.SPIRIT_ROOTS[c.spiritRoot];
            var cost = this.getUpgradeRootSpCost(c);

            if (this.app.charSys.rootState.sp < cost) {
                this.app.logger.add('❌ 武點不足！淬鍊【' + c.name + '】的【' + rootMeta.name + '】需要 ' + cost + ' 點武點。', 'system');
                return false;
            }

            this.app.charSys.rootState.sp -= cost;
            c.spiritRootLv = (c.spiritRootLv || 1) + 1;
            this.app.charSys.clampVitals();
            this.app.logger.add(rootMeta.icon + ' 靈根淬鍊！【' + c.name + '】的【' + rootMeta.name + '】晉升至第 ' + c.spiritRootLv + ' 境，屬性攻防與觸發威力提升！', 'wealth');
            return true;
        }

        rerollCharSpiritRoot() {
            var c = this.app.charSys.state;
            this.ensureCharRoot(c);
            var G = window.HY && window.HY.GameConfig;
            var costGold = (G && G.spiritRoot && typeof G.spiritRoot.rerollCostGold === 'number')
                ? G.spiritRoot.rerollCostGold : 500;
            if (this.app.charSys.rootState.gold < costGold) {
                this.app.logger.add('❌ 紋銀不足！進行【洗髓易根】需要 ' + costGold + ' 兩紋銀。', 'system');
                return false;
            }

            var Data = window.HY.Data;
            var keys = Object.keys(Data.SPIRIT_ROOTS).filter(function (k) { return k !== c.spiritRoot; });
            var newRootId = keys[Math.floor(Math.random() * keys.length)];

            this.app.charSys.rootState.gold -= costGold;
            c.spiritRoot = newRootId;
            this.app.charSys.clampVitals();

            var newMeta = Data.SPIRIT_ROOTS[newRootId];
            this.app.logger.add('🌈 天地洗髓！【' + c.name + '】花費 ' + costGold + ' 兩重塑本源，覺醒了【' + newMeta.icon + ' ' + newMeta.name + '】！', 'system');
            return true;
        }

        hookCharacterAndCombat() {
            var self = this;
            var charSys = this.app.charSys;
            var combat = this.app.combatSys;

            this.ensureAllRosterRoots();

            var origCreateTpl = charSys.createSingleCharTemplate.bind(charSys);
            charSys.createSingleCharTemplate = function (id, name) {
                var tpl = origCreateTpl(id, name);
                tpl.spiritRoot = self.pickRandomRootId();
                tpl.spiritRootLv = 1;
                return tpl;
            };

            var origDerived = charSys.getDerivedStatsForChar.bind(charSys);
            charSys.getDerivedStatsForChar = function (charObj) {
                var c = charObj || charSys.state;
                self.ensureCharRoot(c);
                var d = origDerived(c);
                var Data = window.HY.Data;
                var rootMeta = Data.SPIRIT_ROOTS && Data.SPIRIT_ROOTS[c.spiritRoot];
                var rLv = c.spiritRootLv || 1;

                if (rootMeta && rootMeta.passiveBonus) {
                    var pb = rootMeta.passiveBonus;
                    if (pb.atk)     d.atk     += Math.floor(pb.atk * rLv);
                    if (pb.def)     d.def     += Math.floor(pb.def * rLv);
                    if (pb.maxHp)   d.maxHp   += Math.floor(pb.maxHp * rLv);
                    if (pb.maxMp)   d.maxMp   += Math.floor(pb.maxMp * rLv);
                    if (pb.hit)     d.hit     += Math.floor(pb.hit * rLv);
                    if (pb.eva)     d.eva     = Math.min(85, d.eva + Math.floor(pb.eva * rLv));
                    if (pb.crit)    d.crit    = Math.min(90, d.crit + Math.floor(pb.crit * rLv));
                    if (pb.critRes) d.critRes += Math.floor(pb.critRes * rLv);
                }

                return d;
            };

            if (combat) {
                combat.registerPlugin({
                    onBattleStart: function (core, payload) {
                        (payload.enemies || []).forEach(function (e) {
                            if (!e.spiritRoot) e.spiritRoot = self.pickRandomRootId();
                            e.elemAtk = Math.floor((e.atk || 20) * 0.75);
                            e.elemDef = Math.floor((e.def || 10) * 0.75);
                        });
                    },
                    onAfterPlayerAttack: function (core, payload) {
                        if (!payload || !payload.totalDealt || payload.totalDealt <= 0) return;
                        self.triggerPlayerSpiritRootCombat(core, payload.charObj);
                    },
                    onAfterEnemyAttack: function (core, payload) {
                        self.triggerEnemySpiritRootCombat(core, payload.enemy, payload.targetMember);
                    }
                });
            }
        }

        // 我方出手後：結算八大靈根專屬觸發（元素傷害由 elementSystem 負責）
        triggerPlayerSpiritRootCombat(core, charObj) {
            core.syncCurrentEnemyPointer();
            var target = core.currentEnemy;
            if (!target || !charObj || charObj.currentHp <= 0) return;

            this.ensureCharRoot(charObj);
            var Data = window.HY.Data;
            var rootMeta = Data.SPIRIT_ROOTS[charObj.spiritRoot];
            if (!rootMeta) return;

            // ⭐ v3：觸發機率資料驅動（各靈根自帶 triggerChance）
            var triggerChance = (typeof rootMeta.triggerChance === 'number')
                ? rootMeta.triggerChance
                : fallbackTriggerChance();

            var stats = core.charSys.getDerivedStatsForChar(charObj);
            var triggerLog = '';

            if (Math.random() < triggerChance) {
                var rId = rootMeta.id;

                // 觸發威力讀 elementSys 的八元素聚合（唯一權威來源）
                var elemAtk = 0;
                var elemSys = this.app.elementSys;
                if (elemSys && typeof elemSys.getSummary === 'function') {
                    var sum = elemSys.getSummary(charObj);
                    elemAtk = (sum && sum.totalAtk) || 0;
                }
                if (elemAtk <= 0) elemAtk = 100;

                if (rId === 'metal') {
                    var metalDmg = Math.max(10, Math.floor(elemAtk * 0.45));
                    target.currentHp = Math.max(0, target.currentHp - metalDmg);
                    triggerLog = ' 🪙觸發【' + rootMeta.triggerName + '】無視防禦斬出 ' + metalDmg + ' 金系傷！';
                } else if (rId === 'wood') {
                    var partyMembers = this.app.partySys.getPartyMembers();
                    var healVal = Math.max(10, Math.floor(stats.maxHp * 0.06));
                    partyMembers.forEach(function (m) {
                        if (m.currentHp > 0) core.charSys.restoreVitals(healVal, 0, m);
                    });
                    triggerLog = ' 🌿觸發【' + rootMeta.triggerName + '】為全隊回復 ' + healVal + ' 點氣血！';
                } else if (rId === 'water') {
                    var mpRec = Math.max(8, Math.floor(stats.maxMp * 0.10));
                    var hpRec = Math.max(10, Math.floor(stats.maxHp * 0.06));
                    core.charSys.restoreVitals(hpRec, mpRec, charObj);
                    triggerLog = ' 💧觸發【' + rootMeta.triggerName + '】回補 ' + hpRec + ' 氣血與 ' + mpRec + ' 內力！';
                } else if (rId === 'fire') {
                    var fireDmg = Math.max(12, Math.floor(elemAtk * 0.50));
                    target.currentHp = Math.max(0, target.currentHp - fireDmg);
                    triggerLog = ' 🔥觸發【' + rootMeta.triggerName + '】業火引爆追加 ' + fireDmg + ' 火系傷！';
                } else if (rId === 'earth') {
                    var earthHeal = Math.max(12, Math.floor(stats.maxHp * 0.08));
                    core.charSys.restoreVitals(earthHeal, 0, charObj);
                    triggerLog = ' 🪨觸發【戊土厚德護體】凝結大地護盾回復 ' + earthHeal + ' 氣血！';
                } else if (rId === 'ice') {
                    target.atb = Math.max(0, (target.atb || 0) - 15);
                    triggerLog = ' ❄️觸發【' + rootMeta.triggerName + '】凍結對手，使其出招集氣條倒退 -15%！';
                } else if (rId === 'lightning') {
                    var aliveEnemies = core.enemies.filter(function (e) { return e.currentHp > 0; });
                    var lightDmg = Math.max(8, Math.floor(elemAtk * 0.28));
                    aliveEnemies.forEach(function (e) {
                        e.currentHp = Math.max(0, e.currentHp - lightDmg);
                    });
                    triggerLog = ' ⚡觸發【' + rootMeta.triggerName + '】神雷連鎖轟擊敵方全體各 ' + lightDmg + ' 雷傷！';
                } else if (rId === 'wind') {
                    charObj.atb = Math.min(99, (charObj.atb || 0) + 10);
                    triggerLog = ' 🌪️觸發【' + rootMeta.triggerName + '】御風加速，自身出招集氣條瞬間 +10%！';
                }
            }

            if (triggerLog) {
                core.log(
                    rootMeta.icon + ' [' + rootMeta.name + '] 【' + charObj.name + '】' + triggerLog,
                    'combat'
                );
            }

            if (target.currentHp <= 0 && this.app.affixSys) {
                this.app.affixSys.onEnemyDeath(target, this.app.partySys.getPartyMembers());
            }
        }

        // 敵人攻擊後：判定相剋與我方【土靈根・戊土不動壁壘】反震
        triggerEnemySpiritRootCombat(core, enemy, targetMember) {
            if (!enemy || !targetMember || targetMember.currentHp <= 0) return;
            this.ensureCharRoot(targetMember);

            var Data = window.HY.Data;
            var enemyRoot = Data.SPIRIT_ROOTS[enemy.spiritRoot];
            var memberRoot = Data.SPIRIT_ROOTS[targetMember.spiritRoot];
            if (!enemyRoot || !memberRoot) return;

            var targetStats = core.charSys.getDerivedStatsForChar(targetMember);
            var counterInfo = this.getElementCounterInfo(enemy.spiritRoot, targetMember.spiritRoot);

            // ⭐ v3：土靈根受擊觸發機率資料驅動
            var earthChance = (typeof memberRoot.defenseTriggerChance === 'number')
                ? memberRoot.defenseTriggerChance
                : 0.35;

            if (targetMember.spiritRoot === 'earth' && enemy.currentHp > 0 && Math.random() < earthChance) {
                var earthReflect = Math.max(5, Math.floor(targetStats.def * 0.35));
                var earthAbsorb = Math.max(5, Math.floor(targetStats.maxHp * 0.04));
                enemy.currentHp = Math.max(0, enemy.currentHp - earthReflect);
                core.charSys.restoreVitals(earthAbsorb, 0, targetMember);
                core.log('🪨 [土靈根・戊土不動壁壘] 【' + targetMember.name + '】大地護體 (+' + earthAbsorb + 'HP)，並震傷【' + enemy.name + '】 ' + earthReflect + ' 點傷害！', 'combat');
            } else if (counterInfo.state === 'counter') {
                var bonusElem = Math.max(3, Math.floor((enemy.elemAtk || 15) * 0.35));
                targetMember.currentHp = Math.max(0, targetMember.currentHp - bonusElem);
                core.log(enemyRoot.icon + ' 敵方【' + enemy.name + '】憑藉' + counterInfo.tag + '，對【' + targetMember.name + '】追加 ' + bonusElem + ' 點靈根克制傷害！', 'combat');
            }
        }
    }

    window.HY.SpiritRootSystem = SpiritRootSystem;
})();