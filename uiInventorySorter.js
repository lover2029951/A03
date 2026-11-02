// js/uiInventorySorter.js  (v2)
// 道具欄部位分類標籤 + 稀有度自動排序
//
// v2 修正：
//   ⭐ hookInventoryRender 的「暫時替換 equipBag」改以 try/finally 包住。
//      原本若 origRenderInv() 拋錯，root.equipBag 會永久停留在子集，
//      其餘裝備失去參考並被下一次存檔寫死，無法復原。
window.HY = window.HY || {};

(function () {
    class UIInventorySorter {
        constructor(app) {
            this.app = app;
            this.currentSlotFilter = 'all';
            this.sortOrder = 'desc';

            this.RARITY_WEIGHT = {
                unique: 4,
                rare: 3,
                magic: 2,
                normal: 1
            };

            this.SLOT_TABS = [
                { id: 'all',        label: '📦 全部' },
                { id: 'consumable', label: '💊 丹藥' },
                { id: 'equip',      label: '🛡️ 全裝備' },
                { id: 'mainhand',   label: '🗡️ 主手' },
                { id: 'offhand',    label: '🛡️ 副手' },
                { id: 'helmet',     label: '🪖 頭盔' },
                { id: 'body',       label: '🥋 胸甲' },
                { id: 'gloves',     label: '🧤 手套' },
                { id: 'boots',      label: '🥾 戰靴' },
                { id: 'belt',       label: '🎗️ 腰帶' },
                { id: 'amulet',     label: '📿 項鍊' },
                { id: 'ring',       label: '💍 戒指' }
            ];

            this.injectSlotFilterBarDOM();
            this.hookInventoryRender();
        }

        // 1. 自動對行囊中的裝備陣列 (rootState.equipBag) 按照「稀有度 -> 詞綴數量 -> 裝備等級」排序
        sortEquipBagInPlace() {
            var root = this.app.charSys && this.app.charSys.rootState;
            if (!root || !Array.isArray(root.equipBag)) return;

            var weightMap = this.RARITY_WEIGHT;
            var isDesc = (this.sortOrder === 'desc');

            root.equipBag.sort(function (a, b) {
                if (!a || !b) return 0;
                var wA = weightMap[a.rarity] || 1;
                var wB = weightMap[b.rarity] || 1;
                if (wA !== wB) {
                    return isDesc ? (wB - wA) : (wA - wB);
                }

                var modCountA = ((a.prefixes || []).length + (a.suffixes || []).length + (a.uniqueMods || []).length);
                var modCountB = ((b.prefixes || []).length + (b.suffixes || []).length + (b.uniqueMods || []).length);
                if (modCountA !== modCountB) {
                    return isDesc ? (modCountB - modCountA) : (modCountA - modCountB);
                }

                var lvA = a.reqLv || 1;
                var lvB = b.reqLv || 1;
                return isDesc ? (lvB - lvA) : (lvA - lvB);
            });
        }

        // 2. 在道具欄上方注入「各部位裝備分類標籤列」與「稀有度排序切換」
        injectSlotFilterBarDOM() {
            var oldFilterBar = document.querySelector('.inv-filter-bar');
            if (!oldFilterBar || document.getElementById('poe-slot-filter-container')) return;

            var parentRow = oldFilterBar.parentNode;
            var container = document.createElement('div');
            container.id = 'poe-slot-filter-container';
            container.style.background = '#121822';
            container.style.border = '1px solid #2e3b4e';
            container.style.borderRadius = '6px';
            container.style.padding = '8px 10px';
            container.style.marginBottom = '10px';

            parentRow.parentNode.insertBefore(container, parentRow.nextSibling);

            // 將舊的三個篩選按鈕隱藏（保留一鍵分解與一鍵典當按鈕在原位）
            oldFilterBar.querySelectorAll('.inv-filter-btn').forEach(function (btn) {
                btn.style.display = 'none';
            });

            if (!document.getElementById('btn-salvage-low-rarity')) {
                var btnSalvLow = document.createElement('button');
                btnSalvLow.id = 'btn-salvage-low-rarity';
                btnSalvLow.className = 'action-btn';
                btnSalvLow.style.borderColor = '#60a5fa';
                btnSalvLow.style.color = '#60a5fa';
                btnSalvLow.textContent = '🧹 分解白/藍裝 (留黃/暗金)';
                var self = this;
                btnSalvLow.addEventListener('click', function () {
                    self.salvageNormalAndMagicOnly();
                });
                oldFilterBar.prepend(btnSalvLow);
            }

            this.renderSlotFilterTabs();
        }

        // 僅分解白裝與藍裝，自動保護黃裝與傳奇暗金裝
        salvageNormalAndMagicOnly() {
            var root = this.app.charSys.rootState;
            var bag = root.equipBag || [];
            var salvSys = this.app.salvageExpSys;
            if (!salvSys) return;

            var kept = [];
            var count = 0;
            var totalStones = 0;

            bag.forEach(function (item) {
                if (item && (item.rarity === 'normal' || item.rarity === 'magic')) {
                    count += 1;
                    totalStones += salvSys.getSalvageStoneCount(item);
                } else {
                    kept.push(item);
                }
            });

            if (count === 0) {
                this.app.logger.add('⚠️ 行囊中目前沒有任何普通(白裝)或魔法(藍裝)可分解。', 'system');
                return;
            }

            root.equipBag = kept;
            root.spiritStones = (root.spiritStones || 0) + totalStones;
            this.app.logger.add('🧹 已自動分解 ' + count + ' 件白/藍裝（保留所有黃裝與傳奇），獲得【💎 靈石】+' + totalStones + '！', 'wealth');
            this.app.renderAll();
        }

        // 渲染部位標籤與每個部位的裝備件數徽章
        renderSlotFilterTabs() {
            var container = document.getElementById('poe-slot-filter-container');
            if (!container) return;

            var root = this.app.charSys.rootState;
            var bag = root.equipBag || [];
            var pills = root.inventory || {};

            var pillTotal = Object.keys(pills).filter(function (k) { return pills[k] > 0; }).length;
            var slotCounts = {
                all: bag.length + pillTotal,
                consumable: pillTotal,
                equip: bag.length
            };

            bag.forEach(function (item) {
                if (!item || !item.slotType) return;
                slotCounts[item.slotType] = (slotCounts[item.slotType] || 0) + 1;
            });

            var self = this;
            var tabsHtml = this.SLOT_TABS.map(function (t) {
                var cnt = slotCounts[t.id] || 0;
                var isActive = (self.currentSlotFilter === t.id);
                return '<button class="action-btn slot-tab-btn ' + (isActive ? 'active' : '') + '" data-slotfilter="' + t.id + '" ' +
                    'style="padding:4px 9px; font-size:0.78rem; border-color:' + (isActive ? '#00e5ff' : '#334155') + '; background:' + (isActive ? 'rgba(0,229,255,0.2)' : '#18202c') + ';">' +
                    t.label + ' <small style="color:' + (cnt > 0 ? '#fbbf24' : '#64748b') + ';">(' + cnt + ')</small>' +
                '</button>';
            }).join('');

            var sortBtnHtml =
                '<button id="btn-toggle-rarity-sort" class="action-btn" style="padding:4px 10px; font-size:0.78rem; border-color:#f59e0b; color:#fbbf24; margin-left:auto;">' +
                    (this.sortOrder === 'desc' ? '🏆 排序：稀有度 (傳奇➔白裝)' : '🏆 排序：稀有度 (白裝➔傳奇)') +
                '</button>';

            container.innerHTML =
                '<div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">' +
                    tabsHtml +
                    sortBtnHtml +
                '</div>';

            container.querySelectorAll('.slot-tab-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    self.currentSlotFilter = btn.dataset.slotfilter;
                    if (self.currentSlotFilter === 'consumable') {
                        self.app.inventorySys.filterType = 'consumable';
                    } else if (self.currentSlotFilter === 'all') {
                        self.app.inventorySys.filterType = 'all';
                    } else {
                        self.app.inventorySys.filterType = 'equip';
                    }
                    self.app.renderAll();
                });
            });

            var sortBtn = container.querySelector('#btn-toggle-rarity-sort');
            if (sortBtn) {
                sortBtn.addEventListener('click', function () {
                    self.sortOrder = (self.sortOrder === 'desc') ? 'asc' : 'desc';
                    self.app.renderAll();
                });
            }
        }

        // 3. 攔截道具欄渲染：先按稀有度自動排序，再依選中的部位標籤過濾顯示
        hookInventoryRender() {
            var self = this;
            var uiEquip = this.app.uiEquipMarket;
            if (!uiEquip) return;

            var origRenderInv = uiEquip.renderInventoryTab.bind(uiEquip);

            uiEquip.renderInventoryTab = function () {
                // Step 1: 渲染前先對行囊裝備依照「稀有度 (傳奇>黃>藍>白)」自動排序
                self.sortEquipBagInPlace();

                var root = self.app.charSys.rootState;
                var fullBag = root.equipBag || [];
                var f = self.currentSlotFilter;
                var isSpecificSlot = (f !== 'all' && f !== 'consumable' && f !== 'equip');

                // ⭐ v2：以 try/finally 包住「暫時替換 equipBag」的期間。
                //    原本若 origRenderInv() 拋錯，root.equipBag 會永久停留在子集，
                //    其餘裝備失去參考並被下一次存檔寫死。
                try {
                    if (isSpecificSlot) {
                        root.equipBag = fullBag.filter(function (item) {
                            return item && item.slotType === f;
                        });
                    }

                    origRenderInv();
                    if (window.HY.uiSalvageExp) {
                        window.HY.uiSalvageExp.decorateInventorySalvageButtons();
                    }
                } finally {
                    root.equipBag = fullBag;
                }

                // 更新部位標籤上的數量徽章（此時 equipBag 已還原，計數正確）
                self.renderSlotFilterTabs();
            };
        }
    }

    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            var game = window.HY.game;
            if (game) {
                window.HY.uiInvSorter = new UIInventorySorter(game);
                game.renderAll();
            }
        }, 120);
    });

    window.HY.UIInventorySorter = UIInventorySorter;
})();