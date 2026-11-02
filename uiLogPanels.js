// js/uiLogPanels.js  (v48)
// 右側三面板（戰鬥 / 掉落 / 財富）
//
// v48 修正：
//   ⭐ 三個面板改為「可點擊標題列展開／收合」（<details> 結構，同左側面板風格）
//   ⭐ 收合狀態存入 localStorage，重整後保持
//   ⭐ 標題列顯示即時條目數徽章
//   ⭐ 保留原 id（game-log / loot-log / wealth-log / btn-clear-*）供 Logger 使用
window.HY = window.HY || {};

(function () {
    var STORAGE_KEY = 'HY_LOG_PANEL_OPEN_V1';

    var PANELS = [
        {
            key: 'combat',
            detailsId: 'log-details-combat',
            bodyId: 'game-log',
            clearId: 'btn-clear-combat-log',
            countId: 'log-count-combat',
            title: '⚔️ 戰鬥內容面板',
            borderColor: '#ef4444',
            titleColor: '#f87171',
            weight: 1.2
        },
        {
            key: 'loot',
            detailsId: 'log-details-loot',
            bodyId: 'loot-log',
            clearId: 'btn-clear-loot-log',
            countId: 'log-count-loot',
            title: '🎁 物品掉落面板',
            borderColor: '#10b981',
            titleColor: '#10b981',
            weight: 0.9
        },
        {
            key: 'wealth',
            detailsId: 'log-details-wealth',
            bodyId: 'wealth-log',
            clearId: 'btn-clear-wealth-log',
            countId: 'log-count-wealth',
            title: '💰 武點銀兩面板',
            borderColor: '#fbbf24',
            titleColor: '#fbbf24',
            weight: 0.9
        }
    ];

    class UILogPanels {
        constructor(logger) {
            this.logger = logger;
            this.injectStyles();
            this.initPanelsDOM();
            this.bindCollapseState();
        }

        // ══════════════════════════════════════════════
        // 1. 注入樣式
        // ══════════════════════════════════════════════
        injectStyles() {
            if (document.getElementById('hy-logpanel-style')) return;
            var style = document.createElement('style');
            style.id = 'hy-logpanel-style';
            style.innerHTML =
                /* 右側容器：縱向排列、不外溢 */
                '#log-panel {' +
                    'display: flex !important;' +
                    'flex-direction: column !important;' +
                    'gap: 8px !important;' +
                    'overflow: hidden !important;' +
                    'min-height: 0 !important;' +
                '}' +

                /* 可折疊面板容器 */
                '.log-details {' +
                    'display: flex; flex-direction: column; min-height: 0;' +
                    'background: #121822; border-radius: 6px; box-sizing: border-box;' +
                    'overflow: hidden;' +
                '}' +
                /* 展開時：依權重分配剩餘空間 */
                '.log-details[open] { flex: var(--fw, 1) 1 0; }' +
                /* 收合時：只佔標題列高度 */
                '.log-details:not([open]) { flex: 0 0 auto; }' +

                /* 標題列（summary） */
                '.log-details > summary {' +
                    'display: flex; align-items: center; justify-content: space-between;' +
                    'gap: 6px; padding: 5px 8px; cursor: pointer; user-select: none;' +
                    'border-bottom: 1px solid #2e3b4e; flex: 0 0 auto;' +
                    'list-style: none; outline: none;' +
                    'transition: background 0.15s;' +
                '}' +
                '.log-details > summary::-webkit-details-marker { display: none; }' +
                '.log-details > summary::marker { content: ""; }' +
                '.log-details > summary:hover { background: rgba(255,255,255,0.04); }' +
                '.log-details:not([open]) > summary { border-bottom: none; }' +

                '.log-head-left { display: flex; align-items: center; gap: 6px; min-width: 0; }' +
                '.log-chevron {' +
                    'font-size: 0.66rem; color: #64748b; flex: 0 0 auto;' +
                    'transition: transform 0.15s ease;' +
                    'display: inline-block; width: 10px; text-align: center;' +
                '}' +
                '.log-details:not([open]) .log-chevron { transform: rotate(-90deg); }' +

                '.log-title { margin: 0; font-size: 0.9rem; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +

                '.log-count {' +
                    'display: inline-block; padding: 0 6px; border-radius: 8px;' +
                    'background: rgba(255,255,255,0.08); border: 1px solid #334155;' +
                    'color: #94a3b8; font-size: 0.68rem; font-weight: bold;' +
                    'line-height: 15px; flex: 0 0 auto; min-width: 20px; text-align: center;' +
                '}' +
                '.log-count.zero { opacity: 0.45; }' +

                '.log-clear { padding: 2px 8px !important; font-size: 0.72rem !important; flex: 0 0 auto; }' +

                /* 內容區 */
                '.log-body {' +
                    'flex: 1 1 auto; min-height: 0; overflow-y: auto;' +
                    'padding: 6px 8px; display: flex; flex-direction: column; gap: 4px;' +
                    'font-size: 0.8rem;' +
                '}' +
                '.log-body::-webkit-scrollbar { width: 6px; }' +
                '.log-body::-webkit-scrollbar-track { background: transparent; }' +
                '.log-body::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }' +

                /* 收合時隱藏內容 */
                '.log-details:not([open]) .log-body { display: none; }';

            document.head.appendChild(style);
        }

        // ══════════════════════════════════════════════
        // 2. 重建 DOM 結構
        // ══════════════════════════════════════════════
        initPanelsDOM() {
            var logPanel = document.getElementById('log-panel');
            if (!logPanel) return;

            // 若已重建過 → 只重新綁定容器
            if (document.getElementById('log-details-combat')) {
                this.rebindLogger();
                this.refreshAllCounts();
                return;
            }

            // 讀取先前狀態
            var saved = this.readState();

            var html = '';
            PANELS.forEach(function (p) {
                var isOpen = (saved[p.key] !== undefined) ? saved[p.key] : true;
                html +=
                    '<details class="log-details"' +
                        ' id="' + p.detailsId + '"' +
                        (isOpen ? ' open' : '') +
                        ' style="border:1px solid ' + p.borderColor + '; --fw:' + p.weight + ';">' +
                        '<summary>' +
                            '<span class="log-head-left">' +
                                '<span class="log-chevron">▼</span>' +
                                '<h3 class="log-title" style="color:' + p.titleColor + ';">' + p.title + '</h3>' +
                                '<span class="log-count zero" id="' + p.countId + '">0</span>' +
                            '</span>' +
                            '<button class="action-btn log-clear" id="' + p.clearId + '" type="button">清空</button>' +
                        '</summary>' +
                        '<div class="log-body" id="' + p.bodyId + '"></div>' +
                    '</details>';
            });

            logPanel.innerHTML = html;

            this.rebindLogger();
            this.bindClearButtons();
            this.observeCounts();
        }

        rebindLogger() {
            if (this.logger && typeof this.logger.bindContainers === 'function') {
                this.logger.bindContainers('game-log', 'loot-log', 'wealth-log');
            }
        }

        // ══════════════════════════════════════════════
        // 3. 清空按鈕（阻止冒泡，避免誤觸折疊）
        // ══════════════════════════════════════════════
        bindClearButtons() {
            var self = this;
            PANELS.forEach(function (p) {
                var btn = document.getElementById(p.clearId);
                if (!btn) return;
                btn.onclick = function (e) {
                    // ⭐ 阻止事件傳到 summary，避免觸發折疊
                    e.preventDefault();
                    e.stopPropagation();
                    if (self.logger && typeof self.logger.clearChannel === 'function') {
                        self.logger.clearChannel(p.key);
                    }
                    self.refreshCount(p);
                };
            });
        }

        // ══════════════════════════════════════════════
        // 4. 折疊狀態記憶
        // ══════════════════════════════════════════════
        readState() {
            try {
                var raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return {};
                var obj = JSON.parse(raw);
                return (obj && typeof obj === 'object') ? obj : {};
            } catch (e) { return {}; }
        }

        writeState(state) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (e) { /* 靜默 */ }
        }

        bindCollapseState() {
            var self = this;
            PANELS.forEach(function (p) {
                var d = document.getElementById(p.detailsId);
                if (!d) return;
                d.addEventListener('toggle', function () {
                    var state = self.readState();
                    state[p.key] = d.open;
                    self.writeState(state);
                });
            });
        }

        // ══════════════════════════════════════════════
        // 5. 條目數徽章（用 MutationObserver 自動更新）
        // ══════════════════════════════════════════════
        observeCounts() {
            var self = this;
            PANELS.forEach(function (p) {
                var body = document.getElementById(p.bodyId);
                if (!body) return;

                var mo = new MutationObserver(function () {
                    self.refreshCount(p);
                });
                mo.observe(body, { childList: true });

                self.refreshCount(p);
            });
        }

        refreshCount(p) {
            var body = document.getElementById(p.bodyId);
            var el = document.getElementById(p.countId);
            if (!body || !el) return;
            var n = body.children.length;
            el.textContent = n;
            if (n === 0) el.classList.add('zero');
            else el.classList.remove('zero');
        }

        refreshAllCounts() {
            var self = this;
            PANELS.forEach(function (p) { self.refreshCount(p); });
        }
    }

    window.HY.UILogPanels = UILogPanels;
})();