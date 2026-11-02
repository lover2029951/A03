// js/combatEnemyTurn.js  (v46)
// 敵方小隊反擊、宗門絕技、詞綴追擊、我方防禦祝福/改命觸發、八元素傷害
//
// v46 修正（門派特色補完）：
//   ⭐ 目標防禦力改乘 sectFeatSys.getDefenderMods(charObj).defMult
//      → 絕情谷「陰劍防禦 +40%」、峨嵋「慈悲全隊防禦」實際生效
//   ⭐ 濺射傷害（eff==='aoe'）與連鎖（affixSystem）都改用 Math.max(0, ...)
//      維持與主傷害一致（原本保底 1 血使團滅無法由濺射達成）
window.HY = window.HY || {};

(function () {
    var ENEMY_MP_REGEN = 0.04;

    var IDENTITY_DEFENDER = { defMult: 1 };

    class CombatEnemyTurn {
        constructor(combatCore) { this.core = combatCore; }

        getSkillMpCost(enemy, skill) {
            var lv = (enemy && enemy.lv) || 1;
            var mult = (skill && skill.mult) || 1.25;
            return Math.floor(mult * (lv * 3 + 20));
        }

        executeSingleEnemyAction(enemy, partyMembers, extraActionAffix) {
            var core = this.core;
            var charSys = core.charSys;
            var affixSys = window.HY.game && window.HY.game.affixSys;
            var elemSys = window.HY.game && window.HY.game.elementSys;
            var setFeatSys = window.HY.game && window.HY.game.sectFeatSys;
            var aliveParty = partyMembers.filter(function (m) { return m.currentHp > 0; });
            if (aliveParty.length === 0) return;

            var targetMember = aliveParty[Math.floor(Math.random() * aliveParty.length)];
            var targetStats = charSys.getDerivedStatsForChar(targetMember);

            // ⭐ v46：我方門派特色的防禦力乘算（絕情谷陰劍 / 峨嵋慈悲全隊）
            var defMods = (setFeatSys && typeof setFeatSys.getDefenderMods === 'function')
                ? setFeatSys.getDefenderMods(targetMember)
                : IDENTITY_DEFENDER;
            var effectiveTargetDef = targetStats.def * defMods.defMult;

            var windDancerLv = core.getCharBlessingLv(targetMember, 'poe_wind_dancer');
            var momLv        = core.getCharBlessingLv(targetMember, 'poe_mom');
            var cwdtLv       = core.getCharBlessingLv(targetMember, 'poe_cwdt');
            var unityLv      = core.getCharDestinyLv(targetMember, 'gg_unity_mantra');

            var useEnemySkill = enemy.skills && enemy.skills.length > 0 && Math.random() < 0.65;
            var chosenSkill = useEnemySkill ? enemy.skills[Math.floor(Math.random() * enemy.skills.length)] : null;

            var mpCost = 0, manaText = '';
            if (chosenSkill) {
                mpCost = this.getSkillMpCost(enemy, chosenSkill);
                if ((enemy.currentMp || 0) < mpCost) {
                    chosenSkill = null; mpCost = 0;
                    manaText = ' [內力不足]';
                } else {
                    enemy.currentMp = Math.max(0, (enemy.currentMp || 0) - mpCost);
                    manaText = ' [耗內 ' + mpCost + ']';
                }
            }

            var enemyHitChance = Math.min(95, Math.max(20, (enemy.hit || 95) - targetStats.eva));
            if (Math.random() * 100 > enemyHitChance) {
                var skillLabel = chosenSkill ? '絕技《' + chosenSkill.name + '》' : '攻勢';
                var wdMsg = '';
                if (windDancerLv > 0) {
                    var wdHeal = 10 + windDancerLv * 8;
                    charSys.restoreVitals(wdHeal, wdHeal, targetMember);
                    wdMsg = ' [🍃風魔舞者祝福 +' + wdHeal + 'HP/MP]';
                }
                core.log('🍃 【' + targetMember.name + '】憑藉輕功閃過了【' + enemy.name + '】的' + skillLabel + manaText + wdMsg + '！', 'combat');
                this.regenMp(enemy, extraActionAffix);
                return;
            }

            var rawEnemyCrit = (enemy.crit || 10);
            var netEnemyCrit = Math.max(5, Math.min(75, rawEnemyCrit - targetStats.critRes));
            var isEnemyCrit = Math.random() * 100 < netEnemyCrit;
            var resistedCrit = !isEnemyCrit && rawEnemyCrit >= 15 && targetStats.critRes >= rawEnemyCrit;

            var mult = chosenSkill ? (chosenSkill.mult || 1.25) : 1.0;
            var eff = chosenSkill ? (chosenSkill.effect || 'normal') : 'normal';

            var penAf = affixSys ? affixSys.hasProperty(enemy, 'armorPen') : null;
            var defFactor = (eff === 'pierce' || penAf) ? 0.40 : 0.7;
            // ⭐ v46：改用 effectiveTargetDef（含門派特色防禦乘算）
            var enemyDmg = enemy.atk * mult - effectiveTargetDef * defFactor;

            var execAf = affixSys ? affixSys.hasProperty(enemy, 'executioner') : null;
            if (execAf && targetMember.currentHp < targetStats.maxHp * 0.5) {
                enemyDmg *= (1 + (execAf.executeBonus || 0.40));
            }

            if (isEnemyCrit) enemyDmg *= 1.55;
            if (targetStats.dmgReduce > 0) enemyDmg *= (1 - targetStats.dmgReduce / 100);

            var cwdtTriggered = false;
            if (cwdtLv > 0 && targetMember.currentHp <= targetStats.maxHp * 0.65) {
                var cwdtRed = Math.min(0.30, 0.075 + cwdtLv * 0.01);
                enemyDmg *= (1 - cwdtRed);
                cwdtTriggered = true;
            }

            enemyDmg = Math.max(3, Math.floor(enemyDmg * (0.9 + Math.random() * 0.2)));

            var momTag = '';
            if (momLv > 0 && targetMember.currentMp > 0) {
                var momRatio = Math.min(0.25, 0.10 + momLv * 0.0075);
                var mpAbsorb = Math.min(targetMember.currentMp, Math.floor(enemyDmg * momRatio));
                if (mpAbsorb > 0) {
                    targetMember.currentMp -= mpAbsorb;
                    enemyDmg -= mpAbsorb;
                    momTag = ' [💧心靈昇華 -' + mpAbsorb + 'MP]';
                }
            }

            targetMember.currentHp = Math.max(0, targetMember.currentHp - enemyDmg);

            var elemTag = '';
            if (elemSys && targetMember.currentHp > 0) {
                var eRes = elemSys.calcEnemyElementDamage(enemy, targetMember);
                if (eRes && eRes.total > 0) {
                    targetMember.currentHp = Math.max(0, targetMember.currentHp - eRes.total);
                    if (eRes.log) elemTag = ' [' + eRes.log + ']';
                }
            }

            var cwdtTag = '';
            if (cwdtTriggered && targetMember.currentHp > 0) {
                var cwdtHeal = Math.max(5, Math.floor(targetStats.maxHp * (0.03 + cwdtLv * 0.005)));
                charSys.restoreVitals(cwdtHeal, 0, targetMember);
                cwdtTag = ' [🛡️不朽怒嚎祝福 +' + cwdtHeal + 'HP]';
            }

            if (unityLv > 0 && enemy.currentHp > 0) {
                var reflect = Math.max(3, Math.floor(enemyDmg * (0.10 + unityLv * 0.02)));
                enemy.currentHp = Math.max(0, enemy.currentHp - reflect);
                cwdtTag += ' [☯️歸一真訣反震 ' + reflect + '傷]';
            }

            var affixHitMsg = affixSys ? affixSys.onEnemyHitTarget(enemy, targetMember, partyMembers, enemyDmg) : '';
            var critTag = isEnemyCrit ? ' (💥敵方暴擊!)' : (resistedCrit ? ' [🛡️暴抗化解]' : '');
            var prefixTag = extraActionAffix ? '⚡ [' + extraActionAffix.name + '・追擊] ' : '💥 ';

            if (!chosenSkill) {
                core.log(prefixTag + '【' + enemy.name + '】反擊【' + targetMember.name + '】，造成 ' + enemyDmg + ' 點傷害' + manaText + critTag + momTag + cwdtTag + elemTag + affixHitMsg + '！', 'combat');
            } else {
                var extraMsg = critTag + manaText + momTag + cwdtTag + elemTag + affixHitMsg;
                if (eff === 'pierce' || penAf) extraMsg += ' [破甲!]';
                if (eff === 'drain') {
                    var drainHeal = Math.max(5, Math.floor(enemyDmg * 0.3));
                    enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + drainHeal);
                    extraMsg += ' [吸元 +' + drainHeal + 'HP]';
                }
                if (eff === 'aoe' && aliveParty.length > 1) {
                    var splashDmg = Math.max(1, Math.floor(enemyDmg * 0.4));
                    aliveParty.forEach(function (other) {
                        if (other.id !== targetMember.id) {
                            // ⭐ v46：改為 Math.max(0, ...)，與主傷害一致（可致死）
                            other.currentHp = Math.max(0, other.currentHp - splashDmg);
                        }
                    });
                    extraMsg += ' [劍氣橫掃全隊 ' + splashDmg + '傷!]';
                }
                core.log(prefixTag + '【' + enemy.name + '】施展《' + chosenSkill.name + '》，對【' + targetMember.name + '】造成 ' + enemyDmg + ' 點傷害' + extraMsg + '！', 'combat');
            }

            core.runPluginHooks('onAfterEnemyAttack', { enemy: enemy, targetMember: targetMember, enemyDmg: enemyDmg });
            this.regenMp(enemy, extraActionAffix);
        }

        regenMp(enemy, extraActionAffix) {
            if (!enemy || extraActionAffix) return;
            if (enemy.currentHp <= 0) return;
            if (typeof enemy.maxMp !== 'number' || enemy.maxMp <= 0) return;
            var cur = enemy.currentMp || 0;
            if (cur >= enemy.maxMp) return;
            var regen = Math.max(1, Math.floor(enemy.maxMp * ENEMY_MP_REGEN));
            enemy.currentMp = Math.min(enemy.maxMp, cur + regen);
        }

        enemiesTurn(partyMembers) {
            var self = this;
            var core = this.core;
            var affixSys = window.HY.game && window.HY.game.affixSys;
            var aliveEnemies = core.enemies.filter(function (e) { return e.currentHp > 0; });

            core._turnCounter = (core._turnCounter || 0) + 1;

            aliveEnemies.forEach(function (enemy) {
                self.executeSingleEnemyAction(enemy, partyMembers, null);
                var extraAf = affixSys ? affixSys.hasProperty(enemy, 'extraAction') : null;
                if (extraAf && enemy.currentHp > 0) {
                    self.executeSingleEnemyAction(enemy, partyMembers, extraAf);
                }
                if (affixSys && enemy.currentHp > 0) {
                    affixSys.onEnemyTurnEnd(enemy);
                }
            });

            var stillAlive = partyMembers.filter(function (m) { return m.currentHp > 0; });
            if (stillAlive.length === 0) core.handleDefeat();
        }
    }

    window.HY.CombatEnemyTurn = CombatEnemyTurn;
})();