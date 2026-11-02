// js/uiSpiritRoot.js  (v50.2)
// 八元素・八大靈根分頁
//
// v50.2 修正：
//   ⭐ 移除左欄獨立的「本命靈根」stat-row
//   ⭐ 改為把靈根徽章接在「當前操控：角色名稱」後方
//   ⭐ 自動清理舊版殘留的 #char-spirit-root 列
window.HY = window.HY || {};

(function () {
    var SUBTAB_BTN_ID = 'btn-spiritroot-subtab';
    var TOPTAB_BTN_ID = 'btn-spiritroot-toptab';
    var PANEL_ID      = 'sub-spiritroot';
    var TOPPANEL_ID   = 'tab-spiritroot';

    class UISpiritRoot {
        constructor(app) {
            this.app = app;
            this._cleanupLegacyRow();
            this.ensureSubTab();
            this.hookUIRenders();
            this.startInjectionWatchdog();
        }

        getSys() {
            return (this.app && this.app.spiritRootSys) ? this.app.spiritRootSys : null;
        }

        ensureSys() {
            if (this.getSys()) return true;
            if (!window.HY.SpiritRootSystem) return false;
            try {
                this.app.spiritRootSys = new window.HY.SpiritRootSystem(this.app);
                console.log('[uiSpiritRoot] ✓ 已補建 game.spiritRootSys');
                return true;
            } catch (e) {
                console.error('[uiSpiritRoot] ✗ 無法建立 spiritRootSys：', e);
                return false;
            }
        }

        // ⭐ v50.2：清理舊版注入的「本命靈根」列
        _cleanupLegacyRow() {
            var el = document.getElementById('char-spirit-root');
            if (!el) return;
            var row = el.closest ? el.closest('.stat-row') : null;
            if (row && row.parentNode) row.parentNode.removeChild(row);
            else if (el.parentNode) el.parentNode.removeChild(el);
        }

        // ══════════════════════════════════════════════
        // ⭐ 依模式產生「淬鍊靈根」按鈕文字（唯一來源）
        // ══════════════════════════════════════════════
        buildUpgradeInfo(st) {
            var sys = this.getSys();
            var root = this.app.charSys.rootState;
            var salvagePresent = !!(window.HY.SalvageExpeditionSystem || this.app.salvageExpSys);

            if (salvagePresent && sys && typeof sys.getUpgradeRootStoneCost === 'function') {
                var stoneCost = sys.getUpgradeRootStoneCost(st);
                var haveStones = (root.spiritStones || 0);
                return {
                    mode: 'stone',
                    text: '⬆️ 靈石淬鍊靈根（消耗 ' + stoneCost.toLocaleString() + ' 顆 ｜ 持有 ' + haveStones.toLocaleString() + '）'
                };
            }
            if (!salvagePresent && sys && typeof sys.getUpgradeRootSpCost === 'function') {
                var spCost = sys.getUpgradeRootSpCost(st);
                return {
                    mode: 'sp',
                    text: '⬆️ 淬鍊靈根境界（' + spCost.toLocaleString() + ' 武點）'
                };
            }
            return {
                mode: 'pending',
                text: '⬆️ 淬鍊靈根境界（資源載入中…）'
            };
        }

        buildRerollInfo(st) {
            var root = this.app.charSys.rootState;
            var inv = root.inventory || {};
            var salvagePresent = !!(window.HY.SalvageExpeditionSystem || this.app.salvageExpSys);

            if (salvagePresent) {
                var havePill = inv.pill_wash_root || 0;
                return {
                    mode: 'pill',
                    text: '🌈 服用太虛洗靈丹重塑（消耗 1 顆 ｜ 持有 ' + havePill + '）'
                };
            }
            return {
                mode: 'gold',
                text: '🌈 洗髓易根（500 兩隨機重塑）'
            };
        }

        // ══════════════════════════════════════════════
        // ⭐ v50.2：靈根徽章改注入「角色名稱後方」
        // ══════════════════════════════════════════════
        updateLeftPanelRootInfo() {
            var Data = window.HY.Data;
            var st = this.app.charSys && this.app.charSys.state;
            if (!st || !Data || !Data.SPIRIT_ROOTS) return;

            var sys = this.getSys();
            if (sys && typeof sys.ensureCharRoot === 'function') sys.ensureCharRoot(st);

            var rMeta = Data.SPIRIT_ROOTS[st.spiritRoot];
            var nameEl = document.getElementById('char-name');
            if (!nameEl) return;

            if (!rMeta) {
                nameEl.textContent = st.name;
                return;
            }

            var lv = st.spiritRootLv || 1;
            var counterMeta = Data.SPIRIT_ROOTS[rMeta.counters];
            var counterName = counterMeta ? counterMeta.name : '';
            var genMeta = Data.SPIRIT_ROOTS[rMeta.generates];
            var genName = genMeta ? genMeta.name : '';

            var tip = '本命靈根：' + rMeta.name + ' Lv.' + lv +
                '（剋 ' + counterName + '，傷害 +35%；生 ' + genName + '）';

            var badgeHtml =
                '<span title="' + tip + '" style="display:inline-block; ' +
                    'border:1px solid ' + rMeta.color + '; color:' + rMeta.color + '; ' +
                    'background:rgba(0,0,0,0.35); padding:0 6px; border-radius:3px; ' +
                    'font-size:0.74rem; margin-left:6px; vertical-align:middle; white-space:nowrap;">' +
                    rMeta.icon + rMeta.name + ' Lv.' + lv +
                '</span>';

            nameEl.innerHTML = st.name + badgeHtml;
        }

        // ══════════════════════════════════════════════
        // 分頁注入（冪等）
        // ══════════════════════════════════════════════
        ensureSubTab() {
            if (document.getElementById(SUBTAB_BTN_ID) && document.getElementById(PANEL_ID)) return true;

            var subBar = document.querySelector('#tab-martial .sub-tab-bar');
            var tabMartial = document.getElementById('tab-martial');

            if (subBar && tabMartial) {
                this._createSubTabButton(subBar);
                this._createSubTabPanel(tabMartial);
                return true;
            }
            return this._ensureTopTab();
        }

        _createSubTabButton(subBar) {
            if (document.getElementById(SUBTAB_BTN_ID)) return;
            var btn = document.createElement('button');
            btn.id = SUBTAB_BTN_ID;
            btn.className = 'action-btn sub-martial-btn';
            btn.dataset.sub = PANEL_ID;
            btn.style.borderColor = '#fbbf24';
            btn.style.color = '#fbbf24';
            btn.innerHTML = '🌈 八元素・八大靈根';
            subBar.appendChild(btn);
            this._bindSubTabButton(btn);
        }

        _createSubTabPanel(tabMartial) {
            if (document.getElementById(PANEL_ID)) return;
            var panel = document.createElement('div');
            panel.id = PANEL_ID;
            panel.className = 'sub-martial-panel hidden';
            tabMartial.appendChild(panel);
        }

        _bindSubTabButton(btn) {
            var self = this;
            btn.onclick = function () {
                document.querySelectorAll('.sub-martial-btn').forEach(function (b) { b.classList.remove('active'); });
                document.querySelectorAll('.sub-martial-panel').forEach(function (p) { p.classList.add('hidden'); });
                btn.classList.add('active');
                var panel = document.getElementById(PANEL_ID);
                if (panel) panel.classList.remove('hidden');
                self.renderSpiritRootTab();
            };
        }

        _ensureTopTab() {
            var tabNav = document.getElementById('tab-nav');
            var centerStage = document.getElementById('center-stage');
            if (!tabNav || !centerStage) return false;

            if (!document.getElementById(TOPTAB_BTN_ID)) {
                var btn = document.createElement('button');
                btn.id = TOPTAB_BTN_ID;
                btn.className = 'tab-btn';
                btn.dataset.tab = TOPPANEL_ID;
                btn.style.borderColor = '#fbbf24';
                btn.innerHTML = '🌈 八元素・八大靈根';
                tabNav.appendChild(btn);

                var self = this;
                btn.onclick = function () {
                    document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
                    document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
                    btn.classList.add('active');
                    var panel = document.getElementById(TOPPANEL_ID);
                    if (panel) panel.classList.add('active');
                    self.renderSpiritRootTab();
                };
            }

            if (!document.getElementById(TOPPANEL_ID)) {
                var panel = document.createElement('div');
                panel.id = TOPPANEL_ID;
                panel.className = 'tab-content';
                centerStage.appendChild(panel);
            }
            return true;
        }

        startInjectionWatchdog() {
            var self = this;
            var tick = 0;
            var timer = setInterval(function () {
                tick += 1;
                var ok = self.ensureSubTab();
                if (ok || tick >= 12) {
                    clearInterval(timer);
                    if (ok) self.renderSpiritRootTab();
                }
            }, 250);
        }

        // ══════════════════════════════════════════════
        // 掛鉤
        // ══════════════════════════════════════════════
        hookUIRenders() {
            var self = this;
            var uiChar = this.app.uiCharParty;

            if (uiChar) {
                var origRenderChar = uiChar.renderCharacterPanel.bind(uiChar);
                uiChar.renderCharacterPanel = function () {
                    origRenderChar();
                    self.updateLeftPanelRootInfo();
                };
            }

            var origRenderAll = this.app.renderAll.bind(this.app);
            this.app.renderAll = function () {
                origRenderAll();
                self._cleanupLegacyRow();
                self.ensureSys();
                self.ensureSubTab();
                self.updateLeftPanelRootInfo();
                self.renderSpiritRootTab();
            };
        }

        _getPanel() {
            var p = document.getElementById(PANEL_ID);
            if (p) return p;
            return document.getElementById(TOPPANEL_ID);
        }

        // ══════════════════════════════════════════════
        // 相剋環
        // ══════════════════════════════════════════════
        buildElementRingHtml() {
            var Data = window.HY.Data;
            var es = window.HY.game && window.HY.game.elementSys;
            if (!Data || !Data.ELEMENT_RING || !es || !Data.ELEMENTS) return '';

            var curRoot = this.app.charSys.state.spiritRoot;

            var chain = Data.ELEMENT_RING.map(function (id) {
                var m = Data.ELEMENTS[id];
                if (!m) return '';
                var isCur = (id === curRoot);
                return '<span style="display:inline-block; background:' + (isCur ? 'rgba(0,229,255,0.18)' : 'rgba(0,0,0,0.35)') +
                    '; border:1px solid ' + m.color + '; color:' + m.color + '; padding:3px 9px; border-radius:4px; font-size:0.82rem; margin:2px;">' +
                    m.icon + m.name + (isCur ? ' ★' : '') + '</span>';
            }).join('<span style="color:#64748b; margin:0 2px;">➔</span>');

            var first = Data.ELEMENTS[Data.ELEMENT_RING[0]];

            return '<div style="background:#121822; border:1px solid #2e3b4e; border-radius:6px; padding:8px 10px; margin-bottom:10px;">' +
                '<div style="font-size:0.85rem; color:#fbbf24; font-weight:bold; margin-bottom:6px;">☯️ 八元素相剋環（剋制 +35%、被剋 -20%）</div>' +
                '<div style="line-height:2;">' + chain +
                    '<span style="color:#64748b; margin:0 2px;">➔</span>' + (first ? first.icon + first.name : '') + '（循環）</div>' +
            '</div>';
        }

        // ══════════════════════════════════════════════
        // 主渲染
        // ══════════════════════════════════════════════
        renderSpiritRootTab() {
            var panel = this._getPanel();
            if (!panel) return;

            if (panel.id === PANEL_ID && panel.classList.contains('hidden')) return;
            if (panel.id === TOPPANEL_ID && !panel.classList.contains('active')) return;

            var Data = window.HY.Data;
            var es = window.HY.game && window.HY.game.elementSys;
            var st = this.app.charSys.state;
            var self = this;

            if (!Data || !Data.SPIRIT_ROOTS) {
                panel.innerHTML = '<p style="color:#f87171;">⚠️ 靈根資料尚未載入（請檢查 js/spiritRootData.js）。</p>';
                return;
            }

            var sys = this.getSys() || (this.ensureSys() ? this.getSys() : null);
            var sysReady = !!sys;
            if (sysReady && typeof sys.ensureCharRoot === 'function') sys.ensureCharRoot(st);

            var curMeta = Data.SPIRIT_ROOTS[st.spiritRoot];
            if (!curMeta) {
                panel.innerHTML = '<p style="color:#f87171;">⚠️ 本命靈根資料異常（spiritRoot = ' + st.spiritRoot + '）。</p>';
                return;
            }

            var upInfo = this.buildUpgradeInfo(st);
            var rerollInfo = this.buildRerollInfo(st);

            var counterMeta = Data.SPIRIT_ROOTS[curMeta.counters];
            var genMeta = Data.SPIRIT_ROOTS[curMeta.generates];

            var elemStats = (es && typeof es.getElementStats === 'function')
                ? es.getElementStats(st)
                : { atk: {}, def: {} };
            var elemKey = curMeta.elementKey || curMeta.id;
            var myElemAtk = (elemStats.atk && elemStats.atk[elemKey]) || 0;
            var myElemRes = (elemStats.def && elemStats.def[elemKey]) || 0;
            var elemMeta = (Data.ELEMENTS && Data.ELEMENTS[elemKey]) || null;

            var sysWarn = sysReady ? '' :
                '<div style="background:rgba(239,68,68,0.12); border:1px solid #ef4444; border-radius:6px; padding:8px 12px; margin-bottom:10px; color:#fca5a5; font-size:0.82rem;">' +
                    '⚠️ 靈根核心系統（spiritRootSys）尚未就緒，淬鍊／洗髓按鈕暫時停用。' +
                '</div>';

            var upDisabled = sysReady ? '' : 'disabled';
            var rerollDisabled = sysReady ? '' : 'disabled';

            panel.innerHTML =
                sysWarn +
                this.buildElementRingHtml() +

                '<div style="background:#121822; border:1px solid ' + curMeta.color + '; border-radius:6px; padding:12px; margin-bottom:14px;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
                        '<div style="flex:1; min-width:280px;">' +
                            '<h3 style="margin:0; color:' + curMeta.color + '; font-size:1.1rem;">' +
                                '👤 【' + st.name + '】本命靈根：' + curMeta.icon + ' ' + curMeta.name + '（第 ' + (st.spiritRootLv || 1) + ' 境）' +
                            '</h3>' +
                            '<p style="font-size:0.84rem; color:#cbd5e1; margin-top:6px;">' +
                                '☯️ 剋制：<strong style="color:#4ade80;">' + curMeta.shortName + ' 剋 ' + (counterMeta ? counterMeta.shortName : '') + '（傷害 +35%）</strong>' +
                                ' ｜ ✨ 相生：<strong style="color:#38bdf8;">' + curMeta.shortName + ' 生 ' + (genMeta ? genMeta.shortName : '') + '</strong>' +
                            '</p>' +
                            '<p style="font-size:0.82rem; color:#38bdf8; margin-top:6px;">📖 靈根被動：' + curMeta.passiveDesc + '</p>' +
                            '<p style="font-size:0.82rem; color:#4ade80; margin-top:2px;">⚡ 專屬觸發【' + curMeta.triggerName + '】：' + curMeta.triggerDesc + '</p>' +
                        '</div>' +
                        '<div class="btn-group-row" style="flex-wrap:wrap;">' +
                            '<button id="btn-up-spirit-root" class="btn-primary" ' + upDisabled + '>' + upInfo.text + '</button>' +
                            '<button id="btn-reroll-spirit-root" class="action-btn" style="border-color:#f43f5e; color:#f87171;" ' + rerollDisabled + '>' + rerollInfo.text + '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                (elemMeta ?
                '<div style="background:#121822; border:1px solid ' + elemMeta.color + '; border-radius:6px; padding:10px 12px; margin-bottom:14px;">' +
                    '<div style="font-size:0.85rem; color:' + elemMeta.color + '; font-weight:bold; margin-bottom:6px;">' +
                        elemMeta.icon + ' 目前【' + elemMeta.name + '元素】攻防（讀自全隊元素聚合）' +
                    '</div>' +
                    '<div style="display:flex; gap:16px; flex-wrap:wrap; font-size:0.85rem;">' +
                        '<span style="color:#fb923c;">⚔️ ' + elemMeta.name + '元素攻擊：<strong style="color:#fff;">' + myElemAtk + '</strong></span>' +
                        '<span style="color:#2dd4bf;">🛡️ ' + elemMeta.name + '元素抗性：<strong style="color:#fff;">' + myElemRes + '</strong></span>' +
                    '</div>' +
                    '<p style="font-size:0.76rem; color:#94a3b8; margin-top:6px;">💡 八元素完整攻防明細統一顯示於左欄「⚔️ 戰鬥與抗性面板」。</p>' +
                '</div>' : '') +

                '<h3 style="margin:14px 0 8px;">📜 八大靈根總覽（各自對應八大元素攻擊與抗性）</h3>' +
                '<div id="spirit-root-catalog" class="enemy-grid"></div>';

            var upBtn = panel.querySelector('#btn-up-spirit-root');
            if (upBtn) {
                upBtn.onclick = function () {
                    var s = self.getSys();
                    if (!s || typeof s.upgradeCharSpiritRoot !== 'function') {
                        if (self.app.logger) self.app.logger.add('⚠️ 靈根系統尚未就緒，請重新整理頁面。', 'system');
                        return;
                    }
                    if (s.upgradeCharSpiritRoot()) self.app.renderAll();
                };
            }
            var rerollBtn = panel.querySelector('#btn-reroll-spirit-root');
            if (rerollBtn) {
                rerollBtn.onclick = function () {
                    var s = self.getSys();
                    if (!s || typeof s.rerollCharSpiritRoot !== 'function') {
                        if (self.app.logger) self.app.logger.add('⚠️ 靈根系統尚未就緒，請重新整理頁面。', 'system');
                        return;
                    }
                    if (s.rerollCharSpiritRoot()) self.app.renderAll();
                };
            }

            var catalogEl = panel.querySelector('#spirit-root-catalog');
            if (!catalogEl) return;

            Data.ELEMENT_RING.forEach(function (elId) {
                var r = null;
                Object.keys(Data.SPIRIT_ROOTS).forEach(function (k) {
                    if (Data.SPIRIT_ROOTS[k].elementKey === elId) r = Data.SPIRIT_ROOTS[k];
                });
                if (!r) return;

                var isCurrent = (r.id === st.spiritRoot);
                var cTarget = Data.SPIRIT_ROOTS[r.counters];
                var gTarget = Data.SPIRIT_ROOTS[r.generates];
                var elMeta2 = (Data.ELEMENTS && Data.ELEMENTS[elId]) || null;

                var curAtk = (elemStats.atk && elemStats.atk[elId]) || 0;
                var curRes = (elemStats.def && elemStats.def[elId]) || 0;

                var card = document.createElement('div');
                card.className = 'card-item';
                card.style.borderColor = isCurrent ? r.color : '#2e3b4e';

                card.innerHTML =
                    '<div>' +
                        '<h4 style="color:' + r.color + ';">' + r.icon + ' ' + r.name +
                            (elMeta2 ? ' <small style="color:' + elMeta2.color + ';">（' + elMeta2.icon + elMeta2.name + '元素）</small>' : '') +
                            (isCurrent ? ' <span class="sci-color">[★ 當前本命 Lv.' + (st.spiritRootLv || 1) + ']</span>' : '') +
                        '</h4>' +
                        '<p style="color:#fbbf24; font-size:0.8rem;">⚔️ 克制：【' + (cTarget ? cTarget.icon + cTarget.name : '') + '】 | ✨ 相生：【' + (gTarget ? gTarget.icon + gTarget.name : '') + '】</p>' +
                        '<p style="font-size:0.8rem; margin-top:4px;">' + r.passiveDesc + '</p>' +
                        '<p style="color:#38bdf8; font-size:0.78rem; margin-top:4px;">⚡ 【' + r.triggerName + '】：' + r.triggerDesc + '</p>' +
                        (curAtk > 0 || curRes > 0 ?
                            '<p style="margin-top:5px; font-size:0.76rem;">' +
                                '<span style="color:#fb923c;">' + (elMeta2 ? elMeta2.icon : '') + '攻 ' + curAtk + '</span>' +
                                ' ｜ <span style="color:#2dd4bf;">' + (elMeta2 ? elMeta2.icon : '') + '抗 ' + curRes + '</span>' +
                            '</p>' : '') +
                    '</div>';
                catalogEl.appendChild(card);
            });
        }
    }

    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            var game = window.HY.game;
            if (!game) return;

            if (!game.spiritRootSys && window.HY.SpiritRootSystem) {
                try {
                    game.spiritRootSys = new window.HY.SpiritRootSystem(game);
                    console.log('[uiSpiritRoot] ✓ game.spiritRootSys 已建立');
                } catch (e) {
                    console.error('[uiSpiritRoot] ✗ 建立 spiritRootSys 失敗：', e);
                }
            }

            if (!window.HY.uiSpiritRoot && window.HY.UISpiritRoot) {
                window.HY.uiSpiritRoot = new UISpiritRoot(game);
            }

            if (typeof game.renderAll === 'function') game.renderAll();
        }, 70);
    });

    window.HY.UISpiritRoot = UISpiritRoot;
})();