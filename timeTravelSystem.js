// js/timeTravelSystem.js  (v28)
// 時空地圖移動與醫療艙
//
// v28 修正：
//   ⭐ 可去地圖判定改為「全隊最高等級」，避免切換操控導致鎖圖跳動
window.HY = window.HY || {};

(function () {
    class TimeTravelSystem {
        constructor(charSys, combatSys, logger) {
            this.charSys = charSys;
            this.combatSys = combatSys;
            this.logger = logger;
        }

        getMaps() {
            var Data = window.HY.Data || {};
            return Data.MAPS || {};
        }

        getCurrentMapData() {
            var maps = this.getMaps();
            var cur = this.charSys.state && this.charSys.state.currentMap;
            return maps[cur] || maps.yangzhou;
        }

        // ⭐ 全隊最高等級（用於地圖解鎖判定）
        getMaxRosterLv() {
            var root = this.charSys.rootState;
            var roster = (root && root.roster) || [this.charSys.state];
            var maxLv = 1;
            roster.forEach(function (c) {
                if (c && c.lv > maxLv) maxLv = c.lv;
            });
            return maxLv;
        }

        travelTo(mapId) {
            var maps = this.getMaps();
            var targetMap = maps[mapId];
            if (!targetMap) return false;

            var topLv = this.getMaxRosterLv();
            if (topLv < (targetMap.minLv || 1)) {
                this.logger.add('🔒 時空亂流過強！前往【' + targetMap.name + '】需要隊伍有角色達到 Lv.' + targetMap.minLv + '。', 'time');
                return false;
            }

            if (this.combatSys) {
                if (typeof this.combatSys.clearBattleState === 'function') {
                    this.combatSys.clearBattleState();
                } else {
                    this.combatSys.stopAutoLoop();
                    this.combatSys.clearRepeatTimeout();
                    this.combatSys.enemies = [];
                    this.combatSys.currentEnemy = null;
                    this.combatSys.lastEnemyTemplate = null;
                }
            }

            this.charSys.state.currentMap = mapId;
            this.logger.add('🌀 馬博士啟動時空躍遷！你已穿梭至【' + targetMap.name + '】。', 'time');
            return true;
        }

        useMedicalPod() {
            this.charSys.restoreAllPartyVitals(1.0);
            this.logger.add('🛸 全隊躺入星際方舟的【奈米時空醫療艙】，氣血與內力瞬間恢復至顛峰狀態！', 'gain');
            return true;
        }
    }

    window.HY.TimeTravelSystem = TimeTravelSystem;
})();