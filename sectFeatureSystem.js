// js/sectFeatureSystem.js  (v36)
// 15 大門派「專屬特色」戰鬥實現
//
// v36 修正（門派特色補完）：
//   ⭐ 新增戰鬥修正查詢 API：getAttackerMods / getDefenderMods / getEnemySpeedMult
//   ⭐ 天龍「六脈貫通」：命中 +8%/層、無視 5% 閃避/層、滿層必中 + 破甲，全部實際套用
//   ⭐ 天山「冰魄凍結」：每層減速 -4% 實際影響敵人 ATB；凍結期間自身暴擊 +30% 實際生效
//   ⭐ 唐門「千機連爆」：每枚機關使該次群攻傷害 +5% 實際生效
//   ⭐ 鬼谷「奇門變陣」：驚門暴擊 +10% 實際生效
//   ⭐ 絕情谷「陰陽倒亂」：陽刀攻擊 +40%、防禦 -20%、陰劍防禦 +40% 改為真實屬性乘算
//   ⭐ 峨嵋「慈航印記」：慈悲對全隊的攻防加成改為真實屬性乘算（施術者雙倍）
//   ⭐ 桃花島五行逆轉元素攻擊改讀 elementSys（v35 修正保留）
//   ⭐ processEnemyAttack 已倒地守衛（v35 修正保留）
window.HY = window.HY || {};

