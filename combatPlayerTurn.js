// js/combatPlayerTurn.js  (v51)
// 我方出招、招式屬性、幫會祝福、改命、群俠與靈獸助戰、八元素附傷
//
// v51 修正（門派特色補完）：
//   ⭐ performCharAttack 改為逐目標查詢 sectFeatSys.getAttackerMods，
//      實際套用門派特色的：攻擊加成、命中加成、無視閃避、必中、暴擊加成、破甲、群攻增幅
//   ⭐ 命中判定：forceHit 時跳過骰
//   ⭐ 破甲計算：加上 penBonus
//   ⭐ 群攻增幅：AoE 時 rawDmg *= (1 + aoeBonus)
window.HY = window.HY || {};

(function () {
    var MARTIAL_DIV = 4;

    var IDENTITY_MODS = {
        atkMult: 1, hitFlat: 0, evaIgnore: 0, forceHit: false,
        critFlat: 0, penBonus: 0, aoeBonus: 0
    };

    class CombatPlayerTurn {
        constructor(combatCore) { this.core = combatCore; }

        getMostWoundedMember(partyMembers, mode) {
            var core = this.core;
            var best = null, bestRatio = 2.0;
            (partyMembers || []).forEach(function (m) {
                if (!m || m.currentHp <= 0) return;
                var d = core.charSys.getDerivedStatsForChar(m);
                var ratio = (mode === 'mp')
                    ? ((d.maxMp > 0) ? (m.currentMp / d.maxMp) : 1)
                    : ((d.maxHp > 0) ? (m.currentHp / d.maxHp) : 1);
                if (ratio < bestRatio) { bestRatio = ratio; best = m; }
            });
            return (bestRatio >= 0.999) ? null : best;
        }

        applyHeal(charObj, hp, mp) {
            var core = this.core;
            var featSys = window.HY.game && window.HY.game.sectFeatSys;
            if (hp > 0 && featSys && typeof featSys.notifyHeal === 'function') {
                hp = featSys.notifyHeal(charObj, hp);
            }
            core.charSys.restoreVitals(hp || 0, mp || 0, charObj);
        }

        performCharAttack(charObj, skillId, isLeader, partyMembers, isTwinEcho, healTarget) {
            var core = this.core;
            var charSys = core.charSys;
            core.syncCurrentEnemyPointer();
            if (!core.currentEnemy) return;

            var Data = window.HY.Data;
            var affixSys = window.HY.game && window.HY.game.affixSys;
            var elemSys = window.HY.game && window.HY.game.elementSys;
            var setFeatSys = window.HY.game && window.HY.game.sectFeatSys;
            var art = Data.MARTIAL_ARTS[skillId] || Data.MARTIAL_ARTS.basic_punch;

            var isSupportMode = !!(healTarget && healTarget.currentHp > 0);

            if (art.sectReq && art.sectReq !== charObj.sect) {
                art = Data.MARTIAL_ARTS.basic_punch;
                skillId = 'basic_punch';
                isSupportMode = false;
            }

            var stats = charSys.getDerivedStatsForChar(charObj);

            var rtLv        = core.getCharBlessingLv(charObj, 'poe_rt');
            var cocLv       = core.getCharBlessingLv(charObj, 'poe_coc');
            var vaalPactLv  = core.getCharBlessingLv(charObj, 'poe_vaal_pact');
            var cullLv      = core.getCharBlessingLv(charObj, 'poe_culling');
            var ancestralLv = core.getCharBlessingLv(charObj, 'poe_ancestral');

            var redDustLv     = core.getCharDestinyLv(charObj, 'gg_red_dust_box');
            var flyingKnifeLv = core.getCharDestinyLv(charObj, 'gg_flying_dagger');
            var quadSpiritLv  = core.getCharDestinyLv(charObj, 'gg_quad_spirit');
            var bloodDemonLv  = core.getCharDestinyLv(charObj, 'gg_blood_demon');
            var bloodSpiritLv = core.getCharDestinyLv(charObj, 'gg_blood_spirit');
            var martialGodLv  = core.getCharDestinyLv(charObj, 'gg_martial_god');
            var woodLongLv    = core.getCharDestinyLv(charObj, 'gg_wood_longevity');
            var beyondHeavLv  = core.getCharDestinyLv(charObj, 'gg_beyond_heaven');
            var killingIntLv  = core.getCharDestinyLv(charObj, 'gg_killing_intent');

            var usedBloodSpirit = false;
            if (!isTwinEcho) {
                if (charObj.currentMp >= art.mpCost) {
                    charObj.currentMp -= art.mpCost;
                } else if (bloodSpiritLv > 0 && charObj.currentHp > art.mpCost + 20) {
                    charObj.currentHp -= art.mpCost;
                    usedBloodSpirit = true;
                } else {
                    art = Data.MARTIAL_ARTS.basic_punch;
                    skillId = 'basic_punch';
                    isSupportMode = false;
                }
            }

            var lv = (charObj.skills && charObj.skills[skillId]) || 1;
            var skillMult = art.baseMult + (lv - 1) * 0.14;

            var artPen = (art.armorPen || 0) / MARTIAL_DIV;
            var basePen = Math.min(0.85,
                artPen +
                (rtLv > 0 ? 0.025 + rtLv * 0.0075 : 0) +
                ((beyondHeavLv > 0 && (art.isAoe || art.sectReq)) ? 0.06 + beyondHeavLv * 0.01 : 0)
            );

            var targetList = art.isAoe
                ? core.enemies.filter(function (e) { return e.currentHp > 0; })
                : [core.currentEnemy];

            var artHitBonus = (art.hitBonus || 0) / MARTIAL_DIV;
            var artCritBonus = (art.critBonus || 0) / MARTIAL_DIV;

            var totalDealt = 0;
            var critCount = 0;
            var missCount = 0;
            var elemLogTotal = '';
            var elemDmgTotal = 0;

            targetList.forEach(function (target) {
                // ⭐ v51：逐目標查詢門派特色修正
                var mods = (setFeatSys && typeof setFeatSys.getAttackerMods === 'function' && !isSupportMode)
                    ? setFeatSys.getAttackerMods(charObj, target, art.isAoe)
                    : IDENTITY_MODS;

                var effAtk = stats.atk * mods.atkMult;
                var effHit = stats.hit + artHitBonus + mods.hitFlat;
                var effCrit = stats.crit + artCritBonus + mods.critFlat;
                var effTargetEva = Math.max(0, (target.eva || 0) - mods.evaIgnore);
                var effPen = Math.min(0.85, basePen + mods.penBonus);

                var minHitFloor = rtLv > 0 ? Math.min(75, 35 + rtLv * 2.5) : 25;
                var actualHitChance = Math.min(95, Math.max(minHitFloor, effHit - effTargetEva));

                // ⭐ 天龍滿層「必中」：forceHit 直接跳過骰
                if (!mods.forceHit && Math.random() * 100 > actualHitChance) {
                    missCount += 1;
                    return;
                }

                var extraCrit = ((beyondHeavLv > 0 && (art.isAoe || art.sectReq)) ? 6 + beyondHeavLv : 0);
                var netCritChance = Math.min(88, Math.max(1, (effCrit + extraCrit) - (target.critRes || 0)));
                var isCrit = Math.random() * 100 < netCritChance;
                if (isCrit) critCount += 1;

                var effectiveDef = target.def * (1 - effPen);
                var rawDmg = effAtk * skillMult - effectiveDef * 0.6;
                rawDmg = Math.max(5, rawDmg);

                if (bloodDemonLv > 0) rawDmg *= (1 + 0.05 + bloodDemonLv * 0.015);
                if (usedBloodSpirit) rawDmg *= (1 + 0.125 + bloodSpiritLv * 0.025);
                if (martialGodLv > 0 && charObj.currentHp < stats.maxHp * 0.8) {
                    var lostHp = Math.max(0, stats.maxHp - charObj.currentHp);
                    rawDmg += lostHp * (0.10 + martialGodLv * 0.025);
                }

                if (isCrit) rawDmg *= (stats.critDmg || 165) / 100;

                // ⭐ 唐門群攻增幅
                if (art.isAoe && mods.aoeBonus > 0) {
                    rawDmg *= (1 + mods.aoeBonus);
                }
                if (art.isAoe && targetList.length > 1) rawDmg *= 0.85;

                var finalDmg = Math.floor(rawDmg * (0.95 + Math.random() * 0.1));
                target.currentHp = Math.max(0, target.currentHp - finalDmg);
                totalDealt += finalDmg;

                if (elemSys && target.currentHp > 0) {
                    var eRes = elemSys.calcElementDamage(charObj, target);
                    if (eRes && eRes.total > 0) {
                        target.currentHp = Math.max(0, target.currentHp - eRes.total);
                        totalDealt += eRes.total;
                        elemDmgTotal += eRes.total;
                        if (eRes.log) elemLogTotal = eRes.log;
                    }
                }

                if (isCrit && cocLv > 0 && target.currentHp > 0) {
                    var cocDmg = Math.max(5, Math.floor(stats.atk * (0.25 + cocLv * 0.05)));
                    target.currentHp = Math.max(0, target.currentHp - cocDmg);
                    totalDealt += cocDmg;
                    core.log('⚡ [幫會祝福・CoC] 【' + charObj.name + '】暴擊觸發天魔雷暴，對【' + target.name + '】追加 ' + cocDmg + ' 傷害！', 'combat');
                }

                if (cullLv > 0 && target.currentHp > 0 && target.currentHp <= target.maxHp * ((5 + cullLv * 0.5) / 100)) {
                    target.currentHp = 0;
                    core.log('💀 [幫會祝福・處刑撲殺] 【' + charObj.name + '】直接斬殺了殘血的【' + target.name + '】！', 'combat');
                }

                if (affixSys) {
                    affixSys.onEnemyStruck(target, charObj, finalDmg);
                    if (target.currentHp <= 0) affixSys.onEnemyDeath(target, partyMembers || [charObj]);
                }
            });

            if (missCount === targetList.length) {
                core.log('💨 【' + charObj.name + '】施展《' + art.name + '》，但被對手閃避了！', 'combat');
                if (!isTwinEcho) {
                    core.runPluginHooks('onAfterPlayerAttack', { charObj: charObj, skillId: skillId, totalDealt: 0 });
                }
                core.syncCurrentEnemyPointer();
                return;
            }

            if (!art.isAoe && ancestralLv > 0) {
                var otherAlive = core.enemies.filter(function (e) { return e.currentHp > 0 && e.uid !== targetList[0].uid; });
                if (otherAlive.length > 0) {
                    var extraTarget = otherAlive[Math.floor(Math.random() * otherAlive.length)];
                    var ancDmg = Math.max(5, Math.floor(stats.atk * (0.175 + ancestralLv * 0.035)));
                    extraTarget.currentHp = Math.max(0, extraTarget.currentHp - ancDmg);
                    core.log('🌪️ [幫會祝福・先祖戰吼] 【' + charObj.name + '】的先祖幻影對【' + extraTarget.name + '】追加 ' + ancDmg + ' 傷害！', 'combat');
                }
            }

            if (flyingKnifeLv > 0) {
                var aliveForKnife = core.enemies.filter(function (e) { return e.currentHp > 0; });
                if (aliveForKnife.length > 0) {
                    var knifeTarget = aliveForKnife[Math.floor(Math.random() * aliveForKnife.length)];
                    var knifeDmg = Math.max(5, Math.floor(stats.atk * (0.275 + flyingKnifeLv * 0.06)));
                    knifeTarget.currentHp = Math.max(0, knifeTarget.currentHp - knifeDmg);
                    core.log('🗡️ [後天改命・小李飛刀] 【' + charObj.name + '】例無虛發，飛刀對【' + knifeTarget.name + '】造成 ' + knifeDmg + ' 傷害！', 'combat');
                }
            }

            if (redDustLv > 0) {
                var aliveForBox = core.enemies.filter(function (e) { return e.currentHp > 0; });
                if (aliveForBox.length > 0) {
                    var boxDmgEach = Math.max(5, Math.floor(stats.atk * (0.225 + redDustLv * 0.05)));
                    aliveForBox.forEach(function (e) { e.currentHp = Math.max(0, e.currentHp - boxDmgEach); });
                    core.log('🗡️ [後天改命・紅塵劍匣] 【' + charObj.name + '】劍匣齊射，對敵方全體各造成 ' + boxDmgEach + ' 點劍氣傷害！', 'combat');
                }
            }

            if (killingIntLv > 0 && Math.random() * 100 < (10 + killingIntLv * 2)) {
                var aliveForKill = core.enemies.filter(function (e) { return e.currentHp > 0; });
                if (aliveForKill.length > 0) {
                    var killTarget = aliveForKill[0];
                    var killDmg = Math.max(10, Math.floor(stats.atk * (0.325 + killingIntLv * 0.05) * 1.65));
                    killTarget.currentHp = Math.max(0, killTarget.currentHp - killDmg);
                    core.log('👹 [後天改命・殺心驟起] 【' + charObj.name + '】對【' + killTarget.name + '】追加會心斬擊 ' + killDmg + ' 傷害！', 'combat');
                }
            }

            var totalLeechRatio = (vaalPactLv > 0 ? 0.025 + vaalPactLv * 0.0075 : 0) + (bloodDemonLv > 0 ? 0.04 + bloodDemonLv * 0.01 : 0);
            var leechText = '';
            if (totalLeechRatio > 0 && totalDealt > 0) {
                var leechHp = Math.max(2, Math.floor(totalDealt * totalLeechRatio));
                this.applyHeal(charObj, leechHp, 0);
                leechText = ' [🩸吸血+' + leechHp + ']';
            }

            if (woodLongLv > 0) {
                var woodHp = Math.max(2, Math.floor(stats.maxHp * (0.04 + woodLongLv * 0.0075)));
                var woodMp = Math.max(2, Math.floor(stats.maxMp * (0.04 + woodLongLv * 0.0075)));
                this.applyHeal(charObj, woodHp, woodMp);
                leechText += ' [🌸水木長生+' + woodHp + 'HP/+' + woodMp + 'MP]';
            }

            var supportText = '';
            if (isSupportMode) {
                if (art.healRatio) {
                    var healVal = Math.floor(stats.maxHp * (art.healRatio / MARTIAL_DIV));
                    this.applyHeal(healTarget, healVal, 0);
                    supportText += ' [💚轉療【' + healTarget.name + '】+' + healVal + 'HP]';
                }
                if (art.mpRestore) {
                    var mpVal = Math.floor(art.mpRestore / MARTIAL_DIV);
                    charSys.restoreVitals(0, mpVal, healTarget);
                    supportText += ' [💧轉補【' + healTarget.name + '】+' + mpVal + 'MP]';
                }
            } else {
                if (art.healRatio) {
                    var heal = Math.floor(stats.maxHp * (art.healRatio / MARTIAL_DIV));
                    this.applyHeal(charObj, heal, 0);
                }
                if (art.mpRestore) {
                    charSys.restoreVitals(0, Math.floor(art.mpRestore / MARTIAL_DIV), charObj);
                }
            }

            var targetDesc = (art.isAoe && targetList.length > 1)
                ? '敵方全體 (' + targetList.length + '人) 共造成 ' + totalDealt
                : '【' + targetList[0].name + '】造成 ' + totalDealt;

            var elemTag = (elemDmgTotal > 0) ? ' [' + elemLogTotal + ']' : '';
            var prefix = isSupportMode ? '🤝 [隊員輔助] ' : (isTwinEcho ? '🔥 [雙靈共生・二連擊] ' : (isLeader ? '⚔️ ' : '👥 隊友'));

            var logMsg = prefix +
                '【' + charObj.name + '】' + (usedBloodSpirit ? '(💧血靈燃血) ' : '') + '施展《' + art.name + '》，對' + targetDesc + ' 點傷害' +
                (critCount > 0 ? ' (💥會心!)' : '') + elemTag + supportText + leechText + '！';

            core.log(logMsg, 'combat');

            if (!isTwinEcho) {
                core.runPluginHooks('onAfterPlayerAttack', { charObj: charObj, skillId: skillId, totalDealt: totalDealt });
            }

            core.syncCurrentEnemyPointer();

            if (!isTwinEcho && !isSupportMode && quadSpiritLv > 0 && core.currentEnemy && Math.random() * 100 < (12.5 + quadSpiritLv * 2.5)) {
                this.performCharAttack(charObj, skillId, isLeader, partyMembers, true, null);
            }
        }

        companionTurn(playerStats, partyMembers) {
            var core = this.core;
            var compSys = core.companionSys || (window.HY.game && window.HY.game.companionSys);
            var affixSys = window.HY.game && window.HY.game.affixSys;
            if (!compSys || !core.currentEnemy) return;

            var comp = compSys.getActiveCompanionInfo();
            if (!comp) return;

            var compDmg = Math.floor(playerStats.atk * comp.powerMult - core.currentEnemy.def * 0.3);
            if (comp.actionType === 'true_damage') compDmg = Math.floor(playerStats.atk * comp.powerMult);
            compDmg = Math.max(5, compDmg);

            var target = core.currentEnemy;
            target.currentHp = Math.max(0, target.currentHp - compDmg);
            var msg = '🤝 護法【' + comp.name + '】施展《' + comp.skillName + '》助陣，對【' + target.name + '】造成 ' + compDmg + ' 點傷害！';

            var supportTags = '';
            if (comp.actionType === 'heal_support' || comp.actionType === 'all_round') {
                var healTarget = this.getMostWoundedMember(partyMembers, 'hp') || core.charSys.state;
                var heal = Math.floor(25 + comp.lv * 15);
                this.applyHeal(healTarget, heal, 0);
                supportTags += ' [💚治療【' + healTarget.name + '】+' + heal + 'HP]';
            }
            if (comp.actionType === 'mp_support' || comp.actionType === 'all_round') {
                var mpTarget = this.getMostWoundedMember(partyMembers, 'mp') || core.charSys.state;
                var mpGain = Math.floor(15 + comp.lv * 8);
                core.charSys.restoreVitals(0, mpGain, mpTarget);
                supportTags += ' [💧回內【' + mpTarget.name + '】+' + mpGain + 'MP]';
            }

            core.log(msg + supportTags, 'combat');
            if (target.currentHp <= 0 && affixSys) affixSys.onEnemyDeath(target, partyMembers || [core.charSys.state]);
        }

        petTurn(playerStats, partyMembers) {
            var core = this.core;
            var petSys = window.HY.game && window.HY.game.petSys;
            var affixSys = window.HY.game && window.HY.game.affixSys;
            if (!petSys || !core.currentEnemy) return;

            var pet = petSys.getActivePetInfo();
            if (!pet) return;

            var petDmg = Math.floor(playerStats.atk * pet.powerMult - core.currentEnemy.def * 0.25);
            if (pet.effectType === 'dragon_breath') petDmg = Math.floor(playerStats.atk * pet.powerMult);
            petDmg = Math.max(5, petDmg);

            var target = core.currentEnemy;
            target.currentHp = Math.max(0, target.currentHp - petDmg);
            var msg = '🐉 靈獸【' + pet.name + '】發動《' + pet.skillName + '》，對【' + target.name + '】造成 ' + petDmg + ' 點傷害！';

            if (pet.effectType === 'drain_bite' || pet.effectType === 'dragon_breath') {
                var petHealTarget = this.getMostWoundedMember(partyMembers, 'hp') || core.charSys.state;
                var heal = Math.floor(15 + pet.lv * 12);
                this.applyHeal(petHealTarget, heal, heal);
                msg += ' [💚回復【' + petHealTarget.name + '】+' + heal + 'HP/+' + heal + 'MP]';
            }

            core.log(msg, 'combat');
            if (target.currentHp <= 0 && affixSys) affixSys.onEnemyDeath(target, partyMembers || [core.charSys.state]);
        }
    }

    window.HY.CombatPlayerTurn = CombatPlayerTurn;
})();