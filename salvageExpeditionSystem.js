// js/salvageExpeditionSystem.js  (v29)
// 裝備分解 / 靈石淬鍊 / 10 回合狀態 Buff 丹藥 / 靈獸時空探險
//
// v29 修正（元素體系去重）：
//   ⭐ 移除 getDerivedStatsForChar 中的 elemAtkPct/elemDefPct 處理
//      （元素攻防現由 elementSystem.getElementStats 讀取 activeBuffs 處理）
//   ⭐ 保留 Buff 的 atkPct / defPct / hitFlat / evaFlat / critFlat / critResFlat / spdFlat
window.HY = window.HY || {};

(function () {
    class SalvageExpeditionSystem {
        constructor(app) {
            this.app = app;
            this.EXPEDITION_DURATION = 180;
            this.expeditionRemaining = this.EXPEDITION_DURATION;
            this.timer = null;

            this.registerBuffAndWashPills();
            this.ensureState();
            this.overrideSpiritRootMethods();
            this.hookInventoryAndBuffStats();
            this.startExpeditionTicker();
        }

        registerBuffAndWashPills() {
            var Data = window.HY.Data;
            if (!Data || !Data.ITEMS) return;

            ['pill_spirit_stone', 'pill_con_perm', 'pill_str_perm', 'pill_agi_perm', 'pill_int_perm', 'pill_dex_perm']
                .forEach(function (oldId) { delete Data.ITEMS[oldId]; });

            var buffPills = {
                pill_wash_root: {
                    id: 'pill_wash_root',
                    name: '🌈 太虛洗靈丹',
                    type: 'consumable',
                    reqLv: 1,
                    price: 5000,
                    expeditionOnly: true,
                    desc: '【傳說探險奇丹・0.1%掉率】蘊含混沌太虛本源，服用或於靈根介面使用可為當前角色重塑本命靈根！',
                    effect: { washRoot: true }
                },
                pill_buff_atk: {
                    id: 'pill_buff_atk',
                    name: '🔥 狂暴戰神丹 (10回合)',
                    type: 'consumable',
                    reqLv: 1,
                    price: 300,
                    expeditionOnly: true,
                    desc: '【狀態Buff丹・持續10回合】服用後使當前角色綜合攻擊 +25%、靈根屬攻 +25%，持續 10 回合！',
                    effect: { buffId: 'berserk_atk', buffName: '🔥狂暴戰神', turns: 10, atkPct: 0.25, elemAtkPct: 0.25 }
                },
                pill_buff_def: {
                    id: 'pill_buff_def',
                    name: '🛡️ 金剛不壞丹 (10回合)',
                    type: 'consumable',
                    reqLv: 1,
                    price: 300,
                    expeditionOnly: true,
                    desc: '【狀態Buff丹・持續10回合】服用後使當前角色護體防禦 +30%、靈根屬防 +30%、暴抗 +15%，持續 10 回合！',
                    effect: { buffId: 'diamond_def', buffName: '🛡️金剛不壞', turns: 10, defPct: 0.30, elemDefPct: 0.30, critResFlat: 15 }
                },
                pill_buff_crit: {
                    id: 'pill_buff_crit',
                    name: '🎯 天眼必中丹 (10回合)',
                    type: 'consumable',
                    reqLv: 1,
                    price: 300,
                    expeditionOnly: true,
                    desc: '【狀態Buff丹・持續10回合】服用後使當前角色精準命中 +25%、會心爆擊率 +20%，持續 10 回合！',
                    effect: { buffId: 'eagle_crit', buffName: '🎯天眼必中', turns: 10, hitFlat: 25, critFlat: 20 }
                },
                pill_buff_eva: {
                    id: 'pill_buff_eva',
                    name: '🍃 太虛幻影丹 (10回合)',
                    type: 'consumable',
                    reqLv: 1,
                    price: 300,
                    expeditionOnly: true,
                    desc: '【狀態Buff丹・持續10回合】服用後使當前角色輕功閃避率 +20%、出手攻速 +5，持續 10 回合！',
                    effect: { buffId: 'phantom_eva', buffName: '🍃太虛幻影', turns: 10, evaFlat: 20, spdFlat: 5 }
                },
                pill_buff_regen: {
                    id: 'pill_buff_regen',
                    name: '🌸 長生回春丹 (10回合)',
                    type: 'consumable',
                    reqLv: 1,
                    price: 300,
                    expeditionOnly: true,
                    desc: '【狀態Buff丹・持續10回合】服用後使當前角色每次出招自動恢復 10% 最大氣血與內力，持續 10 回合！',
                    effect: { buffId: 'spring_regen', buffName: '🌸長生回春', turns: 10, regenPct: 0.10 }
                },
                pill_buff_all: {
                    id: 'pill_buff_all',
                    name: '⚡ 五氣朝元丹 (10回合)',
                    type: 'consumable',
                    reqLv: 1,
                    price: 500,
                    expeditionOnly: true,
                    desc: '【狀態Buff丹・持續10回合】服用後使當前角色全攻防與屬攻屬防 +18%、會心與暴抗 +12%，持續 10 回合！',
                    effect: { buffId: 'five_qi_all', buffName: '⚡五氣朝元', turns: 10, atkPct: 0.18, defPct: 0.18, elemAtkPct: 0.18, elemDefPct: 0.18, critFlat: 12, critResFlat: 12 }
                }
            };

            Object.keys(buffPills).forEach(function (k) {
                Data.ITEMS[k] = buffPills[k];
            });
        }

        ensureState() {
            var root = this.app.charSys.rootState;
            if (root.spiritStones === undefined) root.spiritStones = 20;
            if (!root.petExpeditions) root.petExpeditions = {};

            (root.roster || []).forEach(function (c) {
                if (!c.activeBuffs) c.activeBuffs = {};
            });

            var Data = window.HY.Data;
            if (root.inventory && Data && Data.ITEMS) {
                Object.keys(root.inventory).forEach(function (id) {
                    if (!Data.ITEMS[id]) delete root.inventory[id];
                });
            }
        }

        getSalvageStoneCount(itemInst) {
            if (!itemInst) return 1;
            var reqLv = itemInst.reqLv || 1;
            var rMult = itemInst.rarity === 'unique' ? 5 : (itemInst.rarity === 'rare' ? 3 : (itemInst.rarity === 'magic' ? 2 : 1));
            var affixCount = ((itemInst.prefixes || []).length + (itemInst.suffixes || []).length);
            return Math.max(1, Math.floor((1 + reqLv / 30) * rMult + affixCount * 0.5));
        }

        salvageEquipByUid(uid) {
            this.ensureState();
            var root = this.app.charSys.rootState;
            var bag = root.equipBag || [];
            var idx = bag.findIndex(function (e) { return e && e.uid === uid; });
            if (idx === -1) return false;

            var itemInst = bag[idx];
            var stones = this.getSalvageStoneCount(itemInst);
            bag.splice(idx, 1);

            root.spiritStones = (root.spiritStones || 0) + stones;
            this.app.logger.add('🔨 分解裝備【' + (itemInst.rareTitle || '') + itemInst.name + '】，獲得【💎 靈石】+' + stones + '！', 'wealth');
            return true;
        }

        salvageAllBagEquips() {
            this.ensureState();
            var root = this.app.charSys.rootState;
            var bag = root.equipBag || [];
            if (bag.length === 0) {
                this.app.logger.add('⚠️ 裝備行囊中目前沒有任何未穿戴的裝備可供分解。', 'system');
                return false;
            }

            var totalStones = 0;
            var count = bag.length;
            var self = this;
            bag.forEach(function (itemInst) {
                totalStones += self.getSalvageStoneCount(itemInst);
            });

            root.equipBag = [];
            root.spiritStones = (root.spiritStones || 0) + totalStones;
            this.app.logger.add('🔥 一鍵熔煉分解了 ' + count + ' 件裝備，共提煉獲得【💎 靈石】+' + totalStones + '！', 'wealth');
            return true;
        }

        overrideSpiritRootMethods() {
            var srSys = this.app.spiritRootSys;
            if (!srSys) return;
            var self = this;

            srSys.getUpgradeRootStoneCost = function (charObj) {
                var c = charObj || self.app.charSys.state;
                srSys.ensureCharRoot(c);
                var lv = c.spiritRootLv || 1;
                var G = window.HY && window.HY.GameConfig;
                var base = (G && G.spiritRoot && typeof G.spiritRoot.stoneCostBase === 'number')
                    ? G.spiritRoot.stoneCostBase : 1000;
                var pow = (G && G.spiritRoot && typeof G.spiritRoot.stoneCostPow === 'number')
                    ? G.spiritRoot.stoneCostPow : 1.45;
                return Math.floor(base * Math.pow(pow, lv - 1));
            };

            srSys.upgradeCharSpiritRoot = function () {
                self.ensureState();
                var root = self.app.charSys.rootState;
                var c = self.app.charSys.state;
                srSys.ensureCharRoot(c);
                var Data = window.HY.Data;
                var rootMeta = Data.SPIRIT_ROOTS[c.spiritRoot];
                var cost = srSys.getUpgradeRootStoneCost(c);

                if ((root.spiritStones || 0) < cost) {
                    self.app.logger.add('❌ 靈石不足！淬鍊【' + c.name + '】的【' + rootMeta.name + '】需要 ' + cost.toLocaleString() + ' 顆【💎 靈石】。', 'system');
                    return false;
                }

                root.spiritStones -= cost;
                c.spiritRootLv = (c.spiritRootLv || 1) + 1;
                self.app.charSys.clampVitals();
                self.app.logger.add('💎 靈石淬鍊！【' + c.name + '】消耗 ' + cost.toLocaleString() + ' 顆靈石，將【' + rootMeta.name + '】提升至第 ' + c.spiritRootLv + ' 境！', 'wealth');
                return true;
            };

            srSys.rerollCharSpiritRoot = function () {
                var inv = self.app.charSys.rootState.inventory;
                var pillCount = inv.pill_wash_root || 0;
                if (pillCount <= 0) {
                    self.app.logger.add('🚫 重塑本命靈根需要消耗 1 顆【🌈 太虛洗靈丹】（派遣靈獸探險有 0.1% 機率尋獲）！', 'system');
                    return false;
                }

                var c = self.app.charSys.state;
                srSys.ensureCharRoot(c);
                var Data = window.HY.Data;
                var keys = Object.keys(Data.SPIRIT_ROOTS).filter(function (k) { return k !== c.spiritRoot; });
                var newRootId = keys[Math.floor(Math.random() * keys.length)];

                inv.pill_wash_root -= 1;
                if (inv.pill_wash_root <= 0) delete inv.pill_wash_root;

                c.spiritRoot = newRootId;
                self.app.charSys.clampVitals();

                var newMeta = Data.SPIRIT_ROOTS[newRootId];
                self.app.logger.add('🌈 服用【太虛洗靈丹】洗髓成功！【' + c.name + '】覺醒了全新的【' + newMeta.icon + ' ' + newMeta.name + '】！', 'system');
                return true;
            };
        }

        hookInventoryAndBuffStats() {
            var invSys = this.app.inventorySys;
            var charSys = this.app.charSys;
            var combat = this.app.combatSys;
            var self = this;

            // A. 服用 Buff 丹藥
            var origUse = invSys.useOrEquipItem.bind(invSys);
            invSys.useOrEquipItem = function (itemId) {
                var Data = window.HY.Data;
                var inv = charSys.rootState.inventory;
                var item = Data.ITEMS[itemId];
                if (!item || !inv[itemId] || inv[itemId] <= 0) {
                    return origUse(itemId);
                }

                if (item.effect && item.effect.washRoot) {
                    return self.app.spiritRootSys.rerollCharSpiritRoot();
                }

                if (item.effect && item.effect.buffId) {
                    var c = charSys.state;
                    if (!c.activeBuffs) c.activeBuffs = {};
                    inv[itemId] -= 1;
                    if (inv[itemId] <= 0) delete inv[itemId];

                    var bId = item.effect.buffId;
                    var curTurns = (c.activeBuffs[bId] && c.activeBuffs[bId].turns) || 0;
                    c.activeBuffs[bId] = {
                        id: bId,
                        name: item.effect.buffName,
                        turns: curTurns + (item.effect.turns || 10),
                        effect: Object.assign({}, item.effect)
                    };

                    charSys.clampVitals();
                    self.app.logger.add('💊 【' + c.name + '】服用了【' + item.name + '】，獲得狀態【' + item.effect.buffName + '】(剩餘 ' + c.activeBuffs[bId].turns + ' 回合)！', 'combat');
                    return true;
                }

                return origUse(itemId);
            };

            // B. Buff 計入衍生屬性
            //    ⭐ v29：元素攻防（elemAtkPct / elemDefPct）已移至 elementSystem.getElementStats。
            //    這裡只處理數值型欄位（atkPct / defPct / hitFlat / evaFlat / critFlat / critResFlat / spdFlat）。
            var origDerived = charSys.getDerivedStatsForChar.bind(charSys);
            charSys.getDerivedStatsForChar = function (charObj) {
                var c = charObj || charSys.state;
                var d = origDerived(c);
                if (!c || !c.activeBuffs) return d;

                Object.values(c.activeBuffs).forEach(function (buff) {
                    if (!buff || buff.turns <= 0 || !buff.effect) return;
                    var ef = buff.effect;
                    if (ef.atkPct)      d.atk     = Math.floor(d.atk * (1 + ef.atkPct));
                    if (ef.defPct)      d.def     = Math.floor(d.def * (1 + ef.defPct));
                    if (ef.hitFlat)     d.hit     += ef.hitFlat;
                    if (ef.evaFlat)     d.eva     = Math.min(85, d.eva + ef.evaFlat);
                    if (ef.critFlat)    d.crit    = Math.min(90, d.crit + ef.critFlat);
                    if (ef.critResFlat) d.critRes += ef.critResFlat;
                    if (ef.spdFlat)     d.atkSpd  = (d.atkSpd || 100) + ef.spdFlat;
                });

                return d;
            };

            // C. 出招後扣除 Buff 回合
            if (combat) {
                combat.registerPlugin({
                    onAfterPlayerAttack: function (core, payload) {
                        var c = payload.charObj;
                        if (!c || !c.activeBuffs) return;
                        var expiredNames = [];

                        Object.keys(c.activeBuffs).forEach(function (bId) {
                            var buff = c.activeBuffs[bId];
                            if (!buff || buff.turns <= 0) {
                                delete c.activeBuffs[bId];
                                return;
                            }

                            if (buff.effect && buff.effect.regenPct && c.currentHp > 0) {
                                var st = charSys.getDerivedStatsForChar(c);
                                var rHp = Math.floor(st.maxHp * buff.effect.regenPct);
                                var rMp = Math.floor(st.maxMp * buff.effect.regenPct);
                                charSys.restoreVitals(rHp, rMp, c);
                            }

                            buff.turns -= 1;
                            if (buff.turns <= 0) {
                                expiredNames.push(buff.name);
                                delete c.activeBuffs[bId];
                            }
                        });

                        if (expiredNames.length > 0) {
                            core.log('⏳ 【' + c.name + '】的丹藥狀態【' + expiredNames.join('、') + '】已滿 10 回合消散。', 'system');
                        }
                    }
                });
            }
        }

        togglePetExpedition(petId) {
            this.ensureState();
            var root = this.app.charSys.rootState;
            var Data = window.HY.Data;
            if (!root.pets || !root.pets[petId]) return false;

            root.petExpeditions[petId] = !root.petExpeditions[petId];
            var petName = Data.PETS[petId] ? Data.PETS[petId].name : '靈獸';
            if (root.petExpeditions[petId]) {
                this.app.logger.add('🗺️ 已派遣靈獸【' + petName + '】加入時空探險隊（每 3 分鐘自動收集一次狀態 Buff 丹藥）！', 'time');
            } else {
                this.app.logger.add('⛺ 已召回探險中的靈獸【' + petName + '】。', 'system');
            }
            return true;
        }

        getExpeditionPetList() {
            this.ensureState();
            var root = this.app.charSys.rootState;
            var Data = window.HY.Data;
            var list = [];
            Object.keys(root.pets || {}).forEach(function (petId) {
                if (root.pets[petId] > 0 && root.petExpeditions[petId] && Data.PETS[petId]) {
                    list.push({
                        id: petId,
                        name: Data.PETS[petId].name,
                        lv: root.pets[petId]
                    });
                }
            });
            return list;
        }

        startExpeditionTicker() {
            var self = this;
            if (this.timer) clearInterval(this.timer);

            this.timer = setInterval(function () {
                var activePets = self.getExpeditionPetList();
                var root = self.app.charSys.rootState;
                if (activePets.length === 0 && root.pets) {
                    Object.keys(root.pets).forEach(function (pId) {
                        if (root.pets[pId] > 0 && root.petExpeditions[pId] === undefined) {
                            root.petExpeditions[pId] = true;
                        }
                    });
                    activePets = self.getExpeditionPetList();
                }

                if (activePets.length === 0) return;

                self.expeditionRemaining -= 1;
                if (self.expeditionRemaining <= 0) {
                    self.expeditionRemaining = self.EXPEDITION_DURATION;
                    self.completeExpeditionCycle(activePets);
                    self.app.renderAll();
                } else if (window.HY.uiSalvageExp) {
                    window.HY.uiSalvageExp.updateTimerTextOnly();
                }
            }, 1000);
        }

        completeExpeditionCycle(activePets) {
            var invSys = this.app.inventorySys;
            var Data = window.HY.Data;
            var self = this;

            var buffPillPool = [
                'pill_buff_atk', 'pill_buff_def', 'pill_buff_crit',
                'pill_buff_eva', 'pill_buff_regen', 'pill_buff_all',
                'pill_hp', 'pill_major'
            ];

            activePets.forEach(function (pet) {
                var pickedPillId = buffPillPool[Math.floor(Math.random() * buffPillPool.length)];
                if (Data.ITEMS[pickedPillId]) {
                    invSys.addItem(pickedPillId, 1);
                    self.app.logger.add('🎁 掉落物品：【' + Data.ITEMS[pickedPillId].name + '】x1', 'loot');
                }

                if (Math.random() * 100 < 0.1) {
                    invSys.addItem('pill_wash_root', 1);
                    self.app.logger.add('🌟 掉落物品：【🌈 太虛洗靈丹 (0.1%奇珍)】x1', 'loot');
                }
            });
        }
    }

    window.HY.SalvageExpeditionSystem = SalvageExpeditionSystem;
})();