// js/guildBuildingSystem.js  (v43)
// 幫會建築與成員駐守生產系統
//
// v43 修正：
//   ⭐ 還原幫會建築的丹藥產出（靈田行軍散、煉丹房大還丹／雪蓮丹、聚靈陣和氏璧碎片）
//   ⭐ 由 Data.LOOT_POLICY.guildBuildingsDropPills 控制（預設 true）
//      若該值為 false，煉丹房會自動改為「精煉靈草換幫會資金」
window.HY = window.HY || {};

(function () {
    class GuildBuildingSystem {
        constructor(charSys, guildCore, inventorySys, logger) {
            this.charSys = charSys;
            this.guildCore = guildCore;
            this.inventorySys = inventorySys;
            this.logger = logger;
        }

        // ⭐ 幫會建築是否允許產出丹藥（預設：允許）
        _allowGuildPillDrop() {
            var Data = window.HY.Data;
            var pol = Data && Data.LOOT_POLICY;
            if (pol && typeof pol.guildBuildingsDropPills === 'boolean') return pol.guildBuildingsDropPills;
            return true;
        }

        isBuildingUnlocked(buildingId) {
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var bMeta = Data.GUILD_BUILDINGS[buildingId];
            if (!bMeta) return false;
            return g.lv >= (bMeta.reqGuildLv || 1);
        }

        getAssignedMembers(buildingId) {
            var g = this.guildCore.getGuild();
            return g.members.filter(function (m) {
                return m.assignedTo === buildingId;
            });
        }

        assignMemberToBuilding(memberId, buildingId) {
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var member = g.members.find(function (m) { return m.id === memberId; });
            if (!member) return false;

            if (!buildingId || buildingId === 'idle') {
                member.assignedTo = null;
                this.logger.add('⛺ 幫眾【' + member.name + '】已撤回總舵待命。', 'system');
                return true;
            }

            var bMeta = Data.GUILD_BUILDINGS[buildingId];
            if (!bMeta) return false;

            if (!this.isBuildingUnlocked(buildingId)) {
                this.logger.add('🔒 【' + bMeta.name + '】尚未解鎖！需要幫會總舵達到 Lv.' + bMeta.reqGuildLv + '。', 'system');
                return false;
            }

            member.assignedTo = buildingId;
            this.logger.add('🔨 已指派幫眾【' + member.name + '】進駐【' + bMeta.name + '】參與生產！', 'system');
            return true;
        }

        getBuildingUpgradeCost(buildingId) {
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var bMeta = Data.GUILD_BUILDINGS[buildingId];
            var curLv = g.buildings[buildingId] || 1;
            return Math.floor((bMeta.baseUpGold || 20000) * Math.pow(1.55, curLv - 1));
        }

        upgradeBuilding(buildingId) {
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var bMeta = Data.GUILD_BUILDINGS[buildingId];
            if (!bMeta) return false;

            if (!this.isBuildingUnlocked(buildingId)) {
                this.logger.add('🔒 【' + bMeta.name + '】需要幫會總舵達到 Lv.' + bMeta.reqGuildLv + ' 才能解鎖！', 'system');
                return false;
            }

            var curLv = g.buildings[buildingId] || 1;
            if (curLv >= g.lv) {
                this.logger.add('🔒 等級受限！【' + bMeta.name + ' (Lv.' + curLv + ')】不得超過當前幫會總舵等級 (Lv.' + g.lv + ')，請先提升幫會總舵等級！', 'system');
                return false;
            }

            var cost = this.getBuildingUpgradeCost(buildingId);
            if (g.funds < cost) {
                this.logger.add('❌ 幫會資金不足！擴建【' + bMeta.name + '】需要 ' + cost.toLocaleString() + ' 幫會資金。', 'system');
                return false;
            }

            g.funds -= cost;
            g.buildings[buildingId] = curLv + 1;
            this.guildCore.addGuildExp(20 * curLv);
            this.logger.add('🏗️ 幫會建設：【' + bMeta.name + '】成功擴建至 Lv.' + (curLv + 1) + '！', 'system');
            return true;
        }

        // ⭐ 全幫會 8 大建築生產結算
        harvestAllBuildings(isManual) {
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var poeSys = window.HY.game && window.HY.game.poeSys;
            var allowPill = this._allowGuildPillDrop();

            var totalWorking = g.members.filter(function (m) { return m.assignedTo !== null; }).length;
            if (totalWorking === 0) {
                if (isManual) {
                    this.logger.add('⚠️ 目前沒有任何幫眾駐守在建築內！請先將幫眾指派至各建築。', 'system');
                }
                return false;
            }

            var logs = [];

            // 1. 🌿 幫會靈田（產出除以 2；低機率收穫行軍散）
            var herbWorkers = this.getAssignedMembers('herb_field').length;
            if (herbWorkers > 0) {
                var bLv1 = g.buildings.herb_field || 1;
                var gainHerbs = Math.max(1, Math.floor(herbWorkers * (2.5 + bLv1)));
                g.herbs += gainHerbs;
                logs.push('靈草+' + gainHerbs);

                if (allowPill && Math.random() < 0.15 * herbWorkers) {
                    this.inventorySys.addItem('pill_hp', 1);
                    this.logger.add('🎁 掉落物品：【行軍散】x1', 'loot');
                }
            }

            // 2. ⛏️ 幫會礦脈（產出除以 2）
            var mineWorkers = this.getAssignedMembers('ore_mine').length;
            if (mineWorkers > 0) {
                var bLv2 = g.buildings.ore_mine || 1;
                var gainOres = Math.max(1, Math.floor(mineWorkers * (2.5 + bLv2)));
                var gainGold = Math.max(10, Math.floor(mineWorkers * (60 + bLv2 * 25)));
                g.ores += gainOres;
                this.charSys.rootState.gold += gainGold;
                logs.push('玄鐵+' + gainOres + '/紋銀+' + gainGold + '兩');
            }

            // 3. 📚 藏經閣（產出除以 2）
            var scripWorkers = this.getAssignedMembers('scripture_hall').length;
            if (scripWorkers > 0) {
                var bLv3 = g.buildings.scripture_hall || 1;
                var gainSp = Math.max(1, Math.floor(scripWorkers * (22 + bLv3 * 10)));
                var gainContrib = Math.max(1, Math.floor(scripWorkers * (7 + bLv3 * 2.5)));
                this.charSys.rootState.sp += gainSp;
                g.contrib += gainContrib;
                logs.push('武點+' + gainSp + '/幫貢+' + gainContrib);
            }

            // 4. 🐾 幫會靈獸園（產出除以 2）
            var beastWorkers = this.getAssignedMembers('beast_park').length;
            if (beastWorkers > 0 && this.isBuildingUnlocked('beast_park')) {
                var bLvbp = g.buildings.beast_park || 1;
                var bpHerbs = Math.max(1, Math.floor(beastWorkers * (2 + bLvbp * 0.5)));
                var bpOres = Math.max(1, Math.floor(beastWorkers * (2 + bLvbp * 0.5)));
                var bpContrib = Math.max(1, Math.floor(beastWorkers * (10 + bLvbp * 3)));
                g.herbs += bpHerbs;
                g.ores += bpOres;
                g.contrib += bpContrib;
                logs.push('靈獸園(草+' + bpHerbs + '/鐵+' + bpOres + '/貢+' + bpContrib + ')');

                if (g.activeBeast && Math.random() < 0.04 * beastWorkers) {
                    g.beasts[g.activeBeast] = (g.beasts[g.activeBeast] || 1) + 1;
                    this.charSys.clampVitals();
                    this.logger.add('🐾 [幫會靈獸園] 靈氣貫通！鎮幫神獸免費突破至 Lv.' + g.beasts[g.activeBeast] + '！', 'system');
                }
            }

            // 5. ⚗️ 煉丹房（消耗 30 靈草/人）
            var alchWorkers = this.getAssignedMembers('alchemy_room').length;
            if (alchWorkers > 0 && this.isBuildingUnlocked('alchemy_room')) {
                var bLv4 = g.buildings.alchemy_room || 1;
                var herbCost = 30 * alchWorkers;
                if (g.herbs >= herbCost) {
                    g.herbs -= herbCost;

                    if (allowPill) {
                        // ✅ 原設計：機率煉出丹藥
                        var pillChance = 0.12 + bLv4 * 0.04;
                        if (Math.random() < pillChance * alchWorkers) {
                            var pId = (bLv4 >= 3 && Math.random() < 0.35) ? 'pill_supreme' : 'pill_major';
                            this.inventorySys.addItem(pId, 1);
                            this.logger.add('🎁 掉落物品：【' + Data.ITEMS[pId].name + '】x1', 'loot');
                        }
                    } else {
                        // 🔒 若總開關關閉：改為精煉靈草換幫會資金
                        var alchFunds = Math.max(10, Math.floor(alchWorkers * (55 + bLv4 * 22)));
                        g.funds += alchFunds;
                        logs.push('煉丹房精煉(資金+' + alchFunds + ')');
                    }
                }
            }

            // 6. 🗼 鎮妖神塔（產出除以 2）
            var towerWorkers = this.getAssignedMembers('demon_tower').length;
            if (towerWorkers > 0 && this.isBuildingUnlocked('demon_tower')) {
                var bLvTw = g.buildings.demon_tower || 1;
                var twFunds = Math.max(10, Math.floor(towerWorkers * (90 + bLvTw * 35)));
                var twSp = Math.max(5, Math.floor(towerWorkers * (30 + bLvTw * 12)));
                g.funds += twFunds;
                this.charSys.rootState.sp += twSp;
                logs.push('鎮妖塔(資金+' + twFunds + '/武點+' + twSp + ')');
            }

            // 7. 🔨 鍛造閣（消耗 30 玄鐵/人）
            var forgeWorkers = this.getAssignedMembers('forge_hall').length;
            if (forgeWorkers > 0 && this.isBuildingUnlocked('forge_hall') && g.ores >= 30 * forgeWorkers) {
                var bLv5 = g.buildings.forge_hall || 1;
                g.ores -= 30 * forgeWorkers;
                var gainFunds = Math.max(10, Math.floor(forgeWorkers * (75 + bLv5 * 30)));
                g.funds += gainFunds;
                logs.push('鍛造資金+' + gainFunds);

                if (poeSys && Math.random() < (0.02 + bLv5 * 0.005) * forgeWorkers) {
                    var dummyEnemy = { lv: this.charSys.state.lv, rarity: 'rare', lootMult: 25 };
                    var orb = poeSys.rollCurrencyDropByEnemy(dummyEnemy);
                    if (orb) {
                        this.logger.add('💎 掉落通貨：【' + orb.name + '】x1', 'loot');
                    }
                }
            }

            // 8. ☯️ 聚靈陣（產出除以 2；低機率凝結和氏璧異能碎片）
            var arrayWorkers = this.getAssignedMembers('spirit_array').length;
            if (arrayWorkers > 0 && this.isBuildingUnlocked('spirit_array')) {
                var bLv6 = g.buildings.spirit_array || 1;
                var expGain = Math.max(5, Math.floor(arrayWorkers * (18 + bLv6 * 7)));
                var contribGain = Math.max(2, Math.floor(arrayWorkers * (12 + bLv6 * 4)));
                g.contrib += contribGain;
                this.guildCore.addGuildExp(expGain);
                logs.push('幫會經驗+' + expGain);

                if (allowPill && Math.random() < 0.06 * arrayWorkers) {
                    this.inventorySys.addItem('pill_sp', 1);
                    this.logger.add('🎁 掉落物品：【和氏璧異能碎片】x1', 'loot');
                }
            }

            if (logs.length > 0) {
                this.logger.add('🏯 [幫會建築生產] ' + logs.join(' | '), 'wealth');
            }
            return true;
        }
    }

    window.HY.GuildBuildingSystem = GuildBuildingSystem;
})();