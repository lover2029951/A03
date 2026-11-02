// js/uiDexAtb.js  (v56)
// 五維加點、折疊面板、5v5 固定戰鬥欄
//
// v56 新增：
//   ⭐ 集氣條「⚡ 進度」之前插入「⚔️ 戰力」徽章（我方琥珀色 / 敵方紅色）
//   ⭐ 戰力每 tick 更新（受 Buff / 裝備影響即時反映）
//   ⭐ 10000 以上自動轉 K / M / B
window.HY = window.HY || {};

(function () {
    var SLOT_MIN_H = 132;
    var LIST_GAP   = 6;

    class UIDexAtb {
        constructor(app) {
            this.app = app;
            this.injectDexStatAndCollapsiblePanelsDOM();
            this.lockBattleArenaMaxFixedLayout();
            this.hookUIRenders();
        }

        // ══════════════════════════════════════════
        // 左欄面板
        // ══════════════════════════════════════════
        injectDexStatAndCollapsiblePanelsDOM() {
            var charPanel = document.getElementById('character-panel');
            if (!charPanel) return;

            // ⭐ v58：已移除「靈敏 (dex)」欄位與「+靈敏」按鈕
            var conEl = document.getElementById('stat-con');

            var atkEl = document.getElementById('stat-atk');
            if (atkEl && !document.getElementById('stat-atkspd')) {
                var combatGrid = atkEl.closest('.stat-grid');
                if (combatGrid) {
                    var spdDiv = document.createElement('div');
                    spdDiv.style.gridColumn = 'span 2';
                    spdDiv.title = '影響戰鬥中的出招集氣條速度，攻速越快集氣越快';
                    spdDiv.innerHTML = '⚡ 出手攻擊速度 (影響集氣條)：<strong id="stat-atkspd" style="color:#00e5ff;">104</strong>';
                    combatGrid.prepend(spdDiv);
                }
            }

            var sectEl = document.getElementById('char-sect');
            if (sectEl && !document.getElementById('active-sect-feature')) {
                var group = sectEl.closest('.stat-group');
                if (group) {
                    var featRow = document.createElement('div');
                    featRow.className = 'stat-row';
                    featRow.innerHTML = '<span>門派特色：</span><strong id="active-sect-feature" style="color:#64748b;">無門派特色</strong>';
                    var sectRow = sectEl.closest('.stat-row');
                    if (sectRow && sectRow.parentNode === group) {
                        group.insertBefore(featRow, sectRow.nextSibling);
                    } else {
                        group.appendChild(featRow);
                    }
                }
            }

            var legacyRoot = document.getElementById('char-spirit-root');
            if (legacyRoot) {
                var lr = legacyRoot.closest ? legacyRoot.closest('.stat-row') : null;
                if (lr && lr.parentNode) lr.parentNode.removeChild(lr);
                else if (legacyRoot.parentNode) legacyRoot.parentNode.removeChild(legacyRoot);
            }

            if (!document.getElementById('char-details-roots')) {
                var h3List = Array.from(charPanel.querySelectorAll('h3'));

                var h3Root = h3List[0];
                if (h3Root && conEl) {
                    var rootGrid = conEl.closest('.stat-grid');
                    var freeBox = document.getElementById('free-points-box');
                    var detailsRoot = this.createCollapsibleBox('char-details-roots', '🧬 先天四維根骨 (點擊展開/收合)', '#00e5ff', true);
                    h3Root.parentNode.insertBefore(detailsRoot, h3Root);
                    h3Root.remove();
                    if (rootGrid) detailsRoot.querySelector('.details-body').appendChild(rootGrid);
                    if (freeBox) detailsRoot.querySelector('.details-body').appendChild(freeBox);
                }

                var h3Combat = h3List[1];
                if (h3Combat && atkEl) {
                    var cGrid = atkEl.closest('.stat-grid');
                    var detailsCombat = this.createCollapsibleBox('char-details-combat', '⚔️ 戰鬥與抗性面板 (點擊展開/收合)', '#f87171', true);
                    h3Combat.parentNode.insertBefore(detailsCombat, h3Combat);
                    h3Combat.remove();
                    if (cGrid) {
                        detailsCombat.querySelector('.details-body').appendChild(cGrid);
                        this.appendElementRows(cGrid);
                    }
                }

                var h3Res = h3List[2];
                if (h3Res) {
                    var resBox = charPanel.querySelector('.resource-box');
                    var eqBox = charPanel.querySelector('.equip-box');
                    var detailsRes = this.createCollapsibleBox('char-details-resource', '💎 共享資源與配置 (點擊展開/收合)', '#fbbf24', true);
                    h3Res.parentNode.insertBefore(detailsRes, h3Res);
                    h3Res.remove();
                    if (resBox) detailsRes.querySelector('.details-body').appendChild(resBox);
                    if (eqBox) detailsRes.querySelector('.details-body').appendChild(eqBox);
                }
            }
        }

        appendElementRows(cGrid) {
            if (!cGrid || document.getElementById('stat-elem-block')) return;

            var block = document.createElement('div');
            block.id = 'stat-elem-block';
            block.style.cssText = 'grid-column: span 2; border-top:1px dashed #334155; margin-top:6px; padding-top:7px;';

            block.innerHTML =
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                    '<span style="color:#fb923c; font-weight:bold; font-size:0.78rem;">⚔️ 八元素攻擊</span>' +
                    '<span style="color:#94a3b8; font-size:0.72rem;">總 <strong id="stat-elem-atk-total" style="color:#fb923c;">0</strong></span>' +
                '</div>' +
                '<div id="stat-elem-atk-grid" style="display:flex; flex-wrap:wrap; gap:3px; margin-bottom:7px;"></div>' +
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                    '<span style="color:#2dd4bf; font-weight:bold; font-size:0.78rem;">🛡️ 八元素抗性</span>' +
                    '<span style="color:#94a3b8; font-size:0.72rem;">總 <strong id="stat-elem-def-total" style="color:#2dd4bf;">0</strong></span>' +
                '</div>' +
                '<div id="stat-elem-def-grid" style="display:flex; flex-wrap:wrap; gap:3px;"></div>';

            cGrid.appendChild(block);
        }

        updateElementRows() {
            var es = window.HY.game && window.HY.game.elementSys;
            var st = this.app.charSys.state;
            if (!es || !st) return;

            var s = es.getSummary(st);
            var atkEl = document.getElementById('stat-elem-atk-grid');
            var defEl = document.getElementById('stat-elem-def-grid');
            var atkTotalEl = document.getElementById('stat-elem-atk-total');
            var defTotalEl = document.getElementById('stat-elem-def-total');
            if (!atkEl || !defEl) return;

            function chips(rows, suffix) {
                if (!rows || rows.length === 0) {
                    return '<span style="color:#64748b; font-size:0.74rem;">—</span>';
                }
                return rows.map(function (r) {
                    return '<span title="' + r.name + '元素' + (suffix === '攻' ? '攻擊' : '抗性') + '" ' +
                        'style="background:#18202c; border:1px solid ' + r.color + '; color:' + r.color + '; ' +
                        'padding:1px 6px; border-radius:3px; font-size:0.74rem; white-space:nowrap; line-height:1.5;">' +
                        r.icon + r.name + suffix + ' <strong style="color:#fff;">' + r.val + '</strong>' +
                    '</span>';
                }).join('');
            }

            atkEl.innerHTML = chips(s.atkRows, '攻');
            defEl.innerHTML = chips(s.defRows, '抗');
            if (atkTotalEl) atkTotalEl.textContent = s.totalAtk;
            if (defTotalEl) defTotalEl.textContent = s.totalDef;
        }

        createCollapsibleBox(id, titleText, borderColor, defaultOpen) {
            var details = document.createElement('details');
            details.id = id;
            if (defaultOpen) details.open = true;
            details.style.cssText = 'background:#121822; border:1px solid ' + borderColor + '; border-radius:6px; padding:7px 10px; margin-top:8px;';
            details.innerHTML =
                '<summary style="cursor:pointer; color:' + borderColor + '; font-weight:bold; font-size:0.88rem; user-select:none;">' + titleText + '</summary>' +
                '<div class="details-body" style="margin-top:8px;"></div>';
            return details;
        }

        // ══════════════════════════════════════════
        // 戰鬥面板樣式
        // ══════════════════════════════════════════
        lockBattleArenaMaxFixedLayout() {
            var style = document.createElement('style');
            style.id = 'hy-arena-fixed-style';
            style.innerHTML =
                '#battle-arena { display: block !important; }' +
                '#enemy-list { display: block !important; }' +
                '#battle-arena { margin-bottom: 14px; border: 1px solid #00e5ff; background: #111722; padding: 12px; border-radius: 8px; }' +
                '#battle-arena .fighter-cards { display: grid !important; grid-template-columns: 1fr 44px 1fr; align-items: start; gap: 10px; margin-bottom: 10px; }' +
                '#battle-arena .fighter-card { width: 100% !important; padding: 10px !important; display: flex; flex-direction: column; }' +
                '#battle-party-list, #battle-enemy-list-ui { display: flex; flex-direction: column; gap: ' + LIST_GAP + 'px; }' +
                '.group-alive { font-weight: normal; font-size: 0.86em; opacity: 0.92; white-space: nowrap; }' +

                '.fixed-unit-slot {' +
                    'height: auto !important;' +
                    'min-height: ' + SLOT_MIN_H + 'px !important;' +
                    'max-height: none !important;' +
                    'flex: 0 0 auto !important;' +
                    'background: #121822; border-radius: 4px; padding: 5px 7px;' +
                    'display: flex; flex-direction: column;' +
                    'justify-content: flex-start;' +
                    'gap: 2px;' +
                    'overflow: hidden; box-sizing: border-box;' +
                    'transition: opacity 0.18s linear;' +
                '}' +

                '.unit-head {' +
                    'position: relative; height: 22px; border-radius: 3px; overflow: hidden;' +
                    'border: 1px solid #78350f; background: #060a12;' +
                    'flex-shrink: 0; box-sizing: border-box;' +
                    'transition: border-color 0.15s, box-shadow 0.15s;' +
                '}' +
                '.unit-head .atb-fill,' +
                '.unit-head.enemy .atb-fill {' +
                    'position: absolute; top: 0; left: 0; bottom: 0; width: 0%;' +
                    'background: linear-gradient(90deg, #b45309 0%, #f59e0b 55%, #fbbf24 100%);' +
                    'box-shadow: 0 0 8px rgba(251, 191, 36, 0.55);' +
                    'transition: width 0.08s linear;' +
                '}' +
                '.unit-head.enemy { border-color: #78350f; }' +

                '.unit-head .atb-tx {' +
                    'position: absolute; inset: 0; z-index: 2;' +
                    'display: flex; align-items: center; justify-content: space-between;' +
                    'padding: 0 5px; gap: 4px;' +
                    'font-size: 0.74rem; font-weight: bold; color: #ffffff;' +
                    'text-shadow: 0 1px 2px #000, 0 0 4px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.75);' +
                    'white-space: nowrap; pointer-events: none; box-sizing: border-box;' +
                    'line-height: 1;' +
                '}' +
                '.unit-head .atb-tx .nm { overflow: hidden; text-overflow: ellipsis; flex: 1 1 auto; min-width: 0; letter-spacing: 0.2px; }' +

                /* ⭐ 戰力徽章（位於 ⚡ 之前） */
                '.unit-head .atb-tx .pw {' +
                    'flex: 0 0 auto;' +
                    'font-size: 0.66rem;' +
                    'font-weight: bold;' +
                    'padding: 0 4px;' +
                    'border-radius: 2px;' +
                    'background: rgba(0,0,0,0.58);' +
                    'border: 1px solid rgba(251,191,36,0.55);' +
                    'color: #fbbf24;' +
                    'margin-right: 3px;' +
                    'text-shadow: 0 1px 2px #000;' +
                    'white-space: nowrap;' +
                    'letter-spacing: 0.2px;' +
                    'line-height: 1.35;' +
                '}' +
                '.unit-head.enemy .atb-tx .pw {' +
                    'border-color: rgba(248,113,113,0.6);' +
                    'color: #fca5a5;' +
                '}' +

                /* ⭐ v57：固定寬度 + 右對齊，避免數字變動時版面位移 */
                '.unit-head .atb-tx .pc {' +
                    'flex: 0 0 auto;' +
                    'color: #e0f2fe;' +
                    'display: inline-block;' +
                    'width: 4.2em;' +                        /* 固定寬度：容納「⚡ 99%」+ emoji 餘裕 */
                    'text-align: right;' +                   /* 右對齊：數字與 % 靠右對齊 */
                    'font-variant-numeric: tabular-nums;' +  /* 等寬數字：1 與 8 同寬 */
                    'box-sizing: border-box;' +
                '}' +
                '.unit-head.full,' +
                '.unit-head.enemy.full {' +
                    'border-color: #fbbf24;' +
                    'box-shadow: 0 0 12px rgba(251, 191, 36, 0.75);' +
                '}' +
                '.unit-head.full .atb-tx .pc,' +
                '.unit-head.enemy.full .atb-tx .pc {' +
                    'color: #fef9c3;' +
                    'text-shadow: 0 1px 2px #000, 0 0 6px rgba(0,0,0,0.9);' +
                '}' +
                '.unit-head .atb-tx .rar { display: inline-block; padding: 0 4px; margin-right: 3px; border-radius: 2px; background: rgba(0,0,0,0.62); font-weight: bold; }' +
                '.unit-head .atb-tx .root { display: inline-block; padding: 0 4px; margin: 0 3px; border-radius: 2px; background: rgba(0,0,0,0.60); font-weight: bold; font-size: 0.70rem; text-shadow: 0 1px 2px #000; }' +
                '.unit-head.empty { border-color: #1e293b !important; }' +
                '.unit-head.empty .atb-fill { background: none; box-shadow: none; }' +
                '.unit-head.empty .atb-tx { color: #64748b; text-shadow: none; }' +
                '.unit-head.empty .atb-tx .pc { color: #475569; }' +

                '.hpmp-bar { position: relative; height: 18px; border-radius: 3px; overflow: hidden; border: 1px solid #334155; background: #090d14; flex-shrink: 0; margin-bottom: 0; box-sizing: border-box; }' +
                '.hpmp-bar .fi { position: absolute; top: 0; left: 0; bottom: 0; width: 100%; transition: width 0.18s linear; }' +
                '.hpmp-bar.hp .fi { background: linear-gradient(90deg, #7f1d1d, #dc2626 45%, #f87171); }' +
                '.hpmp-bar.mp .fi { background: linear-gradient(90deg, #1e3a8a, #2563eb 45%, #60a5fa); }' +
                '.hpmp-bar .tx { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: bold; color: #fff; text-shadow: 0 1px 2px #000, 0 0 4px rgba(0,0,0,0.85); letter-spacing: 0.2px; pointer-events: none; white-space: nowrap; line-height: 1; }' +
                '.hpmp-bar.enemy-hp .fi { background: linear-gradient(90deg, #450a0a, #b91c1c 45%, #ef4444); }' +

                '.fixed-affix-line { height: 16px; line-height: 16px; background: rgba(0,0,0,0.45); padding: 0 5px; font-size: 0.69rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 2px; box-sizing: border-box; flex-shrink: 0; }' +

                '.feat-status-table { display: grid; grid-template-columns: auto 1fr; gap: 0.5px 5px; background: rgba(0,0,0,0.40); border-radius: 3px; padding: 2px 5px; font-size: 0.66rem; line-height: 1.15; border-left: 2px solid #334155; box-sizing: border-box; flex-shrink: 0; }' +
                '.feat-status-table .fk { color: #94a3b8; white-space: nowrap; }' +
                '.feat-status-table .fv { color: #e2e8f0; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; justify-self: end; }' +
                '.feat-status-table .fv.hl { color: #fbbf24; }' +

                '.bf-inline {' +
                    'display: inline-block; margin-left: 6px; padding: 0 6px;' +
                    'border-radius: 3px; font-size: 0.78rem; font-weight: bold;' +
                    'white-space: nowrap; vertical-align: middle;' +
                    'background: rgba(0,0,0,0.38); line-height: 1.5;' +
                '}' +

                '.atb-bar-bg { background: #090d14; height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid #334155; margin: 2px 0; flex-shrink: 0; }' +
                '.atb-bar-fill { height: 100%; background: linear-gradient(90deg, #b45309, #fbbf24); transition: width 0.08s linear; }';

            document.head.appendChild(style);
        }

        hookUIRenders() {
            var self = this;
            var uiChar = this.app.uiCharParty;
            var uiCombat = this.app.uiCombatExplore;

            if (uiChar) {
                var origRenderChar = uiChar.renderCharacterPanel.bind(uiChar);
                uiChar.renderCharacterPanel = function () {
                    origRenderChar();
                    var d = self.app.charSys.getDerivedStats();
                    // ⭐ v58：已移除 stat-dex 更新（靈敏屬性已刪除）
                    var spdEl = document.getElementById('stat-atkspd');
                    if (spdEl) spdEl.textContent = d.atkSpd || 100;
                    self.updateElementRows();
                };
            }

            if (uiCombat) {
                var origRenderExplore = uiCombat.renderExploreAndCombat.bind(uiCombat);
                uiCombat.renderExploreAndCombat = function () {
                    origRenderExplore();
                    var arenaEl = document.getElementById('battle-arena');
                    var enemyListEl = document.getElementById('enemy-list');
                    if (arenaEl) arenaEl.classList.remove('hidden');
                    if (enemyListEl) enemyListEl.classList.remove('hidden');
                    self.renderFixedMaxBattleArena();
                };
            }
        }

        // ══════════════════════════════════════════
        // 標題結構
        // ══════════════════════════════════════════
        cleanupLegacyFormationBoxes() {
            ['battle-formation-ally', 'battle-formation-enemy'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el && el.parentNode) el.parentNode.removeChild(el);
            });
        }

        ensureTitleIds() {
            if (!document.getElementById('battle-party-group-title')) {
                var list = document.getElementById('battle-party-list');
                if (list) {
                    var prev = list.previousElementSibling;
                    while (prev && prev.tagName !== 'H4') prev = prev.previousElementSibling;
                    if (prev) prev.id = 'battle-party-group-title';
                }
            }
        }

        getAlivePartyCounts() {
            var party = (this.app.partySys && typeof this.app.partySys.getPartyMembers === 'function')
                ? this.app.partySys.getPartyMembers() : [];
            var alive = party.filter(function (m) { return m && m.currentHp > 0; }).length;
            return { alive: alive, total: party.length };
        }

        getAliveEnemyCounts() {
            var list = (this.app.combatSys && this.app.combatSys.enemies) || [];
            var alive = list.filter(function (e) { return e && e.currentHp > 0; }).length;
            return { alive: alive, total: list.length };
        }

        setGroupTitle(titleEl, label, aliveText, badgeInfo) {
            if (!titleEl) return;

            var aliveSpan = titleEl.querySelector('.group-alive');
            if (!aliveSpan) {
                titleEl.textContent = '';
                titleEl.appendChild(document.createTextNode(label));
                aliveSpan = document.createElement('span');
                aliveSpan.className = 'group-alive';
                titleEl.appendChild(aliveSpan);
            }
            aliveSpan.textContent = aliveText || '';

            var oldBadge = titleEl.querySelector('.bf-inline');
            if (oldBadge && oldBadge.parentNode) oldBadge.parentNode.removeChild(oldBadge);

            if (badgeInfo && badgeInfo.name) {
                var span = document.createElement('span');
                span.className = 'bf-inline';
                span.style.border = '1px solid ' + (badgeInfo.color || '#94a3b8');
                span.style.color = badgeInfo.color || '#94a3b8';
                span.textContent = (badgeInfo.icon ? badgeInfo.icon + ' ' : '') + badgeInfo.name;
                titleEl.appendChild(span);
            }
        }

        updateGroupAliveSpan(titleId, text) {
            var titleEl = document.getElementById(titleId);
            if (!titleEl) return;
            var span = titleEl.querySelector('.group-alive');
            if (span) span.textContent = text;
        }

        buildFormationBadgeInfo(formation) {
            if (!formation) return null;
            if (!formation.bonus || Object.keys(formation.bonus).length === 0) return null;
            return {
                icon: formation.icon || '',
                name: formation.name || '',
                color: formation.color || '#94a3b8'
            };
        }

        renderFormationBlocks() {
            this.cleanupLegacyFormationBoxes();
            this.ensureTitleIds();

            var allyTitle = document.getElementById('battle-party-group-title');
            var enemyTitle = document.getElementById('battle-enemy-group-title');

            var combat = this.app.combatSys;
            var inBattle = !!(combat && combat.currentEnemy);

            var allyCounts = this.getAlivePartyCounts();
            var enemyCounts = this.getAliveEnemyCounts();

            var allyForm = (this.app.partySys && typeof this.app.partySys.getActiveFormation === 'function')
                ? this.app.partySys.getActiveFormation() : null;

            this.setGroupTitle(
                allyTitle,
                '🚩 我方陣營',
                inBattle
                    ? ' (存活：' + allyCounts.alive + ' / ' + allyCounts.total + ')'
                    : ' (待命中)',
                this.buildFormationBadgeInfo(allyForm)
            );

            var efSys = window.HY.game && window.HY.game.enemyFormationSys;
            var eCur = efSys && efSys.current;

            this.setGroupTitle(
                enemyTitle,
                '⚔️ 敵方陣營',
                inBattle
                    ? ' (存活：' + enemyCounts.alive + ' / ' + enemyCounts.total + ')'
                    : ' (待命中 — 點擊上方對手開始交鋒)',
                (eCur && eCur.formation) ? this.buildFormationBadgeInfo(eCur.formation) : null
            );
        }

        buildRootBadge(sectObj, rootId, rootLv, compact) {
            var Data = window.HY.Data;
            if (!rootId || !Data || !Data.SPIRIT_ROOTS || !Data.SPIRIT_ROOTS[rootId]) return '';
            var r = Data.SPIRIT_ROOTS[rootId];
            var label = compact
                ? (r.icon + r.shortName + (rootLv || 1))
                : (r.icon + r.name + ' Lv.' + (rootLv || 1));
            return '<span class="root" style="color:' + r.color + ';">[' + label + ']</span>';
        }

        // ══════════════════════════════════════════
        // ⭐ v56：戰力 helper
        // ══════════════════════════════════════════

        calcUnitPower(rawStats) {
            var cs = this.app && this.app.charSys;
            if (cs && typeof cs.getPowerScore === 'function') {
                return cs.getPowerScore(rawStats);
            }
            // 後備：charSys 未就緒時的最小實作
            var st = rawStats || {};
            var num = function (v) { return (typeof v === 'number' && !isNaN(v)) ? v : 0; };
            return Math.max(1, Math.floor(4 * (
                num(st.atk) * 5 + num(st.def) * 3 + num(st.maxHp) * 0.2 + num(st.maxMp) * 0.1 +
                num(st.hit) * 2 + num(st.eva) * 2 + num(st.crit) * 3 + num(st.critRes) * 3
            )));
        }

        // 10000 以上轉 K / M / B
        formatPower(n) {
            n = Math.floor(Number(n) || 0);
            if (n < 0) n = 0;
            if (n < 10000) return String(n);
            if (n < 1000000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
            if (n < 1000000000) return (n / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
            return (n / 1000000000).toFixed(2).replace(/\.?0+$/, '') + 'B';
        }

        shouldShowPower() {
            var G = window.HY && window.HY.GameConfig;
            if (G && G.power && G.power.showInBattlePanel === false) return false;
            return true;
        }

        buildUnitHead(opts) {
            var headCls = 'unit-head' + (opts.isEnemy ? ' enemy' : '') + (opts.empty ? ' empty' : '');
            var pct = Math.max(0, Math.min(100, opts.pct || 0));
            var full = (!opts.empty && pct >= 100) ? ' full' : '';

            var nameHtml = opts.empty
                ? '<span class="nm">' + opts.emptyLabel + '</span>'
                : ('<span class="nm">' +
                        (opts.rarityLabel ? '<b class="rar" style="color:' + opts.rarityColor + ';">' + opts.rarityLabel + '</b>' : '') +
                        opts.nameHtml +
                    '</span>');

            var pctText = opts.empty ? '⚡ 0%' : (pct >= 100 ? '⚡ 滿' : '⚡ ' + Math.floor(pct) + '%');

            // ⭐ v56：戰力徽章（插在 ⚡ 之前；空位不顯示）
            var pwHtml = '';
            if (!opts.empty && opts.powerId) {
                pwHtml = '<span class="pw" id="' + opts.powerId + '">⚔️' + (opts.powerText || '0') + '</span>';
            }

            return '<div class="' + headCls + full + '" id="' + opts.headId + '">' +
                '<div class="atb-fill" id="' + opts.barId + '" style="width:' + pct.toFixed(1) + '%;"></div>' +
                '<div class="atb-tx">' + nameHtml + pwHtml + '<span class="pc" id="' + opts.textId + '">' + pctText + '</span></div>' +
            '</div>';
        }

        buildHpmpBar(kind, idPrefix, cur, max, isEnemy) {
            var safeMax = (typeof max === 'number' && max > 0) ? max : 0;
            var safeCur = Math.max(0, Math.min(cur || 0, safeMax));
            var pct = safeMax > 0 ? (safeCur / safeMax) * 100 : 0;
            var isHp = (kind === 'hp');
            var cls = isHp
                ? ('hpmp-bar hp' + (isEnemy ? ' enemy-hp' : ''))
                : ('hpmp-bar mp' + (isEnemy ? ' enemy-mp' : ''));
            var label = (isHp ? '❤ ' : '💧 ') + Math.floor(safeCur).toLocaleString() + ' / ' + Math.floor(safeMax).toLocaleString();

            return '<div class="' + cls + '">' +
                '<div class="fi" id="' + idPrefix + '-fill" style="width:' + pct.toFixed(1) + '%;"></div>' +
                '<div class="tx" id="' + idPrefix + '-text">' + label + '</div>' +
            '</div>';
        }

        buildFeatTableHtml(member) {
            var featSys = window.HY.game && window.HY.game.sectFeatSys;
            var Data = window.HY.Data;
            if (!featSys || !member || !member.sect) {
                return '<div class="feat-status-table" style="border-left-color:#1e293b;"><span class="fk" style="color:#475569;">門派特色</span><span class="fv" style="color:#475569;">—</span></div>';
            }

            var table = (typeof featSys.getStatusTable === 'function') ? featSys.getStatusTable(member) : null;
            if (!table || !table.rows || table.rows.length === 0) {
                var meta0 = (Data.SECTS && Data.SECTS[member.sect]) ? Data.SECTS[member.sect].feature : null;
                return '<div class="feat-status-table" style="border-left-color:' + (meta0 ? meta0.color : '#334155') + ';">' +
                    '<span class="fk">' + (meta0 ? meta0.icon + ' ' + meta0.name : '門派特色') + '</span><span class="fv">—</span></div>';
            }

            var rowsHtml = table.rows.map(function (r) {
                return '<span class="fk">' + r.k + '</span>' +
                       '<span class="fv' + (r.hl ? ' hl' : '') + '">' + r.v + '</span>';
            }).join('');

            return '<div class="feat-status-table" style="border-left-color:' + table.color + ';">' +
                '<span class="fk" style="color:' + table.color + '; font-weight:bold;">' + table.icon + ' ' + table.name + '</span>' +
                '<span class="fv"></span>' + rowsHtml +
            '</div>';
        }

        renderFixedMaxBattleArena() {
            var app = this.app;
            var Data = window.HY.Data;
            var combat = app.combatSys;
            var arenaEl = document.getElementById('battle-arena');
            if (!arenaEl) return;

            arenaEl.classList.remove('hidden');

            var showPw = this.shouldShowPower();

            var partyBox = document.getElementById('battle-party-list');
            if (partyBox) {
                partyBox.innerHTML = '';
                var partyMembers = app.partySys.getPartyMembers();

                for (var i = 0; i < 5; i++) {
                    var m = partyMembers[i] || null;
                    var row = document.createElement('div');
                    row.className = 'fixed-unit-slot';

                    if (m) {
                        var md = app.charSys.getDerivedStatsForChar(m);
                        var isMain = m.id === app.charSys.state.id;
                        var isDead = m.currentHp <= 0;
                        var atbPct = combat.currentEnemy ? Math.min(100, Math.floor(m.atb || 0)) : 0;
                        var sectName = m.sect && Data.SECTS[m.sect] ? Data.SECTS[m.sect].name : '無門無派';
                        var xfName = m.activeXinfa && Data.XINFA[m.activeXinfa] ? Data.XINFA[m.activeXinfa].name : '未運功';
                        var rootBadge = this.buildRootBadge(m, m.spiritRoot, m.spiritRootLv, true);
                        // ⭐ v56：戰力
                        var pwVal = this.calcUnitPower(md);
                        var pwTxt = this.formatPower(pwVal);

                        row.style.borderLeft = isMain ? '3px solid #00e5ff' : '3px solid #10b981';
                        row.style.opacity = isDead ? '0.45' : '1';
                        row.innerHTML =
                            this.buildUnitHead({
                                headId: 'ally-head-' + i,
                                barId: 'ally-atb-bar-' + i,
                                textId: 'ally-atb-text-' + i,
                                powerId: showPw ? ('ally-pw-' + i) : null,
                                powerText: pwTxt,
                                pct: isDead ? 0 : atbPct, isEnemy: false, empty: false,
                                nameHtml: (i + 1) + '號：' + m.name + rootBadge +
                                    ' <span style="color:#7dd3fc;">[攻速 ' + md.atkSpd + ']</span>'
                            }) +
                            this.buildHpmpBar('hp', 'ally-hp-' + i, m.currentHp, md.maxHp, false) +
                            this.buildHpmpBar('mp', 'ally-mp-' + i, m.currentMp, md.maxMp, false) +
                            '<div class="fixed-affix-line" style="border-left:2px solid #c89d54; color:#cbd5e1;">⛩️ ' + sectName + ' ｜ 🔥 ' + xfName + '</div>' +
                            this.buildFeatTableHtml(m) +
                            '<div class="fixed-affix-line" style="border-left:2px solid #10b981; color:#94a3b8;">⚔️ 攻 ' + md.atk + ' ｜ 防 ' + md.def + ' ｜ 命 ' + md.hit + '% ｜ 閃 ' + md.eva + '% ｜ 爆 ' + md.crit + '%</div>';
                    } else {
                        row.style.borderLeft = '3px solid #1e293b';
                        row.style.opacity = '0.45';
                        row.innerHTML =
                            this.buildUnitHead({
                                headId: 'ally-head-' + i,
                                barId: 'ally-atb-bar-' + i,
                                textId: 'ally-atb-text-' + i,
                                pct: 0, isEnemy: false, empty: true,
                                emptyLabel: (i + 1) + '號戰位：(空缺待命)'
                            }) +
                            '<div class="hpmp-bar hp"><div class="fi" style="width:0%;"></div><div class="tx">❤ 0 / 0</div></div>' +
                            '<div class="hpmp-bar mp"><div class="fi" style="width:0%;"></div><div class="tx">💧 0 / 0</div></div>' +
                            '<div class="fixed-affix-line" style="color:#475569;">[未編入隊員]</div>' +
                            '<div class="feat-status-table" style="border-left-color:#1e293b;">' +
                                '<span class="fk" style="color:#475569;">門派特色</span><span class="fv" style="color:#475569;">—</span>' +
                            '</div>' +
                            '<div class="fixed-affix-line" style="color:#475569;">⚔️ — ｜ — ｜ — ｜ — ｜ —</div>';
                    }
                    partyBox.appendChild(row);
                }
            }

            var enemyBox = document.getElementById('battle-enemy-list-ui');
            if (enemyBox) {
                enemyBox.innerHTML = '';

                for (var j = 0; j < 5; j++) {
                    var e = (combat.enemies && combat.enemies[j]) ? combat.enemies[j] : null;
                    var eRow = document.createElement('div');
                    eRow.className = 'fixed-unit-slot';

                    if (e) {
                        var isDeadE = e.currentHp <= 0;
                        var eAtbPct = isDeadE ? 0 : Math.min(100, Math.floor(e.atb || 0));
                        var sList = (e.skills || []).map(function (s) { return s.name; }).join('/');

                        var eMaxMp = (typeof e.maxMp === 'number' && e.maxMp > 0)
                            ? e.maxMp
                            : Math.floor(80 + (e.lv || 1) * 25 + (e.atk || 20) * 0.15);
                        var eCurMp = (typeof e.currentMp === 'number') ? e.currentMp : eMaxMp;

                        var eRootBadge = this.buildRootBadge(e, e.spiritRoot, 1, true);
                        // ⭐ v56：敵方戰力
                        var ePwTxt = this.formatPower(this.calcUnitPower(e));

                        var es = e._sect || {};
                        var statusRows = [];
                        if (es.ignite)   statusRows.push({ k: '🔥 聖火', v: es.ignite + ' 層', hl: true });
                        if (es.poison)   statusRows.push({ k: '☠️ 劇毒', v: es.poison + ' 層', hl: true });
                        if (es.meridian) statusRows.push({ k: '👁️ 脈門', v: es.meridian + ' 層', hl: true });
                        if (es.frost)    statusRows.push({ k: '❄️ 寒冰', v: es.frost + ' 層', hl: true });
                        if (es.frozen)   statusRows.push({ k: '🧊 凍結', v: es.frozen + ' 回合', hl: true });
                        if (statusRows.length === 0) statusRows.push({ k: '異常狀態', v: '無' });

                        var statusTableHtml = '<div class="feat-status-table" style="border-left-color:#f472b6;">' +
                            '<span class="fk" style="color:#f472b6; font-weight:bold;">異常狀態表</span><span class="fv"></span>' +
                            statusRows.map(function (r) {
                                return '<span class="fk">' + r.k + '</span><span class="fv' + (r.hl ? ' hl' : '') + '">' + r.v + '</span>';
                            }).join('') +
                        '</div>';

                        eRow.style.opacity = isDeadE ? '0.45' : '1';
                        eRow.style.borderLeft = isDeadE ? '3px solid #475569' : '3px solid ' + (e.rarityColor || '#ef4444');
                        eRow.innerHTML =
                            this.buildUnitHead({
                                headId: 'enemy-head-' + j,
                                barId: 'enemy-atb-bar-' + j,
                                textId: 'enemy-atb-text-' + j,
                                powerId: showPw ? ('enemy-pw-' + j) : null,
                                powerText: ePwTxt,
                                pct: eAtbPct, isEnemy: true, empty: false,
                                rarityLabel: '[' + (e.rarityName || '普通') + ']',
                                rarityColor: (e.rarityColor || '#e2e8f0'),
                                nameHtml: e.name + eRootBadge + ' (Lv.' + e.lv + ')'
                            }) +
                            this.buildHpmpBar('hp', 'enemy-hp-' + j, e.currentHp, e.maxHp, true) +
                            this.buildHpmpBar('mp', 'enemy-mp-' + j, eCurMp, eMaxMp, true) +
                            '<div class="fixed-affix-line" style="border-left:2px solid #334155; color:#94a3b8;">絕技：' + sList + '</div>' +
                            statusTableHtml +
                            '<div class="fixed-affix-line" style="border-left:2px solid #334155; color:#64748b;">' + ((e.affixes && e.affixes.length) ? ('👹 ' + e.affixes.map(function (a) { return a.name; }).join('、')) : '無詞綴') + '</div>';
                    } else {
                        eRow.style.borderLeft = '3px solid #1e293b';
                        eRow.style.opacity = '0.45';
                        eRow.innerHTML =
                            this.buildUnitHead({
                                headId: 'enemy-head-' + j,
                                barId: 'enemy-atb-bar-' + j,
                                textId: 'enemy-atb-text-' + j,
                                pct: 0, isEnemy: true, empty: true,
                                emptyLabel: '敵陣 ' + (j + 1) + '號：(無敵人)'
                            }) +
                            '<div class="hpmp-bar hp enemy-hp"><div class="fi" style="width:0%;"></div><div class="tx">❤ 0 / 0</div></div>' +
                            '<div class="hpmp-bar mp enemy-mp"><div class="fi" style="width:0%;"></div><div class="tx">💧 0 / 0</div></div>' +
                            '<div class="fixed-affix-line" style="color:#475569;">絕技：—</div>' +
                            '<div class="feat-status-table" style="border-left-color:#1e293b;">' +
                                '<span class="fk" style="color:#475569;">異常狀態表</span><span class="fv" style="color:#475569;">—</span>' +
                            '</div>' +
                            '<div class="fixed-affix-line" style="color:#475569;">無詞綴</div>';
                    }
                    enemyBox.appendChild(eRow);
                }
            }

            this.renderFormationBlocks();

            var skillBox = document.getElementById('skill-buttons-container');
            if (skillBox && skillBox.children.length === 0) {
                Object.keys(app.charSys.state.skills).forEach(function (skillId) {
                    var art = Data.MARTIAL_ARTS[skillId];
                    if (!art) return;
                    if (art.sectReq && art.sectReq !== app.charSys.state.sect) return;
                    var lv = app.charSys.state.skills[skillId];
                    var btn = document.createElement('button');
                    btn.className = 'btn-primary';
                    btn.innerHTML = (art.isAoe ? '🌪️ ' : '🗡️ ') + art.name + ' Lv.' + lv + ' <small>(耗內:' + art.mpCost + ')</small>';
                    btn.addEventListener('click', function () { combat.useSkill(skillId); });
                    skillBox.appendChild(btn);
                });
            }
        }

        updateSlotDeadState(headId, isDead) {
            var head = document.getElementById(headId);
            if (!head) return;
            var slot = head.closest ? head.closest('.fixed-unit-slot') : null;
            if (!slot) return;
            slot.style.opacity = isDead ? '0.45' : '1';
        }

        updateArenaBarsDOM() {
            var app = this.app;
            var combat = app.combatSys;
            var partyMembers = app.partySys.getPartyMembers();

            function setBar(prefix, cur, max) {
                var safeMax = (typeof max === 'number' && max > 0) ? max : 0;
                var safeCur = Math.max(0, Math.min(cur || 0, safeMax));
                var pct = safeMax > 0 ? (safeCur / safeMax) * 100 : 0;
                var fill = document.getElementById(prefix + '-fill');
                var txt = document.getElementById(prefix + '-text');
                if (fill) fill.style.width = pct.toFixed(1) + '%';
                if (txt) {
                    var icon = (prefix.indexOf('hp') !== -1) ? '❤ ' : '💧 ';
                    txt.textContent = icon + Math.floor(safeCur).toLocaleString() + ' / ' + Math.floor(safeMax).toLocaleString();
                }
            }

            function setAtb(headId, barId, txtId, pct) {
                var p = Math.max(0, Math.min(100, Math.floor(pct || 0)));
                var head = document.getElementById(headId);
                var bar = document.getElementById(barId);
                var txt = document.getElementById(txtId);
                if (bar) bar.style.width = p.toFixed(1) + '%';
                if (txt) txt.textContent = (p >= 100) ? '⚡ 滿' : ('⚡ ' + p + '%');
                if (head) {
                    if (p >= 100) head.classList.add('full');
                    else head.classList.remove('full');
                }
            }

            // 我方
            partyMembers.forEach(function (m, idx) {
                var md = app.charSys.getDerivedStatsForChar(m);
                var isDead = m.currentHp <= 0;
                setAtb('ally-head-' + idx, 'ally-atb-bar-' + idx, 'ally-atb-text-' + idx, isDead ? 0 : m.atb);
                setBar('ally-hp-' + idx, m.currentHp, md.maxHp);
                setBar('ally-mp-' + idx, m.currentMp, md.maxMp);
                // ⭐ v56：戰力每 tick 更新
                var pwEl = document.getElementById('ally-pw-' + idx);
                if (pwEl) pwEl.textContent = '⚔️' + this.formatPower(this.calcUnitPower(md));
                this.updateSlotDeadState('ally-head-' + idx, isDead);
            }, this);

            // 敵方
            (combat.enemies || []).forEach(function (e, eIdx) {
                var isDead = e.currentHp <= 0;
                var pct = isDead ? 0 : Math.floor(e.atb || 0);
                setAtb('enemy-head-' + eIdx, 'enemy-atb-bar-' + eIdx, 'enemy-atb-text-' + eIdx, pct);

                var eMaxMp = (typeof e.maxMp === 'number' && e.maxMp > 0)
                    ? e.maxMp
                    : Math.floor(80 + (e.lv || 1) * 25 + (e.atk || 20) * 0.15);
                var eCurMp = (typeof e.currentMp === 'number') ? e.currentMp : eMaxMp;

                setBar('enemy-hp-' + eIdx, e.currentHp, e.maxHp);
                setBar('enemy-mp-' + eIdx, eCurMp, eMaxMp);
                // ⭐ v56：敵方戰力每 tick 更新
                var ePwEl = document.getElementById('enemy-pw-' + eIdx);
                if (ePwEl) ePwEl.textContent = '⚔️' + this.formatPower(this.calcUnitPower(e));
                this.updateSlotDeadState('enemy-head-' + eIdx, isDead);
            }, this);

            // 存活徽章
            var inBattle = !!combat.currentEnemy;
            var allyCounts = this.getAlivePartyCounts();
            var enemyCounts = this.getAliveEnemyCounts();

            this.updateGroupAliveSpan(
                'battle-party-group-title',
                inBattle
                    ? ' (存活：' + allyCounts.alive + ' / ' + allyCounts.total + ')'
                    : ' (待命中)'
            );
            this.updateGroupAliveSpan(
                'battle-enemy-group-title',
                inBattle
                    ? ' (存活：' + enemyCounts.alive + ' / ' + enemyCounts.total + ')'
                    : ' (待命中 — 點擊上方對手開始交鋒)'
            );
        }
    }

    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            var game = window.HY.game;
            if (game) {
                game.dexSys = new window.HY.DexteritySpeedSystem(game);
                window.HY.uiDexAtb = new UIDexAtb(game);
                game.atbSys = new window.HY.CombatAtbSystem(game);
                game.renderAll();
            }
        }, 50);
    });

    window.HY.UIDexAtb = UIDexAtb;
})();