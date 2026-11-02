// js/affixSystem.js
// 遭遇敵人有 35% 機率隨機套用 1~3 個 PoE 詞綴並執行戰鬥詞綴效果
//
// 修正：lootMult 起算值改為 RARITY_TIERS.rewardMult → 藍/金怪掉寶加成生效
window.HY = window.HY || {};

(function () {
    class AffixSystem {
        constructor(charSys, logger) {
            this._charSys = charSys || null;
            this._logger = logger || null;
        }

        get charSys() {
            return this._charSys || (window.HY.game && window.HY.game.charSys) || null;
        }

        get logger() {
            return this._logger || (window.HY.game && window.HY.game.logger) || null;
        }

        log(msg, type) {
            var lg = this.logger;
            if (lg && typeof lg.add === 'function') {
                lg.add(msg, type || 'combat');
            }
        }

        getCharStats(member) {
            var cs = this.charSys;
            if (cs && typeof cs.getDerivedStatsForChar === 'function') {
                return cs.getDerivedStatsForChar(member);
            }
            return { maxHp: 500, maxMp: 200, atk: 50, def: 20 };
        }

        // ⭐ 遭遇敵人有 35% 機率附帶 1~3 種 PoE 詞綴（65% 為普通無詞綴）
        applyRandomAffixes(enemyObj) {
            var Data = window.HY.Data;
            if (!Data || !Data.MONSTER_AFFIXES || !Data.RARITY_TIERS) return enemyObj;

            var hasAffixRoll = Math.random() * 100 < 35;
            if (!hasAffixRoll) {
                var normalTier = Data.RARITY_TIERS.normal;
                enemyObj.rarity = normalTier.id;
                enemyObj.rarityName = normalTier.name;
                enemyObj.rarityColor = normalTier.color;
                enemyObj.affixes = [];
                enemyObj.lootMult = normalTier.rewardMult || 1.0;
                enemyObj.currentHp = enemyObj.maxHp;
                return enemyObj;
            }

            var tier = Math.random() < 0.5 ? Data.RARITY_TIERS.magic : Data.RARITY_TIERS.rare;
            var minAf = Math.max(1, tier.minAffix || 1);
            var maxAf = Math.min(3, tier.maxAffix || 3);
            var affixCount = minAf + Math.floor(Math.random() * (maxAf - minAf + 1));
            affixCount = Math.max(1, Math.min(3, affixCount));

            var allKeys = Object.keys(Data.MONSTER_AFFIXES);
            var chosenAffixes = [];
            var used = {};

            var specialKeys = allKeys.filter(function (k) {
                var cat = Data.MONSTER_AFFIXES[k].category;
                return cat && cat !== '宿敵';
            });

            if (specialKeys.length > 0 && Math.random() < 0.75) {
                var firstSpecialKey = specialKeys[Math.floor(Math.random() * specialKeys.length)];
                used[firstSpecialKey] = true;
                chosenAffixes.push(Data.MONSTER_AFFIXES[firstSpecialKey]);
            }

            while (chosenAffixes.length < affixCount && chosenAffixes.length < allKeys.length) {
                var rKey = allKeys[Math.floor(Math.random() * allKeys.length)];
                if (!used[rKey]) {
                    used[rKey] = true;
                    chosenAffixes.push(Data.MONSTER_AFFIXES[rKey]);
                }
            }

            enemyObj.rarity = tier.id;
            enemyObj.rarityName = tier.name;
            enemyObj.rarityColor = tier.color;
            enemyObj.affixes = chosenAffixes;

            // ⭐ 掉寶倍率起算值改為階級加成（魔法 1.5 / 稀有 2.5），再與詞綴 lootBonus 取較大者
            enemyObj.lootMult = tier.rewardMult || 1.0;

            enemyObj.maxHp = Math.floor(enemyObj.maxHp * tier.statMult);
            enemyObj.atk = Math.floor(enemyObj.atk * tier.statMult);
            enemyObj.def = Math.floor(enemyObj.def * tier.statMult);
            enemyObj.exp = Math.floor(enemyObj.exp * tier.rewardMult);
            enemyObj.sp = Math.floor(enemyObj.sp * tier.rewardMult);
            enemyObj.gold = Math.floor(enemyObj.gold * tier.rewardMult);

            chosenAffixes.forEach(function (af) {
                if (af.lootBonus && af.lootBonus > enemyObj.lootMult) {
                    enemyObj.lootMult = af.lootBonus;
                }
                var sm = af.statMod;
                if (!sm) return;
                if (sm.hpPct)       enemyObj.maxHp   = Math.floor(enemyObj.maxHp * (1 + sm.hpPct));
                if (sm.atkPct)      enemyObj.atk     = Math.floor(enemyObj.atk * (1 + sm.atkPct));
                if (sm.defPct)      enemyObj.def     = Math.floor(enemyObj.def * (1 + sm.defPct));
                if (sm.hitFlat)     enemyObj.hit     = (enemyObj.hit || 90) + sm.hitFlat;
                if (sm.evaFlat)     enemyObj.eva     = (enemyObj.eva || 5) + sm.evaFlat;
                if (sm.critFlat)    enemyObj.crit    = (enemyObj.crit || 5) + sm.critFlat;
                if (sm.critResFlat) enemyObj.critRes = (enemyObj.critRes || 0) + sm.critResFlat;
            });

            enemyObj.currentHp = enemyObj.maxHp;
            return enemyObj;
        }

        hasAffix(enemy, affixId) {
            if (!enemy || !enemy.affixes) return null;
            for (var i = 0; i < enemy.affixes.length; i++) {
                if (enemy.affixes[i].id === affixId) return enemy.affixes[i];
            }
            return null;
        }

        hasProperty(enemy, propKey) {
            if (!enemy || !enemy.affixes) return null;
            for (var i = 0; i < enemy.affixes.length; i++) {
                if (enemy.affixes[i][propKey]) return enemy.affixes[i];
            }
            return null;
        }

        onEnemyStruck(enemy, attackerChar, dealtDmg) {
            if (!enemy || !attackerChar || !enemy.affixes) return;
            var self = this;
            enemy.affixes.forEach(function (af) {
                if (af.onStruckEffect === 'thorns' && dealtDmg > 0 && attackerChar.currentHp > 0) {
                    var reflectDmg = Math.max(1, Math.floor(dealtDmg * (af.thornsRatio || 0.15)));
                    attackerChar.currentHp = Math.max(0, attackerChar.currentHp - reflectDmg);
                    self.log('🌵 【' + enemy.name + '】的 [' + af.name + '] 反震真氣，對【' + attackerChar.name + '】反彈 ' + reflectDmg + ' 點傷害！', 'combat');
                }
            });
        }

        onEnemyDeath(enemy, partyMembers) {
            if (!enemy || enemy._deathTriggered || !enemy.affixes) return;
            enemy._deathTriggered = true;

            var self = this;
            enemy.affixes.forEach(function (af) {
                if (af.onDeathEffect === 'explode' && Array.isArray(partyMembers)) {
                    var ratio = af.explodeHpRatio || 0.12;
                    partyMembers.forEach(function (m) {
                        if (m && m.currentHp > 0) {
                            var md = self.getCharStats(m);
                            var bombDmg = Math.max(5, Math.floor(md.maxHp * ratio));
                            m.currentHp = Math.max(0, m.currentHp - bombDmg);
                        }
                    });
                    self.log('💥 【' + enemy.name + '】陣亡觸發 [' + af.name + ']！毀滅能量炸傷我方全體隊員 ' + Math.round(ratio * 100) + '% 氣血！', 'combat');
                }
            });
        }

        onEnemyHitTarget(enemy, targetMember, partyMembers, enemyDmg) {
            if (!enemy || !targetMember || !enemy.affixes) return '';
            var extraLogs = [];
            var self = this;

            enemy.affixes.forEach(function (af) {
                if (!af.onHitEffect) return;

                if ((af.onHitEffect === 'leech' || af.onHitEffect === 'beast_venom') && enemy.currentHp > 0) {
                    var leechHeal = Math.max(5, Math.floor(enemyDmg * (af.leechRatio || 0.30)));
                    enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + leechHeal);
                    extraLogs.push('[' + af.name + ' 吸血+' + leechHeal + ']');
                }

                if ((af.onHitEffect === 'mana_burn' || af.onHitEffect === 'beast_venom') && targetMember.currentMp > 0) {
                    var td = self.getCharStats(targetMember);
                    var burnMp = Math.max(5, Math.floor(td.maxMp * (af.manaBurnRatio || 0.15)));
                    targetMember.currentMp = Math.max(0, targetMember.currentMp - burnMp);
                    extraLogs.push('[' + af.name + ' 噬魔-' + burnMp + ']');
                }

                if (af.onHitEffect === 'chain_aoe' && Array.isArray(partyMembers) && partyMembers.length > 1) {
                    var chainDmg = Math.max(3, Math.floor(enemyDmg * (af.chainRatio || 0.25)));
                    partyMembers.forEach(function (other) {
                        if (other && other.id !== targetMember.id && other.currentHp > 0) {
                            // ⭐ 保底 1 滴，避免濺射把隊友靜默打到 0（與荊棘反傷一致）
                            other.currentHp = Math.max(1, other.currentHp - chainDmg);
                        }
                    });
                    extraLogs.push('[' + af.name + ' 連鎖全隊' + chainDmg + '傷]');
                }
            });

            return extraLogs.length > 0 ? ' ' + extraLogs.join(' ') : '';
        }

        onEnemyTurnEnd(enemy) {
            if (!enemy || enemy.currentHp <= 0 || !enemy.affixes) return;
            var self = this;
            enemy.affixes.forEach(function (af) {
                if (af.turnEndRegen && enemy.currentHp < enemy.maxHp) {
                    var regen = Math.max(10, Math.floor(enemy.maxHp * af.turnEndRegen));
                    enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + regen);
                    self.log('💚 【' + enemy.name + '】的 [' + af.name + '] 發動，回復了 ' + regen + ' 點氣血！', 'combat');
                }
            });
        }
    }

    window.HY.AffixSystem = AffixSystem;
})();