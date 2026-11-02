// js/dexteritySpeedSystem.js  (v34)
// 出手攻速：各系統加成，統一套用 ÷3
//
// v34 修正：
//   ⭐【移除】根骨（身法 agi × 1.25）對攻速的影響
//      → 攻速改為純粹由「武學／裝備／群俠／靈獸」決定
//      → 全新角色的攻速 = 100（原為 104）
//   ⭐ 後天來源全部保留：輕功身法、武道專精、靈根、裝備、群俠、靈獸
//   ⭐ 四維（體魄／力道／身法／內息）不再有任何一項影響攻速
window.HY = window.HY || {};

(function () {
    var MARTIAL_DIV = 4;
    var MASTERY_DIV = 5;

    class DexteritySpeedSystem {
        constructor(app) {
            this.app = app;
            this.integrateIntoStaticData();
            this.hookCharacterSystem();
        }

        // ══════════════════════════════════════════════════════════════
        //  靜態資料注入（詞綴池、基底裝備、靈獸、群俠的攻速欄位）
        // ══════════════════════════════════════════════════════════════
        integrateIntoStaticData() {
            var Data = window.HY.Data;
            if (!Data) return;

            // ① 攻速後綴（若不存在則注入）
            if (Array.isArray(Data.POE_SUFFIXES)) {
                var existing = Data.POE_SUFFIXES.find(function (s) { return s.groupId === 'suffix_atkspd'; });
                var reducedTiers = [
                    { tier: 5, tName: 'T5 迅捷之', min: 1,  max: 2 },
                    { tier: 4, tName: 'T4 疾風之', min: 3,  max: 4 },
                    { tier: 3, tName: 'T3 閃電之', min: 5,  max: 6 },
                    { tier: 2, tName: 'T2 流光之', min: 7,  max: 9 },
                    { tier: 1, tName: 'T1 瞬息破空之', min: 10, max: 15 }
                ];
                if (existing) {
                    existing.tiers = reducedTiers;
                } else {
                    Data.POE_SUFFIXES.push({
                        groupId: 'suffix_atkspd', statKey: 'atkSpd', label: '出手攻速', unit: '',
                        tiers: reducedTiers
                    });
                }
            }

            // ② 裝備基底攻速（靴子／手套／主手）
            if (Array.isArray(Data.POE_BASES)) {
                Data.POE_BASES.forEach(function (b) {
                    if (!b.baseStats) b.baseStats = {};
                    if (b.slotType === 'boots' || b.slotType === 'gloves' || b.slotType === 'mainhand') {
                        if (b.baseStats.atkSpd === undefined) {
                            b.baseStats.atkSpd = Math.max(1, Math.floor((8 + (b.reqLv || 1) * 0.35) / 6));
                        }
                    }
                });
            }

            // ③ 輕功身法攻速欄位
            if (Array.isArray(Data.QINGGONG)) {
                Data.QINGGONG.forEach(function (qg) {
                    if (!qg.bonus) qg.bonus = {};
                    if (qg.bonus.atkSpd === undefined) qg.bonus.atkSpd = 0;
                });
            }

            // ④ 靈獸攻速
            if (Data.PETS) {
                Object.values(Data.PETS).forEach(function (pet) {
                    if (!pet.bonus) pet.bonus = {};
                    if (pet.bonus.atkSpd === undefined) {
                        pet.bonus.atkSpd = Math.max(1, Math.floor((8 + (pet.reqLv || 1) * 0.25) / 6));
                    }
                });
            }

            // ⑤ 群俠攻速
            if (Data.COMPANIONS) {
                Object.values(Data.COMPANIONS).forEach(function (comp) {
                    if (!comp.passive) comp.passive = {};
                    if (comp.passive.atkSpd === undefined) {
                        comp.passive.atkSpd = Math.max(1, Math.floor((6 + (comp.reqLv || 1) * 0.2) / 6));
                    }
                });
            }
        }

        // ══════════════════════════════════════════════════════════════
        //  掛鉤角色系統
        // ══════════════════════════════════════════════════════════════
        hookCharacterSystem() {
            var charSys = this.app.charSys;
            var equipSys = this.app.equipSys;
            var poeSys = this.app.poeSys;
            var self = this;

            // 清除舊存檔的 dex 殘留
            this.purgeDexRemnants();

            // ① 包裝 poeSys.getItemTotalBonus（補上 atkSpd 欄位）
            if (poeSys) {
                var origGetItemTotal = poeSys.getItemTotalBonus.bind(poeSys);
                poeSys.getItemTotalBonus = function (itemInst) {
                    var total = origGetItemTotal(itemInst);
                    total.atkSpd = 0;
                    if (!itemInst) return total;
                    if (itemInst.baseStats && itemInst.baseStats.atkSpd) {
                        total.atkSpd += Math.floor(itemInst.baseStats.atkSpd);
                    }
                    if (itemInst.implicit && itemInst.implicit.statKey === 'atkSpd') {
                        total.atkSpd += Math.max(1, Math.floor(itemInst.implicit.val / 3));
                    }
                    (itemInst.prefixes || []).forEach(function (p) {
                        if (p.statKey === 'atkSpd') total.atkSpd += p.val;
                    });
                    (itemInst.suffixes || []).forEach(function (s) {
                        if (s.statKey === 'atkSpd') total.atkSpd += s.val;
                    });
                    (itemInst.uniqueMods || []).forEach(function (u) {
                        if (u.statKey === 'atkSpd') total.atkSpd += u.val;
                    });
                    return total;
                };
            }

            // ② 包裝 equipSys.getTotalEquipmentBonusForChar（聚合十個槽位的攻速）
            if (equipSys) {
                var origGetTotalEq = equipSys.getTotalEquipmentBonusForChar.bind(equipSys);
                equipSys.getTotalEquipmentBonusForChar = function (charObj) {
                    var total = origGetTotalEq(charObj);
                    total.atkSpd = 0;
                    var c = charObj || charSys.state;
                    if (!c || !c.equipment || !poeSys) return total;
                    Object.keys(equipSys.SLOTS).forEach(function (slot) {
                        var itemInst = c.equipment[slot];
                        if (itemInst && typeof itemInst === 'object') {
                            var b = poeSys.getItemTotalBonus(itemInst);
                            total.atkSpd += (b.atkSpd || 0);
                        }
                    });
                    return total;
                };

                // ③ 裝備說明補上「攻速+」
                var origFormatBonus = equipSys.formatBonusText.bind(equipSys);
                equipSys.formatBonusText = function (bonus) {
                    var baseStr = origFormatBonus(bonus);
                    if (bonus && bonus.atkSpd) {
                        if (baseStr === '無特殊加成' || baseStr === '基礎白板') return '攻速+' + bonus.atkSpd;
                        return baseStr + '、攻速+' + bonus.atkSpd;
                    }
                    return baseStr;
                };
            }

            // ④ ⭐ 核心：包裝 getDerivedStatsForChar，計算出手攻速
            var origGetDerived = charSys.getDerivedStatsForChar.bind(charSys);
            charSys.getDerivedStatsForChar = function (charObj) {
                var c = charObj || charSys.state;
                var d = origGetDerived(c);
                var Data = window.HY.Data;

                // ══════════════════════════════════════════════════════════
                //  ⭐ v34：根基歸零 —— 根骨不再提供攻速
                //
                //  原本：var rawBonusSpd = agi * 1.25;
                //  現在：從 0 起始，只累加「後天來源」
                // ══════════════════════════════════════════════════════════
                var rawBonusSpd = 0;

                // ── 輕功身法 atkSpd（門派過濾 + 常駐 ×1.3 + ÷4）──
                if (c && c.qinggong && Data.QINGGONG) {
                    Data.QINGGONG.forEach(function (qg) {
                        var lv = c.qinggong[qg.id] || 0;
                        if (lv <= 0) return;
                        if (qg.sectReq && qg.sectReq !== c.sect) return;
                        if (qg.bonus && qg.bonus.atkSpd) {
                            var mult = (c.activeQinggong === qg.id) ? lv * 1.3 : lv;
                            rawBonusSpd += (qg.bonus.atkSpd * mult) / MARTIAL_DIV;
                        }
                    });
                }

                // ── 武道專精 atkSpd（÷5）──
                if (c && c.qinggong && Data.MASTERY) {
                    Data.MASTERY.forEach(function (ms) {
                        var lv = c.qinggong[ms.id] || 0;
                        if (lv > 0 && ms.bonus && ms.bonus.atkSpd) {
                            rawBonusSpd += (ms.bonus.atkSpd * lv) / MASTERY_DIV;
                        }
                    });
                }

                // ── 本命靈根攻速 ──
                if (c && c.spiritRoot && Data.SPIRIT_ROOTS && Data.SPIRIT_ROOTS[c.spiritRoot]) {
                    var sr = Data.SPIRIT_ROOTS[c.spiritRoot];
                    var rLv = c.spiritRootLv || 1;
                    if (sr.passiveBonus && sr.passiveBonus.atkSpd) {
                        rawBonusSpd += sr.passiveBonus.atkSpd * rLv;
                    }
                }

                // ── 裝備攻速 ──
                if (equipSys) {
                    var eqB = equipSys.getTotalEquipmentBonusForChar(c);
                    rawBonusSpd += (eqB.atkSpd || 0);
                }

                // ── 群俠攻速 ──
                var activeCompId = charSys.rootState.activeCompanion;
                if (activeCompId && Data.COMPANIONS && Data.COMPANIONS[activeCompId]) {
                    var comp = Data.COMPANIONS[activeCompId];
                    var cLv = (charSys.rootState.companions && charSys.rootState.companions[activeCompId]) || 1;
                    if (comp.passive && comp.passive.atkSpd) {
                        rawBonusSpd += Math.floor(comp.passive.atkSpd * (1 + (cLv - 1) * 0.15));
                    }
                }

                // ── 靈獸攻速 ──
                if (self.app.petSys) {
                    var petInfo = self.app.petSys.getActivePetInfo();
                    if (petInfo && petInfo.bonus && petInfo.bonus.atkSpd) {
                        rawBonusSpd += petInfo.bonus.atkSpd;
                    }
                }

                // ── 最終：基礎 100 + 後天加成 ÷3 ──
                var atkSpd = Math.floor(100 + rawBonusSpd / 3);
                d.atkSpd = atkSpd;
                return d;
            };
        }

        // 清除所有角色 stats 中的 dex（舊存檔相容）
        purgeDexRemnants() {
            var root = this.app.charSys && this.app.charSys.rootState;
            if (!root || !Array.isArray(root.roster)) return;
            var cleaned = 0;
            root.roster.forEach(function (c) {
                if (c && c.stats && Object.prototype.hasOwnProperty.call(c.stats, 'dex')) {
                    delete c.stats.dex;
                    cleaned += 1;
                }
            });
            if (cleaned > 0) {
                console.log('[dexSys] ✓ 已清除 ' + cleaned + ' 位角色存檔的靈敏 (dex) 欄位');
            }
        }

        // ══════════════════════════════════════════════════════════════
        //  敵人攻速（不受本次改動影響）
        // ══════════════════════════════════════════════════════════════
        getEnemyAtkSpd(enemy) {
            if (!enemy) return 100;
            var rawBonus = (enemy.lv || 1) * 0.6 + (enemy.eva || 0) * 0.25;
            var baseSpd = Math.floor(95 + rawBonus / 3);
            var affixSys = this.app.affixSys;
            if (affixSys && affixSys.hasProperty(enemy, 'extraAction')) {
                baseSpd = Math.floor(baseSpd * 1.12);
            }
            return baseSpd;
        }
    }

    window.HY.DexteritySpeedSystem = DexteritySpeedSystem;
    console.log('[dexSys] ✓ 已載入（v34，根骨不再影響攻速）');
})();