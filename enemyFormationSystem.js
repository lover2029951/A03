// js/enemyFormationSystem.js  (v53)
// 敵方陣法系統
//
// v53 修正（收尾整理）：
//   ⭐ 更正 v52 的誤導註解。
//      v52 曾寫「改為把資料交給 uiDexAtb 渲染於『敵方陣營』正下方」，
//      但 uiDexAtb.js v53 的實作是「內嵌於標題後方的徽章（.bf-inline）」。
//      本檔僅負責 notifyUI()，實際渲染方式由 uiDexAtb 決定。
window.HY = window.HY || {};

(function () {
    class EnemyFormationSystem {
        constructor(app) {
            this.app = app;
            this.current = null;   // { id, formation, pattern, req }
            this.registerHooks();
        }

        // 通知 UI 重繪陣法徽章
        //   實際渲染由 uiDexAtb.renderFormationBlocks() 決定
        //   （v53 起為「內嵌於『🚩 我方陣營』與『⚔️ 敵方陣營』標題後方的 .bf-inline 徽章」）
        notifyUI() {
            var ui = window.HY.uiDexAtb;
            if (ui && typeof ui.renderFormationBlocks === 'function') {
                ui.renderFormationBlocks();
                return;
            }
            setTimeout(function () {
                var ui2 = window.HY.uiDexAtb;
                if (ui2 && typeof ui2.renderFormationBlocks === 'function') ui2.renderFormationBlocks();
            }, 60);
        }

        clearFormation() {
            this.current = null;
            this.notifyUI();
        }

        registerHooks() {
            var self = this;
            var combat = this.app.combatSys;
            if (!combat) return;

            combat.registerPlugin({
                onBattleStart: function (core, payload) { self.onBattleStart(core, payload); },
                onVictory: function () { self.clearFormation(); },
                onDefeat: function () { self.clearFormation(); }
            });
        }

        onBattleStart(core, payload) {
            var Data = window.HY.Data;
            var enemies = (payload && payload.enemies) || [];
            if (!enemies.length || !Data || !Data.XIANXIA_FORMATIONS) {
                this.clearFormation();
                return;
            }

            var count = enemies.length;
            var allowedTiers;
            if (count >= 5)       allowedTiers = [1, 2, 3];
            else if (count === 4) allowedTiers = [1, 2];
            else                  allowedTiers = [1];

            var pool = Data.XIANXIA_FORMATIONS.filter(function (f) {
                return allowedTiers.indexOf(f.tier) !== -1;
            });
            if (pool.length === 0) { this.clearFormation(); return; }

            var f = pool[Math.floor(Math.random() * pool.length)];

            var assign = (this.app.partySys && this.app.partySys.getAssignment)
                ? this.app.partySys.getAssignment()
                : Data.buildFormationAssignment(1);
            var pat = assign[f.id] || null;
            var req = pat ? pat.req : null;

            this.current = { id: f.id, formation: f, pattern: pat, req: req };

            if (req) this.assignEnemyRoots(enemies, req);
            this.applyFormationBonus(enemies, f.bonus);

            var elemSys = this.app.elementSys || (window.HY.game && window.HY.game.elementSys);
            if (elemSys && typeof elemSys.initEnemyElements === 'function') {
                enemies.forEach(function (e) {
                    e.elAtk = null;
                    e.elDef = null;
                    elemSys.initEnemyElements(e);
                });
            }

            var reqText = Data.formatPatternReq ? Data.formatPatternReq(req) : '';
            var bonusText = Data.formatFormationBonus ? Data.formatFormationBonus(f.bonus) : '';
            core.log('👹 【敵方陣法】' + f.icon + ' ' + f.name +
                '（靈根構成：' + reqText + '）' + (bonusText ? ' ｜ ' + bonusText : ''), 'combat');

            this.notifyUI();
        }

        assignEnemyRoots(enemies, req) {
            var Data = window.HY.Data;
            var ring = (Data && Data.ELEMENT_RING) ? Data.ELEMENT_RING : [];
            if (ring.length === 0) return;

            var pool = [];
            Object.keys(req).forEach(function (el) {
                for (var i = 0; i < req[el]; i++) pool.push(el);
            });

            for (var i = pool.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
            }

            enemies.forEach(function (e, idx) {
                if (idx < pool.length) {
                    e.spiritRoot = pool[idx];
                } else {
                    e.spiritRoot = ring[Math.floor(Math.random() * ring.length)];
                }
            });
        }

        applyFormationBonus(enemies, bonus) {
            if (!bonus) return;
            enemies.forEach(function (e) {
                if (bonus.atkPct)  e.atk = Math.max(1, Math.floor(e.atk * (1 + bonus.atkPct)));
                if (bonus.defPct)  e.def = Math.max(0, Math.floor(e.def * (1 + bonus.defPct)));
                if (bonus.maxHpPct) {
                    var oldMax = e.maxHp;
                    e.maxHp = Math.max(10, Math.floor(e.maxHp * (1 + bonus.maxHpPct)));
                    if (e.currentHp > 0 && oldMax > 0) {
                        e.currentHp = Math.min(e.maxHp, Math.floor(e.currentHp * (e.maxHp / oldMax)));
                    } else {
                        e.currentHp = e.maxHp;
                    }
                }
                if (bonus.maxMpPct && typeof e.maxMp === 'number') {
                    var oldMp = e.maxMp;
                    e.maxMp = Math.max(1, Math.floor(e.maxMp * (1 + bonus.maxMpPct)));
                    if (typeof e.currentMp === 'number' && oldMp > 0) {
                        e.currentMp = Math.min(e.maxMp, Math.floor(e.currentMp * (e.maxMp / oldMp)));
                    }
                }
                if (bonus.hitPct)      e.hit     = (e.hit || 90) + Math.floor((e.hit || 90) * bonus.hitPct);
                if (bonus.evaPct)      e.eva     = (e.eva || 5) + Math.floor((e.eva || 5) * bonus.evaPct);
                if (bonus.critPct)     e.crit    = (e.crit || 5) + Math.floor((e.crit || 5) * bonus.critPct);
                if (bonus.critResPct)  e.critRes = (e.critRes || 0) + Math.floor((e.critRes || 0) * bonus.critResPct);
            });
        }
    }

    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            var game = window.HY.game;
            if (game && !game.enemyFormationSys && window.HY.EnemyFormationSystem) {
                game.enemyFormationSys = new window.HY.EnemyFormationSystem(game);
            }
        }, 75);
    });

    window.HY.EnemyFormationSystem = EnemyFormationSystem;
})();