(function () {
    var FEATURES = {
        // 🛡️ 少林 — 金剛業力
        shaolin: {
            key: 'karma',
            base: { max: 10, dr: 0.02, reflect: 0.30, releaseHeal: 0 },
            onStruck: function (sys, core, c, enemy, dmg, p) {
                var b = sys.battle(c);
                b.karma = Math.min(p.max, (b.karma || 0) + 1);
                var reduce = Math.min(0.60, b.karma * p.dr);
                var saved = Math.floor(dmg * reduce);
                if (saved > 0) c.currentHp = Math.min(sys.maxHpOf(c), c.currentHp + saved);
                return saved;
            },
            onAttack: function (sys, core, c, target, dealt, p) {
                var b = sys.battle(c);
                var st = b.karma || 0;
                if (st <= 0 || !target || target.currentHp <= 0) return '';
                var dmg = Math.max(1, Math.floor(sys.atkOf(c) * p.reflect * st));
                target.currentHp = Math.max(0, target.currentHp - dmg);
                var log = ' [🛡️業力引爆 ' + st + '層→' + dmg + '反震]';
                if (p.releaseHeal > 0) {
                    var heal = Math.floor(sys.maxHpOf(c) * p.releaseHeal);
                    c.currentHp = Math.min(sys.maxHpOf(c), c.currentHp + heal);
                    log += '[回血+' + heal + ']';
                }
                b.karma = 0;
                return log;
            }
        },

        // 🔥 明教 — 聖火燎原
        mingjiao: {
            key: 'ignite',
            base: { max: 8, dot: 0.15, lowHpBonus: 0.08 },
            onAttack: function (sys, core, c, target, dealt, p) {
                if (!target) return '';
                var es = sys.enemyState(target);
                es.ignite = Math.min(p.max, (es.ignite || 0) + 1);
                es.igniteAtk = sys.atkOf(c);
                es.igniteDot = p.dot;
                es.igniteBonus = p.lowHpBonus;
                return ' [🔥聖火 ' + es.ignite + '層]';
            },
            onTurnEnd: function (sys, core, enemy, p) {
                var es = sys.enemyState(enemy);
                if (!es.ignite || es.ignite <= 0 || enemy.currentHp <= 0) return '';
                var bonus = 1;
                var party = sys.app.partySys ? sys.app.partySys.getPartyMembers() : [];
                if (party.length > 0) {
                    var lowest = 1;
                    party.forEach(function (m) {
                        if (m.currentHp <= 0) return;
                        var md = sys.app.charSys.getDerivedStatsForChar(m);
                        var ratio = md.maxHp > 0 ? (m.currentHp / md.maxHp) : 1;
                        if (ratio < lowest) lowest = ratio;
                    });
                    bonus = 1 + (1 - lowest) * (es.igniteBonus || 0) * 10;
                }
                var dmg = Math.max(3, Math.floor((es.igniteAtk || 20) * (es.igniteDot || 0.15) * es.ignite * bonus));
                enemy.currentHp = Math.max(0, enemy.currentHp - dmg);
                return ' [🔥聖火灼傷 ' + dmg + '（' + es.ignite + '層）]';
            }
        },

        // 🎯 丐幫 — 連環破綻
        gaibang: {
            key: 'breach',
            base: { max: 12, dmg: 0.04 },
            onAttack: function (sys, core, c, target, dealt, p) {
                if (!target) return '';
                var b = sys.battle(c);
                if (b.breachUid !== target.uid) {
                    b.breachUid = target.uid;
                    b.breach = 0;
                }
                b.breach = Math.min(p.max, (b.breach || 0) + 1);
                var extra = Math.floor(dealt * b.breach * p.dmg);
                if (extra > 0 && target.currentHp > 0) target.currentHp = Math.max(0, target.currentHp - extra);
                return ' [🎯破綻 ' + b.breach + '層→追擊' + extra + ']';
            }
        },

        // ☯️ 武當 — 太極化勁
        wudang: {
            key: 'chi',
            base: { max: 15, critRes: 0.015, release: 0.25 },
            onStruck: function (sys, core, c, enemy, dmg, p) {
                var b = sys.battle(c);
                b.chi = Math.min(p.max, (b.chi || 0) + 1);
                var reduce = Math.min(0.45, b.chi * p.critRes);
                var saved = Math.floor(dmg * reduce);
                if (saved > 0) c.currentHp = Math.min(sys.maxHpOf(c), c.currentHp + saved);
                return saved;
            },
            onAttack: function (sys, core, c, target, dealt, p) {
                var b = sys.battle(c);
                var st = b.chi || 0;
                if (st <= 0 || !target || target.currentHp <= 0) return '';
                var mp = sys.mpOf(c);
                var dmg = Math.max(1, Math.floor(mp * p.release * st));
                target.currentHp = Math.max(0, target.currentHp - dmg);
                b.chi = 0;
                return ' [☯️真氣釋放 ' + st + '層→內勁' + dmg + ']';
            }
        },

        // 💚 峨嵋 — 慈航印記
        emei: {
            key: 'mercy',
            base: { max: 10, atkDef: 0.015, healBonus: 0 },
            onHeal: function (sys, core, c, amount, p) {
                var b = sys.battle(c);
                b.mercy = Math.min(p.max, (b.mercy || 0) + 1);
                var boosted = Math.floor(amount * (1 + (p.healBonus || 0) * b.mercy));
                return boosted - amount;
            },
            onAttack: function (sys, core, c, target, dealt, p) {
                // v36：全隊攻防加成改由 getAttackerMods / getDefenderMods 統一乘算，
                //      此處僅負責輸出狀態。
                var b = sys.battle(c);
                if (!b.mercy || b.mercy <= 0) return '';
                var selfBonus = b.mercy * p.atkDef * 2;
                var teamBonus = b.mercy * p.atkDef;
                return ' [💚慈悲 ' + b.mercy + '層（自身+' + (selfBonus * 100).toFixed(1) + '% / 全隊+' + (teamBonus * 100).toFixed(1) + '%）]';
            }
        },

        // ☠️ 星宿 — 萬毒蝕骨
        xingxiu: {
            key: 'poison',
            base: { max: 10, cut: 0.03 },
            onAttack: function (sys, core, c, target, dealt, p) {
                if (!target) return '';
                var es = sys.enemyState(target);
                var before = es.poison || 0;
                es.poison = Math.min(p.max, before + 1);
                if (es.poison > before) {
                    var oldMax = target.maxHp;
                    target.maxHp = Math.max(10, Math.floor(target.maxHp * (1 - p.cut)));
                    if (target.currentHp > target.maxHp) target.currentHp = target.maxHp;
                    return ' [☠️劇毒 ' + es.poison + '層→上限 -' + (oldMax - target.maxHp) + ']';
                }
                return ' [☠️劇毒已滿]';
            },
            onKill: function (sys, core, c, enemy, p) {
                var es = sys.enemyState(enemy);
                if (!es.poison || es.poison <= 0) return '';
                var others = (core.enemies || []).filter(function (e) { return e && e.currentHp > 0 && e.uid !== enemy.uid; });
                if (others.length === 0) return '';
                var target = others[Math.floor(Math.random() * others.length)];
                var ts = sys.enemyState(target);
                if ((ts.poison || 0) < p.max) {
                    ts.poison = (ts.poison || 0) + 1;
                    var oldMax = target.maxHp;
                    target.maxHp = Math.max(10, Math.floor(target.maxHp * (1 - p.cut)));
                    if (target.currentHp > target.maxHp) target.currentHp = target.maxHp;
                    return ' [☠️劇毒傳染→' + target.name + ' 上限 -' + (oldMax - target.maxHp) + ']';
                }
                return '';
            }
        },

        // 👁️ 天龍 — 六脈貫通
        tianlong: {
            key: 'meridian',
            base: { max: 6, hit: 0.08, pen: 0.50 },
            onAttack: function (sys, core, c, target, dealt, p) {
                if (!target) return '';
                var es = sys.enemyState(target);
                var before = es.meridian || 0;

                // v36：若攻擊前已滿層，表示本次已由 getAttackerMods 套用「必中 + 破甲」，
                //      現在收掉層數（下一輪重新累積）。
                if (before >= p.max) {
                    es.meridian = 0;
                    return ' [👁️脈門滿層→必殺貫通已於本次攻擊生效]';
                }

                es.meridian = Math.min(p.max, before + 1);
                return ' [👁️脈門 ' + es.meridian + '層（命中+' + Math.round(es.meridian * p.hit * 100) + '% / 無視閃避 ' + (es.meridian * 5) + '%）]';
            }
        },

        // ❄️ 天山 — 冰魄凍結
        tianshan: {
            key: 'frost',
            base: { max: 8, slow: 0.04, critBonus: 0.30, freezeTurns: 2 },
            onAttack: function (sys, core, c, target, dealt, p) {
                if (!target) return '';
                var es = sys.enemyState(target);
                var before = es.frost || 0;
                es.frost = Math.min(p.max, before + 1);
                // v36：把減速係數存在敵人身上，供 getEnemySpeedMult 讀取
                es.frostSlow = p.slow;
                if (es.frost >= p.max) {
                    es.frozen = (es.frozen || 0) + p.freezeTurns;
                    es.frost = 0;
                    es.frostSlow = 0;
                    return ' [❄️寒冰滿層→凍結 ' + p.freezeTurns + ' 回合（凍結期間自身暴擊+' + Math.round(p.critBonus * 100) + '%）]';
                }
                return ' [❄️寒冰 ' + es.frost + '層（減速' + Math.round(es.frost * p.slow * 100) + '%）]';
            },
            onTurnEnd: function (sys, core, enemy, p) {
                var es = sys.enemyState(enemy);
                if (es.frozen && es.frozen > 0) {
                    es.frozen -= 1;
                    enemy.atb = 0;
                }
                return '';
            }
        },

        // 💧 逍遙 — 北冥納元
        xiaoyao: {
            key: 'drain',
            base: { drain: 0.10, dmgBonus: 0.60 },
            onAttack: function (sys, core, c, target, dealt, p) {
                var mp = sys.mpOf(c);
                var want = Math.max(1, Math.floor(mp * p.drain));

                var got = 0;
                if (target && target.currentHp > 0 && typeof target.currentMp === 'number') {
                    got = Math.min(want, Math.max(0, target.currentMp));
                    target.currentMp = Math.max(0, target.currentMp - got);
                }
                c.currentMp = Math.min(mp, c.currentMp + got);

                var b = sys.battle(c);
                b.drainTotal = (b.drainTotal || 0) + got;

                var mpPct = mp > 0 ? (c.currentMp / mp) : 0;
                var extra = 0;
                if (mpPct > 0.5) {
                    extra = Math.floor(dealt * (mpPct - 0.5) * p.dmgBonus * 2);
                    if (extra > 0 && target && target.currentHp > 0) target.currentHp = Math.max(0, target.currentHp - extra);
                }
                return ' [💧納元吸取+' + got + '內力' + (extra > 0 ? '，內力充盈追加' + extra : '') + ']';
            }
        },

        // ↩️ 慕容 — 斗轉還施
        murong: {
            key: 'reflect',
            base: { cap: 0.30, mult: 1.50 },
            onStruck: function (sys, core, c, enemy, dmg, p) {
                var b = sys.battle(c);
                var cap = sys.maxHpOf(c) * p.cap;
                b.force = Math.min(cap, (b.force || 0) + dmg);
                return 0;
            },
            onAttack: function (sys, core, c, target, dealt, p) {
                var b = sys.battle(c);
                var force = b.force || 0;
                if (force <= 0 || !target || target.currentHp <= 0) return '';
                var dmg = Math.max(1, Math.floor(force * p.mult));
                target.currentHp = Math.max(0, target.currentHp - dmg);
                b.force = 0;
                return ' [↩️斗轉還施→返還' + dmg + '真實傷害]';
            }
        },

        // 🕸️ 唐門 — 千機連爆
        tangmen: {
            key: 'trap',
            base: { max: 10, dmg: 0.20, aoeBonus: 0.05 },
            onAttack: function (sys, core, c, target, dealt, p) {
                var b = sys.battle(c);
                b.trap = Math.min(p.max, (b.trap || 0) + 1);
                return '';
            },
            onAoeAttack: function (sys, core, c, targets, p) {
                var b = sys.battle(c);
                var traps = b.trap || 0;
                if (traps <= 0) return '';
                var per = Math.max(1, Math.floor(sys.atkOf(c) * p.dmg));
                (targets || []).forEach(function (t) {
                    if (t && t.currentHp > 0) t.currentHp = Math.max(0, t.currentHp - per);
                });
                b.trap = 0;
                // v36：群攻增幅已由 getAttackerMods 的 aoeBonus 套用於原始傷害，此處不再重複
                return ' [🕸️千機連爆 ' + traps + '枚→每敵' + per + '傷]';
            }
        },

        // 🎴 鬼谷 — 奇門變陣
        guigu: {
            key: 'formation',
            base: { power: 1.0 },
            GATES: ['景門', '死門', '驚門', '開門'],
            onTurnStart: function (sys, core, c, p) {
                var b = sys.battle(c);
                b.gate = ((b.gate || 0) + 1) % 4;
                return b.gate;
            },
            onAttack: function (sys, core, c, target, dealt, p) {
                var b = sys.battle(c);
                var gate = b.gate || 0;
                var log = '';
                if (gate === 0) {
                    var extra = Math.floor(dealt * 0.12 * p.power);
                    if (extra > 0 && target && target.currentHp > 0) target.currentHp = Math.max(0, target.currentHp - extra);
                    log = ' [🎴景門→攻擊' + Math.round(12 * p.power) + '% 追加' + extra + ']';
                } else if (gate === 1) {
                    log = ' [🎴死門→防禦' + Math.round(15 * p.power) + '%]';
                } else if (gate === 2) {
                    // v36：暴擊 +10% 已由 getAttackerMods 套用
                    log = ' [🎴驚門→暴擊' + Math.round(10 * p.power) + '%]';
                } else {
                    var hp = Math.floor(sys.maxHpOf(c) * 0.06 * p.power);
                    var mp = Math.floor(sys.mpOf(c) * 0.06 * p.power);
                    c.currentHp = Math.min(sys.maxHpOf(c), c.currentHp + hp);
                    c.currentMp = Math.min(sys.mpOf(c), c.currentMp + mp);
                    log = ' [🎴開門→回血+' + hp + ' 回內+' + mp + ']';
                }
                return log;
            },
            onStruck: function (sys, core, c, enemy, dmg, p) {
                var b = sys.battle(c);
                if ((b.gate || 0) === 1) {
                    var saved = Math.floor(dmg * Math.min(0.4, 0.15 * p.power));
                    if (saved > 0) c.currentHp = Math.min(sys.maxHpOf(c), c.currentHp + saved);
                    return saved;
                }
                return 0;
            }
        },

        // 🌈 桃花島 — 五行逆轉
        taohuadao: {
            key: 'element',
            base: { extra: 0.50 },
            ELEMENTS: ['金', '木', '水', '火', '土'],
            onAttack: function (sys, core, c, target, dealt, p) {
                var b = sys.battle(c);
                b.elem = ((b.elem || 0) + 1) % 5;
                var el = this.ELEMENTS[b.elem];

                var elemAtk = 0;
                var elemSys = sys.app.elementSys;
                if (elemSys && typeof elemSys.getSummary === 'function') {
                    var sum = elemSys.getSummary(c);
                    elemAtk = (sum && sum.totalAtk) || 0;
                }

                var dmg = Math.max(3, Math.floor(elemAtk * p.extra));
                if (dmg > 0 && target && target.currentHp > 0) target.currentHp = Math.max(0, target.currentHp - dmg);
                return ' [🌈五行逆轉→' + el + '額外' + dmg + '屬攻]';
            }
        },

        // ⚔️ 絕情谷 — 陰陽倒亂
        jueqinggu: {
            key: 'yinyang',
            base: { atkUp: 0.40, atkDown: 0.20, defUp: 0.40, heal: 0.20 },
            onTurnStart: function (sys, core, c, p) {
                var b = sys.battle(c);
                b.yyTurn = (b.yyTurn || 0) + 1;
                return b.yyTurn % 2;
            },
            onAttack: function (sys, core, c, target, dealt, p) {
                var b = sys.battle(c);
                if ((b.yyTurn || 1) % 2 === 1) {
                    // v36：陽刀「攻擊 +40%」已由 getAttackerMods 的 atkMult 套用
                    return ' [⚔️陽刀模式→攻擊+' + Math.round(p.atkUp * 100) + '% 防禦-' + Math.round(p.atkDown * 100) + '%]';
                } else {
                    // v36：陰劍「防禦 +40%」已由 getDefenderMods 套用，此處保留吸血
                    var heal = Math.floor(dealt * p.heal);
                    c.currentHp = Math.min(sys.maxHpOf(c), c.currentHp + heal);
                    return ' [⚔️陰劍模式→吸血+' + heal + ' 防禦+' + Math.round(p.defUp * 100) + '%]';
                }
            },
            // v36：onStruck 的減傷已移除 —— 陰劍防禦改以 defMult 真實乘算
            onStruck: function (sys, core, c, enemy, dmg, p) {
                return 0;
            }
        },

        // 🩸 惡人谷 — 血怒沸騰
        erengu: {
            key: 'fury',
            base: { max: 5, lowHpBonus: 0.06, killHeal: 0.08, perStack: 0.03 },
            onAttack: function (sys, core, c, target, dealt, p) {
                var maxHp = sys.maxHpOf(c);
                var lostRatio = maxHp > 0 ? Math.max(0, 1 - c.currentHp / maxHp) : 0;
                var stacks = sys.persistent(c, 'fury') || 0;
                var bonus = lostRatio * p.lowHpBonus * 10 + stacks * p.perStack;
                var extra = Math.floor(dealt * bonus);
                if (extra > 0 && target && target.currentHp > 0) target.currentHp = Math.max(0, target.currentHp - extra);
                return ' [🩸血怒(' + stacks + '層) 殘血增幅→追加' + extra + ']';
            },
            onKill: function (sys, core, c, enemy, p) {
                var heal = Math.floor(sys.maxHpOf(c) * p.killHeal);
                c.currentHp = Math.min(sys.maxHpOf(c), c.currentHp + heal);
                var cur = sys.persistent(c, 'fury') || 0;
                if (cur < p.max) sys.setPersistent(c, 'fury', cur + 1);
                return ' [🩸擊殺回血+' + heal + '，血怒 ' + Math.min(p.max, cur + 1) + '/' + p.max + ' 層]';
            }
        }
    };

    // ══════════════════════════════════════════════════════
    // ⭐ v36：戰鬥修正查詢 API
    // ══════════════════════════════════════════════════════
    var IDENTITY_ATTACKER = {
        atkMult: 1, hitFlat: 0, evaIgnore: 0, forceHit: false,
        critFlat: 0, penBonus: 0, aoeBonus: 0
    };
    var IDENTITY_DEFENDER = { defMult: 1 };

    class SectFeatureSystem {
        constructor(app) {
            this.app = app;
            this.FEATURES = FEATURES;
            this._paramCache = {};
            this._cacheSig = {};
            this.registerHooks();
        }

        battle(c) { if (!c._battle) c._battle = {}; return c._battle; }
        enemyState(e) { if (!e._sect) e._sect = {}; return e._sect; }
        persistent(c, k) { if (!c.sectFeature) c.sectFeature = {}; return c.sectFeature[k]; }
        setPersistent(c, k, v) { if (!c.sectFeature) c.sectFeature = {}; c.sectFeature[k] = v; }
        maxHpOf(c) { return this.app.charSys.getDerivedStatsForChar(c).maxHp; }
        mpOf(c) { return this.app.charSys.getDerivedStatsForChar(c).maxMp; }
        atkOf(c) { return this.app.charSys.getDerivedStatsForChar(c).atk; }

        getDef(sectId) { return (sectId && this.FEATURES[sectId]) ? this.FEATURES[sectId] : null; }

        getFeatMeta(sectId) {
            var Data = window.HY.Data;
            return (Data && Data.SECTS && Data.SECTS[sectId]) ? Data.SECTS[sectId].feature : null;
        }

        getSig(c) {
            var sig = [];
            if (c.xinfa) Object.keys(c.xinfa).sort().forEach(function (k) { sig.push(k + ':' + c.xinfa[k]); });
            sig.push('AX:' + c.activeXinfa);
            if (c.qinggong) Object.keys(c.qinggong).sort().forEach(function (k) { sig.push(k + ':' + c.qinggong[k]); });
            sig.push('AQ:' + c.activeQinggong);
            return sig.join('|');
        }

        getParams(c) {
            var def = this.getDef(c && c.sect);
            if (!def) return null;

            var sig = this.getSig(c);
            if (this._cacheSig[c.id] === sig && this._paramCache[c.id]) return this._paramCache[c.id];

            var Data = window.HY.Data;
            var p = {};
            Object.keys(def.base).forEach(function (k) {
                if (typeof def.base[k] === 'number') p[k] = def.base[k];
            });

            function applyBoost(src, lv, isActive) {
                if (!src || !src.featBoost || lv <= 0) return;
                var mult = isActive ? lv * 1.3 : lv;
                Object.keys(src.featBoost).forEach(function (k) {
                    if (p[k] === undefined) return;
                    p[k] += src.featBoost[k] * mult;
                });
            }

            if (c.xinfa) {
                Object.keys(c.xinfa).forEach(function (id) {
                    var xf = Data.XINFA && Data.XINFA[id];
                    if (!xf || xf.sectReq !== c.sect) return;
                    applyBoost(xf, c.xinfa[id] || 0, c.activeXinfa === id);
                });
            }
            if (c.qinggong) {
                Object.keys(c.qinggong).forEach(function (id) {
                    var qg = (Data.QINGGONG || []).find(function (q) { return q.id === id; });
                    if (!qg || qg.sectReq !== c.sect) return;
                    applyBoost(qg, c.qinggong[id] || 0, c.activeQinggong === id);
                });
            }

            this._cacheSig[c.id] = sig;
            this._paramCache[c.id] = p;
            return p;
        }

        // ── v36：峨嵋慈悲的全隊加成（不含施術者本人）──
        _getTeamMercyBonus(charObj) {
            var party = this.app.partySys ? this.app.partySys.getPartyMembers() : [];
            var self = this;
            var atkMult = 1;
            var defMult = 1;
            var found = false;

            party.forEach(function (m) {
                if (m.id === charObj.id) return;
                var mDef = self.getDef(m.sect);
                if (!mDef || mDef.key !== 'mercy') return;
                var mp = self.getParams(m);
                if (!mp) return;
                var mb = self.battle(m);
                var stacks = mb.mercy || 0;
                if (stacks <= 0) return;
                found = true;
                atkMult *= (1 + stacks * mp.atkDef);
                defMult *= (1 + stacks * mp.atkDef);
            });

            return found ? { atkMult: atkMult, defMult: defMult } : null;
        }

        // ⭐ v36：攻擊方修正
        //   target 可為 null（不指定目標時，僅回傳通用加成）
        //   isAoe 供唐門判斷是否套用群攻增幅
        getAttackerMods(charObj, target, isAoe) {
            var result = {
                atkMult: 1,
                hitFlat: 0,
                evaIgnore: 0,
                forceHit: false,
                critFlat: 0,
                penBonus: 0,
                aoeBonus: 0
            };
            if (!charObj) return result;

            // 峨嵋隊友慈悲（全隊攻防）
            var teamMercy = this._getTeamMercyBonus(charObj);
            if (teamMercy) result.atkMult *= teamMercy.atkMult;

            var def = this.getDef(charObj.sect);
            if (!def) return result;
            var p = this.getParams(charObj);
            if (!p) return result;
            var b = this.battle(charObj);

            // ── 絕情谷 陽刀：攻擊 +40% ──
            if (def.key === 'yinyang') {
                var isYang = ((b.yyTurn || 1) % 2 === 1);
                if (isYang) result.atkMult *= (1 + p.atkUp);
            }

            // ── 峨嵋 自身慈悲雙倍 ──
            if (def.key === 'mercy' && (b.mercy || 0) > 0) {
                result.atkMult *= (1 + (b.mercy || 0) * p.atkDef * 2);
            }

            // ── 鬼谷 驚門：暴擊 +10% ──
            if (def.key === 'formation' && (b.gate || 0) === 2) {
                result.critFlat += 10 * p.power;
            }

            // ── 天龍 脈門：命中 + 無視閃避；滿層必中 + 破甲 ──
            if (def.key === 'meridian' && target) {
                var es = this.enemyState(target);
                var stacks = es.meridian || 0;
                if (stacks > 0) {
                    result.hitFlat += stacks * (p.hit * 100);
                    result.evaIgnore += stacks * 5;
                }
                if (stacks >= p.max) {
                    result.forceHit = true;
                    result.penBonus += p.pen;
                }
            }

            // ── 天山 凍結：暴擊 +30% ──
            if (def.key === 'frost' && target) {
                var fes = this.enemyState(target);
                if ((fes.frozen || 0) > 0) {
                    result.critFlat += p.critBonus * 100;
                }
            }

            // ── 唐門 群攻：每枚機關 +5% ──
            if (def.key === 'trap' && isAoe) {
                result.aoeBonus += (b.trap || 0) * p.aoeBonus;
            }

            return result;
        }

        // ⭐ v36：防禦方修正
        getDefenderMods(charObj) {
            var result = { defMult: 1 };
            if (!charObj) return result;

            var teamMercy = this._getTeamMercyBonus(charObj);
            if (teamMercy) result.defMult *= teamMercy.defMult;

            var def = this.getDef(charObj.sect);
            if (!def) return result;
            var p = this.getParams(charObj);
            if (!p) return result;
            var b = this.battle(charObj);

            // ── 峨嵋 自身慈悲雙倍 ──
            if (def.key === 'mercy' && (b.mercy || 0) > 0) {
                result.defMult *= (1 + (b.mercy || 0) * p.atkDef * 2);
            }

            // ── 絕情谷 陰陽：陽刀 -20% / 陰劍 +40% ──
            if (def.key === 'yinyang') {
                var isYang = ((b.yyTurn || 1) % 2 === 1);
                if (isYang) {
                    result.defMult *= (1 - p.atkDown);
                } else {
                    result.defMult *= (1 + p.defUp);
                }
            }

            return result;
        }

        // ⭐ v36：敵人速度修正（天山寒冰減速）
        getEnemySpeedMult(enemy) {
            if (!enemy || !enemy._sect) return 1;
            var slow = enemy._sect.frostSlow;
            if (typeof slow !== 'number' || slow <= 0) return 1;
            var stacks = enemy._sect.frost || 0;
            if (stacks <= 0) return 1;
            return Math.max(0.20, 1 - stacks * slow);
        }

        // ────────────────────────────────────────
        getStacksSummary(c) {
            var def = this.getDef(c && c.sect);
            if (!def) return '';
            var p = this.getParams(c);
            if (!p) return '';
            var b = this.battle(c);
            var k = def.key;

            if (k === 'karma')  return '業力 ' + (b.karma || 0) + '/' + Math.round(p.max);
            if (k === 'chi')    return '真氣 ' + (b.chi || 0) + '/' + Math.round(p.max);
            if (k === 'mercy')  return '慈悲 ' + (b.mercy || 0) + '/' + Math.round(p.max);
            if (k === 'breach') return '破綻 ' + (b.breach || 0) + '/' + Math.round(p.max);
            if (k === 'reflect')return '彼力 ' + Math.floor(b.force || 0);
            if (k === 'trap')   return '機關 ' + (b.trap || 0) + '/' + Math.round(p.max);
            if (k === 'fury')   return '血怒 ' + (this.persistent(c, 'fury') || 0) + '/' + Math.round(p.max);
            if (k === 'formation') return '陣門：' + (def.GATES[(b.gate || 0)] || '景門');
            if (k === 'yinyang')   return ((b.yyTurn || 1) % 2 === 1) ? '陽刀模式' : '陰劍模式';
            if (k === 'element')   return '五行：' + (def.ELEMENTS[(b.elem || 0)] || '金');
            if (k === 'drain')  return '納元吸取 ' + Math.round(p.drain * 100) + '%';
            if (k === 'ignite') return '聖火灼傷 ' + Math.round(p.dot * 100) + '%/層';
            if (k === 'poison') return '劇毒削上限 ' + Math.round(p.cut * 100) + '%/層';
            if (k === 'meridian') return '脈門命中 +' + Math.round(p.hit * 100) + '%/層';
            if (k === 'frost')  return '寒冰減速 ' + Math.round(p.slow * 100) + '%/層';
            return '';
        }

        getStatusTable(c) {
            var sys = this;
            var def = this.getDef(c && c.sect);
            if (!def) return null;
            var p = this.getParams(c);
            if (!p) return null;
            var b = this.battle(c);
            var meta = this.getFeatMeta(c.sect);
            var k = def.key;

            function pct(v) { return (typeof v === 'number') ? (Math.round(v * 1000) / 10) + '%' : '-'; }
            function cnt(v) { return (typeof v === 'number') ? String(Math.round(v)) : '-'; }

            function enemyCount(prop) {
                var list = (sys.app.combatSys && sys.app.combatSys.enemies) || [];
                return list.filter(function (e) {
                    return e && e.currentHp > 0 && e._sect && e._sect[prop];
                }).length;
            }
            function enemyMaxStack(prop) {
                var list = (sys.app.combatSys && sys.app.combatSys.enemies) || [];
                var mx = 0;
                list.forEach(function (e) {
                    if (!e || e.currentHp <= 0 || !e._sect) return;
                    var v = e._sect[prop] || 0;
                    if (v > mx) mx = v;
                });
                return mx;
            }
            function enemyTotalMp() {
                var list = (sys.app.combatSys && sys.app.combatSys.enemies) || [];
                var sum = 0;
                list.forEach(function (e) {
                    if (!e || e.currentHp <= 0) return;
                    sum += (e.currentMp || 0);
                });
                return sum;
            }

            var rows = [];

            switch (k) {
                case 'karma':
                    rows.push({ k: '業力層數', v: (b.karma || 0) + ' / ' + cnt(p.max), hl: true });
                    rows.push({ k: '目前減傷', v: pct(Math.min(0.60, (b.karma || 0) * p.dr)) });
                    rows.push({ k: '單層減傷', v: pct(p.dr) });
                    rows.push({ k: '引爆倍率', v: pct(p.reflect) });
                    if (p.releaseHeal > 0) rows.push({ k: '引爆回血', v: pct(p.releaseHeal) });
                    break;

                case 'ignite':
                    rows.push({ k: '受灼燒敵人', v: enemyCount('ignite') + ' 名', hl: true });
                    rows.push({ k: '最高層數', v: enemyMaxStack('ignite') + ' / ' + cnt(p.max) });
                    rows.push({ k: '每層灼傷', v: pct(p.dot) });
                    rows.push({ k: '殘血增幅', v: pct(p.lowHpBonus) });
                    break;

                case 'breach':
                    rows.push({ k: '破綻層數', v: (b.breach || 0) + ' / ' + cnt(p.max), hl: true });
                    rows.push({ k: '目前增傷', v: pct((b.breach || 0) * p.dmg) });
                    rows.push({ k: '單層增傷', v: pct(p.dmg) });
                    break;

                case 'chi':
                    rows.push({ k: '真氣層數', v: (b.chi || 0) + ' / ' + cnt(p.max), hl: true });
                    rows.push({ k: '目前減傷', v: pct(Math.min(0.45, (b.chi || 0) * p.critRes)) });
                    rows.push({ k: '單層減傷', v: pct(p.critRes) });
                    rows.push({ k: '釋放倍率', v: pct(p.release) });
                    break;

                case 'mercy':
                    rows.push({ k: '慈悲層數', v: (b.mercy || 0) + ' / ' + cnt(p.max), hl: true });
                    rows.push({ k: '自身攻防', v: pct((b.mercy || 0) * p.atkDef * 2) });
                    rows.push({ k: '全隊攻防', v: pct((b.mercy || 0) * p.atkDef) });
                    if (p.healBonus > 0) rows.push({ k: '治療增幅', v: pct(p.healBonus) });
                    break;

                case 'poison':
                    rows.push({ k: '中毒敵人', v: enemyCount('poison') + ' 名', hl: true });
                    rows.push({ k: '最高層數', v: enemyMaxStack('poison') + ' / ' + cnt(p.max) });
                    rows.push({ k: '每層削上限', v: pct(p.cut) });
                    rows.push({ k: '死亡傳染', v: '1 層' });
                    break;

                case 'meridian':
                    rows.push({ k: '標記敵人', v: enemyCount('meridian') + ' 名', hl: true });
                    rows.push({ k: '最高層數', v: enemyMaxStack('meridian') + ' / ' + cnt(p.max) });
                    rows.push({ k: '每層命中', v: pct(p.hit) });
                    rows.push({ k: '每層無視閃避', v: '5%' });
                    rows.push({ k: '滿層破甲', v: pct(p.pen) });
                    break;

                case 'frost':
                    rows.push({ k: '受冰敵人', v: enemyCount('frost') + ' 名', hl: true });
                    rows.push({ k: '凍結敵人', v: enemyCount('frozen') + ' 名' });
                    rows.push({ k: '每層減速', v: pct(p.slow) });
                    rows.push({ k: '凍結暴擊', v: pct(p.critBonus) });
                    rows.push({ k: '凍結回合', v: cnt(p.freezeTurns) + ' 回合' });
                    break;

                case 'drain':
                    rows.push({ k: '吸取比例', v: pct(p.drain), hl: true });
                    rows.push({ k: '本場累計吸取', v: Math.floor(b.drainTotal || 0) });
                    rows.push({ k: '敵方內力總量', v: Math.floor(enemyTotalMp()) });
                    rows.push({ k: '高內力增傷', v: pct(p.dmgBonus) });
                    break;

                case 'reflect':
                    rows.push({ k: '彼力存量', v: Math.floor(b.force || 0), hl: true });
                    rows.push({ k: '彼力上限', v: pct(p.cap) });
                    rows.push({ k: '返還倍率', v: '×' + (Math.round(p.mult * 100) / 100).toFixed(2) });
                    break;

                case 'trap':
                    rows.push({ k: '機關存量', v: (b.trap || 0) + ' / ' + cnt(p.max), hl: true });
                    rows.push({ k: '每枚引爆', v: pct(p.dmg) });
                    rows.push({ k: '群攻增幅', v: pct(p.aoeBonus) + '/枚' });
                    break;

                case 'formation':
                    rows.push({ k: '當前陣門', v: (def.GATES[(b.gate || 0)] || '景門'), hl: true });
                    rows.push({ k: '陣法強度', v: '×' + (Math.round(p.power * 100) / 100).toFixed(2) });
                    rows.push({ k: '景門效果', v: '攻擊 +' + Math.round(12 * p.power) + '%' });
                    rows.push({ k: '死門效果', v: '防禦 +' + Math.round(15 * p.power) + '%' });
                    rows.push({ k: '驚門效果', v: '暴擊 +' + Math.round(10 * p.power) + '%' });
                    rows.push({ k: '開門效果', v: '雙回 ' + Math.round(6 * p.power) + '%' });
                    break;

                case 'element':
                    rows.push({ k: '當前五行', v: (def.ELEMENTS[(b.elem || 0)] || '金'), hl: true });
                    rows.push({ k: '額外屬攻', v: '×' + (Math.round(p.extra * 100) / 100).toFixed(2) });
                    break;

                case 'yinyang':
                    var isYang = ((b.yyTurn || 1) % 2 === 1);
                    rows.push({ k: '當前模式', v: isYang ? '陽刀' : '陰劍', hl: true });
                    rows.push({ k: '陽刀攻擊', v: pct(p.atkUp) });
                    rows.push({ k: '陽刀減防', v: pct(p.atkDown) });
                    rows.push({ k: '陰劍防禦', v: pct(p.defUp) });
                    rows.push({ k: '陰劍吸血', v: pct(p.heal) });
                    break;

                case 'fury':
                    var fs = this.persistent(c, 'fury') || 0;
                    rows.push({ k: '血怒層數', v: fs + ' / ' + cnt(p.max), hl: true });
                    rows.push({ k: '每層攻擊', v: pct(p.perStack) });
                    rows.push({ k: '殘血增幅', v: pct(p.lowHpBonus) });
                    rows.push({ k: '擊殺回血', v: pct(p.killHeal) });
                    break;

                default:
                    rows.push({ k: '—', v: '無' });
            }

            return {
                name: meta ? meta.name : '門派特色',
                icon: meta ? meta.icon : '⚡',
                color: meta ? meta.color : '#94a3b8',
                rows: rows
            };
        }

        registerHooks() {
            var self = this;
            var combat = this.app.combatSys;
            if (!combat) return;

            combat.registerPlugin({
                onBattleStart: function () { self.resetBattleState(); },
                onAfterPlayerAttack: function (core, payload) { self.processPlayerAttack(core, payload); },
                onAfterEnemyAttack: function (core, payload) { self.processEnemyAttack(core, payload); }
            });

            var affixSys = this.app.affixSys;
            if (affixSys && !affixSys.__sectHooked) {
                affixSys.__sectHooked = true;

                var origTurnEnd = affixSys.onEnemyTurnEnd.bind(affixSys);
                affixSys.onEnemyTurnEnd = function (enemy) {
                    origTurnEnd(enemy);
                    self.processEnemyTurnEnd(combat, enemy);
                };

                var origDeath = affixSys.onEnemyDeath.bind(affixSys);
                affixSys.onEnemyDeath = function (enemy, partyMembers) {
                    origDeath(enemy, partyMembers);
                    self.processEnemyDeath(combat, enemy);
                };
            }
        }

        resetBattleState() {
            var root = this.app.charSys.rootState;
            (root.roster || []).forEach(function (c) { c._battle = {}; });
            this._paramCache = {};
            this._cacheSig = {};
            ((this.app.combatSys && this.app.combatSys.enemies) || []).forEach(function (e) { e._sect = {}; });
        }

        processPlayerAttack(core, payload) {
            if (!payload || !payload.charObj) return;
            var c = payload.charObj;
            var def = this.getDef(c.sect);
            if (!def) return;
            var p = this.getParams(c);
            if (!p) return;

            var target = (core.enemies || []).filter(function (e) { return e && e.currentHp > 0; })[0];
            if (!target) return;

            var log = '';

            if (typeof def.onTurnStart === 'function' && !payload.isTwinEcho) {
                var turnKey = (core._turnCounter || 0);
                var b = this.battle(c);
                if (b.lastTurnKey !== turnKey) {
                    b.lastTurnKey = turnKey;
                    def.onTurnStart(this, core, c, p);
                }
            }

            var art = window.HY.Data.MARTIAL_ARTS[payload.skillId];
            if (art && art.isAoe && typeof def.onAoeAttack === 'function') {
                var allTargets = (core.enemies || []).filter(function (e) { return e && e.currentHp > 0; });
                log += def.onAoeAttack(this, core, c, allTargets, p) || '';
            }

            if (typeof def.onAttack === 'function') {
                log += def.onAttack(this, core, c, target, payload.totalDealt || 0, p) || '';
            }

            if (log) {
                var meta = this.getFeatMeta(c.sect);
                core.log('⚡ [' + (meta ? meta.name : '門派特色') + '] 【' + c.name + '】' + log, 'combat');
            }

            core.syncCurrentEnemyPointer();
            if (!core.currentEnemy) core.handleVictory();
        }

        processEnemyAttack(core, payload) {
            if (!payload || !payload.targetMember || !payload.enemy) return;
            var c = payload.targetMember;

            if (c.currentHp <= 0) return;

            var def = this.getDef(c.sect);
            if (!def) return;
            var p = this.getParams(c);
            if (!p) return;

            if (typeof def.onStruck === 'function') {
                var saved = def.onStruck(this, core, c, payload.enemy, payload.enemyDmg || 0, p);
                if (saved > 0 && c.currentHp > 0) {
                    var meta = this.getFeatMeta(c.sect);
                    core.log('⚡ [' + (meta ? meta.name : '門派特色') + '] 【' + c.name + '】化解 ' + saved + ' 點傷害', 'combat');
                }
            }
        }

        processEnemyTurnEnd(core, enemy) {
            if (!enemy || enemy.currentHp <= 0) return;
            var self = this;
            var party = this.app.partySys ? this.app.partySys.getPartyMembers() : [];
            party.forEach(function (c) {
                var def = self.getDef(c.sect);
                if (!def || typeof def.onTurnEnd !== 'function') return;
                var p = self.getParams(c);
                if (!p) return;
                var log = def.onTurnEnd(self, core, enemy, p) || '';
                if (log) core.log('⚡ 【' + c.name + '】' + log, 'combat');
            });
        }

        processEnemyDeath(core, enemy) {
            if (!enemy) return;
            var self = this;
            var party = this.app.partySys ? this.app.partySys.getPartyMembers() : [];
            party.forEach(function (c) {
                var def = self.getDef(c.sect);
                if (!def || typeof def.onKill !== 'function') return;
                var p = self.getParams(c);
                if (!p) return;
                var log = def.onKill(self, core, c, enemy, p) || '';
                if (log) core.log('⚡ 【' + c.name + '】' + log, 'combat');
            });
        }

        notifyHeal(charObj, amount) {
            var def = this.getDef(charObj && charObj.sect);
            if (!def || typeof def.onHeal !== 'function') return amount;
            var p = this.getParams(charObj);
            if (!p) return amount;
            var extra = def.onHeal(this, this.app.combatSys, charObj, amount, p);
            if (extra > 0) charObj.currentHp = Math.min(this.maxHpOf(charObj), charObj.currentHp + extra);
            return amount + extra;
        }
    }

    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            var game = window.HY.game;
            if (game && !game.sectFeatSys && window.HY.SectFeatureSystem) {
                game.sectFeatSys = new window.HY.SectFeatureSystem(game);
            }
            if (game && typeof game.renderAll === 'function') game.renderAll();
        }, 160);
    });

    window.HY.SectFeatureSystem = SectFeatureSystem;

    // 供其他模組取得恆等修正（無 sectFeatSys 時的安全回退）
    window.HY.SectFeatureSystem.IDENTITY_ATTACKER = IDENTITY_ATTACKER;
    window.HY.SectFeatureSystem.IDENTITY_DEFENDER = IDENTITY_DEFENDER;
})();