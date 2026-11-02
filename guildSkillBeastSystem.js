// js/guildSkillBeastSystem.js  (v44)
// 幫會祝福 / 鬼谷後天改命 / 鎮派神獸
//
// v44 修正：
//   ⭐ 幫會祝福與後天改命的「每次升級消耗」額外提升 5 倍（總消耗 ×5）
//      由 UPGRADE_COST_MULT 控制；若你要「原消耗 + 額外5倍 = ×6」，改成 6 即可
window.HY = window.HY || {};

(function () {
    // ⭐ 祝福／改命升級消耗倍率
    var UPGRADE_COST_MULT = 5;

    class GuildSkillBeastSystem {
        constructor(charSys, guildCore, logger) {
            this.charSys = charSys;
            this.guildCore = guildCore;
            this.logger = logger;
        }

        ensureCharGuildState(charObj) {
            var c = charObj || this.charSys.state;
            if (!c) return;
            if (!c.guildBlessings) c.guildBlessings = {};
            if (c.activeBlessing === undefined) c.activeBlessing = null;
            if (!c.destinySkills) c.destinySkills = {};
        }

        // ⭐ 累積式加成計算：小數屬性不再因 floor 而在前期歸零
        calcScaledBonus(baseVal, lv) {
            if (!baseVal || lv <= 0) return 0;
            if (baseVal >= 1) return Math.floor(baseVal * lv);
            return Math.floor(baseVal * lv + baseVal);
        }

        // ================= 1. ✨ 幫會祝福 =================
        getActiveBlessingLv(charObj, blessingId) {
            var c = charObj || this.charSys.state;
            this.ensureCharGuildState(c);
            if (c.activeBlessing !== blessingId) return 0;
            return c.guildBlessings[blessingId] || 0;
        }

        // ⭐ 升級消耗 ×UPGRADE_COST_MULT
        getBlessingCost(blessingId, charObj) {
            var c = charObj || this.charSys.state;
            this.ensureCharGuildState(c);
            var Data = window.HY.Data;
            var bl = (Data.GUILD_BLESSINGS || []).find(function (b) { return b.id === blessingId; });
            var lv = c.guildBlessings[blessingId] || 0;
            var base = Math.floor((bl ? bl.baseCostContrib : 600) * Math.pow(1.4, lv));
            return base * UPGRADE_COST_MULT;
        }

        upgradeCharBlessing(blessingId) {
            var c = this.charSys.state;
            this.ensureCharGuildState(c);
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var bl = (Data.GUILD_BLESSINGS || []).find(function (b) { return b.id === blessingId; });
            if (!bl) return false;

            var curLv = c.guildBlessings[blessingId] || 0;
            var maxLv = g.lv;
            if (curLv >= maxLv) {
                this.logger.add('🔒 等級受限！【' + c.name + '】的幫會祝福《' + bl.name + ' (Lv.' + curLv + ')》不得超過當前幫會總舵等級 (Lv.' + maxLv + ')！', 'system');
                return false;
            }

            var cost = this.getBlessingCost(blessingId, c);
            if (g.contrib < cost) {
                this.logger.add('❌ 幫會貢獻不足！為【' + c.name + '】參悟《' + bl.name + '》需要 ' + cost.toLocaleString() + ' 點幫貢。', 'system');
                return false;
            }

            g.contrib -= cost;
            c.guildBlessings[blessingId] = curLv + 1;

            if (!c.activeBlessing) {
                c.activeBlessing = blessingId;
            }

            this.charSys.clampVitals();
            this.logger.add('✨ 【' + c.name + '】單獨參悟幫會祝福《' + bl.name + '》至 Lv.' + (curLv + 1) + '！', 'system');
            return true;
        }

        selectCharActiveBlessing(blessingId) {
            var c = this.charSys.state;
            this.ensureCharGuildState(c);
            var Data = window.HY.Data;
            var bl = (Data.GUILD_BLESSINGS || []).find(function (b) { return b.id === blessingId; });
            if (!bl || !c.guildBlessings[blessingId]) return false;

            c.activeBlessing = blessingId;
            this.charSys.clampVitals();
            this.logger.add('✨ 【' + c.name + '】已將生效祝福切換為：《' + bl.name + '》（每人限啟用 1 個祝福）！', 'system');
            return true;
        }

        // ================= 2. 🌌 鬼谷後天改命 =================
        getDestinySkillLv(charObj, destinyId) {
            var c = charObj || this.charSys.state;
            this.ensureCharGuildState(c);
            return c.destinySkills[destinyId] || 0;
        }

        // ⭐ 升級消耗 ×UPGRADE_COST_MULT
        getDestinyCost(destinyId, charObj) {
            var c = charObj || this.charSys.state;
            this.ensureCharGuildState(c);
            var Data = window.HY.Data;
            var ds = (Data.GUILD_DESTINY_SKILLS || []).find(function (s) { return s.id === destinyId; });
            var lv = c.destinySkills[destinyId] || 0;
            var base = Math.floor((ds ? ds.baseCostContrib : 800) * Math.pow(1.45, lv));
            return base * UPGRADE_COST_MULT;
        }

        upgradeCharDestinySkill(destinyId) {
            var c = this.charSys.state;
            this.ensureCharGuildState(c);
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var ds = (Data.GUILD_DESTINY_SKILLS || []).find(function (s) { return s.id === destinyId; });
            if (!ds) return false;

            var curLv = c.destinySkills[destinyId] || 0;
            var maxLv = g.lv;
            if (curLv >= maxLv) {
                this.logger.add('🔒 等級受限！【' + c.name + '】的幫會技能《' + ds.name + ' (第' + curLv + '重)》不得超過當前幫會總舵等級 (Lv.' + maxLv + ')！', 'system');
                return false;
            }

            var cost = this.getDestinyCost(destinyId, c);
            if (g.contrib < cost) {
                this.logger.add('❌ 幫會貢獻不足！為【' + c.name + '】逆天改命《' + ds.name + '》需要 ' + cost.toLocaleString() + ' 點幫貢。', 'system');
                return false;
            }

            g.contrib -= cost;
            c.destinySkills[destinyId] = curLv + 1;
            this.charSys.clampVitals();
            this.logger.add('🌌 【' + c.name + '】後天改命突破！幫會技能《' + ds.name + '》升至第 ' + (curLv + 1) + ' 重（角色獨立不共享）！', 'system');
            return true;
        }

        // ================= 3. 🐉 幫會鎮派神獸 =================
        getBeastFeedCost(beastId) {
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var beast = Data.GUILD_BEASTS[beastId];
            var lv = g.beasts[beastId] || 0;
            var mult = Math.pow(1.35, lv);
            return {
                herbs: Math.floor((beast.feedHerb || 150) * mult),
                ores: Math.floor((beast.feedOre || 150) * mult)
            };
        }

        feedGuildBeast(beastId) {
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var beast = Data.GUILD_BEASTS[beastId];
            if (!beast) return false;

            var curLv = g.beasts[beastId] || 0;
            if (curLv >= g.lv) {
                this.logger.add('🔒 【' + beast.name + ' (Lv.' + curLv + ')】等級受限於當前幫會總舵等級 (Lv.' + g.lv + ')！', 'system');
                return false;
            }

            var cost = this.getBeastFeedCost(beastId);
            if (g.herbs < cost.herbs || g.ores < cost.ores) {
                this.logger.add('❌ 幫會資源不足！培養【' + beast.name + '】需要靈草 ' + cost.herbs + ' 與玄鐵 ' + cost.ores + '。', 'system');
                return false;
            }

            g.herbs -= cost.herbs;
            g.ores -= cost.ores;
            var newLv = curLv + 1;
            g.beasts[beastId] = newLv;
            g.activeBeast = beastId;

            this.guildCore.addGuildExp(20 * newLv);
            this.charSys.clampVitals();
            this.logger.add('🐉 鎮幫神獸進化！【' + beast.name + '】升至 Lv.' + newLv + ' 並設為鎮幫主神獸！', 'system');
            return true;
        }

        setActiveBeast(beastId) {
            var g = this.guildCore.getGuild();
            if (!g.beasts[beastId] || g.beasts[beastId] <= 0) return false;
            g.activeBeast = beastId;
            this.charSys.clampVitals();
            var Data = window.HY.Data;
            this.logger.add('🐉 已切換鎮幫庇佑神獸為：【' + Data.GUILD_BEASTS[beastId].name + '】！', 'system');
            return true;
        }

        getGuildBonusForChar(charObj) {
            var c = charObj || this.charSys.state;
            this.ensureCharGuildState(c);
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var total = { atk: 0, def: 0, maxHp: 0, maxMp: 0, hit: 0, eva: 0, crit: 0, critRes: 0 };
            if (!Data) return total;

            var self = this;

            // 1. 該角色當前唯一啟用的 1 個「✨ 幫會祝福」
            if (c.activeBlessing && c.guildBlessings[c.activeBlessing]) {
                var activeBl = (Data.GUILD_BLESSINGS || []).find(function (b) { return b.id === c.activeBlessing; });
                var blLv = c.guildBlessings[c.activeBlessing] || 0;
                if (activeBl && activeBl.bonusPerLv && blLv > 0) {
                    Object.keys(activeBl.bonusPerLv).forEach(function (k) {
                        if (total[k] !== undefined) total[k] += self.calcScaledBonus(activeBl.bonusPerLv[k], blLv);
                    });
                }
            }

            // 2. 該角色獨立領悟的「🌌 鬼谷後天改命技能」
            (Data.GUILD_DESTINY_SKILLS || []).forEach(function (ds) {
                var dLv = c.destinySkills[ds.id] || 0;
                if (dLv > 0 && ds.bonusPerLv) {
                    Object.keys(ds.bonusPerLv).forEach(function (k) {
                        if (total[k] !== undefined) total[k] += self.calcScaledBonus(ds.bonusPerLv[k], dLv);
                    });
                }
            });

            // 3. 鎮幫神獸光環（主神獸 1.25 倍）
            if (Data.GUILD_BEASTS && g.beasts) {
                Object.keys(Data.GUILD_BEASTS).forEach(function (bId) {
                    var lv = g.beasts[bId] || 0;
                    var beast = Data.GUILD_BEASTS[bId];
                    if (lv > 0 && beast && beast.bonusPerLv) {
                        var isMain = (g.activeBeast === bId);
                        Object.keys(beast.bonusPerLv).forEach(function (k) {
                            if (total[k] === undefined) return;
                            var base = self.calcScaledBonus(beast.bonusPerLv[k], lv);
                            total[k] += isMain ? Math.floor(base * 1.25) : base;
                        });
                    }
                });
            }

            return total;
        }

        getTotalGuildBonus() {
            return this.getGuildBonusForChar(this.charSys.state);
        }
    }

    window.HY.GuildSkillBeastSystem = GuildSkillBeastSystem;
})();