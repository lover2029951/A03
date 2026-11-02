// js/combatAutoTactics.js  (v52)
// 自動戰鬥戰術：計時器、自動連刷、自動服藥、智慧選招、隊員技能輔助
//
// v52 修正：
//   ⭐【移除】勝利後的「連刷暫停」判定
//      恢復原廠行為：只要 isAutoBattle && autoRepeat 成立，
//      勝利後必定排程下一場，不再有機率停止。
//   ⭐ 移除 getAutoNextBattleChance()（已無用途）
window.HY = window.HY || {};

(function () {
    class CombatAutoTactics {
        constructor(combatCore) {
            this.core = combatCore;
            this.isAutoBattle = false;
            this.autoRepeat = false;
            this.autoTimer = null;
            this.repeatTimeout = null;

            this.autoConfig = Object.assign({
                hpThreshold: 50,
                hpItemId: 'pill_hp',
                mpThreshold: 25,
                mpItemId: 'pill_hp',
                allyUsePills: true,
                allyHpThreshold: 40,
                allyHpItemId: 'pill_major',
                allyMpThreshold: 20,
                allyMpItemId: 'pill_major',
                lowHpSkillRule: 45,
                emergencySkillId: 'auto_heal',
                aoeWhenMulti: true,
                aoeSkillId: 'auto_aoe',
                primarySkillId: 'auto_best',
                allySupportEnabled: true,
                allyHealThreshold: 50,
                allyHealSkillId: 'auto_heal_ally',
                allySupportInterval: 1,
                supportTargetRule: 'most_wounded'
            }, (window.HY.Data && window.HY.Data.DEFAULT_AUTO_CONFIG) || {});

            // 自動用藥冷卻紀錄：memberId -> 上次服藥時間戳
            this._pillCooldown = {};
        }

        // 服藥冷卻（毫秒）；優先讀 HY.GameConfig.combat.pillCooldownMs
        getPillCooldownMs() {
            var G = window.HY && window.HY.GameConfig;
            if (G && G.combat && typeof G.combat.pillCooldownMs === 'number') {
                return G.combat.pillCooldownMs;
            }
            return 2000;
        }

        toggleAutoBattle(forceState) {
            this.isAutoBattle = (typeof forceState === 'boolean') ? forceState : !this.isAutoBattle;
            if (this.isAutoBattle) {
                this.core.log('🤖 【時空內掛】已依照你的「戰術條件設定」啟動全自動戰鬥！', 'time');
                if (this.core.currentEnemy) this.startAutoLoop();
                else if (this.autoRepeat && this.core.lastEnemyTemplate) this.core.startBattle(this.core.lastEnemyTemplate);
            } else {
                this.core.log('⏹️ 【時空內掛】已關閉自動戰鬥。', 'time');
                this.stopAutoLoop();
                this.clearRepeatTimeout();
            }
            this.core.onUpdateUI();
        }

        startAutoLoop() {
            this.stopAutoLoop();
            var self = this;
            this.autoTimer = setInterval(function () {
                if (!self.isAutoBattle || !self.core.currentEnemy) { self.stopAutoLoop(); return; }
                self.executeAutoStep();
            }, 1000);
        }

        stopAutoLoop() { if (this.autoTimer) { clearInterval(this.autoTimer); this.autoTimer = null; } }
        clearRepeatTimeout() { if (this.repeatTimeout) { clearTimeout(this.repeatTimeout); this.repeatTimeout = null; } }

        // ══════════════════════════════════════════════════════════════
        //  勝利後的連刷排程（v52：已移除機率暫停）
        //
        //  行為：只要 isAutoBattle 與 autoRepeat 都成立，
        //        就在 1 秒後自動開下一場。不再有停止判定。
        // ══════════════════════════════════════════════════════════════
        scheduleAutoRepeat() {
            var self = this;
            if (!this.isAutoBattle || !this.autoRepeat || !this.core.lastEnemyTemplate) return;

            this.core.log('🔄 自動連刷啟動中：準備再次迎戰下一波【' + this.core.lastEnemyTemplate.name + '】...', 'time');
            this.repeatTimeout = setTimeout(function () {
                if (self.isAutoBattle && self.autoRepeat && !self.core.currentEnemy) {
                    self.core.startBattle(self.core.lastEnemyTemplate);
                }
            }, 1000);
        }

        // ══════════════════════════════════════════════════════════════
        //  隊員技能輔助：判斷是否需要支援
        //    回傳 { skillId, target } 或 null
        // ══════════════════════════════════════════════════════════════
        pickSupportAction(charObj, partyMembers) {
            var cfg = this.autoConfig;
            if (!cfg.allySupportEnabled) return null;
            if (!charObj || charObj.currentHp <= 0) return null;

            var charSys = this.core.charSys;
            var alive = (partyMembers || []).filter(function (m) {
                return m && m.currentHp > 0 && m.id !== charObj.id;
            });
            if (alive.length === 0) return null;

            var threshold = (typeof cfg.allyHealThreshold === 'number') ? cfg.allyHealThreshold : 50;

            var wounded = alive.filter(function (m) {
                var md = charSys.getDerivedStatsForChar(m);
                if (!md || md.maxHp <= 0) return false;
                return (m.currentHp / md.maxHp) * 100 <= threshold;
            });
            if (wounded.length === 0) return null;

            // 間隔節流
            var interval = Math.max(1, parseInt(cfg.allySupportInterval, 10) || 1);
            var b = charObj._battle || (charObj._battle = {});
            b.supportTick = (b.supportTick || 0) + 1;
            if (interval > 1 && (b.supportTick % interval) !== 0) return null;

            var skillId = this.pickAllyHealSkill(charObj);
            if (!skillId) return null;

            var target = this.pickMostWoundedAlly(wounded, cfg.supportTargetRule);
            if (!target) return null;

            return { skillId: skillId, target: target };
        }

        // 挑選補血/輔助招式
        pickAllyHealSkill(charObj) {
            var cfg = this.autoConfig;
            var Data = window.HY.Data;
            var raw = cfg.allyHealSkillId;

            if (raw === 'none') return null;

            var learned = charObj.skills || { basic_punch: 1 };
            var available = Object.keys(learned).filter(function (sId) {
                var art = Data.MARTIAL_ARTS[sId];
                if (!art) return false;
                if (art.sectReq && art.sectReq !== charObj.sect) return false;
                if ((charObj.currentMp || 0) < art.mpCost) return false;
                return true;
            });
            if (available.length === 0) return null;

            // 指定招式
            if (raw && raw !== 'auto_heal_ally' && available.indexOf(raw) !== -1) return raw;

            // 自動挑選：優先 healRatio > mpRestore > critBonus > hitBonus
            var best = null;
            var bestScore = 0;
            available.forEach(function (sId) {
                var art = Data.MARTIAL_ARTS[sId];
                var score =
                    (art.healRatio || 0) * 1000 +
                    (art.mpRestore || 0) * 2 +
                    (art.critBonus || 0) * 1 +
                    (art.hitBonus || 0) * 0.5;
                if (score > bestScore) { bestScore = score; best = sId; }
            });
            return best;
        }

        // 挑選目標
        pickMostWoundedAlly(candidates, rule) {
            if (!candidates || candidates.length === 0) return null;
            var charSys = this.core.charSys;

            if (rule === 'leader') {
                var leader = charSys.state;
                var found = candidates.filter(function (m) { return m.id === leader.id; })[0];
                if (found) return found;
                // 主控不在候選中 → 退回最殘血
            } else if (rule === 'random') {
                return candidates[Math.floor(Math.random() * candidates.length)];
            }

            // most_wounded（預設）
            var best = null;
            var lowest = 2;
            candidates.forEach(function (m) {
                var md = charSys.getDerivedStatsForChar(m);
                if (!md || md.maxHp <= 0) return;
                var ratio = m.currentHp / md.maxHp;
                if (ratio < lowest) { lowest = ratio; best = m; }
            });
            return best || candidates[0];
        }

        // ══════════════════════════════════════════════════════════════
        //  自動選招
        // ══════════════════════════════════════════════════════════════
        pickTacticalSkillForChar(charObj, isMainChar) {
            var Data = window.HY.Data;
            var charSys = this.core.charSys;
            this.core.martialSys.purgeInvalidSectSkills(charObj);

            var stats = charSys.getDerivedStatsForChar(charObj);
            var hpPct = (charObj.currentHp / stats.maxHp) * 100;
            var aliveEnemiesCount = this.core.enemies.filter(function (e) { return e.currentHp > 0; }).length;
            var cfg = this.autoConfig;
            var bloodSpiritLv = this.core.getCharDestinyLv(charObj, 'gg_blood_spirit');

            var availableIds = Object.keys(charObj.skills || { basic_punch: 1 }).filter(function (sId) {
                var art = Data.MARTIAL_ARTS[sId];
                if (!art) return false;
                if (art.sectReq && art.sectReq !== charObj.sect) return false;
                if (charObj.currentMp >= art.mpCost) return true;
                return bloodSpiritLv > 0 && charObj.currentHp > stats.maxHp * 0.3;
            });

            if (availableIds.length === 0) return 'basic_punch';

            if (hpPct <= cfg.lowHpSkillRule && cfg.emergencySkillId !== 'none') {
                if (isMainChar && cfg.emergencySkillId !== 'auto_heal' && availableIds.indexOf(cfg.emergencySkillId) !== -1) {
                    return cfg.emergencySkillId;
                }
                var healSkills = availableIds.filter(function (sId) {
                    return Data.MARTIAL_ARTS[sId].healRatio > 0;
                });
                if (healSkills.length > 0) return this.getHighestPowerSkill(charObj, healSkills);
            }

            if (cfg.aoeWhenMulti && aliveEnemiesCount >= 2 && cfg.aoeSkillId !== 'none') {
                if (isMainChar && cfg.aoeSkillId !== 'auto_aoe' && availableIds.indexOf(cfg.aoeSkillId) !== -1) {
                    return cfg.aoeSkillId;
                }
                var aoeSkills = availableIds.filter(function (sId) {
                    return Data.MARTIAL_ARTS[sId].isAoe === true;
                });
                if (aoeSkills.length > 0) return this.getHighestPowerSkill(charObj, aoeSkills);
            }

            if (isMainChar && cfg.primarySkillId !== 'auto_best' && availableIds.indexOf(cfg.primarySkillId) !== -1) {
                return cfg.primarySkillId;
            }

            return this.getHighestPowerSkill(charObj, availableIds);
        }

        getHighestPowerSkill(charObj, skillIdArray) {
            var Data = window.HY.Data;
            var bestId = 'basic_punch';
            var bestPower = -1;
            skillIdArray.forEach(function (sId) {
                var art = Data.MARTIAL_ARTS[sId];
                if (!art) return;
                var lv = (charObj.skills && charObj.skills[sId]) || 1;
                var p = art.baseMult + (lv - 1) * 0.14;
                if (p > bestPower) { bestPower = p; bestId = sId; }
            });
            return bestId;
        }

        // 舊批次制步驟（ATB 模式下不使用，保留相容）
        executeAutoStep() {
            if (!this.core.currentEnemy) return;

            var charSys = this.core.charSys;
            var partySys = window.HY.game && window.HY.game.partySys;
            var partyMembers = partySys ? partySys.getPartyMembers() : [charSys.state];

            this.processAutoPills(partyMembers);

            var activeChar = charSys.state;
            var support = this.pickSupportAction(activeChar, partyMembers);
            if (support) {
                this.core.useSkill(support.skillId, support.target);
                return;
            }

            var chosenSkill = this.pickTacticalSkillForChar(charSys.state, true);
            this.core.useSkill(chosenSkill);
        }

        // ══════════════════════════════════════════════════════════════
        //  統一的用藥入口（供 ATB / 批次制共用）
        // ══════════════════════════════════════════════════════════════
        processAutoPills(partyMembers) {
            var cfg = this.autoConfig;
            var charSys = this.core.charSys;
            var inv = charSys.rootState.inventory;
            var self = this;

            // ① 自身優先
            var me = charSys.state;
            if (me && me.currentHp > 0) {
                var md = charSys.getDerivedStatsForChar(me);
                var myHpPct = (me.currentHp / md.maxHp) * 100;
                var myMpPct = md.maxMp > 0 ? (me.currentMp / md.maxMp) * 100 : 100;

                if (cfg.hpItemId !== 'none' && myHpPct <= cfg.hpThreshold && inv[cfg.hpItemId] > 0) {
                    this.consumePillForMember(me, cfg.hpItemId, '自身氣血低於 ' + cfg.hpThreshold + '%');
                } else if (cfg.mpItemId !== 'none' && myMpPct <= cfg.mpThreshold && inv[cfg.mpItemId] > 0) {
                    this.consumePillForMember(me, cfg.mpItemId, '自身內力低於 ' + cfg.mpThreshold + '%');
                }
            }

            // ② 隊友其次（開關控制）
            if (!cfg.allyUsePills) return;

            var allyHpItem = cfg.allyHpItemId || cfg.hpItemId;
            var allyMpItem = cfg.allyMpItemId || cfg.mpItemId;

            (partyMembers || []).forEach(function (m) {
                if (!m || m.currentHp <= 0) return;
                if (m.id === me.id) return;

                var amd = charSys.getDerivedStatsForChar(m);
                if (!amd || amd.maxHp <= 0) return;

                var hpPct = (m.currentHp / amd.maxHp) * 100;
                var mpPct = amd.maxMp > 0 ? (m.currentMp / amd.maxMp) * 100 : 100;

                if (allyHpItem !== 'none' && hpPct <= cfg.allyHpThreshold && (inv[allyHpItem] || 0) > 0) {
                    self.consumePillForMember(m, allyHpItem, '隊友氣血低於 ' + cfg.allyHpThreshold + '%');
                } else if (allyMpItem !== 'none' && mpPct <= cfg.allyMpThreshold && (inv[allyMpItem] || 0) > 0) {
                    self.consumePillForMember(m, allyMpItem, '隊友內力低於 ' + cfg.allyMpThreshold + '%');
                }
            });
        }

        consumePillForMember(member, itemId, reasonText) {
            var Data = window.HY.Data;
            var charSys = this.core.charSys;
            var inv = charSys.rootState.inventory;
            var item = Data.ITEMS[itemId];
            if (!item || !inv[itemId] || inv[itemId] <= 0) return false;

            // 冷卻節流：ATB tick 為 100ms，若只判斷「HP% ≤ 門檻」會在數秒內清空行囊
            var now = Date.now();
            var cd = this.getPillCooldownMs();
            if (cd > 0) {
                var last = this._pillCooldown[member.id] || 0;
                if ((now - last) < cd) return false;
            }
            this._pillCooldown[member.id] = now;

            inv[itemId] -= 1;
            if (inv[itemId] <= 0) delete inv[itemId];

            if (item.effect) {
                charSys.restoreVitals(item.effect.hp || 0, item.effect.mp || 0, member);
            }
            this.core.log('💊 [內掛用藥] 因' + reasonText + '，【' + member.name + '】自動服用了【' + item.name + '】！', 'combat');
            this.core.onUpdateUI();
            return true;
        }
    }

    window.HY.CombatAutoTactics = CombatAutoTactics;
    console.log('[combatAutoTactics] ✓ 已載入（v52，已移除連刷暫停）');
})();