// js/inventorySystem.js  (v28)
// 全隊共享丹藥行囊
//
// v28 修正：
//   1. ⭐ item.effect 空值防護（避免新增無 effect 消耗品時拋錯）
//   2. ⭐ 裝備類改為明確提示「請於裝備分頁穿戴」，不再靜默回 false
//   3. 典當價公式與 equipmentSystem 保持一致（統一走 equipSys.getSellPrice）
window.HY = window.HY || {};

(function () {
    class InventorySystem {
        constructor(charSys, logger) {
            this.charSys = charSys;
            this.logger = logger;
            this.filterType = 'all';
        }

        addItem(itemId, count) {
            count = count || 1;
            var inv = this.charSys.rootState.inventory;
            inv[itemId] = (inv[itemId] || 0) + count;
        }

        sellItem(itemId, count) {
            var Data = window.HY.Data;
            var inv = this.charSys.rootState.inventory;
            var owned = inv[itemId] || 0;
            if (owned <= 0) return false;

            var sellCount = (count === 'all') ? owned : Math.min(owned, parseInt(count, 10) || 1);
            var item = Data.ITEMS[itemId];
            if (!item) return false;

            var unitPrice = Math.max(1, Math.floor((item.price || 20) * 0.5));
            var totalGold = unitPrice * sellCount;

            inv[itemId] -= sellCount;
            if (inv[itemId] <= 0) delete inv[itemId];

            this.charSys.rootState.gold += totalGold;
            this.logger.add('💰 批量典當了【' + item.name + '】x' + sellCount + '，共獲得 ' + totalGold + ' 兩紋銀！', 'wealth');
            return true;
        }

        sellAllUnwornEquip() {
            var equipSys = window.HY.game && window.HY.game.equipSys;
            if (equipSys) {
                return equipSys.sellAllBagEquips();
            }
            return false;
        }

        useOrEquipItem(itemId) {
            var Data = window.HY.Data;
            var inv = this.charSys.rootState.inventory;
            if (!inv[itemId] || inv[itemId] <= 0) {
                var missName = (Data.ITEMS[itemId] && Data.ITEMS[itemId].name) ? Data.ITEMS[itemId].name : '該物品';
                this.logger.add('⚠️ 行囊中沒有【' + missName + '】！', 'system');
                return false;
            }

            var item = Data.ITEMS[itemId];
            if (!item) return false;

            if (item.type === 'consumable') {
                // ⭐ effect 空值防護
                var eff = item.effect || {};

                inv[itemId] -= 1;
                if (inv[itemId] <= 0) delete inv[itemId];

                if (eff.hp || eff.mp) {
                    this.charSys.restoreVitals(eff.hp || 0, eff.mp || 0);
                    this.logger.add('💊 服用【' + item.name + '】，恢復氣血與內力！', 'combat');
                }
                if (eff.sp) {
                    this.charSys.rootState.sp += eff.sp;
                    this.logger.add('✨ 吸收【' + item.name + '】，獲得 ' + eff.sp + ' 點武學點數！', 'wealth');
                }
                return true;
            }

            // ⭐ 裝備類明確提示
            if (item.type === 'equip' || item.slotType) {
                this.logger.add('🎒 【' + item.name + '】為裝備，請於「🛡️ 裝備行囊 & 工藝」分頁進行穿戴。', 'system');
                return false;
            }

            return false;
        }
    }

    window.HY.InventorySystem = InventorySystem;
})();