// js/blackMarketSystem.js  (v29)
// v29 修正（收尾整理）：
//   ⭐ buyRegularItem / buySpecialDeal 補上 item.reqLv 檢查
//      （原本 Lv.1 可以買 reqLv:100 的慈航千年雪蓮丹，與 UI 顯示的「需 Lv.100」不符）
window.HY = window.HY || {};

(function () {
    class BlackMarketSystem {
        constructor(charSys, inventorySys, logger) {
            this.charSys = charSys;
            this.inventorySys = inventorySys;
            this.logger = logger;
            this.categoryFilter = 'consumable';
            this.specialDeals = [];
            this.refreshCost = 50;
        }

        ensureState() {
            if (!this.specialDeals || this.specialDeals.length === 0) {
                this.generateSpecialDeals();
            }
        }

        isSellable(item) {
            return !!item && item.type === 'consumable' && !item.expeditionOnly;
        }

        // ⭐ v29：等級檢查（購買前呼叫）
        checkReqLv(item) {
            var reqLv = item.reqLv || 1;
            var charLv = this.charSys.state.lv;
            if (charLv < reqLv) {
                this.logger.add('🔒 境界不足！【' + item.name + '】需要角色達到 Lv.' + reqLv + ' 才能服用（當前 Lv.' + charLv + '）。', 'system');
                return false;
            }
            return true;
        }

        generateSpecialDeals() {
            var Data = window.HY.Data;
            if (!Data || !Data.ITEMS) return;

            var pool = Object.keys(Data.ITEMS).filter(function (k) {
                var it = Data.ITEMS[k];
                return it.type === 'consumable' && !it.expeditionOnly;
            });

            // Fisher–Yates 洗牌
            for (var i = pool.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = pool[i];
                pool[i] = pool[j];
                pool[j] = tmp;
            }

            var deals = [];
            var picked = pool.slice(0, Math.min(3, pool.length));
            picked.forEach(function (k) {
                var item = Data.ITEMS[k];
                var discount = [0.6, 0.7, 0.75, 0.8][Math.floor(Math.random() * 4)];
                deals.push({
                    itemId: item.id,
                    discount: discount,
                    salePrice: Math.max(5, Math.floor(item.price * discount)),
                    bought: false
                });
            });
            this.specialDeals = deals;
        }

        refreshSpecialDeals() {
            if (this.charSys.rootState.gold < this.refreshCost) {
                this.logger.add('❌ 紋銀不足！刷新黑市丹藥需要 ' + this.refreshCost + ' 兩紋銀。', 'system');
                return false;
            }
            this.charSys.rootState.gold -= this.refreshCost;
            this.generateSpecialDeals();
            this.logger.add('🔄 花費 ' + this.refreshCost + ' 兩紋銀，黑市刷新了一批折扣靈丹！', 'wealth');
            return true;
        }

        buySpecialDeal(index) {
            var Data = window.HY.Data;
            var deal = this.specialDeals[index];
            if (!deal || deal.bought) return false;

            var item = Data.ITEMS[deal.itemId];
            if (!this.isSellable(item)) return false;
            if (!this.checkReqLv(item)) return false;   // ⭐ v29

            if (this.charSys.rootState.gold < deal.salePrice) {
                this.logger.add('❌ 紋銀不足！搶購特價【' + item.name + '】需要 ' + deal.salePrice + ' 兩。', 'system');
                return false;
            }

            this.charSys.rootState.gold -= deal.salePrice;
            deal.bought = true;
            this.inventorySys.addItem(item.id, 1);
            this.logger.add('⚡ 黑市搶購成功！以 ' + deal.salePrice + ' 兩特價買下了【' + item.name + '】x1！', 'loot');
            return true;
        }

        buyRegularItem(itemId, count) {
            var qty = Math.max(1, parseInt(count, 10) || 1);
            var Data = window.HY.Data;
            var item = Data.ITEMS[itemId];

            if (!item || item.type !== 'consumable') {
                this.logger.add('🚫 黑市已取消販賣神兵裝備，所有裝備皆須透過擊敗各時空怪物掉落！', 'system');
                return false;
            }
            if (item.expeditionOnly) {
                this.logger.add('🚫 【' + item.name + '】為靈獸時空探險隊限定奇珍，黑市不出售。', 'system');
                return false;
            }
            if (!this.checkReqLv(item)) return false;   // ⭐ v29

            var totalPrice = item.price * qty;
            if (this.charSys.rootState.gold < totalPrice) {
                this.logger.add('❌ 紋銀不足！批量購買【' + item.name + '】x' + qty + ' 需要 ' + totalPrice + ' 兩紋銀。', 'system');
                return false;
            }

            this.charSys.rootState.gold -= totalPrice;
            this.inventorySys.addItem(itemId, qty);
            this.logger.add('🏪 在時空黑市花費 ' + totalPrice + ' 兩紋銀購入了【' + item.name + '】x' + qty + '！', 'loot');
            return true;
        }

        openMysteryBox() {
            var boxPrice = 350;
            if (this.charSys.rootState.gold < boxPrice) {
                this.logger.add('❌ 紋銀不足！開啟【烏氏時空奇珍匣】需要 ' + boxPrice + ' 兩紋銀。', 'system');
                return false;
            }

            this.charSys.rootState.gold -= boxPrice;
            var Data = window.HY.Data;
            var roll = Math.random() * 100;

            if (roll < 50) {
                var spGain = 200 + Math.floor(Math.random() * 300);
                this.charSys.rootState.sp += spGain;
                this.logger.add('🎲 開啟奇珍匣：發現上古武道殘卷，領悟獲得 ' + spGain + ' 點武點！', 'wealth');
            } else {
                var pillPool = ['pill_major', 'pill_sp', 'pill_supreme'];
                var pillId = pillPool[Math.floor(Math.random() * pillPool.length)];
                if (Data.ITEMS[pillId]) {
                    this.inventorySys.addItem(pillId, 1);
                    this.logger.add('🎲 開啟奇珍匣：獲得珍貴靈藥【' + Data.ITEMS[pillId].name + '】x1！', 'loot');
                }
            }
            return true;
        }
    }

    window.HY.BlackMarketSystem = BlackMarketSystem;
})();