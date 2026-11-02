// js/uiEquipMarket.js  (v28)
// 裝備槽、PoE 工藝台、行囊、黑市
//
// v28 修正：
//   1. ⭐ 行囊裝備卡片加上 data-eq-uid（供分解按鈕精準對位）
//   2. ⭐ 黑市表皮渲染已排除 expeditionOnly（原本已做，保留）
//   3. ⭐ 傳奇裝在工藝台同步提示「瓦爾唯一可作用」
window.HY = window.HY || {};

(function () {
    class UIEquipMarket {
        constructor(app) {
            this.app = app;
        }

        renderInventoryTab() {
            const Data = window.HY.Data;
            const app = this.app;
            app.equipSys.ensureState();
            app.poeSys.ensureState();
            const st = app.charSys.state;

            const rarityColors = { normal: '#e2e8f0', magic: '#60a5fa', rare: '#fbbf24', unique: '#f97316' };
            const rarityNames  = { normal: '普通白裝', magic: '魔法藍裝', rare: '稀有黃裝', unique: '傳奇暗金' };

            const selectedItem = app.poeSys.getSelectedCraftItem();
            const selectedUid = selectedItem ? selectedItem.uid : null;

            // ============ 1. 十大裝備槽位 ============
            const pdGrid = document.getElementById('paperdoll-grid');
            if (pdGrid) {
                pdGrid.innerHTML = '';
                Object.values(app.equipSys.SLOTS).forEach(slotInfo => {
                    const eqItem = st.equipment[slotInfo.id];
                    const isCraftTarget = eqItem && eqItem.uid === selectedUid;
                    const rColor = eqItem ? (rarityColors[eqItem.rarity] || '#e2e8f0') : '#2e3b4e';

                    let modSummary = '';
                    if (eqItem) {
                        const totalB = app.poeSys.getItemTotalBonus(eqItem);
                        modSummary =
                            (eqItem.implicit ? '<div style="color:#34d399; font-size:0.78rem;">✨ ' + eqItem.implicit.text + '</div>' : '') +
                            '<div style="font-size:0.8rem; color:#cbd5e1; margin-top:2px;">總效：' + app.equipSys.formatBonusText(totalB) + '</div>';
                    }

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.borderColor = isCraftTarget ? '#00e5ff' : rColor;

                    card.innerHTML =
                        '<div>' +
                            '<h4>' + slotInfo.icon + ' ' + slotInfo.name +
                            (eqItem && eqItem.corrupted ? ' <span style="color:#dc2626;">[已汙染]</span>' : '') + '</h4>' +
                            '<p style="color:' + rColor + '; font-weight:bold; margin:4px 0;">' +
                                (eqItem
                                    ? '[' + rarityNames[eqItem.rarity] + '] ' + (eqItem.rareTitle || '') + eqItem.name + ' (Lv.' + (eqItem.reqLv || 1) + ')'
                                    : '<span style="color:#64748b;">(空槽位 - 未穿戴)</span>') +
                            '</p>' +
                            (eqItem ? modSummary : '<p>打怪掉落對應部位裝備後可穿戴</p>') +
                        '</div>' +
                        (eqItem
                            ? '<div class="btn-group-row">' +
                                '<button class="action-btn btn-select-craft" style="border-color:#fbbf24; color:#fbbf24;">' + (isCraftTarget ? '🎯 工藝選中' : '💎 工藝改造') + '</button>' +
                                '<button class="action-btn btn-unequip">卸下</button>' +
                              '</div>'
                            : '');

                    if (eqItem) {
                        card.querySelector('.btn-select-craft').addEventListener('click', () => {
                            app.poeSys.selectedTargetUid = eqItem.uid;
                            this.renderInventoryTab();
                        });
                        card.querySelector('.btn-unequip').addEventListener('click', () => {
                            if (app.equipSys.unequip(slotInfo.id)) app.renderAll();
                        });
                    }

                    pdGrid.appendChild(card);
                });
            }

            // ============ 2. 通貨工藝台 ============
            const targetLabelEl = document.getElementById('craft-target-label');
            if (targetLabelEl) {
                targetLabelEl.textContent = selectedItem
                    ? '當前選中打造：【' + (selectedItem.rareTitle || '') + selectedItem.name + '】'
                    : '當前選中打造：尚未選擇裝備';
            }

            const previewEl = document.getElementById('craft-item-preview');
            if (previewEl) {
                if (!selectedItem) {
                    previewEl.innerHTML = '<p style="color:#94a3b8;">⚠️ 請在上方已穿戴部位或下方裝備行囊中，點選任意一件裝備的「💎 改造」按鈕！</p>';
                } else {
                    const rc = rarityColors[selectedItem.rarity] || '#e2e8f0';
                    const impHtml = selectedItem.implicit
                        ? '<div style="color:#34d399; font-weight:bold; padding:4px 0; border-bottom:1px dashed #334155;">' + selectedItem.implicit.text + ' (固定上詞綴 Implicit)</div>'
                        : '';
                    const prefixHtml = (selectedItem.prefixes || []).map(p =>
                        '<div style="color:#38bdf8;">🔹 [前綴 ' + p.tName + '] ' + p.label + ' <strong>+' + p.val + p.unit + '</strong> <small style="color:#64748b;">(' + p.min + '~' + p.max + ')</small></div>'
                    ).join('');
                    const suffixHtml = (selectedItem.suffixes || []).map(s =>
                        '<div style="color:#a78bfa;">🔸 [後綴 ' + s.tName + '] ' + s.label + ' <strong>+' + s.val + s.unit + '</strong> <small style="color:#64748b;">(' + s.min + '~' + s.max + ')</small></div>'
                    ).join('');
                    const uniqueHtml = (selectedItem.uniqueMods || []).map(u =>
                        '<div style="color:#f97316; font-weight:bold;">' + u.text + '</div>'
                    ).join('');

                    // ⭐ 傳奇裝提示
                    const uniqueNote = (selectedItem.rarity === 'unique')
                        ? '<div style="color:#f97316; font-size:0.78rem; margin-top:6px;">🟠 傳奇暗金：僅【瓦爾寶珠】可作用（其餘通貨無效）</div>'
                        : '';

                    previewEl.innerHTML =
                        '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:6px; margin-bottom:6px;">' +
                            '<strong style="font-size:1rem; color:' + rc + ';">[' + rarityNames[selectedItem.rarity] + '] ' + (selectedItem.rareTitle || '') + selectedItem.name + ' (需求 Lv.' + (selectedItem.reqLv || 1) + ')</strong>' +
                            '<span style="font-size:0.82rem; color:#94a3b8;">前綴：' + (selectedItem.prefixes || []).length + '/3 | 後綴：' + (selectedItem.suffixes || []).length + '/3 ' +
                            (selectedItem.corrupted ? '<strong style="color:#dc2626;">【已汙染 Corrupted】</strong>' : '') + '</span>' +
                        '</div>' +
                        '<div style="font-size:0.83rem; color:#cbd5e1; margin-bottom:4px;">固有基底：' + app.equipSys.formatBonusText(selectedItem.baseStats) + '</div>' +
                        impHtml +
                        '<div style="font-size:0.85rem; line-height:1.6; margin-top:4px;">' +
                            uniqueHtml +
                            prefixHtml +
                            suffixHtml +
                            (!uniqueHtml && !prefixHtml && !suffixHtml ? '<div style="color:#64748b;">(白裝無隨機下詞綴 — 可使用蛻變石或點金石打造)</div>' : '') +
                        '</div>' +
                        uniqueNote;
                }
            }

            const orbBarEl = document.getElementById('currency-orb-bar');
            if (orbBarEl && Data.CURRENCIES) {
                orbBarEl.innerHTML = '';
                const wallet = app.charSys.rootState.currencies || {};
                Object.values(Data.CURRENCIES).forEach(orb => {
                    const count = wallet[orb.id] || 0;
                    const isUniqueBlocked = selectedItem && selectedItem.rarity === 'unique' && orb.id !== 'orb_vaal';
                    const disabled = (count <= 0 || !selectedItem || selectedItem.corrupted || isUniqueBlocked);

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.padding = '8px 10px';
                    card.style.borderColor = count > 0 ? orb.color : '#2e3b4e';

                    card.innerHTML =
                        '<div>' +
                            '<h4 style="color:' + orb.color + ';">💎 ' + orb.name + ' <span style="color:#fff;">x' + count + '</span> <small style="color:#94a3b8;">[' + (orb.tierLabel || '通貨') + ']</small></h4>' +
                            '<p style="font-size:0.76rem;">' + orb.desc + '</p>' +
                        '</div>' +
                        '<button class="btn-primary" ' + (disabled ? 'disabled' : '') + ' style="padding:4px 8px; font-size:0.8rem;">' +
                            (isUniqueBlocked ? '🚫 傳奇不可用' : '🔨 使用【' + orb.name + '】') +
                        '</button>';

                    card.querySelector('button').addEventListener('click', () => {
                        if (app.poeSys.applyCurrencyToSelected(orb.id)) {
                            app.renderAll();
                        }
                    });
                    orbBarEl.appendChild(card);
                });
            }

            // ============ 3. 行囊 ============
            const invList = document.getElementById('inventory-list');
            if (!invList) return;
            invList.innerHTML = '';
            const filter = app.inventorySys.filterType || 'all';
            const bagEquips = app.charSys.rootState.equipBag || [];
            const invPills = app.charSys.rootState.inventory || {};

            let hasRenderedAny = false;

            if (filter === 'all' || filter === 'equip') {
                bagEquips.forEach(eqItem => {
                    hasRenderedAny = true;
                    const rc = rarityColors[eqItem.rarity] || '#e2e8f0';
                    const isSelected = eqItem.uid === selectedUid;
                    const lockedLv = st.lv < (eqItem.reqLv || 1);
                    const totalB = app.poeSys.getItemTotalBonus(eqItem);

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.borderColor = isSelected ? '#00e5ff' : rc;
                    // ⭐ 關鍵：寫入 data-eq-uid 供分解按鈕精準對位
                    card.dataset.eqUid = eqItem.uid;

                    let equipBtnsHtml = '';
                    if (eqItem.slotType === 'ring') {
                        equipBtnsHtml =
                            '<button class="btn-primary btn-eq-left" ' + (lockedLv ? 'disabled' : '') + '>💍 穿左戒</button>' +
                            '<button class="btn-primary btn-eq-right" ' + (lockedLv ? 'disabled' : '') + '>💍 穿右戒</button>';
                    } else {
                        const slotMeta = app.equipSys.SLOTS[eqItem.slotType];
                        equipBtnsHtml =
                            '<button class="btn-primary btn-eq-main" ' + (lockedLv ? 'disabled' : '') + '>' +
                                (lockedLv ? '🔒 需 Lv.' + eqItem.reqLv : (slotMeta ? slotMeta.icon + ' 穿戴' : '穿戴')) +
                            '</button>';
                    }

                    card.innerHTML =
                        '<div>' +
                            '<h4 style="color:' + rc + ';">[' + rarityNames[eqItem.rarity] + '] ' + (eqItem.rareTitle || '') + eqItem.name +
                            ' <small style="color:#fbbf24;">(Lv.' + (eqItem.reqLv || 1) + ')</small></h4>' +
                            (eqItem.implicit ? '<p style="color:#34d399; font-size:0.78rem;">✨ ' + eqItem.implicit.text + '</p>' : '') +
                            '<p style="color:#cbd5e1; font-size:0.8rem;">總屬性：' + app.equipSys.formatBonusText(totalB) + '</p>' +
                        '</div>' +
                        '<div class="btn-group-row" style="flex-wrap:wrap;">' +
                            equipBtnsHtml +
                            '<button class="action-btn btn-craft-bag" style="border-color:#fbbf24; color:#fbbf24;">💎 改造</button>' +
                            '<button class="action-btn btn-sell-eq">💰 典當</button>' +
                        '</div>';

                    if (eqItem.slotType === 'ring') {
                        card.querySelector('.btn-eq-left').addEventListener('click', () => {
                            if (app.equipSys.equipInstance(eqItem.uid, 'ring_left')) app.renderAll();
                        });
                        card.querySelector('.btn-eq-right').addEventListener('click', () => {
                            if (app.equipSys.equipInstance(eqItem.uid, 'ring_right')) app.renderAll();
                        });
                    } else {
                        card.querySelector('.btn-eq-main').addEventListener('click', () => {
                            if (app.equipSys.equipInstance(eqItem.uid)) app.renderAll();
                        });
                    }
                    card.querySelector('.btn-craft-bag').addEventListener('click', () => {
                        app.poeSys.selectedTargetUid = eqItem.uid;
                        this.renderInventoryTab();
                    });
                    card.querySelector('.btn-sell-eq').addEventListener('click', () => {
                        if (app.equipSys.sellEquipInstance(eqItem.uid)) app.renderAll();
                    });

                    invList.appendChild(card);
                });
            }

            if (filter === 'all' || filter === 'consumable') {
                Object.keys(invPills).forEach(itemId => {
                    const qty = invPills[itemId];
                    const item = Data.ITEMS[itemId];
                    if (qty <= 0 || !item) return;
                    hasRenderedAny = true;

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.innerHTML =
                        '<div>' +
                            '<h4>💊 ' + item.name + ' <span class="sci-color">x' + qty + '</span></h4>' +
                            '<p>' + item.desc + '</p>' +
                        '</div>' +
                        '<div class="btn-group-row" style="flex-wrap:wrap;">' +
                            '<button class="btn-primary btn-use-pill">💊 使用x1</button>' +
                            '<button class="action-btn btn-sell-1">💰 賣x1</button>' +
                            (qty >= 10 ? '<button class="action-btn btn-sell-10">💰 賣x10</button>' : '') +
                            (qty >= 2 ? '<button class="action-btn btn-sell-all">💰 全賣(' + qty + ')</button>' : '') +
                        '</div>';

                    card.querySelector('.btn-use-pill').addEventListener('click', () => {
                        if (app.inventorySys.useOrEquipItem(itemId)) app.renderAll();
                    });
                    card.querySelector('.btn-sell-1').addEventListener('click', () => {
                        if (app.inventorySys.sellItem(itemId, 1)) app.renderAll();
                    });
                    const b10 = card.querySelector('.btn-sell-10');
                    if (b10) b10.addEventListener('click', () => { if (app.inventorySys.sellItem(itemId, 10)) app.renderAll(); });
                    const bAll = card.querySelector('.btn-sell-all');
                    if (bAll) bAll.addEventListener('click', () => { if (app.inventorySys.sellItem(itemId, 'all')) app.renderAll(); });

                    invList.appendChild(card);
                });
            }

            if (!hasRenderedAny) {
                invList.innerHTML = '<p style="color:#94a3b8;">目前分類下沒有物品（神兵裝備與通貨僅由擊敗怪物掉落）。</p>';
            }
        }

        renderBlackMarketTab() {
            const Data = window.HY.Data;
            const app = this.app;
            app.marketSys.ensureState();

            const specialEl = document.getElementById('market-special-list');
            if (specialEl) {
                specialEl.innerHTML = '';
                app.marketSys.specialDeals.forEach((deal, idx) => {
                    const item = Data.ITEMS[deal.itemId];
                    if (!item || item.type !== 'consumable' || item.expeditionOnly) return;

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.borderColor = deal.bought ? '#334155' : '#a78bfa';

                    card.innerHTML =
                        '<div>' +
                            '<h4>⚡ ' + item.name + ' <span class="sp-color">[' + Math.round(deal.discount * 10) + '折]</span></h4>' +
                            '<p>' + item.desc + '</p>' +
                            '<p><del style="color:#64748b;">原價：' + item.price + '兩</del> 👉 <strong class="gold-color">特價：' + deal.salePrice + ' 兩紋銀</strong></p>' +
                        '</div>' +
                        '<button class="btn-primary" ' + (deal.bought ? 'disabled' : '') + '>' +
                            (deal.bought ? '已售罄' : '⚡ 立即搶購 (' + deal.salePrice + '兩)') +
                        '</button>';

                    card.querySelector('button').addEventListener('click', () => {
                        if (app.marketSys.buySpecialDeal(idx)) app.renderAll();
                    });
                    specialEl.appendChild(card);
                });
            }

            const shopList = document.getElementById('shop-list');
            if (!shopList) return;
            shopList.innerHTML = '';

            Object.values(Data.ITEMS).forEach(item => {
                if (item.type !== 'consumable') return;
                if (item.expeditionOnly) return;

                const card = document.createElement('div');
                card.className = 'card-item';
                card.innerHTML =
                    '<div>' +
                        '<h4>💊 ' + item.name + ' <small style="color:#00e5ff;">[丹藥奇物 | 需 Lv.' + (item.reqLv || 1) + ']</small></h4>' +
                        '<p>' + item.desc + '</p>' +
                        '<p class="gold-color">單價：' + item.price + ' 兩紋銀</p>' +
                    '</div>' +
                    '<div class="btn-group-row" style="flex-wrap:wrap;">' +
                        '<button class="btn-primary btn-buy-1">🪙 買x1</button>' +
                        '<button class="action-btn btn-buy-10">買x10</button>' +
                        '<button class="action-btn btn-buy-100" style="border-color:#10b981;">買x100</button>' +
                    '</div>';

                card.querySelector('.btn-buy-1').addEventListener('click', () => {
                    if (app.marketSys.buyRegularItem(item.id, 1)) app.renderAll();
                });
                card.querySelector('.btn-buy-10').addEventListener('click', () => {
                    if (app.marketSys.buyRegularItem(item.id, 10)) app.renderAll();
                });
                card.querySelector('.btn-buy-100').addEventListener('click', () => {
                    if (app.marketSys.buyRegularItem(item.id, 100)) app.renderAll();
                });
                shopList.appendChild(card);
            });
        }
    }

    window.HY.UIEquipMarket = UIEquipMarket;
})();