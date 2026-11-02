// js/equipmentSystem.js  (v29)
// 10 大裝備部位管理系統
//
// v29 修正（收尾整理）：
//   ⭐ 行囊容量上限實際上只在 unequip 會溢出（equipInstance 是 splice+push，淨變化 ≤ 0）
//   ⭐ 新增 getMaxBagSize()：與 poeCraftSystem 同源（優先讀 GameConfig.loot.maxBagSize）
//   ⭐ unequip / equipInstance 加入容量檢查：滿袋時「拒收」並提示
//      （卸下是玩家主動意圖，不自動典當）
window.HY = window.HY || {};

(function () {
    var DEFAULT_MAX_BAG_SIZE = 60;

    class EquipmentSystem {
        constructor(charSys, inventorySys, logger) {
            this.charSys = charSys;
            this.inventorySys = inventorySys;
            this.logger = logger;

            this.SLOTS = {
                mainhand:   { id: 'mainhand',   name: '主手武器', icon: '🗡️' },
                offhand:    { id: 'offhand',    name: '副手/盾牌', icon: '🛡️' },
                helmet:     { id: 'helmet',     name: '頭部護具', icon: '🪖' },
                body:       { id: 'body',       name: '胸甲戰衣', icon: '🥋' },
                gloves:     { id: 'gloves',     name: '手套護手', icon: '🧤' },
                boots:      { id: 'boots',      name: '戰靴履具', icon: '🥾' },
                belt:       { id: 'belt',       name: '腰帶束甲', icon: '🎗️' },
                amulet:     { id: 'amulet',     name: '護身符項鍊', icon: '📿' },
                ring_left:  { id: 'ring_left',  name: '左手戒指', icon: '💍' },
                ring_right: { id: 'ring_right', name: '右手戒指', icon: '💍' }
            };
        }

        // ⭐ v29：與 poeCraftSystem 使用同一來源，避免兩處不一致導致行囊「卡在 61 件」
        getMaxBagSize() {
            var G = window.HY && window.HY.GameConfig;
            if (G && G.loot && typeof G.loot.maxBagSize === 'number' && G.loot.maxBagSize > 0) {
                return G.loot.maxBagSize;
            }
            return DEFAULT_MAX_BAG_SIZE;
        }

        ensureState() {
            if (!Array.isArray(this.charSys.rootState.equipBag)) {
                this.charSys.rootState.equipBag = [];
            }

            if (!this.charSys.state.equipment) this.charSys.state.equipment = {};
            var self = this;
            Object.keys(this.SLOTS).forEach(function (slotKey) {
                var cur = self.charSys.state.equipment[slotKey];
                if (typeof cur === 'string' || cur === undefined) {
                    self.charSys.state.equipment[slotKey] = null;
                }
            });
        }

        getSellPrice(itemInst) {
            var rMult = itemInst.rarity === 'unique' ? 3 : (itemInst.rarity === 'rare' ? 2 : (itemInst.rarity === 'magic' ? 1.4 : 1));
            return Math.max(10, Math.floor((itemInst.price || 50) * 0.5 * rMult));
        }

        equipInstance(uid, targetRingSlot) {
            this.ensureState();
            var bag = this.charSys.rootState.equipBag;
            var idx = bag.findIndex(function (e) { return e && e.uid === uid; });
            if (idx === -1) return false;

            var itemInst = bag[idx];
            var reqLv = itemInst.reqLv || 1;
            if (this.charSys.state.lv < reqLv) {
                this.logger.add('🔒 等級不足！【' + this.charSys.state.name + '】需達到 Lv.' + reqLv + ' 才能裝備【' + itemInst.name + '】！', 'system');
                return false;
            }

            var slot = itemInst.slotType;
            if (slot === 'ring') {
                if (targetRingSlot === 'ring_left' || targetRingSlot === 'ring_right') {
                    slot = targetRingSlot;
                } else {
                    slot = !this.charSys.state.equipment.ring_left ? 'ring_left' : 'ring_right';
                }
            }

            if (!this.SLOTS[slot]) return false;

            // ⭐ v29：防禦性容量檢查。
            //    equipInstance 的淨變化是 splice(-1) + push(舊裝, +1) = 0 或 -1，
            //    理論上不會溢出；此處僅為防止未來改動引入回歸。
            var oldItem = this.charSys.state.equipment[slot];
            var maxSize = this.getMaxBagSize();
            if (oldItem && typeof oldItem === 'object' && bag.length >= maxSize) {
                this.logger.add('🎒 裝備行囊已滿（上限 ' + maxSize + ' 件）！請先典當或分解部分裝備，再更換【' + this.SLOTS[slot].name + '】。', 'system');
                return false;
            }

            bag.splice(idx, 1);
            if (oldItem && typeof oldItem === 'object') {
                bag.push(oldItem);
            }

            this.charSys.state.equipment[slot] = itemInst;
            this.charSys.clampVitals();

            var poeSys = window.HY.game && window.HY.game.poeSys;
            if (poeSys) poeSys.selectedTargetUid = itemInst.uid;

            this.logger.add(this.SLOTS[slot].icon + ' 【' + this.charSys.state.name + '】穿戴了【' + (itemInst.rareTitle || '') + itemInst.name + '】！', 'loot');
            return true;
        }

        unequip(slot) {
            this.ensureState();
            var itemInst = this.charSys.state.equipment[slot];
            if (!itemInst) return false;

            // ⭐ v29：卸下是「往行囊加一件」的唯一溢出路徑，滿袋時拒收。
            //    選擇拒收而非自動典當：卸下是玩家主動意圖，靜默銷毀裝備風險過高。
            var bag = this.charSys.rootState.equipBag;
            var maxSize = this.getMaxBagSize();
            if (bag.length >= maxSize) {
                this.logger.add('🎒 裝備行囊已滿（上限 ' + maxSize + ' 件）！無法卸下【' + (itemInst.rareTitle || '') + itemInst.name + '】，請先典當或分解部分裝備。', 'system');
                return false;
            }

            this.charSys.state.equipment[slot] = null;
            bag.push(itemInst);
            this.charSys.clampVitals();
            this.logger.add('🎒 已卸下【' + itemInst.name + '】放回裝備行囊。', 'system');
            return true;
        }

        sellEquipInstance(uid) {
            this.ensureState();
            var bag = this.charSys.rootState.equipBag;
            var idx = bag.findIndex(function (e) { return e && e.uid === uid; });
            if (idx === -1) return false;

            var itemInst = bag[idx];
            var sellPrice = this.getSellPrice(itemInst);

            bag.splice(idx, 1);
            this.charSys.rootState.gold += sellPrice;
            this.logger.add('💰 典當了裝備【' + (itemInst.rareTitle || '') + itemInst.name + '】，獲得 ' + sellPrice + ' 兩紋銀！', 'wealth');
            return true;
        }

        sellAllBagEquips() {
            this.ensureState();
            var bag = this.charSys.rootState.equipBag;
            if (bag.length === 0) {
                this.logger.add('⚠️ 裝備行囊中目前沒有任何未穿戴的裝備。', 'system');
                return false;
            }
            var self = this;
            var totalGold = 0;
            var count = bag.length;
            bag.forEach(function (itemInst) {
                totalGold += self.getSellPrice(itemInst);
            });
            this.charSys.rootState.equipBag = [];
            this.charSys.rootState.gold += totalGold;
            this.logger.add('🧹 一鍵典當了行囊中 ' + count + ' 件裝備，共獲得 ' + totalGold + ' 兩紋銀！', 'wealth');
            return true;
        }

        getTotalEquipmentBonusForChar(charObj) {
            var c = charObj || this.charSys.state;
            var poeSys = window.HY.game && window.HY.game.poeSys;
            var total = { atk: 0, def: 0, maxHp: 0, maxMp: 0, hit: 0, eva: 0, crit: 0, critRes: 0 };
            if (!c || !c.equipment) return total;

            Object.keys(this.SLOTS).forEach(function (slot) {
                var itemInst = c.equipment[slot];
                if (itemInst && typeof itemInst === 'object' && poeSys) {
                    var b = poeSys.getItemTotalBonus(itemInst);
                    Object.keys(total).forEach(function (k) {
                        total[k] += (b[k] || 0);
                    });
                }
            });

            return total;
        }

        formatBonusText(bonus) {
            if (!bonus) return '無特殊加成';
            var arr = [];
            if (bonus.atk)     arr.push('攻擊+' + bonus.atk);
            if (bonus.def)     arr.push('防禦+' + bonus.def);
            if (bonus.maxHp)   arr.push('氣血+' + bonus.maxHp);
            if (bonus.maxMp)   arr.push('內力+' + bonus.maxMp);
            if (bonus.hit)     arr.push('命中+' + bonus.hit + '%');
            if (bonus.eva)     arr.push('閃避+' + bonus.eva + '%');
            if (bonus.crit)    arr.push('爆擊+' + bonus.crit + '%');
            if (bonus.critRes) arr.push('暴抗+' + bonus.critRes + '%');
            return arr.join('、') || '基礎白板';
        }
    }

    window.HY.EquipmentSystem = EquipmentSystem;
})();