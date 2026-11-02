// js/characterSystem.js  (v52)
// 角色本體、存檔正規化、衍生屬性計算、升級/拜師、統一戰力計算
//
// v52 修正：
//   ⭐【移除】靈敏 (dex) 屬性 → 先天四維：體魄／力道／身法／內息
//   ⭐ 舊存檔的 c.stats.dex 會被自動刪除
//   ⭐ 攻速改由身法驅動（見 dexteritySpeedSystem.js）
window.HY = window.HY || {};

(function () {
    try {
        var MERIDIAN_KEYS = [
            'm_1_fei', 'm_2_dachang', 'm_3_wei', 'm_4_pi', 'm_5_xin', 'm_6_xiaochang', 'm_7_pangguang',
            'm_8_shen', 'm_9_xinbao', 'm_10_sanjiao', 'm_11_dan', 'm_12_gan', 'm_13_ren', 'm_14_du'
        ];
        var LEGACY_MERIDIAN_KEYS = ['ren', 'du', 'chong', 'dai', 'yinwei', 'yangwei', 'yinqiao', 'yangqiao'];
        var SLOT_KEYS = ['mainhand', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring_left', 'ring_right'];

        // ⭐ v52：四維屬性（已移除 dex）
        var STAT_KEYS = ['con', 'str', 'agi', 'int'];

        var MARTIAL_DIV = 4;
        var MASTERY_DIV = 5;

        class CharacterSystem {
            constructor(logger) {
                this.logger = logger;
                this.MAX_LEVEL = 300;
                this.rewardRate = 0.085;

                this.rootState = this.getDefaultRootState();
                this.state = null;
                this.syncActivePointer();
            }

            createMeridianMap() {
                var m = {};
                MERIDIAN_KEYS.forEach(function (k) { m[k] = 0; });
                return m;
            }

            // ⭐ v52：四維屬性模板
            createStatsTemplate() {
                return { con: 10, str: 10, agi: 10, int: 10 };
            }

            createSingleCharTemplate(id, name) {
                return {
                    id: id || 'char_1',
                    name: name || '時空浪人',
                    lv: 1, exp: 0, maxExp: 100,
                    sect: null, freePoints: 0,
                    stats: this.createStatsTemplate(),
                    currentHp: 220, currentMp: 110,
                    skills: { basic_punch: 1 },
                    xinfa: {}, activeXinfa: null,
                    qinggong: {}, activeQinggong: null,
                    meridians: this.createMeridianMap(),
                    equipment: {
                        mainhand: null, offhand: null, helmet: null, body: null, gloves: null,
                        boots: null, belt: null, amulet: null, ring_left: null, ring_right: null
                    },
                    guildBlessings: {}, activeBlessing: null,
                    destinySkills: {}, activeBuffs: {},
                    spiritRoot: null, spiritRootLv: 1,
                    sectFeature: {}, _battle: {}
                };
            }

            getDefaultRootState() {
                var firstChar = this.createSingleCharTemplate('char_1', '時空浪人・壹');
                return {
                    roster: [firstChar],
                    activeCharIndex: 0,
                    party: ['char_1'],
                    formation: 'none',
                    formationSeed: Math.floor(Math.random() * 2147483646) + 1,
                    sp: 50, gold: 150,
                    inventory: { pill_hp: 3 },
                    equipBag: [], currencies: null, guild: null,
                    companions: {}, activeCompanion: null,
                    pets: {}, activePet: null,
                    currentMap: 'yangzhou',
                    lastOnlineTimestamp: Date.now(),
                    spiritStones: 20,
                    petExpeditions: {}
                };
            }

            getDefaultState() { return this.getDefaultRootState(); }

            normalizeChar(c) {
                if (!c || typeof c !== 'object') return c;
                if (c.__v52normalized) return c;

                var Data = window.HY.Data || {};

                if (!c.stats || typeof c.stats !== 'object') c.stats = {};

                // ⭐ v52：確保四維存在且合法
                STAT_KEYS.forEach(function (k) {
                    if (typeof c.stats[k] !== 'number' || isNaN(c.stats[k])) c.stats[k] = 10;
                });

                // ⭐ v52：清除舊存檔的 dex
                if (Object.prototype.hasOwnProperty.call(c.stats, 'dex')) {
                    delete c.stats.dex;
                }

                if (!c.skills || typeof c.skills !== 'object') c.skills = { basic_punch: 1 };
                if (!c.skills.basic_punch) c.skills.basic_punch = 1;

                if (!c.xinfa || typeof c.xinfa !== 'object') c.xinfa = {};
                if (c.activeXinfa === undefined) c.activeXinfa = null;
                if (!c.qinggong || typeof c.qinggong !== 'object') c.qinggong = {};
                if (c.activeQinggong === undefined) c.activeQinggong = null;

                if (!c.guildBlessings) c.guildBlessings = {};
                if (c.activeBlessing === undefined) c.activeBlessing = null;
                if (!c.destinySkills) c.destinySkills = {};
                if (!c.activeBuffs) c.activeBuffs = {};
                if (!c.sectFeature) c.sectFeature = {};
                if (!c._battle) c._battle = {};

                if (!c.equipment || typeof c.equipment !== 'object') c.equipment = {};
                SLOT_KEYS.forEach(function (k) {
                    if (typeof c.equipment[k] === 'string' || c.equipment[k] === undefined) c.equipment[k] = null;
                });

                if (!c.meridians || typeof c.meridians !== 'object') c.meridians = {};
                MERIDIAN_KEYS.forEach(function (k) {
                    if (typeof c.meridians[k] !== 'number') c.meridians[k] = 0;
                });
                LEGACY_MERIDIAN_KEYS.forEach(function (k) {
                    if (Object.prototype.hasOwnProperty.call(c.meridians, k)) delete c.meridians[k];
                });

                if (c.sect && Data.SECTS && !Data.SECTS[c.sect]) c.sect = null;

                var inv = this.rootState && this.rootState.inventory;
                if (inv) {
                    ['pill_spirit_stone', 'pill_con_perm', 'pill_str_perm', 'pill_agi_perm', 'pill_int_perm', 'pill_dex_perm']
                        .forEach(function (oldId) { if (inv[oldId] !== undefined) delete inv[oldId]; });
                }

                if (typeof c.maxExp !== 'number' || c.maxExp <= 0) c.maxExp = 100;
                if (typeof c.lv !== 'number' || c.lv < 1) c.lv = 1;

                Object.defineProperty(c, '__v52normalized', {
                    value: true, enumerable: false, configurable: true, writable: true
                });
                return c;
            }

            syncActivePointer() {
                var root = this.rootState;
                if (!root.roster || !Array.isArray(root.roster) || root.roster.length === 0) {
                    root.roster = [this.createSingleCharTemplate('char_1', '時空浪人・壹')];
                    root.activeCharIndex = 0;
                }
                if (typeof root.activeCharIndex !== 'number' || root.activeCharIndex >= root.roster.length) {
                    root.activeCharIndex = 0;
                }

                var self = this;
                root.roster.forEach(function (c) { self.normalizeChar(c); });

                var activeChar = root.roster[root.activeCharIndex] || root.roster[0];

                var sharedKeys = ['sp', 'gold', 'inventory', 'equipBag', 'currencies', 'guild',
                    'companions', 'activeCompanion', 'pets', 'activePet', 'currentMap',
                    'spiritStones', 'petExpeditions'];
                sharedKeys.forEach(function (key) {
                    Object.defineProperty(activeChar, key, {
                        get: function () { return root[key]; },
                        set: function (val) { root[key] = val; },
                        configurable: true,
                        enumerable: false
                    });
                });

                this.state = activeChar;
            }

            // ══════════════════════════════════════════════════════════════
            //  ⭐ 統一戰力計算
            //  公式：Power = ⌊ scale × ( atk·wa + def·wd + maxHp·wh + maxMp·wm
            //                        + hit·whi + eva·wev + crit·wc + critRes·wcr ) ⌋
            // ══════════════════════════════════════════════════════════════
            getPowerScore(stats) {
                var G = window.HY && window.HY.GameConfig;
                var P = (G && G.power) || {};

                var num = function (v, d) {
                    return (typeof v === 'number' && !isNaN(v)) ? v : d;
                };
                var w = function (k, d) { return num(P[k], d); };

                if (!stats) return num(P.minValue, 1);

                var scale = w('scale', 4.0);
                var score = scale * (
                    num(stats.atk, 0)     * w('atkWeight', 5.0) +
                    num(stats.def, 0)     * w('defWeight', 3.0) +
                    num(stats.maxHp, 0)   * w('hpWeight', 0.2) +
                    num(stats.maxMp, 0)   * w('mpWeight', 0.1) +
                    num(stats.hit, 0)     * w('hitWeight', 2.0) +
                    num(stats.eva, 0)     * w('evaWeight', 2.0) +
                    num(stats.crit, 0)    * w('critWeight', 3.0) +
                    num(stats.critRes, 0) * w('critResWeight', 3.0)
                );

                return Math.max(w('minValue', 1), Math.floor(score));
            }

            getEnemyPowerScore(enemy) {
                if (!enemy) return 1;
                return this.getPowerScore({
                    atk: enemy.atk,
                    def: enemy.def,
                    maxHp: enemy.maxHp,
                    maxMp: (typeof enemy.maxMp === 'number' ? enemy.maxMp : 0),
                    hit: enemy.hit,
                    eva: enemy.eva,
                    crit: enemy.crit,
                    critRes: enemy.critRes
                });
            }

            // ══════════════════════════════════════════════════════════════
            //  衍生屬性
            // ══════════════════════════════════════════════════════════════
            getDerivedStatsForChar(charObj) {
                var c = charObj || this.state;
                var Data = window.HY.Data || {};

                if (!c) {
                    return {
                        maxHp: 200, maxMp: 100, atk: 10, def: 5, hit: 90, eva: 5,
                        crit: 5, critRes: 0, critDmg: 165, dmgReduce: 0,
                        atkSpd: 100, powerScore: 100
                    };
                }
                if (!c.stats) c.stats = this.createStatsTemplate();

                var s = c.stats;
                var con = typeof s.con === 'number' ? s.con : 10;
                var str = typeof s.str === 'number' ? s.str : 10;
                var agi = typeof s.agi === 'number' ? s.agi : 10;
                var intel = typeof s.int === 'number' ? s.int : 10;
                var lv = c.lv || 1;

                var maxHp = 100 + con * 15 + (lv - 1) * 35;
                var maxMp = 50 + intel * 8 + (lv - 1) * 15;
                var atk = Math.floor(str * 2.5 + intel * 1.0 + lv * 4);
                var def = Math.floor(con * 1.5 + agi * 0.6 + lv * 2);

                var hit = Math.floor(85 + agi * 0.35 + intel * 0.2 + lv * 0.25);
                var eva = Math.floor(5 + agi * 0.25);
                var crit = Math.floor(5 + agi * 0.3);
                var critRes = Math.floor(con * 0.25 + intel * 0.2 + lv * 0.15);
                var critDmg = 165;
                var dmgReduce = 0;

                var addBonus = function (b, scale) {
                    if (!b) return;
                    var m = (typeof scale === 'number') ? scale : 1;
                    if (b.maxHp)   maxHp   += Math.floor(b.maxHp * m);
                    if (b.maxMp)   maxMp   += Math.floor(b.maxMp * m);
                    if (b.atk)     atk     += Math.floor(b.atk * m);
                    if (b.def)     def     += Math.floor(b.def * m);
                    if (b.hit)     hit     += Math.floor(b.hit * m);
                    if (b.eva)     eva     += Math.floor(b.eva * m);
                    if (b.crit)    crit    += Math.floor(b.crit * m);
                    if (b.critRes) critRes += Math.floor(b.critRes * m);
                };

                // 1. 門派加成
                if (c.sect && Data.SECTS && Data.SECTS[c.sect]) addBonus(Data.SECTS[c.sect].bonus, 1);

                // 2. 內功心法 ÷4
                if (c.xinfa && Data.XINFA) {
                    Object.keys(c.xinfa).forEach(function (xId) {
                        var lvX = c.xinfa[xId] || 0;
                        var xf = Data.XINFA[xId];
                        if (lvX > 0 && xf && xf.passivePerLv) {
                            if (xf.sectReq && xf.sectReq !== c.sect) return;
                            var mult = (c.activeXinfa === xId) ? lvX * 1.3 : lvX;
                            addBonus(xf.passivePerLv, mult / MARTIAL_DIV);
                            if (c.activeXinfa === xId) {
                                if (xf.effectType === 'dmg_reduce') dmgReduce += 8;
                                if (xf.effectType === 'holy_guard') dmgReduce += 15;
                            }
                        }
                    });
                }

                // 3. 輕功／身法 ÷4 + 常駐 ×1.3
                if (c.qinggong && Data.QINGGONG) {
                    Data.QINGGONG.forEach(function (qg) {
                        var lvQ = c.qinggong[qg.id] || 0;
                        if (lvQ <= 0) return;
                        if (qg.sectReq && qg.sectReq !== c.sect) return;
                        if (qg.bonus) {
                            var mult = (c.activeQinggong === qg.id) ? lvQ * 1.3 : lvQ;
                            addBonus(qg.bonus, mult / MARTIAL_DIV);
                        }
                    });
                }

                // 4. 武道專精 ÷5
                if (c.qinggong && Data.MASTERY) {
                    Data.MASTERY.forEach(function (ms) {
                        var lvM = c.qinggong[ms.id] || 0;
                        if (lvM > 0 && ms.bonus) addBonus(ms.bonus, lvM / MASTERY_DIV);
                    });
                }

                // 5. 十四經脈 ÷4
                if (c.meridians && Data.MERIDIANS) {
                    Data.MERIDIANS.forEach(function (m) {
                        var lvMe = c.meridians[m.id] || 0;
                        if (lvMe > 0 && m.bonus) addBonus(m.bonus, lvMe / MARTIAL_DIV);
                    });
                }

                // 6. 裝備
                var equipSys = window.HY.game && window.HY.game.equipSys;
                if (equipSys) addBonus(equipSys.getTotalEquipmentBonusForChar(c), 1);

                // 7. 群俠
                var activeCompId = this.rootState.activeCompanion;
                if (activeCompId && Data.COMPANIONS && Data.COMPANIONS[activeCompId]) {
                    var comp = Data.COMPANIONS[activeCompId];
                    var cLv = (this.rootState.companions && this.rootState.companions[activeCompId]) || 1;
                    addBonus(comp.passive, 1 + (cLv - 1) * 0.15);
                }

                // 8. 靈獸
                var petSys = window.HY.game && window.HY.game.petSys;
                if (petSys) {
                    var petInfo = petSys.getActivePetInfo();
                    if (petInfo && petInfo.bonus) addBonus(petInfo.bonus, 1);
                }

                // 9. 幫會祝福 / 後天改命
                var guildSB = window.HY.game && window.HY.game.guildSkillBeast;
                if (guildSB && typeof guildSB.getGuildBonusForChar === 'function') {
                    addBonus(guildSB.getGuildBonusForChar(c), 1);
                    var unityLv = guildSB.getDestinySkillLv(c, 'gg_unity_mantra');
                    if (unityLv > 0) dmgReduce += Math.min(40, 6 + unityLv * 1);
                }

                // 10. 修仙陣法
                var partySys = window.HY.game && window.HY.game.partySys;
                if (partySys && typeof partySys.isInParty === 'function' && partySys.isInParty(c.id)) {
                    var form = partySys.getActiveFormation();
                    if (form && form.bonus) {
                        var fb = form.bonus;
                        if (fb.atkPct)      atk     = Math.floor(atk * (1 + fb.atkPct));
                        if (fb.defPct)      def     = Math.floor(def * (1 + fb.defPct));
                        if (fb.maxHpPct)    maxHp   = Math.floor(maxHp * (1 + fb.maxHpPct));
                        if (fb.maxMpPct)    maxMp   = Math.floor(maxMp * (1 + fb.maxMpPct));
                        if (fb.hitPct)      hit     = Math.floor(hit * (1 + fb.hitPct));
                        if (fb.evaPct)      eva     = Math.floor(eva * (1 + fb.evaPct));
                        if (fb.critPct)     crit    = Math.floor(crit * (1 + fb.critPct));
                        if (fb.critResPct)  critRes = Math.floor(critRes * (1 + fb.critResPct));
                        if (fb.critDmgPct)  critDmg += Math.floor(critDmg * fb.critDmgPct);
                        if (fb.dmgReduceFlat) dmgReduce += fb.dmgReduceFlat;
                    }
                }

                eva = Math.min(85, eva);
                crit = Math.min(90, crit);

                var powerScore = this.getPowerScore({
                    atk: atk, def: def, maxHp: maxHp, maxMp: maxMp,
                    hit: hit, eva: eva, crit: crit, critRes: critRes
                });

                return {
                    maxHp: maxHp, maxMp: maxMp, atk: atk, def: def,
                    hit: hit, eva: eva, crit: crit, critRes: critRes,
                    critDmg: critDmg, dmgReduce: dmgReduce,
                    atkSpd: 100,
                    powerScore: powerScore
                };
            }

            getDerivedStats() { return this.getDerivedStatsForChar(this.state); }

            gainRewards(rawExp, rawSp, rawGold) {
                var adjSp = Math.max(1, Math.floor(rawSp * this.rewardRate));
                var adjGold = Math.max(1, Math.floor(rawGold * this.rewardRate));

                this.rootState.sp += adjSp;
                this.rootState.gold += adjGold;

                var partySys = window.HY.game && window.HY.game.partySys;
                var partyMembers = partySys ? partySys.getPartyMembers() : [this.state];
                var self = this;

                this.logger.add('💰 戰利品結算：武點 +' + adjSp.toLocaleString() + ' | 紋銀 +' + adjGold.toLocaleString() + ' 兩 | 隊員經驗 +' + rawExp.toLocaleString(), 'wealth');

                partyMembers.forEach(function (member) {
                    if (member.lv >= self.MAX_LEVEL) { member.exp = 0; return; }
                    member.exp += rawExp;
                    while (member.exp >= member.maxExp && member.lv < self.MAX_LEVEL) {
                        member.exp -= member.maxExp;
                        member.lv += 1;
                        member.freePoints += 5;
                        member.maxExp = Math.floor(100 * Math.pow(member.lv, 1.85) + member.lv * 120);
                        var d = self.getDerivedStatsForChar(member);
                        member.currentHp = d.maxHp;
                        member.currentMp = d.maxMp;
                        self.logger.add('🎉 【' + member.name + '】境界突破升至 Lv.' + member.lv + ' (上限 Lv.300)！氣血內力全滿並獲 5 點潛能！', 'system');
                    }
                });
            }

            allocatePoint(statKey, amount) {
                var count = amount || 1;
                if (this.state.freePoints < count) count = this.state.freePoints;
                if (count <= 0) return false;

                // ⭐ v52：只允許四維
                if (STAT_KEYS.indexOf(statKey) === -1) return false;

                this.state.stats[statKey] += count;
                this.state.freePoints -= count;
                var d = this.getDerivedStats();
                if (statKey === 'con') this.state.currentHp += 15 * count;
                if (statKey === 'int') this.state.currentMp += 8 * count;
                this.clampVitals(d);
                if (window.HY.game && window.HY.game.elementSys) {
                    window.HY.game.elementSys._cache = {};
                }
                return true;
            }

            joinSect(sectId) {
                var Data = window.HY.Data || {};
                if (!Data.SECTS || !Data.SECTS[sectId]) return false;
                var sect = Data.SECTS[sectId];
                var reqLv = sect.reqLv || 10;

                if (this.state.lv < reqLv) {
                    this.logger.add('🔒 等級不足！【' + this.state.name + '】需達到 Lv.' + reqLv + ' 才能拜入【' + sect.name + '】！', 'system');
                    return false;
                }

                var oldSect = this.state.sect;
                this.state.sect = sectId;

                if (oldSect && oldSect !== sectId) {
                    var self = this;
                    Object.keys(this.state.skills || {}).forEach(function (sId) {
                        var art = Data.MARTIAL_ARTS[sId];
                        if (art && art.sectReq && art.sectReq !== sectId) delete self.state.skills[sId];
                    });
                    Object.keys(this.state.xinfa || {}).forEach(function (xId) {
                        var xf = Data.XINFA[xId];
                        if (xf && xf.sectReq && xf.sectReq !== sectId) {
                            delete self.state.xinfa[xId];
                            if (self.state.activeXinfa === xId) self.state.activeXinfa = null;
                        }
                    });
                    Object.keys(this.state.qinggong || {}).forEach(function (qId) {
                        var qg = (Data.QINGGONG || []).find(function (q) { return q.id === qId; });
                        if (qg && qg.sectReq && qg.sectReq !== sectId) {
                            delete self.state.qinggong[qId];
                            if (self.state.activeQinggong === qId) self.state.activeQinggong = null;
                        }
                    });
                    this.logger.add('⚠️ 轉換師門：已自動廢除原門派專屬武學、心法與身法。', 'system');
                }

                if (sect.signatureSkill && !this.state.skills[sect.signatureSkill]) {
                    this.state.skills[sect.signatureSkill] = 1;
                }
                var d = this.getDerivedStats();
                this.clampVitals(d);
                var sigArt = Data.MARTIAL_ARTS[sect.signatureSkill];
                this.logger.add('⛩️ 【' + this.state.name + '】正式拜入【' + sect.name + '】，獲賜入門絕學《' + (sigArt ? sigArt.name : '') + '》！', 'system');
                return true;
            }

            restoreVitals(hp, mp, targetChar) {
                var c = targetChar || this.state;
                var d = this.getDerivedStatsForChar(c);
                c.currentHp = Math.min(d.maxHp, c.currentHp + hp);
                c.currentMp = Math.min(d.maxMp, c.currentMp + mp);
            }

            restoreAllPartyVitals(ratio) {
                var self = this;
                this.rootState.roster.forEach(function (c) {
                    var d = self.getDerivedStatsForChar(c);
                    if (ratio >= 1) {
                        c.currentHp = d.maxHp;
                        c.currentMp = d.maxMp;
                    } else {
                        c.currentHp = Math.max(c.currentHp, Math.floor(d.maxHp * ratio));
                        c.currentMp = Math.max(c.currentMp, Math.floor(d.maxMp * ratio));
                    }
                });
            }

            clampVitals(derived, targetChar) {
                var c = targetChar || this.state;
                derived = derived || this.getDerivedStatsForChar(c);
                c.currentHp = Math.min(derived.maxHp, Math.max(0, c.currentHp));
                c.currentMp = Math.min(derived.maxMp, Math.max(0, c.currentMp));
            }
        }

        window.HY.CharacterSystem = CharacterSystem;
        console.log('[characterSystem] ✓ 已定義（v52，先天四維）');

    } catch (err) {
        console.error('[characterSystem] ✗ 載入失敗！真正的原因如下：', err);
        console.error('[characterSystem] 錯誤堆疊：', err && err.stack);
        throw err;
    }
})();