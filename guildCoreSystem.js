// js/guildCoreSystem.js  (v44)
// 幫會核心系統：幫會升級經驗、幫眾招募、捐獻
//
// v44 修正：
//   ⭐ 招募成本改為「第1人 1 萬，之後每招募一人增加 10 萬」
//      公式：10000 + n × 100000（n = 已招募人數）
//      第1人 1萬 / 第2人 11萬 / 第3人 21萬 / 第4人 31萬 …
window.HY = window.HY || {};

(function () {
    class GuildCoreSystem {
        constructor(charSys, logger) {
            this.charSys = charSys;
            this.logger = logger;
            this.BASE_GUILD_EXP = 60000;   // 幫會升級基礎經驗
            this.RECRUIT_FIRST_COST = 10000;   // 第 1 位幫眾
            this.RECRUIT_STEP = 100000;        // 之後每位遞增 10 萬
        }

        ensureState() {
            var root = this.charSys.rootState;
            var Data = window.HY.Data;

            if (!root.guild) {
                root.guild = {
                    name: '少帥時空盟',
                    lv: 1,
                    exp: 0,
                    maxExp: this.BASE_GUILD_EXP,
                    funds: 1000,
                    contrib: 150,
                    herbs: 30,
                    ores: 30,
                    towerFloor: 1,
                    members: [
                        { id: 'gm_starter', name: '創幫總管・宣永', assignedTo: 'herb_field' }
                    ],
                    recruitedCount: 0,
                    buildings: {},
                    skills: {},
                    beasts: { qilin: 1, azure_dragon: 0, black_tortoise: 0, white_tiger: 0 },
                    activeBeast: 'qilin'
                };
            }

            var g = root.guild;

            // 自動將舊存檔校正為提升 10 倍後的幫會升級經驗曲線
            var expectedMinMaxExp = Math.floor(this.BASE_GUILD_EXP * Math.pow(1.55, (g.lv || 1) - 1));
            if (!g.maxExp || g.maxExp < expectedMinMaxExp) {
                g.maxExp = expectedMinMaxExp;
            }

            if (!Array.isArray(g.members)) g.members = [];
            if (g.recruitedCount === undefined) g.recruitedCount = 0;
            if (!g.towerFloor) g.towerFloor = 1;
            if (!g.buildings) g.buildings = {};
            if (!g.skills) g.skills = {};
            if (!g.beasts) g.beasts = { qilin: 1, azure_dragon: 0, black_tortoise: 0, white_tiger: 0 };

            if (Data && Data.GUILD_BUILDINGS) {
                Object.keys(Data.GUILD_BUILDINGS).forEach(function (bId) {
                    if (g.buildings[bId] === undefined) {
                        g.buildings[bId] = 1;
                    }
                });
            }
        }

        getGuild() {
            this.ensureState();
            return this.charSys.rootState.guild;
        }

        // ⭐ 招募成本：第1人 1 萬，之後每招募一人增加 10 萬
        getNextRecruitGoldCost() {
            var g = this.getGuild();
            var n = g.recruitedCount || 0;
            return this.RECRUIT_FIRST_COST + n * this.RECRUIT_STEP;
        }

        recruitGuildMember() {
            var g = this.getGuild();
            var Data = window.HY.Data;
            var cost = this.getNextRecruitGoldCost();
            var nextNum = (g.recruitedCount || 0) + 1;

            if (this.charSys.rootState.gold < cost) {
                this.logger.add('❌ 紋銀不足！招募第 ' + nextNum + ' 位幫眾需要 ' + cost.toLocaleString() + ' 兩紋銀。', 'system');
                return false;
            }

            this.charSys.rootState.gold -= cost;
            g.recruitedCount = nextNum;

            var namePool = (Data && Data.GUILD_MEMBER_NAMES) || ['江湖豪傑'];
            var pickName = namePool[g.members.length % namePool.length] + '・' + g.members.length;
            var newMember = {
                id: 'gm_' + Date.now() + '_' + g.members.length,
                name: pickName,
                assignedTo: null
            };

            g.members.push(newMember);
            this.logger.add('🏯 廣招天下豪傑！花費 ' + cost.toLocaleString() + ' 兩紋銀成功招募第 ' + nextNum + ' 位幫眾【' + pickName + '】！', 'wealth');
            return true;
        }

        addGuildExp(amount) {
            var g = this.getGuild();
            g.exp += amount;
            while (g.exp >= g.maxExp) {
                g.exp -= g.maxExp;
                g.lv += 1;
                g.maxExp = Math.floor(this.BASE_GUILD_EXP * Math.pow(1.55, g.lv - 1));
                this.logger.add('🎊 【幫會總舵升級】恭喜！你的幫會【' + g.name + '】升至 Lv.' + g.lv + '，所有建築、幫會祝福與後天改命技能的等級上限提升至 Lv.' + g.lv + '！', 'system');
            }
        }

        donateGold(amount) {
            var gold = parseInt(amount, 10) || 10000;
            if (this.charSys.rootState.gold < gold) {
                this.logger.add('❌ 紋銀不足 ' + gold.toLocaleString() + ' 兩，無法捐獻！', 'system');
                return false;
            }
            this.charSys.rootState.gold -= gold;
            var g = this.getGuild();
            var gainFunds = Math.floor(gold * 0.5);
            var gainContrib = Math.floor(gold / 20);
            var gainExp = Math.floor(gold / 30);

            g.funds += gainFunds;
            g.contrib += gainContrib;
            this.addGuildExp(gainExp);

            this.logger.add('🪙 向幫會捐獻 ' + gold.toLocaleString() + ' 兩紋銀：獲得幫會資金 +' + gainFunds + '、幫貢 +' + gainContrib + '、幫會經驗 +' + gainExp + '！', 'wealth');
            return true;
        }
    }

    window.HY.GuildCoreSystem = GuildCoreSystem;
})();