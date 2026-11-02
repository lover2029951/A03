// js/guildRealmEventSystem.js  (v29)
// 幫會鎮妖神塔、幫會秘境與隨機事件系統
//
// v29 修正（收尾整理）：
//   ⭐ MAX_TOWER_FLOORS_PER_CALL → MAX_TOWER_FLOORS_PER_GUILD_LEVEL
//      並補註解：此為「永久上限」（towerFloor 只增不減，無日期重置）
//   ⭐ triggerRandomGuildEvent(isAuto) 支援「純氛圍模式」：
//      幫會建築自動徵收後觸發時，只印事件訊息、不發放任何資源
//      （避免 15 秒定時器成為免費資源產出管道）
window.HY = window.HY || {};

(function () {
    // ⭐ v29：每 1 級幫會總舵可挑戰的鎮妖塔層數上限（永久上限，無日期重置）
    //    例：幫會 Lv.3 → 最高第 90 層
    var MAX_TOWER_FLOORS_PER_GUILD_LEVEL = 30;

    class GuildRealmEventSystem {
        constructor(charSys, guildCore, logger) {
            this.charSys = charSys;
            this.guildCore = guildCore;
            this.logger = logger;
        }

        challengeDemonTower() {
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            if (g.lv < 3) {
                this.logger.add('🔒 【🗼 鎮妖神塔】需要幫會總舵達到 Lv.3 才能開啟挑戰！', 'system');
                return { ok: false, reason: 'guild_lv' };
            }

            var floor = g.towerFloor || 1;
            var floorCap = MAX_TOWER_FLOORS_PER_GUILD_LEVEL * g.lv;
            if (floor > floorCap) {
                this.logger.add('🛑 【鎮妖神塔】當前幫會總舵 Lv.' + g.lv + ' 的可挑戰層數已達永久上限（第 ' + floorCap + ' 層），請先提升總舵等級！', 'system');
                return { ok: false, reason: 'floor_cap' };
            }

            // ⭐ 讀取 GameConfig（未載入時回退 850）
            var G = window.HY && window.HY.GameConfig;
            var floorPower = (G && G.guild && typeof G.guild.towerFloorPower === 'number')
                ? G.guild.towerFloorPower : 850;

            var reqPower = floor * floorPower;
            var playerPower = this.charSys.getDerivedStats().powerScore;

            if (playerPower < reqPower) {
                this.logger.add('💀 挑戰鎮妖神塔第 ' + floor + ' 層失利！建議主控角色戰力達到 ' + reqPower + ' 以上（當前戰力：' + playerPower + '）。', 'combat');
                return { ok: false, reason: 'low_power' };
            }

            var towerBuildingLv = g.buildings.demon_tower || 1;
            var bonusMult = 1 + (towerBuildingLv - 1) * 0.10;

            var gainSp = Math.floor((75 + floor * 42) * bonusMult);
            var gainContrib = Math.floor((20 + floor * 10) * bonusMult);
            var gainFunds = Math.floor((100 + floor * 45) * bonusMult);
            var gainExp = Math.floor((30 + floor * 12) * bonusMult);

            this.charSys.rootState.sp += gainSp;
            g.contrib += gainContrib;
            g.funds += gainFunds;
            g.towerFloor = floor + 1;
            this.guildCore.addGuildExp(gainExp);

            this.logger.add('🗼 [鎮妖神塔突破] 成功鎮壓第 ' + floor + ' 層妖魔！獲得：武點+' + gainSp + '、幫貢+' + gainContrib + '、幫會資金+' + gainFunds + '！', 'wealth');

            var poeSys = window.HY.game && window.HY.game.poeSys;
            if (floor % 5 === 0 && poeSys && Data.CURRENCIES) {
                var orbKeys = Object.keys(Data.CURRENCIES);
                var pickOrb = orbKeys[Math.floor(Math.random() * orbKeys.length)];
                poeSys.addCurrency(pickOrb, 1);
                this.logger.add('💎 掉落通貨：【' + Data.CURRENCIES[pickOrb].name + '】x1', 'loot');
            }

            return { ok: true, floor: floor };
        }

        exploreGuildRealm(realmId) {
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var realm = (Data.GUILD_REALMS || []).find(function (r) { return r.id === realmId; });

            if (!realm) {
                this.logger.add('⚠️ 秘境資料不存在，探索取消。', 'system');
                return { ok: false, reason: 'no_realm' };
            }

            if (g.lv < (realm.reqGuildLv || 1)) {
                this.logger.add('🔒 幫會等級不足！開啟【' + realm.name + '】需要幫會達到 Lv.' + realm.reqGuildLv + '。', 'system');
                return { ok: false, reason: 'guild_lv' };
            }

            if (g.funds < realm.costFunds) {
                this.logger.add('❌ 幫會資金不足！開啟秘境【' + realm.name + '】需要消耗 ' + realm.costFunds.toLocaleString() + ' 幫會資金。', 'system');
                return { ok: false, reason: 'no_funds' };
            }

            var rw = realm.reward || {};
            if (!rw.exp && !rw.contrib && !rw.herbs && !rw.ores && !rw.sp && !rw.bonusOrb) {
                this.logger.add('⚠️ 【' + realm.name + '】獎勵資料異常，探索取消（未扣除資金）。', 'system');
                return { ok: false, reason: 'bad_reward' };
            }

            g.funds -= realm.costFunds;

            var memberMult = 1 + g.members.length * 0.05;
            var gainExp = Math.floor((rw.exp || 25) * memberMult);
            var gainContrib = Math.floor((rw.contrib || 15) * memberMult);
            var gainHerbs = Math.floor((rw.herbs || 5) * memberMult);
            var gainOres = Math.floor((rw.ores || 5) * memberMult);
            var gainSp = Math.floor((rw.sp || 50) * memberMult);

            g.contrib += gainContrib;
            g.herbs += gainHerbs;
            g.ores += gainOres;
            this.charSys.rootState.sp += gainSp;
            this.guildCore.addGuildExp(gainExp);

            this.logger.add(
                '🌀 [幫會秘境] 探索【' + realm.name + '】：武點+' + gainSp + '、幫貢+' + gainContrib + '、靈草+' + gainHerbs + '、玄鐵+' + gainOres + '！',
                'wealth'
            );

            var poeSys = window.HY.game && window.HY.game.poeSys;
            if (rw.bonusOrb && poeSys && Data.CURRENCIES && Math.random() < 0.18) {
                var orbKeys = Object.keys(Data.CURRENCIES);
                var rOrbId = orbKeys[Math.floor(Math.random() * orbKeys.length)];
                poeSys.addCurrency(rOrbId, 1);
                this.logger.add('💎 掉落通貨：【' + Data.CURRENCIES[rOrbId].name + '】x1', 'loot');
            }

            return { ok: true, realm: realm.id };
        }

        // ⭐ v29：isAuto = true 時為「幫眾自動巡視」純氛圍事件：
        //    只印事件標題，不發放任何資源（資金/靈草/玄鐵/幫貢/武點/經驗/通貨均不給）。
        //    這避免 main.js 每 15 秒 25% 機率的免費事件成為無限資源管道。
        //    手動按鈕（uiGuild）呼叫時不傳參數 → 全額獎勵（且 UI 已先扣 1000 資金）。
        triggerRandomGuildEvent(isAuto) {
            var g = this.guildCore.getGuild();
            var Data = window.HY.Data;
            var events = Data.GUILD_EVENTS || [];
            if (events.length === 0) {
                // 自動路徑不洗版，只在手動時提示
                if (!isAuto) {
                    this.logger.add('⚠️ 目前尚無可觸發的幫會事件資料。', 'system');
                }
                return false;
            }

            var ev = events[Math.floor(Math.random() * events.length)];

            // ── 氛圍模式：只印標題 ──
            if (isAuto) {
                this.logger.add('👀 [幫眾自動巡視] ' + ev.title, 'time');
                return true;
            }

            // ── 全額獎勵模式 ──
            var ef = ev.effect || {};
            var rewardTexts = [];

            if (ef.herbs)   { g.herbs += ef.herbs; rewardTexts.push('靈草+' + ef.herbs); }
            if (ef.ores)    { g.ores += ef.ores; rewardTexts.push('玄鐵+' + ef.ores); }
            if (ef.funds)   { g.funds += ef.funds; rewardTexts.push('幫會資金+' + ef.funds); }
            if (ef.contrib) { g.contrib += ef.contrib; rewardTexts.push('幫貢+' + ef.contrib); }
            if (ef.sp)      { this.charSys.rootState.sp += ef.sp; rewardTexts.push('武點+' + ef.sp); }
            if (ef.exp)     { this.guildCore.addGuildExp(ef.exp); rewardTexts.push('幫會經驗+' + ef.exp); }

            if (ef.randomOrb && window.HY.game && window.HY.game.poeSys && Data.CURRENCIES && Math.random() < 0.5) {
                var orbKeys = Object.keys(Data.CURRENCIES);
                var pickId = orbKeys[Math.floor(Math.random() * orbKeys.length)];
                window.HY.game.poeSys.addCurrency(pickId, 1);
                this.logger.add('💎 掉落通貨：【' + Data.CURRENCIES[pickId].name + '】x1', 'loot');
            }

            this.logger.add('🎲 [幫會奇遇事件] ' + ev.title + (rewardTexts.length ? ' (' + rewardTexts.join('、') + ')' : ''), 'time');
            return true;
        }
    }

    window.HY.GuildRealmEventSystem = GuildRealmEventSystem;
})();