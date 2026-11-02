// js/poeCraftSystem.js  (v42)
// PoE 裝備實體生成、掉落控制、10 大通貨工藝打造系統
//
// v42 修正（收尾整理）：
//   ⭐ MAX_BAG_SIZE 改讀 GameConfig.loot.maxBagSize（與 equipmentSystem 同源）
//      —— 原本兩處各自硬寫 60，改一處會導致行囊「卡在 61 件」
window.HY = window.HY || {};

(function () {
    var DEFAULT_MAX_BAG_SIZE = 60;

    var ENG_SUBNAME_RE = /\s*[（(][A-Za-z][^）)]*[）)]/g;

    function stripEnglishSubname(name) {
        if (typeof name !== 'string' || name.length === 0) return name;
        if (!/[（(][A-Za-z]/.test(name)) return name;
        return name.replace(ENG_SUBNAME_RE, '').trim();
    }

    function readMaxBagSize() {
        var G = window.HY && window.HY.GameConfig;
        if (G && G.loot && typeof G.loot.maxBagSize === 'number' && G.loot.maxBagSize > 0) {
            return G.loot.maxBagSize;
        }
        return DEFAULT_MAX_BAG_SIZE;
    }

    class PoeCraftSystem {
        constructor(charSys, logger) {
            this.charSys = charSys;
            this.logger = logger;
            this.selectedTargetUid = null;
            this._nameMigrationDone = false;
        }

        ensureState() {
            var root = this.charSys.rootState;
            var Data = window.HY.Data;

            if (!root.currencies) {
                root.currencies = {
                    orb_transmute: 10,
                    orb_aug: 10,
                    orb_alt: 15,
                    orb_regal: 5,
                    orb_alch: 5,
                    orb_chaos: 8,
                    orb_exalt: 3,
                    orb_divine: 3,
                    orb_scour: 8,
                    orb_vaal: 2
                };
            }

            if (!Array.isArray(root.equipBag)) {
                root.equipBag = [];
                var starterSword = this.generateItemInstanceByBaseId('b_mh_1', 'normal');
                var starterArmor = this.generateItemInstanceByBaseId('b_bd_1', 'normal');
                if (starterSword) root.equipBag.push(starterSword);
                if (starterArmor) root.equipBag.push(starterArmor);
            }

            var slots = (Data && Data.EQUIP_SLOTS) ? Object.keys(Data.EQUIP_SLOTS) : [
                'mainhand', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring_left', 'ring_right'
            ];

            (root.roster || []).forEach(function (charObj) {
                if (!charObj.equipment) charObj.equipment = {};
                slots.forEach(function (slot) {
                    if (typeof charObj.equipment[slot] === 'string' || charObj.equipment[slot] === undefined) {
                        charObj.equipment[slot] = null;
                    }
                });
            });

            this._migrateLegacyNames();
        }

        _migrateLegacyNames() {
            if (this._nameMigrationDone) return;
            this._nameMigrationDone = true;

            var root = this.charSys.rootState;
            var fixedCount = 0;

            function fixItem(it) {
                if (!it || typeof it !== 'object') return;
                if (it.__v41NameFixed) return;

                var before = it.name;
                it.name = stripEnglishSubname(before);
                if (it.name !== before) fixedCount += 1;

                Object.defineProperty(it, '__v41NameFixed', {
                    value: true, enumerable: false, configurable: true, writable: true
                });
            }

            (root.equipBag || []).forEach(fixItem);

            (root.roster || []).forEach(function (c) {
                if (!c || !c.equipment) return;
                Object.keys(c.equipment).forEach(function (slot) {
                    fixItem(c.equipment[slot]);
                });
            });

            if (fixedCount > 0) {
                console.log('[HY] 已清理 ' + fixedCount + ' 件舊存檔裝備的英文副名。');
            }
        }

        addCurrency(orbId, count) {
            this.ensureState();
            var c = count || 1;
            var wallet = this.charSys.rootState.currencies;
            wallet[orbId] = (wallet[orbId] || 0) + c;
        }

        rollCurrencyDropByEnemy(enemy) {
            var Data = window.HY.Data;
            if (!Data || !Data.CURRENCIES) return null;

            var rarity = (enemy && enemy.rarity) || 'normal';
            var lootMult = (enemy && enemy.lootMult) || 1.0;
            var baseChance = rarity === 'rare' ? 2.75 : (rarity === 'magic' ? 1.4 : 0.6);
            var dropChance = baseChance * lootMult;

            if (Math.random() * 100 > dropChance) return null;

            var orbs = Object.values(Data.CURRENCIES);
            var totalWeight = 0;
            var weightedList = orbs.map(function (orb) {
                var w = orb.dropWeight || 10;
                if (rarity === 'rare' && w <= 30) {
                    w = Math.floor(w * 2.5);
                }
                totalWeight += w;
                return { orb: orb, weight: w };
            });

            var roll = Math.random() * totalWeight;
            var acc = 0;
            for (var i = 0; i < weightedList.length; i++) {
                acc += weightedList[i].weight;
                if (roll <= acc) {
                    var picked = weightedList[i].orb;
                    this.addCurrency(picked.id, 1);
                    return picked;
                }
            }
            return null;
        }

        rollEquipmentDropByEnemy(enemy) {
            this.ensureState();
            var Data = window.HY.Data;
            if (!Data || !Data.POE_BASES) return null;

            var enemyRarity = (enemy && enemy.rarity) || 'normal';
            var lootMult = (enemy && enemy.lootMult) || 1.0;
            var baseChance = (enemyRarity === 'rare' ? 2.75 : (enemyRarity === 'magic' ? 1.5 : 0.7)) / 6;
            var dropChance = baseChance * lootMult;

            if (Math.random() * 100 > dropChance) return null;

            var enemyLv = (enemy && enemy.lv) || 1;
            var rRoll = Math.random() * 100;
            if (enemyRarity === 'rare') rRoll += 15;

            if (rRoll >= 97 && Data.POE_UNIQUES && Data.POE_UNIQUES.length > 0) {
                var validUniques = Data.POE_UNIQUES.filter(function (u) {
                    return (u.reqLv || 1) <= enemyLv + 15;
                });
                if (validUniques.length > 0) {
                    var uTpl = validUniques[Math.floor(Math.random() * validUniques.length)];
                    var uInst = this.createUniqueInstance(uTpl);
                    this.addEquipToBag(uInst);
                    return uInst;
                }
            }

            var itemRarity = rRoll >= 82 ? 'rare' : (rRoll >= 52 ? 'magic' : 'normal');
            var validBases = Data.POE_BASES.filter(function (b) {
                return (b.reqLv || 1) <= enemyLv + 12;
            });
            if (validBases.length === 0) validBases = [Data.POE_BASES[0]];

            validBases.sort(function (a, b) { return (b.reqLv || 1) - (a.reqLv || 1); });
            var topBases = validBases.slice(0, Math.min(8, validBases.length));
            var pickedBase = topBases[Math.floor(Math.random() * topBases.length)];

            var newItem = this.generateItemInstanceByBaseId(pickedBase.id, itemRarity);
            if (newItem) {
                this.addEquipToBag(newItem);
            }
            return newItem;
        }

        addEquipToBag(itemInst) {
            this.ensureState();
            var bag = this.charSys.rootState.equipBag;
            var maxSize = readMaxBagSize();   // ⭐ v42：與 equipmentSystem 同源

            if (bag.length >= maxSize) {
                // 註：行囊在 renderInventoryTab 時已被 uiInventorySorter 依
                //     「稀有度 → 詞綴數 → 等級」降序排列，故 shift() 取到的是「最弱」而非「最舊」。
                var weakest = bag.shift();
                if (weakest) {
                    var rMult = weakest.rarity === 'unique' ? 3 : (weakest.rarity === 'rare' ? 2 : (weakest.rarity === 'magic' ? 1.4 : 1));
                    var salvageGold = Math.max(10, Math.floor((weakest.price || 50) * 0.5 * rMult));
                    this.charSys.rootState.gold += salvageGold;
                    if (this.logger && typeof this.logger.add === 'function') {
                        this.logger.add('📦 行囊已滿（' + maxSize + '件）！自動典當行囊中最弱裝備【' + (weakest.rareTitle || '') + weakest.name + '】，獲得 ' + salvageGold + ' 兩紋銀。', 'wealth');
                    }
                }
            }

            bag.push(itemInst);
            if (!this.selectedTargetUid) {
                this.selectedTargetUid = itemInst.uid;
            }
        }

        createUniqueInstance(uTpl) {
            return {
                uid: 'eq_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
                baseId: uTpl.id,
                name: stripEnglishSubname(uTpl.name),
                slotType: uTpl.slotType,
                reqLv: uTpl.reqLv || 1,
                price: uTpl.price || 2000,
                rarity: 'unique',
                rareTitle: '',
                baseStats: Object.assign({}, uTpl.baseStats),
                implicit: uTpl.implicit ? Object.assign({}, uTpl.implicit) : null,
                prefixes: [],
                suffixes: [],
                uniqueMods: (uTpl.uniqueMods || []).map(function (m) { return Object.assign({}, m); }),
                corrupted: false
            };
        }

        generateItemInstanceByBaseId(baseId, rarity) {
            var Data = window.HY.Data;
            var baseTpl = (Data.POE_BASES || []).find(function (b) { return b.id === baseId; });
            if (!baseTpl) return null;

            var inst = {
                uid: 'eq_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
                baseId: baseTpl.id,
                name: stripEnglishSubname(baseTpl.name),
                slotType: baseTpl.slotType,
                reqLv: baseTpl.reqLv || 1,
                price: baseTpl.price || 100,
                rarity: 'normal',
                rareTitle: '',
                baseStats: Object.assign({}, baseTpl.baseStats),
                implicit: baseTpl.implicit ? Object.assign({}, baseTpl.implicit) : null,
                prefixes: [],
                suffixes: [],
                uniqueMods: [],
                corrupted: false
            };

            if (rarity === 'magic') {
                this.rollMagicMods(inst);
            } else if (rarity === 'rare') {
                inst.rareTitle = this.generateRareTitle();
                this.rollRareMods(inst);
            }
            return inst;
        }

        generateRareTitle() {
            var Data = window.HY.Data;
            var p = Data.POE_RARE_NAME_PREFIX || ['天魔'];
            var s = Data.POE_RARE_NAME_SUFFIX || ['裁決'];
            return '【' + p[Math.floor(Math.random() * p.length)] + '・' + s[Math.floor(Math.random() * s.length)] + '】';
        }

        rollOneAffix(pool, existingList) {
            var usedGroups = existingList.map(function (m) { return m.groupId; });
            var candidates = pool.filter(function (g) {
                return usedGroups.indexOf(g.groupId) === -1;
            });
            if (candidates.length === 0) return null;

            var chosenGroup = candidates[Math.floor(Math.random() * candidates.length)];
            var weights = [35, 28, 20, 12, 5];
            var r = Math.random() * 100;
            var acc = 0;
            var tierIdx = 0;
            for (var i = 0; i < weights.length; i++) {
                acc += weights[i];
                if (r <= acc) {
                    tierIdx = i;
                    break;
                }
            }
            var tierObj = chosenGroup.tiers[tierIdx] || chosenGroup.tiers[0];
            var rolledVal = tierObj.min + Math.floor(Math.random() * (tierObj.max - tierObj.min + 1));

            return {
                groupId: chosenGroup.groupId,
                statKey: chosenGroup.statKey,
                label: chosenGroup.label,
                unit: chosenGroup.unit || '',
                tier: tierObj.tier,
                tName: tierObj.tName,
                min: tierObj.min,
                max: tierObj.max,
                val: rolledVal
            };
        }

        rollMagicMods(itemInst) {
            var Data = window.HY.Data;
            itemInst.rarity = 'magic';
            itemInst.rareTitle = '';
            itemInst.prefixes = [];
            itemInst.suffixes = [];

            var rollType = Math.random();
            if (rollType < 0.35) {
                var p = this.rollOneAffix(Data.POE_PREFIXES, itemInst.prefixes);
                if (p) itemInst.prefixes.push(p);
            } else if (rollType < 0.70) {
                var s = this.rollOneAffix(Data.POE_SUFFIXES, itemInst.suffixes);
                if (s) itemInst.suffixes.push(s);
            } else {
                var p2 = this.rollOneAffix(Data.POE_PREFIXES, itemInst.prefixes);
                var s2 = this.rollOneAffix(Data.POE_SUFFIXES, itemInst.suffixes);
                if (p2) itemInst.prefixes.push(p2);
                if (s2) itemInst.suffixes.push(s2);
            }
        }

        rollRareMods(itemInst) {
            var Data = window.HY.Data;
            itemInst.rarity = 'rare';
            if (!itemInst.rareTitle) {
                itemInst.rareTitle = this.generateRareTitle();
            }
            itemInst.prefixes = [];
            itemInst.suffixes = [];

            var r = Math.random() * 100;
            var totalCount = r < 50 ? 4 : (r < 85 ? 5 : 6);

            while ((itemInst.prefixes.length + itemInst.suffixes.length) < totalCount) {
                var canPrefix = itemInst.prefixes.length < 3;
                var canSuffix = itemInst.suffixes.length < 3;
                if (!canPrefix && !canSuffix) break;

                var pickPrefix = canPrefix && (!canSuffix || Math.random() < 0.5);
                if (pickPrefix) {
                    var p = this.rollOneAffix(Data.POE_PREFIXES, itemInst.prefixes);
                    if (p) itemInst.prefixes.push(p);
                } else {
                    var s = this.rollOneAffix(Data.POE_SUFFIXES, itemInst.suffixes);
                    if (s) itemInst.suffixes.push(s);
                }
            }
        }

        findItemByUid(uid) {
            this.ensureState();
            if (!uid) return null;
            var st = this.charSys.state;
            var slots = Object.keys(st.equipment || {});
            for (var i = 0; i < slots.length; i++) {
                var eq = st.equipment[slots[i]];
                if (eq && eq.uid === uid) return eq;
            }
            var bag = this.charSys.rootState.equipBag || [];
            for (var j = 0; j < bag.length; j++) {
                if (bag[j] && bag[j].uid === uid) return bag[j];
            }
            return null;
        }

        getSelectedCraftItem() {
            var found = this.findItemByUid(this.selectedTargetUid);
            if (found) return found;
            var st = this.charSys.state;
            var slots = Object.keys(st.equipment || {});
            for (var i = 0; i < slots.length; i++) {
                if (st.equipment[slots[i]]) {
                    this.selectedTargetUid = st.equipment[slots[i]].uid;
                    return st.equipment[slots[i]];
                }
            }
            var bag = this.charSys.rootState.equipBag || [];
            if (bag.length > 0) {
                this.selectedTargetUid = bag[0].uid;
                return bag[0];
            }
            return null;
        }

        applyCurrencyToSelected(orbId) {
            this.ensureState();
            var Data = window.HY.Data;
            var orb = Data.CURRENCIES && Data.CURRENCIES[orbId];
            if (!orb) return false;

            var targetItem = this.getSelectedCraftItem();
            if (!targetItem) {
                this.logger.add('⚠️ 請先在裝備欄或行囊中點選「💎 改造」指定一件裝備！', 'system');
                return false;
            }

            var wallet = this.charSys.rootState.currencies;
            if (!wallet[orbId] || wallet[orbId] <= 0) {
                this.logger.add('❌ 通貨不足！你沒有【' + orb.name + '】。', 'system');
                return false;
            }

            if (targetItem.corrupted) {
                this.logger.add('🚫 無法改造！【' + targetItem.name + '】處於【已汙染 (Corrupted)】狀態！', 'system');
                return false;
            }

            if (targetItem.rarity === 'unique' && orbId !== 'orb_vaal') {
                this.logger.add('🚫 傳奇暗金裝備【' + targetItem.name + '】詞綴固定，只能使用【瓦爾寶珠】進行腐化！', 'system');
                return false;
            }

            switch (orbId) {
                case 'orb_scour':
                    if (targetItem.rarity === 'normal') {
                        this.logger.add('⚠️ 該裝備已經是普通(白裝)狀態！', 'system');
                        return false;
                    }
                    wallet[orbId] -= 1;
                    targetItem.rarity = 'normal';
                    targetItem.rareTitle = '';
                    targetItem.prefixes = [];
                    targetItem.suffixes = [];
                    this.logger.add('⚪ 使用【重鑄石】：已抹除【' + targetItem.name + '】所有下詞綴，還原為普通(白裝)。', 'system');
                    break;

                case 'orb_transmute':
                    if (targetItem.rarity !== 'normal') {
                        this.logger.add('⚠️ 【蛻變石】只能對【普通(白裝)】使用！', 'system');
                        return false;
                    }
                    wallet[orbId] -= 1;
                    this.rollMagicMods(targetItem);
                    this.logger.add('🔵 使用【蛻變石】：【' + targetItem.name + '】升級為魔法藍裝！', 'combat');
                    break;

                case 'orb_alt':
                    if (targetItem.rarity !== 'magic') {
                        this.logger.add('⚠️ 【改造石】只能對【魔法(藍裝)】使用！', 'system');
                        return false;
                    }
                    wallet[orbId] -= 1;
                    this.rollMagicMods(targetItem);
                    this.logger.add('🔵 使用【改造石】：已重新骰出【' + targetItem.name + '】的魔法詞綴！', 'combat');
                    break;

                case 'orb_aug':
                    if (targetItem.rarity !== 'magic') {
                        this.logger.add('⚠️ 【增幅石】只能對【魔法(藍裝)】使用！', 'system');
                        return false;
                    }
                    if (targetItem.prefixes.length >= 1 && targetItem.suffixes.length >= 1) {
                        this.logger.add('⚠️ 該魔法裝備已滿 1前綴 + 1後綴！', 'system');
                        return false;
                    }
                    wallet[orbId] -= 1;
                    if (targetItem.prefixes.length === 0) {
                        var newP = this.rollOneAffix(Data.POE_PREFIXES, targetItem.prefixes);
                        if (newP) targetItem.prefixes.push(newP);
                    } else {
                        var newS = this.rollOneAffix(Data.POE_SUFFIXES, targetItem.suffixes);
                        if (newS) targetItem.suffixes.push(newS);
                    }
                    this.logger.add('🔵 使用【增幅石】：成功為【' + targetItem.name + '】增幅出 1 條新詞綴！', 'combat');
                    break;

                case 'orb_regal':
                    if (targetItem.rarity !== 'magic') {
                        this.logger.add('⚠️ 【富豪石】只能對【魔法(藍裝)】使用！', 'system');
                        return false;
                    }
                    wallet[orbId] -= 1;
                    targetItem.rarity = 'rare';
                    targetItem.rareTitle = this.generateRareTitle();
                    if (Math.random() < 0.5) {
                        var rp = this.rollOneAffix(Data.POE_PREFIXES, targetItem.prefixes);
                        if (rp) targetItem.prefixes.push(rp);
                    } else {
                        var rs = this.rollOneAffix(Data.POE_SUFFIXES, targetItem.suffixes);
                        if (rs) targetItem.suffixes.push(rs);
                    }
                    this.logger.add('🟡 使用【富豪石】：【' + targetItem.name + '】晉升為稀有黃裝 ' + targetItem.rareTitle + '！', 'combat');
                    break;

                case 'orb_alch':
                    if (targetItem.rarity !== 'normal') {
                        this.logger.add('⚠️ 【點金石】只能對【普通(白裝)】使用！', 'system');
                        return false;
                    }
                    wallet[orbId] -= 1;
                    targetItem.rareTitle = this.generateRareTitle();
                    this.rollRareMods(targetItem);
                    this.logger.add('🟡 使用【點金石】：【' + targetItem.name + '】點化為稀有黃裝 ' + targetItem.rareTitle + '！', 'combat');
                    break;

                case 'orb_chaos':
                    if (targetItem.rarity !== 'rare') {
                        this.logger.add('⚠️ 【混沌石】只能對【稀有(黃裝)】使用！', 'system');
                        return false;
                    }
                    wallet[orbId] -= 1;
                    targetItem.rareTitle = this.generateRareTitle();
                    this.rollRareMods(targetItem);
                    this.logger.add('🟡 使用【混沌石】：已重骰【' + targetItem.name + '】的所有前後綴！', 'combat');
                    break;

                case 'orb_exalt':
                    if (targetItem.rarity !== 'rare') {
                        this.logger.add('⚠️ 【崇高石】只能對【稀有(黃裝)】使用！', 'system');
                        return false;
                    }
                    var canP = targetItem.prefixes.length < 3;
                    var canS = targetItem.suffixes.length < 3;
                    if (!canP && !canS) {
                        this.logger.add('⚠️ 該稀有裝備已達 6 詞綴上限（3前+3後）！', 'system');
                        return false;
                    }
                    wallet[orbId] -= 1;
                    var pickP = canP && (!canS || Math.random() < 0.5);
                    var exMod = pickP
                        ? this.rollOneAffix(Data.POE_PREFIXES, targetItem.prefixes)
                        : this.rollOneAffix(Data.POE_SUFFIXES, targetItem.suffixes);
                    if (exMod) {
                        if (pickP) targetItem.prefixes.push(exMod);
                        else targetItem.suffixes.push(exMod);
                        this.logger.add('🌟 使用【崇高石 (Ex)】：新增詞綴「' + exMod.tName + ' ' + exMod.label + ' +' + exMod.val + exMod.unit + '」！', 'combat');
                    }
                    break;

                case 'orb_divine':
                    if (targetItem.prefixes.length === 0 && targetItem.suffixes.length === 0) {
                        this.logger.add('⚠️ 該裝備沒有可重骰數值的隨機詞綴！', 'system');
                        return false;
                    }
                    wallet[orbId] -= 1;
                    targetItem.prefixes.forEach(function (m) {
                        m.val = m.min + Math.floor(Math.random() * (m.max - m.min + 1));
                    });
                    targetItem.suffixes.forEach(function (m) {
                        m.val = m.min + Math.floor(Math.random() * (m.max - m.min + 1));
                    });
                    this.logger.add('🔮 使用【神聖石 (Div)】：已重新隨機洗煉所有詞綴的數值高低！', 'combat');
                    break;

                case 'orb_vaal':
                    wallet[orbId] -= 1;
                    targetItem.corrupted = true;
                    var isUnique = (targetItem.rarity === 'unique');
                    var vRoll = Math.random() * 100;

                    if (vRoll < 50) {
                        var vPool = Data.VAAL_IMPLICITS;
                        var vPicked = vPool[Math.floor(Math.random() * vPool.length)];
                        if (isUnique) {
                            if (!targetItem.uniqueMods) targetItem.uniqueMods = [];
                            targetItem.uniqueMods.push({
                                statKey: vPicked.statKey,
                                val: vPicked.val,
                                text: vPicked.text
                            });
                            this.logger.add('🩸 瓦爾腐化！【' + targetItem.name + '】在保留招牌基底的前提下，額外獲得：「' + vPicked.text + '」！(已汙染)', 'combat');
                        } else {
                            targetItem.implicit = Object.assign({}, vPicked);
                            this.logger.add('🩸 瓦爾腐化大成功！【' + targetItem.name + '】上詞綴突變為：「' + vPicked.text + '」！(已汙染)', 'combat');
                        }
                    } else if (vRoll < 85) {
                        var boosted = false;
                        targetItem.prefixes.forEach(function (m) { m.val = Math.floor(m.max * 1.25); boosted = true; });
                        targetItem.suffixes.forEach(function (m) { m.val = Math.floor(m.max * 1.25); boosted = true; });
                        if (isUnique && targetItem.uniqueMods) {
                            targetItem.uniqueMods.forEach(function (u) { u.val = Math.floor(u.val * 1.25); boosted = true; });
                        }
                        if (boosted) {
                            this.logger.add('🩸 瓦爾異變！【' + targetItem.name + '】所有詞綴突破上限至 125%！(已汙染)', 'combat');
                        } else {
                            this.logger.add('🩸 瓦爾異變！【' + targetItem.name + '】表面泛起血光，卻無詞綴可增幅…(已汙染)', 'combat');
                        }
                    } else {
                        if (isUnique) {
                            targetItem.uniqueMods = [];
                            this.logger.add('🩸 瓦爾磚化！【' + targetItem.name + '】的傳奇之力被腐化吞蝕…', 'combat');
                        }
                        targetItem.rareTitle = '【瓦爾・磚化】';
                        this.rollRareMods(targetItem);
                        this.logger.add('🩸 瓦爾磚化！【' + targetItem.name + '】被腐化重組為隨機黃裝！(已汙染)', 'combat');
                    }
                    break;
            }

            this.charSys.clampVitals();
            return true;
        }

        getItemTotalBonus(itemInst) {
            var total = { atk: 0, def: 0, maxHp: 0, maxMp: 0, hit: 0, eva: 0, crit: 0, critRes: 0 };
            if (!itemInst) return total;

            var bs = itemInst.baseStats || {};
            Object.keys(bs).forEach(function (k) {
                if (total[k] !== undefined) total[k] += Math.floor(bs[k]);
            });

            if (itemInst.implicit && total[itemInst.implicit.statKey] !== undefined) {
                total[itemInst.implicit.statKey] += itemInst.implicit.val;
            }
            (itemInst.prefixes || []).forEach(function (p) {
                if (total[p.statKey] !== undefined) total[p.statKey] += p.val;
            });
            (itemInst.suffixes || []).forEach(function (s) {
                if (total[s.statKey] !== undefined) total[s.statKey] += s.val;
            });
            (itemInst.uniqueMods || []).forEach(function (u) {
                if (total[u.statKey] !== undefined) total[u.statKey] += u.val;
            });

            return total;
        }

        getTotalCraftBonusForChar() {
            return { atk: 0, def: 0, maxHp: 0, maxMp: 0, hit: 0, eva: 0, crit: 0, critRes: 0 };
        }
    }

    window.HY.PoeCraftSystem = PoeCraftSystem;
})();