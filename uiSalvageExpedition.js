// js/uiSalvageExpedition.js  (v50.1)
// 分解 / 靈石 / 10 回合狀態 Buff 丹藥 / 靈獸探險 UI
//
// v50.1 修正：
//   ⭐ 移除 decorateSpiritRootButtons 的「覆寫淬鍊按鈕文字」邏輯（殘留程式碼）
//      → 按鈕文字改由 uiSpiritRoot.buildUpgradeInfo() 統一產生，不再有切換閃爍
//   ⭐ decorateSpiritRootButtons 保留為空殼（相容舊呼叫），不再改動任何按鈕文字
window.HY = window.HY || {};

(function () {
    class UISalvageExpedition {
        constructor(app) {
            this.app = app;
            this.sys = app.salvageExpSys;
            this.injectLeftPanelResourceDOM();
            this.injectSalvageAllButtonDOM();
            this.hookUIRenders();
        }

        injectLeftPanelResourceDOM() {
            var goldEl = document.getElementById('char-gold');
            if (goldEl && !document.getElementById('char-spirit-stones')) {
                var resBox = goldEl.closest('.resource-box');
                if (resBox) {
                    var stoneRow = document.createElement('div');
                    stoneRow.innerHTML = '💎 下品靈石 (升靈根)：<strong id="char-spirit-stones" style="color:#38bdf8;">20</strong>';
                    var washRow = document.createElement('div');
                    washRow.innerHTML = '🌈 太虛洗靈丹 (0.1%)：<strong id="char-wash-pills" style="color:#f43f5e;">0</strong>';
                    var buffRow = document.createElement('div');
                    buffRow.style.marginTop = '4px';
                    buffRow.style.borderTop = '1px dashed #2e3b4e';
                    buffRow.style.paddingTop = '4px';
                    buffRow.innerHTML = '💊 當前丹藥狀態：<div id="char-active-buffs" style="font-size:0.78rem; color:#4ade80;">無狀態 Buff</div>';
                    resBox.appendChild(stoneRow);
                    resBox.appendChild(washRow);
                    resBox.appendChild(buffRow);
                }
            }
        }

        injectSalvageAllButtonDOM() {
            var btnSellAll = document.getElementById('btn-sell-all-equip');
            if (btnSellAll && !document.getElementById('btn-salvage-all-equip')) {
                var btnSalvageAll = document.createElement('button');
                btnSalvageAll.id = 'btn-salvage-all-equip';
                btnSalvageAll.className = 'action-btn';
                btnSalvageAll.style.borderColor = '#38bdf8';
                btnSalvageAll.style.color = '#38bdf8';
                btnSalvageAll.textContent = '🔥 一鍵分解全部裝備 (+靈石)';

                var self = this;
                btnSalvageAll.addEventListener('click', function () {
                    if (self.sys.salvageAllBagEquips()) {
                        self.app.renderAll();
                    }
                });
                btnSellAll.parentNode.insertBefore(btnSalvageAll, btnSellAll);
            }
        }

        hookUIRenders() {
            var self = this;
            var origRenderAll = this.app.renderAll.bind(this.app);

            this.app.renderAll = function () {
                origRenderAll();
                self.updateLeftResourceDOM();
                self.decorateInventorySalvageButtons();
                // ⭐ v50.1：已移除 decorateSpiritRootButtons 呼叫
                //    （靈根按鈕文字現由 uiSpiritRoot.buildUpgradeInfo() 統一產生）
                self.decoratePetExpeditionPanel();
            };

            var uiMarket = this.app.uiEquipMarket;
            if (uiMarket) {
                var origMarketRender = uiMarket.renderBlackMarketTab.bind(uiMarket);
                uiMarket.renderBlackMarketTab = function () {
                    origMarketRender();
                    var shopList = document.getElementById('shop-list');
                    if (shopList) {
                        Array.from(shopList.children).forEach(function (card) {
                            if (card.innerHTML.indexOf('狀態Buff丹') !== -1 || card.innerHTML.indexOf('太虛洗靈丹') !== -1) {
                                card.remove();
                            }
                        });
                    }
                };
            }
        }

        updateLeftResourceDOM() {
            this.sys.ensureState();
            var root = this.app.charSys.rootState;
            var st = this.app.charSys.state;

            var stoneEl = document.getElementById('char-spirit-stones');
            if (stoneEl) stoneEl.textContent = (root.spiritStones || 0).toLocaleString();

            var washEl = document.getElementById('char-wash-pills');
            if (washEl) washEl.textContent = (root.inventory && root.inventory.pill_wash_root) || 0;

            var buffEl = document.getElementById('char-active-buffs');
            if (buffEl) {
                var buffs = Object.values((st && st.activeBuffs) || {}).filter(function (b) { return b && b.turns > 0; });
                if (buffs.length === 0) {
                    buffEl.innerHTML = '<span style="color:#64748b;">無狀態 Buff (可於行囊服用探險丹藥)</span>';
                } else {
                    buffEl.innerHTML = buffs.map(function (b) {
                        return '<span style="display:inline-block; background:#1a2434; border:1px solid #10b981; padding:1px 6px; border-radius:3px; margin:2px 4px 0 0;">' +
                            b.name + ' (' + b.turns + '回合)</span>';
                    }).join('');
                }
            }
        }

        // ⭐ 改用 data-uid 精準對位（修正部位篩選下索引錯位）
        decorateInventorySalvageButtons() {
            var invList = document.getElementById('inventory-list');
            if (!invList) return;

            var filter = this.app.inventorySys.filterType || 'all';
            if (filter === 'consumable') return;

            var self = this;

            var cards = invList.querySelectorAll('.card-item[data-eq-uid]');
            if (cards.length === 0) return;

            var root = this.app.charSys.rootState;
            var bag = root.equipBag || [];

            Array.from(cards).forEach(function (card) {
                if (card.querySelector('.btn-salvage-eq')) return;

                var uid = card.getAttribute('data-eq-uid');
                if (!uid) return;

                var eqItem = bag.find(function (e) { return e && e.uid === uid; });
                if (!eqItem) return;

                var stones = self.sys.getSalvageStoneCount(eqItem);
                var btnRow = card.querySelector('.btn-group-row');
                if (btnRow) {
                    var salvBtn = document.createElement('button');
                    salvBtn.className = 'action-btn btn-salvage-eq';
                    salvBtn.style.borderColor = '#38bdf8';
                    salvBtn.style.color = '#38bdf8';
                    salvBtn.textContent = '🔨 分解 (+' + stones + '靈石)';
                    salvBtn.addEventListener('click', function () {
                        if (self.sys.salvageEquipByUid(uid)) {
                            self.app.renderAll();
                        }
                    });
                    btnRow.appendChild(salvBtn);
                }
            });
        }

        // ⭐ v50.1：保留方法殼以相容舊呼叫，但不再改動任何按鈕文字
        //    （靈根淬鍊／洗髓按鈕文字現由 uiSpiritRoot.buildUpgradeInfo() / buildRerollInfo() 產生）
        decorateSpiritRootButtons() {
            // 意圖留空：不再覆寫 #btn-up-spirit-root / #btn-reroll-spirit-root 的內容
            return;
        }

        decoratePetExpeditionPanel() {
            var petTab = document.getElementById('tab-pet');
            var petListEl = document.getElementById('pet-list');
            if (!petTab || !petListEl) return;

            var banner = document.getElementById('pet-expedition-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'pet-expedition-banner';
                banner.style.background = '#121822';
                banner.style.border = '1px solid #38bdf8';
                banner.style.borderRadius = '6px';
                banner.style.padding = '12px';
                banner.style.marginBottom = '14px';
                petTab.insertBefore(banner, petListEl);
            }

            var expPets = this.sys.getExpeditionPetList();
            var mins = Math.floor(this.sys.expeditionRemaining / 60);
            var secs = this.sys.expeditionRemaining % 60;
            var timeStr = mins + ' 分 ' + (secs < 10 ? '0' + secs : secs) + ' 秒';

            banner.innerHTML =
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
                    '<div>' +
                        '<h4 style="margin:0; color:#38bdf8; font-size:1rem;">🗺️ 靈獸時空探險隊（每 3 分鐘自動收集一次 10 回合狀態 Buff 靈丹！）</h4>' +
                        '<p style="font-size:0.82rem; color:#cbd5e1; margin-top:4px;">' +
                            '✨ 探險收穫池：<strong>狂暴戰神丹、金剛不壞丹、天眼必中丹、太虛幻影丹、長生回春丹、五氣朝元丹 (皆持續 10 回合)</strong>，以及 <strong style="color:#f43f5e;">0.1% 機率尋獲【🌈 太虛洗靈丹】</strong>！' +
                        '</p>' +
                        '<p style="font-size:0.82rem; color:#4ade80; margin-top:3px;">' +
                            '🐎 當前派遣探險中靈獸：<strong>' + (expPets.length > 0 ? expPets.map(function (p) { return p.name + '(Lv.' + p.lv + ')'; }).join('、') : '尚無靈獸探險 (收服靈獸後自動派遣)') + '</strong>' +
                        '</p>' +
                    '</div>' +
                    '<div style="background:#18202c; border:1px solid #00e5ff; padding:8px 14px; border-radius:6px; text-align:center;">' +
                        '<div style="font-size:0.76rem; color:#94a3b8;">距離下次探險歸來</div>' +
                        '<strong id="pet-exp-countdown" style="font-size:1.1rem; color:#00e5ff;">⏳ ' + (expPets.length > 0 ? timeStr : '等待派遣靈獸') + '</strong>' +
                    '</div>' +
                '</div>';

            var root = this.app.charSys.rootState;
            var Data = window.HY.Data;
            var cards = petListEl.querySelectorAll('.card-item');
            var allPets = Object.values(Data.PETS || {});
            var self = this;

            allPets.forEach(function (pet, idx) {
                var lv = (root.pets && root.pets[pet.id]) || 0;
                var card = cards[idx];
                if (!card || lv <= 0 || card.querySelector('.btn-pet-exp')) return;

                var isExploring = root.petExpeditions && root.petExpeditions[pet.id];
                var btnRow = card.querySelector('.btn-group-row');
                if (btnRow) {
                    var expBtn = document.createElement('button');
                    expBtn.className = 'action-btn btn-pet-exp';
                    expBtn.style.borderColor = isExploring ? '#38bdf8' : '#64748b';
                    expBtn.style.color = isExploring ? '#38bdf8' : '#94a3b8';
                    expBtn.textContent = isExploring ? '🗺️ 探險收集中' : '⛺ 派遣探險';
                    expBtn.addEventListener('click', function () {
                        if (self.sys.togglePetExpedition(pet.id)) {
                            self.app.renderAll();
                        }
                    });
                    btnRow.appendChild(expBtn);
                }
            });
        }

        updateTimerTextOnly() {
            var el = document.getElementById('pet-exp-countdown');
            if (!el) return;
            var mins = Math.floor(this.sys.expeditionRemaining / 60);
            var secs = this.sys.expeditionRemaining % 60;
            el.textContent = '⏳ ' + mins + ' 分 ' + (secs < 10 ? '0' + secs : secs) + ' 秒';
        }
    }

    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            var game = window.HY.game;
            if (game) {
                if (!game.salvageExpSys && window.HY.SalvageExpeditionSystem) {
                    game.salvageExpSys = new window.HY.SalvageExpeditionSystem(game);
                }
                if (!window.HY.uiSalvageExp && window.HY.UISalvageExpedition) {
                    window.HY.uiSalvageExp = new UISalvageExpedition(game);
                }
                game.renderAll();
            }
        }, 95);
    });

    window.HY.UISalvageExpedition = UISalvageExpedition;
})();