// js/companionSystem.js
window.HY = window.HY || {};

(function () {
    class CompanionSystem {
        constructor(charSys, logger) {
            this.charSys = charSys;
            this.logger = logger;
        }

        ensureState() {
            if (!this.charSys.rootState.companions) {
                this.charSys.rootState.companions = {};
            }
            if (this.charSys.rootState.activeCompanion === undefined) {
                this.charSys.rootState.activeCompanion = null;
            }
        }

        // 取得隊伍中最高角色等級（供結交群俠與收服靈獸判定）
        getMaxCharLv() {
            var roster = (this.charSys.rootState && this.charSys.rootState.roster) || [this.charSys.state];
            var maxLv = 1;
            roster.forEach(function (c) {
                if (c.lv > maxLv) maxLv = c.lv;
            });
            return maxLv;
        }

        recruit(compId) {
            this.ensureState();
            var Data = window.HY.Data;
            var comp = Data.COMPANIONS[compId];
            if (!comp) return false;

            var reqLv = comp.reqLv || 1;
            if (this.getMaxCharLv() < reqLv) {
                this.logger.add('🔒 江湖聲望不足！需有角色達到 Lv.' + reqLv + ' 才能結交【' + comp.name + '】！', 'system');
                return false;
            }

            if (this.charSys.rootState.companions[compId]) {
                this.logger.add('⚠️ 你已經與【' + comp.name + '】結為生死之交了！', 'system');
                return false;
            }

            if (this.charSys.rootState.gold < comp.recruitGold) {
                this.logger.add('❌ 紋銀不足！備齊結交禮金需要 ' + comp.recruitGold + ' 兩紋銀。', 'system');
                return false;
            }

            this.charSys.rootState.gold -= comp.recruitGold;
            this.charSys.rootState.companions[compId] = 1;

            if (!this.charSys.rootState.activeCompanion) {
                this.charSys.rootState.activeCompanion = compId;
            }

            this.charSys.clampVitals();
            this.logger.add('🤝 豪氣干雲！你花費 ' + comp.recruitGold + ' 兩紋銀與【' + comp.name + '】義結金蘭！', 'gain');
            return true;
        }

        getUpgradeCost(compId) {
            this.ensureState();
            var Data = window.HY.Data;
            var comp = Data.COMPANIONS[compId];
            var lv = this.charSys.rootState.companions[compId] || 1;
            return Math.floor(comp.upgradeSpCost * Math.pow(1.45, lv - 1));
        }

        getUpgradeReqLv(compId) {
            this.ensureState();
            var Data = window.HY.Data;
            var comp = Data.COMPANIONS[compId];
            var lv = this.charSys.rootState.companions[compId] || 1;
            return (comp.reqLv || 1) + lv * 2;
        }

        upgrade(compId) {
            this.ensureState();
            var Data = window.HY.Data;
            var comp = Data.COMPANIONS[compId];
            var lv = this.charSys.rootState.companions[compId] || 0;
            if (!comp || lv <= 0) return false;

            var needLv = this.getUpgradeReqLv(compId);
            if (this.getMaxCharLv() < needLv) {
                this.logger.add('🔒 境界不足！需有角色達到 Lv.' + needLv + ' 才能與【' + comp.name + '】切磋升至下一階！', 'system');
                return false;
            }

            var cost = this.getUpgradeCost(compId);
            if (this.charSys.rootState.sp < cost) {
                this.logger.add('❌ 武點不足！與【' + comp.name + '】切磋印證武道需要 ' + cost + ' 武點。', 'system');
                return false;
            }

            this.charSys.rootState.sp -= cost;
            this.charSys.rootState.companions[compId] = lv + 1;
            this.charSys.clampVitals();
            this.logger.add('✨ 你與【' + comp.name + '】切磋武藝，默契升至 Lv.' + (lv + 1) + '！', 'gain');
            return true;
        }

        setActive(compId) {
            this.ensureState();
            var Data = window.HY.Data;
            if (!this.charSys.rootState.companions[compId]) return false;
            this.charSys.rootState.activeCompanion = compId;
            this.charSys.clampVitals();
            var comp = Data.COMPANIONS[compId];
            this.logger.add('⚔️ 已指派【' + comp.name + '】作為隨行助戰護法！', 'system');
            return true;
        }

        getActiveCompanionInfo() {
            this.ensureState();
            var Data = window.HY.Data;
            var activeId = this.charSys.rootState.activeCompanion;
            if (!activeId || !Data.COMPANIONS[activeId]) return null;

            var comp = Data.COMPANIONS[activeId];
            var lv = this.charSys.rootState.companions[activeId] || 1;
            var scale = 1 + (lv - 1) * 0.15;

            var passive = {};
            Object.keys(comp.passive).forEach(function (k) {
                passive[k] = Math.floor(comp.passive[k] * scale);
            });

            return {
                id: comp.id,
                name: comp.name,
                title: comp.title,
                lv: lv,
                skillName: comp.skillName,
                actionType: comp.actionType,
                powerMult: comp.powerMult * (1 + (lv - 1) * 0.1),
                passive: passive
            };
        }
    }

    window.HY.CompanionSystem = CompanionSystem;
})();