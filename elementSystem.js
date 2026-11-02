// js/elementSystem.js  (v53)
// 八元素計算引擎（唯一權威）
//
// v53 修正（元素體系去重）：
//   ⭐ 新增「基礎元素攻防」公式（原 spiritRootSystem 的獨立 addElemAtk/addElemDef）。
//      改為均分進入 element map，不再折入 d.atk / d.def。
//   ⭐ 新增「同隊相生共鳴」×1.18（原在 spiritRootSystem）
//   ⭐ 新增「丹藥 Buff 的 elemAtkPct / elemDefPct」（原在 salvageExpeditionSystem）
//   ⭐ _sig 納入 party 成員 id 與 activeBuffs 的 id 集合，確保快取正確失效
//   ⭐ 建立後補一次 renderAll
window.HY = window.HY || {};

(function () {
    function emptyMap() {
        var m = {};
        var D = window.HY.Data;
        ((D && D.ELEMENT_KEYS) || []).forEach(function (k) { m[k] = 0; });
        return m;
    }

    class ElementSystem {
        constructor(app) {
            this.app = app;
            this._cache = {};
            this._cacheSig = {};
            this.injectIntoEquipment();
            this.registerHooks();
        }

        keys() {
            var D = window.HY.Data;
            return (D && D.ELEMENT_KEYS) ? D.ELEMENT_KEYS : [];
        }

        meta(id) {
            var D = window.HY.Data;
            return (D && D.ELEMENTS && D.ELEMENTS[id]) ? D.ELEMENTS[id] : null;
        }

        rules() {
            var D = window.HY.Data;
            return (D && D.ELEMENT_RULES) ? D.ELEMENT_RULES : {
                counterMult: 1.35, resistedMult: 0.8, neutralMult: 1,
                defFactor: 0.65, minElemDamage: 1,
                enemyElemAtkRatio: 0.10, enemyElemDefRatio: 0.06,
                maxElemDamagePctOfMaxHp: 0.25,
                flatAtkBase: 20, flatAtkIntCoef: 2.2, flatAtkStrCoef: 1.0, flatAtkLvCoef: 3.0,
                flatDefBase: 15, flatDefConCoef: 1.6, flatDefIntCoef: 1.2, flatDefLvCoef: 2.0,
                flatAtkMult: 1.0
            };
        }

        emptyMap() { return emptyMap(); }

        sum(map) {
            if (!map) return 0;
            var t = 0;
            Object.keys(map).forEach(function (k) { t += (map[k] || 0); });
            return t;
        }

        mergeInto(target, src) {
            if (!src) return target;
            if (typeof src === 'number') {
                var keys = this.keys();
                var per = Math.floor(src / Math.max(1, keys.length));
                keys.forEach(function (k) { target[k] = (target[k] || 0) + per; });
                return target;
            }
            Object.keys(src).forEach(function (k) {
                if (target[k] === undefined) return;
                if (typeof src[k] === 'number') target[k] += src[k];
            });
            return target;
        }

        _scaleMap(map, mult) {
            if (!map || typeof map !== 'object') return null;
            var out = {};
            Object.keys(map).forEach(function (k) {
                out[k] = Math.floor(map[k] * mult);
            });
            return out;
        }

        _sig(c) {
            var partySig = '';
            var partySys = this.app.partySys;
            if (partySys) {
                var members = (typeof partySys.getPartyMembers === 'function')
                    ? partySys.getPartyMembers() : [];
                partySig = partySys.getSeed() + ':' +
                    (this.app.charSys.rootState.formation || 'none') + ':' +
                    members.map(function (m) { return m.id; }).join(',');
            }
            // activeBuffs 的 id 集合（效果在 Buff 存活期間不變，故不需納入 turns）
            var buffSig = Object.keys(c.activeBuffs || {}).sort().join(',');

            return [
                partySig, buffSig,
                c.sect, c.spiritRoot, c.spiritRootLv, c.activeXinfa, c.activeQinggong,
                c.lv,
                'S:' + Object.keys(c.stats || {}).sort().map(function (k) { return k + ':' + c.stats[k]; }).join(','),
                'M:' + Object.keys(c.meridians || {}).sort().map(function (k) { return k + ':' + c.meridians[k]; }).join(','),
                'X:' + Object.keys(c.xinfa || {}).sort().map(function (k) { return k + ':' + c.xinfa[k]; }).join(','),
                'Q:' + Object.keys(c.qinggong || {}).sort().map(function (k) { return k + ':' + c.qinggong[k]; }).join(',')
            ].join('|');
        }

        // ══════════════ 基礎元素攻防公式 ══════════════
        // 原 spiritRootSystem 的獨立 addElemAtk/addElemDef，改為均分至八元素。
        _flatElementBase(c) {
            var R = this.rules();
            var s = c.stats || {};
            var lv = c.lv || 1;

            function num(v, d) { return (typeof v === 'number' && !isNaN(v)) ? v : d; }

            var atk = num(R.flatAtkBase, 20)
                    + (s.int || 10) * num(R.flatAtkIntCoef, 2.2)
                    + (s.str || 10) * num(R.flatAtkStrCoef, 1.0)
                    + lv * num(R.flatAtkLvCoef, 3.0);

            var def = num(R.flatDefBase, 15)
                    + (s.con || 10) * num(R.flatDefConCoef, 1.6)
                    + (s.int || 10) * num(R.flatDefIntCoef, 1.2)
                    + lv * num(R.flatDefLvCoef, 2.0);

            var mult = num(R.flatAtkMult, 1.0);

            return {
                atk: Math.max(0, Math.floor(atk * mult)),
                def: Math.max(0, Math.floor(def * mult))
            };
        }

        // ══════════════ 八元素攻防聚合 ══════════════
        getElementStats(charObj) {
            var c = charObj || this.app.charSys.state;
            if (!c) return { atk: emptyMap(), def: emptyMap(), totalAtk: 0, totalDef: 0 };

            var sig = this._sig(c);
            if (this._cacheSig[c.id] === sig && this._cache[c.id]) return this._cache[c.id];

            var Data = window.HY.Data;
            var self = this;
            var atk = emptyMap();
            var def = emptyMap();
            var keys = this.keys();

            // 0. ⭐ 基礎元素攻防（原 spiritRootSystem 的獨立公式）
            var flat = this._flatElementBase(c);
            if (flat.atk > 0) this.mergeInto(atk, flat.atk);
            if (flat.def > 0) this.mergeInto(def, flat.def);

            // 1. 靈根被動
            if (c.spiritRoot && Data.SPIRIT_ROOTS && Data.SPIRIT_ROOTS[c.spiritRoot]) {
                var sr = Data.SPIRIT_ROOTS[c.spiritRoot];
                var rLv = c.spiritRootLv || 1;
                var srB = sr.passiveBonus || {};
                if (srB.elAtk) this.mergeInto(atk, this._scaleMap(srB.elAtk, rLv));
                if (srB.elDef) this.mergeInto(def, this._scaleMap(srB.elDef, rLv));
            }

            // 2. 十四經脈
            if (c.meridians && Data.MERIDIANS) {
                Data.MERIDIANS.forEach(function (m) {
                    var lv = c.meridians[m.id] || 0;
                    if (lv <= 0 || !m.bonus) return;
                    if (m.bonus.elAtk) self.mergeInto(atk, self._scaleMap(m.bonus.elAtk, lv));
                    if (m.bonus.elDef) self.mergeInto(def, self._scaleMap(m.bonus.elDef, lv));
                });
            }

            // 3. 心法（含主運 ×1.3）
            if (c.xinfa && Data.XINFA) {
                Object.keys(c.xinfa).forEach(function (id) {
                    var xf = Data.XINFA[id];
                    var lv = c.xinfa[id] || 0;
                    if (!xf || lv <= 0) return;
                    if (xf.sectReq && xf.sectReq !== c.sect) return;
                    var mult = (c.activeXinfa === id) ? lv * 1.3 : lv;
                    if (xf.elAtk) self.mergeInto(atk, self._scaleMap(xf.elAtk, mult));
                    if (xf.elDef) self.mergeInto(def, self._scaleMap(xf.elDef, mult));
                });
            }

            // 4. 身法（含常駐 ×1.3）
            if (c.qinggong && Data.QINGGONG) {
                Data.QINGGONG.forEach(function (qg) {
                    var lv = c.qinggong[qg.id] || 0;
                    if (lv <= 0) return;
                    if (qg.sectReq && qg.sectReq !== c.sect) return;
                    var mult = (c.activeQinggong === qg.id) ? lv * 1.3 : lv;
                    if (qg.elAtk) self.mergeInto(atk, self._scaleMap(qg.elAtk, mult));
                    if (qg.elDef) self.mergeInto(def, self._scaleMap(qg.elDef, mult));
                });
            }

            // 5. 武道專精
            if (c.qinggong && Data.MASTERY) {
                Data.MASTERY.forEach(function (ms) {
                    var lv = c.qinggong[ms.id] || 0;
                    if (lv <= 0 || !ms.bonus) return;
                    if (ms.bonus.elAtk) self.mergeInto(atk, self._scaleMap(ms.bonus.elAtk, lv));
                    if (ms.bonus.elDef) self.mergeInto(def, self._scaleMap(ms.bonus.elDef, lv));
                });
            }

            // 6. 裝備
            var equipSys = this.app.equipSys;
            if (equipSys) {
                var eb = equipSys.getTotalEquipmentBonusForChar(c);
                if (eb && eb.elAtk) this.mergeInto(atk, eb.elAtk);
                if (eb && eb.elDef) this.mergeInto(def, eb.elDef);
            }

            // 7. 幫會
            var gSB = this.app.guildSkillBeast;
            if (gSB && typeof gSB.getGuildBonusForChar === 'function') {
                var gb = gSB.getGuildBonusForChar(c);
                if (gb && gb.elAtk) this.mergeInto(atk, gb.elAtk);
                if (gb && gb.elDef) this.mergeInto(def, gb.elDef);
            }

            // 8. 群俠 / 靈獸
            if (this.app.companionSys) {
                var comp = this.app.companionSys.getActiveCompanionInfo();
                if (comp && comp.elAtk) this.mergeInto(atk, comp.elAtk);
                if (comp && comp.elDef) this.mergeInto(def, comp.elDef);
            }
            if (this.app.petSys) {
                var pet = this.app.petSys.getActivePetInfo();
                if (pet && pet.elAtk) this.mergeInto(atk, pet.elAtk);
                if (pet && pet.elDef) this.mergeInto(def, pet.elDef);
            }

            // 9. ⭐ 丹藥 Buff 的元素攻防加成
            //    （原在 salvageExpeditionSystem.getDerivedStatsForChar）
            if (c.activeBuffs) {
                Object.keys(c.activeBuffs).forEach(function (bId) {
                    var buff = c.activeBuffs[bId];
                    if (!buff || buff.turns <= 0 || !buff.effect) return;
                    var ef = buff.effect;
                    if (ef.elemAtkPct) {
                        keys.forEach(function (k) { atk[k] = Math.floor(atk[k] * (1 + ef.elemAtkPct)); });
                    }
                    if (ef.elemDefPct) {
                        keys.forEach(function (k) { def[k] = Math.floor(def[k] * (1 + ef.elemDefPct)); });
                    }
                });
            }

            // 10. ⭐ 同隊相生共鳴
            //     （原在 spiritRootSystem.getDerivedStatsForChar）
            var partySys = this.app.partySys;
            var inParty = partySys && typeof partySys.isInParty === 'function' && partySys.isInParty(c.id);
            if (inParty && Data.SPIRIT_ROOTS) {
                var members = (typeof partySys.getPartyMembers === 'function') ? partySys.getPartyMembers() : [];
                var isGenerated = members.some(function (ally) {
                    if (ally.id === c.id || !ally.spiritRoot) return false;
                    var allyRoot = Data.SPIRIT_ROOTS[ally.spiritRoot];
                    return allyRoot && allyRoot.generates === c.spiritRoot;
                });
                if (isGenerated) {
                    keys.forEach(function (k) {
                        atk[k] = Math.floor(atk[k] * 1.18);
                        def[k] = Math.floor(def[k] * 1.18);
                    });
                }
            }

            // 11. 修仙陣法元素加成
            if (inParty) {
                var form = (typeof partySys.getActiveFormation === 'function') ? partySys.getActiveFormation() : null;
                if (form && form.bonus) {
                    var fb = form.bonus;
                    keys.forEach(function (k) {
                        var ma = 1, md = 1;
                        if (fb.elAtkAllPct) ma += fb.elAtkAllPct;
                        if (fb.elAtkPct && fb.elAtkPct[k]) ma += fb.elAtkPct[k];
                        if (fb.elDefAllPct) md += fb.elDefAllPct;
                        if (fb.elDefPct && fb.elDefPct[k]) md += fb.elDefPct[k];
                        if (ma !== 1) atk[k] = Math.floor(atk[k] * ma);
                        if (md !== 1) def[k] = Math.floor(def[k] * md);
                    });
                }
            }

            // 12. 下限保護
            keys.forEach(function (k) {
                atk[k] = Math.max(0, Math.floor(atk[k]));
                def[k] = Math.max(0, Math.floor(def[k]));
            });

            var result = { atk: atk, def: def, totalAtk: this.sum(atk), totalDef: this.sum(def) };
            this._cacheSig[c.id] = sig;
            this._cache[c.id] = result;
            return result;
        }

        // ══════════════ 相剋判定 ══════════════
        getCounterInfo(atkElem, defElem) {
            var R = this.rules();
            if (!atkElem || !defElem) return { mult: R.neutralMult, state: 'neutral', tag: '' };
            var am = this.meta(atkElem);
            var dm = this.meta(defElem);
            if (!am || !dm) return { mult: R.neutralMult, state: 'neutral', tag: '' };

            if (am.counters === defElem) {
                return { mult: R.counterMult, state: 'counter', tag: '☯️' + am.name + '剋' + dm.name + ' +35%' };
            }
            if (dm.counters === atkElem) {
                return { mult: R.resistedMult, state: 'resisted', tag: '🛡️遭' + dm.name + '剋 -20%' };
            }
            return { mult: R.neutralMult, state: 'neutral', tag: '' };
        }

        getCounterInfoVsRoot(atkElem, defenderRoot) {
            return this.getCounterInfo(atkElem, defenderRoot);
        }

        _capTotal(total, target) {
            if (!target || total <= 0) return total;
            var R = this.rules();
            var pct = R.maxElemDamagePctOfMaxHp;
            if (typeof pct !== 'number' || pct <= 0) return total;
            var maxHp = target.maxHp || 0;
            if (maxHp <= 0) return total;
            return Math.min(total, Math.floor(maxHp * pct));
        }

        calcElementDamage(attacker, defender) {
            var as = this.getElementStats(attacker);
            var targetDef = this.getTargetElementDef(defender);
            var targetRoot = (defender && defender.spiritRoot) || null;
            var R = this.rules();
            var self = this;
            var meta = this.meta;

            var breakdown = [];
            var total = 0;
            var counterTags = [];

            this.keys().forEach(function (e) {
                var a = as.atk[e] || 0;
                if (a <= 0) return;

                var info = targetRoot
                    ? self.getCounterInfo(e, targetRoot)
                    : { mult: R.neutralMult, state: 'neutral', tag: '' };

                var dmg = Math.floor(Math.max(
                    R.minElemDamage,
                    a * info.mult - (targetDef[e] || 0) * R.defFactor
                ));
                if (dmg <= 0) return;

                total += dmg;
                breakdown.push({ elem: e, dmg: dmg, mult: info.mult, state: info.state, tag: info.tag });
                if (info.state !== 'neutral') counterTags.push(info.tag);
            });

            total = this._capTotal(total, defender);

            var log = '';
            if (breakdown.length > 0) {
                var parts = breakdown
                    .sort(function (a, b) { return b.dmg - a.dmg; })
                    .slice(0, 4)
                    .map(function (b) {
                        var m = meta(b.elem);
                        return m.icon + b.dmg;
                    });
                log = ' ' + parts.join(' ');
                if (breakdown.length > 4) log += ' …';
                if (counterTags.length > 0) log += ' [' + counterTags[0] + ']';
            }

            return { total: total, breakdown: breakdown, log: log, counterTags: counterTags };
        }

        getTargetElementDef(target) {
            if (!target) return emptyMap();
            if (target.elDef && typeof target.elDef === 'object') return target.elDef;
            if (target.stats) return this.getElementStats(target).def;
            var root = this.app.charSys && this.app.charSys.rootState;
            if (root && root.roster && target.id) {
                var found = root.roster.some(function (r) { return r.id === target.id; });
                if (found) return this.getElementStats(target).def;
            }
            return this.buildEnemyElementDef(target);
        }

        buildEnemyElementAtk(enemy) {
            var m = emptyMap();
            if (!enemy) return m;
            var R = this.rules();
            var base = Math.floor((enemy.atk || 20) * R.enemyElemAtkRatio);
            var keys = this.keys();
            if (keys.length === 0) return m;
            var root = enemy.spiritRoot && keys.indexOf(enemy.spiritRoot) !== -1 ? enemy.spiritRoot : keys[0];
            var mainShare = Math.floor(base * 0.70);
            var restShare = Math.floor((base - mainShare) / Math.max(1, keys.length - 1));
            keys.forEach(function (k) { m[k] = (k === root) ? mainShare : restShare; });
            return m;
        }

        buildEnemyElementDef(enemy) {
            var m = emptyMap();
            if (!enemy) return m;
            var R = this.rules();
            var base = Math.floor((enemy.def || 10) * R.enemyElemDefRatio);
            var keys = this.keys();
            if (keys.length === 0) return m;
            var root = enemy.spiritRoot && keys.indexOf(enemy.spiritRoot) !== -1 ? enemy.spiritRoot : keys[0];
            var mainShare = Math.floor(base * 0.55);
            var restShare = Math.floor((base - mainShare) / Math.max(1, keys.length - 1));
            keys.forEach(function (k) { m[k] = (k === root) ? mainShare : restShare; });
            return m;
        }

        initEnemyElements(enemy) {
            if (!enemy) return;
            if (!enemy.elAtk || typeof enemy.elAtk !== 'object') {
                enemy.elAtk = this.buildEnemyElementAtk(enemy);
            }
            if (!enemy.elDef || typeof enemy.elDef !== 'object') {
                enemy.elDef = this.buildEnemyElementDef(enemy);
            }
        }

        calcEnemyElementDamage(enemy, targetMember) {
            if (!enemy || !targetMember) return { total: 0, log: '', breakdown: [], counterTags: [] };
            var keys = this.keys();
            var R = this.rules();
            var self = this;
            var meta = this.meta;

            var mDef = this.getElementStats(targetMember).def;
            var mRoot = targetMember.spiritRoot;

            var breakdown = [];
            var total = 0;
            var counterTags = [];

            keys.forEach(function (e) {
                var a = (enemy.elAtk && enemy.elAtk[e]) || 0;
                if (a <= 0) return;
                var info = mRoot ? self.getCounterInfo(e, mRoot) : { mult: R.neutralMult, state: 'neutral', tag: '' };
                var dmg = Math.floor(Math.max(1, a * info.mult - (mDef[e] || 0) * R.defFactor));
                if (dmg <= 0) return;
                total += dmg;
                breakdown.push({ elem: e, dmg: dmg, mult: info.mult, state: info.state, tag: info.tag });
                if (info.state !== 'neutral') counterTags.push(info.tag);
            });

            total = this._capTotal(total, targetMember);

            var log = '';
            if (breakdown.length > 0) {
                var parts = breakdown.slice(0, 3).map(function (b) {
                    var m = meta(b.elem);
                    return m.icon + b.dmg;
                });
                log = ' ' + parts.join(' ');
                if (breakdown.length > 3) log += ' …';
                if (counterTags.length > 0) log += ' [' + counterTags[0] + ']';
            }
            return { total: total, log: log, breakdown: breakdown, counterTags: counterTags };
        }

        getSummary(charObj) {
            var s = this.getElementStats(charObj);
            var keys = this.keys();
            var meta = this.meta;

            function buildRows(map) {
                return keys
                    .filter(function (k) { return (map[k] || 0) > 0; })
                    .sort(function (a, b) { return map[b] - map[a]; })
                    .map(function (k) {
                        var m = meta(k);
                        return { id: k, name: m.name, icon: m.icon, color: m.color, val: map[k] };
                    });
            }

            return {
                atkRows: buildRows(s.atk),
                defRows: buildRows(s.def),
                totalAtk: s.totalAtk,
                totalDef: s.totalDef,
                atkMap: s.atk,
                defMap: s.def
            };
        }

        injectIntoEquipment() {
            var app = this.app;
            var poeSys = app.poeSys;
            var equipSys = app.equipSys;
            var self = this;

            function collectElement(itemInst, atkMap, defMap) {
                if (!itemInst) return;
                function scanStat(statKey, val) {
                    if (!statKey) return;
                    var v = (typeof val === 'number') ? val : 0;
                    if (statKey.indexOf('elAtk_') === 0) {
                        var e = statKey.slice(6);
                        if (atkMap[e] !== undefined) atkMap[e] += v;
                    } else if (statKey.indexOf('elDef_') === 0) {
                        var d = statKey.slice(6);
                        if (defMap[d] !== undefined) defMap[d] += v;
                    }
                }
                var bs = itemInst.baseStats || {};
                Object.keys(bs).forEach(function (k) { scanStat(k, bs[k]); });
                if (itemInst.implicit) scanStat(itemInst.implicit.statKey, itemInst.implicit.val);
                (itemInst.prefixes || []).forEach(function (p) { scanStat(p.statKey, p.val); });
                (itemInst.suffixes || []).forEach(function (s) { scanStat(s.statKey, s.val); });
                (itemInst.uniqueMods || []).forEach(function (u) { scanStat(u.statKey, u.val); });
            }

            if (poeSys) {
                var origItem = poeSys.getItemTotalBonus.bind(poeSys);
                poeSys.getItemTotalBonus = function (itemInst) {
                    var total = origItem(itemInst);
                    total.elAtk = emptyMap();
                    total.elDef = emptyMap();
                    collectElement(itemInst, total.elAtk, total.elDef);
                    return total;
                };
            }

            if (equipSys) {
                var origEq = equipSys.getTotalEquipmentBonusForChar.bind(equipSys);
                equipSys.getTotalEquipmentBonusForChar = function (charObj) {
                    var total = origEq(charObj);
                    total.elAtk = emptyMap();
                    total.elDef = emptyMap();
                    var c = charObj || app.charSys.state;
                    if (!c || !c.equipment) return total;
                    Object.keys(equipSys.SLOTS).forEach(function (slot) {
                        var it = c.equipment[slot];
                        if (it && typeof it === 'object') collectElement(it, total.elAtk, total.elDef);
                    });
                    return total;
                };

                var origFmt = equipSys.formatBonusText.bind(equipSys);
                equipSys.formatBonusText = function (bonus) {
                    var str = origFmt(bonus);
                    if (!bonus) return str;
                    var extra = [];
                    var meta = self.meta;
                    self.keys().forEach(function (k) {
                        if (bonus.elAtk && bonus.elAtk[k]) {
                            var m = meta(k);
                            extra.push(m.icon + m.name + '元素攻擊+' + bonus.elAtk[k]);
                        }
                    });
                    self.keys().forEach(function (k) {
                        if (bonus.elDef && bonus.elDef[k]) {
                            var m = meta(k);
                            extra.push(m.icon + m.name + '元素抗性+' + bonus.elDef[k]);
                        }
                    });
                    if (extra.length === 0) return str;
                    if (str === '無特殊加成' || str === '基礎白板') return extra.join('、');
                    return str + '、' + extra.join('、');
                };
            }
        }

        registerHooks() {
            var self = this;
            var combat = this.app.combatSys;
            if (!combat) return;

            combat.registerPlugin({
                onBattleStart: function (core, payload) {
                    self._cache = {};
                    self._cacheSig = {};
                    (payload.enemies || []).forEach(function (e) {
                        self.initEnemyElements(e);
                    });
                }
            });
        }
    }

    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            var game = window.HY.game;
            if (game && !game.elementSys && window.HY.ElementSystem) {
                game.elementSys = new window.HY.ElementSystem(game);
            }
            if (game && typeof game.renderAll === 'function') game.renderAll();
        }, 170);
    });

    window.HY.ElementSystem = ElementSystem;
})();